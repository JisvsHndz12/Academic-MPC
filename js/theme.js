const Theme = {
  KEY: 'musikales_theme',
  init() {
    const saved = localStorage.getItem(this.KEY) || 'dark';
    this.set(saved);
    Utils.$('#theme-toggle')?.addEventListener('click', () => this.toggle());
    Utils.$('#topbar-theme-toggle')?.addEventListener('click', () => this.toggle());
  },
  set(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(this.KEY, theme);
    const icon = theme === 'dark' ? '🌙' : '☀️';
    Utils.$$('.theme-icon').forEach(el => el.textContent = icon);
  },
  toggle() {
    const current = document.documentElement.getAttribute('data-theme');
    this.set(current === 'dark' ? 'light' : 'dark');
  }
};