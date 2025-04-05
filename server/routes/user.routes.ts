import { Router, Request, Response } from 'express';
import { storage } from '../storage';
import { insertUserSchema } from '@shared/schema';
import { ZodError } from 'zod';
import { fromZodError } from 'zod-validation-error';

const router = Router();

// Get all users
router.get('/', async (req: Request, res: Response) => {
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

// Create new user
router.post('/', async (req: Request, res: Response) => {
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

// Update user status
router.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const idParam = req.params.id;
    console.log(`Received status update request for user ID: ${idParam}, body:`, req.body);
    
    // Don't parse the ID at all, just pass it as is to the storage layer
    const id = idParam;

    const { isActive } = req.body;
    if (typeof isActive !== 'boolean') {
      console.log(`Invalid isActive value: ${isActive}, type: ${typeof isActive}`);
      return res.status(400).json({ message: "isActive must be a boolean value" });
    }
    
    console.log(`Looking for user with ID: ${id}`);
    
    // Get the user first to check if it exists
    const user = await storage.getUser(id);
    if (!user) {
      console.log(`User not found with ID: ${id}`);
      return res.status(404).json({ message: "User not found" });
    }
    
    console.log(`Found user: ${user.username}, updating status to: ${isActive}`);
    
    // Check if this is the currently logged-in user
    const currentUserId = req.headers['user-id'];
    console.log(`Current user ID from headers: ${currentUserId}`);
    
    const isDeactivatingSelf = currentUserId && 
      (currentUserId === id.toString() || currentUserId === id) && 
      !isActive;
    
    console.log(`Updating user status for ID: ${id}, isActive: ${isActive}`);
    const updatedUser = await storage.updateUserStatus(id, isActive);
    
    if (!updatedUser) {
      console.log(`Failed to update user status for ID: ${id}`);
      return res.status(500).json({ message: "Failed to update user status" });
    }
    
    console.log(`Successfully updated user status for: ${updatedUser.username}, new status: ${updatedUser.isActive}`);
    
    // If deactivating the current user, include a flag to indicate client should log out
    if (isDeactivatingSelf) {
      return res.status(200).json({
        id: updatedUser.id,
        username: updatedUser.username,
        fullName: updatedUser.fullName,
        role: updatedUser.role,
        isActive: updatedUser.isActive,
        createdAt: updatedUser.createdAt,
        shouldLogout: true
      });
    }
    
    return res.status(200).json({
      id: updatedUser.id,
      username: updatedUser.username,
      fullName: updatedUser.fullName,
      role: updatedUser.role,
      isActive: updatedUser.isActive,
      createdAt: updatedUser.createdAt
    });
  } catch (error: unknown) {
    console.error('Error updating user status:', error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Delete user
router.delete('/:id', async (req: Request, res: Response) => {
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

export default router;
