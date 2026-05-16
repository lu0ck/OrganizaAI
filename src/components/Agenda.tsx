import React, { useState, useMemo } from 'react';
import { Calendar, Clock, TrendingUp, Calculator, Save, X, Plus, Info, MapPin, Sparkles, Trash2, DollarSign, CheckCircle2, Copy, ClipboardCheck, ChevronDown, ChevronUp, Sun, Palmtree } from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, addMonths, isWithinInterval, isBefore, isAfter, getDay, startOfWeek, addDays } from 'date-fns';
import { RideEntry, Expense, UserProfile, WorkDay, WorkPeriod, MonthlyPlan, VacationEntry } from '../types';
import { cn } from '../lib/utils';
import InfoTooltip from './Tooltip';

function isVacationDay(vacations: VacationEntry[], dateStr: string): boolean {
  return vacations.some(v => v.date === dateStr);
}

function getVacationType(vacations: VacationEntry[], dateStr: string): 'ferias' | 'folga' | undefined {
  const entry = vacations.find(v => v.date === dateStr);
  return entry?.type;
}

interface AgendaProps {
  rides: RideEntry[];
  expenses: Expense[];
  profile: UserProfile | null;
  onUpdateProfile: (profile: UserProfile) => void;
  sidebarCollapsed?: boolean;
  plans?: MonthlyPlan[];
  onAddPlan?: (plan: MonthlyPlan) => void;
  onUpdatePlan?: (plan: MonthlyPlan) => void;
  onDeletePlan?: (id: string) => void;
}

