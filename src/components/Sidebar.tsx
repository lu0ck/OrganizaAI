import React, { useState } from 'react';
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
  User,
  Car,
  Palette,
  FileText,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile, ColorTheme } from '../types';
import { cn } from '../lib/utils';
import SidebarResizeHandle from './SidebarResizeHandle';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  profile: UserProfile;
  onToggleTheme: () => void;
  theme: 'light' | 'dark';
  colorTheme: ColorTheme;
  setColorTheme: (color: ColorTheme) => void;
  width: number;
  collapsed: boolean;
  isResizing: boolean;
  onToggle: () => void;
  onStartResize: () => void;
  onStopResize: () => void;
  onResize: (deltaX: number) => void;
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

const themes: { id: ColorTheme; color: string }[] = [
  { id: 'red', color: 'bg-red-500' },
  { id: 'yellow', color: 'bg-yellow-500' },
  { id: 'orange', color: 'bg-orange-500' },
  { id: 'green', color: 'bg-green-500' },
  { id: 'blue', color: 'bg-blue-500' },
  { id: 'purple', color: 'bg-purple-500' },
  { id: 'black', color: 'bg-slate-900' },
];

export default function Sidebar({
  activeTab,
  setActiveTab,
  profile,
  onToggleTheme,
  theme,
  colorTheme,
  setColorTheme,
  width,
  collapsed,
  isResizing,
  onToggle,
  onStartResize,
  onStopResize,
  onResize,
}: SidebarProps) {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const isCompact = collapsed || width < 180;

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col glass border-r border-slate-200/50 dark:border-slate-800/50 z-20 fixed top-0 left-0 h-screen transition-all duration-300",
        isResizing && "select-none"
      )}
      style={{ width: `${width}px` }}
    >
      {/* Header */}
      <div className={cn(
        "p-4 flex items-center gap-3 border-b border-slate-200/50 dark:border-slate-800/50",
        isCompact ? "justify-center" : ""
      )}>
        <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-brand-200 dark:shadow-none shrink-0">
          {profile.vehicleType === 'moto' ? <Bike size={24} /> : <Car size={24} />}
        </div>
        <AnimatePresence>
          {!isCompact && (
            <motion.h1
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              className="text-xl font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap overflow-hidden"
            >
              OrganizaAi
            </motion.h1>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto overflow-x-hidden">
        {navItems.map((item) => (
          <div key={item.id} className="relative">
            <button
              onClick={() => setActiveTab(item.id)}
              onMouseEnter={() => setHoveredItem(item.id)}
              onMouseLeave={() => setHoveredItem(null)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all border-2",
                activeTab === item.id
                  ? "bg-brand-50 dark:bg-brand-950/30 text-brand-600 dark:text-brand-400 border-brand-100 dark:border-brand-900/30"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 border-transparent",
                isCompact ? "justify-center" : ""
              )}
            >
              <item.icon size={20} className="shrink-0" />
              <AnimatePresence>
                {!isCompact && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    className="whitespace-nowrap overflow-hidden"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
            
            {/* Tooltip when collapsed */}
            <AnimatePresence>
              {isCompact && hoveredItem === item.id && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-slate-900 dark:bg-slate-700 text-white text-sm font-medium rounded-lg whitespace-nowrap z-50 shadow-lg"
                >
                  {item.label}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-2 border-t border-slate-200 dark:border-slate-800 space-y-1">
        {/* Color Theme */}
        <div className="relative">
          <button
            onClick={() => setShowColorPicker(!showColorPicker)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800",
              isCompact ? "justify-center" : ""
            )}
          >
            <Palette size={20} className="shrink-0" />
            <AnimatePresence>
              {!isCompact && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  className="whitespace-nowrap overflow-hidden"
                >
                  Tema
                </motion.span>
              )}
            </AnimatePresence>
          </button>
          <AnimatePresence>
            {showColorPicker && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className={cn(
                  "absolute p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 grid grid-cols-4 gap-2 z-50",
                  isCompact ? "bottom-full left-full ml-2 mb-2" : "bottom-full left-4 mb-2"
                )}
              >
                {themes.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setColorTheme(t.id);
                      setShowColorPicker(false);
                    }}
                    className={cn(
                      "w-8 h-8 rounded-full border-2 transition-all",
                      t.color,
                      colorTheme === t.id
                        ? "border-slate-900 dark:border-white scale-110"
                        : "border-transparent hover:scale-105"
                    )}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Theme Toggle */}
        <button
          onClick={onToggleTheme}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800",
            isCompact ? "justify-center" : ""
          )}
        >
          {theme === 'light' ? <Moon size={20} className="shrink-0" /> : <Sun size={20} className="shrink-0" />}
          <AnimatePresence>
            {!isCompact && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="whitespace-nowrap overflow-hidden"
              >
                {theme === 'light' ? 'Escuro' : 'Claro'}
              </motion.span>
            )}
          </AnimatePresence>
        </button>

        {/* User Profile */}
        <div
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800",
            isCompact ? "justify-center" : ""
          )}
        >
          <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center shrink-0">
            <User size={16} className="text-brand-600" />
          </div>
          <AnimatePresence>
            {!isCompact && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="flex-1 min-w-0 overflow-hidden"
              >
                <p className="text-sm font-semibold truncate dark:text-white">{profile.name}</p>
                <p className="text-xs text-slate-500 truncate">{profile.vehicleModel}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Toggle Button */}
        <button
          onClick={onToggle}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800",
            isCompact ? "justify-center" : ""
          )}
        >
          {collapsed ? (
            <ChevronRight size={20} className="shrink-0" />
          ) : (
            <ChevronLeft size={20} className="shrink-0" />
          )}
          <AnimatePresence>
            {!isCompact && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="whitespace-nowrap overflow-hidden"
              >
                {collapsed ? 'Expandir' : 'Colapsar'}
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>

      {/* Resize Handle */}
      <SidebarResizeHandle
        onResize={onResize}
        onStart={onStartResize}
        onStop={onStopResize}
        isResizing={isResizing}
      />
    </aside>
  );
}
