"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendVerificationEmail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const createTransporter = () => {
    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_APP_PASSWORD;
    if (!user || !pass) {
        throw new Error('Configuração de e-mail inválida. Defina GMAIL_USER e GMAIL_APP_PASSWORD.');
    }
    return nodemailer_1.default.createTransport({
        service: 'gmail',
        auth: { user, pass },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
    });
};
const sendVerificationEmail = async (email, code) => {
    const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verifique seu e-mail - Finix</title>
      <style>
        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #0b1220 0%, #111827 55%, #1f2937 100%);
          margin: 0;
          padding: 20px;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #f8fafc;
        }
        .container {
          max-width: 620px;
          width: 100%;
          background: #0f172a;
          border-radius: 32px;
          box-shadow: 0 32px 90px rgba(15, 23, 42, 0.35);
          overflow: hidden;
          border: 1px solid rgba(148, 163, 184, 0.18);
        }
        .header {
          background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%);
          padding: 44px 34px;
          text-align: center;
          color: white;
        }
        .logo {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          font-size: 30px;
          font-weight: 900;
          letter-spacing: 0.15em;
          text-transform: uppercase;
        }
        .logo-icon {
          width: 42px;
          height: 42px;
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.18);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          font-weight: 700;
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.15);
        }
        .subtitle {
          font-size: 15px;
          opacity: 0.95;
          margin-top: 14px;
          line-height: 1.6;
        }
        .content {
          padding: 40px 34px 32px;
          text-align: center;
          background: radial-gradient(circle at top, rgba(37, 99, 235, 0.08), transparent 40%), #ffffff;
        }
        .content-inner {
          background: #f8fafc;
          border-radius: 28px;
          padding: 32px 28px;
          color: #0f172a;
          box-shadow: 0 20px 60px rgba(15, 23, 42, 0.12);
        }
        .title {
          font-size: 30px;
          font-weight: 900;
          margin-bottom: 16px;
          letter-spacing: -0.04em;
        }
        .message {
          font-size: 16px;
          line-height: 1.85;
          margin-bottom: 28px;
          color: #475569;
        }
        .code-container {
          background: linear-gradient(135deg, #eff6ff 0%, #e2e8f0 100%);
          border-radius: 24px;
          padding: 28px 24px;
          margin: 32px 0;
          border: 1px solid #cbd5e1;
        }
        .code {
          font-size: 52px;
          font-weight: 900;
          letter-spacing: 12px;
          color: #1d4ed8;
          background: #ffffff;
          padding: 20px 34px;
          border-radius: 22px;
          display: inline-block;
          box-shadow: 0 16px 40px rgba(37, 99, 235, 0.16);
          margin-bottom: 12px;
        }
        .code-label {
          font-size: 13px;
          color: #64748b;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }
        .note-box {
          background: #f1f5f9;
          border-radius: 20px;
          border: 1px solid #e2e8f0;
          padding: 20px 22px;
          margin-top: 20px;
          text-align: left;
          color: #334155;
        }
        .note-box strong {
          color: #0f172a;
        }
        .footer {
          background: #111827;
          padding: 28px 34px 34px;
          text-align: center;
          font-size: 14px;
          color: #94a3b8;
        }
        .footer a {
          color: #7dd3fc;
          text-decoration: none;
          font-weight: 700;
        }
        .footer a:hover {
          text-decoration: underline;
        }
        .divider {
          height: 1px;
          background: linear-gradient(90deg, transparent 0%, rgba(148, 163, 184, 0.4) 50%, transparent 100%);
          margin: 18px 0;
        }
        @media (max-width: 640px) {
          .content {
            padding: 32px 20px 20px;
          }
          .content-inner {
            padding: 28px 20px;
          }
          .code {
            font-size: 44px;
            padding: 18px 28px;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">
            <span class="logo-icon">F</span>
            FINIX
          </div>
          <div class="subtitle">Seu app financeiro com proteção e clareza.</div>
        </div>
        <div class="content">
          <div class="content-inner">
            <h1 class="title">Valide seu e-mail</h1>
            <p class="message">
              Para manter sua conta segura, use o código abaixo no Finix. Isso garante que só você consiga finalizar o cadastro.
            </p>
            <div class="code-container">
              <div class="code">${code}</div>
              <div class="code-label">Código de verificação</div>
            </div>
            <p class="message">
              Insira o código na tela de verificação do app. Se ele expirar em 5 minutos, basta pedir um novo código.
            </p>
            <div class="note-box">
              <p><strong>Atenção:</strong> não compartilhe este código com ninguém. A Finix nunca pedirá esta informação fora do app.</p>
            </div>
          </div>
        </div>
        <div class="footer">
          <div class="divider"></div>
          <p>
            Se você não pediu essa verificação, apenas ignore este e-mail.
          </p>
          <p style="margin-top: 14px;">
            Precisando de ajuda? <a href="mailto:suporte@finix.com">suporte@finix.com</a>
          </p>
          <p style="margin-top: 20px; font-size: 12px; color: #6b7280;">
            © 2026 Finix. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
    const mailOptions = {
        from: '"Finix" <finixappp@gmail.com>',
        to: email,
        subject: 'Verifique seu e-mail - Código de ativação',
        html,
    };
    const transporter = createTransporter();
    try {
        await transporter.sendMail(mailOptions);
    }
    catch (error) {
        throw new Error('Erro ao enviar e-mail de verificação. Verifique as configurações de e-mail no backend.');
    }
};
exports.sendVerificationEmail = sendVerificationEmail;
