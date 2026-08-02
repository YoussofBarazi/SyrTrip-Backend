import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { 
  createCarOffice, 
  getCarOffices, 
  deleteCarOffice,
  getCarOffice,
  updateCarOffice,
} from '../controllers/car.controller.js';

const router = Router();

router.get('/', getCarOffices);
router.post('/', authenticate, authorize(['ADMIN']), createCarOffice);
router.delete('/:officeId', authenticate, authorize(['CAR_RENTAL_OWNER', 'ADMIN']) ,deleteCarOffice)
router.get('/:officeId', getCarOffice);
router.put('/:officeId', authenticate, authorize(['CAR_RENTAL_OWNER', 'ADMIN']), updateCarOffice);

export default router;