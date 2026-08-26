// Lista gier będzie dodawana tutaj w miarę ich powstawania.
const games = [];

const grid = document.getElementById('game-grid');

if (games.length > 0) {
  grid.innerHTML = games
    .map(
      (game) => `
      <a class="game-card" href="${game.url}">
        <div class="game-card__icon">${game.icon}</div>
        <div class="game-card__title">${game.title}</div>
      </a>`
    )
    .join('');
}
