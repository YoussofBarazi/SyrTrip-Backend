import { type Response } from 'express'
import { z } from 'zod'
import { type AuthRequest } from '../middlewares/auth.middleware.js'
import { prisma } from '../utils/prisma.js'
import { createBookingSchema, updateBookingStatusSchema } from '../schemas/booking.schema.js'
import { sendPushNotification } from '../utils/firebase.js';
import { toArabicBookingStatus, toArabicItemType } from '../utils/helpers.js'

// 1. Create a Booking (Customer)
export const createBooking = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const validatedData = createBookingSchema.parse(req.body)
    const userId = req.user!.userId

    let totalPrice = 0

    let hotel, car, restaurant

    if (validatedData.itemType === 'HOTEL') {
      if (!validatedData.hotelId || !validatedData.endDate || !validatedData.startDate) {
        res.status(400).json({ message: 'Hotel ID, start date, and end date are required for hotel bookings' })
        return 
      }

      hotel = await prisma.hotel.findUnique({
        where: { id: validatedData.hotelId },
      })

      if (!hotel || !hotel.isAvailable) {
        res.status(404).json({ message: 'Hotel not found or not available' })
        return
      }

      const diffTime = validatedData.endDate.getTime() - validatedData.startDate.getTime()
      const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

      if (nights <= 0) {
        res.status(400).json({ message: 'End date must be after start date' })
        return
      }

      totalPrice = nights * hotel.pricePerNight
    } else if (validatedData.itemType === 'CAR') {
      if (!validatedData.carId || !validatedData.endDate || !validatedData.startDate) {
        res.status(400).json({ message: 'Car ID, start date, and end date are required for car bookings' })
        return
      }

      car = await prisma.car.findUnique({
        where: { id: validatedData.carId },
        include: { office: true }
      })

      if (!car || !car.isAvailable) {
        res.status(404).json({ message: 'Car not found or not available' })
        return
      }

      const diffTime = validatedData.endDate.getTime() - validatedData.startDate.getTime()
      const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

      if (days <= 0) {
        res.status(400).json({ message: 'End date must be after start date' })
        return
      }

      totalPrice = days * car.pricePerDay
    } else if (validatedData.itemType === 'RESTAURANT') {
      if (!validatedData.restaurantId || !validatedData.bookingTime) {
        res.status(400).json({ message: 'Restaurant ID and booking time are required for restaurant bookings' })
        return
      }

      restaurant = await prisma.restaurant.findUnique({
        where: { id: validatedData.restaurantId },
      })

      if (!restaurant || !restaurant.isAvailable) {
        res.status(404).json({ message: 'Restaurant not found or not available' })
        return
      }

      totalPrice = 0.0
    }

    const booking = await prisma.booking.create({
      data: {
        userId,
        itemType: validatedData.itemType,
        hotelId: validatedData.hotelId || null,
        carId: validatedData.carId || null,
        restaurantId: validatedData.restaurantId || null,
        startDate: validatedData.startDate || null,
        endDate: validatedData.endDate || null,
        totalPrice,
      }
    })

    // Trigger Notification for Owners
    let targetOwnerId: string | undefined;

    if (validatedData.itemType === 'HOTEL' && hotel) {
      targetOwnerId = hotel.ownerId
    } else if (validatedData.itemType === 'CAR' && car) {
      targetOwnerId = car.office.ownerId
    } else if (validatedData.itemType === 'RESTAURANT' && restaurant) {
      targetOwnerId = restaurant.ownerId
    }

    if (targetOwnerId) {
      // 1. Save to Database (Ensures it appears in the bell dropdown)
      await prisma.notification.create({
        data: {
          userId: targetOwnerId,
          title: 'لديكم حجز جديد',
          message: `لديكم حجز جديد لل${toArabicItemType(validatedData.itemType)} الخاص بكم.`,
          url: `/owner/bookings/${booking.id}`
        },
      });

      // 2. Send Android Push (Wakes up the owner's phone)
      sendPushNotification(
        targetOwnerId,
        'لديكم حجز جديد',
        `لديكم حجز جديد لل${toArabicItemType(validatedData.itemType)} الخاص بكم.`
      );
    }
    res.status(201).json({ message: 'Booking created successfully', booking })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ errors: error.issues })
      return
    }
    res.status(500).json({ message: 'Internal server error', error: error.message })
  }
}

