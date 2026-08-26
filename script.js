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

    games.forEach(function (game) {
      const card = document.createElement('a');
      card.className = 'game-card';
      card.href = 'play.html?id=' + encodeURIComponent(game.id);

      const icon = document.createElement('div');
      icon.className = 'game-card__icon';
      icon.textContent = '🕹️';

      const title = document.createElement('div');
      title.className = 'game-card__title';
      title.textContent = game.title;

      const meta = document.createElement('div');
      meta.className = 'game-card__meta';
      meta.textContent = 'Scratch: ' + game.scratchAuthor;

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
    addCard.innerHTML = '<div class="game-card__icon">➕</div><div class="game-card__title">Dodaj nową grę</div>';
    grid.appendChild(addCard);
  }

  function filterGames(query) {
    const q = query.trim().toLowerCase();
    if (!q) return allGames;
    return allGames.filter(function (game) {
      return (
        game.title.toLowerCase().includes(q) ||
        game.scratchAuthor.toLowerCase().includes(q) ||
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
