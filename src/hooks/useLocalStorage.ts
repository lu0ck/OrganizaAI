import { useState, useEffect } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (!item) return initialValue;
      const parsed = JSON.parse(item);
      if (parsed === null || parsed === undefined || typeof parsed !== 'object') return initialValue;
      const merged = { ...initialValue, ...parsed };
      for (const key of Object.keys(initialValue)) {
        if (Array.isArray(initialValue[key]) && !Array.isArray(merged[key])) {
          merged[key] = initialValue[key];
        }
        if (initialValue[key] === null && merged[key] !== null && typeof merged[key] !== 'object') {
          merged[key] = initialValue[key];
        }
      }
      if (Array.isArray(merged.plans)) {
        merged.plans = merged.plans.map((plan: any) => {
          if (Array.isArray(plan.vacations) && plan.vacations.length > 0 && typeof plan.vacations[0] === 'string') {
            plan.vacations = plan.vacations.map((d: string) => ({ date: d, type: 'folga' as const }));
          }
          if (Array.isArray(plan.vacations) && plan.vacations.length === 0) {
            plan.vacations = [];
          }
          return plan;
        });
      }
      return merged as T;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      if (storedValue !== undefined && storedValue !== null) {
        window.localStorage.setItem(key, JSON.stringify(storedValue));
      }
    } catch (error) {
      console.error(error);
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue] as const;
}
