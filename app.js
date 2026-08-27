import {
  getCurrentUser,
  registerUser,
  loginUser,
  refreshHeader,
  isCurrentUserAdmin,
  getAllAccounts,
  setAccountAdmin,
  deleteAccount,
} from './auth.js';
import { getGames, getGameById, addGame, addFileGame, deleteGame } from './games.js';

const VIEWS = ['games', 'login', 'settings', 'add-game', 'play', 'admin'];
const TITLES = {
  games: 'My Games',
  login: 'Logowanie - My Games',
  settings: 'Ustawienia - My Games',
  'add-game': 'Dodaj grę - My Games',
  play: 'Graj - My Games',
  admin: 'Panel administratora - My Games',
};

function parseHash() {
  const raw = location.hash.replace(/^#\/?/, '');
  const parts = raw.split('/').filter(Boolean);
  let name = parts[0] || 'games';
  if (!VIEWS.includes(name)) name = 'games';
  return { name, param: parts[1] };
}

function markActiveNav(name) {
  const nav = document.getElementById('site-nav');
  if (!nav) return;
  nav.querySelectorAll('a[data-nav]').forEach((a) => {
    a.classList.toggle('is-active', a.dataset.nav === name);
  });
}
window.markActiveNav = () => markActiveNav(parseHash().name);

function showView(name) {
  VIEWS.forEach((v) => {
    const el = document.getElementById('view-' + v);
    if (el) el.hidden = v !== name;
  });
  document.title = TITLES[name] || 'My Games';
  markActiveNav(name);
  if (window.updateNavIndicator) window.updateNavIndicator(true);
}

async function route() {
  const { name, param } = parseHash();
  showView(name);
  if (name === 'games') await initGamesView();
  else if (name === 'login') initLoginView();
  else if (name === 'add-game') initAddGameView();
  else if (name === 'play') await initPlayView(param);
  else if (name === 'admin') await initAdminView();
}

window.addEventListener('hashchange', route);
document.addEventListener('DOMContentLoaded', route);
// Lets auth.js re-run the current view's init (e.g. after logout, so an
// admin-only or login-required view immediately reflects the new state).
window.rerunRoute = route;

// ---------- Games list ----------

async function initGamesView() {
  const grid = document.getElementById('game-grid');
  if (!grid) return;

  const searchInput = document.getElementById('game-search');
  const noResults = document.getElementById('no-results');
  const allGames = await getGames();
  const DAY_MS = 24 * 60 * 60 * 1000;

  function renderGames(games) {
    grid.innerHTML = '';

    games.forEach((game) => {
      const card = document.createElement('a');
      card.className = 'game-card';
      card.href = '#/play/' + encodeURIComponent(game.id);

      const isClaude = (game.addedBy || '').toLowerCase() === 'claude';
      const isNew = game.addedAt && Date.now() - new Date(game.addedAt).getTime() < DAY_MS;
      if (isClaude) {
        card.classList.add('game-card--claude');
      } else if (isNew) {
        card.classList.add('game-card--new');
        const badge = document.createElement('span');
        badge.className = 'game-card__badge';
        badge.textContent = 'Nowy';
        card.appendChild(badge);
      }

      const icon = document.createElement('div');
      icon.className = 'game-card__icon';
      icon.innerHTML = '<svg class="icon" viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="10" rx="5"/><line x1="7" y1="10" x2="7" y2="14"/><line x1="5" y1="12" x2="9" y2="12"/><circle cx="15" cy="10.5" r="1"/><circle cx="17.5" cy="13" r="1"/></svg>';

      const title = document.createElement('div');
      title.className = 'game-card__title';
      title.textContent = game.title;

      const meta = document.createElement('div');
      meta.className = 'game-card__meta';
      meta.textContent = game.type ? 'Autor: ' + (game.author || game.addedBy) : 'Scratch: ' + game.scratchAuthor;

      const addedBy = document.createElement('div');
      addedBy.className = 'game-card__meta game-card__added-by';
      addedBy.textContent = '@' + game.addedBy;

      card.append(icon, title, meta, addedBy);
      grid.appendChild(card);
    });

    if (noResults) noResults.hidden = games.length > 0;

    const addCard = document.createElement('a');
    addCard.className = 'game-card game-card--empty';
    addCard.href = '#/add-game';
    addCard.innerHTML = '<div class="game-card__icon"><svg class="icon" viewBox="0 0 20 20"><line x1="10" y1="4" x2="10" y2="16"/><line x1="4" y1="10" x2="16" y2="10"/></svg></div><div class="game-card__title">Dodaj nową grę</div>';
    grid.appendChild(addCard);
  }

  function filterGames(query) {
    const q = query.trim().toLowerCase();
    if (!q) return allGames;
    return allGames.filter((game) => {
      const authorText = (game.scratchAuthor || game.author || '').toLowerCase();
      return (
        game.title.toLowerCase().includes(q) ||
        authorText.includes(q) ||
        game.addedBy.toLowerCase().includes(q)
      );
    });
  }

  renderGames(allGames);
  if (searchInput) {
    searchInput.value = '';
    searchInput.oninput = () => renderGames(filterGames(searchInput.value));
  }
}

// ---------- Login / register ----------

function initLoginView() {
  const tabs = document.querySelectorAll('#view-login .auth-tab');
  const container = document.getElementById('auth-form-container');
  const errorEl = document.getElementById('auth-error');
  const loginTemplate = document.getElementById('login-template');
  const registerTemplate = document.getElementById('register-template');

  function showError(message) {
    errorEl.textContent = message;
    errorEl.hidden = false;
  }

  function renderForm(which) {
    errorEl.hidden = true;
    container.innerHTML = '';
    const template = which === 'login' ? loginTemplate : registerTemplate;
    container.appendChild(template.content.cloneNode(true));

    const form = container.querySelector('form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = new FormData(form);
      const username = data.get('username').trim();
      const password = data.get('password');
      const action = which === 'login' ? loginUser : registerUser;
      action(username, password)
        .then(async () => {
          await refreshHeader();
          location.hash = '/';
        })
        .catch((err) => showError(err.message));
    });
  }

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('is-active'));
      tab.classList.add('is-active');
      renderForm(tab.dataset.tab);
    });
  });

  renderForm('login');
}

