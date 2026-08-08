import request from 'supertest';
import { describe, it, expect } from 'vitest';
import express, { type Response } from 'express';
import jwt from 'jsonwebtoken';
import { authenticate, authorize, type AuthRequest } from '../middlewares/auth.middleware.js';

const MOCK_SECRET = 'test-secret';
process.env.JWT_SECRET = MOCK_SECRET; // Set environment variable before generating test tokens

const app = express();
app.get(
  '/api/protected-admin',
  authenticate,
  authorize(['ADMIN']),
  (req: AuthRequest, res: Response) => {
    res.status(200).json({ message: 'Welcome Admin' });
  }
);

describe('Auth & Role Middleware', () => {
  it('should deny access if no token is provided (401)', async () => {
    const response = await request(app).get('/api/protected-admin');
    
    expect(response.status).toBe(401);
    expect(response.body.message).toBe('Unauthorized: Missing or invalid token');
  });

  it('should deny access if a CUSTOMER tries to hit an ADMIN route (403)', async () => {
    const customerToken = jwt.sign({ userId: '1', role: 'CUSTOMER' }, MOCK_SECRET);

    const response = await request(app)
      .get('/api/protected-admin')
      .set('Authorization', `Bearer ${customerToken}`);
    
    expect(response.status).toBe(403);
    expect(response.body.message).toBe('Forbidden: Insufficient permissions');
  });

  it('should grant access if an ADMIN requests an ADMIN route (200)', async () => {
    const adminToken = jwt.sign({ userId: '2', role: 'ADMIN' }, MOCK_SECRET);

    const response = await request(app)
      .get('/api/protected-admin')
      .set('Authorization', `Bearer ${adminToken}`);
    
    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Welcome Admin');
  });
});