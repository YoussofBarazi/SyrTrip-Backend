import { z } from 'zod';

// --- Landmark Schemas ---
export const createLandmarkSchema = z.object({
  name: z.string().min(2, 'Landmark name is required'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  location: z.string().min(2, 'Location is required'),
  lat: z.number({ error: 'Latitude is required' }),
  lng: z.number({ error: 'Longitude is required' }),
  images: z.array(z.string().url('Must be a valid image URL')).default([]),
});

export const updateLandmarkSchema = createLandmarkSchema.partial();


// --- Event Schemas ---
export const createEventSchema = z.object({
  name: z.string().min(2, 'Event name is required'),
  type: z.string().min(2, 'Event type is required (e.g. Festival, Concert, Cultural)'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  startDate: z.string().transform((val) => new Date(val)),
  endDate: z.string().transform((val) => new Date(val)),
  time: z.string().optional(),
  price: z.number().min(0, 'Price cannot be negative').default(0.0),
  location: z.string().min(2, 'Location is required'),
  lat: z.number({ error: 'Latitude is required' }),
  lng: z.number({ error: 'Longitude is required' }),
  images: z.array(z.string().url('Must be a valid image URL')).default([]),
});

export const updateEventSchema = createEventSchema.partial();