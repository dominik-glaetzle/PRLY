import { Feather, Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Card } from "@/components/ui/card";
import { PrimaryButton } from "@/components/ui/primary-button";
import { BottomTabInset, Spacing } from "@/constants/theme";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/i18n";
import { useTheme } from "@/hooks/use-theme";
import { supabase } from "@/lib/supabase";
import { Workout } from "@/types/workout";

const DEFAULT_DURATION = 45;

type WorkoutWithCount = Workout & { exerciseCount: number };

function WorkoutCard({
  workout,
  onPress,
}: {
  workout: WorkoutWithCount;
  onPress: () => void;
}) {
  const theme = useTheme();
  const { formatDate, t } = useI18n();

  const day = formatDate(workout.date, { day: "numeric" });
  const month = formatDate(workout.date, { month: "short" });
  const weekday = formatDate(workout.date, { weekday: "long" });

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [pressed && styles.pressed]}
    >
      <ThemedView style={styles.workoutCard}>
        {/* Date badge */}
        <View
          style={[styles.dateBadge, { backgroundColor: theme.primarySoft }]}
        >
          <ThemedText style={[styles.dateDay, { color: theme.primary }]}>
            {day}
          </ThemedText>
          <ThemedText style={[styles.dateMonth, { color: theme.primary }]}>
            {month}
          </ThemedText>
        </View>

        {/* Content */}
        <View style={styles.cardBody}>
          <ThemedText type="smallBold" numberOfLines={1}>
            {workout.name}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {weekday}
          </ThemedText>
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Feather name="clock" size={11} color={theme.textSecondary} />
              <ThemedText type="small" themeColor="textSecondary">
                {workout.duration_minutes} {t("common.minutesShort")}
              </ThemedText>
            </View>
            {workout.exerciseCount > 0 ? (
              <View style={styles.metaItem}>
                <Feather
                  name="activity"
                  size={11}
                  color={theme.textSecondary}
                />
                <ThemedText type="small" themeColor="textSecondary">
                  {t(
                    workout.exerciseCount === 1
                      ? "workout.entries_one"
                      : "workout.entries_other",
                    { count: workout.exerciseCount },
                  )}
                </ThemedText>
              </View>
            ) : null}
          </View>
        </View>

        {/* Chevron */}
        <Feather name="chevron-right" size={20} color={theme.border} />
      </ThemedView>
    </Pressable>
  );
}

export default function WorkoutsScreen() {
  const { session } = useAuth();
  const theme = useTheme();
  const router = useRouter();
  const { formatDate, t } = useI18n();
  const [workouts, setWorkouts] = useState<WorkoutWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const userId = session?.user.id;

  const loadWorkouts = useCallback(async () => {
    if (!userId) return;
    setError(null);
    const { data, error: fetchError } = await supabase
      .from("workouts")
      .select("*, exercises(id)")
      .eq("user_id", userId)
      .order("date", { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
      return;
    }

    setWorkouts(
      (data ?? []).map((w: any) => ({
        ...w,
        exerciseCount: Array.isArray(w.exercises) ? w.exercises.length : 0,
      })),
    );
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
    }, [loadWorkouts]),
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadWorkouts();
    setRefreshing(false);
  }, [loadWorkouts]);

  const handleCreateWorkout = useCallback(async () => {
    if (!userId) return;
    setCreating(true);
    const now = new Date();
    const { data, error: insertError } = await supabase
      .from("workouts")
      .insert({
        user_id: userId,
        name: t("workout.defaultName", { date: formatDate(now) }),
        date: now.toISOString(),
        duration_minutes: DEFAULT_DURATION,
      })
      .select("*")
      .single();
    setCreating(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    if (data) {
      setWorkouts((prev) => [
        { ...(data as Workout), exerciseCount: 0 },
        ...prev,
      ]);
      router.push({ pathname: "/workout/[id]", params: { id: data.id } });
    }
  }, [formatDate, router, t, userId]);

  // Group workouts by month
  const grouped = useMemo(() => {
    const groups: { label: string; data: WorkoutWithCount[] }[] = [];
    let currentLabel = "";

    workouts.forEach((w) => {
      const label = formatDate(w.date, { month: "long", year: "numeric" });
      if (label !== currentLabel) {
        currentLabel = label;
        groups.push({ label, data: [] });
      }
      groups[groups.length - 1].data.push(w);
    });

    return groups;
  }, [formatDate, workouts]);

  return (
    <ThemedView type="backgroundElement" style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView type="backgroundElement" style={styles.header}>
          <ThemedText type="subtitle">{t("workouts.title")}</ThemedText>
          <ThemedText themeColor="textSecondary">
            {t("workouts.subtitle")}
          </ThemedText>
        </ThemedView>

        {error ? (
          <ThemedText style={{ color: theme.danger }}>{error}</ThemedText>
        ) : null}

        {loading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color={theme.primary} />
          </View>
        ) : workouts.length === 0 ? (
          <View style={styles.emptyState}>
            <Card style={styles.emptyCard}>
              <View
                style={[
                  styles.emptyIcon,
                  { backgroundColor: theme.primarySoft },
                ]}
              >
                <Feather name="activity" size={20} color={theme.primary} />
              </View>
              <ThemedText type="smallBold">
                {t("workouts.emptyTitle")}
              </ThemedText>
              <ThemedText themeColor="textSecondary">
                {t("workouts.empty")}
              </ThemedText>
              <PrimaryButton
                label={t("workouts.newWorkout")}
                loading={creating}
                onPress={handleCreateWorkout}
              />
            </Card>
          </View>
        ) : (
          <FlatList
            data={grouped}
            keyExtractor={(item) => item.label}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
              />
            }
            showsVerticalScrollIndicator={false}
            renderItem={({ item: group }) => (
              <View style={styles.group}>
                <ThemedText
                  type="small"
                  themeColor="textSecondary"
                  style={styles.groupLabel}
                >
                  {group.label}
                </ThemedText>
                {group.data.map((workout) => (
                  <WorkoutCard
                    key={workout.id}
                    workout={workout}
                    onPress={() =>
                      router.push({
                        pathname: "/workout/[id]",
                        params: { id: workout.id },
                      })
                    }
                  />
                ))}
              </View>
            )}
          />
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.three,
  },
  header: { gap: Spacing.half, marginBottom: Spacing.three },
  loadingState: { flex: 1, alignItems: "center", justifyContent: "center" },
  listContent: { gap: Spacing.four, paddingBottom: 100 },

  // grouping
  group: { gap: Spacing.two },
  groupLabel: { marginBottom: -Spacing.one, paddingHorizontal: Spacing.one },

  // card — white on gray screen for strong contrast
  workoutCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
    borderRadius: Spacing.four,
    padding: Spacing.three,
  },
  dateBadge: {
    width: 52,
    height: 56,
    borderRadius: Spacing.three,
    alignItems: "center",
    justifyContent: "center",
    gap: 1,
  },
  dateDay: {
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 24,
  },
  dateMonth: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  cardBody: { flex: 1, gap: 3 },
  metaRow: { flexDirection: "row", gap: Spacing.three, marginTop: 1 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: Spacing.one },

  // empty
  emptyState: { flex: 1, justifyContent: "center" },
  emptyCard: { gap: Spacing.three },
  emptyIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },

  // fab
  fab: {
    position: "absolute",
    right: Spacing.four,
    bottom: BottomTabInset + Spacing.three,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  pressed: { opacity: 0.78 },
});
