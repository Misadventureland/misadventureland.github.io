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

// ============================================================
//  Movie quote bank — edit freely to add / remove quotes
// ============================================================
const QUOTES = [
  // Lord of the Rings
  ['"All we have to decide is what to do with the time that is given us."', 'The Fellowship of the Ring'],
  ['"One does not simply walk into Mordor."', 'The Fellowship of the Ring'],
  ['"There\'s some good in this world, Mr. Frodo, and it\'s worth fighting for."', 'The Two Towers'],
  ['"A wizard is never late, nor is he early."', 'The Fellowship of the Ring'],
  ['"I am no man."', 'The Return of the King'],
  // Hamlet 2
  ['"It was stupid. But it was also theatre."', 'Hamlet 2'],
  ['"Rock me, sexy Jesus."', 'Hamlet 2'],
  // Safdie Brothers
  ['"This is how I win."', 'Uncut Gems'],
  ['"Why does everything with you have to be so complicated?"', 'Uncut Gems'],
  // Almost Famous
  ['"The only true currency in this bankrupt world is what you share with someone else when you\'re uncool."', 'Almost Famous'],
  ['"It\'s all happening."', 'Almost Famous'],
  ['"I am a golden god!"', 'Almost Famous'],
  // Tick, Tick... Boom!
  ['"The opposite of war isn\'t peace — it\'s creation."', 'Tick, Tick... Boom!'],
  // La La Land
  ['"Here\'s to the ones who dream, foolish as they may seem."', 'La La Land'],
  ['"How are you gonna be a revolutionary if you\'re such a traditionalist?"', 'La La Land'],
  ['"City of stars, are you shining just for me?"', 'La La Land'],
  // Parasite
  ['"You know what kind of plan never fails? No plan at all."', 'Parasite'],
  ['"They\'re nice because they\'re rich."', 'Parasite'],
  ['"I like your stone. It\'s so metaphorical."', 'Parasite'],
  // Sinners
  ['"You keep dancing with the devil... one day he\'s gonna follow you home."', 'Sinners'],
  // Cult classics & indie
  ['"I drink your milkshake!"', 'There Will Be Blood'],
  ['"I\'m not even supposed to be here today!"', 'Clerks'],
  ['"What we\'ve got here is a failure to communicate."', 'Cool Hand Luke'],
  ['"I wish I knew how to quit you."', 'Brokeback Mountain'],
  ['"We accept the love we think we deserve."', 'The Perks of Being a Wallflower'],
  ['"Snap out of it!"', 'Moonstruck'],
  ['"The greatest trick the devil ever pulled was convincing the world he didn\'t exist."', 'The Usual Suspects'],
  ['"I have come here to chew bubblegum and kick ass — and I\'m all out of bubblegum."', 'They Live'],
  ['"I\'m walkin\' here!"', 'Midnight Cowboy'],
  ['"When you grow up, your heart dies."', 'The Breakfast Club'],
  ['"Strange things are afoot at the Circle K."', 'Bill & Ted\'s Excellent Adventure'],
];

const TMDB_KEY  = '7ae222abae7a3ddc86b2deb7e8542a4a';
const TMDB_BASE = 'https://api.themoviedb.org/3';
const WORD      = 'MOVIE';

// ============================================================
//  Firebase init
// ============================================================
let db            = null;
let auth          = null;
let firebaseReady = false;

try {
  if (!FIREBASE_CONFIG.apiKey.startsWith('YOUR_')) {
    firebase.initializeApp(FIREBASE_CONFIG);
    db   = firebase.database();
    auth = firebase.auth();
    firebaseReady = true;
  }
} catch (e) {
  console.error('Firebase init error:', e);
}

if (!firebaseReady) {
  document.getElementById('firebase-notice').style.display = 'block';
} else {
  // Track Google sign-in state; updates landing screen UI when auth resolves
  auth.onAuthStateChanged(user => {
    currentUser = user;
    updateAuthUI();
    // Pre-fill name from Google account if the field is still empty
    const nameInput = document.getElementById('playerName');
    if (user && nameInput && !nameInput.value.trim()) {
      nameInput.value = user.displayName ?? '';
    }
  });
}

// ============================================================
//  Session state
// ============================================================
let me                        = { id: null, name: null };
let roomId                    = null;
let roomRef                   = null;
let roomSnap                  = null;
let isHost                    = false;
let listener                  = null;
let selectedSuggestion        = null;   // autocomplete pick for main input
let selectedChallengeSuggestion = null; // autocomplete pick for challenge input
let submitting                = false;
let challengeSubmitting       = false;
let lastSeenChallengeTs       = 0;
let chatAttached              = false;
let overlayTimer              = null;
let currentUser       = null;
let gameStatsWritten  = false;
let lastLogLength     = -1;   // -1 = haven't entered game yet; tracks chain length for ding

// ============================================================
//  Utilities
// ============================================================
const uid = () => Math.random().toString(36).slice(2, 11);

function genRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function toArray(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  return Object.keys(val).sort((a, b) => Number(a) - Number(b)).map(k => val[k]);
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function setFeedback(elId, msg, type = '') {
  const el = document.getElementById(elId);
  if (!el) return;
  el.textContent = msg;
  el.className = 'feedback ' + type;
}

function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

function tmdbImg(path, size = 'w92') {
  return path ? `https://image.tmdb.org/t/p/${size}${path}` : null;
}

function playDing() {
  try {
    const ctx  = new (window.AudioContext || window.webkitAudioContext)();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type            = 'sine';
    osc.frequency.value = 660;                                   // E5 — warm bell pitch
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.0);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 1.0);
    osc.onended = () => ctx.close();                             // release resources
  } catch (_) {}
}

// ============================================================
//  Session persistence (rejoin after refresh / crash)
// ============================================================
const SESSION_KEY = 'tmg_session';

function saveSession() {
  // Always save locally (works for guests and same-device rejoin)
  try { localStorage.setItem(SESSION_KEY, JSON.stringify({ id: me.id, name: me.name, roomId })); } catch (_) {}
  // For signed-in users also mirror to Firebase — enables cross-device continuity
  if (currentUser && db && roomId) {
    db.ref(`users/${currentUser.uid}/activeSession`).set({
      roomId,
      playerId:   me.id,
      playerName: me.name
    }).catch(() => {});
  }
}

function clearSession() {
  try { localStorage.removeItem(SESSION_KEY); } catch (_) {}
  // Clear cloud session too so the slot doesn't linger on other devices
  if (currentUser && db) {
    db.ref(`users/${currentUser.uid}/activeSession`).remove().catch(() => {});
  }
}

async function tryRejoin() {
  if (!firebaseReady) return false;

  // 1. Cloud session — signed-in users can switch devices and pick up mid-game
  if (currentUser) {
    try {
      const snap = await db.ref(`users/${currentUser.uid}/activeSession`).once('value');
      const cs   = snap.val();
      if (cs?.roomId && cs?.playerId) {
        const ok = await restoreSession(cs.roomId, cs.playerId, cs.playerName ?? currentUser.displayName ?? 'Player');
        if (ok) return true;
        // Session was stale (room gone / player removed) — wipe it
        db.ref(`users/${currentUser.uid}/activeSession`).remove().catch(() => {});
      }
    } catch (_) {}
  }

  // 2. localStorage fallback — guests, or same-device convenience for signed-in users
  let saved;
  try { saved = JSON.parse(localStorage.getItem(SESSION_KEY)); } catch (_) { return false; }
  if (!saved?.id || !saved?.name || !saved?.roomId) return false;
  return restoreSession(saved.roomId, saved.id, saved.name);
}

