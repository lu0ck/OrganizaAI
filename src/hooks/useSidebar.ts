import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY_WIDTH = 'organizaai_sidebar_width';
const STORAGE_KEY_COLLAPSED = 'organizaai_sidebar_collapsed';

const MIN_WIDTH = 72;
const MAX_WIDTH = 400;
const DEFAULT_WIDTH = 256;
const COLLAPSED_WIDTH = 72;
const SNAP_THRESHOLD = 140;

export interface UseSidebarReturn {
  width: number;
  collapsed: boolean;
  isResizing: boolean;
  isCustom: boolean;
  toggle: () => void;
  expand: () => void;
  collapse: () => void;
  setWidth: (width: number) => void;
  startResizing: () => void;
  stopResizing: () => void;
  handleResize: (deltaX: number) => void;
}

export function useSidebar(): UseSidebarReturn {
  const [width, setWidthState] = useState<number>(() => {
    const stored = localStorage.getItem(STORAGE_KEY_WIDTH);
    return stored ? parseInt(stored, 10) : DEFAULT_WIDTH;
  });

  const [collapsed, setCollapsedState] = useState<boolean>(() => {
    const stored = localStorage.getItem(STORAGE_KEY_COLLAPSED);
    return stored === 'true';
  });

  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_WIDTH, String(width));
  }, [width]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_COLLAPSED, String(collapsed));
  }, [collapsed]);

  const setWidth = useCallback((newWidth: number) => {
    const clampedWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, newWidth));
    setWidthState(clampedWidth);
    if (clampedWidth <= COLLAPSED_WIDTH + 8) {
      setCollapsedState(true);
    } else {
      setCollapsedState(false);
    }
  }, []);

  const toggle = useCallback(() => {
    setCollapsedState(prev => {
      const newCollapsed = !prev;
      if (!newCollapsed) {
        setWidthState(DEFAULT_WIDTH);
      }
      return newCollapsed;
    });
  }, []);

  const expand = useCallback(() => {
    setCollapsedState(false);
    setWidthState(DEFAULT_WIDTH);
  }, []);

  const collapse = useCallback(() => {
    setCollapsedState(true);
    setWidthState(COLLAPSED_WIDTH);
  }, []);

  const startResizing = useCallback(() => {
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
    if (width < SNAP_THRESHOLD) {
      setCollapsedState(true);
      setWidthState(COLLAPSED_WIDTH);
    } else if (width > SNAP_THRESHOLD && width < DEFAULT_WIDTH - 20) {
      setWidthState(width);
      setCollapsedState(false);
    } else if (width >= DEFAULT_WIDTH - 20) {
      setWidthState(DEFAULT_WIDTH);
      setCollapsedState(false);
    }
  }, [width]);

  const handleResize = useCallback((deltaX: number) => {
    setWidthState(prev => {
      const newWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, prev + deltaX));
      return newWidth;
    });
  }, []);

  const isCustom = !collapsed && width !== DEFAULT_WIDTH && width !== COLLAPSED_WIDTH;

  return {
    width: collapsed ? COLLAPSED_WIDTH : width,
    collapsed,
    isResizing,
    isCustom,
    toggle,
    expand,
    collapse,
    setWidth,
    startResizing,
    stopResizing,
    handleResize,
  };
}
