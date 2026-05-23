"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middlewares/auth");
const rateLimit_1 = require("../middlewares/rateLimit");
const authController_1 = require("../controllers/authController");
const oauthController_1 = require("../controllers/oauthController");
const router = (0, express_1.Router)();
// Aplica o limite de requisições em todas as rotas de autenticação
router.use(rateLimit_1.authRateLimit);
/**
 * IMPORTANTE:
 * Como no seu arquivo principal (app.ts) você provavelmente usa:
 * app.use('/api/auth', authRoutes);
 * * As rotas abaixo NÃO devem repetir o prefixo.
 */
// Rota de Cadastro (Signup)
router.post('/signup', authController_1.signupController);
// Rota de Cadastro (Caso o front use /register)
router.post('/register', authController_1.signupController);
// Verificação de E-mail
router.post('/verify', authController_1.verifyEmailController);
// Reenviar código de verificação
router.post('/resend-code', authController_1.resendCodeController);
// Rota de Login
router.post('/login', authController_1.loginController);
// Refresh token e logout
router.post('/refresh-token', oauthController_1.refreshTokenController);
router.post('/logout', oauthController_1.logoutController);
// Rota para buscar dados do usuário logado
router.get('/me', auth_1.authenticate, authController_1.getMeController);
exports.default = router;
