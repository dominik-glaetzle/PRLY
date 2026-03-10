import AsyncStorage from '@react-native-async-storage/async-storage';

export const ONBOARDING_STATUS_KEY = 'prly:onboarding:complete';
export const ONBOARDING_GOALS_KEY = 'prly:onboarding:goals';

export type TrainingFrequency = '1-2' | '2-3' | '4-5' | '6+';
export type GoalId = 'lose-fat' | 'build-muscle' | 'get-stronger' | 'improve-endurance' | 'stay-consistent';

export type OnboardingGoals = {
  frequency: TrainingFrequency;
  goals: GoalId[];
};

export async function getOnboardingStatus() {
  const status = await AsyncStorage.getItem(ONBOARDING_STATUS_KEY);
  return status === 'true';
}

export async function setOnboardingComplete(value: boolean) {
  await AsyncStorage.setItem(ONBOARDING_STATUS_KEY, value ? 'true' : 'false');
}

export async function saveOnboardingGoals(goals: OnboardingGoals) {
  await AsyncStorage.setItem(ONBOARDING_GOALS_KEY, JSON.stringify(goals));
}

export async function getOnboardingGoals() {
  const stored = await AsyncStorage.getItem(ONBOARDING_GOALS_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored) as OnboardingGoals;
  } catch {
    return null;
  }
}
