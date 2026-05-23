"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMeController =
  exports.loginController =
  exports.resendCodeController =
  exports.verifyEmailController =
  exports.signupController =
    void 0;
const authService_1 = require("../services/authService");
const tokenService_1 = require("../services/tokenService");
const signupController = async (req, res) => {
  try {
    console.log("[AUTH] Signup request:", { email: req.body.email });
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      console.warn("[AUTH] Signup failed: missing required fields");
      return res
        .status(400)
        .json({ error: "Email, senha e nome são obrigatórios" });
    }
    console.log("[AUTH] Creating user:", email);
    const result = await (0, authService_1.signup)(email, password, name);
    console.log("[AUTH] Signup successful for:", email);
    res.status(201).json(result);
  } catch (error) {
    console.error("[AUTH] Signup error:", error.message);
    res.status(400).json({ error: error.message });
  }
};
exports.signupController = signupController;
const verifyEmailController = async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ error: "Email e código são obrigatórios" });
    }
    const result = await (0, authService_1.verifyEmail)(email, code);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
exports.verifyEmailController = verifyEmailController;
const resendCodeController = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email é obrigatório" });
    }
    const result = await (0, authService_1.resendVerificationCode)(email);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
exports.resendCodeController = resendCodeController;
const isProduction = process.env.NODE_ENV === "production";
const loginController = async (req, res) => {
  try {
    console.log("[AUTH] Login request:", {
      email: req.body.email,
      method: req.method,
      path: req.path,
    });
    const { email, password, remember = false } = req.body;
    if (!email || !password) {
      console.warn("[AUTH] Login failed: missing email or password");
      return res.status(400).json({ error: "Email e senha são obrigatórios" });
    }
    console.log("[AUTH] Attempting login for:", email);
    const result = await (0, authService_1.login)(email, password);
    if (remember && result.refreshToken) {
      res.cookie(
        "refresh_token",
        result.refreshToken,
        (0, tokenService_1.refreshTokenCookieOptions)(isProduction),
      );
      res.cookie(
        "access_token",
        result.token,
        (0, tokenService_1.accessTokenCookieOptions)(isProduction),
      );
    }
    console.log("[AUTH] Login successful for:", email);
    res.json(result);
  } catch (error) {
    console.error("[AUTH] Login error:", error.message);
    res.status(400).json({ error: error.message });
  }
};
exports.loginController = loginController;
const getMeController = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Usuário não autenticado" });
    }
    res.json(req.user);
  } catch (error) {
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};
exports.getMeController = getMeController;
