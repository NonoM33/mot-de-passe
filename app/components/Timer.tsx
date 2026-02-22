import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { colors, fontSize } from '../constants/theme';

interface TimerProps {
  seconds: number;
  totalSeconds: number;
  size?: number;
}

export function Timer({ seconds, totalSeconds, size = 120 }: TimerProps) {
  const progress = seconds / totalSeconds;
  const isLow = seconds <= 5;
  const circumference = 2 * Math.PI * (size / 2 - 8);
  const strokeDashoffset = circumference * (1 - progress);

  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (isLow && seconds > 0) {
      scale.value = withSequence(
        withTiming(1.1, { duration: 100 }),
        withTiming(1, { duration: 100 })
      );
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
  }, [seconds, isLow]);

  useEffect(() => {
    if (isLow) {
      opacity.value = withRepeat(
        withSequence(
          withTiming(0.5, { duration: 250 }),
          withTiming(1, { duration: 250 })
        ),
        -1,
        true
      );
    } else {
      opacity.value = 1;
    }
  }, [isLow]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const timerColor = isLow ? colors.error : colors.primary;

  return (
    <Animated.View style={[styles.container, { width: size, height: size }, animatedStyle]}>
      <View
        style={[
          styles.svgContainer,
          { width: size, height: size }
        ]}
      >
        {/* Background circle */}
        <View
          style={[
            styles.circle,
            {
              width: size - 16,
              height: size - 16,
              borderRadius: (size - 16) / 2,
              borderColor: colors.surfaceLight,
            }
          ]}
        />
        {/* Progress circle - using view border workaround */}
        <View
          style={[
            styles.circle,
            styles.progressCircle,
            {
              width: size - 16,
              height: size - 16,
              borderRadius: (size - 16) / 2,
              borderColor: timerColor,
              transform: [{ rotate: '-90deg' }],
            }
          ]}
        />
      </View>
      <Text style={[styles.text, { color: timerColor, fontSize: size / 3 }]}>
        {seconds}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  svgContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    position: 'absolute',
    borderWidth: 8,
  },
  progressCircle: {
    borderLeftColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  text: {
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
});
