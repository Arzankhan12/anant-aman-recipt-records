import { Router, Request, Response } from 'express';
import { storage } from '../storage';
import { insertDonationSchema } from '@shared/schema';
import { ZodError } from 'zod';
import { fromZodError } from 'zod-validation-error';
import { sendEmailWithAttachment } from '../emailService';
import fs from 'fs/promises';

const router = Router();

// Create new donation
router.post('/', async (req: Request, res: Response) => {
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

// Get all donations
router.get('/', async (req: Request, res: Response) => {
  try {
    const donations = await storage.getDonations();
    return res.status(200).json(donations);
  } catch (error: unknown) {
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Get next receipt number
router.get('/next-receipt-number', async (req: Request, res: Response) => {
  try {
    const lastReceiptNumber = await storage.getLastReceiptNumber();
    console.log('Last receipt number from MongoDB:', lastReceiptNumber);
    
    // Increment the receipt number
    const nextReceiptNumber = lastReceiptNumber ? (parseInt(lastReceiptNumber) + 1).toString() : '1001';
    console.log('Next receipt number:', nextReceiptNumber);
    
    return res.status(200).json({ receiptNumber: nextReceiptNumber });
  } catch (error: unknown) {
    console.error('Error getting next receipt number:', error);
    // Fallback to a default receipt number if there's an error
    return res.status(200).json({ receiptNumber: '1001' });
  }
});

// Send email with receipt
router.post('/send-email', async (req: Request, res: Response) => {
  try {
    const { to, subject, text, attachmentPath } = req.body;
    
    if (!to || !subject || !attachmentPath) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    
    // Read the PDF file into a buffer
    const pdfBuffer = await fs.readFile(attachmentPath);
    
    // Send email with the PDF attachment
    await sendEmailWithAttachment(to, subject, text || '', pdfBuffer);
    
    return res.status(200).json({ message: "Email sent successfully" });
  } catch (error: unknown) {
    console.error('Error sending email:', error);
    return res.status(500).json({ message: "Failed to send email" });
  }
});

export default router;
