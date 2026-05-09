import React from 'react';
import { Gauge, TrendingUp, Fuel, Route, Droplets, DollarSign } from 'lucide-react';
import { Expense } from '../types';
import { cn } from '../lib/utils';
import { format, parseISO } from 'date-fns';
import { calculateGlobalConsumption } from '../lib/fuelCalculation';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

interface FuelConsumptionHistoryProps {
  expenses: Expense[];
  profileKmPerLiter: number;
}

const fuelTypeLabels: Record<string, string> = {
  gasolina: 'Gasolina',
  alcool: 'Álcool',
  gnv: 'GNV'
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload;
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 shadow-xl min-w-[180px]">
      <p className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">{data.fullDate}</p>
      {data.fuelTypeLabel && (
        <div className="flex items-center gap-1.5 mb-1">
          <Droplets size={10} className="text-orange-500" />
          <span className="text-[11px] text-slate-600 dark:text-slate-400">{data.fuelTypeLabel}</span>
        </div>
      )}
      <div className="flex items-center gap-1.5 mb-1">
        <DollarSign size={10} className="text-emerald-500" />
        <span className="text-[11px] text-slate-600 dark:text-slate-400">R$ {data.value.toFixed(2)}</span>
      </div>
      <div className="flex items-center gap-1.5 mb-1">
        <Route size={10} className="text-blue-500" />
        <span className="text-[11px] text-slate-600 dark:text-slate-400">{data.trip} km</span>
      </div>
      <div className="flex items-center gap-1.5">
        <Gauge size={10} className="text-emerald-600" />
        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200">{data.kmPerLiter.toFixed(1)} km/l</span>
      </div>
    </div>
  );
}

export default function FuelConsumptionHistory({ expenses, profileKmPerLiter }: FuelConsumptionHistoryProps) {
  const globalConsumption = calculateGlobalConsumption(expenses);
  const fuelExpenses = expenses.filter(e => e.type === 'combustivel' && e.tripTotal && e.liters)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const hasChartableData = fuelExpenses.length >= 2;

  const chartData = fuelExpenses.slice().reverse().slice(0, 20).map(expense => ({
    date: format(parseISO(expense.date), 'dd/MM'),
    fullDate: format(parseISO(expense.date), 'dd/MM/yyyy'),
    kmPerLiter: expense.segmentConsumption || (expense.tripTotal && expense.liters ? expense.tripTotal / expense.liters : 0),
    trip: expense.tripTotal || 0,
    value: expense.value || 0,
    liters: expense.liters || 0,
    fuelTypeLabel: expense.fuelType ? fuelTypeLabels[expense.fuelType] || expense.fuelType : ''
  }));

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/30 flex items-center justify-center text-emerald-600 shrink-0">
            <Gauge size={20} />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white">Histórico de Consumo</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {hasChartableData
                ? `${fuelExpenses.length} abastecimentos registrados`
                : 'Registre abastecimentos com trip e litros'}
            </p>
          </div>
        </div>
        {globalConsumption.status === 'valid' && (
          <div className="flex gap-4 text-sm">
            <div className="text-center">
              <p className="text-[10px] text-slate-500 uppercase font-bold">Média</p>
              <p className="font-bold text-emerald-600">{globalConsumption.globalAverage.toFixed(1)}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-slate-500 uppercase font-bold">KM Total</p>
              <p className="font-bold text-brand-600">{globalConsumption.totalKm.toFixed(0)}</p>
            </div>
          </div>
        )}
      </div>

      {hasChartableData ? (
        <>
          <div className="min-h-[180px] sm:h-[200px] w-full mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorConsumption" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11}} domain={['dataMin - 2', 'dataMax + 2']} unit=" km/l" />
                <RechartsTooltip content={<CustomTooltip />} />
                {globalConsumption.status === 'valid' && (
                  <ReferenceLine y={globalConsumption.globalAverage} stroke="#10b981" strokeDasharray="5 5" strokeOpacity={0.5} />
                )}
                <Area type="monotone" dataKey="kmPerLiter" stroke="#10b981" strokeWidth={2} fill="url(#colorConsumption)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2 max-h-[180px] overflow-y-auto custom-scrollbar">
            {fuelExpenses.slice().reverse().slice(0, 15).map((expense) => {
              const isCalibrated = expense.isCalibrated;
              const segmentKmPerLiter = expense.segmentConsumption || (expense.tripTotal && expense.liters ? expense.tripTotal / expense.liters : 0);
              const isAboveAvg = globalConsumption.status === 'valid' && segmentKmPerLiter >= globalConsumption.globalAverage;

              return (
                <div key={expense.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
                      isCalibrated ? "bg-emerald-100 dark:bg-emerald-950/30" : "bg-amber-100 dark:bg-amber-950/30"
                    )}>
                      {isCalibrated ? <TrendingUp size={14} className="text-emerald-600" /> : <Route size={14} className="text-amber-600" />}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-700 dark:text-slate-200">{format(parseISO(expense.date), 'dd/MM/yyyy')}</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        {expense.fuelType ? fuelTypeLabels[expense.fuelType] || expense.fuelType : ''} {expense.fuelType ? '• ' : ''}{expense.tripTotal?.toLocaleString() || 0} km
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-600 dark:text-slate-400">R$ {expense.value.toFixed(2)}</p>
                    <p className={cn("font-bold text-sm", isAboveAvg ? "text-emerald-600" : "text-amber-600")}>
                      {segmentKmPerLiter.toFixed(1)} km/l
                    </p>
                    {isCalibrated && (
                      <p className="text-[9px] text-emerald-500 font-medium">calibrado</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
            <Fuel size={28} className="text-slate-400" />
          </div>
          <p className="text-slate-600 dark:text-slate-400 mb-1 text-sm font-medium">Sem dados suficientes</p>
          <p className="text-xs text-slate-500 dark:text-slate-500 max-w-sm">
            Adicione pelo menos 2 abastecimentos com os campos "Trip" e "Litros" preenchidos para visualizar o histórico.
          </p>
        </div>
      )}
    </div>
  );
}