// Shared rejoin logic — verifies the room + player still exist, then restores state
async function restoreSession(rId, pId, pName) {
  try {
    const snap = await db.ref(`rooms/${rId}`).once('value');
    if (!snap.exists()) { clearSession(); return false; }
    const state = snap.val();
    if (!state.players?.[pId]) { clearSession(); return false; }

    me.id   = pId;
    me.name = pName;
    roomId  = rId;
    isHost  = state.hostId === pId;
    if (state.status === 'finished') gameStatsWritten = true;
    roomRef = db.ref(`rooms/${rId}`);

    document.getElementById('lobbyCode').textContent = rId;
    document.getElementById('gameCode').textContent  = rId;

    roomRef.onDisconnect().update({ [`players/${me.id}/connected`]: false });
    attachListener();
    return true;
  } catch (e) {
    console.error('Rejoin failed:', e);
    clearSession();
    return false;
  }
}

// ============================================================
//  Auth — Google Sign-In
// ============================================================
async function signInWithGoogle() {
  if (!auth) return;
  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    await auth.signInWithPopup(provider);
  } catch (e) {
    // Silently ignore popup-dismissed events; log anything unexpected
    if (e.code !== 'auth/popup-closed-by-user' && e.code !== 'auth/cancelled-popup-request') {
      console.error('Google sign-in error:', e);
    }
  }
}

async function signOutUser() {
  if (!auth) return;
  await auth.signOut();
  document.getElementById('playerName').value = '';
}

async function saveGameName(name) {
  const trimmed = name.trim().slice(0, 20);
  if (!currentUser || !db || !trimmed) return;
  await db.ref(`users/${currentUser.uid}/gameName`).set(trimmed);
  // Keep the main name input in sync
  const nameInput = document.getElementById('playerName');
  if (nameInput) nameInput.value = trimmed;
}

async function updateAuthUI() {
  const section   = document.getElementById('authSection');
  const signedOut = document.getElementById('authSignedOut');
  const signedIn  = document.getElementById('authSignedIn');
  if (!section) return;

  // Reveal the card now that we know auth state
  section.style.display = 'block';

  if (!currentUser) {
    signedOut.style.display = 'block';
    signedIn.style.display  = 'none';
    return;
  }

  signedOut.style.display = 'none';
  signedIn.style.display  = 'block';

  const avatarEl = document.getElementById('authAvatar');
  const nameEl   = document.getElementById('authDisplayName');
  const statsEl  = document.getElementById('authStatsLine');

  if (avatarEl) {
    avatarEl.src = currentUser.photoURL ?? '';
    avatarEl.style.display = currentUser.photoURL ? 'block' : 'none';
  }

  // Pull stats + stored game name from Firebase
  const gameNameInput = document.getElementById('gameNameInput');
  if (statsEl && db) {
    statsEl.textContent = '…';
    try {
      const snap  = await db.ref(`users/${currentUser.uid}`).once('value');
      const stats = snap.val();

      // Prefer stored game name, fall back to Google display name
      const gameName = stats?.gameName ?? currentUser.displayName ?? '';
      if (gameNameInput) gameNameInput.value = gameName;

      // Sync to playerName if the user hasn't typed something different
      const nameInput  = document.getElementById('playerName');
      if (nameInput) {
        const cur = nameInput.value.trim();
        if (!cur || cur === currentUser.displayName) nameInput.value = gameName;
      }

      if (stats?.gamesPlayed) {
        const g = stats.gamesPlayed;
        const w = stats.wins ?? 0;
        statsEl.textContent =
          `${g} game${g !== 1 ? 's' : ''} · ${w} win${w !== 1 ? 's' : ''}`;
      } else {
        statsEl.textContent = 'No games yet';
      }
    } catch (_) {
      statsEl.textContent = '';
      if (gameNameInput && !gameNameInput.value) {
        gameNameInput.value = currentUser.displayName ?? '';
      }
    }
  }
}

// ============================================================
//  TMDB helpers
// ============================================================
async function tmdbFetch(path, params = {}) {
  const url = new URL(`${TMDB_BASE}${path}`);
  url.searchParams.set('api_key', TMDB_KEY);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`TMDB ${res.status}`);
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

// ============================================================
//  Autocomplete — shared between main input & challenge input
// ============================================================

// direction: 'movie' | 'actor'   suggestionsId: DOM element id   onSelect: fn(item)
async function fetchSuggestionsFor(query, direction, suggestionsId, onSelect) {
  if (query.length < 2) { clearSuggestionsEl(suggestionsId); return; }
  try {
    let results;
    if (direction === 'actor') {
      const data = await tmdbFetch('/search/person', { query, language: 'en-US' });
      results = (data.results ?? []).slice(0, 6).map(p => ({
        tmdbId: p.id, name: p.name, type: 'actor',
        imagePath: p.profile_path ?? null,
        sub: ''
      }));
    } else {
      const data = await tmdbFetch('/search/movie', { query, language: 'en-US' });
      results = (data.results ?? []).slice(0, 6).map(m => ({
        tmdbId: m.id, name: m.title, type: 'movie',
        imagePath: m.poster_path ?? null,
        sub: m.release_date ? m.release_date.slice(0, 4) : ''
      }));
    }
    renderSuggestionsIn(results, suggestionsId, onSelect);
  } catch (_) { /* silently ignore */ }
}

function renderSuggestionsIn(results, suggestionsId, onSelect) {
  const el = document.getElementById(suggestionsId);
  if (!el) return;
  if (!results.length) { clearSuggestionsEl(suggestionsId); return; }

  el.innerHTML = results.map(r => {
    const img = tmdbImg(r.imagePath);
    const round = r.type === 'actor';
    return `<div class="suggestion-item">
      ${img
        ? `<img class="suggestion-thumb ${round ? 'round' : ''}" src="${img}" alt="" loading="lazy">`
        : `<div class="suggestion-thumb ${round ? 'round' : ''}"></div>`}
      <div style="flex:1;min-width:0;">
        <div class="suggestion-title">${r.name}</div>
        ${r.sub ? `<div class="suggestion-sub">${r.sub}</div>` : ''}
      </div>
    </div>`;
  }).join('');

  el.querySelectorAll('.suggestion-item').forEach((item, i) => {
    item.addEventListener('mousedown', e => { e.preventDefault(); onSelect(results[i]); });
  });
  el.classList.add('open');
}

function clearSuggestionsEl(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('open');
  el.innerHTML = '';
}

// Determine search direction for main input based on chain state
function mainDirection() {
  const last = roomSnap?.lastChainItem;
  if (!last) return (roomSnap?.roundStartType === 'actor') ? 'actor' : 'movie';
  return last.type === 'actor' ? 'movie' : 'actor';
}

