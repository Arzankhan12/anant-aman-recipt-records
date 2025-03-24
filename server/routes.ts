import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertUserSchema, 
  loginSchema, 
  insertDonationSchema 
} from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import { ZodError } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication routes
  app.post("/api/login", async (req: Request, res: Response) => {
    try {
      const credentials = loginSchema.parse(req.body);
      const user = await storage.getUserByUsername(credentials.username);
      
      if (!user || user.password !== credentials.password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      return res.status(200).json({ 
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role
      });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // User management routes
  app.get("/api/users", async (req: Request, res: Response) => {
    try {
      const users = await storage.getUsers();
      return res.status(200).json(
        users.map(user => ({
          id: user.id,
          username: user.username,
          fullName: user.fullName,
          role: user.role,
          isActive: user.isActive,
          createdAt: user.createdAt
        }))
      );
    } catch (error: unknown) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/users", async (req: Request, res: Response) => {
    try {
      const newUser = insertUserSchema.parse(req.body);
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(newUser.username);
      if (existingUser) {
        return res.status(400).json({ message: "User with this email already exists" });
      }
      
      const user = await storage.createUser(newUser);
      return res.status(201).json({
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt
      });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/users/:id/status", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      const { isActive } = req.body;
      if (typeof isActive !== 'boolean') {
        return res.status(400).json({ message: "isActive must be a boolean value" });
      }
      
      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const updatedUser = await storage.updateUserStatus(id, isActive);
      return res.status(200).json({
        id: updatedUser!.id,
        username: updatedUser!.username,
        fullName: updatedUser!.fullName,
        role: updatedUser!.role,
        isActive: updatedUser!.isActive,
        createdAt: updatedUser!.createdAt
      });
    } catch (error: unknown) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/users/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      await storage.deleteUser(id);
      return res.status(200).json({ message: "User deleted successfully" });
    } catch (error: unknown) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Donation routes
  app.post("/api/donations", async (req: Request, res: Response) => {
    try {
      const newDonation = insertDonationSchema.parse(req.body);
      const donation = await storage.createDonation(newDonation);
      return res.status(201).json(donation);
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/donations", async (req: Request, res: Response) => {
    try {
      const donations = await storage.getDonations();
      return res.status(200).json(donations);
    } catch (error: unknown) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/next-receipt-number", async (req: Request, res: Response) => {
    try {
      const lastReceiptNumber = await storage.getLastReceiptNumber();
      let nextNumber;
      
      if (!lastReceiptNumber) {
        // Start with ANT2023001 if no receipts exist
        nextNumber = "ANT2023001";
      } else {
        // Extract the numeric part and increment
        const prefix = lastReceiptNumber.match(/^[A-Z]+/)?.[0] || "ANT";
        const year = lastReceiptNumber.match(/\d{4}/)?.[0] || new Date().getFullYear().toString();
        const number = lastReceiptNumber.match(/\d+$/)?.[0] || "000";
        
        const nextNumberValue = parseInt(number) + 1;
        const paddedNumber = nextNumberValue.toString().padStart(3, '0');
        nextNumber = `${prefix}${year}${paddedNumber}`;
      }
      
      return res.status(200).json({ receiptNumber: nextNumber });
    } catch (error: unknown) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}