import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Keyboard, Pencil, Check } from 'lucide-react';
import { ShortcutBinding } from '../types';
import { cn } from '../lib/utils';

interface ShortcutsHelpProps {
  open: boolean;
  onClose: () => void;
  shortcuts: ShortcutBinding[];
  onUpdateShortcut: (id: string, binding: { key: string; ctrl?: boolean; alt?: boolean; shift?: boolean }) => void;
}

const categoryLabels: Record<string, string> = {
  nav: 'Navegação',
};

export default function ShortcutsHelp({ open, onClose, shortcuts, onUpdateShortcut }: ShortcutsHelpProps) {
  const [editing, setEditing] = useState(false);
  const [recording, setRecording] = useState<string | null>(null);

  useEffect(() => {
    if (!recording) return;
    const handler = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const parts: { key: string; ctrl?: boolean; alt?: boolean; shift?: boolean } = {
        key: e.key === 'Control' || e.key === 'Alt' || e.key === 'Shift' ? '' : e.key,
        ctrl: e.ctrlKey || e.metaKey,
        alt: e.altKey,
        shift: e.shiftKey,
      };
      if (parts.key) {
        onUpdateShortcut(recording, parts);
        setRecording(null);
      }
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [recording, onUpdateShortcut]);

  const grouped = shortcuts.reduce((acc, s) => {
    const parts = s.id.split('_');
    const category = parts.length > 1 ? parts[0] : 'outros';
    if (!acc[category]) acc[category] = [];
    acc[category].push(s);
    return acc;
  }, {} as Record<string, ShortcutBinding[]>);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-lg max-h-[80vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-brand-100 dark:bg-brand-900/30 rounded-xl text-brand-600">
                  <Keyboard size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Atalhos de Teclado</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Pressione os atalhos para navegar rapidamente</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setEditing(!editing); setRecording(null); }}
                  className={cn(
                    "p-2 rounded-xl transition-all",
                    editing
                      ? "bg-brand-100 dark:bg-brand-900/30 text-brand-600"
                      : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                  )}
                  title={editing ? 'Concluir edição' : 'Personalizar atalhos'}
                >
                  {editing ? <Check size={20} /> : <Pencil size={20} />}
                </button>
                <button
                  onClick={onClose}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-6">
              {Object.entries(grouped).map(([category, items]) => (
                <div key={category}>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                    {categoryLabels[category] || category}
                  </h3>
                  <div className="space-y-2">
                    {items.filter(s => s.enabled).map(s => {
                      const isRecording = recording === s.id;
                      return (
                        <div
                          key={s.id}
                          onClick={() => { if (editing) setRecording(isRecording ? null : s.id); }}
                          className={cn(
                            "flex items-center justify-between py-2 px-3 rounded-xl",
                            editing ? "cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50" : "bg-slate-50 dark:bg-slate-800/50",
                            isRecording && "ring-2 ring-brand-500 bg-brand-50 dark:bg-brand-900/20"
                          )}
                        >
                          <span className="text-sm text-slate-700 dark:text-slate-300">{s.description}</span>
                          {isRecording ? (
                            <span className="text-xs font-bold text-brand-600 animate-pulse">Pressione a tecla...</span>
                          ) : (
                            <kbd className={cn(
                              "inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono font-bold",
                              "bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600",
                              "text-slate-600 dark:text-slate-200 shadow-sm"
                            )}>
                              {s.ctrl && <span>Ctrl</span>}
                              {s.alt && <span>Alt</span>}
                              {s.shift && <span>Shift</span>}
                              <span>{s.key === ' ' ? 'Espaço' : s.key}</span>
                            </kbd>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-700">
              <p className="text-xs text-center text-slate-400">
                {editing
                  ? 'Clique em um atalho e pressione a tecla desejada para personalizar'
                  : <>Pressione <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-xs border border-slate-200 dark:border-slate-700">?</kbd> para abrir/fechar esta janela</>
                }
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
