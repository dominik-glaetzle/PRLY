import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
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
import { Workout } from '@/types/workout';

const DEFAULT_DURATION = 45;
const LOOKBACK_DAYS = 30;

type Summary = {
  recentWorkouts: Workout[];
  lastWorkout: Workout | null;
  weekWorkouts: Workout[];
  todayWorkouts: Workout[];
  weekMinutes: number;
  weekAverage: number;
  streak: number;
  weeklyBars: Array<{ label: string; count: number; isToday: boolean }>;
};

function startOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function startOfWeek(date: Date) {
  const value = startOfDay(date);
  const day = value.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  value.setDate(value.getDate() + mondayOffset);
  return value;
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function calculateStreak(workouts: Workout[]) {
  const workoutDays = new Set(workouts.map((workout) => dateKey(new Date(workout.date))));
  let cursor = startOfDay(new Date());
  let streak = 0;

  while (workoutDays.has(dateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function buildWeeklyBars(
  weekWorkouts: Workout[],
  todayStart: Date,
  weekStart: Date,
  labels: string[]
) {
  const counts = new Array(7).fill(0);

  weekWorkouts.forEach((workout) => {
    const date = new Date(workout.date);
    const day = date.getDay();
    const index = day === 0 ? 6 : day - 1;
    counts[index] += 1;
  });

  return counts.map((count, index) => {
    const dayDate = new Date(weekStart);
    dayDate.setDate(weekStart.getDate() + index);

    return {
      label: labels[index] ?? '',
      count,
      isToday: dateKey(dayDate) === dateKey(todayStart),
    };
  });
}

function WorkoutRow({
  workout,
  onPress,
}: {
  workout: Workout;
  onPress: () => void;
}) {
  const theme = useTheme();
  const { formatDate, t } = useI18n();

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [pressed && styles.pressed]}>
      <Card style={styles.workoutRow}>
        <View style={[styles.workoutAccent, { backgroundColor: theme.primarySoft }]}>
          <ThemedText style={[styles.workoutAccentText, { color: theme.primary }]}>
            {formatDate(workout.date, { month: 'short', day: 'numeric' })}
          </ThemedText>
        </View>

        <View style={styles.workoutBody}>
          <ThemedText type="smallBold">{workout.name}</ThemedText>
          <ThemedText themeColor="textSecondary">
            {t('dashboard.sessionMeta', { minutes: workout.duration_minutes })}
          </ThemedText>
        </View>

        <ThemedText type="linkPrimary">{t('dashboard.openDetails')}</ThemedText>
      </Card>
    </Pressable>
  );
}

function WeekBars({ bars }: { bars: Summary['weeklyBars'] }) {
  const theme = useTheme();
  const maxValue = Math.max(...bars.map((bar) => bar.count), 1);

  return (
    <View style={styles.weekChart}>
      {bars.map((bar) => {
        const height = 28 + (bar.count / maxValue) * 88;

        return (
          <View key={bar.label} style={styles.weekBarColumn}>
            <View
              style={[
                styles.weekBar,
                {
                  height,
                  backgroundColor: bar.count === 0 ? theme.border : theme.primaryMuted,
                  borderColor: bar.isToday ? theme.primary : 'transparent',
                },
              ]}
            />
            <ThemedText
              type="small"
              style={[
                styles.weekBarLabel,
                { color: bar.isToday ? theme.primary : theme.textSecondary },
              ]}>
              {bar.label}
            </ThemedText>
          </View>
        );
      })}
    </View>
  );
}

export default function TodayScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const theme = useTheme();
  const { formatDate, t, tm } = useI18n();

  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userId = session?.user.id;

  const loadDashboard = useCallback(async () => {
    if (!userId) {
      setWorkouts([]);
      setError(null);
      return;
    }

    const since = new Date();
    since.setDate(since.getDate() - LOOKBACK_DAYS);

    const { data, error: fetchError } = await supabase
      .from('workouts')
      .select('id, user_id, name, date, duration_minutes, created_at')
      .eq('user_id', userId)
      .gte('date', since.toISOString())
      .order('date', { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
      return;
    }

    setError(null);
    setWorkouts((data ?? []) as Workout[]);
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      setLoading(true);
      loadDashboard().finally(() => {
        if (active) {
          setLoading(false);
        }
      });

      return () => {
        active = false;
      };
    }, [loadDashboard])
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDashboard();
    setRefreshing(false);
  }, [loadDashboard]);

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

    const nextWorkout = data as Workout;
    setError(null);
    setWorkouts((current) => [nextWorkout, ...current]);
    router.push({ pathname: '/workout/[id]', params: { id: nextWorkout.id } });
  }, [formatDate, router, t, userId]);

  const weekdayLabels = tm<string[]>('dashboard.weekdayLabels');

  const summary = useMemo<Summary>(() => {
    const todayStart = startOfDay(new Date());
    const weekStart = startOfWeek(todayStart);
    const recentWorkouts = workouts.slice(0, 3);
    const lastWorkout = recentWorkouts[0] ?? null;
    const weekWorkouts = workouts.filter((workout) => new Date(workout.date) >= weekStart);
    const todayWorkouts = workouts.filter((workout) => new Date(workout.date) >= todayStart);
    const weekMinutes = weekWorkouts.reduce(
      (total, workout) => total + workout.duration_minutes,
      0
    );
    const weekAverage = weekWorkouts.length ? Math.round(weekMinutes / weekWorkouts.length) : 0;

    return {
      recentWorkouts,
      lastWorkout,
      weekWorkouts,
      todayWorkouts,
      weekMinutes,
      weekAverage,
      streak: calculateStreak(workouts),
      weeklyBars: buildWeeklyBars(weekWorkouts, todayStart, weekStart, weekdayLabels),
    };
  }, [weekdayLabels, workouts]);

  const displayName = useMemo(() => {
    const metadata = session?.user.user_metadata ?? {};
    const candidate =
      (metadata.full_name as string | undefined) ??
      (metadata.name as string | undefined) ??
      session?.user.email?.split('@')[0];

    if (!candidate) {
      return t('dashboard.defaultAthleteName');
    }

    return candidate.charAt(0).toUpperCase() + candidate.slice(1);
  }, [session, t]);

  const goalProgress = Math.min(summary.weekWorkouts.length / 4, 1);
  const primaryActionLabel = summary.todayWorkouts.length
    ? t('dashboard.openLastWorkout')
    : t('dashboard.newWorkout');
  const todayCopy = summary.todayWorkouts.length
    ? t(
        summary.todayWorkouts.length === 1
          ? 'dashboard.todayLogged_one'
          : 'dashboard.todayLogged_other',
        { count: summary.todayWorkouts.length }
      )
    : t('dashboard.todayNone');
  const streakCopy = t(
    summary.streak === 1 ? 'dashboard.streakDay_one' : 'dashboard.streakDay_other',
    { count: summary.streak }
  );

  const handlePrimaryAction = useCallback(() => {
    if (summary.todayWorkouts[0]) {
      router.push({
        pathname: '/workout/[id]',
        params: { id: summary.todayWorkouts[0].id },
      });
      return;
    }

    handleCreateWorkout();
  }, [handleCreateWorkout, router, summary.todayWorkouts]);

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        {loading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color={theme.primary} />
          </View>
        ) : (
          <ScrollView
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}>
            <View style={styles.contentWrap}>
              <View style={styles.headerRow}>
                <View style={styles.headerCopy}>
                  <ThemedText type="small" themeColor="textSecondary">
                    {formatDate(new Date(), {
                      month: 'long',
                      day: 'numeric',
                      weekday: 'long',
                    })}
                  </ThemedText>
                  <ThemedText type="subtitle">
                    {t('dashboard.greeting', { name: displayName })}
                  </ThemedText>
                </View>

                <Pressable
                  onPress={() => router.push('/workouts')}
                  style={({ pressed }) => [styles.headerLink, pressed && styles.pressed]}>
                  <ThemedText type="linkPrimary">{t('dashboard.allWorkouts')}</ThemedText>
                </Pressable>
              </View>

              <View
                style={[
                  styles.heroCard,
                  { backgroundColor: theme.primarySoft, borderColor: theme.primaryMuted },
                ]}>
                <View style={styles.heroTopRow}>
                  <View style={styles.heroCopy}>
                    <ThemedText
                      type="smallBold"
                      style={[styles.heroEyebrow, { color: theme.primary }]}>
                      {t('dashboard.todayEyebrow')}
                    </ThemedText>
                    <ThemedText type="subtitle">{t('dashboard.heroTitle')}</ThemedText>
                    <ThemedText themeColor="textSecondary">{todayCopy}</ThemedText>
                  </View>

                  <View style={[styles.heroBadge, { backgroundColor: theme.primaryMuted }]}>
                    <ThemedText type="small" style={{ color: theme.primary }}>
                      {streakCopy}
                    </ThemedText>
                    <ThemedText type="smallBold" style={{ color: theme.primary }}>
                      {t('dashboard.streakLabel')}
                    </ThemedText>
                  </View>
                </View>

                <View style={styles.heroStatsRow}>
                  <View style={[styles.heroStat, { backgroundColor: theme.background }]}>
                    <ThemedText type="small" themeColor="textSecondary">
                      {t('dashboard.thisWeek')}
                    </ThemedText>
                    <ThemedText type="subtitle">{summary.weekWorkouts.length}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {t('dashboard.sessions')}
                    </ThemedText>
                  </View>

                  <View style={[styles.heroStat, { backgroundColor: theme.background }]}>
                    <ThemedText type="small" themeColor="textSecondary">
                      {t('dashboard.minutes')}
                    </ThemedText>
                    <ThemedText type="subtitle">{summary.weekMinutes}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {t('dashboard.total')}
                    </ThemedText>
                  </View>
                </View>

                <PrimaryButton
                  label={primaryActionLabel}
                  loading={creating}
                  onPress={handlePrimaryAction}
                />
              </View>

              {error ? (
                <Card style={[styles.errorCard, { borderColor: theme.danger }]}>
                  <ThemedText type="smallBold" style={{ color: theme.danger }}>
                    {t('dashboard.failedToLoad')}
                  </ThemedText>
                  <ThemedText themeColor="textSecondary">{error}</ThemedText>
                </Card>
              ) : null}

              <View style={styles.metricsGrid}>
                <Card style={[styles.metricCard, { backgroundColor: theme.backgroundElement }]}>
                  <ThemedText type="small" themeColor="textSecondary">
                    {t('dashboard.avgSession')}
                  </ThemedText>
                  <ThemedText type="subtitle">{summary.weekAverage}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {t('common.minutesShort')}
                  </ThemedText>
                </Card>

                <Card style={[styles.metricCard, { backgroundColor: theme.backgroundElement }]}>
                  <ThemedText type="small" themeColor="textSecondary">
                    {t('dashboard.today')}
                  </ThemedText>
                  <ThemedText type="subtitle">{summary.todayWorkouts.length}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {t('dashboard.logged')}
                  </ThemedText>
                </Card>

                <Card style={[styles.metricCard, { backgroundColor: theme.backgroundElement }]}>
                  <ThemedText type="small" themeColor="textSecondary">
                    {t('dashboard.currentStreak')}
                  </ThemedText>
                  <ThemedText type="subtitle">{summary.streak}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {t('dashboard.days')}
                  </ThemedText>
                </Card>
              </View>

              <Card style={styles.chartCard}>
                <View style={styles.sectionHeader}>
                  <View>
                    <ThemedText type="smallBold">{t('dashboard.weeklyRhythm')}</ThemedText>
                    <ThemedText themeColor="textSecondary">
                      {t('dashboard.weeklyActivity')}
                    </ThemedText>
                  </View>

                  <Pressable
                    onPress={() => router.push('/progress')}
                    style={({ pressed }) => [styles.headerLink, pressed && styles.pressed]}>
                    <ThemedText type="linkPrimary">{t('tabs.progress')}</ThemedText>
                  </Pressable>
                </View>

                <WeekBars bars={summary.weeklyBars} />

                <View style={styles.goalRow}>
                  <View style={[styles.goalTrack, { backgroundColor: theme.border }]}>
                    <View
                      style={[
                        styles.goalFill,
                        { backgroundColor: theme.primary, width: `${goalProgress * 100}%` },
                      ]}
                    />
                  </View>
                  <ThemedText type="small" themeColor="textSecondary">
                    {t('dashboard.weeklyGoal', { count: summary.weekWorkouts.length })}
                  </ThemedText>
                </View>
              </Card>

              <View style={styles.sectionHeader}>
                <View>
                  <ThemedText type="smallBold">{t('dashboard.recentWorkouts')}</ThemedText>
                  <ThemedText themeColor="textSecondary">
                    {t('dashboard.recentSubtitle')}
                  </ThemedText>
                </View>

                {summary.recentWorkouts.length ? (
                  <Pressable
                    onPress={() => router.push('/workouts')}
                    style={({ pressed }) => [styles.headerLink, pressed && styles.pressed]}>
                    <ThemedText type="linkPrimary">{t('dashboard.seeAll')}</ThemedText>
                  </Pressable>
                ) : null}
              </View>

              {summary.recentWorkouts.length ? (
                summary.recentWorkouts.map((workout) => (
                  <WorkoutRow
                    key={workout.id}
                    workout={workout}
                    onPress={() =>
                      router.push({
                        pathname: '/workout/[id]',
                        params: { id: workout.id },
                      })
                    }
                  />
                ))
              ) : (
                <Card style={styles.emptyCard}>
                  <ThemedText type="smallBold">{t('dashboard.noWorkoutsYet')}</ThemedText>
                  <ThemedText themeColor="textSecondary">
                    {t('dashboard.createFirstWorkoutDesc')}
                  </ThemedText>
                  <PrimaryButton
                    label={t('dashboard.createFirstWorkout')}
                    loading={creating}
                    onPress={handleCreateWorkout}
                  />
                </Card>
              )}

              {summary.lastWorkout ? (
                <Card style={[styles.lastWorkoutCard, { backgroundColor: theme.primarySoft }]}>
                  <ThemedText type="smallBold" style={{ color: theme.primary }}>
                    {t('dashboard.lastSession')}
                  </ThemedText>
                  <ThemedText type="subtitle">{summary.lastWorkout.name}</ThemedText>
                  <ThemedText themeColor="textSecondary">
                    {t('dashboard.workoutMeta', {
                      date: formatDate(summary.lastWorkout.date, {
                        month: 'short',
                        day: 'numeric',
                      }),
                      minutes: summary.lastWorkout.duration_minutes,
                    })}
                  </ThemedText>
                  <Pressable
                    onPress={() =>
                      router.push({
                        pathname: '/workout/[id]',
                        params: { id: summary.lastWorkout!.id },
                      })
                    }
                    style={({ pressed }) => [styles.inlineButton, pressed && styles.pressed]}>
                    <ThemedText type="linkPrimary">{t('dashboard.openDetails')}</ThemedText>
                  </Pressable>
                </Card>
              ) : null}
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
    borderRadius: Spacing.five,
    padding: Spacing.four,
    gap: Spacing.three,
    borderWidth: 1,
  },
  heroTopRow: {
    flexDirection: 'row',
    gap: Spacing.three,
    alignItems: 'flex-start',
  },
  heroCopy: {
    flex: 1,
    gap: Spacing.one,
  },
  heroEyebrow: {
    letterSpacing: 1.2,
  },
  heroBadge: {
    minWidth: 88,
    borderRadius: Spacing.four,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
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
    gap: Spacing.two,
  },
  metricCard: {
    flex: 1,
    minHeight: 132,
    justifyContent: 'space-between',
  },
  chartCard: {
    gap: Spacing.three,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  weekChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: Spacing.two,
    minHeight: 156,
  },
  weekBarColumn: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.one,
  },
  weekBar: {
    width: '100%',
    maxWidth: 42,
    borderRadius: Spacing.two,
    borderWidth: 2,
  },
  weekBarLabel: {
    textAlign: 'center',
  },
  goalRow: {
    gap: Spacing.two,
  },
  goalTrack: {
    height: 10,
    borderRadius: 999,
    overflow: 'hidden',
  },
  goalFill: {
    height: '100%',
    borderRadius: 999,
  },
  workoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  workoutAccent: {
    width: 74,
    minHeight: 64,
    borderRadius: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
  },
  workoutAccentText: {
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '700',
  },
  workoutBody: {
    flex: 1,
    gap: Spacing.half,
  },
  emptyCard: {
    gap: Spacing.three,
  },
  lastWorkoutCard: {
    gap: Spacing.two,
  },
  inlineButton: {
    alignSelf: 'flex-start',
    paddingVertical: Spacing.one,
  },
  pressed: {
    opacity: 0.78,
  },
});
