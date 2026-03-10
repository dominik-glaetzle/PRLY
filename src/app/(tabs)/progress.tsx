import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { LineChart } from 'react-native-chart-kit';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleProp,
  StyleSheet,
  useWindowDimensions,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card } from '@/components/ui/card';
import { PrimaryButton } from '@/components/ui/primary-button';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useI18n } from '@/i18n';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';
import { WorkoutWithExercises } from '@/types/workout';

const DEFAULT_DURATION = 45;
const WEEKS_TO_SHOW = 8;

function startOfWeek(date: Date) {
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const start = new Date(date);
  start.setDate(diff);
  start.setHours(0, 0, 0, 0);
  return start;
}

function endOfWeek(date: Date) {
  const end = startOfWeek(date);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

function toRgba(hex: string, opacity: number) {
  const normalized = hex.replace('#', '');
  const value = normalized.length === 3 ? normalized.replace(/./g, '$&$&') : normalized;
  const color = parseInt(value, 16);
  const r = (color >> 16) & 255;
  const g = (color >> 8) & 255;
  const b = color & 255;
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

function MetricCard({
  detail,
  highlight = false,
  label,
  style,
  value,
}: {
  detail: string;
  highlight?: boolean;
  label: string;
  style?: StyleProp<ViewStyle>;
  value: string;
}) {
  const theme = useTheme();

  return (
    <Card
      style={[
        styles.metricCard,
        highlight && { backgroundColor: theme.primarySoft },
        style,
      ]}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="subtitle">{value}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {detail}
      </ThemedText>
    </Card>
  );
}

function MetaPill({
  icon,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof Feather>['name'];
  label: string;
  value: string;
}) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.metaPill,
        {
          backgroundColor: theme.background,
          borderColor: theme.border,
        },
      ]}>
      <View style={[styles.metaIcon, { backgroundColor: theme.primarySoft }]}>
        <Feather name={icon} size={14} color={theme.primary} />
      </View>

      <View style={styles.metaCopy}>
        <ThemedText type="small" themeColor="textSecondary">
          {label}
        </ThemedText>
        <ThemedText type="smallBold">{value}</ThemedText>
      </View>
    </View>
  );
}

