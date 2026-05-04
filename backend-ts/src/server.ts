import express from 'express';
import cors from 'cors';
import 'express-async-errors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import { z } from 'zod';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import Stripe from 'stripe';
import authRoutes from './routes/authRoutes';
import { authRateLimit } from './middlewares/rateLimit';
import { signup } from './services/authService';

dotenv.config();
process.env.DATABASE_URL ||= 'file:./dev.db';

const app = express();
const prisma = new PrismaClient();
const upload = multer({ storage: multer.memoryStorage() });
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

const JWT_SECRET = process.env.JWT_SECRET || 'finix-dev-secret';
const JWT_EXPIRES_IN = '7d';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://finixapp.vercel.app';

const corsOrigins = [
  process.env.FRONTEND_URL || 'https://finixapp.vercel.app',
  'https://finixapp.vercel.app',
  'https://finixapp.vercel.app',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

app.use(cors({
  origin: corsOrigins,
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Auth routes
app.use('/api/auth', authRoutes);

// ============================================================================
// PLANS CONFIGURATION
// ============================================================================
export const PLANS: Record<string, {
  id: string; name: string; price: number; currency: string;
  transactionsLimit: number; categoriesLimit: number; goalsLimit: number;
  hasAI: boolean; hasAdvancedAI: boolean; hasPDF: boolean; hasExcel: boolean;
  hasPrioritySupport: boolean; stripePriceId?: string;
}> = {
  FREE: {
    id: 'FREE', name: 'Grátis', price: 0, currency: 'BRL',
    transactionsLimit: 100, categoriesLimit: 3, goalsLimit: 2,
    hasAI: false, hasAdvancedAI: false, hasPDF: false, hasExcel: false,
    hasPrioritySupport: false,
  },
  BASIC: {
    id: 'BASIC', name: 'Básico', price: 10, currency: 'BRL',
    transactionsLimit: 500, categoriesLimit: 999, goalsLimit: 5,
    hasAI: true, hasAdvancedAI: false, hasPDF: true, hasExcel: false,
    hasPrioritySupport: false,
    stripePriceId: 'price_1TRjBSJjlHCvcKLJki6868NK',
  },
  TEST: {
    id: 'TEST', name: 'Teste', price: 0.01, currency: 'BRL',
    transactionsLimit: -1, categoriesLimit: 999, goalsLimit: -1,
    hasAI: true, hasAdvancedAI: true, hasPDF: true, hasExcel: true,
    hasPrioritySupport: true,
  },
  PRO: {
    id: 'PRO', name: 'Pro', price: 35, currency: 'BRL',
    transactionsLimit: -1, categoriesLimit: 999, goalsLimit: -1,
    hasAI: true, hasAdvancedAI: true, hasPDF: true, hasExcel: true,
    hasPrioritySupport: true,
    stripePriceId: 'price_1TRjBTJjlHCvcKLJICo0Js1Y',
  },
};

const currentMonthKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

// Reset monthly counter if month changed
const resetMonthlyIfNeeded = async (userId: string, currentMonth: string) => {
  const mk = currentMonthKey();
  if (currentMonth !== mk) {
    await prisma.user.update({
      where: { id: userId },
      data: { transactionsUsed: 0, transactionsMonth: mk },
    });
    return 0;
  }
  return null;
};

// ============================================================================
// MIDDLEWARE
// ============================================================================
const authenticate = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Não autenticado' });
  }
  const token = auth.substring(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.blocked) {
      return res.status(401).json({ error: 'Usuário não encontrado ou bloqueado' });
    }
    // Auto-reset monthly counter if month changed
    const reset = await resetMonthlyIfNeeded(user.id, user.transactionsMonth);
    if (reset !== null) {
      user.transactionsUsed = 0;
      user.transactionsMonth = currentMonthKey();
    }
    (req as any).user = user;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Token inválido' });
  }
};

const requireAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const user = (req as any).user;
  if (user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Acesso negado (admin)' });
  }
  next();
};

// Require specific feature gated by plan
const requireFeature = (feature: 'hasAI' | 'hasAdvancedAI' | 'hasPDF' | 'hasExcel') =>
  (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const user = (req as any).user;
    const plan = PLANS[user.plan] || PLANS.FREE;
    if (!plan[feature]) {
      return res.status(403).json({
        error: 'Recurso não disponível no seu plano',
        requiredFeature: feature,
        currentPlan: user.plan,
        upgrade: true,
      });
    }
    next();
  };

// ============================================================================
// SCHEMAS
// ============================================================================
const registerSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(6).max(128),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const transactionSchema = z.object({
  title: z.string().min(1).max(120),
  amount: z.number().positive(),
  type: z.enum(['INCOME', 'EXPENSE']),
  category: z.string(),
  description: z.string().optional(),
  date: z.string().transform((str) => new Date(str)),
  recurring: z.boolean().optional().default(false),
  recurringFrequency: z.enum(['monthly', 'weekly', 'yearly']).optional().nullable(),
  paymentMethod: z.enum(['credito', 'debito', 'pix']).optional().default('pix'),
  installments: z.number().min(1).max(60).optional().default(1),
  currency: z.enum(['BRL', 'USD', 'EUR', 'GBP']).optional().default('BRL'),
});

const goalSchema = z.object({
  title: z.string().min(1).max(120),
  targetAmount: z.number().positive(),
  currentAmount: z.number().min(0).optional().default(0),
  deadline: z.string().transform((str) => new Date(str)),
});

const budgetSchema = z.object({
  category: z.string(),
  limit: z.number().positive(),
});

const profileUpdateSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6).max(128).optional(),
  photo: z.string().optional(),
});

const categoriesUpdateSchema = z.object({
  categories: z.array(z.string().min(1).max(50)).min(1),
});

const userUpdateSchema = z.object({
  name: z.string().optional(),
  role: z.enum(['USER', 'ADMIN']).optional(),
  blocked: z.boolean().optional(),
  plan: z.enum(['FREE', 'BASIC', 'PRO', 'TEST']).optional(),
  hasCompletedOnboarding: z.boolean().optional(),
  usageType: z.enum(['pessoal', 'empresarial', 'organizar']).optional(),
  companyName: z.string().optional().nullable(),
  companyLogo: z.string().optional().nullable(),
  businessPurpose: z.string().optional().nullable(),
  primaryColor: z.string().optional().nullable(),
  categories: z.array(z.string().min(1).max(50)).optional(),
});

