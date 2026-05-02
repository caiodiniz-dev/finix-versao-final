import { Request, Response, NextFunction } from 'express';

const rateStore = new Map<string, { count: number; firstRequestAt: number }>();
const WINDOW_MS = 60 * 1000; // 1 minuto
const MAX_REQUESTS = 10;

export const authRateLimit = (req: Request, res: Response, next: NextFunction) => {
  const key = `${req.ip}:${req.path}`;
  const now = Date.now();
  const entry = rateStore.get(key);

  if (!entry) {
    rateStore.set(key, { count: 1, firstRequestAt: now });
    return next();
  }

  if (now - entry.firstRequestAt > WINDOW_MS) {
    rateStore.set(key, { count: 1, firstRequestAt: now });
    return next();
  }

  if (entry.count >= MAX_REQUESTS) {
    return res.status(429).json({ error: 'Muitas tentativas. Tente novamente em alguns instantes.' });
  }

  entry.count += 1;
  rateStore.set(key, entry);
  next();
};
