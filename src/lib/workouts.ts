import { Exercise, WorkoutWithExercises } from '@/types/workout';

type TranslationFn = (key: string, params?: Record<string, number | string>) => string;
type FormatDateFn = (value: Date | number | string, options?: Intl.DateTimeFormatOptions) => string;

export type ExerciseSuggestion = {
  name: string;
  usageCount: number;
  lastUsedAt: string;
  lastValues: { note: string; reps: number; sets: number; weight: number };
};

export function buildAutoWorkoutName({
  date,
  exercises,
  formatDate,
  t,
}: {
  date: Date | number | string;
  exercises?: Pick<Exercise, 'name'>[] | null;
  formatDate: FormatDateFn;
  t: TranslationFn;
}) {
  const names = getUniqueExerciseNames(exercises);
  if (!names.length) return t('workout.defaultName', { date: formatDate(date) });
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} + ${names[1]}`;
  return `${names[0]} + ${names.length - 1} ${t('workout.autoNameMore')}`;
}

export function buildExerciseSuggestions(
  workouts: Pick<WorkoutWithExercises, 'date' | 'exercises'>[]
) {
  const sorted = [...workouts].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  const map = new Map<string, ExerciseSuggestion>();

  sorted.forEach((workout) => {
    workout.exercises?.forEach((exercise) => {
      const key = normalizeExerciseName(exercise.name);
      if (!key) return;
      const current = map.get(key);
      if (current) {
        current.usageCount += 1;
        return;
      }
      map.set(key, {
        name: exercise.name.trim(),
        usageCount: 1,
        lastUsedAt: workout.date,
        lastValues: {
          note: exercise.note?.trim() ?? '',
          reps: exercise.reps,
          sets: exercise.sets,
          weight: exercise.weight,
        },
      });
    });
  });

  return [...map.values()].sort((a, b) => {
    if (b.usageCount !== a.usageCount) return b.usageCount - a.usageCount;
    return new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime();
  });
}

export function filterExerciseSuggestions(
  suggestions: ExerciseSuggestion[],
  query: string,
  limit = 6
) {
  const q = normalizeExerciseName(query);
  if (!q) return suggestions.slice(0, limit);
  return suggestions
    .filter((s) => normalizeExerciseName(s.name).includes(q))
    .sort((a, b) => {
      const aStarts = normalizeExerciseName(a.name).startsWith(q);
      const bStarts = normalizeExerciseName(b.name).startsWith(q);
      if (aStarts !== bStarts) return aStarts ? -1 : 1;
      return b.usageCount - a.usageCount;
    })
    .slice(0, limit);
}

export function normalizeExerciseName(name: string) {
  return name.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}

export function parseNumericInput(value: string) {
  return Number(value.replace(',', '.').trim());
}

export function toInputString(value: number) {
  return String(value);
}

function getUniqueExerciseNames(exercises?: Pick<Exercise, 'name'>[] | null) {
  const seen = new Set<string>();
  const names: string[] = [];
  exercises?.forEach((e) => {
    const trimmed = e.name.trim();
    const norm = normalizeExerciseName(trimmed);
    if (!trimmed || seen.has(norm)) return;
    seen.add(norm);
    names.push(trimmed);
  });
  return names;
}
