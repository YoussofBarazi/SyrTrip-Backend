import request from 'supertest'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import  express from 'express'
import jwt from 'jsonwebtoken'
import bookingRoutes from '../routes/booking.route.js'
import { prisma } from '../utils/prisma.js'

vi.mock('../utils/prisma.js', () => ({
  prisma: {
    hotel: { findUnique: vi.fn() },
    booking: { create: vi.fn()}
  }
}))

const app = express()
app.use(express.json())
app.use('/api/bookings', bookingRoutes)

describe('Booking Engine - Price Calculation', () => {
  const MOCK_SECRET = 'test-secret'
  let token: string

  beforeEach(() => {
    process.env.JWT_SECRET = MOCK_SECRET
    token = jwt.sign({ userId: 'user-123', role: 'CUSTOMER' }, MOCK_SECRET)

    vi.clearAllMocks()
  })

  it('should correctly calculate total price for a 3-night hotel stay', async() => {
    (prisma.hotel.findUnique as any).mockResolvedValue({
      id: 'hotel-1',
      isAvailable: true,
      pricePerNight: 100
    })

    (prisma.booking.create as any).mockResolvedValue({
      id: 'booking-1',
      totalPrice: 300,
    })

    const startDate = new Date('2026-08-10T14:00:00Z')
    const endDate = new Date('2026-08-13T14:00:00Z')

    const response = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        itemType: 'HOTEL',
        hotelId: 'hotel-1',
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      })

      expect(response.status).toBe(201)

      expect(prisma.hotel.findUnique).toHaveBeenCalledWith({ where: { id: 'hotel-1' } })

      expect(prisma.booking.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          totalPrice: 300
        })
      })
    })
  
  it('should fail (400) if end date is before start date', async() => {
    (prisma.hotel.findUnique as any).mockResolvedValue({
      id: 'hotel-1',
      isAvailable: true,
      pricePerNight: 100
    })

    const startDate = new Date('2026-08-15T14:00:00Z')
    const endDate = new Date('2026-08-10T10:00:00Z')

    const response = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        itemType: 'HOTEL',
        hotelId: 'hotel-1',
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      })

    expect(response.status).toBe(400)
    expect(response.body.message).toBe('endDate must be after startDate')
    expect(prisma.booking.create).not.toHaveBeenCalled()
  })
})

vi.mock('../utils/prisma.js', () => ({
  prisma: {
    booking: { findUnique: vi.fn(), update: vi.fn() }
  }
}));

app.use('/api/bookings', bookingRoutes);

describe('Booking Controller - Status Updates', () => {
  const MOCK_SECRET = 'test-secret';
  let customerToken: string;
  let ownerToken: string;

  beforeEach(() => {
    process.env.JWT_SECRET = MOCK_SECRET;
    customerToken = jwt.sign({ userId: 'cust-1', role: 'CUSTOMER' }, MOCK_SECRET);
    ownerToken = jwt.sign({ userId: 'owner-1', role: 'HOTEL_OWNER' }, MOCK_SECRET);
    vi.clearAllMocks();
  });

  it('should allow a CUSTOMER to CANCEL their own booking (200)', async () => {
    (prisma.booking.findUnique as any).mockResolvedValue({
      id: 'booking-1',
      userId: 'cust-1',
      hotel: null, car: null, restaurant: null
    });

    (prisma.booking.update as any).mockResolvedValue({ status: 'CANCELLED' });

    const response = await request(app)
      .patch('/api/bookings/booking-1/status')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ status: 'CANCELLED' });

    // Assert
    expect(response.status).toBe(200);
    expect(prisma.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'CANCELLED' } })
    );
  });

  it('should prevent a CUSTOMER from APPROVING their own booking (403)', async () => {
    (prisma.booking.findUnique as any).mockResolvedValue({
      id: 'booking-1',
      userId: 'cust-1',
      hotel: null, car: null, restaurant: null
    });

    const response = await request(app)
      .patch('/api/bookings/booking-1/status')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ status: 'APPROVED' });

    expect(response.status).toBe(403);
    expect(response.body.message).toBe('Customers can only cancel their own bookings');
    expect(prisma.booking.update).not.toHaveBeenCalled();
  });

  it('should allow the HOTEL OWNER to APPROVE the booking (200)', async () => {
    (prisma.booking.findUnique as any).mockResolvedValue({
      id: 'booking-2',
      userId: 'cust-2',
      hotel: { ownerId: 'owner-1' },
      car: null,
      restaurant: null
    });

    (prisma.booking.update as any).mockResolvedValue({ status: 'APPROVED' });

    const response = await request(app)
      .patch('/api/bookings/booking-2/status')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ status: 'APPROVED' });

    expect(response.status).toBe(200);
    expect(prisma.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'APPROVED' } })
    );
  });
});