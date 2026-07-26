// src/index.ts
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.route.js'

const app = express();

app.use(cors());
app.use(express.json());

// Auth Endpoints
app.use('/api/auth', authRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});