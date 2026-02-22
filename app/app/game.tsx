import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withRepeat,
  Easing,
  FadeIn,
  ZoomIn,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useSocket } from '../contexts/SocketContext';
import { Button } from '../components/Button';
import { Timer } from '../components/Timer';
import { colors, spacing, fontSize, borderRadius } from '../constants/theme';

export default function GameScreen() {
  const {
    player,
    roomState,
    gameState,
    currentWord,
    wordFound,
    wordSkipped,
  } = useSocket();

  const [showFinderModal, setShowFinderModal] = useState(false);
  const wordScale = useSharedValue(1);

  useEffect(() => {
    if (!gameState || gameState.phase !== 'playing') {
      if (gameState?.phase === 'roundEnd' || gameState?.phase === 'gameOver') {
        router.push('/roundEnd');
      } else if (gameState?.phase === 'ready') {
        router.push('/ready');
      } else {
        router.replace('/lobby');
      }
    }
  }, [gameState?.phase]);

  useEffect(() => {
    if (currentWord) {
      wordScale.value = withSequence(
        withTiming(0.8, { duration: 0 }),
        withTiming(1.1, { duration: 150 }),
        withTiming(1, { duration: 100 })
      );
    }
  }, [currentWord]);

  const wordAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: wordScale.value }],
  }));

  if (!gameState || !roomState) return null;

  const isGiver = gameState.currentGiverId === player?.id;
  const currentTeam = roomState.teams[gameState.currentTeamIndex];

  const handleFound = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowFinderModal(true);
  };

  const handleSelectFinder = (finderId: string) => {
    setShowFinderModal(false);
    wordFound(finderId);
  };

  const handleSkip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    wordSkipped();
  };

  // Get players who could have found (same team + adversaries for steal)
  const possibleFinders = roomState.players.filter(
    (p) => p.id !== player?.id
  );

  // Giver View
  if (isGiver) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.giverContent}>
          {/* Header */}
          <View style={styles.giverHeader}>
            <View style={styles.wordCounter}>
              <Text style={styles.wordCounterText}>
                Mot {gameState.currentWordIndex % gameState.totalWords + 1}/{gameState.totalWords}
              </Text>
            </View>
            <Timer
              seconds={gameState.timer}
              totalSeconds={gameState.timerDuration}
              size={80}
            />
          </View>

          {/* Word Display */}
          <Animated.View style={[styles.wordContainer, wordAnimatedStyle]}>
            {currentWord && (
              <>
                <Text style={styles.categoryBadge}>
                  {currentWord.emoji} {currentWord.category}
                </Text>
                <Text style={styles.word}>{currentWord.word}</Text>
              </>
            )}
          </Animated.View>

          {/* Actions */}
          <View style={styles.giverActions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.foundButton]}
              onPress={handleFound}
              activeOpacity={0.8}
            >
              <Text style={styles.actionButtonEmoji}>✅</Text>
              <Text style={styles.actionButtonText}>TROUVÉ</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.skipButton]}
              onPress={handleSkip}
              activeOpacity={0.8}
            >
              <Text style={styles.actionButtonEmoji}>⏭️</Text>
              <Text style={styles.actionButtonText}>PASSER</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Finder Selection Modal */}
        <Modal
          visible={showFinderModal}
          transparent
          animationType="fade"
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Qui a trouvé ?</Text>
              <ScrollView style={styles.finderList}>
                {possibleFinders.map((p) => {
                  const team = roomState.teams[p.teamIndex];
                  return (
                    <TouchableOpacity
                      key={p.id}
                      style={[
                        styles.finderButton,
                        { borderColor: team?.color },
                      ]}
                      onPress={() => handleSelectFinder(p.id)}
                    >
                      <View
                        style={[
                          styles.finderDot,
                          { backgroundColor: team?.color },
                        ]}
                      />
                      <Text style={styles.finderName}>{p.name}</Text>
                      <Text style={[styles.finderTeam, { color: team?.color }]}>
                        {team?.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <Button
                title="Annuler"
                onPress={() => setShowFinderModal(false)}
                variant="ghost"
                size="medium"
              />
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  // Guesser View
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.guesserContent}>
        {/* Header */}
        <View style={styles.guesserHeader}>
          <Timer
            seconds={gameState.timer}
            totalSeconds={gameState.timerDuration}
            size={120}
          />
        </View>

        {/* Info */}
        <View style={styles.guesserInfo}>
          <Text style={styles.giverNameLabel}>
            {gameState.currentGiverName} fait deviner
          </Text>
          <View style={[styles.teamBadge, { backgroundColor: currentTeam?.color }]}>
            <Text style={styles.teamBadgeText}>Équipe {currentTeam?.name}</Text>
          </View>
        </View>

        {/* Progress */}
        <View style={styles.progressSection}>
          <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>Mots trouvés</Text>
            <Text style={[styles.progressValue, { color: colors.success }]}>
              {gameState.wordsFound.length}
            </Text>
          </View>
          <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>Mots passés</Text>
            <Text style={[styles.progressValue, { color: colors.error }]}>
              {gameState.wordsSkipped.length}
            </Text>
          </View>
        </View>

        {/* Recent words */}
        {gameState.wordsFound.length > 0 && (
          <View style={styles.recentWords}>
            <Text style={styles.recentTitle}>Derniers mots trouvés</Text>
            <View style={styles.recentList}>
              {gameState.wordsFound.slice(-5).reverse().map((w, idx) => (
                <Animated.View
                  key={idx}
                  entering={FadeIn.delay(idx * 100)}
                  style={styles.recentWord}
                >
                  <Text style={styles.recentWordText}>
                    ✅ {w.word}
                  </Text>
                  <Text style={styles.recentWordFinder}>
                    {w.foundBy}
                  </Text>
                </Animated.View>
              ))}
            </View>
          </View>
        )}

        {/* Scores */}
        <View style={styles.scoresSection}>
          {gameState.scores.map((score, idx) => (
            <View key={idx} style={styles.scoreCard}>
              <View style={[styles.scoreColorBar, { backgroundColor: score.color }]} />
              <Text style={styles.scoreName}>{score.name}</Text>
              <Text style={[styles.scoreValue, { color: score.color }]}>
                {score.score}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  // Giver styles
  giverContent: {
    flex: 1,
    padding: spacing.lg,
  },
  giverHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  wordCounter: {
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
  },
  wordCounterText: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  wordContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryBadge: {
    color: colors.textMuted,
    fontSize: fontSize.lg,
    marginBottom: spacing.md,
  },
  word: {
    fontSize: fontSize.mega,
    fontWeight: '900',
    color: colors.text,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  giverActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  actionButton: {
    flex: 1,
    paddingVertical: spacing.xl,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  foundButton: {
    backgroundColor: colors.success,
  },
  skipButton: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.textMuted,
  },
  actionButtonEmoji: {
    fontSize: 32,
    marginBottom: spacing.xs,
  },
  actionButtonText: {
    fontSize: fontSize.lg,
    fontWeight: '900',
    color: colors.text,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  finderList: {
    marginBottom: spacing.md,
  },
  finderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    borderWidth: 2,
  },
  finderDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: spacing.md,
  },
  finderName: {
    flex: 1,
    fontSize: fontSize.lg,
    color: colors.text,
    fontWeight: '600',
  },
  finderTeam: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  // Guesser styles
  guesserContent: {
    flex: 1,
    padding: spacing.lg,
    alignItems: 'center',
  },
  guesserHeader: {
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  guesserInfo: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  giverNameLabel: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },
  teamBadge: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.full,
  },
  teamBadgeText: {
    color: '#000',
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  progressSection: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  progressLabel: {
    color: colors.textMuted,
    fontSize: fontSize.md,
  },
  progressValue: {
    fontSize: fontSize.xl,
    fontWeight: '900',
  },
  recentWords: {
    width: '100%',
    marginBottom: spacing.lg,
  },
  recentTitle: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    marginBottom: spacing.sm,
  },
  recentList: {
    gap: spacing.xs,
  },
  recentWord: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  recentWordText: {
    color: colors.text,
    fontSize: fontSize.md,
  },
  recentWordFinder: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
  },
  scoresSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'center',
    marginTop: 'auto',
    paddingBottom: spacing.lg,
  },
  scoreCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    minWidth: 80,
  },
  scoreColorBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: spacing.xs,
  },
  scoreName: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    marginBottom: spacing.xs,
  },
  scoreValue: {
    fontSize: fontSize.xxl,
    fontWeight: '900',
  },
});
