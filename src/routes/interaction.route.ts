import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import { toggleFavorite, getMyFavorites } from '../controllers/favorite.controller.js';
import { createReview, getItemReviews } from '../controllers/review.controller.js';

const router = Router();

// Public routes
router.get('/reviews', getItemReviews); // e.g., /reviews?itemType=HOTEL&itemId=123

// Protected routes (Require login)
router.use(authenticate);

router.post('/favorites/toggle', toggleFavorite);
router.get('/favorites/me', getMyFavorites);

router.post('/reviews', createReview);

export default router;