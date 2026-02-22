const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const words = require('./words.json');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3001;

// État des rooms
const rooms = new Map();

// Génère un code de room à 4 lettres
function generateRoomCode() {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code;
  do {
    code = '';
    for (let i = 0; i < 4; i++) {
      code += letters[Math.floor(Math.random() * letters.length)];
    }
  } while (rooms.has(code));
  return code;
}

// Sélectionne un mot aléatoire
function getRandomWord(usedWords = []) {
  const allCategories = Object.keys(words);
  const category = allCategories[Math.floor(Math.random() * allCategories.length)];
  const categoryWords = words[category].filter(w => !usedWords.includes(w));

  if (categoryWords.length === 0) {
    // Toutes les catégories épuisées, on réinitialise
    const freshWords = words[category];
    return {
      word: freshWords[Math.floor(Math.random() * freshWords.length)],
      category
    };
  }

  return {
    word: categoryWords[Math.floor(Math.random() * categoryWords.length)],
    category
  };
}

// Valide un indice
function validateClue(clue, secretWord) {
  if (!clue || typeof clue !== 'string') return { valid: false, reason: 'Indice invalide' };

  const cleanClue = clue.trim().toLowerCase();
  const cleanSecret = secretWord.toLowerCase();

  // Pas de phrase (max 1 mot)
  if (cleanClue.includes(' ')) {
    return { valid: false, reason: 'Un seul mot autorisé !' };
  }

  // Pas le mot lui-même
  if (cleanClue === cleanSecret) {
    return { valid: false, reason: 'Tu ne peux pas donner le mot lui-même !' };
  }

  // Pas un dérivé direct (commence ou finit pareil)
  if (cleanClue.length > 3 && cleanSecret.length > 3) {
    const root = cleanSecret.slice(0, Math.min(4, cleanSecret.length));
    if (cleanClue.startsWith(root) || cleanSecret.startsWith(cleanClue.slice(0, 4))) {
      return { valid: false, reason: 'Mot trop proche du mot secret !' };
    }
  }

  // Pas trop long
  if (cleanClue.length > 30) {
    return { valid: false, reason: 'Indice trop long !' };
  }

  return { valid: true };
}

// Vérifie si la réponse est correcte
function checkAnswer(answer, secretWord) {
  if (!answer || typeof answer !== 'string') return false;
  const cleanAnswer = answer.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const cleanSecret = secretWord.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return cleanAnswer === cleanSecret;
}

// Crée les équipes automatiquement
function createTeams(players) {
  const shuffled = [...players].sort(() => Math.random() - 0.5);
  const teams = [];

  for (let i = 0; i < shuffled.length; i += 2) {
    const team = {
      id: teams.length,
      players: [shuffled[i]],
      score: 0
    };
    if (shuffled[i + 1]) {
      team.players.push(shuffled[i + 1]);
    }
    teams.push(team);
  }

  return teams;
}

// Initialise un nouveau tour
function initRound(room) {
  const { word, category } = getRandomWord(room.usedWords);
  room.usedWords.push(word);

  room.currentRound = {
    word,
    category,
    clues: [],
    clueCount: 0,
    phase: 'giving-clue', // giving-clue, guessing, stealing, result
    timeLeft: 30,
    activeTeamIndex: room.currentTeamIndex,
    giverIndex: room.teams[room.currentTeamIndex].currentGiverIndex || 0
  };

  // Alterner le donneur dans l'équipe
  const team = room.teams[room.currentTeamIndex];
  team.currentGiverIndex = (team.currentGiverIndex || 0 + 1) % team.players.length;
}

// Passe à l'équipe suivante
function nextTeam(room) {
  room.currentTeamIndex = (room.currentTeamIndex + 1) % room.teams.length;
  room.roundNumber++;
}

