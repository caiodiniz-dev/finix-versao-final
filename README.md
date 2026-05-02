# Finix - Gestão Financeira Pessoal

## Descrição
Aplicativo completo de gestão financeira pessoal com sistema de autenticação OTP por e-mail. Frontend moderno em React/TypeScript com Tailwind CSS e backend robusto em Node.js/TypeScript com Prisma (SQLite/PostgreSQL).

## ✨ Funcionalidades Principais

### 🔐 Sistema de Autenticação Completo
- **Cadastro seguro** com validação de e-mail
- **Verificação OTP** de 6 dígitos por e-mail
- **Template de e-mail profissional** estilo fintech
- **Login com JWT** e proteção de rotas
- **Reenvio de código** com expiração controlada

### 💰 Gestão Financeira
- Dashboard com visão geral
- Controle de transações (receitas/despesas)
- Orçamentos por categoria
- Metas financeiras com progresso
- Relatórios em PDF e Excel
- Integração com Stripe para planos premium

### 🎨 Design Moderno
- Interface inspirada em bancos digitais
- Gradientes e cores modernas
- Animações suaves com Framer Motion
- Design responsivo mobile-first
- UX intuitiva e acessível

## 🛠️ Tecnologias

### Backend
- **Node.js** + **TypeScript**
- **Express.js** para API REST
- **Prisma ORM** (SQLite/PostgreSQL)
- **Nodemailer** com Gmail SMTP
- **bcrypt** + **JWT** para segurança
- **Zod** para validação

### Frontend
- **React 18** + **TypeScript**
- **Vite** para build e dev server
- **Tailwind CSS** para estilização
- **Framer Motion** para animações
- **React Hook Form** + **Yup** para formulários
- **Axios** para requisições HTTP
- **Recharts** para gráficos

## 🚀 Como Executar

### Pré-requisitos
- Node.js (versão 18 ou superior)
- npm ou yarn

### 1. Configuração do Backend

```bash
cd backend-ts

# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env
# Edite o .env com suas configurações (Gmail, JWT secret, etc.)

# Migrar banco de dados
npm run prisma:migrate
npm run prisma:generate

# Iniciar servidor
npm run dev
```

### 2. Configuração do Frontend

```bash
cd ../frontend

# Instalar dependências
npm install

# Iniciar aplicação
npm run dev
```

### 3. Acesse o Aplicativo
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:8000`

## 📧 Configuração do E-mail (Gmail SMTP)

1. Ative a verificação em 2 etapas na sua conta Google
2. Gere uma "App Password" em [Google Account Settings](https://myaccount.google.com/apppasswords)
3. Configure no `.env` do backend:
   ```
   GMAIL_USER=seu-email@gmail.com
   GMAIL_APP_PASSWORD=sua-app-password
   ```

## 📱 Fluxo de Verificação de E-mail

1. **Cadastro**: Usuário preenche formulário
2. **OTP**: Sistema gera código de 6 dígitos
3. **E-mail**: Template profissional enviado automaticamente
4. **Verificação**: Interface moderna para digitar código
5. **Ativação**: Conta liberada após confirmação

## 🗂️ Estrutura do Projeto

```
finixv1/
├── backend-ts/          # Backend Node.js/TypeScript
│   ├── src/
│   │   ├── controllers/ # API controllers
│   │   ├── middlewares/ # Auth, validation
│   │   ├── routes/      # API routes
│   │   ├── services/    # Business logic
│   │   └── server.ts    # Main server file
│   └── prisma/          # Database schema
├── frontend/            # Frontend React/TypeScript
│   ├── src/
│   │   ├── components/  # Reusable components
│   │   ├── pages/       # Page components
│   │   ├── contexts/    # React contexts
│   │   ├── services/    # API services
│   │   └── utils/       # Utilities
│   └── public/          # Static assets
└── README.md
```

## 🔒 Segurança

- Hash de senhas com bcrypt
- JWT para autenticação stateless
- Verificação de e-mail obrigatória
- Middleware de proteção de rotas
- Validação de entrada com Zod
- Rate limiting preparado

## 📈 Deploy

### Backend (Render, Railway, etc.)
```bash
npm run build
npm start
```

### Frontend (Vercel, Netlify)
```bash
npm run build
# Deploy do dist/
```

## 🤝 Suporte

- **Email**: suporte@finix.com
- **WhatsApp**: +55 19 99473-7425
- **GitHub Issues**: Para bugs e sugestões

---

**Finix** - Transformando finanças pessoais com tecnologia. 🚀
- Faça login com uma das contas abaixo.

## Contas de Teste

### Administrador
- **Email:** cvdinizramos@gmail.com
- **Senha:** Admin@123
- **Permissões:** Acesso total, gerenciamento de usuários.

### Usuário Demo
- **Email:** demo@finix.com
- **Senha:** Demo@123
- **Permissões:** Usuário comum, com dados de exemplo pré-carregados.

## Funcionalidades
- Autenticação JWT
- Dashboard com gráficos e insights
- CRUD de transações, metas e orçamentos
- Exportação de relatórios (Excel/PDF)
- Perfil com upload de foto
- Painel admin para gerenciar usuários

## Notas
- O banco de dados é SQLite (arquivo local), não requer servidor separado.
- Se houver problemas com `npm install` no frontend, tente limpar o cache: `npm cache clean --force` e reinstalar.