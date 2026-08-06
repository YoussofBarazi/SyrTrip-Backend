import { z } from 'zod';

export const createRestaurantSchema = z.object({
  ownerEmail: z.string().email('Valid owner email is required'),
  name: z.string().min(2, 'Restaurant name is required'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  location: z.string().min(2, 'Location is required'),
  lat: z.number({ message: 'Latitude is required' }),
  lng: z.number({ message: 'Longitude is required' }),
  phone: z.string().min(5, 'Valid phone number is required'),
  images: z.array(z.string().url('Must be a valid image URL')).default([]),
  isAvailable: z.boolean().optional().default(true),
});

export const updateRestaurantSchema = createRestaurantSchema.omit({ ownerEmail: true }).partial();