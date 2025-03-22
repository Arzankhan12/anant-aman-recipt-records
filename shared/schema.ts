import { pgTable, text, serial, integer, boolean, date, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema for authentication
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  role: text("role").notNull().default("staff"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  fullName: true,
  role: true,
});

// Donations schema for tracking donations
export const donations = pgTable("donations", {
  id: serial("id").primaryKey(),
  receiptNumber: text("receipt_number").notNull().unique(),
  date: date("date").notNull(),
  donorName: text("donor_name").notNull(),
  contactNumber: text("contact_number").notNull(),
  address: text("address").notNull(),
  email: text("email").notNull(),
  panNumber: text("pan_number").notNull(),
  paymentMode: text("payment_mode").notNull(),
  amount: integer("amount").notNull(),
  amountInWords: text("amount_in_words").notNull(),
  purpose: text("purpose").notNull(),
  instrumentDate: date("instrument_date"),
  drawnOn: text("drawn_on"),
  instrumentNumber: text("instrument_number"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDonationSchema = createInsertSchema(donations).pick({
  receiptNumber: true,
  date: true,
  donorName: true,
  contactNumber: true,
  address: true,
  email: true,
  panNumber: true,
  paymentMode: true,
  amount: true,
  amountInWords: true,
  purpose: true,
  instrumentDate: true,
  drawnOn: true,
  instrumentNumber: true,
});

export const loginSchema = z.object({
  username: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertDonation = z.infer<typeof insertDonationSchema>;
export type Donation = typeof donations.$inferSelect;
export type LoginCredentials = z.infer<typeof loginSchema>;