// Determine search direction for challenge input based on challenge state
function challengeDirection() {
  return roomSnap?.challenge?.answerType === 'movie' ? 'actor' : 'movie';
}

// ============================================================
//  Answer validation (main game)
// ============================================================
async function validateAnswer(input, lastItem, usedMovies, usedActors, preSelected = null, roundStartType = null) {
  // Actor-first round: no chain yet, chooser picked "actor"
  if (!lastItem && roundStartType === 'actor') {
    let personId, personName, imagePath;
    if (preSelected) {
      personId = preSelected.tmdbId; personName = preSelected.name; imagePath = preSelected.imagePath;
    } else {
      const p = await searchPerson(input);
      if (!p) return { valid: false, error: `Can't find an actor named "${input}"` };
      personId = p.id; personName = p.name; imagePath = p.profile_path ?? null;
    }
    if (usedActors?.[personId]) return { valid: false, error: `${personName} was already used` };
    // Ace check: the opening actor must have at least one unused movie others can follow with
    const films = await personFilmography(personId);
    if (films.filter(f => !usedMovies?.[f.id]).length === 0) {
      return { valid: false, error: `${personName} has no available movies to follow — that's an ace. Try someone else` };
    }
    return { valid: true, name: personName, tmdbId: personId, type: 'actor', imagePath };
  }

  if (!lastItem) {
    const movie = preSelected
      ? { id: preSelected.tmdbId, title: preSelected.name, poster_path: preSelected.imagePath }
      : await searchMovie(input);
    if (!movie) return { valid: false, error: `Can't find a movie called "${input}"` };
    if (usedMovies?.[movie.id]) return { valid: false, error: `"${movie.title}" was already used` };
    // Ace check: the opening movie must have at least one unused actor others can follow with
    const cast = await movieCast(movie.id);
    if (cast.filter(c => !usedActors?.[c.id]).length === 0) {
      return { valid: false, error: `"${movie.title}" has no available actors to follow — that's an ace. Try a different movie` };
    }
    return { valid: true, name: movie.title, tmdbId: movie.id, type: 'movie', imagePath: movie.poster_path ?? null };
  }

  if (lastItem.type === 'movie') {
    let personId, personName, imagePath;
    if (preSelected) {
      personId = preSelected.tmdbId; personName = preSelected.name; imagePath = preSelected.imagePath;
    } else {
      const p = await searchPerson(input);
      if (!p) return { valid: false, error: `Can't find an actor named "${input}"` };
      personId = p.id; personName = p.name; imagePath = p.profile_path ?? null;
    }
    if (usedActors?.[personId]) return { valid: false, error: `${personName} was already used` };
    const cast = await movieCast(lastItem.tmdbId);
    if (!cast.some(c => c.id === personId)) return { valid: false, error: `${personName} wasn't in "${lastItem.name}"` };
    return { valid: true, name: personName, tmdbId: personId, type: 'actor', imagePath };

  } else {
    let movieId, movieTitle, imagePath;
    if (preSelected) {
      movieId = preSelected.tmdbId; movieTitle = preSelected.name; imagePath = preSelected.imagePath;
    } else {
      const m = await searchMovie(input);
      if (!m) return { valid: false, error: `Can't find a movie called "${input}"` };
      movieId = m.id; movieTitle = m.title; imagePath = m.poster_path ?? null;
    }
    if (usedMovies?.[movieId]) return { valid: false, error: `"${movieTitle}" was already used` };
    const films = await personFilmography(lastItem.tmdbId);
    if (!films.some(m => m.id === movieId)) return { valid: false, error: `${lastItem.name} wasn't in "${movieTitle}"` };
    return { valid: true, name: movieTitle, tmdbId: movieId, type: 'movie', imagePath };
  }
}

// ============================================================
//  Challenge validation
// ============================================================
// The challenged player must name ANOTHER connection (not the one that's already in the chain).
// challenge.answerType = what they originally named ('movie' or 'actor')
// challenge.answerId   = tmdbId of what they named (the thing to find another connection TO)
// challenge.prevId     = tmdbId of the prior chain item (must not repeat this)
async function validateChallengeAnswer(input, challenge, preSelected = null) {
  const { answerType, answerId, answerName, prevId } = challenge;

  if (answerType === 'movie') {
    // Original answer was a movie → must name another ACTOR from it
    let personId, personName;
    if (preSelected) {
      personId = preSelected.tmdbId; personName = preSelected.name;
    } else {
      const p = await searchPerson(input);
      if (!p) return { valid: false, error: `Can't find "${input}"` };
      personId = p.id; personName = p.name;
    }
    if (prevId && personId === prevId) return { valid: false, error: `That's the actor the chain came from — name a different one` };
    const cast = await movieCast(answerId);
    if (!cast.some(c => c.id === personId)) return { valid: false, error: `${personName} wasn't in "${answerName}"` };
    return { valid: true, name: personName };

  } else {
    // Original answer was an actor → must name another MOVIE they were in
    let movieId, movieTitle;
    if (preSelected) {
      movieId = preSelected.tmdbId; movieTitle = preSelected.name;
    } else {
      const m = await searchMovie(input);
      if (!m) return { valid: false, error: `Can't find "${input}"` };
      movieId = m.id; movieTitle = m.title;
    }
    if (prevId && movieId === prevId) return { valid: false, error: `That's the movie the chain came from — name a different one` };
    const films = await personFilmography(answerId);
    if (!films.some(m => m.id === movieId)) return { valid: false, error: `${answerName} wasn't in "${movieTitle}"` };
    return { valid: true, name: movieTitle };
  }
}

// ============================================================
//  Room creation & joining
// ============================================================
async function createRoom(name) {
  me.id  = currentUser ? currentUser.uid : uid();
  me.name = name;
  roomId = genRoomCode();
  isHost = true;
  gameStatsWritten = false;
  roomRef = db.ref(`rooms/${roomId}`);

  await roomRef.set({
    hostId: me.id, status: 'waiting',
    currentIdx: 0, currentAttempts: 0,
    lastChainItem: null,
    usedMovies: {}, usedActors: {},
    players: { [me.id]: { name, letters: '', order: 0, out: false } },
    playerOrder: [me.id],
    winner: null, log: {},
    pendingChallenge: null, challenge: null
  });

  roomRef.onDisconnect().update({ [`players/${me.id}/connected`]: false });
  saveSession();
  attachListener();
  goLobby();
}

async function joinRoom(name, code) {
  const snap = await db.ref(`rooms/${code}`).once('value');
  if (!snap.exists()) { alert('Room not found — check the code and try again.'); return; }
  const state = snap.val();
  if (state.status !== 'waiting') { alert('That game has already started.'); return; }
  const order = toArray(state.playerOrder);
  if (order.length >= 4) { alert('That room is full (4 players max).'); return; }

  me.id  = currentUser ? currentUser.uid : uid();
  me.name = name;
  roomId = code;
  isHost = false;
  gameStatsWritten = false;
  roomRef = db.ref(`rooms/${roomId}`);

  await roomRef.update({
    [`players/${me.id}`]: { name, letters: '', order: order.length, out: false },
    playerOrder: [...order, me.id]
  });

  roomRef.onDisconnect().update({ [`players/${me.id}/connected`]: false });
  saveSession();
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
  attachChatListener();
}

