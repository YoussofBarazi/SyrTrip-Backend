import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.route.js'
import hotelRoutes from './routes/hotel.route.js'
import carRoutes from './routes/car.route.js';
import carOfficeRoutes from './routes/carOffice.route.js';
import landmarkEventRoutes from './routes/landmark-event.route.js';
import restaurantRoutes from './routes/restaurnat.route.js';
import bookingRoutes from './routes/booking.route.js';
import userRoutes from './routes/user.route.js';
import uploadRoutes from './routes/upload.route.js';
import interactionRoutes from './routes/interaction.route.js';
import notificationRoutes from './routes/notification.route.js';

const app = express();

app.use(cors({
  origin: ['http://localhost:5173', 'https://your-future-frontend-domain.com'], 
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.options('*', cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// Restaurant Endpoints
app.use('/api/restaurants', restaurantRoutes);

// Booking Endpoints
app.use('/api/bookings', bookingRoutes);

// User Endpoints
app.use('/api/users', userRoutes);

// Upload Endpoints
app.use('/api/upload', uploadRoutes);

// Review and Favorite Endpoints
app.use('/api/interactions', interactionRoutes);

// Notification Endpoints
app.use('/api/notifications', notificationRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});