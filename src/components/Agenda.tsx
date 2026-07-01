import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, Clock, TrendingUp, Calculator, Save, X, Plus, Info, MapPin, Sparkles, Trash2, DollarSign, CheckCircle2, Copy, ClipboardCheck, ChevronDown, ChevronUp, Sun, Palmtree, Eye, Pencil, ClipboardPaste, Wallet, BarChart3, Target, Search, AlertTriangle, Forward, Columns3 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { format, parseISO, startOfMonth, endOfMonth, addMonths, isWithinInterval, isBefore, getDay, startOfWeek } from 'date-fns';
import { RideEntry, Expense, UserProfile, WorkDay, WorkPeriod, MonthlyPlan, VacationEntry, Goal, ManualCompensation } from '../types';
import { cn } from '../lib/utils';
import { calculateHistoricalAverage } from '../lib/fuelCalculation';
import Goals from './Goals';

const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'] as const;
const FULL_MONTH_LABELS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'] as const;
const WEEKDAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] as const;

function buildVacationMap(vacations: VacationEntry[]): Map<string, VacationEntry> {
  const map = new Map<string, VacationEntry>();
  for (const v of vacations) map.set(v.date, v);
  return map;
}

function getVacationType(map: Map<string, VacationEntry>, dateStr: string): 'ferias' | 'folga' | undefined {
  return map.get(dateStr)?.type;
}

function mapVacationsToMonth(srcMonth: string, destMonthKey: string, vacations: VacationEntry[]): VacationEntry[] {
  const [, srcMo] = srcMonth.split('-').map(Number);
  const [, destMo] = destMonthKey.split('-').map(Number);
  const destDaysInMonth = new Date(parseInt(destMonthKey.split('-')[0]), destMo, 0).getDate();
  return vacations.map(v => {
    const srcDay = parseInt(v.date.split('-')[2], 10);
    const destDay = Math.min(srcDay, destDaysInMonth);
    return { date: `${destMonthKey}-${String(destDay).padStart(2, '0')}`, type: v.type };
  });
}

function getDefaultSchedule(): WorkDay[] {
  return [
    { day: 'Dom', active: false, periods: [{ start: '00:00', end: '00:00' }] },
    { day: 'Seg', active: true, periods: [{ start: '08:00', end: '18:00' }] },
    { day: 'Ter', active: true, periods: [{ start: '08:00', end: '18:00' }] },
    { day: 'Qua', active: true, periods: [{ start: '08:00', end: '18:00' }] },
    { day: 'Qui', active: true, periods: [{ start: '08:00', end: '18:00' }] },
    { day: 'Sex', active: true, periods: [{ start: '08:00', end: '18:00' }] },
    { day: 'Sáb', active: false, periods: [{ start: '00:00', end: '00:00' }] },
  ];
}

function getEmptySchedule(): WorkDay[] {
  return WEEKDAY_NAMES.map(d => ({ day: d, active: false, periods: [{ start: '00:00', end: '00:00' }] }));
}

function applyDefaultHours(schedule: WorkDay[]): WorkDay[] {
  return schedule.map(d => ({
    ...d,
    periods: (d.periods || []).map(p =>
      (p.start === '00:00' && p.end === '00:00' && d.active)
        ? { start: '08:00', end: '18:00' }
        : { ...p }
    )
  }));
}

function computeMonthProjection(args: {
  year: number; month: number; days?: WorkDay[] | null; vacations?: VacationEntry[];
  customHourlyRate?: number; customFuelCost?: number; customMaintCost?: number;
  defaultHourlyRate: number; fuelPerDay: number; maintPerDay: number; kmPerDay: number;
  ipvaValue: number; licensingValue: number; insuranceValue: number; vehicleInstallmentValue: number;
}) {
  const { year, month, days, vacations = [], customHourlyRate, customFuelCost, customMaintCost, defaultHourlyRate, fuelPerDay, maintPerDay, kmPerDay, ipvaValue, licensingValue, insuranceValue, vehicleInstallmentValue } = args;
  const vacMap = buildVacationMap(vacations);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let workDays = 0;
  let totalHours = 0;
  const schedule = days;

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const dayName = WEEKDAY_NAMES[date.getDay()];
    const dateStr = format(date, 'yyyy-MM-dd');
    if (vacMap.has(dateStr)) continue;
    const schedDay = schedule?.find(sd => sd.day === dayName);
    if (schedDay?.active && schedDay.periods) {
      workDays++;
      for (const p of schedDay.periods) {
        if (!p.start || !p.end) continue;
        const [sH, sM] = p.start.split(':').map(Number);
        const [eH, eM] = p.end.split(':').map(Number);
        let diff = (eH * 60 + eM) - (sH * 60 + sM);
        if (diff < 0) diff += 24 * 60;
        totalHours += diff / 60;
      }
    }
  }

  const hourlyRate = customHourlyRate ?? defaultHourlyRate;
  const earnings = totalHours * hourlyRate;
  const fuelCost = customFuelCost ?? (workDays * fuelPerDay);
  const maintCost = customMaintCost ?? (workDays * maintPerDay);
  const monthlyFixedCosts = ((ipvaValue || 0) + (licensingValue || 0)) / 12 + (insuranceValue || 0) + (vehicleInstallmentValue || 0);
  const feriasCount = vacations.filter(v => v.type === 'ferias').length;
  const folgaCount = vacations.filter(v => v.type === 'folga').length;

  return { workDays, totalHours, earnings, fuelCost, maintCost, fixedCosts: monthlyFixedCosts, totalExpenses: fuelCost + maintCost + monthlyFixedCosts, netProfit: earnings - fuelCost - maintCost - monthlyFixedCosts, km: workDays * kmPerDay, daysInMonth, feriasCount, folgaCount };
}

function buildCalendarDays(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month - 1, 1);
  const startDow = getDay(firstDay);
  const daysInMonth = new Date(year, month, 0).getDate();
  const days: (number | null)[] = [];
  for (let i = 0; i < startDow; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);
  while (days.length % 7 !== 0) days.push(null);
  return days;
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
  onBulkDeletePlans?: (ids: string[]) => void;
  goals?: Goal[];
  onAddGoal?: (goal: Goal) => void;
  onDeleteGoal?: (id: string) => void;
  onUpdateGoal?: (goal: Goal) => void;
  manualCompensations?: ManualCompensation[];
  onAddManualCompensation?: (comp: ManualCompensation) => void;
  onRemoveManualCompensation?: (id: string) => void;
}

type ExpandedState = 'collapsed' | 'view' | 'edit' | 'create';

export default function Agenda({ rides, expenses, profile, onUpdateProfile, sidebarCollapsed, plans: rawPlans, onAddPlan, onUpdatePlan, onDeletePlan, onBulkDeletePlans, goals, onAddGoal, onDeleteGoal, onUpdateGoal, manualCompensations, onAddManualCompensation, onRemoveManualCompensation }: AgendaProps) {
  const plans = Array.isArray(rawPlans) ? rawPlans : [];
  const [simulation, setSimulation] = useState({
    avgPerHour: profile?.hourlyRate || 0,
    schedule: profile?.workSchedule || getDefaultSchedule()
  });
  const [isSaved, setIsSaved] = useState(false);
  const [copiedPeriods, setCopiedPeriods] = useState<WorkPeriod[] | null>(null);
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);
  const [expandedState, setExpandedState] = useState<ExpandedState>('collapsed');
  const [editPlan, setEditPlan] = useState<MonthlyPlan | null>(null);
  const [copiedMonthPlan, setCopiedMonthPlan] = useState<{ month: string; monthLabel: string; days: WorkDay[]; vacations: VacationEntry[]; notes?: string; customHourlyRate?: number; customFuelCost?: number; customMaintCost?: number; customKmPerLiter?: number } | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [planFilter, setPlanFilter] = useState<'all' | 'q1' | 'q2' | 'q3' | 'q4'>('all');
  const [showMedias, setShowMedias] = useState(false);
  const [goalsOpen, setGoalsOpen] = useState(false);
  const [simulationOpen, setSimulationOpen] = useState(true);
  const [planejamentoOpen, setPlanejamentoOpen] = useState(true);
  const dragSourceRef = React.useRef<{ key: string; label: string } | null>(null);
  const [tooltipMonth, setTooltipMonth] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmState, setConfirmState] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; monthKey: string; monthLabel: string; fullLabel: string; year: number; month: number; hasPlan: boolean; plan: MonthlyPlan | null } | null>(null);
  const [compareMonth, setCompareMonth] = useState<string | null>(null);
  const [showComparePicker, setShowComparePicker] = useState(false);

  const requestConfirm = useCallback((title: string, message: string, onConfirm: () => void) => {
    setConfirmState({ title, message, onConfirm });
  }, []);

  React.useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    window.addEventListener('click', close);
    window.addEventListener('scroll', close, true);
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [contextMenu]);

  React.useEffect(() => {
    if (profile?.workSchedule) {
      setSimulation(prev => ({ ...prev, schedule: profile.workSchedule }));
    }
    if (profile?.hourlyRate !== undefined) {
      setSimulation(prev => ({ ...prev, avgPerHour: profile.hourlyRate || prev.avgPerHour }));
    }
  }, [profile?.workSchedule, profile?.hourlyRate]);

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
    const totalExp = monthExpenses.reduce((acc, e) => acc + e.value, 0);
    const totalHours = monthRides.reduce((acc, r) => {
      if (!r.startTime || !r.endTime) return acc;
      const start = r.startTime.split(':').map(Number);
      const end = r.endTime.split(':').map(Number);
      if (start.length < 2 || end.length < 2) return acc;
      let diff = (end[0] * 60 + end[1]) - (start[0] * 60 + start[1]);
      if (diff < 0) diff += 24 * 60;
      return acc + (diff / 60);
    }, 0);
    return { perHour: totalHours > 0 ? totalValue / totalHours : 0, perDay: totalValue / (new Set(monthRides.map(r => r.date.split('T')[0])).size || 1), perKm: totalKm > 0 ? totalValue / totalKm : 0, expenseRatio: totalValue > 0 ? totalExp / totalValue : 0 };
  } catch (err) {
    console.error('averages error:', err);
    return { perHour: 0, perDay: 0, perKm: 0, expenseRatio: 0 };
  }
}, [rides, expenses]);

