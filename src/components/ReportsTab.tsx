import React, { useState, useMemo } from 'react';
import { FileText, Download, Calendar, Filter, TrendingUp, TrendingDown, DollarSign, MapPin, Clock } from 'lucide-react';
import { RideEntry, Expense, UserProfile } from '../types';
import { format, parseISO, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';
import jsPDF from 'jspdf';
import { applyPlugin } from 'jspdf-autotable';
applyPlugin(jsPDF);

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
  const installmentDaily = (profile.vehicleInstallmentValue || 0) / 30;

  const fixedCosts = (ipvaDaily + licensingDaily + insuranceDaily + installmentDaily) * daysInMonth;

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

  const [pdfError, setPdfError] = useState<string | null>(null);

  const stripAccents = (str: string) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const exportPDF = () => {
    setPdfError(null);
    try {
      const doc = new jsPDF();
      const pageW = doc.internal.pageSize.getWidth();
      const margin = 14;
      const contentW = pageW - margin * 2;
      const monthLabel = months.find(m => m.value === selectedMonth)?.label || selectedMonth;
      const s = stripAccents;
      const now = new Date();
      const generatedAt = format(now, 'dd/MM/yyyy HH:mm');

      const { stats, rides: fRides, expenses: fExpenses } = reportData;
      const workedDays = new Set(fRides.map(r => r.date.split('T')[0])).size;
      const totalHours = fRides.reduce((acc, r) => {
        if (!r.startTime || !r.endTime) return acc;
        const [sH, sM] = r.startTime.split(':').map(Number);
        const [eH, eM] = r.endTime.split(':').map(Number);
        if (isNaN(sH) || isNaN(sM) || isNaN(eH) || isNaN(eM)) return acc;
        let diff = (eH * 60 + eM) - (sH * 60 + sM);
        if (diff < 0) diff += 24 * 60;
        return acc + diff / 60;
      }, 0);
      const avgPerHour = totalHours > 0 ? stats.totalEarnings / totalHours : 0;
      const otherExpenses = stats.totalExpenses - stats.fuelExpenses - stats.foodExpenses - stats.maintenanceExpenses;
      const totalAllExpenses = stats.totalExpenses + stats.fixedCosts;

      const ipvaMonthly = ((profile.ipvaValue || 0) / 12);
      const licensingMonthly = ((profile.licensingValue || 0) / 12);
      const insuranceMonthly = (profile.insuranceValue || 0);
      const installmentMonthly = (profile.vehicleInstallmentValue || 0);

      let y = 0;

      // === HEADER BAR ===
      doc.setFillColor(37, 99, 235);
      doc.rect(0, 0, pageW, 4, 'F');
      y = 16;

      // === TITLE ===
      doc.setFontSize(22);
      doc.setTextColor(37, 99, 235);
      doc.text('OrganizaAi', margin, y);
      y += 7;

      doc.setFontSize(13);
      doc.setTextColor(60, 60, 60);
      doc.text(s('Relatorio Mensal'), margin, y);
      y += 6;

      doc.setFontSize(10);
      doc.setTextColor(120, 120, 120);
      doc.text(s(`Periodo: ${monthLabel}`), margin, y);
      y += 4;
      doc.text(s(`Motorista: ${profile.name}  |  Veiculo: ${profile.vehicleModel}  |  Gerado em: ${generatedAt}`), margin, y);
      y += 8;

      // === SUMMARY BOX ===
      const boxY = y;
      const boxH = 20;
      doc.setFillColor(245, 247, 250);
      doc.roundedRect(margin, boxY, contentW, boxH, 2, 2, 'F');

      const colW = contentW / 3;
      const centers = [margin + colW / 2, margin + colW + colW / 2, margin + colW * 2 + colW / 2];

      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(s('RECEITAS'), centers[0], boxY + 5, { align: 'center' });
      doc.text(s('DESPESAS'), centers[1], boxY + 5, { align: 'center' });
      doc.text(s('LUCRO LIQUIDO'), centers[2], boxY + 5, { align: 'center' });

      doc.setFontSize(14);
      doc.setTextColor(5, 150, 105);
      doc.text(`R$ ${stats.totalEarnings.toFixed(2)}`, centers[0], boxY + 12, { align: 'center' });

      doc.setTextColor(220, 38, 38);
      doc.text(`R$ ${totalAllExpenses.toFixed(2)}`, centers[1], boxY + 12, { align: 'center' });

      if (stats.netProfit >= 0) {
        doc.setTextColor(37, 99, 235);
      } else {
        doc.setTextColor(220, 38, 38);
      }
      doc.text(`R$ ${stats.netProfit.toFixed(2)}`, centers[2], boxY + 12, { align: 'center' });

      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      doc.text(`${stats.totalKm.toFixed(0)} km  |  ${stats.totalRides} ${s('corridas')}  |  ${workedDays}d  |  ${totalHours.toFixed(1)}h  |  R$ ${avgPerHour.toFixed(2)}/h`, pageW / 2, boxY + 17, { align: 'center' });

      // dividers
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.3);
      doc.line(margin + colW, boxY + 3, margin + colW, boxY + boxH - 3);
      doc.line(margin + colW * 2, boxY + 3, margin + colW * 2, boxY + boxH - 3);

      y = boxY + boxH + 8;

      // === SECTION: DESPESAS POR CATEGORIA ===
      doc.setFontSize(11);
      doc.setTextColor(37, 99, 235);
      doc.text(s('Resumo de Despesas'), margin, y);
      y += 2;
      doc.setFillColor(37, 99, 235);
      doc.rect(margin, y, 30, 1.5, 'F');
      y += 4;

      const catBody = [
        [s('Combustivel'), stats.fuelExpenses.toFixed(2), totalAllExpenses > 0 ? ((stats.fuelExpenses / totalAllExpenses) * 100).toFixed(1) + '%' : '-'],
        [s('Alimentacao'), stats.foodExpenses.toFixed(2), totalAllExpenses > 0 ? ((stats.foodExpenses / totalAllExpenses) * 100).toFixed(1) + '%' : '-'],
        [s('Manutencao'), stats.maintenanceExpenses.toFixed(2), totalAllExpenses > 0 ? ((stats.maintenanceExpenses / totalAllExpenses) * 100).toFixed(1) + '%' : '-'],
        [s('Outros'), otherExpenses.toFixed(2), totalAllExpenses > 0 ? ((otherExpenses / totalAllExpenses) * 100).toFixed(1) + '%' : '-'],
        [s('Custos Fixos (IPVA/Seg./Lic./Parc.)'), stats.fixedCosts.toFixed(2), totalAllExpenses > 0 ? ((stats.fixedCosts / totalAllExpenses) * 100).toFixed(1) + '%' : '-'],
      ];

      (doc as any).autoTable({
        startY: y,
        head: [[s('Categoria'), 'Valor (R$)', '%']],
        body: catBody,
        foot: [[s('TOTAL'), totalAllExpenses.toFixed(2), '100%']],
        margin: { left: margin, right: margin },
        theme: 'grid',
        headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
        footStyles: { fillColor: [245, 247, 250], textColor: [40, 40, 40], fontStyle: 'bold', fontSize: 9 },
        bodyStyles: { fontSize: 9 },
        columnStyles: {
          0: { cellWidth: contentW * 0.5 },
          1: { halign: 'right', cellWidth: contentW * 0.25 },
          2: { halign: 'right', cellWidth: contentW * 0.25 },
        },
        didParseCell: (data: any) => {
          if (data.section === 'body' && data.column.index === 1) {
            data.cell.styles.textColor = [220, 38, 38];
          }
        },
      });

      y = (doc as any).lastAutoTable.finalY + 10;

      // === SECTION: CORRIDAS ===
      doc.setFontSize(11);
      doc.setTextColor(37, 99, 235);
      doc.text(s('Corridas Detalhadas'), margin, y);
      y += 2;
      doc.setFillColor(37, 99, 235);
      doc.rect(margin, y, 30, 1.5, 'F');
      y += 4;

      const ridesBody = fRides.map(r => {
        const timeStr = r.startTime && r.endTime ? `${r.startTime}-${r.endTime}` : '-';
        const appsStr = (r.appRides || []).map(a => {
          const name = a.appName.length > 6 ? a.appName.substring(0, 6) + '.' : a.appName;
          return `${name}(${a.count})`;
        }).join(' + ');
        return [
          format(parseISO(r.date), 'dd/MM'),
          timeStr,
          r.kmDriven.toFixed(1),
          r.numRides.toString(),
          r.totalValue.toFixed(2),
          appsStr || '-',
        ];
      });

      const totalKmStr = stats.totalKm.toFixed(1);
      const totalRidesStr = stats.totalRides.toString();
      const totalEarningsStr = stats.totalEarnings.toFixed(2);

      (doc as any).autoTable({
        startY: y,
        head: [['Data', s('Horario'), 'KM', s('Corridas'), 'Valor (R$)', 'Apps']],
        body: ridesBody,
        foot: [['TOTAL', '', totalKmStr, totalRidesStr, totalEarningsStr, '']],
        margin: { left: margin, right: margin },
        theme: 'striped',
        headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
        footStyles: { fillColor: [245, 247, 250], textColor: [40, 40, 40], fontStyle: 'bold', fontSize: 8 },
        bodyStyles: { fontSize: 8 },
        columnStyles: {
          0: { cellWidth: contentW * 0.1 },
          1: { cellWidth: contentW * 0.17 },
          2: { halign: 'right', cellWidth: contentW * 0.1 },
          3: { halign: 'right', cellWidth: contentW * 0.12 },
          4: { halign: 'right', cellWidth: contentW * 0.18 },
          5: { cellWidth: contentW * 0.33 },
        },
        didParseCell: (data: any) => {
          if (data.section === 'body' && data.column.index === 4) {
            data.cell.styles.textColor = [5, 150, 105];
          }
        },
      });

      y = (doc as any).lastAutoTable.finalY + 10;

      // === SECTION: DESPESAS DETALHADAS ===
      if (fExpenses.length > 0) {
        doc.setFontSize(11);
        doc.setTextColor(37, 99, 235);
        doc.text(s('Despesas Detalhadas'), margin, y);
        y += 2;
        doc.setFillColor(37, 99, 235);
        doc.rect(margin, y, 30, 1.5, 'F');
        y += 4;

        const expTypeLabels: Record<string, string> = {
          combustivel: 'Combust.',
          manutencao: s('Manutencao'),
          alimentacao: s('Alimentacao'),
          imposto: 'Imposto',
          multa: 'Multa',
          parcela: s('Parcela'),
          seguro: 'Seguro',
          outros: 'Outros',
        };

        const expBody = fExpenses
          .sort((a, b) => a.date.localeCompare(b.date))
          .map(e => [
            format(parseISO(e.date), 'dd/MM'),
            expTypeLabels[e.type] || e.type,
            s(e.description || '-'),
            e.type === 'combustivel' && e.liters ? e.liters.toFixed(1) : '',
            e.value.toFixed(2),
          ]);

        (doc as any).autoTable({
          startY: y,
          head: [['Data', s('Tipo'), s('Descricao'), 'Litros', 'Valor (R$)']],
          body: expBody,
          foot: [['', '', '', '', stats.totalExpenses.toFixed(2)]],
          margin: { left: margin, right: margin },
          theme: 'striped',
          headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
          footStyles: { fillColor: [245, 247, 250], textColor: [40, 40, 40], fontStyle: 'bold', fontSize: 8 },
          bodyStyles: { fontSize: 8 },
          columnStyles: {
            0: { cellWidth: contentW * 0.1 },
            1: { cellWidth: contentW * 0.15 },
            2: { cellWidth: contentW * 0.4 },
            3: { halign: 'right', cellWidth: contentW * 0.12 },
            4: { halign: 'right', cellWidth: contentW * 0.23 },
          },
          didParseCell: (data: any) => {
            if (data.section === 'body' && data.column.index === 4) {
              data.cell.styles.textColor = [220, 38, 38];
            }
          },
        });
      }

      // === FOOTER ON EVERY PAGE ===
      const totalPages = doc.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        const pageH = doc.internal.pageSize.getHeight();
        doc.setFontSize(7);
        doc.setTextColor(170, 170, 170);
        doc.text(s(`Gerado por OrganizaAi em ${generatedAt}`), margin, pageH - 8);
        doc.text(`${p} / ${totalPages}`, pageW - margin, pageH - 8, { align: 'right' });

        // bottom line
        doc.setDrawColor(37, 99, 235);
        doc.setLineWidth(0.5);
        doc.line(margin, pageH - 11, pageW - margin, pageH - 11);
      }

      doc.save(`relatorio_${selectedMonth}.pdf`);
    } catch (err) {
      console.error('PDF export error:', err);
      setPdfError(stripAccents('Erro ao gerar PDF. Tente exportar como CSV.'));
    }
  };

  const exportCSV = () => {
    const headers = ['Data', 'Tipo', 'Descricao', 'Valor', 'KM', 'Corridas'];
    const rows = [
      ...reportData.rides.map(r => [r.date, 'Ganho', 'Corridas do dia', r.totalValue, r.kmDriven, r.numRides]),
      ...reportData.expenses.map(e => [e.date, 'Despesa', e.description, e.value, '', ''])
    ];

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
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
        {pdfError && (
          <p className="w-full text-sm text-rose-600 dark:text-rose-400">{pdfError}</p>
        )}

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