// ---------- Add game ----------

function initAddGameView() {
  const modeTabsWrap = document.getElementById('add-game-mode-tabs');
  const modeTabs = modeTabsWrap.querySelectorAll('.auth-tab');
  const scratchForm = document.getElementById('add-game-form-scratch');
  const fileForm = document.getElementById('add-game-form-file');
  const errorEl = document.getElementById('add-game-error');
  const loginRequired = document.getElementById('login-required');

  scratchForm.reset();
  fileForm.reset();
  errorEl.hidden = true;

  const loggedIn = !!getCurrentUser();
  loginRequired.hidden = loggedIn;
  modeTabsWrap.hidden = !loggedIn;

  function setMode(mode) {
    modeTabs.forEach((t) => t.classList.toggle('is-active', t.dataset.mode === mode));
    scratchForm.hidden = !loggedIn || mode !== 'scratch';
    fileForm.hidden = !loggedIn || mode !== 'file';
  }
  modeTabs.forEach((t) => {
    t.onclick = () => setMode(t.dataset.mode);
  });
  setMode('scratch');

  scratchForm.onsubmit = async (e) => {
    e.preventDefault();
    const data = new FormData(scratchForm);
    try {
      const game = await addGame({
        title: data.get('title'),
        scratchUrl: data.get('scratchUrl'),
        scratchAuthor: data.get('scratchAuthor'),
      });
      location.hash = '/play/' + encodeURIComponent(game.id);
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.hidden = false;
    }
  };

  fileForm.onsubmit = async (e) => {
    e.preventDefault();
    const data = new FormData(fileForm);
    const submitBtn = fileForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    try {
      const game = await addFileGame({
        title: data.get('title'),
        file: data.get('file'),
        author: data.get('author'),
      });
      location.hash = '/play/' + encodeURIComponent(game.id);
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.hidden = false;
    } finally {
      submitBtn.disabled = false;
    }
  };
}

// ---------- Play ----------

async function initPlayView(gameId) {
  const page = document.getElementById('view-play');
  page.innerHTML = '';
  const game = gameId ? await getGameById(gameId) : null;

  if (!game) {
    page.innerHTML =
      '<div class="form-card">' +
      '<h1>Nie znaleziono gry</h1>' +
      '<p class="settings-hint">Ta gra nie istnieje albo została usunięta.</p>' +
      '<a class="btn btn--accent" href="#/">Wróć do listy gier</a>' +
      '</div>';
    return;
  }

  const isScratch = !game.type; // legacy docs never had a `type` field
  const isNonScratch = !isScratch; // 'native' (dev-added) or 'sb3' (uploaded)

  const titleEl = document.createElement('h1');
  titleEl.textContent = game.title;

  const metaEl = document.createElement('p');
  metaEl.className = 'play-meta';
  metaEl.textContent = isNonScratch
    ? 'Autor: ' + (game.author || game.addedBy) + ' · Dodał: @' + game.addedBy
    : 'Autor na Scratchu: ' + game.scratchAuthor + ' · Dodał: @' + game.addedBy;

  const frameWrap = document.createElement('div');
  frameWrap.className = 'scratch-embed' + (isNonScratch ? ' scratch-embed--native' : '');

  const iframe = document.createElement('iframe');
  if (game.type === 'sb3') {
    iframe.src = 'games/sb3-player/index.html?url=' + encodeURIComponent(game.path);
  } else if (game.type === 'native') {
    iframe.src = game.path;
  } else {
    iframe.src = 'https://scratch.mit.edu/projects/' + encodeURIComponent(game.scratchProjectId) + '/embed';
  }
  iframe.allowFullscreen = true;
  frameWrap.appendChild(iframe);

  const actions = document.createElement('div');
  actions.className = 'play-actions';

  const backLink = document.createElement('a');
  backLink.className = 'btn btn--ghost play-back';
  backLink.href = '#/';
  backLink.textContent = '← Wróć do listy gier';

  const fullscreenBtn = document.createElement('button');
  fullscreenBtn.type = 'button';
  fullscreenBtn.className = 'btn btn--accent';
  fullscreenBtn.innerHTML = '<svg class="icon" viewBox="0 0 20 20"><path d="M3 8V4a1 1 0 0 1 1-1h4"/><path d="M17 8V4a1 1 0 0 0-1-1h-4"/><path d="M3 12v4a1 1 0 0 0 1 1h4"/><path d="M17 12v4a1 1 0 0 1-1 1h-4"/></svg> Pełny ekran';
  fullscreenBtn.addEventListener('click', () => {
    if (frameWrap.requestFullscreen) frameWrap.requestFullscreen();
    else if (frameWrap.webkitRequestFullscreen) frameWrap.webkitRequestFullscreen();
  });

  actions.append(backLink, fullscreenBtn);

  const currentUser = getCurrentUser();
  const canDelete = currentUser === game.addedBy || (await isCurrentUserAdmin());
  if (canDelete) {
    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'btn btn--danger';
    deleteBtn.innerHTML = '<svg class="icon" viewBox="0 0 20 20"><path d="M4 6h12"/><path d="M8 6V4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2"/><path d="M5.5 6l.7 9.5a1 1 0 0 0 1 .9h5.6a1 1 0 0 0 1-.9L15 6"/><line x1="8.5" y1="9" x2="8.5" y2="13.5"/><line x1="11.5" y1="9" x2="11.5" y2="13.5"/></svg> Usuń grę';
    deleteBtn.addEventListener('click', async () => {
      if (!confirm('Na pewno usunąć grę „' + game.title + '”?')) return;
      deleteBtn.disabled = true;
      await deleteGame(gameId);
      location.hash = '/';
    });
    actions.append(deleteBtn);
  }

  page.append(titleEl, metaEl, frameWrap, actions);
}

