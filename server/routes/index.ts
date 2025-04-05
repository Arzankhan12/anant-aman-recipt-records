import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import donationRoutes from './donation.routes';

const apiRouter = Router();

// Register all routes
apiRouter.use('/', authRoutes); // This will handle /api/login and /api/admin/login directly
apiRouter.use('/users', userRoutes);
apiRouter.use('/donations', donationRoutes);

export default apiRouter;