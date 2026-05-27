// ============================================================
//  THE MOVIE GAME
// ============================================================

const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyDKD-5PrXs-vCXl8jA9lMKADYDsJmTIKBI",
  authDomain:        "the-movie-game-dfd23.firebaseapp.com",
  databaseURL:       "https://the-movie-game-dfd23-default-rtdb.firebaseio.com",
  projectId:         "the-movie-game-dfd23",
  storageBucket:     "the-movie-game-dfd23.firebasestorage.app",
  messagingSenderId: "939941143928",
  appId:             "1:939941143928:web:56b3fd795abe61d75f148d"
};

// ── TMDB ────────────────────────────────────────────────────
const TMDB_KEY  = '7ae222abae7a3ddc86b2deb7e8542a4a';
const TMDB_BASE = 'https://api.themoviedb.org/3';

// Letters a player earns on failure — spells MOVIE
const WORD = 'MOVIE';

// ============================================================
//  Firebase init
// ============================================================
let db            = null;
let firebaseReady = false;

try {
  if (!FIREBASE_CONFIG.apiKey.startsWith('YOUR_')) {
    firebase.initializeApp(FIREBASE_CONFIG);
    db = firebase.database();
    firebaseReady = true;
  }
} catch (e) {
  console.error('Firebase init error:', e);
}

if (!firebaseReady) {
  document.getElementById('firebase-notice').style.display = 'block';
}

// ============================================================
//  Local session state
// ============================================================
let me                 = { id: null, name: null };  // this browser's player
let roomId             = null;
let roomRef            = null;
let roomSnap           = null;   // latest Firebase snapshot value
let isHost             = false;
let listener           = null;   // Firebase 'value' listener handle
let selectedSuggestion = null;   // TMDB item chosen from autocomplete dropdown

// ============================================================
//  Utilities
// ============================================================
const uid = () => Math.random().toString(36).slice(2, 11);

function genRoomCode() {
  // Omit O/I/0/1 to avoid read-aloud confusion
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// Firebase stores arrays-as-objects when keys are numeric; normalise back to array
function toArray(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  return Object.keys(val).sort((a, b) => Number(a) - Number(b)).map(k => val[k]);
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function setFeedback(msg, type = '') {
  const el = document.getElementById('feedback');
  el.textContent = msg;
  el.className = 'feedback ' + type;
}

function debounce(fn, ms) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
}

function tmdbImg(path, size = 'w92') {
  return path ? `https://image.tmdb.org/t/p/${size}${path}` : null;
}

// ============================================================
//  Autocomplete
// ============================================================
async function fetchSuggestions(query) {
  if (query.length < 2) { clearSuggestions(); return; }

  // Determine what we're searching for based on the current chain
  const last          = roomSnap?.lastChainItem;
  const searchingActor = last?.type === 'movie';

  try {
    let results;
    if (searchingActor) {
      const data = await tmdbFetch('/search/person', { query, language: 'en-US' });
      results = (data.results ?? [])
        .slice(0, 6)
        .map(p => ({
          tmdbId:    p.id,
          name:      p.name,
          type:      'actor',
          imagePath: p.profile_path ?? null,
          sub:       (p.known_for ?? []).map(m => m.title || m.name).filter(Boolean).slice(0, 2).join(', ')
        }));
    } else {
      const data = await tmdbFetch('/search/movie', { query, language: 'en-US' });
      results = (data.results ?? [])
        .slice(0, 6)
        .map(m => ({
          tmdbId:    m.id,
          name:      m.title,
          type:      'movie',
          imagePath: m.poster_path ?? null,
          sub:       m.release_date ? m.release_date.slice(0, 4) : ''
        }));
    }
    renderSuggestions(results);
  } catch (_) { /* silently ignore — user can still submit manually */ }
}

function renderSuggestions(results) {
  const el = document.getElementById('suggestions');
  if (!results.length) { clearSuggestions(); return; }

  el.innerHTML = results.map(r => {
    const img     = tmdbImg(r.imagePath);
    const isActor = r.type === 'actor';
    return `<div class="suggestion-item">
      ${img
        ? `<img class="suggestion-thumb ${isActor ? 'round' : ''}" src="${img}" alt="" loading="lazy">`
        : `<div class="suggestion-thumb ${isActor ? 'round' : ''}"></div>`}
      <div style="flex:1;min-width:0;">
        <div class="suggestion-title">${r.name}</div>
        ${r.sub ? `<div class="suggestion-sub">${r.sub}</div>` : ''}
      </div>
    </div>`;
  }).join('');

  // Attach click handlers (mousedown so it fires before input blur)
  el.querySelectorAll('.suggestion-item').forEach((item, i) => {
    item.addEventListener('mousedown', e => {
      e.preventDefault();
      selectSuggestion(results[i]);
    });
  });

  el.classList.add('open');
}

function clearSuggestions() {
  const el = document.getElementById('suggestions');
  el.classList.remove('open');
  el.innerHTML = '';
}

function selectSuggestion(item) {
  selectedSuggestion = item;
  document.getElementById('answerInput').value = item.name;
  clearSuggestions();
}

// ============================================================
//  TMDB helpers
// ============================================================
async function tmdbFetch(path, params = {}) {
  const url = new URL(`${TMDB_BASE}${path}`);
  url.searchParams.set('api_key', TMDB_KEY);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`TMDB ${res.status}: ${path}`);
  return res.json();
}

