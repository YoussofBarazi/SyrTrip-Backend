import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import {
  createLandmark,
  getLandmarks,
  getLandmarkById,
  updateLandmark,
  deleteLandmark,
  createEvent,
  getEvents,
  getEventById,
  updateEvent,
  deleteEvent,
} from '../controllers/landmark-event.controller.js';

const router = Router();

// --- Landmarks Routes ---
router.get('/landmarks', getLandmarks);
router.get('/landmarks/:id', getLandmarkById);
router.post('/landmarks', authenticate, authorize(['ADMIN']), createLandmark);
router.put('/landmarks/:id', authenticate, authorize(['ADMIN']), updateLandmark);
router.delete('/landmarks/:id', authenticate, authorize(['ADMIN']), deleteLandmark);

// --- Events Routes ---
router.get('/events', getEvents);
router.get('/events/:id', getEventById);
router.post('/events', authenticate, authorize(['ADMIN']), createEvent);
router.put('/events/:id', authenticate, authorize(['ADMIN']), updateEvent);
router.delete('/events/:id', authenticate, authorize(['ADMIN']), deleteEvent);

export default router;