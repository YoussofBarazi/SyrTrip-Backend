import { Router, type Response } from 'express'
import { register, login } from '../controllers/auth.controller.js'
import { authenticate, type AuthRequest } from '../middlewares/auth.middleware.js'

const router = Router()

router.post('/register', register)
router.post('/login', login)

// test
router.get('/me', authenticate, (req: AuthRequest, res: Response) => {
  res.json({ message: 'Welcome to the protected route', user: req.user });
});

export default router