"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRateLimit = void 0;
const rateStore = new Map();
const WINDOW_MS = 60 * 1000; // 1 minuto
const MAX_REQUESTS = 10;
const authRateLimit = (req, res, next) => {
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
exports.authRateLimit = authRateLimit;
