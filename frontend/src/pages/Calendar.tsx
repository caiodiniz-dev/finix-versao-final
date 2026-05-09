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

const toDateStr = (raw: string): string => {
  if (!raw) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  return raw.slice(0, 10);
};

const getTodayStr = (): string =>
  new Intl.DateTimeFormat('en-CA').format(new Date());

const getYesterdayStr = (): string => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return new Intl.DateTimeFormat('en-CA').format(d);
};

// Retorna YYYY-MM-DD do dia anterior a uma data
const getPrevDateStr = (dateStr: string): string => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() - 1);
  return new Intl.DateTimeFormat('en-CA').format(dt);
};

// Retorna YYYY-MM-DD do dia seguinte a uma data
const getNextDateStr = (dateStr: string): string => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + 1);
  return new Intl.DateTimeFormat('en-CA').format(dt);
};

const WEEKDAY_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

const isPastOrToday = (raw: string): boolean => toDateStr(raw) <= getTodayStr();

interface DayTransaction {
  id: string;
  title: string;
  type: 'INCOME' | 'EXPENSE';
  amount: number;
  date: string;
  category?: string;
  paymentMethod?: string;
  description?: string;
  currency?: string;
  recurring?: boolean;
  recurringFrequency?: string;
  installmentGroupId?: string;
  installmentNumber?: number;
  totalInstallments?: number;
}

// ─── Normaliza a data de uma transação para o fuso local do browser ──────────
// O servidor salva new Date("2026-05-09") como UTC 00:00Z, que em UTC-3 é
// 2026-05-08T21:00:00. O banco retorna esse valor, e tx.date vem como
// "2026-05-08T21:00:00.000Z". Para exibir corretamente precisamos converter
// esse ISO para a data LOCAL do browser, não cortar cegamente os 10 primeiros chars.
const txDateToLocal = (raw: string): string => {
  if (!raw) return '';
  // Se já é só YYYY-MM-DD, usa direto
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  // ISO com timezone → converte para local
  const d = new Date(raw);
  return new Intl.DateTimeFormat('en-CA').format(d);
};

