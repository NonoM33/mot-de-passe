import React, { useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, FadeInUp, ZoomIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Button } from '@/components/Button';
import { useSocket } from '@/contexts/SocketContext';
import { Colors } from '@/constants/config';

export default function ResultsScreen() {
  const router = useRouter();
  const { gameState, gameOverData, playAgain } = useSocket();

  useEffect(() => {
    if (gameState?.phase === 'lobby') {
      router.replace('/lobby');
    }
  }, [gameState?.phase]);

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  const handlePlayAgain = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    playAgain();
  };

  const handleHome = () => {
    router.replace('/');
  };

  if (!gameOverData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loading}>
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const winner = gameOverData.rankings[0];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Animated.View entering={ZoomIn} style={styles.header}>
          <Text style={styles.title}>Fin de partie !</Text>
        </Animated.View>

        {/* Winner */}
        <Animated.View entering={FadeInDown.delay(300)} style={styles.winnerContainer}>
          <Text style={styles.winnerLabel}>Vainqueur</Text>
          <Text style={styles.winnerTeam}>
            {winner.players.join(' & ')}
          </Text>
          <Text style={styles.winnerScore}>{winner.score} points</Text>
        </Animated.View>

        {/* Rankings */}
        <Animated.View entering={FadeInUp.delay(500)} style={styles.rankings}>
          <Text style={styles.sectionTitle}>Classement</Text>
          {gameOverData.rankings.map((ranking, index) => (
            <Animated.View
              key={ranking.team.id}
              entering={FadeInUp.delay(600 + index * 100)}
              style={[
                styles.rankingCard,
                index === 0 && styles.rankingCardWinner,
              ]}
            >
              <View style={styles.rankingLeft}>
                <Text
                  style={[
                    styles.rankingPosition,
                    index === 0 && styles.rankingPositionWinner,
                  ]}
                >
                  #{ranking.rank}
                </Text>
                <Text style={styles.rankingPlayers}>
                  {ranking.players.join(' & ')}
                </Text>
              </View>
              <Text
                style={[
                  styles.rankingScore,
                  index === 0 && styles.rankingScoreWinner,
                ]}
              >
                {ranking.score}
              </Text>
            </Animated.View>
          ))}
        </Animated.View>

        {/* Actions */}
        <View style={styles.actions}>
          {gameState?.isHost && (
            <Button title="Rejouer" onPress={handlePlayAgain} variant="primary" />
          )}
          <Button title="Accueil" onPress={handleHome} variant="outline" />
        </View>
      </View>
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
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 36,
    fontWeight: '900',
    color: Colors.text,
    textTransform: 'uppercase',
    letterSpacing: 4,
  },
  winnerContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.warning,
    marginBottom: 32,
  },
  winnerLabel: {
    fontSize: 14,
    color: Colors.warning,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 8,
  },
  winnerTeam: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  winnerScore: {
    fontSize: 36,
    fontWeight: '900',
    color: Colors.warning,
  },
  rankings: {
    flex: 1,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
  },
  rankingCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  rankingCardWinner: {
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  rankingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  rankingPosition: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.textSecondary,
    width: 36,
  },
  rankingPositionWinner: {
    color: Colors.primary,
  },
  rankingPlayers: {
    fontSize: 16,
    color: Colors.text,
  },
  rankingScore: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.textSecondary,
  },
  rankingScoreWinner: {
    color: Colors.primary,
  },
  actions: {
    gap: 12,
    paddingBottom: 24,
  },
});
