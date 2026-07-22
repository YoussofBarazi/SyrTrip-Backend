// src/index.ts
import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const app = express();

// 1. Initialize the standard Postgres Pool using your pooled Supabase URL
const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });

// 2. Wrap it in the Prisma Adapter
const adapter = new PrismaPg(pool);

// 3. Pass the adapter to the PrismaClient constructor
const prisma = new PrismaClient({ adapter });

app.use(cors());
app.use(express.json());

app.get('/api/health', async (req, res) => {
  try {
    // You can now query your database perfectly!
    res.json({ status: 'success', message: 'السيرفر يعمل بكفاءة!' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'خطأ داخلي' });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});