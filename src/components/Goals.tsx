import React, { useState, useMemo } from 'react';
import { Target, Plus, Trash2, TrendingUp, Calendar, CheckCircle2, Save, X, XCircle, ChevronLeft, ChevronRight, Info, Edit3 } from 'lucide-react';
import { Goal, RideEntry, Expense, UserProfile, WorkDay } from '../types';
import { format, parseISO, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, eachDayOfInterval, isSameDay, subMonths, addMonths, differenceInDays, isBefore, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '../lib/utils';

import { motion, AnimatePresence } from 'motion/react';

interface GoalsProps {
  goals: Goal[];
  rides: RideEntry[];
  expenses: Expense[];
  profile?: UserProfile | null;
  onAddGoal: (goal: Goal) => void;
  onDeleteGoal: (id: string) => void;
  onUpdateGoal?: (goal: Goal) => void;
}

function countExpectedWorkDays(
  workSchedule: WorkDay[],
  startDate: Date,
  endDate: Date
): number {
  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  let count = 0;
  
  const current = new Date(startDate);
  current.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);
  
  while (isBefore(current, end) || isSameDay(current, end)) {
    const dayName = dayNames[current.getDay()];
    const scheduleDay = workSchedule.find(d => d.day === dayName);
    if (scheduleDay?.active) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return count;
}

function countWorkedDays(rides: RideEntry[], startDate: Date, endDate: Date): number {
  const uniqueDays = new Set<string>();
  const start = startOfDay(startDate);
  const end = endOfDay(endDate);
  
  rides.forEach(ride => {
    const rideDate = parseISO(ride.date);
    if (isWithinInterval(rideDate, { start, end })) {
      uniqueDays.add(ride.date.split('T')[0]);
    }
  });
  
  return uniqueDays.size;
}

export default function Goals({ goals, rides, expenses, profile, onAddGoal, onDeleteGoal, onUpdateGoal }: GoalsProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [formData, setFormData] = useState<Partial<Goal>>({
    type: 'diaria',
    targetValue: 0,
    startDate: format(new Date(), 'yyyy-MM-dd'),
    connectedToSchedule: true
  });

  const estimates = useMemo(() => {
    const last30Days = rides.filter(r => isWithinInterval(parseISO(r.date), { 
      start: subMonths(new Date(), 1), 
      end: new Date() 
    }));
    
    const totalEarned30 = last30Days.reduce((acc, r) => acc + r.totalValue, 0);
    const avgDailyEarned = totalEarned30 / 30;
    
    const last30Expenses = expenses.filter(e => isWithinInterval(parseISO(e.date), { 
      start: subMonths(new Date(), 1), 
      end: new Date() 
    }));
    
    const totalExpenses30 = last30Expenses.reduce((acc, e) => acc + e.value, 0);
    const fuelExpenses30 = last30Expenses.filter(e => e.type === 'combustivel').reduce((acc, e) => acc + e.value, 0);
    const foodExpenses30 = last30Expenses.filter(e => e.type === 'alimentacao').reduce((acc, e) => acc + e.value, 0);
    const maintenanceExpenses30 = last30Expenses.filter(e => e.type === 'manutencao').reduce((acc, e) => acc + e.value, 0);
    
    const avgDailyExpense = totalExpenses30 / 30;
    const avgDailyFuel = fuelExpenses30 / 30;
    const avgDailyFood = foodExpenses30 / 30;
    const avgDailyMaintenance = maintenanceExpenses30 / 30;

    return {
      weeklyEstimate: avgDailyEarned * 7,
      monthlyEstimate: avgDailyEarned * 30,
      weeklyCostEstimate: avgDailyExpense * 7,
      monthlyCostEstimate: avgDailyExpense * 30,
      weeklyFuel: avgDailyFuel * 7,
      monthlyFuel: avgDailyFuel * 30,
      weeklyFood: avgDailyFood * 7,
      monthlyFood: avgDailyFood * 30,
      weeklyMaintenance: avgDailyMaintenance * 7,
      monthlyMaintenance: avgDailyMaintenance * 30
    };
  }, [rides, expenses]);

  const actuals = useMemo(() => {
    const now = new Date();
    const weekInterval = { start: startOfWeek(now), end: endOfWeek(now) };
    const monthInterval = { start: startOfMonth(now), end: endOfMonth(now) };

    const weekRides = rides.filter(r => isWithinInterval(parseISO(r.date), weekInterval));
    const monthRides = rides.filter(r => isWithinInterval(parseISO(r.date), monthInterval));
    
    const weekExpenses = expenses.filter(e => isWithinInterval(parseISO(e.date), weekInterval));
    const monthExpenses = expenses.filter(e => isWithinInterval(parseISO(e.date), monthInterval));

    const getSub = (exps: Expense[], type: string) => exps.filter(e => e.type === type).reduce((acc, e) => acc + e.value, 0);

    return {
      weekEarned: weekRides.reduce((acc, r) => acc + r.totalValue, 0),
      monthEarned: monthRides.reduce((acc, r) => acc + r.totalValue, 0),
      weekSpent: weekExpenses.reduce((acc, e) => acc + e.value, 0),
      monthSpent: monthExpenses.reduce((acc, e) => acc + e.value, 0),
      weekFuel: getSub(weekExpenses, 'combustivel'),
      monthFuel: getSub(monthExpenses, 'combustivel'),
      weekFood: getSub(weekExpenses, 'alimentacao'),
      monthFood: getSub(monthExpenses, 'alimentacao'),
      weekMaintenance: getSub(weekExpenses, 'manutencao'),
      monthMaintenance: getSub(monthExpenses, 'manutencao')
    };
  }, [rides, expenses]);

  const monthInterval = {
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth)
  };

  const daysInMonth = eachDayOfInterval(monthInterval);

  const dailyGoal = goals.find(g => g.type === 'diaria');

  const monthStats = useMemo(() => {
    return daysInMonth.map(day => {
      const dayRides = rides.filter(r => isSameDay(parseISO(r.date), day));
      const totalEarned = dayRides.reduce((acc, r) => acc + r.totalValue, 0);
      const isMet = dailyGoal ? totalEarned >= dailyGoal.targetValue : false;
      const hasData = dayRides.length > 0;
      
      return {
        day,
        totalEarned,
        isMet,
        hasData
      };
    });
  }, [daysInMonth, rides, dailyGoal]);

  const metCount = monthStats.filter(s => s.hasData && s.isMet).length;
  const missedCount = monthStats.filter(s => s.hasData && !s.isMet).length;

  const handleAdd = () => {
    const newGoal: Goal = {
      id: crypto.randomUUID(),
      type: formData.type as any,
      targetValue: Number(formData.targetValue) || 0,
      startDate: formData.startDate || new Date().toISOString(),
      createdAt: new Date().toISOString(),
      connectedToSchedule: formData.connectedToSchedule ?? true
    };
    onAddGoal(newGoal);
    setIsAdding(false);
    setFormData({ type: 'diaria', targetValue: 0, startDate: format(new Date(), 'yyyy-MM-dd'), connectedToSchedule: true });
  };

  const handleEdit = (goal: Goal) => {
    if (onUpdateGoal) {
      onUpdateGoal(goal);
    }
    setEditingGoalId(null);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-brand-600 flex items-center justify-center text-white shadow-lg shadow-brand-200 dark:shadow-none">
            <Target size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Metas e Objetivos</h2>
            <p className="text-slate-500 dark:text-slate-400">Defina e acompanhe seu progresso financeiro.</p>
          </div>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-xl font-semibold flex items-center gap-2 transition-all"
        >
          <Plus size={20} /> Nova Meta
        </button>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div 
            initial={{ opacity: 0, height: 0, y: -20 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -20 }}
            className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl space-y-6 overflow-hidden"
          >
            <h3 className="text-lg font-bold dark:text-white">Configurar Nova Meta</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Tipo de Meta</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 dark:text-white"
                >
                  <option value="diaria">Diária</option>
                  <option value="semanal">Semanal</option>
                  <option value="mensal">Mensal</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Valor Alvo (R$)</label>
                <input
                  type="number"
                  value={formData.targetValue}
                  onChange={(e) => setFormData({ ...formData, targetValue: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 dark:text-white"
                  placeholder="Ex: 200.00"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Data de Início</label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 dark:text-white"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.connectedToSchedule ?? true}
                    onChange={(e) => setFormData({ ...formData, connectedToSchedule: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                  Conectar à agenda de trabalho
                </label>
                {formData.connectedToSchedule && profile?.workSchedule && (
                  <p className="text-[10px] text-slate-400 mt-1">
                    Dias configurados: {profile.workSchedule.filter(d => d.active).map(d => d.day).join(', ')}
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-4">
              <button
                onClick={handleAdd}
                className="flex-1 bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <Save size={20} /> Salvar Meta
              </button>
              <button
                onClick={() => setIsAdding(false)}
                className="px-6 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold py-3 rounded-xl hover:bg-slate-200 transition-all"
              >
                Cancelar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Estimativas de Ganhos</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-slate-500">Semanal (Estimado)</p>
                <p className="text-xl font-bold text-emerald-600">R$ {estimates.weeklyEstimate.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                <p className="text-[10px] text-slate-400">Realizado: <span className="font-bold text-slate-600 dark:text-slate-300">R$ {actuals.weekEarned.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-slate-500">Mensal (Estimado)</p>
                <p className="text-xl font-bold text-emerald-600">R$ {estimates.monthlyEstimate.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                <p className="text-[10px] text-slate-400">Realizado: <span className="font-bold text-slate-600 dark:text-slate-300">R$ {actuals.monthEarned.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></p>
              </div>
            </div>

{/* Status da Meta no Mês Atual */}
          {profile?.workSchedule && profile.workSchedule.some(d => d.active) && (
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              {(() => {
                const now = new Date();
                const monthStart = startOfMonth(now);
                const dailyGoal = goals.find(g => g.type === 'diaria' && g.connectedToSchedule);

                if (!dailyGoal) {
                  return (
                    <div className="text-center py-4">
                      <p className="text-xs text-slate-500 mb-2">
                        Configure uma meta diária para acompanhar seu progresso
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Clique em "Nova Meta" acima para criar
                      </p>
                    </div>
                  );
                }

                const expectedDaysThisMonth = countExpectedWorkDays(profile.workSchedule, monthStart, now);
                const expectedValueThisMonth = expectedDaysThisMonth * dailyGoal.targetValue;
                const earnedThisMonth = rides
                  .filter(r => {
                    const rideDate = parseISO(r.date);
                    return !isBefore(rideDate, monthStart) && !isAfter(rideDate, now);
                  })
                  .reduce((acc, r) => acc + r.totalValue, 0);
                const differenceThisMonth = earnedThisMonth - expectedValueThisMonth;
                const workedDaysThisMonth = countWorkedDays(rides, monthStart, now);
                  
                  return (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 mb-2">
                        <Target size={14} className="text-brand-600" />
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Meta do Mês Atual</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <p className="text-[10px] text-slate-400">Esperado até hoje</p>
                          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                            R$ {expectedValueThisMonth.toFixed(2)}
                          </p>
                          <p className="text-[9px] text-slate-400">({expectedDaysThisMonth} dias de trabalho)</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] text-slate-400">Realizado</p>
                          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                            R$ {earnedThisMonth.toFixed(2)}
                          </p>
                          <p className="text-[9px] text-slate-400">({workedDaysThisMonth} dias trabalhados)</p>
                        </div>
                      </div>
                      <div className={cn(
                        "mt-2 p-2 rounded-lg",
                        differenceThisMonth >= 0 
                          ? "bg-emerald-50 dark:bg-emerald-950/30" 
                          : "bg-rose-50 dark:bg-rose-950/30"
                      )}>
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                            {differenceThisMonth >= 0 ? 'Acima da meta' : 'Atrasado'}
                          </span>
                          <span className={cn(
                            "text-sm font-bold",
                            differenceThisMonth >= 0 ? "text-emerald-600" : "text-rose-600"
                          )}>
                            {differenceThisMonth >= 0 ? '+' : ''}R$ {Math.abs(differenceThisMonth).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Estimativas de Custos</h3>
            <div className="group relative">
              <Info size={14} className="text-slate-400 cursor-help" />
              <div className="absolute right-0 bottom-full mb-2 w-64 p-3 bg-slate-800 text-white text-[10px] rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl">
                Essas estimativas são baseadas nos seus gastos reais dos últimos 30 dias, incluindo combustível, alimentação e manutenção proporcional.
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-xs text-slate-500">Semanal (Estimado)</p>
              <p className="text-xl font-bold text-rose-600">R$ {estimates.weeklyCostEstimate.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              <p className="text-[10px] text-slate-400 mb-2">Realizado: <span className="font-bold text-slate-600 dark:text-slate-300">R$ {actuals.weekSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></p>
              <div className="space-y-1 pt-2 border-t border-slate-50 dark:border-slate-800">
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-400">Combustível:</span>
                  <div className="text-right">
                    <p className="font-bold text-orange-500">Est: R$ {estimates.weeklyFuel.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    <p className="text-slate-400">Real: R$ {actuals.weekFuel.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  </div>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-400">Alimentação:</span>
                  <div className="text-right">
                    <p className="font-bold text-amber-500">Est: R$ {estimates.weeklyFood.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    <p className="text-slate-400">Real: R$ {actuals.weekFood.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs text-slate-500">Mensal (Estimado)</p>
              <p className="text-xl font-bold text-rose-600">R$ {estimates.monthlyCostEstimate.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              <p className="text-[10px] text-slate-400 mb-2">Realizado: <span className="font-bold text-slate-600 dark:text-slate-300">R$ {actuals.monthSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></p>
              <div className="space-y-1 pt-2 border-t border-slate-50 dark:border-slate-800">
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-400">Combustível:</span>
                  <div className="text-right">
                    <p className="font-bold text-orange-500">Est: R$ {estimates.monthlyFuel.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    <p className="text-slate-400">Real: R$ {actuals.monthFuel.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  </div>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-400">Alimentação:</span>
                  <div className="text-right">
                    <p className="font-bold text-amber-500">Est: R$ {estimates.monthlyFood.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    <p className="text-slate-400">Real: R$ {actuals.monthFood.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <p className="mt-4 text-[9px] text-slate-400 italic leading-tight">
            * Inclui combustível, alimentação e reserva para manutenção.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold dark:text-white">Histórico de Metas Diárias</h3>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all text-slate-600 dark:text-slate-400"
                >
                  <ChevronLeft size={20} />
                </button>
                <span className="font-bold text-slate-700 dark:text-slate-200 capitalize">
                  {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
                </span>
                <button 
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all text-slate-600 dark:text-slate-400"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>

<div className="grid grid-cols-7 gap-2">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                  <div key={day} className="text-center text-xs font-bold text-slate-400 py-2">{day}</div>
                ))}
                {monthStats.length > 0 && Array.from({ length: monthStats[0].day.getDay() }).map((_, i) => (
                  <div key={`empty-${i}`} className="aspect-square" />
                ))}
                {monthStats.map((stat, i) => (
                  <div
                    key={i}
                    className={cn(
                      "aspect-square rounded-xl flex flex-col items-center justify-center border transition-all relative group",
                      !stat.hasData
                        ? "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800"
                        : stat.isMet
                        ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900/30"
                        : "bg-rose-50 dark:bg-rose-950/30 border-rose-100 dark:border-rose-900/30"
                    )}
                  >
                    <span className="text-xs font-bold text-slate-400 mb-1">{format(stat.day, 'd')}</span>
                    {stat.hasData && (
                      stat.isMet
                        ? <CheckCircle2 size={16} className="text-emerald-500" />
                        : <XCircle size={16} className="text-rose-500" />
                    )}

                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-all whitespace-nowrap z-10">
                      {stat.hasData ? `R$ ${stat.totalEarned.toFixed(2)}` : 'Sem dados'}
                    </div>
                  </div>
                ))}
              </div>

            <div className="mt-6 flex items-center justify-center gap-8 border-t border-slate-100 dark:border-slate-800 pt-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-sm text-slate-600 dark:text-slate-400 font-medium">Metas Batidas: <span className="text-emerald-600 font-bold">{metCount}</span></span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-500" />
                <span className="text-sm text-slate-600 dark:text-slate-400 font-medium">Metas Perdidas: <span className="text-rose-600 font-bold">{missedCount}</span></span>
              </div>
            </div>
          </div>
        </div>

<div className="space-y-6">
          <h3 className="text-lg font-bold dark:text-white">Suas Metas Ativas</h3>
          {goals.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 text-center">
              <Target className="mx-auto text-slate-300 mb-4" size={48} />
              <p className="text-slate-500 dark:text-slate-400">Você ainda não definiu nenhuma meta.</p>
            </div>
          ) : (
            goals.map((goal) => {
              const now = new Date();
              const goalStartDate = parseISO(goal.startDate);
              const effectiveStart = isBefore(goalStartDate, now) ? goalStartDate : now;
              
              // Calcular dias esperados de trabalho e valor esperado
              let expectedDays = 0;
              let expectedValue = 0;
              let workedDays = 0;
              let earned = 0;
              let periodLabel = '';
              
              if (goal.connectedToSchedule && profile?.workSchedule) {
                // Meta conectada à agenda - calcular desde o início da meta até hoje
                expectedDays = countExpectedWorkDays(profile.workSchedule, effectiveStart, now);
                expectedValue = expectedDays * goal.targetValue;
                workedDays = countWorkedDays(rides, effectiveStart, now);
                
                // Ganho real no período
                earned = rides
                  .filter(r => {
                    const rideDate = parseISO(r.date);
                    return !isBefore(rideDate, effectiveStart) && !isAfter(rideDate, now);
                  })
                  .reduce((acc, r) => acc + r.totalValue, 0);
                
                const daysDiff = differenceInDays(now, effectiveStart) + 1;
                periodLabel = `${expectedDays} dias de trabalho em ${daysDiff} dias`;
              } else {
                // Meta tradicional por período
                let start: Date, end: Date;
                
                if (goal.type === 'diaria') {
                  start = startOfDay(now);
                  end = endOfDay(now);
                  periodLabel = 'Hoje';
                } else if (goal.type === 'semanal') {
                  start = startOfWeek(now);
                  end = endOfWeek(now);
                  periodLabel = 'Esta semana';
                } else {
                  start = startOfMonth(now);
                  end = endOfMonth(now);
                  periodLabel = 'Este mês';
                }
                
                expectedDays = 1;
                expectedValue = goal.targetValue;
                earned = rides
                  .filter(r => isWithinInterval(parseISO(r.date), { start, end }))
                  .reduce((acc, r) => acc + r.totalValue, 0);
                workedDays = rides.filter(r => isWithinInterval(parseISO(r.date), { start, end })).length;
              }
              
              const difference = earned - expectedValue;
              const progress = expectedValue > 0 ? Math.min((earned / expectedValue) * 100, 100) : 0;
              const isEditing = editingGoalId === goal.id;
              
              return (
                <div key={goal.id} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm relative group">
                  <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                    <button
                      onClick={() => {
                        setEditingGoalId(isEditing ? null : goal.id);
                        setFormData({
                          type: goal.type,
                          targetValue: goal.targetValue,
                          startDate: goal.startDate,
                          connectedToSchedule: goal.connectedToSchedule ?? true
                        });
                      }}
                      className="p-2 text-slate-300 hover:text-brand-500 transition-all"
                    >
                      <Edit3 size={18} />
                    </button>
                    <button
                      onClick={() => onDeleteGoal(goal.id)}
                      className="p-2 text-slate-300 hover:text-rose-500 transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>

                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-950/30 flex items-center justify-center text-brand-600">
                      <TrendingUp size={20} />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        {goal.type} {goal.connectedToSchedule ? '• Conectada à agenda' : ''}
                      </span>
                      <h4 className="font-bold dark:text-white">
                        Alvo: R$ {goal.targetValue.toFixed(2)}/dia
                      </h4>
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Valor (R$/dia)</label>
                          <input
                            type="number"
                            value={formData.targetValue}
                            onChange={(e) => setFormData({ ...formData, targetValue: Number(e.target.value) })}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-brand-500 dark:text-white text-sm"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Data de Início</label>
                          <input
                            type="date"
                            value={formData.startDate}
                            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-brand-500 dark:text-white text-sm"
                          />
                        </div>
                      </div>
                      <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                        <input
                          type="checkbox"
                          checked={formData.connectedToSchedule ?? true}
                          onChange={(e) => setFormData({ ...formData, connectedToSchedule: e.target.checked })}
                          className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                        />
                        Conectar à agenda de trabalho
                      </label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            if (onUpdateGoal) {
                              onUpdateGoal({
                                ...goal,
                                targetValue: formData.targetValue || goal.targetValue,
                                startDate: formData.startDate || goal.startDate,
                                connectedToSchedule: formData.connectedToSchedule ?? true
                              });
                            }
                            setEditingGoalId(null);
                          }}
                          className="flex-1 bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold py-2 rounded-lg transition-all"
                        >
                          Salvar
                        </button>
                        <button
                          onClick={() => setEditingGoalId(null)}
                          className="px-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-sm font-bold py-2 rounded-lg hover:bg-slate-200 transition-all"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-sm font-bold">
                          <span className="text-slate-600 dark:text-slate-400">R$ {earned.toFixed(2)}</span>
                          <span className="text-brand-600">{progress.toFixed(0)}%</span>
                        </div>
                        <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full transition-all duration-1000 ease-out rounded-full",
                              difference >= 0 ? "bg-emerald-600" : "bg-brand-600"
                            )}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>

                      <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-slate-500">Meta esperada ({periodLabel})</span>
                          <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                            R$ {expectedValue.toFixed(2)}
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-slate-500">
                            {difference >= 0 ? 'Acima da meta' : 'Atrasado'}
                          </span>
                          <span className={cn(
                            "text-sm font-bold",
                            difference >= 0 ? "text-emerald-600" : "text-rose-600"
                          )}>
                            {difference >= 0 ? '+' : ''}R$ {Math.abs(difference).toFixed(2)}
                          </span>
                        </div>

                        {goal.connectedToSchedule && (
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-400">Dias trabalhados</span>
                            <span className="text-slate-600 dark:text-slate-400 font-medium">
                              {workedDays} de {expectedDays} esperados
                              {workedDays < expectedDays && (
                                <span className="text-rose-500 ml-1">
                                  ({expectedDays - workedDays} faltando)
                                </span>
                              )}
                            </span>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </motion.div>
  );
}
