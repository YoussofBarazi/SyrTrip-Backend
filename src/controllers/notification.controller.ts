import { type Response } from 'express';
import { z } from 'zod';
import { type AuthRequest } from '../middlewares/auth.middleware.js';
import { prisma } from '../utils/prisma.js';

// Schema for Admin sending notifications
const sendNotificationSchema = z.object({
  userId: z.string().min(1, 'Target User ID is required'),
  title: z.string().min(1, 'Notification title is required'),
  message: z.string().min(1, 'Notification message is required'),
  url: z.string().optional().or(z.literal('')), // Optional URL for redirection
});

// 1. Get user`s own notifications
export const getMyNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    
    res.status(200).json({ notifications });
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

// 2. Mark notification as read
export const markAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const notifiactionId = req.params.notificationId as string;
    
    const notification = await prisma.notification.findUnique({
      where: { id: notifiactionId },
    });

    if (!notification || notification.userId !== userId) {
      res.status(404).json({ message: 'Notification not found' });
      return;
    }

    await prisma.notification.update({
      where: { id: notifiactionId },
      data: { isRead: true },
    });

    res.status(200).json({ message: 'Notification marked as read' });
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}

// 3. Admin: Send notification to a specific user
export const sendAdminNotification = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId, title, message, url } = sendNotificationSchema.parse(req.body);

    const notification = await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        url: url || null,
      },
    });

    res.status(201).json({ message: 'Notification sent successfully', notification });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ errors: error.issues });
      return;
    }
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}

// 
export const saveFcmToken = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { fcmToken } = req.body; // No strict Zod validation needed, just grab the string

    if (!fcmToken) {
      res.status(400).json({ message: 'FCM token is required' });
      return;
    }

    await prisma.user.update({
      where: { id: userId },
      data: { fcmToken },
    });

    res.status(200).json({ message: 'FCM token saved successfully' });
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};