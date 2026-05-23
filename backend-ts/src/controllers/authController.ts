import { Request, Response } from 'express';
import { signup, verifyEmail, resendVerificationCode, login } from '../services/authService';
import { accessTokenCookieOptions, refreshTokenCookieOptions } from '../services/tokenService';
import { AuthRequest } from '../middlewares/auth';

export const signupController = async (req: Request, res: Response) => {
  try {
    console.log('[AUTH] Signup request:', { email: req.body.email });
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      console.warn('[AUTH] Signup failed: missing required fields');
      return res.status(400).json({ error: 'Email, senha e nome são obrigatórios' });
    }

    console.log('[AUTH] Creating user:', email);
    const result = await signup(email, password, name);
    console.log('[AUTH] Signup successful for:', email);
    res.status(201).json(result);
  } catch (error: any) {
    console.error('[AUTH] Signup error:', error.message);
    res.status(400).json({ error: error.message });
  }
};

export const verifyEmailController = async (req: Request, res: Response) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ error: 'Email e código são obrigatórios' });
    }

    const result = await verifyEmail(email, code);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const resendCodeController = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email é obrigatório' });
    }

    const result = await resendVerificationCode(email);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

const isProduction = process.env.NODE_ENV === 'production';

export const loginController = async (req: Request, res: Response) => {
  try {
    console.log('[AUTH] Login request:', { email: req.body.email, method: req.method, path: req.path });

    const { email, password, remember = false } = req.body;

    if (!email || !password) {
      console.warn('[AUTH] Login failed: missing email or password');
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    console.log('[AUTH] Attempting login for:', email);
    const result = await login(email, password);

    if (remember && result.refreshToken) {
      res.cookie('refresh_token', result.refreshToken, refreshTokenCookieOptions(isProduction));
      res.cookie('access_token', result.token, accessTokenCookieOptions(isProduction));
    }

    console.log('[AUTH] Login successful for:', email);
    res.json(result);
  } catch (error: any) {
    console.error('[AUTH] Login error:', error.message);
    res.status(400).json({ error: error.message });
  }
};

export const getMeController = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    res.json(req.user);
  } catch (error: any) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};