import React from 'react';
import { StyleSheet, ViewProps } from 'react-native';

import { Spacing } from '@/constants/theme';
import { ThemedView } from '@/components/themed-view';

export function Card({ style, ...props }: ViewProps) {
  return <ThemedView type="backgroundElement" style={[styles.card, style]} {...props} />;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Spacing.four,
    padding: Spacing.four,
    gap: Spacing.two,
  },
});