export default function Calendar() {
  const { user } = useAuth();
  const [calendar, setCalendar] = useState<CalendarData | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');

  const [dayTransactions, setDayTransactions] = useState<DayTransaction[]>([]);
  const [dayTotals, setDayTotals] = useState<{ revenue: number; expense: number; net: number }>({
    revenue: 0,
    expense: 0,
    net: 0,
  });

  const [loading, setLoading] = useState(false);
  const [loadingDay, setLoadingDay] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [monthKey, setMonthKey] = useState(() => getMonthKey(new Date()));

  const shouldAutoSelectRef = useRef(true);
  const fetchCalendarRef = useRef<(force?: boolean) => void>(() => { });

  // ─── Busca transações do dia ─────────────────────────────────────────────
  // ESTRATÉGIA: busca o dia pedido + o dia anterior (que é onde o servidor
  // pode ter salvo por causa do UTC shift). Depois filtra localmente pelo
  // dia correto usando a data convertida para o fuso do browser.
  const fetchDayTransactions = useCallback(async (date: string) => {
    if (!date || !user) return;
    setLoadingDay(true);
    try {
      const prevDate = getPrevDateStr(date);

      // Busca os dois dias em paralelo
      const [resDay, resPrev] = await Promise.all([
        api.get(`/api/transactions?date=${date}&_t=${Date.now()}`),
        api.get(`/api/transactions?date=${prevDate}&_t=${Date.now()}`),
      ]);

      const fromDay: any[] = resDay.data?.transactions ?? resDay.data ?? [];
      const fromPrev: any[] = resPrev.data?.transactions ?? resPrev.data ?? [];

      // Junta e normaliza, convertendo a data de cada tx para o fuso local
      const allRaw = [...fromDay, ...fromPrev];
      const seenIds = new Set<string>();

      const txs: DayTransaction[] = allRaw
        .map((tx: any) => ({
          ...tx,
          // ← aqui está o fix: usa o fuso local do browser, não corte cego
          date: txDateToLocal(String(tx.date)),
        }))
        // Filtra só as que pertencem ao dia selecionado (após conversão local)
        .filter((tx) => {
          if (tx.date !== date) return false;
          if (seenIds.has(tx.id)) return false;
          seenIds.add(tx.id);
          return true;
        });

      setDayTransactions(txs);

      const revenue = txs.filter(t => t.type === 'INCOME').reduce((a, t) => a + t.amount, 0);
      const expense = txs.filter(t => t.type === 'EXPENSE').reduce((a, t) => a + t.amount, 0);
      setDayTotals({ revenue, expense, net: revenue - expense });

      // Mantém o grid sincronizado
      setCalendar((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          dailySummary: prev.dailySummary.map((d) =>
            d.date === date
              ? { ...d, revenue, expense, net: revenue - expense, transactions: txs }
              : d
          ),
        };
      });
    } catch {
      // silencioso
    } finally {
      setLoadingDay(false);
    }
  }, [user]);

  const handleSelectDate = useCallback((date: string) => {
    if (!date) return;
    setSelectedDate(date);
    setDayTransactions([]);
    setDayTotals({ revenue: 0, expense: 0, net: 0 });
    fetchDayTransactions(date);
  }, [fetchDayTransactions]);

  // ─── Busca dados do mês ───────────────────────────────────────────────────
  const fetchCalendar = useCallback(async (_forceRefresh = false) => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/api/calendar?month=${monthKey}&_t=${Date.now()}`);
      const data: CalendarData = res.data;

      // O calendário do servidor já usa toLocalDateKey (new Date(tx.date) convertido
      // para local no servidor). Então o dailySummary já vem com datas corretas.
      const normalized: CalendarData = {
        ...data,
        dailySummary: (data.dailySummary as any[]).map((d) => ({
          ...d,
          date: toDateStr(d.date),
          transactions: (d.transactions || []).map((tx: any) => ({
            ...tx,
            date: txDateToLocal(String(tx.date)),
          })),
        })),
      };

      setCalendar(normalized);

      if (shouldAutoSelectRef.current) {
        shouldAutoSelectRef.current = false;

        const todayStr = getTodayStr();
        const yesterdayStr = getYesterdayStr();
        const pastDays = normalized.dailySummary.filter((d) => isPastOrToday(d.date));

        if (pastDays.length) {
          const todayDay = pastDays.find((d) => d.date === todayStr);
          const yesterdayDay = pastDays.find((d) => d.date === yesterdayStr);

          let target: string;

          if (todayDay && ((todayDay.revenue ?? 0) > 0 || (todayDay.expense ?? 0) > 0)) {
            target = todayStr;
          } else if (todayDay) {
            target = todayStr;
          } else if (yesterdayDay) {
            target = yesterdayStr;
          } else {
            target = pastDays[pastDays.length - 1].date;
          }

          setSelectedDate(target);
          setDayTransactions([]);
          setDayTotals({ revenue: 0, expense: 0, net: 0 });
          fetchDayTransactions(target);
        }
      } else if (_forceRefresh) {
        setSelectedDate((prev) => {
          if (prev) {
            setDayTransactions([]);
            setDayTotals({ revenue: 0, expense: 0, net: 0 });
            fetchDayTransactions(prev);
          }
          return prev;
        });
      }
    } catch (err: any) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [user, monthKey, fetchDayTransactions]);

  useEffect(() => { fetchCalendarRef.current = fetchCalendar; }, [fetchCalendar]);
  useEffect(() => { fetchCalendar(); }, [fetchCalendar]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { date?: string } | undefined;
      if (detail?.date) {
        // Converte a data do evento para local (pode vir como ISO UTC)
        const txDate = txDateToLocal(String(detail.date));
        if (txDate.slice(0, 7) === monthKey) {
          setSelectedDate(txDate);
          setDayTransactions([]);
          setDayTotals({ revenue: 0, expense: 0, net: 0 });
          fetchCalendarRef.current(true);
          fetchDayTransactions(txDate);
        } else {
          fetchCalendarRef.current(true);
        }
      } else {
        fetchCalendarRef.current(true);
      }
    };
    window.addEventListener('transaction-saved', handler);
    return () => window.removeEventListener('transaction-saved', handler);
  }, [monthKey, fetchDayTransactions]);

  const handlePrevMonth = () => {
    const [year, month] = monthKey.split('-').map(Number);
    shouldAutoSelectRef.current = true;
    setMonthKey(getMonthKey(new Date(year, month - 2, 1)));
    setSelectedDate('');
    setDayTransactions([]);
    setDayTotals({ revenue: 0, expense: 0, net: 0 });
  };

  const handleNextMonth = () => {
    const [year, month] = monthKey.split('-').map(Number);
    shouldAutoSelectRef.current = true;
    setMonthKey(getMonthKey(new Date(year, month, 1)));
    setSelectedDate('');
    setDayTransactions([]);
    setDayTotals({ revenue: 0, expense: 0, net: 0 });
  };

  const currentMonthLabel = useMemo(() => {
    const [year, month] = monthKey.split('-').map(Number);
    return new Date(year, month - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  }, [monthKey]);

  const isCurrentMonth = monthKey === getMonthKey(new Date());
  const todayStr = getTodayStr();

  const monthlyTotals = useMemo(() => {
    if (!calendar) return { revenue: 0, expense: 0, net: 0 };
    const past = calendar.dailySummary.filter((d) => isPastOrToday(d.date));
    const revenue = past.reduce((a, d) => a + (d.revenue ?? 0), 0);
    const expense = past.reduce((a, d) => a + (d.expense ?? 0), 0);
    return { revenue, expense, net: revenue - expense };
  }, [calendar]);

  const calendarGridDays = useMemo(() => {
    if (!calendar) return [];
    const [year, month] = monthKey.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    const firstDay = new Date(year, month - 1, 1).getDay();
    const leadingEmpty = (firstDay + 6) % 7;
    const allDays = [...Array(leadingEmpty).fill(null)];
    const dayMap = new Map(calendar.dailySummary.map((day) => [day.date, day]));

    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      allDays.push(dayMap.get(date) ?? { date, revenue: 0, expense: 0, net: 0, transactions: [] });
    }

    while (allDays.length % 7 !== 0) allDays.push(null);
    return allDays;
  }, [calendar, monthKey]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-extrabold text-slate-900 dark:text-slate-100">
            Calendário Financeiro
          </h1>
          <p className="mt-2 text-sm md:text-base text-slate-500 dark:text-slate-400">
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
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { label: 'Receita', value: monthlyTotals.revenue, color: 'text-emerald-600 dark:text-emerald-400' },
              { label: 'Despesa', value: monthlyTotals.expense, color: 'text-rose-600 dark:text-rose-400' },
              {
                label: 'Saldo líquido',
                value: monthlyTotals.net,
                color: monthlyTotals.net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400',
              },
            ].map((item) => (
              <div key={item.label} className="card border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0F172A] p-4 md:p-6 shadow-sm">
                <div className="text-xs md:text-sm uppercase tracking-[0.3em] text-slate-400">{item.label}</div>
                <div className={`mt-3 text-2xl md:text-3xl font-bold ${item.color}`}>{formatCurrency(item.value)}</div>
                {isCurrentMonth && <p className="mt-1 text-xs text-slate-400">Acumulado até hoje</p>}
              </div>
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.8fr_1fr]">
            <div className="card border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0F172A] p-4 shadow-sm">
              {loading && (
                <div className="mb-3 flex items-center gap-2 text-xs text-slate-400">
                  <Loader2 className="h-3 w-3 animate-spin" /> Atualizando...
                </div>
              )}
              <div className="grid gap-2">
                <div className="grid grid-cols-7 gap-2 text-center text-[11px] uppercase tracking-[0.25em] text-slate-400">
                  {WEEKDAY_LABELS.map((label) => (
                    <div key={label} className="py-2">{label}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {calendarGridDays.map((day, index) => {
                    if (!day) {
                      return (
                        <div
                          key={`empty-${index}`}
                          className="min-h-[98px] rounded-3xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/20"
                        />
                      );
                    }

                    const date = new Date(day.date + 'T12:00:00');
                    const past = isPastOrToday(day.date);
                    const isActive = day.date === selectedDate;
                    const isToday = day.date === todayStr;

                    return (
                      <button
                        key={day.date}
                        onClick={() => past && handleSelectDate(day.date)}
                        disabled={!past}
                        title={!past ? 'Dados disponíveis somente após o dia ocorrer' : undefined}
                        className={[
                          'group flex flex-col gap-2 rounded-3xl border p-2 md:p-3 text-left transition-all min-h-[120px] md:min-h-[98px]',
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
                          <span className={`text-lg md:text-xl font-semibold ${past ? 'text-slate-800 dark:text-slate-100' : 'text-slate-300 dark:text-slate-600'}`}>
                            {date.getDate()}
                          </span>
                          {isToday && <span className="h-1.5 w-1.5 rounded-full bg-brand-blue flex-shrink-0" />}
                        </div>
                        {past ? (
                          <>
                            <div className="space-y-0.5 text-xs md:text-sm">
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
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-4 px-1 text-xs text-slate-400">
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Receita</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-rose-400" /> Despesa</span>
                <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-brand-blue" /> Hoje</span>
                <span className="flex items-center gap-1.5 opacity-50"><span className="h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-600" /> Dias futuros</span>
              </div>
            </div>

            <div className="card border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0F172A] p-4 md:p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Detalhes do dia</p>
                  <h2 className="mt-2 text-lg md:text-xl font-semibold text-slate-800 dark:text-slate-100">
                    {selectedDate ? dateBR(selectedDate) : 'Selecione um dia'}
                  </h2>
                </div>
                {selectedDate && (
                  <div className={`rounded-2xl px-3 py-1 text-sm font-semibold ${dayTotals.net >= 0
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                    : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'}`}>
                    {dayTotals.net >= 0 ? 'Positivo' : 'Negativo'}
                  </div>
                )}
              </div>

              <div className="mt-6 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-3xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-3 md:p-4">
                    <div className="text-xs text-slate-400">Receita</div>
                    <div className="mt-1.5 text-lg md:text-xl font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(dayTotals.revenue)}
                    </div>
                  </div>
                  <div className="rounded-3xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-3 md:p-4">
                    <div className="text-xs text-slate-400">Despesa</div>
                    <div className="mt-1.5 text-lg md:text-xl font-semibold text-rose-600 dark:text-rose-400">
                      {formatCurrency(dayTotals.expense)}
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-3 md:p-4">
                  <div className="text-xs text-slate-400">Saldo do dia</div>
                  <div className={`mt-1.5 text-xl md:text-2xl font-semibold ${dayTotals.net >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'}`}>
                    {formatCurrency(dayTotals.net)}
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0F172A] p-4">
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <p className="font-semibold text-slate-800 dark:text-slate-100">Transações</p>
                    <div className="flex items-center gap-2">
                      {loadingDay && <Loader2 className="h-3 w-3 animate-spin text-slate-400" />}
                      <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs text-slate-500">
                        {dayTransactions.length} itens
                      </span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {dayTransactions.length > 0 ? (
                      dayTransactions.map((tx) => (
                        <div key={tx.id} className="rounded-2xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-3 md:p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-slate-800 dark:text-slate-100 truncate text-sm md:text-base">{tx.title}</p>
                              <p className="text-xs text-slate-400 mt-1">
                                {tx.category}
                                {tx.paymentMethod && <> · {tx.paymentMethod}</>}
                                {' · '}{dateBR(tx.date)}
                              </p>
                              {tx.description && (
                                <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{tx.description}</p>
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
                            <div className={`font-bold whitespace-nowrap flex-shrink-0 text-right text-sm md:text-base ${tx.type === 'INCOME' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
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
                        {loadingDay
                          ? 'Carregando transações...'
                          : selectedDate
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