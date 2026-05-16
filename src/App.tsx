import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bike, Car, Download, AlertCircle, X as CloseIcon,
  LayoutDashboard, PlusCircle, Receipt, Target, Calendar, FileText, User
} from 'lucide-react';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useSidebar } from './hooks/useSidebar';
import { useToast } from './hooks/useToast';
import { recalculateFuelExpensesChain, calculateGlobalConsumption } from './lib/fuelCalculation';
import { AppState, ColorTheme, MaintenanceItem, Expense, RideEntry } from './types';
import { format, subDays } from 'date-fns';
import { cn } from './lib/utils';

import Dashboard from './components/Dashboard';
import EntryForm from './components/EntryForm';
import ExpensesForm from './components/ExpensesForm';
import Goals from './components/Goals';
import MotorcycleTab from './components/VehicleTab';
import Agenda from './components/Agenda';
import ProfileSetup from './components/ProfileSetup';
import ProfileTab from './components/ProfileTab';
import ReportsTab from './components/ReportsTab';
import Footer from './components/Footer';
import Sidebar from './components/Sidebar';
import ToastContainer from './components/Toast';
import ErrorBoundary from './components/ErrorBoundary';

const mobileNavItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'rides', label: '', icon: PlusCircle },
  { id: 'expenses', label: '', icon: Receipt },
  { id: 'goals', label: '', icon: Target },
  { id: 'motorcycle', label: '', icon: Bike },
  { id: 'agenda', label: '', icon: Calendar },
  { id: 'reports', label: '', icon: FileText },
  { id: 'profile', label: '', icon: User },
];

const initialMaintenance: MaintenanceItem[] = [
  { id: '1', name: 'Troca de Óleo', intervalKm: 1000, intervalDays: 30, lastChangeKm: 0, lastChangeDate: format(new Date(), 'yyyy-MM-dd'), estimatedCost: 50 },
  { id: '2', name: 'Kit Relação', intervalKm: 15000, intervalDays: 180, lastChangeKm: 0, lastChangeDate: format(new Date(), 'yyyy-MM-dd'), estimatedCost: 250 },
  { id: '3', name: 'Pneu Dianteiro', intervalKm: 12000, intervalDays: 365, lastChangeKm: 0, lastChangeDate: format(new Date(), 'yyyy-MM-dd'), estimatedCost: 400, position: 'dianteiro' },
  { id: '4', name: 'Pneu Traseiro', intervalKm: 12000, intervalDays: 365, lastChangeKm: 0, lastChangeDate: format(new Date(), 'yyyy-MM-dd'), estimatedCost: 450, position: 'traseiro' },
  { id: '5', name: 'Pastilhas de Freio dianteira', intervalKm: 5000, intervalDays: 90, lastChangeKm: 0, lastChangeDate: format(new Date(), 'yyyy-MM-dd'), estimatedCost: 40, position: 'dianteiro' },
  { id: '6', name: 'Pastilhas de Freio traseira', intervalKm: 5000, intervalDays: 90, lastChangeKm: 0, lastChangeDate: format(new Date(), 'yyyy-MM-dd'), estimatedCost: 40, position: 'traseiro' },
];

const initialState: AppState = {
  profile: null,
  rides: [],
  expenses: [],
  goals: [],
  maintenance: [],
  manualCompensations: [],
  plans: [],
  customApps: [],
  theme: 'dark',
  colorTheme: 'red'
};

export default function App() {
  const [state, setState] = useLocalStorage<AppState>('organizaai_data_v2', initialState);
  const safeState = {
    ...state,
    rides: Array.isArray(state.rides) ? state.rides : [],
    expenses: Array.isArray(state.expenses) ? state.expenses : [],
    goals: Array.isArray(state.goals) ? state.goals : [],
    maintenance: Array.isArray(state.maintenance) ? state.maintenance : [],
    manualCompensations: Array.isArray(state.manualCompensations) ? state.manualCompensations : [],
    plans: Array.isArray(state.plans) ? state.plans : [],
    customApps: Array.isArray(state.customApps) ? state.customApps : [],
  };
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showBackupPrompt, setShowBackupPrompt] = useState(false);
  const { width, collapsed, isResizing, toggle, startResizing, stopResizing, handleResize } = useSidebar();
  const { toasts, showToast, removeToast } = useToast();

