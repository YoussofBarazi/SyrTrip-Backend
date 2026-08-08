import request from 'supertest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import jwt from 'jsonwebtoken';
import bookingRoutes from '../routes/booking.route.js';
import { prisma } from '../utils/prisma.js';

vi.mock('../utils/prisma.js', () => ({
  prisma: {
    hotel: { findUnique: vi.fn() },
    car: { findUnique: vi.fn() },
    restaurant: { findUnique: vi.fn() },
    booking: { create: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() }
  }
}));

const app = express();
app.use(express.json());
app.use('/api/bookings', bookingRoutes);

describe('Booking Engine - Price Calculation', () => {
  const MOCK_SECRET = 'test-secret';
  let token: string;

  beforeEach(() => {
    process.env.JWT_SECRET = MOCK_SECRET;
    token = jwt.sign({ userId: 'user-123', role: 'CUSTOMER' }, MOCK_SECRET);
    vi.clearAllMocks();
  });

  it('should correctly calculate total price for a 3-night hotel stay', async () => {
    (prisma.hotel.findUnique as any).mockResolvedValue({
      id: 'hotel-1',
      isAvailable: true,
      pricePerNight: 100,
    });

    (prisma.booking.create as any).mockResolvedValue({
      id: 'booking-1',
      totalPrice: 300,
    });

    const startDate = new Date('2026-08-10T14:00:00Z');
    const endDate = new Date('2026-08-13T10:00:00Z');

    const response = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        itemType: 'HOTEL',
        hotelId: 'hotel-1',
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

    expect(response.status).toBe(201);
    expect(prisma.booking.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ totalPrice: 300 })
      })
    );
  });

  it('should fail (400) if end date is before start date', async () => {
    (prisma.hotel.findUnique as any).mockResolvedValue({
      id: 'hotel-1',
      isAvailable: true,
      pricePerNight: 100,
    });

    const startDate = new Date('2026-08-15T14:00:00Z');
    const endDate = new Date('2026-08-10T10:00:00Z');

    const response = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        itemType: 'HOTEL',
        hotelId: 'hotel-1',
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('End date must be after start date');
  });
});