import { 
  users, 
  type User, 
  type InsertUser,
  donations,
  type Donation,
  type InsertDonation 
} from "../shared/schema";
import { MongoDBStorage } from './mongodb';

export interface IStorage {
  // User operations
  getUser(id: number | string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUsers(): Promise<User[]>;
  updateUserStatus(id: number | string, isActive: boolean): Promise<User | undefined>;
  deleteUser(id: number | string): Promise<void>;
  
  // Donation operations
  createDonation(donation: InsertDonation): Promise<Donation>;
  getDonation(id: number): Promise<Donation | undefined>;
  getDonationByReceiptNumber(receiptNumber: string): Promise<Donation | undefined>;
  getDonations(): Promise<Donation[]>;
  getLastReceiptNumber(): Promise<string | undefined>;
}

// Wrapper class that handles fallback between MongoDB and MemStorage
export class StorageWrapper implements IStorage {
  private primaryStorage: IStorage;
  private fallbackStorage: IStorage;
  private useFallback: boolean = false;
  private connectionTestCompleted: boolean = false;

  constructor(primary: IStorage, fallback: IStorage) {
    this.primaryStorage = primary;
    this.fallbackStorage = fallback;
  }

  private async executeWithFallback<T>(operation: (storage: IStorage) => Promise<T>): Promise<T> {
    // If we've already determined to use fallback, go directly to it
    if (this.useFallback) {
      return await operation(this.fallbackStorage);
    }
    
    try {
      // Try with primary storage
      const result = await Promise.race([
        operation(this.primaryStorage),
        // Add a timeout to prevent hanging if MongoDB is slow
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Operation timed out')), 3000);
        })
      ]);
      
      // If we get here, the operation succeeded
      if (!this.connectionTestCompleted) {
        console.log('MongoDB operation completed successfully, using MongoDB as primary storage');
        this.connectionTestCompleted = true;
      }
      
      return result as T;
    } catch (error: unknown) {
      // Log the error and switch to fallback
      console.warn('Primary storage operation failed, falling back to in-memory storage:', error);
      this.useFallback = true;
      
      // Use fallback storage
      return await operation(this.fallbackStorage);
    }
  }

  // User operations
  async getUser(id: number | string): Promise<User | undefined> {
    return this.executeWithFallback(storage => storage.getUser(id));
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return this.executeWithFallback(storage => storage.getUserByUsername(username));
  }

  async createUser(user: InsertUser): Promise<User> {
    return this.executeWithFallback(storage => storage.createUser(user));
  }

  async getUsers(): Promise<User[]> {
    return this.executeWithFallback(storage => storage.getUsers());
  }

  async updateUserStatus(id: number | string, isActive: boolean): Promise<User | undefined> {
    return this.executeWithFallback(storage => storage.updateUserStatus(id, isActive));
  }

  async deleteUser(id: number | string): Promise<void> {
    return this.executeWithFallback(storage => storage.deleteUser(id));
  }

  // Donation operations
  async createDonation(donation: InsertDonation): Promise<Donation> {
    return this.executeWithFallback(storage => storage.createDonation(donation));
  }

  async getDonation(id: number): Promise<Donation | undefined> {
    return this.executeWithFallback(storage => storage.getDonation(id));
  }

  async getDonationByReceiptNumber(receiptNumber: string): Promise<Donation | undefined> {
    return this.executeWithFallback(storage => storage.getDonationByReceiptNumber(receiptNumber));
  }

  async getDonations(): Promise<Donation[]> {
    return this.executeWithFallback(storage => storage.getDonations());
  }

  async getLastReceiptNumber(): Promise<string | undefined> {
    return this.executeWithFallback(storage => storage.getLastReceiptNumber());
  }
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private donations: Map<number, Donation>;
  private userCurrentId: number;
  private donationCurrentId: number;

  constructor() {
    this.users = new Map();
    this.donations = new Map();
    this.userCurrentId = 1;
    this.donationCurrentId = 1;
    
    // Initialize with admin user
    this.createUser({
      username: "admin@example.com",
      password: "admin123",
      fullName: "Admin User",
      role: "admin"
    });
  }

  // User operations
  async getUser(id: number | string): Promise<User | undefined> {
    return this.users.get(Number(id));
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userCurrentId++;
    const now = new Date();
    const user: User = { 
      ...insertUser, 
      id, 
      isActive: true,
      createdAt: now,
      // Ensure role is set with a default if not provided
      role: insertUser.role || "staff"
    };
    this.users.set(id, user);
    return user;
  }

  async getUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async updateUserStatus(id: number | string, isActive: boolean): Promise<User | undefined> {
    const user = this.users.get(Number(id));
    
    if (!user) {
      return undefined;
    }
    
    const updatedUser = { ...user, isActive };
    this.users.set(Number(id), updatedUser);
    return updatedUser;
  }

  async deleteUser(id: number | string): Promise<void> {
    this.users.delete(Number(id));
  }

  // Donation operations
  async createDonation(insertDonation: InsertDonation): Promise<Donation> {
    const id = this.donationCurrentId++;
    const now = new Date();
    
    // Create a donation object with all required fields
    const donation = {
      id,
      receiptNumber: insertDonation.receiptNumber,
      date: insertDonation.date,
      donorName: insertDonation.donorName,
      contactNumber: insertDonation.contactNumber,
      address: insertDonation.address,
      email: insertDonation.email,
      panNumber: insertDonation.panNumber || null,
      paymentMode: insertDonation.paymentMode,
      amount: insertDonation.amount,
      amountInWords: insertDonation.amountInWords,
      purpose: insertDonation.purpose,
      instrumentDate: insertDonation.instrumentDate || null,
      drawnOn: insertDonation.drawnOn || null,
      instrumentNumber: insertDonation.instrumentNumber || null,
      createdBy: insertDonation.createdBy || null,
      createdAt: now
    } as Donation;
    
    this.donations.set(id, donation);
    return donation;
  }

  async getDonation(id: number): Promise<Donation | undefined> {
    return this.donations.get(id);
  }

  async getDonationByReceiptNumber(receiptNumber: string): Promise<Donation | undefined> {
    return Array.from(this.donations.values()).find(
      (donation) => donation.receiptNumber === receiptNumber
    );
  }

  async getDonations(): Promise<Donation[]> {
    return Array.from(this.donations.values());
  }

  async getLastReceiptNumber(): Promise<string | undefined> {
    const donations = Array.from(this.donations.values());
    if (donations.length === 0) return undefined;
    
    // Sort donations by receipt number (assuming numeric format)
    donations.sort((a, b) => {
      // If both are numeric, sort numerically
      if (/^\d+$/.test(a.receiptNumber) && /^\d+$/.test(b.receiptNumber)) {
        return parseInt(b.receiptNumber) - parseInt(a.receiptNumber);
      }
      // Otherwise use string comparison
      return b.receiptNumber.localeCompare(a.receiptNumber);
    });
    
    console.log('Last receipt number from memory storage:', donations[0].receiptNumber);
    return donations[0].receiptNumber;
  }
}

