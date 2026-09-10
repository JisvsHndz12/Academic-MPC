const Auth = {
    async login(username, password, rol) {
    const user = await DB.getByIndex('usuarios', 'username', username.trim().toLowerCase());
    if (!user) throw new Error('Usuario no encontrado');
    if (user.activo === false) throw new Error('Usuario inactivo. Contacte al administrador.');
    if (user.password !== password) throw new Error('Contraseña incorrecta');
    if (user.rol !== rol) throw new Error(`Este usuario no tiene rol de ${rol}`);

    // Registrar último acceso
    user.ultimoAcceso = Date.now();
    await DB.put('usuarios', user);

    await DB.put('sesion', { id: 1, userId: user.id, loginAt: Date.now() });
    return user;
  },
  async logout() {
    await DB.delete('sesion', 1);
  },
  async current() {
    const s = await DB.get('sesion', 1);
    if (!s) return null;
    return await DB.get('usuarios', s.userId);
  },
  async requireRole(...roles) {
    const u = await this.current();
    if (!u) throw new Error('No autenticado');
    if (!roles.includes(u.rol)) throw new Error('Sin permisos');
    return u;
  }
};