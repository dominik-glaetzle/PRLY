export type Workout = {
  id: string;
  user_id: string;
  name: string;
  date: string;
  duration_minutes: number;
  created_at: string;
};

export type Exercise = {
  id: string;
  workout_id: string;
  name: string;
  sets: number;
  reps: number;
  weight: number;
  note?: string | null;
};

export type WorkoutWithExercises = Workout & {
  exercises?: Exercise[];
};
