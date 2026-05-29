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
// activeWord() reads the per-room word (fetched at room creation from TMDB).
// Falls back to 'MOVIE' if the room was created before this feature or fetch failed.
function activeWord() { return roomSnap?.word ?? 'MOVIE'; }

// Fallback pool used when TMDB yields nothing suitable
const _WORD_FALLBACKS = [
  'ALIEN','TENET','JOKER','ROCKY','SHREK','FARGO','CRASH',
  'DRIVE','BLADE','TAKEN','BAMBI','SPEED','GHOST','TWINS',
  'SULLY','FOCUS','BELLE','CRANK','DINER','LUCKY'
];

async function fetchRandomWord() {
  try {
    const candidates = [];
    for (let page = 1; page <= 4 && candidates.length < 25; page++) {
      const data = await tmdbFetch('/discover/movie', {
        sort_by: 'popularity.desc',
        'vote_count.gte': 800,
        page
      });
      for (const m of data.results ?? []) {
        if (/^[A-Za-z]{5}$/.test(m.title) && !candidates.some(c => c.word === m.title.toUpperCase())) {
          candidates.push({ word: m.title.toUpperCase(), wordMovieId: m.id });
        }
      }
    }
    if (candidates.length > 0) return candidates[Math.floor(Math.random() * candidates.length)];
  } catch (_) {}
  // Fallback: pick from the hardcoded list (no stored movie ID)
  return { word: _WORD_FALLBACKS[Math.floor(Math.random() * _WORD_FALLBACKS.length)], wordMovieId: null };
}

// ── Winner quotes ─────────────────────────────────────────────
const WINNER_QUOTES = [
  {
    text:   "If you ain't first, you're last.",
    source: "Ricky Bobby · Talladega Nights: The Ballad of Ricky Bobby (2006)"
  },
  {
    text:   "Two little mice fell in a bucket of cream. The first mouse quickly gave up and drowned. The second mouse wouldn't quit. He struggled so hard that eventually he churned that cream into butter and crawled out.",
    source: "Frank Abagnale Sr. · Catch Me If You Can (2002)"
  },
  {
    text:   "If hard work is the key to success, most people would rather pick the lock.",
    source: "The Internship (2013)"
  },
  {
    text:   "Goonies never say die.",
    source: "Mikey · The Goonies (1985)"
  },
  {
    text:   "Nobody is going to hit as hard as life, but it ain't how hard you can hit. It's how hard you can get hit and keep moving forward. That's how winning is done.",
    source: "Rocky Balboa · Rocky Balboa (2006)"
  },
  {
    text:   "I'm the best there is. I wake up in the morning and I piss excellence.",
    source: "Ricky Bobby · Talladega Nights: The Ballad of Ricky Bobby (2006)"
  },
  {
    text:   "You're the man now, dog.",
    source: "William Forrester · Finding Forrester (2000)"
  },
  {
    text:   "I'm kind of a big deal. People know me.",
    source: "Ron Burgundy · Anchorman: The Legend of Ron Burgundy (2004)"
  },
  {
    text:   "I'm the king of the world!",
    source: "Jack Dawson · Titanic (1997)"
  },
  {
    text:   "Get busy living, or get busy dying.",
    source: "Ellis 'Red' Redding · The Shawshank Redemption (1994)"
  },
  {
    text:   "Every man dies, not every man really lives.",
    source: "William Wallace · Braveheart (1995)"
  },
  {
    text:   "Show me the money!",
    source: "Rod Tidwell · Jerry Maguire (1996)"
  },
  {
    text:   "You've got to ask yourself one question: 'Do I feel lucky?' Well, do ya, punk?",
    source: "Harry Callahan · Dirty Harry (1971)"
  },
  {
    text:   "Roads? Where we're going we don't need roads.",
    source: "Dr. Emmett Brown · Back to the Future (1985)"
  },
  {
    text:   "To infinity and beyond!",
    source: "Buzz Lightyear · Toy Story (1995)"
  },
];

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
    // Refresh friends cache and start/stop real-time listeners
    if (user) {
      loadMyFriendNames();
      attachFriendReqListener();
      attachGameInviteListener();
    } else {
      myFriendNames = new Set();
      detachFriendReqListener();
      detachGameInviteListener();
      hideFriendReqPopup();
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

// Friends cache — Set of lowercased game names; updated on sign-in/friend ops
let myFriendNames = new Set();

// Friend request popup state
let _pendingFriendReq    = null;  // { uid, name }
let _friendReqCallback   = null;  // Firebase onChildAdded handler
let _friendReqRef        = null;
let _friendReqAttachTime = 0;

// Game invite listener state
let _gameInviteListener = null;
let _gameInviteRef      = null;

// Practice mode (all local — no Firebase room)
let practiceChain      = [];
let practiceUsedMovies = {};
let practiceUsedActors = {};
let practiceAttempts   = 0;
let practiceLastItem   = null;
let practiceStartType  = 'movie';
let practiceSelected   = null;

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
  const nameInput = document.getElementById('playerName');
  if (nameInput) nameInput.value = '';
  showScreen('screen-landing');
}

