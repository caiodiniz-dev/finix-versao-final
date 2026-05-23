"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildGoogleAuthResponse = exports.findOrCreateGoogleUser = exports.verifyGoogleCode = exports.getGoogleAuthUrl = void 0;
const google_auth_library_1 = require("google-auth-library");
const crypto_1 = __importDefault(require("crypto"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const client_1 = require("@prisma/client");
const tokenService_1 = require("./tokenService");
const prisma = new client_1.PrismaClient();
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:8000/google/callback';
const oauthClient = new google_auth_library_1.OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);
if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    console.warn('[GoogleAuthService] Faltando GOOGLE_CLIENT_ID ou GOOGLE_CLIENT_SECRET. Configure o .env.');
}
const getGoogleAuthUrl = (state) => {
    return oauthClient.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',
        scope: ['openid', 'email', 'profile'],
        state,
    });
};
exports.getGoogleAuthUrl = getGoogleAuthUrl;
const verifyGoogleCode = async (code) => {
    const { tokens } = await oauthClient.getToken(code);
    if (!tokens.id_token) {
        throw new Error('Falha ao obter o ID token do Google');
    }
    const ticket = await oauthClient.verifyIdToken({
        idToken: tokens.id_token,
        audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.email || !payload.sub) {
        throw new Error('Dados de perfil do Google incompletos');
    }
    return {
        email: payload.email.toLowerCase(),
        verified_email: !!payload.email_verified,
        name: payload.name || 'Usuário Google',
        picture: payload.picture,
        sub: payload.sub,
    };
};
exports.verifyGoogleCode = verifyGoogleCode;
const findOrCreateGoogleUser = async (profile) => {
    const normalizedEmail = profile.email.toLowerCase().trim();
    let user = await prisma.user.findUnique({ where: { googleId: profile.sub } });
    if (!user) {
        user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    }
    if (user) {
        const updates = {
            name: profile.name,
            photo: profile.picture,
            isVerified: true,
            authProvider: 'google',
            googleId: profile.sub,
        };
        user = await prisma.user.update({
            where: { id: user.id },
            data: updates,
        });
        return user;
    }
    const randomSecret = crypto_1.default.randomBytes(48).toString('hex');
    const passwordHash = await bcrypt_1.default.hash(randomSecret, 10);
    user = await prisma.user.create({
        data: {
            email: normalizedEmail,
            name: profile.name,
            passwordHash,
            photo: profile.picture,
            isVerified: true,
            authProvider: 'google',
            googleId: profile.sub,
        },
    });
    return user;
};
exports.findOrCreateGoogleUser = findOrCreateGoogleUser;
const buildGoogleAuthResponse = async (user) => {
    const accessToken = (0, tokenService_1.createAccessToken)(user);
    const refreshTokenResult = await (0, tokenService_1.createRefreshTokenForUser)(user.id);
    return {
        accessToken,
        refreshToken: refreshTokenResult.token,
        user: (0, tokenService_1.buildSafeUser)(user),
    };
};
exports.buildGoogleAuthResponse = buildGoogleAuthResponse;
