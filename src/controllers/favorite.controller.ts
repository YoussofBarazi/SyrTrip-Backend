import { type Response } from 'express';
import { z } from 'zod';
import { type AuthRequest } from '../middlewares/auth.middleware.js';
import { prisma } from '../utils/prisma.js';
import { toggleFavoriteSchema } from '../schemas/interaction.schema.js';

export const toggleFavorite = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { itemType, itemId } = toggleFavoriteSchema.parse(req.body);

    const relationField = `${itemType.toLowerCase()}Id`; // e.g., 'hotelId'

    // 1. Check if the favorite already exists
    const existingFavorite = await prisma.favorite.findFirst({
      where: {
        userId,
        [relationField]: itemId,
      } as any,
    });

    // 2. Toggle logic
    if (existingFavorite) {
      await prisma.favorite.delete({ where: { id: existingFavorite.id } });
      res.status(200).json({ message: 'Removed from favorites', isFavorite: false });
    } else {
      await prisma.favorite.create({
        data: {
          userId,
          [relationField]: itemId,
        } as any,
      });
      res.status(201).json({ message: 'Added to favorites', isFavorite: true });
    }
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ errors: error.issues });
      return;
    }
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

export const getMyFavorites = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;

    const favorites = await prisma.favorite.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        hotel: {
          include: {
            reviews: {
              take: 5,
              orderBy: { createdAt: 'desc' },
              include: {
                user: { select: { id: true, name: true } },
              },
            },
          },
        },
        car: {
          include: {
            reviews: {
              take: 5,
              orderBy: { createdAt: 'desc' },
              include: {
                user: { select: { id: true, name: true } },
              },
            },
          },
        },
        restaurant: {
          include: {
            reviews: {
              take: 5,
              orderBy: { createdAt: 'desc' },
              include: {
                user: { select: { id: true, name: true } },
              },
            },
          },
        },
        landmark: {
          include: {
            reviews: {
              take: 5,
              orderBy: { createdAt: 'desc' },
              include: {
                user: { select: { id: true, name: true } },
              },
            },
          },
        },
        event: true,
      },
    });

    res.status(200).json({ favorites });
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};