// ---------- Admin ----------

async function initAdminView() {
  const deniedEl = document.getElementById('admin-denied');
  const sectionEl = document.getElementById('accounts-section');
  const listEl = document.getElementById('accounts-list');
  const HARDCODED_ADMIN = 'tpraglowski';

  function renderAccounts(accounts) {
    const myUsername = (getCurrentUser() || '').trim().toLowerCase();
    listEl.innerHTML = '';
    accounts
      .slice()
      .sort((a, b) => a.username.localeCompare(b.username))
      .forEach((acc) => {
        const isHardcodedAdmin = acc.id === HARDCODED_ADMIN;
        const isAdminAcc = isHardcodedAdmin || acc.admin === true;
        const isSelf = acc.id === myUsername;

        const row = document.createElement('div');
        row.className = 'account-row';

        const name = document.createElement('span');
        name.className = 'account-row__name';
        name.textContent = acc.username;

        const badge = document.createElement('span');
        badge.className = 'account-row__badge' + (isAdminAcc ? ' account-row__badge--admin' : '');
        badge.textContent = isHardcodedAdmin ? 'Administrator (główny)' : isAdminAcc ? 'Administrator' : 'Użytkownik';

        row.append(name, badge);

        if (!isHardcodedAdmin) {
          const toggleBtn = document.createElement('button');
          toggleBtn.type = 'button';
          toggleBtn.className = 'btn btn--ghost';
          toggleBtn.textContent = isAdminAcc ? 'Odbierz administratora' : 'Nadaj administratora';
          toggleBtn.addEventListener('click', async () => {
            toggleBtn.disabled = true;
            await setAccountAdmin(acc.id, !isAdminAcc);
            acc.admin = !isAdminAcc;
            renderAccounts(accounts);
          });
          row.append(toggleBtn);
        }

        if (!isHardcodedAdmin && !isSelf) {
          const deleteBtn = document.createElement('button');
          deleteBtn.type = 'button';
          deleteBtn.className = 'btn btn--danger';
          deleteBtn.innerHTML = '<svg class="icon" viewBox="0 0 20 20"><path d="M4 6h12"/><path d="M8 6V4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2"/><path d="M5.5 6l.7 9.5a1 1 0 0 0 1 .9h5.6a1 1 0 0 0 1-.9L15 6"/><line x1="8.5" y1="9" x2="8.5" y2="13.5"/><line x1="11.5" y1="9" x2="11.5" y2="13.5"/></svg> Usuń konto';
          deleteBtn.addEventListener('click', async () => {
            if (!confirm('Na pewno usunąć konto „' + acc.username + '”?')) return;
            deleteBtn.disabled = true;
            await deleteAccount(acc.id);
            const idx = accounts.indexOf(acc);
            if (idx !== -1) accounts.splice(idx, 1);
            renderAccounts(accounts);
          });
          row.append(deleteBtn);
        }

        listEl.appendChild(row);
      });
  }

  const admin = await isCurrentUserAdmin();
  deniedEl.hidden = admin;
  sectionEl.hidden = !admin;
  if (admin) {
    const accounts = await getAllAccounts();
    renderAccounts(accounts);
  }
}