const onboardingSchema = z.object({
  usageType: z.enum(['pessoal', 'empresarial', 'organizar']),
  companyName: z.string().nullable().optional(),
  companyLogo: z.string().nullable().optional(),
  businessPurpose: z.string().nullable().optional(),
  primaryColor: z.string().nullable().optional(),
  categories: z.array(z.string().min(1).max(50)).min(1),
});

// ============================================================================
// HELPERS
// ============================================================================
const userPublic = (u: any) => ({
  id: u.id, name: u.name, email: u.email, role: u.role, blocked: u.blocked,
  photo: u.photo, plan: u.plan, transactionsUsed: u.transactionsUsed,
  stripeCustomerId: u.stripeCustomerId, stripeSubscriptionId: u.stripeSubscriptionId,
  planExpiresAt: u.planExpiresAt, hasCompletedOnboarding: u.hasCompletedOnboarding,
  usageType: u.usageType, companyName: u.companyName, companyLogo: u.companyLogo,
  businessPurpose: u.businessPurpose, primaryColor: u.primaryColor, createdAt: u.createdAt,
});

// ============================================================================
// AUTH
// ============================================================================
app.post('/api/auth/register', authRateLimit, async (req, res) => {
  try {
    const data = registerSchema.parse(req.body);
    const result = await signup(data.email.toLowerCase(), data.password, data.name.trim());
    res.status(201).json(result);
  } catch (err: any) {
    console.error('Register error:', err);
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: 'Dados inválidos' });
    }
    res.status(500).json({ error: err.message || 'Erro ao criar conta' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const data = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
    if (!user || !(await bcrypt.compare(data.password, user.passwordHash)) || user.blocked) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }
    const token = jwt.sign({ sub: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    res.json({ user: userPublic(user), token });
  } catch (err: any) {
    console.error('Login error:', err);
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: 'Dados inválidos' });
    }
    res.status(500).json({ error: err.message || 'Erro ao fazer login' });
  }
});

app.get('/api/auth/me', authenticate, (req, res) => {
  const user = (req as any).user;
  const plan = PLANS[user.plan] || PLANS.FREE;
  res.json({ ...userPublic(user), planDetails: plan });
});

// ============================================================================
// ONBOARDING
// ============================================================================
const DEFAULT_CATEGORIES = [
  'Alimentação',
  'Transporte',
  'Saúde',
  'Salário',
  'Investimento',
  'Pagamento',
  'Lazer',
  'Educação',
  'Moradia',
  'Serviços'
];

app.post('/api/onboarding', authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    if (user.hasCompletedOnboarding) {
      return res.status(400).json({ error: 'Onboarding já completado' });
    }
    const data = onboardingSchema.parse(req.body);

    const updateData: any = {
      hasCompletedOnboarding: true,
      usageType: data.usageType,
    };

    // Only set company fields if not 'pessoal'
    if (data.usageType !== 'pessoal') {
      updateData.companyName = data.companyName || null;
      updateData.companyLogo = data.companyLogo || null;
      updateData.businessPurpose = data.businessPurpose || null;
      updateData.primaryColor = data.primaryColor || null;
    } else {
      // Clear company fields for personal use
      updateData.companyName = null;
      updateData.companyLogo = null;
      updateData.businessPurpose = null;
      updateData.primaryColor = null;
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
    });

    // Delete any existing categories first
    await prisma.category.deleteMany({
      where: { userId: user.id }
    });

    // Save categories
    const categoriesToCreate = data.categories && data.categories.length > 0
      ? data.categories
      : DEFAULT_CATEGORIES;

    if (categoriesToCreate.length > 0) {
      await prisma.category.createMany({
        data: categoriesToCreate.map(name => ({ userId: user.id, name }))
      });
    }

    res.json({ user: userPublic(updatedUser) });
  } catch (err: any) {
    console.error('Onboarding error:', err);
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: 'Dados inválidos' });
    }
    res.status(500).json({ error: err.message || 'Erro no onboarding' });
  }
});

app.post('/api/upload-logo', authenticate, upload.single('logo'), async (req, res) => {
  try {
    const user = (req as any).user;
    if (user.plan !== 'PRO') {
      return res.status(403).json({ error: 'Upload de logo disponível apenas para plano PRO' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }
    // Simular upload - em produção, salvar no cloud storage
    const logoUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    res.json({ logoUrl });
  } catch (err: any) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Erro no upload' });
  }
});
app.get('/api/plans', (req, res) => {
  res.json(Object.values(PLANS));
});

app.get('/api/plans/me', authenticate, (req, res) => {
  const user = (req as any).user;
  const plan = PLANS[user.plan] || PLANS.FREE;
  res.json({
    plan: user.plan,
    planDetails: plan,
    transactionsUsed: user.transactionsUsed,
    transactionsMonth: user.transactionsMonth,
    stripeSubscriptionId: user.stripeSubscriptionId,
    planExpiresAt: user.planExpiresAt,
  });
});

app.put('/api/categories', authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const plan = PLANS[user.plan] || PLANS.FREE;
    if (plan.categoriesLimit === 3) {
      return res.status(403).json({ error: 'Atualização de categorias disponível apenas para planos avançados' });
    }
    const data = categoriesUpdateSchema.parse(req.body);
    const uniqueCategories = Array.from(new Set(data.categories.map((cat) => cat.trim()).filter(Boolean)));
    if (uniqueCategories.length === 0) {
      return res.status(400).json({ error: 'Adicione pelo menos uma categoria' });
    }
    if (plan.categoriesLimit !== 999 && uniqueCategories.length > plan.categoriesLimit) {
      return res.status(400).json({ error: `Plano ${plan.name} permite até ${plan.categoriesLimit} categorias.` });
    }
    await prisma.category.deleteMany({ where: { userId: user.id } });
    await prisma.category.createMany({ data: uniqueCategories.map((name) => ({ userId: user.id, name })) });
    const categories = await prisma.category.findMany({ where: { userId: user.id }, orderBy: { name: 'asc' } });
    res.json(categories);
  } catch (err: any) {
    console.error('Categories update error:', err);
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: 'Dados de categoria inválidos' });
    }
    res.status(500).json({ error: err.message || 'Erro ao atualizar categorias' });
  }
});

