document.addEventListener('DOMContentLoaded', function () {
  const grid = document.getElementById('game-grid');
  if (!grid) return;

  const games = getGames();
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

    card.append(icon, title, meta);
    grid.appendChild(card);
  });

  const addCard = document.createElement('a');
  addCard.className = 'game-card game-card--empty';
  addCard.href = 'add-game.html';
  addCard.innerHTML = '<div class="game-card__icon">➕</div><div class="game-card__title">Dodaj nową grę</div>';
  grid.appendChild(addCard);
});
