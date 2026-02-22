import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import { useSocket } from '../contexts/SocketContext';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { colors, spacing, fontSize, borderRadius } from '../constants/theme';

export default function HomeScreen() {
  const [pseudo, setPseudo] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [showJoin, setShowJoin] = useState(false);

  const { isConnected, createRoom, joinRoom, roomCode: joinedRoom, error, clearError } = useSocket();

  const logoScale = useSharedValue(1);
  const logoOpacity = useSharedValue(0);

  useEffect(() => {
    logoOpacity.value = withTiming(1, { duration: 500 });
    logoScale.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 2000 }),
        withTiming(1, { duration: 2000 })
      ),
      -1,
      true
    );
  }, []);

  useEffect(() => {
    if (joinedRoom) {
      router.push('/lobby');
    }
  }, [joinedRoom]);

  useEffect(() => {
    if (error) {
      Alert.alert('Erreur', error, [{ text: 'OK', onPress: clearError }]);
    }
  }, [error]);

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
    opacity: logoOpacity.value,
  }));

  const handleCreate = () => {
    if (!pseudo.trim()) {
      Alert.alert('Erreur', 'Entre ton pseudo !');
      return;
    }
    createRoom(pseudo.trim());
  };

  const handleJoin = () => {
    if (!pseudo.trim()) {
      Alert.alert('Erreur', 'Entre ton pseudo !');
      return;
    }
    if (roomCode.length !== 4) {
      Alert.alert('Erreur', 'Le code doit faire 4 lettres');
      return;
    }
    joinRoom(roomCode.toUpperCase(), pseudo.trim());
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Animated.View style={[styles.logoContainer, logoAnimatedStyle]}>
          <Text style={styles.logoEmoji}>🔐</Text>
          <Text style={styles.title}>MOT DE PASSE</Text>
          <Text style={styles.subtitle}>Le jeu en équipe</Text>
        </Animated.View>

        <View style={styles.form}>
          <Input
            value={pseudo}
            onChangeText={setPseudo}
            placeholder="Ton pseudo"
            label="Comment tu t'appelles ?"
            maxLength={15}
            autoCapitalize="words"
          />

          {!showJoin ? (
            <View style={styles.buttons}>
              <Button
                title="CRÉER UNE PARTIE"
                onPress={handleCreate}
                variant="primary"
                size="large"
                disabled={!isConnected}
              />
              <Button
                title="REJOINDRE"
                onPress={() => setShowJoin(true)}
                variant="outline"
                size="large"
              />
            </View>
          ) : (
            <View style={styles.joinSection}>
              <Input
                value={roomCode}
                onChangeText={(text) => setRoomCode(text.toUpperCase())}
                placeholder="ABCD"
                label="Code de la partie"
                maxLength={4}
                autoCapitalize="characters"
                large
              />
              <View style={styles.buttons}>
                <Button
                  title="REJOINDRE LA PARTIE"
                  onPress={handleJoin}
                  variant="success"
                  size="large"
                  disabled={!isConnected || roomCode.length !== 4}
                />
                <Button
                  title="Retour"
                  onPress={() => setShowJoin(false)}
                  variant="ghost"
                  size="medium"
                />
              </View>
            </View>
          )}
        </View>

        <View style={styles.status}>
          <View style={[styles.statusDot, isConnected ? styles.connected : styles.disconnected]} />
          <Text style={styles.statusText}>
            {isConnected ? 'Connecté au serveur' : 'Connexion en cours...'}
          </Text>
        </View>
      </KeyboardAvoidingView>
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
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  logoEmoji: {
    fontSize: 72,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.mega,
    fontWeight: '900',
    color: colors.text,
    textAlign: 'center',
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: fontSize.lg,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  form: {
    gap: spacing.lg,
  },
  buttons: {
    gap: spacing.md,
  },
  joinSection: {
    gap: spacing.lg,
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xxl,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.sm,
  },
  connected: {
    backgroundColor: colors.success,
  },
  disconnected: {
    backgroundColor: colors.error,
  },
  statusText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
  },
});