async function searchMovie(title) {
  const data = await tmdbFetch('/search/movie', { query: title, language: 'en-US' });
  return data.results?.[0] ?? null;
}

async function searchPerson(name) {
  const data = await tmdbFetch('/search/person', { query: name, language: 'en-US' });
  return data.results?.[0] ?? null;
}

async function movieCast(movieId) {
  const data = await tmdbFetch(`/movie/${movieId}/credits`);
  return data.cast ?? [];
}

async function personFilmography(personId) {
  const data = await tmdbFetch(`/person/${personId}/movie_credits`);
  return data.cast ?? [];
}

// Returns { valid, name, tmdbId, type, imagePath } or { valid: false, error }
// preSelected is a suggestion item already chosen from the dropdown (skips the search step)
async function validateAnswer(input, lastItem, usedMovies, usedActors, preSelected = null) {
  if (!lastItem) {
    // First move — just needs to be a real movie
    const movie = preSelected
      ? { id: preSelected.tmdbId, title: preSelected.name, poster_path: preSelected.imagePath }
      : await searchMovie(input);
    if (!movie) return { valid: false, error: `Can't find a movie called "${input}"` };
    if (usedMovies?.[movie.id]) return { valid: false, error: `"${movie.title}" was already used` };
    return { valid: true, name: movie.title, tmdbId: movie.id, type: 'movie', imagePath: movie.poster_path ?? null };
  }

  if (lastItem.type === 'movie') {
    // Player must name an actor who was in lastItem (a movie)
    let personId, personName, imagePath;
    if (preSelected) {
      personId   = preSelected.tmdbId;
      personName = preSelected.name;
      imagePath  = preSelected.imagePath;
    } else {
      const person = await searchPerson(input);
      if (!person) return { valid: false, error: `Can't find an actor named "${input}"` };
      personId   = person.id;
      personName = person.name;
      imagePath  = person.profile_path ?? null;
    }
    if (usedActors?.[personId]) return { valid: false, error: `${personName} was already used` };
    const cast = await movieCast(lastItem.tmdbId);
    if (!cast.some(c => c.id === personId)) {
      return { valid: false, error: `${personName} wasn't in "${lastItem.name}"` };
    }
    return { valid: true, name: personName, tmdbId: personId, type: 'actor', imagePath };

  } else {
    // Player must name a movie that lastItem (an actor) appeared in
    let movieId, movieTitle, imagePath;
    if (preSelected) {
      movieId    = preSelected.tmdbId;
      movieTitle = preSelected.name;
      imagePath  = preSelected.imagePath;
    } else {
      const movie = await searchMovie(input);
      if (!movie) return { valid: false, error: `Can't find a movie called "${input}"` };
      movieId    = movie.id;
      movieTitle = movie.title;
      imagePath  = movie.poster_path ?? null;
    }
    if (usedMovies?.[movieId]) return { valid: false, error: `"${movieTitle}" was already used` };
    const films = await personFilmography(lastItem.tmdbId);
    if (!films.some(m => m.id === movieId)) {
      return { valid: false, error: `${lastItem.name} wasn't in "${movieTitle}"` };
    }
    return { valid: true, name: movieTitle, tmdbId: movieId, type: 'movie', imagePath };
  }
}

