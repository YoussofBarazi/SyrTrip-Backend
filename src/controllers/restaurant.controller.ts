import { type Response } from 'express';
import { z } from 'zod';
import { type AuthRequest } from '../middlewares/auth.middleware.js';
import { prisma } from '../utils/prisma.js';
import { createRestaurantSchema, updateRestaurantSchema } from '../schemas/restaurant.schema.js';

// 1. Create a new Restaurant (ADMIN only)
export const createRestaurant = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const validatedData = createRestaurantSchema.parse(req.body);

    const owner = await prisma.user.findUnique({
      where: { email: validatedData.ownerEmail },
    });

    if (!owner) {
      res.status(404).json({ message: 'Owner email does not exist' });
      return;
    }

    if (owner.role !== 'CUSTOMER' && owner.role !== 'RESTAURANT_OWNER') {
      res.status(409).json({
        message: `Conflict: Not allowed to assign restaurant to a user with ${owner.role} role`,
      });
      return;
    }

    // Transaction: Upgrade user role if needed, then create the restaurant
    const restaurant = await prisma.$transaction(async (tx) => {
      if (owner.role === 'CUSTOMER') {
        await tx.user.update({
          where: { id: owner.id },
          data: { role: 'RESTAURANT_OWNER' },
        });
      }

      return await tx.restaurant.create({
        data: {
          name: validatedData.name,
          description: validatedData.description,
          location: validatedData.location,
          lat: validatedData.lat,
          lng: validatedData.lng,
          phone: validatedData.phone,
          images: validatedData.images,
          isAvailable: validatedData.isAvailable,
          ownerId: owner.id,
        },
      });
    });

    res.status(201).json({
      message: 'Restaurant created successfully',
      restaurant,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ errors: error.issues });
      return;
    }
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

// 2. Get All Restaurants (Public - Search & Pagination)
export const getRestaurants = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string)?.trim() || '';
    const skip = (page - 1) * limit;

    const whereCondition = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { location: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [restaurants, total] = await Promise.all([
      prisma.restaurant.findMany({
        where: whereCondition,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          owner: {
            select: { id: true, name: true, email: true, phone: true },
          },
          reviews: {
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: {
              user: { select: { id: true, name: true } },
            },
          },
        },
      }),
      prisma.restaurant.count({ where: whereCondition }),
    ]);

    res.status(200).json({
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      restaurants,
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

// 3. Get Restaurant by ID (Public)
export const getRestaurantById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.restaurantId as string;
 
    const restaurant = await prisma.restaurant.findUnique({
      where: { id },
      include: {
        owner: {
          select: { id: true, name: true, email: true, phone: true },
        },
        reviews: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!restaurant) {
      res.status(404).json({ message: 'Restaurant not found' });
      return;
    }

    res.status(200).json({ restaurant });
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

// 4. Update Restaurant (Owner / Admin)
export const updateRestaurant = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.restaurantId as string;
    const userId = req.user!.userId;
    const userRole = req.user!.role;

    const restaurant = await prisma.restaurant.findUnique({ where: { id } });

    if (!restaurant) {
      res.status(404).json({ message: 'Restaurant not found' });
      return;
    }

    // Ownership check (using userId)
    if (restaurant.ownerId !== userId && userRole !== 'ADMIN') {
      res.status(403).json({ message: 'Forbidden: You do not own this restaurant' });
      return;
    }

    const validatedData = updateRestaurantSchema.parse(req.body);

    const dataToUpdate = Object.fromEntries(
      Object.entries(validatedData).filter(([_, value]) => value !== undefined)
    );

    const updatedRestaurant = await prisma.restaurant.update({
      where: { id },
      data: dataToUpdate,
    });

    res.status(200).json({
      message: 'Restaurant updated successfully',
      restaurant: updatedRestaurant,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ errors: error.issues });
      return;
    }
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

// 5. Delete Restaurant (Owner / Admin)
export const deleteRestaurant = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.restaurantId as string;
    const userId = req.user!.userId;
    const userRole = req.user!.role;

    const restaurant = await prisma.restaurant.findUnique({ where: { id } });

    if (!restaurant) {
      res.status(404).json({ message: 'Restaurant not found' });
      return;
    }

    if (restaurant.ownerId !== userId && userRole !== 'ADMIN') {
      res.status(403).json({ message: 'Forbidden: You do not own this restaurant' });
      return;
    }

    await prisma.restaurant.delete({ where: { id } });

    res.status(200).json({ message: 'Restaurant deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};