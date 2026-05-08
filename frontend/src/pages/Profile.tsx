import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, Download, Upload, ShieldCheck, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, apiErrorMessage } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const nameSchema = yup.object({ name: yup.string().min(2).required('Informe seu nome') });
const pwSchema = yup.object({
  currentPassword: yup.string().required('Informe a senha atual'),
  newPassword: yup.string().min(6, 'Mínimo 6 caracteres').required('Informe a nova senha'),
});

type Tab = 'Perfil' | 'Segurança' | 'Assinatura' | 'Notificações' | 'Empresa' | 'Exportação';

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const [tab, setTab] = useState<Tab>('Perfil');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [planInfo, setPlanInfo] = useState<any>(null);
  const [notifSettings, setNotifSettings] = useState({ email: true, push: true, whatsapp: true });

  const nameForm = useForm<{ name: string }>({
    resolver: yupResolver(nameSchema) as any,
    defaultValues: { name: user?.name || '' },
  });

  const pwForm = useForm<{ currentPassword: string; newPassword: string }>({
    resolver: yupResolver(pwSchema) as any,
  });

  useEffect(() => {
    fetchPlanInfo();
  }, [user?.id]);

  const fetchPlanInfo = async () => {
    if (!user) return;
    try {
      const response = await api.get('/api/plans/me');
      setPlanInfo(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Arquivo muito grande (máx 5MB)');
      return;
    }
    if (!file.type.startsWith('image/')) {
      toast.error('Selecione uma imagem válida');
      return;
    }
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleUploadPhoto = async () => {
    if (!selectedFile) return;
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        await api.put('/api/profile', { photo: e.target?.result });
        toast.success('Foto atualizada!');
        await refreshUser();
      };
      reader.readAsDataURL(selectedFile);
    } catch (err: any) {
      toast.error(apiErrorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  const onSaveName = async (data: { name: string }) => {
    try {
      await api.put('/api/profile', { name: data.name });
      toast.success('Nome atualizado!');
      await refreshUser();
    } catch (err: any) {
      toast.error(apiErrorMessage(err));
    }
  };

  const onChangePw = async (data: { currentPassword: string; newPassword: string }) => {
    try {
      await api.put('/api/profile', data);
      toast.success('Senha alterada!');
      pwForm.reset();
    } catch (err: any) {
      toast.error(apiErrorMessage(err));
    }
  };

  const exportData = async (kind: 'pdf' | 'excel') => {
    try {
      const response = await api.get(`/api/export/${kind}`, { responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = kind === 'pdf' ? 'finix-relatorio.pdf' : 'finix-transacoes.xlsx';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Exportação iniciada!');
    } catch (err: any) {
      toast.error(apiErrorMessage(err));
    }
  };

  if (!user) return null;

  const planName = planInfo?.planDetails?.name || (user.plan === 'PRO' ? 'Finix Pro' : user.plan === 'BASIC' ? 'Finix Básico' : 'Grátis');
  const transactionLimit = planInfo?.planDetails?.transactionsLimit ?? (user.plan === 'BASIC' ? 500 : user.plan === 'PRO' ? -1 : 0);
  const usedTransactions = planInfo?.transactionsUsed ?? user.transactionsUsed ?? 0;
  const planUsedPercent = transactionLimit === -1 ? 100 : transactionLimit === 0 ? 0 : Math.min(100, Math.round((usedTransactions / transactionLimit) * 100));

  return (
    <div className="space-y-6" data-testid="profile-page">
      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        {/* Sidebar */}
        <aside className="rounded-3xl border border-slate-700 bg-[#0F172A] p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-3xl bg-gradient-to-br from-brand-blue to-brand-purple flex items-center justify-center text-white text-xl font-semibold">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm text-slate-400">Bom te ver de novo,</p>
              <h2 className="text-xl font-bold text-slate-100">{user.name}</h2>
              <p className="text-sm text-slate-400">Plano {planName}</p>
            </div>
          </div>

          <div className="mt-8 space-y-3">
            {(['Perfil', 'Segurança', 'Assinatura', 'Notificações', 'Empresa', 'Exportação'] as Tab[]).map((item) => (
              <button
                key={item}
                onClick={() => setTab(item)}
                className={`w-full rounded-3xl px-4 py-3 text-left text-sm font-medium transition ${tab === item
                    ? 'bg-brand-blue/10 text-brand-blue'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
              >
                {item}
              </button>
            ))}
          </div>
        </aside>

        <main className="space-y-6">
          {/* Header card */}
          <div className="rounded-3xl border border-slate-700 bg-[#0F172A] p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Perfil</p>
                <h1 className="text-3xl font-display font-extrabold text-slate-100">Configurações pessoais</h1>
              </div>
              <div className="rounded-full bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-300">
                {planName}
              </div>
            </div>
            <p className="mt-3 text-sm text-slate-400">Ajuste sua conta, veja o uso do plano e acesse exportações.</p>
          </div>

          {/* Perfil tab */}
          {tab === 'Perfil' && (
            <section className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-2">
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border border-slate-700 bg-[#0F172A] p-6 shadow-sm">
                  <h2 className="font-display font-bold text-lg text-slate-100">Dados de usuário</h2>
                  <form onSubmit={nameForm.handleSubmit(onSaveName)} className="mt-6 space-y-4" data-testid="name-form">
                    <div>
                      <label className="text-sm font-medium text-slate-300">Nome</label>
                      <input {...nameForm.register('name')} className="input mt-1 bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500" />
                      {nameForm.formState.errors.name && <p className="text-xs text-rose-400 mt-1">{nameForm.formState.errors.name.message}</p>}
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-300">E-mail</label>
                      <input value={user.email} disabled className="input mt-1 bg-slate-800/50 border-slate-700 text-slate-400 cursor-not-allowed" />
                    </div>
                    <button type="submit" className="btn-primary w-full" disabled={nameForm.formState.isSubmitting}>
                      {nameForm.formState.isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar alterações'}
                    </button>
                  </form>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border border-slate-700 bg-[#0F172A] p-6 shadow-sm">
                  <h2 className="font-display font-bold text-lg text-slate-100">Foto de perfil</h2>
                  <div className="mt-6 space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="h-20 w-20 rounded-3xl overflow-hidden bg-slate-800">
                        <img src={preview || user.photo || ''} alt="Profile" className="h-full w-full object-cover" />
                      </div>
                      <div>
                        <p className="text-sm text-slate-400">Use uma imagem clara e profissional.</p>
                        <input type="file" accept="image/*" onChange={handleFileSelect} className="mt-3" />
                      </div>
                    </div>
                    <button onClick={handleUploadPhoto} className="btn-primary w-full" disabled={!selectedFile || uploading}>
                      {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enviar foto'}
                    </button>
                  </div>
                </motion.div>
              </div>
            </section>
          )}

          {/* Segurança tab */}
          {tab === 'Segurança' && (
            <section className="rounded-3xl border border-slate-700 bg-[#0F172A] p-6 shadow-sm">
              <h2 className="font-display font-bold text-lg text-slate-100">Segurança</h2>
              <p className="mt-2 text-sm text-slate-400">Mantenha sua conta protegida.</p>
              <form onSubmit={pwForm.handleSubmit(onChangePw)} className="mt-6 space-y-4" data-testid="password-form">
                <div>
                  <label className="text-sm font-medium text-slate-300">Senha atual</label>
                  <input type="password" {...pwForm.register('currentPassword')} className="input mt-1 bg-slate-800 border-slate-700 text-slate-100" />
                  {pwForm.formState.errors.currentPassword && <p className="text-xs text-rose-400 mt-1">{pwForm.formState.errors.currentPassword.message}</p>}
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-300">Nova senha</label>
                  <input type="password" {...pwForm.register('newPassword')} className="input mt-1 bg-slate-800 border-slate-700 text-slate-100" />
                  {pwForm.formState.errors.newPassword && <p className="text-xs text-rose-400 mt-1">{pwForm.formState.errors.newPassword.message}</p>}
                </div>
                <button type="submit" className="btn-primary w-full" disabled={pwForm.formState.isSubmitting}>
                  {pwForm.formState.isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Atualizar senha'}
                </button>
              </form>
            </section>
          )}

          {/* Assinatura tab */}
          {tab === 'Assinatura' && (
            <section className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-3xl border border-slate-700 bg-[#0F172A] p-6 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Plano atual</p>
                    <h2 className="mt-2 text-2xl font-semibold text-slate-100">{planName}</h2>
                  </div>
                  <div className="rounded-full bg-brand-blue/10 px-3 py-1 text-sm font-semibold text-brand-blue">{user.plan}</div>
                </div>
                <div className="mt-6">
                  <div className="flex items-center justify-between text-sm text-slate-400">
                    <span>Transações usadas</span>
                    <span>{usedTransactions}{transactionLimit === -1 ? '' : ` / ${transactionLimit}`}</span>
                  </div>
                  <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-700">
                    <div className="h-full rounded-full bg-brand-blue" style={{ width: `${planUsedPercent}%` }} />
                  </div>
                  <p className="mt-3 text-xs text-slate-400">{transactionLimit === -1 ? 'Movimentações ilimitadas' : `${planUsedPercent}% do limite usado`}</p>
                </div>
                <div className="mt-6 space-y-3">
                  <div className="rounded-3xl bg-slate-800 p-4 text-sm text-slate-300">Transações: {transactionLimit === -1 ? 'Ilimitadas' : transactionLimit === 0 ? 'Não disponível no plano Free' : `${transactionLimit} por mês`}</div>
                  <div className="rounded-3xl bg-slate-800 p-4 text-sm text-slate-300">Categoria personalizada: {user.plan === 'PRO' ? 'Ativado' : 'Bloqueado'}</div>
                  <div className="rounded-3xl bg-slate-800 p-4 text-sm text-slate-300">Exportação: {user.plan === 'PRO' ? 'PDF e Excel' : user.plan === 'BASIC' ? 'PDF apenas' : 'Não disponível'}</div>
                </div>
              </div>
              <div className="rounded-3xl border border-slate-700 bg-[#0F172A] p-6 shadow-sm">
                <h3 className="font-semibold text-slate-100">Atualize seu plano</h3>
                <p className="mt-2 text-sm text-slate-400">Acesse recursos premium como gestão de categorias, IA e suporte prioritário.</p>
                <Link to="/app/plans" className="btn-primary mt-6 inline-flex items-center gap-2">
                  <ArrowRight className="w-4 h-4" /> Ver planos
                </Link>
              </div>
            </section>
          )}

          {/* Notificações tab */}
          {tab === 'Notificações' && (
            <section className="rounded-3xl border border-slate-700 bg-[#0F172A] p-6 shadow-sm">
              <h2 className="font-display font-bold text-lg text-slate-100">Notificações</h2>
              <p className="mt-2 text-sm text-slate-400">Configure os canais de alerta que deseja receber.</p>
              <div className="mt-6 space-y-4">
                {(['email', 'push', 'whatsapp'] as const).map((channel) => (
                  <label key={channel} className="flex items-center justify-between rounded-3xl border border-slate-700 bg-slate-800 p-4">
                    <div>
                      <p className="font-semibold text-slate-100">{channel === 'email' ? 'E-mail' : channel === 'push' ? 'Push' : 'WhatsApp'}</p>
                      <p className="text-sm text-slate-400">Receba alertas sobre parcelas e pendências por {channel === 'email' ? 'e-mail' : channel === 'push' ? 'notificações no navegador' : 'WhatsApp'}.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifSettings[channel]}
                      onChange={(e) => setNotifSettings((prev) => ({ ...prev, [channel]: e.target.checked }))}
                      className="h-5 w-5 rounded border-slate-600 text-brand-blue focus:ring-brand-blue"
                    />
                  </label>
                ))}
              </div>
            </section>
          )}

          {/* Empresa tab */}
          {tab === 'Empresa' && (
            <section className="rounded-3xl border border-slate-700 bg-[#0F172A] p-6 shadow-sm">
              <h2 className="font-display font-bold text-lg text-slate-100">Empresa</h2>
              <p className="mt-2 text-sm text-slate-400">Gerencie informações da sua empresa.</p>
              {user.plan === 'PRO' ? (
                <div className="mt-6 grid gap-4">
                  <div className="rounded-3xl border border-slate-700 bg-slate-800 p-4">
                    <p className="text-sm text-slate-400">Razão social</p>
                    <p className="mt-2 text-slate-100">{user.companyName || 'Não informada'}</p>
                  </div>
                  <div className="rounded-3xl border border-slate-700 bg-slate-800 p-4">
                    <p className="text-sm text-slate-400">Logo</p>
                    {user.companyLogo ? (
                      <img src={user.companyLogo} alt="Logo da empresa" className="mt-3 h-20 w-20 rounded-3xl object-cover" />
                    ) : (
                      <p className="mt-2 text-slate-400">Nenhuma logo carregada.</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="mt-6 rounded-3xl border border-slate-700 bg-slate-800 p-6 text-slate-300">
                  <p className="font-semibold text-slate-100">Recurso disponível apenas no plano Pro</p>
                  <p className="mt-2 text-sm text-slate-400">Para adicionar empresa, CNPJ e personalização, atualize seu plano.</p>
                  <Link to="/app/plans" className="btn-outline mt-4 inline-flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4" /> Ver planos Pro
                  </Link>
                </div>
              )}
            </section>
          )}

          {/* Exportação tab */}
          {tab === 'Exportação' && (
            <section className="rounded-3xl border border-slate-700 bg-[#0F172A] p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="font-display font-bold text-lg text-slate-100">Exportação de dados</h2>
                  <p className="mt-2 text-sm text-slate-400">Baixe seu histórico em PDF ou Excel.</p>
                </div>
                <div className="rounded-full bg-slate-800 px-3 py-1 text-sm text-slate-300">{user.plan === 'PRO' ? 'Completo' : user.plan === 'BASIC' ? 'Parcial' : 'Limitado'}</div>
              </div>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <button onClick={() => exportData('pdf')} className="btn-primary w-full inline-flex items-center justify-center gap-2">
                  <Download className="w-4 h-4" /> Exportar PDF
                </button>
                <button onClick={() => exportData('excel')} className="btn-outline w-full inline-flex items-center justify-center gap-2">
                  <Upload className="w-4 h-4" /> Exportar Excel
                </button>
              </div>
              <p className="mt-4 text-sm text-slate-400">Exportação Excel disponível apenas no plano Pro.</p>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}