// ============================================================
//  Room creation & joining
// ============================================================
async function createRoom(name) {
  me.id   = uid();
  me.name = name;
  roomId  = genRoomCode();
  isHost  = true;

  roomRef = db.ref(`rooms/${roomId}`);

  await roomRef.set({
    hostId:         me.id,
    status:         'waiting',
    currentIdx:     0,
    currentAttempts: 0,
    lastChainItem:  null,
    usedMovies:     {},
    usedActors:     {},
    players: {
      [me.id]: { name, letters: '', order: 0, out: false }
    },
    playerOrder: [me.id],
    winner: null,
    log:    {}
  });

  roomRef.onDisconnect().update({ [`players/${me.id}/connected`]: false });
  attachListener();
  goLobby();
}

async function joinRoom(name, code) {
  const snap  = await db.ref(`rooms/${code}`).once('value');
  if (!snap.exists())           { alert('Room not found — check the code and try again.'); return; }

  const state = snap.val();
  if (state.status !== 'waiting') { alert('That game has already started.'); return; }

  const order = toArray(state.playerOrder);
  if (order.length >= 4)          { alert('That room is full (4 players max).'); return; }

  me.id   = uid();
  me.name = name;
  roomId  = code;
  isHost  = false;

  roomRef = db.ref(`rooms/${roomId}`);

  const newOrder = [...order, me.id];
  await roomRef.update({
    [`players/${me.id}`]: { name, letters: '', order: order.length, out: false },
    playerOrder: newOrder
  });

  roomRef.onDisconnect().update({ [`players/${me.id}/connected`]: false });
  attachListener();
  goLobby();
}

// ============================================================
//  Firebase listener
// ============================================================
function attachListener() {
  if (listener) roomRef.off('value', listener);

  listener = roomRef.on('value', snap => {
    if (!snap.exists()) return;
    roomSnap = snap.val();
    onRoomChange();
  });
}

function onRoomChange() {
  const s       = roomSnap.status;
  const current = document.querySelector('.screen.active')?.id;

  if (s === 'waiting'  && current !== 'screen-lobby')    showScreen('screen-lobby');
  if (s === 'playing'  && current !== 'screen-game')     showScreen('screen-game');
  if (s === 'finished' && current !== 'screen-gameover') { renderGameOver(); showScreen('screen-gameover'); }

  if (s === 'waiting') renderLobby();
  if (s === 'playing') renderGame();
}

// ============================================================
//  Lobby
// ============================================================
function goLobby() {
  showScreen('screen-lobby');
  document.getElementById('lobbyCode').textContent = roomId;
  document.getElementById('gameCode').textContent  = roomId;
}

function renderLobby() {
  const players = roomSnap.players   ?? {};
  const order   = toArray(roomSnap.playerOrder);

  document.getElementById('lobbyCode').textContent   = roomId;
  document.getElementById('playerCount').textContent = order.length;

  const list = document.getElementById('playersList');
  list.innerHTML = order.map(pid => {
    const p      = players[pid] ?? {};
    const isMe   = pid === me.id;
    const isHst  = pid === roomSnap.hostId;
    return `<li style="${isMe ? 'color:#c9a227' : ''}">
      ${p.name ?? '?'}
      ${isHst ? '<span class="host-badge">HOST</span>' : ''}
      ${isMe  ? '<span class="me-badge">(you)</span>' : ''}
    </li>`;
  }).join('');

  const startBtn = document.getElementById('startBtn');
  const amHost   = me.id === roomSnap.hostId;
  startBtn.style.display = amHost ? 'block' : 'none';

  const enough  = order.length >= 2;
  startBtn.disabled   = !enough;
  startBtn.textContent = enough
    ? `Start Game (${order.length} players)`
    : 'Waiting for players…';

  document.getElementById('lobbyWait').style.display = enough ? 'none' : 'block';
}

// ============================================================
//  Game start (host only)
// ============================================================
async function startGame() {
  if (!roomSnap) return;
  if (toArray(roomSnap.playerOrder).length < 2) return;
  await roomRef.update({ status: 'playing', currentIdx: 0, currentAttempts: 0 });
}

