import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Zap, Crown, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import toast from 'react-hot-toast';

const PLANS = [
  {
    id: 'FREE',
    name: '🆓 Grátis',
    price: 0,
    description: 'Trial 7 dias',
    features: [
      'Acesso apenas à Dashboard básica',
      'Sem acesso a transações, cartões, relatórios ou categorias personalizadas',
      'Exibir banner CTA para upgrade',
    ],
    icon: Zap,
    highlighted: false,
  },
  {
    id: 'BASIC',
    name: '📦 Finix Básico',
    price: 67,
    description: 'Para profissionais autônomos',
    features: [
      '1 usuário',
      '50 contatos',
      '2 contas',
      '500 movimentações bancárias/mês',
      '2 cartões',
      '50 movimentações de cartão/mês',
      'Receitas, despesas e transferências',
      'Contas a pagar e receber',
      'Gestão de faturas de cartão',
      'DRE Gerencial automático',
      'Dashboard de KPIs',
      'Calendário financeiro',
      'Importação OFX / XLS / CSV / PDF',
      'Conciliação bancária',
      'Aviso de pendências e ações',
      'Logs de atividades básico',
      'Suporte comum via E-mail',
    ],
    icon: Crown,
    highlighted: false,
  },
  {
    id: 'PRO',
    name: '🚀 Finix Pro',
    price: 137,
    description: 'Para pequenas empresas',
    features: [
      '5 usuários',
      'Contatos ilimitados',
      'Contas ilimitadas',
      'Movimentações bancárias ilimitadas',
      'Cartões ilimitados',
      'Movimentações de cartão ilimitadas',
      'Fingu AI: análise de dados e projeções',
      'Chat inteligente para dúvidas financeiras',
      'Categorização automática com IA',
      'Análise comparativa de períodos',
      'Centros de custo / projetos',
      'DRE por centro de custo',
      'Fluxo de caixa projetado',
      'Alertas inteligentes por e-mail',
      'Relatórios avançados em PDF',
      'Logs de atividades avançado',
      'Suporte prioritário via E-mail e WhatsApp',
    ],
    icon: Sparkles,
    highlighted: true,
  },
];

