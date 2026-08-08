import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import {
  createBooking,
  getMyBookings,
  getOwnerBookings,
  updateBookingStatus,
} from '../controllers/booking.controller.js';

const router = Router();

router.use(authenticate); // All booking routes require authentication

router.post('/', createBooking);
router.get('/my-bookings', getMyBookings);
router.get('/owner-bookings', getOwnerBookings);
router.patch('/:bookingId/status', updateBookingStatus);

export default router;