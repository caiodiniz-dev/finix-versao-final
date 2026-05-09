import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Zap, Crown, Sparkles, AlertTriangle, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import toast from 'react-hot-toast';

const PLANS = [
  {
    id: 'FREE',
    name: 'Grátis',
    emoji: '🆓',
    price: 0,
    description: 'Trial de 7 dias',
    features: [
      'Acesso à Dashboard básica',
      'Sem transações, cartões ou relatórios',
      'Banner de upgrade visível',
    ],
    icon: Zap,
    color: 'from-slate-500 to-slate-600',
    accent: 'rgba(100,116,139,.15)',
    border: 'rgba(100,116,139,.25)',
  },
  {
    id: 'BASIC',
    name: 'Finix Básico',
    emoji: '📦',
    price: 10,
    description: 'Para profissionais autônomos',
    features: [
      '1 usuário · 50 contatos · 2 contas',
      '500 movimentações bancárias/mês',
      '2 cartões · 50 movimentos de cartão/mês',
      'Receitas, despesas e transferências',
      'Contas a pagar e receber',
      'Gestão de faturas de cartão',
      'DRE Gerencial automático',
      'Dashboard de KPIs',
      'Calendário financeiro',
      'Importação OFX / XLS / CSV / PDF',
      'Conciliação bancária',
      'Logs de atividades básico',
      'Suporte via e-mail',
    ],
    icon: Crown,
    color: 'from-blue-500 to-indigo-600',
    accent: 'rgba(99,102,241,.12)',
    border: 'rgba(99,102,241,.25)',
    highlighted: false,
  },
  {
    id: 'PRO',
    name: 'Finix Pro',
    emoji: '🚀',
    price: 35,
    description: 'Para pequenas empresas',
    features: [
      '5 usuários · Contatos ilimitados',
      'Contas e cartões ilimitados',
      'Movimentações ilimitadas',
      'Fingu IA – análise e projeções',
      'Chat inteligente financeiro',
      'Categorização automática com IA',
      'Análise comparativa de períodos',
      'Centros de custo / projetos',
      'DRE por centro de custo',
      'Fluxo de caixa projetado',
      'Alertas inteligentes por e-mail',
      'Relatórios avançados em PDF',
      'Logs de atividades avançado',
      'Suporte prioritário (e-mail + WhatsApp)',
    ],
    icon: Sparkles,
    color: 'from-violet-500 to-purple-600',
    accent: 'rgba(139,92,246,.15)',
    border: 'rgba(139,92,246,.4)',
    highlighted: true,
  },
];

