import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'finix-dev-secret';

export interface AuthRequest extends Request {
  user?: any;
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = await prisma.user.findUnique({ where: { id: decoded.sub } });

    if (!user || user.blocked) {
      return res.status(401).json({ error: 'Usuário não encontrado ou bloqueado' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token inválido' });
  }
};

export const requireVerified = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user?.isVerified) {
    return res.status(403).json({ error: 'E-mail não verificado. Verifique seu e-mail antes de continuar.' });
  }
  next();
};