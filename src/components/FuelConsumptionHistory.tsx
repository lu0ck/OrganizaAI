import React from 'react';
import { Gauge, BarChart3, ArrowUp, ArrowDown } from 'lucide-react';
import { Expense } from '../types';
import { cn } from '../lib/utils';
import { format, parseISO } from 'date-fns';
import { calculateFuelConsumption } from '../lib/fuelCalculation';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

interface FuelConsumptionHistoryProps {
  expenses: Expense[];
  profileKmPerLiter: number;
}

export default function FuelConsumptionHistory({ expenses, profileKmPerLiter }: FuelConsumptionHistoryProps) {
  const consumptionResult = calculateFuelConsumption(expenses, profileKmPerLiter);

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/30 flex items-center justify-center text-emerald-600 shrink-0">
            <BarChart3 size={20} />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold dark:text-white">Histórico de Consumo</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {consumptionResult.hasEnoughData
                ? `${consumptionResult.totalRecords} medições`
                : 'Registre abastecimentos tanque-cheio'}
            </p>
          </div>
        </div>
        {consumptionResult.hasEnoughData && (
          <div className="flex gap-4 text-sm">
            <div className="text-center">
              <p className="text-[10px] text-slate-400 uppercase font-bold">Melhor</p>
              <p className="font-bold text-emerald-600">{consumptionResult.bestKmPerLiter.toFixed(1)}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-slate-400 uppercase font-bold">Pior</p>
              <p className="font-bold text-rose-600">{consumptionResult.worstKmPerLiter.toFixed(1)}</p>
            </div>
          </div>
        )}
      </div>

      {consumptionResult.hasEnoughData ? (
        <>
          <div className="min-h-[180px] sm:h-[200px] w-full mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={consumptionResult.records.map(r => ({
                date: format(parseISO(r.date), 'dd/MM'),
                kmPerLiter: r.kmPerLiter
              }))}>
                <defs>
                  <linearGradient id="colorConsumption" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11}} domain={['dataMin - 2', 'dataMax + 2']} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                <ReferenceLine y={consumptionResult.averageKmPerLiter} stroke="#10b981" strokeDasharray="5 5" strokeOpacity={0.5} />
                <Area type="monotone" dataKey="kmPerLiter" stroke="#10b981" strokeWidth={2} fill="url(#colorConsumption)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2 max-h-[150px] overflow-y-auto custom-scrollbar">
            {consumptionResult.records.slice().reverse().map((record) => {
              const isAboveAvg = record.kmPerLiter >= consumptionResult.averageKmPerLiter;
              return (
                <div key={record.id} className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
                      isAboveAvg ? "bg-emerald-100 dark:bg-emerald-950/30" : "bg-amber-100 dark:bg-amber-950/30"
                    )}>
                      {isAboveAvg ? <ArrowUp size={14} className="text-emerald-600" /> : <ArrowDown size={14} className="text-amber-600" />}
                    </div>
                    <div>
                      <p className="text-xs font-medium dark:text-white">{format(parseISO(record.date), 'dd/MM/yyyy')}</p>
                      <p className="text-[10px] text-slate-500">{record.kmDriven.toLocaleString()} km</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn("font-bold text-sm", isAboveAvg ? "text-emerald-600" : "text-amber-600")}>
                      {record.kmPerLiter.toFixed(1)} km/L
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
            <Gauge size={28} className="text-slate-400" />
          </div>
          <p className="text-slate-500 dark:text-slate-400 mb-1 text-sm">Sem dados suficientes</p>
          <p className="text-xs text-slate-400 max-w-sm">
            Registre 2+ abastecimentos tanque cheio com o KM do hodômetro.
          </p>
        </div>
      )}
    </div>
  );
}
