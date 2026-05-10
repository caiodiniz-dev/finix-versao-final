import express from 'express';
import cors from 'cors';
import 'express-async-errors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import authRoutes from './routes/authRoutes';
import { authRateLimit } from './middlewares/rateLimit';

dotenv.config();

const app = express();
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || 'finix-dev-secret';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://finixapp.vercel.app';

const allowedOrigins = [
  'https://finixapp.vercel.app',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

// CORS
const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    if (!origin) return callback(null, true);
    const isAllowed = allowedOrigins.includes(origin) || origin.endsWith('.vercel.app');
    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Origin bloqueada: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));

// Health endpoints (para debug)
app.get('/', (req, res) => {
  res.json({
    name: 'Finix API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      auth: '/api/auth/login',
    },
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// Auth routes
app.use('/api/auth', authRoutes);

// Error handler
app.use(
  (err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('[ERROR]', err);
    res.status(500).json({ error: err.message || 'Erro interno' });
  }
);

// Startup
const PORT = Number(process.env.PORT) || 8000;

const server = app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║  Finix TS Backend (Simple Mode)        ║
║  Rodando na porta ${PORT}                 ║
║  Environment: ${process.env.NODE_ENV || 'development'}           ║
╚════════════════════════════════════════╝
  `);
  console.log('[SERVER] ✅ Servidor pronto para requisições');
  console.log('[SERVER] Endpoints:');
  console.log('  - GET  http://localhost:' + PORT + '/ (info)');
  console.log('  - GET  http://localhost:' + PORT + '/health (health check)');
  console.log('  - POST http://localhost:' + PORT + '/api/auth/login (login)');
});

server.on('error', (err) => {
  console.error('[SERVER ERROR]', err);
  process.exit(1);
});

process.on('SIGINT', async () => {
  console.log('[SERVER] Shutting down...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('unhandledRejection', (err) => {
  console.error('[UNHANDLED REJECTION]', err);
});

export default app;
