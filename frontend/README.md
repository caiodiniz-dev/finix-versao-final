# Finix Frontend

Aplicativo frontend do Finix - Gestão Financeira Pessoal, desenvolvido com React, TypeScript e Vite.

## Tecnologias

- **React 18** - Framework JavaScript
- **TypeScript** - Tipagem estática
- **Vite** - Build tool e dev server
- **Tailwind CSS** - Framework CSS
- **Framer Motion** - Animações
- **React Router** - Roteamento
- **Axios** - Cliente HTTP
- **React Hook Form** - Formulários
- **Recharts** - Gráficos
- **React Hot Toast** - Notificações

## Funcionalidades

- ✅ **Autenticação completa** com verificação de e-mail OTP
- ✅ **Interface moderna** estilo fintech
- ✅ **Dashboard financeiro** com gráficos
- ✅ **Gestão de transações** (receitas/despesas)
- ✅ **Orçamentos** e controle de gastos
- ✅ **Metas financeiras** com progresso visual
- ✅ **Relatórios** em PDF e Excel
- ✅ **Integração Stripe** para planos premium
- ✅ **Design responsivo** mobile-first

## Sistema de Verificação de E-mail

### Fluxo de Cadastro

1. **Signup**: Usuário preenche nome, email e senha
2. **Verificação**: Sistema envia código OTP de 6 dígitos por e-mail
3. **Confirmação**: Usuário digita código em interface moderna
4. **Ativação**: Conta é ativada após verificação

### Design do E-mail

- Template HTML profissional estilo fintech
- Gradientes modernos (roxo/azul)
- Ícone de crescimento 📈
- Código destacado e centralizado
- Aviso de expiração (5 minutos)
- Layout responsivo e acessível

### Interface de Verificação

- Inputs individuais para cada dígito
- Auto-focus automático
- Feedback visual (loading, erro, sucesso)
- Design consistente com identidade visual
- Animações suaves com Framer Motion

## Como executar

### Pré-requisitos

- Node.js 18+
- npm ou yarn

### Instalação

```bash
# Instalar dependências
npm install

# Executar em desenvolvimento
npm run dev

# Build para produção
npm run build

# Preview do build
npm run preview
```

### Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
VITE_API_URL=http://localhost:3000
```

Para produção, configure a URL do backend no painel da Vercel.

## Deploy na Vercel

### Configuração Automática

O projeto já está configurado para deploy na Vercel com:

- `vercel.json` - Configuração de build e roteamento
- Build command: `npm run build`
- Output directory: `dist`

### Passos para Deploy

1. Conecte seu repositório GitHub na Vercel
2. Configure as variáveis de ambiente:
   - `REACT_APP_BACKEND_URL` - URL do seu backend em produção
3. Faça deploy automático

### Configuração Manual

Se precisar configurar manualmente:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm install",
  "framework": "vite"
}
```

## Estrutura do Projeto

```
src/
├── components/     # Componentes reutilizáveis
├── contexts/       # Contextos React (Auth, etc.)
├── layouts/        # Layouts da aplicação
├── pages/          # Páginas/rotas
├── services/       # Serviços (API, etc.)
├── types/          # Tipos TypeScript
└── utils/          # Utilitários
```

## Scripts Disponíveis

- `npm run dev` - Servidor de desenvolvimento
- `npm run build` - Build para produção
- `npm run preview` - Preview do build
- `npm run lint` - Executar ESLint