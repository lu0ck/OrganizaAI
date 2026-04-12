import React from 'react';
import { Github, Linkedin, ExternalLink, Heart, Bug, Mail } from 'lucide-react';

export default function Footer() {
  const handleReportIssue = () => {
    const subject = encodeURIComponent('[OrganizaAi-Bug] - Reportar problema');
    const body = encodeURIComponent(`Prezado desenvolvedor,\n\nEncontrei um problema no aplicativo OrganizaAi:\n\nDescrição do problema:\n[Descreva aqui o problema]\n\nPasso a passo para reproduzir:\n1. \n2. \n3. \n\nInformações adicionais:\n- Navegador/Sistema: \n- Data: ${new Date().toLocaleDateString('pt-BR')}\n\nAtt,`);
    window.location.href = `mailto:bugsandchanges@gmail.com?subject=${subject}&body=${body}`;
  };

  const handleSuggestFeature = () => {
    const subject = encodeURIComponent('[OrganizaAi-Sugestão] - Sugerir funcionalidade');
    const body = encodeURIComponent(`Prezado desenvolvedor,\n\nGostaria de sugerir uma nova funcionalidade para o OrganizaAi:\n\nNome da funcionalidade:\n[Descreva o nome]\n\nDescrição detalhada:\n[Descreva como deveria funcionar e por que seria útil]\n\nAtt,`);
    window.location.href = `mailto:bugsandchanges@gmail.com?subject=${subject}&body=${body}`;
  };

  return (
    <footer className="mt-20 pb-10 border-t border-slate-200 dark:border-slate-800 pt-10">
      <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex flex-col items-center md:items-start gap-2">
          <p className="text-slate-600 dark:text-slate-400 flex items-center gap-2 font-medium">
            Feito com <Heart size={16} className="text-brand-500 fill-brand-500" /> por <span className="text-slate-900 dark:text-white font-bold">Lucas</span>
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            © {new Date().getFullYear()} OrganizaAi - Gestão para Motoristas e Entregadores
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={handleReportIssue}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-rose-500 hover:text-white dark:hover:bg-rose-600 transition-all shadow-sm text-sm font-medium"
            title="Reportar Bug"
          >
            <Bug size={18} />
            <span className="hidden sm:inline">Bug</span>
          </button>
          <button 
            onClick={handleSuggestFeature}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-emerald-500 hover:text-white dark:hover:bg-emerald-600 transition-all shadow-sm text-sm font-medium"
            title="Sugerir Funcionalidade"
          >
            <Mail size={18} />
            <span className="hidden sm:inline">Sugestão</span>
          </button>
          <a 
            href="https://github.com/lu0ck" 
            target="_blank" 
            rel="noopener noreferrer"
            className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-brand-500 hover:text-white dark:hover:bg-brand-600 transition-all shadow-sm"
            title="GitHub"
          >
            <Github size={20} />
          </a>
          <a 
            href="https://www.linkedin.com/in/lucaspaixao-dev" 
            target="_blank" 
            rel="noopener noreferrer"
            className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-brand-500 hover:text-white dark:hover:bg-brand-600 transition-all shadow-sm"
            title="LinkedIn"
          >
            <Linkedin size={20} />
          </a>
          <a 
            href="https://lucasdevport.netlify.app/#contato" 
            target="_blank" 
            rel="noopener noreferrer"
            className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-brand-500 hover:text-white dark:hover:bg-brand-600 transition-all shadow-sm"
            title="Portfólio"
          >
            <ExternalLink size={20} />
          </a>
        </div>
      </div>
    </footer>
  );
}
