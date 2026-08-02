import { z } from 'zod'

export const createCarOfficeSchema = z.object({
  ownerEmail: z.string().email('Valid owner email is required'),
  name: z.string().min(2, 'Name is required with at least 2 characters'),
  description: z.string().optional(),
  location: z.string().min(2, 'Location is required'),
  lat: z.number().optional(),
  lng: z.number().optional(),
  phone: z.string().min(5, 'Valid phone number is required'),
})

export const updateCarOfficeSchema = createCarOfficeSchema.omit({ ownerEmail: true }).partial()

const CarTypeEnum = z.enum([
  'SEDAN', 'SUV', 'HATCHBACK', 'CONVERTIBLE', 
  'COUPE', 'MINIVAN', 'PICKUP_TRUCK', 'STATION_WAGON'
]);

export const createCarSchema = z.object({
  name: z.string().min(2, 'Car name is required'),
  type: CarTypeEnum,
  color: z.string().min(2, 'Color is required'),
  pricePerDay: z.number().positive('Price must be greater than 0'),
  images: z.array(z.string().url('Must be a valid URL')).default([]),
  isAvailable: z.boolean().optional().default(true),
});

export const updateCarSchema = createCarSchema.partial();