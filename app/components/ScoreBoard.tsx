import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Colors } from '@/constants/config';

interface Team {
  id: number;
  players: { id: string; pseudo: string }[];
  score: number;
}

interface ScoreBoardProps {
  teams: Team[];
  currentTeamIndex: number;
  myTeamIndex: number;
}

export function ScoreBoard({ teams, currentTeamIndex, myTeamIndex }: ScoreBoardProps) {
  return (
    <View style={styles.container}>
      {teams.map((team, index) => (
        <Animated.View
          key={team.id}
          entering={FadeInUp.delay(index * 100)}
          style={[
            styles.team,
            index === currentTeamIndex && styles.activeTeam,
            index === myTeamIndex && styles.myTeam,
          ]}
        >
          <View style={styles.teamHeader}>
            <Text style={styles.teamName}>
              Équipe {index + 1}
              {index === myTeamIndex && ' (Toi)'}
            </Text>
            <Text style={styles.score}>{team.score}</Text>
          </View>
          <Text style={styles.players}>
            {team.players.map(p => p.pseudo).join(' & ')}
          </Text>
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  team: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  activeTeam: {
    borderColor: Colors.primary,
  },
  myTeam: {
    backgroundColor: Colors.surfaceLight,
  },
  teamHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  teamName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
  },
  score: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  players: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
});
