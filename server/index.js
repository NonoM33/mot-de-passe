const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const wordsData = require('./words.json');

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// In-memory storage
const rooms = new Map();
const playerRooms = new Map();

// Team colors
const TEAM_COLORS = [
  { name: 'Bleu', color: '#4A9EFF' },
  { name: 'Rouge', color: '#FF4A6E' },
  { name: 'Vert', color: '#4AFF8B' },
  { name: 'Orange', color: '#FF8B4A' }
];

// Generate room code (4 letters)
function generateRoomCode() {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += letters[Math.floor(Math.random() * letters.length)];
  }
  return code;
}

// Get words for selected categories
function getWordsForCategories(categories, count) {
  const allWords = [];

  for (const catKey of categories) {
    const category = wordsData.categories[catKey];
    if (category) {
      category.words.forEach(word => {
        allWords.push({ word, category: category.name, emoji: category.emoji });
      });
    }
  }

  // Shuffle and pick
  const shuffled = allWords.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// Create initial room state
function createRoom(hostId, hostName) {
  const code = generateRoomCode();

  const room = {
    code,
    hostId,
    players: [{
      id: hostId,
      name: hostName,
      teamIndex: 0,
      isHost: true
    }],
    settings: {
      wordsPerRound: 10,
      timerDuration: 45,
      categories: Object.keys(wordsData.categories)
    },
    teams: [
      { name: 'Bleu', color: '#4A9EFF', players: [hostId], score: 0 },
      { name: 'Rouge', color: '#FF4A6E', players: [], score: 0 }
    ],
    gameState: null
  };

  rooms.set(code, room);
  return room;
}

// Game state management
function createGameState(room) {
  const words = getWordsForCategories(
    room.settings.categories,
    room.settings.wordsPerRound * room.teams.filter(t => t.players.length > 0).length
  );

  // Determine play order (teams take turns)
  const activeTeams = room.teams
    .map((team, index) => ({ ...team, teamIndex: index }))
    .filter(team => team.players.length > 0);

  return {
    phase: 'ready', // ready, playing, roundEnd, gameOver
    words,
    currentWordIndex: 0,
    currentTeamIndex: 0,
    currentGiverIndex: {}, // Track giver rotation per team
    roundNumber: 1,
    totalRounds: activeTeams.length,
    wordsFound: [],
    wordsSkipped: [],
    timer: room.settings.timerDuration,
    timerInterval: null,
    hintsGiven: 0,
    activeTeams
  };
}

function getCurrentGiver(room) {
  const gameState = room.gameState;
  const team = gameState.activeTeams[gameState.currentTeamIndex];
  const giverRotation = gameState.currentGiverIndex[team.teamIndex] || 0;
  const playerId = team.players[giverRotation % team.players.length];
  return room.players.find(p => p.id === playerId);
}

function startTimer(roomCode) {
  const room = rooms.get(roomCode);
  if (!room || !room.gameState) return;

  // Clear any existing timer
  if (room.gameState.timerInterval) {
    clearInterval(room.gameState.timerInterval);
  }

  room.gameState.timer = room.settings.timerDuration;
  room.gameState.timerInterval = setInterval(() => {
    const currentRoom = rooms.get(roomCode);
    if (!currentRoom || !currentRoom.gameState) {
      clearInterval(room.gameState.timerInterval);
      return;
    }

    currentRoom.gameState.timer--;
    io.to(roomCode).emit('timer-tick', { timer: currentRoom.gameState.timer });

    if (currentRoom.gameState.timer <= 0) {
      clearInterval(currentRoom.gameState.timerInterval);
      endRound(roomCode);
    }
  }, 1000);
}

function stopTimer(roomCode) {
  const room = rooms.get(roomCode);
  if (room?.gameState?.timerInterval) {
    clearInterval(room.gameState.timerInterval);
    room.gameState.timerInterval = null;
  }
}

function endRound(roomCode) {
  const room = rooms.get(roomCode);
  if (!room || !room.gameState) return;

  stopTimer(roomCode);
  room.gameState.phase = 'roundEnd';

  // Move to next team
  room.gameState.currentTeamIndex++;

  // Check if game is over
  if (room.gameState.currentTeamIndex >= room.gameState.activeTeams.length) {
    room.gameState.roundNumber++;
    room.gameState.currentTeamIndex = 0;

    // Rotate givers
    room.gameState.activeTeams.forEach(team => {
      room.gameState.currentGiverIndex[team.teamIndex] =
        (room.gameState.currentGiverIndex[team.teamIndex] || 0) + 1;
    });

    // Check if we've done all rounds (each player has been giver once)
    const maxRounds = Math.max(...room.gameState.activeTeams.map(t => t.players.length));
    if (room.gameState.roundNumber > maxRounds) {
      room.gameState.phase = 'gameOver';
    }
  }

  io.to(roomCode).emit('game-state-update', getClientGameState(room));
}

function getClientGameState(room) {
  if (!room.gameState) return null;

  const currentGiver = getCurrentGiver(room);
  const currentTeam = room.gameState.activeTeams[room.gameState.currentTeamIndex];

  return {
    phase: room.gameState.phase,
    currentWordIndex: room.gameState.currentWordIndex,
    totalWords: room.settings.wordsPerRound,
    currentTeamIndex: currentTeam?.teamIndex,
    currentTeamName: currentTeam ? room.teams[currentTeam.teamIndex].name : null,
    currentTeamColor: currentTeam ? room.teams[currentTeam.teamIndex].color : null,
    currentGiverId: currentGiver?.id,
    currentGiverName: currentGiver?.name,
    roundNumber: room.gameState.roundNumber,
    totalRounds: Math.max(...room.gameState.activeTeams.map(t => t.players.length)),
    timer: room.gameState.timer,
    timerDuration: room.settings.timerDuration,
    wordsFound: room.gameState.wordsFound,
    wordsSkipped: room.gameState.wordsSkipped,
    hintsGiven: room.gameState.hintsGiven,
    scores: room.teams.map(t => ({ name: t.name, color: t.color, score: t.score }))
  };
}

// Socket.io event handlers
io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);

  // Create room
  socket.on('create-room', ({ playerName }) => {
    const room = createRoom(socket.id, playerName);
    socket.join(room.code);
    playerRooms.set(socket.id, room.code);

    socket.emit('room-created', {
      code: room.code,
      player: room.players[0],
      room: {
        players: room.players,
        teams: room.teams,
        settings: room.settings,
        categories: Object.entries(wordsData.categories).map(([key, val]) => ({
          key,
          name: val.name,
          emoji: val.emoji,
          wordCount: val.words.length
        }))
      }
    });
  });

  // Join room
  socket.on('join-room', ({ roomCode, playerName }) => {
    const code = roomCode.toUpperCase();
    const room = rooms.get(code);

    if (!room) {
      socket.emit('error', { message: 'Partie introuvable' });
      return;
    }

    if (room.gameState && room.gameState.phase !== 'gameOver') {
      socket.emit('error', { message: 'Partie déjà en cours' });
      return;
    }

    // Find team with fewest players
    let minPlayers = Infinity;
    let teamIndex = 0;
    room.teams.forEach((team, idx) => {
      if (team.players.length < minPlayers) {
        minPlayers = team.players.length;
        teamIndex = idx;
      }
    });

    const player = {
      id: socket.id,
      name: playerName,
      teamIndex,
      isHost: false
    };

    room.players.push(player);
    room.teams[teamIndex].players.push(socket.id);

    socket.join(code);
    playerRooms.set(socket.id, code);

    socket.emit('room-joined', {
      code,
      player,
      room: {
        players: room.players,
        teams: room.teams,
        settings: room.settings,
        categories: Object.entries(wordsData.categories).map(([key, val]) => ({
          key,
          name: val.name,
          emoji: val.emoji,
          wordCount: val.words.length
        }))
      }
    });

    socket.to(code).emit('player-joined', { player, players: room.players, teams: room.teams });
  });

  // Update settings (host only)
  socket.on('update-settings', ({ settings }) => {
    const code = playerRooms.get(socket.id);
    const room = rooms.get(code);

    if (!room || room.hostId !== socket.id) return;

    room.settings = { ...room.settings, ...settings };
    io.to(code).emit('settings-updated', { settings: room.settings });
  });

  // Update teams
  socket.on('update-teams', ({ teams }) => {
    const code = playerRooms.get(socket.id);
    const room = rooms.get(code);

    if (!room || room.hostId !== socket.id) return;

    room.teams = teams;

    // Update player teamIndex
    room.players.forEach(player => {
      const teamIdx = teams.findIndex(t => t.players.includes(player.id));
      player.teamIndex = teamIdx >= 0 ? teamIdx : 0;
    });

    io.to(code).emit('teams-updated', { teams: room.teams, players: room.players });
  });

  // Change player team
  socket.on('change-team', ({ playerId, newTeamIndex }) => {
    const code = playerRooms.get(socket.id);
    const room = rooms.get(code);

    if (!room || room.hostId !== socket.id) return;

    const player = room.players.find(p => p.id === playerId);
    if (!player) return;

    // Remove from old team
    room.teams[player.teamIndex].players = room.teams[player.teamIndex].players.filter(id => id !== playerId);

    // Add to new team
    player.teamIndex = newTeamIndex;
    room.teams[newTeamIndex].players.push(playerId);

    io.to(code).emit('teams-updated', { teams: room.teams, players: room.players });
  });

  // Add/remove team
  socket.on('add-team', () => {
    const code = playerRooms.get(socket.id);
    const room = rooms.get(code);

    if (!room || room.hostId !== socket.id || room.teams.length >= 4) return;

    const teamColor = TEAM_COLORS[room.teams.length];
    room.teams.push({ name: teamColor.name, color: teamColor.color, players: [], score: 0 });

    io.to(code).emit('teams-updated', { teams: room.teams, players: room.players });
  });

  socket.on('remove-team', ({ teamIndex }) => {
    const code = playerRooms.get(socket.id);
    const room = rooms.get(code);

    if (!room || room.hostId !== socket.id || room.teams.length <= 2) return;

    // Move players to first team
    const playersToMove = room.teams[teamIndex].players;
    playersToMove.forEach(playerId => {
      const player = room.players.find(p => p.id === playerId);
      if (player) {
        player.teamIndex = 0;
        room.teams[0].players.push(playerId);
      }
    });

    room.teams.splice(teamIndex, 1);

    // Update team indices
    room.players.forEach(player => {
      if (player.teamIndex >= teamIndex) {
        player.teamIndex = Math.max(0, player.teamIndex - 1);
      }
    });

    io.to(code).emit('teams-updated', { teams: room.teams, players: room.players });
  });

  // Start game
  socket.on('start-game', () => {
    const code = playerRooms.get(socket.id);
    const room = rooms.get(code);

    if (!room || room.hostId !== socket.id) return;

    // Validate teams have at least 1 player each
    const activeTeams = room.teams.filter(t => t.players.length > 0);
    if (activeTeams.length < 2) {
      socket.emit('error', { message: 'Il faut au moins 2 équipes avec des joueurs' });
      return;
    }

    // Reset scores
    room.teams.forEach(team => team.score = 0);

    // Initialize game state
    room.gameState = createGameState(room);
    room.gameState.currentGiverIndex = {};
    room.gameState.activeTeams.forEach(team => {
      room.gameState.currentGiverIndex[team.teamIndex] = 0;
    });

    io.to(code).emit('game-started', getClientGameState(room));
  });

  // Giver ready - start playing
  socket.on('giver-ready', () => {
    const code = playerRooms.get(socket.id);
    const room = rooms.get(code);

    if (!room || !room.gameState) return;

    const currentGiver = getCurrentGiver(room);
    if (currentGiver.id !== socket.id) return;

    room.gameState.phase = 'playing';
    room.gameState.hintsGiven = 0;
    startTimer(code);

    // Send current word only to giver
    const currentWord = room.gameState.words[room.gameState.currentWordIndex];
    socket.emit('current-word', { word: currentWord.word, category: currentWord.category, emoji: currentWord.emoji });

    io.to(code).emit('game-state-update', getClientGameState(room));
  });

  // Hint given (track count)
  socket.on('hint-given', () => {
    const code = playerRooms.get(socket.id);
    const room = rooms.get(code);

    if (!room || !room.gameState) return;

    room.gameState.hintsGiven++;
    io.to(code).emit('game-state-update', getClientGameState(room));
  });

  // Word found
  socket.on('word-found', ({ finderId }) => {
    const code = playerRooms.get(socket.id);
    const room = rooms.get(code);

    if (!room || !room.gameState || room.gameState.phase !== 'playing') return;

    const currentGiver = getCurrentGiver(room);
    if (currentGiver.id !== socket.id) return;

    const currentWord = room.gameState.words[room.gameState.currentWordIndex];
    const finder = room.players.find(p => p.id === finderId);

    room.gameState.wordsFound.push({
      word: currentWord.word,
      category: currentWord.category,
      foundBy: finder?.name || 'Inconnu',
      foundByTeam: finder?.teamIndex
    });

    // Award point to finder's team
    if (finder) {
      room.teams[finder.teamIndex].score++;
    }

    // Move to next word
    room.gameState.currentWordIndex++;

    // Check if round is over
    if (room.gameState.currentWordIndex >=
        (room.gameState.currentTeamIndex + 1) * room.settings.wordsPerRound) {
      endRound(code);
      return;
    }

    // Send next word to giver
    const nextWord = room.gameState.words[room.gameState.currentWordIndex];
    socket.emit('current-word', { word: nextWord.word, category: nextWord.category, emoji: nextWord.emoji });

    io.to(code).emit('game-state-update', getClientGameState(room));
  });

  // Word skipped
  socket.on('word-skipped', () => {
    const code = playerRooms.get(socket.id);
    const room = rooms.get(code);

    if (!room || !room.gameState || room.gameState.phase !== 'playing') return;

    const currentGiver = getCurrentGiver(room);
    if (currentGiver.id !== socket.id) return;

    const currentWord = room.gameState.words[room.gameState.currentWordIndex];

    room.gameState.wordsSkipped.push({
      word: currentWord.word,
      category: currentWord.category
    });

    // Move to next word
    room.gameState.currentWordIndex++;

    // Check if round is over (no more words)
    if (room.gameState.currentWordIndex >=
        (room.gameState.currentTeamIndex + 1) * room.settings.wordsPerRound) {
      endRound(code);
      return;
    }

    // Send next word to giver
    const nextWord = room.gameState.words[room.gameState.currentWordIndex];
    socket.emit('current-word', { word: nextWord.word, category: nextWord.category, emoji: nextWord.emoji });

    io.to(code).emit('game-state-update', getClientGameState(room));
  });

  // Continue to next round
  socket.on('continue-game', () => {
    const code = playerRooms.get(socket.id);
    const room = rooms.get(code);

    if (!room || !room.gameState || room.hostId !== socket.id) return;

    if (room.gameState.phase === 'gameOver') {
      socket.emit('error', { message: 'La partie est terminée' });
      return;
    }

    // Reset round state
    room.gameState.phase = 'ready';
    room.gameState.wordsFound = [];
    room.gameState.wordsSkipped = [];
    room.gameState.hintsGiven = 0;

    io.to(code).emit('game-state-update', getClientGameState(room));
  });

  // Play again
  socket.on('play-again', () => {
    const code = playerRooms.get(socket.id);
    const room = rooms.get(code);

    if (!room || room.hostId !== socket.id) return;

    // Reset everything
    room.teams.forEach(team => team.score = 0);
    room.gameState = null;

    io.to(code).emit('game-reset', {
      players: room.players,
      teams: room.teams,
      settings: room.settings
    });
  });

  // Leave room
  socket.on('leave-room', () => {
    handleDisconnect(socket);
  });

  // Disconnect
  socket.on('disconnect', () => {
    handleDisconnect(socket);
  });

  function handleDisconnect(socket) {
    const code = playerRooms.get(socket.id);
    if (!code) return;

    const room = rooms.get(code);
    if (!room) return;

    // Remove player from room
    const playerIndex = room.players.findIndex(p => p.id === socket.id);
    if (playerIndex >= 0) {
      const player = room.players[playerIndex];
      room.teams[player.teamIndex].players = room.teams[player.teamIndex].players.filter(id => id !== socket.id);
      room.players.splice(playerIndex, 1);
    }

    playerRooms.delete(socket.id);
    socket.leave(code);

    // If host left, assign new host
    if (room.hostId === socket.id && room.players.length > 0) {
      room.hostId = room.players[0].id;
      room.players[0].isHost = true;
    }

    // If room is empty, delete it
    if (room.players.length === 0) {
      stopTimer(code);
      rooms.delete(code);
      console.log('Room deleted:', code);
      return;
    }

    io.to(code).emit('player-left', {
      playerId: socket.id,
      players: room.players,
      teams: room.teams,
      newHostId: room.hostId
    });

    console.log('Player disconnected:', socket.id);
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', rooms: rooms.size });
});

// Categories endpoint
app.get('/categories', (req, res) => {
  const categories = Object.entries(wordsData.categories).map(([key, val]) => ({
    key,
    name: val.name,
    emoji: val.emoji,
    wordCount: val.words.length
  }));
  res.json(categories);
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`🎮 Mot de Passe server running on port ${PORT}`);
});