// Broadcast l'état du jeu à tous les joueurs
function broadcastGameState(roomCode) {
  const room = rooms.get(roomCode);
  if (!room) return;

  room.players.forEach(player => {
    const socket = io.sockets.sockets.get(player.socketId);
    if (!socket) return;

    const isGiver = room.currentRound &&
      room.teams[room.currentRound.activeTeamIndex]?.players[room.currentRound.giverIndex]?.id === player.id;

    const state = {
      phase: room.phase,
      players: room.players.map(p => ({ id: p.id, pseudo: p.pseudo })),
      teams: room.teams.map(t => ({
        id: t.id,
        players: t.players.map(p => ({ id: p.id, pseudo: p.pseudo })),
        score: t.score
      })),
      currentTeamIndex: room.currentTeamIndex,
      roundNumber: room.roundNumber,
      totalRounds: room.totalRounds,
      currentRound: room.currentRound ? {
        phase: room.currentRound.phase,
        clues: room.currentRound.clues,
        clueCount: room.currentRound.clueCount,
        timeLeft: room.currentRound.timeLeft,
        activeTeamIndex: room.currentRound.activeTeamIndex,
        giverIndex: room.currentRound.giverIndex,
        // Le mot secret uniquement pour le donneur
        word: isGiver ? room.currentRound.word : null,
        category: room.currentRound.category
      } : null,
      hostId: room.hostId,
      isHost: player.id === room.hostId,
      myId: player.id,
      myTeamIndex: room.teams.findIndex(t => t.players.some(p => p.id === player.id))
    };

    socket.emit('game-state', state);
  });
}

