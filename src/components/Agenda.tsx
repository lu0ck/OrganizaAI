import React, { useState, useMemo } from 'react';
import { Calendar, Clock, TrendingUp, Calculator, Save, X, Plus, Info, MapPin, Sparkles, Trash2, DollarSign, CheckCircle2, Copy, ClipboardCheck } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { RideEntry, Expense, UserProfile, WorkDay, WorkPeriod } from '../types';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import InfoTooltip from './Tooltip';

interface AgendaProps {
  rides: RideEntry[];
  expenses: Expense[];
  profile: UserProfile | null;
  onUpdateProfile: (profile: UserProfile) => void;
  sidebarCollapsed?: boolean;
}

export default function Agenda({ rides, expenses, profile, onUpdateProfile, sidebarCollapsed }: AgendaProps) {
  const [simulation, setSimulation] = useState({
    avgPerHour: 0,
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

  // Sync with profile when it loads
  React.useEffect(() => {
    if (profile?.workSchedule) {
      setSimulation(prev => ({ ...prev, schedule: profile.workSchedule }));
    }
  }, [profile?.workSchedule]);

  const handleSave = () => {
    if (profile) {
      onUpdateProfile({ ...profile, workSchedule: simulation.schedule });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
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
    if (rides.length === 0) return { perHour: 0, perDay: 0, perKm: 0, expenseRatio: 0 };

    const totalValue = rides.reduce((acc, r) => acc + r.totalValue, 0);
    const totalKm = rides.reduce((acc, r) => acc + r.kmDriven, 0);
    const totalExpenses = expenses.reduce((acc, e) => acc + e.value, 0);
    
    // Calculate total hours
    const totalHours = rides.reduce((acc, r) => {
      if (!r.startTime || !r.endTime) return acc;
      const start = r.startTime.split(':').map(Number);
      const end = r.endTime.split(':').map(Number);
      if (start.length < 2 || end.length < 2) return acc;
      
      let diff = (end[0] * 60 + end[1]) - (start[0] * 60 + start[1]);
      if (diff < 0) diff += 24 * 60; // Handle overnight
      return acc + (diff / 60);
    }, 0);

    return {
      perHour: totalHours > 0 ? totalValue / totalHours : 0,
      perDay: totalValue / rides.length,
      perKm: totalKm > 0 ? totalValue / totalKm : 0,
      expenseRatio: totalValue > 0 ? totalExpenses / totalValue : 0
    };
  }, [rides, expenses]);

  const simulationStats = useMemo(() => {
    let totalHoursPerWeek = 0;
    let activeDays = 0;

    simulation.schedule.forEach(day => {
      if (day.active) {
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

    // Fixed costs allocation from profile
    const annualFixedCosts = (profile?.ipvaValue || 0) + (profile?.licensingValue || 0);
    const monthlyFixedCosts = (annualFixedCosts / 12) + (profile?.insuranceValue || 0);
    const weeklyFixedCosts = monthlyFixedCosts / 4;

    // Variable expenses based on historical ratio
    const varWeeklyExpenses = weeklyEarnings * averages.expenseRatio;
    const varMonthlyExpenses = monthlyEarnings * averages.expenseRatio;

    const totalWeeklyExpenses = varWeeklyExpenses + weeklyFixedCosts;
    const totalMonthlyExpenses = varMonthlyExpenses + monthlyFixedCosts;

    return {
      totalHoursPerWeek,
      activeDays,
      daily: dailyEarnings,
      weekly: weeklyEarnings,
      monthly: monthlyEarnings,
      weeklyNet: weeklyEarnings - totalWeeklyExpenses,
      monthlyNet: monthlyEarnings - totalMonthlyExpenses,
      estimatedExpenses: totalMonthlyExpenses,
      estimatedWeeklyExpenses: totalWeeklyExpenses,
      fixedMonthly: monthlyFixedCosts,
      fixedWeekly: weeklyFixedCosts
    };
  }, [simulation, averages, profile]);

  const insights = useMemo(() => {
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
    
    let bestMoneyDay = -1;
    let maxAvgMoney = 0;
    let bestRidesDay = -1;
    let maxAvgRides = 0;
    
    Object.entries(dayStats).forEach(([day, stats]) => {
      const avgMoney = stats.totalValue / stats.count;
      const avgRides = stats.totalRides / stats.count;
      
      if (avgMoney > maxAvgMoney) {
        maxAvgMoney = avgMoney;
        bestMoneyDay = Number(day);
      }
      
      if (avgRides > maxAvgRides) {
        maxAvgRides = avgRides;
        bestRidesDay = Number(day);
      }
    });
    
    return {
      bestMoneyDay: dayNames[bestMoneyDay],
      maxAvgMoney,
      bestRidesDay: dayNames[bestRidesDay],
      maxAvgRides
    };
  }, [rides]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
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

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSave}
          className={cn(
            "px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg",
            isSaved 
              ? "bg-emerald-600 text-white shadow-emerald-100" 
              : "bg-brand-600 hover:bg-brand-700 text-white shadow-brand-100 dark:shadow-none"
          )}
        >
          {isSaved ? (
            <>
              <CheckCircle2 size={20} /> Salvo!
            </>
          ) : (
            <>
              <Save size={20} /> Salvar Escala
            </>
          )}
        </motion.button>
      </div>

<div className={cn(
  "grid grid-cols-1 lg:grid-cols-4 gap-8",
  sidebarCollapsed && "lg:grid-cols-5"
)}>
      <div className={cn(
        "lg:col-span-3 space-y-8",
        sidebarCollapsed && "lg:col-span-4"
      )}>
          <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
            <h3 className="text-lg font-bold mb-6 dark:text-white flex items-center gap-2">
              <Calculator size={20} className="text-brand-600" /> Simulador de Ganhos e Gastos
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div className="space-y-6">
                <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800">
                  <p className="text-xs font-bold text-slate-400 uppercase mb-4 tracking-wider">Resumo da Escala</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Dias Ativos</p>
                      <p className="text-2xl font-bold text-brand-600">{simulationStats.activeDays} dias/sem</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Horas</p>
                      <p className="text-2xl font-bold text-brand-600">{simulationStats.totalHoursPerWeek.toFixed(1)}h/sem</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Ganhos por Hora (R$)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">R$</span>
                    <input
                      type="number"
                      value={inputAvgPerHour}
                      onChange={(e) => {
                        const val = e.target.value;
                        setInputAvgPerHour(val);
                        setSimulation({ ...simulation, avgPerHour: Number(val) || 0 });
                      }}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 dark:text-white"
                      placeholder={averages.perHour.toFixed(2)}
                    />
                  </div>
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <Info size={12} /> Sua média real é R$ {averages.perHour.toFixed(2)}/h
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800"></div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Projeção Semanal</span>
                <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800"></div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/10 rounded-2xl border border-emerald-100/50 dark:border-emerald-900/20">
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase mb-1">Ganhos Semanais</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">R$ {simulationStats.weekly.toFixed(2)}</p>
                </div>
                <div className="p-4 bg-rose-50/50 dark:bg-rose-950/10 rounded-2xl border border-rose-100/50 dark:border-rose-900/20">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[10px] text-rose-600 dark:text-rose-400 font-bold uppercase">Gastos Semanais</p>
                    <div className="group relative">
                      <Info size={12} className="text-rose-400 cursor-help" />
                      <div className="absolute bottom-full right-0 mb-2 w-56 p-3 bg-slate-800 text-white text-[10px] rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl leading-relaxed">
                        <p className="font-bold mb-1 border-b border-slate-700 pb-1">Composição Semanal:</p>
                        <div className="flex justify-between mb-1">
                          <span>Custos Fixos:</span>
                          <span className="font-bold">R$ {simulationStats.fixedWeekly.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Variáveis:</span>
                          <span className="font-bold">R$ {(simulationStats.weekly * averages.expenseRatio).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">R$ {simulationStats.estimatedWeeklyExpenses.toFixed(2)}</p>
                </div>
                <div className="p-4 bg-brand-50 dark:bg-brand-950/20 rounded-2xl border border-brand-100 dark:border-brand-900/30">
                  <p className="text-[10px] text-brand-600 dark:text-brand-400 font-bold uppercase mb-1">Lucro Semanal</p>
                  <p className="text-lg font-bold text-brand-700 dark:text-brand-300">R$ {simulationStats.weeklyNet.toFixed(2)}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-6 mb-2">
                <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800"></div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Projeção Mensal (4 sem)</span>
                <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800"></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 bg-emerald-50 dark:bg-emerald-950/30 rounded-3xl border border-emerald-100 dark:border-emerald-900/30">
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider mb-1">Ganhos Mensais</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">R$ {simulationStats.monthly.toFixed(2)}</p>
                </div>
                <div className="p-6 bg-rose-50 dark:bg-rose-950/30 rounded-3xl border border-rose-100 dark:border-rose-900/30">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-rose-600 dark:text-rose-400 font-bold uppercase tracking-wider">Gastos Mensais</p>
                    <div className="group relative">
                      <Info size={14} className="text-rose-400 cursor-help" />
                      <div className="absolute bottom-full right-0 mb-2 w-64 p-3 bg-slate-800 text-white text-[10px] rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl leading-relaxed">
                        <p className="font-bold mb-1 border-b border-slate-700 pb-1">Composição dos Gastos Mensais:</p>
                        <div className="flex justify-between mb-1">
                          <span>Custos Fixos (IPVA/Seguro/Lic.):</span>
                          <span className="font-bold">R$ {simulationStats.fixedMonthly.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Gastos Variáveis (Histórico):</span>
                          <span className="font-bold">R$ {(simulationStats.monthly * averages.expenseRatio).toFixed(2)}</span>
                        </div>
                        <p className="mt-2 text-[9px] text-slate-400 italic">Os gastos variáveis são baseados na sua média histórica de despesas por ganho.</p>
                      </div>
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">R$ {simulationStats.estimatedExpenses.toFixed(2)}</p>
                </div>
                <div className="p-6 bg-brand-600 rounded-3xl shadow-lg shadow-brand-200 dark:shadow-none">
                  <p className="text-xs text-brand-100 font-bold uppercase tracking-wider mb-1">Lucro Mensal</p>
                  <p className="text-2xl font-bold text-white">R$ {simulationStats.monthlyNet.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold dark:text-white">Agenda de Trabalho</h3>
              <p className="text-xs text-slate-500">Clique no dia para ativar/desativar</p>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
              {simulation.schedule.map((item, i) => (
                <motion.div
                  key={item.day}
                  whileHover={{ y: -4 }}
                  className={cn(
                    "relative p-4 rounded-2xl border-2 transition-all cursor-pointer group",
                    item.active 
                      ? "bg-white dark:bg-slate-900 border-brand-500 shadow-lg shadow-brand-100 dark:shadow-none" 
                      : "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 opacity-60"
                  )}
                  onClick={() => toggleDay(i)}
                >
                  <div className="text-center mb-3">
                    <p className={cn(
                      "text-sm font-bold",
                      item.active ? "text-brand-600" : "text-slate-400"
                    )}>{item.day}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">{item.active ? 'Ativo' : 'Folga'}</p>
                    
                    <div className="flex justify-center gap-2 mt-2">
                      <button 
                        onClick={(e) => copyDay(i, e)}
                        title="Copiar escala"
                        className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors text-slate-400 hover:text-brand-600"
                      >
                        <Copy size={12} />
                      </button>
                      {copiedPeriods && (
                        <button 
                          onClick={(e) => pasteDay(i, e)}
                          title="Colar escala"
                          className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors text-slate-400 hover:text-emerald-600"
                        >
                          <ClipboardCheck size={12} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                    {item.active ? (
                      <>
                        <div className="space-y-2">
                          {item.periods.map((period, pIdx) => (
                            <div key={pIdx} className="space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Turno {pIdx + 1}</span>
                                {item.periods.length > 1 && (
                                  <button 
                                    onClick={() => removePeriod(i, pIdx)}
                                    className="text-rose-500 hover:text-rose-600"
                                  >
                                    <Trash2 size={10} />
                                  </button>
                                )}
                              </div>
                              <div className="flex flex-col gap-1">
                                <input 
                                  type="time" 
                                  value={period.start}
                                  onChange={(e) => updatePeriod(i, pIdx, 'start', e.target.value)}
                                  className="text-[10px] font-bold bg-slate-50 dark:bg-slate-800 p-1 rounded border border-slate-200 dark:border-slate-700 dark:text-white outline-none focus:ring-1 focus:ring-brand-500"
                                />
                                <input 
                                  type="time" 
                                  value={period.end}
                                  onChange={(e) => updatePeriod(i, pIdx, 'end', e.target.value)}
                                  className="text-[10px] font-bold bg-slate-50 dark:bg-slate-800 p-1 rounded border border-slate-200 dark:border-slate-700 dark:text-white outline-none focus:ring-1 focus:ring-brand-500"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                        <button 
                          onClick={() => addPeriod(i)}
                          className="w-full mt-2 py-1 flex items-center justify-center gap-1 bg-brand-50 dark:bg-brand-950/30 text-brand-600 rounded-lg border border-brand-100 dark:border-brand-900/30 hover:bg-brand-100 transition-colors text-[10px] font-bold"
                        >
                          <Plus size={10} /> Novo
                        </button>
                      </>
                    ) : (
                      <div className="h-20 flex items-center justify-center">
                        <X size={20} className="text-slate-200 dark:text-slate-700" />
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        <div className={cn(
          "space-y-8",
          sidebarCollapsed && "lg:min-w-[280px]"
        )}>
          {insights && (
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm min-w-[240px] relative">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-brand-600">
                  <Sparkles size={20} />
                  <h4 className="font-bold text-base">Insights Reais</h4>
                </div>
                <InfoTooltip content="Análise baseada em seus dados reais. Identifica o dia da semana com melhor faturamento e mais corridas." />
              </div>
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Melhor dia para faturamento</p>
                <p className="text-base font-bold text-slate-900 dark:text-white">{insights.bestMoneyDay}</p>
                <p className="text-xs text-emerald-600 font-medium">Média de R$ {insights.maxAvgMoney.toFixed(2)}/dia</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Dia com mais solicitações</p>
                <p className="text-base font-bold text-slate-900 dark:text-white">{insights.bestRidesDay}</p>
                <p className="text-xs text-blue-600 font-medium">Média de {insights.maxAvgRides.toFixed(1)} corridas/dia</p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm min-w-[240px] relative">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold dark:text-white">Suas Médias Reais</h3>
            <InfoTooltip content="Médias calculadas com base em todo o seu histórico de corridas e despesas no app." />
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 flex items-center justify-center">
                  <TrendingUp size={18} />
                </div>
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Por Hora</span>
              </div>
              <span className="font-bold dark:text-white">R$ {averages.perHour.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-600 flex items-center justify-center">
                  <Calendar size={18} />
                </div>
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Por Dia</span>
                </div>
                <span className="font-bold dark:text-white">R$ {averages.perDay.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/30 text-purple-600 flex items-center justify-center">
                    <MapPin size={20} />
                  </div>
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Por KM</span>
                </div>
                <span className="font-bold dark:text-white">R$ {averages.perKm.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-600 flex items-center justify-center">
                    <DollarSign size={20} />
                  </div>
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Gasto/Ganho</span>
                </div>
                <span className="font-bold dark:text-white">{(averages.expenseRatio * 100).toFixed(0)}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
