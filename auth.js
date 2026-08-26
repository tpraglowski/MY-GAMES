import { firebaseConfig } from './firebase-config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js';
import { getAuth, signInAnonymously } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js';
import { getFirestore, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, collection } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js';

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
// Bootstrap admin: always treated as admin regardless of its Firestore doc, so the
// very first admin account doesn't need anyone with existing admin rights to grant
// it (see firestore.rules — the same username is hardcoded there for consistency).
const HARDCODED_ADMIN = 'tpraglowski';
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

export async function isCurrentUserAdmin() {
  const current = getCurrentUser();
  if (!current) return false;
  if (normalise(current) === HARDCODED_ADMIN) return true;
  await authReady;
  const snap = await getDoc(accountDocRef(current));
  return snap.exists() && snap.data().admin === true;
}

export async function getAllAccounts() {
  await authReady;
  const snap = await getDocs(collection(db, 'accounts'));
  return snap.docs.map(function (d) {
    return Object.assign({ id: d.id }, d.data());
  });
}

export async function setAccountAdmin(accountId, isAdmin) {
  await authReady;
  await updateDoc(doc(db, 'accounts', accountId), { admin: isAdmin });
}

export async function deleteAccount(accountId) {
  await authReady;
  await deleteDoc(doc(db, 'accounts', accountId));
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
    name.innerHTML = '<svg class="icon" viewBox="0 0 20 20"><circle cx="10" cy="6.5" r="3.2"/><path d="M4 17c0-3.3 2.7-6 6-6s6 2.7 6 6"/></svg> ';
    name.append(current);

    const logoutBtn = document.createElement('button');
    logoutBtn.type = 'button';
    logoutBtn.className = 'btn btn--ghost';
    logoutBtn.textContent = 'Wyloguj';
    logoutBtn.addEventListener('click', function () {
      logoutUser();
      refreshHeader();
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

export async function refreshHeader() {
  renderAccountWidget();

  const nav = document.getElementById('site-nav');
  if (!nav) return;
  const existingAdminLink = nav.querySelector('[data-nav="admin"]');
  const admin = await isCurrentUserAdmin();

  if (admin && !existingAdminLink) {
    const link = document.createElement('a');
    link.href = 'admin.html';
    link.dataset.nav = 'admin';
    link.innerHTML = '<svg class="icon" viewBox="0 0 20 20"><path d="M10 2.5l6 2.2v4.6c0 4-2.6 6.8-6 8.2-3.4-1.4-6-4.2-6-8.2V4.7z"/><path d="M7.3 10l1.8 1.8 3.6-3.8"/></svg> Panel administratora';
    if (location.pathname.endsWith('admin.html')) link.classList.add('is-active');
    nav.appendChild(link);
  } else if (!admin && existingAdminLink) {
    existingAdminLink.remove();
  }

  if (window.updateNavIndicator) window.updateNavIndicator();
}

document.addEventListener('DOMContentLoaded', refreshHeader);
