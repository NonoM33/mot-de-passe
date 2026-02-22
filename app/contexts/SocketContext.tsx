import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { SERVER_URL } from '../constants/config';

interface Player {
  id: string;
  name: string;
  teamIndex: number;
  isHost: boolean;
}

interface Team {
  name: string;
  color: string;
  players: string[];
  score: number;
}

interface Category {
  key: string;
  name: string;
  emoji: string;
  wordCount: number;
}

interface Settings {
  wordsPerRound: number;
  timerDuration: number;
  categories: string[];
}

interface WordInfo {
  word: string;
  category: string;
  foundBy?: string;
  foundByTeam?: number;
}

interface GameState {
  phase: 'ready' | 'playing' | 'roundEnd' | 'gameOver';
  currentWordIndex: number;
  totalWords: number;
  currentTeamIndex: number;
  currentTeamName: string;
  currentTeamColor: string;
  currentGiverId: string;
  currentGiverName: string;
  roundNumber: number;
  totalRounds: number;
  timer: number;
  timerDuration: number;
  wordsFound: WordInfo[];
  wordsSkipped: WordInfo[];
  hintsGiven: number;
  scores: { name: string; color: string; score: number }[];
}

interface RoomState {
  players: Player[];
  teams: Team[];
  settings: Settings;
  categories: Category[];
}

interface SocketContextValue {
  socket: Socket | null;
  isConnected: boolean;
  player: Player | null;
  roomCode: string | null;
  roomState: RoomState | null;
  gameState: GameState | null;
  currentWord: { word: string; category: string; emoji: string } | null;
  error: string | null;
  createRoom: (playerName: string) => void;
  joinRoom: (roomCode: string, playerName: string) => void;
  leaveRoom: () => void;
  updateSettings: (settings: Partial<Settings>) => void;
  changeTeam: (playerId: string, newTeamIndex: number) => void;
  addTeam: () => void;
  removeTeam: (teamIndex: number) => void;
  startGame: () => void;
  giverReady: () => void;
  wordFound: (finderId: string) => void;
  wordSkipped: () => void;
  continueGame: () => void;
  playAgain: () => void;
  clearError: () => void;
}

const SocketContext = createContext<SocketContextValue | null>(null);

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [player, setPlayer] = useState<Player | null>(null);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [currentWord, setCurrentWord] = useState<{ word: string; category: string; emoji: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const newSocket = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Connected to server');
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
      setIsConnected(false);
    });

    newSocket.on('error', (data: { message: string }) => {
      setError(data.message);
    });

    // Room events
    newSocket.on('room-created', (data) => {
      setRoomCode(data.code);
      setPlayer(data.player);
      setRoomState(data.room);
    });

    newSocket.on('room-joined', (data) => {
      setRoomCode(data.code);
      setPlayer(data.player);
      setRoomState(data.room);
    });

    newSocket.on('player-joined', (data) => {
      setRoomState(prev => prev ? {
        ...prev,
        players: data.players,
        teams: data.teams
      } : null);
    });

    newSocket.on('player-left', (data) => {
      setRoomState(prev => prev ? {
        ...prev,
        players: data.players,
        teams: data.teams
      } : null);
      // Update host status if needed
      if (data.newHostId === newSocket.id) {
        setPlayer(prev => prev ? { ...prev, isHost: true } : null);
      }
    });

    newSocket.on('settings-updated', (data) => {
      setRoomState(prev => prev ? { ...prev, settings: data.settings } : null);
    });

    newSocket.on('teams-updated', (data) => {
      setRoomState(prev => prev ? {
        ...prev,
        players: data.players,
        teams: data.teams
      } : null);
      // Update player's team index
      const updatedPlayer = data.players.find((p: Player) => p.id === newSocket.id);
      if (updatedPlayer) {
        setPlayer(prev => prev ? { ...prev, teamIndex: updatedPlayer.teamIndex } : null);
      }
    });

    // Game events
    newSocket.on('game-started', (data) => {
      setGameState(data);
      setCurrentWord(null);
    });

    newSocket.on('game-state-update', (data) => {
      setGameState(data);
    });

    newSocket.on('current-word', (data) => {
      setCurrentWord(data);
    });

    newSocket.on('timer-tick', (data) => {
      setGameState(prev => prev ? { ...prev, timer: data.timer } : null);
    });

    newSocket.on('game-reset', (data) => {
      setGameState(null);
      setCurrentWord(null);
      setRoomState(prev => prev ? {
        ...prev,
        players: data.players,
        teams: data.teams,
        settings: data.settings
      } : null);
    });

    return () => {
      newSocket.close();
    };
  }, []);

  const createRoom = useCallback((playerName: string) => {
    socketRef.current?.emit('create-room', { playerName });
  }, []);

  const joinRoom = useCallback((code: string, playerName: string) => {
    socketRef.current?.emit('join-room', { roomCode: code, playerName });
  }, []);

  const leaveRoom = useCallback(() => {
    socketRef.current?.emit('leave-room');
    setRoomCode(null);
    setPlayer(null);
    setRoomState(null);
    setGameState(null);
    setCurrentWord(null);
  }, []);

  const updateSettings = useCallback((settings: Partial<Settings>) => {
    socketRef.current?.emit('update-settings', { settings });
  }, []);

  const changeTeam = useCallback((playerId: string, newTeamIndex: number) => {
    socketRef.current?.emit('change-team', { playerId, newTeamIndex });
  }, []);

  const addTeam = useCallback(() => {
    socketRef.current?.emit('add-team');
  }, []);

  const removeTeam = useCallback((teamIndex: number) => {
    socketRef.current?.emit('remove-team', { teamIndex });
  }, []);

  const startGame = useCallback(() => {
    socketRef.current?.emit('start-game');
  }, []);

  const giverReady = useCallback(() => {
    socketRef.current?.emit('giver-ready');
  }, []);

  const wordFound = useCallback((finderId: string) => {
    socketRef.current?.emit('word-found', { finderId });
  }, []);

  const wordSkipped = useCallback(() => {
    socketRef.current?.emit('word-skipped');
  }, []);

  const continueGame = useCallback(() => {
    socketRef.current?.emit('continue-game');
  }, []);

  const playAgain = useCallback(() => {
    socketRef.current?.emit('play-again');
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        player,
        roomCode,
        roomState,
        gameState,
        currentWord,
        error,
        createRoom,
        joinRoom,
        leaveRoom,
        updateSettings,
        changeTeam,
        addTeam,
        removeTeam,
        startGame,
        giverReady,
        wordFound,
        wordSkipped,
        continueGame,
        playAgain,
        clearError,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}
