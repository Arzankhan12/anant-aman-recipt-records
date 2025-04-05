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
  private readonly OPERATION_TIMEOUT_MS = 5000; // Standard timeout for operations

  constructor(uri: string, dbName: string) {
    // Configure MongoDB client with standard settings
    this.client = new MongoClient(uri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      }
    });
    
    // Initialize connection
    this.connectionPromise = this.initConnection(dbName);
  }

  private async initConnection(dbName: string): Promise<void> {
    try {
      this.connectionAttempts++;
      console.log(`Attempting to connect to MongoDB... (Attempt ${this.connectionAttempts}/${this.MAX_CONNECTION_ATTEMPTS})`);
      
      // Standard connection without timeout
      await this.client.connect();
      
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

  async getUser(id: number | string): Promise<User | undefined> {
    try {
      await this.ensureConnected();
      
      // Log the incoming ID for debugging
      console.log(`Getting user with ID: ${id}, type: ${typeof id}`);
      
      return await this.executeWithTimeout(async () => {
        let user;
        
        // If id is a string that looks like an ObjectId, try that first
        if (typeof id === 'string' && id.length === 24) {
          try {
            const objectId = new ObjectId(id);
            console.log(`Trying to find with ObjectId: ${objectId}`);
            
            user = await this.usersCollection.findOne({ _id: objectId });
            
            if (user) {
              console.log(`User found by ObjectId: ${user.username}`);
              return {
                id: user._id.toString(),
                username: user.username,
                password: user.password,
                fullName: user.fullName,
                role: user.role,
                isActive: user.isActive ?? true,
                createdAt: user.createdAt ?? new Date()
              };
            }
          } catch (err) {
            console.error('Error finding user by ObjectId:', err);
          }
        }
        
        // Try to find by numeric ID
        if (!user) {
          const numericId = typeof id === 'string' ? parseInt(id) : id;
          if (!isNaN(numericId)) {
            user = await this.usersCollection.findOne({ id: numericId });
            
            if (user) {
              console.log(`User found by numeric ID: ${user.username}`);
              return {
                id: user._id.toString(),
                username: user.username,
                password: user.password,
                fullName: user.fullName,
                role: user.role,
                isActive: user.isActive ?? true,
                createdAt: user.createdAt ?? new Date()
              };
            }
          }
        }
        
        console.log(`User not found with id: ${id}`);
        return undefined;
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

  async updateUserStatus(id: number | string, isActive: boolean): Promise<User | undefined> {
    try {
      await this.ensureConnected();
      
      // Log the incoming ID for debugging
      console.log(`MongoDB: Updating user status for ID: ${id}, type: ${typeof id}, setting isActive to: ${isActive}`);
      
      return await this.executeWithTimeout(async () => {
        let user;
        let objectId;
        
        // If id is a string that looks like an ObjectId, try to convert it
        if (typeof id === 'string' && id.length === 24) {
          try {
            objectId = new ObjectId(id);
            console.log(`MongoDB: Valid ObjectId: ${objectId}`);
          } catch (err) {
            console.error('MongoDB: Invalid ObjectId format:', err);
          }
        }
        
        // Try to find the user with the appropriate query
        if (objectId) {
          // First try by ObjectId
          user = await this.usersCollection.findOne({ _id: objectId });
          console.log(`MongoDB: User lookup by ObjectId result: ${user ? 'Found' : 'Not found'}`);
        }
        
        // If not found and id is numeric, try by numeric id
        if (!user && (typeof id === 'number' || !isNaN(Number(id)))) {
          const numericId = typeof id === 'number' ? id : Number(id);
          user = await this.usersCollection.findOne({ id: numericId });
          console.log(`MongoDB: User lookup by numeric ID result: ${user ? 'Found' : 'Not found'}`);
        }
        
        // If still not found, try by string id as a last resort
        if (!user && typeof id === 'string') {
          user = await this.usersCollection.findOne({ id: id });
          console.log(`MongoDB: User lookup by string ID result: ${user ? 'Found' : 'Not found'}`);
        }
        
        if (!user) {
          console.log(`MongoDB: User not found with id: ${id}`);
          return undefined;
        }
        
        console.log(`MongoDB: User found: ${user.username}, _id: ${user._id}, current isActive: ${user.isActive}`);
        
        // Update the user with the correct query based on how we found them
        const updateResult = await this.usersCollection.findOneAndUpdate(
          { _id: user._id },
          { $set: { isActive } },
          { returnDocument: 'after' }
        );
        
        if (!updateResult.value) {
          console.log(`MongoDB: Failed to update user: ${user.username}`);
          return undefined;
        }
        
        console.log(`MongoDB: User updated successfully: ${updateResult.value.username}, new isActive: ${updateResult.value.isActive}`);
        
        return {
          id: updateResult.value._id.toString(),
          username: updateResult.value.username,
          password: updateResult.value.password,
          fullName: updateResult.value.fullName,
          role: updateResult.value.role,
          isActive: updateResult.value.isActive ?? true,
          createdAt: updateResult.value.createdAt ?? new Date()
        };
      });
    } catch (error: unknown) {
      console.error('MongoDB: Error in updateUserStatus:', error);
      throw error;
    }
  }

  async deleteUser(id: number | string): Promise<void> {
    try {
      await this.ensureConnected();
      
      // Log the incoming ID for debugging
      console.log(`Deleting user with ID: ${id}, type: ${typeof id}`);
      
      await this.executeWithTimeout(async () => {
        let deleted = false;
        
        // If id is a string that looks like an ObjectId, try that first
        if (typeof id === 'string' && id.length === 24) {
          try {
            const objectId = new ObjectId(id);
            console.log(`Trying to delete with ObjectId: ${objectId}`);
            
            const result = await this.usersCollection.deleteOne({ _id: objectId });
            
            if (result.deletedCount > 0) {
              console.log(`User deleted with ObjectId: ${objectId}`);
              deleted = true;
            }
          } catch (err) {
            console.error('Error deleting user by ObjectId:', err);
          }
        }
        
        // If not deleted yet, try by numeric ID
        if (!deleted) {
          const numericId = typeof id === 'string' ? parseInt(id) : id;
          if (!isNaN(numericId)) {
            const result = await this.usersCollection.deleteOne({ id: numericId });
            
            if (result.deletedCount > 0) {
              console.log(`User deleted with numeric id: ${numericId}`);
              deleted = true;
            }
          }
        }
        
        if (!deleted) {
          console.log(`User not found with id: ${id}`);
        }
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
        panNumber: insertDonation.panNumber || null,
        paymentMode: insertDonation.paymentMode,
        amount: insertDonation.amount,
        amountInWords: insertDonation.amountInWords,
        purpose: insertDonation.purpose,
        drawnOn: insertDonation.drawnOn || null,
        instrumentDate: insertDonation.instrumentDate || null,
        instrumentNumber: insertDonation.instrumentNumber || null,
        createdBy: insertDonation.createdBy || null,
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
      
      // Get the last receipt number from MongoDB
      const donations = await this.executeWithTimeout(async () => {
        // First try to find donations with numeric receipt numbers
        const numericRegex = /^\d+$/;
        const numericResults = await this.donationsCollection.find({
          receiptNumber: { $regex: numericRegex }
        }).sort({ receiptNumber: -1 }).limit(1).toArray();
        
        // If we found numeric receipt numbers, return the highest one
        if (numericResults.length > 0) {
          console.log('Found numeric receipt number:', numericResults[0].receiptNumber);
          return numericResults[0];
        }
        
        // Otherwise, fall back to the old format
        const results = await this.donationsCollection.find().sort({ receiptNumber: -1 }).limit(1).toArray();
        return results.length > 0 ? results[0] : null;
      });
      
      if (donations) {
        console.log('Last receipt number from MongoDB:', donations.receiptNumber);
        return donations.receiptNumber;
      }
      return undefined;
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