app.get('/api/categories', authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const categories = await prisma.category.findMany({
      where: { userId: user.id },
      orderBy: { name: 'asc' },
    });
    res.json(categories);
  } catch (err: any) {
    console.error('Categories error:', err);
    res.status(500).json({ error: 'Erro ao buscar categorias' });
  }
});
app.get('/api/transactions', authenticate, async (req, res) => {
  const user = (req as any).user;
  const { type, category, search, startDate, endDate } = req.query;
  const where: any = { userId: user.id };
  if (type) where.type = type;
  if (category) where.category = category;
  if (search) where.title = { contains: search as string };
  if (startDate || endDate) {
    where.date = {};
    if (startDate) where.date.gte = new Date(startDate as string);
    if (endDate) where.date.lte = new Date(endDate as string);
  }
  const transactions = await prisma.transaction.findMany({ where, orderBy: { date: 'desc' } });
  res.json(transactions);
});

app.post('/api/transactions', authenticate, async (req, res) => {
  const user = (req as any).user;
  const data = transactionSchema.parse(req.body);
  const plan = PLANS[user.plan] || PLANS.FREE;

  // Enforce transaction limit (monthly)
  if (plan.transactionsLimit !== -1 && user.transactionsUsed >= plan.transactionsLimit) {
    return res.status(403).json({
      error: `Limite mensal de ${plan.transactionsLimit} transações atingido. Faça upgrade do seu plano.`,
      upgrade: true,
      currentPlan: user.plan,
      limit: plan.transactionsLimit,
      used: user.transactionsUsed,
    });
  }

  // Enforce categories limit (FREE only)
  if (plan.categoriesLimit !== 999) {
    const distinctCats = await prisma.transaction.findMany({
      where: { userId: user.id },
      select: { category: true },
      distinct: ['category'],
    });
    const existingCats = new Set(distinctCats.map(c => c.category));
    if (!existingCats.has(data.category) && existingCats.size >= plan.categoriesLimit) {
      return res.status(403).json({
        error: `Plano ${plan.name} permite até ${plan.categoriesLimit} categorias. Faça upgrade para criar mais.`,
        upgrade: true,
      });
    }
  }

  let transaction;
  if (data.installments > 1) {
    const totalAmount = data.amount * data.installments;
    const pricePerInstallment = data.amount;
    const formattedTitle = `${data.title} (Total: R$ ${totalAmount.toFixed(2)} - ${data.installments}x de R$ ${pricePerInstallment.toFixed(2)})`;
    transaction = await prisma.transaction.create({
      data: {
        ...data,
        id: uuidv4(),
        userId: user.id,
        title: formattedTitle,
        amount: pricePerInstallment,
        totalInstallments: data.installments,
        totalAmount,
      },
    });
  } else {
    transaction = await prisma.transaction.create({
      data: { ...data, id: uuidv4(), userId: user.id },
    });
  }

  // Increment counter
  await prisma.user.update({
    where: { id: user.id },
    data: { transactionsUsed: { increment: 1 } },
  });

  res.json(transaction);
});

app.put('/api/transactions/:id', authenticate, async (req, res) => {
  const user = (req as any).user;
  const data = transactionSchema.parse(req.body);
  const transaction = await prisma.transaction.updateMany({
    where: { id: String(req.params.id), userId: user.id },
    data,
  });
  if (transaction.count === 0) return res.status(404).json({ error: 'Transação não encontrada' });
  const updated = await prisma.transaction.findUnique({ where: { id: String(req.params.id) } });
  res.json(updated);
});

app.delete('/api/transactions/:id', authenticate, async (req, res) => {
  const user = (req as any).user;
  const deleted = await prisma.transaction.deleteMany({ where: { id: String(req.params.id), userId: user.id } });
  if (deleted.count === 0) return res.status(404).json({ error: 'Transação não encontrada' });
  res.json({ ok: true });
});

// ============================================================================
// GOALS (with plan gate)
// ============================================================================
app.get('/api/goals', authenticate, async (req, res) => {
  const user = (req as any).user;
  const goals = await prisma.goal.findMany({ where: { userId: user.id }, orderBy: { deadline: 'asc' } });
  res.json(goals);
});

app.post('/api/goals', authenticate, async (req, res) => {
  const user = (req as any).user;
  const data = goalSchema.parse(req.body);
  const plan = PLANS[user.plan] || PLANS.FREE;

  if (plan.goalsLimit !== -1) {
    const count = await prisma.goal.count({ where: { userId: user.id } });
    if (count >= plan.goalsLimit) {
      return res.status(403).json({
        error: `Plano ${plan.name} permite até ${plan.goalsLimit} metas. Faça upgrade.`,
        upgrade: true,
      });
    }
  }

  const goal = await prisma.goal.create({ data: { ...data, id: uuidv4(), userId: user.id } });
  res.json(goal);
});

app.put('/api/goals/:id', authenticate, async (req, res) => {
  const user = (req as any).user;
  const data = goalSchema.parse(req.body);
  const goal = await prisma.goal.updateMany({
    where: { id: String(req.params.id), userId: user.id },
    data,
  });
  if (goal.count === 0) return res.status(404).json({ error: 'Meta não encontrada' });
  const updated = await prisma.goal.findUnique({ where: { id: String(req.params.id) } });
  res.json(updated);
});

app.delete('/api/goals/:id', authenticate, async (req, res) => {
  const user = (req as any).user;
  const deleted = await prisma.goal.deleteMany({ where: { id: String(req.params.id), userId: user.id } });
  if (deleted.count === 0) return res.status(404).json({ error: 'Meta não encontrada' });
  res.json({ ok: true });
});

