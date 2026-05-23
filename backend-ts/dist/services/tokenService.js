"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.accessTokenCookieOptions =
  exports.refreshTokenCookieOptions =
  exports.parseJwtPayload =
  exports.revokeUserRefreshTokens =
  exports.revokeRefreshToken =
  exports.verifyRefreshToken =
  exports.createRefreshTokenForUser =
  exports.createAccessToken =
  exports.buildSafeUser =
    void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const crypto_1 = __importDefault(require("crypto"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "finix-dev-secret";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "15m";
const REFRESH_TOKEN_EXPIRES_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const buildSafeUser = (user) => ({
  id: user.id,
  email: user.email,
  name: user.name,
  role: user.role,
  plan: user.plan,
  hasCompletedOnboarding: user.hasCompletedOnboarding,
  isVerified: user.isVerified,
  photo: user.photo,
});
exports.buildSafeUser = buildSafeUser;
const createAccessToken = (user) => {
  const secret = JWT_SECRET || "finix-dev-secret";
  return jsonwebtoken_1.default.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      provider: user.authProvider || "local",
    },
    secret,
    { expiresIn: JWT_EXPIRES_IN },
  );
};
exports.createAccessToken = createAccessToken;
const createTokenFingerprint = (token) => {
  return crypto_1.default.createHash("sha256").update(token).digest("hex");
};
const createRefreshTokenForUser = async (userId) => {
  const token = crypto_1.default.randomBytes(64).toString("hex");
  const tokenHash = await bcrypt_1.default.hash(token, 10);
  const tokenFingerprint = createTokenFingerprint(token);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_MS);
  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash,
      tokenFingerprint,
      expiresAt,
    },
  });
  return { token, expiresAt: expiresAt.getTime() };
};
exports.createRefreshTokenForUser = createRefreshTokenForUser;
const verifyRefreshToken = async (token) => {
  const tokenFingerprint = createTokenFingerprint(token);
  const refreshToken = await prisma.refreshToken.findUnique({
    where: { tokenFingerprint },
    include: { user: true },
  });
  if (!refreshToken || refreshToken.expiresAt < new Date()) {
    return null;
  }
  const isValid = await bcrypt_1.default.compare(token, refreshToken.tokenHash);
  if (!isValid) {
    return null;
  }
  return refreshToken;
};
exports.verifyRefreshToken = verifyRefreshToken;
const revokeRefreshToken = async (token) => {
  const tokenFingerprint = createTokenFingerprint(token);
  await prisma.refreshToken.deleteMany({ where: { tokenFingerprint } });
};
exports.revokeRefreshToken = revokeRefreshToken;
const revokeUserRefreshTokens = async (userId) => {
  await prisma.refreshToken.deleteMany({ where: { userId } });
};
exports.revokeUserRefreshTokens = revokeUserRefreshTokens;
const parseJwtPayload = (token) => {
  try {
    return jsonwebtoken_1.default.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};
exports.parseJwtPayload = parseJwtPayload;
const refreshTokenCookieOptions = (secure) => ({
  httpOnly: true,
  secure,
  sameSite: "lax",
  maxAge: REFRESH_TOKEN_EXPIRES_MS,
  path: "/",
});
exports.refreshTokenCookieOptions = refreshTokenCookieOptions;
const accessTokenCookieOptions = (secure) => ({
  httpOnly: true,
  secure,
  sameSite: "lax",
  maxAge: 15 * 60 * 1000,
  path: "/",
});
exports.accessTokenCookieOptions = accessTokenCookieOptions;