export default function Plans() {
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);
  const [plans, setPlans] = useState(PLANS);

  useEffect(() => {
    const loadPlans = async () => {
      try {
        const response = await api.get('/api/plans');
        const remotePlans = response.data;
        setPlans((current) => current.map((plan) => {
          const remote = remotePlans.find((p: any) => p.id === plan.id);
          return remote ? { ...plan, price: remote.monthlyPrice ?? plan.price } : plan;
        }));
      } catch {
        // fallback to local plan definitions
      }
    };
    loadPlans();
  }, []);

  const handleUpgrade = async (planId: string) => {
    if (planId === 'FREE' || planId === user?.plan) {
      toast.error('Este plano não pode ser selecionado.');
      return;
    }

    setLoading(planId);
    try {
      const response = await api.post('/api/stripe/checkout', { plan_id: planId });

      if (response.data?.url) {
        window.location.href = response.data.url;
      } else {
        toast.error('Erro: Nenhuma URL de pagamento retornada');
      }
    } catch (err: any) {
      console.error('Erro ao processar upgrade:', err);
      toast.error(err.response?.data?.error || err.message || 'Erro ao processar o upgrade');
    } finally {
      setLoading(null);
    }
  };

  const handleCancelSubscription = async () => {
    if (!user) return;

    const confirmed = window.confirm('Deseja cancelar seu plano pago e voltar para o plano gratuito?');
    if (!confirmed) return;

    setLoading('cancel');
    try {
      const response = await api.post('/api/stripe/cancel-subscription', {});

      if (response.data?.message) {
        toast.success(response.data.message);
        await refreshUser();
      } else {
        toast.success('Plano cancelado com sucesso.');
        await refreshUser();
      }
    } catch (err: any) {
      console.error('Erro ao cancelar plano:', err);
      toast.error(err.response?.data?.error || err.message || 'Erro ao cancelar o plano');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-12">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-3xl"
      >
        <h1 className="text-4xl font-display font-extrabold">Planos e Preços</h1>
        <p className="mt-4 text-lg text-slate-400 max-w-2xl">
          Escolha o plano perfeito para suas necessidades. Você pode mudar a qualquer momento.
        </p>
        {user && (
          <div className="mt-6 inline-flex flex-col gap-2 rounded-[2rem] border border-slate-700 bg-slate-950/80 px-5 py-4 shadow-soft text-white sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Plano atual</p>
              <p className="mt-1 text-xl font-semibold text-white">{user.plan || 'GRÁTIS'}</p>
            </div>
            {user.plan !== 'FREE' && (
              <p className="text-sm text-slate-400">O plano atual será mantido até a próxima cobrança.</p>
            )}
          </div>
        )}
      </motion.div>

      {/* Plans Grid */}
      <div className="grid gap-8 md:grid-cols-3">
        {plans.map((plan, idx) => {
          const Icon = plan.icon;
          const isCurrent = plan.id === user?.plan;

          return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={`card relative overflow-hidden transition-all ${plan.highlighted
                ? 'ring-2 ring-brand-purple shadow-glow md:scale-105'
                : 'hover:shadow-lg'
                }`}
            >
              {plan.highlighted && (
                <div className="absolute top-0 right-0 px-3 py-1 bg-gradient-to-r from-brand-purple to-pink-500 text-white text-xs font-bold rounded-bl-lg">
                  MELHOR OPÇÃO
                </div>
              )}

              <div className="flex items-center gap-3 mb-5">
                <div className={`flex h-12 w-12 items-center justify-center rounded-3xl ${plan.highlighted
                  ? 'bg-gradient-to-br from-brand-purple to-pink-500 text-white'
                  : 'bg-slate-900 text-white'}
                `}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg text-white">{plan.name}</h3>
                  <p className="text-sm text-slate-400">{plan.description}</p>
                </div>
              </div>

              <div className="mb-8">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-white">
                    {plan.price === 0 ? 'Grátis' : `R$ ${plan.price.toFixed(2).replace('.', ',')}`}
                  </span>
                  {plan.price > 0 && <span className="text-slate-400">/mês</span>}
                </div>
              </div>

              <button
                onClick={() => handleUpgrade(plan.id)}
                disabled={loading === plan.id || isCurrent}
                className={`w-full rounded-3xl px-5 py-3 text-sm font-semibold transition-all ${isCurrent
                  ? 'bg-slate-800 text-slate-400 cursor-default'
                  : plan.highlighted
                    ? 'btn-primary'
                    : 'btn-outline'
                  } disabled:opacity-50`}
              >
                {isCurrent
                  ? '✓ Plano Atual'
                  : loading === plan.id
                    ? 'Processando...'
                    : 'Escolher'}
              </button>

              <div className="mt-8 space-y-3">
                {plan.features.map((feature, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <Check className="w-4 h-4 text-brand-green mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-slate-400">{feature}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          );
        })}
      </div>

      {user && user.plan !== 'FREE' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[2rem] border border-red-500/10 bg-red-500/5 p-8 shadow-soft"
        >
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm uppercase tracking-[0.3em] text-red-600">Cancelar Plano</p>
              <h2 className="mt-3 text-3xl font-semibold text-slate-900 dark:text-white">Interrompa a cobrança mensal</h2>
              <p className="mt-4 text-slate-600 dark:text-slate-300">
                Clique abaixo para cancelar sua assinatura atual. Seu plano será revertido ao plano gratuito e você não será mais cobrado.
              </p>
            </div>
            <button
              onClick={handleCancelSubscription}
              disabled={loading === 'cancel'}
              className="w-full rounded-3xl bg-red-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50 md:w-auto"
            >
              {loading === 'cancel' ? 'Cancelando...' : 'Cancelar assinatura'}
            </button>
          </div>
        </motion.div>
      )}

      {/* FAQ Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="mt-20 max-w-3xl"
      >
        <h2 className="text-2xl font-display font-bold mb-8">Dúvidas frequentes</h2>
        <div className="space-y-4">
          {[
            {
              q: 'Posso mudar de plano depois?',
              a: 'Sim! Você pode fazer upgrade ou downgrade a qualquer momento. As mudanças são aplicadas imediatamente.',
            },
            {
              q: 'Há cobrança recorrente?',
              a: 'Sim, os planos Básico e Pro são cobrados mensalmente. Você pode cancelar quando quiser.',
            },
            {
              q: 'Preciso de cartão de crédito para testar?',
              a: 'Não! O plano Grátis não precisa de cartão. Para os pagos, usamos Stripe com segurança total.',
            },
            {
              q: 'Existe período de teste?',
              a: 'O plano Grátis é seu teste! Teste todas as funcionalidades básicas sem precisar de cartão.',
            },
          ].map((item, i) => (
            <details key={i} className="group card p-4 cursor-pointer">
              <summary className="font-semibold text-slate-700 group-open:text-brand-blue flex items-center gap-2">
                <span>+</span> {item.q}
              </summary>
              <p className="mt-3 text-slate-600 text-sm">{item.a}</p>
            </details>
          ))}
        </div>
      </motion.div>
    </div >
  );
}
