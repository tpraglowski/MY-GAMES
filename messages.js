import { db, authReady, getCurrentUser } from './auth.js';
import { collection, doc, addDoc, updateDoc, getDocs, query, where } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js';

// Messages from players (bug reports, ideas, ...) shown under a game. Anyone can
// send one; only admins can read them and mark them as read (see firestore.rules).
const messagesCollection = collection(db, 'messages');

export const MAX_MESSAGE_LENGTH = 2000;
export const GUEST_NAME = 'gość';

export async function sendMessage({ gameId, gameTitle, text }) {
  const clean = (text || '').trim();
  if (!clean) throw new Error('Napisz coś przed wysłaniem.');
  if (clean.length > MAX_MESSAGE_LENGTH) {
    throw new Error('Wiadomość jest za długa (max ' + MAX_MESSAGE_LENGTH + ' znaków).');
  }
  await authReady;
  const message = {
    gameId: gameId || '',
    gameTitle: gameTitle || '',
    text: clean,
    from: getCurrentUser() || GUEST_NAME,
    read: false,
    createdAt: new Date().toISOString(),
  };
  const ref = await addDoc(messagesCollection, message);
  return Object.assign({ id: ref.id }, message);
}

// Unread messages, oldest first. With a gameId only that game's messages; without
// one, everything (used by the admin panel). Equality filters only, so no
// composite index is needed — sorting happens here.
export async function getUnreadMessages(gameId) {
  await authReady;
  const q = gameId
    ? query(messagesCollection, where('read', '==', false), where('gameId', '==', gameId))
    : query(messagesCollection, where('read', '==', false));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => Object.assign({ id: d.id }, d.data()))
    .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
}

export async function markMessageRead(id) {
  await authReady;
  await updateDoc(doc(db, 'messages', id), {
    read: true,
    readBy: getCurrentUser() || '',
    readAt: new Date().toISOString(),
  });
}
