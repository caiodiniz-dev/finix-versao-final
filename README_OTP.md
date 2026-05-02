# Sistema de Verificação de E-mail com OTP - Finix

Este é um sistema completo de verificação de e-mail com código OTP (One-Time Password) para autenticação de usuários.

## 🚀 Funcionalidades

- ✅ Cadastro de usuário com verificação de e-mail
- ✅ Geração automática de códigos de 6 dígitos
- ✅ Template de e-mail profissional e responsivo
- ✅ Expiração de códigos (5 minutos)
- ✅ Reenvio de códigos
- ✅ Login apenas para usuários verificados
- ✅ Frontend responsivo com TailwindCSS
- ✅ Backend seguro com bcrypt e validações

## 🛠️ Tecnologias

### Backend
- **Node.js** com **TypeScript**
- **Express.js** - Framework web
- **Prisma** - ORM para banco de dados
- **PostgreSQL** ou **SQLite** - Banco de dados
- **Nodemailer** - Envio de e-mails via Gmail SMTP
- **bcrypt** - Hash de senhas
- **JWT** - Autenticação (opcional)

### Frontend
- **React** com **TypeScript**
- **TailwindCSS** - Estilização
- **Framer Motion** - Animações
- **React Router** - Roteamento
- **React Hot Toast** - Notificações

## 📋 Pré-requisitos

- Node.js 18+
- npm ou yarn
- PostgreSQL (recomendado) ou SQLite
- Conta Gmail para envio de e-mails

## 🔧 Instalação e Configuração

### 1. Clone o repositório

```bash
git clone <repository-url>
cd finix-otp-system
```

### 2. Backend Setup

```bash
cd backend-ts

# Instale as dependências
npm install

# Configure as variáveis de ambiente
cp .env.example .env
```

Edite o arquivo `.env` com suas configurações:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/finix_db"

# JWT
JWT_SECRET="your-super-secret-jwt-key-here"

# Email (Gmail SMTP)
GMAIL_USER="your-email@gmail.com"
GMAIL_APP_PASSWORD="your-app-password"

# Frontend
FRONTEND_URL="http://localhost:3001"
```

**Configuração do Gmail:**
1. Ative a verificação em duas etapas na sua conta Gmail
2. Gere uma senha de aplicativo: https://myaccount.google.com/apppasswords
3. Use a senha de aplicativo no campo `GMAIL_APP_PASSWORD`

### 3. Configure o Banco de Dados

```bash
# Gere o cliente Prisma
npm run prisma:generate

# Execute as migrações
npm run prisma:migrate

# (Opcional) Abra o Prisma Studio para visualizar o banco
npm run prisma:studio
```

### 4. Frontend Setup

```bash
cd ../frontend

# Instale as dependências
npm install

# Configure as variáveis de ambiente
cp .env.example .env
```

Edite o arquivo `.env` no frontend:

```env
VITE_API_URL="http://localhost:8000"
```

## 🚀 Executando o Projeto

### Backend

```bash
cd backend-ts
npm run dev
```

O backend estará rodando em `http://localhost:8000`

### Frontend

```bash
cd frontend
npm run dev
```

O frontend estará rodando em `http://localhost:3001`

## 📧 Como Funciona

### 1. Cadastro (Signup)
- Usuário preenche nome, e-mail e senha
- Sistema gera código de 6 dígitos
- Código é salvo no banco com expiração de 5 minutos
- E-mail é enviado com template profissional

### 2. Verificação de E-mail
- Usuário recebe e-mail com código destacado
- Digita o código na tela de verificação
- Sistema valida código e expiração
- Conta é marcada como verificada

### 3. Login
- Apenas usuários verificados podem fazer login
- Senha é validada com bcrypt
- JWT é gerado para autenticação

### 4. Reenvio de Código
- Usuário pode solicitar novo código
- Código anterior é invalidado
- Novo código é gerado e enviado

## 🗂️ Estrutura do Projeto

```
finix-otp-system/
├── backend-ts/
│   ├── src/
│   │   ├── controllers/
│   │   │   └── authController.ts
│   │   ├── services/
│   │   │   ├── authService.ts
│   │   │   └── emailService.ts
│   │   ├── routes/
│   │   │   └── authRoutes.ts
│   │   ├── middlewares/
│   │   ├── utils/
│   │   └── server.ts
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   └── package.json
└── frontend/
    ├── src/
    │   ├── pages/
    │   │   ├── Signup.tsx
    │   │   ├── VerifyEmail.tsx
    │   │   └── Login.tsx
    │   ├── components/
    │   ├── contexts/
    │   └── App.tsx
    └── package.json
```

## 🔒 Segurança

- **Hash de senhas**: bcrypt com salt rounds
- **Validação de códigos**: códigos únicos com expiração
- **Rate limiting**: recomendado implementar no futuro
- **HTTPS**: use em produção
- **Validação de entrada**: Zod para validações robustas

## 📧 Template de E-mail

O sistema inclui um template de e-mail profissional com:
- Design responsivo
- Código destacado e grande
- Aviso de expiração
- Links para suporte

## 🧪 Testando

### Cadastro
1. Acesse `http://localhost:3001/signup`
2. Preencha nome, e-mail e senha
3. Verifique seu e-mail para o código

### Verificação
1. Digite o código de 6 dígitos
2. Clique em "Verificar código"
3. Conta será ativada

### Login
1. Vá para `http://localhost:3001/login`
2. Use as credenciais verificadas

## 🚀 Produção

Para deploy em produção:

1. **Banco de dados**: Use PostgreSQL em produção
2. **Variáveis de ambiente**: Configure corretamente
3. **HTTPS**: Certificado SSL obrigatório
4. **Rate limiting**: Implemente proteção contra abuso
5. **Logs**: Configure logging adequado
6. **Backup**: Configure backup do banco

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT.

## 📞 Suporte

Para dúvidas ou problemas:
- Abra uma issue no GitHub
- Entre em contato: suporte@finix.com