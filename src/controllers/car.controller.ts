import { type Response } from 'express'
import { number, z } from 'zod'
import { type AuthRequest } from '../middlewares/auth.middleware.js';
import { prisma } from '../utils/prisma.js'
import { 
  createCarOfficeSchema, 
  updateCarOfficeSchema, 
  createCarSchema, 
  updateCarSchema 
} from '../schemas/car.schema.js'
import { removeNull } from '../utils/helpers.js';
import { Prisma , CarType } from '@prisma/client';

// ==========================================
//           CAR OFFICE ENDPOINTS
// ==========================================

// 1. Create Car Office (ADMIN only)
export const createCarOffice = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const validatedData = createCarOfficeSchema.parse(req.body)
    
    const owner = await prisma.user.findUnique({
      where: { email: validatedData.ownerEmail },
      include: { carOffice: true }
    })

    if (!owner) {
      res.status(404).json({ message: "Owner email does not exist" })
      return 
    }

    if (owner.carOffice) {
      res.status(409).json({ message: 'Conflict: This user already owns a Car Office'})
      return 
    }

    if (owner.role !== 'CUSTOMER' && owner.role !== 'CAR_RENTAL_OWNER') {
      res.status(409).json({ message: `Conflict: Not allowed to assign office to a user with ${owner.role} role` })
      return
    }

    const office = await prisma.$transaction(async (tx) => {
      if (owner.role === 'CUSTOMER') {
        await tx.user.update({
          where: { id: owner.id },
          data: { role: 'CAR_RENTAL_OWNER' }
        })
      }

      return await tx.carOffice.create({
        data: {
          name: validatedData.name,
          description: validatedData.description || null,
          location: validatedData.location,
          lat: validatedData.lat || null,
          lng: validatedData.lng || null,
          phone: validatedData.phone,
          ownerId: owner.id
        }
      })
    })

    res.status(201).json({ message: 'Car Ofiice created successfully', office })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ errors: error.issues });
      return;
    }
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}

// 2. Get All Car Offices (Public)
export const getCarOffices = async (req: AuthRequest, res: Response): Promise<void> => {
 try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    const search = (req.query.search as string)?.trim() || '';
    const offices = await prisma.carOffice.findMany({
      where: search ? { 
        name: { contains: search, mode: 'insensitive' } 
      } : {},
      
      include: {
        _count: { select: { cars: true } } 
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' }
    });
    res.status(200).json({ 
      meta: {
        page,
        limit,
        total: await prisma.carOffice.count({ where: search ? { 
          name: { contains: search, mode: 'insensitive' } 
        } : {} }),
      },
      offices 
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}

// 3. Delete a Car Office (Admin or Owner)
export const deleteCarOffice = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const officeId = req.params.officeId as string
    const userId = req.user!.userId
    const userRole = req.user!.role

    const carOffice = await prisma.carOffice.findUnique({
      where: { id: officeId }
    })

    if (!carOffice) {
      res.status(404).json({ message: "Car Office does not exist" })
      return 
    }

    if (carOffice.ownerId !== userId && userRole !== 'ADMIN') {
      res.status(403).json({ message: 'Forbidden: You do not own this office' });
      return;
    }

    await prisma.carOffice.delete({ where: { id: officeId } })
    res.status(200).json({ message: 'Car Office deleted successfully' })
  } catch (error: any) {
    console.log(error)
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}

// 4. Get a Car Office by id (Public)
export const getCarOffice = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const officeId = req.params.officeId as string
    
    const carOffice = await prisma.carOffice.findUnique({
      where: { id: officeId }
    })

    if (!carOffice) {
      res.status(404).json({ message: "Car Office does not exist" })
      return 
    }

    res.status(200).json({ carOffice })
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error', error: error.message })
  }
}

// 5. Update a Car Office (Admin or Owner)
export const updateCarOffice = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const officeId = req.params.officeId as string
    const userId = req.user!.userId
    const userRole = req.user!.role

    const carOffice = await prisma.carOffice.findUnique({
      where: { id: officeId }
    })
 
    if (!carOffice) {
      res.status(404).json({ message: 'Car Office does not exist' })
      return
    }

    if (userId !== carOffice.ownerId && userRole !== 'ADMIN') {
      res.status(403).json({ message: 'Forbidden: You do not own this car office' })
      return
    }

    const validatedData = updateCarOfficeSchema.parse(req.body)
    const dataToUpdate = removeNull(validatedData)

    const updatedOffice = await prisma.carOffice.update({
      where: { id: officeId },
      data: dataToUpdate
    })

    res.status(200).json({
      message: 'Office Car updated successfully',
      carOffice: updatedOffice
    })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ errors: error.issues });
      return;
    }
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}

