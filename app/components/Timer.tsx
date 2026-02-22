import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import { Colors } from '@/constants/config';

interface TimerProps {
  timeLeft: number;
  maxTime: number;
}

export function Timer({ timeLeft, maxTime }: TimerProps) {
  const progress = useSharedValue(timeLeft / maxTime);

  useEffect(() => {
    progress.value = withTiming(timeLeft / maxTime, { duration: 200 });
  }, [timeLeft, maxTime]);

  const barStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      progress.value,
      [0, 0.3, 1],
      [Colors.error, Colors.warning, Colors.primary]
    );

    return {
      width: `${progress.value * 100}%`,
      backgroundColor,
    };
  });

  return (
    <View style={styles.container}>
      <View style={styles.barBackground}>
        <Animated.View style={[styles.bar, barStyle]} />
      </View>
      <Text style={[styles.time, timeLeft <= 5 && styles.timeCritical]}>
        {timeLeft}s
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  barBackground: {
    flex: 1,
    height: 8,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 4,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: 4,
  },
  time: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    minWidth: 50,
    textAlign: 'right',
  },
  timeCritical: {
    color: Colors.error,
  },
});
