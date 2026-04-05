import React, { useState, useMemo } from 'react';
import { Target, Plus, Trash2, TrendingUp, Calendar, CheckCircle2, Save, X, XCircle, ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { Goal, RideEntry, Expense } from '../types';
import { format, parseISO, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, eachDayOfInterval, isSameDay, subMonths, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '../lib/utils';

import { motion, AnimatePresence } from 'motion/react';

interface GoalsProps {
  goals: Goal[];
  rides: RideEntry[];
  expenses: Expense[];
  onAddGoal: (goal: Goal) => void;
  onDeleteGoal: (id: string) => void;
}

export default function Goals({ goals, rides, expenses, onAddGoal, onDeleteGoal }: GoalsProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [formData, setFormData] = useState<Partial<Goal>>({
    type: 'diaria',
    targetValue: 0
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
      startDate: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };
    onAddGoal(newGoal);
    setIsAdding(false);
    setFormData({ type: 'diaria', targetValue: 0 });
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
              let start: Date, end: Date;
              
              if (goal.type === 'diaria') {
                start = startOfDay(now);
                end = endOfDay(now);
              } else if (goal.type === 'semanal') {
                start = startOfWeek(now);
                end = endOfWeek(now);
              } else {
                start = startOfMonth(now);
                end = endOfMonth(now);
              }

              const earned = rides
                .filter(r => isWithinInterval(parseISO(r.date), { start, end }))
                .reduce((acc, r) => acc + r.totalValue, 0);
              
              const progress = Math.min((earned / goal.targetValue) * 100, 100);

              return (
                <div key={goal.id} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm relative group">
                  <button
                    onClick={() => onDeleteGoal(goal.id)}
                    className="absolute top-4 right-4 p-2 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                  
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-950/30 flex items-center justify-center text-brand-600">
                      <TrendingUp size={20} />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{goal.type}</span>
                      <h4 className="font-bold dark:text-white">Alvo: R$ {goal.targetValue.toFixed(2)}</h4>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm font-bold">
                      <span className="text-slate-600 dark:text-slate-400">R$ {earned.toFixed(2)}</span>
                      <span className="text-brand-600">{progress.toFixed(0)}%</span>
                    </div>
                    <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-brand-600 transition-all duration-1000 ease-out rounded-full"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </motion.div>
  );
}