function onRoomChange() {
  const s = roomSnap.status;
  const cur = document.querySelector('.screen.active')?.id;
  if (s === 'waiting'  && cur !== 'screen-lobby')    showScreen('screen-lobby');
  if (s === 'playing'  && cur !== 'screen-game')     showScreen('screen-game');
  if (s === 'finished' && cur !== 'screen-gameover') { renderGameOver(); showScreen('screen-gameover'); }
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
  const players = roomSnap.players ?? {};
  const order   = toArray(roomSnap.playerOrder);
  document.getElementById('lobbyCode').textContent   = roomId;
  document.getElementById('playerCount').textContent = order.length;

  document.getElementById('playersList').innerHTML = order.map(pid => {
    const p = players[pid] ?? {};
    return `<li style="${pid === me.id ? 'color:#ede9e3;font-weight:600' : ''}">
      ${p.name ?? '?'}
      ${pid === roomSnap.hostId ? '<span class="host-badge">HOST</span>' : ''}
      ${pid === me.id ? '<span class="me-badge">(you)</span>' : ''}
    </li>`;
  }).join('');

  const startBtn = document.getElementById('startBtn');
  const amHost   = me.id === roomSnap.hostId;
  startBtn.style.display = amHost ? 'block' : 'none';
  const enough = order.length >= 2;
  startBtn.disabled    = !enough;
  startBtn.textContent = enough ? `Start Game (${order.length} players)` : 'Waiting for players…';
  document.getElementById('lobbyWait').style.display = enough ? 'none' : 'block';
}

async function startGame() {
  if (!roomSnap || toArray(roomSnap.playerOrder).length < 2) return;
  await roomRef.update({ status: 'playing', currentIdx: 0, currentAttempts: 0, pendingChallenge: null, challenge: null });
}

// ============================================================
//  Share invite link
// ============================================================
async function shareInviteLink() {
  const url  = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
  const msg  = `I'm challenging you to a battle in The Movie Game! Room code: ${roomId}\n${url}`;
  const btn  = document.getElementById('shareBtn');

  // 1. Try native share sheet (works great on mobile)
  if (navigator.share) {
    try {
      await navigator.share({ title: 'The Movie Game', text: `I'm challenging you to a battle in The Movie Game! Room code: ${roomId}`, url });
      return;
    } catch (e) {
      if (e.name === 'AbortError') return; // user cancelled — do nothing
      // otherwise fall through to clipboard
    }
  }

  // 2. Try clipboard API
  try {
    await navigator.clipboard.writeText(msg);
    const orig = btn.textContent;
    btn.textContent = '✓ Link copied!';
    setTimeout(() => { btn.textContent = orig; }, 2500);
    return;
  } catch (_) { /* fall through */ }

  // 3. Last resort — browser prompt so they can copy manually
  window.prompt('Copy this invite link:', msg);
}

// ============================================================
//  Game render
// ============================================================
function renderGame() {
  if (!roomSnap) return;

  const order           = toArray(roomSnap.playerOrder);
  const players         = roomSnap.players ?? {};
  const curPid          = order[roomSnap.currentIdx];
  const curPlayer       = players[curPid] ?? {};
  const challenge       = roomSnap.challenge ?? null;
  const pending         = roomSnap.pendingChallenge ?? null;
  const myData          = players[me.id] ?? {};
  const roundChooserPid = roomSnap.roundChooserPid ?? null;
  const roundStartType  = roomSnap.roundStartType  ?? null;

  document.getElementById('turnName').textContent = curPlayer.name ?? '?';
  renderChain();

  // Opening retry notice — visible to everyone when opener must re-pick
  const retryNotice = document.getElementById('openingRetryNotice');
  if (retryNotice) {
    const msg = roomSnap.openingRetryMsg ?? null;
    retryNotice.textContent  = msg ?? '';
    retryNotice.style.display = msg ? 'block' : 'none';
  }

  // Ding when a new answer lands (skip the very first render so we don't ding on page load)
  const logLen = Object.keys(roomSnap.log ?? {}).length;
  if (lastLogLength >= 0 && logLen > lastLogLength) playDing();
  lastLogLength = logLen;

  renderScores(order, players, curPid);
  renderChallengeUI(challenge, pending, players, myData);

  // Check for new challenge result overlay
  const cr = roomSnap.lastChallengeResult;
  if (cr && cr.ts > lastSeenChallengeTs) {
    lastSeenChallengeTs = cr.ts;
    showChallengeOverlay(cr);
  }

  // Challenge active — everyone waits
  if (challenge) {
    document.getElementById('roundChooser').style.display  = 'none';
    document.getElementById('activeInput').style.display   = 'none';
    document.getElementById('waitingPanel').style.display  = 'none';
    return;
  }

  // Round chooser: letter-getter picks Movie or Actor to start new round
  if (roundChooserPid && !roundStartType) {
    document.getElementById('roundChooser').style.display  = 'block';
    document.getElementById('activeInput').style.display   = 'none';
    document.getElementById('waitingPanel').style.display  = 'none';
    const chooserName = players[roundChooserPid]?.name ?? '?';
    const amChooser   = roundChooserPid === me.id;
    document.getElementById('roundChooserPrompt').textContent =
      amChooser ? 'You got a letter — pick how to start the new round:'
                : `${chooserName} is picking how to start the new round…`;
    document.getElementById('roundChooserBtns').style.display = amChooser ? 'flex' : 'none';
    return;
  }
  document.getElementById('roundChooser').style.display = 'none';

  // Eliminated player — just watch
  if (myData.out) {
    document.getElementById('activeInput').style.display  = 'none';
    document.getElementById('waitingPanel').style.display = 'block';
    document.getElementById('waitingFor').textContent     = 'the game to finish';
    return;
  }

  const isMyTurn = curPid === me.id;
  if (isMyTurn) {
    document.getElementById('activeInput').style.display  = 'block';
    document.getElementById('waitingPanel').style.display = 'none';
    renderPrompt();
    renderDots();
    // Don't steal focus if the player is currently typing in chat
    if (document.activeElement?.id !== 'chatInput') {
      document.getElementById('answerInput').focus();
    }
  } else {
    document.getElementById('activeInput').style.display  = 'none';
    document.getElementById('waitingPanel').style.display = 'block';
    document.getElementById('waitingFor').textContent     = curPlayer.name ?? '?';
  }
}

