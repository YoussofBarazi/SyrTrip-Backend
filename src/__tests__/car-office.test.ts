import request from 'supertest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import jwt from 'jsonwebtoken';
import carRoutes from '../routes/car.route.js';
import { prisma } from '../utils/prisma.js';

vi.mock('../utils/prisma.js', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    $transaction: vi.fn()
  }
}));

const app = express();
app.use(express.json());
app.use('/api/cars', carRoutes);

describe('Car Office Controller - 1-to-1 Constraint', () => {
  const MOCK_SECRET = 'test-secret';
  let adminToken: string;

  beforeEach(() => {
    process.env.JWT_SECRET = MOCK_SECRET;
    adminToken = jwt.sign({ userId: 'admin-1', role: 'ADMIN' }, MOCK_SECRET);
    vi.clearAllMocks();
  });

  it('should block creation if the user already owns a Car Office (409)', async () => {
    (prisma.user.findUnique as any).mockResolvedValue({
      id: 'user-2',
      email: 'owner@test.com',
      role: 'CAR_RENTAL_OWNER',
      carOffice: {
        id: 'office-1',
        name: 'Existing Office'
      }
    });

    const response = await request(app)
      .post('/api/cars/offices')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        ownerEmail: 'owner@test.com',
        name: 'Second Office',
        location: 'Aleppo',
        phone: '0999999999'
      });

    expect(response.status).toBe(409);
    expect(response.body.message).toBe('Conflict: This user already owns a Car Office');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('should allow creation if the user does NOT own an office (201)', async () => {
    (prisma.user.findUnique as any).mockResolvedValue({
      id: 'user-3',
      email: 'newowner@test.com',
      role: 'CUSTOMER',
      carOffice: null
    });

    (prisma.$transaction as any).mockResolvedValue({
      id: 'office-2',
      name: 'Brand New Office'
    });

    const response = await request(app)
      .post('/api/cars/offices')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        ownerEmail: 'newowner@test.com',
        name: 'Brand New Office',
        location: 'Homs',
        phone: '0988888888'
      });

    expect(response.status).toBe(201);
    expect(prisma.$transaction).toHaveBeenCalled();
  });
});