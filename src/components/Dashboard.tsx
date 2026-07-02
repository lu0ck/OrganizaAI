import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  MapPin,
  Calendar,
  Clock,
  Gauge,
  Fuel,
  Bike,
  ArrowUpRight,
  ArrowDownRight,
  Droplets,
  Zap,
  Target,
  Calculator,
  Scale,
  X
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { format, parseISO, isWithinInterval, startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, differenceInDays, addMonths, eachDayOfInterval, getDay, startOfWeek, endOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getDailyTarget } from './Goals';
import { RideEntry, Expense, Goal, UserProfile } from '../types';
import { cn } from '../lib/utils';
import { calculateGlobalConsumption, getLastFuelExpense, calculateAutonomy } from '../lib/fuelCalculation';

import { motion } from 'motion/react';
import InfoTooltip from './Tooltip';

interface DashboardProps {
  rides: RideEntry[];
  expenses: Expense[];
  goals: Goal[];
  profile: UserProfile | null;
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export default function Dashboard({ rides, expenses, goals, profile }: DashboardProps) {
  const [dateRange, setDateRange] = useState<'today' | '7d' | '30d' | 'month' | 'custom'>('7d');
  const [customStart, setCustomStart] = useState(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
  const [customEnd, setCustomEnd] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [showComparison, setShowComparison] = useState(false);
  const [compPresetA, setCompPresetA] = useState<'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'last30d' | 'custom'>('thisMonth');
  const [compPresetB, setCompPresetB] = useState<'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'last30d' | 'custom'>('lastMonth');
  const [compCustomA, setCompCustomA] = useState({ start: format(subDays(new Date(), 7), 'yyyy-MM-dd'), end: format(new Date(), 'yyyy-MM-dd') });
  const [compCustomB, setCompCustomB] = useState({ start: format(subDays(new Date(), 37), 'yyyy-MM-dd'), end: format(subDays(new Date(), 8), 'yyyy-MM-dd') });
  const [compNormalize, setCompNormalize] = useState(false);

  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
  useEffect(() => {
    const observer = new MutationObserver(() => setIsDark(document.documentElement.classList.contains('dark')));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const chartGridStroke = isDark ? '#334155' : '#e2e8f0';
  const chartTickFill = isDark ? '#94a3b8' : '#64748b';
  const chartTooltipBg = isDark ? '#1e293b' : '#fff';

function getComparisonPeriod(preset: 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'last30d' | 'custom', custom: { start: string; end: string }) {
  const now = new Date();
  switch (preset) {
    case 'thisWeek': return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }), label: 'Esta Semana' };
    case 'lastWeek': { const lw = subDays(startOfWeek(now, { weekStartsOn: 1 }), 1); return { start: startOfWeek(lw, { weekStartsOn: 1 }), end: endOfWeek(lw, { weekStartsOn: 1 }), label: 'Semana Passada' }; }
    case 'thisMonth': return { start: startOfMonth(now), end: endOfMonth(now), label: 'Este Mês' };
    case 'lastMonth': { const lm = addMonths(now, -1); return { start: startOfMonth(lm), end: endOfMonth(lm), label: 'Mês Passado' }; }
    case 'last30d': return { start: startOfDay(subDays(now, 30)), end: endOfDay(now), label: 'Últimos 30 dias' };
    case 'custom': {
      if (!custom.start || !custom.end) {
        return { start: startOfDay(subDays(now, 7)), end: endOfDay(now), label: 'Customizado (datas incompletas)' };
      }
      const s = parseISO(custom.start);
      const e = parseISO(custom.end);
      if (isNaN(s.getTime()) || isNaN(e.getTime())) {
        return { start: startOfDay(subDays(now, 7)), end: endOfDay(now), label: 'Customizado (datas invalidas)' };
      }
      return { start: startOfDay(s), end: endOfDay(e), label: `${custom.start} → ${custom.end}` };
    }
  }
}

function computePeriodStatsForComparison(start: Date, end: Date) {
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { earnings: 0, expenses: 0, profit: 0, km: 0, rides: 0, hours: 0, workedDays: 0, avgPerHour: 0, avgPerKm: 0, fuelExpenses: 0, foodExpenses: 0, maintenanceExpenses: 0, fixedCosts: 0, costPerKm: 0 };
  }
  const interval = { start, end };
    const pRides = rides.filter(r => isWithinInterval(parseISO(r.date), interval));
    const pExpenses = expenses.filter(e => isWithinInterval(parseISO(e.date), interval));
    const totalEarnings = pRides.reduce((acc, r) => acc + r.totalValue, 0);
    const totalExp = pExpenses.reduce((acc, e) => acc + e.value, 0);
    const fuelExp = pExpenses.filter(e => e.type === 'combustivel').reduce((acc, e) => acc + e.value, 0);
    const foodExp = pExpenses.filter(e => e.type === 'alimentacao').reduce((acc, e) => acc + e.value, 0);
    const maintExp = pExpenses.filter(e => e.type === 'manutencao').reduce((acc, e) => acc + e.value, 0);
    const totalKm = pRides.reduce((acc, r) => acc + r.kmDriven, 0);
    const totalRidesCount = pRides.reduce((acc, r) => acc + r.numRides, 0);
    const workedDays = new Set(pRides.map(r => r.date.split('T')[0])).size;
    const totalHours = pRides.reduce((acc, r) => {
      if (!r.startTime || !r.endTime) return acc;
      const [sH, sM] = r.startTime.split(':').map(Number);
      const [eH, eM] = r.endTime.split(':').map(Number);
      if (isNaN(sH) || isNaN(sM) || isNaN(eH) || isNaN(eM)) return acc;
      let diff = (eH * 60 + eM) - (sH * 60 + sM);
      if (diff < 0) diff += 24 * 60;
      return acc + diff / 60;
    }, 0);
    const daysInPeriod = Math.max(Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)), 1);
    const ipvaDaily = (profile?.ipvaValue || 0) / 365;
    const licensingDaily = (profile?.licensingValue || 0) / 365;
    const insuranceDaily = (profile?.insuranceValue || 0) / 30;
    const installmentDaily = (profile?.vehicleInstallmentValue || 0) / 30;
    const totalFixedCosts = (ipvaDaily + licensingDaily + insuranceDaily + installmentDaily) * daysInPeriod;
    return {
      earnings: totalEarnings, expenses: totalExp, profit: totalEarnings - totalExp - totalFixedCosts,
      km: totalKm, rides: totalRidesCount, hours: totalHours, workedDays,
      avgPerHour: totalHours > 0 ? totalEarnings / totalHours : 0,
      avgPerKm: totalKm > 0 ? totalEarnings / totalKm : 0,
      fuelExpenses: fuelExp, foodExpenses: foodExp, maintenanceExpenses: maintExp,
      fixedCosts: totalFixedCosts, costPerKm: totalKm > 0 ? (fuelExp + maintExp) / totalKm : 0,
    };
  }

  const compPeriodA = useMemo(() => getComparisonPeriod(compPresetA, compCustomA), [compPresetA, compCustomA]);
  const compPeriodB = useMemo(() => getComparisonPeriod(compPresetB, compCustomB), [compPresetB, compCustomB]);
  const compStatsA = useMemo(() => computePeriodStatsForComparison(compPeriodA.start, compPeriodA.end), [compPeriodA, rides, expenses, profile]);
  const compStatsB = useMemo(() => computePeriodStatsForComparison(compPeriodB.start, compPeriodB.end), [compPeriodB, rides, expenses, profile]);
