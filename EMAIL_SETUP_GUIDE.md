# 📧 Configurar Email de Verificação com Gmail

## Por que isso é importante?
Sem o email configurado, seus usuários não conseguirão se cadastrar ou recuperar contas, pois o sistema precisa enviar o código de verificação de 6 dígitos para o email.

## Passo a Passo - Gmail App Password

### 1. Ativar Autenticação em 2 Fatores no Google
1. Acesse [myaccount.google.com](https://myaccount.google.com)
2. Clique em **"Segurança"** (lado esquerdo)
3. Localize **"Autenticação de dois fatores"** (Two-Step Verification)
4. Clique em **"Comece agora"** ou **"Começar a configuração"**
5. Siga os passos para ativar a autenticação em 2 fatores

### 2. Criar Senha de App
1. Volte para [myaccount.google.com/security](https://myaccount.google.com/security)
2. Role até **"Senhas de app"** (App passwords)
   - Se não vir essa opção, é porque a autenticação 2FA não está ativada
3. Escolha:
   - **App**: Google Chrome (ou Mail)
   - **Dispositivo**: Windows PC (ou seu sistema)
4. Clique em **"Gerar"**
5. Você verá uma senha de 16 caracteres, tipo: `abcd efgh ijkl mnop`
6. **Copie e guarde** essa senha

### 3. Configurar no Backend
1. Vá para a pasta do backend: `backend-ts/`
2. Crie um arquivo `.env` (se não existir) com:

```env
DATABASE_URL="mysql://root:@localhost:3306/finix_db"
JWT_SECRET="sua-chave-secreta-super-segura"
NODE_ENV="development"
FRONTEND_URL="http://localhost:3000"

# Email Configuration
GMAIL_USER="seu-email@gmail.com"
GMAIL_APP_PASSWORD="abcd efgh ijkl mnop"
SMTP_USER="seu-email@gmail.com"
SMTP_PASS="abcd efgh ijkl mnop"
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="465"
EMAIL_FROM="Finix <seu-email@gmail.com>"
EMAIL_REPLY_TO="seu-email@gmail.com"
```

### 4. Testar o Envio
```bash
cd backend-ts
npm run dev
```

Acesse o frontend e tente fazer um cadastro. Se tudo estiver configurado certo, você receberá um email com o código de verificação!

## Troubleshooting

### ❌ "Erro ao criar conta. Tente novamente mais tarde."
**Solução**: Verifique se:
- [ ] Autenticação 2FA está **ativada** no Google
- [ ] Você copiou a senha de app com os **espaços**
- [ ] As variáveis de ambiente estão **corretas** no `.env`
- [ ] O servidor está **rodando** (`npm run dev`)

### ❌ "SMTP retornou rejeição"
**Solução**: 
- Verifique se há erros no console do backend
- A senha de app pode ter vencido - crie uma nova
- Tente usar porta **587** ao invés de 465

### ❌ "Falha ao enviar via SMTP"
**Solução**:
- Verifique se tem conexão com a internet
- Confirme que a senha de app está **sem erros**
- Tente fazer logout e login novamente na conta Google

## Alternativamente: Usar Resend.com (mais confiável)

Se preferir não usar Gmail, pode usar o [Resend.com](https://resend.com):

1. Crie uma conta em [resend.com](https://resend.com)
2. Obtenha sua API Key
3. Adicione ao `.env`:
```env
RESEND_API_KEY="re_xxxxxxxxxxxxxxxxxxxxx"
```

## Logs para Debug

Se algo der errado, veja os logs do servidor:
```bash
[EMAIL] Tentando envio via SMTP
[EMAIL] SMTP send result
[EMAIL] Falha ao enviar via SMTP
```

Se vir "Falha ao enviar", copie toda a mensagem de erro e procure a solução acima.

---

**Dúvidas?** Contacte o suporte pelo WhatsApp ou email.