// ── Challenge UI ─────────────────────────────────────────────
function renderChallengeUI(challenge, pending, players, myData) {
  const avail    = document.getElementById('challengeAvailable');
  const response = document.getElementById('challengeResponse');
  const watching = document.getElementById('challengeWatching');

  // Hide all challenge sections first
  avail.style.display    = 'none';
  response.style.display = 'none';
  watching.style.display = 'none';

  if (challenge) {
    // An active challenge — decide what each player sees
    if (challenge.challengedId === me.id) {
      // I'm being challenged — show the response input
      response.style.display = 'block';
      const dir = challenge.answerType === 'movie' ? 'actor' : 'movie';
      const exclude = challenge.prevName ? ` (not ${challenge.prevName})` : '';
      document.getElementById('challengePrompt').innerHTML =
        `<strong>${players[challenge.challengerId]?.name ?? 'Someone'}</strong> is challenging you! ` +
        `Name another <strong>${dir}</strong> ${challenge.answerType === 'movie' ? `from <strong>${challenge.answerName}</strong>` : `starring <strong>${challenge.answerName}</strong>`}${exclude}`;
      document.getElementById('challengeInput').focus();
    } else {
      // I'm watching — show spinner
      watching.style.display = 'block';
      const challenged = players[challenge.challengedId]?.name ?? '?';
      const challenger = players[challenge.challengerId]?.name ?? '?';
      document.getElementById('challengeWatchText').innerHTML =
        `<strong style="color:#ede9e3">${challenger}</strong> challenged <strong style="color:#ede9e3">${challenged}</strong> — waiting for response…`;
    }
    return;
  }

  // No active challenge — show challenge button if there's a pending challenge and I can issue it
  if (pending && pending.challengedId !== me.id && !myData.out) {
    avail.style.display = 'block';
    const challenged = players[pending.challengedId]?.name ?? '?';
    const dir = pending.answerType === 'movie' ? 'actor' : 'movie';
    document.getElementById('challengeBtnLabel').textContent = `⚡ Challenge ${challenged}`;
    document.getElementById('challengeBtnHint').textContent =
      `Make them name another ${dir} ${pending.answerType === 'movie' ? `from "${pending.answerName}"` : `with "${pending.answerName}"`}`;
  }
}

function renderChain() {
  const entries = Object.values(roomSnap.log ?? {});
  const el = document.getElementById('chainBox');
  if (!entries.length) {
    el.innerHTML = '<div style="color:#333;font-size:.85rem;">The chain will appear here…</div>';
    return;
  }
  el.innerHTML = entries.slice(-5).map((item, i, arr) => {
    const cur   = i === arr.length - 1;
    const actor = item.type === 'actor';
    const img   = item.imagePath ? tmdbImg(item.imagePath) : null;
    const fullImg = (actor && item.imagePath) ? tmdbImg(item.imagePath, 'w500') : '';
    return `<div class="chain-item ${cur ? 'current' : ''}">
      ${img
        ? `<img class="chain-thumb ${actor ? 'round' : ''}" src="${img}" alt="${item.name}" loading="lazy"
             ${actor ? `data-fullimg="${fullImg}" data-name="${item.name}"` : ''}>`
        : `<div class="chain-thumb ${actor ? 'round' : ''}"></div>`}
      <div class="chain-item-text">
        <div class="chain-item-label">${actor ? '⭐ Actor' : '🎬 Movie'}</div>
        <div class="chain-item-name">${item.name}</div>
      </div>
    </div>`;
  }).join('');

  el.querySelectorAll('.chain-thumb.round[data-fullimg]').forEach(img => {
    img.addEventListener('click', () => openLightbox(img.dataset.fullimg, img.dataset.name));
  });
}

