import React, { useEffect, useRef, useCallback } from 'react';
import { cn } from '../lib/utils';

interface SidebarResizeHandleProps {
  onResize: (deltaX: number) => void;
  onStart: () => void;
  onStop: () => void;
  isResizing: boolean;
}

export default function SidebarResizeHandle({ onResize, onStart, onStop, isResizing }: SidebarResizeHandleProps) {
  const handleRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const lastXRef = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    startXRef.current = e.clientX;
    lastXRef.current = e.clientX;
    onStart();
  }, [onStart]);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - lastXRef.current;
      lastXRef.current = e.clientX;
      onResize(deltaX);
    };

    const handleMouseUp = () => {
      onStop();
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, onResize, onStop]);

  return (
    <div
      ref={handleRef}
      onMouseDown={handleMouseDown}
      className={cn(
        "absolute right-0 top-0 bottom-0 w-1 cursor-col-resize group z-50",
        "hover:bg-brand-500/20 dark:hover:bg-brand-400/20",
        isResizing && "bg-brand-500/30 dark:bg-brand-400/30"
      )}
    >
      <div
        className={cn(
          "absolute right-0 top-1/2 -translate-y-1/2 w-1 h-12 rounded-full opacity-0 group-hover:opacity-100 transition-opacity",
          "bg-brand-500/50 dark:bg-brand-400/50"
        )}
      />
    </div>
  );
}