io.on('connection', (socket) => {
  console.log(`Joueur connecté: ${socket.id}`);

  // Créer une room
  socket.on('create-room', ({ pseudo, totalRounds = 10 }) => {
    const roomCode = generateRoomCode();
    const playerId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const player = {
      id: playerId,
      pseudo,
      socketId: socket.id
    };

    const room = {
      code: roomCode,
      hostId: playerId,
      players: [player],
      teams: [],
      phase: 'lobby', // lobby, playing, finished
      currentTeamIndex: 0,
      roundNumber: 0,
      totalRounds,
      currentRound: null,
      usedWords: [],
      timer: null
    };

    rooms.set(roomCode, room);
    socket.join(roomCode);
    socket.roomCode = roomCode;
    socket.playerId = playerId;

    socket.emit('room-created', { roomCode, playerId });
    broadcastGameState(roomCode);

    console.log(`Room créée: ${roomCode} par ${pseudo}`);
  });

  // Rejoindre une room
  socket.on('join-room', ({ roomCode, pseudo }) => {
    const code = roomCode.toUpperCase();
    const room = rooms.get(code);

    if (!room) {
      socket.emit('error', { message: 'Code de partie invalide' });
      return;
    }

    if (room.phase !== 'lobby') {
      socket.emit('error', { message: 'La partie a déjà commencé' });
      return;
    }

    if (room.players.length >= 8) {
      socket.emit('error', { message: 'La partie est complète (8 joueurs max)' });
      return;
    }

    const playerId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const player = {
      id: playerId,
      pseudo,
      socketId: socket.id
    };

    room.players.push(player);
    socket.join(code);
    socket.roomCode = code;
    socket.playerId = playerId;

    socket.emit('room-joined', { roomCode: code, playerId });
    broadcastGameState(code);

    console.log(`${pseudo} a rejoint la room ${code}`);
  });

  // Lancer la partie
  socket.on('start-game', () => {
    const room = rooms.get(socket.roomCode);
    if (!room) return;

    if (socket.playerId !== room.hostId) {
      socket.emit('error', { message: 'Seul l\'hôte peut lancer la partie' });
      return;
    }

    if (room.players.length < 2) {
      socket.emit('error', { message: 'Il faut au moins 2 joueurs' });
      return;
    }

    // Créer les équipes
    room.teams = createTeams(room.players);
    room.phase = 'playing';
    room.currentTeamIndex = 0;
    room.roundNumber = 1;

    // Initialiser le premier tour
    initRound(room);
    startTimer(socket.roomCode);

    broadcastGameState(socket.roomCode);
    console.log(`Partie lancée dans la room ${socket.roomCode}`);
  });

  // Donner un indice
  socket.on('give-clue', ({ clue }) => {
    const room = rooms.get(socket.roomCode);
    if (!room || !room.currentRound) return;

    const round = room.currentRound;
    const activeTeam = room.teams[round.activeTeamIndex];
    const giver = activeTeam.players[round.giverIndex];

    if (socket.playerId !== giver.id) {
      socket.emit('error', { message: 'Ce n\'est pas ton tour de donner un indice' });
      return;
    }

    if (round.phase !== 'giving-clue') {
      socket.emit('error', { message: 'Ce n\'est pas le moment de donner un indice' });
      return;
    }

    const validation = validateClue(clue, round.word);
    if (!validation.valid) {
      socket.emit('error', { message: validation.reason });
      return;
    }

    round.clues.push(clue.trim());
    round.clueCount++;
    round.phase = 'guessing';
    round.timeLeft = 30;

    broadcastGameState(socket.roomCode);
  });

  // Deviner le mot
  socket.on('guess', ({ answer }) => {
    const room = rooms.get(socket.roomCode);
    if (!room || !room.currentRound) return;

    const round = room.currentRound;
    const activeTeam = room.teams[round.activeTeamIndex];
    const guesser = activeTeam.players.find(p => p.id !== activeTeam.players[round.giverIndex].id);

    if (socket.playerId !== guesser?.id) {
      socket.emit('error', { message: 'Ce n\'est pas ton tour de deviner' });
      return;
    }

    if (round.phase !== 'guessing') {
      socket.emit('error', { message: 'Ce n\'est pas le moment de deviner' });
      return;
    }

    const correct = checkAnswer(answer, round.word);

    if (correct) {
      // Bonne réponse !
      activeTeam.score++;
      clearInterval(room.timer);

      io.to(socket.roomCode).emit('round-result', {
        correct: true,
        word: round.word,
        team: round.activeTeamIndex,
        stolen: false
      });

      // Tour suivant
      setTimeout(() => {
        nextTeam(room);
        if (room.roundNumber > room.totalRounds) {
          endGame(socket.roomCode);
        } else {
          initRound(room);
          startTimer(socket.roomCode);
          broadcastGameState(socket.roomCode);
        }
      }, 3000);
    } else {
      // Mauvaise réponse
      if (round.clueCount >= 3) {
        // 3 indices donnés, l'autre équipe peut voler
        round.phase = 'stealing';
        round.timeLeft = 15;
        broadcastGameState(socket.roomCode);
      } else {
        // Encore des indices possibles
        round.phase = 'giving-clue';
        round.timeLeft = 30;
        broadcastGameState(socket.roomCode);
      }
    }
  });

  // Voler le point
  socket.on('steal', ({ answer }) => {
    const room = rooms.get(socket.roomCode);
    if (!room || !room.currentRound) return;

    const round = room.currentRound;

    if (round.phase !== 'stealing') {
      socket.emit('error', { message: 'Ce n\'est pas le moment de voler' });
      return;
    }

    // Vérifier que c'est quelqu'un de l'autre équipe
    const playerTeamIndex = room.teams.findIndex(t => t.players.some(p => p.id === socket.playerId));
    if (playerTeamIndex === round.activeTeamIndex) {
      socket.emit('error', { message: 'Tu ne peux pas voler pour ton équipe' });
      return;
    }

    const correct = checkAnswer(answer, round.word);
    clearInterval(room.timer);

    if (correct) {
      room.teams[playerTeamIndex].score++;

      io.to(socket.roomCode).emit('round-result', {
        correct: true,
        word: round.word,
        team: playerTeamIndex,
        stolen: true
      });
    } else {
      io.to(socket.roomCode).emit('round-result', {
        correct: false,
        word: round.word,
        team: null,
        stolen: false
      });
    }

    // Tour suivant
    setTimeout(() => {
      nextTeam(room);
      if (room.roundNumber > room.totalRounds) {
        endGame(socket.roomCode);
      } else {
        initRound(room);
        startTimer(socket.roomCode);
        broadcastGameState(socket.roomCode);
      }
    }, 3000);
  });

  // Passer le tour (timeout ou abandon)
  socket.on('pass', () => {
    const room = rooms.get(socket.roomCode);
    if (!room || !room.currentRound) return;

    clearInterval(room.timer);

    io.to(socket.roomCode).emit('round-result', {
      correct: false,
      word: room.currentRound.word,
      team: null,
      stolen: false
    });

    setTimeout(() => {
      nextTeam(room);
      if (room.roundNumber > room.totalRounds) {
        endGame(socket.roomCode);
      } else {
        initRound(room);
        startTimer(socket.roomCode);
        broadcastGameState(socket.roomCode);
      }
    }, 3000);
  });

  // Rejouer
  socket.on('play-again', () => {
    const room = rooms.get(socket.roomCode);
    if (!room) return;

    if (socket.playerId !== room.hostId) {
      socket.emit('error', { message: 'Seul l\'hôte peut relancer une partie' });
      return;
    }

    // Reset
    room.phase = 'lobby';
    room.teams = [];
    room.currentTeamIndex = 0;
    room.roundNumber = 0;
    room.currentRound = null;
    room.usedWords = [];

    broadcastGameState(socket.roomCode);
  });

  // Déconnexion
  socket.on('disconnect', () => {
    console.log(`Joueur déconnecté: ${socket.id}`);

    if (socket.roomCode) {
      const room = rooms.get(socket.roomCode);
      if (room) {
        room.players = room.players.filter(p => p.socketId !== socket.id);

        if (room.players.length === 0) {
          clearInterval(room.timer);
          rooms.delete(socket.roomCode);
          console.log(`Room ${socket.roomCode} supprimée (vide)`);
        } else {
          // Si l'hôte part, on assigne un nouvel hôte
          if (socket.playerId === room.hostId) {
            room.hostId = room.players[0].id;
          }
          broadcastGameState(socket.roomCode);
        }
      }
    }
  });
});