function renderPrompt() {
  const last = roomSnap.lastChainItem;
  const rst  = roomSnap.roundStartType ?? null;
  const el   = document.getElementById('gamePrompt');
  const inp  = document.getElementById('answerInput');
  if (!last) {
    if (rst === 'actor') {
      el.innerHTML    = 'Name any <strong>actor</strong> to start the chain';
      inp.placeholder = 'Actor name…';
    } else {
      el.innerHTML    = 'Name any <strong>movie</strong> to start the chain';
      inp.placeholder = 'Movie title…';
    }
  } else if (last.type === 'movie') {
    el.innerHTML    = `Name an <strong>actor</strong> from <strong>${last.name}</strong>`;
    inp.placeholder = 'Actor name…';
  } else {
    el.innerHTML    = `Name a <strong>movie</strong> starring <strong>${last.name}</strong>`;
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
  document.getElementById('scores').innerHTML = order.map(pid => {
    const p = players[pid] ?? {};
    return `<div class="score-card ${pid === curPid ? 'active-turn' : ''} ${p.out ? 'out' : ''}">
      <div class="score-name">${p.name ?? '?'}</div>
      <div class="score-letters">${p.letters || ' '}</div>
    </div>`;
  }).join('');
}

// ============================================================
//  Answer submission (main game)
// ============================================================
async function handleSubmit() {
  if (submitting || roomSnap?.challenge) return;
  const input  = document.getElementById('answerInput');
  const answer = input.value.trim();
  if (!answer) return;
  if (!roomSnap) return;
  const order = toArray(roomSnap.playerOrder);
  if (order[roomSnap.currentIdx] !== me.id) return;

  submitting = true;
  document.getElementById('submitBtn').disabled = true;
  setFeedback('feedback', 'Checking…', '');
  input.value = '';

  const picked = selectedSuggestion;
  selectedSuggestion = null;
  clearSuggestionsEl('suggestions');

  try {
    const result = await validateAnswer(answer, roomSnap.lastChainItem, roomSnap.usedMovies, roomSnap.usedActors, picked, roomSnap.roundStartType ?? null);
    if (result.valid) {
      setFeedback('feedback', `✓ ${result.name}`, 'ok');
      await advanceChain(result);
    } else {
      setFeedback('feedback', result.error, 'err');
      await handleFailure();
    }
  } catch (e) {
    console.error(e);
    setFeedback('feedback', 'Network error — try again', 'err');
  }

  submitting = false;
  document.getElementById('submitBtn').disabled = false;
}

async function advanceChain(result) {
  const usedMovies = { ...(roomSnap.usedMovies ?? {}) };
  const usedActors = { ...(roomSnap.usedActors ?? {}) };
  if (result.type === 'movie') usedMovies[result.tmdbId] = true;
  else                          usedActors[result.tmdbId] = true;

  const logKey  = roomRef.child('log').push().key;
  const nextIdx = nextActiveIndex(roomSnap.currentIdx, roomSnap.players);
  const entry   = { type: result.type, name: result.name, tmdbId: result.tmdbId, imagePath: result.imagePath ?? null };

  // Is this the first item of a new round? If so, mark the opener so the
  // opening-move protection rule can fire if the responder can't answer.
  const isOpeningMove = !roomSnap.lastChainItem;

  // Build pendingChallenge so others can challenge this answer
  const prev = roomSnap.lastChainItem;
  const pending = {
    challengedId: me.id,
    answerType:   result.type,
    answerName:   result.name,
    answerId:     result.tmdbId,
    prevId:       prev?.tmdbId ?? null,
    prevName:     prev?.name ?? null
  };

  await roomRef.update({
    [`log/${logKey}`]: entry,
    lastChainItem:    entry,
    usedMovies, usedActors,
    currentAttempts:  0,
    currentIdx:       nextIdx,
    pendingChallenge: pending,
    challenge:        null,
    roundChooserPid:  null,
    roundStartType:   null,
    // Opening-move protection: store opener's id so the responder failure path knows
    openingMoveActive: isOpeningMove ? me.id : null,
    openingRetryMsg:   null   // clear any previous retry message
  });
}

async function handleFailure() {
  const attempts = (roomSnap.currentAttempts ?? 0) + 1;
  if (attempts < 3) { await roomRef.update({ currentAttempts: attempts }); return; }
  // Opening-move protection: if the responder can't answer the very first play
  // of a round, the opener must choose a different movie/actor instead of the
  // responder receiving a letter.
  const openerPid = roomSnap.openingMoveActive;
  if (openerPid && openerPid !== me.id) {
    await retryOpeningMove(openerPid);
  } else {
    await assignLetterAndPass(me.id);
  }
}

async function retryOpeningMove(openerPid) {
  const players   = roomSnap.players ?? {};
  const order     = toArray(roomSnap.playerOrder);
  const openerIdx = order.indexOf(openerPid);
  const typeWord  = roomSnap.roundStartType === 'actor' ? 'actor' : 'movie';
  const respName  = players[me.id]?.name ?? 'Your opponent';

  await roomRef.update({
    log:               {},
    lastChainItem:     null,
    currentAttempts:   0,
    currentIdx:        openerIdx >= 0 ? openerIdx : roomSnap.currentIdx,
    pendingChallenge:  null,
    challenge:         null,
    openingMoveActive: null,
    // Keep roundStartType so opener goes straight back to naming, not type-picking
    openingRetryMsg:   `${respName} couldn't answer — pick a different ${typeWord}`
  });
}

// ============================================================
//  Challenge system
// ============================================================
async function issueChallenge() {
  if (!roomSnap?.pendingChallenge) return;
  const pending = roomSnap.pendingChallenge;
  if (pending.challengedId === me.id) return; // can't challenge yourself

  await roomRef.update({
    challenge:        { ...pending, challengerId: me.id },
    pendingChallenge: null
  });
}

async function handleChallengeSubmit() {
  if (challengeSubmitting) return;
  const challenge = roomSnap?.challenge;
  if (!challenge || challenge.challengedId !== me.id) return;

  const input  = document.getElementById('challengeInput');
  const answer = input.value.trim();
  if (!answer) return;

  challengeSubmitting = true;
  document.getElementById('challengeSubmitBtn').disabled = true;
  setFeedback('challengeFeedback', 'Checking…', '');
  input.value = '';

  const picked = selectedChallengeSuggestion;
  selectedChallengeSuggestion = null;
  clearSuggestionsEl('challengeSuggestions');

  try {
    const result = await validateChallengeAnswer(answer, challenge, picked);
    if (result.valid) {
      // Challenged player proved it → challenger gets the letter
      setFeedback('challengeFeedback', `✓ ${result.name} — ${roomSnap.players?.[challenge.challengerId]?.name ?? 'Challenger'} gets the letter!`, 'ok');
      await resolveChallenge(challenge.challengerId, result.name);
    } else {
      setFeedback('challengeFeedback', result.error, 'err');
      // Give them a moment to read the error, then they must give up or try again
      // (unlimited attempts — they can give up to take the letter)
    }
  } catch (e) {
    console.error(e);
    setFeedback('challengeFeedback', 'Network error — try again', 'err');
  }

  challengeSubmitting = false;
  document.getElementById('challengeSubmitBtn').disabled = false;
}

async function resolveChallenge(loserPid, winningAnswer = null) {
  const challenge = roomSnap?.challenge;
  const players   = roomSnap?.players ?? {};

  if (challenge) {
    const winnerPid   = loserPid === challenge.challengerId ? challenge.challengedId : challenge.challengerId;
    const loserName   = players[loserPid]?.name  ?? '?';
    const winnerName  = players[winnerPid]?.name ?? '?';
    const loserLetter = WORD[(players[loserPid]?.letters ?? '').length] ?? '?';

    await roomRef.update({
      challenge:           null,
      pendingChallenge:    null,
      lastChallengeResult: {
        winnerPid, loserPid,
        loserName, loserLetter,
        winnerName,
        winningAnswer: winningAnswer ?? null,
        ts: Date.now()
      }
    });
  } else {
    await roomRef.update({ challenge: null, pendingChallenge: null });
  }
  await assignLetterAndPass(loserPid);
}

// ============================================================
//  Letter assignment (shared by normal failures, give-up, challenge)
// ============================================================
async function assignLetterAndPass(pid) {
  const players    = roomSnap.players ?? {};
  const myLetters  = players[pid]?.letters ?? '';
  const newLetters = myLetters + WORD[myLetters.length];
  const isOut      = newLetters.length >= WORD.length;

  const order = toArray(roomSnap.playerOrder);
  const updatedPlayers = {
    ...players,
    [pid]: { ...players[pid], letters: newLetters, out: isOut }
  };
  const stillIn = order.filter(p => !updatedPlayers[p]?.out);

  const updates = {
    [`players/${pid}/letters`]: newLetters,
    [`players/${pid}/out`]:     isOut,
    currentAttempts:   0,
    challenge:         null,
    pendingChallenge:  null,
    openingMoveActive: null,
    openingRetryMsg:   null
  };

  if (stillIn.length <= 1) {
    updates.status = 'finished';
    updates.winner = stillIn[0] ?? null;
  } else {
    // Round restart: clear the chain, let the letter-getter pick the starting type
    const chooserIdx = order.indexOf(pid);
    updates.roundChooserPid  = pid;
    updates.roundStartType   = null;
    updates.lastChainItem    = null;
    updates.log              = {};
    updates.currentIdx       = chooserIdx >= 0 ? chooserIdx : 0;
    updates.pendingChallenge = null;
  }

  await roomRef.update(updates);
}

async function handleRoundStartChoice(type) {
  if (!roomSnap || roomSnap.roundChooserPid !== me.id) return;
  await roomRef.update({ roundStartType: type });
}

async function leaveGame() {
  if (!roomSnap || !roomRef) { showScreen('screen-landing'); return; }
  const order   = toArray(roomSnap.playerOrder);
  const players = roomSnap.players ?? {};

  const updates = {
    [`players/${me.id}/out`]:     true,
    [`players/${me.id}/letters`]: WORD,
    currentAttempts: 0,
    challenge:        null,
    pendingChallenge: null
  };

  const stillIn = order.filter(pid => pid !== me.id && !players[pid]?.out);
  if (stillIn.length <= 1) {
    updates.status = 'finished';
    updates.winner = stillIn[0] ?? null;
  } else {
    const curPid = order[roomSnap.currentIdx];
    if (curPid === me.id) {
      const upd = { ...players, [me.id]: { ...players[me.id], out: true } };
      updates.currentIdx = nextActiveIndex(roomSnap.currentIdx, upd);
    }
  }

  await roomRef.update(updates);
  if (listener) roomRef.off('value', listener);
  listener = null; roomSnap = null; chatAttached = false; lastLogLength = -1;
  clearSession();
  document.getElementById('chatMessages').innerHTML = '';
  showScreen('screen-landing');
}

function nextActiveIndex(fromIdx, players) {
  const order = toArray(roomSnap.playerOrder);
  for (let i = 1; i <= order.length; i++) {
    const idx = (fromIdx + i) % order.length;
    if (!players?.[order[idx]]?.out) return idx;
  }
  return fromIdx;
}

// ============================================================
//  Game over
// ============================================================
function renderGameOver() {
  if (!roomSnap) return;
  const players  = roomSnap.players ?? {};
  const order    = toArray(roomSnap.playerOrder);
  const winnerId = roomSnap.winner;

  // Write stats once per game for signed-in users
  if (currentUser && !gameStatsWritten) {
    gameStatsWritten = true;
    const myData     = players[me.id] ?? {};
    const didWin     = winnerId === me.id;
    const lettersGot = (myData.letters ?? '').length;
    writeGameStats(didWin, lettersGot);
  }

  document.getElementById('winnerName').textContent = players[winnerId]?.name ?? 'Nobody';

  document.getElementById('finalScores').innerHTML = order.map(pid => {
    const p = players[pid] ?? {};
    const w = pid === winnerId;
    return `<div class="score-row">
      <span style="color:${w ? '#ede9e3' : '#4a4a4a'};font-weight:${w ? '600' : '400'}">${p.name ?? '?'}${w ? ' ◆' : ''}</span>
      <span style="color:#c0182b;letter-spacing:.1em;font-weight:700">${p.letters || '—'}</span>
    </div>`;
  }).join('');

  const entries = Object.values(roomSnap.log ?? {});
  document.getElementById('chainLen').textContent = entries.length;
  const finalChainEl = document.getElementById('finalChain');
  finalChainEl.innerHTML = entries.map(item => {
    const actor   = item.type === 'actor';
    const img     = item.imagePath ? tmdbImg(item.imagePath) : null;
    const fullImg = (actor && item.imagePath) ? tmdbImg(item.imagePath, 'w500') : '';
    return `<div class="chain-log-item">
      ${img
        ? `<img class="chain-log-thumb ${actor ? 'round' : ''}" src="${img}" alt="" loading="lazy"
             ${actor ? `data-fullimg="${fullImg}" data-name="${item.name}"` : ''}>`
        : `<span class="icon">${actor ? '⭐' : '🎬'}</span>`}
      <span>${item.name}</span>
    </div>`;
  }).join('');

  finalChainEl.querySelectorAll('.chain-log-thumb.round[data-fullimg]').forEach(img => {
    img.addEventListener('click', () => openLightbox(img.dataset.fullimg, img.dataset.name));
  });
}

// ============================================================
//  Stats — write to users/{uid} after a game ends
// ============================================================
async function writeGameStats(didWin, lettersGot) {
  if (!currentUser || !db) return;
  const ref = db.ref(`users/${currentUser.uid}`);
  try {
    // Transaction guarantees correct streak counts even across devices
    await ref.transaction(prev => {
      if (!prev) prev = {};
      const newStreak = didWin ? (prev.currentStreak ?? 0) + 1 : 0;
      return {
        ...prev,
        displayName:    currentUser.displayName ?? '',
        gamesPlayed:    (prev.gamesPlayed    ?? 0) + 1,
        wins:           (prev.wins           ?? 0) + (didWin ? 1 : 0),
        losses:         (prev.losses         ?? 0) + (didWin ? 0 : 1),
        lettersAllTime: (prev.lettersAllTime ?? 0) + lettersGot,
        currentStreak:  newStreak,
        bestStreak:     Math.max(prev.bestStreak ?? 0, newStreak),
      };
    });
  } catch (e) {
    console.error('Stats write failed:', e);
  }
}

// ============================================================
//  Lightbox
// ============================================================
function openLightbox(src, name) {
  const img = document.getElementById('lightboxImg');
  img.src = src;
  img.alt = name ?? '';
  document.getElementById('lightbox').classList.add('open');
}

function closeLightbox() {
  document.getElementById('lightbox').classList.remove('open');
}

// ============================================================
//  Challenge result overlay
// ============================================================
function showChallengeOverlay(r) {
  const iWon  = r.winnerPid === me.id;
  const iLost = r.loserPid  === me.id;

  document.getElementById('coIcon').textContent  = iWon ? '🏆' : iLost ? '💀' : '⚡';
  document.getElementById('coTitle').textContent = iWon  ? 'Challenge Won!'   :
                                                   iLost ? 'Challenge Lost'   :
                                                           'Challenge Over';
  let sub;
  if (iWon) {
    sub = `<strong style="color:#ede9e3">${r.loserName}</strong> received the letter ` +
          `<strong style="color:#c0182b">${r.loserLetter}</strong>`;
  } else if (iLost) {
    sub = r.winningAnswer
      ? `<strong style="color:#ede9e3">${r.winnerName}</strong> proved it`
      : `You couldn't prove the connection`;
  } else {
    sub = `<strong style="color:#ede9e3">${r.winnerName}</strong> won — ` +
          `<strong style="color:#ede9e3">${r.loserName}</strong> received ` +
          `<strong style="color:#c0182b">${r.loserLetter}</strong>`;
  }
  document.getElementById('coSub').innerHTML = sub;

  const answerEl = document.getElementById('coAnswer');
  if (r.winningAnswer) {
    answerEl.textContent   = `"${r.winningAnswer}"`;
    answerEl.style.display = 'block';
  } else {
    answerEl.style.display = 'none';
  }

  document.getElementById('challengeOverlay').classList.add('open');
  clearTimeout(overlayTimer);
  overlayTimer = setTimeout(closeChallengeOverlay, 5000);
}

function closeChallengeOverlay() {
  document.getElementById('challengeOverlay').classList.remove('open');
  clearTimeout(overlayTimer);
}

// ============================================================
//  Chat
// ============================================================
function attachChatListener() {
  if (!roomRef || chatAttached) return;
  chatAttached = true;
  roomRef.child('chat').on('child_added', snap => {
    const msg = snap.val();
    if (!msg) return;
    appendChatMessage(msg);
  });
}

function appendChatMessage(msg) {
  const el = document.getElementById('chatMessages');
  if (!el) return;
  const div = document.createElement('div');
  div.className = `chat-msg ${msg.name === me.name ? 'mine' : ''}`;
  div.innerHTML = `<span class="chat-name">${escHtml(msg.name)}</span>${escHtml(msg.text)}`;
  el.appendChild(div);
  el.scrollTop = el.scrollHeight;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

async function sendChat() {
  const input = document.getElementById('chatInput');
  const text  = input.value.trim();
  if (!text || !roomRef) return;
  input.value = '';
  await roomRef.child('chat').push({ name: me.name, text, ts: Date.now() });
}

// ============================================================
//  Event listeners
// ============================================================

// Auth
document.getElementById('googleSignInBtn').addEventListener('click', signInWithGoogle);
document.getElementById('signOutBtn').addEventListener('click', signOutUser);

// Editable game name — save on change (blur + value changed) or Enter key
document.getElementById('gameNameInput').addEventListener('change', function () {
  if (this.value.trim()) {
    saveGameName(this.value);
  } else {
    // Don't allow blank — reset to Google display name
    this.value = currentUser?.displayName ?? '';
  }
});
document.getElementById('gameNameInput').addEventListener('keydown', function (e) {
  if (e.key === 'Enter') this.blur();
});

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

document.getElementById('joinCode').addEventListener('input', function () {
  this.value = this.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
});

// Lobby
document.getElementById('lobbyCode').addEventListener('click', function () {
  navigator.clipboard.writeText(this.textContent).then(() => {
    const orig = this.textContent;
    this.textContent = 'Copied!';
    setTimeout(() => { this.textContent = orig; }, 1200);
  });
});
document.getElementById('startBtn').addEventListener('click', startGame);
document.getElementById('shareBtn').addEventListener('click', shareInviteLink);

// Main answer input + autocomplete
document.getElementById('submitBtn').addEventListener('click', handleSubmit);
document.getElementById('answerInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') handleSubmit();
  if (e.key === 'Escape') clearSuggestionsEl('suggestions');
});

