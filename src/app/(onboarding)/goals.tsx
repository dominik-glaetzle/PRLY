import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Spacing } from '@/constants/theme';
import { useOnboarding } from '@/hooks/use-onboarding';
import { useI18n } from '@/i18n';
import { useTheme } from '@/hooks/use-theme';
import { type GoalId, type TrainingFrequency } from '@/lib/onboarding';

export default function GoalsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { complete } = useOnboarding();
  const { t } = useI18n();
  const [frequency, setFrequency] = useState<TrainingFrequency | null>(null);
  const [goals, setGoals] = useState<GoalId[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const frequencyOptions: { id: TrainingFrequency; label: string; description: string }[] = [
    {
      id: '1-2',
      label: t('onboarding.goals.frequencyOptions.1-2.label'),
      description: t('onboarding.goals.frequencyOptions.1-2.description'),
    },
    {
      id: '2-3',
      label: t('onboarding.goals.frequencyOptions.2-3.label'),
      description: t('onboarding.goals.frequencyOptions.2-3.description'),
    },
    {
      id: '4-5',
      label: t('onboarding.goals.frequencyOptions.4-5.label'),
      description: t('onboarding.goals.frequencyOptions.4-5.description'),
    },
    {
      id: '6+',
      label: t('onboarding.goals.frequencyOptions.6+.label'),
      description: t('onboarding.goals.frequencyOptions.6+.description'),
    },
  ];

  const goalOptions: { id: GoalId; label: string }[] = [
    { id: 'lose-fat', label: t('onboarding.goals.goalOptions.lose-fat') },
    { id: 'build-muscle', label: t('onboarding.goals.goalOptions.build-muscle') },
    { id: 'get-stronger', label: t('onboarding.goals.goalOptions.get-stronger') },
    { id: 'improve-endurance', label: t('onboarding.goals.goalOptions.improve-endurance') },
    { id: 'stay-consistent', label: t('onboarding.goals.goalOptions.stay-consistent') },
  ];

  const toggleGoal = (id: GoalId) => {
    setGoals((prev) => (prev.includes(id) ? prev.filter((goal) => goal !== id) : [...prev, id]));
  };

  const canContinue = !!frequency && goals.length > 0 && !saving;

  const handleContinue = async () => {
    if (!frequency || goals.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      await complete({ frequency, goals });
      router.replace('/(auth)/login');
    } catch (err) {
      setError(t('onboarding.goals.saveError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.glowPrimary, { backgroundColor: theme.primary }]} />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <ThemedText type="subtitle" style={styles.title}>
              {t('onboarding.goals.title')}
            </ThemedText>
            <ThemedText themeColor="textSecondary">
              {t('onboarding.goals.subtitle')}
            </ThemedText>
          </View>

          <View style={styles.section}>
            <ThemedText type="smallBold">{t('onboarding.goals.frequencyQuestion')}</ThemedText>
            <View style={styles.frequencyGrid}>
              {frequencyOptions.map((option) => {
                const selected = option.id === frequency;
                return (
                  <Pressable
                    key={option.id}
                    onPress={() => setFrequency(option.id)}
                    style={({ pressed }) => [
                      styles.frequencyCard,
                      {
                        borderColor: selected ? theme.primary : theme.border,
                        backgroundColor: selected ? theme.backgroundSelected : theme.backgroundElement,
                      },
                      pressed && styles.pressed,
                    ]}>
                    <ThemedText type="smallBold">{option.label}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {option.description}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <ThemedText type="smallBold">{t('onboarding.goals.goalQuestion')}</ThemedText>
            <View style={styles.goalsGrid}>
              {goalOptions.map((option) => {
                const selected = goals.includes(option.id);
                return (
                  <Pressable
                    key={option.id}
                    onPress={() => toggleGoal(option.id)}
                    style={({ pressed }) => [
                      styles.goalChip,
                      {
                        borderColor: selected ? theme.primary : theme.border,
                        backgroundColor: selected ? theme.primary : theme.backgroundElement,
                      },
                      pressed && styles.pressed,
                    ]}>
                    <ThemedText style={{ color: selected ? '#ffffff' : theme.text }}>
                      {option.label}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {error ? <ThemedText style={{ color: theme.danger }}>{error}</ThemedText> : null}

          <View style={styles.footer}>
            <View style={styles.progress}>
              <View style={[styles.progressDot, { backgroundColor: theme.border }]} />
              <View style={[styles.progressDot, { backgroundColor: theme.primary }]} />
            </View>
            <View style={styles.actions}>
              <PrimaryButton
                label={t('onboarding.goals.back')}
                variant="secondary"
                onPress={() => router.replace('/(onboarding)/welcome')}
              />
              <PrimaryButton label={t('onboarding.goals.continue')} disabled={!canContinue} loading={saving} onPress={handleContinue} />
            </View>
          </View>
        </ScrollView>
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
  },
  scrollContent: {
    padding: Spacing.four,
    gap: Spacing.four,
  },
  header: {
    gap: Spacing.two,
  },
  title: {
    fontSize: 32,
    lineHeight: 38,
  },
  section: {
    gap: Spacing.three,
  },
  frequencyGrid: {
    gap: Spacing.two,
  },
  frequencyCard: {
    borderWidth: 1,
    borderRadius: Spacing.four,
    padding: Spacing.four,
    gap: Spacing.one,
  },
  goalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  goalChip: {
    borderWidth: 1,
    borderRadius: Spacing.five,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  footer: {
    gap: Spacing.three,
    marginTop: Spacing.two,
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
  actions: {
    gap: Spacing.two,
  },
  pressed: {
    opacity: 0.8,
  },
  glowPrimary: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 999,
    opacity: 0.12,
    top: -80,
    right: -40,
  },
});
