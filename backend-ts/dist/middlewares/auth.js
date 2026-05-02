"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireVerified = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'finix-dev-secret';
const authenticate = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ error: 'Token não fornecido' });
        }
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        const user = await prisma.user.findUnique({ where: { id: decoded.sub } });
        if (!user || user.blocked) {
            return res.status(401).json({ error: 'Usuário não encontrado ou bloqueado' });
        }
        req.user = user;
        next();
    }
    catch (error) {
        res.status(401).json({ error: 'Token inválido' });
    }
};
exports.authenticate = authenticate;
const requireVerified = (req, res, next) => {
    if (!req.user?.isVerified) {
        return res.status(403).json({ error: 'E-mail não verificado. Verifique seu e-mail antes de continuar.' });
    }
    next();
};
exports.requireVerified = requireVerified;