// ─── Downgrade confirmation modal ──────────────────────────────────────────
function DowngradeModal({
  targetPlan,
  onConfirm,
  onClose,
  loading,
}: {
  targetPlan: (typeof PLANS)[0];
  onConfirm: () => void;
  onClose: () => void;
  loading: boolean;
}) {
  const lostFeatures =
    targetPlan.id === 'BASIC'
      ? [
        'Fingu IA (análise e projeções)',
        'Chat inteligente',
        'Categorização automática com IA',
        'Centros de custo / projetos',
        'Relatórios avançados em PDF',
        'Suporte prioritário via WhatsApp',
      ]
      : [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,.7)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.93 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.93 }}
        transition={{ duration: 0.18 }}
        className="relative w-full max-w-md rounded-[28px] border border-white/10 bg-slate-900 p-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-5 top-5 rounded-full p-1 text-slate-400 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-400">
          <AlertTriangle className="w-7 h-7" />
        </div>

        <h2 className="mb-2 text-2xl font-extrabold text-white">
          Fazer downgrade para {targetPlan.emoji} {targetPlan.name}?
        </h2>
        <p className="mb-6 text-sm text-slate-400 leading-relaxed">
          Ao confirmar, sua assinatura será ajustada imediatamente e você
          perderá acesso aos seguintes recursos do plano Pro:
        </p>

        {lostFeatures.length > 0 && (
          <ul className="mb-8 space-y-2">
            {lostFeatures.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-slate-300">
                <span className="mt-0.5 text-red-400">✕</span>
                {f}
              </li>
            ))}
          </ul>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10 transition"
          >
            Manter Pro
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 rounded-2xl bg-amber-500 px-4 py-3 text-sm font-semibold text-white hover:bg-amber-600 transition disabled:opacity-50"
          >
            {loading ? 'Processando...' : 'Confirmar downgrade'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Plans page ─────────────────────────────────────────────────────────────
export default function Plans() {
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);
  const [plans, setPlans] = useState(PLANS);
  const [downgradeTarget, setDowngradeTarget] = useState<(typeof PLANS)[0] | null>(null);

  useEffect(() => {
    const loadPlans = async () => {
      try {
        const response = await api.get('/api/plans');
        const remotePlans = response.data;
        setPlans((current) =>
          current.map((plan) => {
            const remote = remotePlans.find((p: any) => p.id === plan.id);
            return remote ? { ...plan, price: remote.monthlyPrice ?? plan.price } : plan;
          })
        );
      } catch {
        // fallback to local plan definitions
      }
    };
    loadPlans();
  }, []);

  // Upgrade via Stripe checkout
  const handleUpgrade = async (planId: string) => {
    if (planId === 'FREE' || planId === user?.plan) return;

    // If user is on Pro and wants Basic → show downgrade modal
    if (user?.plan === 'PRO' && planId === 'BASIC') {
      const target = plans.find((p) => p.id === 'BASIC')!;
      setDowngradeTarget(target);
      return;
    }

    setLoading(planId);
    try {
      const response = await api.post('/api/stripe/checkout', { plan_id: planId });
      if (response.data?.url) {
        window.location.href = response.data.url;
      } else {
        toast.error('Nenhuma URL de pagamento retornada.');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || 'Erro ao iniciar checkout.');
    } finally {
      setLoading(null);
    }
  };

  // Downgrade Pro → Basic (confirmed via modal)
  const handleDowngrade = async () => {
    if (!downgradeTarget) return;
    setLoading('downgrade');
    try {
      const response = await api.post('/api/stripe/change-plan', { plan_id: downgradeTarget.id });
      toast.success(response.data?.message || 'Plano alterado com sucesso.');
      await refreshUser();
      setDowngradeTarget(null);
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || 'Erro ao alterar plano.');
    } finally {
      setLoading(null);
    }
  };

  // Cancel subscription entirely → back to FREE
  const handleCancel = async () => {
    if (!user || user.plan === 'FREE') return;
    const confirmed = window.confirm(
      'Cancelar assinatura? Você voltará para o plano Grátis e perderá todos os recursos pagos.'
    );
    if (!confirmed) return;

    setLoading('cancel');
    try {
      const response = await api.post('/api/stripe/cancel-subscription', {});
      toast.success(response.data?.message || 'Assinatura cancelada com sucesso.');
      await refreshUser();
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || 'Erro ao cancelar plano.');
    } finally {
      setLoading(null);
    }
  };

  const currentPlan = plans.find((p) => p.id === user?.plan);

  return (
    <>
      {/* Downgrade modal */}
      <AnimatePresence>
        {downgradeTarget && (
          <DowngradeModal
            targetPlan={downgradeTarget}
            onConfirm={handleDowngrade}
            onClose={() => setDowngradeTarget(null)}
            loading={loading === 'downgrade'}
          />
        )}
      </AnimatePresence>

      <div className="space-y-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl"
        >
          <h1 className="text-4xl font-display font-extrabold">Planos e Preços</h1>
          <p className="mt-4 text-lg text-slate-400 max-w-2xl">
            Escolha o plano ideal para sua realidade. Faça upgrade ou downgrade a qualquer momento.
          </p>

          {/* Current plan badge */}
          {user && currentPlan && (
            <div className="mt-6 inline-flex items-center gap-4 rounded-3xl border border-slate-700/60 bg-slate-950/70 px-5 py-4 shadow-soft">
              <div>
                <p className="text-xs uppercase tracking-[.28em] text-slate-500">Plano atual</p>
                <p className="mt-1 text-xl font-bold text-white">
                  {currentPlan.emoji} {currentPlan.name}
                </p>
              </div>
              {user.plan !== 'FREE' && (
                <>
                  <div className="h-8 w-px bg-slate-700/60" />
                  <button
                    onClick={handleCancel}
                    disabled={loading === 'cancel'}
                    className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition disabled:opacity-50"
                  >
                    {loading === 'cancel' ? 'Cancelando...' : 'Cancelar assinatura'}
                  </button>
                </>
              )}
            </div>
          )}
        </motion.div>

        {/* Plans grid */}
        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((plan, idx) => {
            const Icon = plan.icon;
            const isCurrent = plan.id === user?.plan;
            const isDowngrade =
              user?.plan === 'PRO' && plan.id === 'BASIC';

            // Button label logic
            let btnLabel = 'Escolher plano';
            if (isCurrent) btnLabel = '✓ Plano atual';
            else if (loading === plan.id) btnLabel = 'Redirecionando...';
            else if (loading === 'downgrade' && isDowngrade) btnLabel = 'Processando...';
            else if (isDowngrade) btnLabel = 'Fazer downgrade';
            else if (plan.id === 'FREE') btnLabel = 'Plano gratuito';

            const btnDisabled =
              isCurrent ||
              plan.id === 'FREE' ||
              loading === plan.id ||
              loading === 'downgrade';

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                style={{
                  background: plan.highlighted
                    ? `radial-gradient(ellipse 80% 60% at 50% 0%, ${plan.accent}, transparent), #0f172a`
                    : '#0f172a',
                  border: `1px solid ${isCurrent ? plan.border : 'rgba(255,255,255,.07)'}`,
                  boxShadow: plan.highlighted
                    ? `0 0 0 1px ${plan.border}, 0 24px 60px rgba(139,92,246,.12)`
                    : 'none',
                }}
                className={`relative overflow-hidden rounded-[28px] p-7 transition-all hover:border-white/15 ${plan.highlighted ? 'md:scale-[1.025]' : ''
                  }`}
              >
                {plan.highlighted && (
                  <div
                    className="absolute right-5 top-5 rounded-full px-3 py-1 text-xs font-bold tracking-wide"
                    style={{ background: plan.accent, color: '#c4b5fd', border: `1px solid ${plan.border}` }}
                  >
                    Melhor opção
                  </div>
                )}

                {isCurrent && (
                  <div className="absolute left-5 top-5 rounded-full border border-green-500/40 bg-green-500/10 px-3 py-1 text-xs font-semibold text-green-400">
                    Ativo
                  </div>
                )}

                {/* Icon + name */}
                <div className="mt-2 mb-6 flex items-center gap-3">
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${plan.color} shadow-lg`}
                  >
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-lg leading-none">
                      {plan.emoji} {plan.name}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">{plan.description}</p>
                  </div>
                </div>

                {/* Price */}
                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-[42px] font-extrabold leading-none text-white">
                      {plan.price === 0 ? 'Grátis' : `R$\u00a0${plan.price.toFixed(2).replace('.', ',')}`}
                    </span>
                    {plan.price > 0 && <span className="text-slate-500 text-sm">/mês</span>}
                  </div>
                </div>

                {/* CTA */}
                <button
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={btnDisabled}
                  style={
                    !btnDisabled && plan.highlighted
                      ? { background: 'linear-gradient(135deg, #7c3aed, #6366f1)', color: '#fff' }
                      : {}
                  }
                  className={`mb-7 w-full rounded-2xl px-5 py-3 text-sm font-bold transition-all ${isCurrent
                      ? 'bg-white/5 text-slate-500 cursor-default'
                      : isDowngrade
                        ? 'border border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20'
                        : plan.highlighted
                          ? 'shadow-lg hover:opacity-90'
                          : 'border border-white/10 bg-white/5 text-white hover:bg-white/10'
                    } disabled:opacity-50 disabled:cursor-default`}
                >
                  {btnLabel}
                </button>

                {/* Features */}
                <div className="space-y-2.5">
                  {plan.features.map((f, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <Check className="mt-0.5 w-3.5 h-3.5 flex-shrink-0 text-emerald-400" />
                      <span className="text-sm text-slate-400 leading-snug">{f}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Cancel zone (only for paid plans) */}
        {user && user.plan !== 'FREE' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[24px] border border-red-500/10 bg-red-500/5 p-8"
          >
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="max-w-xl">
                <p className="text-xs uppercase tracking-[.28em] text-red-500 font-semibold">
                  Zona de cancelamento
                </p>
                <h2 className="mt-3 text-2xl font-bold text-white">
                  Cancelar assinatura
                </h2>
                <p className="mt-3 text-sm text-slate-400 leading-relaxed">
                  Ao cancelar, sua assinatura será encerrada no final do período atual e você
                  voltará ao plano Grátis, perdendo acesso a todos os recursos pagos.
                  {user.plan === 'PRO' && (
                    <> Prefere apenas reduzir o custo? Faça downgrade para o plano Básico acima.</>
                  )}
                </p>
              </div>
              <button
                onClick={handleCancel}
                disabled={loading === 'cancel'}
                className="w-full shrink-0 rounded-2xl border border-red-600/40 bg-red-600/10 px-6 py-3 text-sm font-bold text-red-400 hover:bg-red-600/20 transition disabled:opacity-50 md:w-auto"
              >
                {loading === 'cancel' ? 'Cancelando...' : 'Cancelar assinatura'}
              </button>
            </div>
          </motion.div>
        )}

        {/* FAQ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-3xl pt-4"
        >
          <h2 className="mb-8 text-2xl font-bold text-white">Dúvidas frequentes</h2>
          <div className="space-y-3">
            {[
              {
                q: 'Posso mudar de plano a qualquer momento?',
                a: 'Sim. Upgrades são aplicados imediatamente. Downgrades (como Pro → Básico) entram em vigor no próximo ciclo de cobrança.',
              },
              {
                q: 'O que acontece ao fazer downgrade do Pro para o Básico?',
                a: 'Você perde acesso a recursos exclusivos do Pro — como Fingu IA, categorização automática, DRE por centro de custo e suporte via WhatsApp. Seus dados ficam salvos.',
              },
              {
                q: 'Há cobrança recorrente?',
                a: 'Sim. Básico e Pro são cobrados mensalmente via Stripe. Cancele quando quiser sem multa.',
              },
              {
                q: 'Preciso de cartão para testar?',
                a: 'Não. O plano Grátis funciona por 7 dias sem cartão. Para planos pagos, utilizamos Stripe com criptografia total.',
              },
            ].map((item, i) => (
              <details
                key={i}
                className="group cursor-pointer rounded-2xl border border-white/7 bg-slate-900/60 p-5"
              >
                <summary className="flex items-center justify-between font-semibold text-white text-sm">
                  {item.q}
                  <span className="ml-4 text-slate-500 group-open:rotate-45 transition-transform text-lg">+</span>
                </summary>
                <p className="mt-3 text-sm text-slate-400 leading-relaxed">{item.a}</p>
              </details>
            ))}
          </div>
        </motion.div>
      </div>
    </>
  );
}