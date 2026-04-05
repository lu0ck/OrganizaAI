import React, { useState } from 'react';
import { Plus, Trash2, Clock, MapPin, Navigation, Package, User, Save, X, Calendar } from 'lucide-react';
import { RideEntry, AppModality } from '../types';
import { format, parseISO } from 'date-fns';
import { cn } from '../lib/utils';

import { motion, AnimatePresence } from 'motion/react';

interface EntryFormProps {
  onAdd: (ride: RideEntry) => void;
  onDelete: (id: string) => void;
  rides: RideEntry[];
}

export default function EntryForm({ onAdd, onDelete, rides }: EntryFormProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    startTime: '00:00',
    endTime: '00:00',
    kmDriven: '',
    totalValue: '',
    region: '',
    appRides: [
      { appName: 'Uber', modality: 'passageiro' as AppModality, count: 0, value: 0 },
      { appName: 'iFood', modality: 'entrega' as AppModality, count: 0, value: 0 }
    ]
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newRide: RideEntry = {
      id: crypto.randomUUID(),
      date: formData.date,
      startTime: formData.startTime,
      endTime: formData.endTime,
      kmDriven: Number(formData.kmDriven),
      numRides: formData.appRides.reduce((acc, r) => acc + Number(r.count), 0),
      totalValue: Number(formData.totalValue),
      region: formData.region,
      appRides: formData.appRides.map(r => ({ ...r, count: Number(r.count), value: Number(r.value) }))
    };
    onAdd(newRide);
    setIsAdding(false);
    // Reset form
    setFormData({
      date: format(new Date(), 'yyyy-MM-dd'),
      startTime: '00:00',
      endTime: '00:00',
      kmDriven: '',
      totalValue: '',
      region: '',
      appRides: [
        { appName: 'Uber', modality: 'passageiro', count: 0, value: 0 },
        { appName: 'iFood', modality: 'entrega', count: 0, value: 0 }
      ]
    });
  };

  const addAppRow = () => {
    setFormData(prev => ({
      ...prev,
      appRides: [...prev.appRides, { appName: '', modality: 'passageiro', count: 0, value: 0 }]
    }));
  };

  const removeAppRow = (index: number) => {
    setFormData(prev => ({
      ...prev,
      appRides: prev.appRides.filter((_, i) => i !== index)
    }));
  };

  const updateAppRow = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      appRides: prev.appRides.map((r, i) => i === index ? { ...r, [field]: value } : r)
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Lançamentos Diários</h2>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-xl font-semibold flex items-center gap-2 transition-all shadow-lg shadow-brand-200 dark:shadow-none"
        >
          {isAdding ? <X size={20} /> : <Plus size={20} />}
          {isAdding ? 'Cancelar' : 'Novo Lançamento'}
        </button>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.form 
            initial={{ opacity: 0, height: 0, y: -20 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -20 }}
            onSubmit={handleSubmit} 
            className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden"
          >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Data</label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 dark:text-white"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Início</label>
              <input
                type="time"
                required
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 dark:text-white"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Término</label>
              <input
                type="time"
                required
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 dark:text-white"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">KM Rodados</label>
              <input
                type="number"
                required
                value={formData.kmDriven}
                onChange={(e) => setFormData({ ...formData, kmDriven: e.target.value })}
                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 dark:text-white"
                placeholder="Ex: 150"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Valor Total (R$)</label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.totalValue}
                onChange={(e) => setFormData({ ...formData, totalValue: e.target.value })}
                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 dark:text-white"
                placeholder="0,00"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Região Rodada</label>
              <input
                type="text"
                required
                value={formData.region}
                onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 dark:text-white"
                placeholder="Ex: Centro, Zona Sul"
              />
            </div>
          </div>

          <div className="space-y-4 mb-8">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-900 dark:text-white">Detalhes por App</h4>
              <button
                type="button"
                onClick={addAppRow}
                className="text-brand-600 hover:text-brand-700 text-sm font-bold flex items-center gap-1"
              >
                <Plus size={16} /> Adicionar App
              </button>
            </div>
            
            {formData.appRides.map((row, index) => (
              <div key={index} className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 relative group">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Nome do App</label>
                  <input
                    type="text"
                    placeholder="Ex: Uber"
                    value={row.appName}
                    onChange={(e) => updateAppRow(index, 'appName', e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none dark:text-white text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Modalidade</label>
                  <select
                    value={row.modality}
                    onChange={(e) => updateAppRow(index, 'modality', e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none dark:text-white text-sm"
                  >
                    <option value="passageiro">Passageiro</option>
                    <option value="entrega">Entrega</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Qtd Corridas</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={row.count}
                    onChange={(e) => updateAppRow(index, 'count', e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none dark:text-white text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Valor Recebido (R$)</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0,00"
                      value={row.value}
                      onChange={(e) => updateAppRow(index, 'value', e.target.value)}
                      className="flex-1 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none dark:text-white text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => removeAppRow(index)}
                      className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 p-2 rounded-lg transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            type="submit"
            className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-brand-200 dark:shadow-none transition-all flex items-center justify-center gap-2"
          >
            <Save size={20} /> Salvar Lançamento
          </button>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Histórico Recente</h3>
        {rides.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 p-12 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 text-center">
            <Navigation className="mx-auto text-slate-300 mb-4" size={48} />
            <p className="text-slate-500">Nenhum lançamento encontrado. Comece agora!</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {rides.map((ride) => (
              <div key={ride.id} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-brand-50 dark:bg-brand-950/30 flex items-center justify-center text-brand-600">
                      <Calendar size={24} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">{format(parseISO(ride.date), 'dd/MM/yyyy')}</p>
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1"><Clock size={12} /> {ride.startTime} - {ride.endTime}</span>
                        <span className="flex items-center gap-1"><MapPin size={12} /> {ride.region}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-4 items-center">
                    <div className="text-right">
                      <p className="text-xs text-slate-500">Ganhos</p>
                      <p className="font-bold text-emerald-600">R$ {ride.totalValue.toFixed(2)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500">Distância</p>
                      <p className="font-bold text-slate-900 dark:text-white">{ride.kmDriven} KM</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500">Corridas</p>
                      <p className="font-bold text-slate-900 dark:text-white">{ride.numRides}</p>
                    </div>
                    <button
                      onClick={() => onDelete(ride.id)}
                      className="opacity-0 group-hover:opacity-100 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 p-2 rounded-lg transition-all"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-slate-50 dark:border-slate-800 flex flex-wrap gap-2">
                  {ride.appRides.map((app, i) => (
                    <span key={i} className="px-3 py-1 bg-slate-50 dark:bg-slate-800 rounded-full text-xs font-medium text-slate-600 dark:text-slate-400 flex items-center gap-1">
                      {app.modality === 'passageiro' ? <User size={12} /> : <Package size={12} />}
                      {app.appName}: {app.count} ({app.modality})
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
