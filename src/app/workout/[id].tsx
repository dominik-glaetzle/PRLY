import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
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
import {
  buildAutoWorkoutName,
  buildExerciseSuggestions,
  ExerciseSuggestion,
  filterExerciseSuggestions,
  parseNumericInput,
  toInputString,
} from '@/lib/workouts';
import { supabase } from '@/lib/supabase';
import { Exercise, WorkoutWithExercises } from '@/types/workout';

const WORKOUT_SELECT =
  'id, user_id, name, date, duration_minutes, created_at, exercises(id, workout_id, name, sets, reps, weight, note)';

type ExerciseForm = {
  name: string;
  note: string;
  sets: string;
  reps: string;
  weight: string;
};

const DEFAULT_FORM: ExerciseForm = { name: '', note: '', sets: '1', reps: '10', weight: '20' };

function formFromExercise(e: Exercise): ExerciseForm {
  return {
    name: e.name,
    note: e.note ?? '',
    sets: toInputString(e.sets),
    reps: toInputString(e.reps),
    weight: toInputString(e.weight),
  };
}

function formFromSuggestion(s: ExerciseSuggestion): ExerciseForm {
  return {
    name: s.name,
    note: s.lastValues.note,
    sets: toInputString(s.lastValues.sets),
    reps: toInputString(s.lastValues.reps),
    weight: toInputString(s.lastValues.weight),
  };
}

