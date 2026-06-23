import { useEffect, useRef } from 'react';

export interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  handler: () => void;
  enabled?: boolean;
}

export function useKeyboardShortcuts(shortcuts: ShortcutConfig[]) {
  const ref = useRef(shortcuts);
  ref.current = shortcuts;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      for (const sc of ref.current) {
        if (sc.enabled === false) continue;
        if (sc.key.toLowerCase() !== e.key.toLowerCase()) continue;
        if (sc.ctrl && !e.ctrlKey && !e.metaKey) continue;
        if (!sc.ctrl && (e.ctrlKey || e.metaKey)) continue;
        if (sc.alt && !e.altKey) continue;
        if (sc.shift && !e.shiftKey) continue;

        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
          if (!sc.ctrl) continue;
        }

        e.preventDefault();
        sc.handler();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}
