import React, { useState, useMemo } from 'react';
import { Bike, Settings, Fuel, AlertCircle, TrendingUp, MapPin, Calendar, Clock, Plus, Trash2, Save, X, DollarSign, Car, Filter, Search, History, ChevronDown, ChevronUp, Droplets, Activity } from 'lucide-react';
import { RideEntry, Expense, MaintenanceItem, UserProfile, MaintenanceHistory } from '../types';
import { cn } from '../lib/utils';
import { format, parseISO, differenceInDays, addDays } from 'date-fns';
import { calculateGlobalConsumption, getLastFuelExpense, calculateAutonomy } from '../lib/fuelCalculation';
import FuelConsumptionHistory from './FuelConsumptionHistory';
import InfoTooltip from './Tooltip';

import { motion, AnimatePresence } from 'motion/react';

interface MotorcycleTabProps {
  rides: RideEntry[];
  expenses: Expense[];
  maintenance: MaintenanceItem[];
  profile: UserProfile;
  onUpdateMaintenance: (items: MaintenanceItem[]) => void;
  sidebarCollapsed?: boolean;
  showToast?: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export default function MotorcycleTab({ rides, expenses, maintenance, profile, onUpdateMaintenance, sidebarCollapsed, showToast }: MotorcycleTabProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);
  const [isAddingHistory, setIsAddingHistory] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPosition, setFilterPosition] = useState<string>('all');
  const [formData, setFormData] = useState<Partial<MaintenanceItem>>({
    name: '',
    intervalKm: 1000,
    intervalDays: 0,
    lastChangeKm: 0,
    lastChangeDate: format(new Date(), 'yyyy-MM-dd'),
    estimatedCost: 0,
    position: undefined
  });

  const [historyFormData, setHistoryFormData] = useState<Partial<MaintenanceHistory>>({
    date: format(new Date(), 'yyyy-MM-dd'),
    km: 0,
    cost: 0,
    description: ''
  });

  const motoStats = useMemo(() => {
    const totalKm = rides.reduce((acc, r) => acc + r.kmDriven, 0);
    const fuelExpenses = expenses.filter(e => e.type === 'combustivel');
    const totalFuelValue = fuelExpenses.reduce((acc, e) => acc + e.value, 0);
    const totalLiters = fuelExpenses.reduce((acc, e) => acc + (e.liters || 0), 0);

    const maintenanceExpenses = expenses.filter(e => e.type === 'manutencao');
    const totalMaintenance = maintenanceExpenses.reduce((acc, e) => acc + e.value, 0);

    const costPerKm = totalKm > 0 ? (totalFuelValue + totalMaintenance) / totalKm : 0;

    const firstRide = rides.length > 0 ? parseISO(rides[rides.length - 1].date) : new Date();
    const daysDiff = Math.max(differenceInDays(new Date(), firstRide), 1);
    const avgKmPerDay = totalKm / daysDiff;

    const currentOdometerKm = profile.vehicleOdometerKm || totalKm;

    const globalConsumption = calculateGlobalConsumption(expenses);
    const kmPerLiter = globalConsumption.status === 'valid'
      ? globalConsumption.globalAverage
      : (profile.kmPerLiter || (totalLiters > 0 ? totalKm / totalLiters : 0));

    const lastFuelExpense = getLastFuelExpense(expenses);
    const autonomy = lastFuelExpense && globalConsumption.status === 'valid'
      ? calculateAutonomy(lastFuelExpense.saldoAfterFueling || 0, globalConsumption.globalAverage)
      : null;

    return {
      totalKm,
      currentOdometerKm,
      totalFuelValue,
      totalLiters,
      totalMaintenance,
      kmPerLiter,
      costPerKm,
      avgKmPerDay,
      maintenanceCount: maintenanceExpenses.length,
      globalConsumption,
      lastFuelExpense,
      autonomy
    };
  }, [rides, expenses, profile]);

  const handleEdit = (item: MaintenanceItem) => {
    setEditingId(item.id);
    setFormData(item);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSave = () => {
    // Validation
    if (!formData.name || formData.name.trim() === '') {
      showToast?.('Por favor, insira um nome para o item.', 'error');
      return;
    }

    if (!formData.intervalKm || formData.intervalKm <= 0) {
      showToast?.('O intervalo em KM deve ser maior que zero.', 'error');
      return;
    }

    if (formData.intervalDays && formData.intervalDays < 0) {
      showToast?.('O intervalo em dias não pode ser negativo.', 'error');
      return;
    }

    if (formData.lastChangeKm < 0) {
      showToast?.('O KM da última troca não pode ser negativo.', 'error');
      return;
    }

    if (formData.estimatedCost < 0) {
      showToast?.('O custo estimado não pode ser negativo.', 'error');
      return;
    }

    try {
      if (editingId) {
        onUpdateMaintenance(maintenance.map(m => m.id === editingId ? { ...m, ...formData } as MaintenanceItem : m));
        setEditingId(null);
        showToast?.('Item atualizado com sucesso!', 'success');
      } else {
        const newItem: MaintenanceItem = {
          id: crypto.randomUUID(),
          name: formData.name.trim(),
          intervalKm: Number(formData.intervalKm) || 1000,
          intervalDays: Number(formData.intervalDays) || 0,
          lastChangeKm: Number(formData.lastChangeKm) || 0,
          lastChangeDate: formData.lastChangeDate || format(new Date(), 'yyyy-MM-dd'),
          estimatedCost: Number(formData.estimatedCost) || 0,
          position: formData.position
        };
        onUpdateMaintenance([...maintenance, newItem]);
        setIsAdding(false);
        showToast?.('Item adicionado com sucesso!', 'success');
      }
      setFormData({ name: '', intervalKm: 1000, intervalDays: 0, lastChangeKm: 0, lastChangeDate: format(new Date(), 'yyyy-MM-dd'), estimatedCost: 0, position: undefined });
    } catch (error) {
      showToast?.('Erro ao salvar o item. Tente novamente.', 'error');
      console.error('Erro ao salvar manutenção:', error);
    }
  };

  const handleDelete = (id: string) => {
    try {
      onUpdateMaintenance(maintenance.filter(m => m.id !== id));
      showToast?.('Item removido com sucesso!', 'success');
    } catch (error) {
      showToast?.('Erro ao remover item. Tente novamente.', 'error');
      console.error('Erro ao deletar manutenção:', error);
    }
  };

  const handleAddHistory = (itemId: string) => {
    // Validation
    if (!historyFormData.km || historyFormData.km <= 0) {
      showToast?.('Por favor, insira o KM da manutenção.', 'error');
      return;
    }

    if (!historyFormData.cost || historyFormData.cost < 0) {
      showToast?.('Por favor, insira o custo da manutenção.', 'error');
      return;
    }

    try {
      const newHistory: MaintenanceHistory = {
        id: crypto.randomUUID(),
        date: historyFormData.date || format(new Date(), 'yyyy-MM-dd'),
        km: Number(historyFormData.km) || 0,
        cost: Number(historyFormData.cost) || 0,
        description: historyFormData.description
      };

      const updatedMaintenance = maintenance.map(m => {
        if (m.id === itemId) {
          const history = [...(m.history || []), newHistory].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          const latest = history[0];
          return {
            ...m,
            history,
            lastChangeKm: latest.km,
            lastChangeDate: latest.date,
            estimatedCost: latest.cost
          };
        }
        return m;
      });

      onUpdateMaintenance(updatedMaintenance);
      setIsAddingHistory(null);
      setHistoryFormData({ date: format(new Date(), 'yyyy-MM-dd'), km: 0, cost: 0, description: '' });
      showToast?.('Histórico adicionado com sucesso!', 'success');
    } catch (error) {
      showToast?.('Erro ao adicionar histórico. Tente novamente.', 'error');
      console.error('Erro ao adicionar histórico:', error);
    }
  };

  const handleDeleteHistory = (itemId: string, historyId: string) => {
    const updatedMaintenance = maintenance.map(m => {
      if (m.id === itemId) {
        const history = (m.history || []).filter(h => h.id !== historyId);
        const latest = history[0];
        return {
          ...m,
          history,
          lastChangeKm: latest ? latest.km : m.lastChangeKm,
          lastChangeDate: latest ? latest.date : m.lastChangeDate
        };
      }
      return m;
    });
    onUpdateMaintenance(updatedMaintenance);
  };

  const handleRestoreDefaults = () => {
    if (confirm('Deseja restaurar os itens de manutenção padrão? Isso substituirá sua lista atual.')) {
      try {
        const defaults: MaintenanceItem[] = [
          { id: '1', name: 'Troca de Óleo', intervalKm: 1000, lastChangeKm: motoStats.currentOdometerKm, lastChangeDate: format(new Date(), 'yyyy-MM-dd'), estimatedCost: 50 },
          { id: '2', name: 'Kit Relação', intervalKm: 15000, lastChangeKm: motoStats.currentOdometerKm, lastChangeDate: format(new Date(), 'yyyy-MM-dd'), estimatedCost: 250 },
          { id: '3', name: 'Pneu Dianteiro', intervalKm: 12000, lastChangeKm: motoStats.currentOdometerKm, lastChangeDate: format(new Date(), 'yyyy-MM-dd'), estimatedCost: 400, position: 'dianteiro' },
          { id: '4', name: 'Pneu Traseiro', intervalKm: 12000, lastChangeKm: motoStats.currentOdometerKm, lastChangeDate: format(new Date(), 'yyyy-MM-dd'), estimatedCost: 450, position: 'traseiro' },
          { id: '5', name: 'Pastilhas de Freio dianteira', intervalKm: 5000, lastChangeKm: motoStats.currentOdometerKm, lastChangeDate: format(new Date(), 'yyyy-MM-dd'), estimatedCost: 40, position: 'dianteiro' },
          { id: '6', name: 'Pastilhas de Freio traseira', intervalKm: 5000, lastChangeKm: motoStats.currentOdometerKm, lastChangeDate: format(new Date(), 'yyyy-MM-dd'), estimatedCost: 40, position: 'traseiro' },
        ];
        onUpdateMaintenance(defaults);
        showToast?.('Itens padrão restaurados com sucesso!', 'success');
      } catch (error) {
        showToast?.('Erro ao restaurar padrões. Tente novamente.', 'error');
        console.error('Erro ao restaurar padrões:', error);
      }
    }
  };

  const handleResetAll = () => {
    if (confirm('Deseja reiniciar o contador de todas as manutenções para a quilometragem atual? Isso não criará registros no histórico.')) {
      try {
        const updated = maintenance.map(m => ({
          ...m,
          lastChangeKm: motoStats.currentOdometerKm,
          lastChangeDate: format(new Date(), 'yyyy-MM-dd')
        }));
        onUpdateMaintenance(updated);
        showToast?.('Contadores reiniciados com sucesso!', 'success');
      } catch (error) {
        showToast?.('Erro ao reiniciar contadores. Tente novamente.', 'error');
        console.error('Erro ao resetar manutenções:', error);
      }
    }
  };

  const handleQuickChange = (item: MaintenanceItem) => {
    try {
      const newHistory: MaintenanceHistory = {
        id: crypto.randomUUID(),
        date: format(new Date(), 'yyyy-MM-dd'),
        km: motoStats.currentOdometerKm,
        cost: item.estimatedCost,
        description: 'Troca rápida realizada'
      };

      const updatedMaintenance = maintenance.map(m => {
        if (m.id === item.id) {
          const history = [...(m.history || []), newHistory].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          return {
            ...m,
            history,
            lastChangeKm: motoStats.currentOdometerKm,
            lastChangeDate: newHistory.date
          };
        }
        return m;
      });

      onUpdateMaintenance(updatedMaintenance);
      showToast?.(`${item.name} marcado como trocado!`, 'success');
    } catch (error) {
      showToast?.('Erro ao registrar troca. Tente novamente.', 'error');
      console.error('Erro na troca rápida:', error);
    }
  };

  const positions = profile.vehicleType === 'moto' 
    ? [
        { id: 'dianteiro', label: 'Dianteiro' },
        { id: 'traseiro', label: 'Traseiro' }
      ]
    : [
        { id: 'dianteiro', label: 'Dianteira (Eixo)' },
        { id: 'traseiro', label: 'Traseira (Eixo)' },
        { id: 'esquerdo_dianteiro', label: 'Esq. Dianteiro' },
        { id: 'direito_dianteiro', label: 'Dir. Dianteiro' },
        { id: 'esquerdo_traseiro', label: 'Esq. Traseiro' },
        { id: 'direito_traseiro', label: 'Dir. Traseiro' }
      ];

  const enhancedMaintenance = useMemo(() => {
    return maintenance.map(item => {
      // Use vehicle odometer if available, otherwise use totalKm from rides
      const currentKm = profile.vehicleOdometerKm || motoStats.totalKm;

      // Calculate km since last change (never negative)
      const kmSinceChange = Math.max(0, currentKm - item.lastChangeKm);
      const kmProgress = Math.min((kmSinceChange / item.intervalKm) * 100, 100);
      const kmRemaining = Math.max(item.intervalKm - kmSinceChange, 0);
      const daysRemainingByKm = motoStats.avgKmPerDay > 0 ? Math.floor(kmRemaining / motoStats.avgKmPerDay) : Infinity;

      let daysProgress = 0;
      let daysRemainingByDate = Infinity;
      const daysSinceChange = differenceInDays(new Date(), parseISO(item.lastChangeDate));

      if (item.intervalDays && item.intervalDays > 0) {
        daysProgress = Math.min((daysSinceChange / item.intervalDays) * 100, 100);
        daysRemainingByDate = Math.max(item.intervalDays - daysSinceChange, 0);
      }

      const progress = Math.max(kmProgress, daysProgress);
      const isCritical = progress >= 80;
      const isOverdue = progress >= 100;
      
      const minDaysRemaining = Math.min(daysRemainingByKm, daysRemainingByDate);
      const nextChangeDate = minDaysRemaining === Infinity 
        ? 'N/A' 
        : format(addDays(new Date(), minDaysRemaining), 'dd/MM/yyyy');

      return {
        ...item,
        kmSinceChange,
        kmProgress,
        daysSinceChange,
        daysProgress,
        progress,
        isCritical,
        isOverdue,
        minDaysRemaining,
        nextChangeDate
      };
    });
  }, [maintenance, motoStats]);

  const filteredMaintenance = useMemo(() => {
    return enhancedMaintenance.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPosition = filterPosition === 'all' || item.position === filterPosition;
      return matchesSearch && matchesPosition;
    });
  }, [enhancedMaintenance, searchTerm, filterPosition]);

  const alerts = useMemo(() => {
    return enhancedMaintenance.filter(item => item.isCritical);
  }, [enhancedMaintenance]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-brand-600 flex items-center justify-center text-white shadow-lg shadow-brand-200 dark:shadow-none">
            {profile.vehicleType === 'moto' ? <Bike size={24} /> : <Car size={24} />}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Gestão de Manutenção</h2>
            <p className="text-slate-500 dark:text-slate-400">Acompanhe os custos e prazos do seu {profile.vehicleType}.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleRestoreDefaults}
            className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-4 py-2 rounded-xl font-semibold flex items-center gap-2 hover:bg-slate-200 transition-all text-sm"
            title="Restaura os itens de manutenção para os padrões de fábrica"
          >
            <History size={18} /> Restaurar Padrões
          </button>
          <button
            onClick={handleResetAll}
            className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-4 py-2 rounded-xl font-semibold flex items-center gap-2 hover:bg-slate-200 transition-all text-sm"
            title="Reinicia todos os contadores para o KM atual"
          >
            <History size={18} /> Zerar Tudo
          </button>
          <button
            onClick={() => setIsAdding(true)}
            className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-xl font-semibold flex items-center gap-2 transition-all"
          >
            <Plus size={20} /> Adicionar Item
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {!profile.vehicleOdometerKm && (
          <div className="col-span-2 sm:col-span-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-2xl p-4 flex items-center gap-3">
            <AlertCircle size={20} className="text-amber-600 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-bold text-amber-800 dark:text-amber-300">Configure o KM do Odômetro</p>
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Vá em <strong>Perfil</strong> e adicione o KM atual do seu veículo para um controle de manutenção mais preciso.
              </p>
            </div>
          </div>
        )}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm relative group">
          <InfoTooltip 
            content="Cálculo baseado em abastecimentos completos: (KM atual - KM anterior) ÷ Litros abastecidos." 
            className="absolute top-3 right-3"
          />
          <p className="text-xs sm:text-sm text-slate-500 mb-1">Consumo Médio</p>
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
            <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white truncate">
              {motoStats.kmPerLiter.toFixed(1)}
              <span className="text-xs sm:text-sm font-normal text-slate-400 ml-1">KM/L</span>
            </p>
            {motoStats.globalConsumption.status === 'valid' ? (
              <span className="px-1.5 sm:px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 text-[9px] sm:text-[10px] font-bold rounded-full whitespace-nowrap w-fit">
                Real
              </span>
            ) : (
              <span className="px-1.5 sm:px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 text-[9px] sm:text-[10px] font-bold rounded-full whitespace-nowrap w-fit">
                Est.
              </span>
            )}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm relative">
          <InfoTooltip 
            content="Fórmula: (Gastos com combustível + Manutenção) ÷ KM rodados." 
            className="absolute top-3 right-3"
          />
          <p className="text-xs sm:text-sm text-slate-500 mb-1">Custo por KM</p>
          <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white truncate">R$ {motoStats.costPerKm.toFixed(2)}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm relative">
          <InfoTooltip 
            content="Total de quilômetros registrados nas corridas do app." 
            className="absolute top-3 right-3"
          />
          <p className="text-xs sm:text-sm text-slate-500 mb-1">KM Total</p>
          <p className="text-xl sm:text-2xl font-bold text-brand-600 truncate">{motoStats.totalKm.toLocaleString()}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm relative">
          <InfoTooltip 
            content="Média de quilômetros percorridos por dia, baseada no seu histórico de corridas." 
            className="absolute top-3 right-3"
          />
          <p className="text-xs sm:text-sm text-slate-500 mb-1">Média Diária</p>
          <p className="text-xl sm:text-2xl font-bold text-blue-600 truncate">{motoStats.avgKmPerDay.toFixed(1)} km</p>
        </div>
      </div>

      {/* Maintenance Alerts */}
      <AnimatePresence>
        {alerts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-3xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-rose-500 flex items-center justify-center text-white">
                  <AlertCircle size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-rose-900 dark:text-rose-300">Alertas de Manutenção</h3>
                  <p className="text-sm text-rose-700 dark:text-rose-400">Os itens abaixo precisam de atenção imediata ou em breve.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {alerts.map(item => (
                  <div key={item.id} className="bg-white/50 dark:bg-slate-900/50 p-4 rounded-2xl border border-rose-200/50 dark:border-rose-800/30 flex items-center justify-between gap-4">
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white text-sm">{item.name}</p>
                      <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                        {item.isOverdue ? 'Vencido!' : `Vence em aprox. ${item.minDaysRemaining} dias`}
                      </p>
                    </div>
                    <button
                      onClick={() => handleQuickChange(item)}
                      className="bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all"
                    >
                      Trocar Agora
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {(isAdding || editingId) && (
          <motion.div 
            initial={{ opacity: 0, height: 0, y: -20 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -20 }}
            className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl space-y-6 overflow-hidden"
          >
            <h3 className="text-lg font-bold dark:text-white">{editingId ? 'Editar Item' : 'Novo Item de Manutenção'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Nome do Item</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 dark:text-white"
                placeholder="Ex: Troca de Óleo"
              />
            </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Intervalo (KM)</label>
          <input
            type="number"
            value={formData.intervalKm?.toString() || '1000'}
            onChange={(e) => setFormData({ ...formData, intervalKm: Number(e.target.value) })}
            className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 dark:text-white"
            placeholder="Ex: 1000"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Intervalo (Dias - Opcional)</label>
          <input
            type="number"
            value={formData.intervalDays?.toString() || ''}
            onChange={(e) => setFormData({ ...formData, intervalDays: Number(e.target.value) })}
            className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 dark:text-white"
            placeholder="Ex: 180"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Custo Estimado (R$)</label>
          <input
            type="number"
            step="0.01"
            value={formData.estimatedCost?.toString() || '0'}
            onChange={(e) => setFormData({ ...formData, estimatedCost: Number(e.target.value) })}
            className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 dark:text-white"
            placeholder="Ex: 50.00"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">KM da Última Troca</label>
          <input
            type="number"
            value={formData.lastChangeKm?.toString() || '0'}
            onChange={(e) => setFormData({ ...formData, lastChangeKm: Number(e.target.value) })}
            className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 dark:text-white"
            placeholder="Ex: 63500"
          />
        </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Data da Última Troca</label>
              <input
                type="date"
                value={formData.lastChangeDate}
                onChange={(e) => setFormData({ ...formData, lastChangeDate: e.target.value })}
                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 dark:text-white"
              />
            </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Posição (Opcional)</label>
          <select
            value={formData.position || ''}
            onChange={(e) => setFormData({ ...formData, position: (e.target.value as any) || undefined })}
            className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 dark:text-white"
          >
            <option value="">Nenhuma</option>
            {positions.map(p => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-4">
        <button
          type="button"
          onClick={() => {
            setIsAdding(false);
            setEditingId(null);
            setFormData({ name: '', intervalKm: 1000, intervalDays: 0, lastChangeKm: 0, lastChangeDate: format(new Date(), 'yyyy-MM-dd'), estimatedCost: 0, position: undefined });
          }}
          className="px-6 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="px-6 py-2.5 bg-brand-600 text-white font-semibold rounded-xl hover:bg-brand-700 transition-all shadow-lg shadow-brand-200 dark:shadow-none flex items-center gap-2"
        >
          <Save size={18} />
          {editingId ? 'Salvar Alterações' : 'Adicionar Item'}
        </button>
      </div>
    </motion.div>
  )}
</AnimatePresence>

<div className={cn(
  "grid grid-cols-1 lg:grid-cols-3 gap-8",
  sidebarCollapsed && "lg:grid-cols-4"
)}>
      <div className={cn(
        "lg:col-span-2 bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm",
        sidebarCollapsed && "lg:col-span-3"
      )}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <h3 className="text-lg font-bold dark:text-white">Previsão de Manutenção</h3>
            
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input 
                  type="text"
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-7 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-2 focus:ring-brand-500 dark:text-white w-32"
                />
              </div>
              <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5">
                <Filter size={14} className="text-slate-400" />
                <select 
                  value={filterPosition}
                  onChange={(e) => setFilterPosition(e.target.value)}
                  className="bg-transparent text-[10px] font-bold outline-none dark:text-white cursor-pointer"
                >
                  <option value="all">Todas Posições</option>
                  {positions.map(p => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {filteredMaintenance.length === 0 ? (
              <p className="text-center text-slate-500 py-8">Nenhum item encontrado.</p>
            ) : (
              filteredMaintenance.map((item) => (
                <div key={item.id} className="group space-y-3 p-4 rounded-2xl border border-transparent hover:border-slate-100 dark:hover:border-slate-800 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleEdit(item)}
                        className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:scale-110",
                          item.isCritical ? "bg-rose-50 dark:bg-rose-950/30 text-rose-500" : "bg-brand-50 dark:bg-brand-950/30 text-brand-600"
                        )}
                        title="Configurar Item"
                      >
                        <Settings size={20} />
                      </button>
                      <div>
                        <span className="font-bold text-slate-700 dark:text-slate-300 block">{item.name}</span>
                        <span className="text-xs text-slate-500">Próxima troca aprox: {item.nextChangeDate}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleQuickChange(item)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1",
                          item.isCritical 
                            ? "bg-rose-600 text-white hover:bg-rose-700" 
                            : "bg-brand-100 dark:bg-brand-900/30 text-brand-600 hover:bg-brand-200"
                        )}
                        title="Marcar como trocado agora"
                      >
                        <Save size={12} /> Trocar Agora
                      </button>
                      <button
                        onClick={() => setExpandedHistoryId(expandedHistoryId === item.id ? null : item.id)}
                        className={cn(
                          "p-2 rounded-lg transition-all",
                          expandedHistoryId === item.id ? "bg-brand-50 text-brand-600" : "text-slate-400 hover:text-brand-600"
                        )}
                        title="Ver Histórico"
                      >
                        <History size={16} />
                      </button>
                      <button
                        onClick={() => handleEdit(item)}
                        className="p-2 text-slate-400 hover:text-brand-600 transition-all"
                        title="Configurar Item"
                      >
                        <Settings size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-2 text-slate-400 hover:text-rose-500 transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold mb-1">
                      <span className={item.isCritical ? "text-rose-500" : "text-slate-500"}>
                        {item.kmSinceChange.toLocaleString()} / {item.intervalKm.toLocaleString()} KM
                        {item.intervalDays && item.intervalDays > 0 && (
                          <> • {item.daysSinceChange} / {item.intervalDays} Dias</>
                        )}
                      </span>
                      <span className="text-slate-400">R$ {item.estimatedCost.toFixed(2)}</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full transition-all duration-1000 ease-out rounded-full",
                          item.isCritical ? "bg-rose-500" : "bg-brand-500"
                        )}
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  </div>

                  <AnimatePresence>
                    {expandedHistoryId === item.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden pt-4 border-t border-slate-100 dark:border-slate-800 mt-4 space-y-4"
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold uppercase text-slate-400">Histórico de Manutenções</h4>
                          <button
                            onClick={() => setIsAddingHistory(item.id)}
                            className="text-[10px] font-bold text-brand-600 hover:underline flex items-center gap-1"
                          >
                            <Plus size={12} /> Registrar Nova
                          </button>
                        </div>

                        {isAddingHistory === item.id && (
                          <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <input
                                type="date"
                                value={historyFormData.date}
                                onChange={(e) => setHistoryFormData({ ...historyFormData, date: e.target.value })}
                                className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none dark:text-white"
                              />
                              <input
                                type="number"
                                placeholder="KM"
                                value={historyFormData.km || ''}
                                onChange={(e) => setHistoryFormData({ ...historyFormData, km: Number(e.target.value) })}
                                className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none dark:text-white"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <input
                                type="number"
                                placeholder="Custo (R$)"
                                value={historyFormData.cost || ''}
                                onChange={(e) => setHistoryFormData({ ...historyFormData, cost: Number(e.target.value) })}
                                className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none dark:text-white"
                              />
                              <input
                                type="text"
                                placeholder="Obs..."
                                value={historyFormData.description}
                                onChange={(e) => setHistoryFormData({ ...historyFormData, description: e.target.value })}
                                className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none dark:text-white"
                              />
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleAddHistory(item.id)}
                                className="flex-1 bg-brand-600 text-white text-[10px] font-bold py-2 rounded-lg"
                              >
                                Confirmar
                              </button>
                              <button
                                onClick={() => setIsAddingHistory(null)}
                                className="px-4 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-bold py-2 rounded-lg"
                              >
                                X
                              </button>
                            </div>
                          </div>
                        )}

                        <div className="space-y-2">
                          {(!item.history || item.history.length === 0) ? (
                            <p className="text-[10px] text-slate-400 italic text-center py-2">Nenhum registro anterior.</p>
                          ) : (
                            item.history.map((h) => (
                              <div key={h.id} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg group/hist">
                                <div className="flex flex-col">
                                  <span className="text-[10px] font-bold dark:text-slate-300">{format(parseISO(h.date), 'dd/MM/yy')} - {h.km.toLocaleString()} KM</span>
                                  {h.description && <span className="text-[9px] text-slate-500">{h.description}</span>}
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400">R$ {h.cost.toFixed(2)}</span>
                                  <button
                                    onClick={() => handleDeleteHistory(item.id, h.id)}
                                    className="opacity-0 group-hover/hist:opacity-100 text-rose-500 p-1"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))
            )}
          </div>
        </div>

      <div className={cn(
        "bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm min-w-[240px]",
        sidebarCollapsed && "lg:min-w-[280px]"
      )}>
        <h3 className="text-base font-bold mb-4 dark:text-white">Dicas de Economia</h3>
        <div className="space-y-3">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 flex gap-3">
            <TrendingUp className="text-emerald-600 shrink-0" size={20} />
            <div>
              <p className="font-bold text-sm text-emerald-800 dark:text-emerald-300">Calibragem dos Pneus</p>
              <p className="text-xs text-emerald-700 dark:text-emerald-400">Mantenha calibrados para economizar até 5% de combustível.</p>
            </div>
          </div>
          <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-2xl border border-blue-100 dark:border-blue-900/30 flex gap-3">
            <Settings className="text-blue-600 shrink-0" size={20} />
            <div>
              <p className="font-bold text-sm text-blue-800 dark:text-blue-300">Lubrificação da Corrente</p>
              <p className="text-xs text-blue-700 dark:text-blue-400">A cada 500km para aumentar a vida útil do kit.</p>
            </div>
          </div>
          <div className="p-3 bg-brand-50 dark:bg-brand-950/20 rounded-2xl border border-brand-100 dark:border-brand-900/30 flex gap-3">
            <AlertCircle className="text-brand-600 shrink-0" size={20} />
            <div>
              <p className="font-bold text-sm text-brand-800 dark:text-brand-300">Filtro de Ar</p>
              <p className="text-xs text-brand-700 dark:text-brand-400">Garante mistura correta e evita perda de potência.</p>
            </div>
      </div>
    </div>
  </div>

{/* Cards de Combustível - Método da Reserva */}
      <div className={cn(
        "grid grid-cols-1 sm:grid-cols-2 gap-4",
        sidebarCollapsed ? "lg:grid-cols-3" : "lg:grid-cols-2 xl:grid-cols-3"
      )}>
        {/* Saldo Atual no Tanque */}
        {motoStats.lastFuelExpense && (
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm min-w-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-950/30 flex items-center justify-center text-brand-600">
              <Droplets size={20} />
            </div>
            <div>
              <p className="text-sm font-bold dark:text-white truncate">Saldo no Tanque</p>
              <p className="text-xs text-slate-500">
                {format(parseISO(motoStats.lastFuelExpense.date), 'dd/MM/yyyy')}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-end gap-2">
          <p className="text-3xl font-bold text-brand-600">
            {motoStats.lastFuelExpense.saldoAfterFueling?.toFixed(1) || '0'}
          </p>
          <p className="text-lg text-slate-400 mb-1">litros</p>
        </div>
        {profile.totalTankSize && (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>0L</span>
              <span>{profile.totalTankSize}L</span>
            </div>
            <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-500 rounded-full transition-all"
                style={{
                  width: `${((motoStats.lastFuelExpense.saldoAfterFueling || 0) / profile.totalTankSize) * 100}%`
                }}
              />
            </div>
          </div>
        )}
      </div>
    )}

    {/* Consumo do Último Trecho */}
    {motoStats.lastFuelExpense?.segmentConsumption && (
<div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm min-w-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-950/30 flex items-center justify-center text-orange-600">
                <Activity size={20} />
              </div>
              <div>
                <p className="text-sm font-bold dark:text-white truncate">Consumo do Trecho</p>
              <p className="text-xs text-slate-500">{motoStats.lastFuelExpense.tripTotal} km</p>
            </div>
          </div>
          {motoStats.lastFuelExpense.isCalibrated ? (
            <span className="px-2 py-1 bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold rounded-full">
              Calibrado
            </span>
          ) : (
            <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs font-bold rounded-full">
              Estimado
            </span>
          )}
        </div>
        <div className="flex items-end gap-2">
          <p className="text-3xl font-bold text-orange-600">
            {motoStats.lastFuelExpense.segmentConsumption.toFixed(1)}
          </p>
          <p className="text-lg text-slate-400 mb-1">km/l</p>
        </div>
      </div>
    )}

    {/* Média Global Real */}
    {motoStats.globalConsumption.status === 'valid' && (
<div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm min-w-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/30 flex items-center justify-center text-emerald-600">
                <TrendingUp size={20} />
              </div>
              <div>
                <p className="text-sm font-bold dark:text-white truncate">Média Global Real</p>
              <p className="text-xs text-slate-500">{motoStats.globalConsumption.validSegments} trechos calibrados</p>
            </div>
          </div>
          <InfoTooltip content="Média real considerando saldo no tanque. Fórmula: Total KM ÷ (Litros abastecidos - Saldo atual)." />
        </div>
        <div className="flex items-end gap-2 mb-4">
          <p className="text-3xl font-bold text-emerald-600">
            {motoStats.globalConsumption.globalAverage.toFixed(1)}
          </p>
          <p className="text-lg text-slate-400 mb-1">km/l</p>
        </div>
        <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div>
            <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">KM Total</p>
            <p className="text-sm font-bold dark:text-white">{motoStats.globalConsumption.totalKm.toFixed(0)}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Queimados</p>
            <p className="text-sm font-bold dark:text-white">{motoStats.globalConsumption.litersBurned.toFixed(1)}L</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Autonomia</p>
            <p className="text-sm font-bold dark:text-white">
              {motoStats.autonomy ? `${motoStats.autonomy.kmAutonomy.toFixed(0)} km` : '-'}
            </p>
          </div>
        </div>
      </div>
  )}
  </div>
  </div>

  <FuelConsumptionHistory expenses={expenses} profileKmPerLiter={profile.kmPerLiter || 0} />
</motion.div>
);
}
