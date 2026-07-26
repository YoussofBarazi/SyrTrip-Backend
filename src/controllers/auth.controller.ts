import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

import { generateToken } from '../utils/jwt.js';
import { prisma } from '../utils/prisma.js';

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  name: z.string().min(2, 'Name is required'),
  phone: z.string().nullable().optional(),
  role: z.enum(['CUSTOMER', 'HOTEL_OWNER', 'CAR_RENTAL_OWNER', 'RESTAURANT_OWNER', 'ADMIN']).default('CUSTOMER'),
})

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// 1. User Registration
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const validatedData = registerSchema.parse(req.body)

    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    })

    if (existingUser) {
      res.status(400).json({ message: 'Email is already registered' })
      return
    }

    const hashedPassword = await bcrypt.hash(validatedData.password, 10)

    const user = await prisma.user.create({
      data: {
        email: validatedData.email,
        name: validatedData.name,
        ...(validatedData.phone && { phone: validatedData.phone }),
        ...(validatedData.role && { role: validatedData.role }),
        password: hashedPassword,
      }
    })

    const token = generateToken({ userId: user.id, role: user.role })

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: error.issues })
    } else {
      res.status(500).json({ message: 'Internal server error', error: error.message })
    }
  }
}

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const validatedData = loginSchema.parse(req.body)

    const user = await prisma.user.findUnique({
      where: { email: validatedData.email }
    })

    if (!user) {
      res.status(400).json({
        message: 'Invalid email'
      })

      return
    }

    const isPasswordValid = await bcrypt.compare(validatedData.password, user.password)

    if (!isPasswordValid) {
      res.status(400).json({
        message: 'Invalid password'
      })
      return 
    }

    const token = generateToken({ 
      userId: user.id, 
      role: user.role 
    })

    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    })
  } catch(error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: error.issues
      }) 
    } else {
      res.status(500).json({
        message: 'Internal server error',
        error: error.message
      })
    }
  }
}


