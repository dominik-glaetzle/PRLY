import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimatedIcon } from '@/components/animated-icon';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Spacing } from '@/constants/theme';
import { useI18n } from '@/i18n';
import { useTheme } from '@/hooks/use-theme';

export default function WelcomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { t, tm } = useI18n();
  const highlights = tm<string[]>('onboarding.welcome.highlights');

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.glowPrimary, { backgroundColor: theme.primary }]} />
      <View style={[styles.glowSecondary, { backgroundColor: theme.backgroundSelected }]} />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.hero}>
          <View style={styles.iconWrap}>
            <AnimatedIcon />
          </View>

          <ThemedText type="title" style={styles.title}>
            {t('onboarding.welcome.title')}
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.subtitle}>
            {t('onboarding.welcome.subtitle')}
          </ThemedText>
        </View>

        <View style={styles.highlights}>
          {highlights.map((text) => (
            <View key={text} style={styles.highlightRow}>
              <View style={[styles.highlightDot, { backgroundColor: theme.primary }]} />
              <ThemedText themeColor="textSecondary" style={styles.highlightText}>
                {text}
              </ThemedText>
            </View>
          ))}
        </View>

        <View style={styles.footer}>
          <View style={styles.progress}>
            <View style={[styles.progressDot, { backgroundColor: theme.primary }]} />
            <View style={[styles.progressDot, { backgroundColor: theme.border }]} />
          </View>
          <PrimaryButton label={t('onboarding.welcome.cta')} onPress={() => router.push('/(onboarding)/goals')} />
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    padding: Spacing.four,
    gap: Spacing.four,
  },
  hero: {
    gap: Spacing.three,
    alignItems: 'flex-start',
  },
  iconWrap: {
    alignSelf: 'flex-start',
    transform: [{ scale: 0.9 }],
  },
  title: {
    fontSize: 42,
    lineHeight: 46,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
  },
  highlights: {
    gap: Spacing.two,
  },
  highlightRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'center',
  },
  highlightDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
  highlightText: {
    flex: 1,
  },
  footer: {
    marginTop: 'auto',
    gap: Spacing.three,
  },
  progress: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
  progressDot: {
    width: 18,
    height: 6,
    borderRadius: 999,
  },
  glowPrimary: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 999,
    opacity: 0.18,
    top: -120,
    right: -80,
  },
  glowSecondary: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 999,
    opacity: 0.12,
    bottom: -80,
    left: -60,
  },
});