// ============================================================
//  Game render
// ============================================================
function renderGame() {
  if (!roomSnap) return;

  const order     = toArray(roomSnap.playerOrder);
  const players   = roomSnap.players ?? {};
  const curPid    = order[roomSnap.currentIdx];
  const curPlayer = players[curPid] ?? {};

  document.getElementById('turnName').textContent = curPlayer.name ?? '?';

  renderChain();
  renderScores(order, players, curPid);

  const isMyTurn = curPid === me.id;
  const myData   = players[me.id] ?? {};

  if (myData.out) {
    // Eliminated — just watch
    document.getElementById('activeInput').style.display  = 'none';
    document.getElementById('waitingPanel').style.display = 'block';
    document.getElementById('waitingFor').textContent     = 'the game to finish';
    return;
  }

  if (isMyTurn) {
    document.getElementById('activeInput').style.display  = 'block';
    document.getElementById('waitingPanel').style.display = 'none';
    renderPrompt();
    renderDots();
    document.getElementById('answerInput').focus();
  } else {
    document.getElementById('activeInput').style.display  = 'none';
    document.getElementById('waitingPanel').style.display = 'block';
    document.getElementById('waitingFor').textContent     = curPlayer.name ?? '?';
  }
}

function renderChain() {
  const log     = roomSnap.log ?? {};
  const entries = Object.values(log);
  const el      = document.getElementById('chainBox');

  if (!entries.length) {
    el.innerHTML = '<div style="color:#333;font-size:.85rem;">The chain will appear here…</div>';
    return;
  }

  const recent = entries.slice(-5);
  el.innerHTML = recent.map((item, i) => {
    const isCurrent = i === recent.length - 1;
    const isActor   = item.type === 'actor';
    const imgUrl    = item.imagePath ? tmdbImg(item.imagePath) : null;
    return `<div class="chain-item ${isCurrent ? 'current' : ''}">
      ${imgUrl
        ? `<img class="chain-thumb ${isActor ? 'round' : ''}" src="${imgUrl}" alt="${item.name}" loading="lazy">`
        : `<div class="chain-thumb ${isActor ? 'round' : ''}"></div>`}
      <div class="chain-item-text">
        <div class="chain-item-label">${isActor ? '⭐ Actor' : '🎬 Movie'}</div>
        <div class="chain-item-name">${item.name}</div>
      </div>
    </div>`;
  }).join('');
}

function renderPrompt() {
  const last = roomSnap.lastChainItem;
  const el   = document.getElementById('gamePrompt');
  const inp  = document.getElementById('answerInput');

  if (!last) {
    el.innerHTML  = 'Name any <strong>movie</strong> to start the chain';
    inp.placeholder = 'Movie title…';
  } else if (last.type === 'movie') {
    el.innerHTML  = `Name an <strong>actor</strong> from <strong>${last.name}</strong>`;
    inp.placeholder = 'Actor name…';
  } else {
    el.innerHTML  = `Name a <strong>movie</strong> starring <strong>${last.name}</strong>`;
    inp.placeholder = 'Movie title…';
  }
}

function renderDots() {
  const attempts = roomSnap.currentAttempts ?? 0;
  for (let i = 0; i < 3; i++) {
    document.getElementById(`d${i}`).classList.toggle('gone', i < attempts);
  }
}

function renderScores(order, players, curPid) {
  const el = document.getElementById('scores');
  el.innerHTML = order.map(pid => {
    const p = players[pid] ?? {};
    return `<div class="score-card ${pid === curPid ? 'active-turn' : ''} ${p.out ? 'out' : ''}">
      <div class="score-name">${p.name ?? '?'}</div>
      <div class="score-letters">${p.letters || ' '}</div>
    </div>`;
  }).join('');
}

// ============================================================
//  Answer submission
// ============================================================
let submitting = false;

async function handleSubmit() {
  if (submitting) return;

  const input  = document.getElementById('answerInput');
  const answer = input.value.trim();
  if (!answer) return;

  if (!roomSnap) return;
  const order = toArray(roomSnap.playerOrder);
  if (order[roomSnap.currentIdx] !== me.id) return; // not my turn

  submitting = true;
  document.getElementById('submitBtn').disabled = true;
  setFeedback('Checking…', '');
  input.value = '';

  const pickedSuggestion = selectedSuggestion;
  selectedSuggestion = null;
  clearSuggestions();

  try {
    const result = await validateAnswer(
      answer,
      roomSnap.lastChainItem,
      roomSnap.usedMovies,
      roomSnap.usedActors,
      pickedSuggestion
    );

    if (result.valid) {
      setFeedback(`✓ ${result.name}`, 'ok');
      await advanceChain(result);
    } else {
      setFeedback(result.error, 'err');
      await handleFailure();
    }
  } catch (e) {
    console.error(e);
    setFeedback('Network error — try again', 'err');
  }

  submitting = false;
  document.getElementById('submitBtn').disabled = false;
}

