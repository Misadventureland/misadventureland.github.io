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

const TMDB_KEY  = '7ae222abae7a3ddc86b2deb7e8542a4a';
const TMDB_BASE = 'https://api.themoviedb.org/3';
const WORD      = 'MOVIE';

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
        sub: (p.known_for ?? []).map(m => m.title || m.name).filter(Boolean).slice(0, 2).join(', ')
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
  return (!last || last.type === 'actor') ? 'movie' : 'actor';
}

// Determine search direction for challenge input based on challenge state
function challengeDirection() {
  return roomSnap?.challenge?.answerType === 'movie' ? 'actor' : 'movie';
}

// ============================================================
//  Answer validation (main game)
// ============================================================
async function validateAnswer(input, lastItem, usedMovies, usedActors, preSelected = null) {
  if (!lastItem) {
    const movie = preSelected
      ? { id: preSelected.tmdbId, title: preSelected.name, poster_path: preSelected.imagePath }
      : await searchMovie(input);
    if (!movie) return { valid: false, error: `Can't find a movie called "${input}"` };
    if (usedMovies?.[movie.id]) return { valid: false, error: `"${movie.title}" was already used` };
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
  me.id  = uid();
  me.name = name;
  roomId = genRoomCode();
  isHost = true;
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

  me.id  = uid();
  me.name = name;
  roomId = code;
  isHost = false;
  roomRef = db.ref(`rooms/${roomId}`);

  await roomRef.update({
    [`players/${me.id}`]: { name, letters: '', order: order.length, out: false },
    playerOrder: [...order, me.id]
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
    return `<li style="${pid === me.id ? 'color:#c9a227' : ''}">
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

  const order     = toArray(roomSnap.playerOrder);
  const players   = roomSnap.players ?? {};
  const curPid    = order[roomSnap.currentIdx];
  const curPlayer = players[curPid] ?? {};
  const challenge = roomSnap.challenge ?? null;
  const pending   = roomSnap.pendingChallenge ?? null;
  const myData    = players[me.id] ?? {};

  document.getElementById('turnName').textContent = curPlayer.name ?? '?';
  renderChain();
  renderScores(order, players, curPid);
  renderChallengeUI(challenge, pending, players, myData);

  // If a challenge is active, hide normal turn input for everyone
  if (challenge) {
    document.getElementById('activeInput').style.display  = 'none';
    document.getElementById('waitingPanel').style.display = 'none';
    return;
  }

  // Normal turn logic
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
    document.getElementById('answerInput').focus();
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
        `<strong style="color:#c9a227">${challenger}</strong> challenged <strong style="color:#c9a227">${challenged}</strong> — waiting for response…`;
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
    return `<div class="chain-item ${cur ? 'current' : ''}">
      ${img ? `<img class="chain-thumb ${actor ? 'round' : ''}" src="${img}" alt="${item.name}" loading="lazy">`
            : `<div class="chain-thumb ${actor ? 'round' : ''}"></div>`}
      <div class="chain-item-text">
        <div class="chain-item-label">${actor ? '⭐ Actor' : '🎬 Movie'}</div>
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
    el.innerHTML    = 'Name any <strong>movie</strong> to start the chain';
    inp.placeholder = 'Movie title…';
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
    const result = await validateAnswer(answer, roomSnap.lastChainItem, roomSnap.usedMovies, roomSnap.usedActors, picked);
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
    challenge:        null   // clear any stale challenge
  });
}

async function handleFailure() {
  const attempts = (roomSnap.currentAttempts ?? 0) + 1;
  if (attempts < 3) { await roomRef.update({ currentAttempts: attempts }); return; }
  await assignLetterAndPass(me.id);
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
      await resolveChallenge(challenge.challengerId);
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

async function resolveChallenge(loserPid) {
  // loserPid gets a letter; then clear the challenge and continue the game
  await roomRef.update({ challenge: null, pendingChallenge: null });
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
    currentAttempts: 0,
    challenge:        null,
    pendingChallenge: null
  };

  if (stillIn.length <= 1) {
    updates.status = 'finished';
    updates.winner = stillIn[0] ?? null;
  } else {
    // If the loser was the current player, advance the turn
    const curPid = order[roomSnap.currentIdx];
    if (curPid === pid || isOut) {
      updates.currentIdx = nextActiveIndex(roomSnap.currentIdx, updatedPlayers);
    }
  }

  await roomRef.update(updates);
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
  listener = null; roomSnap = null;
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

  document.getElementById('winnerName').textContent = players[winnerId]?.name ?? 'Nobody';

  document.getElementById('finalScores').innerHTML = order.map(pid => {
    const p = players[pid] ?? {};
    const w = pid === winnerId;
    return `<div class="score-row">
      <span style="color:${w ? '#c9a227' : '#aaa'}">${p.name ?? '?'}${w ? ' 🏆' : ''}</span>
      <span style="color:#d45c5c;letter-spacing:.12em">${p.letters || '—'}</span>
    </div>`;
  }).join('');

  const entries = Object.values(roomSnap.log ?? {});
  document.getElementById('chainLen').textContent = entries.length;
  document.getElementById('finalChain').innerHTML = entries.map(item => {
    const actor = item.type === 'actor';
    const img   = item.imagePath ? tmdbImg(item.imagePath) : null;
    return `<div class="chain-log-item">
      ${img ? `<img class="chain-log-thumb ${actor ? 'round' : ''}" src="${img}" alt="" loading="lazy">`
            : `<span class="icon">${actor ? '⭐' : '🎬'}</span>`}
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
  if (!confirm('Give up your turn? You\'ll receive a letter.')) return;
  await assignLetterAndPass(me.id);
});

document.getElementById('leaveBtn').addEventListener('click', () => {
  if (!confirm('Leave the game? You\'ll be eliminated.')) return;
  leaveGame();
});

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
  setFeedback('feedback', '', '');
  document.getElementById('playerName').value = me.name ?? '';
  showScreen('screen-landing');
});

// ============================================================
//  Auto-fill room code from invite link (?room=XXXX)
// ============================================================
window.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const invite = params.get('room');
  if (invite && /^[A-Z0-9]{4}$/i.test(invite)) {
    const codeEl = document.getElementById('joinCode');
    codeEl.value = invite.toUpperCase();
    // Highlight the join section so they notice it's pre-filled
    codeEl.style.borderColor = '#c9a227';
    document.getElementById('joinCode').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
});
