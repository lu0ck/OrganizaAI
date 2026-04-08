import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  MapPin,
  Calendar,
  Filter,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Clock
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { format, parseISO, isWithinInterval, startOfDay, endOfDay, subDays, startOfMonth, isSameDay } from 'date-fns';
import { RideEntry, Expense, Goal, UserProfile } from '../types';
import { cn } from '../lib/utils';
import { calculateFuelConsumption } from '../lib/fuelCalculation';

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
      staggerChildren: 0.1
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

    const daysInPeriod = Math.max(Math.ceil((filteredData.end.getTime() - filteredData.start.getTime()) / (1000 * 60 * 60 * 24)), 1);
    const totalFixedCosts = (ipvaDaily + licensingDaily + insuranceDaily) * daysInPeriod;

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

    const totalDailyCost = ipvaDaily + licensingDaily + insuranceDaily + fuelDaily + maintenanceDaily;

    const lastMonthStart = startOfMonth(subDays(new Date(), 30));
    const lastMonthEnd = endOfDay(subDays(lastMonthStart, -30));
    const lastMonthInterval = { start: lastMonthStart, end: lastMonthEnd };

    const lastMonthKm = rides
      .filter(r => isWithinInterval(parseISO(r.date), lastMonthInterval))
      .reduce((acc, r) => acc + r.kmDriven, 0);

    const lastMonthTotalCost = expenses
      .filter(e => isWithinInterval(parseISO(e.date), lastMonthInterval))
      .reduce((acc, e) => acc + e.value, 0) + (ipvaDaily + licensingDaily + insuranceDaily) * 30;

    const costPerKm = lastMonthKm > 0 ? lastMonthTotalCost / lastMonthKm : 0;

    const consumptionResult = calculateFuelConsumption(expenses, profile?.kmPerLiter || 0);
    const kmPerLiter = consumptionResult.hasEnoughData 
      ? consumptionResult.averageKmPerLiter 
      : (profile?.kmPerLiter || 0);

    return {
      earnings: totalEarnings,
      expenses: totalExpenses,
      profit: netProfit,
      km: totalKm,
      rides: totalRides,
      hours: totalHours,
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
        fuel: fuelDaily,
        maintenance: maintenanceDaily,
        total: totalDailyCost
      },
      costPerKm,
      kmPerLiter,
      consumptionResult
    };
  }, [filteredData, profile, rides, expenses]);

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

  const COLORS = ['#f43f5e', '#fb7185', '#fda4af', '#fecdd3', '#ffe4e6', '#f97316', '#eab308'];
  const INCOME_COLORS = ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#059669'];
  const SUB_COLORS = ['#0ea5e9', '#38bdf8', '#7dd3fc', '#bae6fd', '#e0f2fe'];

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }: any) => {
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
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white">OrganizaAi Dashboard</h2>
          <p className="text-slate-500 dark:text-slate-400">Resumo das suas atividades e ganhos.</p>
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
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
      >
      <StatCard
        title="Ganhos Brutos"
        value={stats.earnings}
        icon={TrendingUp}
        color="text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30"
        isCurrency
        tooltip="Soma de todos os valores recebidos nas corridas do período selecionado."
      />
      <StatCard
        title="Despesas Totais"
        value={stats.expenses}
        icon={TrendingDown}
        color="text-rose-600 bg-rose-50 dark:bg-rose-950/30"
        isCurrency
        tooltip="Soma de todas as despesas variáveis registradas (combustível, alimentação, manutenção, etc.)."
      />
      <StatCard
        title="Ganho Líquido"
        value={stats.profit}
        icon={DollarSign}
        color="text-brand-600 bg-brand-50 dark:bg-brand-950/30"
        isCurrency
        tooltip="Fórmula: Ganhos Brutos - Despesas Variáveis - Custos Fixos. Os custos fixos são calculados proporcionalmente: (IPVA + Licenciamento) ÷ 365 dias + Seguro ÷ 30 dias, multiplicado pelos dias do período."
      />
      <StatCard
        title="KM Rodados"
        value={stats.km}
        icon={MapPin}
        color="text-blue-600 bg-blue-50 dark:bg-blue-950/30"
        tooltip="Total de quilômetros percorridos no período selecionado."
      />
      </motion.div>

      {/* Detailed Expenses Breakdown */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm border-l-4 border-l-orange-500">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Combustível</p>
          <p className="text-xl font-bold dark:text-white">R$ {stats.fuelExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm border-l-4 border-l-amber-500">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Alimentação</p>
          <p className="text-xl font-bold dark:text-white">R$ {stats.foodExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm border-l-4 border-l-blue-500">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Manutenção</p>
          <p className="text-xl font-bold dark:text-white">R$ {stats.maintenanceExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
      </motion.div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-8"
        >
          <motion.div 
            variants={item}
            className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm"
          >
            <h3 className="text-lg font-bold mb-6 dark:text-white">Ganhos vs Despesas</h3>
            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorGanhos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--brand-600)" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="var(--brand-600)" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorGastos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#94a3b8" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                  <Tooltip 
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
                    stroke="#94a3b8" 
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
            className="grid grid-cols-1 sm:grid-cols-2 gap-6"
          >
            <motion.div 
              whileHover={{ scale: 1.02 }}
              className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-brand-50 dark:bg-brand-950/30 flex items-center justify-center text-brand-600">
                <Clock size={24} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Horas Trabalhadas</p>
                <p className="text-xl font-bold dark:text-white">{stats.hours.toFixed(1)}h</p>
              </div>
            </motion.div>
            <motion.div 
              whileHover={{ scale: 1.02 }}
              className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center text-emerald-600">
                <DollarSign size={24} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Valor por Hora</p>
                <p className="text-xl font-bold dark:text-white">R$ {stats.avgPerHour.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
            </motion.div>
          </motion.div>

          {/* New Stats Cards below Ganhos vs Despesas */}
          <motion.div 
            variants={item}
            className="grid grid-cols-1 sm:grid-cols-3 gap-4"
          >
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Média por Corrida</p>
              <p className="text-lg font-bold dark:text-white">R$ {stats.avgPerRide.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Ganhos por KM</p>
              <p className="text-lg font-bold dark:text-white">R$ {stats.avgPerKm.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total de Corridas</p>
              <p className="text-lg font-bold dark:text-white">{stats.rides}</p>
            </div>
          </motion.div>

          {/* Daily Costs Breakdown */}
          <motion.div 
            variants={item}
            className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm"
          >
            <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Custos Diários Estimados</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <p className="text-[10px] text-slate-400 font-bold uppercase">IPVA + Licenc.</p>
                <p className="text-sm font-bold dark:text-white">R$ {(stats.dailyCosts.ipva + stats.dailyCosts.licensing).toFixed(2)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-slate-400 font-bold uppercase">Combustível</p>
                <p className="text-sm font-bold dark:text-white">R$ {stats.dailyCosts.fuel.toFixed(2)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-slate-400 font-bold uppercase">Manutenção</p>
                <p className="text-sm font-bold dark:text-white">R$ {stats.dailyCosts.maintenance.toFixed(2)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-slate-400 font-bold uppercase">Seguro</p>
                <p className="text-sm font-bold dark:text-white">R$ {stats.dailyCosts.insurance.toFixed(2)}</p>
              </div>
              <div className="space-y-1 bg-brand-50 dark:bg-brand-950/20 p-2 rounded-lg">
                <p className="text-[10px] text-brand-600 font-bold uppercase">Total Diário</p>
                <p className="text-sm font-bold text-brand-700 dark:text-brand-400">R$ {stats.dailyCosts.total.toFixed(2)}</p>
              </div>
              <div className="space-y-1 bg-blue-50 dark:bg-blue-950/20 p-2 rounded-lg">
                <p className="text-[10px] text-blue-600 font-bold uppercase">Custo por KM</p>
                <p className="text-sm font-bold text-blue-700 dark:text-blue-400">R$ {stats.costPerKm.toFixed(2)}</p>
              </div>
            </div>
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
              <h3 className="text-xl font-bold dark:text-white">Distribuição de Ganhos</h3>
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
                    <Tooltip 
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
                      const percentage = (app.value / stats.earnings) * 100;
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
                      const percentage = (mod.value / stats.earnings) * 100;
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
              <h3 className="text-xl font-bold dark:text-white">Distribuição de Gastos</h3>
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
                    <Tooltip 
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
                      const percentage = (cat.value / stats.expenses) * 100;
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
                  <p className="text-xs font-bold text-slate-400 uppercase mb-3 tracking-widest">Detalhes (Subcategorias)</p>
                  <div className="space-y-2 max-h-[120px] overflow-y-auto pr-2 custom-scrollbar">
                    {expenseDistribution.subCategoryData.map((sub, i) => {
                      const percentage = (sub.value / stats.expenses) * 100;
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

    </motion.div>
  );
}

function StatCard({ title, value, icon: Icon, color, isCurrency = false, tooltip }: any) {
  return (
    <motion.div
      variants={item}
      whileHover={{ y: -5 }}
      className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-center justify-between mb-4">
        <div className={cn("p-3 rounded-2xl", color)}>
          <Icon size={24} />
        </div>
        {tooltip && <InfoTooltip content={tooltip} />}
      </div>
      <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
      <p className="text-2xl font-bold text-slate-900 dark:text-white">
        {isCurrency ? `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : value.toLocaleString('pt-BR')}
      </p>
    </motion.div>
  );
}
