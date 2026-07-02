import React, { useState } from 'react';
import { User, Car, Bike, ArrowRight, Sun, Moon, Palette } from 'lucide-react';
import { UserProfile, ColorTheme } from '../types';
import { cn } from '../lib/utils';

import { motion, AnimatePresence } from 'motion/react';

interface ProfileSetupProps {
  onComplete: (profile: UserProfile) => void;
  theme: 'light' | 'dark';
  colorTheme: ColorTheme;
  setColorTheme: (color: ColorTheme) => void;
  onToggleTheme: () => void;
}

export default function ProfileSetup({ onComplete, theme, colorTheme, setColorTheme, onToggleTheme }: ProfileSetupProps) {
  const [name, setName] = useState('');
  const [vehicleType, setVehicleType] = useState<'carro' | 'moto'>('carro');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleOdometerKm, setVehicleOdometerKm] = useState('');
  const [kmPerLiter, setKmPerLiter] = useState('');
  const [totalTankSize, setTotalTankSize] = useState('');
  const [reserveSize, setReserveSize] = useState('');
  const [ipvaValue, setIpvaValue] = useState('');
  const [licensingValue, setLicensingValue] = useState('');
  const [insuranceValue, setInsuranceValue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && vehicleModel) {
      onComplete({
        name,
        vehicleType,
        vehicleModel,
        vehicleOdometerKm: Number(vehicleOdometerKm) || undefined,
        kmPerLiter: Number(kmPerLiter) || undefined,
        totalTankSize: Number(totalTankSize) || undefined,
        reserveSize: Number(reserveSize) || undefined,
        ipvaValue: Number(ipvaValue) || undefined,
        licensingValue: Number(licensingValue) || undefined,
        insuranceValue: Number(insuranceValue) || undefined,
    workSchedule: [
      { day: 'Dom', active: false, periods: [{ start: '00:00', end: '00:00' }] },
      { day: 'Seg', active: true, periods: [{ start: '08:00', end: '18:00' }] },
      { day: 'Ter', active: true, periods: [{ start: '08:00', end: '18:00' }] },
      { day: 'Qua', active: true, periods: [{ start: '08:00', end: '18:00' }] },
      { day: 'Qui', active: true, periods: [{ start: '08:00', end: '18:00' }] },
      { day: 'Sex', active: true, periods: [{ start: '08:00', end: '18:00' }] },
      { day: 'Sáb', active: false, periods: [{ start: '00:00', end: '00:00' }] },
    ]
      });
    }
  };

  const themes: { id: ColorTheme; color: string }[] = [
    { id: 'red', color: 'bg-red-500' },
    { id: 'yellow', color: 'bg-yellow-500' },
    { id: 'orange', color: 'bg-orange-500' },
    { id: 'green', color: 'bg-green-500' },
    { id: 'blue', color: 'bg-blue-500' },
    { id: 'purple', color: 'bg-purple-500' },
    { id: 'black', color: 'bg-slate-900' },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl shadow-slate-200 dark:shadow-none p-8 border border-slate-100 dark:border-slate-800"
    >
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Bem-vindo ao OrganizaAi</h2>
        <p className="text-slate-500 dark:text-slate-400">Vamos configurar seu perfil de motorista</p>
      </div>

      {/* Aparencia - mobile only */}
      <div className="md:hidden mb-6 p-5 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 space-y-4">
        <h3 className="text-sm font-bold dark:text-white flex items-center gap-2">
          <Palette size={16} className="text-brand-600" /> Aparência
        </h3>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Tema</p>
            <p className="text-xs text-slate-400">Claro / Escuro</p>
          </div>
          <button
            onClick={onToggleTheme}
            className="relative w-14 h-7 rounded-full bg-slate-200 dark:bg-slate-700 transition-colors"
          >
            <motion.div
              layout
              className={cn(
                "absolute top-0.5 w-6 h-6 rounded-full flex items-center justify-center transition-colors",
                theme === 'dark' ? "bg-brand-600 right-0.5" : "bg-amber-500 left-0.5"
              )}
            >
              {theme === 'dark' ? <Moon size={12} className="text-white" /> : <Sun size={12} className="text-white" />}
            </motion.div>
          </button>
        </div>

        <div>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Cor do tema</p>
          <div className="flex flex-wrap gap-3">
            {themes.map((t) => (
              <button
                key={t.id}
                onClick={() => setColorTheme(t.id)}
                className={cn(
                  "w-9 h-9 rounded-full border-2 transition-all",
                  t.color,
                  colorTheme === t.id
                    ? "border-slate-900 dark:border-white scale-110 ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 ring-slate-900/20 dark:ring-white/20"
                    : "border-transparent hover:scale-105"
                )}
              />
            ))}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Seu Nome</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all dark:text-white"
              placeholder="Ex: João Silva"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Tipo de Veículo</label>
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setVehicleType('carro')}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                vehicleType === 'carro'
                  ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/30 text-brand-600'
                  : 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-500'
              }`}
            >
              <Car size={24} />
              <span className="font-semibold">Carro</span>
            </button>
            <button
              type="button"
              onClick={() => setVehicleType('moto')}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                vehicleType === 'moto'
                  ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/30 text-brand-600'
                  : 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-500'
              }`}
            >
              <Bike size={24} />
              <span className="font-semibold">Moto</span>
            </button>
          </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Modelo do Veículo</label>
          <input
            type="text"
            required
            value={vehicleModel}
            onChange={(e) => setVehicleModel(e.target.value)}
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all dark:text-white"
            placeholder="Ex: Honda Civic 2020"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            KM Atual do Odômetro
            <span className="block text-[10px] text-slate-400 font-normal">Quilometragem total do veículo (opcional, mas recomendado)</span>
          </label>
          <input
            type="number"
            value={vehicleOdometerKm}
            onChange={(e) => setVehicleOdometerKm(e.target.value)}
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all dark:text-white"
            placeholder="Ex: 65000"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">KM por Litro</label>
              <input
                type="number"
                step="0.1"
                value={kmPerLiter}
                onChange={(e) => setKmPerLiter(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all dark:text-white"
                placeholder="Ex: 15.5"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Tanque Total (L)
                <span className="block text-[10px] text-slate-400 font-normal">Incluindo a reserva</span>
              </label>
              <input
                type="number"
                step="0.1"
                value={totalTankSize}
                onChange={(e) => setTotalTankSize(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all dark:text-white"
                placeholder="Ex: 50"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Reserva (L)</label>
            <input
              type="number"
              step="0.1"
              value={reserveSize}
              onChange={(e) => setReserveSize(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all dark:text-white"
              placeholder="Ex: 5"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Custos Fixos (Estimados)</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">IPVA Anual (R$)</label>
                <input
                  type="number"
                  value={ipvaValue}
                  onChange={(e) => setIpvaValue(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none dark:text-white"
                  placeholder="Ex: 1200"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Licenciamento (R$)</label>
                <input
                  type="number"
                  value={licensingValue}
                  onChange={(e) => setLicensingValue(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none dark:text-white"
                  placeholder="Ex: 150"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Seguro Mensal (R$)</label>
              <input
                type="number"
                value={insuranceValue}
                onChange={(e) => setInsuranceValue(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none dark:text-white"
                placeholder="Ex: 200"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-brand-200 dark:shadow-none transition-all flex items-center justify-center gap-2 group"
        >
          Começar Agora
          <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
        </button>
      </form>
    </motion.div>
  );
}
