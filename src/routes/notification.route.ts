import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import {
  getMyNotifications,
  markAsRead,
  saveFcmToken,
  sendAdminNotification,
} from '../controllers/notification.controller.js';

const router = Router();

router.use(authenticate);

// Customer/Owner routes
router.get('/me', getMyNotifications);
router.patch('/:notificationId/read', markAsRead);

// Admin route
router.post('/admin/send', authorize(['ADMIN']), sendAdminNotification);
  
router.post('/fcm-token', saveFcmToken);

export default router;