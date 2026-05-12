import React, { useState, useEffect } from 'react';
import { User, Car, Bike, Save, DollarSign, Shield, FileText, CheckCircle2, Download, Upload, AlertTriangle, TrendingUp, CreditCard, Info } from 'lucide-react';
import { UserProfile, AppState } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface ProfileTabProps {
  profile: UserProfile;
  onUpdate: (profile: UserProfile) => void;
  fullState: AppState;
  onImportState: (state: AppState) => void;
}

export default function ProfileTab({ profile, onUpdate, fullState, onImportState }: ProfileTabProps) {
  const [formData, setFormData] = useState({ ...profile });
  const [isSaved, setIsSaved] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  // Sync formData when profile prop changes
  useEffect(() => {
    setFormData({ ...profile });
  }, [profile]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(formData);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(fullState, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `organizaai_backup_${new Date().toISOString().split('T')[0]}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        // Basic validation
        if (!json.profile || !json.rides || !json.expenses) {
          throw new Error('Formato de backup inválido.');
        }
        onImportState(json);
        setImportError(null);
        alert('Backup importado com sucesso!');
      } catch (err) {
        setImportError('Erro ao importar backup. Verifique o arquivo.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-brand-600 flex items-center justify-center text-white shadow-lg shadow-brand-200 dark:shadow-none">
            <User size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Seu Perfil</h2>
            <p className="text-slate-500 dark:text-slate-400">Gerencie suas informações e custos fixos.</p>
          </div>
        </div>

        <AnimatePresence>
          {isSaved && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 rounded-xl border border-emerald-100 dark:border-emerald-900/30"
            >
              <CheckCircle2 size={18} />
              <span className="text-sm font-bold">Alterações salvas!</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-8">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
            <h3 className="text-lg font-bold mb-6 dark:text-white flex items-center gap-2">
              <Car size={20} className="text-brand-600" /> Informações do Veículo
            </h3>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Seu Nome</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 dark:text-white"
                />
              </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Modelo do Veículo</label>
              <input
                type="text"
                value={formData.vehicleModel}
                onChange={(e) => setFormData({ ...formData, vehicleModel: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                KM Atual do Odômetro
                <span className="block text-[10px] text-slate-400 font-normal">Quilometragem total do veículo (usado para controle de manutenção)</span>
              </label>
          <input
              type="number"
              step="0.01"
              value={formData.vehicleOdometerKm !== undefined ? Number(formData.vehicleOdometerKm).toFixed(2) : ''}
                onChange={(e) => {
                  const value = Number(e.target.value);
                  setFormData({ ...formData, vehicleOdometerKm: value > 0 ? value : undefined });
                }}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 dark:text-white"
                placeholder="Ex: 65000"
              />
              <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-1">
                <Info size={12} className="shrink-0" />
                Atualizado automaticamente ao registrar um abastecimento
              </p>
            </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      KM por Litro
                      <span className="block text-[10px] text-slate-400 font-normal">Estimativa inicial (editável)</span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.kmPerLiter || ''}
                      onChange={(e) => setFormData({ ...formData, kmPerLiter: Number(e.target.value) })}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 dark:text-white"
                    />
{profile.currentKmPerLiter && profile.currentKmPerLiter > 0 ? (
          <p className="mt-2 text-xs text-emerald-600 flex items-center gap-1">
            <TrendingUp size={12} />
            Consumo real: <strong>{profile.currentKmPerLiter.toFixed(1)} km/l</strong>
          </p>
        ) : (
          <p className="mt-2 text-xs text-slate-400 flex items-center gap-1">
            <TrendingUp size={12} />
            Consumo real: dados insuficientes
          </p>
        )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Tanque Total (L)
                      <span className="block text-[10px] text-slate-400 font-normal">Capacidade total incluindo reserva</span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.totalTankSize || ''}
                      onChange={(e) => setFormData({ ...formData, totalTankSize: Number(e.target.value) })}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 dark:text-white"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Reserva (L)
                      <span className="block text-[10px] text-slate-400 font-normal">Litros quando a luz acende</span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.reserveSize || ''}
                      onChange={(e) => setFormData({ ...formData, reserveSize: Number(e.target.value) })}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 dark:text-white"
                      placeholder="Ex: 5"
                    />
                  </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
            <h3 className="text-lg font-bold mb-6 dark:text-white flex items-center gap-2">
              <DollarSign size={20} className="text-emerald-600" /> Custos Fixos e Impostos
            </h3>
            
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                    <FileText size={16} className="text-slate-400" /> IPVA Anual
                  </label>
                  <input
                    type="number"
                    value={formData.ipvaValue || ''}
                    onChange={(e) => setFormData({ ...formData, ipvaValue: Number(e.target.value) })}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 dark:text-white"
                    placeholder="R$ 0,00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                    <FileText size={16} className="text-slate-400" /> Licenciamento
                  </label>
                  <input
                    type="number"
                    value={formData.licensingValue || ''}
                    onChange={(e) => setFormData({ ...formData, licensingValue: Number(e.target.value) })}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 dark:text-white"
                    placeholder="R$ 0,00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                  <Shield size={16} className="text-slate-400" /> Seguro Mensal
                </label>
                <input
                  type="number"
                  value={formData.insuranceValue || ''}
                  onChange={(e) => setFormData({ ...formData, insuranceValue: Number(e.target.value) })}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 dark:text-white"
                  placeholder="R$ 0,00"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                    <CreditCard size={16} className="text-slate-400" /> Parcela do Veículo (mensal)
                  </label>
                  <input
                    type="number"
                    value={formData.vehicleInstallmentValue || ''}
                    onChange={(e) => setFormData({ ...formData, vehicleInstallmentValue: Number(e.target.value) })}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 dark:text-white"
                    placeholder="R$ 0,00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Parcelas Restantes
                  </label>
                  <input
                    type="number"
                    value={formData.vehicleInstallmentsRemaining || ''}
                    onChange={(e) => setFormData({ ...formData, vehicleInstallmentsRemaining: Number(e.target.value) })}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 dark:text-white"
                    placeholder="Ex: 24"
                  />
                </div>
              </div>

              <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-2xl border border-blue-100 dark:border-blue-900/30">
                <p className="text-xs text-blue-600 dark:text-blue-400 font-bold uppercase mb-2">Por que preencher?</p>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Esses valores são usados para calcular seu custo diário real e sua margem de lucro líquida no dashboard.
                </p>
              </div>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            className={cn(
              "w-full font-bold py-4 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2",
              isSaved 
                ? "bg-emerald-600 text-white shadow-emerald-200" 
                : "bg-brand-600 hover:bg-brand-700 text-white shadow-brand-200 dark:shadow-none"
            )}
          >
            {isSaved ? (
              <>
                <CheckCircle2 size={20} /> Alterações Salvas!
              </>
            ) : (
              <>
                <Save size={20} /> Salvar Alterações
              </>
            )}
          </motion.button>
        </div>
      </form>

      <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
        <h3 className="text-lg font-bold dark:text-white flex items-center gap-2">
          <Save size={20} className="text-brand-600" /> Backup e Dados
        </h3>
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          Exporte seus dados para segurança ou importe um backup anterior. Seus dados são armazenados localmente no seu navegador.
        </p>

        <div className="flex flex-wrap gap-4">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-6 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-semibold transition-all"
          >
            <Download size={20} />
            Exportar Backup (JSON)
          </button>

          <label className="flex items-center gap-2 px-6 py-3 bg-brand-50 dark:bg-brand-950/30 hover:bg-brand-100 dark:hover:bg-brand-900/40 text-brand-600 dark:text-brand-400 rounded-xl font-semibold transition-all cursor-pointer">
            <Upload size={20} />
            Importar Backup
            <input type="file" accept=".json" onChange={handleImport} className="hidden" />
          </label>
        </div>

        {importError && (
          <div className="flex items-center gap-2 p-4 bg-rose-50 dark:bg-rose-950/30 text-rose-600 rounded-xl border border-rose-100 dark:border-rose-900/30">
            <AlertTriangle size={18} />
            <span className="text-sm font-medium">{importError}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
