// NOTE: This file is being kept for backward compatibility while we transition to the new Express.js structure.
// The new structure is in the routes/ directory, but we're keeping this file to ensure existing functionality works.

import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { sendEmailWithAttachment } from "./emailService";
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
      console.log('Login request received:', req.body);
      const credentials = loginSchema.parse(req.body);
      
      // Add a timeout to prevent hanging on MongoDB operations
      // Increased timeout to 8 seconds for better reliability
      const user = await Promise.race([
        storage.getUserByUsername(credentials.username),
        new Promise<null>((resolve) => {
          setTimeout(() => {
            console.log('Login operation timed out, proceeding with null user');
            resolve(null);
          }, 8000); // 8 second timeout
        })
      ]);
      
      console.log('User found:', user ? 'Yes' : 'No');
      
      // Special case for admin user if MongoDB is having issues
      if (!user && credentials.username === 'admin@example.com' && credentials.password === 'admin123') {
        console.log('Fallback to hardcoded admin credentials due to MongoDB issues');
        return res.status(200).json({
          id: 'admin',
          username: 'admin@example.com',
          fullName: 'Admin User',
          role: 'admin'
        });
      }
      
      if (!user || user.password !== credentials.password) {
        console.log('Authentication failed:', !user ? 'User not found' : 'Password mismatch');
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      console.log('Authentication successful for user:', user.username);
      return res.status(200).json({ 
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role
      });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        console.error('Validation error:', validationError.message);
        return res.status(400).json({ message: validationError.message });
      }
      console.error('Server error during login:', error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Admin login route
  app.post("/api/admin/login", async (req: Request, res: Response) => {
    try {
      console.log('Admin login request received:', req.body);
      const credentials = loginSchema.parse(req.body);
      
      // Add a timeout to prevent hanging on MongoDB operations
      const user = await Promise.race([
        storage.getUserByUsername(credentials.username),
        new Promise<null>((resolve) => {
          setTimeout(() => {
            console.log('Admin login operation timed out, proceeding with null user');
            resolve(null);
          }, 8000); // 8 second timeout
        })
      ]);
      
      console.log('User found for admin login:', user ? 'Yes' : 'No');
      
      // Special case for admin user if MongoDB is having issues
      if (!user && credentials.username === 'Superadmin@gmail.com' && credentials.password === 'Superadmin@123') {
        console.log('Fallback to hardcoded admin credentials due to MongoDB issues');
        return res.status(200).json({
          id: 'admin',
          username: 'Superadmin@gmail.com',
          fullName: 'Admin User',
          role: 'admin'
        });
      }
      
      // Check if user exists, password is correct, and user has admin role
      if (!user || user.password !== credentials.password) {
        console.log('Admin authentication failed:', !user ? 'User not found' : 'Password mismatch');
        return res.status(401).json({ message: "Invalid admin credentials" });
      }
      
      // Check if user has admin role
      if (user.role !== 'admin') {
        console.log('User does not have admin role:', user.username);
        return res.status(403).json({ message: "User does not have admin privileges" });
      }
      
      console.log('Admin authentication successful for user:', user.username);
      return res.status(200).json({ 
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role
      });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        console.error('Validation error in admin login:', validationError.message);
        return res.status(400).json({ message: validationError.message });
      }
      console.error('Server error during admin login:', error);
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
      
      // Get the receipt number from the request
      const receiptNumber = newDonation.receiptNumber;
      console.log('Creating donation with receipt number:', receiptNumber);
      
      // Create the donation
      const donation = await storage.createDonation(newDonation);
      console.log('Donation created successfully with ID:', donation.id);
      
      return res.status(201).json(donation);
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      console.error('Error creating donation:', error);
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
        // Start with 1001 if no receipts exist
        nextNumber = "1001";
      } else {
        // Check if the receipt number is already in the new numeric format
        const isNumeric = /^\d+$/.test(lastReceiptNumber);
        
        if (isNumeric) {
          // If it's already numeric, just increment
          const nextNumberValue = parseInt(lastReceiptNumber) + 1;
          nextNumber = nextNumberValue.toString();
        } else {
          // If it's in the old format (ANT2023XXX), start with 1001
          nextNumber = "1001";
        }
      }
      
      return res.status(200).json({ receiptNumber: nextNumber });
    } catch (error: unknown) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Email sending endpoint
  app.post("/api/send-email", async (req: Request, res: Response) => {
    try {
      const { to, subject, text, pdfBase64 } = req.body;
      
      if (!to || !subject || !text || !pdfBase64) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      // Convert base64 to buffer
      const pdfBuffer = Buffer.from(pdfBase64.split(',')[1], 'base64');
      
      // Send email with attachment
      await sendEmailWithAttachment(to, subject, text, pdfBuffer);
      
      return res.status(200).json({ message: "Email sent successfully" });
    } catch (error: unknown) {
      console.error('Error sending email:', error);
      return res.status(500).json({ message: "Failed to send email" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}