export default function Agenda({ rides, expenses, profile, onUpdateProfile, sidebarCollapsed, plans: rawPlans, onAddPlan, onUpdatePlan, onDeletePlan }: AgendaProps) {
  const plans = Array.isArray(rawPlans) ? rawPlans : [];
  const [simulation, setSimulation] = useState({
    avgPerHour: profile?.hourlyRate || 0,
    schedule: profile?.workSchedule || [
      { day: 'Dom', active: false, periods: [{ start: '00:00', end: '00:00' }] },
      { day: 'Seg', active: true, periods: [{ start: '00:00', end: '00:00' }] },
      { day: 'Ter', active: true, periods: [{ start: '00:00', end: '00:00' }] },
      { day: 'Qua', active: true, periods: [{ start: '00:00', end: '00:00' }] },
      { day: 'Qui', active: true, periods: [{ start: '00:00', end: '00:00' }] },
      { day: 'Sex', active: true, periods: [{ start: '00:00', end: '00:00' }] },
      { day: 'Sáb', active: false, periods: [{ start: '00:00', end: '00:00' }] },
    ]
  });
  const [isSaved, setIsSaved] = useState(false);
  const [copiedPeriods, setCopiedPeriods] = useState<WorkPeriod[] | null>(null);
  const [inputAvgPerHour, setInputAvgPerHour] = useState<string>('');
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);
  const [editPlan, setEditPlan] = useState<MonthlyPlan | null>(null);
  const [planFilter, setPlanFilter] = useState<'all' | 'q1' | 'q2' | 'q3' | 'q4'>('all');
  const [showFullProjection, setShowFullProjection] = useState(false);

  React.useEffect(() => {
    if (profile?.workSchedule) {
      setSimulation(prev => ({ ...prev, schedule: profile.workSchedule }));
    }
  }, [profile?.workSchedule]);

  const handleSave = () => {
    try {
      if (profile) {
        onUpdateProfile({ ...profile, workSchedule: simulation.schedule, hourlyRate: simulation.avgPerHour || averages.perHour });
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 3000);
      }
    } catch (err) {
      console.error('handleSave error:', err);
    }
  };

  const toggleDay = (index: number) => {
    const newSchedule = [...simulation.schedule];
    newSchedule[index].active = !newSchedule[index].active;
    setSimulation({ ...simulation, schedule: newSchedule });
  };

  const addPeriod = (dayIndex: number) => {
    const newSchedule = [...simulation.schedule];
    newSchedule[dayIndex].periods.push({ start: '00:00', end: '00:00' });
    setSimulation({ ...simulation, schedule: newSchedule });
  };

  const removePeriod = (dayIndex: number, periodIndex: number) => {
    const newSchedule = [...simulation.schedule];
    if (newSchedule[dayIndex].periods.length > 1) {
      newSchedule[dayIndex].periods.splice(periodIndex, 1);
      setSimulation({ ...simulation, schedule: newSchedule });
    }
  };

  const updatePeriod = (dayIndex: number, periodIndex: number, field: 'start' | 'end', value: string) => {
    const newSchedule = [...simulation.schedule];
    newSchedule[dayIndex].periods[periodIndex][field] = value;
    setSimulation({ ...simulation, schedule: newSchedule });
  };

  const copyDay = (dayIndex: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setCopiedPeriods([...simulation.schedule[dayIndex].periods.map(p => ({ ...p }))]);
  };

  const pasteDay = (dayIndex: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!copiedPeriods) return;
    const newSchedule = [...simulation.schedule];
    newSchedule[dayIndex].periods = [...copiedPeriods.map(p => ({ ...p }))];
    newSchedule[dayIndex].active = true;
    setSimulation({ ...simulation, schedule: newSchedule });
  };

  const averages = useMemo(() => {
    try {
      const now = new Date();
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);
      const monthInterval = { start: monthStart, end: monthEnd };

      const monthRides = rides.filter(r => isWithinInterval(parseISO(r.date), monthInterval));
      const monthExpenses = expenses.filter(e => isWithinInterval(parseISO(e.date), monthInterval));

      if (monthRides.length === 0) return { perHour: 0, perDay: 0, perKm: 0, expenseRatio: 0 };

      const totalValue = monthRides.reduce((acc, r) => acc + r.totalValue, 0);
      const totalKm = monthRides.reduce((acc, r) => acc + r.kmDriven, 0);
      const totalExpenses = monthExpenses.reduce((acc, e) => acc + e.value, 0);

      const totalHours = monthRides.reduce((acc, r) => {
        if (!r.startTime || !r.endTime) return acc;
        const start = r.startTime.split(':').map(Number);
        const end = r.endTime.split(':').map(Number);
        if (start.length < 2 || end.length < 2) return acc;

        let diff = (end[0] * 60 + end[1]) - (start[0] * 60 + start[1]);
        if (diff < 0) diff += 24 * 60;
        return acc + (diff / 60);
      }, 0);

      return {
        perHour: totalHours > 0 ? totalValue / totalHours : 0,
        perDay: totalValue / monthRides.length,
        perKm: totalKm > 0 ? totalValue / totalKm : 0,
        expenseRatio: totalValue > 0 ? totalExpenses / totalValue : 0
      };
    } catch (err) {
      console.error('averages error:', err);
      return { perHour: 0, perDay: 0, perKm: 0, expenseRatio: 0 };
    }
  }, [rides, expenses]);

  const simulationStats = useMemo(() => {
    try {
      let totalHoursPerWeek = 0;
      let activeDays = 0;

      simulation.schedule.forEach(day => {
        if (day.active && day.periods) {
          activeDays++;
          day.periods.forEach(period => {
            if (!period.start || !period.end) return;
            const start = period.start.split(':').map(Number);
            const end = period.end.split(':').map(Number);
            if (start.length < 2 || end.length < 2) return;

            let diff = (end[0] * 60 + end[1]) - (start[0] * 60 + start[1]);
            if (diff < 0) diff += 24 * 60;
            totalHoursPerWeek += (diff / 60);
          });
        }
      });

      const hourlyRate = simulation.avgPerHour || averages.perHour;
      const weeklyEarnings = hourlyRate * totalHoursPerWeek;
      const monthlyEarnings = weeklyEarnings * 4;
      const dailyEarnings = activeDays > 0 ? weeklyEarnings / activeDays : 0;

      const annualFixedCosts = (profile?.ipvaValue || 0) + (profile?.licensingValue || 0);
      const monthlyFixedCosts = (annualFixedCosts / 12) + (profile?.insuranceValue || 0);
      const weeklyFixedCosts = monthlyFixedCosts / 4;

      const varWeeklyExpenses = weeklyEarnings * averages.expenseRatio;
      const varMonthlyExpenses = monthlyEarnings * averages.expenseRatio;

      const totalWeeklyExpenses = varWeeklyExpenses + weeklyFixedCosts;
      const totalMonthlyExpenses = varMonthlyExpenses + monthlyFixedCosts;

      return {
        totalHoursPerWeek, activeDays, daily: dailyEarnings, weekly: weeklyEarnings, monthly: monthlyEarnings,
        weeklyNet: weeklyEarnings - totalWeeklyExpenses, monthlyNet: monthlyEarnings - totalMonthlyExpenses,
        estimatedExpenses: totalMonthlyExpenses, estimatedWeeklyExpenses: totalWeeklyExpenses,
        fixedMonthly: monthlyFixedCosts, fixedWeekly: weeklyFixedCosts
      };
    } catch (err) {
      console.error('simulationStats error:', err);
      return { totalHoursPerWeek: 0, activeDays: 0, daily: 0, weekly: 0, monthly: 0, weeklyNet: 0, monthlyNet: 0, estimatedExpenses: 0, estimatedWeeklyExpenses: 0, fixedMonthly: 0, fixedWeekly: 0 };
    }
  }, [simulation, averages, profile]);

  const insights = useMemo(() => {
    try {
      if (rides.length === 0) return null;
      const dayStats: Record<number, { totalValue: number, totalRides: number, count: number }> = {};
      rides.forEach(r => {
        const day = parseISO(r.date).getDay();
        if (!dayStats[day]) dayStats[day] = { totalValue: 0, totalRides: 0, count: 0 };
        dayStats[day].totalValue += r.totalValue;
        dayStats[day].totalRides += r.numRides;
        dayStats[day].count += 1;
      });
      const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
      let bestMoneyDay = -1, maxAvgMoney = 0, bestRidesDay = -1, maxAvgRides = 0;
      Object.entries(dayStats).forEach(([day, stats]) => {
        const avgMoney = stats.totalValue / stats.count;
        const avgRides = stats.totalRides / stats.count;
        if (avgMoney > maxAvgMoney) { maxAvgMoney = avgMoney; bestMoneyDay = Number(day); }
        if (avgRides > maxAvgRides) { maxAvgRides = avgRides; bestRidesDay = Number(day); }
      });
      return { bestMoneyDay: dayNames[bestMoneyDay], maxAvgMoney, bestRidesDay: dayNames[bestRidesDay], maxAvgRides };
    } catch (err) {
      console.error('insights error:', err);
      return null;
    }
  }, [rides]);

  const userAverages = useMemo(() => {
    try {
      const now = new Date();
      const threeMonthsAgo = addMonths(now, -3);
      const interval = { start: startOfMonth(threeMonthsAgo), end: endOfMonth(now) };
      const recentRides = rides.filter(r => isWithinInterval(parseISO(r.date), interval));
      const recentExpenses = expenses.filter(e => isWithinInterval(parseISO(e.date), interval));
      const totalEarnings = recentRides.reduce((acc, r) => acc + r.totalValue, 0);
      const totalKm = recentRides.reduce((acc, r) => acc + r.kmDriven, 0);
      const totalDays = new Set(recentRides.map(r => r.date.split('T')[0])).size;
      const totalFuel = recentExpenses.filter(e => e.type === 'combustivel').reduce((acc, e) => acc + e.value, 0);
      const totalMaint = recentExpenses.filter(e => e.type === 'manutencao').reduce((acc, e) => acc + e.value, 0);
      const avgDayEarnings = totalDays > 0 ? totalEarnings / totalDays : 0;
      const avgDayKm = totalDays > 0 ? totalKm / totalDays : 0;
      const avgDayFuel = totalDays > 0 ? totalFuel / totalDays : 0;
      const avgDayMaint = totalDays > 0 ? totalMaint / totalDays : 0;
      const totalHours = recentRides.reduce((acc, r) => {
        if (!r.startTime || !r.endTime) return acc;
        const [sH, sM] = r.startTime.split(':').map(Number);
        const [eH, eM] = r.endTime.split(':').map(Number);
        if (isNaN(sH)) return acc;
        let diff = (eH * 60 + eM) - (sH * 60 + sM);
        if (diff < 0) diff += 24 * 60;
        return acc + diff / 60;
      }, 0);
      return {
        earningsPerDay: avgDayEarnings, kmPerDay: avgDayKm, fuelPerDay: avgDayFuel, maintPerDay: avgDayMaint,
        hoursPerDay: totalHours > 0 && totalDays > 0 ? totalHours / totalDays : 0
      };
    } catch (err) {
      console.error('userAverages error:', err);
      return { earningsPerDay: 0, kmPerDay: 0, fuelPerDay: 0, maintPerDay: 0, hoursPerDay: 0 };
    }
  }, [rides, expenses]);

  const monthLabels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const fullMonthLabels = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const yearMonths = Array.from({ length: 12 }, (_, i) => ({
    key: `${currentYear}-${String(i + 1).padStart(2, '0')}`,
    label: monthLabels[i],
    fullLabel: fullMonthLabels[i],
    year: currentYear,
    month: i,
    start: new Date(currentYear, i, 1),
    end: endOfMonth(new Date(currentYear, i, 1)),
    isPast: i < currentMonth,
    isCurrent: i === currentMonth
  }));

  const filteredMonths = planFilter === 'all' ? yearMonths
    : planFilter === 'q1' ? yearMonths.slice(0, 3)
    : planFilter === 'q2' ? yearMonths.slice(3, 6)
    : planFilter === 'q3' ? yearMonths.slice(6, 9)
    : yearMonths.slice(9, 12);

  const computeMonthStats = (ym: { year: number; month: number; key: string }) => {
    const plan = plans.find(p => p.month === ym.key);
    let workDays = 0;
    let totalHours = 0;
    const daysInMonth = new Date(ym.year, ym.month + 1, 0).getDate();
    const schedule = plan?.days || profile?.workSchedule;
    const vacations = plan?.vacations || [];

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(ym.year, ym.month, d);
      const dayName = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][date.getDay()];
      const dateStr = format(date, 'yyyy-MM-dd');
      if (isVacationDay(vacations, dateStr)) continue;
      const schedDay = schedule?.find(sd => sd.day === dayName);
      if (schedDay?.active && schedDay.periods) {
        workDays++;
        schedDay.periods.forEach(p => {
          if (!p.start || !p.end) return;
          const [sH, sM] = p.start.split(':').map(Number);
          const [eH, eM] = p.end.split(':').map(Number);
          let diff = (eH * 60 + eM) - (sH * 60 + sM);
          if (diff < 0) diff += 24 * 60;
          totalHours += diff / 60;
        });
      }
    }

    const hourlyRate = plan?.customHourlyRate ?? profile?.hourlyRate ?? averages.perHour ?? 0;
    const earnings = totalHours * hourlyRate;
    const fuelCost = plan?.customFuelCost ?? workDays * userAverages.fuelPerDay;
    const maintCost = plan?.customMaintCost ?? workDays * userAverages.maintPerDay;
    const annualFixedCosts = (profile?.ipvaValue || 0) + (profile?.licensingValue || 0);
    const monthlyFixedCosts = (annualFixedCosts / 12) + (profile?.insuranceValue || 0) + (profile?.vehicleInstallmentValue || 0);

    return { workDays, totalHours, earnings, fuelCost, maintCost, fixedCosts: monthlyFixedCosts, totalExpenses: fuelCost + maintCost + monthlyFixedCosts, netProfit: earnings - fuelCost - maintCost - monthlyFixedCosts, km: workDays * userAverages.kmPerDay, daysInMonth };
  };

  const getRealMonthData = (ym: { year: number; month: number }) => {
    const mStart = startOfMonth(new Date(ym.year, ym.month, 1));
    const mEnd = endOfMonth(new Date(ym.year, ym.month, 1));
    const interval = { start: mStart, end: mEnd };
    const monthRides = rides.filter(r => isWithinInterval(parseISO(r.date), interval));
    const monthExpenses = expenses.filter(e => isWithinInterval(parseISO(e.date), interval));
    const earnings = monthRides.reduce((acc, r) => acc + r.totalValue, 0);
    const fuelCost = monthExpenses.filter(e => e.type === 'combustivel').reduce((acc, e) => acc + e.value, 0);
    const maintCost = monthExpenses.filter(e => e.type === 'manutencao').reduce((acc, e) => acc + e.value, 0);
    const otherCost = monthExpenses.filter(e => e.type !== 'combustivel' && e.type !== 'manutencao').reduce((acc, e) => acc + e.value, 0);
    const totalExpenses = monthExpenses.reduce((acc, e) => acc + e.value, 0);
    const rideDays = monthRides.length;
    return { earnings, fuelCost, maintCost, otherCost, totalExpenses, netProfit: earnings - totalExpenses, rideDays, hasData: monthRides.length > 0 || monthExpenses.length > 0 };
  };

  const yearEndProjection = useMemo(() => {
    try {
      const futureMonths = yearMonths.filter(ym => ym.month > currentMonth);
      if (futureMonths.length === 0) return null;
      return futureMonths.reduce((acc, ym) => {
        const stats = computeMonthStats(ym);
        acc.totalWorkDays += stats.workDays;
        acc.totalHours += stats.totalHours;
        acc.earnings += stats.earnings;
        acc.km += stats.km;
        acc.fuelCost += stats.fuelCost;
        acc.maintCost += stats.maintCost;
        acc.fixedCosts += stats.fixedCosts;
        return acc;
      }, { totalWorkDays: 0, totalHours: 0, earnings: 0, km: 0, fuelCost: 0, maintCost: 0, fixedCosts: 0 });
    } catch {
      return null;
    }
  }, [yearMonths, plans, profile, averages, userAverages, currentMonth]);

  const fullYearProjection = useMemo(() => {
    try {
      return filteredMonths.reduce((acc, ym) => {
        const stats = computeMonthStats(ym);
        acc.totalWorkDays += stats.workDays;
        acc.totalHours += stats.totalHours;
        acc.earnings += stats.earnings;
        acc.km += stats.km;
        acc.fuelCost += stats.fuelCost;
        acc.maintCost += stats.maintCost;
        acc.fixedCosts += stats.fixedCosts;
        return acc;
      }, { totalWorkDays: 0, totalHours: 0, earnings: 0, km: 0, fuelCost: 0, maintCost: 0, fixedCosts: 0 });
    } catch {
      return { totalWorkDays: 0, totalHours: 0, earnings: 0, km: 0, fuelCost: 0, maintCost: 0, fixedCosts: 0 };
    }
  }, [filteredMonths, plans, profile, averages, userAverages]);

  const renderProjectionCards = (proj: { totalWorkDays: number; totalHours: number; earnings: number; km: number; fuelCost: number; maintCost: number; fixedCosts: number }) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-100 dark:border-emerald-900/30">
        <p className="text-[10px] text-emerald-600 font-bold uppercase">Ganhos</p>
        <p className="text-lg font-bold dark:text-white">R$ {proj.earnings.toFixed(0)}</p>
      </div>
      <div className="p-3 bg-rose-50 dark:bg-rose-950/30 rounded-2xl border border-rose-100 dark:border-rose-900/30">
        <p className="text-[10px] text-rose-600 font-bold uppercase">Gastos</p>
        <p className="text-lg font-bold dark:text-white">R$ {(proj.fuelCost + proj.maintCost + proj.fixedCosts).toFixed(0)}</p>
        <p className="text-[8px] text-slate-400">comb+manut+fixos</p>
      </div>
      <div className="p-3 bg-brand-50 dark:bg-brand-950/30 rounded-2xl border border-brand-100 dark:border-brand-900/30">
        <p className="text-[10px] text-brand-600 font-bold uppercase">Lucro</p>
        <p className="text-lg font-bold dark:text-white">R$ {(proj.earnings - proj.fuelCost - proj.maintCost - proj.fixedCosts).toFixed(0)}</p>
      </div>
      <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-2xl border border-blue-100 dark:border-blue-900/30">
        <p className="text-[10px] text-blue-600 font-bold uppercase">KM</p>
        <p className="text-lg font-bold dark:text-white">{proj.km.toFixed(0)}</p>
      </div>
      <div className="p-3 bg-orange-50 dark:bg-orange-950/30 rounded-2xl border border-orange-100 dark:border-orange-900/30">
        <p className="text-[10px] text-orange-600 font-bold uppercase">Combustível</p>
        <p className="text-lg font-bold dark:text-white">R$ {proj.fuelCost.toFixed(0)}</p>
      </div>
      <div className="p-3 bg-purple-50 dark:bg-purple-950/30 rounded-2xl border border-purple-100 dark:border-purple-900/30">
        <p className="text-[10px] text-purple-600 font-bold uppercase">Manutenção</p>
        <p className="text-lg font-bold dark:text-white">R$ {proj.maintCost.toFixed(0)}</p>
      </div>
      <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
        <p className="text-[10px] text-slate-500 font-bold uppercase">Custos Fixos</p>
        <p className="text-lg font-bold dark:text-white">R$ {proj.fixedCosts.toFixed(0)}</p>
        <p className="text-[8px] text-slate-400">IPVA+seguro+parcela</p>
      </div>
      <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
        <p className="text-[10px] text-slate-500 font-bold uppercase">Horas</p>
        <p className="text-lg font-bold dark:text-white">{proj.totalHours.toFixed(0)}h</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-brand-600 flex items-center justify-center text-white shadow-lg shadow-brand-200 dark:shadow-none">
            <Calendar size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Agenda & Simulação</h2>
            <p className="text-slate-500 dark:text-slate-400">Planeje seus horários e projete seus ganhos e gastos.</p>
          </div>
        </div>
        <button onClick={handleSave} className={cn("px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg", isSaved ? "bg-emerald-600 text-white shadow-emerald-100" : "bg-brand-600 hover:bg-brand-700 text-white shadow-brand-100 dark:shadow-none")}>
          {isSaved ? (<><CheckCircle2 size={20} /> Salvo!</>) : (<><Save size={20} /> Salvar Escala</>)}
        </button>
      </div>

      <div className={cn("grid grid-cols-1 lg:grid-cols-4 gap-8", sidebarCollapsed && "lg:grid-cols-5")}>
        <div className={cn("lg:col-span-3 space-y-8", sidebarCollapsed && "lg:col-span-4")}>
          <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
            <h3 className="text-lg font-bold mb-6 dark:text-white flex items-center gap-2">
              <Calculator size={20} className="text-brand-600" /> Simulador de Ganhos e Gastos
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div className="space-y-6">
                <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800">
                  <p className="text-xs font-bold text-slate-400 uppercase mb-4 tracking-wider">Resumo da Escala</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div><p className="text-sm font-medium text-slate-500 dark:text-slate-400">Dias Ativos</p><p className="text-2xl font-bold text-brand-600">{simulationStats.activeDays} dias/sem</p></div>
                    <div><p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Horas</p><p className="text-2xl font-bold text-brand-600">{simulationStats.totalHoursPerWeek.toFixed(1)}h/sem</p></div>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Ganhos por Hora (R$)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">R$</span>
                    <input type="number" value={inputAvgPerHour} onChange={(e) => { const val = e.target.value; setInputAvgPerHour(val); setSimulation({ ...simulation, avgPerHour: Number(val) || 0 }); }} className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 dark:text-white" placeholder={averages.perHour.toFixed(2)} />
                  </div>
                  <p className="text-xs text-slate-500 flex items-center gap-1"><Info size={12} /> Sua média real é R$ {averages.perHour.toFixed(2)}/h</p>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2"><div className="h-px flex-1 bg-slate-100 dark:bg-slate-800"></div><span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Projeção Semanal</span><div className="h-px flex-1 bg-slate-100 dark:bg-slate-800"></div></div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/10 rounded-2xl border border-emerald-100/50 dark:border-emerald-900/20"><p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase mb-1">Ganhos Semanais</p><p className="text-lg font-bold text-slate-900 dark:text-white">R$ {simulationStats.weekly.toFixed(2)}</p></div>
                <div className="p-4 bg-rose-50/50 dark:bg-rose-950/10 rounded-2xl border border-rose-100/50 dark:border-rose-900/20">
                  <div className="flex items-center justify-between mb-1"><p className="text-[10px] text-rose-600 dark:text-rose-400 font-bold uppercase">Gastos Semanais</p><div className="group relative"><Info size={12} className="text-rose-400 cursor-help" /><div className="absolute bottom-full right-0 mb-2 w-56 p-3 bg-slate-800 text-white text-[10px] rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl leading-relaxed"><p className="font-bold mb-1 border-b border-slate-700 pb-1">Composição Semanal:</p><div className="flex justify-between mb-1"><span>Custos Fixos:</span><span className="font-bold">R$ {simulationStats.fixedWeekly.toFixed(2)}</span></div><div className="flex justify-between"><span>Variáveis:</span><span className="font-bold">R$ {(simulationStats.weekly * averages.expenseRatio).toFixed(2)}</span></div></div></div></div>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">R$ {simulationStats.estimatedWeeklyExpenses.toFixed(2)}</p>
                </div>
                <div className="p-4 bg-brand-50 dark:bg-brand-950/20 rounded-2xl border border-brand-100 dark:border-brand-900/30"><p className="text-[10px] text-brand-600 dark:text-brand-400 font-bold uppercase mb-1">Lucro Semanal</p><p className="text-lg font-bold text-brand-700 dark:text-brand-300">R$ {simulationStats.weeklyNet.toFixed(2)}</p></div>
              </div>
              <div className="flex items-center gap-2 mt-6 mb-2"><div className="h-px flex-1 bg-slate-100 dark:bg-slate-800"></div><span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Projeção Mensal (4 sem)</span><div className="h-px flex-1 bg-slate-100 dark:bg-slate-800"></div></div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 bg-emerald-50 dark:bg-emerald-950/30 rounded-3xl border border-emerald-100 dark:border-emerald-900/30"><p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider mb-1">Ganhos Mensais</p><p className="text-2xl font-bold text-slate-900 dark:text-white">R$ {simulationStats.monthly.toFixed(2)}</p></div>
                <div className="p-6 bg-rose-50 dark:bg-rose-950/30 rounded-3xl border border-rose-100 dark:border-rose-900/30">
                  <div className="flex items-center justify-between mb-1"><p className="text-xs text-rose-600 dark:text-rose-400 font-bold uppercase tracking-wider">Gastos Mensais</p><div className="group relative"><Info size={14} className="text-rose-400 cursor-help" /><div className="absolute bottom-full right-0 mb-2 w-64 p-3 bg-slate-800 text-white text-[10px] rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl leading-relaxed"><p className="font-bold mb-1 border-b border-slate-700 pb-1">Composição dos Gastos Mensais:</p><div className="flex justify-between mb-1"><span>Custos Fixos (IPVA/Seguro/Lic.):</span><span className="font-bold">R$ {simulationStats.fixedMonthly.toFixed(2)}</span></div><div className="flex justify-between"><span>Gastos Variáveis (Histórico):</span><span className="font-bold">R$ {(simulationStats.monthly * averages.expenseRatio).toFixed(2)}</span></div><p className="mt-2 text-[9px] text-slate-400 italic">Os gastos variáveis são baseados na sua média histórica.</p></div></div></div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">R$ {simulationStats.estimatedExpenses.toFixed(2)}</p>
                </div>
                <div className="p-6 bg-brand-600 rounded-3xl shadow-lg shadow-brand-200 dark:shadow-none"><p className="text-xs text-brand-100 font-bold uppercase tracking-wider mb-1">Lucro Mensal</p><p className="text-2xl font-bold text-white">R$ {simulationStats.monthlyNet.toFixed(2)}</p></div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between"><h3 className="text-lg font-bold dark:text-white">Agenda de Trabalho</h3><p className="text-xs text-slate-500">Clique no dia para ativar/desativar</p></div>
            <div className="grid grid-cols-7 gap-3">
              {simulation.schedule.map((item, i) => (
                <div key={item.day} className={cn("relative p-4 rounded-2xl border-2 transition-all cursor-pointer group", item.active ? "bg-white dark:bg-slate-900 border-brand-500 shadow-lg shadow-brand-100 dark:shadow-none" : "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 opacity-60")} onClick={() => toggleDay(i)}>
                  <div className="text-center mb-3">
                    <p className={cn("text-sm font-bold", item.active ? "text-brand-600" : "text-slate-400")}>{item.day}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">{item.active ? 'Ativo' : 'Folga'}</p>
                    <div className="flex justify-center gap-2 mt-2">
                      <button onClick={(e) => copyDay(i, e)} title="Copiar escala" className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors text-slate-400 hover:text-brand-600"><Copy size={12} /></button>
                      {copiedPeriods && <button onClick={(e) => pasteDay(i, e)} title="Colar escala" className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors text-slate-400 hover:text-emerald-600"><ClipboardCheck size={12} /></button>}
                    </div>
                  </div>
                  <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                    {item.active ? (<>
                      <div className="space-y-2">{(item.periods || []).map((period, pIdx) => (<div key={pIdx} className="space-y-1"><div className="flex items-center justify-between"><span className="text-[10px] font-bold text-slate-400 uppercase">Turno {pIdx + 1}</span>{(item.periods || []).length > 1 && <button onClick={() => removePeriod(i, pIdx)} className="text-rose-500 hover:text-rose-600"><Trash2 size={10} /></button>}</div><div className="flex flex-col gap-1"><input type="time" value={period.start} onChange={(e) => updatePeriod(i, pIdx, 'start', e.target.value)} className="text-[10px] font-bold bg-slate-50 dark:bg-slate-800 p-1 rounded border border-slate-200 dark:border-slate-700 dark:text-white outline-none focus:ring-1 focus:ring-brand-500" /><input type="time" value={period.end} onChange={(e) => updatePeriod(i, pIdx, 'end', e.target.value)} className="text-[10px] font-bold bg-slate-50 dark:bg-slate-800 p-1 rounded border border-slate-200 dark:border-slate-700 dark:text-white outline-none focus:ring-1 focus:ring-brand-500" /></div></div>))}</div>
                      <button onClick={() => addPeriod(i)} className="w-full mt-2 py-1 flex items-center justify-center gap-1 bg-brand-50 dark:bg-brand-950/30 text-brand-600 rounded-lg border border-brand-100 dark:border-brand-900/30 hover:bg-brand-100 transition-colors text-[10px] font-bold"><Plus size={10} /> Novo</button>
                    </>) : (<div className="h-20 flex items-center justify-center"><X size={20} className="text-slate-200 dark:text-slate-700" /></div>)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className={cn("space-y-8", sidebarCollapsed && "lg:min-w-[280px]")}>
          {insights && (
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm min-w-[240px] relative">
              <div className="flex items-center justify-between mb-4"><div className="flex items-center gap-2 text-brand-600"><Sparkles size={20} /><h4 className="font-bold text-base">Insights Reais</h4></div><InfoTooltip content="Análise baseada em seus dados reais." /></div>
              <div className="space-y-4">
                <div className="space-y-1"><p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Melhor dia para faturamento</p><p className="text-base font-bold text-slate-900 dark:text-white">{insights.bestMoneyDay}</p><p className="text-xs text-emerald-600 font-medium">Média de R$ {insights.maxAvgMoney.toFixed(2)}/dia</p></div>
                <div className="space-y-1"><p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Dia com mais solicitações</p><p className="text-base font-bold text-slate-900 dark:text-white">{insights.bestRidesDay}</p><p className="text-xs text-blue-600 font-medium">Média de {insights.maxAvgRides.toFixed(1)} corridas/dia</p></div>
              </div>
            </div>
          )}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm min-w-[240px] relative">
            <div className="flex items-center justify-between mb-4"><h3 className="text-base font-bold dark:text-white">Suas Médias Reais</h3><InfoTooltip content="Médias calculadas com base em todo o seu histórico." /></div>
            <div className="space-y-4">
              <div className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 flex items-center justify-center"><TrendingUp size={18} /></div><span className="text-sm font-medium text-slate-600 dark:text-slate-400">Por Hora</span></div><span className="font-bold dark:text-white">R$ {averages.perHour.toFixed(2)}</span></div>
              <div className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-600 flex items-center justify-center"><Calendar size={18} /></div><span className="text-sm font-medium text-slate-600 dark:text-slate-400">Por Dia</span></div><span className="font-bold dark:text-white">R$ {averages.perDay.toFixed(2)}</span></div>
              <div className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/30 text-purple-600 flex items-center justify-center"><MapPin size={20} /></div><span className="text-sm font-medium text-slate-600 dark:text-slate-400">Por KM</span></div><span className="font-bold dark:text-white">R$ {averages.perKm.toFixed(2)}</span></div>
              <div className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-600 flex items-center justify-center"><DollarSign size={20} /></div><span className="text-sm font-medium text-slate-600 dark:text-slate-400">Gasto/Ganho</span></div><span className="font-bold dark:text-white">{(averages.expenseRatio * 100).toFixed(0)}%</span></div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div><h3 className="text-lg font-bold dark:text-white">Planejamento Anual</h3><p className="text-xs text-slate-400">Planeje seus meses, férias e projete seus resultados</p></div>
          <div className="flex gap-1.5">
            {(['all', 'q1', 'q2', 'q3', 'q4'] as const).map(f => (
              <button key={f} onClick={() => setPlanFilter(f)} className={cn("px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all", planFilter === f ? "bg-brand-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200")}>
                {f === 'all' ? 'Ano' : f === 'q1' ? '1º Tri' : f === 'q2' ? '2º Tri' : f === 'q3' ? '3º Tri' : '4º Tri'}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {filteredMonths.map(ym => {
            const plan = plans.find(p => p.month === ym.key);
            const isExpanded = expandedMonth === ym.key;
            const stats = computeMonthStats(ym);
            const realData = ym.isPast || ym.isCurrent ? getRealMonthData(ym) : null;
            const feriasCount = plan?.vacations?.filter(v => v.type === 'ferias').length || 0;
            const folgaCount = plan?.vacations?.filter(v => v.type === 'folga').length || 0;
            const displayEarnings = realData?.hasData ? realData.earnings : (plan?.actualEarnings ?? stats.earnings);
            const displayFuel = realData?.hasData ? realData.fuelCost : (plan?.actualFuelCost ?? stats.fuelCost);
            const displayMaint = realData?.hasData ? realData.maintCost : (plan?.actualMaintCost ?? stats.maintCost);
            const displayFixed = stats.fixedCosts;
            const displayOther = realData?.hasData ? realData.otherCost : (plan?.actualOtherCost ?? 0);
            const displayProfit = displayEarnings - displayFuel - displayMaint - displayFixed - displayOther;

            return (
              <div key={ym.key} className={cn("rounded-2xl border transition-all", isExpanded ? "col-span-2 sm:col-span-3 md:col-span-4" : "", plan ? "border-brand-200 dark:border-brand-900/30 bg-brand-50/30 dark:bg-brand-950/10" : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900")}>
                {isExpanded ? (
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-bold dark:text-white">{ym.fullLabel} {ym.year}</h4>
                      <button onClick={() => { setExpandedMonth(null); setEditPlan(null); }} className="p-1 text-slate-400 hover:text-slate-600"><X size={16} /></button>
                    </div>
                    {editPlan ? (
                      <EditPlanForm plan={editPlan} monthKey={ym.key} monthLabel={ym.label} profile={profile} userAverages={userAverages} averages={averages} isPast={ym.isPast} realData={realData} onSave={(updated) => { try { if (plan) { onUpdatePlan?.(updated); } else { onAddPlan?.(updated); } } catch (err) { console.error('[Agenda] onSave plan error:', err); } setExpandedMonth(null); setEditPlan(null); }} onCancel={() => { setExpandedMonth(null); setEditPlan(null); }} />
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-slate-500 text-sm mb-4">Nenhum plano criado para {ym.label}.</p>
                        <button onClick={() => { const template: MonthlyPlan = { id: crypto.randomUUID(), month: ym.key, days: profile?.workSchedule ? profile.workSchedule.map(d => ({ ...d, periods: (d.periods || []).map(p => ({ ...p })) })) : [], vacations: [] }; setEditPlan(template); }} className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold rounded-xl transition-all">Criar plano do Perfil</button>
                        <button onClick={() => { const empty: MonthlyPlan = { id: crypto.randomUUID(), month: ym.key, days: [ { day: 'Dom', active: false, periods: [{ start: '00:00', end: '00:00' }] }, { day: 'Seg', active: false, periods: [{ start: '00:00', end: '00:00' }] }, { day: 'Ter', active: false, periods: [{ start: '00:00', end: '00:00' }] }, { day: 'Qua', active: false, periods: [{ start: '00:00', end: '00:00' }] }, { day: 'Qui', active: false, periods: [{ start: '00:00', end: '00:00' }] }, { day: 'Sex', active: false, periods: [{ start: '00:00', end: '00:00' }] }, { day: 'Sáb', active: false, periods: [{ start: '00:00', end: '00:00' }] }, ], vacations: [] }; setEditPlan(empty); }} className="ml-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-sm font-bold rounded-xl hover:bg-slate-200 transition-all">Começar do zero</button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4 cursor-pointer hover:shadow-md transition-all" onClick={() => { setExpandedMonth(ym.key); setEditPlan(plan ? { ...plan, days: (plan.days || []).map(d => ({ ...d, periods: (d.periods || []).map(p => ({ ...p })) })), vacations: [...(plan.vacations || [])] } : null); }}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold dark:text-white">{ym.label}</span>
                        {ym.isCurrent && <span className="text-[8px] font-bold text-brand-600 bg-brand-50 dark:bg-brand-950/30 px-1.5 py-0.5 rounded uppercase">Atual</span>}
                        {ym.isPast && realData?.hasData && <span className="text-[8px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-1.5 py-0.5 rounded uppercase">Real</span>}
                      </div>
                      {plan && onDeletePlan && <button onClick={(e) => { e.stopPropagation(); onDeletePlan(plan.id); }} className="p-1 text-slate-300 hover:text-rose-500 transition-all"><Trash2 size={12} /></button>}
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] text-slate-500">{stats.daysInMonth}d no mês &middot; {stats.workDays}d trabalho &middot; {stats.totalHours.toFixed(0)}h</p>
                      <p className="text-[10px] text-emerald-600 font-bold">R$ {displayEarnings.toFixed(0)} ganhos</p>
                      <p className="text-[10px] text-orange-600">Comb: R$ {displayFuel.toFixed(0)} &middot; Manut: R$ {displayMaint.toFixed(0)}</p>
                      <p className="text-[10px] text-slate-400">Fixos: R$ {displayFixed.toFixed(0)}{displayOther > 0 ? ` + Outros: R$ ${displayOther.toFixed(0)}` : ''}</p>
                      <p className={cn("text-[10px] font-bold", displayProfit >= 0 ? "text-brand-600" : "text-rose-600")}>
                        Lucro: R$ {displayProfit.toFixed(0)}
                      </p>
                      {(feriasCount > 0 || folgaCount > 0) && (
                        <div className="flex gap-2 mt-0.5">
                          {feriasCount > 0 && <span className="text-[9px] font-bold text-orange-600 bg-orange-50 dark:bg-orange-950/30 px-1.5 py-0.5 rounded">{feriasCount}d férias</span>}
                          {folgaCount > 0 && <span className="text-[9px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/30 px-1.5 py-0.5 rounded">{folgaCount}d folga</span>}
                        </div>
                      )}
                      {!plan && <p className="text-[9px] text-slate-400 mt-1">Não planejado</p>}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {(filteredMonths.some(ym => plans.find(p => p.month === ym.key)) || planFilter !== 'all') && (
          <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-sm font-bold dark:text-white flex items-center gap-2"><TrendingUp size={14} /> Projeção até Dezembro</h4>
                <p className="text-[10px] text-slate-400">Meses futuros (a partir do próximo mês)</p>
              </div>
              <button onClick={() => setShowFullProjection(!showFullProjection)} className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-bold rounded-lg hover:bg-slate-200 transition-all">
                {showFullProjection ? <><ChevronUp size={12} /> Apenas futuros</> : <><ChevronDown size={12} /> Ver ano completo</>}
              </button>
            </div>

            {yearEndProjection && !showFullProjection && (
              <>
                {renderProjectionCards(yearEndProjection)}
                <div className="mt-3 flex flex-wrap gap-4 text-[10px] text-slate-500">
                  <span>{yearEndProjection.totalWorkDays} dias trabalhados</span>
                  <span>{yearEndProjection.totalHours.toFixed(1)} horas totais</span>
                  <span>R$ {profile?.hourlyRate?.toFixed(2) || averages.perHour.toFixed(2)}/h</span>
                </div>
              </>
            )}

            {showFullProjection && (
              <>
                <p className="text-[10px] text-slate-400 mb-3">Projeção {planFilter === 'all' ? 'anual' : planFilter?.toUpperCase()} completa (todos os meses filtrados)</p>
                {renderProjectionCards(fullYearProjection)}
                <div className="mt-3 flex flex-wrap gap-4 text-[10px] text-slate-500">
                  <span>{fullYearProjection.totalWorkDays} dias trabalhados</span>
                  <span>{fullYearProjection.totalHours.toFixed(1)} horas totais</span>
                  <span>R$ {profile?.hourlyRate?.toFixed(2) || averages.perHour.toFixed(2)}/h</span>
                  <span>Médias baseadas nos últimos 3 meses de dados reais</span>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function EditPlanForm({ plan, monthKey, monthLabel, onSave, onCancel, profile, userAverages, averages, isPast, realData }: {
  plan: MonthlyPlan;
  monthKey: string;
  monthLabel: string;
  onSave: (plan: MonthlyPlan) => void;
  onCancel: () => void;
  profile?: UserProfile | null;
  userAverages: { earningsPerDay: number; kmPerDay: number; fuelPerDay: number; maintPerDay: number; hoursPerDay: number };
  averages: { perHour: number; perDay: number; perKm: number; expenseRatio: number };
  isPast?: boolean;
  realData?: { earnings: number; fuelCost: number; maintCost: number; otherCost: number; totalExpenses: number; netProfit: number; rideDays: number; hasData: boolean } | null;
}) {
  const [localPlan, setLocalPlan] = useState<MonthlyPlan>(plan);

  const defaultHourlyRate = profile?.hourlyRate || averages.perHour || 0;

  const monthProjection = useMemo(() => {
    try {
      const [yr, mo] = monthKey.split('-').map(Number);
      const daysInMonth = new Date(yr, mo, 0).getDate();
      let workDays = 0;
      let totalHours = 0;

      for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(yr, mo - 1, d);
        const dayName = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][date.getDay()];
        const dateStr = format(date, 'yyyy-MM-dd');
        if (isVacationDay(localPlan.vacations || [], dateStr)) continue;
        const schedDay = (localPlan.days || []).find(sd => sd.day === dayName);
        if (schedDay?.active && schedDay.periods) {
          workDays++;
          schedDay.periods.forEach(p => {
            if (!p.start || !p.end) return;
            const [sH, sM] = p.start.split(':').map(Number);
            const [eH, eM] = p.end.split(':').map(Number);
            let diff = (eH * 60 + eM) - (sH * 60 + sM);
            if (diff < 0) diff += 24 * 60;
            totalHours += diff / 60;
          });
        }
      }

      const hourlyRate = localPlan.customHourlyRate ?? defaultHourlyRate;
      const earnings = totalHours * hourlyRate;
      const fuelCost = localPlan.customFuelCost ?? (workDays * userAverages.fuelPerDay);
      const maintCost = localPlan.customMaintCost ?? (workDays * userAverages.maintPerDay);
      const annualFixedCosts = (profile?.ipvaValue || 0) + (profile?.licensingValue || 0);
      const monthlyFixedCosts = (annualFixedCosts / 12) + (profile?.insuranceValue || 0) + (profile?.vehicleInstallmentValue || 0);
      const totalExpenses = fuelCost + maintCost + monthlyFixedCosts;

      return { workDays, totalHours, earnings, fuelCost, maintCost, fixedCosts: monthlyFixedCosts, totalExpenses, netProfit: earnings - totalExpenses, km: workDays * userAverages.kmPerDay };
    } catch {
      return { workDays: 0, totalHours: 0, earnings: 0, fuelCost: 0, maintCost: 0, fixedCosts: 0, totalExpenses: 0, netProfit: 0, km: 0 };
    }
  }, [localPlan, monthKey, defaultHourlyRate, userAverages, profile]);

  const updateDays = (updater: (days: WorkDay[]) => WorkDay[]) => {
    setLocalPlan({ ...localPlan, days: updater(localPlan.days || []) });
  };

  const toggleDay = (idx: number) => {
    updateDays(days => days.map((d, i) => i === idx ? { ...d, active: !d.active } : d));
  };

  const toggleVacation = (dateStr: string) => {
    const vacations = localPlan.vacations || [];
    const existing = vacations.findIndex(v => v.date === dateStr);
    if (existing >= 0) {
      const entry = vacations[existing];
      if (entry.type === 'folga') {
        const updated = [...vacations];
        updated[existing] = { ...entry, type: 'ferias' };
        setLocalPlan({ ...localPlan, vacations: updated });
      } else {
        setLocalPlan({ ...localPlan, vacations: vacations.filter(v => v.date !== dateStr) });
      }
    } else {
      setLocalPlan({ ...localPlan, vacations: [...vacations, { date: dateStr, type: 'folga' }] });
    }
  };

  const removeVacation = (dateStr: string) => {
    setLocalPlan({ ...localPlan, vacations: (localPlan.vacations || []).filter(v => v.date !== dateStr) });
  };

  const copyFromProfile = () => {
    const workSchedule = profile?.workSchedule;
    if (workSchedule) {
      setLocalPlan({ ...localPlan, days: workSchedule.map((d: WorkDay) => ({ ...d, periods: (d.periods || []).map((p: WorkPeriod) => ({ ...p })) })) });
    }
  };

  const addPeriod = (dayIndex: number) => {
    updateDays(days => days.map((d, i) => i === dayIndex ? { ...d, periods: [...(d.periods || []), { start: '00:00', end: '00:00' }] } : d));
  };

  const removePeriod = (dayIndex: number, periodIndex: number) => {
    updateDays(days => days.map((d, i) => i === dayIndex && (d.periods || []).length > 1 ? { ...d, periods: (d.periods || []).filter((_, pi) => pi !== periodIndex) } : d));
  };

  const updatePeriod = (dayIndex: number, periodIndex: number, field: 'start' | 'end', value: string) => {
    updateDays(days => days.map((d, i) => i === dayIndex ? { ...d, periods: (d.periods || []).map((p, pi) => pi === periodIndex ? { ...p, [field]: value } : p) } : d));
  };

  const [yr, mo] = monthKey.split('-').map(Number);
  const daysInMonth = new Date(yr, mo, 0).getDate();
  const firstDayOfMonth = new Date(yr, mo - 1, 1);
  const startDayOfWeek = getDay(firstDayOfMonth);
  const weekDayNames = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < startDayOfWeek; i++) calendarDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d);
  while (calendarDays.length % 7 !== 0) calendarDays.push(null);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-7 gap-2">
        {(localPlan.days || []).map((day, i) => (
          <div key={day.day} className="space-y-2">
            <button onClick={() => toggleDay(i)} className={cn("w-full py-2 px-1 rounded-xl text-xs font-bold border transition-all", day.active ? "bg-brand-600 text-white border-brand-700" : "bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700")}>{day.day}</button>
            {day.active && (
              <div className="space-y-1" onClick={e => e.stopPropagation()}>
                {(day.periods || []).map((period, pIdx) => (
                  <div key={pIdx} className="space-y-0.5">
                    <div className="flex items-center justify-between"><span className="text-[8px] font-bold text-slate-400 uppercase">Turno {pIdx + 1}</span>{(day.periods || []).length > 1 && <button onClick={() => removePeriod(i, pIdx)} className="text-rose-500 hover:text-rose-600"><Trash2 size={8} /></button>}</div>
                    <input type="time" value={period.start} onChange={(e) => updatePeriod(i, pIdx, 'start', e.target.value)} className="w-full text-[9px] font-bold bg-slate-50 dark:bg-slate-800 p-0.5 rounded border border-slate-200 dark:border-slate-700 dark:text-white outline-none focus:ring-1 focus:ring-brand-500" />
                    <input type="time" value={period.end} onChange={(e) => updatePeriod(i, pIdx, 'end', e.target.value)} className="w-full text-[9px] font-bold bg-slate-50 dark:bg-slate-800 p-0.5 rounded border border-slate-200 dark:border-slate-700 dark:text-white outline-none focus:ring-1 focus:ring-brand-500" />
                  </div>
                ))}
                <button onClick={() => addPeriod(i)} className="w-full py-0.5 flex items-center justify-center gap-0.5 bg-brand-50 dark:bg-brand-950/30 text-brand-600 rounded border border-brand-100 dark:border-brand-900/30 hover:bg-brand-100 transition-colors text-[8px] font-bold"><Plus size={8} /> Turno</button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div>
        <p className="text-[10px] font-bold text-slate-500 uppercase mb-2 flex items-center gap-1"><Calendar size={10} /> Férias / Folgas — clique no dia para alternar</p>
        <div className="flex gap-2 mb-2">
          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-700 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded-full"><Sun size={10} /> Folga</span>
          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-orange-700 bg-orange-50 dark:bg-orange-950/30 px-2 py-0.5 rounded-full"><Palmtree size={10} /> Férias</span>
          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-slate-500">Clique: nada → folga → férias → nada</span>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {weekDayNames.map((dn, i) => (
            <div key={i} className="text-center text-[9px] font-bold text-slate-400 py-1">{dn}</div>
          ))}
          {calendarDays.map((day, i) => {
            if (day === null) return <div key={`empty-${i}`} />;
            const dateStr = format(new Date(yr, mo - 1, day), 'yyyy-MM-dd');
            const vType = getVacationType(localPlan.vacations || [], dateStr);
            const dayOfWeek = new Date(yr, mo - 1, day).getDay();
            const dayName = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][dayOfWeek];
            const schedDay = (localPlan.days || []).find(sd => sd.day === dayName);
            const isWork = schedDay?.active && !vType;
            return (
              <button
                key={day}
                onClick={() => toggleVacation(dateStr)}
                className={cn(
                  "aspect-square flex flex-col items-center justify-center rounded-lg text-[10px] font-bold border transition-all",
                  vType === 'ferias' ? "bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-800" :
                  vType === 'folga' ? "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800" :
                  isWork ? "bg-brand-50 dark:bg-brand-950/20 text-brand-600 dark:text-brand-400 border-brand-200 dark:border-brand-900/30" :
                  "bg-slate-50 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-400"
                )}
              >
                <span>{day}</span>
                {vType === 'ferias' && <Palmtree size={8} />}
                {vType === 'folga' && <Sun size={8} />}
              </button>
            );
          })}
        </div>
      </div>

      {isPast && (
        <div className="border-t border-slate-200 dark:border-slate-700 pt-4 space-y-3">
          <p className="text-[10px] font-bold text-slate-500 uppercase">Dados Reais do Mês</p>
          {realData?.hasData ? (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
              <p className="text-[10px] text-emerald-600 font-bold mb-2">Baseado em {realData.rideDays} corridas e despesas registradas</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
                <div><span className="text-slate-400">Ganhos</span><p className="font-bold dark:text-white">R$ {realData.earnings.toFixed(0)}</p></div>
                <div><span className="text-slate-400">Combustível</span><p className="font-bold dark:text-white">R$ {realData.fuelCost.toFixed(0)}</p></div>
                <div><span className="text-slate-400">Manutenção</span><p className="font-bold dark:text-white">R$ {realData.maintCost.toFixed(0)}</p></div>
                <div><span className="text-slate-400">Outros</span><p className="font-bold dark:text-white">R$ {realData.otherCost.toFixed(0)}</p></div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-[10px] text-slate-400 mb-1">Nenhum dado real registrado. Informe manualmente:</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase block mb-0.5">Ganhos (R$)</label>
                  <input type="number" step="0.01" min="0" value={localPlan.actualEarnings ?? ''} onChange={e => { const v = e.target.value === '' ? undefined : parseFloat(e.target.value); setLocalPlan({ ...localPlan, actualEarnings: isNaN(v!) ? undefined : v }); }} placeholder="0" className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none dark:text-white text-xs font-bold focus:ring-1 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase block mb-0.5">Combustível (R$)</label>
                  <input type="number" step="0.01" min="0" value={localPlan.actualFuelCost ?? ''} onChange={e => { const v = e.target.value === '' ? undefined : parseFloat(e.target.value); setLocalPlan({ ...localPlan, actualFuelCost: isNaN(v!) ? undefined : v }); }} placeholder="0" className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none dark:text-white text-xs font-bold focus:ring-1 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase block mb-0.5">Manutenção (R$)</label>
                  <input type="number" step="0.01" min="0" value={localPlan.actualMaintCost ?? ''} onChange={e => { const v = e.target.value === '' ? undefined : parseFloat(e.target.value); setLocalPlan({ ...localPlan, actualMaintCost: isNaN(v!) ? undefined : v }); }} placeholder="0" className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none dark:text-white text-xs font-bold focus:ring-1 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase block mb-0.5">Outros (R$)</label>
                  <input type="number" step="0.01" min="0" value={localPlan.actualOtherCost ?? ''} onChange={e => { const v = e.target.value === '' ? undefined : parseFloat(e.target.value); setLocalPlan({ ...localPlan, actualOtherCost: isNaN(v!) ? undefined : v }); }} placeholder="0" className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none dark:text-white text-xs font-bold focus:ring-1 focus:ring-brand-500" />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="border-t border-slate-200 dark:border-slate-700 pt-4 space-y-3">
        <p className="text-[10px] font-bold text-slate-500 uppercase">Estimativa Financeira do Mês</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Valor / hora (R$)</label>
            <input type="number" step="0.01" min="0" value={localPlan.customHourlyRate ?? (defaultHourlyRate > 0 ? defaultHourlyRate : '')} onChange={e => { const v = e.target.value === '' ? undefined : parseFloat(e.target.value); setLocalPlan({ ...localPlan, customHourlyRate: isNaN(v!) ? undefined : v }); }} placeholder={defaultHourlyRate > 0 ? defaultHourlyRate.toFixed(2) : '0'} className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none dark:text-white text-sm font-bold focus:ring-1 focus:ring-brand-500" />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Combustível (R$/mês)</label>
            <input type="number" step="0.01" min="0" value={localPlan.customFuelCost ?? ''} onChange={e => { const v = e.target.value === '' ? undefined : parseFloat(e.target.value); setLocalPlan({ ...localPlan, customFuelCost: isNaN(v!) ? undefined : v }); }} placeholder={(monthProjection.workDays * userAverages.fuelPerDay).toFixed(0)} className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none dark:text-white text-sm font-bold focus:ring-1 focus:ring-brand-500" />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Manutenção (R$/mês)</label>
            <input type="number" step="0.01" min="0" value={localPlan.customMaintCost ?? ''} onChange={e => { const v = e.target.value === '' ? undefined : parseFloat(e.target.value); setLocalPlan({ ...localPlan, customMaintCost: isNaN(v!) ? undefined : v }); }} placeholder={(monthProjection.workDays * userAverages.maintPerDay).toFixed(0)} className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none dark:text-white text-sm font-bold focus:ring-1 focus:ring-brand-500" />
          </div>
        </div>

        {(userAverages.earningsPerDay > 0 || userAverages.kmPerDay > 0) && (
          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-2 flex items-center gap-1"><Info size={10} /> Médias do seu histórico (3 meses)</p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[10px]">
              <div><span className="text-slate-400">Ganho/dia</span><p className="font-bold dark:text-white">R$ {userAverages.earningsPerDay.toFixed(0)}</p></div>
              <div><span className="text-slate-400">Horas/dia</span><p className="font-bold dark:text-white">{userAverages.hoursPerDay.toFixed(1)}h</p></div>
              <div><span className="text-slate-400">KM/dia</span><p className="font-bold dark:text-white">{userAverages.kmPerDay.toFixed(0)}</p></div>
              <div><span className="text-slate-400">Comb./dia</span><p className="font-bold dark:text-white">R$ {userAverages.fuelPerDay.toFixed(0)}</p></div>
              <div><span className="text-slate-400">Manut./dia</span><p className="font-bold dark:text-white">R$ {userAverages.maintPerDay.toFixed(0)}</p></div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-100 dark:border-emerald-900/30"><p className="text-[9px] text-emerald-600 font-bold uppercase">Ganho Estimado</p><p className="text-sm font-bold dark:text-white">R$ {monthProjection.earnings.toFixed(0)}</p><p className="text-[8px] text-slate-400">{monthProjection.workDays}d &middot; {monthProjection.totalHours.toFixed(1)}h</p></div>
          <div className="p-2.5 bg-orange-50 dark:bg-orange-950/30 rounded-xl border border-orange-100 dark:border-orange-900/30"><p className="text-[9px] text-orange-600 font-bold uppercase">Combustível</p><p className="text-sm font-bold dark:text-white">R$ {monthProjection.fuelCost.toFixed(0)}</p>{localPlan.customFuelCost == null && <p className="text-[8px] text-slate-400">{monthProjection.km.toFixed(0)} km</p>}</div>
          <div className="p-2.5 bg-purple-50 dark:bg-purple-950/30 rounded-xl border border-purple-100 dark:border-purple-900/30"><p className="text-[9px] text-purple-600 font-bold uppercase">Manutenção</p><p className="text-sm font-bold dark:text-white">R$ {monthProjection.maintCost.toFixed(0)}</p></div>
          <div className="p-2.5 bg-rose-50 dark:bg-rose-950/30 rounded-xl border border-rose-100 dark:border-rose-900/30"><p className="text-[9px] text-rose-600 font-bold uppercase">Custos Fixos</p><p className="text-sm font-bold dark:text-white">R$ {monthProjection.fixedCosts.toFixed(0)}</p><p className="text-[8px] text-slate-400">IPVA+seguro+parcela</p></div>
        </div>

        <div className={cn("p-3 rounded-xl border", monthProjection.netProfit >= 0 ? "bg-brand-50 dark:bg-brand-950/30 border-brand-100 dark:border-brand-900/30" : "bg-rose-50 dark:bg-rose-950/30 border-rose-100 dark:border-rose-900/30")}>
          <div className="flex items-center justify-between"><p className={cn("text-[10px] font-bold uppercase", monthProjection.netProfit >= 0 ? "text-brand-600" : "text-rose-600")}>Lucro Líquido Estimado</p><p className={cn("text-lg font-bold", monthProjection.netProfit >= 0 ? "text-brand-700 dark:text-brand-400" : "text-rose-700 dark:text-rose-400")}>R$ {monthProjection.netProfit.toFixed(0)}</p></div>
          <p className="text-[8px] text-slate-400 mt-0.5">R$ {monthProjection.earnings.toFixed(0)} - R$ {monthProjection.fuelCost.toFixed(0)} - R$ {monthProjection.maintCost.toFixed(0)} - R$ {monthProjection.fixedCosts.toFixed(0)}</p>
        </div>
      </div>

      <div>
        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Observações</label>
        <textarea value={localPlan.notes || ''} onChange={e => setLocalPlan({ ...localPlan, notes: e.target.value })} placeholder="Notas sobre este plano..." rows={2} className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none dark:text-white text-sm resize-none focus:ring-1 focus:ring-brand-500" />
      </div>

      <div className="flex gap-2 pt-2">
        <button onClick={() => { onSave({ ...localPlan, month: monthKey }); }} className="flex-1 bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold py-2 rounded-xl transition-all">Salvar Plano</button>
        <button onClick={copyFromProfile} className="px-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-sm font-bold rounded-xl hover:bg-slate-200 transition-all flex items-center gap-1"><Copy size={14} /> Copiar Perfil</button>
        <button onClick={onCancel} className="px-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-sm font-bold rounded-xl hover:bg-slate-200 transition-all">Cancelar</button>
      </div>
    </div>
  );
}
