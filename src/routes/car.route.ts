import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { 
  addCar, 
  updateCar, 
  deleteCar,
  getCars,
  getCar
} from '../controllers/car.controller.js';

const router = Router();

router.post('/:officeId', authenticate, authorize(['CAR_RENTAL_OWNER', 'ADMIN']), addCar);
router.put('/:carId', authenticate, authorize(['CAR_RENTAL_OWNER', 'ADMIN']), updateCar);
router.delete('/:carId', deleteCar, authenticate, authorize(['CAR_RENTAL_OWNER', 'ADMIN']))
router.get('/', getCars)
router.get('/:carId', getCar)

export default router;