import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Alert,
  ScrollView,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  ZoomIn,
  SlideInUp,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Timer } from '@/components/Timer';
import { ScoreBoard } from '@/components/ScoreBoard';
import { ClueList } from '@/components/ClueList';
import { useSocket } from '@/contexts/SocketContext';
import { Colors, GameConfig } from '@/constants/config';

export default function GameScreen() {
  const router = useRouter();
  const {
    gameState,
    timeLeft,
    roundResult,
    gameOverData,
    error,
    giveClue,
    guess,
    steal,
    clearError,
    clearRoundResult,
  } = useSocket();

  const [inputValue, setInputValue] = useState('');
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    if (!gameState || gameState.phase === 'lobby') {
      router.replace('/');
    }
  }, [gameState]);

  useEffect(() => {
    if (gameState?.phase === 'finished' || gameOverData) {
      router.push('/results');
    }
  }, [gameState?.phase, gameOverData]);

  useEffect(() => {
    if (roundResult) {
      setShowResult(true);
      Haptics.notificationAsync(
        roundResult.correct
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Error
      );
      setTimeout(() => {
        setShowResult(false);
        clearRoundResult();
      }, 2500);
    }
  }, [roundResult]);

  useEffect(() => {
    if (error) {
      Alert.alert('Erreur', error, [{ text: 'OK', onPress: clearError }]);
    }
  }, [error]);

  if (!gameState || !gameState.currentRound) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loading}>
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const round = gameState.currentRound;
  const activeTeam = gameState.teams[round.activeTeamIndex];
  const giver = activeTeam?.players[round.giverIndex];
  const guesser = activeTeam?.players.find((p) => p.id !== giver?.id);

  const isGiver = giver?.id === gameState.myId;
  const isGuesser = guesser?.id === gameState.myId;
  const isMyTeamActive = gameState.myTeamIndex === round.activeTeamIndex;
  const canSteal = round.phase === 'stealing' && !isMyTeamActive;

  const handleSubmit = () => {
    if (!inputValue.trim()) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (round.phase === 'giving-clue' && isGiver) {
      giveClue(inputValue.trim());
    } else if (round.phase === 'guessing' && isGuesser) {
      guess(inputValue.trim());
    } else if (round.phase === 'stealing' && canSteal) {
      steal(inputValue.trim());
    }

    setInputValue('');
  };

  const getPhaseMessage = () => {
    if (round.phase === 'giving-clue') {
      if (isGiver) return 'Donne un indice (1 mot)';
      if (isMyTeamActive) return `${giver?.pseudo} réfléchit...`;
      return `${giver?.pseudo} donne un indice`;
    }
    if (round.phase === 'guessing') {
      if (isGuesser) return 'Devine le mot !';
      if (isMyTeamActive) return `${guesser?.pseudo} devine...`;
      return `${guesser?.pseudo} tente de deviner`;
    }
    if (round.phase === 'stealing') {
      if (canSteal) return 'Vole le point !';
      return "L'autre équipe peut voler";
    }
    return '';
  };

  const canInput = () => {
    if (round.phase === 'giving-clue' && isGiver) return true;
    if (round.phase === 'guessing' && isGuesser) return true;
    if (round.phase === 'stealing' && canSteal) return true;
    return false;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Result Modal */}
      <Modal visible={showResult} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Animated.View
            entering={ZoomIn}
            style={[
              styles.resultModal,
              {
                borderColor: roundResult?.correct
                  ? Colors.primary
                  : Colors.error,
              },
            ]}
          >
            <Text
              style={[
                styles.resultEmoji,
                { color: roundResult?.correct ? Colors.primary : Colors.error },
              ]}
            >
              {roundResult?.correct ? 'BRAVO !' : 'RATÉ !'}
            </Text>
            <Text style={styles.resultWord}>
              Le mot était : {roundResult?.word}
            </Text>
            {roundResult?.stolen && (
              <Text style={styles.resultStolen}>Point volé !</Text>
            )}
          </Animated.View>
        </View>
      </Modal>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Header */}
        <Animated.View entering={FadeInDown} style={styles.header}>
          <View style={styles.roundInfo}>
            <Text style={styles.roundText}>
              Mot {gameState.roundNumber}/{gameState.totalRounds}
            </Text>
            <Text style={styles.categoryText}>
              Catégorie : {round.category}
            </Text>
          </View>
          <Timer timeLeft={timeLeft} maxTime={round.phase === 'stealing' ? 15 : 30} />
        </Animated.View>

        {/* Secret Word (for giver only) */}
        {isGiver && round.word && (
          <Animated.View entering={ZoomIn} style={styles.secretWordContainer}>
            <Text style={styles.secretWordLabel}>Mot secret</Text>
            <Text style={styles.secretWord}>{round.word}</Text>
          </Animated.View>
        )}

        {/* Phase Message */}
        <Animated.View entering={FadeIn} style={styles.phaseContainer}>
          <Text style={styles.phaseText}>{getPhaseMessage()}</Text>
        </Animated.View>

        {/* Clues */}
        <ClueList clues={round.clues} maxClues={GameConfig.maxClues} />

        {/* Input */}
        {canInput() && (
          <Animated.View entering={SlideInUp} style={styles.inputContainer}>
            <Input
              value={inputValue}
              onChangeText={setInputValue}
              placeholder={
                round.phase === 'giving-clue'
                  ? 'Ton indice...'
                  : 'Ta réponse...'
              }
              maxLength={30}
              onSubmitEditing={handleSubmit}
            />
            <Button
              title={round.phase === 'giving-clue' ? 'Envoyer' : 'Deviner'}
              onPress={handleSubmit}
              disabled={!inputValue.trim()}
              style={styles.submitButton}
            />
          </Animated.View>
        )}

        {/* Scores */}
        <Animated.View entering={FadeInUp.delay(300)} style={styles.scoresSection}>
          <Text style={styles.sectionTitle}>Scores</Text>
          <ScoreBoard
            teams={gameState.teams}
            currentTeamIndex={round.activeTeamIndex}
            myTeamIndex={gameState.myTeamIndex}
          />
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: 18,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
    gap: 24,
  },
  header: {
    gap: 16,
  },
  roundInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roundText: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: 'bold',
  },
  categoryText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  secretWordContainer: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  secretWordLabel: {
    fontSize: 14,
    color: Colors.background,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 8,
  },
  secretWord: {
    fontSize: 36,
    fontWeight: '900',
    color: Colors.background,
    textTransform: 'uppercase',
    letterSpacing: 4,
  },
  phaseContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  phaseText: {
    fontSize: 20,
    color: Colors.accent,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  inputContainer: {
    gap: 16,
  },
  submitButton: {
    width: '100%',
  },
  scoresSection: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  resultModal: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    borderWidth: 3,
    minWidth: 280,
  },
  resultEmoji: {
    fontSize: 36,
    fontWeight: '900',
    marginBottom: 16,
  },
  resultWord: {
    fontSize: 20,
    color: Colors.text,
    textAlign: 'center',
  },
  resultStolen: {
    fontSize: 16,
    color: Colors.warning,
    marginTop: 8,
    fontWeight: 'bold',
  },
});
