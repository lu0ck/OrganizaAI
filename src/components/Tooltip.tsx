import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Info } from 'lucide-react';
import { cn } from '../lib/utils';

interface TooltipProps {
  content: string;
  className?: string;
}

export default function Tooltip({ content, className }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className={cn("relative inline-flex", className)}>
      <button
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        className="p-1 text-slate-400 hover:text-brand-600 transition-colors"
      >
        <Info size={14} />
      </button>
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 5 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-slate-900 dark:bg-slate-700 text-white text-xs rounded-lg shadow-xl z-50"
          >
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full">
              <div className="border-8 border-transparent border-t-slate-900 dark:border-t-slate-700" />
            </div>
            {content}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
