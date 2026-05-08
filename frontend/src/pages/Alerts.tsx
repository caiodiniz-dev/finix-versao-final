import { useEffect, useState } from 'react';
import { Loader2, RefreshCcw, CalendarClock, CheckCircle2 } from 'lucide-react';
import { api, apiErrorMessage } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Budget } from '../types';
import { currency, dateBR } from '../utils/format';

export default function Alerts() {
  const { user } = useAuth();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAlerts = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const budgetsRes = await api.get('/api/budgets');
      setBudgets(budgetsRes.data || []);
    } catch (err: any) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAlerts(); }, [user]);

  // Todos os orçamentos — com ou sem dueDate — para exibição
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const budgetAlerts = budgets
    .map((b) => {
      const usedPercent = b.limit > 0 ? Math.round((b.spent / b.limit) * 100) : 0;
      let diffDays: number | null = null;
      if ((b as any).dueDate) {
        const due = new Date((b as any).dueDate);
        due.setHours(0, 0, 0, 0);
        diffDays = Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      }
      return { ...b, dueDate: (b as any).dueDate ?? null, diffDays, usedPercent };
    })
    // Ordena: estourados primeiro, depois por % usado
    .sort((a, b) => b.usedPercent - a.usedPercent);

  const overLimitCount = budgetAlerts.filter((b) => b.usedPercent >= 100).length;
  const nearingCount = budgetAlerts.filter((b) => b.usedPercent >= 80 && b.usedPercent < 100).length;
  const dueSoonCount = budgetAlerts.filter((b) => b.diffDays !== null && b.diffDays <= 7).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-display font-extrabold text-slate-900 dark:text-slate-100">
            Alertas Financeiros
          </h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400">
            Acompanhe o uso dos seus orçamentos e prazos de vencimento.
          </p>
        </div>
        <button
          onClick={fetchAlerts}
          className="btn-outline inline-flex items-center gap-2 rounded-3xl px-4 py-3 text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0F172A] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
        >
          <RefreshCcw className="w-4 h-4" /> Atualizar
        </button>
      </div>

      {/* Cards de resumo */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="card border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0F172A] p-6">
          <div className="text-sm uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Limite estourado</div>
          <div className="mt-4 text-3xl font-bold text-rose-600 dark:text-rose-400">{overLimitCount}</div>
        </div>
        <div className="card border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0F172A] p-6">
          <div className="text-sm uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Próximo do limite</div>
          <div className="mt-4 text-3xl font-bold text-amber-500 dark:text-amber-400">{nearingCount}</div>
        </div>
        <div className="card border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0F172A] p-6">
          <div className="text-sm uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Vencem em 7 dias</div>
          <div className="mt-4 text-3xl font-bold text-slate-700 dark:text-slate-200">{dueSoonCount}</div>
        </div>
      </div>

      {/* Lista de orçamentos */}
      <div className="card border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0F172A] p-6">
        <div className="flex items-center gap-3 mb-5">
          <CalendarClock className="w-5 h-5 text-brand-blue" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Seus orçamentos</h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-3 text-slate-500 dark:text-slate-400 py-8">
            <Loader2 className="w-5 h-5 animate-spin" /> Carregando...
          </div>
        ) : error ? (
          <div className="rounded-3xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 p-4 text-rose-700 dark:text-rose-300">
            {error}
          </div>
        ) : budgetAlerts.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30 p-8 text-center">
            <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-400 mb-3" />
            <p className="text-slate-500 dark:text-slate-400">Nenhum orçamento cadastrado ainda.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {budgetAlerts.map((b) => {
              const isOverdue = b.diffDays !== null && b.diffDays < 0;
              const isDanger = b.usedPercent >= 100 || (b.diffDays !== null && b.diffDays <= 1);
              const isWarning = !isDanger && (b.usedPercent >= 80 || (b.diffDays !== null && b.diffDays <= 3));

              return (
                <div
                  key={b.id}
                  className={`rounded-2xl border p-4 flex flex-col sm:flex-row sm:items-center gap-3 transition-all ${isDanger
                      ? 'border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30'
                      : isWarning
                        ? 'border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0F172A]'
                    }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-900 dark:text-slate-100">{b.category}</span>
                      {b.usedPercent >= 100 && (
                        <span className="chip bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 text-[10px]">
                          Limite estourado
                        </span>
                      )}
                      {b.usedPercent >= 80 && b.usedPercent < 100 && (
                        <span className="chip bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 text-[10px]">
                          {b.usedPercent}% usado
                        </span>
                      )}
                    </div>

                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden max-w-[200px]">
                        <div
                          className={`h-full rounded-full transition-all ${b.usedPercent >= 100 ? 'bg-rose-500' : b.usedPercent >= 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                          style={{ width: `${Math.min(100, b.usedPercent)}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {currency(b.spent)} / {currency(b.limit)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {b.dueDate ? (
                      <>
                        <div className={`text-sm font-semibold ${isDanger ? 'text-rose-600 dark:text-rose-400' : isWarning ? 'text-amber-600 dark:text-amber-400' : 'text-slate-600 dark:text-slate-300'}`}>
                          {isOverdue
                            ? `Venceu há ${Math.abs(b.diffDays!)} dia${Math.abs(b.diffDays!) > 1 ? 's' : ''}`
                            : b.diffDays === 0
                              ? 'Vence hoje'
                              : `Vence em ${b.diffDays} dia${b.diffDays! > 1 ? 's' : ''}`}
                        </div>
                        <span className="text-xs text-slate-400 dark:text-slate-500 rounded-xl bg-slate-100 dark:bg-slate-800 px-2 py-1">
                          {dateBR(b.dueDate)}
                        </span>
                      </>
                    ) : (
                      <span className="text-xs text-slate-400 dark:text-slate-500 rounded-xl bg-slate-100 dark:bg-slate-800 px-2 py-1">
                        Sem prazo
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}