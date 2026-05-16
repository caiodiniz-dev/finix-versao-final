import { Resend } from 'resend';
import nodemailer from 'nodemailer';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const SMTP_USER = process.env.SMTP_USER || process.env.GMAIL_USER;
const SMTP_PASS = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;
const SMTP_HOST = process.env.SMTP_HOST || process.env.GMAIL_HOST || 'smtp.gmail.com';
const SMTP_PORT = Number(process.env.SMTP_PORT || process.env.GMAIL_PORT || 465);
const EMAIL_FROM = process.env.EMAIL_FROM || (SMTP_USER ? `Finix <${SMTP_USER}>` : 'Finix <onboarding@finix.app>');

const getVerificationTemplate = (code: string) => {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Finix – Código de Verificação</title>
</head>
<body style="margin:0;padding:0;background:#07080f;font-family:'Segoe UI',Arial,sans-serif;-webkit-font-smoothing:antialiased;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#07080f;padding:48px 16px;">
    <tr><td align="center">
    <table width="100%" style="max-width:580px;" cellpadding="0" cellspacing="0">

      <!-- ══ LOGO ══ -->
      <tr>
        <td align="center" style="padding-bottom:28px;">
          <table cellpadding="0" cellspacing="0"><tr>
            <td style="padding-right:12px;vertical-align:middle;">
              <table cellpadding="0" cellspacing="0"><tr><td style="
                width:50px;height:50px;border-radius:14px;
                background:linear-gradient(135deg,#6d5afc,#3b82f6);
                text-align:center;vertical-align:middle;
                font-size:24px;font-weight:900;color:#fff;
                line-height:50px;
              ">F</td></tr></table>
            </td>
            <td style="vertical-align:middle;">
              <span style="font-size:26px;font-weight:900;letter-spacing:.2em;color:#fff;">FINIX</span>
            </td>
          </tr></table>
        </td>
      </tr>

      <!-- ══ CARD ══ -->
      <tr>
        <td style="
          background:#10121c;
          border:1px solid rgba(255,255,255,.07);
          border-radius:28px;
          overflow:hidden;
          box-shadow:0 40px 80px rgba(0,0,0,.6);
        ">

          <!-- hero -->
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="
              background:#10121c;
              padding:52px 48px 44px;
              text-align:center;
              border-bottom:1px solid rgba(255,255,255,.06);
            ">
              <!-- badge pill -->
              <table cellpadding="0" cellspacing="0" align="center" style="margin-bottom:24px;">
                <tr><td style="
                  background:rgba(109,90,252,.18);
                  border:1px solid rgba(109,90,252,.38);
                  border-radius:999px;
                  padding:6px 18px;
                  font-size:11px;font-weight:700;
                  letter-spacing:.14em;text-transform:uppercase;
                  color:#c4b5fd;
                ">🔐 &nbsp;Verificação de identidade</td></tr>
              </table>

              <h1 style="margin:0 0 18px;font-size:38px;font-weight:900;line-height:1.1;letter-spacing:-.03em;color:#ffffff;">
                Seu código de<br/>
                <span style="color:#818cf8;">acesso seguro</span>
              </h1>

              <p style="margin:0 auto;max-width:400px;font-size:15px;color:#94a3b8;line-height:1.8;">
                Estamos confirmando sua identidade antes de liberar o acesso
                à plataforma. Use o código abaixo para concluir o login.
              </p>
            </td></tr>
          </table>

          <!-- code section -->
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:44px 48px 36px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr><td style="
                  background:rgba(109,90,252,.08);
                  border:1px solid rgba(109,90,252,.22);
                  border-radius:22px;
                  padding:40px 20px;
                  text-align:center;
                ">
                  <div style="
                    font-size:10px;font-weight:700;
                    letter-spacing:.28em;text-transform:uppercase;
                    color:#a78bfa;margin-bottom:20px;
                  ">Código de verificação</div>

                  <table cellpadding="0" cellspacing="0" align="center">
                    <tr><td style="
                      background:#1a1730;
                      border:1.5px solid rgba(109,90,252,.45);
                      border-radius:18px;
                      padding:22px 40px;
                      font-size:54px;font-weight:900;
                      letter-spacing:16px;
                      color:#ddd6fe;
                      text-align:center;
                    ">${code}</td></tr>
                  </table>

                  <p style="margin:20px 0 0;font-size:14px;color:#64748b;">
                    Válido por <strong style="color:#a78bfa;">5 minutos</strong> &mdash; não compartilhe.
                  </p>
                </td></tr>
              </table>
            </td></tr>
          </table>

          <!-- divider -->
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:0 48px;">
              <div style="height:1px;background:rgba(255,255,255,.05);"></div>
            </td></tr>
          </table>

          <!-- warning -->
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:28px 48px 36px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr><td style="
                  background:rgba(239,68,68,.07);
                  border:1px solid rgba(239,68,68,.18);
                  border-left:3px solid #ef4444;
                  border-radius:14px;
                  padding:20px 22px;
                ">
                  <div style="
                    font-size:10px;font-weight:800;
                    letter-spacing:.14em;text-transform:uppercase;
                    color:#fca5a5;margin-bottom:8px;
                  ">⚠ &nbsp;Aviso de segurança</div>
                  <p style="margin:0;font-size:14px;color:#94a3b8;line-height:1.75;">
                    Nunca compartilhe este código com ninguém. A Finix
                    <strong style="color:#fca5a5;">jamais</strong>
                    solicitará este código por WhatsApp, ligação telefônica ou redes sociais.
                    Se você não solicitou este acesso, ignore este e-mail com segurança.
                  </p>
                </td></tr>
              </table>
            </td></tr>
          </table>

          <!-- footer -->
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="
              border-top:1px solid rgba(255,255,255,.05);
              padding:26px 48px 38px;
              text-align:center;
            ">
              <p style="margin:0;font-size:13px;color:#475569;line-height:1.7;">
                Se tiver dúvidas, acesse nosso
                <a href="#" style="color:#818cf8;text-decoration:none;">suporte</a>.
              </p>
              <p style="margin:8px 0 0;font-size:12px;color:#334155;">
                © 2026 Finix &mdash; Controle financeiro inteligente.
              </p>
            </td></tr>
          </table>

        </td>
      </tr>

    </table>
    </td></tr>
  </table>

</body>
</html>`;
};

export const sendVerificationEmail = async (email: string, code: string) => {
  try {
    const html = getVerificationTemplate(code);

    // Primeiro tenta Resend, depois SMTP/Gmail como fallback.
    let lastError: any = null;
    if (resend) {
      try {
        console.log('[EMAIL] Enviando via Resend para:', email);
        await resend.emails.send({
          from: EMAIL_FROM,
          to: email,
          subject: '🔐 Seu código de verificação – Finix',
          html,
        });
        console.log('✅ E-mail enviado com sucesso via Resend para:', email);
        return;
      } catch (err) {
        console.error('⚠️ Falha ao enviar via Resend, tentando SMTP fallback:', err);
        lastError = err;
      }
    }

    if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
      const isGmail = SMTP_USER?.toLowerCase().includes('@gmail.com') || SMTP_HOST.includes('gmail');
      const baseOptions: any = {
        auth: {
          user: SMTP_USER,
          pass: SMTP_PASS,
        },
      };
      const smtpOptions = isGmail
        ? {
          ...baseOptions,
          service: 'gmail',
          host: SMTP_HOST,
          port: SMTP_PORT,
          secure: SMTP_PORT === 465,
          tls: { rejectUnauthorized: false },
        }
        : {
          ...baseOptions,
          host: SMTP_HOST,
          port: SMTP_PORT,
          secure: SMTP_PORT === 465,
        };

      const transporter = nodemailer.createTransport(smtpOptions);

      try {
        console.log('[EMAIL] Enviando via SMTP para:', email, {
          host: SMTP_HOST,
          port: SMTP_PORT,
          secure: SMTP_PORT === 465,
          service: isGmail ? 'gmail' : undefined,
        });
        await transporter.verify();
        await transporter.sendMail({
          from: EMAIL_FROM,
          to: email,
          subject: '🔐 Seu código de verificação – Finix',
          html,
        });
        console.log('✅ E-mail enviado via SMTP para:', email);
        return;
      } catch (err) {
        console.error('❌ Falha ao enviar via SMTP:', err);
        lastError = lastError || err;

        if (isGmail && SMTP_PORT === 465) {
          console.log('[EMAIL] Tentando fallback Gmail via porta 587');
          const fallbackTransporter = nodemailer.createTransport({
            service: 'gmail',
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            auth: {
              user: SMTP_USER,
              pass: SMTP_PASS,
            },
            tls: { rejectUnauthorized: false },
          });
          try {
            await fallbackTransporter.verify();
            await fallbackTransporter.sendMail({
              from: EMAIL_FROM,
              to: email,
              subject: '🔐 Seu código de verificação – Finix',
              html,
            });
            console.log('✅ E-mail enviado via SMTP fallback porta 587 para:', email);
            return;
          } catch (fallbackErr) {
            console.error('❌ Falha no fallback SMTP 587:', fallbackErr);
            lastError = lastError || fallbackErr;
          }
        }
      }
    }

    if (lastError) {
      throw lastError;
    }

    throw new Error(
      'Serviço de e-mail não configurado. Defina RESEND_API_KEY ou SMTP_USER/GMAIL_USER + SMTP_PASS/GMAIL_APP_PASSWORD.'
    );
  } catch (error: any) {
    console.error('❌ Erro ao enviar e-mail:', error);
    throw new Error(error?.message || 'Erro ao enviar e-mail de verificação.');
  }
};