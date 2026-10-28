/* Ratib 3.6.142 — Trial homepage and sidebar presentation only. */
(function () {
  'use strict';
  const byId = id => document.getElementById(id);

  function compactBrand() {
    const label = document.querySelector('#mainWrap > header .logo > span');
    if (!label || label.dataset.ratibHeading === '142') return;
    const title = document.createElement('strong');
    title.textContent = 'راتب';
    const subtitle = document.createElement('small');
    subtitle.textContent = 'للتنظيم والتدبير المالي';
    label.replaceChildren(title, subtitle);
    label.dataset.ratibHeading = '142';
  }

  function enhanceSidebar() {
    const sidebar = byId('appSidebar');
    const nav = sidebar?.querySelector('.sidebar-nav');
    if (!nav || nav.dataset.ratibPolished === '1') return;
    nav.dataset.ratibPolished = '1';
    // Keep the approved nested menus and all original event handlers intact.
    nav.querySelectorAll(':scope > .sidebar-group > button[aria-expanded]').forEach((button, index) => {
      const children = button.nextElementSibling;
      if (children?.classList.contains('ratib-menu-children')) {
        children.id ||= 'ratib-menu-panel-142-' + index;
        button.setAttribute('aria-controls', children.id);
      }
    });
  }

  function initialize() {
    compactBrand();
    enhanceSidebar();
  }
  if (document.readyState === 'complete') initialize();
  else window.addEventListener('load', initialize, { once: true });
})();