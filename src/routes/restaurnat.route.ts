import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import {
  createRestaurant,
  getRestaurants,
  getRestaurantById,
  updateRestaurant,
  deleteRestaurant,
} from '../controllers/restaurant.controller.js';

const router = Router();

router.get('/', getRestaurants);
router.get('/:restaurantId', getRestaurantById);
router.post('/', authenticate, authorize(['ADMIN']), createRestaurant);
router.put('/:restaurantId', authenticate, authorize(['RESTAURANT_OWNER', 'ADMIN']), updateRestaurant);
router.delete('/:restaurantId', authenticate, authorize(['RESTAURANT_OWNER', 'ADMIN']), deleteRestaurant);

export default router;