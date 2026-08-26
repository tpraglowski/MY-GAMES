const USERS_KEY = 'mg_users';
const SESSION_KEY = 'mg_session';

async function hashPassword(password) {
  const data = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function getUsers() {
  return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

async function registerUser(username, password) {
  if (!username || !password) {
    throw new Error('Podaj nazwę użytkownika i hasło.');
  }
  const users = getUsers();
  if (users.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
    throw new Error('Ta nazwa użytkownika jest już zajęta.');
  }
  const passwordHash = await hashPassword(password);
  users.push({ username, passwordHash });
  saveUsers(users);
  localStorage.setItem(SESSION_KEY, username);
}

async function loginUser(username, password) {
  const users = getUsers();
  const user = users.find((u) => u.username.toLowerCase() === username.toLowerCase());
  if (!user) {
    throw new Error('Nie znaleziono takiego użytkownika.');
  }
  const passwordHash = await hashPassword(password);
  if (user.passwordHash !== passwordHash) {
    throw new Error('Błędne hasło.');
  }
  localStorage.setItem(SESSION_KEY, user.username);
}

function logoutUser() {
  localStorage.removeItem(SESSION_KEY);
}

function getCurrentUser() {
  return localStorage.getItem(SESSION_KEY);
}

function renderAccountWidget() {
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