const compDaysA = (!isNaN(compPeriodA.start.getTime()) && !isNaN(compPeriodA.end.getTime())) ? Math.max(differenceInDays(compPeriodA.end, compPeriodA.start) + 1, 1) : 1;
const compDaysB = (!isNaN(compPeriodB.start.getTime()) && !isNaN(compPeriodB.end.getTime())) ? Math.max(differenceInDays(compPeriodB.end, compPeriodB.start) + 1, 1) : 1;
  const compDifferentLengths = compDaysA !== compDaysB;

  const filteredData = useMemo(() => {
    const now = new Date();
    let start: Date;
    let end: Date = endOfDay(now);

    if (dateRange === 'today') {
      start = startOfDay(now);
    } else if (dateRange === '7d') {
      start = startOfDay(subDays(now, 7));
    } else if (dateRange === '30d') {
      start = startOfDay(subDays(now, 30));
    } else if (dateRange === 'month') {
      start = startOfMonth(now);
  } else {
    const s = customStart ? parseISO(customStart) : subDays(now, 7);
    const e = customEnd ? parseISO(customEnd) : now;
    start = isNaN(s.getTime()) ? startOfDay(subDays(now, 7)) : startOfDay(s);
    end = isNaN(e.getTime()) ? endOfDay(now) : endOfDay(e);
  }

    const interval = { start, end };

    const filteredRides = rides.filter(r => isWithinInterval(parseISO(r.date), interval));
    const filteredExpenses = expenses.filter(e => isWithinInterval(parseISO(e.date), interval));

    return { rides: filteredRides, expenses: filteredExpenses, start, end };
  }, [rides, expenses, dateRange, customStart, customEnd]);

  const stats = useMemo(() => {
    const totalEarnings = filteredData.rides.reduce((acc, r) => acc + r.totalValue, 0);
    const totalExpenses = filteredData.expenses.reduce((acc, e) => acc + e.value, 0);
    const fuelExpenses = filteredData.expenses.filter(e => e.type === 'combustivel').reduce((acc, e) => acc + e.value, 0);
    const foodExpenses = filteredData.expenses.filter(e => e.type === 'alimentacao').reduce((acc, e) => acc + e.value, 0);
    const maintenanceExpenses = filteredData.expenses.filter(e => e.type === 'manutencao').reduce((acc, e) => acc + e.value, 0);

    const totalKm = filteredData.rides.reduce((acc, r) => acc + r.kmDriven, 0);
    const totalRides = filteredData.rides.reduce((acc, r) => acc + r.numRides, 0);
    const workedDays = new Set(filteredData.rides.map(r => r.date.split('T')[0])).size;

    const totalHours = filteredData.rides.reduce((acc, r) => {
      if (!r.startTime || !r.endTime) return acc;
      const [sH, sM] = r.startTime.split(':').map(Number);
      const [eH, eM] = r.endTime.split(':').map(Number);
      if (isNaN(sH) || isNaN(sM) || isNaN(eH) || isNaN(eM)) return acc;

      let diff = (eH * 60 + eM) - (sH * 60 + sM);
      if (diff < 0) diff += 24 * 60;
      return acc + (diff / 60);
    }, 0);

    const allExpenses = filteredData.expenses.reduce((acc, e) => acc + e.value, 0);

    const ipvaDaily = (profile?.ipvaValue || 0) / 365;
    const licensingDaily = (profile?.licensingValue || 0) / 365;
    const insuranceDaily = (profile?.insuranceValue || 0) / 30;
    const installmentDaily = (profile?.vehicleInstallmentValue || 0) / 30;

    const daysInPeriod = Math.max(Math.ceil((filteredData.end.getTime() - filteredData.start.getTime()) / (1000 * 60 * 60 * 24)), 1);
    const totalFixedCosts = (ipvaDaily + licensingDaily + insuranceDaily + installmentDaily) * daysInPeriod;

    const netProfit = totalEarnings - allExpenses - totalFixedCosts;

    const last30DaysStart = startOfDay(subDays(new Date(), 30));
    const last30DaysFuel = expenses
      .filter(e => e.type === 'combustivel' && isWithinInterval(parseISO(e.date), { start: last30DaysStart, end: new Date() }))
      .reduce((acc, e) => acc + e.value, 0);
    const fuelDaily = last30DaysFuel / 30;

    const lastMonthMaintenance = expenses
      .filter(e => e.type === 'manutencao' && isWithinInterval(parseISO(e.date), { start: last30DaysStart, end: new Date() }))
      .reduce((acc, e) => acc + e.value, 0);
    const maintenanceDaily = lastMonthMaintenance / 30;

    const totalDailyCost = ipvaDaily + licensingDaily + insuranceDaily + installmentDaily + fuelDaily + maintenanceDaily;

    const filteredKm = filteredData.rides.reduce((acc, r) => acc + r.kmDriven, 0);
    const filteredFuel = filteredData.expenses.filter(e => e.type === 'combustivel').reduce((acc, e) => acc + e.value, 0);
    const filteredMaintenance = filteredData.expenses.filter(e => e.type === 'manutencao').reduce((acc, e) => acc + e.value, 0);
    const variableCostPerKm = filteredKm > 0 ? (filteredFuel + filteredMaintenance) / filteredKm : 0;
    const totalCostPerKm = filteredKm > 0 ? (totalExpenses + totalFixedCosts) / filteredKm : 0;

  const globalConsumption = calculateGlobalConsumption(expenses);
  const calibratedExpenses = expenses.filter(e => e.type === 'combustivel' && e.isCalibrated === true && e.effectiveTripKm && e.liters);
  const fullTankKm = calibratedExpenses.reduce((acc, e) => acc + (e.effectiveTripKm || 0), 0);
  const totalLiters = calibratedExpenses.reduce((acc, e) => acc + (e.liters || 0), 0);
  const simpleAverage = totalLiters > 0 ? fullTankKm / totalLiters : 0;
  const kmPerLiter = globalConsumption.status === 'valid' && globalConsumption.globalAverage && globalConsumption.globalAverage > 0
    ? globalConsumption.globalAverage
    : simpleAverage || profile?.kmPerLiter || 0;

  const lastFuelExpense = getLastFuelExpense(expenses);
  const kmSinceLastFuel = lastFuelExpense
    ? rides.filter(r => {
        const rideDate = parseISO(r.date);
        const fuelDate = parseISO(lastFuelExpense.date);
        return rideDate > fuelDate;
      }).reduce((acc, r) => acc + r.kmDriven, 0)
    : 0;
  const estimatedBalance = lastFuelExpense && kmPerLiter > 0
    ? Math.max(0, (lastFuelExpense.saldoAfterFueling || 0) - (kmSinceLastFuel / kmPerLiter))
    : lastFuelExpense?.saldoAfterFueling || 0;

  const autonomy = lastFuelExpense && globalConsumption.status === 'valid' && globalConsumption.globalAverage
    ? calculateAutonomy(estimatedBalance, globalConsumption.globalAverage)
    : lastFuelExpense && kmPerLiter > 0
      ? calculateAutonomy(estimatedBalance, kmPerLiter)
      : null;

const ipvaMonthly = (profile?.ipvaValue || 0) / 365 * 30;
  const licensingMonthly = (profile?.licensingValue || 0) / 365 * 30;
    const insuranceMonthly = profile?.insuranceValue || 0;
    const installmentMonthly = profile?.vehicleInstallmentValue || 0;
    const monthlyFixedCosts = ipvaMonthly + licensingMonthly + insuranceMonthly + installmentMonthly;
    const installmentsRemaining = profile?.vehicleInstallmentsRemaining || 0;
    const totalInstallmentDebt = installmentMonthly * installmentsRemaining;

const dailyGoal = goals.find(g => g.type === 'diaria');
let periodTarget = 0;
if (dailyGoal) {
  const interval = { start: filteredData.start, end: filteredData.end };
  const allDays = eachDayOfInterval(interval);
    periodTarget = allDays.reduce((sum, day) => sum + getDailyTarget(day, dailyGoal, profile, totalHours > 0 ? totalEarnings / totalHours : 0), 0);
}

    return {
      earnings: totalEarnings,
      expenses: totalExpenses,
      profit: netProfit,
      km: totalKm,
      rides: totalRides,
      hours: totalHours,
      workedDays,
      avgPerHour: totalHours > 0 ? totalEarnings / totalHours : 0,
      avgPerRide: totalRides > 0 ? totalEarnings / totalRides : 0,
      avgPerKm: totalKm > 0 ? totalEarnings / totalKm : 0,
      fuelExpenses,
      foodExpenses,
      maintenanceExpenses,
      dailyCosts: {
        ipva: ipvaDaily,
        licensing: licensingDaily,
        insurance: insuranceDaily,
        installment: installmentDaily,
        fuel: fuelDaily,
        maintenance: maintenanceDaily,
        total: totalDailyCost
      },
      costPerKm: variableCostPerKm,
      totalCostPerKm,
      kmPerLiter,
      globalConsumption,
estimatedBalance,
    estimatedBalanceUnreliable: lastFuelExpense && kmPerLiter <= 0 && kmSinceLastFuel > 0,
      autonomy,
      tankSize: profile?.totalTankSize,
      monthlyFixedCosts,
      installmentsRemaining,
      totalInstallmentDebt,
      installmentMonthly,
      dailyGoalTarget: getDailyTarget(new Date(), dailyGoal, profile, totalHours > 0 ? totalEarnings / totalHours : 0),
      periodTarget
    };
  }, [filteredData, profile, rides, expenses, goals]);

  const previousPeriodStats = useMemo(() => {
    const periodDays = Math.max(differenceInDays(filteredData.end, filteredData.start) + 1, 1);
    const prevEnd = startOfDay(subDays(filteredData.start, 1));
    const prevStart = startOfDay(subDays(prevEnd, periodDays));
    const prevInterval = { start: prevStart, end: prevEnd };

    const prevRides = rides.filter(r => isWithinInterval(parseISO(r.date), prevInterval));
    const prevExpenses = expenses.filter(e => isWithinInterval(parseISO(e.date), prevInterval));

    return {
      earnings: prevRides.reduce((acc, r) => acc + r.totalValue, 0),
      expenses: prevExpenses.reduce((acc, e) => acc + e.value, 0),
      km: prevRides.reduce((acc, r) => acc + r.kmDriven, 0)
    };
  }, [filteredData, rides, expenses]);

  const monthlyEstimate = useMemo(() => {
    const now = new Date();
    const schedule = profile?.workSchedule || [];
    const hourlyRate = profile?.hourlyRate || stats.avgPerHour || 0;
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

    let totalHours = 0;
    let workDays = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(now.getFullYear(), now.getMonth(), d);
      const dayName = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][date.getDay()];
      const sched = schedule.find(s => s.day === dayName);
    if (sched?.active && sched.periods) {
      workDays++;
      sched.periods.forEach(p => {
          if (!p.start || !p.end) return;
          const [sH, sM] = p.start.split(':').map(Number);
          const [eH, eM] = p.end.split(':').map(Number);
          if (isNaN(sH) || isNaN(sM) || isNaN(eH) || isNaN(eM)) return;
          let diff = (eH * 60 + eM) - (sH * 60 + sM);
          if (diff < 0) diff += 24 * 60;
          totalHours += diff / 60;
        });
      }
    }

    const earnings = totalHours * hourlyRate;
    const last30 = expenses.filter(e => isWithinInterval(parseISO(e.date), { start: subDays(now, 30), end: now }));
    const last30Fuel = last30.filter(e => e.type === 'combustivel').reduce((acc, e) => acc + e.value, 0);
    const last30Maint = last30.filter(e => e.type === 'manutencao').reduce((acc, e) => acc + e.value, 0);
    const last30Total = last30.reduce((acc, e) => acc + e.value, 0);
    const dailyExpense = last30Total / 30;
    const monthlyExpenses = dailyExpense * daysInMonth;

    return {
      workDays,
      totalHours,
      earnings,
      expenses: monthlyExpenses,
      net: earnings - monthlyExpenses,
      fuelEstimated: (last30Fuel / 30) * daysInMonth,
      maintEstimated: (last30Maint / 30) * daysInMonth,
    };
  }, [profile, expenses, stats]);

  const getChangePercent = (current: number, previous: number): number | null => {
    if (previous === 0) return current > 0 ? 100 : null;
    return ((current - previous) / previous) * 100;
  };

  const chartData = useMemo(() => {
    const days: Record<string, { date: string, ganhos: number, gastos: number, timestamp: number }> = {};

    filteredData.rides.forEach(r => {
      const dateObj = parseISO(r.date);
      const d = format(dateObj, 'dd/MM');
      const key = format(dateObj, 'yyyy-MM-dd');
      if (!days[key]) days[key] = { date: d, ganhos: 0, gastos: 0, timestamp: dateObj.getTime() };
      days[key].ganhos += r.totalValue;
    });

    filteredData.expenses.forEach(e => {
      const dateObj = parseISO(e.date);
      const d = format(dateObj, 'dd/MM');
      const key = format(dateObj, 'yyyy-MM-dd');
      if (!days[key]) days[key] = { date: d, ganhos: 0, gastos: 0, timestamp: dateObj.getTime() };
      days[key].gastos += e.value;
    });

    return Object.values(days).sort((a, b) => a.timestamp - b.timestamp);
  }, [filteredData]);

  const incomeDistribution = useMemo(() => {
    const modalities: Record<string, number> = { 'passageiro': 0, 'entrega': 0 };
    const apps: Record<string, number> = {};

    filteredData.rides.forEach(r => {
      (r.appRides || []).forEach(app => {
        modalities[app.modality] = (modalities[app.modality] || 0) + app.value;
        apps[app.appName] = (apps[app.appName] || 0) + app.value;
      });
    });

    const modalityData = Object.entries(modalities)
      .filter(([_, value]) => value > 0)
      .map(([name, value]) => ({ name: name === 'passageiro' ? 'Passageiros' : 'Entregas', value }));

    const appData = Object.entries(apps)
      .filter(([_, value]) => value > 0)
      .map(([name, value]) => ({ name, value }));

    return { modalityData, appData };
  }, [filteredData]);

  const expenseDistribution = useMemo(() => {
    const categories: Record<string, number> = {};
    const subCategories: Record<string, number> = {};

    const categoryLabels: Record<string, string> = {
      'combustivel': 'Combustível',
      'alimentacao': 'Alimentação',
      'manutencao': 'Manutenção',
      'imposto': 'IPVA/Impostos',
      'multa': 'Multas',
      'parcela': 'Parcelas',
      'seguro': 'Seguro',
      'outros': 'Outros'
    };

    filteredData.expenses.forEach(e => {
      const catLabel = categoryLabels[e.type] || e.type;
      categories[catLabel] = (categories[catLabel] || 0) + e.value;

      let subKey = catLabel;
      if (e.type === 'combustivel' && e.fuelType) {
        const fuelLabel = e.fuelType === 'alcool' ? 'Álcool' : e.fuelType === 'gasolina' ? 'Gasolina' : e.fuelType.toUpperCase();
        subKey = `${fuelLabel}`;
      }
      subCategories[subKey] = (subCategories[subKey] || 0) + e.value;
    });

    const categoryData = Object.entries(categories)
      .filter(([_, value]) => value > 0)
      .map(([name, value]) => ({ name, value }));

    const subCategoryData = Object.entries(subCategories)
      .filter(([_, value]) => value > 0)
      .map(([name, value]) => ({ name, value }));

    return { categoryData, subCategoryData };
  }, [filteredData]);

  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);

  const monthlyData = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const monthLabels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    return monthLabels.map((name, idx) => {
      const start = new Date(currentYear, idx, 1);
      const end = endOfMonth(start);
      const interval = { start, end };

      const monthRides = rides.filter(r => isWithinInterval(parseISO(r.date), interval));
      const monthExpenses = expenses.filter(e => isWithinInterval(parseISO(e.date), interval));

      return {
        month: name,
        earnings: monthRides.reduce((acc, r) => acc + r.totalValue, 0),
        expenses: monthExpenses.reduce((acc, e) => acc + e.value, 0),
      };
    });
  }, [rides, expenses]);

  const filteredMonthlyData = selectedMonth !== null
    ? [monthlyData[selectedMonth]]
    : monthlyData;

  const COLORS = ['#f43f5e', '#fb7185', '#fda4af', '#fecdd3', '#ffe4e6', '#f97316', '#eab308'];
  const INCOME_COLORS = ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#059669'];
  const SUB_COLORS = ['#0ea5e9', '#38bdf8', '#7dd3fc', '#bae6fd', '#e0f2fe'];

  const renderCustomizedLabel = ({ cx, cy, midAngle, outerRadius, percent }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = outerRadius + 20;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="currentColor"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        className="text-[11px] font-bold fill-slate-600 dark:fill-slate-300"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-8"
    >
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
      <div>
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Dashboard</h2>
        <p className="text-slate-500 dark:text-slate-400">Resumo completo das suas atividades e ganhos.</p>
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto">
          {(['today', '7d', '30d', 'month', 'custom'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={cn(
                "px-3 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap",
                dateRange === range
                  ? "bg-brand-600 text-white shadow-md"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
              )}
            >
              {range === 'today' ? 'Hoje' : range === '7d' ? '7 Dias' : range === '30d' ? '30 Dias' : range === 'month' ? 'Este Mês' : 'Personalizado'}
            </button>
          ))}
        </div>

        {dateRange === 'custom' && (
          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="bg-transparent text-xs font-bold outline-none dark:text-white px-2"
            />
            <span className="text-slate-400 text-xs">até</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="bg-transparent text-xs font-bold outline-none dark:text-white px-2"
            />
          </div>
        )}

        <button
          onClick={() => setShowComparison(!showComparison)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border shadow-sm transition-all whitespace-nowrap",
            showComparison
              ? "bg-brand-600 text-white border-brand-600"
              : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
          )}
        >
          <Scale size={14} />
          Comparar
        </button>
      </div>
    </div>

