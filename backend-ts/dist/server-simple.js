"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
require("express-async-errors");
const dotenv_1 = __importDefault(require("dotenv"));
const client_1 = require("@prisma/client");
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const prisma = new client_1.PrismaClient();
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
    origin: function (origin, callback) {
        if (!origin)
            return callback(null, true);
        const isAllowed = allowedOrigins.includes(origin) || origin.endsWith('.vercel.app');
        if (isAllowed) {
            callback(null, true);
        }
        else {
            console.warn(`[CORS] Origin bloqueada: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use((0, cors_1.default)(corsOptions));
app.use(express_1.default.json({ limit: '10mb' }));
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
app.use('/api/auth', authRoutes_1.default);
// Error handler
app.use((err, _req, res, _next) => {
    console.error('[ERROR]', err);
    res.status(500).json({ error: err.message || 'Erro interno' });
});
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
exports.default = app;