async function advanceChain(result) {
  const usedMovies = { ...(roomSnap.usedMovies ?? {}) };
  const usedActors = { ...(roomSnap.usedActors ?? {}) };

  if (result.type === 'movie') usedMovies[result.tmdbId] = true;
  else                          usedActors[result.tmdbId] = true;

  const logKey = roomRef.child('log').push().key;  // generate unique ordered key
  const nextIdx = nextActiveIndex(roomSnap.currentIdx, roomSnap.players);

  const logEntry = { type: result.type, name: result.name, tmdbId: result.tmdbId, imagePath: result.imagePath ?? null };

  await roomRef.update({
    [`log/${logKey}`]: logEntry,
    lastChainItem:    logEntry,
    usedMovies,
    usedActors,
    currentAttempts: 0,
    currentIdx:      nextIdx
  });
}

async function handleFailure() {
  const attempts = (roomSnap.currentAttempts ?? 0) + 1;
  if (attempts < 3) {
    await roomRef.update({ currentAttempts: attempts });
    return;
  }
  await assignLetterAndPass();
}

// Give this player a letter and move to the next player.
// Used by both "used all 3 attempts" and "give up turn".
async function assignLetterAndPass() {
  const myLetters  = roomSnap.players?.[me.id]?.letters ?? '';
  const newLetters = myLetters + WORD[myLetters.length];
  const isOut      = newLetters.length >= WORD.length;

  const order = toArray(roomSnap.playerOrder);

  const updatedPlayers = {
    ...roomSnap.players,
    [me.id]: { ...roomSnap.players[me.id], letters: newLetters, out: isOut }
  };

  const stillIn = order.filter(pid => !updatedPlayers[pid]?.out);

  const updates = {
    [`players/${me.id}/letters`]: newLetters,
    [`players/${me.id}/out`]:     isOut,
    currentAttempts: 0
  };

  if (stillIn.length <= 1) {
    updates.status = 'finished';
    updates.winner = stillIn[0] ?? null;
  } else {
    updates.currentIdx = nextActiveIndex(roomSnap.currentIdx, updatedPlayers);
  }

  await roomRef.update(updates);
}

// Completely remove this player from the game (eliminated immediately).
async function leaveGame() {
  if (!roomSnap || !roomRef) { showScreen('screen-landing'); return; }

  const order   = toArray(roomSnap.playerOrder);
  const players = roomSnap.players ?? {};

  // Mark as out with full MOVIE letters
  const updates = {
    [`players/${me.id}/out`]:     true,
    [`players/${me.id}/letters`]: WORD,
    currentAttempts: 0
  };

  const stillIn = order.filter(pid => pid !== me.id && !players[pid]?.out);

  if (stillIn.length <= 1) {
    updates.status = 'finished';
    updates.winner = stillIn[0] ?? null;
  } else {
    // If it was my turn, advance to next
    const curPid = order[roomSnap.currentIdx];
    if (curPid === me.id) {
      const updatedPlayers = { ...players, [me.id]: { ...players[me.id], out: true } };
      updates.currentIdx = nextActiveIndex(roomSnap.currentIdx, updatedPlayers);
    }
  }

  await roomRef.update(updates);

  // Detach listener and go back to landing
  if (listener) roomRef.off('value', listener);
  listener = null;
  roomSnap = null;
  showScreen('screen-landing');
}

// Find the index of the next player who hasn't been eliminated
function nextActiveIndex(fromIdx, players) {
  const order = toArray(roomSnap.playerOrder);
  for (let i = 1; i <= order.length; i++) {
    const idx = (fromIdx + i) % order.length;
    const pid = order[idx];
    if (!players?.[pid]?.out) return idx;
  }
  return fromIdx; // shouldn't happen
}

