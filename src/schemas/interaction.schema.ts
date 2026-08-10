import { z } from 'zod';

const itemEnum = z.enum(['HOTEL', 'CAR', 'RESTAURANT', 'LANDMARK', 'EVENT']);

export const toggleFavoriteSchema = z.object({
  itemType: itemEnum,
  itemId: z.string().min(1, 'Item ID is required'),
});

export const createReviewSchema = z.object({
  itemType: itemEnum,
  itemId: z.string().min(1, 'Item ID is required'),
  rating: z.number().int().min(1, 'Minimum rating is 1').max(5, 'Maximum rating is 5'),
  comment: z.string().max(500, 'Comment is too long').optional(),
});