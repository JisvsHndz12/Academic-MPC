const Router = {
  routes: {},
  currentView: null,
  register(name, { title, render, allowedRoles = [] }) {
    this.routes[name] = { title, render, allowedRoles };
  },
  async navigate(name) {
    const route = this.routes[name];
    if (!route) return;
    const user = await Auth.current();
    if (!user) return;
    if (route.allowedRoles.length && !route.allowedRoles.includes(user.rol)) {
      Utils.toast('No tienes permiso para esta sección', 'error');
      return;
    }
    this.currentView = name;
    Utils.$('#view-title').textContent = route.title;
    Utils.$$('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.view === name));
    await route.render(Utils.$('#view-container'), user);

    // Cerrar sidebar automáticamente en móvil al navegar
    if (typeof window.closeSidebar === 'function') {
      window.closeSidebar();
    }
  },
  buildSidebar(user) {
    const nav = Utils.$('#sidebar-nav');
    nav.innerHTML = '';
    Object.entries(this.routes).forEach(([key, r]) => {
      if (r.allowedRoles.length && !r.allowedRoles.includes(user.rol)) return;
      const item = Utils.el(`<div class="nav-item" data-view="${key}"><span>${r.title}</span></div>`);
      item.onclick = () => this.navigate(key);
      nav.appendChild(item);
    });
    Utils.$('#sidebar-role').textContent = user.rol;
    Utils.$('#user-info').innerHTML = `<strong>${user.nombres} ${user.apellidos}</strong><span class="muted">@${user.username}</span>`;
  }
};