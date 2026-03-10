import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

import {
  getOnboardingStatus,
  saveOnboardingGoals,
  setOnboardingComplete,
  type OnboardingGoals,
} from '@/lib/onboarding';

type OnboardingContextValue = {
  completed: boolean;
  loading: boolean;
  complete: (goals: OnboardingGoals) => Promise<void>;
  reset: () => Promise<void>;
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    getOnboardingStatus()
      .then((status) => {
        if (!mounted) return;
        setCompleted(status);
        setLoading(false);
      })
      .catch(() => {
        if (!mounted) return;
        setCompleted(false);
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const value = useMemo<OnboardingContextValue>(
    () => ({
      completed,
      loading,
      complete: async (goals) => {
        await saveOnboardingGoals(goals);
        await setOnboardingComplete(true);
        setCompleted(true);
      },
      reset: async () => {
        await setOnboardingComplete(false);
        setCompleted(false);
      },
    }),
    [completed, loading]
  );

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within OnboardingProvider');
  }
  return context;
}
