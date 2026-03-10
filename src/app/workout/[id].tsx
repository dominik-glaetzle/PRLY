import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card } from '@/components/ui/card';
import { PrimaryButton } from '@/components/ui/primary-button';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useI18n } from '@/i18n';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';
import { WorkoutWithExercises } from '@/types/workout';

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const router = useRouter();
  const theme = useTheme();
  const { formatDate, formatNumber, t } = useI18n();
  const [workout, setWorkout] = useState<WorkoutWithExercises | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exerciseName, setExerciseName] = useState('');
  const [exerciseSets, setExerciseSets] = useState('1');
  const [exerciseReps, setExerciseReps] = useState('10');
  const [exerciseWeight, setExerciseWeight] = useState('20');
  const [exerciseNote, setExerciseNote] = useState('');
  const [saving, setSaving] = useState(false);

  const userId = session?.user.id;

  const formatMetric = useCallback(
    (value: number) =>
      formatNumber(value, {
        minimumFractionDigits: Number.isInteger(value) ? 0 : 1,
        maximumFractionDigits: 1,
      }),
    [formatNumber]
  );

  const loadWorkout = useCallback(async () => {
    if (!id || !userId) return;
    setError(null);
    const { data, error: fetchError } = await supabase
      .from('workouts')
      .select(
        'id, user_id, name, date, duration_minutes, created_at, exercises(id, workout_id, name, sets, reps, weight, note)'
      )
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (fetchError) {
      setError(fetchError.message);
      return;
    }

    setWorkout(data as WorkoutWithExercises);
  }, [id, userId]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    loadWorkout()
      .catch(() => null)
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [loadWorkout]);

  const totalVolume = useMemo(() => {
    if (!workout?.exercises) return 0;
    return workout.exercises.reduce(
      (sum, exercise) => sum + exercise.weight * exercise.reps * exercise.sets,
      0
    );
  }, [workout]);

  const handleAddExercise = useCallback(async () => {
    if (!id || !exerciseName.trim()) return;
    const setsInput = exerciseSets.trim();
    const sets = setsInput ? Number(setsInput) : 1;
    const reps = Number(exerciseReps);
    const weight = Number(exerciseWeight);

    if (!Number.isFinite(reps) || reps <= 0) {
      setError(t('workout.validation.reps'));
      return;
    }

    if (setsInput && (!Number.isFinite(sets) || sets <= 0)) {
      setError(t('workout.validation.sets'));
      return;
    }

    if (!Number.isFinite(weight) || weight < 0) {
      setError(t('workout.validation.weight'));
      return;
    }

    setSaving(true);
    setError(null);

    const { error: insertError } = await supabase.from('exercises').insert({
      workout_id: id,
      name: exerciseName.trim(),
      sets,
      reps,
      weight,
      note: exerciseNote.trim() ? exerciseNote.trim() : null,
    });

    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }

    setExerciseName('');
    setExerciseNote('');
    await loadWorkout();
    setSaving(false);
  }, [exerciseName, exerciseReps, exerciseSets, exerciseWeight, id, loadWorkout, t]);

  const handleDeleteWorkout = useCallback(() => {
    Alert.alert(t('workout.deleteAlert.title'), t('workout.deleteAlert.message'), [
      { text: t('workout.deleteAlert.cancel'), style: 'cancel' },
      {
        text: t('workout.deleteAlert.confirm'),
        style: 'destructive',
        onPress: async () => {
          if (!id || !userId) return;
          const { error: deleteError } = await supabase
            .from('workouts')
            .delete()
            .eq('id', id)
            .eq('user_id', userId);

          if (deleteError) {
            setError(deleteError.message);
            return;
          }

          router.back();
        },
      },
    ]);
  }, [id, router, t, userId]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {loading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color={theme.text} />
          </View>
        ) : workout ? (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <ThemedView style={styles.header}>
              <ThemedText type="subtitle">{workout.name}</ThemedText>
              <ThemedText themeColor="textSecondary">
                {t('workouts.workoutMeta', {
                  date: formatDate(workout.date, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  }),
                  minutes: workout.duration_minutes,
                })}
              </ThemedText>
            </ThemedView>

            {error ? <ThemedText style={{ color: theme.danger }}>{error}</ThemedText> : null}

            <Card>
              <ThemedText type="small">{t('workout.trainingVolume')}</ThemedText>
              <ThemedText type="subtitle">
                {formatMetric(totalVolume)} {t('common.kilogramsShort')}
              </ThemedText>
            </Card>

            <ThemedView style={styles.sectionHeader}>
              <ThemedText type="smallBold">{t('workout.exercises')}</ThemedText>
              <ThemedText themeColor="textSecondary">
                {t(
                  (workout.exercises?.length ?? 0) === 1
                    ? 'workout.entries_one'
                    : 'workout.entries_other',
                  { count: workout.exercises?.length ?? 0 }
                )}
              </ThemedText>
            </ThemedView>

            {workout.exercises?.length ? (
              workout.exercises.map((exercise) => (
                <Card key={exercise.id}>
                  <ThemedText type="smallBold">{exercise.name}</ThemedText>
                  <ThemedText themeColor="textSecondary">
                    {t('workout.exerciseSummary', {
                      sets: exercise.sets,
                      reps: exercise.reps,
                      weight: formatMetric(exercise.weight),
                    })}
                  </ThemedText>
                  {exercise.note ? (
                    <ThemedText themeColor="textSecondary">{exercise.note}</ThemedText>
                  ) : null}
                </Card>
              ))
            ) : (
              <Card>
                <ThemedText themeColor="textSecondary">
                  {t('workout.noExercises')}
                </ThemedText>
              </Card>
            )}

            <ThemedText type="smallBold">{t('workout.newExercise')}</ThemedText>
            <Card style={styles.formCard}>
              <TextField
                value={exerciseName}
                onChangeText={setExerciseName}
                placeholder={t('workout.placeholders.exerciseName')}
              />
              <TextField
                value={exerciseNote}
                onChangeText={setExerciseNote}
                placeholder={t('workout.placeholders.note')}
              />
              <View style={styles.row}>
                <TextField
                  value={exerciseSets}
                  onChangeText={setExerciseSets}
                  placeholder={t('workout.placeholders.sets')}
                  keyboardType="number-pad"
                  style={styles.rowInput}
                />
                <TextField
                  value={exerciseReps}
                  onChangeText={setExerciseReps}
                  placeholder={t('workout.placeholders.reps')}
                  keyboardType="number-pad"
                  style={styles.rowInput}
                />
                <TextField
                  value={exerciseWeight}
                  onChangeText={setExerciseWeight}
                  placeholder={t('workout.placeholders.weight')}
                  keyboardType="decimal-pad"
                  style={styles.rowInput}
                />
              </View>
              <PrimaryButton label={t('workout.addExercise')} loading={saving} onPress={handleAddExercise} />
            </Card>

            <PrimaryButton
              label={t('workout.deleteWorkout')}
              variant="danger"
              onPress={handleDeleteWorkout}
            />
          </ScrollView>
        ) : (
          <Card>
            <ThemedText>{t('workout.notFound')}</ThemedText>
          </Card>
        )}
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
  },
  scrollContent: {
    gap: Spacing.three,
    paddingBottom: Spacing.four,
  },
  header: {
    gap: Spacing.one,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  formCard: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  rowInput: {
    flex: 1,
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