const debouncedSearch = debounce(q => {
  fetchSuggestionsFor(q, mainDirection(), 'suggestions', item => {
    selectedSuggestion = item;
    document.getElementById('answerInput').value = item.name;
    clearSuggestionsEl('suggestions');
  });
}, 300);

document.getElementById('answerInput').addEventListener('input', function () {
  selectedSuggestion = null;
  debouncedSearch(this.value.trim());
});

// Challenge input + autocomplete
document.getElementById('challengeSubmitBtn').addEventListener('click', handleChallengeSubmit);
document.getElementById('challengeInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') handleChallengeSubmit();
  if (e.key === 'Escape') clearSuggestionsEl('challengeSuggestions');
});

const debouncedChallengeSearch = debounce(q => {
  fetchSuggestionsFor(q, challengeDirection(), 'challengeSuggestions', item => {
    selectedChallengeSuggestion = item;
    document.getElementById('challengeInput').value = item.name;
    clearSuggestionsEl('challengeSuggestions');
  });
}, 300);

document.getElementById('challengeInput').addEventListener('input', function () {
  selectedChallengeSuggestion = null;
  debouncedChallengeSearch(this.value.trim());
});

// Challenge buttons
document.getElementById('challengeBtn').addEventListener('click', issueChallenge);

document.getElementById('challengeGiveUpBtn').addEventListener('click', async () => {
  const challenge = roomSnap?.challenge;
  if (!challenge || challenge.challengedId !== me.id) return;
  if (!confirm('Give up the challenge? You\'ll take the letter.')) return;
  await resolveChallenge(me.id);
});

