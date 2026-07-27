import { Router } from 'express';
import {
  createHotel,
  getHotels,
  getHotelById,
  updateHotel,
  deleteHotel,
} from '../controllers/hotel.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';

const router = Router();

// Public Routes
router.get('/', getHotels);
router.get('/:id', getHotelById);

// Protected Routes (HOTEL_OWNER & ADMIN only)
router.post('/', authenticate, authorize(['ADMIN']), createHotel);
router.put('/:id', authenticate, authorize(['HOTEL_OWNER', 'ADMIN']), updateHotel);
router.delete('/:id', authenticate, authorize(['HOTEL_OWNER', 'ADMIN']), deleteHotel);

export default router;