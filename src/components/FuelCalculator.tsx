import React, { useState, useMemo } from 'react';
import { Droplets, TrendingUp, AlertCircle, Info, Gauge } from 'lucide-react';
import { UserProfile, Expense } from '../types';
import { motion } from 'motion/react';
import { calculateFuelConsumption } from '../lib/fuelCalculation';

interface FuelCalculatorProps {
  profile: UserProfile;
  expenses?: Expense[];
}

export default function FuelCalculator({ profile, expenses = [] }: FuelCalculatorProps) {
  const consumptionResult = useMemo(() => {
    return calculateFuelConsumption(expenses, profile.kmPerLiter || 10);
  }, [expenses, profile.kmPerLiter]);

  const defaultConsumption = consumptionResult.hasEnoughData 
    ? consumptionResult.averageKmPerLiter.toFixed(1) 
    : (profile.kmPerLiter?.toString() || '10');

  const [gasPrice, setGasPrice] = useState<string>('');
  const [alcoholPrice, setAlcoholPrice] = useState<string>('');
  const [gasConsumption, setGasConsumption] = useState<string>(defaultConsumption);
  const [alcoholConsumption, setAlcoholConsumption] = useState<string>('');

  const result = useMemo(() => {
    const pg = Number(gasPrice);
    const pa = Number(alcoholPrice);
    const cg = Number(gasConsumption);
    const ca = Number(alcoholConsumption) || cg * 0.7; // Default 70% if not provided

    if (!pg || !pa || !cg || !ca) return null;

    const costPerKmGas = pg / cg;
    const costPerKmAlcohol = pa / ca;
    const ratio = (pa / pg) * 100;
    const efficiencyRatio = (ca / cg) * 100;

    const isAlcoholBetter = costPerKmAlcohol < costPerKmGas;
    const savingsPerKm = Math.abs(costPerKmGas - costPerKmAlcohol);
    const savingsPerTank = savingsPerKm * (profile.totalTankSize || 50);

    return {
      isAlcoholBetter,
      ratio,
      efficiencyRatio,
      costPerKmGas,
      costPerKmAlcohol,
      savingsPerKm,
      savingsPerTank
    };
  }, [gasPrice, alcoholPrice, gasConsumption, alcoholConsumption, profile]);

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-orange-100 dark:bg-orange-950/30 text-orange-600 rounded-xl">
          <Droplets size={20} />
        </div>
        <div>
          <h3 className="text-lg font-bold dark:text-white">Calculadora Gasolina vs. Álcool</h3>
          {consumptionResult.hasEnoughData ? (
            <p className="text-xs text-emerald-600 font-medium flex items-center gap-1">
              <Gauge size={12} /> Consumo real: {consumptionResult.averageKmPerLiter.toFixed(1)} km/L ({consumptionResult.totalRecords} registros)
            </p>
          ) : (
            <p className="text-xs text-slate-500">Usando estimativa do perfil</p>
          )}
        </div>
      </div>

      <p className="text-sm text-slate-500 dark:text-slate-400">
        Descubra qual combustível compensa mais com base no consumo do seu veículo.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Preço Gasolina (R$)</label>
            <input
              type="number"
              step="0.01"
              value={gasPrice}
              onChange={(e) => setGasPrice(e.target.value)}
              className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 dark:text-white"
              placeholder="Ex: 5.89"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Preço Álcool (R$)</label>
            <input
              type="number"
              step="0.01"
              value={alcoholPrice}
              onChange={(e) => setAlcoholPrice(e.target.value)}
              className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 dark:text-white"
              placeholder="Ex: 3.99"
            />
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Consumo Gasolina (km/L)</label>
            <input
              type="number"
              step="0.1"
              value={gasConsumption}
              onChange={(e) => setGasConsumption(e.target.value)}
              className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Consumo Álcool (km/L)</label>
            <input
              type="number"
              step="0.1"
              value={alcoholConsumption}
              onChange={(e) => setAlcoholConsumption(e.target.value)}
              className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 dark:text-white"
              placeholder={`Padrão: ${(Number(gasConsumption) * 0.7).toFixed(1)}`}
            />
          </div>
        </div>
      </div>

      {result && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-2xl border ${
            result.isAlcoholBetter 
              ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-400'
              : 'bg-brand-50 dark:bg-brand-950/20 border-brand-100 dark:border-brand-900/30 text-brand-700 dark:text-brand-400'
          }`}
        >
          <div className="flex items-start gap-3">
            <div className="mt-1">
              {result.isAlcoholBetter ? <TrendingUp size={20} /> : <Droplets size={20} />}
            </div>
            <div>
              <p className="font-bold text-lg">
                Abasteça com {result.isAlcoholBetter ? 'Álcool' : 'Gasolina'}!
              </p>
              <p className="text-sm opacity-90">
                O álcool está custando {result.ratio.toFixed(1)}% da gasolina, enquanto a eficiência do seu veículo com álcool é de {result.efficiencyRatio.toFixed(1)}%.
              </p>
              <div className="mt-3 grid grid-cols-2 gap-4 pt-3 border-t border-current border-opacity-10">
                <div>
                  <p className="text-xs uppercase opacity-70">Custo por KM</p>
                  <p className="font-bold">R$ {result.isAlcoholBetter ? result.costPerKmAlcohol.toFixed(3) : result.costPerKmGas.toFixed(3)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase opacity-70">Economia p/ Tanque</p>
                  <p className="font-bold">R$ {result.savingsPerTank.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {!result && (gasPrice || alcoholPrice) && (
        <div className="flex items-center gap-2 text-slate-400 text-sm italic">
          <Info size={16} />
          Preencha todos os campos para ver o resultado.
        </div>
      )}
    </div>
  );
}
