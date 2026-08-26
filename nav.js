function setIndicator(nav, indicator, link) {
  if (!link) {
    indicator.style.opacity = '0';
    return;
  }
  const navRect = nav.getBoundingClientRect();
  const linkRect = link.getBoundingClientRect();
  indicator.style.opacity = '1';
  indicator.style.width = linkRect.width + 'px';
  indicator.style.transform = 'translateX(' + (linkRect.left - navRect.left) + 'px)';
}

// Exposed globally so auth.js (an ES module, loaded separately) can ask the
// indicator to re-measure after it inserts/removes the admin nav link.
window.updateNavIndicator = function () {
  const nav = document.getElementById('site-nav');
  const indicator = document.getElementById('nav-indicator');
  if (!nav || !indicator) return;
  const current = nav.querySelector('a.is-active');
  indicator.style.transition = 'none';
  setIndicator(nav, indicator, current);
  indicator.offsetHeight;
  indicator.style.transition = '';
};

document.addEventListener('DOMContentLoaded', function () {
  const nav = document.getElementById('site-nav');
  const indicator = document.getElementById('nav-indicator');
  if (!nav || !indicator) return;

  const NAV_KEY = 'mg_last_nav';
  const current = nav.querySelector('a.is-active');

  const previousKey = sessionStorage.getItem(NAV_KEY);
  const currentKey = current ? current.dataset.nav : '';
  const previousLink = previousKey && previousKey !== currentKey
    ? nav.querySelector('[data-nav="' + previousKey + '"]')
    : null;

  indicator.style.transition = 'none';
  setIndicator(nav, indicator, previousLink || current);
  indicator.offsetHeight;
  indicator.style.transition = '';

  if (previousLink) {
    requestAnimationFrame(function () {
      setIndicator(nav, indicator, current);
    });
  }

  sessionStorage.setItem(NAV_KEY, currentKey);
});
