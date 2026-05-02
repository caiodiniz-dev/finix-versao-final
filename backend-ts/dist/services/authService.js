"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = exports.resendVerificationCode = exports.verifyEmail = exports.signup = exports.generateVerificationCode = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = require("@prisma/client");
const emailService_1 = require("./emailService");
const prisma = new client_1.PrismaClient();
const generateVerificationCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};
exports.generateVerificationCode = generateVerificationCode;
const signup = async (email, password, name) => {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
        throw new Error('Usuário já existe');
    }
    // Hash password
    const passwordHash = await bcrypt_1.default.hash(password, 10);
    // Generate verification code
    const verificationCode = (0, exports.generateVerificationCode)();
    const verificationExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    // Create user
    const user = await prisma.user.create({
        data: {
            email,
            passwordHash,
            name,
            isVerified: false,
            verificationCode,
            verificationExpires,
        },
    });
    // Send verification email
    await (0, emailService_1.sendVerificationEmail)(email, verificationCode);
    return { userId: user.id, message: 'Usuário criado. Verifique seu e-mail.' };
};
exports.signup = signup;
const verifyEmail = async (email, code) => {
    const user = await prisma.user.findUnique({ where: { email } });
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
        where: { email },
        data: {
            isVerified: true,
            verificationCode: null,
            verificationExpires: null,
        },
    });
    return { message: 'E-mail verificado com sucesso' };
};
exports.verifyEmail = verifyEmail;
const resendVerificationCode = async (email) => {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
        throw new Error('Usuário não encontrado');
    }
    if (user.isVerified) {
        throw new Error('E-mail já verificado');
    }
    // Generate new code
    const verificationCode = (0, exports.generateVerificationCode)();
    const verificationExpires = new Date(Date.now() + 5 * 60 * 1000);
    // Update user
    await prisma.user.update({
        where: { email },
        data: {
            verificationCode,
            verificationExpires,
        },
    });
    // Send email
    await (0, emailService_1.sendVerificationEmail)(email, verificationCode);
    return { message: 'Novo código enviado' };
};
exports.resendVerificationCode = resendVerificationCode;
const login = async (email, password) => {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
        throw new Error('Credenciais inválidas');
    }
    if (!user.isVerified) {
        throw new Error('E-mail não verificado. Verifique seu e-mail antes de fazer login.');
    }
    const isPasswordValid = await bcrypt_1.default.compare(password, user.passwordHash);
    if (!isPasswordValid) {
        throw new Error('Credenciais inválidas');
    }
    // Generate JWT
    const token = jsonwebtoken_1.default.sign({ sub: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET || 'finix-dev-secret', { expiresIn: '7d' });
    return {
        user: {
            id: user.id,
            email: user.email,
            name: user.name,
            isVerified: user.isVerified,
        },
        token,
        message: 'Login realizado com sucesso',
    };
};
exports.login = login;