const handleSave = useCallback(() => {
  try {
    if (profile) {
      onUpdateProfile({ ...profile, workSchedule: simulation.schedule, hourlyRate: simulation.avgPerHour ?? averages.perHour });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    }
  } catch (err) {
    console.error('handleSave error:', err);
  }
}, [profile, simulation, onUpdateProfile, averages.perHour]);

  const toggleDay = useCallback((index: number) => {
    setSimulation(prev => {
      const newSchedule = prev.schedule.map((d, i) => i === index ? { ...d, active: !d.active } : d);
      return { ...prev, schedule: newSchedule };
    });
  }, []);

  const addPeriod = useCallback((dayIndex: number) => {
    setSimulation(prev => {
      const newSchedule = prev.schedule.map((d, i) => i === dayIndex ? { ...d, periods: [...d.periods, { start: '00:00', end: '00:00' }] } : d);
      return { ...prev, schedule: newSchedule };
    });
  }, []);

  const removePeriod = useCallback((dayIndex: number, periodIndex: number) => {
    setSimulation(prev => {
      const newSchedule = prev.schedule.map((d, i) => {
        if (i !== dayIndex) return d;
        if (d.periods.length <= 1) return d;
        return { ...d, periods: d.periods.filter((_, pi) => pi !== periodIndex) };
      });
      return { ...prev, schedule: newSchedule };
    });
  }, []);

  const updatePeriod = useCallback((dayIndex: number, periodIndex: number, field: 'start' | 'end', value: string) => {
    setSimulation(prev => {
      const newSchedule = prev.schedule.map((d, i) => {
        if (i !== dayIndex) return d;
        const newPeriods = d.periods.map((p, pi) => pi === periodIndex ? { ...p, [field]: value } : p);
        return { ...d, periods: newPeriods };
      });
      return { ...prev, schedule: newSchedule };
    });
  }, []);

  const copyDay = useCallback((dayIndex: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setCopiedPeriods([...simulation.schedule[dayIndex].periods.map(p => ({ ...p }))]);
  }, [simulation.schedule]);

  const pasteDay = useCallback((dayIndex: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!copiedPeriods) return;
    setSimulation(prev => {
      const newSchedule = prev.schedule.map((d, i) => i === dayIndex ? { ...d, active: true, periods: copiedPeriods.map(p => ({ ...p })) } : d);
      return { ...prev, schedule: newSchedule };
    });
}, [copiedPeriods]);

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
      const hourlyRate = simulation.avgPerHour ?? averages.perHour;
      const weeklyEarnings = hourlyRate * totalHoursPerWeek;
      const monthlyEarnings = weeklyEarnings * (365 / 12 / 7);
      const dailyEarnings = activeDays > 0 ? weeklyEarnings / activeDays : 0;
      const annualFixedCosts = (profile?.ipvaValue || 0) + (profile?.licensingValue || 0);
      const monthlyFixedCosts = (annualFixedCosts / 12) + (profile?.insuranceValue || 0) + (profile?.vehicleInstallmentValue || 0);
      const weeklyFixedCosts = monthlyFixedCosts / 4;
      const varWeeklyExpenses = weeklyEarnings * averages.expenseRatio;
      const varMonthlyExpenses = monthlyEarnings * averages.expenseRatio;
      const totalWeeklyExpenses = varWeeklyExpenses + weeklyFixedCosts;
      const totalMonthlyExpenses = varMonthlyExpenses + monthlyFixedCosts;
      return { totalHoursPerWeek, activeDays, daily: dailyEarnings, weekly: weeklyEarnings, monthly: monthlyEarnings, weeklyNet: weeklyEarnings - totalWeeklyExpenses, monthlyNet: monthlyEarnings - totalMonthlyExpenses, estimatedExpenses: totalMonthlyExpenses, estimatedWeeklyExpenses: totalWeeklyExpenses, fixedMonthly: monthlyFixedCosts, fixedWeekly: weeklyFixedCosts };
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
        earningsPerDay: totalDays > 0 ? totalEarnings / totalDays : 0,
        kmPerDay: totalDays > 0 ? totalKm / totalDays : 0,
        fuelPerDay: totalDays > 0 ? totalFuel / totalDays : 0,
        maintPerDay: totalDays > 0 ? totalMaint / totalDays : 0,
        hoursPerDay: totalHours > 0 && totalDays > 0 ? totalHours / totalDays : 0
      };
    } catch (err) {
      console.error('userAverages error:', err);
      return { earningsPerDay: 0, kmPerDay: 0, fuelPerDay: 0, maintPerDay: 0, hoursPerDay: 0 };
    }
  }, [rides, expenses]);

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();

  const yearMonths = useMemo(() => Array.from({ length: 12 }, (_, i) => ({
    key: `${currentYear}-${String(i + 1).padStart(2, '0')}`,
    label: MONTH_LABELS[i],
    fullLabel: FULL_MONTH_LABELS[i],
    year: currentYear,
    month: i,
    start: new Date(currentYear, i, 1),
    end: endOfMonth(new Date(currentYear, i, 1)),
    isPast: i < currentMonth,
    isCurrent: i === currentMonth
  })), [currentYear, currentMonth]);

  const filteredMonths = useMemo(() => {
    if (planFilter === 'all') return yearMonths;
    if (planFilter === 'q1') return yearMonths.slice(0, 3);
    if (planFilter === 'q2') return yearMonths.slice(3, 6);
    if (planFilter === 'q3') return yearMonths.slice(6, 9);
    return yearMonths.slice(9, 12);
  }, [planFilter, yearMonths]);

  const displayedMonths = useMemo(() => {
    if (!searchQuery.trim()) return filteredMonths;
    const q = searchQuery.toLowerCase().trim();
    return filteredMonths.filter(m =>
      m.label.toLowerCase().includes(q) ||
      m.fullLabel.toLowerCase().includes(q) ||
      String(m.year).includes(q)
    );
  }, [filteredMonths, searchQuery]);

  const fixedCostArgs = useMemo(() => ({
    ipvaValue: profile?.ipvaValue || 0,
    licensingValue: profile?.licensingValue || 0,
    insuranceValue: profile?.insuranceValue || 0,
    vehicleInstallmentValue: profile?.vehicleInstallmentValue || 0,
  }), [profile?.ipvaValue, profile?.licensingValue, profile?.insuranceValue, profile?.vehicleInstallmentValue]);

  const getRealMonthData = useCallback((ym: { year: number; month: number }) => {
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
  }, [rides, expenses]);

  const monthStatsMap = useMemo(() => {
    const map = new Map<string, ReturnType<typeof computeMonthProjection>>();
    for (const ym of yearMonths) {
      const plan = plans.find(p => p.month === ym.key);
      const defaultHourlyRate = profile?.hourlyRate || averages.perHour || 0;
      map.set(ym.key, computeMonthProjection({
        year: ym.year, month: ym.month, days: plan?.days || profile?.workSchedule, vacations: plan?.vacations || [],
        customHourlyRate: plan?.customHourlyRate, customFuelCost: plan?.customFuelCost, customMaintCost: plan?.customMaintCost,
        defaultHourlyRate, fuelPerDay: userAverages.fuelPerDay, maintPerDay: userAverages.maintPerDay, kmPerDay: userAverages.kmPerDay,
        ...fixedCostArgs
      }));
    }
    return map;
  }, [yearMonths, plans, profile, averages.perHour, userAverages, fixedCostArgs]);

  const realDataMap = useMemo(() => {
    const map = new Map<string, ReturnType<typeof getRealMonthData>>();
    for (const ym of yearMonths) {
      if (ym.isPast || ym.isCurrent) {
        map.set(ym.key, getRealMonthData(ym));
      }
    }
    return map;
  }, [yearMonths, getRealMonthData]);

  const yearEndProjection = useMemo(() => {
    return yearMonths.reduce((acc, ym) => {
      const realData = realDataMap.get(ym.key);
      const stats = monthStatsMap.get(ym.key);
      const plan = plans.find(p => p.month === ym.key);
      if (realData?.hasData) {
        const mStart = startOfMonth(new Date(ym.year, ym.month, 1));
        const mEnd = endOfMonth(new Date(ym.year, ym.month, 1));
        const interval = { start: mStart, end: mEnd };
        const monthRides = rides.filter(r => isWithinInterval(parseISO(r.date), interval));
        const realKm = monthRides.reduce((a, r) => a + r.kmDriven, 0);
        const realHours = monthRides.reduce((a, r) => {
          if (!r.startTime || !r.endTime) return a;
          const [sH, sM] = r.startTime.split(':').map(Number);
          const [eH, eM] = r.endTime.split(':').map(Number);
          if (isNaN(sH)) return a;
          let diff = (eH * 60 + eM) - (sH * 60 + sM);
          if (diff < 0) diff += 24 * 60;
          return a + diff / 60;
        }, 0);
        acc.totalWorkDays += realData.rideDays;
        acc.totalHours += realHours;
        acc.earnings += realData.earnings;
        acc.km += realKm;
        acc.fuelCost += realData.fuelCost;
        acc.maintCost += realData.maintCost;
        acc.fixedCosts += stats?.fixedCosts || 0;
      } else if (plan && stats) {
        acc.totalWorkDays += stats.workDays;
        acc.totalHours += stats.totalHours;
        acc.earnings += stats.earnings;
        acc.km += stats.km;
        acc.fuelCost += stats.fuelCost;
        acc.maintCost += stats.maintCost;
        acc.fixedCosts += stats.fixedCosts;
      } else {
        acc.fixedCosts += stats?.fixedCosts || 0;
      }
      return acc;
    }, { totalWorkDays: 0, totalHours: 0, earnings: 0, km: 0, fuelCost: 0, maintCost: 0, fixedCosts: 0 });
  }, [yearMonths, realDataMap, monthStatsMap, plans, rides]);

  const accumulatedChartData = useMemo(() => {
    let accEarnings = 0;
    let accExpenses = 0;
    return yearMonths.map(ym => {
      const realData = realDataMap.get(ym.key);
      const stats = monthStatsMap.get(ym.key);
      const plan = plans.find(p => p.month === ym.key);
      let monthEarnings = 0;
      let monthExpenses = 0;
      if (realData?.hasData) {
        monthEarnings = realData.earnings;
        monthExpenses = realData.fuelCost + realData.maintCost + (stats?.fixedCosts || 0);
      } else if (plan && stats) {
        monthEarnings = stats.earnings;
        monthExpenses = stats.fuelCost + stats.maintCost + stats.fixedCosts;
      }
      accEarnings += monthEarnings;
      accExpenses += monthExpenses;
      return { label: ym.label, earnings: Math.round(accEarnings), expenses: Math.round(accExpenses), profit: Math.round(accEarnings - accExpenses) };
    });
  }, [yearMonths, realDataMap, monthStatsMap, plans]);

  const handleCopyPlan = useCallback((ym: { key: string; label: string }, plan: MonthlyPlan) => {
    setCopiedMonthPlan({
      month: ym.key, monthLabel: ym.label,
      days: (plan.days || []).map(d => ({ ...d, periods: (d.periods || []).map(p => ({ ...p })) })),
      vacations: [...(plan.vacations || [])],
      notes: plan.notes, customHourlyRate: plan.customHourlyRate,
      customFuelCost: plan.customFuelCost, customMaintCost: plan.customMaintCost,
      customKmPerLiter: plan.customKmPerLiter
    });
    setCopyFeedback(ym.label);
    setTimeout(() => setCopyFeedback(null), 25000);
  }, []);

  const handlePastePlan = useCallback((destKey: string, destLabel: string, existingPlanId?: string) => {
    if (!copiedMonthPlan) return;
    const mappedVacations = mapVacationsToMonth(copiedMonthPlan.month, destKey, copiedMonthPlan.vacations);
    const newPlan: MonthlyPlan = {
      id: existingPlanId || crypto.randomUUID(),
      month: destKey,
      days: copiedMonthPlan.days.map(d => ({ ...d, periods: d.periods.map(p => ({ ...p })) })),
      vacations: mappedVacations,
      notes: copiedMonthPlan.notes,
      customHourlyRate: copiedMonthPlan.customHourlyRate,
      customFuelCost: copiedMonthPlan.customFuelCost,
      customMaintCost: copiedMonthPlan.customMaintCost,
      customKmPerLiter: copiedMonthPlan.customKmPerLiter
    };
    setEditPlan(newPlan);
    setExpandedState('edit');
    setExpandedMonth(destKey);
  }, [copiedMonthPlan]);

  const handleApplyToAllFuture = useCallback(() => {
    if (!copiedMonthPlan) return;
    const futureMonths = yearMonths.filter(ym2 => !ym2.isPast && ym2.key !== copiedMonthPlan.month && !plans.some(p => p.month === ym2.key));
    futureMonths.forEach(ym2 => {
      const mappedVacations = mapVacationsToMonth(copiedMonthPlan.month, ym2.key, copiedMonthPlan.vacations);
      onAddPlan?.({
        id: crypto.randomUUID(), month: ym2.key,
        days: copiedMonthPlan.days.map(d => ({ ...d, periods: d.periods.map(p => ({ ...p })) })),
        vacations: mappedVacations, notes: copiedMonthPlan.notes,
        customHourlyRate: copiedMonthPlan.customHourlyRate,
        customFuelCost: copiedMonthPlan.customFuelCost,
        customMaintCost: copiedMonthPlan.customMaintCost,
        customKmPerLiter: copiedMonthPlan.customKmPerLiter
      });
    });
    setCopyFeedback(null);
  }, [copiedMonthPlan, yearMonths, plans, onAddPlan]);

  const renderProjectionCards = (proj: { totalWorkDays: number; totalHours: number; earnings: number; km: number; fuelCost: number; maintCost: number; fixedCosts: number }, profileArg?: UserProfile | null) => {
    const ipvaMonthly = ((profileArg?.ipvaValue || 0) / 12);
    const licensingMonthly = ((profileArg?.licensingValue || 0) / 12);
    const insuranceMonthly = (profileArg?.insuranceValue || 0);
    const installmentMonthly = (profileArg?.vehicleInstallmentValue || 0);
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
          <p className="text-xs text-emerald-600 font-bold uppercase">Ganhos</p>
          <p className="text-lg font-bold dark:text-white">R$ {proj.earnings.toFixed(0)}</p>
        </div>
        <div className="p-3 bg-rose-50 dark:bg-rose-950/30 rounded-xl border border-rose-100 dark:border-rose-900/30">
          <p className="text-xs text-rose-600 font-bold uppercase">Gastos</p>
          <p className="text-lg font-bold dark:text-white">R$ {(proj.fuelCost + proj.maintCost + proj.fixedCosts).toFixed(0)}</p>
          <p className="text-xs text-slate-400">Combustível + Manutenção + Fixos</p>
        </div>
        <div className={cn("p-3 rounded-xl border", (proj.earnings - proj.fuelCost - proj.maintCost - proj.fixedCosts) >= 0 ? "bg-blue-50 dark:bg-blue-950/30 border-blue-100 dark:border-blue-900/30" : "bg-rose-50 dark:bg-rose-950/30 border-rose-100 dark:border-rose-900/30")}>
          <p className={cn("text-xs font-bold uppercase", (proj.earnings - proj.fuelCost - proj.maintCost - proj.fixedCosts) >= 0 ? "text-blue-600" : "text-rose-600")}>Lucro</p>
          <p className={cn("text-lg font-bold", (proj.earnings - proj.fuelCost - proj.maintCost - proj.fixedCosts) >= 0 ? "text-blue-700 dark:text-blue-400" : "text-rose-700 dark:text-rose-400")}>R$ {(proj.earnings - proj.fuelCost - proj.maintCost - proj.fixedCosts).toFixed(0)}</p>
        </div>
        <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-100 dark:border-blue-900/30">
          <p className="text-xs text-blue-600 font-bold uppercase">KM</p>
          <p className="text-lg font-bold dark:text-white">{proj.km.toFixed(0)}</p>
        </div>
        <div className="p-3 bg-orange-50 dark:bg-orange-950/30 rounded-xl border border-orange-100 dark:border-orange-900/30">
          <p className="text-xs text-orange-600 font-bold uppercase">Combustível</p>
          <p className="text-lg font-bold dark:text-white">R$ {proj.fuelCost.toFixed(0)}</p>
        </div>
        <div className="p-3 bg-purple-50 dark:bg-purple-950/30 rounded-xl border border-purple-100 dark:border-purple-900/30">
          <p className="text-xs text-purple-600 font-bold uppercase">Manutenção</p>
          <p className="text-lg font-bold dark:text-white">R$ {proj.maintCost.toFixed(0)}</p>
        </div>
        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-500 font-bold uppercase">Custos Fixos</p>
          <p className="text-lg font-bold dark:text-white">R$ {proj.fixedCosts.toFixed(0)}</p>
          <div className="text-xs text-slate-400 space-y-0.5 mt-1">
            {ipvaMonthly > 0 && <p>IPVA R$ {ipvaMonthly.toFixed(0)}/mês</p>}
            {licensingMonthly > 0 && <p>Licenciamento R$ {licensingMonthly.toFixed(0)}/mês</p>}
            {insuranceMonthly > 0 && <p>Seguro R$ {insuranceMonthly.toFixed(0)}/mês</p>}
            {installmentMonthly > 0 && <p>Parcela R$ {installmentMonthly.toFixed(0)}/mês</p>}
            {proj.fixedCosts <= 0 && <p>Nenhum custo fixo cadastrado</p>}
          </div>
        </div>
        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-500 font-bold uppercase">Horas</p>
          <p className="text-lg font-bold dark:text-white">{proj.totalHours.toFixed(0)}h</p>
        </div>
      </div>
    );
  };

  const collapseMonth = useCallback(() => {
    setExpandedMonth(null);
    setEditPlan(null);
    setExpandedState('collapsed');
    setCompareMonth(null);
    setShowComparePicker(false);
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-brand-600 flex items-center justify-center text-white shadow-lg shadow-brand-200 dark:shadow-none">
            <Calendar size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Agenda & Simulação</h2>
            <p className="text-slate-500 dark:text-slate-400"> Planeje seus horários e projete seus ganhos e gastos.</p>
          </div>
        </div>
        <motion.button onClick={handleSave} className={cn("px-6 py-3 rounded-xl font-bold transition-colors flex items-center gap-2 shadow-lg", isSaved ? "bg-emerald-600 text-white shadow-emerald-100" : "bg-brand-600 hover:bg-brand-700 text-white shadow-brand-100 dark:shadow-none")} whileTap={{ scale: 0.97 }}>
          {isSaved ? (<><CheckCircle2 size={20} /> Salvo!</>) : (<><Save size={20} /> Salvar Escala</>)}
        </motion.button>
      </div>

      <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
        <button onClick={() => setSimulationOpen(!simulationOpen)} className="w-full flex items-center justify-between mb-4">
          <h3 className="text-base font-bold dark:text-white flex items-center gap-2">
            <Calculator size={18} className="text-brand-600" /> Simulador de Ganhos e Gastos
          </h3>
          <div className="flex items-center gap-2">
            <button onClick={(e) => { e.stopPropagation(); setShowMedias(!showMedias); }} className="text-xs font-bold text-brand-600 bg-brand-50 dark:bg-brand-950/30 px-2 py-1.5 rounded-lg hover:bg-brand-100 transition-colors flex items-center gap-1 min-h-[36px]">
              {showMedias ? <ChevronUp size={12} /> : <ChevronDown size={12} />} Médias Reais
            </button>
            {simulationOpen ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
          </div>
        </button>
        <AnimatePresence>
          {simulationOpen && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>

        <AnimatePresence>
          {showMedias && (
            <motion.div className="mb-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="flex items-center gap-2"><div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 flex items-center justify-center"><TrendingUp size={14} /></div><div><p className="text-xs text-slate-400 font-bold uppercase">Por Hora</p><p className="text-sm font-bold dark:text-white">R$ {averages.perHour.toFixed(2)}</p></div></div>
                <div className="flex items-center gap-2"><div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-600 flex items-center justify-center"><Calendar size={14} /></div><div><p className="text-xs text-slate-400 font-bold uppercase">Por Dia</p><p className="text-sm font-bold dark:text-white">R$ {averages.perDay.toFixed(2)}</p></div></div>
                <div className="flex items-center gap-2"><div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/30 text-purple-600 flex items-center justify-center"><MapPin size={14} /></div><div><p className="text-xs text-slate-400 font-bold uppercase">Por KM</p><p className="text-sm font-bold dark:text-white">R$ {averages.perKm.toFixed(2)}</p></div></div>
                <div className="flex items-center gap-2"><div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/30 text-rose-600 flex items-center justify-center"><DollarSign size={14} /></div><div><p className="text-xs text-slate-400 font-bold uppercase">Gasto/Ganho</p><p className="text-sm font-bold dark:text-white">{(averages.expenseRatio * 100).toFixed(0)}%</p></div></div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {insights && (
          <div className="mb-4 p-3 bg-brand-50/50 dark:bg-brand-950/10 rounded-xl border border-brand-100/50 dark:border-brand-900/20 flex items-center gap-3">
            <Sparkles size={16} className="text-brand-600 shrink-0" />
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
              <span className="text-slate-600 dark:text-slate-400"><span className="font-bold text-emerald-600">{insights.bestMoneyDay}</span> &mdash; R$ {insights.maxAvgMoney.toFixed(2)}/dia</span>
              <span className="text-slate-600 dark:text-slate-400"><span className="font-bold text-blue-600">{insights.bestRidesDay}</span> &mdash; {insights.maxAvgRides.toFixed(1)} corridas/dia</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="space-y-3">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
              <p className="text-xs font-bold text-slate-400 uppercase mb-2 tracking-wider">Resumo da Escala</p>
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-xs font-medium text-slate-500 dark:text-slate-400">Dias Ativos</p><p className="text-lg font-bold text-brand-600">{simulationStats.activeDays} dias/sem</p></div>
                <div><p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Horas</p><p className="text-lg font-bold text-brand-600">{simulationStats.totalHoursPerWeek.toFixed(1)}h/sem</p></div>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Ganhos por Hora (R$)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">R$</span>
                <input type="number" value={simulation.avgPerHour || ''} onChange={(e) => { const val = e.target.value; setSimulation(prev => ({ ...prev, avgPerHour: Number(val) || 0 })); }} className="w-full pl-8 pr-3 py-2.5 min-h-[44px] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 dark:text-white text-sm" placeholder={averages.perHour.toFixed(2)} />
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-1"><Info size={12} /> Sua média real é R$ {averages.perHour.toFixed(2)}/h</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2"><div className="h-px flex-1 bg-slate-100 dark:bg-slate-800"></div><span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Projeção Mensal (4 sem)</span><div className="h-px flex-1 bg-slate-100 dark:bg-slate-800"></div></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-100 dark:border-emerald-900/30"><p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider mb-0.5">Ganhos Mensais</p><p className="text-xl font-bold text-slate-900 dark:text-white">R$ {simulationStats.monthly.toFixed(2)}</p></div>
            <div className="p-3 bg-rose-50 dark:bg-rose-950/30 rounded-xl border border-rose-100 dark:border-rose-900/30">
              <div className="flex items-center justify-between mb-0.5"><p className="text-xs text-rose-600 dark:text-rose-400 font-bold uppercase tracking-wider">Gastos Mensais</p><div className="group relative"><Info size={12} className="text-rose-400 cursor-help" /><div className="absolute bottom-full right-0 mb-2 w-64 p-3 bg-slate-800 text-white text-xs rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl leading-relaxed"><p className="font-bold mb-1 border-b border-slate-700 pb-1">Composição dos Gastos Mensais:</p><div className="flex justify-between mb-1"><span>Custos Fixos (IPVA/Seguro/Lic.):</span><span className="font-bold">R$ {simulationStats.fixedMonthly.toFixed(2)}</span></div><div className="flex justify-between"><span>Gastos Variáveis (Histórico):</span><span className="font-bold">R$ {(simulationStats.monthly * averages.expenseRatio).toFixed(2)}</span></div><p className="mt-2 text-xs text-slate-400 italic">Os gastos variáveis são baseados na sua média histórica.</p></div></div></div>
              <p className="text-xl font-bold text-slate-900 dark:text-white">R$ {simulationStats.estimatedExpenses.toFixed(2)}</p>
            </div>
            <div className="p-3 bg-brand-600 rounded-xl shadow-lg shadow-brand-200 dark:shadow-none"><p className="text-xs text-brand-100 font-bold uppercase tracking-wider mb-0.5">Lucro Mensal</p><p className="text-xl font-bold text-white">R$ {simulationStats.monthlyNet.toFixed(2)}</p></div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-bold dark:text-white flex items-center gap-2"><Clock size={16} className="text-brand-600" /> Agenda de Trabalho</h4>
            <p className="text-xs text-slate-500">Clique no dia para ativar/desativar</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
            {simulation.schedule.map((item, i) => {
              const dayHours = item.active ? (item.periods || []).reduce((acc, p) => {
                if (!p.start || !p.end || !p.start.includes(':') || !p.end.includes(':')) return acc;
                const [sH, sM] = p.start.split(':').map(Number);
                const [eH, eM] = p.end.split(':').map(Number);
                if (isNaN(sH) || isNaN(sM) || isNaN(eH) || isNaN(eM)) return acc;
                let diff = (eH * 60 + eM) - (sH * 60 + sM);
                if (diff < 0) diff += 24 * 60;
                return acc + diff / 60;
              }, 0) : 0;
              return (
                <div key={item.day} className={cn("relative p-3 rounded-xl border-2 transition-colors cursor-pointer group", item.active ? "bg-white dark:bg-slate-900 border-brand-500 shadow-lg shadow-brand-100 dark:shadow-none" : "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 opacity-60")} onClick={() => toggleDay(i)}>
                  <div className="text-center mb-2">
                    <p className={cn("text-xs font-bold", item.active ? "text-brand-600" : "text-slate-400")}>{item.day}{dayHours > 0 ? ` ${dayHours.toFixed(1)}h` : ''}</p>
                    <p className="text-xs font-bold text-slate-400 uppercase">{item.active ? 'Ativo' : 'Folga'}</p>
                    <div className="flex justify-center gap-1.5 mt-1.5">
                      <button onClick={(e) => copyDay(i, e)} title="Copiar escala" className="p-1 min-w-[28px] min-h-[28px] flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors text-slate-400 hover:text-brand-600"><Copy size={11} /></button>
                      {copiedPeriods && <button onClick={(e) => pasteDay(i, e)} title="Colar escala" className="p-1 min-w-[28px] min-h-[28px] flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors text-slate-400 hover:text-emerald-600"><ClipboardCheck size={11} /></button>}
                    </div>
                  </div>
                  <div className="space-y-1" onClick={(e) => e.stopPropagation()}>
                    {item.active ? (<> 
                      <div className="space-y-1">{(item.periods || []).map((period, pIdx) => (<div key={pIdx} className="space-y-0.5"><div className="flex items-center justify-between"><span className="text-xs font-bold text-slate-400 uppercase">T{pIdx + 1}</span>{(item.periods || []).length > 1 && <button onClick={() => removePeriod(i, pIdx)} className="text-rose-500 hover:text-rose-600"><Trash2 size={9} /></button>}</div><div className="flex flex-col gap-0.5"><input type="time" value={period.start} onChange={(e) => updatePeriod(i, pIdx, 'start', e.target.value)} className="text-xs font-bold bg-slate-50 dark:bg-slate-800 p-1.5 rounded border border-slate-200 dark:border-slate-700 dark:text-white outline-none focus:ring-1 focus:ring-brand-500 min-h-[36px]" /><input type="time" value={period.end} onChange={(e) => updatePeriod(i, pIdx, 'end', e.target.value)} className="text-xs font-bold bg-slate-50 dark:bg-slate-800 p-1.5 rounded border border-slate-200 dark:border-slate-700 dark:text-white outline-none focus:ring-1 focus:ring-brand-500 min-h-[36px]" /></div></div>))}</div>
                      <button onClick={() => addPeriod(i)} className="w-full mt-1.5 py-1.5 flex items-center justify-center gap-1 bg-brand-50 dark:bg-brand-950/30 text-brand-600 rounded-lg border border-brand-100 dark:border-brand-900/30 hover:bg-brand-100 transition-colors text-xs font-bold min-h-[36px]"><Plus size={14} /> Novo</button>
                    </>) : (<div className="h-16 flex items-center justify-center"><X size={18} className="text-slate-200 dark:text-slate-700" /></div>)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
        <button onClick={() => setGoalsOpen(!goalsOpen)} className="w-full flex items-center justify-between">
          <h3 className="text-base font-bold dark:text-white flex items-center gap-2"><Target size={18} className="text-brand-600" /> Metas e Objetivos</h3>
          {goalsOpen ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
        </button>
        <AnimatePresence>
          {goalsOpen && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
              <div className="pt-4">
                <Goals
                  goals={goals || []}
                  rides={rides}
                  expenses={expenses}
                  profile={profile}
                  onAddGoal={(goal) => onAddGoal?.(goal)}
                  onDeleteGoal={(id) => onDeleteGoal?.(id)}
                  onUpdateGoal={(goal) => onUpdateGoal?.(goal)}
                  manualCompensations={manualCompensations}
                  onAddManualCompensation={(comp) => onAddManualCompensation?.(comp)}
                  onRemoveManualCompensation={(id) => onRemoveManualCompensation?.(id)}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
        <button onClick={() => setPlanejamentoOpen(!planejamentoOpen)} className="w-full flex items-center justify-between mb-6">
          <div className="text-left"><h3 className="text-lg font-bold dark:text-white">Planejamento Anual</h3><p className="text-xs text-slate-400">Planeje seus meses, férias e projete seus resultados</p></div>
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
              {(['all', 'q1', 'q2', 'q3', 'q4'] as const).map(f => (
                <button key={f} onClick={() => setPlanFilter(f)} className={cn("px-3 py-1.5 min-h-[36px] rounded-lg text-xs font-bold transition-colors", planFilter === f ? "bg-brand-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200")}>
                  {f === 'all' ? 'Ano' : f === 'q1' ? '1º Tri' : f === 'q2' ? '2º Tri' : f === 'q3' ? '3º Tri' : '4º Tri'}
                </button>
              ))}
            </div>
            {planejamentoOpen ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
          </div>
        </button>
        <AnimatePresence>
          {planejamentoOpen && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>

        {/* Busca global */}
        <div className="relative mb-3">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar mês..."
            className="w-full pl-9 pr-8 py-2 min-h-[36px] text-sm bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 outline-none focus:ring-1 focus:ring-brand-500 dark:text-white placeholder:text-slate-400"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Timeline horizontal */}
        <div className="overflow-x-auto pb-2 -mx-1 px-1 scrollbar-thin">
          <div className="flex gap-2 min-w-max">
            {displayedMonths.map(ym => {
              const plan = plans.find(p => p.month === ym.key);
              const stats = monthStatsMap.get(ym.key);
              const realData = realDataMap.get(ym.key) || null;
              const displayEarnings = realData?.hasData ? realData.earnings : (plan?.actualEarnings ?? stats?.earnings ?? 0);
              const displayFuel = realData?.hasData ? realData.fuelCost : (plan?.actualFuelCost ?? stats?.fuelCost ?? 0);
              const displayMaint = realData?.hasData ? realData.maintCost : (plan?.actualMaintCost ?? stats?.maintCost ?? 0);
              const displayFixed = stats?.fixedCosts ?? 0;
              const displayOther = realData?.hasData ? realData.otherCost : (plan?.actualOtherCost ?? 0);
              const displayProfit = displayEarnings - displayFuel - displayMaint - displayFixed - displayOther;
              const isExpanded = expandedMonth === ym.key;
              const hasPlan = !!plan;
              const hasRealData = realData?.hasData ?? false;
              const maxEarnings = Math.max(...displayedMonths.map(m => {
                const mp = plans.find(p => p.month === m.key);
                const mr = realDataMap.get(m.key);
                return mr?.hasData ? mr.earnings : (mp?.actualEarnings ?? monthStatsMap.get(m.key)?.earnings ?? 0);
              }), 1);
              const barHeight = maxEarnings > 0 ? Math.max(2, (displayEarnings / maxEarnings) * 24) : 2;
              const monthProgress = (() => {
                if (!ym.isCurrent && !ym.isPast) return -1;
                const now = new Date();
                const daysInMonth = new Date(ym.year, ym.month + 1, 0).getDate();
                const currentDay = now.getDate();
                return ym.isCurrent ? Math.min(100, (currentDay / daysInMonth) * 100) : 100;
              })();

              return (
                <motion.button
                  key={ym.key}
                  layout
                  draggable={hasPlan}
                  onDragStart={(e) => {
                    if (plan) {
                      dragSourceRef.current = { key: ym.key, label: ym.label };
                      handleCopyPlan(ym, plan);
                      e.dataTransfer.effectAllowed = 'copy';
                    }
                  }}
                  onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (dragSourceRef.current && dragSourceRef.current.key !== ym.key) {
                      handlePastePlan(ym.key, ym.label, plan?.id);
                    }
                    dragSourceRef.current = null;
                  }}
                  onMouseEnter={() => setTooltipMonth(ym.key)}
                  onMouseLeave={() => setTooltipMonth(null)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setContextMenu({ x: e.clientX, y: e.clientY, monthKey: ym.key, monthLabel: ym.label, fullLabel: ym.fullLabel, year: ym.year, month: ym.month, hasPlan, plan: plan || null });
                  }}
                  onClick={() => {
                    if (isExpanded) { collapseMonth(); }
                    else { setExpandedMonth(ym.key); if (plan) { setExpandedState('view'); setEditPlan(null); } else { setExpandedState('create'); setEditPlan(null); } }
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  className={cn(
                    "flex flex-col items-center px-3 py-2.5 rounded-xl border-2 min-w-[80px] shrink-0 cursor-pointer",
                    isExpanded
                      ? "border-brand-500 bg-brand-50 dark:bg-brand-950/20 shadow-lg shadow-brand-100 dark:shadow-none"
                      : hasPlan
                        ? "border-brand-200 dark:border-brand-900/30 bg-brand-50/30 dark:bg-brand-950/10 hover:border-brand-300"
                        : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-600"
                  )}
                >
                  <span className="text-xs font-bold dark:text-white">{ym.label}</span>
                  <span className={cn("text-xs font-bold mt-0.5", displayProfit >= 0 ? "text-blue-600 dark:text-blue-400" : "text-rose-500")}>
                    R$ {displayProfit.toFixed(0)}
                  </span>
                  <div className="flex items-center gap-1 mt-1">
                    {hasRealData && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Dados reais" />}
                    {hasPlan && <span className="w-1.5 h-1.5 rounded-full bg-brand-500" title="Plano criado" />}
                    {ym.isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" title="Mês atual" />}
                    {ym.isPast && !hasRealData && <span className="w-1.5 h-1.5 rounded-full bg-orange-400" title="Dados reais pendentes" />}
                    {!hasPlan && !hasRealData && !ym.isCurrent && !ym.isPast && <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />}
                  </div>
                  <div className="w-full mt-1.5 flex items-end justify-center gap-[2px]" style={{ height: 24 }}>
                    {displayedMonths.map((m) => {
                      const isCurrent = m.key === ym.key;
                      return (
                        <div
                          key={m.key}
                          className={cn(
                            "w-[3px] rounded-t transition-all",
                            isCurrent ? "bg-brand-500" : "bg-slate-200 dark:bg-slate-700"
                          )}
                          style={{ height: `${Math.max(2, (() => {
                            const mp = plans.find(p => p.month === m.key);
                            const mr = realDataMap.get(m.key);
                            const e = mr?.hasData ? mr.earnings : (mp?.actualEarnings ?? monthStatsMap.get(m.key)?.earnings ?? 0);
                            return maxEarnings > 0 ? (e / maxEarnings) * 22 : 2;
                          })())}px` }}
                        />
                      );
                    })}
                  </div>
                  {monthProgress >= 0 && (
                    <div className="w-full mt-1 h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all", monthProgress >= 100 ? "bg-slate-400" : "bg-brand-500")}
                        style={{ width: `${monthProgress}%` }}
                      />
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Tooltip rico */}
        <AnimatePresence>
          {tooltipMonth && (() => {
            const ym = yearMonths.find(m => m.key === tooltipMonth);
            if (!ym) return null;
            const plan = plans.find(p => p.month === ym.key);
            const stats = monthStatsMap.get(ym.key);
            const realData = realDataMap.get(ym.key) || null;
            const displayEarnings = realData?.hasData ? realData.earnings : (plan?.actualEarnings ?? stats?.earnings ?? 0);
            const displayFuel = realData?.hasData ? realData.fuelCost : (plan?.actualFuelCost ?? stats?.fuelCost ?? 0);
            const displayMaint = realData?.hasData ? realData.maintCost : (plan?.actualMaintCost ?? stats?.maintCost ?? 0);
            const displayFixed = stats?.fixedCosts ?? 0;
            const displayOther = realData?.hasData ? realData.otherCost : (plan?.actualOtherCost ?? 0);
            const displayProfit = displayEarnings - displayFuel - displayMaint - displayFixed - displayOther;
            const feriasCount = plan?.vacations?.filter(v => v.type === 'ferias').length || 0;
            const folgaCount = plan?.vacations?.filter(v => v.type === 'folga').length || 0;

            return (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.15 }}
                className="mb-4 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs"
              >
                <div>
                  <p className="text-slate-400 font-bold uppercase mb-1">{ym.fullLabel}</p>
                  <p className="text-slate-500">{stats?.daysInMonth ?? 0}d no mês &middot; {stats?.workDays ?? 0}d trab &middot; {(stats?.totalHours ?? 0).toFixed(0)}h</p>
                </div>
                <div>
                  <p className="text-emerald-600 font-bold uppercase mb-1">Ganhos</p>
                  <p className="text-sm font-bold dark:text-white">R$ {displayEarnings.toFixed(0)}</p>
                </div>
                <div>
                  <p className="text-rose-600 font-bold uppercase mb-1">Gastos</p>
                  <p className="text-sm font-bold dark:text-white">R$ {(displayFuel + displayMaint + displayFixed + displayOther).toFixed(0)}</p>
                </div>
                <div>
                  <p className={cn("font-bold uppercase mb-1", displayProfit >= 0 ? "text-blue-600" : "text-rose-600")}>Lucro</p>
                  <p className={cn("text-sm font-bold", displayProfit >= 0 ? "text-blue-700 dark:text-blue-400" : "text-rose-600")}>R$ {displayProfit.toFixed(0)}</p>
                </div>
                {(feriasCount > 0 || folgaCount > 0) && (
                  <div className="sm:col-span-4 flex gap-3">
                    {feriasCount > 0 && <span className="text-orange-600"><strong>{feriasCount}d</strong> de férias</span>}
                    {folgaCount > 0 && <span className="text-amber-600"><strong>{folgaCount}d</strong> de folga</span>}
                  </div>
                )}
              </motion.div>
            );
          })()}
        </AnimatePresence>

        {/* Expanded month view */}
        <AnimatePresence mode="wait">
          {expandedMonth && (() => {
            const ym = yearMonths.find(m => m.key === expandedMonth);
            if (!ym) return null;
            const plan = plans.find(p => p.month === ym.key);
            const stats = monthStatsMap.get(ym.key);
            const realData = realDataMap.get(ym.key) || null;
            const feriasCount = plan?.vacations?.filter(v => v.type === 'ferias').length || 0;
            const folgaCount = plan?.vacations?.filter(v => v.type === 'folga').length || 0;
            const displayEarnings = realData?.hasData ? realData.earnings : (plan?.actualEarnings ?? stats?.earnings ?? 0);
            const displayFuel = realData?.hasData ? realData.fuelCost : (plan?.actualFuelCost ?? stats?.fuelCost ?? 0);
            const displayMaint = realData?.hasData ? realData.maintCost : (plan?.actualMaintCost ?? stats?.maintCost ?? 0);
            const displayFixed = stats?.fixedCosts ?? 0;
            const displayOther = realData?.hasData ? realData.otherCost : (plan?.actualOtherCost ?? 0);
            const displayProfit = displayEarnings - displayFuel - displayMaint - displayFixed - displayOther;

            return (
              <motion.div
                key={ym.key}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-5"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold dark:text-white">{ym.fullLabel} {ym.year}</h4>
                    {feriasCount > 0 && <span className="text-xs font-bold text-orange-600 bg-orange-50 dark:bg-orange-950/30 px-1.5 py-0.5 rounded">{feriasCount}d férias</span>}
                    {folgaCount > 0 && <span className="text-xs font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/30 px-1.5 py-0.5 rounded">{folgaCount}d folga</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    {plan && expandedState === 'view' && (
                      <>
                        <button onClick={() => handleCopyPlan(ym, plan)} className="flex items-center gap-1 px-2.5 py-1.5 min-h-[36px] text-xs font-bold text-slate-500 dark:text-slate-400 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-950/30 hover:text-brand-600 transition-colors"><Copy size={14} /> Copiar</button>
                        <button onClick={() => {
                          const nextMo = ym.month + 1;
                          const nextYear = nextMo > 11 ? ym.year + 1 : ym.year;
                          const nextMoIdx = nextMo % 12;
                          const nextKey = `${nextYear}-${String(nextMoIdx + 1).padStart(2, '0')}`;
                          const nextFullLabel = FULL_MONTH_LABELS[nextMoIdx];
                          const existingPlan = plans.find(p => p.month === nextKey);
                          const doDuplicate = () => {
                            const mappedVacations = mapVacationsToMonth(ym.key, nextKey, plan.vacations || []);
                            const newPlan: MonthlyPlan = {
                              id: existingPlan?.id || crypto.randomUUID(),
                              month: nextKey,
                              days: plan.days.map(d => ({ ...d, periods: d.periods.map(p => ({ ...p })) })),
                              vacations: mappedVacations,
                              notes: plan.notes || '',
                              customHourlyRate: plan.customHourlyRate,
                              customFuelCost: plan.customFuelCost,
                              customMaintCost: plan.customMaintCost,
                              customKmPerLiter: plan.customKmPerLiter,
                            };
                            if (existingPlan) { onUpdatePlan?.(newPlan); } else { onAddPlan?.(newPlan); }
                          };
                          if (existingPlan) { requestConfirm('Substituir plano', `${nextFullLabel} já tem um plano. Deseja substituir pelos dados de ${ym.fullLabel}?`, doDuplicate); } else { doDuplicate(); }
                        }} className="flex items-center gap-1 px-2.5 py-1.5 min-h-[36px] text-xs font-bold text-slate-500 dark:text-slate-400 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-950/30 hover:text-brand-600 transition-colors"><Forward size={14} /> Duplicar p/ {FULL_MONTH_LABELS[(ym.month + 1) % 12]}</button>
                        {copiedMonthPlan && copiedMonthPlan.month !== ym.key && (
                          <button onClick={() => handlePastePlan(ym.key, ym.label, plan.id)} className="flex items-center gap-1 px-2.5 py-1.5 min-h-[36px] text-xs font-bold text-emerald-600 dark:text-emerald-400 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"><ClipboardPaste size={14} /> Colar de {copiedMonthPlan.monthLabel}</button>
                        )}
                        <button onClick={() => { setEditPlan({ ...plan, days: (plan.days || []).map(d => ({ ...d, periods: (d.periods || []).map(p => ({ ...p })) })), vacations: [...(plan.vacations || [])] }); setExpandedState('edit'); }} className="flex items-center gap-1 px-2.5 py-1.5 min-h-[36px] text-xs font-bold text-slate-500 dark:text-slate-400 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-950/30 hover:text-brand-600 transition-colors"><Pencil size={14} /> Editar</button>
                        <button onClick={() => setShowComparePicker(!showComparePicker)} className={cn("flex items-center gap-1 px-2.5 py-1.5 min-h-[36px] text-xs font-bold rounded-lg transition-colors", compareMonth ? "bg-brand-100 dark:bg-brand-900/30 text-brand-600" : "text-slate-500 dark:text-slate-400 hover:bg-brand-50 dark:hover:bg-brand-950/30 hover:text-brand-600")}><Columns3 size={14} /> {compareMonth ? 'Comparando' : 'Comparar'}</button>
                        <button onClick={() => requestConfirm('Excluir plano', `Tem certeza que deseja excluir o plano de ${ym.fullLabel}?`, () => onDeletePlan?.(plan.id))} className="flex items-center gap-1 px-2.5 py-1.5 min-h-[36px] text-xs font-bold text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"><Trash2 size={14} /> Excluir</button>
                      </>
                    )}
                    <button onClick={collapseMonth} className="p-1.5 min-h-[36px] min-w-[36px] flex items-center justify-center text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><X size={16} /></button>
                  </div>
                </div>

                <AnimatePresence>
                  {copyFeedback && copiedMonthPlan && (
                    <motion.div className="flex flex-wrap items-center gap-2 px-3 py-2 mb-3 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-lg border border-emerald-100 dark:border-emerald-900/30" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.15 }}>
                      <span className="flex items-center gap-1.5"><ClipboardCheck size={14} /> Plano de {copyFeedback} copiado</span>
                      <button onClick={handleApplyToAllFuture} className="px-2 py-1 min-h-[32px] bg-emerald-600 text-white text-xs font-bold rounded hover:bg-emerald-700 transition-colors">Aplicar a todos os meses futuros sem plano</button>
                      <button onClick={() => setCopyFeedback(null)} className="p-1 text-emerald-400 hover:text-emerald-600"><X size={14} /></button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {plan && expandedState === 'view' ? (
                  <div className={cn(compareMonth ? "grid grid-cols-1 md:grid-cols-2 gap-4" : "")}>
                    <div>
                      {showComparePicker && (
                        <div className="mb-3 flex flex-wrap gap-1.5">
                          {plans.filter(p => p.month !== ym.key).map(p => {
                            const cmpYm = yearMonths.find(m => m.key === p.month);
                            if (!cmpYm) return null;
                            return (
                              <button key={p.month} onClick={() => { setCompareMonth(p.month); setShowComparePicker(false); }} className={cn("px-2.5 py-1.5 min-h-[32px] text-xs font-bold rounded-lg transition-colors", compareMonth === p.month ? "bg-brand-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700")}>{cmpYm.label}</button>
                            );
                          })}
                        </div>
                      )}
                      <MemoizedPlanView plan={plan} monthKey={ym.key} profile={profile} userAverages={userAverages} averages={averages} isPast={ym.isPast} realData={realData} expenses={expenses} fixedCostArgs={fixedCostArgs} />
                    </div>
                    {compareMonth && (() => {
                      const cmpPlan = plans.find(p => p.month === compareMonth);
                      const cmpYm = yearMonths.find(m => m.key === compareMonth);
                      if (!cmpPlan || !cmpYm) return <div className="text-sm text-slate-400 p-4">Plano não encontrado.</div>;
                      const cmpRealData = realDataMap.get(compareMonth) || null;
                      return (
                        <div className="relative">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-bold dark:text-white">{cmpYm.fullLabel} {cmpYm.year}</h4>
                            <button onClick={() => { setCompareMonth(null); setShowComparePicker(false); }} className="p-1.5 min-h-[32px] min-w-[32px] flex items-center justify-center text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><X size={14} /></button>
                          </div>
                          <MemoizedPlanView plan={cmpPlan} monthKey={compareMonth} profile={profile} userAverages={userAverages} averages={averages} isPast={cmpYm.isPast} realData={cmpRealData} expenses={expenses} fixedCostArgs={fixedCostArgs} />
                        </div>
                      );
                    })()}
                  </div>
                ) : editPlan ? (
                  <MemoizedEditPlanForm plan={editPlan} monthKey={ym.key} monthLabel={ym.label} profile={profile} userAverages={userAverages} averages={averages} isPast={ym.isPast} realData={realData} expenses={expenses} copiedMonthPlan={copiedMonthPlan} fixedCostArgs={fixedCostArgs} onSave={(updated) => { try { if (plan) { onUpdatePlan?.(updated); } else { onAddPlan?.(updated); } } catch (err) { console.error('[Agenda] onSave plan error:', err); } collapseMonth(); }} onCancel={collapseMonth} />
                ) : (
                  <div className="text-center py-6">
                    <p className="text-slate-500 text-sm mb-4">Nenhum plano criado para {ym.label}.</p>
                    <div className="flex flex-wrap justify-center gap-2">
                      <button onClick={() => { const days = profile?.workSchedule ? applyDefaultHours(profile.workSchedule) : getDefaultSchedule(); setEditPlan({ id: crypto.randomUUID(), month: ym.key, days, vacations: [] }); setExpandedState('edit'); }} className="px-4 py-2.5 min-h-[44px] bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold rounded-xl transition-colors">Criar plano do Perfil</button>
                      <button onClick={() => { setEditPlan({ id: crypto.randomUUID(), month: ym.key, days: getEmptySchedule(), vacations: [] }); setExpandedState('edit'); }} className="px-4 py-2.5 min-h-[44px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-sm font-bold rounded-xl hover:bg-slate-200 transition-colors">Começar do zero</button>
                      {copiedMonthPlan && (
                        <button onClick={() => handlePastePlan(ym.key, ym.label)} className="px-4 py-2.5 min-h-[44px] bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 text-sm font-bold rounded-xl hover:bg-emerald-100 transition-colors flex items-center gap-1.5"><ClipboardPaste size={16} /> Colar de {copiedMonthPlan.monthLabel}</button>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })()}
        </AnimatePresence>

        <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-bold dark:text-white flex items-center gap-2"><TrendingUp size={14} /> Resumo do Ano</h4>
              <p className="text-xs text-slate-400">Dados reais + meses planejados — meses sem plano são R$ 0</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => { const currentMonthKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`; const ids = plans.filter(p => p.month > currentMonthKey).map(p => p.id); if (ids.length === 0) return; requestConfirm('Resetar futuros', `${ids.length} plano(s) futuro(s) serão apagados. Tem certeza?`, () => onBulkDeletePlans?.(ids)); }} className="flex items-center gap-1 px-3 py-1.5 min-h-[36px] bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 text-xs font-bold rounded-lg hover:bg-orange-100 transition-colors"><Trash2 size={12} /> Resetar Futuros</button>
              <button onClick={() => { requestConfirm('Resetar tudo', 'Todos os planejamentos do ano serão apagados. Tem certeza?', () => { const ids = plans.map(p => p.id); if (ids.length > 0) onBulkDeletePlans?.(ids); }); }} className="flex items-center gap-1 px-3 py-1.5 min-h-[36px] bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 text-xs font-bold rounded-lg hover:bg-rose-100 transition-colors"><Trash2 size={12} /> Resetar Tudo</button>
            </div>
          </div>

          {yearEndProjection && (yearEndProjection.earnings > 0 || yearEndProjection.fuelCost > 0 || yearEndProjection.fixedCosts > 0 || plans.length > 0) && (
            <>
              <div className="mb-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <BarChart3 size={16} className="text-brand-600" />
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Projeção Acumulada</span>
                </div>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={accumulatedChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                      <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" tickFormatter={(v: number) => `R$${(v / 1000).toFixed(0)}k`} />
                      <RechartsTooltip
                        contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                        formatter={(value: number, name: string) => [`R$ ${value.toLocaleString('pt-BR')}`, name === 'earnings' ? 'Ganhos' : name === 'expenses' ? 'Gastos' : 'Lucro']}
                      />
                      <Area type="monotone" dataKey="earnings" stroke="#22c55e" fill="#22c55e" fillOpacity={0.1} strokeWidth={2} name="earnings" />
                      <Area type="monotone" dataKey="expenses" stroke="#f43f5e" fill="#f43f5e" fillOpacity={0.1} strokeWidth={2} name="expenses" />
                      <Area type="monotone" dataKey="profit" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} strokeWidth={2} name="profit" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              {renderProjectionCards(yearEndProjection, profile)}
              <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
                <span>{yearEndProjection.totalWorkDays} dias trabalhados</span>
                <span>{yearEndProjection.totalHours.toFixed(1)} horas totais</span>
                <span>R$ {profile?.hourlyRate?.toFixed(2) || averages.perHour.toFixed(2)}/h</span>
              </div>
            </>
          )}
        </div>
        </motion.div>
      )}
    </AnimatePresence>
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div
          className="fixed inset-0 z-50"
          onContextMenu={e => { e.preventDefault(); setContextMenu(null); }}
        >
          <div
            className="absolute bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-1 min-w-[180px] overflow-hidden"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            {contextMenu.hasPlan ? (
              <>
                <button onClick={() => { handleCopyPlan({ key: contextMenu.monthKey, label: contextMenu.monthLabel, fullLabel: contextMenu.fullLabel }, contextMenu.plan); setContextMenu(null); }} className="w-full flex items-center gap-2 px-3 py-2 min-h-[36px] text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"><Copy size={14} /> Copiar</button>
                <button onClick={() => { setExpandedMonth(contextMenu.monthKey); setExpandedState('view'); setEditPlan(null); setContextMenu(null); }} className="w-full flex items-center gap-2 px-3 py-2 min-h-[36px] text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"><Eye size={14} /> Visualizar</button>
                <button onClick={() => { setExpandedMonth(contextMenu.monthKey); setEditPlan({ ...contextMenu.plan!, days: (contextMenu.plan!.days || []).map(d => ({ ...d, periods: (d.periods || []).map(p => ({ ...p })) })), vacations: [...(contextMenu.plan!.vacations || [])] }); setExpandedState('edit'); setContextMenu(null); }} className="w-full flex items-center gap-2 px-3 py-2 min-h-[36px] text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"><Pencil size={14} /> Editar</button>
                <button onClick={() => { setExpandedMonth(contextMenu.monthKey); setExpandedState('view'); setEditPlan(null); setShowComparePicker(true); setContextMenu(null); }} className="w-full flex items-center gap-2 px-3 py-2 min-h-[36px] text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"><Columns3 size={14} /> Comparar</button>
                <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />
                <button onClick={() => { requestConfirm('Excluir plano', `Tem certeza que deseja excluir o plano de ${contextMenu.fullLabel}?`, () => onDeletePlan?.(contextMenu.plan!.id)); setContextMenu(null); }} className="w-full flex items-center gap-2 px-3 py-2 min-h-[36px] text-xs font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors text-left"><Trash2 size={14} /> Excluir</button>
              </>
            ) : (
              <>
                <button onClick={() => { setExpandedMonth(contextMenu.monthKey); setExpandedState('create'); setEditPlan(null); setContextMenu(null); }} className="w-full flex items-center gap-2 px-3 py-2 min-h-[36px] text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"><Plus size={14} /> Criar plano</button>
                {copiedMonthPlan && (
                  <button onClick={() => { handlePastePlan(contextMenu.monthKey, contextMenu.monthLabel, undefined); setContextMenu(null); }} className="w-full flex items-center gap-2 px-3 py-2 min-h-[36px] text-xs font-bold text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors text-left"><ClipboardPaste size={14} /> Colar de {copiedMonthPlan.monthLabel}</button>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal de confirmacao destrutiva */}
      {confirmState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setConfirmState(null)}>
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="bg-white dark:bg-slate-900 rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl border border-slate-200 dark:border-slate-700"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center"><AlertTriangle size={16} className="text-rose-600" /></div>
              <h3 className="text-base font-bold dark:text-white">{confirmState.title}</h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">{confirmState.message}</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmState(null)} className="px-4 py-2 min-h-[36px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-sm font-bold rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">Cancelar</button>
              <button onClick={() => { confirmState.onConfirm(); setConfirmState(null); }} className="px-4 py-2 min-h-[36px] bg-rose-600 text-white text-sm font-bold rounded-lg hover:bg-rose-700 transition-colors flex items-center gap-1"><Trash2 size={14} /> Apagar</button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

const PlanView = React.memo(function PlanView({ plan, monthKey, profile, userAverages, averages, isPast, realData, expenses, fixedCostArgs }: {
  plan: MonthlyPlan; monthKey: string; profile?: UserProfile | null;
  userAverages: { earningsPerDay: number; kmPerDay: number; fuelPerDay: number; maintPerDay: number; hoursPerDay: number };
  averages: { perHour: number; perDay: number; perKm: number; expenseRatio: number };
  isPast?: boolean; realData?: { earnings: number; fuelCost: number; maintCost: number; otherCost: number; totalExpenses: number; netProfit: number; rideDays: number; hasData: boolean } | null;
  expenses?: Expense[]; fixedCostArgs: { ipvaValue: number; licensingValue: number; insuranceValue: number; vehicleInstallmentValue: number };
}) {
  const defaultHourlyRate = profile?.hourlyRate || averages.perHour || 0;

  const histConsumption = useMemo(() => {
    if (!expenses || expenses.length === 0) return null;
    return calculateHistoricalAverage(expenses, 'gasolina');
  }, [expenses]);

  const monthProjection = useMemo(() => {
    const [yr, mo] = monthKey.split('-').map(Number);
    return computeMonthProjection({
      year: yr, month: mo - 1, days: plan.days, vacations: plan.vacations || [],
      customHourlyRate: plan.customHourlyRate, customFuelCost: plan.customFuelCost, customMaintCost: plan.customMaintCost,
      defaultHourlyRate, fuelPerDay: userAverages.fuelPerDay, maintPerDay: userAverages.maintPerDay, kmPerDay: userAverages.kmPerDay,
      ...fixedCostArgs
    });
  }, [plan, monthKey, defaultHourlyRate, userAverages, fixedCostArgs]);

  const [yr, mo] = monthKey.split('-').map(Number);
  const calendarDays = useMemo(() => buildCalendarDays(yr, mo), [yr, mo]);
  const vacMap = useMemo(() => buildVacationMap(plan.vacations || []), [plan.vacations]);

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-brand-50 dark:bg-brand-950/30"><Clock size={14} className="text-brand-600" /></div>
          <h3 className="text-sm font-bold text-slate-600 dark:text-slate-300">Escala Semanal</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
          {(plan.days || []).map((day) => {
            const dayHours = day.active ? (day.periods || []).reduce((acc, p) => {
              if (!p.start || !p.end || !p.start.includes(':') || !p.end.includes(':')) return acc;
              const [sH, sM] = p.start.split(':').map(Number);
              const [eH, eM] = p.end.split(':').map(Number);
              if (isNaN(sH) || isNaN(sM) || isNaN(eH) || isNaN(eM)) return acc;
              let diff = (eH * 60 + eM) - (sH * 60 + sM);
              if (diff < 0) diff += 24 * 60;
              return acc + diff / 60;
            }, 0) : 0;
            return (
              <div key={day.day} className="space-y-0.5">
                <div className={cn("w-full py-1.5 px-0.5 rounded text-xs font-bold border text-center", day.active ? "bg-brand-50 dark:bg-brand-950/30 text-brand-600 dark:text-brand-400 border-brand-200 dark:border-brand-900/30" : "bg-slate-50 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700")}>{day.day}{dayHours > 0 ? ` ${dayHours.toFixed(1)}h` : ''}</div>
                {day.active && (day.periods || []).some(p => p.start !== '00:00' || p.end !== '00:00') && (
                  <div className="space-y-0">
                    {(day.periods || []).map((period, pIdx) => (
                      <div key={pIdx} className="text-center">
                        {(day.periods || []).length > 1 && <span className="text-xs text-slate-400 font-bold">T{pIdx + 1}</span>}
                        <p className="text-xs font-medium text-slate-600 dark:text-slate-300">{period.start}-{period.end}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-2">
          <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-orange-50 dark:bg-orange-950/30"><Calendar size={14} className="text-orange-600" /></div>
          <h3 className="text-sm font-bold text-slate-600 dark:text-slate-300">Calendário</h3>
        </div>
        <div className="max-w-sm mx-auto">
          <div className="flex gap-1.5 mb-1 flex-wrap">
            <span className="inline-flex items-center gap-0.5 text-xs font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 px-1 py-0.5 rounded border border-emerald-200 dark:border-emerald-900/30"><CheckCircle2 size={10} /> Trabalho</span>
            <span className="inline-flex items-center gap-0.5 text-xs font-bold text-amber-700 bg-amber-50 dark:bg-amber-950/30 px-1 py-0.5 rounded border border-amber-200 dark:border-amber-900/30"><Sun size={10} /> Folga</span>
            <span className="inline-flex items-center gap-0.5 text-xs font-bold text-orange-700 bg-orange-50 dark:bg-orange-950/30 px-1 py-0.5 rounded border border-orange-200 dark:border-orange-900/30"><Palmtree size={10} /> Férias</span>
            <span className="inline-flex items-center gap-0.5 text-xs font-bold text-slate-500 bg-slate-50 dark:bg-slate-800 px-1 py-0.5 rounded border border-slate-200 dark:border-slate-700"><span className="w-2 h-2 rounded-sm bg-emerald-500 opacity-40" /> Menos horas</span>
            <span className="inline-flex items-center gap-0.5 text-xs font-bold text-slate-500 bg-slate-50 dark:bg-slate-800 px-1 py-0.5 rounded border border-slate-200 dark:border-slate-700"><span className="w-2 h-2 rounded-sm bg-emerald-700" /> Mais horas</span>
          </div>
          <div className="flex gap-3 items-start">
            <div className="flex-1 min-w-0">
              <div className="grid grid-cols-7 gap-1">
                {WEEKDAY_NAMES.map((dn, i) => (
                  <div key={i} className="text-center text-xs font-bold text-slate-500 py-2">{dn}</div>
                ))}
                {calendarDays.map((day, i) => {
                  if (day === null) return <div key={`empty-${i}`} className="aspect-square" />;
                  const dateStr = format(new Date(yr, mo - 1, day), 'yyyy-MM-dd');
                  const vType = getVacationType(vacMap, dateStr);
                  const dayOfWeek = new Date(yr, mo - 1, day).getDay();
                  const dayName = WEEKDAY_NAMES[dayOfWeek];
                  const schedDay = (plan.days || []).find(sd => sd.day === dayName);
                  const isWork = schedDay?.active && !vType;
                  const dayHours = isWork ? (schedDay?.periods || []).reduce((acc, p) => {
                    if (!p.start || !p.end) return acc;
                    const [sH, sM] = p.start.split(':').map(Number);
                    const [eH, eM] = p.end.split(':').map(Number);
                    if (isNaN(sH)) return acc;
                    let diff = (eH * 60 + eM) - (sH * 60 + sM);
                    if (diff < 0) diff += 24 * 60;
                    return acc + diff / 60;
                  }, 0) : 0;
                  const intensity = isWork ? Math.min(1, dayHours / 12) : 0;
                  return (
                    <div key={day} className={cn("aspect-square rounded-xl flex flex-col items-center justify-center border transition-colors text-[11px]", vType === 'ferias' ? "bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-800" : vType === 'folga' ? "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800" : isWork ? "border-emerald-200 dark:border-emerald-800" : "border-slate-100 dark:border-slate-800")}
                      style={isWork ? { backgroundColor: `rgba(16, 185, 129, ${0.08 + intensity * 0.35})`, color: intensity > 0.5 ? '#065f46' : undefined } : {}}
                    >
                      <span className="font-bold">{day}</span>
                      {isWork && <span className="text-[9px] text-slate-500">{dayHours.toFixed(1)}h</span>}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="flex flex-col items-center gap-2 pt-8 w-10 shrink-0">
              <div className="text-center">
                <div className="text-lg font-bold dark:text-white">{monthProjection.workDays}</div>
                <div className="text-[9px] text-slate-500 font-medium leading-tight">dias</div>
                <div className="text-[9px] text-slate-500 font-medium leading-tight">trab.</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-amber-600">{monthProjection.folgaCount}</div>
                <div className="text-[9px] text-slate-500 font-medium leading-tight">folgas</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-orange-600">{monthProjection.feriasCount}</div>
                <div className="text-[9px] text-slate-500 font-medium leading-tight">férias</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-2">
          <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-950/30"><Wallet size={14} className="text-emerald-600" /></div>
          <h3 className="text-sm font-bold text-slate-600 dark:text-slate-300">Financeiro</h3>
        </div>

        {isPast && realData?.hasData && (
          <div className="border-t border-slate-200 dark:border-slate-700 pt-2 space-y-2">
            <p className="text-sm font-bold text-slate-500 uppercase">Dados Reais vs Planejado</p>
            {[
              { label: 'Ganhos', real: realData.earnings, plan: monthProjection.earnings, color: 'emerald' },
              { label: 'Combustível', real: realData.fuelCost, plan: monthProjection.fuelCost, color: 'orange' },
              { label: 'Manutenção', real: realData.maintCost, plan: monthProjection.maintCost, color: 'purple' },
              { label: 'Lucro', real: realData.netProfit, plan: monthProjection.netProfit, color: 'blue' },
            ].map(item => {
              const maxVal = Math.max(Math.abs(item.real), Math.abs(item.plan), 1);
              return (
                <div key={item.label} className="space-y-0.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">{item.label}</span>
                    <span className={cn("font-bold", item.real >= item.plan ? "text-emerald-600" : "text-rose-600")}>
                      {((item.real - item.plan) >= 0 ? '+' : '')}{(item.real - item.plan).toFixed(0)}
                    </span>
                  </div>
                  <div className="relative h-5 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden">
                    <div className="absolute inset-0 flex items-center">
                      <div className="h-full bg-slate-200 dark:bg-slate-700 rounded-lg" style={{ width: `${(Math.abs(item.plan) / maxVal) * 100}%`, marginLeft: item.plan < 0 ? 'auto' : 0 }} />
                    </div>
                    <div className="absolute inset-0 flex items-center">
                      <div className={cn("h-full rounded-lg opacity-80", item.real >= item.plan ? "bg-emerald-500" : "bg-rose-500")} style={{ width: `${(Math.abs(item.real) / maxVal) * 100}%` }} />
                    </div>
                    <div className="absolute inset-x-0 top-0 flex items-center justify-between px-2 text-xs font-bold text-slate-900 dark:text-white leading-5">
                      <span>R$ {item.real.toFixed(0)}</span>
                      <span className="text-slate-400">Plano: R$ {item.plan.toFixed(0)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {isPast && !realData?.hasData && (plan.actualEarnings != null || plan.actualFuelCost != null) && (
          <div className="border-t border-slate-200 dark:border-slate-700 pt-2 space-y-1.5">
            <p className="text-sm font-bold text-slate-500 uppercase">Dados Reais Informados</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs">
              {plan.actualEarnings != null && <div><span className="text-slate-400">Ganhos</span><p className="font-bold dark:text-white">R$ {plan.actualEarnings.toFixed(0)}</p></div>}
              {plan.actualFuelCost != null && <div><span className="text-slate-400">Comb.</span><p className="font-bold dark:text-white">R$ {plan.actualFuelCost.toFixed(0)}</p></div>}
              {plan.actualMaintCost != null && <div><span className="text-slate-400">Manut.</span><p className="font-bold dark:text-white">R$ {plan.actualMaintCost.toFixed(0)}</p></div>}
              {plan.actualOtherCost != null && <div><span className="text-slate-400">Outros</span><p className="font-bold dark:text-white">R$ {plan.actualOtherCost.toFixed(0)}</p></div>}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
          <div className="p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
            <label className="text-xs font-bold text-slate-400 uppercase block mb-0.5">Valor/hora</label>
            <p className="text-sm font-bold dark:text-white">R$ {(plan.customHourlyRate ?? defaultHourlyRate).toFixed(2)}{plan.customHourlyRate != null ? ' (custom)' : ''}</p>
          </div>
          <div className="p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
            <label className="text-xs font-bold text-slate-400 uppercase block mb-0.5">Combustível/mês</label>
            <p className="text-sm font-bold dark:text-white">R$ {monthProjection.fuelCost.toFixed(0)}{plan.customFuelCost != null ? ' (custom)' : ''}</p>
          </div>
          <div className="p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
            <label className="text-xs font-bold text-slate-400 uppercase block mb-0.5">Manutenção/mês</label>
            <p className="text-sm font-bold dark:text-white">R$ {monthProjection.maintCost.toFixed(0)}{plan.customMaintCost != null ? ' (custom)' : ''}</p>
          </div>
        </div>

        {histConsumption && (
          <div className="p-2 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-100 dark:border-orange-900/30">
            <p className="text-xs font-bold text-orange-600 uppercase mb-1">Consumo</p>
            <div className="flex items-center justify-between text-xs"><span className="text-slate-500">Média calibrada</span><span className="font-bold text-orange-600 dark:text-orange-400">{histConsumption.toFixed(1)} km/l</span></div>
            <div className="flex items-center justify-between text-xs"><span className="text-slate-500">KM estimados</span><span className="font-bold dark:text-white">{monthProjection.km.toFixed(0)} km</span></div>
            <div className="flex items-center justify-between text-xs"><span className="text-slate-500">Litros estimados</span><span className="font-bold dark:text-white">{(monthProjection.km / histConsumption).toFixed(0)} L</span></div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-1.5">
          <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-100 dark:border-emerald-900/30 text-center">
            <p className="text-xs text-emerald-600 font-bold uppercase">Receitas</p>
            <p className="text-sm font-bold dark:text-white">R$ {monthProjection.earnings.toFixed(0)}</p>
            <p className="text-xs text-slate-400">{monthProjection.workDays} dias no mês &middot; {monthProjection.totalHours.toFixed(1)} horas mensais</p>
          </div>
          <div className="p-2 bg-rose-50 dark:bg-rose-950/30 rounded-lg border border-rose-100 dark:border-rose-900/30 text-center">
            <p className="text-xs text-rose-600 font-bold uppercase">Despesas</p>
            <p className="text-sm font-bold dark:text-white">R$ {monthProjection.totalExpenses.toFixed(0)}</p>
            <p className="text-xs text-slate-400">Combustível + Manutenção + Fixos</p>
            <div className="text-xs text-slate-400 space-y-0.5 mt-0.5">
              {((profile?.ipvaValue || 0) / 12) > 0 && <p>IPVA R$ {((profile?.ipvaValue || 0) / 12).toFixed(0)}/mês</p>}
              {((profile?.licensingValue || 0) / 12) > 0 && <p>Licenciamento R$ {((profile?.licensingValue || 0) / 12).toFixed(0)}/mês</p>}
              {(profile?.insuranceValue || 0) > 0 && <p>Seguro R$ {(profile?.insuranceValue || 0).toFixed(0)}/mês</p>}
              {(profile?.vehicleInstallmentValue || 0) > 0 && <p>Parcela R$ {(profile?.vehicleInstallmentValue || 0).toFixed(0)}/mês</p>}
            </div>
          </div>
          <div className={cn("p-2 rounded-lg border text-center", monthProjection.netProfit >= 0 ? "bg-blue-50 dark:bg-blue-950/30 border-blue-100 dark:border-blue-900/30" : "bg-rose-50 dark:bg-rose-950/30 border-rose-100 dark:border-rose-900/30")}>
            <p className={cn("text-xs font-bold uppercase", monthProjection.netProfit >= 0 ? "text-blue-600" : "text-rose-600")}>Lucro</p>
            <p className={cn("text-sm font-bold", monthProjection.netProfit >= 0 ? "text-blue-700 dark:text-blue-400" : "text-rose-700 dark:text-rose-400")}>R$ {monthProjection.netProfit.toFixed(0)}</p>
          </div>
        </div>
      </div>

        {monthProjection.fuelCost > 0 || monthProjection.maintCost > 0 || monthProjection.fixedCosts > 0 ? (
          <div className="flex items-center gap-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="w-20 h-20 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={[
                    { name: 'Combustível', value: Math.round(monthProjection.fuelCost) },
                    { name: 'Manutenção', value: Math.round(monthProjection.maintCost) },
                    { name: 'Custos Fixos', value: Math.round(monthProjection.fixedCosts) },
                  ].filter(d => d.value > 0)} cx="50%" cy="50%" innerRadius={22} outerRadius={36} paddingAngle={2} dataKey="value">
                    {[
                      { name: 'Combustível', color: '#f97316' },
                      { name: 'Manutenção', color: '#a855f7' },
                      { name: 'Custos Fixos', color: '#64748b' },
                    ].filter((_, i) => [monthProjection.fuelCost, monthProjection.maintCost, monthProjection.fixedCosts][i] > 0).map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-1">
              {monthProjection.fuelCost > 0 && <div className="flex items-center justify-between text-xs"><div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-orange-500" /><span className="text-slate-500">Combustível</span></div><span className="font-bold dark:text-white">R$ {monthProjection.fuelCost.toFixed(0)}</span></div>}
              {monthProjection.maintCost > 0 && <div className="flex items-center justify-between text-xs"><div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-purple-500" /><span className="text-slate-500">Manutenção</span></div><span className="font-bold dark:text-white">R$ {monthProjection.maintCost.toFixed(0)}</span></div>}
              {monthProjection.fixedCosts > 0 && <div className="flex items-center justify-between text-xs"><div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-500" /><span className="text-slate-500">Custos Fixos</span></div><span className="font-bold dark:text-white">R$ {monthProjection.fixedCosts.toFixed(0)}</span></div>}
            </div>
          </div>
        ) : null}

        {plan.notes && (
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase block mb-0.5">Observações</label>
          <p className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg border border-slate-200 dark:border-slate-700 whitespace-pre-wrap">{plan.notes}</p>
        </div>
      )}
    </div>
  );
});

const MemoizedPlanView = React.memo(PlanView);

const EditPlanForm = React.memo(function EditPlanForm({ plan, monthKey, monthLabel, onSave, onCancel, profile, userAverages, averages, isPast, realData, expenses, copiedMonthPlan, fixedCostArgs }: {
  plan: MonthlyPlan; monthKey: string; monthLabel: string; onSave: (plan: MonthlyPlan) => void; onCancel: () => void;
  profile?: UserProfile | null;
  userAverages: { earningsPerDay: number; kmPerDay: number; fuelPerDay: number; maintPerDay: number; hoursPerDay: number };
  averages: { perHour: number; perDay: number; perKm: number; expenseRatio: number };
  isPast?: boolean; realData?: { earnings: number; fuelCost: number; maintCost: number; otherCost: number; totalExpenses: number; netProfit: number; rideDays: number; hasData: boolean } | null;
  expenses?: Expense[];
  copiedMonthPlan?: { month: string; monthLabel: string; days: WorkDay[]; vacations: VacationEntry[]; notes?: string; customHourlyRate?: number; customFuelCost?: number; customMaintCost?: number; customKmPerLiter?: number } | null;
  fixedCostArgs: { ipvaValue: number; licensingValue: number; insuranceValue: number; vehicleInstallmentValue: number };
}) {
  const [localPlan, setLocalPlan] = useState<MonthlyPlan>(plan);
  const [copiedPlanPeriods, setCopiedPlanPeriods] = useState<WorkPeriod[] | null>(null);
  const [showMedias, setShowMedias] = useState(false);
  const [openSections, setOpenSections] = useState({ schedule: true, calendar: true, financial: true, notes: false });
  const [dragState, setDragState] = useState<{ active: boolean; type: 'folga' | 'ferias'; dates: Set<string> } | null>(null);

  const defaultHourlyRate = profile?.hourlyRate || averages.perHour || 0;

  const histConsumption = useMemo(() => {
    if (!expenses || expenses.length === 0) return null;
    return calculateHistoricalAverage(expenses, 'gasolina');
  }, [expenses]);

  const monthProjection = useMemo(() => {
    const [yr, mo] = monthKey.split('-').map(Number);
    return computeMonthProjection({
      year: yr, month: mo - 1, days: localPlan.days, vacations: localPlan.vacations || [],
      customHourlyRate: localPlan.customHourlyRate, customFuelCost: localPlan.customFuelCost, customMaintCost: localPlan.customMaintCost,
      defaultHourlyRate, fuelPerDay: userAverages.fuelPerDay, maintPerDay: userAverages.maintPerDay, kmPerDay: userAverages.kmPerDay,
      ...fixedCostArgs
    });
  }, [localPlan, monthKey, defaultHourlyRate, userAverages, fixedCostArgs]);

  const [yr, mo] = monthKey.split('-').map(Number);
  const daysInMonth = new Date(yr, mo, 0).getDate();
  const calendarDays = useMemo(() => buildCalendarDays(yr, mo), [yr, mo]);
  const vacMap = useMemo(() => buildVacationMap(localPlan.vacations || []), [localPlan.vacations]);

  const updateDays = useCallback((updater: (days: WorkDay[]) => WorkDay[]) => {
    setLocalPlan(prev => ({ ...prev, days: updater(prev.days || []) }));
  }, []);

  const toggleDay = useCallback((idx: number) => {
    updateDays(days => days.map((d, i) => i === idx ? { ...d, active: !d.active } : d));
  }, [updateDays]);

  const toggleVacation = useCallback((dateStr: string) => {
    setLocalPlan(prev => {
      const vacations = prev.vacations || [];
      const existing = vacations.findIndex(v => v.date === dateStr);
      if (existing >= 0) {
        const entry = vacations[existing];
        if (entry.type === 'folga') {
          const updated = [...vacations];
          updated[existing] = { ...entry, type: 'ferias' };
          return { ...prev, vacations: updated };
        } else {
          return { ...prev, vacations: vacations.filter(v => v.date !== dateStr) };
        }
      } else {
        return { ...prev, vacations: [...vacations, { date: dateStr, type: 'folga' }] };
      }
    });
  }, []);

  const setMonthAsFerias = useCallback(() => {
    const newVacations: VacationEntry[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = format(new Date(yr, mo - 1, d), 'yyyy-MM-dd');
      const existing = (localPlan.vacations || []).find(v => v.date === dateStr);
      if (existing) {
        if (existing.type === 'folga') {
          newVacations.push({ date: dateStr, type: 'ferias' });
        } else {
          newVacations.push(existing);
        }
      } else {
        newVacations.push({ date: dateStr, type: 'ferias' });
      }
    }
    setLocalPlan(prev => ({ ...prev, vacations: newVacations }));
  }, [yr, mo, daysInMonth, localPlan.vacations]);

  const clearAllVacations = useCallback(() => {
    setLocalPlan(prev => ({ ...prev, vacations: [] }));
  }, []);

  const copyFromProfile = useCallback(() => {
    const workSchedule = profile?.workSchedule;
    if (workSchedule) {
      setLocalPlan(prev => ({ ...prev, days: workSchedule.map((d: WorkDay) => ({ ...d, periods: (d.periods || []).map((p: WorkPeriod) => ({ ...p })) })) }));
    }
  }, [profile?.workSchedule]);

  const addPeriod = useCallback((dayIndex: number) => {
    updateDays(days => days.map((d, i) => i === dayIndex ? { ...d, periods: [...(d.periods || []), { start: '00:00', end: '00:00' }] } : d));
  }, [updateDays]);

  const removePeriod = useCallback((dayIndex: number, periodIndex: number) => {
    updateDays(days => days.map((d, i) => i === dayIndex && (d.periods || []).length > 1 ? { ...d, periods: (d.periods || []).filter((_, pi) => pi !== periodIndex) } : d));
  }, [updateDays]);

  const updatePeriod = useCallback((dayIndex: number, periodIndex: number, field: 'start' | 'end', value: string) => {
    updateDays(days => days.map((d, i) => i === dayIndex ? { ...d, periods: (d.periods || []).map((p, pi) => pi === periodIndex ? { ...p, [field]: value } : p) } : d));
  }, [updateDays]);

  const handleCalendarPointerDown = useCallback((dateStr: string, e: React.PointerEvent) => {
    e.preventDefault();
    const currentType = vacMap.get(dateStr)?.type;
    let nextType: 'folga' | 'ferias' | null;
    if (!currentType) nextType = 'folga';
    else if (currentType === 'folga') nextType = 'ferias';
    else nextType = null;

    if (nextType) {
      setDragState({ active: true, type: nextType, dates: new Set([dateStr]) });
      setLocalPlan(prev => {
        const vacations = (prev.vacations || []).filter(v => v.date !== dateStr);
        return { ...prev, vacations: [...vacations, { date: dateStr, type: nextType! }] };
      });
    } else {
      setDragState({ active: true, type: 'folga', dates: new Set() });
      setLocalPlan(prev => ({ ...prev, vacations: (prev.vacations || []).filter(v => v.date !== dateStr) }));
    }
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [vacMap]);

  const handleCalendarPointerMove = useCallback((dateStr: string) => {
    if (!dragState?.active) return;
    if (dragState.dates.has(dateStr)) return;
    setDragState(prev => {
      if (!prev) return prev;
      const newDates = new Set(prev.dates);
      newDates.add(dateStr);
      return { ...prev, dates: newDates };
    });
    setLocalPlan(prev => {
      const vacations = prev.vacations || [];
      const existing = vacations.find(v => v.date === dateStr);
      if (dragState.type === 'ferias') {
        if (existing?.type === 'ferias') return prev;
        const filtered = vacations.filter(v => v.date !== dateStr);
        return { ...prev, vacations: [...filtered, { date: dateStr, type: 'ferias' }] };
      } else {
        if (existing) return prev;
        return { ...prev, vacations: [...vacations, { date: dateStr, type: 'folga' }] };
      }
    });
  }, [dragState]);

  const handleCalendarPointerUp = useCallback(() => {
    setDragState(null);
  }, []);

  const toggleSection = useCallback((key: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const SectionHeader = ({ icon, color, label, sectionKey, count }: { icon: React.ReactNode; color: string; label: string; sectionKey: keyof typeof openSections; count?: string }) => (
    <button onClick={() => toggleSection(sectionKey)} className="w-full flex items-center justify-between py-2 group">
      <div className="flex items-center gap-2">
        <div className={cn("flex items-center justify-center w-6 h-6 rounded-lg", color)}>{icon}</div>
        <h3 className="text-sm font-bold text-slate-600 dark:text-slate-300">{label}</h3>
        {count && <span className="text-xs font-bold text-slate-400">{count}</span>}
      </div>
      {openSections[sectionKey] ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
    </button>
  );

  return (
    <div className="space-y-3">
      <div>
        <SectionHeader icon={<Clock size={14} className="text-brand-600" />} color="bg-brand-50 dark:bg-brand-950/30" label="Escala Semanal" sectionKey="schedule" />
        <AnimatePresence>
          {openSections.schedule && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.15 }} className="overflow-hidden">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2 pt-2">
                {(localPlan.days || []).map((day, i) => {
                  const dayHours = day.active ? (day.periods || []).reduce((acc, p) => {
                    if (!p.start || !p.end || !p.start.includes(':') || !p.end.includes(':')) return acc;
                    const [sH, sM] = p.start.split(':').map(Number);
                    const [eH, eM] = p.end.split(':').map(Number);
                    if (isNaN(sH) || isNaN(sM) || isNaN(eH) || isNaN(eM)) return acc;
                    let diff = (eH * 60 + eM) - (sH * 60 + sM);
                    if (diff < 0) diff += 24 * 60;
                    return acc + diff / 60;
                  }, 0) : 0;
                  return (
                    <div key={day.day} className="space-y-0.5">
                      <button onClick={() => toggleDay(i)} className={cn("w-full py-1.5 px-0.5 rounded text-xs font-bold border transition-colors min-h-[36px]", day.active ? "bg-brand-600 text-white border-brand-700" : "bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700")}>{day.day}{dayHours > 0 ? ` ${dayHours.toFixed(1)}h` : ''}</button>
                      {day.active && (
                        <div className="space-y-0" onClick={e => e.stopPropagation()}>
                          <div className="flex justify-center gap-1 mb-0.5">
                            <button onClick={() => setCopiedPlanPeriods([...(day.periods || []).map(p => ({ ...p }))])} title="Copiar escala" className="p-0.5 min-w-[24px] min-h-[24px] flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors text-slate-400 hover:text-brand-600"><Copy size={10} /></button>
                            {copiedPlanPeriods && <button onClick={() => { if (!copiedPlanPeriods) return; const newDays = [...(localPlan.days || [])]; newDays[i] = { ...newDays[i], active: true, periods: copiedPlanPeriods.map(p => ({ ...p })) }; setLocalPlan({ ...localPlan, days: newDays }); }} title="Colar escala" className="p-0.5 min-w-[24px] min-h-[24px] flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors text-slate-400 hover:text-emerald-600"><ClipboardCheck size={10} /></button>}
                          </div>
                          {(day.periods || []).map((period, pIdx) => (
                            <div key={pIdx}>
                              {(day.periods || []).length > 1 && <div className="flex items-center justify-between"><span className="text-xs font-bold text-slate-400">T{pIdx + 1}</span><button onClick={() => removePeriod(i, pIdx)} className="text-rose-500 hover:text-rose-600"><Trash2 size={8} /></button></div>}
                              <input type="time" value={period.start} onChange={(e) => updatePeriod(i, pIdx, 'start', e.target.value)} className="w-full text-xs bg-slate-50 dark:bg-slate-800 px-1 py-1 min-h-[36px] rounded border border-slate-200 dark:border-slate-700 dark:text-white outline-none focus:ring-1 focus:ring-brand-500" />
                              <input type="time" value={period.end} onChange={(e) => updatePeriod(i, pIdx, 'end', e.target.value)} className="w-full text-xs bg-slate-50 dark:bg-slate-800 px-1 py-1 min-h-[36px] rounded border border-slate-200 dark:border-slate-700 dark:text-white outline-none focus:ring-1 focus:ring-brand-500" />
                            </div>
                          ))}
                          <button onClick={() => addPeriod(i)} className="w-full py-1.5 flex items-center justify-center gap-1 bg-brand-50 dark:bg-brand-950/30 text-brand-600 rounded border border-brand-100 dark:border-brand-900/30 hover:bg-brand-100 transition-colors text-xs font-bold min-h-[36px]"><Plus size={14} /> Novo</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div>
        <SectionHeader icon={<Calendar size={14} className="text-orange-600" />} color="bg-orange-50 dark:bg-orange-950/30" label="Calendário" sectionKey="calendar" count={dragState?.active ? `${dragState.dates.size} selecionados` : undefined} />
        <AnimatePresence>
          {openSections.calendar && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.15 }} className="overflow-hidden">
              <div className="max-w-sm mx-auto pt-2">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Clique: trabalho → folga → férias → trabalho &middot; Arraste para selecionar vários</p>
                <div className="flex gap-1.5 mb-2 flex-wrap">
                  <button onClick={setMonthAsFerias} className="flex items-center gap-1 px-2 py-1.5 min-h-[36px] text-xs font-bold text-orange-700 bg-orange-50 dark:bg-orange-950/30 rounded-lg border border-orange-200 dark:border-orange-900/30 hover:bg-orange-100 transition-colors"><Palmtree size={12} /> Mês todo férias</button>
                  <button onClick={clearAllVacations} className="flex items-center gap-1 px-2 py-1.5 min-h-[36px] text-xs font-bold text-slate-600 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 transition-colors"><X size={12} /> Limpar</button>
                </div>

                <div className="flex gap-1.5 mb-1 flex-wrap">
                  <span className="inline-flex items-center gap-0.5 text-xs font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 px-1 py-0.5 rounded border border-emerald-200 dark:border-emerald-900/30"><CheckCircle2 size={10} /> Trabalho</span>
                  <span className="inline-flex items-center gap-0.5 text-xs font-bold text-amber-700 bg-amber-50 dark:bg-amber-950/30 px-1 py-0.5 rounded border border-amber-200 dark:border-amber-900/30"><Sun size={10} /> Folga</span>
                  <span className="inline-flex items-center gap-0.5 text-xs font-bold text-orange-700 bg-orange-50 dark:bg-orange-950/30 px-1 py-0.5 rounded border border-orange-200 dark:border-orange-900/30"><Palmtree size={10} /> Férias</span>
                  <span className="inline-flex items-center gap-0.5 text-xs font-bold text-slate-500 bg-slate-50 dark:bg-slate-800 px-1 py-0.5 rounded border border-slate-200 dark:border-slate-700"><span className="w-2 h-2 rounded-sm bg-emerald-500 opacity-40" /> Menos horas</span>
                  <span className="inline-flex items-center gap-0.5 text-xs font-bold text-slate-500 bg-slate-50 dark:bg-slate-800 px-1 py-0.5 rounded border border-slate-200 dark:border-slate-700"><span className="w-2 h-2 rounded-sm bg-emerald-700" /> Mais horas</span>
                </div>
                <div className="flex gap-3 items-start">
                  <div className="flex-1 min-w-0">
                    <div className="grid grid-cols-7 gap-1 select-none touch-none">
                      {WEEKDAY_NAMES.map((dn, i) => (
                        <div key={i} className="text-center text-xs font-bold text-slate-500 py-2">{dn}</div>
                      ))}
                      {calendarDays.map((day, i) => {
                        if (day === null) return <div key={`empty-${i}`} className="aspect-square" />;
                        const dateStr = format(new Date(yr, mo - 1, day), 'yyyy-MM-dd');
                        const vType = getVacationType(vacMap, dateStr);
                        const dayOfWeek = new Date(yr, mo - 1, day).getDay();
                        const dayName = WEEKDAY_NAMES[dayOfWeek];
                        const schedDay = (localPlan.days || []).find(sd => sd.day === dayName);
                        const isWork = schedDay?.active && !vType;
                        const dayHours = isWork ? (schedDay?.periods || []).reduce((acc, p) => {
                          if (!p.start || !p.end) return acc;
                          const [sH, sM] = p.start.split(':').map(Number);
                          const [eH, eM] = p.end.split(':').map(Number);
                          if (isNaN(sH)) return acc;
                          let diff = (eH * 60 + eM) - (sH * 60 + sM);
                          if (diff < 0) diff += 24 * 60;
                          return acc + diff / 60;
                        }, 0) : 0;
                        const intensity = isWork ? Math.min(1, dayHours / 12) : 0;
                        return (
                          <button
                            key={day}
                            onPointerDown={(e) => handleCalendarPointerDown(dateStr, e)}
                            onPointerMove={() => handleCalendarPointerMove(dateStr)}
                            onPointerUp={handleCalendarPointerUp}
                            className={cn(
                              "aspect-square rounded-xl flex flex-col items-center justify-center border transition-colors min-h-[36px]",
                              vType === 'ferias' ? "bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-800" :
                              vType === 'folga' ? "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800" :
                              isWork ? "border-emerald-200 dark:border-emerald-800" :
                              "border-slate-100 dark:border-slate-800"
                            )}
                            style={isWork && !vType ? { backgroundColor: `rgba(16, 185, 129, ${0.08 + intensity * 0.35})`, color: intensity > 0.5 ? '#065f46' : undefined } : {}}
                          >
                            <span className="text-xs font-bold">{day}</span>
                            {isWork && <span className="text-[9px] text-slate-500">{dayHours.toFixed(1)}h</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-2 pt-8 w-10 shrink-0">
                    <div className="text-center">
                      <div className="text-lg font-bold dark:text-white">{monthProjection.workDays}</div>
                      <div className="text-[9px] text-slate-500 font-medium leading-tight">dias</div>
                      <div className="text-[9px] text-slate-500 font-medium leading-tight">trab.</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-amber-600">{monthProjection.folgaCount}</div>
                <div className="text-[9px] text-slate-500 font-medium leading-tight">folgas</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-orange-600">{monthProjection.feriasCount}</div>
                      <div className="text-[9px] text-slate-500 font-medium leading-tight">férias</div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {isPast && (
        <div className="border-t border-slate-200 dark:border-slate-700 pt-2 space-y-1.5">
          <p className="text-sm font-bold text-slate-500 uppercase">Dados Reais do Mês</p>
          {realData?.hasData ? (
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-100 dark:border-emerald-900/30">
              <p className="text-xs text-emerald-600 font-bold mb-1">Baseado em {realData.rideDays} corridas</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs">
                <div><span className="text-slate-400">Ganhos</span><p className="font-bold dark:text-white">R$ {realData.earnings.toFixed(0)}</p></div>
                <div><span className="text-slate-400">Comb.</span><p className="font-bold dark:text-white">R$ {realData.fuelCost.toFixed(0)}</p></div>
                <div><span className="text-slate-400">Manut.</span><p className="font-bold dark:text-white">R$ {realData.maintCost.toFixed(0)}</p></div>
                <div><span className="text-slate-400">Outros</span><p className="font-bold dark:text-white">R$ {realData.otherCost.toFixed(0)}</p></div>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <p className="text-xs text-slate-400">Sem dados reais. Informe manualmente:</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase block mb-0.5">Ganhos (R$)</label>
                  <input type="number" step="any" min="0" value={localPlan.actualEarnings ?? ''} onChange={e => { const v = e.target.value === '' ? undefined : parseFloat(e.target.value); setLocalPlan({ ...localPlan, actualEarnings: isNaN(v!) ? undefined : v }); }} placeholder="0" className="w-full px-2 py-1.5 min-h-[44px] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none dark:text-white text-sm font-bold focus:ring-1 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase block mb-0.5">Comb. (R$)</label>
                  <input type="number" step="any" min="0" value={localPlan.actualFuelCost ?? ''} onChange={e => { const v = e.target.value === '' ? undefined : parseFloat(e.target.value); setLocalPlan({ ...localPlan, actualFuelCost: isNaN(v!) ? undefined : v }); }} placeholder="0" className="w-full px-2 py-1.5 min-h-[44px] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none dark:text-white text-sm font-bold focus:ring-1 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase block mb-0.5">Manut. (R$)</label>
                  <input type="number" step="any" min="0" value={localPlan.actualMaintCost ?? ''} onChange={e => { const v = e.target.value === '' ? undefined : parseFloat(e.target.value); setLocalPlan({ ...localPlan, actualMaintCost: isNaN(v!) ? undefined : v }); }} placeholder="0" className="w-full px-2 py-1.5 min-h-[44px] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none dark:text-white text-sm font-bold focus:ring-1 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase block mb-0.5">Outros (R$)</label>
                  <input type="number" step="any" min="0" value={localPlan.actualOtherCost ?? ''} onChange={e => { const v = e.target.value === '' ? undefined : parseFloat(e.target.value); setLocalPlan({ ...localPlan, actualOtherCost: isNaN(v!) ? undefined : v }); }} placeholder="0" className="w-full px-2 py-1.5 min-h-[44px] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none dark:text-white text-sm font-bold focus:ring-1 focus:ring-brand-500" />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div>
        <SectionHeader icon={<Wallet size={14} className="text-emerald-600" />} color="bg-emerald-50 dark:bg-emerald-950/30" label="Financeiro" sectionKey="financial" />
        <AnimatePresence>
          {openSections.financial && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.15 }} className="overflow-hidden">
              <div className="space-y-2 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase block mb-0.5">Valor/hora (R$)</label>
                    <input type="number" step="any" min="0" value={localPlan.customHourlyRate ?? (defaultHourlyRate > 0 ? defaultHourlyRate : '')} onChange={e => { const v = e.target.value === '' ? undefined : parseFloat(e.target.value); setLocalPlan({ ...localPlan, customHourlyRate: isNaN(v!) ? undefined : v }); }} placeholder={defaultHourlyRate > 0 ? defaultHourlyRate.toFixed(2) : '0'} className="w-full px-2 py-1.5 min-h-[44px] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none dark:text-white text-sm font-bold focus:ring-1 focus:ring-brand-500" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase block mb-0.5">Combustível (R$/mês)</label>
                    <input type="text" inputMode="decimal" value={localPlan.customFuelCost ?? ''} onChange={e => { const raw = e.target.value.replace(',', '.'); const v = raw === '' ? undefined : parseFloat(raw); setLocalPlan({ ...localPlan, customFuelCost: isNaN(v!) ? undefined : v }); }} placeholder={(monthProjection.workDays * userAverages.fuelPerDay).toFixed(0)} className="w-full px-2 py-1.5 min-h-[44px] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none dark:text-white text-sm font-bold focus:ring-1 focus:ring-brand-500" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase block mb-0.5">Manutenção (R$/mês)</label>
                    <input type="number" step="any" min="0" value={localPlan.customMaintCost ?? ''} onChange={e => { const v = e.target.value === '' ? undefined : parseFloat(e.target.value); setLocalPlan({ ...localPlan, customMaintCost: isNaN(v!) ? undefined : v }); }} placeholder={(monthProjection.workDays * userAverages.maintPerDay).toFixed(0)} className="w-full px-2 py-1.5 min-h-[44px] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none dark:text-white text-sm font-bold focus:ring-1 focus:ring-brand-500" />
                  </div>
                </div>

                <div className="p-2 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-100 dark:border-orange-900/30">
                  <p className="text-xs font-bold text-orange-600 uppercase mb-1">Estimativa de Combustível</p>
                  {histConsumption ? (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs"><span className="text-slate-500">Consumo médio calibrado</span><span className="font-bold text-orange-600 dark:text-orange-400">{histConsumption.toFixed(1)} km/l</span></div>
                      <div className="flex items-center justify-between text-xs"><span className="text-slate-500">KM estimados no mês</span><span className="font-bold dark:text-white">{monthProjection.km.toFixed(0)} km</span></div>
                      <div className="flex items-center justify-between text-xs"><span className="text-slate-500">Litros estimados</span><span className="font-bold dark:text-white">{(monthProjection.km / histConsumption).toFixed(0)} L</span></div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-xs text-slate-400 italic">Sem dados de consumo calibrados no histórico.</p>
                      <div>
                        <label className="text-xs font-bold text-slate-400 uppercase block mb-0.5">Estimativa de consumo (km/l)</label>
                        <input type="number" step="any" min="0" value={localPlan.customKmPerLiter ?? (profile?.kmPerLiter ?? '')} onChange={e => { const v = e.target.value === '' ? undefined : parseFloat(e.target.value); setLocalPlan({ ...localPlan, customKmPerLiter: isNaN(v!) ? undefined : v }); }} placeholder="Ex: 25" className="w-full px-2 py-1.5 min-h-[44px] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none dark:text-white text-sm font-bold focus:ring-1 focus:ring-brand-500" />
                      </div>
                      {(localPlan.customKmPerLiter || profile?.kmPerLiter) && monthProjection.km > 0 && (
                        <div className="flex items-center justify-between text-xs"><span className="text-slate-500">Litros estimados</span><span className="font-bold dark:text-white">{(monthProjection.km / (localPlan.customKmPerLiter || profile?.kmPerLiter || 1)).toFixed(0)} L</span></div>
                      )}
                    </div>
                  )}
                </div>

                {(userAverages.earningsPerDay > 0 || userAverages.kmPerDay > 0) && (
                  <div className="p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                    <button onClick={() => setShowMedias(!showMedias)} className="w-full flex items-center justify-between">
                      <p className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1"><Info size={12} /> Médias dos últimos 3 meses</p>
                      {showMedias ? <ChevronUp size={12} className="text-slate-400" /> : <ChevronDown size={12} className="text-slate-400" />}
                    </button>
                    <AnimatePresence>
                      {showMedias && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.15 }} className="overflow-hidden">
                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 text-xs mt-1.5">
                            <div><span className="text-slate-400">Ganho por dia</span><p className="font-bold dark:text-white">R$ {userAverages.earningsPerDay.toFixed(0)}</p></div>
                            <div><span className="text-slate-400">Horas por dia</span><p className="font-bold dark:text-white">{userAverages.hoursPerDay.toFixed(1)}h</p></div>
                            <div><span className="text-slate-400">KM por dia</span><p className="font-bold dark:text-white">{userAverages.kmPerDay.toFixed(0)}</p></div>
                            <div><span className="text-slate-400">Combustível por dia</span><p className="font-bold dark:text-white">R$ {userAverages.fuelPerDay.toFixed(0)}</p></div>
                            <div><span className="text-slate-400">Manutenção por dia</span><p className="font-bold dark:text-white">R$ {userAverages.maintPerDay.toFixed(0)}</p></div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-1.5">
                  <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-100 dark:border-emerald-900/30 text-center">
                    <p className="text-xs text-emerald-600 font-bold uppercase">Receitas</p>
                    <p className="text-sm font-bold dark:text-white">R$ {monthProjection.earnings.toFixed(0)}</p>
                    <p className="text-xs text-slate-400">{monthProjection.workDays} dias no mês &middot; {monthProjection.totalHours.toFixed(1)} horas mensais</p>
                  </div>
                  <div className="p-2 bg-rose-50 dark:bg-rose-950/30 rounded-lg border border-rose-100 dark:border-rose-900/30 text-center">
                    <p className="text-xs text-rose-600 font-bold uppercase">Despesas</p>
                    <p className="text-sm font-bold dark:text-white">R$ {monthProjection.totalExpenses.toFixed(0)}</p>
                    <p className="text-xs text-slate-400">Combustível + Manutenção + Fixos</p>
                    <div className="text-xs text-slate-400 space-y-0.5 mt-0.5">
                      {((profile?.ipvaValue || 0) / 12) > 0 && <p>IPVA R$ {((profile?.ipvaValue || 0) / 12).toFixed(0)}/mês</p>}
                      {((profile?.licensingValue || 0) / 12) > 0 && <p>Licenciamento R$ {((profile?.licensingValue || 0) / 12).toFixed(0)}/mês</p>}
                      {(profile?.insuranceValue || 0) > 0 && <p>Seguro R$ {(profile?.insuranceValue || 0).toFixed(0)}/mês</p>}
                      {(profile?.vehicleInstallmentValue || 0) > 0 && <p>Parcela R$ {(profile?.vehicleInstallmentValue || 0).toFixed(0)}/mês</p>}
                    </div>
                  </div>
                  <div className={cn("p-2 rounded-lg border text-center", monthProjection.netProfit >= 0 ? "bg-blue-50 dark:bg-blue-950/30 border-blue-100 dark:border-blue-900/30" : "bg-rose-50 dark:bg-rose-950/30 border-rose-100 dark:border-rose-900/30")}>
                    <p className={cn("text-xs font-bold uppercase", monthProjection.netProfit >= 0 ? "text-blue-600" : "text-rose-600")}>Lucro</p>
                    <p className={cn("text-sm font-bold", monthProjection.netProfit >= 0 ? "text-blue-700 dark:text-blue-400" : "text-rose-700 dark:text-rose-400")}>R$ {monthProjection.netProfit.toFixed(0)}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div>
        <SectionHeader icon={<Info size={14} className="text-slate-500" />} color="bg-slate-50 dark:bg-slate-800" label="Observações" sectionKey="notes" />
        <AnimatePresence>
          {openSections.notes && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.15 }} className="overflow-hidden">
              <textarea value={localPlan.notes || ''} onChange={e => setLocalPlan({ ...localPlan, notes: e.target.value })} placeholder="Notas..." rows={2} className="w-full px-2 py-1.5 min-h-[44px] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none dark:text-white text-xs resize-none focus:ring-1 focus:ring-brand-500 mt-1" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-1 flex-wrap">
          <button onClick={copyFromProfile} title="Copiar escala do Perfil" className="flex items-center gap-1 px-2.5 py-1.5 min-h-[36px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs rounded-lg hover:bg-slate-200 transition-colors"><Copy size={12} /> Copiar do Perfil</button>
          {copiedMonthPlan && (
            <button onClick={() => { const mappedVacations = mapVacationsToMonth(copiedMonthPlan.month, monthKey, copiedMonthPlan.vacations); setLocalPlan({ ...localPlan, days: copiedMonthPlan.days.map(d => ({ ...d, periods: d.periods.map(p => ({ ...p })) })), vacations: mappedVacations, notes: copiedMonthPlan.notes, customHourlyRate: copiedMonthPlan.customHourlyRate, customFuelCost: copiedMonthPlan.customFuelCost, customMaintCost: copiedMonthPlan.customMaintCost, customKmPerLiter: copiedMonthPlan.customKmPerLiter }); }} className="flex items-center gap-1 px-2.5 py-1.5 min-h-[36px] bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-lg hover:bg-emerald-100 transition-colors"><ClipboardPaste size={14} /> Colar de {copiedMonthPlan.monthLabel}</button>
          )}
        </div>
        <div className="flex gap-1.5">
          <button onClick={onCancel} className="px-3 py-1.5 min-h-[44px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-sm font-bold rounded-lg hover:bg-slate-200 transition-colors">Cancelar</button>
          <motion.button onClick={() => { onSave({ ...localPlan, month: monthKey }); }} className="px-4 py-1.5 min-h-[44px] bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold rounded-lg transition-colors" whileTap={{ scale: 0.97 }}>Salvar</motion.button>
        </div>
      </div>
    </div>
  );
});

const MemoizedEditPlanForm = React.memo(EditPlanForm);
