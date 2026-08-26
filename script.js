import { getGames } from './games.js';
import './auth.js';

document.addEventListener('DOMContentLoaded', async function () {
  const grid = document.getElementById('game-grid');
  if (!grid) return;

  const searchInput = document.getElementById('game-search');
  const noResults = document.getElementById('no-results');
  const allGames = await getGames();

  function renderGames(games) {
    grid.innerHTML = '';

    const DAY_MS = 24 * 60 * 60 * 1000;

    games.forEach(function (game) {
      const card = document.createElement('a');
      card.className = 'game-card';
      card.href = 'play.html?id=' + encodeURIComponent(game.id);

      const isClaude = (game.addedBy || '').toLowerCase() === 'claude';
      const isNew = game.addedAt && (Date.now() - new Date(game.addedAt).getTime()) < DAY_MS;
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
      meta.textContent = (game.type === 'native') ? ('Autor: ' + (game.author || game.addedBy)) : ('Scratch: ' + game.scratchAuthor);

      const addedBy = document.createElement('div');
      addedBy.className = 'game-card__meta game-card__added-by';
      addedBy.textContent = '@' + game.addedBy;

      card.append(icon, title, meta, addedBy);
      grid.appendChild(card);
    });

    if (noResults) {
      noResults.hidden = games.length > 0;
    }

    const addCard = document.createElement('a');
    addCard.className = 'game-card game-card--empty';
    addCard.href = 'add-game.html';
    addCard.innerHTML = '<div class="game-card__icon"><svg class="icon" viewBox="0 0 20 20"><line x1="10" y1="4" x2="10" y2="16"/><line x1="4" y1="10" x2="16" y2="10"/></svg></div><div class="game-card__title">Dodaj nową grę</div>';
    grid.appendChild(addCard);
  }

  function filterGames(query) {
    const q = query.trim().toLowerCase();
    if (!q) return allGames;
    return allGames.filter(function (game) {
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
    searchInput.addEventListener('input', function () {
      renderGames(filterGames(searchInput.value));
    });
  }
});
