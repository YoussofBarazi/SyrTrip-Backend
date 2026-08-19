import { type Response } from 'express';
import { z } from 'zod';
import { createHotelSchema, updateHotelSchema } from '../schemas/hotel.schema.js';
import { prisma } from '../utils/prisma.js';
import type { AuthRequest } from '../middlewares/auth.middleware.js';
import { removeNull } from '../utils/helpers.js';

// 1. Create a new Hotel (ADMIN)
export const createHotel = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const validatedData = createHotelSchema.parse(req.body)
    const owner = await prisma.user.findUnique({
      where: { email: validatedData.ownerEmail }
    })

    if (!owner) {
      res.status(404).json({
        message: 'Owner email does not exist'
      })
      return 
    }

    if (owner.role !== 'CUSTOMER' && owner.role !== 'HOTEL_OWNER') {
      res.status(409).json({ message: `Conflict: Not allowed, this owner has ${owner.role} role` })
      return
    }

    const hotel = await prisma.$transaction(async (tx) => {

      if (owner.role === 'CUSTOMER') {
        await tx.user.update({
          where: { id: owner.id },
          data: { role: 'HOTEL_OWNER' }
        });
      }

      return await tx.hotel.create({
        data: {
          name: validatedData.name,
          description: validatedData.description || null, // Prisma accepts null
          location: validatedData.location,
          lat: validatedData.lat,
          lng: validatedData.lng,
          phone: validatedData.phone,
          images: validatedData.images,
          pricePerNight: validatedData.pricePerNight,
          isAvailable: validatedData.isAvailable,
          ownerId: owner.id
        }
      })
    })

    res.status(201).json({
      message: 'Hotel created successfully',
      hotel
    })
  } catch(error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ errors: error.issues })
      return
    } else {
      res.status(500).json({ message: 'Internal server error', error: error.message })
    }
  }
}

// 2. Get Hotels (Public - with Pagination & Search)
export const getHotels = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 10
    const search = (req.query.search as string) || ''
    const skip = (page - 1) * limit

    const whereCondition = search ? {
      OR: [
        { name: { contains: search, mode: 'insensitive' as const } },
        { location: { contains: search, mode: 'insensitive' as const } },
      ]
    } : {}

    const [hotels, total] = await Promise.all([
      prisma.hotel.findMany({
        where: whereCondition,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          owner: {
            select: { id: true, name: true, email: true, phone: true }
          },
          reviews: {
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: {
              user: { select: { id: true, name: true } }
            }
          }
        }
      }),
      prisma.hotel.count({ where: whereCondition })
    ])

    res.status(200).json({
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      },
      hotels
    })
  } catch(error: any) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}

// 3. Get Hotel Details by ID (Public)
export const getHotelById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string

    const hotel = await prisma.hotel.findUnique({
      where: { id },
      include: {
        owner: {
          select: { id: true, name: true, email: true, phone: true }
        },
        reviews: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { id: true, name: true } }
          }
        }
      }
    })

    if (!hotel) {
      res.status(404).json({ message: 'Hotel not found' })
      return 
    }

    res.status(200).json({ hotel })
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}

// 4. Update Hotel (Owner / Admin)
export const updateHotel = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string
    const hotel = await prisma.hotel.findUnique({
      where: { id }
    })

    if (!hotel) {
      res.status(404).json({ message: 'Hotel not found' })
      return
    }

    const userId = req.user!.userId
    const userRole = req.user!.role

    // Authorization check: Only the owner or ADMIN can update
    if (hotel.ownerId !== userId && userRole !== 'ADMIN') {
      res.status(403).json({ message: 'Forbidden: Not authorized' })
      return
    }

    const validatedData = updateHotelSchema.parse(req.body)
    const dataToUpdate = removeNull(validatedData)

    const updatedHotel = await prisma.hotel.update({
      where: { id },
      data: dataToUpdate
    })

    res.status(200).json({
      message: 'Hotel updated successfully',
      hotel: updatedHotel
    })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ errors: error.issues });
      return;
    }
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}

// 5. Delete Hotel (Owner / Admin)
export const deleteHotel = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string
    const userId = req.user!.userId
    const userRole = req.user!.role

    const hotel = await prisma.hotel.findUnique({ where: { id } })

    if (!hotel) {
      res.status(404).json({ message: 'Hotel not found' })
      return 
    }

    // Authorization check
    if (hotel.ownerId !== userId && userRole !== 'ADMIN') {
      res.status(403).json({ message: 'Forbidden: Not Authorized' })
      return
    }

    await prisma.hotel.delete({ where: { id } })

    res.status(200).json({ message: 'Hotel deleted successfully' })
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error', error: error.message })
  }
}