// ============================================================================
// BUDGETS
// ============================================================================
app.get('/api/budgets', authenticate, async (req, res) => {
  const user = (req as any).user;
  const budgets = await prisma.budget.findMany({ where: { userId: user.id } });
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const transactions = await prisma.transaction.findMany({
    where: { userId: user.id, type: 'EXPENSE', date: { gte: monthStart } },
  });
  const spentByCategory: Record<string, number> = {};
  transactions.forEach(t => {
    spentByCategory[t.category] = (spentByCategory[t.category] || 0) + t.amount;
  });
  const result = budgets.map(b => ({
    ...b,
    spent: spentByCategory[b.category] || 0,
    percentage: b.limit > 0 ? ((spentByCategory[b.category] || 0) / b.limit) * 100 : 0,
  }));
  res.json(result);
});

app.post('/api/budgets', authenticate, async (req, res) => {
  const user = (req as any).user;
  const data = budgetSchema.parse(req.body);
  try {
    const budget = await prisma.budget.create({ data: { ...data, id: uuidv4(), userId: user.id } });
    res.json(budget);
  } catch {
    res.status(400).json({ error: 'Já existe um orçamento para esta categoria' });
  }
});

app.put('/api/budgets/:id', authenticate, async (req, res) => {
  const user = (req as any).user;
  const data = budgetSchema.parse(req.body);
  const budget = await prisma.budget.updateMany({
    where: { id: String(req.params.id), userId: user.id },
    data,
  });
  if (budget.count === 0) return res.status(404).json({ error: 'Orçamento não encontrado' });
  const updated = await prisma.budget.findUnique({ where: { id: String(req.params.id) } });
  res.json(updated);
});

app.delete('/api/budgets/:id', authenticate, async (req, res) => {
  const user = (req as any).user;
  const deleted = await prisma.budget.deleteMany({ where: { id: String(req.params.id), userId: user.id } });
  if (deleted.count === 0) return res.status(404).json({ error: 'Orçamento não encontrado' });
  res.json({ ok: true });
});

// ============================================================================
// PROFILE
// ============================================================================
app.put('/api/profile', authenticate, async (req, res) => {
  const user = (req as any).user;
  const data = profileUpdateSchema.parse(req.body);
  const updates: any = {};
  if (data.name) updates.name = data.name.trim();
  if (data.photo) updates.photo = data.photo;
  if (data.newPassword) {
    if (!data.currentPassword || !(await bcrypt.compare(data.currentPassword, user.passwordHash))) {
      return res.status(400).json({ error: 'Senha atual incorreta' });
    }
    updates.passwordHash = await bcrypt.hash(data.newPassword, 10);
  }
  if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'Nada para atualizar' });
  const updatedUser = await prisma.user.update({ where: { id: user.id }, data: updates });
  res.json(userPublic(updatedUser));
});

// ============================================================================
// DASHBOARD
// ============================================================================
app.get('/api/dashboard', authenticate, async (req, res) => {
  const user = (req as any).user;
  const transactions = await prisma.transaction.findMany({ where: { userId: user.id } });
  const goals = await prisma.goal.findMany({ where: { userId: user.id } });

  const income = transactions.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
  const expense = transactions.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
  const saved = goals.reduce((s, g) => s + g.currentAmount, 0);
  const balance = income - expense - saved;

  const now = new Date();
  const months: Date[] = [];
  for (let i = 5; i >= 0; i--) {
    const y = now.getFullYear();
    const m = now.getMonth() - i;
    const d = new Date(y, m < 0 ? m + 12 : m, 1);
    if (m < 0) d.setFullYear(y - 1);
    months.push(d);
  }
  const monthly = months.map(start => {
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
    const inc = transactions.filter(t => t.type === 'INCOME' && t.date >= start && t.date < end).reduce((s, t) => s + t.amount, 0);
    const exp = transactions.filter(t => t.type === 'EXPENSE' && t.date >= start && t.date < end).reduce((s, t) => s + t.amount, 0);
    return { month: start.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }), income: inc, expense: exp };
  });

  const byCat: Record<string, number> = {};
  transactions.filter(t => t.type === 'EXPENSE').forEach(t => {
    byCat[t.category] = (byCat[t.category] || 0) + t.amount;
  });
  const categories = Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([category, amount]) => ({ category, amount }));

  const insights: any[] = [];
  if (monthly.length >= 2) {
    const cur = monthly[monthly.length - 1].expense;
    const prev = monthly[monthly.length - 2].expense;
    if (prev > 0) {
      const diff = ((cur - prev) / prev) * 100;
      if (diff > 10) insights.push({ type: 'warning', title: 'Gastos aumentaram', message: `Você gastou ${diff.toFixed(0)}% a mais este mês.` });
      else if (diff < -10) insights.push({ type: 'success', title: 'Ótimo controle', message: `Você economizou ${Math.abs(diff).toFixed(0)}% em relação ao mês passado.` });
    }
  }
  if (categories.length > 0) {
    const top = categories[0];
    if (expense > 0 && top.amount / expense > 0.4) insights.push({ type: 'info', title: 'Categoria dominante', message: `${top.category} representa ${(top.amount / expense * 100).toFixed(0)}% dos seus gastos.` });
  }
  if (balance < 0) insights.push({ type: 'warning', title: 'Atenção ao saldo', message: 'Suas despesas superam as receitas.' });
  else if (income > 0 && balance / income > 0.3) insights.push({ type: 'success', title: 'Você está no caminho certo', message: `Economizou ${(balance / income * 100).toFixed(0)}% da sua renda.` });

  const recent = transactions.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 5);

  res.json({ balance, income, expense, saved, monthly, categories, recent, insights });
});

// ============================================================================
// ADMIN
// ============================================================================
app.get('/api/users', authenticate, requireAdmin, async (req, res) => {
  const { search } = req.query;
  const where: any = {};
  if (search) where.OR = [{ name: { contains: search as string } }, { email: { contains: search as string } }];
  const users = await prisma.user.findMany({ where, orderBy: { createdAt: 'desc' } });
  res.json(users.map(userPublic));
});

