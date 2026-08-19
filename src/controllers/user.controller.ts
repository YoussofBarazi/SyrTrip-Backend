import { type Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { type AuthRequest } from '../middlewares/auth.middleware.js';
import { prisma } from '../utils/prisma.js';
import { updateProfileSchema, updatePasswordSchema } from '../schemas/user.schema.js';
import { removeNull } from '../utils/helpers.js';

// 1. Get Own Profile
export const getMyProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        createdAt: true,
        reviews: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.status(200).json({ user });
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

// 2. Update Own Profile (Name, Phone, etc.)
export const updateMyProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const validatedData = updateProfileSchema.parse(req.body);

    const dataToUpdate = removeNull(validatedData);

    if (Object.keys(dataToUpdate).length === 0) {
      res.status(400).json({ message: 'No valid fields provided for update' });
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: dataToUpdate,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
      },
    });

    res.status(200).json({ message: 'Profile updated successfully', user: updatedUser });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ errors: error.issues });
      return;
    }
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

// 3. Change Password
export const updateMyPassword = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { oldPassword, newPassword } = updatePasswordSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Verify the old password
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      res.status(401).json({ message: 'Incorrect old password' });
      return;
    }

    // Prevent reusing the same password
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      res.status(400).json({ message: 'New password cannot be the same as the old password' });
      return;
    }

    // Hash and save the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    res.status(200).json({ message: 'Password updated successfully' });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ errors: error.issues });
      return;
    }
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

export const getAdminUsers = async (req: AuthRequest, res: Response) => {
  try {
    const { name, role } = req.query;

    const users = await prisma.user.findMany({
      where: {
        // Apply name filter if provided, using case-insensitive search
        ...(name && typeof name === 'string' 
            ? { name: { contains: name, mode: 'insensitive' } } 
            : {}),
        // Apply role filter if provided
        ...(role && typeof role === 'string' 
            ? { role: role.toUpperCase() as any } 
            : {}),
      },
      // Only select exactly what the Admin needs to minimize payload size
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        fcmToken: true,
        reviews: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    return res.status(200).json({ users });
  } catch (error) {
    console.error('Error fetching users for admin:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};