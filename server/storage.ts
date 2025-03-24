import { 
  users, 
  type User, 
  type InsertUser,
  donations,
  type Donation,
  type InsertDonation 
} from "@shared/schema";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUsers(): Promise<User[]>;
  updateUserStatus(id: number, isActive: boolean): Promise<User | undefined>;
  deleteUser(id: number): Promise<void>;
  
  // Donation operations
  createDonation(donation: InsertDonation): Promise<Donation>;
  getDonation(id: number): Promise<Donation | undefined>;
  getDonationByReceiptNumber(receiptNumber: string): Promise<Donation | undefined>;
  getDonations(): Promise<Donation[]>;
  getLastReceiptNumber(): Promise<string | undefined>;
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
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
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

  async updateUserStatus(id: number, isActive: boolean): Promise<User | undefined> {
    const user = this.users.get(id);
    
    if (!user) {
      return undefined;
    }
    
    const updatedUser = { ...user, isActive };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async deleteUser(id: number): Promise<void> {
    this.users.delete(id);
  }

  // Donation operations
  async createDonation(insertDonation: InsertDonation): Promise<Donation> {
    const id = this.donationCurrentId++;
    const now = new Date();
    
    // Ensure all optional fields are properly typed as null if not provided
    const donation: Donation = {
      ...insertDonation,
      id,
      createdAt: now,
      // Set optional fields to null if they're undefined
      drawnOn: insertDonation.drawnOn || null,
      instrumentDate: insertDonation.instrumentDate || null,
      instrumentNumber: insertDonation.instrumentNumber || null
    };
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
    
    // Sort donations by receipt number
    donations.sort((a, b) => {
      return b.receiptNumber.localeCompare(a.receiptNumber);
    });
    
    return donations[0].receiptNumber;
  }
}

export const storage = new MemStorage();
