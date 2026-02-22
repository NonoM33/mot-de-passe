import React from 'react';
import { TextInput, StyleSheet, View, Text, ViewStyle } from 'react-native';
import { colors, spacing, fontSize, borderRadius } from '../constants/theme';

interface InputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  label?: string;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  maxLength?: number;
  style?: ViewStyle;
  large?: boolean;
}

export function Input({
  value,
  onChangeText,
  placeholder,
  label,
  autoCapitalize = 'none',
  maxLength,
  style,
  large = false,
}: InputProps) {
  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textDim}
        autoCapitalize={autoCapitalize}
        maxLength={maxLength}
        style={[styles.input, large && styles.inputLarge]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    color: colors.text,
    fontSize: fontSize.md,
    borderWidth: 1,
    borderColor: colors.surfaceLight,
  },
  inputLarge: {
    fontSize: fontSize.xl,
    paddingVertical: spacing.lg,
    textAlign: 'center',
    letterSpacing: 8,
    fontWeight: '700',
  },
});
