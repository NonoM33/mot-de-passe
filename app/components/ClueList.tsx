import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInLeft, ZoomIn } from 'react-native-reanimated';
import { Colors } from '@/constants/config';

interface ClueListProps {
  clues: string[];
  maxClues: number;
}

export function ClueList({ clues, maxClues }: ClueListProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Indices</Text>
      <View style={styles.cluesContainer}>
        {Array.from({ length: maxClues }).map((_, index) => (
          <Animated.View
            key={index}
            entering={clues[index] ? ZoomIn.delay(100) : undefined}
            style={[
              styles.clueSlot,
              clues[index] ? styles.clueSlotFilled : styles.clueSlotEmpty,
            ]}
          >
            {clues[index] ? (
              <Animated.Text
                entering={FadeInLeft.delay(100)}
                style={styles.clueText}
              >
                {clues[index]}
              </Animated.Text>
            ) : (
              <Text style={styles.clueNumber}>{index + 1}</Text>
            )}
          </Animated.View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  title: {
    fontSize: 14,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  cluesContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  clueSlot: {
    flex: 1,
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 70,
  },
  clueSlotEmpty: {
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.surfaceLight,
    borderStyle: 'dashed',
  },
  clueSlotFilled: {
    backgroundColor: Colors.surfaceLight,
    borderWidth: 2,
    borderColor: Colors.accent,
  },
  clueNumber: {
    fontSize: 18,
    color: Colors.textMuted,
    fontWeight: 'bold',
  },
  clueText: {
    fontSize: 18,
    color: Colors.accent,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
