import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import { initDatabase, disconnectDatabase } from './config/database';
import authRoutes from './auth/auth.routes';
import profileRoutes from './profiles/profile.routes';
import interestsRoutes from './interests/interests.routes';
import verificationRoutes from './verification/verification.routes';
import settingsRoutes from './settings/settings.routes';
import postsRoutes from './posts/posts.routes';
import likesRoutes from './likes/likes.routes';
import commentsRoutes from './comments/comments.routes';
import followRoutes from './follow/follow.routes';
import searchRoutes from './search/search.routes';
import uploadRoutes from './upload/upload.routes';
import { errorHandler } from './middleware/errorHandler';

const app = express();

// Security Middleware
app.use(helmet());
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: 'Too many requests from this IP, please try again later.',
});

// Body parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Apply rate limiting
app.use('/api/auth', authLimiter);
app.use('/api', apiLimiter);

// Health Check
app.get('/', (_req, res) => {
  res.json({
    status: 'online',
    app: 'SakhiSphere Backend API',
    version: '1.0.0',
    message: 'Welcome to SakhiSphere Backend API — Safe Socializing for Women',
    phases: {
      phase1: 'Foundation ✅',
      phase2: 'User System ✅',
      phase3: 'Social System ✅',
      phase4: 'Real-time Chat (Coming Soon)',
      phase5: 'Community Groups (Coming Soon)',
    },
  });
});

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: 'PostgreSQL',
    modules: {
      auth: 'active',
      profile: 'active',
      interests: 'active',
      verification: 'active',
      settings: 'active',
      posts: 'active',
      likes: 'active',
      comments: 'active',
      follow: 'active',
      search: 'active',
      upload: 'active',
    },
  });
});

// Domain Routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/interests', interestsRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api', likesRoutes);
app.use('/api', commentsRoutes);
app.use('/api', followRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/upload', uploadRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Global Error Handler
app.use(errorHandler);

// Start server
async function startServer() {
  try {
    initDatabase();
    
    app.listen(env.port, () => {
      console.log('🌸 SakhiSphere API Server');
      console.log(`   Environment: ${env.nodeEnv}`);
      console.log(`   Port: ${env.port}`);
      console.log(`   Database: PostgreSQL with Prisma ORM`);
      console.log(`   URL: http://localhost:${env.port}`);
      console.log('✅ Phase 3 Complete - Social System Fully Operational');
      console.log('   Modules: Posts, Likes, Comments, Follow, Search, Upload');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received');
  await disconnectDatabase();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT signal received');
  await disconnectDatabase();
  process.exit(0);
});

startServer();