import { getByKey } from './db.js';

export const login = async (username, password) => {
    try {
        const user = await getByKey('users', username);
        if (user && user.pass === password) {
            sessionStorage.setItem('currentUser', JSON.stringify(user));
            return { success: true, user };
        }
        return { success: false, message: 'Credenciales inválidas' };
    } catch (error) {
        return { success: false, message: 'Error de conexión DB' };
    }
};

export const logout = () => {
    sessionStorage.removeItem('currentUser');
    window.location.reload();
};

export const getCurrentUser = () => {
    const user = sessionStorage.getItem('currentUser');
    return user ? JSON.parse(user) : null;
};

export const checkRole = (allowedRoles) => {
    const user = getCurrentUser();
    if (!user || !allowedRoles.includes(user.role)) {
        alert('Acceso denegado');
        return false;
    }
    return true;
};