// MongoDB connection URI and database name
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/anant_aman';
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'anant_aman_donation_system';

// Initialize storage
const memStorage = new MemStorage();
let mongoStorage: MongoDBStorage | null = null;

// Start with in-memory storage as the primary
const storageWrapper = new StorageWrapper(memStorage, memStorage);

// Try to initialize MongoDB in the background
try {
  console.log('Creating MongoDB storage instance in the background...');
  mongoStorage = new MongoDBStorage(MONGODB_URI, MONGODB_DB_NAME);
  
  // Test MongoDB connection after a delay
  setTimeout(async () => {
    if (mongoStorage) {
      try {
        console.log('Testing MongoDB connection...');
        // Set a timeout for the MongoDB connection test
        const connectionTest = Promise.race([
          // Just check if the connection is alive
          (async () => {
            try {
              // Use a simple ping operation to check connection
              await mongoStorage.ping();
              return true;
            } catch (e) {
              console.error('Error checking MongoDB connection:', e);
              throw e;
            }
          })(),
          new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('MongoDB connection test timed out')), 5000);
          })
        ]);
        
        try {
          await connectionTest;
          console.log('MongoDB connection confirmed working, switching to MongoDB as primary storage');
          
          // If MongoDB is working, create a new wrapper with MongoDB as primary
          const newWrapper = new StorageWrapper(mongoStorage, memStorage);
          
          // Copy all properties from the new wrapper to the existing wrapper
          Object.assign(storageWrapper, newWrapper);
          console.log('Successfully switched to MongoDB as primary storage');
        } catch (timeoutError) {
          console.error('MongoDB connection test failed with timeout, continuing with in-memory storage:', timeoutError);
        }
      } catch (error) {
        console.error('MongoDB connection test failed, continuing with in-memory storage:', error);
      }
    }
  }, 2000); // Increased delay to 2 seconds to give MongoDB more time to initialize
} catch (error) {
  console.error('Error creating MongoDB storage:', error);
}

// Export the wrapped storage
export { storageWrapper as storage };
