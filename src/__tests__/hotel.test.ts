import request from 'supertest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import jwt from 'jsonwebtoken';
import hotelRoutes from '../routes/hotel.route.js';
import { prisma } from '../utils/prisma.js';

vi.mock('../utils/prisma.js', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    $transaction: vi.fn()
  }
}));

const app = express();
app.use(express.json());
app.use('/api/hotels', hotelRoutes);

describe('Hotel Controller - Creation', () => {
  const MOCK_SECRET = 'test-secret';
  let adminToken: string;

  beforeEach(() => {
    process.env.JWT_SECRET = MOCK_SECRET;
    adminToken = jwt.sign({ userId: 'admin-1', role: 'ADMIN' }, MOCK_SECRET);
    vi.clearAllMocks();
  });

  it('should fail if the target owner email does not exist (404)', async () => {
    (prisma.user.findUnique as any).mockResolvedValue(null);

    const response = await request(app)
      .post('/api/hotels')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        ownerEmail: 'ghost@test.com',
        name: 'Ghost Hotel',
        description: 'Luxury hotel located in Old Damascus',
        location: 'Damascus',
        lat: 33.51,
        lng: 36.30,
        phone: '+963112233445',
        pricePerNight: 50
      });

    expect(response.status).toBe(404);
    expect(response.body.message).toBe('Owner email does not exist');
  });

  it('should execute transaction to upgrade role and create hotel (201)', async () => {
    (prisma.user.findUnique as any).mockResolvedValue({
      id: 'customer-1',
      email: 'owner@test.com',
      role: 'CUSTOMER'
    });

    (prisma.$transaction as any).mockResolvedValue({
      id: 'hotel-1',
      name: 'Grand Hotel'
    });

    const response = await request(app)
      .post('/api/hotels')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        ownerEmail: 'owner@test.com',
        name: 'Grand Hotel',
        description: 'Five star luxury hotel with full service',
        location: 'Damascus',
        lat: 33.51,
        lng: 36.30,
        phone: '+963112233445',
        pricePerNight: 100
      });

    expect(response.status).toBe(201);
    expect(prisma.$transaction).toHaveBeenCalled();
  });
});