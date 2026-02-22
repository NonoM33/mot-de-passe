import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withSpring,
  withSequence,
  withTiming,
  withRepeat,
  FadeInUp,
  FadeInDown,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useSocket } from '../contexts/SocketContext';
import { Button } from '../components/Button';
import { colors, spacing, fontSize, borderRadius } from '../constants/theme';

export default function RoundEndScreen() {
  const { player, roomState, gameState, continueGame, playAgain } = useSocket();

  const confettiOpacity = useSharedValue(0);

  useEffect(() => {
    if (!gameState) {
      router.replace('/lobby');
      return;
    }

    if (gameState.phase === 'gameOver') {
      confettiOpacity.value = withDelay(500, withTiming(1, { duration: 500 }));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [gameState?.phase]);

  useEffect(() => {
    if (gameState?.phase === 'ready') {
      router.push('/ready');
    } else if (gameState?.phase === 'playing') {
      router.push('/game');
    }
  }, [gameState?.phase]);

  // Listen for game reset
  useEffect(() => {
    if (!gameState && roomState) {
      router.replace('/lobby');
    }
  }, [gameState, roomState]);

  const sortedScores = useMemo(() => {
    if (!gameState) return [];
    return [...gameState.scores]
      .filter((s) => {
        const team = roomState?.teams.find((t) => t.name === s.name);
        return team && team.players.length > 0;
      })
      .sort((a, b) => b.score - a.score);
  }, [gameState?.scores, roomState?.teams]);

  const confettiStyle = useAnimatedStyle(() => ({
    opacity: confettiOpacity.value,
  }));

  if (!gameState || !roomState) return null;

  const isHost = player?.isHost;
  const isGameOver = gameState.phase === 'gameOver';
  const winner = sortedScores[0];

  const handleContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    continueGame();
  };

  const handlePlayAgain = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    playAgain();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Confetti for game over */}
        {isGameOver && (
          <Animated.View style={[styles.confettiContainer, confettiStyle]}>
            {Array.from({ length: 30 }).map((_, i) => (
              <ConfettiPiece key={i} index={i} />
            ))}
          </Animated.View>
        )}

        {/* Header */}
        <Animated.View
          entering={FadeInDown.delay(100).springify()}
          style={styles.header}
        >
          <Text style={styles.title}>
            {isGameOver ? 'PARTIE TERMINÉE !' : 'FIN DE MANCHE'}
          </Text>
          {!isGameOver && (
            <Text style={styles.roundInfo}>
              Manche {gameState.roundNumber - 1}/{gameState.totalRounds}
            </Text>
          )}
        </Animated.View>

        {/* Winner (Game Over) */}
        {isGameOver && winner && (
          <Animated.View
            entering={FadeInUp.delay(300).springify()}
            style={styles.winnerSection}
          >
            <Text style={styles.winnerLabel}>VICTOIRE</Text>
            <View style={[styles.winnerBadge, { backgroundColor: winner.color }]}>
              <Text style={styles.winnerName}>Équipe {winner.name}</Text>
              <Text style={styles.winnerScore}>{winner.score} pts</Text>
            </View>
          </Animated.View>
        )}

        {/* Podium (Game Over) */}
        {isGameOver && sortedScores.length > 1 && (
          <Animated.View
            entering={FadeInUp.delay(500).springify()}
            style={styles.podium}
          >
            {sortedScores.slice(0, 3).map((score, idx) => (
              <View
                key={score.name}
                style={[
                  styles.podiumItem,
                  idx === 0 && styles.podiumFirst,
                  idx === 1 && styles.podiumSecond,
                  idx === 2 && styles.podiumThird,
                ]}
              >
                <Text style={styles.podiumRank}>{idx + 1}</Text>
                <View
                  style={[
                    styles.podiumBar,
                    {
                      backgroundColor: score.color,
                      height: idx === 0 ? 100 : idx === 1 ? 70 : 50,
                    },
                  ]}
                />
                <Text style={styles.podiumTeam}>{score.name}</Text>
                <Text style={[styles.podiumScore, { color: score.color }]}>
                  {score.score}
                </Text>
              </View>
            ))}
          </Animated.View>
        )}

        {/* Current Scores (Round End) */}
        {!isGameOver && (
          <Animated.View
            entering={FadeInUp.delay(200).springify()}
            style={styles.scoresSection}
          >
            <Text style={styles.sectionTitle}>SCORES</Text>
            {sortedScores.map((score, idx) => (
              <View
                key={score.name}
                style={[styles.scoreRow, { borderLeftColor: score.color }]}
              >
                <Text style={styles.scoreRank}>{idx + 1}</Text>
                <Text style={styles.scoreName}>Équipe {score.name}</Text>
                <Text style={[styles.scoreValue, { color: score.color }]}>
                  {score.score}
                </Text>
              </View>
            ))}
          </Animated.View>
        )}

        {/* Words Summary */}
        <Animated.View
          entering={FadeInUp.delay(isGameOver ? 700 : 400).springify()}
          style={styles.wordsSection}
        >
          <Text style={styles.sectionTitle}>
            {isGameOver ? 'DERNIÈRE MANCHE' : 'RÉSUMÉ'}
          </Text>

          {gameState.wordsFound.length > 0 && (
            <View style={styles.wordsList}>
              <Text style={styles.wordsLabel}>
                ✅ Trouvés ({gameState.wordsFound.length})
              </Text>
              {gameState.wordsFound.map((w, idx) => (
                <View key={idx} style={styles.wordItem}>
                  <Text style={styles.wordText}>{w.word}</Text>
                  <Text style={styles.wordFinder}>→ {w.foundBy}</Text>
                </View>
              ))}
            </View>
          )}

          {gameState.wordsSkipped.length > 0 && (
            <View style={styles.wordsList}>
              <Text style={[styles.wordsLabel, { color: colors.error }]}>
                ❌ Passés ({gameState.wordsSkipped.length})
              </Text>
              {gameState.wordsSkipped.map((w, idx) => (
                <View key={idx} style={styles.wordItem}>
                  <Text style={[styles.wordText, styles.skippedWord]}>
                    {w.word}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </Animated.View>
      </ScrollView>

      {/* Actions */}
      <View style={styles.footer}>
        {isHost ? (
          isGameOver ? (
            <Button
              title="REJOUER"
              onPress={handlePlayAgain}
              variant="success"
              size="large"
            />
          ) : (
            <Button
              title="ÉQUIPE SUIVANTE"
              onPress={handleContinue}
              variant="primary"
              size="large"
            />
          )
        ) : (
          <Text style={styles.waitingText}>
            En attente de l'hôte...
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
}

// Confetti piece component
function ConfettiPiece({ index }: { index: number }) {
  const translateY = useSharedValue(-50);
  const translateX = useSharedValue(0);
  const rotate = useSharedValue(0);
  const opacity = useSharedValue(1);

  const color = [
    colors.primary,
    colors.secondary,
    colors.accent,
    colors.warning,
  ][index % 4];

  const left = Math.random() * 100;
  const delay = Math.random() * 1000;
  const duration = 2000 + Math.random() * 1000;

  useEffect(() => {
    translateY.value = withDelay(
      delay,
      withRepeat(
        withTiming(800, { duration }),
        -1,
        false
      )
    );
    translateX.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(20, { duration: duration / 4 }),
          withTiming(-20, { duration: duration / 2 }),
          withTiming(0, { duration: duration / 4 })
        ),
        -1,
        false
      )
    );
    rotate.value = withDelay(
      delay,
      withRepeat(
        withTiming(360, { duration: duration / 2 }),
        -1,
        false
      )
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { translateX: translateX.value },
      { rotate: `${rotate.value}deg` },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.confetti,
        { left: `${left}%`, backgroundColor: color },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  confettiContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    pointerEvents: 'none',
  },
  confetti: {
    position: 'absolute',
    top: -20,
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: fontSize.giant,
    fontWeight: '900',
    color: colors.text,
    textAlign: 'center',
  },
  roundInfo: {
    fontSize: fontSize.lg,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  winnerSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  winnerLabel: {
    fontSize: fontSize.lg,
    color: colors.textMuted,
    fontWeight: '700',
    marginBottom: spacing.md,
    letterSpacing: 4,
  },
  winnerBadge: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xxl,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
  },
  winnerName: {
    fontSize: fontSize.xxl,
    fontWeight: '900',
    color: '#000',
  },
  winnerScore: {
    fontSize: fontSize.giant,
    fontWeight: '900',
    color: '#000',
  },
  podium: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    marginBottom: spacing.xl,
    gap: spacing.md,
  },
  podiumItem: {
    alignItems: 'center',
  },
  podiumFirst: {
    order: 2,
  },
  podiumSecond: {
    order: 1,
  },
  podiumThird: {
    order: 3,
  },
  podiumRank: {
    fontSize: fontSize.xxl,
    fontWeight: '900',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  podiumBar: {
    width: 60,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.xs,
  },
  podiumTeam: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  podiumScore: {
    fontSize: fontSize.lg,
    fontWeight: '900',
  },
  scoresSection: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontWeight: '700',
    marginBottom: spacing.md,
    letterSpacing: 1,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderLeftWidth: 4,
    paddingLeft: spacing.md,
    marginBottom: spacing.xs,
  },
  scoreRank: {
    fontSize: fontSize.lg,
    fontWeight: '900',
    color: colors.textMuted,
    width: 30,
  },
  scoreName: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.text,
  },
  scoreValue: {
    fontSize: fontSize.xl,
    fontWeight: '900',
  },
  wordsSection: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  wordsList: {
    marginBottom: spacing.md,
  },
  wordsLabel: {
    fontSize: fontSize.md,
    color: colors.success,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  wordItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    paddingLeft: spacing.md,
  },
  wordText: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  skippedWord: {
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },
  wordFinder: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  footer: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceLight,
  },
  waitingText: {
    color: colors.textMuted,
    fontSize: fontSize.lg,
    textAlign: 'center',
    padding: spacing.md,
  },
});