app.get('/api/users/:id', authenticate, requireAdmin, async (req, res) => {
  const userId = String(req.params.id);
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
  const transactions = await prisma.transaction.findMany({ where: { userId } });
  const goals = await prisma.goal.findMany({ where: { userId } });
  const categories = await prisma.category.findMany({ where: { userId }, orderBy: { name: 'asc' } });
  res.json({ user: userPublic(user), transactions, goals, categories });
});

app.put('/api/users/:id', authenticate, requireAdmin, async (req, res) => {
  const data = userUpdateSchema.parse(req.body);
  const userId = String(req.params.id);
  const targetUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!targetUser) return res.status(404).json({ error: 'Usuário não encontrado' });

  const { categories, ...updateData } = data;
  if (data.plan === 'PRO' && targetUser.plan !== 'PRO' && data.hasCompletedOnboarding === undefined) {
    updateData.hasCompletedOnboarding = false;
  }

  const updated = await prisma.user.update({ where: { id: userId }, data: updateData });

  if (categories) {
    const uniqueCategories = Array.from(new Set(categories.map((name) => name.trim()).filter(Boolean)));
    await prisma.category.deleteMany({ where: { userId } });
    if (uniqueCategories.length) {
      await prisma.category.createMany({ data: uniqueCategories.map((name) => ({ userId, name })) });
    }
  }

  res.json(userPublic(updated));
});

app.delete('/api/users/:id', authenticate, requireAdmin, async (req, res) => {
  const admin = (req as any).user;
  if (req.params.id === admin.id) return res.status(400).json({ error: 'Não é possível deletar a si mesmo' });
  await prisma.user.delete({ where: { id: String(req.params.id) } });
  res.json({ ok: true });
});

app.get('/api/admin/stats', authenticate, requireAdmin, async (req, res) => {
  const totalUsers = await prisma.user.count();
  const totalAdmins = await prisma.user.count({ where: { role: 'ADMIN' } });
  const totalBlocked = await prisma.user.count({ where: { blocked: true } });
  const totalTx = await prisma.transaction.count();
  const totalGoals = await prisma.goal.count();
  const freeUsers = await prisma.user.count({ where: { plan: 'FREE' } });
  const basicUsers = await prisma.user.count({ where: { plan: 'BASIC' } });
  const proUsers = await prisma.user.count({ where: { plan: 'PRO' } });
  const paidTxs = await prisma.paymentTransaction.findMany({ where: { paymentStatus: 'paid' } });
  const totalRevenue = paidTxs.reduce((s, t) => s + t.amount, 0);
  const agg = await prisma.transaction.groupBy({ by: ['type'], _sum: { amount: true } });
  const income = agg.find(a => a.type === 'INCOME')?._sum.amount || 0;
  const expense = agg.find(a => a.type === 'EXPENSE')?._sum.amount || 0;
  res.json({
    totalUsers, totalAdmins, blockedUsers: totalBlocked,
    totalTransactions: totalTx, totalGoals,
    globalIncome: income, globalExpense: expense,
    freeUsers, basicUsers, proUsers, totalRevenue,
  });
});

