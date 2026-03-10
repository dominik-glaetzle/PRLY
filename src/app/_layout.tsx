import { Stack, useRouter, useSegments } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuth, AuthProvider } from '@/hooks/use-auth';
import { AccentProvider } from '@/hooks/use-accent';
import { useOnboarding, OnboardingProvider } from '@/hooks/use-onboarding';
import { I18nProvider } from '@/i18n';
import { useTheme } from '@/hooks/use-theme';

function RootLayoutNav() {
  const { session, loading } = useAuth();
  const { completed, loading: onboardingLoading } = useOnboarding();
  const segments = useSegments();
  const router = useRouter();
  const theme = useTheme();

  useEffect(() => {
    if (loading || onboardingLoading) return;
    const inAuthGroup = segments[0] === '(auth)';
    const inOnboardingGroup = segments[0] === '(onboarding)';

    if (!session) {
      if (!completed && !inOnboardingGroup) {
        router.replace('/(onboarding)/welcome');
        return;
      }

      if (completed && !inAuthGroup) {
        router.replace('/(auth)/login');
        return;
      }
    }

    if (session && (inAuthGroup || inOnboardingGroup)) {
      router.replace('/(tabs)');
    }
  }, [completed, loading, onboardingLoading, router, segments, session]);

  if (loading || onboardingLoading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <SafeAreaView style={styles.loadingSafeArea}>
          <ActivityIndicator size="large" color={theme.text} />
        </SafeAreaView>
      </ThemedView>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  return (
    <I18nProvider>
      <AccentProvider>
        <OnboardingProvider>
          <AuthProvider>
            <RootLayoutNav />
          </AuthProvider>
        </OnboardingProvider>
      </AccentProvider>
    </I18nProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
  },
  loadingSafeArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
});
