import { db, storage, authReady, getCurrentUser } from './auth.js';
import { collection, doc, addDoc, deleteDoc, getDoc, getDocs, query, orderBy } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-storage.js';

const gamesCollection = collection(db, 'games');
const MAX_FILE_BYTES = 15 * 1024 * 1024;

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

export async function addGame({ title, scratchUrl, scratchAuthor }) {
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
    addedBy: currentUser,
    addedAt: new Date().toISOString(),
  };
  const docRef = await addDoc(gamesCollection, game);
  return Object.assign({ id: docRef.id }, game);
}

export async function addFileGame({ title, file, author }) {
  if (!title || !file || !author) {
    throw new Error('Uzupełnij wszystkie pola.');
  }
  if (!/\.sb3$/i.test(file.name)) {
    throw new Error('Plik gry musi być w formacie .sb3 (eksport ze Scratcha: Plik → Zapisz na komputerze).');
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new Error('Plik jest za duży — limit to 15 MB.');
  }
  const currentUser = getCurrentUser();
  if (!currentUser) {
    throw new Error('Musisz być zalogowany, żeby dodać grę.');
  }
  await authReady;

  const storagePath = 'games/' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8) + '.sb3';
  const fileRef = ref(storage, storagePath);
  await uploadBytes(fileRef, file, { contentType: 'application/octet-stream' });
  const downloadUrl = await getDownloadURL(fileRef);

  const game = {
    title: title.trim(),
    type: 'sb3',
    path: downloadUrl,
    storagePath: storagePath,
    author: author.trim(),
    addedBy: currentUser,
    addedAt: new Date().toISOString(),
  };
  const docRef = await addDoc(gamesCollection, game);
  return Object.assign({ id: docRef.id }, game);
}

export async function deleteGame(id) {
  await authReady;
  const snap = await getDoc(doc(db, 'games', id));
  const data = snap.exists() ? snap.data() : null;
  await deleteDoc(doc(db, 'games', id));
  if (data && data.storagePath) {
    deleteObject(ref(storage, data.storagePath)).catch(function () {});
  }
}
