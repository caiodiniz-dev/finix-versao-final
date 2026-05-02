# Finix - Gestão Financeira Pessoal

## Descrição
Aplicativo completo de gestão financeira pessoal com frontend em React/TypeScript e backend em Node.js/TypeScript. O sistema inclui autenticação por JWT, verificação de e-mail por OTP, integração com Stripe e geração de relatórios em PDF/Excel.

## O que tem no repositório
- `backend-ts/` — backend Node.js + TypeScript com Express, Prisma, JWT, Stripe e envio de e-mail
- `frontend/` — frontend React + TypeScript com Vite, Tailwind CSS e Axios

## Tecnologias principais
- Backend: Node.js, TypeScript, Express, Prisma, JWT, Nodemailer, Stripe
- Frontend: React, TypeScript, Vite, Tailwind CSS, Axios, Framer Motion
- Banco de dados: SQLite local ou PostgreSQL em produção

## Como rodar localmente

### 1. Backend
```bash
cd backend-ts
npm install
cp .env.example .env
# Edite o .env com seus valores
npm run prisma:migrate
npm run prisma:generate
npm run dev
```

O backend fica em `http://localhost:8000`.

### 2. Frontend
```bash
cd frontend
npm install
npm run dev
```

O frontend fica em `http://localhost:5173`.

## Variáveis de ambiente importantes

### Backend (`backend-ts/.env`)
```env
<<<<<<< HEAD
JWT_SECRET="your_jwt_secret_here"
CORS_ORIGINS="https://finixxapp.vercel.app"
DATABASE_URL="postgresql://username:password@host:port/database?sslmode=require&channel_binding=require"
FRONTEND_URL=https://finixxapp.vercel.app
PORT=8000
STRIPE_PUBLISHABLE_KEY=pk_live_your_publishable_key_here
STRIPE_SECRET_KEY=sk_live_your_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
GMAIL_USER=finixappp@gmail.com
GMAIL_APP_PASSWORD="your_gmail_app_password_here"  # sem espaços, tem que ser a senha de app do Gmail
=======
>>>>>>> 6fc7c7c (fix: remove exposed stripe key from readme)
```

### Frontend (`frontend/.env`)
```env
VITE_API_URL=https://finix-versao-final-5.onrender.com
```

> Importante: o backend usa `FRONTEND_URL` para liberar CORS, e o frontend usa `VITE_API_URL` para apontar ao backend.

## Deploy

### Backend no Render

Configure o serviço:
- `Root Directory`: `backend-ts`
- `Build Command`: `npm install && npm run build`
- `Start Command`: `npm start`

Defina estas variáveis no painel do Render:
- `DATABASE_URL`
- `JWT_SECRET`
- `FRONTEND_URL`
- `GMAIL_USER`
- `GMAIL_APP_PASSWORD`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

### Frontend na Vercel ou Netlify

- `Build Command`: `npm run build`
- `Output Directory`: `dist`
- Variável de ambiente: `VITE_API_URL=https://seu-backend.onrender.com`

## Problemas comuns de autenticação
Se o login funciona mas a autenticação falha depois do deploy:
- Verifique se `VITE_API_URL` está apontando para o backend correto
- Verifique se `FRONTEND_URL` está configurado com o domínio correto do frontend
- Verifique se o token JWT está sendo enviado no cabeçalho `Authorization: Bearer <token>`

## Comandos úteis

### Backend
```bash
cd backend-ts
npm install
npm run dev
npm run build
npm start
npm run prisma:migrate
npm run prisma:generate
npm run prisma:studio
```

### Frontend
```bash
cd frontend
npm install
npm run dev
npm run build
npm run preview
```

## Estrutura do projeto

```
finixv1/
├── backend-ts/
│   ├── src/
│   │   ├── controllers/
│   │   ├── middlewares/
│   │   ├── routes/
│   │   ├── services/
│   │   └── server.ts
│   ├── prisma/
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── tsconfig.json
└── README.md
```

## O que o backend oferece
- Cadastro de usuário
- Login com JWT
- Verificação de e-mail por OTP
- Proteção de rotas com middleware
- Integração com Stripe
- Geração de PDF e Excel

## Dicas finais
- Use senha de app do Gmail para `GMAIL_APP_PASSWORD`
- Nunca deixe `JWT_SECRET` com o valor padrão em produção
- Atualize `VITE_API_URL` sempre que mudar o backend de domínio
- O Render fornece a porta automaticamente via `process.env.PORT`

---

## Contato
Se quiser, me manda o URL do backend no Render e eu te ajudo a ajustar `VITE_API_URL` e `FRONTEND_URL` direitinho.
