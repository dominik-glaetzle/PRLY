import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card } from '@/components/ui/card';
import { PrimaryButton } from '@/components/ui/primary-button';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useI18n } from '@/i18n';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';
import { Workout } from '@/types/workout';

const DEFAULT_DURATION = 45;

export default function WorkoutsScreen() {
  const { session } = useAuth();
  const theme = useTheme();
  const router = useRouter();
  const { formatDate, t } = useI18n();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userId = session?.user.id;

  const loadWorkouts = useCallback(async () => {
    if (!userId) return;
    setError(null);
    const { data, error: fetchError } = await supabase
      .from('workouts')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
      return;
    }

    setWorkouts(data ?? []);
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      loadWorkouts()
        .catch(() => null)
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }, [loadWorkouts])
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadWorkouts();
    setRefreshing(false);
  }, [loadWorkouts]);

  const handleCreateWorkout = useCallback(async () => {
    if (!userId) return;
    const now = new Date();
    const { data, error: insertError } = await supabase
      .from('workouts')
      .insert({
        user_id: userId,
        name: t('workout.defaultName', { date: formatDate(now) }),
        date: now.toISOString(),
        duration_minutes: DEFAULT_DURATION,
      })
      .select('*')
      .single();

    if (insertError) {
      setError(insertError.message);
      return;
    }

    if (data) {
      setWorkouts((prev) => [data as Workout, ...prev]);
      router.push({ pathname: '/workout/[id]', params: { id: data.id } });
    }
  }, [formatDate, router, t, userId]);

  const listEmpty = useMemo(() => {
    if (loading) return null;
    return (
      <Card>
        <ThemedText type="small" themeColor="textSecondary">
          {t('workouts.empty')}
        </ThemedText>
        <PrimaryButton label={t('workouts.newWorkout')} onPress={handleCreateWorkout} />
      </Card>
    );
  }, [handleCreateWorkout, loading, t]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.header}>
          <ThemedText type="subtitle">{t('workouts.title')}</ThemedText>
          <ThemedText themeColor="textSecondary">{t('workouts.subtitle')}</ThemedText>
        </ThemedView>

        {error ? <ThemedText style={{ color: theme.danger }}>{error}</ThemedText> : null}

        {loading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color={theme.text} />
          </View>
        ) : (
          <FlatList
            data={workouts}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
            ListEmptyComponent={listEmpty}
            renderItem={({ item }) => (
              <Pressable
                onPress={() =>
                  router.push({ pathname: '/workout/[id]', params: { id: item.id } })
                }
                style={({ pressed }) => [pressed && styles.pressed]}>
                <Card>
                  <ThemedText type="smallBold">{item.name}</ThemedText>
                  <ThemedText themeColor="textSecondary">
                    {t('workouts.workoutMeta', {
                      date: formatDate(item.date, { month: 'short', day: 'numeric' }),
                      minutes: item.duration_minutes,
                    })}
                  </ThemedText>
                  <ThemedText type="linkPrimary">{t('workouts.viewExercises')}</ThemedText>
                </Card>
              </Pressable>
            )}
          />
        )}

        <Pressable
          style={({ pressed }) => [
            styles.fab,
            { backgroundColor: theme.primary },
            pressed && styles.pressed,
          ]}
          onPress={handleCreateWorkout}>
          <Ionicons name="add" size={28} color="#ffffff" />
        </Pressable>
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
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.three,
  },
  header: {
    gap: Spacing.one,
    marginBottom: Spacing.three,
  },
  listContent: {
    gap: Spacing.three,
    paddingBottom: 120,
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    position: 'absolute',
    right: Spacing.four,
    bottom: BottomTabInset + Spacing.three,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#208AEF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  pressed: {
    opacity: 0.8,
  },
});
