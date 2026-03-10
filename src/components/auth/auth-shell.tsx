import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AnimatedIcon } from "@/components/animated-icon";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

type AuthShellProps = {
  title: string;
  subtitle: string;
  children: React.ReactNode;
};

export function AuthShell({ title, subtitle, children }: AuthShellProps) {
  const theme = useTheme();

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.glowPrimary, { backgroundColor: theme.primary }]} />
      <View
        style={[
          styles.glowSecondary,
          { backgroundColor: theme.backgroundSelected },
        ]}
      />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View style={styles.iconWrap}>
              <AnimatedIcon />
            </View>
            <ThemedText type="subtitle" style={styles.title}>
              {title}
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.subtitle}>
              {subtitle}
            </ThemedText>
          </View>

          <View style={styles.body}>{children}</View>
        </ScrollView>
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
  },
  scrollContent: {
    padding: Spacing.four,
    gap: Spacing.four,
  },
  header: {
    gap: Spacing.two,
    alignItems: "flex-start",
  },
  iconWrap: {
    alignSelf: "flex-start",
    transform: [{ scale: 0.85 }],
  },
  title: {
    fontSize: 34,
    lineHeight: 40,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
  },
  body: {
    gap: Spacing.three,
  },
  glowPrimary: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 999,
    opacity: 0.18,
    top: -120,
    right: -80,
  },
  glowSecondary: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 999,
    opacity: 0.12,
    bottom: -60,
    left: -60,
  },
});
