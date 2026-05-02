import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD, // Use App Password, not regular password
  },
});

export const sendVerificationEmail = async (email: string, code: string) => {
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
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%);
          margin: 0;
          padding: 20px;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .container {
          max-width: 580px;
          width: 100%;
          background: #ffffff;
          border-radius: 28px;
          box-shadow: 0 28px 80px rgba(15, 23, 42, 0.18);
          overflow: hidden;
        }
        .header {
          background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%);
          padding: 44px 34px;
          text-align: center;
          color: white;
        }
        .logo {
          font-size: 32px;
          font-weight: 800;
          margin-bottom: 12px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
        }
        .logo-icon {
          font-size: 40px;
        }
        .subtitle {
          font-size: 16px;
          opacity: 0.92;
          margin-bottom: 16px;
        }
        .content {
          padding: 42px 34px 32px;
          text-align: center;
        }
        .title {
          font-size: 32px;
          font-weight: 800;
          margin-bottom: 18px;
          color: #0f172a;
        }
        .message {
          font-size: 16px;
          line-height: 1.8;
          margin-bottom: 28px;
          color: #475569;
        }
        .code-container {
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
          border: 2px dashed #cbd5e1;
          border-radius: 22px;
          padding: 34px 24px;
          margin: 32px 0;
        }
        .code {
          font-size: 52px;
          font-weight: 800;
          letter-spacing: 10px;
          color: #2563eb;
          background: #ffffff;
          padding: 18px 32px;
          border-radius: 18px;
          box-shadow: 0 10px 30px rgba(37, 99, 235, 0.12);
          border: 1px solid #dbeafe;
          display: inline-block;
          margin-bottom: 12px;
        }
        .code-label {
          font-size: 14px;
          color: #64748b;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .note-box {
          background: #f8fafc;
          border-radius: 20px;
          border: 1px solid #e2e8f0;
          padding: 20px 24px;
          margin-top: 20px;
          text-align: left;
          color: #475569;
        }
        .note-box strong {
          color: #0f172a;
        }
        .footer {
          background: #f8fafc;
          padding: 28px 34px 34px;
          text-align: center;
          font-size: 14px;
          color: #64748b;
        }
        .footer a {
          color: #2563eb;
          text-decoration: none;
          font-weight: 600;
        }
        .footer a:hover {
          text-decoration: underline;
        }
        .divider {
          height: 1px;
          background: linear-gradient(90deg, transparent 0%, #cbd5e1 50%, transparent 100%);
          margin: 18px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">
            Finix
          </div>
          <div class="subtitle">Seu parceiro financeiro inteligente</div>
        </div>
        <div class="content">
          <h1 class="title">Confirme seu acesso</h1>
          <p class="message">
            Para proteger sua conta e garantir que só você tenha acesso, use o código abaixo para validar seu e-mail.
          </p>
          <div class="code-container">
            <div class="code">${code}</div>
            <div class="code-label">Código de verificação</div>
          </div>
          <p class="message">
            Cole o código no app Finix e finalize sua ativação. Se o código expirar, solicite um novo pela tela de verificação.
          </p>
          <div class="note-box">
            <p><strong>Importante:</strong> este código vale por 5 minutos. Não compartilhe com ninguém.</p>
          </div>
        </div>
        <div class="footer">
          <div class="divider"></div>
          <p>
            Se você não solicitou essa verificação, ignore este e-mail.
          </p>
          <p style="margin-top: 14px;">
            Precisa de ajuda? <a href="mailto:suporte@finix.com">suporte@finix.com</a>
          </p>
          <p style="margin-top: 20px; font-size: 12px; color: #94a3b8;">
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

  await transporter.sendMail(mailOptions);
};