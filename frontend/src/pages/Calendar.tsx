import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { api, apiErrorMessage } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { CalendarData } from '../types';
import { currency, dateBR } from '../utils/format';

const getMonthKey = (value: Date) =>
  `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}`;

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

// ── FIX 2: normaliza qualquer formato de data para "YYYY-MM-DD" ─────────────
const toDateStr = (raw: string): string => {
  if (!raw) return '';
  // Se já for YYYY-MM-DD, retorna direto
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  // ISO datetime ou outro formato → pega só a parte da data
  return raw.slice(0, 10);
};

const getTodayStr = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const isPastOrToday = (raw: string): boolean => toDateStr(raw) <= getTodayStr();

export default function Calendar() {
  const { user } = useAuth();
  const [calendar, setCalendar] = useState<CalendarData | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [monthKey, setMonthKey] = useState(() => getMonthKey(new Date()));

  const isFirstLoad = useRef(true);
  // ── FIX 3: ref para sempre ter a versão mais recente de fetchCalendar ─────
  const fetchCalendarRef = useRef<(force?: boolean) => void>(() => { });

  const fetchCalendar = useCallback(async (_forceRefresh = false) => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const cacheBust = `&_t=${Date.now()}`;
      const response = await api.get(`/api/calendar?month=${monthKey}${cacheBust}`);
      const data: CalendarData = response.data;

      // ── FIX 2: normaliza as datas de cada dia para YYYY-MM-DD ──────────
      const normalized: CalendarData = {
        ...data,
        dailySummary: (data.dailySummary as any[]).map((d) => ({
          ...d,
          date: toDateStr(d.date),
          transactions: (d.transactions || []).map((tx: any) => ({
            ...tx,
            date: toDateStr(tx.date),
          })),
        })),
      };

      setCalendar(normalized);

      if (isFirstLoad.current) {
        isFirstLoad.current = false;
        const pastDays = normalized.dailySummary.filter((d) => isPastOrToday(d.date));
        if (pastDays.length) {
          const todayStr = getTodayStr();
          const today = pastDays.find((d) => d.date === todayStr);
          setSelectedDate(today ? today.date : pastDays[pastDays.length - 1].date);
        }
      }
    } catch (err: any) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [user, monthKey]);

  // Mantém ref sempre atualizada
  useEffect(() => {
    fetchCalendarRef.current = fetchCalendar;
  }, [fetchCalendar]);

  // Carga inicial e ao trocar de mês
  useEffect(() => {
    fetchCalendar();
  }, [fetchCalendar]);

  // Polling a cada 15s
  useEffect(() => {
    const interval = setInterval(() => {
      fetchCalendarRef.current(true);
    }, 15_000);
    return () => clearInterval(interval);
  }, []); // ← sem dependência: usa sempre o ref mais recente

  // ── FIX 3: listener usa ref — nunca fica com closure stale ───────────────
  useEffect(() => {
    const handler = () => fetchCalendarRef.current(true);
    window.addEventListener('transaction-saved', handler);
    return () => window.removeEventListener('transaction-saved', handler);
  }, []); // ← registro único, sem re-registrar a cada mudança

  const handlePrevMonth = () => {
    const [year, month] = monthKey.split('-').map(Number);
    isFirstLoad.current = true;
    setMonthKey(getMonthKey(new Date(year, month - 2, 1)));
    setSelectedDate('');
  };

  const handleNextMonth = () => {
    const [year, month] = monthKey.split('-').map(Number);
    isFirstLoad.current = true;
    setMonthKey(getMonthKey(new Date(year, month, 1)));
    setSelectedDate('');
  };

  const currentMonthLabel = useMemo(() => {
    const [year, month] = monthKey.split('-').map(Number);
    return new Date(year, month - 1, 1).toLocaleDateString('pt-BR', {
      month: 'long', year: 'numeric',
    });
  }, [monthKey]);

  const isCurrentMonth = monthKey === getMonthKey(new Date());

  // ── FIX 2: filtragem agora funciona pois as datas foram normalizadas ──────
  const monthlyTotals = useMemo(() => {
    if (!calendar) return { revenue: 0, expense: 0, net: 0 };
    const past = calendar.dailySummary.filter((d) => isPastOrToday(d.date));
    const revenue = past.reduce((a, d) => a + (d.revenue ?? 0), 0);
    const expense = past.reduce((a, d) => a + (d.expense ?? 0), 0);
    return { revenue, expense, net: revenue - expense };
  }, [calendar]);

  const selectedDay = useMemo(() => {
    if (!selectedDate || !calendar) return null;
    return calendar.dailySummary.find((d) => d.date === selectedDate) ?? null;
  }, [calendar, selectedDate]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-display font-extrabold text-slate-900 dark:text-slate-100">
            Calendário Financeiro
          </h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400">
            Visualize receitas, despesas e saldo diário com navegação mensal.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0F172A] px-3 py-2 shadow-sm">
          <button onClick={handlePrevMonth} className="btn-ghost rounded-full p-2">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="font-semibold capitalize text-slate-800 dark:text-slate-100">
            {currentMonthLabel}
          </span>
          <button onClick={handleNextMonth} className="btn-ghost rounded-full p-2">
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loading && !calendar ? (
        <div className="card border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0F172A] p-8 text-center text-slate-400">
          <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-brand-blue" />
          Carregando calendário...
        </div>
      ) : error ? (
        <div className="card border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-[#0F172A] p-6 text-rose-600 dark:text-rose-300">
          {error}
        </div>
      ) : (
        <>
          {/* Cards de totais */}
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { label: 'Receita', value: monthlyTotals.revenue, color: 'text-emerald-600 dark:text-emerald-400' },
              { label: 'Despesa', value: monthlyTotals.expense, color: 'text-rose-600 dark:text-rose-400' },
              {
                label: 'Saldo líquido',
                value: monthlyTotals.net,
                color: monthlyTotals.net >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400',
              },
            ].map((item) => (
              <div
                key={item.label}
                className="card border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0F172A] p-6 shadow-sm"
              >
                <div className="text-sm uppercase tracking-[0.3em] text-slate-400">{item.label}</div>
                <div className={`mt-3 text-3xl font-bold ${item.color}`}>
                  {formatCurrency(item.value)}
                </div>
                {isCurrentMonth && (
                  <p className="mt-1 text-xs text-slate-400">Acumulado até hoje</p>
                )}
              </div>
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.8fr_1fr]">
            {/* Grid de dias */}
            <div className="card border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0F172A] p-4 shadow-sm">
              {loading && (
                <div className="mb-3 flex items-center gap-2 text-xs text-slate-400">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Atualizando...
                </div>
              )}

              <div className="grid gap-2 sm:grid-cols-7">
                {calendar?.dailySummary.map((day) => {
                  // FIX 2: data já normalizada — parse seguro com T12:00:00 para evitar UTC shift
                  const date = new Date(day.date + 'T12:00:00');
                  const past = isPastOrToday(day.date);
                  const isActive = day.date === selectedDate;
                  const isToday = day.date === getTodayStr();

                  return (
                    <button
                      key={day.date}
                      onClick={() => past && setSelectedDate(day.date)}
                      disabled={!past}
                      title={!past ? 'Dados disponíveis somente após o dia ocorrer' : undefined}
                      className={[
                        'group flex flex-col gap-2 rounded-3xl border p-3 text-left transition-all',
                        !past
                          ? 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/20 opacity-35 cursor-not-allowed'
                          : isActive
                            ? 'border-brand-blue/50 bg-brand-blue/10 dark:bg-brand-blue/10 shadow-sm cursor-pointer'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0F172A] hover:border-brand-blue/30 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer',
                      ].join(' ')}
                    >
                      <span className="text-xs uppercase tracking-[0.2em] text-slate-400">
                        {date.toLocaleDateString('pt-BR', { weekday: 'short' })}
                      </span>

                      <div className="flex items-center gap-1.5">
                        <span className={`text-xl font-semibold ${past ? 'text-slate-800 dark:text-slate-100' : 'text-slate-300 dark:text-slate-600'}`}>
                          {date.getDate()}
                        </span>
                        {isToday && <span className="h-1.5 w-1.5 rounded-full bg-brand-blue flex-shrink-0" />}
                      </div>

                      {past ? (
                        <>
                          <div className="space-y-0.5 text-xs">
                            {(day.revenue ?? 0) > 0 && (
                              <div className="text-emerald-600 dark:text-emerald-400 font-medium">
                                +{formatCurrency(day.revenue)}
                              </div>
                            )}
                            {(day.expense ?? 0) > 0 && (
                              <div className="text-rose-600 dark:text-rose-400 font-medium">
                                -{formatCurrency(day.expense)}
                              </div>
                            )}
                            {(day.revenue ?? 0) === 0 && (day.expense ?? 0) === 0 && (
                              <div className="text-slate-300 dark:text-slate-600 text-xs">—</div>
                            )}
                          </div>
                          <div className={`mt-auto h-1.5 rounded-full ${(day.net ?? 0) >= 0 ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                        </>
                      ) : (
                        <div className="mt-auto h-1.5 rounded-full bg-slate-200 dark:bg-slate-700/50" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Legenda */}
              <div className="mt-4 flex flex-wrap items-center gap-4 px-1 text-xs text-slate-400">
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Receita</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-rose-400" /> Despesa</span>
                <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-brand-blue" /> Hoje</span>
                <span className="flex items-center gap-1.5 opacity-50"><span className="h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-600" /> Dias futuros</span>
              </div>
            </div>

            {/* Painel de detalhes do dia */}
            <div className="card border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0F172A] p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Detalhes do dia</p>
                  <h2 className="mt-2 text-xl font-semibold text-slate-800 dark:text-slate-100">
                    {selectedDay ? dateBR(selectedDay.date) : 'Selecione um dia'}
                  </h2>
                </div>
                {selectedDay && (
                  <div className={`rounded-2xl px-3 py-1 text-sm font-semibold ${(selectedDay.net ?? 0) >= 0
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                    : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'}`}>
                    {(selectedDay.net ?? 0) >= 0 ? 'Positivo' : 'Negativo'}
                  </div>
                )}
              </div>

              <div className="mt-6 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-3xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-4">
                    <div className="text-xs text-slate-400">Receita</div>
                    <div className="mt-1.5 text-xl font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(selectedDay?.revenue ?? 0)}
                    </div>
                  </div>
                  <div className="rounded-3xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-4">
                    <div className="text-xs text-slate-400">Despesa</div>
                    <div className="mt-1.5 text-xl font-semibold text-rose-600 dark:text-rose-400">
                      {formatCurrency(selectedDay?.expense ?? 0)}
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-4">
                  <div className="text-xs text-slate-400">Saldo do dia</div>
                  <div className={`mt-1.5 text-2xl font-semibold ${(selectedDay?.net ?? 0) >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'}`}>
                    {formatCurrency(selectedDay?.net ?? 0)}
                  </div>
                </div>

                {/* ── FIX 3: lista de transações do dia com detalhes ── */}
                <div className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0F172A] p-4">
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <p className="font-semibold text-slate-800 dark:text-slate-100">Transações</p>
                    <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs text-slate-500">
                      {selectedDay?.transactions?.length ?? 0} itens
                    </span>
                  </div>

                  <div className="space-y-3">
                    {selectedDay?.transactions?.length ? (
                      selectedDay.transactions.map((tx) => (
                        <div
                          key={tx.id}
                          className="rounded-2xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-4"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-slate-800 dark:text-slate-100 truncate">{tx.title}</p>
                              <p className="text-xs text-slate-400 mt-1">
                                {tx.category}
                                {tx.paymentMethod && <> · {tx.paymentMethod}</>}
                                {' · '}{dateBR(tx.date)}
                              </p>
                              {/* ── FIX: detalhes extras ao visualizar no calendário ── */}
                              {tx.description && (
                                <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                  {tx.description}
                                </p>
                              )}
                              {tx.recurring && (
                                <span className="inline-flex items-center gap-1 mt-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                                  🔁 {tx.recurringFrequency || 'recorrente'}
                                </span>
                              )}
                              {tx.installmentGroupId && (tx.totalInstallments ?? 0) > 1 && (
                                <span className="inline-flex items-center gap-1 mt-1.5 ml-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                                  {tx.installmentNumber}/{tx.totalInstallments}x
                                </span>
                              )}
                            </div>
                            <div className={`font-bold whitespace-nowrap flex-shrink-0 text-right ${tx.type === 'INCOME' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                              <div>{tx.type === 'INCOME' ? '+' : '-'}{currency(tx.amount)}</div>
                              {tx.currency && tx.currency !== 'BRL' && (
                                <div className="text-[10px] text-slate-400 font-normal">{tx.currency}</div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30 p-6 text-center text-slate-400 text-sm">
                        {selectedDay
                          ? 'Nenhuma transação registrada para este dia.'
                          : 'Selecione um dia para ver as transações.'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}