export default function ProgressScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const theme = useTheme();
  const { formatDate, formatNumber, t } = useI18n();
  const { width } = useWindowDimensions();
  const [workouts, setWorkouts] = useState<WorkoutWithExercises[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userId = session?.user.id;

  const loadProgress = useCallback(async () => {
    if (!userId) {
      setWorkouts([]);
      setError(null);
      return;
    }

    setError(null);

    const startDate = startOfWeek(new Date());
    startDate.setDate(startDate.getDate() - (WEEKS_TO_SHOW - 1) * 7);

    const { data, error: fetchError } = await supabase
      .from('workouts')
      .select('id, user_id, name, date, duration_minutes, created_at, exercises(sets, reps, weight)')
      .eq('user_id', userId)
      .gte('date', startDate.toISOString())
      .order('date', { ascending: true });

    if (fetchError) {
      setError(fetchError.message);
      return;
    }

    setWorkouts((data ?? []) as WorkoutWithExercises[]);
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      setLoading(true);
      loadProgress()
        .catch(() => null)
        .finally(() => {
          if (active) {
            setLoading(false);
          }
        });

      return () => {
        active = false;
      };
    }, [loadProgress])
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadProgress();
    setRefreshing(false);
  }, [loadProgress]);

  const handleCreateWorkout = useCallback(async () => {
    if (!userId) {
      return;
    }

    setCreating(true);
    const now = new Date();

    const { data, error: insertError } = await supabase
      .from('workouts')
      .insert({
        user_id: userId,
        name: t('workout.defaultName', { date: formatDate(now) }),
        date: now.toISOString(),
        duration_minutes: DEFAULT_DURATION,
      })
      .select('id, user_id, name, date, duration_minutes, created_at')
      .single();

    setCreating(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    const nextWorkout = {
      ...(data as WorkoutWithExercises),
      exercises: [],
    };

    setError(null);
    setWorkouts((current) => [...current, nextWorkout]);
    router.push({ pathname: '/workout/[id]', params: { id: nextWorkout.id } });
  }, [formatDate, router, t, userId]);

  const contentWidth = Math.min(Math.max(width - Spacing.four * 2, 0), MaxContentWidth);
  const chartWidth = Math.max(contentWidth - Spacing.four * 2, 180);
  const metricCardWidth = width < 460 ? '100%' : width < 760 ? '48%' : '31.8%';

  const summary = useMemo(() => {
    const weekStarts: Date[] = [];
    const currentWeekStart = startOfWeek(new Date());

    for (let i = WEEKS_TO_SHOW - 1; i >= 0; i -= 1) {
      const weekStart = new Date(currentWeekStart);
      weekStart.setDate(weekStart.getDate() - i * 7);
      weekStarts.push(weekStart);
    }

    const countsMap = new Map<string, number>();
    const volumeMap = new Map<string, number>();
    let totalDuration = 0;
    let totalWorkouts = 0;
    let totalVolume = 0;

    workouts.forEach((workout) => {
      const weekKey = startOfWeek(new Date(workout.date)).toISOString();
      countsMap.set(weekKey, (countsMap.get(weekKey) ?? 0) + 1);
      totalDuration += workout.duration_minutes;
      totalWorkouts += 1;

      const exerciseVolume =
        workout.exercises?.reduce(
          (sum, exercise) =>
            sum + exercise.weight * exercise.reps * (Number.isFinite(exercise.sets) ? exercise.sets : 1),
          0
        ) ?? 0;

      if (exerciseVolume > 0) {
        volumeMap.set(weekKey, (volumeMap.get(weekKey) ?? 0) + exerciseVolume);
        totalVolume += exerciseVolume;
      }
    });

    const labels = weekStarts.map((date, index) =>
      width < 390 && index % 2 === 1 ? '' : formatDate(date, { month: 'short', day: 'numeric' })
    );
    const workoutCounts = weekStarts.map((date) => countsMap.get(date.toISOString()) ?? 0);
    const volumeTotals = weekStarts.map((date) => volumeMap.get(date.toISOString()) ?? 0);
    const rangeStart = weekStarts[0] ?? currentWeekStart;
    const rangeEnd = endOfWeek(weekStarts[weekStarts.length - 1] ?? currentWeekStart);

    return {
      labels,
      workoutCounts,
      volumeTotals,
      rangeEnd,
      rangeStart,
      activeWeeks: workoutCounts.filter((count) => count > 0).length,
      avgDuration: totalWorkouts ? Math.round(totalDuration / totalWorkouts) : 0,
      bestWeekCount: Math.max(...workoutCounts, 0),
      currentWeekCount: workoutCounts[workoutCounts.length - 1] ?? 0,
      currentWeekVolume: volumeTotals[volumeTotals.length - 1] ?? 0,
      previousWeekCount: workoutCounts[workoutCounts.length - 2] ?? 0,
      previousWeekVolume: volumeTotals[volumeTotals.length - 2] ?? 0,
      totalVolume,
      totalWorkouts,
    };
  }, [formatDate, width, workouts]);

  const rangeLabel = `${formatDate(summary.rangeStart, {
    month: 'short',
    day: 'numeric',
  })} - ${formatDate(summary.rangeEnd, {
    month: 'short',
    day: 'numeric',
  })}`;
  const consistencyRatio = summary.activeWeeks / WEEKS_TO_SHOW;
  const hasWorkouts = workouts.length > 0;
  const formatRoundedNumber = (value: number) => formatNumber(Math.round(value));
  const formatSignedNumber = (value: number) =>
    `${value > 0 ? '+' : ''}${formatNumber(Math.round(value))}`;

  const chartConfig = useMemo(
    () => ({
      backgroundGradientFrom: theme.backgroundElement,
      backgroundGradientTo: theme.backgroundElement,
      fillShadowGradientFrom: toRgba(theme.primary, 0.28),
      fillShadowGradientTo: toRgba(theme.primary, 0.02),
      fillShadowGradientFromOpacity: 0.3,
      fillShadowGradientToOpacity: 0.02,
      color: (opacity = 1) => toRgba(theme.primary, opacity),
      labelColor: (opacity = 1) => toRgba(theme.textSecondary, opacity),
      decimalPlaces: 0,
      propsForDots: {
        r: '4',
        strokeWidth: '2',
        stroke: theme.background,
      },
      propsForBackgroundLines: {
        stroke: theme.border,
        strokeDasharray: '',
      },
      propsForLabels: {
        fontSize: 11,
      },
    }),
    [theme]
  );

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {loading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color={theme.primary} />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
            showsVerticalScrollIndicator={false}>
            <View style={styles.contentWrap}>
              <View style={styles.headerRow}>
                <View style={styles.headerCopy}>
                  <ThemedText type="small" themeColor="textSecondary">
                    {rangeLabel}
                  </ThemedText>
                  <ThemedText type="subtitle">{t('progress.title')}</ThemedText>
                  <ThemedText themeColor="textSecondary">{t('progress.subtitle')}</ThemedText>
                </View>

                <Pressable
                  onPress={() => router.push('/workouts')}
                  style={({ pressed }) => [styles.headerLink, pressed && styles.pressed]}>
                  <ThemedText type="linkPrimary">{t('dashboard.allWorkouts')}</ThemedText>
                </Pressable>
              </View>

              <ThemedView
                style={[
                  styles.heroCard,
                  {
                    backgroundColor: theme.primarySoft,
                    borderColor: theme.primaryMuted,
                  },
                ]}>
                <View
                  style={[
                    styles.heroGlowLarge,
                    {
                      backgroundColor: theme.primaryMuted,
                    },
                  ]}
                />
                <View
                  style={[
                    styles.heroGlowSmall,
                    {
                      backgroundColor: theme.primary,
                    },
                  ]}
                />

                <View style={styles.heroContent}>
                  <View style={styles.heroTopRow}>
                    <View style={styles.heroCopy}>
                      <ThemedText
                        type="smallBold"
                        style={[styles.heroEyebrow, { color: theme.primary }]}>
                        {t('progress.heroEyebrow', { count: WEEKS_TO_SHOW })}
                      </ThemedText>
                      <ThemedText type="subtitle">{t('progress.heroTitle')}</ThemedText>
                      <ThemedText themeColor="textSecondary">
                        {t('progress.heroSubtitle')}
                      </ThemedText>
                    </View>

                    <View style={[styles.heroBadge, { backgroundColor: theme.background }]}>
                      <ThemedText type="small" themeColor="textSecondary">
                        {t('progress.activeWeeks')}
                      </ThemedText>
                      <ThemedText style={[styles.heroBadgeValue, { color: theme.primary }]}>
                        {`${summary.activeWeeks}/${WEEKS_TO_SHOW}`}
                      </ThemedText>
                    </View>
                  </View>

                  <View style={styles.heroStatsRow}>
                    <View style={[styles.heroStat, { backgroundColor: theme.background }]}>
                      <ThemedText type="small" themeColor="textSecondary">
                        {t('progress.sessionsLogged')}
                      </ThemedText>
                      <ThemedText type="subtitle">{formatNumber(summary.totalWorkouts)}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {t('dashboard.sessions')}
                      </ThemedText>
                    </View>

                    <View style={[styles.heroStat, { backgroundColor: theme.background }]}>
                      <ThemedText type="small" themeColor="textSecondary">
                        {t('progress.volumeTracked')}
                      </ThemedText>
                      <ThemedText type="subtitle">
                        {formatRoundedNumber(summary.totalVolume)}
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {t('common.kilogramsShort')}
                      </ThemedText>
                    </View>
                  </View>

                  <PrimaryButton
                    label={t('dashboard.newWorkout')}
                    loading={creating}
                    onPress={handleCreateWorkout}
                  />
                </View>
              </ThemedView>

              {error ? (
                <Card style={[styles.errorCard, { borderColor: theme.danger }]}>
                  <ThemedText type="smallBold" style={{ color: theme.danger }}>
                    {t('dashboard.failedToLoad')}
                  </ThemedText>
                  <ThemedText themeColor="textSecondary">{error}</ThemedText>
                </Card>
              ) : null}

              <View style={styles.metricsGrid}>
                <MetricCard
                  detail={t('progress.weekChange', {
                    count: formatSignedNumber(summary.currentWeekCount - summary.previousWeekCount),
                  })}
                  highlight
                  label={t('progress.thisWeek')}
                  style={{ width: metricCardWidth }}
                  value={formatNumber(summary.currentWeekCount)}
                />
                <MetricCard
                  detail={t('dashboard.sessions')}
                  label={t('progress.bestWeek')}
                  style={{ width: metricCardWidth }}
                  value={formatNumber(summary.bestWeekCount)}
                />
                <MetricCard
                  detail={t(
                    workouts.length === 1
                      ? 'progress.basedOnSessions_one'
                      : 'progress.basedOnSessions_other',
                    { count: workouts.length }
                  )}
                  label={t('progress.averageDuration')}
                  style={{ width: metricCardWidth }}
                  value={t('progress.durationMeta', { minutes: summary.avgDuration })}
                />
              </View>

              {hasWorkouts ? (
                <>
                  <Card style={styles.chartCard}>
                    <View style={styles.sectionHeader}>
                      <View style={styles.sectionCopy}>
                        <ThemedText type="smallBold">{t('progress.workoutsPerWeek')}</ThemedText>
                        <ThemedText themeColor="textSecondary">
                          {t('progress.weeklySessionsSubtitle', { count: WEEKS_TO_SHOW })}
                        </ThemedText>
                      </View>

                      <View
                        style={[
                          styles.sectionBadge,
                          { backgroundColor: theme.primarySoft, borderColor: theme.primaryMuted },
                        ]}>
                        <ThemedText type="small" themeColor="textSecondary">
                          {t('progress.thisWeek')}
                        </ThemedText>
                        <ThemedText type="smallBold" style={{ color: theme.primary }}>
                          {formatNumber(summary.currentWeekCount)}
                        </ThemedText>
                      </View>
                    </View>

                    <LineChart
                      data={{ labels: summary.labels, datasets: [{ data: summary.workoutCounts }] }}
                      width={chartWidth}
                      height={232}
                      chartConfig={chartConfig}
                      bezier
                      fromZero
                      segments={4}
                      style={styles.chart}
                    />

                    <View style={styles.metaRow}>
                      <MetaPill
                        icon="calendar"
                        label={t('progress.thisWeek')}
                        value={`${formatNumber(summary.currentWeekCount)} ${t('dashboard.sessions')}`}
                      />
                      <MetaPill
                        icon="rotate-ccw"
                        label={t('progress.lastWeek')}
                        value={`${formatNumber(summary.previousWeekCount)} ${t('dashboard.sessions')}`}
                      />
                      <MetaPill
                        icon="trending-up"
                        label={t('progress.bestWeek')}
                        value={`${formatNumber(summary.bestWeekCount)} ${t('dashboard.sessions')}`}
                      />
                    </View>
                  </Card>

                  <Card style={styles.chartCard}>
                    <View style={styles.sectionHeader}>
                      <View style={styles.sectionCopy}>
                        <ThemedText type="smallBold">{t('progress.volumeKg')}</ThemedText>
                        <ThemedText themeColor="textSecondary">
                          {t('progress.weeklyVolumeSubtitle')}
                        </ThemedText>
                      </View>

                      <View
                        style={[
                          styles.sectionBadge,
                          { backgroundColor: theme.primarySoft, borderColor: theme.primaryMuted },
                        ]}>
                        <ThemedText type="small" themeColor="textSecondary">
                          {t('progress.thisWeek')}
                        </ThemedText>
                        <ThemedText type="smallBold" style={{ color: theme.primary }}>
                          {formatRoundedNumber(summary.currentWeekVolume)}
                        </ThemedText>
                      </View>
                    </View>

                    <LineChart
                      data={{ labels: summary.labels, datasets: [{ data: summary.volumeTotals }] }}
                      width={chartWidth}
                      height={232}
                      chartConfig={chartConfig}
                      bezier
                      fromZero
                      segments={4}
                      style={styles.chart}
                    />

                    <View style={styles.metaRow}>
                      <MetaPill
                        icon="activity"
                        label={t('progress.thisWeek')}
                        value={`${formatRoundedNumber(summary.currentWeekVolume)} ${t('common.kilogramsShort')}`}
                      />
                      <MetaPill
                        icon="repeat"
                        label={t('progress.lastWeek')}
                        value={`${formatRoundedNumber(summary.previousWeekVolume)} ${t('common.kilogramsShort')}`}
                      />
                      <MetaPill
                        icon="bar-chart-2"
                        label={t('progress.weekChangeLabel')}
                        value={`${formatSignedNumber(
                          summary.currentWeekVolume - summary.previousWeekVolume
                        )} ${t('common.kilogramsShort')}`}
                      />
                    </View>
                  </Card>

                  <Card style={styles.consistencyCard}>
                    <View style={styles.sectionHeader}>
                      <View style={styles.sectionCopy}>
                        <ThemedText type="smallBold">{t('progress.consistencyTitle')}</ThemedText>
                        <ThemedText themeColor="textSecondary">
                          {t('progress.consistencyBody', {
                            count: summary.activeWeeks,
                            total: WEEKS_TO_SHOW,
                          })}
                        </ThemedText>
                      </View>

                      <View
                        style={[
                          styles.consistencyBadge,
                          { backgroundColor: theme.primarySoft, borderColor: theme.primaryMuted },
                        ]}>
                        <ThemedText type="smallBold" style={{ color: theme.primary }}>
                          {`${Math.round(consistencyRatio * 100)}%`}
                        </ThemedText>
                      </View>
                    </View>

                    <View style={styles.goalRow}>
                      <View style={[styles.goalTrack, { backgroundColor: theme.border }]}>
                        <View
                          style={[
                            styles.goalFill,
                            {
                              backgroundColor: theme.primary,
                              width: `${consistencyRatio * 100}%`,
                            },
                          ]}
                        />
                      </View>
                      <ThemedText type="small" themeColor="textSecondary">
                        {rangeLabel}
                      </ThemedText>
                    </View>
                  </Card>
                </>
              ) : (
                <Card style={styles.emptyCard}>
                  <View style={[styles.emptyIcon, { backgroundColor: theme.primarySoft }]}>
                    <Feather name="activity" size={20} color={theme.primary} />
                  </View>
                  <ThemedText type="smallBold">{t('progress.emptyTitle')}</ThemedText>
                  <ThemedText themeColor="textSecondary">{t('progress.emptyBody')}</ThemedText>
                  <PrimaryButton
                    label={t('dashboard.createFirstWorkout')}
                    loading={creating}
                    onPress={handleCreateWorkout}
                  />
                </Card>
              )}
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.four,
  },
  contentWrap: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    gap: Spacing.three,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  headerCopy: {
    flex: 1,
    gap: Spacing.one,
  },
  headerLink: {
    paddingVertical: Spacing.one,
  },
  heroCard: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: Spacing.five,
    borderWidth: 1,
    padding: Spacing.four,
  },
  heroGlowLarge: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 999,
    top: -120,
    right: -50,
    opacity: 0.6,
  },
  heroGlowSmall: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 999,
    bottom: -72,
    left: -24,
    opacity: 0.14,
  },
  heroContent: {
    gap: Spacing.three,
  },
  heroTopRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  heroCopy: {
    flex: 1,
    minWidth: 220,
    gap: Spacing.one,
  },
  heroEyebrow: {
    letterSpacing: 1.2,
  },
  heroBadge: {
    minWidth: 120,
    borderRadius: Spacing.four,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    gap: Spacing.half,
    alignItems: 'flex-start',
  },
  heroBadgeValue: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
  },
  heroStatsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  heroStat: {
    flex: 1,
    borderRadius: Spacing.four,
    padding: Spacing.three,
    gap: Spacing.half,
  },
  errorCard: {
    borderWidth: 1,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  metricCard: {
    minHeight: 144,
    justifyContent: 'space-between',
  },
  chartCard: {
    gap: Spacing.three,
  },
  sectionHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  sectionCopy: {
    flex: 1,
    minWidth: 220,
    gap: Spacing.half,
  },
  sectionBadge: {
    borderWidth: 1,
    borderRadius: Spacing.four,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    gap: Spacing.half,
    minWidth: 96,
  },
  chart: {
    marginLeft: -8,
    borderRadius: Spacing.three,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  metaPill: {
    flexGrow: 1,
    minWidth: 164,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Spacing.four,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  metaIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaCopy: {
    flex: 1,
    gap: 2,
  },
  consistencyCard: {
    gap: Spacing.three,
  },
  consistencyBadge: {
    minWidth: 76,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Spacing.four,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  goalRow: {
    gap: Spacing.two,
  },
  goalTrack: {
    height: 12,
    borderRadius: 999,
    overflow: 'hidden',
  },
  goalFill: {
    height: '100%',
    borderRadius: 999,
  },
  emptyCard: {
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.78,
  },
});
