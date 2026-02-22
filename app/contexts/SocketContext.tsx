import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { SERVER_URL } from '@/constants/config';

interface Player {
  id: string;
  pseudo: string;
}

interface Team {
  id: number;
  players: Player[];
  score: number;
}

interface Round {
  phase: 'giving-clue' | 'guessing' | 'stealing' | 'result';
  clues: string[];
  clueCount: number;
  timeLeft: number;
  activeTeamIndex: number;
  giverIndex: number;
  word: string | null;
  category: string;
}

interface GameState {
  phase: 'lobby' | 'playing' | 'finished';
  players: Player[];
  teams: Team[];
  currentTeamIndex: number;
  roundNumber: number;
  totalRounds: number;
  currentRound: Round | null;
  hostId: string;
  isHost: boolean;
  myId: string;
  myTeamIndex: number;
}

interface RoundResult {
  correct: boolean;
  word: string;
  team: number | null;
  stolen: boolean;
}

interface GameOverData {
  rankings: {
    rank: number;
    team: Team;
    players: string[];
    score: number;
  }[];
}

interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
  gameState: GameState | null;
  roomCode: string | null;
  playerId: string | null;
  error: string | null;
  roundResult: RoundResult | null;
  gameOverData: GameOverData | null;
  timeLeft: number;
  createRoom: (pseudo: string, totalRounds?: number) => void;
  joinRoom: (roomCode: string, pseudo: string) => void;
  startGame: () => void;
  giveClue: (clue: string) => void;
  guess: (answer: string) => void;
  steal: (answer: string) => void;
  playAgain: () => void;
  clearError: () => void;
  clearRoundResult: () => void;
}

const SocketContext = createContext<SocketContextType | null>(null);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [roundResult, setRoundResult] = useState<RoundResult | null>(null);
  const [gameOverData, setGameOverData] = useState<GameOverData | null>(null);
  const [timeLeft, setTimeLeft] = useState(30);

  useEffect(() => {
    const newSocket = io(SERVER_URL, {
      transports: ['websocket'],
      autoConnect: true,
    });

    newSocket.on('connect', () => {
      console.log('Connecté au serveur');
      setConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Déconnecté du serveur');
      setConnected(false);
    });

    newSocket.on('room-created', ({ roomCode, playerId }) => {
      setRoomCode(roomCode);
      setPlayerId(playerId);
    });

    newSocket.on('room-joined', ({ roomCode, playerId }) => {
      setRoomCode(roomCode);
      setPlayerId(playerId);
    });

    newSocket.on('game-state', (state: GameState) => {
      setGameState(state);
      if (state.currentRound) {
        setTimeLeft(state.currentRound.timeLeft);
      }
    });

    newSocket.on('timer-tick', ({ timeLeft }) => {
      setTimeLeft(timeLeft);
    });

    newSocket.on('round-result', (result: RoundResult) => {
      setRoundResult(result);
    });

    newSocket.on('game-over', (data: GameOverData) => {
      setGameOverData(data);
    });

    newSocket.on('error', ({ message }) => {
      setError(message);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const createRoom = useCallback((pseudo: string, totalRounds = 10) => {
    socket?.emit('create-room', { pseudo, totalRounds });
  }, [socket]);

  const joinRoom = useCallback((code: string, pseudo: string) => {
    socket?.emit('join-room', { roomCode: code, pseudo });
  }, [socket]);

  const startGame = useCallback(() => {
    socket?.emit('start-game');
  }, [socket]);

  const giveClue = useCallback((clue: string) => {
    socket?.emit('give-clue', { clue });
  }, [socket]);

  const guess = useCallback((answer: string) => {
    socket?.emit('guess', { answer });
  }, [socket]);

  const steal = useCallback((answer: string) => {
    socket?.emit('steal', { answer });
  }, [socket]);

  const playAgain = useCallback(() => {
    setGameOverData(null);
    setRoundResult(null);
    socket?.emit('play-again');
  }, [socket]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const clearRoundResult = useCallback(() => {
    setRoundResult(null);
  }, []);

  return (
    <SocketContext.Provider
      value={{
        socket,
        connected,
        gameState,
        roomCode,
        playerId,
        error,
        roundResult,
        gameOverData,
        timeLeft,
        createRoom,
        joinRoom,
        startGame,
        giveClue,
        guess,
        steal,
        playAgain,
        clearError,
        clearRoundResult,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}
