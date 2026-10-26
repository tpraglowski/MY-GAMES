import { db, authReady, getCurrentUser, getAllAccounts } from './auth.js';
import { collection, doc, addDoc, deleteDoc, updateDoc, setDoc, getDoc, getDocs, query, orderBy, where } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js';

const gamesCollection = collection(db, 'games');

export function extractScratchProjectId(url) {
  const match = url.match(/scratch\.mit\.edu\/projects\/(\d+)/i);
  return match ? match[1] : null;
}

export async function getGames() {
  await authReady;
  const snap = await getDocs(query(gamesCollection, orderBy('addedAt', 'desc')));
  return snap.docs.map(function (d) {
    return Object.assign({ id: d.id }, d.data());
  });
}

export async function getGameById(id) {
  await authReady;
  const snap = await getDoc(doc(db, 'games', id));
  return snap.exists() ? Object.assign({ id: snap.id }, snap.data()) : null;
}

const CATEGORIES = ['platformowa', 'zrecznosciowa', 'logiczna', 'wyscigi', 'strzelanka', 'sportowa', 'muzyczna', 'przygodowa', 'inne'];

export async function addGame({ title, scratchUrl, scratchAuthor, category }) {
  if (!title || !scratchUrl || !scratchAuthor) {
    throw new Error('Uzupełnij wszystkie pola.');
  }
  const projectId = extractScratchProjectId(scratchUrl);
  if (!projectId) {
    throw new Error('Podaj prawidłowy link do projektu na Scratchu, np. https://scratch.mit.edu/projects/123456789/');
  }
  const currentUser = getCurrentUser();
  if (!currentUser) {
    throw new Error('Musisz być zalogowany, żeby dodać grę.');
  }
  await authReady;
  const game = {
    title: title.trim(),
    scratchProjectId: projectId,
    scratchAuthor: scratchAuthor.trim(),
    category: CATEGORIES.includes(category) ? category : 'inne',
    addedBy: currentUser,
    addedAt: new Date().toISOString(),
  };
  const docRef = await addDoc(gamesCollection, game);
  return Object.assign({ id: docRef.id }, game);
}

export async function deleteGame(id) {
  await authReady;
  await deleteDoc(doc(db, 'games', id));
}

export { CATEGORIES };

// ---------- Leaderboard (per game) ----------

function wholeNumber(v) {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

// The game reports the logged-in player's stats; one document per game + account.
export async function submitScore(gameId, stats) {
  const user = getCurrentUser();
  if (!user || !gameId) return;
  await authReady;
  const account = user.trim().toLowerCase();
  await setDoc(doc(db, 'scores', gameId + '_' + account), {
    gameId,
    account,
    coins: wholeNumber(stats.coins),
    gems: wholeNumber(stats.gems),
    playTime: wholeNumber(stats.playTime),
    updatedAt: new Date().toISOString(),
  });
}

// Only accounts an admin has verified appear, under the nick the admin set for them.
export async function getLeaderboard(gameId) {
  await authReady;
  const [scoreSnap, accounts] = await Promise.all([
    getDocs(query(collection(db, 'scores'), where('gameId', '==', gameId))),
    getAllAccounts(),
  ]);
  const scores = new Map();
  scoreSnap.docs.forEach((d) => scores.set(d.data().account, d.data()));
  // Every verified account is listed; one that hasn't reported any stats yet shows zeros.
  const rows = [];
  accounts.forEach((acc) => {
    if (acc.verified !== true) return;
    const s = scores.get(acc.id) || {};
    rows.push({
      name: acc.displayName || acc.username || acc.id,
      coins: s.coins || 0,
      gems: s.gems || 0,
      playTime: s.playTime || 0,
    });
  });
  return rows;
}

export async function updateGameCategory(id, category) {
  if (!CATEGORIES.includes(category)) {
    throw new Error('Nieprawidłowa kategoria.');
  }
  await authReady;
  await updateDoc(doc(db, 'games', id), { category });
}
