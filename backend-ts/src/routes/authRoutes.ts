import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import { authRateLimit } from '../middlewares/rateLimit';
import {
  signupController,
  verifyEmailController,
  resendCodeController,
  loginController,
  getMeController
} from '../controllers/authController';

const router = Router();

// Aplica o limite de requisições em todas as rotas de autenticação
router.use(authRateLimit);

/**
 * IMPORTANTE: 
 * Como no seu arquivo principal (app.ts) você provavelmente usa:
 * app.use('/api/auth', authRoutes);
 * * As rotas abaixo NÃO devem repetir o prefixo.
 */

// Rota de Cadastro (Signup)
router.post('/signup', signupController);

// Rota de Cadastro (Caso o front use /register)
router.post('/register', signupController);

// Verificação de E-mail
router.post('/verify', verifyEmailController);

// Reenviar código de verificação
router.post('/resend-code', resendCodeController);

// Rota de Login
router.post('/login', loginController);

// Rota para buscar dados do usuário logado
router.get('/me', authenticate, getMeController);

export default router;