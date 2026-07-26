import type { Request, Response, NextFunction } from 'express'
import { verifyToken, type TokenPayload } from '../utils/jwt.js'

export interface AuthRequest extends Request {
  user?: TokenPayload;
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Unauthorized: Missing or invalid token'})
    return 
  }

  const token = authHeader.split(' ')[1] || ""

  try {
    const decoded = verifyToken(token)
    req.user = decoded
    next()
  } catch(error: any) {
    res.status(401).json({
      message: 'Unauthorized: Invalid or expired token'
    })
  }
}

export const authorize = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({
        message: 'Forbidden: Insufficient permissions'
      })
      return
    }
    next()
  }
}