// Give up turn / leave
document.getElementById('giveUpBtn').addEventListener('click', async () => {
  if (!roomSnap) return;
  const order = toArray(roomSnap.playerOrder);
  if (order[roomSnap.currentIdx] !== me.id) return;

  const openerPid = roomSnap.openingMoveActive;
  const isOpeningResponse = openerPid && openerPid !== me.id;

  if (isOpeningResponse) {
    const openerName = (roomSnap.players ?? {})[openerPid]?.name ?? 'The opener';
    const typeWord   = roomSnap.roundStartType === 'actor' ? 'actor' : 'movie';
    if (!confirm(`Can't answer? ${openerName} will need to pick a different ${typeWord}.`)) return;
    await retryOpeningMove(openerPid);
  } else {
    if (!confirm('Give up your turn? You\'ll receive a letter.')) return;
    await assignLetterAndPass(me.id);
  }
});

document.getElementById('leaveBtn').addEventListener('click', () => {
  if (!confirm('Leave the game? You\'ll be eliminated.')) return;
  leaveGame();
});

// Round chooser
document.getElementById('pickMovieBtn').addEventListener('click', () => handleRoundStartChoice('movie'));
document.getElementById('pickActorBtn').addEventListener('click', () => handleRoundStartChoice('actor'));

// Chat
document.getElementById('chatSendBtn').addEventListener('click', sendChat);
document.getElementById('chatInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') sendChat();
});

// Lightbox
document.getElementById('lightbox').addEventListener('click', closeLightbox);

// Challenge result overlay
document.getElementById('challengeOverlay').addEventListener('click', closeChallengeOverlay);

// Close suggestions when clicking outside an input-wrap
document.addEventListener('click', e => {
  if (!e.target.closest('.input-wrap')) {
    clearSuggestionsEl('suggestions');
    clearSuggestionsEl('challengeSuggestions');
  }
});

// Game over
document.getElementById('playAgainBtn').addEventListener('click', () => {
  if (listener) roomRef.off('value', listener);
  roomSnap = null; roomId = null; roomRef = null; isHost = false; listener = null;
  chatAttached = false; lastSeenChallengeTs = 0; gameStatsWritten = false; lastLogLength = -1;
  clearSession();
  document.getElementById('chatMessages').innerHTML = '';
  setFeedback('feedback', '', '');
  // Pre-fill with Google name if signed in, otherwise keep last-used name
  document.getElementById('playerName').value = currentUser?.displayName ?? me.name ?? '';
  showScreen('screen-landing');
  updateAuthUI(); // refresh stats count on landing card
});

// ============================================================
//  Auto-fill room code from invite link (?room=XXXX)
// ============================================================
// ============================================================
//  Rotating quote subtitle
// ============================================================
function startQuoteRotation() {
  const el = document.getElementById('quoteSubtitle');
  if (!el) return;

  // Shuffle so it's not the same order every visit
  const shuffled = [...QUOTES].sort(() => Math.random() - 0.5);
  let idx = 0;

  function showQuote() {
    const [quote, film] = shuffled[idx];
    el.innerHTML = `${quote} <span style="font-style:normal;font-size:0.65rem;letter-spacing:0.1em;color:#333;">— ${film}</span>`;
    idx = (idx + 1) % shuffled.length;
  }

  // Show first quote immediately
  el.style.opacity = '1';
  showQuote();

  // Rotate every 5 seconds
  setInterval(() => {
    el.style.opacity = '0';
    setTimeout(() => {
      showQuote();
      el.style.opacity = '1';
    }, 650);
  }, 5000);
}

window.addEventListener('DOMContentLoaded', async () => {
  startQuoteRotation();

  if (firebaseReady) {
    // Wait for Firebase Auth to deliver its first state before attempting rejoin.
    // This ensures currentUser is populated so tryRejoin can check the cloud
    // session — which is what enables cross-device continuity for signed-in players.
    if (auth) {
      await new Promise(resolve => {
        const unsub = auth.onAuthStateChanged(user => { unsub(); resolve(user); });
      });
    }

    const rejoined = await tryRejoin();
    if (rejoined) return; // back in the game — skip landing setup
  }

  // Normal landing screen setup
  const params = new URLSearchParams(window.location.search);
  const invite = params.get('room');
  if (invite && /^[A-Z0-9]{4}$/i.test(invite)) {
    const codeEl = document.getElementById('joinCode');
    codeEl.value = invite.toUpperCase();
    codeEl.style.borderBottomColor = '#c0182b';
    document.body.classList.add('invite-mode');
    document.getElementById('playerName').focus();
  }
});