// ==========================================
//          CAR (FLEET) ENDPOINTS
// ==========================================

// 6. Add a Car to an Office (Owner / Admin)
export const addCar = async (req: AuthRequest, res: Response): Promise<void> => {
 try {
  const officeId = req.params.officeId as string 
  const userId = req.user!.userId
  const userRole = req.user!.role

  const office = await prisma.carOffice.findUnique({ 
    where: { id: officeId } 
  })

  if (!office) {
    res.status(404).json({ message: 'Car Office not found' })
    return 
  }

  if ((office.ownerId !== userId && userRole !== 'ADMIN')) {
    res.status(403).json({ message: 'Forbidden: You do not own this office' })
    return
  }

  const validatedData = createCarSchema.parse(req.body)

  const car = await prisma.car.create({
    data: {
      ...validatedData,
      officeId: office.id
    }
  })

  res.status(201).json({ message: 'Car added successgully' })
 } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ errors: error.issues });
      return;
    }
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}

// 7. Update a Car (Owner / Admin)
export const updateCar = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const carId = req.params.carId as string;
    const userId = req.user!.userId;
    const userRole = req.user!.role;

    const car = await prisma.car.findUnique({
      where: { id: carId },
      include: { office: true } 
    });

    if (!car) {
      res.status(404).json({ message: 'Car not found' });
      return;
    }

    if (car.office.ownerId !== userId && userRole !== 'ADMIN') {
      res.status(403).json({ message: 'Forbidden: You do not own this car' });
      return;
    }

    const validatedData = updateCarSchema.parse(req.body);

    const dataToUpdate = removeNull(validatedData)

    const updatedCar = await prisma.car.update({
      where: { id: carId },
      data: dataToUpdate
    });

    res.status(200).json({ message: 'Car updated successfully', car: updatedCar });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ errors: error.issues });
      return;
    }
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}

// 8. Delete a Car (Owner / Admin)
export const deleteCar = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const carId = req.params.carId as string;
    const userId = req.user!.userId;
    const userRole = req.user!.role;

    const car = await prisma.car.findUnique({
      where: { id: carId },
      include: { office: true }
    });

    if (!car) {
      res.status(404).json({ message: 'Car not found' });
      return;
    }

    if (car.office.ownerId !== userId && userRole !== 'ADMIN') {
      res.status(403).json({ message: 'Forbidden: You do not own this car' });
      return;
    }

    await prisma.car.delete({ where: { id: carId } });

    res.status(200).json({ message: 'Car deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

// 9. Get a Car by id (Public) 
export const getCar = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const carId = req.params.carId as string
    
    const car = await prisma.car.findUnique({ 
      where: { id: carId },
      include: {
        reviews: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { id: true, name: true } },
          },
        },
      },
    })

    if (!car) {
      res.status(404).json({ message: 'Car does not exist' })
      return 
    }

    res.status(200).json({ car })
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error' })
  }
} 

// 10. Get all cars (Public) 
export const getCars = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string)?.trim() || '';
    const skip = (page - 1) * limit;

    let whereCondition: Prisma.CarWhereInput = {};

    if (search) {
      const searchUpper = search.toUpperCase();
      
      // 1. Check if the search term matches one of the valid Enum values
      if (Object.values(CarType).includes(searchUpper as CarType)) {
        whereCondition = {
          type: searchUpper as CarType,
        };
      } else {
        // 2. If it's not a car type, search by the car's name instead
        whereCondition = {
          name: { contains: search, mode: 'insensitive' },
        };
      }
    }

    const [cars, total] = await Promise.all([
      prisma.car.findMany({
        where: whereCondition,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          office: {
            select: { id: true, name: true, phone: true },
          },
          reviews: {
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: {
              user: { select: { id: true, name: true } },
            },
          },
        },
      }),
      prisma.car.count({ where: whereCondition }),
    ]);

    res.status(200).json({
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      cars,
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};