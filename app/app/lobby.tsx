import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useSocket } from '../contexts/SocketContext';
import { Button } from '../components/Button';
import { colors, spacing, fontSize, borderRadius } from '../constants/theme';

const WORDS_OPTIONS = [5, 10, 15, 20];
const TIMER_OPTIONS = [30, 45, 60];

export default function LobbyScreen() {
  const {
    player,
    roomCode,
    roomState,
    gameState,
    updateSettings,
    changeTeam,
    addTeam,
    removeTeam,
    startGame,
    leaveRoom,
    error,
    clearError,
  } = useSocket();

  useEffect(() => {
    if (!roomCode) {
      router.replace('/');
    }
  }, [roomCode]);

  useEffect(() => {
    if (gameState) {
      router.push('/ready');
    }
  }, [gameState]);

  useEffect(() => {
    if (error) {
      Alert.alert('Erreur', error, [{ text: 'OK', onPress: clearError }]);
    }
  }, [error]);

  const handleLeave = () => {
    Alert.alert('Quitter', 'Tu veux vraiment partir ?', [
      { text: 'Non', style: 'cancel' },
      { text: 'Oui', onPress: leaveRoom, style: 'destructive' },
    ]);
  };

  const handleToggleCategory = (catKey: string) => {
    if (!player?.isHost || !roomState) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const currentCategories = roomState.settings.categories;
    let newCategories: string[];

    if (currentCategories.includes(catKey)) {
      // Don't allow less than 2 categories
      if (currentCategories.length <= 2) {
        Alert.alert('Minimum', 'Il faut au moins 2 catégories');
        return;
      }
      newCategories = currentCategories.filter((c) => c !== catKey);
    } else {
      newCategories = [...currentCategories, catKey];
    }

    updateSettings({ categories: newCategories });
  };

  const handleStartGame = () => {
    // Check if all teams have at least 1 player
    const activeTeams = roomState?.teams.filter((t) => t.players.length > 0) || [];
    if (activeTeams.length < 2) {
      Alert.alert('Erreur', 'Il faut au moins 2 équipes avec des joueurs');
      return;
    }
    startGame();
  };

  if (!roomState) return null;

  const isHost = player?.isHost;
  const { players, teams, settings, categories } = roomState;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleLeave}>
          <Text style={styles.backButton}>← Quitter</Text>
        </TouchableOpacity>
        <View style={styles.codeContainer}>
          <Text style={styles.codeLabel}>CODE:</Text>
          <Text style={styles.code}>{roomCode}</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Teams Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ÉQUIPES</Text>
          <View style={styles.teamsContainer}>
            {teams.map((team, teamIndex) => (
              <View
                key={teamIndex}
                style={[styles.teamCard, { borderColor: team.color }]}
              >
                <View style={styles.teamHeader}>
                  <View style={[styles.teamDot, { backgroundColor: team.color }]} />
                  <Text style={[styles.teamName, { color: team.color }]}>
                    {team.name}
                  </Text>
                  {isHost && teams.length > 2 && (
                    <TouchableOpacity
                      onPress={() => removeTeam(teamIndex)}
                      style={styles.removeTeamBtn}
                    >
                      <Text style={styles.removeTeamText}>×</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <View style={styles.teamPlayers}>
                  {team.players.map((playerId) => {
                    const p = players.find((pl) => pl.id === playerId);
                    return (
                      <View key={playerId} style={styles.playerChip}>
                        <Text style={styles.playerName}>
                          {p?.name}
                          {p?.isHost ? ' 👑' : ''}
                        </Text>
                      </View>
                    );
                  })}
                  {team.players.length === 0 && (
                    <Text style={styles.emptyTeam}>Aucun joueur</Text>
                  )}
                </View>
                {isHost && (
                  <View style={styles.teamActions}>
                    {players
                      .filter((p) => p.teamIndex !== teamIndex)
                      .map((p) => (
                        <TouchableOpacity
                          key={p.id}
                          onPress={() => changeTeam(p.id, teamIndex)}
                          style={styles.addPlayerBtn}
                        >
                          <Text style={styles.addPlayerText}>+ {p.name}</Text>
                        </TouchableOpacity>
                      ))}
                  </View>
                )}
              </View>
            ))}
          </View>
          {isHost && teams.length < 4 && (
            <Button
              title="+ Ajouter une équipe"
              onPress={addTeam}
              variant="outline"
              size="small"
              style={styles.addTeamBtn}
            />
          )}
        </View>

        {/* Settings Section (Host only) */}
        {isHost && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>MOTS PAR MANCHE</Text>
              <View style={styles.optionsRow}>
                {WORDS_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    style={[
                      styles.optionBtn,
                      settings.wordsPerRound === opt && styles.optionBtnActive,
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      updateSettings({ wordsPerRound: opt });
                    }}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        settings.wordsPerRound === opt && styles.optionTextActive,
                      ]}
                    >
                      {opt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>DURÉE DU TIMER</Text>
              <View style={styles.optionsRow}>
                {TIMER_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    style={[
                      styles.optionBtn,
                      settings.timerDuration === opt && styles.optionBtnActive,
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      updateSettings({ timerDuration: opt });
                    }}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        settings.timerDuration === opt && styles.optionTextActive,
                      ]}
                    >
                      {opt}s
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>CATÉGORIES</Text>
              <View style={styles.categoriesGrid}>
                {categories.map((cat) => {
                  const isActive = settings.categories.includes(cat.key);
                  return (
                    <TouchableOpacity
                      key={cat.key}
                      style={[styles.categoryChip, isActive && styles.categoryChipActive]}
                      onPress={() => handleToggleCategory(cat.key)}
                    >
                      <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                      <Text
                        style={[
                          styles.categoryName,
                          isActive && styles.categoryNameActive,
                        ]}
                      >
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </>
        )}

        {/* Settings Display (Non-host) */}
        {!isHost && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>PARAMÈTRES</Text>
            <Text style={styles.settingsInfo}>
              {settings.wordsPerRound} mots • {settings.timerDuration}s par manche
            </Text>
            <Text style={styles.settingsInfo}>
              {settings.categories.length} catégories actives
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {isHost ? (
          <Button
            title="LANCER LA PARTIE"
            onPress={handleStartGame}
            variant="success"
            size="large"
            disabled={players.length < 2}
          />
        ) : (
          <Text style={styles.waitingText}>En attente du lancement...</Text>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceLight,
  },
  backButton: {
    color: colors.textMuted,
    fontSize: fontSize.md,
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
  },
  codeLabel: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    marginRight: spacing.sm,
  },
  code: {
    color: colors.primary,
    fontSize: fontSize.xl,
    fontWeight: '900',
    letterSpacing: 4,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    fontWeight: '700',
    marginBottom: spacing.md,
    letterSpacing: 1,
  },
  teamsContainer: {
    gap: spacing.md,
  },
  teamCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 2,
  },
  teamHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  teamDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: spacing.sm,
  },
  teamName: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    flex: 1,
  },
  removeTeamBtn: {
    padding: spacing.xs,
  },
  removeTeamText: {
    color: colors.textMuted,
    fontSize: fontSize.xl,
  },
  teamPlayers: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  playerChip: {
    backgroundColor: colors.surfaceLight,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
  },
  playerName: {
    color: colors.text,
    fontSize: fontSize.sm,
  },
  emptyTeam: {
    color: colors.textDim,
    fontStyle: 'italic',
  },
  teamActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  addPlayerBtn: {
    backgroundColor: colors.surfaceLight,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  addPlayerText: {
    color: colors.primary,
    fontSize: fontSize.xs,
  },
  addTeamBtn: {
    marginTop: spacing.md,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  optionBtn: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '20',
  },
  optionText: {
    color: colors.textMuted,
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  optionTextActive: {
    color: colors.primary,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  categoryChipActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accent + '20',
  },
  categoryEmoji: {
    fontSize: fontSize.md,
    marginRight: spacing.xs,
  },
  categoryName: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
  },
  categoryNameActive: {
    color: colors.accent,
  },
  settingsInfo: {
    color: colors.text,
    fontSize: fontSize.md,
    marginBottom: spacing.xs,
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
