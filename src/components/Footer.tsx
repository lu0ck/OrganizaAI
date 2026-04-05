import React from 'react';
import { Github, Linkedin, ExternalLink, Heart } from 'lucide-react';

export default function Footer() {
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

        <div className="flex items-center gap-4">
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
