import React, { useState } from 'react';
import { User, Car, Bike, ArrowRight } from 'lucide-react';
import { UserProfile } from '../types';

import { motion, AnimatePresence } from 'motion/react';

interface ProfileSetupProps {
  onComplete: (profile: UserProfile) => void;
}

export default function ProfileSetup({ onComplete }: ProfileSetupProps) {
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
          { day: 'Seg', active: true, periods: [{ start: '00:00', end: '00:00' }] },
          { day: 'Ter', active: true, periods: [{ start: '00:00', end: '00:00' }] },
          { day: 'Qua', active: true, periods: [{ start: '00:00', end: '00:00' }] },
          { day: 'Qui', active: true, periods: [{ start: '00:00', end: '00:00' }] },
          { day: 'Sex', active: true, periods: [{ start: '00:00', end: '00:00' }] },
          { day: 'Sáb', active: false, periods: [{ start: '00:00', end: '00:00' }] },
        ]
      });
    }
  };

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
