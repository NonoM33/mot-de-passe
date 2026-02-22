// Adresse du serveur - à modifier selon votre configuration
// En développement local, utilisez l'IP de votre machine
// Exemple: 'http://192.168.1.100:3001'
export const SERVER_URL = process.env.EXPO_PUBLIC_SERVER_URL || 'http://motdepasse.157.180.43.90.sslip.io';

// Couleurs du thème
export const Colors = {
  background: '#0A0A0A',
  surface: '#1A1A1A',
  surfaceLight: '#2A2A2A',
  primary: '#00FF88', // Vert néon
  secondary: '#FF00FF', // Magenta néon
  accent: '#00FFFF', // Cyan néon
  warning: '#FFD700', // Or
  error: '#FF4444',
  text: '#FFFFFF',
  textSecondary: '#888888',
  textMuted: '#555555',
};

// Configuration du jeu
export const GameConfig = {
  defaultRounds: 10,
  maxPlayers: 8,
  minPlayers: 2,
  timerDuration: 30,
  stealTimerDuration: 15,
  maxClues: 3,
};