// Migration for Brake Pads
useEffect(() => {
  try {
  const oldNames = ['Pastilha de Freio', 'Pastilhas de Freio', 'Pastilha de Freio Dianteira', 'Pastilha de Freio Traseira'];
  const newNames = ['Pastilhas de Freio dianteira', 'Pastilhas de Freio traseira'];

      if (!safeState.maintenance || safeState.maintenance.length === 0) return;

      const hasOldBrakePads = safeState.maintenance.some(m => oldNames.includes(m.name));

      // Check for duplicates of the new names
      const counts = safeState.maintenance.reduce((acc, m) => {
    acc[m.name] = (acc[m.name] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const hasDuplicates = newNames.some(name => counts[name] > 1);

  if (hasOldBrakePads || hasDuplicates) {
  setState(prev => {
  // 1. Filter out all old variations
  let updatedMaintenance = prev.maintenance.filter(m => !oldNames.includes(m.name));

  // 2. Handle duplicates of new names (keep only the first one)
  newNames.forEach(name => {
    const items = updatedMaintenance.filter(m => m.name === name);
    if (items.length > 1) {
      // Keep the one with most history or just the first one
      const first = items[0];
      updatedMaintenance = updatedMaintenance.filter(m => m.name !== name);
      updatedMaintenance.push(first);
    }
  });

  // 3. Ensure both new items exist
  newNames.forEach(name => {
    if (!updatedMaintenance.some(m => m.name === name)) {
      updatedMaintenance.push({
        id: crypto.randomUUID(),
        name: name,
        intervalKm: 5000,
        intervalDays: 90,
        lastChangeKm: 0,
        lastChangeDate: format(subDays(new Date(), 90), 'yyyy-MM-dd'),
        estimatedCost: 40,
        position: name.includes('dianteira') ? 'dianteiro' : 'traseiro'
      });
    }
  });

  return { ...prev, maintenance: updatedMaintenance };
  });
  }
  } catch (error) {
    console.error('Migration useEffect error:', error);
    try { localStorage.setItem('organizaai_last_error', JSON.stringify({ message: 'Migration: ' + (error as Error)?.message, time: new Date().toISOString() })); } catch {}
  }
  }, [safeState.maintenance, setState]);

  // Atualizar consumo atual no perfil
  useEffect(() => {
    if (!safeState.profile) return;

    try {
      const globalConsumption = calculateGlobalConsumption(safeState.expenses);

      let currentKmPerLiter = 0;

    if (globalConsumption.status === 'valid' && globalConsumption.globalAverage && globalConsumption.globalAverage > 0) {
      currentKmPerLiter = Number(globalConsumption.globalAverage.toFixed(1));
      } else {
        const fullTankExpenses = safeState.expenses.filter(e => e.type === 'combustivel' && e.enteredReserve === true);
        const fullTankKm = fullTankExpenses.reduce((acc, e) => acc + (e.tripTotal || 0), 0);
        const totalLiters = fullTankExpenses.reduce((acc, e) => acc + (e.liters || 0), 0);
        if (totalLiters > 0 && fullTankKm > 0) {
          currentKmPerLiter = Number((fullTankKm / totalLiters).toFixed(1));
        }
      }

      if (safeState.profile.currentKmPerLiter !== currentKmPerLiter) {
        setState(prev => ({
          ...prev,
          profile: { ...prev.profile!, currentKmPerLiter }
        }));
      }
    } catch (error) {
      console.error('Error updating consumption:', error);
    }
  }, [safeState.expenses, safeState.profile]);

  const toggleTheme = () => {
    setState(prev => ({ ...prev, theme: prev.theme === 'light' ? 'dark' : 'light' }));
  };

  const setColorTheme = (color: ColorTheme) => {
    setState(prev => ({ ...prev, colorTheme: color }));
  };

  // Handler para adicionar ride e atualizar odômetro
const handleAddRide = (ride: RideEntry) => {
  setState(prev => {
    const newOdometerKm = Math.round(((prev.profile?.vehicleOdometerKm || 0) + ride.kmDriven) * 100) / 100;
    const prevRides = Array.isArray(prev.rides) ? prev.rides : [];

    return {
      ...prev,
      rides: [ride, ...prevRides],
      profile: prev.profile
        ? { ...prev.profile, vehicleOdometerKm: newOdometerKm }
        : prev.profile
    };
  });
};

  // Handler para adicionar expense e atualizar odômetro (se for combustível)
  const handleAddExpense = (expense: Expense) => {
    setState(prev => {
      let newProfile = prev.profile;
      const prevExpenses = Array.isArray(prev.expenses) ? prev.expenses : [];

      // Se for combustível com tripTotal, atualizar odômetro
      if (expense.type === 'combustivel' && expense.tripTotal && prev.profile) {
        const newOdometerKm = Math.round(((prev.profile.vehicleOdometerKm || 0) + expense.tripTotal) * 100) / 100;
        newProfile = { ...prev.profile, vehicleOdometerKm: newOdometerKm };

        // Recalcular em cascata após adicionar
        const allExpenses = [expense, ...prevExpenses];
        const recalculatedExpenses = recalculateFuelExpensesChain(allExpenses, newProfile);

        return {
          ...prev,
          expenses: recalculatedExpenses,
          profile: newProfile
        };
      }

      return {
        ...prev,
        expenses: [expense, ...prevExpenses]
      };
    });
  };

  // Handler para deletar expense e recalcular
  const handleDeleteExpense = (id: string) => {
setState(prev => {
      const prevExpenses = Array.isArray(prev.expenses) ? prev.expenses : [];
      const newExpenses = prevExpenses.filter(e => e.id !== id);

      if (prev.profile) {
        const recalculatedExpenses = recalculateFuelExpensesChain(newExpenses, prev.profile);
        return { ...prev, expenses: recalculatedExpenses };
      }

      return { ...prev, expenses: newExpenses };
    });
  };

  // Handler para editar expense
  const handleEditExpense = (updatedExpense: Expense) => {
    setState(prev => {
      const prevExpenses = Array.isArray(prev.expenses) ? prev.expenses : [];
      const oldExpense = prevExpenses.find(e => e.id === updatedExpense.id);
      let newProfile = prev.profile;

      if (oldExpense && prev.profile && oldExpense.type === 'combustivel' && updatedExpense.type === 'combustivel') {
        const oldTrip = oldExpense.tripTotal || 0;
        const newTrip = updatedExpense.tripTotal || 0;
        const tripDiff = newTrip - oldTrip;
        if (tripDiff !== 0) {
          newProfile = { ...prev.profile, vehicleOdometerKm: Math.round(((prev.profile.vehicleOdometerKm || 0) + tripDiff) * 100) / 100 };
        }
      }

      const newExpenses = prevExpenses.map(e =>
        e.id === updatedExpense.id ? updatedExpense : e
      );

      if (newProfile) {
        const recalculatedExpenses = recalculateFuelExpensesChain(newExpenses, newProfile);
        return { ...prev, expenses: recalculatedExpenses, profile: newProfile };
      }

      return { ...prev, expenses: newExpenses };
    });
  };

  // Calcular média de ganho por KM
  const avgPerKm = useMemo(() => {
const totalEarnings = safeState.rides.reduce((acc, r) => acc + r.totalValue, 0);
  const totalKm = safeState.rides.reduce((acc, r) => acc + r.kmDriven, 0);
  return totalKm > 0 ? totalEarnings / totalKm : 0;
  }, [safeState.rides]);

  useEffect(() => {
    const root = document.documentElement;
    if (state.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    root.setAttribute('data-theme', state.colorTheme);
  }, [state.theme, state.colorTheme]);

  useEffect(() => {
    const sidebarWidth = collapsed ? '72px' : `${width}px`;
    document.documentElement.style.setProperty('--sidebar-width', sidebarWidth);
  }, [width, collapsed]);

  // Weekly backup logic
  useEffect(() => {
    if (!state.profile) return;
    
    const lastBackup = localStorage.getItem('organizaai_last_backup');
    const now = new Date();
    
    if (!lastBackup) {
      localStorage.setItem('organizaai_last_backup', now.toISOString());
      return;
    }

    const lastDate = new Date(lastBackup);
    const diffDays = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays >= 7) {
      setShowBackupPrompt(true);
    }
  }, [state.profile]);

  const handleManualBackup = () => {
    const dataStr = JSON.stringify(state, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `organizaai_auto_backup_${new Date().toISOString().split('T')[0]}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    localStorage.setItem('organizaai_last_backup', new Date().toISOString());
    setShowBackupPrompt(false);
  };

  if (!state.profile) {
    return (
      <ErrorBoundary>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-500/10 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand-500/10 rounded-full blur-[120px] animate-pulse delay-700" />
        </div>
        <div className="relative z-10 w-full flex justify-center">
          <ProfileSetup onComplete={(profile) => setState(prev => ({ ...prev, profile }))} />
        </div>
      </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300 relative overflow-x-hidden">
      {/* Animated Background Blobs */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-brand-500/10 dark:bg-brand-500/5 rounded-full blur-[120px] animate-blob" />
        <div className="absolute top-[20%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 dark:bg-blue-500/5 rounded-full blur-[120px] animate-blob animation-delay-2000" />
        <div className="absolute bottom-[-10%] left-[20%] w-[45%] h-[45%] bg-purple-500/10 dark:bg-purple-500/5 rounded-full blur-[120px] animate-blob animation-delay-4000" />
      </div>

      <div className="flex flex-col md:flex-row relative z-10">
        {/* Mobile Header */}
        <header className="md:hidden glass border-b border-slate-200/50 dark:border-slate-800/50 sticky top-0 z-30 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white">
                {state.profile.vehicleType === 'moto' ? <Bike size={18} /> : <Car size={18} />}
              </div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-white">OrganizaAi</h1>
            </div>
          </div>
          <nav className="flex items-center gap-1 mt-3 overflow-x-auto pb-1 -mx-1 px-1">
            {mobileNavItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all",
                  activeTab === item.id
                    ? "bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                )}
              >
                <item.icon size={16} />
                {item.label}
              </button>
            ))}
          </nav>
        </header>

        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          profile={state.profile}
          theme={state.theme}
          colorTheme={state.colorTheme}
          setColorTheme={setColorTheme}
          width={width}
          collapsed={collapsed}
          isResizing={isResizing}
          onToggle={toggle}
          onStartResize={startResizing}
          onStopResize={stopResizing}
          onResize={handleResize}
        />

        <main className="flex-1 overflow-y-auto p-4 md:py-6 md:pl-6 md:pr-4 z-10 transition-all duration-300 md:ml-[var(--sidebar-width)]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="w-full"
            >
{activeTab === 'dashboard' && (
        <Dashboard
          rides={safeState.rides}
          expenses={safeState.expenses}
          goals={safeState.goals}
          profile={safeState.profile}
        />
      )}
      {activeTab === 'rides' && (
        <EntryForm
          onAdd={handleAddRide}
          onDelete={(id) => setState(prev => ({ ...prev, rides: Array.isArray(prev.rides) ? prev.rides.filter(r => r.id !== id) : [] }))}
          onEdit={(ride) => setState(prev => ({ ...prev, rides: Array.isArray(prev.rides) ? prev.rides.map(r => r.id === ride.id ? ride : r) : [ride] }))}
          rides={safeState.rides}
          profile={safeState.profile}
          expenses={safeState.expenses}
          customApps={safeState.customApps}
          onAddCustomApp={(name) => setState(prev => ({ ...prev, customApps: Array.isArray(prev.customApps) ? (prev.customApps.includes(name) ? prev.customApps : [...prev.customApps, name]) : [name] }))}
        />
      )}
      {activeTab === 'expenses' && (
        <ExpensesForm
          onAdd={handleAddExpense}
          onDelete={handleDeleteExpense}
          onEdit={handleEditExpense}
          expenses={safeState.expenses}
          profile={safeState.profile}
          avgPerKm={avgPerKm}
        />
      )}
      {activeTab === 'goals' && (
        <Goals
          goals={safeState.goals}
          rides={safeState.rides}
          expenses={safeState.expenses}
          profile={safeState.profile}
          onAddGoal={(goal) => setState(prev => ({ ...prev, goals: Array.isArray(prev.goals) ? [goal, ...prev.goals] : [goal] }))}
          onDeleteGoal={(id) => setState(prev => ({ ...prev, goals: Array.isArray(prev.goals) ? prev.goals.filter(g => g.id !== id) : [] }))}
          onUpdateGoal={(goal) => setState(prev => ({ ...prev, goals: Array.isArray(prev.goals) ? prev.goals.map(g => g.id === goal.id ? goal : g) : [goal] }))}
          manualCompensations={safeState.manualCompensations}
          onAddManualCompensation={(comp) => setState(prev => ({ ...prev, manualCompensations: Array.isArray(prev.manualCompensations) ? [comp, ...prev.manualCompensations] : [comp] }))}
          onRemoveManualCompensation={(id) => setState(prev => ({ ...prev, manualCompensations: Array.isArray(prev.manualCompensations) ? prev.manualCompensations.filter(c => c.id !== id) : [] }))}
        />
      )}
      {activeTab === 'motorcycle' && (
        <MotorcycleTab
          rides={safeState.rides}
          expenses={safeState.expenses}
          maintenance={safeState.maintenance}
          profile={safeState.profile}
          onUpdateMaintenance={(m) => setState(prev => ({ ...prev, maintenance: m }))}
          sidebarCollapsed={collapsed}
          showToast={showToast}
        />
      )}
      {activeTab === 'agenda' && (
        <Agenda
          rides={safeState.rides}
          expenses={safeState.expenses}
          profile={safeState.profile}
          onUpdateProfile={(profile) => setState(prev => ({ ...prev, profile }))}
          sidebarCollapsed={collapsed}
          plans={safeState.plans}
          onAddPlan={(plan) => setState(prev => ({ ...prev, plans: Array.isArray(prev.plans) ? [...prev.plans, plan] : [plan] }))}
          onUpdatePlan={(plan) => setState(prev => ({ ...prev, plans: Array.isArray(prev.plans) ? prev.plans.map(p => p.id === plan.id ? plan : p) : [plan] }))}
          onDeletePlan={(id) => setState(prev => ({ ...prev, plans: Array.isArray(prev.plans) ? prev.plans.filter(p => p.id !== id) : [] }))}
        />
      )}
      {activeTab === 'reports' && (
        <ReportsTab
          rides={safeState.rides}
          expenses={safeState.expenses}
          profile={safeState.profile}
        />
      )}
      {activeTab === 'profile' && (
        <ProfileTab
          profile={safeState.profile}
          onUpdate={(profile) => setState(prev => ({ ...prev, profile }))}
          fullState={state}
                  onImportState={(newState) => setState(newState)}
                />
              )}
            </motion.div>
    </AnimatePresence>

    <Footer />
    </main>
    </div>

    <ToastContainer toasts={toasts} onRemove={removeToast} />

    {/* Backup Notification */}
      <AnimatePresence>
        {showBackupPrompt && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-6 right-6 z-50 max-w-md w-full glass p-6 rounded-3xl shadow-2xl border-brand-200 dark:border-brand-900/30"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-brand-100 dark:bg-brand-950/30 text-brand-600 rounded-2xl">
                <AlertCircle size={24} />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-slate-900 dark:text-white">Lembrete de Backup</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Já faz uma semana desde o seu último backup. É importante salvar seus dados para evitar perdas.
                </p>
                <div className="mt-4 flex items-center gap-3">
                  <button
                    onClick={handleManualBackup}
                    className="flex-1 bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    <Download size={18} /> Fazer Backup Agora
                  </button>
                  <button
                    onClick={() => { localStorage.setItem('organizaai_last_backup', new Date().toISOString()); setShowBackupPrompt(false); }}
                    className="p-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-all"
                  >
                    <CloseIcon size={20} />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </ErrorBoundary>
  );
}
