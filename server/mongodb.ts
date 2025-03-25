import { MongoClient, ObjectId, ServerApiVersion } from 'mongodb';
import { 
  users, 
  type User, 
  type InsertUser,
  donations,
  type Donation,
  type InsertDonation 
} from "@shared/schema";
import { IStorage } from './storage';

export class MongoDBStorage implements IStorage {
  private client: MongoClient;
  private db: any;
  private usersCollection: any;
  private donationsCollection: any;
  private connected: boolean = false;
  private connectionPromise: Promise<void> | null = null;
  private connectionAttempts: number = 0;
  private readonly MAX_CONNECTION_ATTEMPTS = 3;
  private readonly OPERATION_TIMEOUT_MS = 10000; // Increased to 10 seconds timeout for operations

  constructor(uri: string, dbName: string) {
    // Configure MongoDB client with more robust settings
    this.client = new MongoClient(uri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
      connectTimeoutMS: 10000, // Increased to 10 seconds timeout for connection
      socketTimeoutMS: 15000, // Increased to 15 seconds for socket operations
    });
    
    // Initialize connection
    this.connectionPromise = this.initConnection(dbName);
  }

  private async initConnection(dbName: string): Promise<void> {
    try {
      this.connectionAttempts++;
      console.log(`Attempting to connect to MongoDB at ${this.client.options.hosts?.map(h => `${h.host}:${h.port}`).join(', ')}... (Attempt ${this.connectionAttempts}/${this.MAX_CONNECTION_ATTEMPTS})`);
      
      // Add timeout to the connect operation
      await Promise.race([
        this.client.connect(),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('MongoDB connection timed out')), 10000);
        })
      ]);
      
      this.db = this.client.db(dbName);
      this.usersCollection = this.db.collection('users');
      this.donationsCollection = this.db.collection('donations');
      this.connected = true;
      console.log('Connected to MongoDB successfully');

      // Check if admin user exists, if not create one - but don't make this part of the connection process
      this.checkAndCreateAdminUser().catch(error => {
        // Just log the error but don't fail the connection
        console.error('Error checking/creating admin user:', error);
      });
    } catch (error: unknown) {
      console.error('Failed to connect to MongoDB:', error);
      this.connected = false;
      
      // Retry connection if we haven't exceeded max attempts
      if (this.connectionAttempts < this.MAX_CONNECTION_ATTEMPTS) {
        console.log(`Retrying MongoDB connection in 2 seconds... (Attempt ${this.connectionAttempts}/${this.MAX_CONNECTION_ATTEMPTS})`);
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
        return this.initConnection(dbName);
      }
      
      throw error;
    }
  }

  // Separate method to check and create admin user
  private async checkAndCreateAdminUser(): Promise<void> {
    try {
      console.log('Checking for admin user...');
      // Directly query the collection instead of using getUserByUsername to avoid circular dependency
      const adminUser = await this.executeWithTimeout(async () => {
        return await this.usersCollection.findOne({ username: 'admin@example.com' });
      });
      
      console.log('Admin user exists:', adminUser ? 'Yes' : 'No');
      if (!adminUser) {
        console.log('Creating admin user...');
        // Directly insert into the collection instead of using createUser
        await this.executeWithTimeout(async () => {
          await this.usersCollection.insertOne({
            username: "admin@example.com",
            password: "admin123",
            fullName: "Admin User",
            role: "admin",
            isActive: true,
            createdAt: new Date()
          });
        });
        console.log('Admin user created successfully');
      }
    } catch (error) {
      console.error('Error in checkAndCreateAdminUser:', error);
      throw error;
    }
  }

  // Helper method to execute operations with timeout
  private async executeWithTimeout<T>(operation: () => Promise<T>): Promise<T> {
    return Promise.race([
      operation(),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`MongoDB operation timed out after ${this.OPERATION_TIMEOUT_MS}ms`)), 
          this.OPERATION_TIMEOUT_MS);
      })
    ]);
  }

  // Helper method to ensure connection is established
  private async ensureConnected(): Promise<void> {
    // If we're already connected, no need to do anything
    if (this.connected) {
      return;
    }
    
    // If we have a pending connection, wait for it to complete with a timeout
    if (this.connectionPromise) {
      try {
        console.log('Waiting for pending MongoDB connection to complete...');
        await Promise.race([
          this.connectionPromise,
          new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Connection initialization timed out')), 10000);
          })
        ]);
        this.connectionPromise = null;
      } catch (error: unknown) {
        // If the initial connection failed, throw the error
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('MongoDB connection failed:', errorMessage);
        this.connectionPromise = null; // Clear the promise to avoid getting stuck
        throw new Error('MongoDB connection failed: ' + errorMessage);
      }
    }
    
    // If we're still not connected after waiting for the connection promise,
    // something went wrong
    if (!this.connected) {
      throw new Error('MongoDB is not connected');
    }
  }

  async getUser(id: number): Promise<User | undefined> {
    try {
      await this.ensureConnected();
      return await this.executeWithTimeout(async () => {
        const user = await this.usersCollection.findOne({ id: id });
        if (!user) return undefined;
        
        return {
          id: user._id.toString(),
          username: user.username,
          password: user.password,
          fullName: user.fullName,
          role: user.role,
          isActive: user.isActive ?? true,
          createdAt: user.createdAt ?? new Date()
        };
      });
    } catch (error: unknown) {
      console.error('Error in getUser:', error);
      throw error;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      await this.ensureConnected();
      return await this.executeWithTimeout(async () => {
        const doc = await this.usersCollection.findOne({ username });
        if (!doc) return undefined;
        
        return {
          id: doc._id.toString(),
          username: doc.username,
          password: doc.password,
          fullName: doc.fullName,
          role: doc.role || 'user', // Ensure role is always a string
          isActive: doc.isActive ?? true,
          createdAt: doc.createdAt ?? new Date()
        };
      });
    } catch (error: unknown) {
      console.error(`Error getting user by username (${username}):`, error);
      throw error;
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      await this.ensureConnected();
      return await this.executeWithTimeout(async () => {
        const newUser = {
          ...insertUser,
          role: insertUser.role || 'user', // Ensure role is always a string
          isActive: true,
          createdAt: new Date()
        };
        
        const result = await this.usersCollection.insertOne(newUser);
        return {
          id: result.insertedId.toString(),
          ...newUser
        };
      });
    } catch (error: unknown) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async getUsers(): Promise<User[]> {
    try {
      await this.ensureConnected();
      return await this.executeWithTimeout(async () => {
        const result = await this.usersCollection.find({}).toArray();
        return result.map((doc: any) => ({
          id: doc._id.toString(),
          username: doc.username,
          password: doc.password,
          fullName: doc.fullName,
          role: doc.role,
          isActive: doc.isActive ?? true,
          createdAt: doc.createdAt ?? new Date()
        }));
      });
    } catch (error: unknown) {
      console.error('Error getting users:', error);
      throw error;
    }
  }

  async updateUserStatus(id: number, isActive: boolean): Promise<User | undefined> {
    try {
      await this.ensureConnected();
      
      const result = await this.executeWithTimeout(async () => {
        const user = await this.usersCollection.findOneAndUpdate(
          { id }, 
          { $set: { isActive } },
          { returnDocument: 'after' }
        );
        
        if (!user.value) return undefined;
        
        return {
          id: user.value._id.toString(),
          username: user.value.username,
          password: user.value.password,
          fullName: user.value.fullName,
          role: user.value.role,
          isActive: user.value.isActive ?? true,
          createdAt: user.value.createdAt ?? new Date()
        };
      });
      
      return result;
    } catch (error: unknown) {
      console.error('Error in updateUserStatus:', error);
      throw error;
    }
  }

  async deleteUser(id: number): Promise<void> {
    try {
      await this.ensureConnected();
      await this.executeWithTimeout(async () => {
        await this.usersCollection.deleteOne({ id });
      });
    } catch (error: unknown) {
      console.error('Error in deleteUser:', error);
      throw error;
    }
  }

  async createDonation(insertDonation: InsertDonation): Promise<Donation> {
    try {
      await this.ensureConnected();
      
      // Get the highest ID to ensure we increment properly
      const highestDonation = await this.executeWithTimeout(async () => {
        const result = await this.donationsCollection.find().sort({ id: -1 }).limit(1).toArray();
        return result.length > 0 ? result[0] : null;
      });
      
      const nextId = highestDonation ? highestDonation.id + 1 : 1;
      
      const now = new Date();
      const donation: Donation = {
        id: nextId,
        date: insertDonation.date,
        receiptNumber: insertDonation.receiptNumber,
        donorName: insertDonation.donorName,
        contactNumber: insertDonation.contactNumber,
        address: insertDonation.address,
        email: insertDonation.email,
        panNumber: insertDonation.panNumber,
        paymentMode: insertDonation.paymentMode,
        amount: insertDonation.amount,
        amountInWords: insertDonation.amountInWords,
        purpose: insertDonation.purpose,
        drawnOn: insertDonation.drawnOn || null,
        instrumentDate: insertDonation.instrumentDate || null,
        instrumentNumber: insertDonation.instrumentNumber || null,
        createdAt: now
      };
      
      await this.executeWithTimeout(async () => {
        await this.donationsCollection.insertOne(donation);
      });
      
      return donation;
    } catch (error: unknown) {
      console.error('Error in createDonation:', error);
      throw error;
    }
  }

  async getDonation(id: number): Promise<Donation | undefined> {
    try {
      await this.ensureConnected();
      return await this.executeWithTimeout(async () => {
        const donation = await this.donationsCollection.findOne({ id });
        if (!donation) return undefined;
        
        return {
          id: donation._id.toString(),
          ...donation
        };
      });
    } catch (error: unknown) {
      console.error('Error in getDonation:', error);
      throw error;
    }
  }

  async getDonationByReceiptNumber(receiptNumber: string): Promise<Donation | undefined> {
    try {
      await this.ensureConnected();
      return await this.executeWithTimeout(async () => {
        const donation = await this.donationsCollection.findOne({ receiptNumber });
        if (!donation) return undefined;
        
        return {
          id: donation._id.toString(),
          ...donation
        };
      });
    } catch (error: unknown) {
      console.error('Error in getDonationByReceiptNumber:', error);
      throw error;
    }
  }

  async getDonations(): Promise<Donation[]> {
    try {
      await this.ensureConnected();
      return await this.executeWithTimeout(async () => {
        const result = await this.donationsCollection.find().toArray();
        return result.map((doc: any) => ({
          id: doc._id.toString(),
          ...doc
        }));
      });
    } catch (error: unknown) {
      console.error('Error in getDonations:', error);
      throw error;
    }
  }

  async getLastReceiptNumber(): Promise<string | undefined> {
    try {
      await this.ensureConnected();
      
      const donations = await this.executeWithTimeout(async () => {
        const result = await this.donationsCollection.find().sort({ receiptNumber: -1 }).limit(1).toArray();
        return result.length > 0 ? result[0] : null;
      });
      
      return donations ? donations.receiptNumber : undefined;
    } catch (error: unknown) {
      console.error('Error in getLastReceiptNumber:', error);
      throw error;
    }
  }

  // Method to ping the MongoDB server to check connection
  async ping(): Promise<boolean> {
    try {
      if (!this.connected) {
        return false;
      }
      
      // Use the admin command to ping the server
      await this.executeWithTimeout(async () => {
        await this.db.command({ ping: 1 });
      });
      return true;
    } catch (error) {
      console.error('MongoDB ping failed:', error);
      return false;
    }
  }

  // Close the MongoDB connection
  async close(): Promise<void> {
    if (this.client && this.connected) {
      try {
        await this.client.close();
        this.connected = false;
        console.log('MongoDB connection closed');
      } catch (error: unknown) {
        console.error('Error closing MongoDB connection:', error);
      }
    }
  }
}
