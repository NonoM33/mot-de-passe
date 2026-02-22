import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Share,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Button } from '@/components/Button';
import { useSocket } from '@/contexts/SocketContext';
import { Colors, GameConfig } from '@/constants/config';

export default function LobbyScreen() {
  const router = useRouter();
  const { gameState, roomCode, error, startGame, clearError } = useSocket();

  useEffect(() => {
    if (!roomCode) {
      router.replace('/');
    }
  }, [roomCode]);

  useEffect(() => {
    if (gameState?.phase === 'playing') {
      router.push('/game');
    }
  }, [gameState?.phase]);

  useEffect(() => {
    if (error) {
      Alert.alert('Erreur', error, [{ text: 'OK', onPress: clearError }]);
    }
  }, [error]);

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Rejoins ma partie Mot de Passe ! Code: ${roomCode}`,
      });
    } catch {
      // User cancelled
    }
  };

  const handleStart = () => {
    if (gameState && gameState.players.length < GameConfig.minPlayers) {
      Alert.alert('Erreur', `Il faut au moins ${GameConfig.minPlayers} joueurs`);
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    startGame();
  };

  if (!gameState) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loading}>
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const canStart = gameState.isHost && gameState.players.length >= GameConfig.minPlayers;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Animated.View entering={FadeInDown} style={styles.header}>
          <Text style={styles.title}>Salle d'attente</Text>
          <View style={styles.codeContainer}>
            <Text style={styles.codeLabel}>Code de la partie</Text>
            <Text style={styles.code}>{roomCode}</Text>
          </View>
          <Button
            title="Partager"
            onPress={handleShare}
            variant="outline"
            style={styles.shareButton}
          />
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(200)} style={styles.playersSection}>
          <Text style={styles.sectionTitle}>
            Joueurs ({gameState.players.length}/{GameConfig.maxPlayers})
          </Text>
          <View style={styles.playersList}>
            {gameState.players.map((player, index) => (
              <Animated.View
                key={player.id}
                entering={FadeInUp.delay(index * 100)}
                style={styles.playerCard}
              >
                <Text style={styles.playerName}>
                  {player.pseudo}
                  {player.id === gameState.hostId && ' (Hôte)'}
                  {player.id === gameState.myId && ' (Toi)'}
                </Text>
              </Animated.View>
            ))}
          </View>
        </Animated.View>

        <View style={styles.footer}>
          {gameState.isHost ? (
            <Button
              title="Lancer la partie"
              onPress={handleStart}
              disabled={!canStart}
            />
          ) : (
            <Text style={styles.waitingText}>
              En attente du lancement par l'hôte...
            </Text>
          )}

          {gameState.players.length < GameConfig.minPlayers && (
            <Text style={styles.infoText}>
              Il faut au moins {GameConfig.minPlayers} joueurs pour commencer
            </Text>
          )}
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
    paddingTop: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 24,
  },
  codeContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  codeLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  code: {
    fontSize: 48,
    fontWeight: '900',
    color: Colors.primary,
    letterSpacing: 8,
  },
  shareButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  playersSection: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
  },
  playersList: {
    gap: 12,
  },
  playerCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  playerName: {
    fontSize: 18,
    color: Colors.text,
    fontWeight: '600',
  },
  footer: {
    paddingVertical: 24,
    gap: 16,
    alignItems: 'center',
  },
  waitingText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  infoText: {
    fontSize: 14,
    color: Colors.warning,
    textAlign: 'center',
  },
});
