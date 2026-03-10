import React from 'react';
import { StyleSheet, TextInput, TextInputProps } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function TextField({ style, ...props }: TextInputProps) {
  const theme = useTheme();

  return (
    <TextInput
      {...props}
      placeholderTextColor={theme.textSecondary}
      style={[
        styles.input,
        {
          backgroundColor: theme.backgroundElement,
          color: theme.text,
          borderColor: theme.border,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    borderRadius: Spacing.four,
    borderWidth: 1,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    fontSize: 16,
    minHeight: 52,
  },
});
