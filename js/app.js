(async function bootstrap() {
  Utils.$('#year').textContent = new Date().getFullYear();
  Theme.init();
  await DB.init();

  /* ---------- LOGIN ---------- */
  Utils.$('#login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = Utils.$('#login-error');
    err.hidden = true;
    try {
      const u = Utils.$('#login-user').value;
      const p = Utils.$('#login-pass').value;
      const r = Utils.$('#login-role').value;
      const user = await Auth.login(u, p, r);
      enterApp(user);
    } catch (ex) {
      err.textContent = ex.message;
      err.hidden = false;
    }
  });

  Utils.$('#logout-btn').addEventListener('click', async () => {
    await Auth.logout();
    location.reload();
  });

  /* ---------- SIDEBAR CONTROLS ---------- */
  const appScreen   = Utils.$('#app-screen');
  const sidebar     = Utils.$('#sidebar');
  const overlay     = Utils.$('#sidebar-overlay');
  const menuToggle  = Utils.$('#menu-toggle');
  const closeBtn    = Utils.$('#sidebar-close');
  const collapseBtn = Utils.$('#sidebar-collapse-btn');

  function isMobile() { return window.innerWidth <= 960; }

  function openSidebar() {
    sidebar.classList.add('open');
    overlay.classList.add('visible');
    document.body.style.overflow = 'hidden';
  }

  function closeSidebar() {
    sidebar.classList.remove('open');
    overlay.classList.remove('visible');
    document.body.style.overflow = '';
  }

  function toggleCollapse() {
    const collapsed = appScreen.classList.toggle('sidebar-collapsed');
    collapseBtn.textContent = collapsed ? '▶' : '◀';
    localStorage.setItem('musikales_sidebar', collapsed ? 'collapsed' : 'expanded');
  }

  menuToggle.addEventListener('click', () => {
    if (isMobile()) {
      sidebar.classList.contains('open') ? closeSidebar() : openSidebar();
    }
  });

  closeBtn.addEventListener('click', closeSidebar);
  overlay.addEventListener('click', closeSidebar);

  if (collapseBtn) {
    collapseBtn.addEventListener('click', toggleCollapse);
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isMobile() && sidebar.classList.contains('open')) {
      closeSidebar();
    }
  });

  const savedState = localStorage.getItem('musikales_sidebar');
  if (savedState === 'collapsed' && !isMobile()) {
    appScreen.classList.add('sidebar-collapsed');
    if (collapseBtn) collapseBtn.textContent = '▶';
  }

  window.addEventListener('resize', () => {
    if (!isMobile()) closeSidebar();
  });

  window.closeSidebar = closeSidebar;

  /* ---------- AUTO-LOGIN ---------- */
  const session = await Auth.current();
  if (session) enterApp(session);
})();

function enterApp(user) {
  Utils.$('#login-screen').classList.remove('active');
  Utils.$('#app-screen').classList.add('active');
  Router.buildSidebar(user);
  const first = Object.entries(Router.routes)
    .find(([, r]) => r.allowedRoles.includes(user.rol));
  if (first) Router.navigate(first[0]);
}