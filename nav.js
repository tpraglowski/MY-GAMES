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

// Exposed globally so app.js (router) and auth.js (an ES module, loaded
// separately) can move the indicator without a page reload. Pass true to let
// the CSS transition animate the move (route changes); omit/false to snap
// instantly (e.g. right after the admin nav link is inserted or removed).
window.updateNavIndicator = function (animate) {
  const nav = document.getElementById('site-nav');
  const indicator = document.getElementById('nav-indicator');
  if (!nav || !indicator) return;
  const current = nav.querySelector('a.is-active');
  if (animate) {
    setIndicator(nav, indicator, current);
    return;
  }
  indicator.style.transition = 'none';
  setIndicator(nav, indicator, current);
  indicator.offsetHeight;
  indicator.style.transition = '';
};

document.addEventListener('DOMContentLoaded', function () {
  window.updateNavIndicator(false);
});
