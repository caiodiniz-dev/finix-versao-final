"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logoutController =
  exports.refreshTokenController =
  exports.googleCallbackController =
  exports.googleRedirectController =
    void 0;
const googleAuthService_1 = require("../services/googleAuthService");
const tokenService_1 = require("../services/tokenService");
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";
const isProduction = process.env.NODE_ENV === "production";
const googleRedirectController = async (req, res) => {
  try {
    const state = Math.random().toString(36).substring(2, 15);
    const authUrl = (0, googleAuthService_1.getGoogleAuthUrl)(state);
    res.cookie("google_oauth_state", state, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      maxAge: 5 * 60 * 1000,
      path: "/",
    });
    return res.redirect(authUrl);
  } catch (error) {
    console.error("[OAuth] googleRedirectController error:", error);
    return res.status(500).json({ error: "Falha ao iniciar login com Google" });
  }
};
exports.googleRedirectController = googleRedirectController;
const googleCallbackController = async (req, res) => {
  try {
    const { code, state } = req.query;
    const storedState = req.cookies?.google_oauth_state;
    if (!code || typeof code !== "string") {
      return res.status(400).json({ error: "Código OAuth não foi fornecido" });
    }
    if (
      !state ||
      typeof state !== "string" ||
      !storedState ||
      state !== storedState
    ) {
      console.warn("[OAuth] invalid state", { state, storedState });
      return res.status(400).json({ error: "Estado OAuth inválido" });
    }
    res.clearCookie("google_oauth_state", { path: "/" });
    const profile = await (0, googleAuthService_1.verifyGoogleCode)(code);
    const user = await (0, googleAuthService_1.findOrCreateGoogleUser)(profile);
    const authResponse = await (0, googleAuthService_1.buildGoogleAuthResponse)(
      user,
    );
    res.cookie(
      "refresh_token",
      authResponse.refreshToken,
      (0, tokenService_1.refreshTokenCookieOptions)(isProduction),
    );
    res.cookie(
      "access_token",
      authResponse.accessToken,
      (0, tokenService_1.accessTokenCookieOptions)(isProduction),
    );
    const redirectTo = `${FRONTEND_URL}/oauth-callback?success=true`;
    return res.redirect(redirectTo);
  } catch (error) {
    console.error("[OAuth] googleCallbackController error:", error);
    return res.redirect(
      `${FRONTEND_URL}/oauth-callback?success=false&message=${encodeURIComponent(error.message || "Erro ao autenticar")}`,
    );
  }
};
exports.googleCallbackController = googleCallbackController;
const refreshTokenController = async (req, res) => {
  try {
    const token = req.cookies?.refresh_token;
    if (!token) {
      return res.status(401).json({ error: "Refresh token não fornecido" });
    }
    const refreshRecord = await (0, tokenService_1.verifyRefreshToken)(token);
    if (!refreshRecord || !refreshRecord.user) {
      return res
        .status(401)
        .json({ error: "Refresh token inválido ou expirado" });
    }
    const accessToken = (0, tokenService_1.createAccessToken)(
      refreshRecord.user,
    );
    res.cookie(
      "access_token",
      accessToken,
      (0, tokenService_1.accessTokenCookieOptions)(isProduction),
    );
    return res.json({
      token: accessToken,
      user: (0, tokenService_1.buildSafeUser)(refreshRecord.user),
    });
  } catch (error) {
    console.error("[OAuth] refreshTokenController error:", error);
    return res.status(500).json({ error: "Erro ao renovar sessão" });
  }
};
exports.refreshTokenController = refreshTokenController;
const logoutController = async (req, res) => {
  try {
    const refreshToken = req.cookies?.refresh_token;
    if (refreshToken) {
      await (0, tokenService_1.revokeRefreshToken)(refreshToken);
    }
    res.clearCookie("access_token", { path: "/" });
    res.clearCookie("refresh_token", { path: "/" });
    return res.json({ message: "Logout realizado com sucesso" });
  } catch (error) {
    console.error("[OAuth] logoutController error:", error);
    return res.status(500).json({ error: "Erro ao encerrar sessão" });
  }
};
exports.logoutController = logoutController;
