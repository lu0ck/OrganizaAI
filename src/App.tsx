import React, { useState, useMemo, useEffect } from 'react';
import { 
  LayoutDashboard, 
  PlusCircle, 
  Receipt, 
  Target, 
  Bike, 
  Calendar, 
  Settings, 
  Moon, 
  Sun,
  LogOut,
  User,
  Car,
  Palette,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLocalStorage } from './hooks/useLocalStorage';
import { AppState, RideEntry, Expense, Goal, UserProfile, ColorTheme, MaintenanceItem } from './types';
import { cn } from './lib/utils';
import { format, startOfDay, endOfDay, isWithinInterval, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, addDays, setHours, setMinutes } from 'date-fns';

// Components
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
import { Download, AlertCircle, X as CloseIcon } from 'lucide-react';

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
  theme: 'light',
  colorTheme: 'red'
};

export default function App() {
  const [state, setState] = useLocalStorage<AppState>('organizaai_data_v2', initialState);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showBackupPrompt, setShowBackupPrompt] = useState(false);

  // Migration for Brake Pads
  useEffect(() => {
    const oldNames = ['Pastilha de Freio', 'Pastilhas de Freio', 'Pastilha de Freio Dianteira', 'Pastilha de Freio Traseira'];
    const newNames = ['Pastilhas de Freio dianteira', 'Pastilhas de Freio traseira'];
    
    if (!state.maintenance || state.maintenance.length === 0) return;

    const hasOldBrakePads = state.maintenance.some(m => oldNames.includes(m.name));
    
    // Check for duplicates of the new names
    const counts = state.maintenance.reduce((acc, m) => {
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
  }, [state.maintenance, setState]);

  const toggleTheme = () => {
    setState(prev => ({ ...prev, theme: prev.theme === 'light' ? 'dark' : 'light' }));
  };

  const setColorTheme = (color: ColorTheme) => {
    setState(prev => ({ ...prev, colorTheme: color }));
    setShowColorPicker(false);
  };

  useEffect(() => {
    const root = document.documentElement;
    if (state.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    root.setAttribute('data-theme', state.colorTheme);
  }, [state.theme, state.colorTheme]);

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
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-500/10 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand-500/10 rounded-full blur-[120px] animate-pulse delay-700" />
        </div>
        <div className="relative z-10 w-full flex justify-center">
          <ProfileSetup onComplete={(profile) => setState(prev => ({ ...prev, profile }))} />
        </div>
      </div>
    );
  }

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'rides', label: 'Lançamentos', icon: PlusCircle },
    { id: 'expenses', label: 'Despesas', icon: Receipt },
    { id: 'goals', label: 'Metas', icon: Target },
    { id: 'motorcycle', label: 'Manutenção', icon: Bike },
    { id: 'agenda', label: 'Agenda', icon: Calendar },
    { id: 'reports', label: 'Relatórios', icon: FileText },
    { id: 'profile', label: 'Perfil', icon: User },
  ];

  const themes: { id: ColorTheme, color: string }[] = [
    { id: 'red', color: 'bg-red-500' },
    { id: 'yellow', color: 'bg-yellow-500' },
    { id: 'orange', color: 'bg-orange-500' },
    { id: 'green', color: 'bg-green-500' },
    { id: 'blue', color: 'bg-blue-500' },
    { id: 'purple', color: 'bg-purple-500' },
    { id: 'black', color: 'bg-slate-900' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300 relative overflow-x-hidden">
      {/* Animated Background Blobs */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-brand-500/10 dark:bg-brand-500/5 rounded-full blur-[120px] animate-blob" />
        <div className="absolute top-[20%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 dark:bg-blue-500/5 rounded-full blur-[120px] animate-blob animation-delay-2000" />
        <div className="absolute bottom-[-10%] left-[20%] w-[45%] h-[45%] bg-purple-500/10 dark:bg-purple-500/5 rounded-full blur-[120px] animate-blob animation-delay-4000" />
      </div>

      <div className="flex flex-col md:flex-row relative z-10">
        {/* Sidebar */}
        <aside className="w-full md:w-64 glass border-r border-slate-200/50 dark:border-slate-800/50 flex flex-col z-20 sticky top-0 h-auto md:h-screen">
          <div className="p-6 flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-brand-200 dark:shadow-none">
              {state.profile.vehicleType === 'moto' ? <Bike size={24} /> : <Car size={24} />}
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">OrganizaAi</h1>
          </div>

          <nav className="flex-1 px-4 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all border-2",
                  activeTab === item.id
                    ? "bg-brand-50 dark:bg-brand-950/30 text-brand-600 dark:text-brand-400 border-brand-100 dark:border-brand-900/30"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 border-transparent"
                )}
              >
                <item.icon size={20} />
                {item.label}
              </button>
            ))}
          </nav>

          <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
            <div className="relative">
              <button
                onClick={() => setShowColorPicker(!showColorPicker)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <Palette size={20} />
                Tema de Cor
              </button>
              <AnimatePresence>
                {showColorPicker && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    className="absolute bottom-full left-0 mb-2 p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 grid grid-cols-4 gap-2 z-50"
                  >
                    {themes.map(t => (
                      <button
                        key={t.id}
                        onClick={() => setColorTheme(t.id)}
                        className={cn(
                          "w-8 h-8 rounded-full border-2 transition-all",
                          t.color,
                          state.colorTheme === t.id ? "border-slate-900 dark:border-white scale-110" : "border-transparent"
                        )}
                      />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <button
              onClick={toggleTheme}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              {state.theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
              {state.theme === 'light' ? 'Modo Escuro' : 'Modo Claro'}
            </button>
            <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
              <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
                <User size={16} className="text-brand-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate dark:text-white">{state.profile.name}</p>
                <p className="text-xs text-slate-500 truncate">{state.profile.vehicleModel}</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 z-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="max-w-6xl mx-auto"
            >
              {activeTab === 'dashboard' && (
                <Dashboard 
                  rides={state.rides} 
                  expenses={state.expenses} 
                  goals={state.goals} 
                  profile={state.profile}
                />
              )}
              {activeTab === 'rides' && (
                <EntryForm 
                  onAdd={(ride) => setState(prev => ({ ...prev, rides: [ride, ...prev.rides] }))} 
                  onDelete={(id) => setState(prev => ({ ...prev, rides: prev.rides.filter(r => r.id !== id) }))}
                  rides={state.rides}
                />
              )}
              {activeTab === 'expenses' && (
                <ExpensesForm 
                  onAdd={(expense) => setState(prev => ({ ...prev, expenses: [expense, ...prev.expenses] }))}
                  onDelete={(id) => setState(prev => ({ ...prev, expenses: prev.expenses.filter(e => e.id !== id) }))}
                  expenses={state.expenses}
                  profile={state.profile}
                />
              )}
              {activeTab === 'goals' && (
                <Goals 
                  goals={state.goals}
                  rides={state.rides}
                  expenses={state.expenses}
                  onAddGoal={(goal) => setState(prev => ({ ...prev, goals: [goal, ...prev.goals] }))}
                  onDeleteGoal={(id) => setState(prev => ({ ...prev, goals: prev.goals.filter(g => g.id !== id) }))}
                />
              )}
              {activeTab === 'motorcycle' && (
                <MotorcycleTab 
                  rides={state.rides}
                  expenses={state.expenses}
                  maintenance={state.maintenance}
                  profile={state.profile}
                  onUpdateMaintenance={(m) => setState(prev => ({ ...prev, maintenance: m }))}
                />
              )}
              {activeTab === 'agenda' && (
                <Agenda 
                  rides={state.rides}
                  expenses={state.expenses}
                  profile={state.profile}
                  onUpdateProfile={(profile) => setState(prev => ({ ...prev, profile }))}
                />
              )}
              {activeTab === 'reports' && (
                <ReportsTab 
                  rides={state.rides}
                  expenses={state.expenses}
                  profile={state.profile}
                />
              )}
              {activeTab === 'profile' && (
                <ProfileTab 
                  profile={state.profile}
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
                    onClick={() => setShowBackupPrompt(false)}
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
  );
}
