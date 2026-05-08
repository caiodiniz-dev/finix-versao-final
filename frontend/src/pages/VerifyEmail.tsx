import { FormEvent, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft, RefreshCw, CheckCircle, Loader2 } from 'lucide-react';
import { Logo } from '../components/Logo';
import toast from 'react-hot-toast';

export default function VerifyEmail() {
  const location = useLocation();
  const navigate = useNavigate();

  const [email, setEmail] = useState(location.state?.email || '');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  const handleVerify = async (e: FormEvent) => {
    e.preventDefault();
    const fullCode = code.join('');

    if (fullCode.length !== 6) {
      toast.error('Digite os 6 dígitos do código.');
      return;
    }

    if (!email) {
      toast.error('Digite seu e-mail.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: fullCode }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || 'Erro ao verificar código');

      setIsVerified(true);
      toast.success('✨ E-mail verificado com sucesso!');
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao verificar código');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/resend-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || 'Erro ao reenviar código');

      toast.success('Código reenviado!');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsResending(false);
    }
  };

  const handleCodeChange = (index: number, value: string) => {
    const newCode = [...code];
    newCode[index] = value.replace(/\D/g, '').slice(0, 1);
    setCode(newCode);
    if (newCode[index] && index < 5) {
      document.getElementById(`code-${index + 1}`)?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      document.getElementById(`code-${index - 1}`)?.focus();
    }
  };

  if (isVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-50">
        <div className="text-center z-10">
          <div className="mb-8 flex justify-center">
            <CheckCircle className="w-24 h-24 text-green-500" />
          </div>

          <h1 className="text-4xl font-display font-bold text-slate-900 mb-3">
            E-mail verificado!
          </h1>
          <p className="text-xl text-slate-600 mb-8">
            Sua conta foi ativada com sucesso
          </p>
          <div className="text-sm text-slate-500 font-medium">
            Redirecionando para login...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-slate-50">
      <div className="hidden lg:flex relative overflow-hidden items-center justify-center p-12 bg-auth-side text-white">
        <div className="absolute top-8 left-8">
          <Logo size={44} showText={false} />
        </div>
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-brand-purple/30 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-brand-blue/20 blur-3xl" />
        <div className="relative max-w-sm">
          <h2 className="text-5xl font-display font-extrabold leading-tight">Proteja sua conta</h2>
          <p className="mt-4 text-white/80 leading-8">
            A verificação de e-mail garante a segurança total dos seus dados financeiros. Você está quase lá!
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-8">
            <Logo size={48} showText={false} />
          </div>

          <div className="text-center space-y-4 mb-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-blue/20 bg-brand-blue/5 px-4 py-2 text-sm font-semibold text-brand-blue mx-auto">
              <Mail className="w-4 h-4" />
              {email || 'seu e-mail'}
            </div>
            <h1 className="text-4xl font-display font-bold text-slate-900">
              Digite seu código
            </h1>
            <p className="text-slate-600 text-base">
              Enviamos um código de 6 dígitos para o seu e-mail. Confira sua caixa de entrada.
            </p>
          </div>

          <div className="card shadow-xl p-8">
            <form onSubmit={handleVerify} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-semibold text-slate-700">
                  E-mail
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input"
                  placeholder="seu@email.com"
                />
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-semibold text-slate-700">
                  Código de verificação
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {code.map((digit, index) => (
                    <input
                      key={index}
                      id={`code-${index}`}
                      value={digit}
                      onChange={(e) => handleCodeChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      className="h-14 text-center text-2xl font-bold rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-purple/50 focus:border-brand-purple outline-none transition text-slate-900"
                      maxLength={1}
                      inputMode="numeric"
                    />
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary w-full py-3"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  <>
                    <Mail className="w-5 h-5" />
                    Verificar código
                  </>
                )}
              </button>

              <p className="text-center text-sm text-slate-500">Sua segurança é nossa prioridade</p>
            </form>
          </div>

          <div className="mt-6 space-y-3">
            <button
              onClick={handleResend}
              disabled={isResending}
              className="w-full text-sm font-semibold text-brand-purple hover:text-brand-blue transition disabled:opacity-50 flex items-center justify-center gap-2 py-3 rounded-2xl border border-brand-purple/20 bg-white"
            >
              {isResending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              {isResending ? 'Reenviando...' : 'Reenviar código'}
            </button>

            <button
              onClick={() => navigate('/register')}
              className="w-full text-sm font-semibold text-slate-500 hover:text-slate-700 transition flex items-center justify-center gap-2 py-3 rounded-2xl border border-slate-200 bg-white"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}