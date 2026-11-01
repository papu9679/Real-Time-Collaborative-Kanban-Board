import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import authRoutes from './routes/authRoutes.js';
import organizationRoutes from './routes/organizationRoutes.js';
import tenantRoutes from './routes/tenantRoutes.js';
import boardRoutes from './routes/boardRoutes.js';
import columnRoutes from './routes/columnRoutes.js';
import taskRoutes from './routes/taskRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { seedDatabase } from './utils/seed.js';

export const createApp = () => {
	const app = express();

	// Security Middleware
	app.use(helmet());

	// CORS Configuration
	const allowedOrigins = [
		'http://localhost:5173',
		'http://localhost:3000',
		'http://127.0.0.1:5173',
	];

	app.use(
		cors({
			origin: (origin, callback) => {
				// Allow requests with no origin (like mobile apps, curl, or Postman)
				if (!origin || allowedOrigins.includes(origin)) {
					callback(null, true);
				} else {
					callback(null, true); // Permissive in development
				}
			},
			credentials: true,
			methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
			allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
		}),
	);

	// Rate Limiting (1000 requests per 15 mins for development/testing ease)
	const limiter = rateLimit({
		windowMs: 15 * 60 * 1000,
		max: 1000,
		standardHeaders: true,
		legacyHeaders: false,
		message: {
			status: 'fail',
			message: 'Too many requests from this IP, please try again later',
		},
	});
	app.use('/api/', limiter);

	// Body and cookie parsing
	app.use(express.json());
	app.use(express.urlencoded({ extended: true }));
	app.use(cookieParser());

	// Logging
	if (process.env.NODE_ENV !== 'test') {
		app.use(morgan('dev'));
	}

	// Health check
	app.get('/api/health', (req, res) => {
		res.json({
			status: 'ok',
			timestamp: new Date().toISOString(),
			service: 'Flowspace Real-Time Kanban Backend',
			version: '1.0.0',
		});
	});

	// Seed endpoint for quick demo setup / reset
	app.post('/api/seed', async (req, res, next) => {
		try {
			const result = await seedDatabase();
			res.json({
				status: 'success',
				message: 'Demo database seeded successfully',
				data: result,
			});
		} catch (err) {
			next(err);
		}
	});

	// Register API routes
	app.use('/api/auth', authRoutes);
	app.use('/api/organizations', organizationRoutes);
	app.use('/api/tenants', tenantRoutes);
	app.use('/api/boards', boardRoutes);
	app.use('/api/columns', columnRoutes);
	app.use('/api/tasks', taskRoutes);

	// 404 handler for undefined routes
	app.use('*', (req, res) => {
		res.status(404).json({
			status: 'fail',
			message: `Endpoint ${req.originalUrl} not found on this server`,
		});
	});

	// Centralized Error Handling Middleware
	app.use(errorHandler);

	return app;
};
