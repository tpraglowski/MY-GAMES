const GAMES_KEY = 'mg_games';

function getGames() {
  return JSON.parse(localStorage.getItem(GAMES_KEY) || '[]');
}

function saveGames(games) {
  localStorage.setItem(GAMES_KEY, JSON.stringify(games));
}

function extractScratchProjectId(url) {
  const match = url.match(/scratch\.mit\.edu\/projects\/(\d+)/i);
  return match ? match[1] : null;
}

function addGame({ title, scratchUrl, scratchAuthor }) {
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

  const games = getGames();
  const game = {
    id: 'g_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8),
    title: title.trim(),
    scratchProjectId: projectId,
    scratchAuthor: scratchAuthor.trim(),
    addedBy: currentUser,
    addedAt: new Date().toISOString(),
  };
  games.push(game);
  saveGames(games);
  return game;
}

function getGameById(id) {
  return getGames().find((g) => g.id === id);
}
