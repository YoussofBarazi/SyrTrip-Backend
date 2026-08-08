import request from 'supertest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import bcrypt from 'bcryptjs';
import authRoutes from '../routes/auth.route.js';
import { prisma } from '../utils/prisma.js';

vi.mock('../utils/prisma.js', () => ({
  prisma: {
    user: { findUnique: vi.fn(), create: vi.fn() }
  }
}));
vi.mock('bcryptjs', () => ({
  default: { hash: vi.fn(), compare: vi.fn() }
}));

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

describe('Auth Controller - Registration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should reject registration if email already exists (400)', async () => {
    (prisma.user.findUnique as any).mockResolvedValue({ id: 'user-1', email: 'test@test.com' });

    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@test.com',
        password: 'password123',
        name: 'Test User'
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Email is already registered');
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('should successfully register a new user and return a token (201)', async () => {
    (prisma.user.findUnique as any).mockResolvedValue(null);
    (bcrypt.hash as any).mockResolvedValue('hashed_password');
    (prisma.user.create as any).mockResolvedValue({
      id: 'user-2',
      email: 'new@test.com',
      name: 'New User',
      role: 'CUSTOMER'
    });

    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'new@test.com',
        password: 'password123',
        name: 'New User'
      });

    expect(response.status).toBe(201);
    expect(response.body.message).toBe('User registered successfully');
    expect(response.body).toHaveProperty('token');
    
    expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
  });
});