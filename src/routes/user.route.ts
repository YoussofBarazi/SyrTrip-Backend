import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import {
  getMyProfile,
  updateMyProfile,
  updateMyPassword,
} from '../controllers/user.controller.js';
import { getAdminUsers } from '../controllers/user.controller.js';

const router = Router();

// All user routes require authentication
router.use(authenticate);

// Profile management
router.get('/me', getMyProfile);
router.put('/me', updateMyProfile);
router.put('/me/password', updateMyPassword);
router.get('/admin/users', authenticate, authorize(['ADMIN']), getAdminUsers);
export default router;