// ============================================================================
// AI INSIGHTS (gated by plan)
// ============================================================================
app.post('/api/insights/ai', authenticate, requireFeature('hasAI'), async (req, res) => {
  const user = (req as any).user;
  const plan = PLANS[user.plan] || PLANS.FREE;
  const transactions = await prisma.transaction.findMany({ where: { userId: user.id }, orderBy: { date: 'desc' } });
  const goals = await prisma.goal.findMany({ where: { userId: user.id } });

  if (transactions.length === 0) {
    return res.json({ insights: [{ type: 'info', title: 'Sem dados suficientes', message: 'Adicione algumas transações para receber análises personalizadas.' }] });
  }

  const incomeTx = transactions.filter((t) => t.type === 'INCOME');
  const expenseTx = transactions.filter((t) => t.type === 'EXPENSE');
  const income = incomeTx.reduce((sum, t) => sum + t.amount, 0);
  const expense = expenseTx.reduce((sum, t) => sum + t.amount, 0);
  const balance = income - expense;
  const spendRatio = income > 0 ? expense / income : 1;
  const avgExpense = expenseTx.length > 0 ? expense / expenseTx.length : 0;
  const topCategory = expenseTx.reduce((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + t.amount;
    return acc;
  }, {} as Record<string, number>);
  const bestCategory = Object.entries(topCategory).sort((a, b) => b[1] - a[1])[0];

  const now = new Date();
  const recentExpenses = expenseTx.filter((t) => {
    const days = (now.getTime() - new Date(t.date).getTime()) / (1000 * 60 * 60 * 24);
    return days <= 14;
  });

  const localInsights: any[] = [];

  if (income === 0) {
    localInsights.push({
      type: 'warning',
      title: 'Atenção, sem receita registrada',
      message: 'Ainda não há nenhuma receita cadastrada. Registre sua renda para que o Finix saiba quanto você pode gastar com segurança.',
    });
  } else if (spendRatio >= 0.9) {
    localInsights.push({
      type: 'warning',
      title: 'Cuidado, seus gastos estão muito altos',
      message: `Você já gastou ${(spendRatio * 100).toFixed(0)}% da sua renda registrada. Se continuar assim, falta pouco para o dinheiro do mês acabar.`,
    });
  } else if (spendRatio >= 0.75) {
    localInsights.push({
      type: 'warning',
      title: 'Atenção, a dívida do mês pode apertar',
      message: `Seu ritmo de despesas consome ${(spendRatio * 100).toFixed(0)}% da renda. Reveja os próximos gastos antes de comprometer mais do seu salário.`,
    });
  } else if (spendRatio >= 0.5) {
    localInsights.push({
      type: 'info',
      title: 'Bom controle, mas fique atento',
      message: `Você usou ${(spendRatio * 100).toFixed(0)}% da sua renda. Busque manter as próximas despesas abaixo de 30% para maior conforto financeiro.`,
    });
  } else {
    localInsights.push({
      type: 'success',
      title: 'Ótimo, seu orçamento está equilibrado',
      message: `Suas despesas representam ${(spendRatio * 100).toFixed(0)}% da receita. Continue assim para ter mais folga até o próximo salário.`,
    });
  }

  if (bestCategory && bestCategory[1] > 0 && expense > 0) {
    const categoryRatio = (bestCategory[1] / expense) * 100;
    if (categoryRatio >= 35) {
      localInsights.push({
        type: 'warning',
        title: `Atenção: ${bestCategory[0]} domina seus gastos`,
        message: `${bestCategory[0]} responde por ${categoryRatio.toFixed(0)}% das despesas. Avalie se dá para cortar ou controlar esse consumo.`,
      });
    }
  }

  if (recentExpenses.length >= 3 && avgExpense > 0) {
    const recentAvg = recentExpenses.reduce((sum, t) => sum + t.amount, 0) / recentExpenses.length;
    if (recentAvg > avgExpense) {
      localInsights.push({
        type: 'info',
        title: 'Últimos gastos acima da média',
        message: 'Nas últimas duas semanas você gastou mais do que a sua média habitual. Procure analisar cada saída e adiar compras não essenciais.',
      });
    }
  }

  if (balance < 0) {
    localInsights.push({
      type: 'warning',
      title: 'Seu saldo está negativo',
      message: 'As despesas superam sua renda registrada. Precisa reduzir saídas e equilibrar o fluxo o quanto antes.',
    });
  }

  if (goals.length > 0 && spendRatio > 0.6) {
    localInsights.push({
      type: 'info',
      title: 'Meta em risco de atraso',
      message: 'Com gastos acima de 60% da renda, pode ficar mais difícil atingir metas financeiras. Ajuste o orçamento para priorizar seus objetivos.',
    });
  }

  try {
    const apiKey = process.env.EMERGENT_LLM_KEY;
    if (!apiKey) {
      return res.json({ insights: localInsights.slice(0, 4) });
    }

    const summary = transactions.slice(0, 12).map((t) => `${t.title}: R$ ${t.amount.toFixed(2)} (${t.type}/${t.category})`).join(', ');
    const advanced = plan.hasAdvancedAI ? 'avançada, com recomendações específicas de investimento, economia e planejamento' : 'básica, com observações gerais';

    const prompt = `Você é a assistente financeira do Finix. Analise os dados abaixo e gere 4 insights em português no estilo de uma conversa clara e prática.
Sempre entregue pelo menos um alerta direto no formato "Cuidado, ..." quando houver risco de gastar demais ou de faltar dinheiro.
Use também mensagens confiantes quando o usuário estiver no caminho certo.

Renda total: R$ ${income.toFixed(2)}
Despesas totais: R$ ${expense.toFixed(2)}
Saldo: R$ ${balance.toFixed(2)}
Porcentagem de renda gasta: ${(spendRatio * 100).toFixed(0)}%
Metas cadastradas: ${goals.length}
Últimas transações: ${summary}

Responda apenas com JSON válido no formato:
{ "insights": [{ "type": "success|warning|info", "title": "...", "message": "..." }] }
Limite o texto a frases curtas e diretas.`;

    const response = await fetch('https://integrations.emergentagent.com/llm/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 800,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await response.json() as any;
    let insights: any[] = localInsights.slice(0, 4);
    if (data.content && data.content[0]) {
      try {
        const text = data.content[0].text;
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed?.insights && Array.isArray(parsed.insights)) {
            insights = parsed.insights;
          }
        }
      } catch (error) {
        console.warn('AI insight parse failed, using fallback insights.', error);
      }
    }

    res.json({ insights });
  } catch (err) {
    console.error('AI Error:', err);
    res.json({ insights: localInsights.slice(0, 4) });
  }
});

