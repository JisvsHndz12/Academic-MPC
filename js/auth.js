// js/auth.js

let currentUser = null;

async function handleLogin(e) {
    e.preventDefault();

    const usernameInput = document.getElementById('username').value.trim();
    const passwordInput = document.getElementById('password').value.trim();
    const errorMsg = document.getElementById('login-error');
    const btn = document.getElementById('btn-login');

    // UI Feedback
    errorMsg.classList.add('hidden');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Validando...';
    btn.disabled = true;

    try {
        // Esperamos a que la DB esté lista y valide
        const user = await loginUser(usernameInput, passwordInput);

        // Éxito
        currentUser = user;
        sessionStorage.setItem('musikales_user', JSON.stringify(user));

        // Transición suave
        setTimeout(() => {
            switchView('dashboard-view');
            loadDashboardContent(user);
        }, 500);

    } catch (error) {
        console.error(error);
        errorMsg.textContent = error === 'Credenciales inválidas'
            ? 'Usuario o contraseña incorrectos'
            : 'Error de conexión. Recargue la página.';
        errorMsg.classList.remove('hidden');

        // Reset botón
        btn.innerHTML = '<span>Ingresar</span><i class="fas fa-arrow-right"></i>';
        btn.disabled = false;
    }
}

function logout() {
    currentUser = null;
    sessionStorage.removeItem('musikales_user');
    document.getElementById('login-form').reset();
    switchView('login-view');
}

function checkSession() {
    const stored = sessionStorage.getItem('musikales_user');
    if (stored) {
        currentUser = JSON.parse(stored);
        switchView('dashboard-view');
        loadDashboardContent(currentUser);
        return true;
    }
    return false;
}

function switchView(viewId) {
    document.querySelectorAll('.view').forEach(el => {
        el.classList.remove('active');
        el.classList.add('hidden');
    });
    const target = document.getElementById(viewId);
    target.classList.remove('hidden');
    // Pequeño delay para permitir la transición CSS si se agrega
    setTimeout(() => target.classList.add('active'), 10);
}