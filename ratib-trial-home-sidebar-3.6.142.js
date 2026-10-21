/* Ratib 3.6.142 — Trial homepage and sidebar presentation only. */
(function () {
  'use strict';
  const byId = id => document.getElementById(id);
  const foldKey = 'ratib.ui.dashboard.folded.v1';
  const getFold = () => { try { return localStorage.getItem(foldKey) === '1'; } catch (_) { return false; } };
  const saveFold = value => { try { localStorage.setItem(foldKey, value ? '1' : '0'); } catch (_) {} };

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

  function enhanceDashboard() {
    const carousel = byId('dashboardCarousel');
    const commerce = document.querySelector('#dashboardHomeContent .ratib-commerce-shortcuts');
    if (!carousel || !commerce || carousel.dataset.ratibPolished === '1') return;
    carousel.dataset.ratibPolished = '1';

    // The favorites star stays exactly at the intersection of the four navigation tiles.
    // Only reorder the already existing dashboard and commerce blocks.
    if (carousel.parentElement === commerce.parentElement) commerce.before(carousel);
    const card = byId('proDashboardCard');
    const period = card && card.querySelector('.dashboard-period');
    const kpis = card && card.querySelector('.pro-kpi-grid');
    const alerts = byId('proAlertsBox');
    const tasks = card && card.querySelector('.open-tasks-cta');
    const add = card && card.querySelector('.dashboard-add-reminder-btn');
    if (period && kpis) period.after(kpis);

    if (tasks && add) {
      const row = document.createElement('div');
      row.className = 'ratib-dashboard-task-row';
      tasks.before(row);
      row.append(tasks, add);
      add.textContent = '＋ مهمة جديدة';
      if (alerts) row.before(alerts);
    }

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.id = 'ratibDashboardFoldToggle';
    toggle.className = 'ratib-dashboard-fold-toggle';
    toggle.setAttribute('aria-controls', 'ratibDashboardFoldContent');
    toggle.innerHTML = '<span class="ratib-dashboard-fold-name"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 4v16h16M7 15l4-4 4 2 5-7"/></svg>لوحة القيادة</span><span class="ratib-dashboard-fold-net" id="ratibDashboardFoldNet"></span><svg class="ratib-dashboard-fold-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
    const foldBody = document.createElement('div');
    foldBody.id = 'ratibDashboardFoldContent';
    foldBody.className = 'ratib-dashboard-fold-content';
    const track = carousel.querySelector(':scope > .carousel-track');
    const controls = carousel.querySelector(':scope > .carousel-controls');
    carousel.prepend(toggle);
    if (track) foldBody.append(track);
    if (controls) foldBody.append(controls);
    carousel.append(foldBody);

    const net = byId('proNetKpi');
    const summary = byId('ratibDashboardFoldNet');
    const syncNet = () => {
      if (summary) summary.textContent = String(net?.textContent || '—').replace(/\s+/g, ' ').trim();
    };
    syncNet();
    if (net && window.MutationObserver) {
      new MutationObserver(syncNet).observe(net, { childList: true, characterData: true, subtree: true });
    }

    function setFold(folded, remember) {
      carousel.dataset.ratibCollapsed = String(folded);
      foldBody.hidden = folded;
      toggle.setAttribute('aria-expanded', String(!folded));
      toggle.setAttribute('aria-label', folded ? 'توسيع لوحة القيادة' : 'طي لوحة القيادة');
      if (remember) saveFold(folded);
      if (!folded && typeof window.goCarousel === 'function') window.goCarousel('dashboardCarousel', 0);
    }
    toggle.addEventListener('click', () => setFold(carousel.dataset.ratibCollapsed !== 'true', true));
    setFold(getFold(), false);
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
    enhanceDashboard();
    enhanceSidebar();
  }
  if (document.readyState === 'complete') initialize();
  else window.addEventListener('load', initialize, { once: true });
})();