// ============================================================
//  Game over
// ============================================================
function renderGameOver() {
  if (!roomSnap) return;

  const players  = roomSnap.players ?? {};
  const order    = toArray(roomSnap.playerOrder);
  const winnerId = roomSnap.winner;
  const winner   = players[winnerId] ?? {};

  document.getElementById('winnerName').textContent = winner.name ?? 'Nobody';

  document.getElementById('finalScores').innerHTML = order.map(pid => {
    const p = players[pid] ?? {};
    const w = pid === winnerId;
    return `<div class="score-row">
      <span style="color:${w ? '#c9a227' : '#aaa'}">${p.name ?? '?'}${w ? ' 🏆' : ''}</span>
      <span style="color:#d45c5c;letter-spacing:.12em">${p.letters || '—'}</span>
    </div>`;
  }).join('');

  const log     = roomSnap.log ?? {};
  const entries = Object.values(log);
  document.getElementById('chainLen').textContent = entries.length;

  document.getElementById('finalChain').innerHTML = entries.map(item => {
    const isActor = item.type === 'actor';
    const imgUrl  = item.imagePath ? tmdbImg(item.imagePath) : null;
    return `<div class="chain-log-item">
      ${imgUrl
        ? `<img class="chain-log-thumb ${isActor ? 'round' : ''}" src="${imgUrl}" alt="" loading="lazy">`
        : `<span class="icon">${isActor ? '⭐' : '🎬'}</span>`}
      <span>${item.name}</span>
    </div>`;
  }).join('');
}

// ============================================================
//  Event listeners
// ============================================================

// Landing
document.getElementById('createBtn').addEventListener('click', () => {
  const name = document.getElementById('playerName').value.trim();
  if (!name) { alert('Enter your name first.'); return; }
  if (!firebaseReady) { alert('Set up Firebase first — see the instructions at the top of script.js.'); return; }
  createRoom(name);
});

document.getElementById('joinBtn').addEventListener('click', () => {
  const name = document.getElementById('playerName').value.trim();
  const code = document.getElementById('joinCode').value.trim().toUpperCase();
  if (!name) { alert('Enter your name first.'); return; }
  if (code.length < 4) { alert('Enter the 4-character room code.'); return; }
  if (!firebaseReady) { alert('Set up Firebase first — see the instructions at the top of script.js.'); return; }
  joinRoom(name, code);
});

// Force uppercase + strip non-alphanumeric from room code input
document.getElementById('joinCode').addEventListener('input', function () {
  this.value = this.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
});

// Click room code to copy it
document.getElementById('lobbyCode').addEventListener('click', function () {
  navigator.clipboard.writeText(this.textContent).then(() => {
    const orig = this.textContent;
    this.textContent = 'Copied!';
    setTimeout(() => { this.textContent = orig; }, 1200);
  });
});

// Lobby
document.getElementById('startBtn').addEventListener('click', startGame);

// Game
document.getElementById('submitBtn').addEventListener('click', handleSubmit);
document.getElementById('answerInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') handleSubmit();
  if (e.key === 'Escape') clearSuggestions();
});

const debouncedSearch = debounce(fetchSuggestions, 300);
document.getElementById('answerInput').addEventListener('input', function () {
  selectedSuggestion = null; // typing again clears any prior selection
  debouncedSearch(this.value.trim());
});

// Close suggestions when clicking elsewhere
document.addEventListener('click', e => {
  if (!e.target.closest('.input-wrap')) clearSuggestions();
});

document.getElementById('giveUpBtn').addEventListener('click', async () => {
  if (!roomSnap) return;
  const order = toArray(roomSnap.playerOrder);
  if (order[roomSnap.currentIdx] !== me.id) return; // not my turn
  if (!confirm('Give up your turn? You\'ll receive a letter.')) return;
  await assignLetterAndPass();
});

document.getElementById('leaveBtn').addEventListener('click', () => {
  if (!confirm('Leave the game? You\'ll be eliminated.')) return;
  leaveGame();
});

// Game over
document.getElementById('playAgainBtn').addEventListener('click', () => {
  if (listener) roomRef.off('value', listener);
  roomSnap = null;
  roomId   = null;
  roomRef  = null;
  isHost   = false;
  listener = null;
  setFeedback('', '');
  document.getElementById('playerName').value = me.name ?? '';
  showScreen('screen-landing');
});
