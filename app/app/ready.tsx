import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useSocket } from '../contexts/SocketContext';
import { Button } from '../components/Button';
import { colors, spacing, fontSize, borderRadius } from '../constants/theme';

export default function ReadyScreen() {
  const { player, roomState, gameState, giverReady } = useSocket();

  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.5);

  useEffect(() => {
    if (!gameState) {
      router.replace('/lobby');
      return;
    }

    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 1000 }),
        withTiming(1, { duration: 1000 })
      ),
      -1,
      true
    );

    pulseOpacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1000 }),
        withTiming(0.5, { duration: 1000 })
      ),
      -1,
      true
    );
  }, [gameState]);

  useEffect(() => {
    if (gameState?.phase === 'playing') {
      router.push('/game');
    } else if (gameState?.phase === 'roundEnd' || gameState?.phase === 'gameOver') {
      router.push('/roundEnd');
    }
  }, [gameState?.phase]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  if (!gameState || !roomState) return null;

  const isGiver = gameState.currentGiverId === player?.id;
  const currentTeam = roomState.teams[gameState.currentTeamIndex];

  const handleReady = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    giverReady();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.roundInfo}>
          <Text style={styles.roundLabel}>MANCHE {gameState.roundNumber}/{gameState.totalRounds}</Text>
        </View>

        <View style={styles.teamSection}>
          <Animated.View
            style={[
              styles.teamCircle,
              { backgroundColor: currentTeam?.color + '30', borderColor: currentTeam?.color },
              pulseStyle,
            ]}
          />
          <Text style={[styles.teamName, { color: currentTeam?.color }]}>
            Équipe {currentTeam?.name}
          </Text>
        </View>

        <View style={styles.giverSection}>
          {isGiver ? (
            <>
              <Text style={styles.giverLabel}>C'EST À TOI !</Text>
              <Text style={styles.giverEmoji}>🎤</Text>
              <Text style={styles.giverInstruction}>
                Tu vas faire deviner des mots à ton équipe
              </Text>
              <Text style={styles.giverTip}>
                Donne des indices à voix haute, sans dire le mot !
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.waitingLabel}>
                {gameState.currentGiverName} fait deviner
              </Text>
              <Text style={styles.waitingEmoji}>🎯</Text>
              <Text style={styles.waitingInstruction}>Préparez-vous !</Text>
            </>
          )}
        </View>

        {isGiver && (
          <View style={styles.buttonContainer}>
            <Button
              title="C'EST PARTI !"
              onPress={handleReady}
              variant="success"
              size="large"
            />
          </View>
        )}

        {!isGiver && (
          <View style={styles.scoresPreview}>
            <Text style={styles.scoresTitle}>Scores</Text>
            <View style={styles.scoresList}>
              {gameState.scores
                .filter((s) => s.score > 0 || roomState.teams.find((t) => t.name === s.name)?.players.length)
                .map((score, idx) => (
                  <View key={idx} style={styles.scoreRow}>
                    <View style={[styles.scoreDot, { backgroundColor: score.color }]} />
                    <Text style={styles.scoreName}>{score.name}</Text>
                    <Text style={[styles.scoreValue, { color: score.color }]}>{score.score}</Text>
                  </View>
                ))}
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundInfo: {
    position: 'absolute',
    top: spacing.lg,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  roundLabel: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    fontWeight: '700',
    letterSpacing: 2,
  },
  teamSection: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  teamCircle: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 4,
    marginBottom: spacing.md,
  },
  teamName: {
    fontSize: fontSize.xxl,
    fontWeight: '900',
  },
  giverSection: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  giverLabel: {
    fontSize: fontSize.giant,
    fontWeight: '900',
    color: colors.accent,
    marginBottom: spacing.md,
  },
  giverEmoji: {
    fontSize: 80,
    marginBottom: spacing.md,
  },
  giverInstruction: {
    fontSize: fontSize.lg,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  giverTip: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    textAlign: 'center',
  },
  waitingLabel: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  waitingEmoji: {
    fontSize: 80,
    marginBottom: spacing.md,
  },
  waitingInstruction: {
    fontSize: fontSize.lg,
    color: colors.textMuted,
  },
  buttonContainer: {
    width: '100%',
    paddingHorizontal: spacing.lg,
  },
  scoresPreview: {
    position: 'absolute',
    bottom: spacing.xxl,
    left: spacing.lg,
    right: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  scoresTitle: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    fontWeight: '700',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  scoresList: {
    gap: spacing.xs,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: spacing.sm,
  },
  scoreName: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.md,
  },
  scoreValue: {
    fontSize: fontSize.lg,
    fontWeight: '900',
  },
});
