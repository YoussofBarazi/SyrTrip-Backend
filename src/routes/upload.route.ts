import { Router, type Request, type Response } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import { upload } from '../middlewares/upload.middleware.js';

const router = Router();

router.post('/', authenticate, upload.single('image'), (req: Request, res: Response): void => {
  try {
    if (!req.file) {
      res.status(400).json({ message: 'No image file provided' });
      return;
    }

    const imageUrl = req.file.path;

    res.status(201).json({ 
      message: 'Image uploaded successfully to the cloud',
      url: imageUrl 
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Cloud upload failed', error: error.message });
  }
});

export default router;