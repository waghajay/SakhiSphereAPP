import express from 'express';
import cors from 'cors';
import { env } from './config/env';
import { initDatabase } from './config/database';
import authRoutes from './auth/auth.routes';
import profileRoutes from './profiles/profile.routes';
import interestsRoutes from './interests/interests.routes';
import verificationRoutes from './verification/verification.routes';
import settingsRoutes from './settings/settings.routes';
import { errorHandler } from './middleware/errorHandler';

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Health Check & Root routes
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    app: 'SakhiSphere Backend API',
    version: '1.0.0',
    message: 'Welcome to SakhiSphere Backend API — Safe Socializing for Women',
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

// Domain Routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/interests', interestsRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api/settings', settingsRoutes);

// Global Error Handler
app.use(errorHandler);

// Start server after connecting to MySQL
async function startServer() {
  try {
    await initDatabase();
    const server = app.listen(env.port, () => {
      console.log(`🌸 SakhiSphere API Server is running on port ${env.port}`);
      console.log(`🌐 Local:   http://localhost:${env.port}`);
      console.log(`📱 Network: http://10.84.105.112:${env.port}`);
    });

    server.on('error', (err) => {
      console.error('❌ Server listen error:', err);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