async function saveGameName(name) {
  const trimmed = name.trim().slice(0, 20);
  if (!currentUser || !db || !trimmed) return;
  // Read old name so we can remove the stale username index entry
  const oldSnap  = await db.ref(`users/${currentUser.uid}/gameName`).once('value');
  const oldName  = oldSnap.val();
  const ops = [
    db.ref(`users/${currentUser.uid}/gameName`).set(trimmed),
    db.ref(`usernames/${trimmed.toLowerCase()}`).set(currentUser.uid)
  ];
  if (oldName && oldName.toLowerCase() !== trimmed.toLowerCase()) {
    ops.push(db.ref(`usernames/${oldName.toLowerCase()}`).remove());
  }
  await Promise.all(ops);
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

  const avatarEl  = document.getElementById('authAvatar');
  const nameEl    = document.getElementById('authDisplayName');
  const statsEl   = document.getElementById('authStatsLine');

  if (avatarEl) {
    avatarEl.src = currentUser.photoURL ?? '';
    avatarEl.style.display = currentUser.photoURL ? 'block' : 'none';
  }

  // Pull stats + stored game name from Firebase
  if (db) {
    if (statsEl) statsEl.textContent = '…';
    try {
      const snap  = await db.ref(`users/${currentUser.uid}`).once('value');
      const stats = snap.val();

      // Prefer stored game name, fall back to Google display name
      const gameName = stats?.gameName ?? currentUser.displayName ?? '';
      if (nameEl) nameEl.textContent = gameName;

      // Sync to playerName if the user hasn't typed something different
      const nameInput = document.getElementById('playerName');
      if (nameInput) {
        const cur = nameInput.value.trim();
        if (!cur || cur === currentUser.displayName) nameInput.value = gameName;
      }

      // Auto-save Google display name as game name on first sign-in
      if (!stats?.gameName && currentUser.displayName) {
        saveGameName(currentUser.displayName).catch(() => {});
      }

      if (statsEl) {
        if (stats?.gamesPlayed) {
          const g = stats.gamesPlayed;
          const w = stats.wins ?? 0;
          statsEl.textContent = `${g} game${g !== 1 ? 's' : ''} · ${w} win${w !== 1 ? 's' : ''}`;
        } else {
          statsEl.textContent = 'No games yet';
        }
      }
    } catch (_) {
      if (statsEl) statsEl.textContent = '';
      if (nameEl && !nameEl.textContent) nameEl.textContent = currentUser.displayName ?? '';
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
  // If a reverse is active the player names the SAME type as the last item (not the opposite)
  if (roomSnap?.reverseMoveActive) return last.type;
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
//  Reverse-move validation
// ============================================================
// Actor → Actor: the answer actor must share at least one movie with the last (actor) chain item.
// Movie → Movie: the answer movie must share at least one actor with the last (movie) chain item.
async function validateReverseAnswer(input, lastItem, usedMovies, usedActors, preSelected = null) {
  if (lastItem.type === 'actor') {
    // --- Actor → Actor via shared movie ---
    let personId, personName, imagePath;
    if (preSelected) {
      personId = preSelected.tmdbId; personName = preSelected.name; imagePath = preSelected.imagePath;
    } else {
      const p = await searchPerson(input);
      if (!p) return { valid: false, error: `Can't find an actor named "${input}"` };
      personId = p.id; personName = p.name; imagePath = p.profile_path ?? null;
    }
    if (personId === lastItem.tmdbId) return { valid: false, error: "That's the same actor!" };
    if (usedActors?.[personId]) return { valid: false, error: `${personName} was already used` };

    // Find a movie both actors share
    const [filmsA, filmsB] = await Promise.all([
      personFilmography(lastItem.tmdbId),
      personFilmography(personId)
    ]);
    const movieSetA = new Set(filmsA.map(f => f.id));
    const sharedFilm = filmsB.find(f => movieSetA.has(f.id));
    if (!sharedFilm) {
      return { valid: false, error: `${personName} and ${lastItem.name} haven't appeared in a movie together` };
    }
    return { valid: true, name: personName, tmdbId: personId, type: 'actor', imagePath, sharedVia: sharedFilm.title };

  } else {
    // --- Movie → Movie via shared actor ---
    let movieId, movieTitle, imagePath;
    if (preSelected) {
      movieId = preSelected.tmdbId; movieTitle = preSelected.name; imagePath = preSelected.imagePath;
    } else {
      const m = await searchMovie(input);
      if (!m) return { valid: false, error: `Can't find a movie called "${input}"` };
      movieId = m.id; movieTitle = m.title; imagePath = m.poster_path ?? null;
    }
    if (movieId === lastItem.tmdbId) return { valid: false, error: "That's the same movie!" };
    if (usedMovies?.[movieId]) return { valid: false, error: `"${movieTitle}" was already used` };

    // Find an actor both movies share
    const [castA, castB] = await Promise.all([
      movieCast(lastItem.tmdbId),
      movieCast(movieId)
    ]);
    const actorSetA = new Set(castA.map(c => c.id));
    const sharedActor = castB.find(c => actorSetA.has(c.id));
    if (!sharedActor) {
      return { valid: false, error: `"${movieTitle}" and "${lastItem.name}" don't share any cast members` };
    }
    return { valid: true, name: movieTitle, tmdbId: movieId, type: 'movie', imagePath, sharedVia: sharedActor.name };
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
  const { answerType, answerId, answerName, prevId, prevName, isReverse } = challenge;

  // ── Reverse-move challenge ────────────────────────────────────
  if (isReverse) {
    if (answerType === 'actor') {
      // Reverse was actor→actor. To prove: name a MOVIE both actors were in.
      let movieId, movieTitle;
      if (preSelected) {
        movieId = preSelected.tmdbId; movieTitle = preSelected.name;
      } else {
        const m = await searchMovie(input);
        if (!m) return { valid: false, error: `Can't find a movie called "${input}"` };
        movieId = m.id; movieTitle = m.title;
      }
      const [filmsA, filmsB] = await Promise.all([
        personFilmography(prevId),    // the previous actor
        personFilmography(answerId)   // the answer actor
      ]);
      const inA = filmsA.some(f => f.id === movieId);
      const inB = filmsB.some(f => f.id === movieId);
      if (!inA || !inB) {
        const missing = !inA ? prevName : answerName;
        return { valid: false, error: `${missing} wasn't in "${movieTitle}"` };
      }
      return { valid: true, name: movieTitle };

    } else {
      // Reverse was movie→movie. To prove: name an ACTOR who was in both movies.
      let personId, personName;
      if (preSelected) {
        personId = preSelected.tmdbId; personName = preSelected.name;
      } else {
        const p = await searchPerson(input);
        if (!p) return { valid: false, error: `Can't find an actor named "${input}"` };
        personId = p.id; personName = p.name;
      }
      const [castA, castB] = await Promise.all([
        movieCast(prevId),    // the previous movie
        movieCast(answerId)   // the answer movie
      ]);
      const inA = castA.some(c => c.id === personId);
      const inB = castB.some(c => c.id === personId);
      if (!inA || !inB) {
        const missing = !inA ? `"${prevName}"` : `"${answerName}"`;
        return { valid: false, error: `${personName} wasn't in ${missing}` };
      }
      return { valid: true, name: personName };
    }
  }

  // ── Normal challenge ──────────────────────────────────────────
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

  // Fetch a random 5-letter movie title to use as the scoring word for this game
  const { word, wordMovieId } = await fetchRandomWord();

  await roomRef.set({
    hostId: me.id, status: 'waiting',
    currentIdx: 0, currentAttempts: 0,
    lastChainItem: null,
    usedMovies: {}, usedActors: {},
    players: { [me.id]: { name, letters: '', order: 0, out: false } },
    playerOrder: [me.id],
    winner: null, log: {}, fullLog: {},
    pendingChallenge: null, challenge: null,
    reverseUsed: {}, reverseMoveActive: null,
    word, wordMovieId: wordMovieId ?? null
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
  if (s === 'finished') {
    if (cur !== 'screen-gameover') {
      renderGameOver();
      showScreen('screen-gameover');
      showWordQuoteSplash(); // cinematic reveal before the scores
    }
    renderRematchButton(); // keep button state in sync for late-arriving rematch offers
  }
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
  renderLobbyInvites(); // load friends invite list async (no-op if not signed in)
}

function renderLobby() {
  const players = roomSnap.players ?? {};
  const order   = toArray(roomSnap.playerOrder);
  document.getElementById('lobbyCode').textContent   = roomId;
  document.getElementById('playerCount').textContent = order.length;

  document.getElementById('playersList').innerHTML = order.map(pid => {
    const p      = players[pid] ?? {};
    const canAdd = currentUser && pid !== me.id;
    return `<li style="${pid === me.id ? 'color:#ede9e3;font-weight:600' : ''};display:flex;align-items:center;gap:6px;">
      <span style="flex:1;">${p.name ?? '?'}
        ${pid === roomSnap.hostId ? '<span class="host-badge">HOST</span>' : ''}
        ${pid === me.id ? '<span class="me-badge">(you)</span>' : ''}
      </span>
      ${canAdd && !myFriendNames.has((p.name ?? '').toLowerCase()) ? `<button data-add-friend="${escHtml(p.name ?? '')}"
        style="background:none;border:none;color:var(--dim);font-size:0.54rem;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;cursor:pointer;font-family:inherit;padding:3px 0;white-space:nowrap;"
        onmouseover="this.style.color='var(--ok)'" onmouseout="this.style.color='var(--dim)'">+ Add</button>` : ''}
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

  // Chain length badge (current round links + all-time across rounds)
  const fullLogLen = Object.keys(roomSnap.fullLog ?? {})
    .filter(k => (roomSnap.fullLog[k]?.type ?? '') !== 'round-end').length;
  const totalLinks = fullLogLen + logLen;
  const badgeEl = document.getElementById('chainLengthBadge');
  if (badgeEl) badgeEl.textContent = totalLinks > 0 ? `${logLen} this round · ${totalLinks} total` : '';

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

    // Reverse button: 2-player only, not yet used, chain has started, not already active
    const activePlayers     = order.filter(p => !players[p]?.out);
    const reverseAvailable  = activePlayers.length === 2
                           && !roomSnap.reverseMoveActive
                           && !roomSnap.reverseUsed?.[me.id]
                           && !!roomSnap.lastChainItem;
    const reverseWrap = document.getElementById('reverseWrap');
    if (reverseWrap) reverseWrap.style.display = reverseAvailable ? 'block' : 'none';

    // Don't steal focus if the player is currently typing in chat
    if (document.activeElement?.id !== 'chatInput') {
      document.getElementById('answerInput').focus();
    }
  } else {
    document.getElementById('activeInput').style.display  = 'none';
    document.getElementById('waitingPanel').style.display = 'block';
    document.getElementById('waitingFor').textContent     = curPlayer.name ?? '?';
    // Always hide reverse button when it's not our turn
    const reverseWrap = document.getElementById('reverseWrap');
    if (reverseWrap) reverseWrap.style.display = 'none';
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
  const revokeWrap = document.getElementById('revokeChallengeWrap');
  if (revokeWrap) revokeWrap.style.display = 'none';

  if (challenge) {
    // An active challenge — decide what each player sees
    if (challenge.challengedId === me.id) {
      // I'm being challenged — show the response input
      response.style.display = 'block';
      const challengerName = players[challenge.challengerId]?.name ?? 'Someone';
      let promptText;
      if (challenge.isReverse) {
        // Reverse challenge: prove the co-star / shared-cast link
        if (challenge.answerType === 'actor') {
          promptText = `<strong>${challengerName}</strong> is challenging your Reverse! Name a <strong>movie</strong> that both <strong>${challenge.prevName}</strong> and <strong>${challenge.answerName}</strong> appeared in`;
        } else {
          promptText = `<strong>${challengerName}</strong> is challenging your Reverse! Name an <strong>actor</strong> who appeared in both <strong>${challenge.prevName}</strong> and <strong>${challenge.answerName}</strong>`;
        }
      } else {
        const dir = challenge.answerType === 'movie' ? 'actor' : 'movie';
        const exclude = challenge.prevName ? ` (not ${challenge.prevName})` : '';
        promptText = `<strong>${challengerName}</strong> is challenging you! ` +
          `Name another <strong>${dir}</strong> ${challenge.answerType === 'movie' ? `from <strong>${challenge.answerName}</strong>` : `starring <strong>${challenge.answerName}</strong>`}${exclude}`;
      }
      document.getElementById('challengePrompt').innerHTML = promptText;
      document.getElementById('challengeInput').focus();
    } else {
      // I'm watching (challenger or spectator) — show spinner
      watching.style.display = 'block';
      const challenged = players[challenge.challengedId]?.name ?? '?';
      const challenger = players[challenge.challengerId]?.name ?? '?';
      document.getElementById('challengeWatchText').innerHTML =
        `<strong style="color:#ede9e3">${challenger}</strong> challenged <strong style="color:#ede9e3">${challenged}</strong> — waiting for response…`;
      // Show revoke button only to the challenger
      const revokeWrap = document.getElementById('revokeChallengeWrap');
      if (revokeWrap) revokeWrap.style.display = challenge.challengerId === me.id ? 'block' : 'none';
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
    el.innerHTML = '<div style="color:var(--dim);font-size:.85rem;">The chain will appear here…</div>';
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
  const last    = roomSnap.lastChainItem;
  const rst     = roomSnap.roundStartType ?? null;
  const reverse = roomSnap.reverseMoveActive;
  const el      = document.getElementById('gamePrompt');
  const inp     = document.getElementById('answerInput');
  if (!last) {
    if (rst === 'actor') {
      el.innerHTML    = 'Name any <strong>actor</strong> to start the chain';
      inp.placeholder = 'Actor name…';
    } else {
      el.innerHTML    = 'Name any <strong>movie</strong> to start the chain';
      inp.placeholder = 'Movie title…';
    }
  } else if (reverse) {
    // Reverse-active: same type as last item, connected via co-star / shared cast
    if (last.type === 'actor') {
      el.innerHTML    = `🔄 Name another <strong>actor</strong> who has co-starred with <strong>${last.name}</strong>`;
      inp.placeholder = 'Actor name…';
    } else {
      el.innerHTML    = `🔄 Name another <strong>movie</strong> that shares a cast member with <strong>${last.name}</strong>`;
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
    const p      = players[pid] ?? {};
    const canAdd = currentUser && pid !== me.id
                   && !myFriendNames.has((p.name ?? '').toLowerCase());
    return `<div class="score-card ${pid === curPid ? 'active-turn' : ''} ${p.out ? 'out' : ''}">
      <div class="score-name">${p.name ?? '?'}</div>
      <div class="score-letters">${p.letters || ' '}</div>
      ${canAdd ? `<button data-add-friend="${escHtml(p.name ?? '')}"
        style="background:none;border:none;color:var(--dim);font-size:0.46rem;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;cursor:pointer;font-family:inherit;padding:3px 0;display:block;width:100%;margin-top:2px;"
        onmouseover="this.style.color='var(--ok)'" onmouseout="this.style.color='var(--dim)'">+ add</button>` : ''}
    </div>`;
  }).join('');
  // Word is a surprise — keep it hidden during play
  const wordEl = document.getElementById('wordIndicator');
  if (wordEl) wordEl.textContent = '';
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
    const isReverse = !!(roomSnap.reverseMoveActive);
    const result = isReverse
      ? await validateReverseAnswer(answer, roomSnap.lastChainItem, roomSnap.usedMovies, roomSnap.usedActors, picked)
      : await validateAnswer(answer, roomSnap.lastChainItem, roomSnap.usedMovies, roomSnap.usedActors, picked, roomSnap.roundStartType ?? null);
    if (result.valid) {
      const label = result.sharedVia
        ? `✓ ${result.name} — via ${result.sharedVia}`
        : `✓ ${result.name}`;
      setFeedback('feedback', label, 'ok');
      await advanceChain(result, isReverse);
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

async function advanceChain(result, isReverse = false) {
  const usedMovies = { ...(roomSnap.usedMovies ?? {}) };
  const usedActors = { ...(roomSnap.usedActors ?? {}) };
  if (result.type === 'movie') usedMovies[result.tmdbId] = true;
  else                          usedActors[result.tmdbId] = true;

  const logKey  = roomRef.child('log').push().key;
  const nextIdx = nextActiveIndex(roomSnap.currentIdx, roomSnap.players);
  // Include isReverse flag in the log entry so the chain log can show it distinctly
  const entry   = {
    type: result.type, name: result.name, tmdbId: result.tmdbId,
    imagePath: result.imagePath ?? null,
    ...(isReverse ? { isReverse: true, sharedVia: result.sharedVia ?? null } : {})
  };

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
    prevName:     prev?.name ?? null,
    ...(isReverse ? { isReverse: true } : {})
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
    reverseMoveActive: null,   // clear the reverse flag — move is done
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
    reverseMoveActive: null,
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

// ============================================================
//  Reverse power-up
// ============================================================
async function useReverse() {
  if (!roomSnap) return;
  const order   = toArray(roomSnap.playerOrder);
  const players = roomSnap.players ?? {};

  // Guard: must be active 2-player game on my turn, token unspent, chain started, not already active
  const activePlayers = order.filter(p => !players[p]?.out);
  if (activePlayers.length !== 2) return;
  if (order[roomSnap.currentIdx] !== me.id) return;
  if (roomSnap.reverseUsed?.[me.id]) return;
  if (!roomSnap.lastChainItem) return;
  if (roomSnap.reverseMoveActive) return;

  await roomRef.update({
    [`reverseUsed/${me.id}`]: true,
    reverseMoveActive: true
  });
  // renderGame will fire via the onValue listener and update the prompt automatically
}

async function revokeChallenge() {
  if (!roomSnap?.challenge) return;
  const ch = roomSnap.challenge;
  if (ch.challengerId !== me.id) return; // only the challenger can revoke
  // Restore pendingChallenge so a re-challenge is still possible
  await roomRef.update({
    challenge: null,
    pendingChallenge: {
      challengedId: ch.challengedId,
      answerType:   ch.answerType,
      answerId:     ch.answerId,
      answerName:   ch.answerName,
      prevId:       ch.prevId   ?? null,
      prevName:     ch.prevName ?? null
    }
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
    const loserLetter = activeWord()[(players[loserPid]?.letters ?? '').length] ?? '?';

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
  const word       = activeWord();
  const newLetters = myLetters + word[myLetters.length];
  const isOut      = newLetters.length >= word.length;

  const order = toArray(roomSnap.playerOrder);
  const updatedPlayers = {
    ...players,
    [pid]: { ...players[pid], letters: newLetters, out: isOut }
  };
  const stillIn = order.filter(p => !updatedPlayers[p]?.out);

  const updates = {
    [`players/${pid}/letters`]: newLetters,
    [`players/${pid}/out`]:     isOut,
    currentAttempts:    0,
    challenge:          null,
    pendingChallenge:   null,
    openingMoveActive:  null,
    openingRetryMsg:    null,
    reverseMoveActive:  null   // safety: clear any in-flight reverse on letter assignment
  };

  if (stillIn.length <= 1) {
    // Game over — flush remaining log entries to fullLog before finishing
    const finalLog = roomSnap.log ?? {};
    Object.entries(finalLog).forEach(([k, v]) => { updates[`fullLog/${k}`] = v; });
    updates.status = 'finished';
    updates.winner = stillIn[0] ?? null;
  } else {
    // Round restart: archive current round to fullLog then clear the chain
    const currentLog = roomSnap.log ?? {};
    Object.entries(currentLog).forEach(([k, v]) => { updates[`fullLog/${k}`] = v; });
    // Add a round-end marker so the log viewer can show round breaks
    const markerKey = db.ref().push().key;
    updates[`fullLog/${markerKey}`] = {
      type:      'round-end',
      loserName: players[pid]?.name ?? '?',
      letter:    newLetters[newLetters.length - 1]
    };
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

async function leaveLobby() {
  if (!roomRef) { showScreen('screen-landing'); return; }
  const order    = toArray(roomSnap?.playerOrder ?? []);
  const newOrder = order.filter(pid => pid !== me.id);

  if (newOrder.length === 0) {
    // Last person in the lobby — remove the room entirely
    await roomRef.remove();
  } else {
    const updates = { [`players/${me.id}`]: null, playerOrder: newOrder };
    if (isHost) updates.hostId = newOrder[0]; // hand host to next player
    await roomRef.update(updates);
  }

  if (listener) roomRef.off('value', listener);
  listener = null; roomSnap = null; roomId = null; roomRef = null; isHost = false;
  chatAttached = false;
  clearSession();
  showScreen('screen-landing');
}

async function leaveGame() {
  if (!roomSnap || !roomRef) { showScreen('screen-landing'); return; }
  const order   = toArray(roomSnap.playerOrder);
  const players = roomSnap.players ?? {};

  const updates = {
    [`players/${me.id}/out`]:     true,
    [`players/${me.id}/letters`]: activeWord(),
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
// ============================================================
//  Word-movie quote splash (shown before game-over screen)
// ============================================================
let _splashDismissTimer = null;

async function showWordQuoteSplash() {
  const splash = document.getElementById('wordQuoteSplash');
  if (!splash) return;

  const word    = activeWord();
  const movieId = roomSnap?.wordMovieId ?? null;

  // Show immediately with just the word while we fetch details
  document.getElementById('wqsWord').textContent    = word;
  document.getElementById('wqsYear').textContent    = '';
  document.getElementById('wqsTagline').textContent = '';
  const bgEl = document.getElementById('wqsBg');
  if (bgEl) bgEl.style.backgroundImage = '';

  splash.style.display = 'flex';
  // Fade in on next frame
  requestAnimationFrame(() => requestAnimationFrame(() => { splash.style.opacity = '1'; }));

  // Fetch tagline + poster from TMDB
  try {
    let data = null;
    if (movieId) {
      data = await tmdbFetch(`/movie/${movieId}`);
    } else {
      // Fallback: search by word title and take the closest match
      const res = await tmdbFetch('/search/movie', { query: word, language: 'en-US' });
      data = (res.results ?? []).find(m => m.title.toUpperCase() === word) ?? res.results?.[0] ?? null;
      if (data?.id) data = await tmdbFetch(`/movie/${data.id}`);
    }

    if (data) {
      const year    = (data.release_date ?? '').slice(0, 4);
      const tagline = (data.tagline ?? '').trim();
      const poster  = data.poster_path ?? '';

      if (year)    document.getElementById('wqsYear').textContent    = year;
      if (tagline) document.getElementById('wqsTagline').textContent = `"${tagline}"`;
      if (poster && bgEl) bgEl.style.backgroundImage = `url(https://image.tmdb.org/t/p/w780${poster})`;
    }
  } catch (_) { /* show with just the word — still a nice reveal */ }

  // Dismiss handler — tap or auto after 5.5 s
  const dismiss = () => {
    clearTimeout(_splashDismissTimer);
    splash.removeEventListener('click', dismiss);
    splash.style.opacity = '0';
    setTimeout(() => { splash.style.display = 'none'; }, 420);
  };
  splash.addEventListener('click', dismiss);
  clearTimeout(_splashDismissTimer);
  _splashDismissTimer = setTimeout(dismiss, 5500);
}

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
    const p      = players[pid] ?? {};
    const w      = pid === winnerId;
    const canAdd = currentUser && pid !== me.id
                   && !myFriendNames.has((p.name ?? '').toLowerCase());
    return `<div class="score-row" style="align-items:center;">
      <span style="color:${w ? '#ede9e3' : 'var(--dim)'};font-weight:${w ? '600' : '400'};flex:1;">${p.name ?? '?'}${w ? ' ◆' : ''}</span>
      <span style="color:#c0182b;letter-spacing:.1em;font-weight:700;margin-right:${canAdd ? '10px' : '0'}">${p.letters || '—'}</span>
      ${canAdd ? `<button data-add-friend="${escHtml(p.name ?? '')}"
        style="background:none;border:1px solid var(--bd2);color:var(--dim);font-size:0.54rem;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;cursor:pointer;font-family:inherit;padding:4px 8px;white-space:nowrap;"
        onmouseover="this.style.borderColor='var(--ok)';this.style.color='var(--ok)'" onmouseout="this.style.borderColor='var(--bd2)';this.style.color='var(--dim)'">+ Add</button>` : ''}
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

  // Reveal the secret word on the game-over screen
  const revealWrap = document.getElementById('wordRevealWrap');
  const revealText = document.getElementById('wordReveal');
  if (revealWrap && revealText) {
    revealText.textContent = activeWord();
    revealWrap.style.display = 'block';
  }

  // Pick one random winner quote for this game
  const q = WINNER_QUOTES[Math.floor(Math.random() * WINNER_QUOTES.length)];
  const quoteEl  = document.getElementById('winnerQuote');
  const quoteText = document.getElementById('winnerQuoteText');
  const quoteSrc  = document.getElementById('winnerQuoteSource');
  if (quoteEl && quoteText && quoteSrc) {
    quoteText.textContent = `“${q.text}”`;   // "…"
    quoteSrc.textContent  = `— ${q.source}`;      // — Source
    quoteEl.style.display = 'block';
  }
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
//  Account page
// ============================================================
async function showAccount() {
  showScreen('screen-account');
  await renderAccountPage();
}

async function renderAccountPage() {
  if (!currentUser) { showScreen('screen-landing'); return; }

  // Avatar
  const avatarEl = document.getElementById('acctAvatar');
  if (avatarEl) {
    avatarEl.src = currentUser.photoURL ?? '';
    avatarEl.style.display = currentUser.photoURL ? 'block' : 'none';
  }

  // Name input
  const nameInput = document.getElementById('acctNameInput');
  const nameFb    = document.getElementById('acctNameFeedback');

  if (!db) return;
  try {
    const snap = await db.ref(`users/${currentUser.uid}`).once('value');
    const data = snap.val() ?? {};

    const gameName = data.gameName ?? currentUser.displayName ?? '';
    if (nameInput) nameInput.value = gameName;

    // Stats
    const g = data.gamesPlayed ?? 0;
    const w = data.wins        ?? 0;
    const l = data.losses      ?? 0;
    const s = data.currentStreak ?? 0;
    const b = data.bestStreak    ?? 0;
    const setEl = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    setEl('acctGamesPlayed', g || '0');
    setEl('acctWins',        w || '0');
    setEl('acctLosses',      l || '0');
    setEl('acctStreak',      s || '0');
    setEl('acctBestStreak',  b || '0');
    setEl('acctWinRate',     g > 0 ? `${Math.round(w / g * 100)}%` : '—');
  } catch (_) {}

  // Friends
  await Promise.all([renderFriendsList(), renderFriendRequests()]);
}

// ============================================================
//  Friends
// ============================================================

async function renderFriendsList() {
  if (!currentUser || !db) return;
  const snap    = await db.ref(`users/${currentUser.uid}/friends`).once('value');
  const friends = snap.val() ?? {};
  const entries = Object.entries(friends);
  const countEl = document.getElementById('acctFriendCount');
  if (countEl) countEl.textContent = entries.length;
  const el = document.getElementById('acctFriendsList');
  if (!el) return;
  if (!entries.length) {
    el.innerHTML = '<p style="font-size:0.78rem;color:var(--dim);padding:4px 0;">No friends yet — add one below</p>';
    return;
  }
  el.innerHTML = entries.map(([fuid, d]) =>
    `<div style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--bd);">
       <span style="flex:1;font-size:0.88rem;color:var(--text);">${escHtml(d.name ?? '?')}</span>
       <button class="invite-game-btn" data-uid="${fuid}" data-name="${escHtml(d.name ?? '?')}"
         style="background:none;border:1px solid var(--bd2);color:var(--dim);font-size:0.52rem;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;cursor:pointer;font-family:inherit;padding:5px 10px;transition:all 0.15s;"
         onmouseover="if(!this.dataset.sent){this.style.borderColor='var(--ok)';this.style.color='var(--ok)'}"
         onmouseout="if(!this.dataset.sent){this.style.borderColor='var(--bd2)';this.style.color='var(--dim)'}">Invite</button>
       <button class="rm-friend-btn" data-uid="${fuid}"
         style="background:none;border:none;color:var(--dim);font-size:0.52rem;letter-spacing:0.1em;text-transform:uppercase;cursor:pointer;font-family:inherit;padding:2px 0;">Remove</button>
     </div>`
  ).join('');
  el.querySelectorAll('.invite-game-btn').forEach(btn =>
    btn.addEventListener('click', () => inviteFromFriendsList(btn.dataset.uid, btn.dataset.name, btn))
  );
  el.querySelectorAll('.rm-friend-btn').forEach(btn =>
    btn.addEventListener('click', () => removeFriend(btn.dataset.uid))
  );
}

async function renderFriendRequests() {
  if (!currentUser || !db) return;
  const snap     = await db.ref(`users/${currentUser.uid}/friendRequests`).once('value');
  const requests = snap.val() ?? {};
  const entries  = Object.entries(requests);
  const card = document.getElementById('acctFriendRequestsCard');
  const list = document.getElementById('acctFriendRequestsList');
  if (!card || !list) return;
  if (!entries.length) { card.style.display = 'none'; return; }
  card.style.display = 'block';
  list.innerHTML = entries.map(([fuid, d]) =>
    `<div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--bd);">
       <span style="flex:1;font-size:0.88rem;">${escHtml(d.name ?? '?')}</span>
       <button class="accept-req-btn" data-uid="${fuid}" data-name="${escHtml(d.name ?? '?')}"
         style="background:var(--ok);color:#fff;border:none;padding:5px 10px;font-size:0.6rem;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;cursor:pointer;font-family:inherit;">Accept</button>
       <button class="decline-req-btn" data-uid="${fuid}"
         style="background:none;border:1px solid var(--bd2);color:var(--dim);padding:5px 10px;font-size:0.6rem;letter-spacing:0.1em;text-transform:uppercase;cursor:pointer;font-family:inherit;">Decline</button>
     </div>`
  ).join('');
  list.querySelectorAll('.accept-req-btn').forEach(btn =>
    btn.addEventListener('click', () => acceptFriendRequest(btn.dataset.uid, btn.dataset.name))
  );
  list.querySelectorAll('.decline-req-btn').forEach(btn =>
    btn.addEventListener('click', () => declineFriendRequest(btn.dataset.uid))
  );
}

async function sendFriendRequest() {
  if (!currentUser || !db) return;
  const input = document.getElementById('acctAddFriendInput');
  const fb    = document.getElementById('acctAddFriendFeedback');
  const name  = input?.value.trim() ?? '';
  if (!name) return;
  fb.style.color = 'var(--dim)';
  fb.textContent = 'Looking up…';
  try {
    const snap = await db.ref(`usernames/${name.toLowerCase()}`).once('value');
    if (!snap.exists()) { fb.style.color = 'var(--red)'; fb.textContent = 'No player found with that name'; return; }
    const targetUid = snap.val();
    if (targetUid === currentUser.uid) { fb.style.color = 'var(--red)'; fb.textContent = "That's you!"; return; }
    const alreadySnap = await db.ref(`users/${currentUser.uid}/friends/${targetUid}`).once('value');
    if (alreadySnap.exists()) { fb.style.color = 'var(--dim)'; fb.textContent = 'Already friends'; return; }
    const myNameSnap  = await db.ref(`users/${currentUser.uid}/gameName`).once('value');
    const myGameName  = myNameSnap.val() ?? currentUser.displayName ?? 'Unknown';
    const theirNameSnap = await db.ref(`users/${targetUid}/gameName`).once('value');
    const theirName   = theirNameSnap.val() ?? name;
    await db.ref(`users/${targetUid}/friendRequests/${currentUser.uid}`).set({ name: myGameName, sentAt: Date.now() });
    input.value = '';
    fb.style.color = 'var(--ok)';
    fb.textContent = `Request sent to ${theirName}!`;
    setTimeout(() => { fb.textContent = ''; }, 3000);
  } catch (_) { fb.style.color = 'var(--red)'; fb.textContent = 'Something went wrong — try again'; }
}

async function acceptFriendRequest(fromUid, fromName) {
  if (!currentUser || !db) return;
  const myNameSnap = await db.ref(`users/${currentUser.uid}/gameName`).once('value');
  const myName     = myNameSnap.val() ?? currentUser.displayName ?? 'Unknown';
  await Promise.all([
    db.ref(`users/${currentUser.uid}/friends/${fromUid}`).set({ name: fromName, addedAt: Date.now() }),
    db.ref(`users/${fromUid}/friends/${currentUser.uid}`).set({ name: myName, addedAt: Date.now() }),
    db.ref(`users/${currentUser.uid}/friendRequests/${fromUid}`).remove()
  ]);
  await loadMyFriendNames();
  await Promise.all([renderFriendsList(), renderFriendRequests()]);
}

async function declineFriendRequest(fromUid) {
  if (!currentUser || !db) return;
  await db.ref(`users/${currentUser.uid}/friendRequests/${fromUid}`).remove();
  await renderFriendRequests();
}

async function removeFriend(friendUid) {
  if (!currentUser || !db) return;
  if (!confirm('Remove this friend?')) return;
  await Promise.all([
    db.ref(`users/${currentUser.uid}/friends/${friendUid}`).remove(),
    db.ref(`users/${friendUid}/friends/${currentUser.uid}`).remove()
  ]);
  await loadMyFriendNames();
  await renderFriendsList();
}

// ============================================================
//  Toast notification
// ============================================================
let _toastTimer = null;
function showToast(msg, type = 'ok') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  clearTimeout(_toastTimer);
  toast.textContent = msg;
  if (type === 'err') {
    toast.style.background = 'rgba(192,24,43,0.96)';
    toast.style.color = '#fff';
  } else if (type === 'dim') {
    toast.style.background = '#1a1a1a';
    toast.style.color = 'var(--dim)';
  } else {
    toast.style.background = 'rgba(44,160,100,0.96)';
    toast.style.color = '#fff';
  }
  toast.style.display = 'block';
  toast.style.opacity = '1';
  _toastTimer = setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => { toast.style.display = 'none'; }, 260);
  }, 2800);
}

// ============================================================
//  In-game friend request (by game name lookup)
// ============================================================
async function addFriendInGame(playerName) {
  if (!currentUser || !db) { showToast('Sign in to add friends', 'err'); return; }
  const name = (playerName ?? '').trim();
  if (!name) return;
  showToast('Sending request…', 'dim');
  try {
    const snap = await db.ref(`usernames/${name.toLowerCase()}`).once('value');
    if (!snap.exists()) {
      showToast(`${name} isn't signed in — they can't receive requests yet`, 'err');
      return;
    }
    const targetUid = snap.val();
    if (targetUid === currentUser.uid) { showToast("That's you!", 'err'); return; }
    const alreadySnap = await db.ref(`users/${currentUser.uid}/friends/${targetUid}`).once('value');
    if (alreadySnap.exists()) { showToast(`Already friends with ${name}!`, 'ok'); return; }
    const pendSnap = await db.ref(`users/${targetUid}/friendRequests/${currentUser.uid}`).once('value');
    if (pendSnap.exists()) { showToast('Request already sent', 'dim'); return; }
    const myNameSnap = await db.ref(`users/${currentUser.uid}/gameName`).once('value');
    const myName = myNameSnap.val() ?? currentUser.displayName ?? 'Unknown';
    await db.ref(`users/${targetUid}/friendRequests/${currentUser.uid}`).set({ name: myName, sentAt: Date.now() });
    showToast(`Friend request sent to ${name}!`, 'ok');
  } catch (_) {
    showToast('Something went wrong — try again', 'err');
  }
}

// ============================================================
//  Rematch
// ============================================================
async function proposeRematch() {
  if (!roomSnap || !db) return;

  // If a rematch room was already proposed by the other player, join it instead
  const existing = roomSnap.rematchRoomId;
  if (existing) {
    const btn = document.getElementById('rematchBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Joining…'; }
    const snap = await db.ref(`rooms/${existing}`).once('value');
    if (!snap.exists() || snap.val().status !== 'waiting') {
      alert('Rematch room is no longer available — start a new game instead.');
      if (btn) { btn.disabled = false; }
      renderRematchButton();
      return;
    }
    // Detach from old room
    if (listener) roomRef.off('value', listener);
    const oldRoomRef = roomRef;
    // Switch to new room
    roomId   = existing;
    roomRef  = db.ref(`rooms/${roomId}`);
    isHost   = false;
    gameStatsWritten = false;
    const order = toArray(snap.val().playerOrder);
    if (!order.includes(me.id)) {
      await roomRef.update({
        [`players/${me.id}`]: { name: me.name, letters: '', order: order.length, out: false },
        playerOrder: [...order, me.id]
      });
    }
    roomRef.onDisconnect().update({ [`players/${me.id}/connected`]: false });
    saveSession();
    attachListener();
    goLobby();
    return;
  }

  // Create a fresh rematch room
  const btn = document.getElementById('rematchBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Creating…'; }
  const newCode = genRoomCode();
  const { word, wordMovieId } = await fetchRandomWord();
  const newRoomRef = db.ref(`rooms/${newCode}`);
  await newRoomRef.set({
    hostId: me.id, status: 'waiting',
    currentIdx: 0, currentAttempts: 0,
    lastChainItem: null,
    usedMovies: {}, usedActors: {},
    players: { [me.id]: { name: me.name, letters: '', order: 0, out: false } },
    playerOrder: [me.id],
    winner: null, log: {}, fullLog: {},
    pendingChallenge: null, challenge: null,
    reverseUsed: {}, reverseMoveActive: null,
    word, wordMovieId: wordMovieId ?? null
  });
  // Mark rematch on old room so other players see it
  await roomRef.update({ rematchRoomId: newCode });
  // Detach from old room and move to new lobby
  if (listener) roomRef.off('value', listener);
  roomId  = newCode;
  roomRef = newRoomRef;
  isHost  = true;
  gameStatsWritten = false;
  saveSession();
  attachListener();
  goLobby();
}

function renderRematchButton() {
  const btn    = document.getElementById('rematchBtn');
  const status = document.getElementById('rematchStatus');
  if (!btn) return;
  const code = roomSnap?.rematchRoomId;
  btn.disabled = false;
  if (code) {
    btn.textContent        = 'Join Rematch! →';
    btn.style.borderColor  = 'var(--ok)';
    btn.style.color        = 'var(--ok)';
    if (status) status.textContent = `Room ${code} is ready`;
  } else {
    btn.textContent        = 'Rematch →';
    btn.style.borderColor  = '';
    btn.style.color        = '';
    if (status) status.textContent = '';
  }
}

// ============================================================
//  Game invite listener (landing page)
// ============================================================
function attachGameInviteListener() {
  detachGameInviteListener();
  if (!currentUser || !db) return;
  _gameInviteRef = db.ref(`users/${currentUser.uid}/gameInvites`);
  _gameInviteListener = snap => renderGameInvites(snap.val() ?? {});
  _gameInviteRef.on('value', _gameInviteListener);
}

function detachGameInviteListener() {
  if (_gameInviteRef && _gameInviteListener) {
    _gameInviteRef.off('value', _gameInviteListener);
  }
  _gameInviteRef = null;
  _gameInviteListener = null;
  renderGameInvites({});  // clear the section
}

function renderGameInvites(invites) {
  const section = document.getElementById('gameInvitesSection');
  const list    = document.getElementById('gameInvitesList');
  if (!section || !list) return;
  const cutoff = Date.now() - 30 * 60 * 1000; // ignore invites > 30 min old
  const valid  = Object.entries(invites)
    .filter(([, v]) => v && (v.sentAt ?? 0) > cutoff)
    .sort(([, a], [, b]) => (b.sentAt ?? 0) - (a.sentAt ?? 0));
  if (!valid.length) { section.style.display = 'none'; return; }
  section.style.display = 'block';
  list.innerHTML = valid.map(([code, inv]) => `
    <div style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--bd);">
      <div style="flex:1;min-width:0;">
        <div style="font-size:0.88rem;color:var(--text);font-weight:500;">${escHtml(inv.fromName ?? '?')}</div>
        <div style="font-size:0.58rem;color:var(--dim);margin-top:2px;letter-spacing:0.06em;">invited you · Room ${escHtml(code)}</div>
      </div>
      <button data-invite-join="${escHtml(code)}"
        style="background:var(--ok);color:#fff;border:none;padding:8px 14px;font-size:0.58rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;cursor:pointer;font-family:inherit;white-space:nowrap;flex-shrink:0;">Join</button>
      <button data-invite-dismiss="${escHtml(code)}"
        style="background:none;border:1px solid var(--bd2);color:var(--dim);padding:8px 10px;font-size:0.78rem;cursor:pointer;font-family:inherit;flex-shrink:0;">✕</button>
    </div>
  `).join('');
}

async function acceptGameInvite(roomCode) {
  const name = document.getElementById('playerName').value.trim() || me.name;
  if (!name) { alert('Enter your name first — then tap Join.'); return; }
  // Remove the invite entry before joining
  if (currentUser && db) {
    await db.ref(`users/${currentUser.uid}/gameInvites/${roomCode}`).remove().catch(() => {});
  }
  joinRoom(name, roomCode);
}

async function dismissGameInvite(roomCode) {
  if (!currentUser || !db) return;
  await db.ref(`users/${currentUser.uid}/gameInvites/${roomCode}`).remove().catch(() => {});
}

// ============================================================
//  Send game invite from lobby
// ============================================================
async function renderLobbyInvites() {
  const section = document.getElementById('lobbyInviteSection');
  const list    = document.getElementById('lobbyInviteList');
  if (!section || !list || !currentUser || !db || !roomId) {
    if (section) section.style.display = 'none';
    return;
  }
  const snap    = await db.ref(`users/${currentUser.uid}/friends`).once('value');
  const friends = snap.val() ?? {};
  const entries = Object.entries(friends);
  if (!entries.length) { section.style.display = 'none'; return; }
  section.style.display = 'block';
  list.innerHTML = entries.map(([fuid, f]) => `
    <div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--bd);">
      <span style="flex:1;font-size:0.86rem;color:var(--text);">${escHtml(f.name ?? '?')}</span>
      <button data-invite-friend="${escHtml(fuid)}" data-friend-name="${escHtml(f.name ?? '?')}"
        style="background:none;border:1px solid var(--bd2);color:var(--dim);font-size:0.52rem;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;cursor:pointer;font-family:inherit;padding:5px 11px;transition:all 0.15s;"
        onmouseover="this.style.borderColor='var(--ok)';this.style.color='var(--ok)'"
        onmouseout="if(!this.dataset.sent){this.style.borderColor='var(--bd2)';this.style.color='var(--dim)'}">Invite</button>
    </div>
  `).join('');
}

async function sendGameInvite(friendUid, friendName, btnEl) {
  if (!currentUser || !db || !roomId) return;
  if (btnEl) { btnEl.disabled = true; btnEl.textContent = 'Sending…'; }
  try {
    const myNameSnap = await db.ref(`users/${currentUser.uid}/gameName`).once('value');
    const myName = myNameSnap.val() ?? me.name ?? 'Someone';
    await db.ref(`users/${friendUid}/gameInvites/${roomId}`).set({
      fromName: myName, fromUid: currentUser.uid,
      roomCode: roomId, sentAt: Date.now()
    });
    if (btnEl) {
      btnEl.dataset.sent    = '1';
      btnEl.textContent     = '✓ Invited';
      btnEl.style.color     = 'var(--ok)';
      btnEl.style.borderColor = 'var(--ok)';
    }
  } catch (_) {
    if (btnEl) { btnEl.disabled = false; btnEl.textContent = 'Invite'; }
    showToast('Could not send invite — try again', 'err');
  }
}

// ============================================================
//  Invite to game from friends list (Account page)
// ============================================================
async function inviteFromFriendsList(friendUid, friendName, btnEl) {
  if (!currentUser || !db) { showToast('Sign in to invite friends', 'err'); return; }
  if (btnEl) { btnEl.disabled = true; btnEl.textContent = 'Setting up…'; }

  try {
    // Use stored game name so it matches what the friend will see
    const myNameSnap = await db.ref(`users/${currentUser.uid}/gameName`).once('value');
    const myName = myNameSnap.val() ?? currentUser.displayName ?? 'Player';

    let targetRoomId;
    let justCreated = false;

    if (roomId && roomSnap?.status === 'waiting') {
      // Already in a waiting lobby — just send the invite for it
      targetRoomId = roomId;
    } else {
      // Not in a lobby — create one now
      const newCode = genRoomCode();
      const { word, wordMovieId } = await fetchRandomWord();
      const newRoomRef = db.ref(`rooms/${newCode}`);

      me.id   = currentUser.uid;
      me.name = myName;

      await newRoomRef.set({
        hostId: me.id, status: 'waiting',
        currentIdx: 0, currentAttempts: 0,
        lastChainItem: null,
        usedMovies: {}, usedActors: {},
        players: { [me.id]: { name: myName, letters: '', order: 0, out: false } },
        playerOrder: [me.id],
        winner: null, log: {}, fullLog: {},
        pendingChallenge: null, challenge: null,
        reverseUsed: {}, reverseMoveActive: null,
        word, wordMovieId: wordMovieId ?? null
      });

      if (listener) roomRef?.off('value', listener);
      roomId   = newCode;
      roomRef  = newRoomRef;
      isHost   = true;
      gameStatsWritten = false;
      targetRoomId = newCode;
      justCreated  = true;

      // Also set the player name input for if they navigate to landing later
      const nameInput = document.getElementById('playerName');
      if (nameInput && !nameInput.value.trim()) nameInput.value = myName;

      newRoomRef.onDisconnect().update({ [`players/${me.id}/connected`]: false });
      saveSession();
      attachListener();
    }

    // Write the invite to the friend's node
    await db.ref(`users/${friendUid}/gameInvites/${targetRoomId}`).set({
      fromName: myName, fromUid: currentUser.uid,
      roomCode: targetRoomId, sentAt: Date.now()
    });

    if (justCreated) {
      // Created a new room — move to lobby (the invite is already sent)
      showToast(`Invite sent to ${friendName} — waiting in lobby`, 'ok');
      goLobby();
    } else {
      // Already in lobby — just confirm
      if (btnEl) { btnEl.dataset.sent = '1'; btnEl.textContent = '✓ Invited'; btnEl.style.color = 'var(--ok)'; btnEl.style.borderColor = 'var(--ok)'; }
      showToast(`Invite sent to ${friendName}!`, 'ok');
    }
  } catch (e) {
    console.error(e);
    if (btnEl) { btnEl.disabled = false; btnEl.textContent = 'Invite'; }
    showToast('Could not send invite — try again', 'err');
  }
}

// ============================================================
//  Friends cache loader
// ============================================================
async function loadMyFriendNames() {
  if (!currentUser || !db) { myFriendNames = new Set(); return; }
  try {
    const snap = await db.ref(`users/${currentUser.uid}/friends`).once('value');
    const friends = snap.val() ?? {};
    myFriendNames = new Set(Object.values(friends).map(f => (f.name ?? '').toLowerCase()));
  } catch (_) { myFriendNames = new Set(); }
}

// ============================================================
//  Real-time friend request listener
// ============================================================
function attachFriendReqListener() {
  detachFriendReqListener();
  if (!currentUser || !db) return;
  _friendReqAttachTime = Date.now();
  _friendReqRef = db.ref(`users/${currentUser.uid}/friendRequests`);
  // Keep a reference to the bound handler so we can detach it precisely
  _friendReqCallback = snap => {
    if (!snap.exists()) return;
    const data = snap.val();
    // Ignore requests that were already in the database when we attached
    if ((data.sentAt ?? 0) < _friendReqAttachTime) return;
    showFriendReqPopup(snap.key, data.name ?? 'Someone');
  };
  _friendReqRef.on('child_added', _friendReqCallback);
}

function detachFriendReqListener() {
  if (_friendReqRef && _friendReqCallback) {
    _friendReqRef.off('child_added', _friendReqCallback);
  }
  _friendReqRef = null;
  _friendReqCallback = null;
}

// ============================================================
//  Friend request popup
// ============================================================
function showFriendReqPopup(fromUid, fromName) {
  _pendingFriendReq = { uid: fromUid, name: fromName };
  const popup = document.getElementById('friendReqPopup');
  const msg   = document.getElementById('friendReqPopupMsg');
  if (!popup || !msg) return;
  msg.textContent = `${fromName} sent you a friend request`;
  popup.style.display = 'flex';
}

function hideFriendReqPopup() {
  _pendingFriendReq = null;
  const popup = document.getElementById('friendReqPopup');
  if (popup) popup.style.display = 'none';
}

// ============================================================
//  Chain log modal
// ============================================================
function showChainLogModal() {
  if (!roomSnap) return;
  const modal   = document.getElementById('chainLogModal');
  const content = document.getElementById('chainLogContent');
  const counter = document.getElementById('chainLogTotalCount');
  if (!modal || !content) return;

  const fullLog    = roomSnap.fullLog ?? {};
  const currentLog = roomSnap.log     ?? {};

  // Merge: fullLog (archived rounds) then current round entries
  // Sort each set by Firebase push-key (lexicographic == chronological)
  const sortedFull    = Object.entries(fullLog).sort(([a], [b]) => a < b ? -1 : 1);
  const sortedCurrent = Object.entries(currentLog).sort(([a], [b]) => a < b ? -1 : 1);
  const allEntries    = [...sortedFull, ...sortedCurrent];

  let roundNum = 1;
  let linkCount = 0;
  let html = '';

  for (const [, entry] of allEntries) {
    if (!entry || typeof entry !== 'object') continue;

    if (entry.type === 'round-end') {
      html += `<div style="margin:10px 0 6px;padding:6px 10px;background:rgba(192,24,43,0.15);border-left:2px solid var(--red);border-radius:3px;font-size:0.7rem;color:var(--dim);">
        ✗ ${escHtml(entry.loserName ?? '?')} earned <strong style="color:#c0182b;">${escHtml(entry.letter ?? '?')}</strong> — Round ${roundNum} ends
      </div>`;
      roundNum++;
    } else {
      linkCount++;
      const isMovie = entry.type === 'movie';
      const reverseTag = entry.isReverse
        ? `<span style="font-size:0.52rem;font-weight:600;letter-spacing:0.1em;color:#c9a84c;background:rgba(201,168,76,0.12);border:1px solid rgba(201,168,76,0.3);padding:1px 5px;border-radius:2px;margin-left:4px;">🔄 REVERSE</span>`
        : '';
      const sharedNote = entry.isReverse && entry.sharedVia
        ? `<span style="font-size:0.62rem;color:var(--dim);margin-left:4px;">via ${escHtml(entry.sharedVia)}</span>`
        : '';
      html += `<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.04);flex-wrap:wrap;">
        <span style="font-size:0.6rem;color:var(--dim);min-width:22px;text-align:right;">${linkCount}</span>
        <span style="font-size:0.72rem;color:${isMovie ? 'var(--dim)' : '#c9a84c'};">${isMovie ? '🎬' : '⭐'}</span>
        <span style="font-size:0.82rem;color:var(--text);">${escHtml(entry.name ?? '?')}</span>${reverseTag}${sharedNote}
      </div>`;
    }
  }

  if (!html) {
    html = '<p style="color:var(--dim);font-size:0.82rem;padding:16px 0;text-align:center;">The chain will appear here once the game starts.</p>';
  }

  content.innerHTML = html;
  if (counter) counter.textContent = linkCount > 0 ? `${linkCount} link${linkCount !== 1 ? 's' : ''} total` : '';
  modal.style.display = 'block';

  // Scroll to bottom so latest is visible
  modal.scrollTop = modal.scrollHeight;
}

// ============================================================
//  Practice mode
// ============================================================
function enterPractice() {
  practiceChain      = [];
  practiceUsedMovies = {};
  practiceUsedActors = {};
  practiceAttempts   = 0;
  practiceLastItem   = null;
  practiceSelected   = null;
  document.getElementById('practiceChainBox').innerHTML =
    '<div style="color:var(--dim);font-size:.85rem;">The chain will appear here…</div>';
  document.getElementById('practiceChainCount').textContent = 'Chain: 0';
  document.getElementById('practiceStartPicker').style.display = 'block';
  document.getElementById('practiceMain').style.display = 'none';
  setFeedback('practiceFeedback', '', '');
  showScreen('screen-practice');
}

function beginPracticeWith(type) {
  practiceStartType = type;
  document.getElementById('practiceStartPicker').style.display = 'none';
  document.getElementById('practiceMain').style.display = 'block';
  renderPracticePrompt();
  renderPracticeDots();
  document.getElementById('practiceInput').value = '';
  document.getElementById('practiceInput').focus();
}

function practiceDirection() {
  if (!practiceLastItem) return practiceStartType;
  return practiceLastItem.type === 'actor' ? 'movie' : 'actor';
}

async function handlePracticeSubmit() {
  const input  = document.getElementById('practiceInput');
  const answer = input.value.trim();
  if (!answer) return;
  document.getElementById('practiceSubmitBtn').disabled = true;
  setFeedback('practiceFeedback', 'Checking…', '');
  input.value = '';
  const picked = practiceSelected;
  practiceSelected = null;
  clearSuggestionsEl('practiceSuggestions');
  try {
    const result = await validateAnswer(
      answer, practiceLastItem,
      practiceUsedMovies, practiceUsedActors,
      picked, practiceLastItem ? null : practiceStartType
    );
    if (result.valid) {
      if (result.type === 'movie') practiceUsedMovies[result.tmdbId] = true;
      else                         practiceUsedActors[result.tmdbId] = true;
      practiceLastItem = result;
      practiceChain.push(result);
      practiceAttempts = 0;
      setFeedback('practiceFeedback', `✓ ${result.name}`, 'ok');
      renderPracticeChain();
      renderPracticePrompt();
      renderPracticeDots();
      document.getElementById('practiceChainCount').textContent = `Chain: ${practiceChain.length}`;
      playDing();
      document.getElementById('practiceInput').focus();
    } else {
      practiceAttempts++;
      setFeedback('practiceFeedback', result.error, 'err');
      renderPracticeDots();
      if (practiceAttempts >= 3) setTimeout(endPractice, 900);
    }
  } catch (_) { setFeedback('practiceFeedback', 'Network error — try again', 'err'); }
  document.getElementById('practiceSubmitBtn').disabled = false;
}

function renderPracticeChain() {
  const el = document.getElementById('practiceChainBox');
  if (!practiceChain.length) {
    el.innerHTML = '<div style="color:var(--dim);font-size:.85rem;">The chain will appear here…</div>';
    return;
  }
  el.innerHTML = practiceChain.slice(-5).map((item, i, arr) => {
    const cur    = i === arr.length - 1;
    const actor  = item.type === 'actor';
    const img    = item.imagePath ? tmdbImg(item.imagePath) : null;
    const full   = actor && item.imagePath ? tmdbImg(item.imagePath, 'w500') : '';
    return `<div class="chain-item ${cur ? 'current' : ''}">
      ${img ? `<img class="chain-thumb ${actor ? 'round' : ''}" src="${img}" alt="${item.name}" loading="lazy"
               ${actor ? `data-fullimg="${full}" data-name="${item.name}"` : ''}>` : `<div class="chain-thumb ${actor ? 'round' : ''}"></div>`}
      <div class="chain-item-text">
        <div class="chain-item-label">${actor ? '⭐ Actor' : '🎬 Movie'}</div>
        <div class="chain-item-name">${item.name}</div>
      </div>
    </div>`;
  }).join('');
  el.querySelectorAll('.chain-thumb.round[data-fullimg]').forEach(img =>
    img.addEventListener('click', () => openLightbox(img.dataset.fullimg, img.dataset.name))
  );
}

function renderPracticePrompt() {
  const el  = document.getElementById('practicePrompt');
  const inp = document.getElementById('practiceInput');
  if (!practiceLastItem) {
    el.innerHTML    = practiceStartType === 'actor' ? 'Name any <strong>actor</strong> to start' : 'Name any <strong>movie</strong> to start';
    inp.placeholder = practiceStartType === 'actor' ? 'Actor name…' : 'Movie title…';
  } else if (practiceLastItem.type === 'movie') {
    el.innerHTML = `Name an <strong>actor</strong> from <strong>${practiceLastItem.name}</strong>`;
    inp.placeholder = 'Actor name…';
  } else {
    el.innerHTML = `Name a <strong>movie</strong> starring <strong>${practiceLastItem.name}</strong>`;
    inp.placeholder = 'Movie title…';
  }
}

function renderPracticeDots() {
  for (let i = 0; i < 3; i++) {
    document.getElementById(`pd${i}`).classList.toggle('gone', i < practiceAttempts);
  }
}

async function endPractice() {
  const score = practiceChain.length;
  document.getElementById('practiceScore').textContent  = score;
  document.getElementById('practiceChainLen').textContent = score;
  // Save best practice score for signed-in users
  let bestLabel = '';
  if (currentUser && db) {
    try {
      const snap = await db.ref(`users/${currentUser.uid}/bestPracticeChain`).once('value');
      const prev = snap.val() ?? 0;
      if (score > prev) {
        await db.ref(`users/${currentUser.uid}/bestPracticeChain`).set(score);
        bestLabel = score > 0 ? '🏆 New personal best!' : '';
      } else {
        bestLabel = prev > 0 ? `Personal best: ${prev}` : '';
      }
    } catch (_) {}
  }
  document.getElementById('practiceBestLabel').textContent = bestLabel;
  // Render chain log
  const logEl = document.getElementById('practiceChainLog');
  if (!practiceChain.length) {
    logEl.innerHTML = '<p style="font-size:0.82rem;color:var(--dim);padding:8px 0;">No links — try again!</p>';
  } else {
    logEl.innerHTML = practiceChain.map(item => {
      const actor = item.type === 'actor';
      const img   = item.imagePath ? tmdbImg(item.imagePath) : null;
      const full  = actor && item.imagePath ? tmdbImg(item.imagePath, 'w500') : '';
      return `<div class="chain-log-item">
        ${img ? `<img class="chain-log-thumb ${actor ? 'round' : ''}" src="${img}" alt="" loading="lazy"
                 ${actor ? `data-fullimg="${full}" data-name="${item.name}"` : ''}>` : `<span class="icon">${actor ? '⭐' : '🎬'}</span>`}
        <span>${item.name}</span>
      </div>`;
    }).join('');
    logEl.querySelectorAll('.chain-log-thumb.round[data-fullimg]').forEach(img =>
      img.addEventListener('click', () => openLightbox(img.dataset.fullimg, img.dataset.name))
    );
  }
  showScreen('screen-practiceOver');
}

// ============================================================
//  Event listeners
// ============================================================

// Auth — landing
document.getElementById('googleSignInBtn').addEventListener('click', signInWithGoogle);
document.getElementById('accountBtn').addEventListener('click', showAccount);
document.getElementById('landingSignOutBtn').addEventListener('click', signOutUser);

// Delegated clicks — add-friend, game invites, lobby invites
document.body.addEventListener('click', e => {
  // "+ Add friend" buttons anywhere in the game
  const addEl = e.target.closest('[data-add-friend]');
  if (addEl) { addFriendInGame(addEl.dataset.addFriend); return; }

  // Join a game invite (landing page)
  const joinEl = e.target.closest('[data-invite-join]');
  if (joinEl) { acceptGameInvite(joinEl.dataset.inviteJoin); return; }

  // Dismiss a game invite (landing page)
  const dismissEl = e.target.closest('[data-invite-dismiss]');
  if (dismissEl) { dismissGameInvite(dismissEl.dataset.inviteDismiss); return; }

  // Send invite to a friend (lobby)
  const inviteEl = e.target.closest('[data-invite-friend]');
  if (inviteEl) { sendGameInvite(inviteEl.dataset.inviteFriend, inviteEl.dataset.friendName, inviteEl); return; }
});

// Account page
document.getElementById('accountBackBtn').addEventListener('click', () => {
  showScreen('screen-landing');
  updateAuthUI(); // refresh compact display
});
document.getElementById('acctSignOutBtn').addEventListener('click', signOutUser);
document.getElementById('acctNameInput').addEventListener('change', function () {
  const fb = document.getElementById('acctNameFeedback');
  const val = this.value.trim();
  if (val) {
    saveGameName(val).then(() => {
      if (fb) { fb.style.color = 'var(--ok)'; fb.textContent = 'Name saved!'; setTimeout(() => { fb.textContent = ''; }, 2000); }
      // Update compact landing display
      const dn = document.getElementById('authDisplayName');
      if (dn) dn.textContent = val;
    }).catch(() => {
      if (fb) { fb.style.color = 'var(--red)'; fb.textContent = 'Save failed — try again'; }
    });
  } else {
    // Don't allow blank — restore saved name
    const saved = document.getElementById('authDisplayName')?.textContent || currentUser?.displayName || '';
    this.value = saved;
  }
});
document.getElementById('acctNameInput').addEventListener('keydown', function (e) {
  if (e.key === 'Enter') this.blur();
});

// Friends — account page
document.getElementById('acctAddFriendBtn').addEventListener('click', sendFriendRequest);
document.getElementById('acctAddFriendInput').addEventListener('keydown', e => { if (e.key === 'Enter') sendFriendRequest(); });

// Friend request popup
document.getElementById('friendReqPopupAccept').addEventListener('click', async () => {
  const req = _pendingFriendReq;
  hideFriendReqPopup();
  if (req) {
    await acceptFriendRequest(req.uid, req.name);
    showToast(`You and ${req.name} are now friends!`, 'ok');
  }
});
document.getElementById('friendReqPopupDismiss').addEventListener('click', hideFriendReqPopup);
document.getElementById('friendReqPopupView').addEventListener('click', () => {
  hideFriendReqPopup();
  showAccount();
});

// Chain log modal
document.getElementById('viewChainLogBtn').addEventListener('click', showChainLogModal);
document.getElementById('chainLogCloseBtn').addEventListener('click', () => {
  const modal = document.getElementById('chainLogModal');
  if (modal) modal.style.display = 'none';
});
// Also close on backdrop click
document.getElementById('chainLogModal').addEventListener('click', function (e) {
  if (e.target === this) this.style.display = 'none';
});

// Practice — landing entry
document.getElementById('practiceBtn').addEventListener('click', enterPractice);

// Practice — type picker
document.getElementById('practiceStartMovieBtn').addEventListener('click', () => beginPracticeWith('movie'));
document.getElementById('practiceStartActorBtn').addEventListener('click', () => beginPracticeWith('actor'));

// Practice — submit
document.getElementById('practiceSubmitBtn').addEventListener('click', handlePracticeSubmit);
document.getElementById('practiceInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') handlePracticeSubmit();
  if (e.key === 'Escape') clearSuggestionsEl('practiceSuggestions');
});

const debouncedPracticeSearch = debounce(q => {
  fetchSuggestionsFor(q, practiceDirection(), 'practiceSuggestions', item => {
    practiceSelected = item;
    document.getElementById('practiceInput').value = item.name;
    clearSuggestionsEl('practiceSuggestions');
  });
}, 300);

document.getElementById('practiceInput').addEventListener('input', function () {
  practiceSelected = null;
  debouncedPracticeSearch(this.value.trim());
});

// Practice — end / try again / back
document.getElementById('endPracticeBtn').addEventListener('click', () => {
  if (!practiceChain.length || confirm('End practice? Your chain progress will be lost.')) endPractice();
});
document.getElementById('practiceTryAgainBtn').addEventListener('click', enterPractice);
document.getElementById('practiceBackBtn').addEventListener('click', () => showScreen('screen-landing'));



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
document.getElementById('leaveLobbyBtn').addEventListener('click', leaveLobby);

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

// Reverse power-up
document.getElementById('reverseBtn').addEventListener('click', useReverse);

// Challenge buttons
document.getElementById('challengeBtn').addEventListener('click', issueChallenge);
document.getElementById('revokeChallengeBtn').addEventListener('click', revokeChallenge);

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
document.getElementById('rematchBtn').addEventListener('click', proposeRematch);
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
    el.innerHTML = `${quote} <span style="font-style:normal;font-size:0.65rem;letter-spacing:0.1em;color:var(--dim);">— ${film}</span>`;
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
