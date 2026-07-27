import { z } from 'zod'

export const createHotelSchema = z.object({
  ownerEmail: z.email(),
  name: z.string().min(2, 'Hotel name must be at least 2 characters'),
  description: z.string().optional(),
  location: z.string().min(2, 'Location is required'),
  lat: z.number({ error: 'Latitude is required'}),
  lng: z.number({ error: 'Longitude is required'}),
  phone: z.string().min(10, 'Valid phone number is required'),
  images: z.array(z.string().url('Each image must be a valid URL')).default([]),
  pricePerNight: z.number().positive('Price per night must be greater than 0'),
  isAvailable: z.boolean().optional().default(true)
})

export const updateHotelSchema = createHotelSchema.omit({ ownerEmail: true }).partial();