// Timer
function startTimer(roomCode) {
  const room = rooms.get(roomCode);
  if (!room) return;

  clearInterval(room.timer);

  room.timer = setInterval(() => {
    if (!room.currentRound) {
      clearInterval(room.timer);
      return;
    }

    room.currentRound.timeLeft--;
    io.to(roomCode).emit('timer-tick', { timeLeft: room.currentRound.timeLeft });

    if (room.currentRound.timeLeft <= 0) {
      clearInterval(room.timer);

      if (room.currentRound.phase === 'giving-clue' || room.currentRound.phase === 'guessing') {
        if (room.currentRound.clueCount >= 3) {
          // Passer au vol
          room.currentRound.phase = 'stealing';
          room.currentRound.timeLeft = 15;
          startTimer(roomCode);
          broadcastGameState(roomCode);
        } else if (room.currentRound.phase === 'guessing') {
          // Retour à giving-clue si encore des indices
          room.currentRound.phase = 'giving-clue';
          room.currentRound.timeLeft = 30;
          startTimer(roomCode);
          broadcastGameState(roomCode);
        } else {
          // Timeout sur giving-clue sans indice
          room.currentRound.phase = 'stealing';
          room.currentRound.timeLeft = 15;
          startTimer(roomCode);
          broadcastGameState(roomCode);
        }
      } else if (room.currentRound.phase === 'stealing') {
        // Personne n'a volé
        io.to(roomCode).emit('round-result', {
          correct: false,
          word: room.currentRound.word,
          team: null,
          stolen: false
        });

        setTimeout(() => {
          nextTeam(room);
          if (room.roundNumber > room.totalRounds) {
            endGame(roomCode);
          } else {
            initRound(room);
            startTimer(roomCode);
            broadcastGameState(roomCode);
          }
        }, 3000);
      }
    }
  }, 1000);
}

// Fin de partie
function endGame(roomCode) {
  const room = rooms.get(roomCode);
  if (!room) return;

  clearInterval(room.timer);
  room.phase = 'finished';
  room.currentRound = null;

  // Trier les équipes par score
  const rankings = [...room.teams].sort((a, b) => b.score - a.score);

  io.to(roomCode).emit('game-over', {
    rankings: rankings.map((t, i) => ({
      rank: i + 1,
      team: t,
      players: t.players.map(p => p.pseudo),
      score: t.score
    }))
  });

  broadcastGameState(roomCode);
}

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', rooms: rooms.size });
});

server.listen(PORT, () => {
  console.log(`🎮 Serveur Mot de Passe démarré sur le port ${PORT}`);
});