function SuggestionChips({
  form,
  suggestions,
  onApply,
}: {
  form: ExerciseForm;
  suggestions: ExerciseSuggestion[];
  onApply: (s: ExerciseSuggestion) => void;
}) {
  const { formatDate, t } = useI18n();
  const theme = useTheme();
  const filtered = useMemo(
    () => filterExerciseSuggestions(suggestions, form.name),
    [suggestions, form.name]
  );

  if (!filtered.length) return null;

  return (
    <View style={styles.suggestions}>
      <ThemedText type="small" themeColor="textSecondary">
        {t('workout.suggestions')}
      </ThemedText>
      <View style={styles.chipRow}>
        {filtered.map((s) => (
          <Pressable
            key={s.name}
            onPress={() => onApply(s)}
            style={({ pressed }) => [
              styles.chip,
              { backgroundColor: theme.backgroundSelected, borderColor: theme.border },
              pressed && styles.pressed,
            ]}>
            <ThemedText type="smallBold">{s.name}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {t('workout.suggestionMeta', {
                count: s.usageCount,
                date: formatDate(s.lastUsedAt, { month: 'short', day: 'numeric' }),
              })}
            </ThemedText>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function ExerciseFormFields({
  form,
  suggestions,
  onChangeField,
  onApplySuggestion,
}: {
  form: ExerciseForm;
  suggestions: ExerciseSuggestion[];
  onChangeField: (field: keyof ExerciseForm, value: string) => void;
  onApplySuggestion: (s: ExerciseSuggestion) => void;
}) {
  const { t } = useI18n();

  return (
    <>
      <TextField
        autoCapitalize="words"
        value={form.name}
        onChangeText={(v) => onChangeField('name', v)}
        placeholder={t('workout.placeholders.exerciseName')}
      />
      <SuggestionChips form={form} suggestions={suggestions} onApply={onApplySuggestion} />
      <TextField
        value={form.note}
        onChangeText={(v) => onChangeField('note', v)}
        placeholder={t('workout.placeholders.note')}
      />
      <View style={styles.tripleRow}>
        <TextField
          value={form.sets}
          onChangeText={(v) => onChangeField('sets', v)}
          placeholder={t('workout.placeholders.sets')}
          keyboardType="number-pad"
          style={styles.flex1}
        />
        <TextField
          value={form.reps}
          onChangeText={(v) => onChangeField('reps', v)}
          placeholder={t('workout.placeholders.reps')}
          keyboardType="number-pad"
          style={styles.flex1}
        />
        <TextField
          value={form.weight}
          onChangeText={(v) => onChangeField('weight', v)}
          placeholder={t('workout.placeholders.weight')}
          keyboardType="decimal-pad"
          style={styles.flex1}
        />
      </View>
    </>
  );
}

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const router = useRouter();
  const theme = useTheme();
  const { formatDate, formatNumber, t } = useI18n();

  const [workout, setWorkout] = useState<WorkoutWithExercises | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [nameDraft, setNameDraft] = useState('');
  const [durationDraft, setDurationDraft] = useState('');
  const [savingWorkout, setSavingWorkout] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const [suggestions, setSuggestions] = useState<ExerciseSuggestion[]>([]);

  const [newForm, setNewForm] = useState<ExerciseForm>(DEFAULT_FORM);
  const [savingExercise, setSavingExercise] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<ExerciseForm | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const userId = session?.user.id;

  const formatMetric = useCallback(
    (value: number) =>
      formatNumber(value, {
        minimumFractionDigits: Number.isInteger(value) ? 0 : 1,
        maximumFractionDigits: 1,
      }),
    [formatNumber]
  );

  const autoName = useMemo(() => {
    if (!workout) return '';
    return buildAutoWorkoutName({ date: workout.date, exercises: workout.exercises, formatDate, t });
  }, [workout, formatDate, t]);

  const usesAutoName = useMemo(
    () => !!workout && workout.name.trim() === autoName.trim(),
    [workout, autoName]
  );

  const totalVolume = useMemo(() => {
    if (!workout?.exercises) return 0;
    return workout.exercises.reduce((sum, e) => sum + e.weight * e.reps * e.sets, 0);
  }, [workout]);

  const loadWorkout = useCallback(
    async (keepAutoName?: boolean) => {
      if (!id || !userId) return null;
      setError(null);
      const { data, error: err } = await supabase
        .from('workouts')
        .select(WORKOUT_SELECT)
        .eq('id', id)
        .eq('user_id', userId)
        .single();
      if (err) { setError(err.message); return null; }

      let fetched = data as WorkoutWithExercises;
      if (keepAutoName) {
        const next = buildAutoWorkoutName({
          date: fetched.date,
          exercises: fetched.exercises,
          formatDate,
          t,
        });
        if (next !== fetched.name) {
          await supabase.from('workouts').update({ name: next }).eq('id', id).eq('user_id', userId);
          fetched = { ...fetched, name: next };
        }
      }
      setWorkout(fetched);
      return fetched;
    },
    [formatDate, id, t, userId]
  );

  const loadSuggestions = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from('workouts')
      .select('date, exercises(id, workout_id, name, sets, reps, weight, note)')
      .eq('user_id', userId)
      .order('date', { ascending: false });
    if (data) {
      setSuggestions(
        buildExerciseSuggestions(data as Pick<WorkoutWithExercises, 'date' | 'exercises'>[])
      );
    }
  }, [userId]);

  useEffect(() => {
    let active = true;
    // Only show full-screen spinner on first load
    if (!workout) setLoading(true);
    Promise.all([loadWorkout(), loadSuggestions()])
      .catch(() => null)
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, userId]);

  useEffect(() => {
    if (!workout) return;
    setNameDraft(workout.name);
    setDurationDraft(String(workout.duration_minutes));
  }, [workout]);

  const validateForm = useCallback(
    (form: ExerciseForm): string | null => {
      if (!form.name.trim()) return t('workout.validation.exerciseName');
      const sets = parseNumericInput(form.sets);
      const reps = parseNumericInput(form.reps);
      const weight = parseNumericInput(form.weight);
      if (form.sets.trim() && (!Number.isFinite(sets) || sets <= 0 || !Number.isInteger(sets)))
        return t('workout.validation.sets');
      if (!Number.isFinite(reps) || reps <= 0 || !Number.isInteger(reps))
        return t('workout.validation.reps');
      if (!Number.isFinite(weight) || weight < 0)
        return t('workout.validation.weight');
      return null;
    },
    [t]
  );

  const buildPayload = useCallback((form: ExerciseForm) => {
    const setsRaw = form.sets.trim();
    return {
      name: form.name.trim(),
      note: form.note.trim() || null,
      sets: setsRaw ? parseNumericInput(setsRaw) : 1,
      reps: parseNumericInput(form.reps),
      weight: parseNumericInput(form.weight),
    };
  }, []);

  const handleSaveWorkout = useCallback(async () => {
    if (!id || !userId) return;
    const name = nameDraft.trim();
    const duration = parseNumericInput(durationDraft);
    if (!name) { setError(t('workout.validation.name')); return; }
    if (!Number.isFinite(duration) || duration <= 0 || !Number.isInteger(duration)) {
      setError(t('workout.validation.duration'));
      return;
    }
    setSavingWorkout(true);
    setError(null);
    const { error: err } = await supabase
      .from('workouts')
      .update({ name, duration_minutes: duration })
      .eq('id', id)
      .eq('user_id', userId);
    setSavingWorkout(false);
    if (err) { setError(err.message); return; }
    setWorkout((w) => w ? { ...w, name, duration_minutes: duration } : w);
    setDetailsOpen(false);
  }, [durationDraft, id, nameDraft, t, userId]);

  const handleUseAutoName = useCallback(async () => {
    if (!id || !userId || !autoName) return;
    setSavingWorkout(true);
    const { error: err } = await supabase
      .from('workouts')
      .update({ name: autoName })
      .eq('id', id)
      .eq('user_id', userId);
    setSavingWorkout(false);
    if (err) { setError(err.message); return; }
    setNameDraft(autoName);
    setWorkout((w) => w ? { ...w, name: autoName } : w);
    setDetailsOpen(false);
  }, [autoName, id, userId]);

  const handleAddExercise = useCallback(async () => {
    if (!id) return;
    const err = validateForm(newForm);
    if (err) { setError(err); return; }
    setSavingExercise(true);
    setError(null);
    const { error: insertErr } = await supabase
      .from('exercises')
      .insert({ workout_id: id, ...buildPayload(newForm) });
    setSavingExercise(false);
    if (insertErr) { setError(insertErr.message); return; }
    setNewForm((f) => ({ ...f, name: '', note: '' }));
    await Promise.all([loadWorkout(usesAutoName), loadSuggestions()]);
  }, [buildPayload, id, loadSuggestions, loadWorkout, newForm, usesAutoName, validateForm]);

  const handleStartEdit = useCallback((exercise: Exercise) => {
    setEditingId(exercise.id);
    setEditForm(formFromExercise(exercise));
    setError(null);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
    setEditForm(null);
  }, []);

  const handleSaveExercise = useCallback(async (exerciseId: string) => {
    if (!id || !editForm) return;
    const err = validateForm(editForm);
    if (err) { setError(err); return; }
    setUpdatingId(exerciseId);
    setError(null);
    const { error: updateErr } = await supabase
      .from('exercises')
      .update(buildPayload(editForm))
      .eq('id', exerciseId)
      .eq('workout_id', id);
    setUpdatingId(null);
    if (updateErr) { setError(updateErr.message); return; }
    setEditingId(null);
    setEditForm(null);
    await Promise.all([loadWorkout(usesAutoName), loadSuggestions()]);
  }, [buildPayload, editForm, id, loadSuggestions, loadWorkout, usesAutoName, validateForm]);

  const handleDeleteExercise = useCallback((exercise: Exercise) => {
    Alert.alert(
      t('workout.deleteExerciseAlert.title'),
      t('workout.deleteExerciseAlert.message'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            if (!id) return;
            setError(null);
            const { error: err } = await supabase
              .from('exercises')
              .delete()
              .eq('id', exercise.id)
              .eq('workout_id', id);
            if (err) { setError(err.message); return; }
            if (editingId === exercise.id) { setEditingId(null); setEditForm(null); }
            await Promise.all([loadWorkout(usesAutoName), loadSuggestions()]);
          },
        },
      ]
    );
  }, [editingId, id, loadSuggestions, loadWorkout, t, usesAutoName]);

  const handleDeleteWorkout = useCallback(() => {
    Alert.alert(t('workout.deleteAlert.title'), t('workout.deleteAlert.message'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          if (!id || !userId) return;
          const { error: err } = await supabase
            .from('workouts')
            .delete()
            .eq('id', id)
            .eq('user_id', userId);
          if (err) { setError(err.message); return; }
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/(tabs)/workouts');
          }
        },
      },
    ]);
  }, [id, router, t, userId]);

  const updateNewField = useCallback(
    (field: keyof ExerciseForm, value: string) => setNewForm((f) => ({ ...f, [field]: value })),
    []
  );

  const updateEditField = useCallback(
    (field: keyof ExerciseForm, value: string) =>
      setEditForm((f) => f ? { ...f, [field]: value } : f),
    []
  );

  return (
    <ThemedView type="backgroundElement" style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {loading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color={theme.primary} />
          </View>
        ) : workout ? (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>

            {/* Header */}
            <ThemedView type="backgroundElement" style={styles.header}>
              <View style={styles.headerMain}>
                <View style={styles.headerCopy}>
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
                </View>
                <Pressable
                  onPress={() => setDetailsOpen((v) => !v)}
                  style={({ pressed }) => [
                    styles.editHeaderBtn,
                    { backgroundColor: theme.backgroundElement },
                    pressed && styles.pressed,
                  ]}>
                  <Feather
                    name={detailsOpen ? 'x' : 'edit-2'}
                    size={16}
                    color={theme.textSecondary}
                  />
                </Pressable>
              </View>

              {/* Inline edit panel */}
              {detailsOpen ? (
                <Card style={styles.detailsPanel}>
                  {usesAutoName ? (
                    <View style={styles.autoNameBadge}>
                      <Feather name="zap" size={12} color={theme.primary} />
                      <ThemedText type="small" style={{ color: theme.primary }}>
                        {t('workout.autoNameActive')}
                      </ThemedText>
                    </View>
                  ) : null}
                  <TextField
                    autoCapitalize="words"
                    value={nameDraft}
                    onChangeText={setNameDraft}
                    placeholder={t('workout.placeholders.name')}
                  />
                  <TextField
                    value={durationDraft}
                    onChangeText={setDurationDraft}
                    placeholder={t('workout.placeholders.duration')}
                    keyboardType="number-pad"
                  />
                  <View style={styles.doubleRow}>
                    <View style={styles.flex1}>
                      <PrimaryButton
                        label={t('workout.save')}
                        loading={savingWorkout}
                        onPress={handleSaveWorkout}
                        disabled={savingWorkout}
                      />
                    </View>
                    <View style={styles.flex1}>
                      <PrimaryButton
                        label={t('workout.autoName')}
                        variant="secondary"
                        onPress={handleUseAutoName}
                        disabled={savingWorkout || !autoName || usesAutoName}
                      />
                    </View>
                  </View>
                </Card>
              ) : null}
            </ThemedView>

            {error ? (
              <ThemedText style={[styles.errorText, { color: theme.danger }]}>{error}</ThemedText>
            ) : null}

            {/* Volume pill */}
            <View style={[styles.volumePill, { backgroundColor: theme.primarySoft }]}>
              <View style={[styles.volumeIcon, { backgroundColor: theme.primaryMuted }]}>
                <Feather name="activity" size={14} color={theme.primary} />
              </View>
              <View>
                <ThemedText type="small" themeColor="textSecondary">
                  {t('workout.trainingVolume')}
                </ThemedText>
                <ThemedText type="smallBold" style={{ color: theme.primary }}>
                  {formatMetric(totalVolume)} {t('common.kilogramsShort')}
                </ThemedText>
              </View>
            </View>

            {/* Exercises */}
            <View style={styles.sectionHeader}>
              <ThemedText type="smallBold">{t('workout.exercises')}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {t(
                  (workout.exercises?.length ?? 0) === 1
                    ? 'workout.entries_one'
                    : 'workout.entries_other',
                  { count: workout.exercises?.length ?? 0 }
                )}
              </ThemedText>
            </View>

            {workout.exercises?.length ? (
              workout.exercises.map((exercise) => {
                const isEditing = editingId === exercise.id && editForm !== null;
                return (
                  <Card key={exercise.id} style={isEditing ? styles.exerciseCardEditing : undefined}>
                    <View style={styles.exerciseRow}>
                      <View style={styles.exerciseCopy}>
                        <ThemedText type="smallBold">{exercise.name}</ThemedText>
                        <ThemedText type="small" themeColor="textSecondary">
                          {t('workout.exerciseSummary', {
                            sets: exercise.sets,
                            reps: exercise.reps,
                            weight: formatMetric(exercise.weight),
                          })}
                        </ThemedText>
                        {exercise.note ? (
                          <ThemedText type="small" themeColor="textSecondary">
                            {exercise.note}
                          </ThemedText>
                        ) : null}
                      </View>
                      {!isEditing ? (
                        <View style={styles.iconActions}>
                          <Pressable
                            onPress={() => handleStartEdit(exercise)}
                            style={({ pressed }) => [
                              styles.iconBtn,
                              pressed && styles.pressed,
                            ]}>
                            <Feather name="edit-2" size={15} color={theme.textSecondary} />
                          </Pressable>
                          <Pressable
                            onPress={() => handleDeleteExercise(exercise)}
                            style={({ pressed }) => [
                              styles.iconBtn,
                              pressed && styles.pressed,
                            ]}>
                            <Feather name="trash-2" size={15} color={theme.danger} />
                          </Pressable>
                        </View>
                      ) : null}
                    </View>

                    {isEditing && editForm ? (
                      <>
                        <View style={[styles.divider, { backgroundColor: theme.border }]} />
                        <ExerciseFormFields
                          form={editForm}
                          suggestions={suggestions}
                          onChangeField={updateEditField}
                          onApplySuggestion={(s) => setEditForm(formFromSuggestion(s))}
                        />
                        <View style={styles.doubleRow}>
                          <View style={styles.flex1}>
                            <PrimaryButton
                              label={t('workout.saveExercise')}
                              loading={updatingId === exercise.id}
                              onPress={() => handleSaveExercise(exercise.id)}
                              disabled={updatingId !== null}
                            />
                          </View>
                          <View style={styles.flex1}>
                            <PrimaryButton
                              label={t('common.cancel')}
                              variant="secondary"
                              onPress={handleCancelEdit}
                              disabled={updatingId !== null}
                            />
                          </View>
                        </View>
                      </>
                    ) : null}
                  </Card>
                );
              })
            ) : (
              <Card>
                <ThemedText themeColor="textSecondary">{t('workout.noExercises')}</ThemedText>
              </Card>
            )}

            {/* New exercise */}
            <View style={styles.sectionHeader}>
              <ThemedText type="smallBold">{t('workout.newExercise')}</ThemedText>
            </View>
            <Card style={styles.formCard}>
              <ExerciseFormFields
                form={newForm}
                suggestions={suggestions}
                onChangeField={updateNewField}
                onApplySuggestion={(s) => setNewForm(formFromSuggestion(s))}
              />
              <PrimaryButton
                label={t('workout.addExercise')}
                loading={savingExercise}
                onPress={handleAddExercise}
              />
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
  container: { flex: 1 },
  safeArea: { flex: 1, padding: Spacing.four },
  scrollContent: { gap: Spacing.three, paddingBottom: Spacing.four },
  loadingState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.75 },

  // header
  header: { gap: Spacing.two },
  headerMain: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two },
  headerCopy: { flex: 1, gap: Spacing.half },
  editHeaderBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  detailsPanel: { gap: Spacing.two },
  autoNameBadge: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  errorText: { marginTop: -Spacing.one },

  // volume
  volumePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  volumeIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // section
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: -Spacing.one,
  },

  // exercises
  exerciseCardEditing: { gap: Spacing.two },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  exerciseCopy: { flex: 1, gap: Spacing.half },
  iconActions: { flexDirection: 'row', gap: Spacing.one },
  iconBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: { height: 1, marginHorizontal: -Spacing.four },

  // form
  formCard: { gap: Spacing.two },
  tripleRow: { flexDirection: 'row', gap: Spacing.two },
  doubleRow: { flexDirection: 'row', gap: Spacing.two },
  flex1: { flex: 1 },

  // suggestions
  suggestions: { gap: Spacing.one },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: {
    borderWidth: 1,
    borderRadius: Spacing.four,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    gap: 2,
    minWidth: 100,
  },
});
