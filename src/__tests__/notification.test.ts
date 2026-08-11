import request from 'supertest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import jwt from 'jsonwebtoken';
import notificationRoutes from '../routes/notification.route.js';
import { prisma } from '../utils/prisma.js';

// 1. Mock Prisma
vi.mock('../utils/prisma.js', () => ({
  prisma: {
    user: { update: vi.fn() },
    notification: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
  },
}));

// 2. Setup Express App
const app = express();
app.use(express.json());
app.use('/api/notifications', notificationRoutes);

describe('Notification Controller', () => {
  const MOCK_SECRET = 'test-secret';
  let customerToken: string;
  let adminToken: string;

  beforeEach(() => {
    process.env.JWT_SECRET = MOCK_SECRET;
    // Generate mock tokens
    customerToken = jwt.sign({ userId: 'customer-1', role: 'CUSTOMER' }, MOCK_SECRET);
    adminToken = jwt.sign({ userId: 'admin-1', role: 'ADMIN' }, MOCK_SECRET);
    
    // Clear all mocks before each test
    vi.resetAllMocks();
  });

  describe('POST /fcm-token', () => {
    it('should save the FCM token successfully (200)', async () => {
      (prisma.user.update as any).mockResolvedValue({ id: 'customer-1', fcmToken: 'valid-token' });

      const response = await request(app)
        .post('/api/notifications/fcm-token')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ fcmToken: 'valid-token' });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('FCM token saved successfully');
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'customer-1' },
        data: { fcmToken: 'valid-token' },
      });
    });

    it('should reject if FCM token is missing (400)', async () => {
      const response = await request(app)
        .post('/api/notifications/fcm-token')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({}); // Missing token

      expect(response.status).toBe(400);
    });
  });

  describe('GET /me', () => {
    it('should fetch user notifications (200)', async () => {
      const mockNotifications = [
        { id: 'notif-1', title: 'Hello', message: 'Test message', isRead: false },
      ];
      (prisma.notification.findMany as any).mockResolvedValue(mockNotifications);

      const response = await request(app)
        .get('/api/notifications/me')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.notifications).toHaveLength(1);
      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'customer-1' } })
      );
    });
  });

  describe('PATCH /:id/read', () => {
    it('should mark a notification as read (200)', async () => {
      // Mock finding the notification belonging to this user
      (prisma.notification.findUnique as any).mockResolvedValue({
        id: 'notif-1',
        userId: 'customer-1', // Matches token
        isRead: false,
      });

      (prisma.notification.update as any).mockResolvedValue({ id: 'notif-1', isRead: true });

      const response = await request(app)
        .patch('/api/notifications/notif-1/read')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(200);
      expect(prisma.notification.update).toHaveBeenCalledWith({
        where: { id: 'notif-1' },
        data: { isRead: true },
      });
    });

    it('should return 404 if notification belongs to someone else', async () => {
      (prisma.notification.findUnique as any).mockResolvedValue({
        id: 'notif-1',
        userId: 'different-user', // Security check!
        isRead: false,
      });

      const response = await request(app)
        .patch('/api/notifications/notif-1/read')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('POST /admin/send', () => {
    it('should allow Admin to send a custom notification (201)', async () => {
      const payload = {
        userId: 'customer-2',
        title: 'Promo',
        message: '10% off',
        url: '/promo'
      };

      (prisma.notification.create as any).mockResolvedValue({ id: 'notif-2', ...payload });

      const response = await request(app)
        .post('/api/notifications/admin/send')
        .set('Authorization', `Bearer ${adminToken}`) // Admin token!
        .send(payload);

      expect(response.status).toBe(201);
      expect(prisma.notification.create).toHaveBeenCalled();
    });

    it('should block non-admins from sending notifications (403)', async () => {
      const response = await request(app)
        .post('/api/notifications/admin/send')
        .set('Authorization', `Bearer ${customerToken}`) // Customer token!
        .send({
          userId: 'some-user',
          title: 'Hacked',
          message: 'Hacked message'
        });

      // Based on your authorization middleware, this should block access
      expect(response.status).toBe(403);
    });
  });
});