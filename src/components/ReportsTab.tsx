import React, { useState, useMemo } from 'react';
import { FileText, Download, Calendar, Filter, TrendingUp, TrendingDown, DollarSign, MapPin, Clock } from 'lucide-react';
import { RideEntry, Expense, UserProfile } from '../types';
import { format, parseISO, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface ReportsTabProps {
  rides: RideEntry[];
  expenses: Expense[];
  profile: UserProfile;
}

export default function ReportsTab({ rides, expenses, profile }: ReportsTabProps) {
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));

  const months = useMemo(() => {
    const end = new Date();
    const start = subMonths(end, 12);
    return eachMonthOfInterval({ start, end }).reverse().map(d => ({
      label: format(d, 'MMMM yyyy', { locale: ptBR }),
      value: format(d, 'yyyy-MM')
    }));
  }, []);

  const reportData = useMemo(() => {
    const start = startOfMonth(parseISO(`${selectedMonth}-01`));
    const end = endOfMonth(start);
    const interval = { start, end };

    const filteredRides = rides.filter(r => isWithinInterval(parseISO(r.date), interval));
    const filteredExpenses = expenses.filter(e => isWithinInterval(parseISO(e.date), interval));

    const totalEarnings = filteredRides.reduce((acc, r) => acc + r.totalValue, 0);
    const totalExpenses = filteredExpenses.reduce((acc, e) => acc + e.value, 0);
    const totalKm = filteredRides.reduce((acc, r) => acc + r.kmDriven, 0);
    const totalRides = filteredRides.reduce((acc, r) => acc + r.numRides, 0);

    const fuelExpenses = filteredExpenses.filter(e => e.type === 'combustivel').reduce((acc, e) => acc + e.value, 0);
    const foodExpenses = filteredExpenses.filter(e => e.type === 'alimentacao').reduce((acc, e) => acc + e.value, 0);
    const maintenanceExpenses = filteredExpenses.filter(e => e.type === 'manutencao').reduce((acc, e) => acc + e.value, 0);

    // Calculate days in selected month
    const daysInMonth = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    // Fixed costs proportional to days in month (same logic as Dashboard)
    const ipvaDaily = (profile.ipvaValue || 0) / 365;
    const licensingDaily = (profile.licensingValue || 0) / 365;
    const insuranceDaily = (profile.insuranceValue || 0) / 30;
    
    const fixedCosts = (ipvaDaily + licensingDaily + insuranceDaily) * daysInMonth;

    const netProfit = totalEarnings - totalExpenses - fixedCosts;

    return {
      rides: filteredRides,
      expenses: filteredExpenses,
      stats: {
        totalEarnings,
        totalExpenses,
        fixedCosts,
        netProfit,
        totalKm,
        totalRides,
        fuelExpenses,
        foodExpenses,
        maintenanceExpenses
      }
    };
  }, [rides, expenses, selectedMonth, profile]);

  const exportPDF = () => {
    const doc = new jsPDF();
    const monthLabel = months.find(m => m.value === selectedMonth)?.label || selectedMonth;

    // Header
    doc.setFontSize(20);
    doc.setTextColor(40, 40, 40);
    doc.text('Relatório Mensal - OrganizaAi', 14, 22);
    
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text(`Período: ${monthLabel}`, 14, 30);
    doc.text(`Motorista: ${profile.name} | Veículo: ${profile.vehicleModel}`, 14, 36);

    // Summary Table
    (doc as any).autoTable({
      startY: 45,
      head: [['Categoria', 'Valor (R$)']],
      body: [
        ['Ganhos Brutos', reportData.stats.totalEarnings.toFixed(2)],
        ['Despesas Variáveis', reportData.stats.totalExpenses.toFixed(2)],
        ['Custos Fixos (IPVA/Seguro/Lic.)', reportData.stats.totalFixedCosts?.toFixed(2) || reportData.stats.fixedCosts.toFixed(2)],
        ['Lucro Líquido', reportData.stats.netProfit.toFixed(2)],
        ['KM Rodados', reportData.stats.totalKm.toFixed(1)],
        ['Total de Corridas', reportData.stats.totalRides.toString()],
      ],
      theme: 'striped',
      headStyles: { fillColor: [37, 99, 235] }
    });

    // Expenses Breakdown
    (doc as any).autoTable({
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [['Tipo de Despesa', 'Valor (R$)']],
      body: [
        ['Combustível', reportData.stats.fuelExpenses.toFixed(2)],
        ['Alimentação', reportData.stats.foodExpenses.toFixed(2)],
        ['Manutenção', reportData.stats.maintenanceExpenses.toFixed(2)],
        ['Outros', (reportData.stats.totalExpenses - reportData.stats.fuelExpenses - reportData.stats.foodExpenses - reportData.stats.maintenanceExpenses).toFixed(2)],
      ],
      theme: 'grid'
    });

    // Daily Rides Table
    (doc as any).autoTable({
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [['Data', 'KM', 'Corridas', 'Valor (R$)']],
      body: reportData.rides.map(r => [
        format(parseISO(r.date), 'dd/MM/yyyy'),
        r.kmDriven.toFixed(1),
        r.numRides.toString(),
        r.totalValue.toFixed(2)
      ]),
      theme: 'striped'
    });

    doc.save(`relatorio_${selectedMonth}.pdf`);
  };

  const exportCSV = () => {
    const headers = ['Data', 'Tipo', 'Descricao', 'Valor', 'KM', 'Corridas'];
    const rows = [
      ...reportData.rides.map(r => [r.date, 'Ganho', 'Corridas do dia', r.totalValue, r.kmDriven, r.numRides]),
      ...reportData.expenses.map(e => [e.date, 'Despesa', e.description, e.value, '', ''])
    ];

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio_${selectedMonth}.csv`);
    link.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Relatórios e Fechamentos</h2>
        <div className="flex items-center gap-3">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 dark:text-white"
          >
            {months.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Ganhos Brutos</p>
          <p className="text-2xl font-bold text-emerald-600">R$ {reportData.stats.totalEarnings.toFixed(2)}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Despesas Totais</p>
          <p className="text-2xl font-bold text-rose-600">R$ {(reportData.stats.totalExpenses + reportData.stats.fixedCosts).toFixed(2)}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Lucro Líquido</p>
          <p className={`text-2xl font-bold ${reportData.stats.netProfit >= 0 ? 'text-brand-600' : 'text-rose-600'}`}>
            R$ {reportData.stats.netProfit.toFixed(2)}
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
        <h3 className="text-lg font-bold dark:text-white flex items-center gap-2">
          <Download size={20} className="text-brand-600" /> Exportar Dados
        </h3>
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          Baixe o fechamento detalhado do mês selecionado em PDF para impressão ou CSV para planilhas.
        </p>

        <div className="flex flex-wrap gap-4">
          <button
            onClick={exportPDF}
            className="flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-semibold transition-all shadow-lg shadow-brand-200 dark:shadow-none"
          >
            <FileText size={20} />
            Exportar PDF
          </button>

          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-6 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-semibold transition-all"
          >
            <Download size={20} />
            Exportar CSV
          </button>
        </div>
      </div>
    </div>
  );
}
