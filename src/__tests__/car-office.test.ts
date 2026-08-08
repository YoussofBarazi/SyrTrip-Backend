import request from 'supertest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import jwt from 'jsonwebtoken';
import carOfficeRoutes from '../routes/carOffice.route.js';
import { prisma } from '../utils/prisma.js';

vi.mock('../utils/prisma.js', () => ({
  prisma: {
    user: { findUnique: vi.fn(), update: vi.fn() },
    carOffice: { findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn() },
    $transaction: vi.fn()
  }
}));

const app = express();
app.use(express.json());
app.use('/api/offices', carOfficeRoutes);

describe('Car Office Controller - 1-to-1 Constraint', () => {
  const MOCK_SECRET = 'test-secret';
  let adminToken: string;

  beforeEach(() => {
    process.env.JWT_SECRET = MOCK_SECRET;
    adminToken = jwt.sign({ userId: 'admin-1', role: 'ADMIN' }, MOCK_SECRET);
    
    // Completely wipe all mock history and implementations before each test
    vi.resetAllMocks();

    // Re-apply the transaction callback mock
    (prisma.$transaction as any).mockImplementation(async (cb: any) => {
      if (typeof cb === 'function') return cb(prisma);
      return cb;
    });
  });

  it('should block creation if the user already owns a Car Office (409)', async () => {
    // 1. Mock the user being found
    (prisma.user.findUnique as any).mockResolvedValue({
      id: 'user-2',
      email: 'owner@test.com',
      role: 'CAR_RENTAL_OWNER',
      carOffice: { id: 'office-1', name: 'Existing Office' }
    });

    // 2. Mock finding an existing office for this user (if controller does a double check)
    (prisma.carOffice.findUnique as any).mockResolvedValue({ id: 'office-1' });
    (prisma.carOffice.findFirst as any).mockResolvedValue({ id: 'office-1' });

    const response = await request(app)
      .post('/api/offices')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        ownerEmail: 'owner@test.com',
        name: 'Second Office',
        description: 'A premium car rental office located in the city center',
        location: 'Aleppo',
        lat: 36.20,
        lng: 37.15,
        phone: '+963212233445'
      });
      
      console.log("RAW RESPONSE:", response.text);
      expect(response.status).toBe(409);
      expect(response.body.message).toMatch(/Conflict/);
  });

  it('should allow creation if the user does NOT own an office (201)', async () => {
    // 1. Mock the user being found with NO car office
    (prisma.user.findUnique as any).mockResolvedValue({
      id: 'user-3',
      email: 'newowner@test.com',
      role: 'CUSTOMER',
      carOffice: null
    });

    // 2. Ensure Prisma confirms no office exists
    (prisma.carOffice.findUnique as any).mockResolvedValue(null);
    (prisma.carOffice.findFirst as any).mockResolvedValue(null);

    // 3. Mock the successful transaction writes
    (prisma.carOffice.create as any).mockResolvedValue({
      id: 'office-2',
      name: 'Brand New Office'
    });
    (prisma.user.update as any).mockResolvedValue({
      id: 'user-3',
      role: 'CAR_RENTAL_OWNER'
    });

    const response = await request(app)
      .post('/api/offices')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        ownerEmail: 'newowner@test.com',
        name: 'Brand New Office',
        description: 'Our newest fleet office offering standard and luxury vehicles',
        location: 'Homs',
        lat: 34.73,
        lng: 36.71,
        phone: '+963312233445'
      });
      
    console.log("RAW RESPONSE:", response.text);
    expect(response.status).toBe(201);
    expect(prisma.$transaction).toHaveBeenCalled();
  });
});