// ============================================================================
// EXPORTS (gated by plan)
// ============================================================================
app.get('/api/export/pdf', authenticate, requireFeature('hasPDF'), async (req, res) => {
  const user = (req as any).user;
  const transactions = await prisma.transaction.findMany({ where: { userId: user.id }, orderBy: { date: 'desc' } });

  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  const chunks: Buffer[] = [];
  doc.on('data', (c: Buffer) => chunks.push(c));
  doc.on('end', () => {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="finix-relatorio.pdf"');
    res.send(Buffer.concat(chunks));
  });

  doc.fontSize(22).fillColor('#1f2937').text('Relatório Finix - Transações', { align: 'left' });
  doc.moveDown();
  doc.fontSize(10).fillColor('#4b5563').text(`Usuário: ${user.name} (${user.email})`);
  doc.text(`Plano: ${PLANS[user.plan]?.name || user.plan}`);
  doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`);
  doc.moveDown();

  const totalIncome = transactions.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);

  doc.fontSize(12).fillColor('#111827').text('Resumo', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(10).text(`Total de transações: ${transactions.length}`);
  doc.text(`Receitas: R$ ${totalIncome.toFixed(2)}`);
  doc.text(`Despesas: R$ ${totalExpense.toFixed(2)}`);
  doc.moveDown();

  doc.fontSize(12).text('Transações', { underline: true });
  doc.moveDown(0.5);
  const tableTop = doc.y;
  doc.fontSize(10).fillColor('#111827');
  doc.text('Data', 40, tableTop, { width: 80, continued: true });
  doc.text('Título', 130, tableTop, { width: 150, continued: true });
  doc.text('Tipo', 290, tableTop, { width: 80, continued: true });
  doc.text('Categoria', 370, tableTop, { width: 120, continued: true });
  doc.text('Valor', 490, tableTop, { width: 90, align: 'right' });
  doc.moveDown(0.5);

  transactions.forEach((t) => {
    const y = doc.y;
    doc.text(new Date(t.date).toLocaleDateString('pt-BR'), 40, y, { width: 80, continued: true });
    doc.text(t.title, 130, y, { width: 150, continued: true });
    doc.text(t.type, 290, y, { width: 80, continued: true });
    doc.text(t.category, 370, y, { width: 120, continued: true });
    doc.text(`R$ ${t.amount.toFixed(2)}`, 490, y, { width: 90, align: 'right' });
    doc.moveDown(0.5);
    if (doc.y > 720) doc.addPage();
  });
  doc.end();
});

app.get('/api/export/excel', authenticate, requireFeature('hasExcel'), async (req, res) => {
  const user = (req as any).user;
  const transactions = await prisma.transaction.findMany({ where: { userId: user.id }, orderBy: { date: 'desc' } });

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Transações');
  sheet.columns = [
    { header: 'Data', key: 'date', width: 15 },
    { header: 'Título', key: 'title', width: 35 },
    { header: 'Tipo', key: 'type', width: 12 },
    { header: 'Categoria', key: 'category', width: 18 },
    { header: 'Valor', key: 'amount', width: 14 },
  ];
  sheet.addRows(transactions.map((t) => ({
    date: new Date(t.date).toLocaleDateString('pt-BR'),
    title: t.title, type: t.type, category: t.category, amount: t.amount,
  })));
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

  const buffer = await workbook.xlsx.writeBuffer();
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="finix-transacoes.xlsx"');
  res.send(Buffer.from(buffer));
});

// ============================================================================
// INTERNAL API (called by Python proxy after Stripe webhook)
// Protected by a shared secret
// ============================================================================
const INTERNAL_SECRET = process.env.JWT_SECRET || 'finix-dev-secret';

app.post('/internal/update-user-plan', async (req, res) => {
  const secret = req.headers['x-internal-secret'];
  if (secret !== INTERNAL_SECRET) return res.status(401).json({ error: 'unauthorized' });
  const { userId, plan, stripeCustomerId, stripeSubscriptionId, planExpiresAt } = req.body;
  const updates: any = {};
  if (plan) updates.plan = plan;
  if (stripeCustomerId !== undefined) updates.stripeCustomerId = stripeCustomerId;
  if (stripeSubscriptionId !== undefined) updates.stripeSubscriptionId = stripeSubscriptionId;
  if (planExpiresAt !== undefined) updates.planExpiresAt = planExpiresAt ? new Date(planExpiresAt) : null;
  const user = await prisma.user.update({ where: { id: userId }, data: updates });
  res.json(userPublic(user));
});

app.post('/internal/create-payment-tx', async (req, res) => {
  const secret = req.headers['x-internal-secret'];
  if (secret !== INTERNAL_SECRET) return res.status(401).json({ error: 'unauthorized' });
  const { userId, userEmail, sessionId, amount, currency, plan, metadata } = req.body;
  const tx = await prisma.paymentTransaction.create({
    data: {
      id: uuidv4(), userId, userEmail, sessionId, amount, currency: currency || 'brl', plan,
      metadata: metadata ? JSON.stringify(metadata) : null,
    },
  });
  res.json(tx);
});

app.post('/internal/update-payment-tx', async (req, res) => {
  const secret = req.headers['x-internal-secret'];
  if (secret !== INTERNAL_SECRET) return res.status(401).json({ error: 'unauthorized' });
  const { sessionId, paymentStatus, status, stripePaymentId } = req.body;
  const existing = await prisma.paymentTransaction.findUnique({ where: { sessionId } });
  if (!existing) return res.status(404).json({ error: 'not found' });
  const tx = await prisma.paymentTransaction.update({
    where: { sessionId },
    data: {
      paymentStatus: paymentStatus || existing.paymentStatus,
      status: status || existing.status,
      stripePaymentId: stripePaymentId || existing.stripePaymentId,
    },
  });
  res.json({ ...tx, previousStatus: existing.paymentStatus });
});

app.get('/internal/user-by-id/:id', async (req, res) => {
  const secret = req.headers['x-internal-secret'];
  if (secret !== INTERNAL_SECRET) return res.status(401).json({ error: 'unauthorized' });
  const user = await prisma.user.findUnique({ where: { id: String(req.params.id) } });
  if (!user) return res.status(404).json({ error: 'not found' });
  res.json(userPublic(user));
});

app.get('/internal/payment-tx/:sessionId', async (req, res) => {
  const secret = req.headers['x-internal-secret'];
  if (secret !== INTERNAL_SECRET) return res.status(401).json({ error: 'unauthorized' });
  const tx = await prisma.paymentTransaction.findUnique({ where: { sessionId: String(req.params.sessionId) } });
  if (!tx) return res.status(404).json({ error: 'not found' });
  res.json(tx);
});

// ============================================================================
// STRIPE CHECKOUT
// ============================================================================
app.post('/api/stripe/cancel-subscription', authenticate, async (req, res) => {
  if (!stripe) {
    return res.status(500).json({ error: 'Stripe não configurado' });
  }

  const user = (req as any).user;
  if (!user?.stripeSubscriptionId) {
    return res.status(400).json({ error: 'Nenhuma assinatura ativa encontrada para cancelar.' });
  }

  try {
    await (stripe.subscriptions as any).del(user.stripeSubscriptionId);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        plan: 'FREE',
        stripeSubscriptionId: null,
        planExpiresAt: null,
      },
    });

    return res.json({ message: 'Assinatura cancelada. Seu plano foi revertido para o plano gratuito.' });
  } catch (err: any) {
    console.error('Stripe cancel subscription error:', err);
    return res.status(500).json({ error: err.message || 'Erro ao cancelar a assinatura' });
  }
});

app.post('/api/stripe/checkout', authenticate, async (req, res) => {
  if (!stripe) {
    return res.status(500).json({ error: 'Stripe não configurado' });
  }

  try {
    const { plan_id } = req.body;
    const user = (req as any).user;

    if (!['BASIC', 'PRO', 'TEST'].includes(plan_id)) {
      return res.status(400).json({ error: 'Plano inválido' });
    }

    const plan = PLANS[plan_id as keyof typeof PLANS];
    if (!plan) {
      return res.status(400).json({ error: 'Plano inválido' });
    }

    if (!plan.stripePriceId) {
      if (plan_id === 'TEST') {
        const sessionId = `test-session-${Date.now()}`;
        await prisma.user.update({
          where: { id: user.id },
          data: { plan: 'TEST' },
        });

        await prisma.paymentTransaction.create({
          data: {
            userId: user.id,
            userEmail: user.email,
            sessionId,
            amount: plan.price,
            currency: 'BRL',
            plan: plan_id,
            paymentStatus: 'paid',
            stripePaymentId: sessionId,
          },
        });

        return res.json({
          url: `${FRONTEND_URL}/app/dashboard?success=true&session_id=${sessionId}`,
          sessionId,
        });
      }

      return res.status(400).json({ error: 'Plano não configurado no Stripe' });
    }

    // Get or create Stripe customer
    let customer;
    if (user.stripeCustomerId) {
      customer = await stripe!.customers.retrieve(user.stripeCustomerId);
    } else {
      customer = await stripe!.customers.create({
        email: user.email,
        name: user.name,
      });
      // Update user with customer ID
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: customer.id },
      });
    }

    // Create checkout session
    const session = await stripe!.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      line_items: [
        {
          price: plan.stripePriceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${FRONTEND_URL}/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${FRONTEND_URL}/plans?canceled=true`,
      metadata: {
        userId: user.id,
        plan: plan_id,
      },
    });

    // Create payment transaction record
    await prisma.paymentTransaction.create({
      data: {
        userId: user.id,
        userEmail: user.email,
        sessionId: session.id,
        amount: plan.price,
        currency: 'BRL',
        plan: plan_id,
        paymentStatus: 'pending',
        stripePaymentId: session.id,
      },
    });

    res.json({ url: session.url, sessionId: session.id });
  } catch (err: any) {
    console.error('Stripe checkout error:', err);
    res.status(500).json({ error: err.message || 'Erro ao criar checkout' });
  }
});

