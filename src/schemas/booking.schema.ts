import { z } from 'zod';

export const createBookingSchema = z.object({
  itemType: z.enum(['HOTEL', 'CAR', 'RESTAURANT']),
  hotelId: z.string().optional(),
  carId: z.string().optional(),
  restaurantId: z.string().optional(),
  startDate: z.string().optional().transform((val) => (val ? new Date(val) : undefined)),
  endDate: z.string().optional().transform((val) => (val ? new Date(val) : undefined)),
  bookingTime: z.string().optional(),
});

export const updateBookingStatusSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED', 'CANCELLED']),
});