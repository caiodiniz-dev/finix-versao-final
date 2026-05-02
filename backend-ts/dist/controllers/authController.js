"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMeController = exports.loginController = exports.resendCodeController = exports.verifyEmailController = exports.signupController = void 0;
const authService_1 = require("../services/authService");
const signupController = async (req, res) => {
    try {
        const { email, password, name } = req.body;
        if (!email || !password || !name) {
            return res.status(400).json({ error: 'Email, senha e nome são obrigatórios' });
        }
        const result = await (0, authService_1.signup)(email, password, name);
        res.status(201).json(result);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
};
exports.signupController = signupController;
const verifyEmailController = async (req, res) => {
    try {
        const { email, code } = req.body;
        if (!email || !code) {
            return res.status(400).json({ error: 'Email e código são obrigatórios' });
        }
        const result = await (0, authService_1.verifyEmail)(email, code);
        res.json(result);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
};
exports.verifyEmailController = verifyEmailController;
const resendCodeController = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ error: 'Email é obrigatório' });
        }
        const result = await (0, authService_1.resendVerificationCode)(email);
        res.json(result);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
};
exports.resendCodeController = resendCodeController;
const loginController = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email e senha são obrigatórios' });
        }
        const result = await (0, authService_1.login)(email, password);
        res.json(result);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
};
exports.loginController = loginController;
const getMeController = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Usuário não autenticado' });
        }
        res.json(req.user);
    }
    catch (error) {
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};
exports.getMeController = getMeController;
