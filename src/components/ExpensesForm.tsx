import React, { useState, useMemo } from 'react';
import { Plus, Trash2, Receipt, Fuel, Settings, FileText, AlertCircle, CreditCard, Save, X, MapPin, Droplets, DollarSign, Utensils, CheckCircle2, Shield, Filter, Search, Calculator, Gauge, Info, Pencil, Navigation } from 'lucide-react';
import { Expense, UserProfile } from '../types';
import { format, parseISO } from 'date-fns';
import { cn } from '../lib/utils';
import FuelCalculator from './FuelCalculator';
import { calculateFuelBalance, getLastFuelExpense, hasValidFuelData } from '../lib/fuelCalculation';

import { motion, AnimatePresence } from 'motion/react';

interface ExpensesFormProps {
  onAdd: (expense: Expense) => void;
  onDelete: (id: string) => void;
  onEdit: (expense: Expense) => void;
  expenses: Expense[];
  profile: UserProfile;
  avgPerKm: number;
}

export default function ExpensesForm({ onAdd, onDelete, onEdit, expenses, profile, avgPerKm }: ExpensesFormProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCalculator, setShowCalculator] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    type: 'combustivel' as Expense['type'],
    value: '',
    description: '',
    location: '',
    liters: '',
    pricePerLiter: '',
    fuelType: 'gasolina' as Expense['fuelType'],
    tripTotal: '',
    enteredReserve: false,
    tripOnReserve: ''
  });

  const expenseTypes = [
    { id: 'combustivel', label: 'Combustível', icon: Fuel, color: 'text-orange-500 bg-orange-50 dark:bg-orange-950/30' },
    { id: 'alimentacao', label: 'Alimentação', icon: Utensils, color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/30' },
    { id: 'manutencao', label: 'Manutenção', icon: Settings, color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/30' },
    { id: 'seguro', label: 'Seguro', icon: Shield, color: 'text-cyan-500 bg-cyan-50 dark:bg-cyan-950/30' },
    { id: 'imposto', label: 'Imposto', icon: FileText, color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/30' },
    { id: 'multa', label: 'Multa', icon: AlertCircle, color: 'text-rose-500 bg-rose-50 dark:bg-rose-950/30' },
    { id: 'parcela', label: 'Parcela Veículo', icon: CreditCard, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30' },
    { id: 'outros', label: 'Outros', icon: Receipt, color: 'text-slate-500 bg-slate-50 dark:bg-slate-800' }
  ];

  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => {
      const matchesType = filterType === 'all' || exp.type === filterType;
      const matchesSearch = exp.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (exp.location || '').toLowerCase().includes(searchTerm.toLowerCase());
      return matchesType && matchesSearch;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses, filterType, searchTerm]);

  const lastFuelExpense = getLastFuelExpense(expenses);
  const hasValidConfig = hasValidFuelData(profile);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    let calculatedFields = {};
    
    // Se for combustível, calcular campos
    if (formData.type === 'combustivel' && formData.tripTotal && formData.liters) {
      const tripTotal = Number(formData.tripTotal);
      const tripOnReserve = formData.enteredReserve && formData.tripOnReserve ? Number(formData.tripOnReserve) : 0;
      const liters = Number(formData.liters);
      
      const result = calculateFuelBalance(
        tripTotal,
        tripOnReserve,
        liters,
        profile,
        lastFuelExpense
      );
      
      calculatedFields = {
        tripTotal,
        tripOnReserve,
        enteredReserve: formData.enteredReserve,
        saldoBeforeFueling: result.saldoBeforeFueling,
        saldoAfterFueling: result.saldoAfterFueling,
        segmentConsumption: result.segmentConsumption,
        isCalibrated: result.isCalibrated
      };
    }
    
    const newExpense: Expense = {
      id: editingId || crypto.randomUUID(),
      date: formData.date,
      type: formData.type,
      value: Number(formData.value),
      description: formData.description,
      location: formData.location || undefined,
      liters: formData.liters ? Number(formData.liters) : undefined,
      pricePerLiter: formData.pricePerLiter ? Number(formData.pricePerLiter) : undefined,
      fuelType: formData.type === 'combustivel' ? formData.fuelType : undefined,
      ...calculatedFields
    };
    
    if (editingId) {
      onEdit(newExpense);
      setEditingId(null);
    } else {
      onAdd(newExpense);
    }
    
    setIsAdding(false);
    setEditingId(null);
    setFormData({
      date: format(new Date(), 'yyyy-MM-dd'),
      type: 'combustivel',
      value: '',
      description: '',
      location: '',
      liters: '',
      pricePerLiter: '',
      fuelType: 'gasolina',
      tripTotal: '',
      enteredReserve: false,
      tripOnReserve: ''
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Gestão de Despesas</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCalculator(!showCalculator)}
            className={cn(
              "p-2 rounded-xl border-2 transition-all",
              showCalculator
                ? "bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-900/30 text-orange-600"
                : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-500"
            )}
            title="Calculadora Gasolina vs Álcool"
          >
            <Calculator size={24} />
          </button>
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-xl font-semibold flex items-center gap-2 transition-all shadow-lg shadow-brand-200 dark:shadow-none"
          >
            {isAdding ? <X size={20} /> : <Plus size={20} />}
            {isAdding ? 'Cancelar' : 'Nova Despesa'}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showCalculator && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -20 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -20 }}
            className="overflow-hidden"
          >
            <FuelCalculator profile={profile} expenses={expenses} />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAdding && (
          <motion.form
            initial={{ opacity: 0, height: 0, y: -20 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -20 }}
            onSubmit={handleSubmit}
            className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
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
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Tipo de Despesa</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as Expense['type'] })}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 dark:text-white"
                >
                  {expenseTypes.map(type => (
                    <option key={type.id} value={type.id}>{type.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Valor (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 dark:text-white"
                  placeholder="0,00"
                />
              </div>
            </div>

            <div className="space-y-6 mb-8">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Descrição / Observação</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 dark:text-white min-h-[100px]"
                  placeholder="Ex: Almoço, Troca de óleo, Abastecimento Posto Shell..."
                />
              </div>

              {formData.type === 'combustivel' && (
                <div className="space-y-6 p-6 bg-orange-50 dark:bg-orange-950/20 rounded-2xl border border-orange-100 dark:border-orange-900/30">
                  {/* Aviso sobre configuração */}
                  {!hasValidConfig && (
                    <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-900/30">
                      <AlertCircle size={16} className="text-amber-600 mt-0.5 shrink-0" />
                      <p className="text-xs text-amber-700 dark:text-amber-300">
                        <strong>Configure o perfil:</strong> Adicione a capacidade do tanque, reserva e consumo estimado em Perfil para cálculos precisos.
                      </p>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-orange-800 dark:text-orange-300">Tipo de Combustível</label>
                      <div className="flex gap-4">
                        {(['gasolina', 'alcool', 'gnv'] as const).map((fType) => (
                          <label key={fType} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="fuelType"
                              value={fType}
                              checked={formData.fuelType === fType}
                              onChange={(e) => setFormData({ ...formData, fuelType: e.target.value as any })}
                              className="w-4 h-4 text-orange-600 focus:ring-orange-500"
                            />
                            <span className="text-sm capitalize text-orange-800 dark:text-orange-300">{fType}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-orange-800 dark:text-orange-300 flex items-center gap-2">
                        <MapPin size={16} /> Localização (Posto)
                      </label>
                      <input
                        type="text"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-orange-200 dark:border-orange-900/30 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 dark:text-white"
                        placeholder="Ex: Posto Ipiranga"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-orange-800 dark:text-orange-300 flex items-center gap-2">
                        <DollarSign size={16} /> Preço por Litro (R$)
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        value={formData.pricePerLiter}
                        onChange={(e) => {
                          const price = Number(e.target.value);
                          const total = Number(formData.value);
                          const liters = price > 0 ? (total / price).toFixed(2) : formData.liters;
                          setFormData({ ...formData, pricePerLiter: e.target.value, liters: liters.toString() });
                        }}
                        className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-orange-200 dark:border-orange-900/30 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 dark:text-white"
                        placeholder="Ex: 5.89"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-orange-800 dark:text-orange-300 flex items-center gap-2">
                        <Droplets size={16} /> Litros Abastecidos <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        required
                        value={formData.liters}
                        onChange={(e) => {
                          const liters = Number(e.target.value);
                          const price = Number(formData.pricePerLiter);
                          const total = price > 0 ? (liters * price).toFixed(2) : formData.value;
                          setFormData({ ...formData, liters: e.target.value, value: total.toString() });
                        }}
                        className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-orange-200 dark:border-orange-900/30 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 dark:text-white"
                        placeholder="Ex: 25.500"
                      />
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-orange-100 dark:border-orange-900/30">
                    {/* Campo Trip Total - Obrigatório */}
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-orange-800 dark:text-orange-300 flex items-center gap-2">
                          <Gauge size={16} /> Trip Total (KM desde último abastecimento) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          required
                          value={formData.tripTotal}
                          onChange={(e) => setFormData({ ...formData, tripTotal: e.target.value })}
                          className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-orange-200 dark:border-orange-900/30 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 dark:text-white"
                          placeholder="Ex: 280"
                        />
                      </div>
                      
                      {/* Instrução visual importante */}
                      <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-100 dark:border-blue-900/30">
                        <Info size={16} className="text-blue-600 mt-0.5 shrink-0" />
                        <div className="text-xs text-blue-700 dark:text-blue-300">
                          <strong>Instrução:</strong> Zere o trip no painel do veículo <strong>a cada abastecimento</strong>.
                          <br />
                          O trip deve registrar quantos KM você rodou desde o último abastecimento.
                        </div>
                      </div>
                    </div>

                    {/* Checkbox Entrou na Reserva */}
                    <div className="flex items-center gap-3 py-2">
                      <input
                        type="checkbox"
                        id="enteredReserve"
                        checked={formData.enteredReserve}
                        onChange={(e) => setFormData({ ...formData, enteredReserve: e.target.checked, tripOnReserve: '' })}
                        className="w-5 h-5 rounded border-orange-300 text-orange-600 focus:ring-orange-500"
                      />
                      <label htmlFor="enteredReserve" className="text-sm font-medium text-orange-800 dark:text-orange-300 cursor-pointer">
                        A luz da reserva acendeu neste trecho?
                      </label>
                    </div>

                    {/* Campo KM na Reserva - Condicional */}
                    {formData.enteredReserve && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-orange-800 dark:text-orange-300">
                          Quantos KM rodou com a luz da reserva acesa? <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          required
                          value={formData.tripOnReserve}
                          onChange={(e) => setFormData({ ...formData, tripOnReserve: e.target.value })}
                          className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-orange-200 dark:border-orange-900/30 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 dark:text-white"
                          placeholder="Ex: 15"
                        />
                        <p className="text-xs text-orange-600 flex items-center gap-1">
                          <Info size={12} />
                          Este valor permite calcular o consumo REAL do seu veículo.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-brand-200 dark:shadow-none transition-all flex items-center justify-center gap-2"
            >
              <Save size={20} /> Salvar Despesa
            </button>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Histórico de Despesas</h3>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Buscar despesa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500 dark:text-white w-full md:w-48"
              />
            </div>
            <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2">
              <Filter size={16} className="text-slate-400" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="bg-transparent text-sm outline-none dark:text-white cursor-pointer"
              >
                <option value="all">Todos os Tipos</option>
                {expenseTypes.map(t => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {filteredExpenses.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 p-12 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 text-center">
            <Receipt className="mx-auto text-slate-300 mb-4" size={48} />
            <p className="text-slate-500">Nenhuma despesa encontrada com os filtros atuais.</p>
          </div>
        ) : (
<div className="grid gap-4">
  {filteredExpenses.map((expense) => {
    const typeInfo = expenseTypes.find(t => t.id === expense.type) || expenseTypes[5];
    const kmToPay = avgPerKm > 0 ? Math.ceil(expense.value / avgPerKm) : null;
    return (
    <div key={expense.id} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", typeInfo.color)}>
            <typeInfo.icon size={24} />
          </div>
          <div>
            <p className="font-bold text-slate-900 dark:text-white">{typeInfo.label}</p>
            <p className="text-xs text-slate-500">{format(parseISO(expense.date), 'dd/MM/yyyy')}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 items-center">
          <div className="text-right">
            <p className="text-xs text-slate-500">Valor</p>
            <p className="font-bold text-rose-600">R$ {expense.value.toFixed(2)}</p>
          </div>
          {expense.liters && (
            <div className="text-right">
              <p className="text-xs text-slate-500">Litros</p>
              <p className="font-bold text-slate-900 dark:text-white">
                {expense.liters.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}L
              </p>
              {expense.fuelType && (
                <span className="text-[10px] font-bold text-orange-500 uppercase">{expense.fuelType}</span>
              )}
            </div>
          )}
          {expense.tripTotal && (
            <div className="text-right">
              <p className="text-xs text-slate-500">Trip</p>
              <p className="font-bold text-slate-900 dark:text-white">{expense.tripTotal} km</p>
              {expense.isCalibrated && (
                <span className="text-[10px] font-bold text-emerald-500 uppercase">Calibrado</span>
              )}
            </div>
          )}
          <button
            onClick={() => {
              setEditingId(expense.id);
              setIsAdding(true);
              setFormData({
                date: expense.date,
                type: expense.type,
                value: String(expense.value),
                description: expense.description || '',
                location: expense.location || '',
                liters: expense.liters ? String(expense.liters) : '',
                pricePerLiter: expense.pricePerLiter ? String(expense.pricePerLiter) : '',
                fuelType: expense.fuelType || 'gasolina',
                tripTotal: expense.tripTotal ? String(expense.tripTotal) : '',
                enteredReserve: expense.enteredReserve || false,
                tripOnReserve: expense.tripOnReserve ? String(expense.tripOnReserve) : ''
              });
            }}
            className="opacity-0 group-hover:opacity-100 text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-950/30 p-2 rounded-lg transition-all"
          >
            <Pencil size={18} />
          </button>
          <button
            onClick={() => onDelete(expense.id)}
            className="opacity-0 group-hover:opacity-100 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 p-2 rounded-lg transition-all"
          >
            <Trash2 size={20} />
          </button>
        </div>
      </div>

      {expense.description && (
        <p className="mt-4 text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
          {expense.description}
          {expense.location && <span className="block mt-1 text-xs font-semibold text-slate-500 italic flex items-center gap-1"><MapPin size={10} /> {expense.location}</span>}
        </p>
      )}

      {kmToPay !== null && (
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg w-fit">
            <Navigation size={14} className="text-emerald-600" />
            <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
              {kmToPay.toLocaleString()} km para pagar esta despesa
            </span>
          </div>
        </div>
      )}
    </div>
  );
  })}
</div>
        )}
      </div>
    </div>
  );
}
