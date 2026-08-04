import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.route.js'
import hotelRoutes from './routes/hotel.route.js'
import carRoutes from './routes/car.route.js';
import carOfficeRoutes from './routes/carOffice.route.js';
import landmarkEventRoutes from './routes/landmark-event.route.js';

const app = express();

app.use(cors());
app.use(express.json());

// Auth Endpoints
app.use('/api/auth', authRoutes);

// Hotel Endpoints
app.use('/api/hotels', hotelRoutes)

// Car Endpoints
app.use('/api/cars', carRoutes);

// Car Office Endpoints
app.use('/api/offices', carOfficeRoutes);

// Landmark and Event Endpoints
app.use('/api', landmarkEventRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});