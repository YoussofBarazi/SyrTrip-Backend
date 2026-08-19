import { type Response } from 'express';
import { z } from 'zod';
import { type AuthRequest } from '../middlewares/auth.middleware.js';
import { prisma } from '../utils/prisma.js';
import {
  createLandmarkSchema,
  updateLandmarkSchema,
  createEventSchema,
  updateEventSchema,
} from '../schemas/landmark-event.schema.js';
import { removeNull } from '../utils/helpers.js';

// ==========================================
//         LANDMARKS CONTROLLER
// ==========================================

// 1. Create Landmark (ADMIN only)
export const createLandmark = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const validatedData = createLandmarkSchema.parse(req.body);

    const landmark = await prisma.landmark.create({
      data: validatedData,
    });

    res.status(201).json({ message: 'Landmark created successfully', landmark });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ errors: error.issues });
      return;
    }
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

// 2. Get All Landmarks (Public)
export const getLandmarks = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string)?.trim() || '';
    const skip = (page - 1) * limit;

    const whereCondition = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { location: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [landmarks, total] = await Promise.all([
      prisma.landmark.findMany({
        where: whereCondition,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          reviews: {
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: {
              user: { select: { id: true, name: true } },
            },
          },
        },
      }),
      prisma.landmark.count({ where: whereCondition }),
    ]);

    res.status(200).json({
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      landmarks,
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

// 3. Get Landmark by ID (Public)
export const getLandmarkById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.landmarkId as string;

    const landmark = await prisma.landmark.findUnique({
      where: { id },
      include: {
        reviews: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!landmark) {
      res.status(404).json({ message: 'Landmark not found' });
      return;
    }

    res.status(200).json({ landmark });
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

// 4. Update Landmark (ADMIN)
export const updateLandmark = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.landmarkId as string;

    const existing = await prisma.landmark.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ message: 'Landmark not found' });
      return;
    }

    const validatedData = updateLandmarkSchema.parse(req.body);

    const dataToUpdate = removeNull(validatedData)

    const updated = await prisma.landmark.update({
      where: { id },
      data: dataToUpdate,
    });

    res.status(200).json({ message: 'Landmark updated successfully', landmark: updated });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ errors: error.issues });
      return;
    }
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

// 5. Delete Landmark (ADMIN)
export const deleteLandmark = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.landmarkId as string;

    const existing = await prisma.landmark.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ message: 'Landmark not found' });
      return;
    }

    await prisma.landmark.delete({ where: { id } });

    res.status(200).json({ message: 'Landmark deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};


// ==========================================
//           EVENTS CONTROLLER
// ==========================================

// 1. Create Event (ADMIN)
export const createEvent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const validatedData = createEventSchema.parse(req.body);
    const data = removeNull(validatedData);

    const event = await prisma.event.create({
      data: data as any,
    });

    res.status(201).json({ message: 'Event created successfully', event });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ errors: error.issues });
      return;
    }
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

// 2. Get All Events (Public)
export const getEvents = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string)?.trim() || '';
    const upcomingOnly = req.query.upcoming === 'true';
    const skip = (page - 1) * limit;

    const whereCondition: any = {};

    if (search) {
      whereCondition.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
        { type: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Filter events that haven't ended yet
    if (upcomingOnly) {
      whereCondition.endDate = { gte: new Date() };
    }

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where: whereCondition,
        skip,
        take: limit,
        orderBy: { startDate: 'asc' },
      }),
      prisma.event.count({ where: whereCondition }),
    ]);

    res.status(200).json({
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      events,
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

// 3. Get Event by ID (Public)
export const getEventById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.eventId as string;

    const event = await prisma.event.findUnique({ where: { id } });

    if (!event) {
      res.status(404).json({ message: 'Event not found' });
      return;
    }

    res.status(200).json({ event });
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

// 4. Update Event (ADMIN)
export const updateEvent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.eventId as string;

    const existing = await prisma.event.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ message: 'Event not found' });
      return;
    }

    const validatedData = updateEventSchema.parse(req.body);

    const dataToUpdate = removeNull(validatedData);

    const updated = await prisma.event.update({
      where: { id },
      data: dataToUpdate,
    });

    res.status(200).json({ message: 'Event updated successfully', event: updated });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ errors: error.issues });
      return;
    }
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

// 5. Delete Event (ADMIN)
export const deleteEvent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.eventId as string;

    const existing = await prisma.event.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ message: 'Event not found' });
      return;
    }

    await prisma.event.delete({ where: { id } });

    res.status(200).json({ message: 'Event deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};