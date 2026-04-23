import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useRef } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';

import { useAuth } from '@/hooks/use-auth';
import { useI18n } from '@/i18n';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

const DEFAULT_DURATION = 45;

export default function NewWorkoutTab() {
  const { session } = useAuth();
  const router = useRouter();
  const theme = useTheme();
  const { formatDate, t } = useI18n();
  const creating = useRef(false);

  useFocusEffect(
    useCallback(() => {
      const userId = session?.user.id;
      if (!userId || creating.current) return;

      creating.current = true;
      const now = new Date();
      supabase
        .from('workouts')
        .insert({
          user_id: userId,
          name: t('workout.defaultName', { date: formatDate(now) }),
          date: now.toISOString(),
          duration_minutes: DEFAULT_DURATION,
        })
        .select('*')
        .single()
        .then(({ data, error }) => {
          creating.current = false;
          if (error || !data) {
            router.replace('/(tabs)/workouts');
            return;
          }
          router.replace({ pathname: '/workout/[id]', params: { id: data.id } });
        });
    }, [session, router, formatDate, t])
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ActivityIndicator size="large" color={theme.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