// ============================================================================
// STRIPE WEBHOOK
// ============================================================================
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!stripe) {
    return res.status(500).json({ error: 'Stripe não configurado' });
  }

  const sig = req.headers['stripe-signature'] as string;
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe!.webhooks.constructEvent(req.body, sig, endpointSecret!);
  } catch (err: any) {
    console.log(`Webhook signature verification failed.`, err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      await handleCheckoutCompleted(session);
      break;
    case 'invoice.payment_succeeded':
      const invoice = event.data.object;
      await handleInvoicePaymentSucceeded(invoice);
      break;
    case 'customer.subscription.deleted':
      const subscription = event.data.object;
      await handleSubscriptionDeleted(subscription);
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
});

async function handleCheckoutCompleted(session: any) {
  const userId = session.metadata.userId;
  const plan = session.metadata.plan;

  // Update payment transaction
  await prisma.paymentTransaction.updateMany({
    where: { sessionId: session.id },
    data: {
      paymentStatus: 'paid',
      status: 'completed',
      stripePaymentId: session.payment_intent,
    },
  });

  // Update user plan
  const planExpiresAt = new Date();
  planExpiresAt.setMonth(planExpiresAt.getMonth() + 1); // Assuming monthly

  await prisma.user.update({
    where: { id: userId },
    data: {
      plan: plan,
      stripeSubscriptionId: session.subscription,
      planExpiresAt,
    },
  });
}

async function handleInvoicePaymentSucceeded(invoice: any) {
  // Handle recurring payments
  const subscription = await stripe!.subscriptions.retrieve(invoice.subscription);
  const customer = await stripe!.customers.retrieve(subscription.customer as string);

  // Find user by stripeCustomerId
  const user = await prisma.user.findFirst({
    where: { stripeCustomerId: customer.id },
  });

  if (user) {
    const planExpiresAt = new Date();
    planExpiresAt.setMonth(planExpiresAt.getMonth() + 1);

    await prisma.user.update({
      where: { id: user.id },
      data: { planExpiresAt },
    });
  }
}

async function handleSubscriptionDeleted(subscription: any) {
  const customer = await stripe!.customers.retrieve(subscription.customer);

  const user = await prisma.user.findFirst({
    where: { stripeCustomerId: customer.id },
  });

  if (user) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        plan: 'FREE',
        stripeSubscriptionId: null,
        planExpiresAt: null,
      },
    });
  }
}

// ============================================================================
// HEALTH
// ============================================================================
app.get('/', (req, res) => {
  res.json({ app: 'Finix TS', status: 'ok', version: '2.0' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler for zod/other
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Error:', err);
  if (err.name === 'ZodError') {
    return res.status(400).json({ error: 'Dados inválidos', details: err.errors });
  }
  res.status(500).json({ error: err.message || 'Erro interno' });
});

// ============================================================================
// SEED
// ============================================================================
const seedData = async () => {
  const adminEmail = process.env.ADMIN_EMAIL || 'finixappp@gmail.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';

  // Remove any other admin accounts so only the default admin remains
  await prisma.user.deleteMany({
    where: {
      role: 'ADMIN',
      email: { not: adminEmail },
    },
  });

  const admin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!admin) {
    await prisma.user.create({
      data: {
        id: uuidv4(),
        name: 'Administrador Finix',
        email: adminEmail,
        passwordHash: await bcrypt.hash(adminPassword, 10),
        role: 'ADMIN',
        plan: 'PRO',
        isVerified: true,
        verificationCode: null,
        verificationExpires: null,
        transactionsMonth: currentMonthKey(),
      },
    });
    console.log(`✅ Admin criado: ${adminEmail} / Admin@123`);
  } else {
    // Ensure admin has ADMIN role, PRO plan and is verified
    const updateData: any = {};
    if (admin.role !== 'ADMIN') updateData.role = 'ADMIN';
    if (admin.plan !== 'PRO') updateData.plan = 'PRO';
    if (!admin.isVerified) updateData.isVerified = true;
    if (admin.verificationCode !== null) updateData.verificationCode = null;
    if (admin.verificationExpires !== null) updateData.verificationExpires = null;
    if (Object.keys(updateData).length > 0) {
      await prisma.user.update({
        where: { id: admin.id },
        data: updateData,
      });
      console.log(`✅ Admin atualizado: ${adminEmail}`);
    } else {
      console.log(`✅ Admin já existe: ${adminEmail}`);
    }
  }
};

const PORT = Number(process.env.PORT) || 8000;
app.listen(PORT, async () => {
  console.log(`Finix TS backend rodando na porta ${PORT}`);
  await seedData();
});
