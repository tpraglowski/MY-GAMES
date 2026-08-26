import { firebaseConfig } from './firebase-config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js';
import { getAuth, signInAnonymously } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js';

// Accounts are our own system, stored as Firestore documents (id = normalized
// username) — not Firebase Auth users. Every visitor also signs in anonymously so
// Firestore security rules have a stable request.auth.uid to check against; see
// firestore.rules for how uidAccount ties a device to the account it logged into.
export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);

export const authReady = signInAnonymously(auth).catch(function (err) {
  console.error('Anonimowe logowanie do Firebase nie powiodło się', err);
});

const SESSION_KEY = 'mg_session';
const normalise = (name) => name.trim().toLowerCase();
const accountDocRef = (name) => doc(db, 'accounts', normalise(name));

function bytesToHex(bytes) {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}
function hexToBytes(hex) {
  const arr = new Uint8Array(hex.length / 2);
  for (let i = 0; i < arr.length; i++) arr[i] = parseInt(hex.substr(i * 2, 2), 16);
  return arr;
}
async function hashPassword(password, saltHex) {
  const salt = saltHex ? hexToBytes(saltHex) : crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), { name: 'PBKDF2' }, false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 120000, hash: 'SHA-256' }, keyMaterial, 256);
  return { hash: bytesToHex(new Uint8Array(bits)), salt: bytesToHex(salt) };
}
async function verifyPassword(password, hash, salt) {
  const attempt = await hashPassword(password, salt);
  return attempt.hash === hash;
}

function rememberAuthUid(username) {
  const uid = auth.currentUser && auth.currentUser.uid;
  if (!uid) return;
  setDoc(doc(db, 'uidAccount', uid), { accountId: normalise(username) }).catch(function () {});
}

export function getCurrentUser() {
  return localStorage.getItem(SESSION_KEY);
}

function setSession(username) {
  localStorage.setItem(SESSION_KEY, username);
}

export function logoutUser() {
  localStorage.removeItem(SESSION_KEY);
}

export async function registerUser(username, password) {
  if (!username || !password) {
    throw new Error('Podaj nazwę użytkownika i hasło.');
  }
  await authReady;
  const ref = accountDocRef(username);
  const existing = await getDoc(ref);
  if (existing.exists()) {
    throw new Error('Ta nazwa użytkownika jest już zajęta.');
  }
  const { hash, salt } = await hashPassword(password);
  const cleanUsername = username.trim();
  await setDoc(ref, {
    username: cleanUsername,
    passwordHash: hash,
    passwordSalt: salt,
    createdAt: new Date().toISOString(),
  });
  rememberAuthUid(cleanUsername);
  setSession(cleanUsername);
}

export async function loginUser(username, password) {
  await authReady;
  const ref = accountDocRef(username);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    throw new Error('Nie znaleziono takiego użytkownika.');
  }
  const data = snap.data();
  const ok = await verifyPassword(password, data.passwordHash, data.passwordSalt);
  if (!ok) {
    throw new Error('Błędne hasło.');
  }
  rememberAuthUid(data.username);
  setSession(data.username);
}

export function renderAccountWidget() {
  const widget = document.getElementById('account-widget');
  if (!widget) return;
  const current = getCurrentUser();
  widget.innerHTML = '';
  if (current) {
    const name = document.createElement('span');
    name.className = 'account-widget__name';
    name.textContent = '👤 ' + current;

    const logoutBtn = document.createElement('button');
    logoutBtn.type = 'button';
    logoutBtn.className = 'btn btn--ghost';
    logoutBtn.textContent = 'Wyloguj';
    logoutBtn.addEventListener('click', function () {
      logoutUser();
      renderAccountWidget();
    });

    widget.append(name, logoutBtn);
  } else {
    const loginLink = document.createElement('a');
    loginLink.className = 'btn btn--accent';
    loginLink.href = 'login.html';
    loginLink.textContent = 'Zaloguj się';
    widget.append(loginLink);
  }
}

document.addEventListener('DOMContentLoaded', renderAccountWidget);
