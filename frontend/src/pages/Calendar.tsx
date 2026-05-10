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

const getPrevDateStr = (dateStr: string): string => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() - 1);
  return new Intl.DateTimeFormat('en-CA').format(dt);
};

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

const txDateToLocal = (raw: string): string => {
  if (!raw) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
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

  const fetchDayTransactions = useCallback(async (date: string) => {
    if (!date || !user) return;
    setLoadingDay(true);
    try {
      const prevDate = getPrevDateStr(date);

      const [resDay, resPrev] = await Promise.all([
        api.get(`/api/transactions?date=${date}&_t=${Date.now()}`),
        api.get(`/api/transactions?date=${prevDate}&_t=${Date.now()}`),
      ]);

      const fromDay: any[] = resDay.data?.transactions ?? resDay.data ?? [];
      const fromPrev: any[] = resPrev.data?.transactions ?? resPrev.data ?? [];

      const allRaw = [...fromDay, ...fromPrev];
      const seenIds = new Set<string>();

      const txs: DayTransaction[] = allRaw
        .map((tx: any) => ({
          ...tx,
          date: txDateToLocal(String(tx.date)),
        }))
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

  const fetchCalendar = useCallback(async (_forceRefresh = false) => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/api/calendar?month=${monthKey}&_t=${Date.now()}`);
      const data: CalendarData = res.data;

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
    <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-display font-extrabold text-slate-900 dark:text-slate-100">
            Calendário Financeiro
          </h1>
          <p className="mt-1 sm:mt-2 text-xs sm:text-sm md:text-base text-slate-500 dark:text-slate-400">
            Visualize receitas, despesas e saldo diário com navegação mensal.
          </p>
        </div>
        <div className="inline-flex self-start sm:self-auto items-center gap-2 rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0F172A] px-3 py-2 shadow-sm">
          <button onClick={handlePrevMonth} className="btn-ghost rounded-full p-1.5 sm:p-2">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="font-semibold capitalize text-sm sm:text-base text-slate-800 dark:text-slate-100">
            {currentMonthLabel}
          </span>
          <button onClick={handleNextMonth} className="btn-ghost rounded-full p-1.5 sm:p-2">
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
          {/* Monthly totals */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            {[
              { label: 'Receita', value: monthlyTotals.revenue, color: 'text-emerald-600 dark:text-emerald-400' },
              { label: 'Despesa', value: monthlyTotals.expense, color: 'text-rose-600 dark:text-rose-400' },
              {
                label: 'Saldo',
                value: monthlyTotals.net,
                color: monthlyTotals.net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400',
              },
            ].map((item) => (
              <div key={item.label} className="card border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0F172A] p-3 sm:p-4 md:p-6 shadow-sm">
                <div className="text-[10px] sm:text-xs uppercase tracking-[0.2em] sm:tracking-[0.3em] text-slate-400 truncate">
                  {/* Show short label on mobile */}
                  <span className="sm:hidden">{item.label}</span>
                  <span className="hidden sm:inline">{item.label === 'Saldo' ? 'Saldo líquido' : item.label}</span>
                </div>
                <div className={`mt-2 text-sm sm:text-base md:text-2xl lg:text-3xl font-bold ${item.color} break-all`}>
                  {formatCurrency(item.value)}
                </div>
                {isCurrentMonth && (
                  <p className="mt-1 text-[10px] sm:text-xs text-slate-400 hidden sm:block">Acumulado até hoje</p>
                )}
              </div>
            ))}
          </div>

          {/* Main grid: calendar + day detail */}
          <div className="grid gap-4 xl:grid-cols-[1.8fr_1fr]">
            {/* Calendar grid */}
            <div className="card border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0F172A] p-3 sm:p-4 shadow-sm">
              {loading && (
                <div className="mb-3 flex items-center gap-2 text-xs text-slate-400">
                  <Loader2 className="h-3 w-3 animate-spin" /> Atualizando...
                </div>
              )}
              <div className="grid gap-1 sm:gap-2">
                {/* Weekday labels */}
                <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center text-[9px] sm:text-[11px] uppercase tracking-[0.15em] sm:tracking-[0.25em] text-slate-400">
                  {WEEKDAY_LABELS.map((label) => (
                    <div key={label} className="py-1 sm:py-2">
                      {/* Short on mobile */}
                      <span className="sm:hidden">{label.charAt(0)}</span>
                      <span className="hidden sm:inline">{label}</span>
                    </div>
                  ))}
                </div>

                {/* Day cells */}
                <div className="grid grid-cols-7 gap-1 sm:gap-2">
                  {calendarGridDays.map((day, index) => {
                    if (!day) {
                      return (
                        <div
                          key={`empty-${index}`}
                          className="min-h-[60px] sm:min-h-[80px] md:min-h-[98px] rounded-xl sm:rounded-2xl md:rounded-3xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/20"
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
                          'group flex flex-col gap-1 sm:gap-2 rounded-xl sm:rounded-2xl md:rounded-3xl border p-1.5 sm:p-2 md:p-3 text-left transition-all min-h-[60px] sm:min-h-[80px] md:min-h-[98px]',
                          !past
                            ? 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/20 opacity-35 cursor-not-allowed'
                            : isActive
                              ? 'border-brand-blue/50 bg-brand-blue/10 dark:bg-brand-blue/10 shadow-sm cursor-pointer'
                              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0F172A] hover:border-brand-blue/30 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer',
                        ].join(' ')}
                      >
                        {/* Weekday — hidden on very small screens */}
                        <span className="hidden md:block text-[10px] uppercase tracking-[0.2em] text-slate-400">
                          {date.toLocaleDateString('pt-BR', { weekday: 'short' })}
                        </span>

                        {/* Day number + today dot */}
                        <div className="flex items-center gap-1">
                          <span className={`text-sm sm:text-base md:text-xl font-semibold leading-none ${past ? 'text-slate-800 dark:text-slate-100' : 'text-slate-300 dark:text-slate-600'}`}>
                            {date.getDate()}
                          </span>
                          {isToday && <span className="h-1 w-1 sm:h-1.5 sm:w-1.5 rounded-full bg-brand-blue flex-shrink-0" />}
                        </div>

                        {/* Amounts */}
                        {past ? (
                          <>
                            <div className="space-y-0.5 text-[10px] sm:text-xs leading-tight">
                              {(day.revenue ?? 0) > 0 && (
                                <div className="text-emerald-600 dark:text-emerald-400 font-medium truncate">
                                  +{new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(day.revenue)}
                                </div>
                              )}
                              {(day.expense ?? 0) > 0 && (
                                <div className="text-rose-600 dark:text-rose-400 font-medium truncate">
                                  -{new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(day.expense)}
                                </div>
                              )}
                              {(day.revenue ?? 0) === 0 && (day.expense ?? 0) === 0 && (
                                <div className="text-slate-300 dark:text-slate-600 text-[10px]">—</div>
                              )}
                            </div>
                            <div className={`mt-auto h-1 sm:h-1.5 rounded-full ${(day.net ?? 0) >= 0 ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                          </>
                        ) : (
                          <div className="mt-auto h-1 sm:h-1.5 rounded-full bg-slate-200 dark:bg-slate-700/50" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Legend */}
              <div className="mt-3 sm:mt-4 flex flex-wrap items-center gap-3 sm:gap-4 px-1 text-[10px] sm:text-xs text-slate-400">
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Receita</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-rose-400" /> Despesa</span>
                <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-brand-blue" /> Hoje</span>
                <span className="flex items-center gap-1.5 opacity-50"><span className="h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-600" /> Futuros</span>
              </div>
            </div>

            {/* Day detail panel */}
            <div className="card border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0F172A] p-3 sm:p-4 md:p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] sm:text-xs uppercase tracking-[0.3em] text-slate-400">Detalhes do dia</p>
                  <h2 className="mt-1 sm:mt-2 text-base sm:text-lg md:text-xl font-semibold text-slate-800 dark:text-slate-100">
                    {selectedDate ? dateBR(selectedDate) : 'Selecione um dia'}
                  </h2>
                </div>
                {selectedDate && (
                  <div className={`rounded-xl sm:rounded-2xl px-2.5 sm:px-3 py-1 text-xs sm:text-sm font-semibold flex-shrink-0 ${dayTotals.net >= 0
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                    : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'}`}>
                    {dayTotals.net >= 0 ? 'Positivo' : 'Negativo'}
                  </div>
                )}
              </div>

              <div className="mt-4 sm:mt-6 space-y-2 sm:space-y-3">
                {/* Revenue / Expense mini cards */}
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <div className="rounded-xl sm:rounded-2xl md:rounded-3xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-2.5 sm:p-3 md:p-4">
                    <div className="text-[10px] sm:text-xs text-slate-400">Receita</div>
                    <div className="mt-1 sm:mt-1.5 text-sm sm:text-base md:text-lg font-semibold text-emerald-600 dark:text-emerald-400 break-all">
                      {formatCurrency(dayTotals.revenue)}
                    </div>
                  </div>
                  <div className="rounded-xl sm:rounded-2xl md:rounded-3xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-2.5 sm:p-3 md:p-4">
                    <div className="text-[10px] sm:text-xs text-slate-400">Despesa</div>
                    <div className="mt-1 sm:mt-1.5 text-sm sm:text-base md:text-lg font-semibold text-rose-600 dark:text-rose-400 break-all">
                      {formatCurrency(dayTotals.expense)}
                    </div>
                  </div>
                </div>

                {/* Net balance */}
                <div className="rounded-xl sm:rounded-2xl md:rounded-3xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-2.5 sm:p-3 md:p-4">
                  <div className="text-[10px] sm:text-xs text-slate-400">Saldo do dia</div>
                  <div className={`mt-1 sm:mt-1.5 text-sm sm:text-base md:text-xl font-semibold break-all ${dayTotals.net >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'}`}>
                    {formatCurrency(dayTotals.net)}
                  </div>
                </div>

                {/* Transactions list */}
                <div className="rounded-xl sm:rounded-2xl md:rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0F172A] p-3 sm:p-4">
                  <div className="flex items-center justify-between gap-2 mb-3 sm:mb-4">
                    <p className="font-semibold text-sm sm:text-base text-slate-800 dark:text-slate-100">Transações</p>
                    <div className="flex items-center gap-2">
                      {loadingDay && <Loader2 className="h-3 w-3 animate-spin text-slate-400" />}
                      <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] sm:text-xs text-slate-500">
                        {dayTransactions.length} itens
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 sm:space-y-3 max-h-[40vh] xl:max-h-none overflow-y-auto">
                    {dayTransactions.length > 0 ? (
                      dayTransactions.map((tx) => (
                        <div key={tx.id} className="rounded-xl sm:rounded-2xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-2.5 sm:p-3 md:p-4">
                          <div className="flex items-start justify-between gap-2 sm:gap-3">
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-slate-800 dark:text-slate-100 truncate text-xs sm:text-sm md:text-base">{tx.title}</p>
                              <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 sm:mt-1 truncate">
                                {tx.category}
                                {tx.paymentMethod && <> · {tx.paymentMethod}</>}
                                {' · '}{dateBR(tx.date)}
                              </p>
                              {tx.description && (
                                <p className="mt-1 text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">{tx.description}</p>
                              )}
                              <div className="flex flex-wrap gap-1 mt-1">
                                {tx.recurring && (
                                  <span className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                                    🔁 {tx.recurringFrequency || 'recorrente'}
                                  </span>
                                )}
                                {tx.installmentGroupId && (tx.totalInstallments ?? 0) > 1 && (
                                  <span className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                                    {tx.installmentNumber}/{tx.totalInstallments}x
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className={`font-bold whitespace-nowrap flex-shrink-0 text-right text-xs sm:text-sm md:text-base ${tx.type === 'INCOME' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                              <div>{tx.type === 'INCOME' ? '+' : '-'}{currency(tx.amount)}</div>
                              {tx.currency && tx.currency !== 'BRL' && (
                                <div className="text-[10px] text-slate-400 font-normal">{tx.currency}</div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-xl sm:rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30 p-4 sm:p-6 text-center text-slate-400 text-xs sm:text-sm">
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