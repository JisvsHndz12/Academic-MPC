// js/app.js

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Iniciando MusiKales Pro...');

    // 1. Esperar a que la DB esté inicializada antes de nada
    try {
        await dbReady;
        console.log('Sistema listo. DB inicializada.');
    } catch (e) {
        alert('Error crítico: No se pudo iniciar la base de datos local.');
        return;
    }

    // 2. Configurar Event Listeners
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }

    // 3. Toggle Tema (Opcional, si se implementa el botón)
    initThemeToggle();

    // 4. Verificar sesión existente
    // Nota: Si recargan la página, la DB ya estará lista gracias al paso 1
    if (!checkSession()) {
        switchView('login-view');
    }
});

function initThemeToggle() {
    // Lógica simple para toggle de tema si se agrega un botón en el futuro
    const body = document.body;
    // Ejemplo: body.classList.toggle('light-theme');
}

// Renderizado básico del dashboard según rol
function loadDashboardContent(user) {
    const container = document.getElementById('dashboard-content');
    const nameDisplay = document.getElementById('user-display-name');
    const roleDisplay = document.getElementById('user-role-badge');

    if(!nameDisplay || !roleDisplay) return;

    nameDisplay.textContent = user.nombre;
    roleDisplay.textContent = user.role.toUpperCase();

    let html = '';

    if (user.role === 'admin') {
        html = `
            <div class="glass-panel p-4">
                <h2>Panel Administrativo</h2>
                <p>Bienvenido, ${user.nombre}. Aquí podrás gestionar usuarios y configuraciones.</p>
                <div class="stats-grid">
                    <div class="stat-card">Estudiantes: <strong>Cargando...</strong></div>
                    <div class="stat-card">Docentes: <strong>Cargando...</strong></div>
                </div>
            </div>`;
    } else if (user.role === 'docente') {
        html = `
            <div class="glass-panel p-4">
                <h2>Panel Docente</h2>
                <p>Gestione sus clases y rúbricas.</p>
                <ul>
                    ${user.materias ? user.materias.map(m => `<li>${m}</li>`).join('') : '<li>Sin materias asignadas</li>'}
                </ul>
            </div>`;
    } else {
        html = `
            <div class="glass-panel p-4">
                <h2>Panel Estudiante</h2>
                <p>Hola ${user.nombre}, este es tu récord académico.</p>
                <div class="alert-info">Próximamente: Visualización de notas y asistencia.</div>
            </div>`;
    }

    container.innerHTML = html;
}