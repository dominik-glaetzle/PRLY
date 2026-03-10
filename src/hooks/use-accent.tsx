import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type AccentOption = {
  key: string;
  label: string;
  value: string;
};

const ACCENT_STORAGE_KEY = 'accent-color';

const ACCENT_OPTIONS: AccentOption[] = [
  { key: 'orange', label: 'Orange', value: '#F97316' },
  { key: 'amber', label: 'Amber', value: '#F59E0B' },
  { key: 'rose', label: 'Rose', value: '#F43F5E' },
  { key: 'blue', label: 'Blue', value: '#3B82F6' },
  { key: 'emerald', label: 'Emerald', value: '#10B981' },
];

type AccentContextValue = {
  accent: AccentOption;
  options: AccentOption[];
  setAccent: (key: string) => Promise<void>;
  loading: boolean;
};

const AccentContext = createContext<AccentContextValue | null>(null);

export function AccentProvider({ children }: { children: React.ReactNode }) {
  const [accent, setAccentState] = useState<AccentOption>(ACCENT_OPTIONS[0]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(ACCENT_STORAGE_KEY)
      .then((stored) => {
        if (!mounted) return;
        const found = ACCENT_OPTIONS.find((option) => option.key === stored);
        if (found) {
          setAccentState(found);
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const setAccent = useCallback(async (key: string) => {
    const found = ACCENT_OPTIONS.find((option) => option.key === key);
    if (!found) return;
    setAccentState(found);
    await AsyncStorage.setItem(ACCENT_STORAGE_KEY, found.key);
  }, []);

  const value = useMemo(
    () => ({ accent, options: ACCENT_OPTIONS, setAccent, loading }),
    [accent, setAccent, loading]
  );

  return <AccentContext.Provider value={value}>{children}</AccentContext.Provider>;
}

export function useAccentColor() {
  const context = useContext(AccentContext);
  if (!context) {
    throw new Error('useAccentColor must be used within AccentProvider');
  }
  return context;
}
