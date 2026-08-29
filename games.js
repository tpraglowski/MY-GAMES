import { db, authReady, getCurrentUser } from './auth.js';
import { collection, doc, addDoc, deleteDoc, updateDoc, getDoc, getDocs, query, orderBy } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js';

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

export async function updateGameCategory(id, category) {
  if (!CATEGORIES.includes(category)) {
    throw new Error('Nieprawidłowa kategoria.');
  }
  await authReady;
  await updateDoc(doc(db, 'games', id), { category });
}
