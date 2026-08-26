const THEME_KEY = 'themeMode';

function getThemeMode() {
  return localStorage.getItem(THEME_KEY) || 'auto';
}

function applyThemeMode(mode) {
  if (mode === 'auto') {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', mode);
  }
}

function setThemeMode(mode) {
  localStorage.setItem(THEME_KEY, mode);
  applyThemeMode(mode);
  renderThemeOptions();
}

function renderThemeOptions() {
  const options = document.querySelectorAll('.theme-option');
  if (!options.length) return;
  const current = getThemeMode();
  options.forEach((btn) => {
    btn.classList.toggle('is-active', btn.dataset.themeMode === current);
  });
}

document.addEventListener('DOMContentLoaded', function () {
  applyThemeMode(getThemeMode());
  renderThemeOptions();
  document.querySelectorAll('.theme-option').forEach((btn) => {
    btn.addEventListener('click', function () {
      setThemeMode(btn.dataset.themeMode);
    });
  });
});
