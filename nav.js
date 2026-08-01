// Mobile nav flyout (Ink Curtain Drawer). Header is injected via fetch() innerHTML,
// so this listens with event delegation on document instead of binding at load time.
(function () {
  function els() {
    return {
      toggle: document.getElementById('nav-toggle'),
      drawer: document.getElementById('mobile-nav-drawer'),
      backdrop: document.getElementById('nav-drawer-backdrop'),
    };
  }

  function open() {
    var e = els();
    if (!e.toggle || !e.drawer || !e.backdrop) return;
    e.drawer.classList.add('is-open');
    e.backdrop.classList.add('is-open');
    e.toggle.setAttribute('aria-expanded', 'true');
    e.drawer.setAttribute('aria-hidden', 'false');
  }

  function close() {
    var e = els();
    if (!e.toggle || !e.drawer || !e.backdrop) return;
    e.drawer.classList.remove('is-open');
    e.backdrop.classList.remove('is-open');
    e.toggle.setAttribute('aria-expanded', 'false');
    e.drawer.setAttribute('aria-hidden', 'true');
  }

  document.addEventListener('click', function (event) {
    var e = els();
    if (!e.toggle) return;
    if (event.target.closest('#nav-toggle')) {
      if (window.innerWidth <= 768) {
        e.toggle.getAttribute('aria-expanded') === 'true' ? close() : open();
      }
    } else if (event.target.closest('.top-name a')) {
      if (window.innerWidth <= 768) {
        event.preventDefault();
        e.toggle.getAttribute('aria-expanded') === 'true' ? close() : open();
      }
    } else if (event.target.closest('#nav-drawer-backdrop') || event.target.closest('.nav-drawer-link')) {
      close();
    }
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') close();
  });

  // Close the drawer if the viewport is resized past the mobile breakpoint.
  window.addEventListener('resize', function () {
    if (window.innerWidth > 768) close();
  });
})();
