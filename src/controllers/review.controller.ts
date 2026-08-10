import type { Request, Response } from 'express';
import { z } from 'zod';
import { type AuthRequest } from '../middlewares/auth.middleware.js';
import { prisma } from '../utils/prisma.js';
import { createReviewSchema } from '../schemas/interaction.schema.js';

export const createReview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { itemType, itemId, rating, comment } = createReviewSchema.parse(req.body);

    const relationField = `${itemType.toLowerCase()}Id`;

    // Prevent duplicate reviews from the same user for the same item
    const existingReview = await prisma.review.findFirst({
      where: {
        userId,
        [relationField]: itemId,
      } as any,
    });

    if (existingReview) {
      res.status(409).json({ message: 'You have already reviewed this item' });
      return;
    }

    const review = await prisma.review.create({
      data: {
        userId,
        rating,
        comment,
        [relationField]: itemId,
      } as any,
    });

    res.status(201).json({ message: 'Review submitted successfully', review });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ errors: error.issues });
      return;
    }
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

export const getItemReviews = async (req: Request, res: Response): Promise<void> => {
  try {
    const { itemType, itemId } = req.query;

    if (!itemType || !itemId || typeof itemType !== 'string' || typeof itemId !== 'string') {
      res.status(400).json({ message: 'itemType and itemId are required as query parameters' });
      return;
    }

    const relationField = `${itemType.toLowerCase()}Id`;

    const reviews = await prisma.review.findMany({
      where: { [relationField]: itemId } as any,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true } },
      },
    });

    // Calculate average rating dynamically
    const averageRating = reviews.length > 0 
      ? reviews.reduce((sum, rev) => sum + rev.rating, 0) / reviews.length 
      : 0;

    res.status(200).json({ 
      totalReviews: reviews.length,
      averageRating: parseFloat(averageRating.toFixed(1)),
      reviews 
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};