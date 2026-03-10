import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  PressableProps,
  StyleSheet,
  View,
} from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from '@/components/themed-text';

type PrimaryButtonProps = PressableProps & {
  label: string;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
};

export function PrimaryButton({ label, loading, variant = 'primary', ...props }: PrimaryButtonProps) {
  const theme = useTheme();

  const backgroundColor =
    variant === 'secondary' ? theme.backgroundElement : variant === 'danger' ? theme.danger : theme.primary;
  const textColor = variant === 'secondary' ? theme.text : '#ffffff';

  return (
    <Pressable
      {...props}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor },
        pressed && styles.pressed,
        props.disabled && styles.disabled,
      ]}>
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator size="small" color={textColor} />
        ) : (
          <ThemedText style={[styles.label, { color: textColor }]}>{label}</ThemedText>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: Spacing.five,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.five,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  label: {
    fontSize: 16,
    fontWeight: 700,
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.5,
  },
});
