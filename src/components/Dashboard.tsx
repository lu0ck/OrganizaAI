import React, { useState, useMemo } from 'react';
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
  Target
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
import { format, parseISO, isWithinInterval, startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, differenceInDays } from 'date-fns';
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
      start = startOfDay(parseISO(customStart));
      end = endOfDay(parseISO(customEnd));
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
    const fullTankExpenses = expenses.filter(e => e.type === 'combustivel' && e.enteredReserve === true);
    const fullTankKm = fullTankExpenses.reduce((acc, e) => acc + (e.tripTotal || 0), 0);
    const totalLiters = fullTankExpenses.reduce((acc, e) => acc + (e.liters || 0), 0);
    const simpleAverage = totalLiters > 0 ? fullTankKm / totalLiters : 0;
    const kmPerLiter = globalConsumption.status === 'valid' && globalConsumption.globalAverage > 0
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

    const autonomy = lastFuelExpense && globalConsumption.status === 'valid'
      ? calculateAutonomy(estimatedBalance, globalConsumption.globalAverage)
      : lastFuelExpense && kmPerLiter > 0
      ? calculateAutonomy(estimatedBalance, kmPerLiter)
      : null;

    const ipvaMonthly = (profile?.ipvaValue || 0) / 12;
    const licensingMonthly = (profile?.licensingValue || 0) / 12;
    const insuranceMonthly = profile?.insuranceValue || 0;
    const installmentMonthly = profile?.vehicleInstallmentValue || 0;
    const monthlyFixedCosts = ipvaMonthly + licensingMonthly + insuranceMonthly + installmentMonthly;
    const installmentsRemaining = profile?.vehicleInstallmentsRemaining || 0;
    const totalInstallmentDebt = installmentMonthly * installmentsRemaining;

    const dailyGoal = goals.find(g => g.type === 'diaria');
    const periodTarget = dailyGoal ? dailyGoal.targetValue * workedDays : 0;

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
      autonomy,
      tankSize: profile?.totalTankSize,
      monthlyFixedCosts,
      installmentsRemaining,
      totalInstallmentDebt,
      installmentMonthly,
      dailyGoalTarget: dailyGoal?.targetValue || 0,
      periodTarget
    };
  }, [filteredData, profile, rides, expenses, goals]);

  const previousPeriodStats = useMemo(() => {
    const periodDays = Math.max(differenceInDays(filteredData.end, filteredData.start), 1);
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
      r.appRides.forEach(app => {
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
        </div>
      </div>

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

      {/* Veículo + Objetivo Diário */}
      {profile && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-950/30 flex items-center justify-center text-orange-600">
                <Bike size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-white">Resumo do Veículo</h3>
                <p className="text-[10px] text-slate-400">{profile.vehicleModel || profile.vehicleType}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-[10px] text-slate-400 font-bold uppercase">Saldo Tanque</p>
                <p className="text-lg font-bold text-brand-600">{stats.estimatedBalance.toFixed(1)}L</p>
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
                <p className="text-[10px] text-slate-400 font-bold uppercase">Autonomia</p>
                <p className="text-lg font-bold text-emerald-600">{stats.autonomy ? `${stats.autonomy.kmAutonomy.toFixed(0)} km` : '—'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-slate-400 font-bold uppercase">Custo Var./KM</p>
                <p className="text-lg font-bold text-slate-800 dark:text-white">R$ {stats.costPerKm.toFixed(2)}</p>
                <p className="text-[8px] text-slate-400">comb. + manut.</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-slate-400 font-bold uppercase">Custo Total/KM</p>
                <p className="text-lg font-bold text-slate-800 dark:text-white">R$ {stats.totalCostPerKm.toFixed(2)}</p>
                <p className="text-[8px] text-slate-400">incluindo fixos</p>
              </div>
            </div>
          </div>

          {stats.dailyGoalTarget > 0 && (
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/30 flex items-center justify-center text-emerald-600">
                  <Target size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white">Meta Diária</h3>
                  <p className="text-[10px] text-slate-400">R$ {stats.dailyGoalTarget.toFixed(2)}/dia</p>
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
          )}
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
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
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
                      const percentage = stats.earnings > 0 ? (app.value / stats.earnings) * 100 : 0;
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
                      const percentage = stats.earnings > 0 ? (mod.value / stats.earnings) * 100 : 0;
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
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setSelectedMonth(null)}
              className={cn(
                "px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all whitespace-nowrap",
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
                  "px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all whitespace-nowrap",
                  selectedMonth === idx
                    ? "bg-brand-600 text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700"
                )}
              >
                {monthlyData[idx].month}
              </button>
            ))}
          </div>
        </div>

        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={filteredMonthlyData} barCategoryGap={selectedMonth !== null ? '30%' : '10%'}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
              <RechartsTooltip
                formatter={(value: number, name: string) => [
                  `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                  name === 'earnings' ? 'Ganhos' : 'Gastos'
                ]}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              />
              <Legend
                formatter={(value: string) => value === 'earnings' ? 'Ganhos' : 'Gastos'}
                wrapperStyle={{ fontSize: '12px', marginTop: '8px' }}
              />
              <Bar
                dataKey="earnings"
                fill="#10b981"
                radius={[6, 6, 0, 0]}
                maxBarSize={48}
                animationDuration={1000}
              />
              <Bar
                dataKey="expenses"
                fill="#f43f5e"
                radius={[6, 6, 0, 0]}
                maxBarSize={48}
                animationDuration={1000}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

    </motion.div>
  );
}

function StatCard({ title, value, icon: Icon, color, isCurrency = false, isDecimal = false, unit, change, tooltip }: any) {
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