// 2. Get Customer's Own Bookings
export const getMyBookings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId
    const bookings = await prisma.booking.findMany({
      where: { userId },
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
      },
    })
    res.status(200).json({ bookings })
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error', error: error.message })
  } 
}

// 3. Get Owner's Incoming Bookings (Hotels, Cars, or Restaurants)
export const getOwnerBookings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId
    const userRole = req.user!.role

    const whereCondition: any = {}

    if (userRole === 'HOTEL_OWNER') {
      whereCondition.hotel = { ownerId: userId }
    } else if (userRole === 'CAR_RENTAL_OWNER') { 
      whereCondition.car = { office: { ownerId: userId } }
    } else if (userRole === 'RESTAURANT_OWNER') {
      whereCondition.restaurant = { ownerId: userId }
    } else if (userRole === 'ADMIN') {
      // Admin can view all bookings
    } else {
      res.status(403).json({ message: 'Unauthorized' })
      return
    }

    const bookings = await prisma.booking.findMany({
      where: whereCondition,
      include: {
        user: true,
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
            office: true,
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
      },
    })

    res.status(200).json({ bookings })
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error', error: error.message })
  }
}

// 4. Update Booking Status (Approve, Reject, or Cancel)
export const updateBookingStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const bookingId = req.params.bookingId as string
    const userId = req.user!.userId
    const userRole = req.user!.role

    const validatedData = updateBookingStatusSchema.parse(req.body)

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        hotel: true,
        car: { include: { office: true } },
        restaurant: true,
      }
    })

    if (!booking) {
      res.status(404).json({ message: 'Booking not found' })
      return
    }
    
    // Check authorization: Customer can cancel their own booking; Owner/Admin can approve/reject/cancel
    const isCustomer = booking.userId === userId && userRole === 'CUSTOMER'
    const isHotelOwner = booking.hotel?.ownerId === userId && userRole === 'HOTEL_OWNER'
    const isCarOwner = booking.car?.office?.ownerId === userId && userRole === 'CAR_RENTAL_OWNER'
    const isRestaurantOwner = booking.restaurant?.ownerId === userId && userRole === 'RESTAURANT_OWNER'
    const isAdmin = userRole === 'ADMIN'

    if (!isCustomer && !isHotelOwner && !isCarOwner && !isRestaurantOwner && !isAdmin) {
      res.status(403).json({ message: 'Unauthorized to update this booking' })
      return
    }

    // Customers can only change status to CANCELLED
    if (isCustomer && validatedData.status === 'CANCELLED') {
      res.status(403).json({ message: 'Customers can only cancel their own bookings' })
      return
    }

    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: { status: validatedData.status },
    })

    // Trigger Notification for Customers when their booking status is updated by the owner or admin
    // We only notify if the person updating the status is NOT the customer themselves
    if (userId !== booking.userId) {
      // 1. Save to Database
      await prisma.notification.create({
        data: {
          userId: booking.userId,
          title: `Booking ${updatedBooking.status}`,
          message: `Your booking status has been updated to ${updatedBooking.status}.`,
          url: `/my-bookings`
        },
      });

      // 2. Send Android Push (Alerts the customer that their trip is approved/rejected)
      sendPushNotification(
        booking.userId,
        `${toArabicBookingStatus(updatedBooking.status)}`,
        `تغيرت حالة حجزكم إلى: ${toArabicBookingStatus(updatedBooking.status)}.`
      );
    }

    res.status(200).json({ message: 'Booking status updated successfully', booking: updatedBooking })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ errors: error.issues });
      return;
    }
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}