{showComparison && (
  <motion.div
    initial={{ opacity: 0, height: 0 }}
    animate={{ opacity: 1, height: 'auto' }}
    exit={{ opacity: 0, height: 0 }}
    className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-brand-200 dark:border-brand-900/30 shadow-sm space-y-4"
  >
    <div className="flex items-center justify-between">
      <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2"><Scale size={18} className="text-brand-600" /> Comparação de Períodos</h3>
      <button onClick={() => setShowComparison(false)} className="p-1 text-slate-400 hover:text-slate-600"><X size={16} /></button>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {(['A', 'B'] as const).map((side) => {
        const preset = side === 'A' ? compPresetA : compPresetB;
        const setPreset = side === 'A' ? setCompPresetA : setCompPresetB;
        const custom = side === 'A' ? compCustomA : compCustomB;
        const setCustom = side === 'A' ? setCompCustomA : setCompCustomB;
        const period = side === 'A' ? compPeriodA : compPeriodB;
        const bgColor = side === 'A' ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/30' : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/30';
        const badgeColor = side === 'A' ? 'bg-blue-600 text-white' : 'bg-emerald-600 text-white';
        return (
          <div key={side} className={cn("p-3 rounded-2xl border", bgColor)}>
            <div className="flex items-center gap-2 mb-2">
              <span className={cn("px-2 py-0.5 rounded-lg text-xs font-bold", badgeColor)}>Período {side}</span>
<span className="text-[10px] text-slate-500 dark:text-slate-400">
  {!isNaN(period.start.getTime()) && !isNaN(period.end.getTime()) ? `${format(period.start, 'dd/MM/yyyy')} a ${format(period.end, 'dd/MM/yyyy')}` : 'Período inválido'}
</span>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {(['thisWeek', 'lastWeek', 'thisMonth', 'lastMonth', 'last30d', 'custom'] as const).map(p => (
                <button key={p} onClick={() => setPreset(p)} className={cn("px-2 py-1 rounded-lg text-xs font-bold transition-all", preset === p ? "bg-brand-600 text-white" : "bg-white dark:bg-slate-800 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700")}>
                  {p === 'thisWeek' ? 'Esta Semana' : p === 'lastWeek' ? 'Sem. Passada' : p === 'thisMonth' ? 'Este Mês' : p === 'lastMonth' ? 'Mês Passado' : p === 'last30d' ? 'Últ. 30d' : 'Customizado'}
                </button>
              ))}
            </div>
            {preset === 'custom' && (
              <div className="flex items-center gap-2">
                <input type="date" value={custom.start} onChange={e => setCustom({ ...custom, start: e.target.value })} className="text-xs px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg dark:text-white outline-none focus:ring-1 focus:ring-brand-500" />
                <span className="text-xs text-slate-400">até</span>
                <input type="date" value={custom.end} onChange={e => setCustom({ ...custom, end: e.target.value })} className="text-xs px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg dark:text-white outline-none focus:ring-1 focus:ring-brand-500" />
              </div>
            )}
          </div>
        );
      })}
    </div>

    {compDifferentLengths && (
      <label className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 cursor-pointer">
        <input type="checkbox" checked={compNormalize} onChange={() => setCompNormalize(!compNormalize)} className="rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
        Normalizar por dia (A: {compDaysA}d vs B: {compDaysB}d)
      </label>
    )}

    {(() => {
      const val = (s: typeof compStatsA, k: keyof typeof compStatsA) => compNormalize ? (s[k] as number) / (k === 'workedDays' ? 1 : k === 'fixedCosts' || k === 'costPerKm' ? (compDaysA) : compDaysA) : s[k] as number;
      const nA = (k: keyof typeof compStatsA) => val(compStatsA, k);
      const nB = (k: keyof typeof compStatsA) => val(compStatsB, k);
      const daysA = compDaysA;
      const daysB = compDaysB;
      const normalizeVal = (v: number, isPerDay: boolean) => isPerDay ? v : v;
      return (<>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {([
          { side: 'A', stats: compStatsA, period: compPeriodA, days: daysA, accent: 'blue', bg: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/30', badge: 'bg-blue-600 text-white', textAccent: 'text-blue-700 dark:text-blue-300' },
          { side: 'B', stats: compStatsB, period: compPeriodB, days: daysB, accent: 'emerald', bg: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/30', badge: 'bg-emerald-600 text-white', textAccent: 'text-emerald-700 dark:text-emerald-300' },
        ] as const).map(({ side, stats, period, days, bg, badge, textAccent }) => {
          const sEarnings = nA('earnings');
          const sExpenses = nA('expenses');
          const sProfit = nA('profit');
          const sKm = nA('km');
          const sHours = nA('hours');
          const sRides = nA('rides');
          const sWorkedDays = stats.workedDays;
          return (
            <div key={side} className={cn("rounded-2xl border p-4", bg)}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={cn("px-2 py-0.5 rounded-lg text-xs font-bold", badge)}>Período {side}</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">{!isNaN(period.start.getTime()) && !isNaN(period.end.getTime()) ? `${format(period.start, 'dd/MM')} a ${format(period.end, 'dd/MM')}` : ''}</span>
                </div>
                <span className="text-[10px] text-slate-400">{days}d</span>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-2">
                <div><p className="text-[9px] text-slate-500 uppercase font-bold">Ganhos</p><p className={cn("text-sm font-bold", textAccent)}>R$ {sEarnings.toFixed(0)}</p></div>
                <div><p className="text-[9px] text-slate-500 uppercase font-bold">Despesas</p><p className="text-sm font-bold text-rose-600">R$ {sExpenses.toFixed(0)}</p></div>
                <div><p className="text-[9px] text-slate-500 uppercase font-bold">Líquido</p><p className={cn("text-sm font-bold", sProfit >= 0 ? "text-emerald-600" : "text-rose-600")}>R$ {sProfit.toFixed(0)}</p></div>
              </div>
              <div className="flex gap-3 pt-2 border-t border-slate-200/50 dark:border-slate-700/50">
                <span className="text-[10px] text-slate-500">{sKm.toFixed(0)} km</span>
                <span className="text-[10px] text-slate-500">{sHours.toFixed(0)}h</span>
                <span className="text-[10px] text-slate-500">{sRides.toFixed(0)} corridas</span>
                <span className="text-[10px] text-slate-500">{sWorkedDays}d trab</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Financeiro Chart */}
      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-3">Financeiro</p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={[
            { name: 'Ganhos', A: nA('earnings'), B: nB('earnings') },
            { name: 'Despesas', A: nA('expenses'), B: nB('expenses') },
            { name: 'Líquido', A: nA('profit'), B: nB('profit') },
          ]}>
            <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke} />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: chartTickFill }} />
            <YAxis tick={{ fontSize: 11, fill: chartTickFill }} tickFormatter={(v: number) => `R$${(v/1000).toFixed(0)}k`} />
            <RechartsTooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px', backgroundColor: chartTooltipBg }} formatter={(value: number) => [`R$ ${value.toFixed(2)}`, '']} />
            <Legend wrapperStyle={{ fontSize: '11px' }} />
            <Bar dataKey="A" fill="#2563eb" radius={[4, 4, 0, 0]} maxBarSize={36} />
            <Bar dataKey="B" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={36} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Atividade Chart */}
      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-3">Atividade</p>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={[
            { name: 'KM', A: nA('km'), B: nB('km') },
            { name: 'Horas', A: nA('hours'), B: nB('hours') },
            { name: 'Corridas', A: nA('rides'), B: nB('rides') },
            { name: 'Dias Trab', A: compStatsA.workedDays, B: compStatsB.workedDays },
          ]}>
            <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke} />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: chartTickFill }} />
            <YAxis tick={{ fontSize: 11, fill: chartTickFill }} />
            <RechartsTooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px', backgroundColor: chartTooltipBg }} />
            <Legend wrapperStyle={{ fontSize: '11px' }} />
            <Bar dataKey="A" fill="#2563eb" radius={[4, 4, 0, 0]} maxBarSize={36} />
            <Bar dataKey="B" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={36} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Mini barras horizontais - Eficiência & Custos */}
      {(() => {
        const items = [
          { label: '/Hora', key: 'avgPerHour', fmt: (v: number) => `R$ ${v.toFixed(2)}`, lowerBetter: false },
          { label: '/KM', key: 'avgPerKm', fmt: (v: number) => `R$ ${v.toFixed(2)}`, lowerBetter: false },
          { label: 'Combustível', key: 'fuelExpenses', fmt: (v: number) => `R$ ${v.toFixed(0)}`, lowerBetter: true },
          { label: 'Alimentação', key: 'foodExpenses', fmt: (v: number) => `R$ ${v.toFixed(0)}`, lowerBetter: true },
          { label: 'Manutenção', key: 'maintenanceExpenses', fmt: (v: number) => `R$ ${v.toFixed(0)}`, lowerBetter: true },
          { label: 'Custos Fixos', key: 'fixedCosts', fmt: (v: number) => `R$ ${v.toFixed(0)}`, lowerBetter: true },
          { label: 'Custo/KM', key: 'costPerKm', fmt: (v: number) => `R$ ${v.toFixed(2)}`, lowerBetter: true },
        ];
        const maxVal = Math.max(...items.map(i => Math.max(nA(i.key), nB(i.key))), 1);
        return (
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-3">Eficiência & Custos</p>
            <div className="space-y-2">
              {items.map(({ label, key, fmt, lowerBetter }) => {
                const vA = nA(key);
                const vB = nB(key);
                const pctA = (vA / maxVal) * 100;
                const pctB = (vB / maxVal) * 100;
                const aWins = lowerBetter ? vA <= vB : vA >= vB;
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{label}</span>
                      <div className="flex items-center gap-2 text-xs">
                        <span className={cn("font-bold", aWins ? "text-blue-600" : "text-slate-500")}>{fmt(vA)}</span>
                        <span className="text-slate-400">vs</span>
                        <span className={cn("font-bold", !aWins && vA !== vB ? "text-emerald-600" : "text-slate-500")}>{fmt(vB)}</span>
                      </div>
                    </div>
                    <div className="flex gap-0.5 h-2">
                      <div className="flex-1 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                        <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${Math.min(pctA, 100)}%` }} />
                      </div>
                      <div className="flex-1 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                        <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${Math.min(pctB, 100)}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Win Count */}
      {(() => {
        const metrics = [
          { key: 'earnings' as const, lowerIsBetter: false },
          { key: 'expenses' as const, lowerIsBetter: true },
          { key: 'profit' as const, lowerIsBetter: false },
          { key: 'km' as const, lowerIsBetter: false },
          { key: 'workedDays' as const, lowerIsBetter: false },
          { key: 'hours' as const, lowerIsBetter: false },
          { key: 'avgPerHour' as const, lowerIsBetter: false },
          { key: 'avgPerKm' as const, lowerIsBetter: false },
          { key: 'rides' as const, lowerIsBetter: false },
          { key: 'fuelExpenses' as const, lowerIsBetter: true },
          { key: 'foodExpenses' as const, lowerIsBetter: true },
          { key: 'maintenanceExpenses' as const, lowerIsBetter: true },
          { key: 'fixedCosts' as const, lowerIsBetter: true },
          { key: 'costPerKm' as const, lowerIsBetter: true },
        ];
        let aWins = 0, bWins = 0;
        metrics.forEach(({ key, lowerIsBetter }) => {
          const vA = compNormalize ? (compStatsA[key] as number) / compDaysA : compStatsA[key] as number;
          const vB = compNormalize ? (compStatsB[key] as number) / compDaysB : compStatsB[key] as number;
          if (vA === vB) return;
          const aWin = lowerIsBetter ? vA < vB : vA > vB;
          if (aWin) aWins++; else bWins++;
        });
        const total = aWins + bWins;
        const aPct = total > 0 ? (aWins / total) * 100 : 50;
        const bPct = total > 0 ? (bWins / total) * 100 : 50;
        return (
          <div className="border-t border-slate-200 dark:border-slate-700 pt-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-blue-600">{aWins > bWins ? `${aWins} vitórias` : ''}</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase">Placar</span>
              <span className="text-xs font-bold text-emerald-600">{bWins > aWins ? `${bWins} vitórias` : ''}</span>
            </div>
            <div className="flex h-3 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700">
              <div className="h-full bg-blue-500 transition-all" style={{ width: `${aPct}%` }} />
              <div className="h-full bg-emerald-500 transition-all" style={{ width: `${bPct}%` }} />
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-[10px] font-bold text-blue-600">A {aWins}</span>
              <span className="text-[10px] text-slate-400">{total} métricas</span>
              <span className="text-[10px] font-bold text-emerald-600">B {bWins}</span>
            </div>
          </div>
        );
      })()}

      <div className="flex items-center justify-center gap-4 text-[10px] text-slate-400">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-600"></span> A = Período A</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-600"></span> B = Período B</span>
      </div>
    </>);
    })()}
  </motion.div>
)}

      {/* Stats Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ staggerChildren: 0.1 }}
        className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4"
      >
        <StatCard
          title="Ganhos Brutos"
          value={stats.earnings}
          icon={TrendingUp}
          color="text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30"
          isCurrency
          change={getChangePercent(stats.earnings, previousPeriodStats.earnings)}
          tooltip="Soma de todos os valores recebidos nas corridas do período selecionado."
        />
        <StatCard
          title="Despesas"
          value={stats.expenses}
          icon={TrendingDown}
          color="text-rose-600 bg-rose-50 dark:bg-rose-950/30"
          isCurrency
          change={getChangePercent(stats.expenses, previousPeriodStats.expenses)}
          tooltip="Soma de todas as despesas variáveis registradas."
        />
        <StatCard
          title="Líquido"
          value={stats.profit}
          icon={DollarSign}
          color="text-brand-600 bg-brand-50 dark:bg-brand-950/30"
          isCurrency
          tooltip="Ganhos Brutos - Despesas Variáveis - Custos Fixos proporcional."
        />
        <StatCard
          title="KM Rodados"
          value={stats.km}
          icon={MapPin}
          color="text-blue-600 bg-blue-50 dark:bg-blue-950/30"
          change={getChangePercent(stats.km, previousPeriodStats.km)}
          tooltip="Total de quilômetros percorridos no período."
        />
        <StatCard
          title="Dias Trabalhados"
          value={stats.workedDays}
          icon={Calendar}
          color="text-violet-600 bg-violet-50 dark:bg-violet-950/30"
          tooltip="Dias com pelo menos uma corrida registrada."
        />
        <StatCard
          title="Consumo Médio"
          value={stats.kmPerLiter}
          icon={Gauge}
          color="text-orange-600 bg-orange-50 dark:bg-orange-950/30"
          unit="km/l"
          isDecimal
          tooltip="Consumo médio do veículo baseado em abastecimentos de tanque cheio."
        />
      </motion.div>

      {/* Veículo + Estimativa + Objetivo Diário */}
      {profile && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-950/30 flex items-center justify-center text-orange-600">
                <Bike size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-white">Resumo do Veículo</h3>
                <p className="text-xs text-slate-400">{profile.vehicleModel || profile.vehicleType}</p>
              </div>
            </div>
<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="space-y-1">
        <p className="text-xs text-slate-400 font-bold uppercase">Saldo Tanque</p>
                <p className="text-lg font-bold text-brand-600">{stats.estimatedBalance.toFixed(1)}L</p>
            {stats.estimatedBalanceUnreliable && (
              <p className="text-[10px] text-amber-500 italic">Saldo sem consumo real</p>
            )}
                {stats.tankSize && (
                  <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        (stats.estimatedBalance / stats.tankSize) < 0.2 ? "bg-rose-500" : "bg-brand-500"
                      )}
                      style={{ width: `${Math.min((stats.estimatedBalance / stats.tankSize) * 100, 100)}%` }}
                    />
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <p className="text-xs text-slate-400 font-bold uppercase">Autonomia</p>
                <p className="text-lg font-bold text-emerald-600">{stats.autonomy ? `${stats.autonomy.kmAutonomy.toFixed(0)} km` : '—'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-slate-400 font-bold uppercase">Custo Var./KM</p>
                <p className="text-lg font-bold text-slate-800 dark:text-white">R$ {stats.costPerKm.toFixed(2)}</p>
                <p className="text-[10px] text-slate-400">comb. + manut.</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-slate-400 font-bold uppercase">Custo Total/KM</p>
                <p className="text-lg font-bold text-slate-800 dark:text-white">R$ {stats.totalCostPerKm.toFixed(2)}</p>
                <p className="text-[10px] text-slate-400">incluindo fixos</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-950/30 flex items-center justify-center text-brand-600">
                <Calculator size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-white">Estimativa do Mês</h3>
                <p className="text-[10px] text-slate-400">{format(new Date(), 'MMMM yyyy', { locale: ptBR })}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase">Ganhos</p>
                <p className="text-lg font-bold text-emerald-600">R$ {monthlyEstimate.earnings.toFixed(0)}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase">Gastos</p>
                <p className="text-lg font-bold text-rose-600">R$ {monthlyEstimate.expenses.toFixed(0)}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase">Líquido</p>
                <p className="text-lg font-bold text-slate-800 dark:text-white">R$ {monthlyEstimate.net.toFixed(0)}</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-400">
              <span>{monthlyEstimate.workDays} dias</span>
              <span>{monthlyEstimate.totalHours.toFixed(1)}h</span>
              <span>R$ {(profile?.hourlyRate || stats.avgPerHour || 0).toFixed(2)}/h</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/30 flex items-center justify-center text-emerald-600">
                <Target size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-white">Meta Diária</h3>
                <p className="text-[10px] text-slate-400">{stats.dailyGoalTarget > 0 ? `R$ ${stats.dailyGoalTarget.toFixed(2)}/dia` : 'Não definida'}</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-slate-500">
                <span>Realizado</span>
                <span>{stats.periodTarget > 0 ? `${Math.min((stats.earnings / stats.periodTarget) * 100, 100).toFixed(0)}%` : '0%'}</span>
              </div>
              <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    stats.earnings >= stats.periodTarget ? "bg-emerald-500" : "bg-brand-500"
                  )}
                  style={{ width: `${stats.periodTarget > 0 ? Math.min((stats.earnings / stats.periodTarget) * 100, 100) : 0}%` }}
                />
              </div>
              <div className="flex justify-between text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-300">R$ {stats.earnings.toFixed(2)}</span>
                <span className="text-slate-400">de R$ {stats.periodTarget.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Detailed Expenses Breakdown */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Fuel size={14} className="text-orange-500" />
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Combustível</p>
          </div>
          <p className="text-xl font-bold dark:text-white">R$ {stats.fuelExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          {stats.km > 0 && stats.fuelExpenses > 0 && (
            <p className="text-[10px] text-slate-400 mt-1">R$ {(stats.fuelExpenses / stats.km).toFixed(2)}/km</p>
          )}
        </div>
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Droplets size={14} className="text-amber-500" />
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Alimentação</p>
          </div>
          <p className="text-xl font-bold dark:text-white">R$ {stats.foodExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Zap size={14} className="text-blue-500" />
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Manutenção</p>
          </div>
          <p className="text-xl font-bold dark:text-white">R$ {stats.maintenanceExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
      </motion.div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-6"
        >
          <motion.div
            variants={item}
            className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm"
          >
            <h3 className="text-lg font-bold mb-6 text-slate-800 dark:text-white">Ganhos vs Despesas</h3>
            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorGanhos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--brand-600)" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="var(--brand-600)" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorGastos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
<CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartGridStroke} />
      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: chartTickFill, fontSize: 12}} dy={10} />
      <YAxis axisLine={false} tickLine={false} tick={{fill: chartTickFill, fontSize: 12}} />
                  <RechartsTooltip
                    formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="ganhos"
                    stroke="var(--brand-600)"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorGanhos)"
                    animationDuration={1500}
                  />
                  <Area
                    type="monotone"
                    dataKey="gastos"
                    stroke="#f43f5e"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorGastos)"
                    animationDuration={1500}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          <motion.div
            variants={item}
            className="grid grid-cols-2 sm:grid-cols-4 gap-4"
          >
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm text-center">
              <Clock size={16} className="text-brand-500 mx-auto mb-1" />
              <p className="text-lg font-bold dark:text-white">{stats.hours.toFixed(1)}h</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase">Horas</p>
            </div>
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm text-center">
              <DollarSign size={16} className="text-emerald-500 mx-auto mb-1" />
              <p className="text-lg font-bold dark:text-white">R$ {stats.avgPerHour.toFixed(2)}</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase">/Hora</p>
            </div>
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm text-center">
              <MapPin size={16} className="text-violet-500 mx-auto mb-1" />
              <p className="text-lg font-bold dark:text-white">R$ {stats.avgPerKm.toFixed(2)}</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase">/KM</p>
            </div>
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm text-center">
              <Gauge size={16} className="text-teal-500 mx-auto mb-1" />
              <p className="text-lg font-bold dark:text-white">{stats.rides}</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase">Corridas</p>
            </div>
          </motion.div>

          {/* Daily Costs Breakdown */}
          <motion.div
            variants={item}
            className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm"
          >
            <h4 className="text-sm font-bold text-slate-800 dark:text-white mb-4">Custos Diários Estimados</h4>
            <div className="space-y-3">
              {[
                { label: 'IPVA + Licenc.', value: stats.dailyCosts.ipva + stats.dailyCosts.licensing, color: 'bg-purple-500' },
                { label: 'Combustível', value: stats.dailyCosts.fuel, color: 'bg-orange-500' },
                { label: 'Manutenção', value: stats.dailyCosts.maintenance, color: 'bg-blue-500' },
                { label: 'Seguro', value: stats.dailyCosts.insurance, color: 'bg-cyan-500' },
                ...(stats.installmentMonthly > 0 ? [{ label: 'Parcela Veículo', value: stats.dailyCosts.installment, color: 'bg-emerald-500' as const }] : [])
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className={cn("w-2 h-2 rounded-full shrink-0", color)} />
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-500 dark:text-slate-400">{label}</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">R$ {value.toFixed(2)}</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className={cn("h-full rounded-full", color)} style={{ width: `${stats.dailyCosts.total > 0 ? (value / stats.dailyCosts.total) * 100 : 0}%` }} />
                    </div>
                  </div>
                </div>
              ))}
              <div className="flex items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="w-2 h-2 rounded-full shrink-0 bg-brand-600" />
                <div className="flex-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-brand-600">Total Diário</span>
                    <span className="font-bold text-brand-600">R$ {stats.dailyCosts.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Monthly Fixed Costs */}
          <motion.div
            variants={item}
            className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm"
          >
            <h4 className="text-sm font-bold text-slate-800 dark:text-white mb-4">Custo Fixo Mensal do Veículo</h4>
            <div className="flex items-end gap-2 mb-4">
              <p className="text-3xl font-bold text-brand-600">
                R$ {stats.monthlyFixedCosts.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <span className="text-sm text-slate-400">/mês</span>
            </div>
            <div className="space-y-2 text-xs text-slate-500">
              <div className="flex justify-between">
                <span>IPVA (1/12)</span>
                <span className="font-medium">R$ {((profile?.ipvaValue || 0) / 12).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Licenciamento (1/12)</span>
                <span className="font-medium">R$ {((profile?.licensingValue || 0) / 12).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Seguro</span>
                <span className="font-medium">R$ {(profile?.insuranceValue || 0).toFixed(2)}</span>
              </div>
              {stats.installmentMonthly > 0 && (
                <div className="flex justify-between">
                  <span>Parcela Veículo</span>
                  <span className="font-medium">R$ {stats.installmentMonthly.toFixed(2)}</span>
                </div>
              )}
            </div>
            {stats.installmentsRemaining > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <p className="text-xs text-slate-500">
                  <span className="font-bold text-brand-600">{stats.installmentsRemaining}</span> parcelas restantes
                </p>
                <p className="text-xs text-slate-400">
                  Total a pagar: R$ {stats.totalInstallmentDebt.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            )}
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-1 gap-8"
        >
          <motion.div
            variants={item}
            className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm"
          >
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-bold text-slate-800 dark:text-white">Distribuição de Ganhos</h3>
              <div className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/30 rounded-full">
                <span className="text-xs font-bold text-emerald-600">Total: R$ {stats.earnings.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={incomeDistribution.appData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="value"
                      labelLine={true}
                      label={renderCustomizedLabel}
                      animationBegin={200}
                      animationDuration={1000}
                    >
                      {incomeDistribution.appData.map((entry, index) => (
                        <Cell key={`cell-app-${index}`} fill={INCOME_COLORS[index % INCOME_COLORS.length]} stroke="none" />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-6">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase mb-3 tracking-widest">Por Aplicativo</p>
                  <div className="space-y-3">
                    {incomeDistribution.appData.map((app, i) => {
                      const totalAppValue = incomeDistribution.appData.reduce((s, a) => s + a.value, 0);
                  const percentage = totalAppValue > 0 ? (app.value / totalAppValue) * 100 : 0;
                      return (
                        <div key={app.name} className="flex items-center justify-between group">
                          <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: INCOME_COLORS[i % INCOME_COLORS.length] }} />
                            <span className="text-sm font-medium text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">{app.name}</span>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold dark:text-white">R$ {app.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                            <p className="text-[10px] text-slate-400 font-bold">{percentage.toFixed(1)}%</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                  <p className="text-xs font-bold text-slate-400 uppercase mb-3 tracking-widest">Por Modalidade</p>
                  <div className="flex flex-wrap gap-4">
                    {incomeDistribution.modalityData.map((mod, i) => {
                      const totalModValue = incomeDistribution.modalityData.reduce((s, m) => s + m.value, 0);
                  const percentage = totalModValue > 0 ? (mod.value / totalModValue) * 100 : 0;
                      return (
                        <div key={mod.name} className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: SUB_COLORS[i % SUB_COLORS.length] }} />
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{mod.name}: {percentage.toFixed(0)}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            variants={item}
            className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm"
          >
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-bold text-slate-800 dark:text-white">Distribuição de Gastos</h3>
              <div className="px-3 py-1 bg-rose-50 dark:bg-rose-950/30 rounded-full">
                <span className="text-xs font-bold text-rose-600">Total: R$ {stats.expenses.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expenseDistribution.categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="value"
                      labelLine={true}
                      label={renderCustomizedLabel}
                      animationBegin={400}
                      animationDuration={1000}
                    >
                      {expenseDistribution.categoryData.map((entry, index) => (
                        <Cell key={`cell-cat-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-6">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase mb-3 tracking-widest">Categorias Principais</p>
                  <div className="space-y-3">
                    {expenseDistribution.categoryData.map((cat, i) => {
                      const percentage = stats.expenses > 0 ? (cat.value / stats.expenses) * 100 : 0;
                      return (
                        <div key={cat.name} className="flex items-center justify-between group">
                          <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                            <span className="text-sm font-medium capitalize text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">{cat.name}</span>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold dark:text-white">R$ {cat.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                            <p className="text-[10px] text-slate-400 font-bold">{percentage.toFixed(1)}%</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                  <p className="text-xs font-bold text-slate-400 uppercase mb-3 tracking-widest">Detalhes</p>
                  <div className="space-y-2 max-h-[120px] overflow-y-auto pr-2 custom-scrollbar">
                    {expenseDistribution.subCategoryData.map((sub, i) => {
                      const percentage = stats.expenses > 0 ? (sub.value / stats.expenses) * 100 : 0;
                      return (
                        <div key={sub.name} className="flex items-center justify-between group">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: SUB_COLORS[(i + 2) % SUB_COLORS.length] }} />
                            <span className="text-xs text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">{sub.name}</span>
                          </div>
                          <span className="text-xs font-bold dark:text-white">{percentage.toFixed(0)}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Monthly Earnings vs Expenses */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Ganhos vs Gastos Mensais</h3>
            <p className="text-xs text-slate-400">{new Date().getFullYear()}</p>
          </div>
<div className="flex flex-wrap gap-1.5 max-sm:hidden">
        <button
          onClick={() => setSelectedMonth(null)}
          className={cn(
            "px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap",
            selectedMonth === null
            ? "bg-brand-600 text-white"
            : "bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700"
          )}
        >
          Todos
        </button>
        {monthlyData.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setSelectedMonth(idx)}
            className={cn(
              "px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap",
              selectedMonth === idx
              ? "bg-brand-600 text-white"
              : "bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700"
            )}
          >
            {monthlyData[idx].month}
          </button>
        ))}
      </div>
      <select
        value={selectedMonth ?? ''}
        onChange={(e) => setSelectedMonth(e.target.value === '' ? null : Number(e.target.value))}
        className="sm:hidden px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 outline-none"
      >
        <option value="">Todos</option>
        {monthlyData.map((m, idx) => (
          <option key={idx} value={idx}>{m.month}</option>
        ))}
      </select>
        </div>

        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={filteredMonthlyData} barCategoryGap={selectedMonth !== null ? '30%' : '10%'}>
              <defs>
                <linearGradient id="earningsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0.4} />
                </linearGradient>
                <linearGradient id="expensesGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#f43f5e" stopOpacity={0.4} />
                </linearGradient>
              </defs>
<CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartGridStroke} strokeOpacity={0.5} />
      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: chartTickFill, fontSize: 12, fontWeight: 600 }} dy={10} />
      <YAxis axisLine={false} tickLine={false} tick={{ fill: chartTickFill, fontSize: 11 }} />
              <RechartsTooltip
                formatter={(value: number, name: string) => [
                  `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                  name === 'earnings' ? 'Ganhos' : 'Gastos'
                ]}
                labelFormatter={(label) => `Mês: ${label}`}
contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)', padding: '12px 16px', background: chartTooltipBg, color: isDark ? '#fff' : '#1e293b' }}
      cursor={{ fill: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' }}
              />
              <Legend
                formatter={(value: string) => value === 'earnings' ? 'Ganhos' : 'Gastos'}
                wrapperStyle={{ fontSize: '13px', fontWeight: 600, marginTop: '8px' }}
                iconType="circle"
              />
              <Bar
                dataKey="earnings"
                fill="url(#earningsGrad)"
                stroke="#059669"
                strokeWidth={1}
                radius={[8, 8, 0, 0]}
                maxBarSize={56}
                animationDuration={1200}
                animationEasing="ease-in-out"
              />
              <Bar
                dataKey="expenses"
                fill="url(#expensesGrad)"
                stroke="#e11d48"
                strokeWidth={1}
                radius={[8, 8, 0, 0]}
                maxBarSize={56}
                animationDuration={1200}
                animationEasing="ease-in-out"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

    </motion.div>
  );
}

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ElementType;
  color: string;
  isCurrency?: boolean;
  isDecimal?: boolean;
  unit?: string;
  change?: number | null;
  tooltip?: string;
}

function StatCard({ title, value, icon: Icon, color, isCurrency = false, isDecimal = false, unit, change, tooltip }: StatCardProps) {
  const formattedValue = isCurrency
    ? `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : isDecimal
    ? `${value.toFixed(1)}`
    : value.toLocaleString('pt-BR');

  return (
    <motion.div
      variants={item}
      whileHover={{ y: -4 }}
      className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all min-w-0"
    >
      <div className="flex items-center justify-between mb-3">
        <div className={cn("p-2.5 rounded-xl", color)}>
          <Icon size={18} />
        </div>
        <div className="flex items-center gap-1.5">
          {change !== null && change !== undefined && (
            <span className={cn(
              "flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full",
              change >= 0
                ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30"
                : "text-rose-600 bg-rose-50 dark:bg-rose-950/30"
            )}>
              {change >= 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
              {Math.abs(change).toFixed(0)}%
            </span>
          )}
          {tooltip && <InfoTooltip content={tooltip} />}
        </div>
      </div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{title}</p>
      <p className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white truncate">
        {formattedValue}
        {unit && <span className="text-xs font-normal text-slate-400 ml-1">{unit}</span>}
      </p>
    </motion.div>
  );
}
