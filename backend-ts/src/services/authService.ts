import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { sendVerificationEmail } from './emailService';

const prisma = new PrismaClient();

export const generateVerificationCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const signup = async (email: string, password: string, name: string) => {
  const normalizedEmail = email.toLowerCase().trim();
  const normalizedName = name.trim();

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existingUser) {
    throw new Error('Usuário já existe');
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 10);

  // Generate verification code
  const verificationCode = generateVerificationCode();
  const verificationExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  // Create user
  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      passwordHash,
      name: normalizedName,
      isVerified: false,
      verificationCode,
      verificationExpires,
    },
  });

  try {
    await sendVerificationEmail(normalizedEmail, verificationCode);
  } catch (error: any) {
    await prisma.user.delete({ where: { id: user.id } }).catch(() => null);
    throw new Error(error.message || 'Erro ao criar conta. Tente novamente mais tarde.');
  }

  return { userId: user.id, message: 'Usuário criado. Verifique seu e-mail.' };
};

export const verifyEmail = async (email: string, code: string) => {
  const normalizedEmail = email.toLowerCase().trim();
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (!user) {
    throw new Error('Usuário não encontrado');
  }

  if (user.isVerified) {
    throw new Error('E-mail já verificado');
  }

  if (!user.verificationCode || user.verificationCode !== code) {
    throw new Error('Código inválido');
  }

  if (!user.verificationExpires || user.verificationExpires < new Date()) {
    throw new Error('Código expirado');
  }

  // Update user
  await prisma.user.update({
    where: { email: normalizedEmail },
    data: {
      isVerified: true,
      verificationCode: null,
      verificationExpires: null,
    },
  });

  return { message: 'E-mail verificado com sucesso' };
};

export const resendVerificationCode = async (email: string) => {
  const normalizedEmail = email.toLowerCase().trim();
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (!user) {
    throw new Error('Usuário não encontrado');
  }

  if (user.isVerified) {
    throw new Error('E-mail já verificado');
  }

  // Generate new code
  const verificationCode = generateVerificationCode();
  const verificationExpires = new Date(Date.now() + 5 * 60 * 1000);

  // Update user
  await prisma.user.update({
    where: { email: normalizedEmail },
    data: {
      verificationCode,
      verificationExpires,
    },
  });

  // Send email
  await sendVerificationEmail(normalizedEmail, verificationCode);

  return { message: 'Novo código enviado' };
};

export const login = async (email: string, password: string) => {
  const normalizedEmail = email.toLowerCase().trim();
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (!user) {
    throw new Error('Credenciais inválidas');
  }

  if (!user.isVerified) {
    throw new Error('E-mail não verificado. Verifique seu e-mail antes de fazer login.');
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    throw new Error('Credenciais inválidas');
  }

  // Generate JWT
  const token = jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET || 'finix-dev-secret',
    { expiresIn: '7d' }
  );

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      plan: user.plan,
      hasCompletedOnboarding: user.hasCompletedOnboarding,
      isVerified: user.isVerified,
    },
    token,
    message: 'Login realizado com sucesso',
  };
};