# Finix Backend (TypeScript)

Backend da aplicação Finix, sistema de controle financeiro pessoal com autenticação OTP por e-mail.

## Tecnologias

- **Node.js** com **TypeScript**
- **Express.js** para API REST
- **Prisma** com **SQLite** (ou PostgreSQL)
- **Nodemailer** com SMTP Gmail
- **bcrypt** para hash de senhas
- **JWT** para autenticação
- **Zod** para validação

## Funcionalidades

- ✅ Cadastro de usuários com verificação de e-mail OTP
- ✅ Login com JWT
- ✅ Middleware de autenticação
- ✅ Controle financeiro (transações, orçamentos, metas)
- ✅ Integração com Stripe para pagamentos
- ✅ Geração de PDFs e Excel
- ✅ IA integrada (opcional)

## Instalação

### 1. Clonar e instalar dependências

```bash
cd backend-ts
npm install
```

### 2. Configurar ambiente

Copie o arquivo `.env.example` para `.env`:

```bash
cp .env.example .env
```

Configure as variáveis no `.env`:

```env
# Database (SQLite por padrão)
DATABASE_URL="file:./dev.db"

# JWT Secret (gere um seguro)
JWT_SECRET="your-super-secret-jwt-key-here-change-this"

# Email Gmail SMTP
GMAIL_USER="seu-email@gmail.com"
GMAIL_APP_PASSWORD="sua-senha-de-app-do-gmail"

# Frontend URL
FRONTEND_URL="http://localhost:5173"
```

### 3. Configurar Gmail App Password

1. Acesse [Google Account Settings](https://myaccount.google.com/)
2. Ative 2FA se não estiver ativo
3. Vá em "Security" > "App passwords"
4. Gere uma senha para "Mail"
5. Use essa senha no `GMAIL_APP_PASSWORD`

### 4. Migrar banco de dados

```bash
npm run prisma:migrate
npm run prisma:generate
```

### 5. Executar

```bash
# Desenvolvimento
npm run dev

# Produção
npm run build
npm start
```

O servidor rodará em `http://localhost:3000`

## API Endpoints

### Autenticação

- `POST /api/auth/signup` - Cadastro
- `POST /api/auth/login` - Login
- `POST /api/auth/verify` - Verificar e-mail
- `POST /api/auth/resend-code` - Reenviar código
- `GET /api/auth/me` - Obter usuário atual

### Outros endpoints

- Transações, orçamentos, metas, etc.

## Estrutura do Projeto

```
backend-ts/
├── src/
│   ├── controllers/     # Controladores da API
│   ├── middlewares/     # Middlewares (auth, etc.)
│   ├── routes/         # Definição das rotas
│   ├── services/       # Lógica de negócio
│   ├── utils/          # Utilitários
│   └── server.ts       # Ponto de entrada
├── prisma/
│   └── schema.prisma   # Schema do banco
└── package.json
```

## Desenvolvimento

### Scripts disponíveis

- `npm run dev` - Servidor de desenvolvimento com hot reload
- `npm run build` - Build para produção
- `npm run start` - Executar build de produção
- `npm run prisma:studio` - Abrir Prisma Studio
- `npm run prisma:migrate` - Executar migrações
- `npm run prisma:generate` - Gerar cliente Prisma

### Testes

```bash
npm test
```

## Deploy

Para produção, configure:

1. Banco PostgreSQL
2. Variáveis de ambiente seguras
3. HTTPS
4. Rate limiting
5. Logs adequados

## Suporte

Para dúvidas, entre em contato:
- Email: suporte@finix.com
- WhatsApp: +55 19 99473-7425