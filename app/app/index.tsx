import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { useSocket } from '@/contexts/SocketContext';
import { Colors, GameConfig } from '@/constants/config';

type Mode = 'home' | 'create' | 'join';

export default function HomeScreen() {
  const router = useRouter();
  const { connected, roomCode, error, createRoom, joinRoom, clearError } = useSocket();

  const [mode, setMode] = useState<Mode>('home');
  const [pseudo, setPseudo] = useState('');
  const [code, setCode] = useState('');
  const [rounds, setRounds] = useState(GameConfig.defaultRounds.toString());

  useEffect(() => {
    if (roomCode) {
      router.push('/lobby');
    }
  }, [roomCode]);

  useEffect(() => {
    if (error) {
      Alert.alert('Erreur', error, [{ text: 'OK', onPress: clearError }]);
    }
  }, [error]);

  const handleCreate = () => {
    if (!pseudo.trim()) {
      Alert.alert('Erreur', 'Entre ton pseudo');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    createRoom(pseudo.trim(), parseInt(rounds) || GameConfig.defaultRounds);
  };

  const handleJoin = () => {
    if (!pseudo.trim()) {
      Alert.alert('Erreur', 'Entre ton pseudo');
      return;
    }
    if (!code.trim() || code.length !== 4) {
      Alert.alert('Erreur', 'Le code doit faire 4 lettres');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    joinRoom(code.trim().toUpperCase(), pseudo.trim());
  };

  const renderHome = () => (
    <Animated.View entering={FadeInDown.delay(200)} style={styles.content}>
      <View style={styles.buttonGroup}>
        <Button
          title="Créer une partie"
          onPress={() => setMode('create')}
          variant="primary"
        />
        <Button
          title="Rejoindre"
          onPress={() => setMode('join')}
          variant="outline"
        />
      </View>
    </Animated.View>
  );

  const renderCreate = () => (
    <Animated.View entering={FadeInUp} style={styles.content}>
      <Input
        label="Ton pseudo"
        value={pseudo}
        onChangeText={setPseudo}
        placeholder="Entre ton pseudo..."
        maxLength={15}
        autoCapitalize="words"
      />

      <Input
        label="Nombre de mots"
        value={rounds}
        onChangeText={setRounds}
        placeholder="10"
        maxLength={2}
        style={{ marginTop: 16 }}
      />

      <View style={styles.buttonGroup}>
        <Button
          title="Créer"
          onPress={handleCreate}
          disabled={!connected || !pseudo.trim()}
        />
        <Button
          title="Retour"
          onPress={() => setMode('home')}
          variant="outline"
        />
      </View>
    </Animated.View>
  );

  const renderJoin = () => (
    <Animated.View entering={FadeInUp} style={styles.content}>
      <Input
        label="Ton pseudo"
        value={pseudo}
        onChangeText={setPseudo}
        placeholder="Entre ton pseudo..."
        maxLength={15}
        autoCapitalize="words"
      />

      <Input
        label="Code de la partie"
        value={code}
        onChangeText={(text) => setCode(text.toUpperCase())}
        placeholder="ABCD"
        maxLength={4}
        autoCapitalize="characters"
        style={{ marginTop: 16 }}
      />

      <View style={styles.buttonGroup}>
        <Button
          title="Rejoindre"
          onPress={handleJoin}
          disabled={!connected || !pseudo.trim() || code.length !== 4}
        />
        <Button
          title="Retour"
          onPress={() => setMode('home')}
          variant="outline"
        />
      </View>
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <Animated.View entering={FadeInDown} style={styles.header}>
          <Text style={styles.title}>MOT DE</Text>
          <Text style={styles.titleAccent}>PASSE</Text>
          <Text style={styles.subtitle}>Le jeu des indices</Text>
        </Animated.View>

        {mode === 'home' && renderHome()}
        {mode === 'create' && renderCreate()}
        {mode === 'join' && renderJoin()}

        <View style={styles.status}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: connected ? Colors.primary : Colors.error },
            ]}
          />
          <Text style={styles.statusText}>
            {connected ? 'Connecté' : 'Connexion...'}
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardView: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 48,
    fontWeight: '900',
    color: Colors.text,
    letterSpacing: 4,
  },
  titleAccent: {
    fontSize: 64,
    fontWeight: '900',
    color: Colors.primary,
    letterSpacing: 8,
    marginTop: -10,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 8,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  content: {
    gap: 16,
  },
  buttonGroup: {
    gap: 12,
    marginTop: 24,
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 48,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
});
