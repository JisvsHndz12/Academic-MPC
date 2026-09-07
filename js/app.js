import { initDB, getAll, addRecord, updateRecord, getByKey } from './db.js';
import { login, logout, getCurrentUser, checkRole } from './auth.js';
import { processEvaluation, evaluateObjective } from './logic.js';

// Estado Global
let currentUser = null;

// Elementos DOM
const views = {
    login: document.getElementById('view-login'),
    dashboard: document.getElementById('view-dashboard')
};
const dynamicContent = document.getElementById('dynamic-content');
const navMenu = document.getElementById('nav-menu');
const pageTitle = document.getElementById('page-title');

// Inicialización
document.addEventListener('DOMContentLoaded', async () => {
    await initDB();

    // Toggle Tema
    document.getElementById('theme-btn').addEventListener('click', () => {
        const body = document.body;
        const isDark = body.getAttribute('data-theme') === 'dark';
        body.setAttribute('data-theme', isDark ? 'light' : 'dark');
        document.querySelector('#theme-btn i').className = isDark ? 'fas fa-moon' : 'fas fa-sun';
    });

    // Login Form
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const u = document.getElementById('username').value;
        const p = document.getElementById('password').value;
        const res = await login(u, p);

        if (res.success) {
            loadDashboard(res.user);
        } else {
            showToast(res.message, 'error');
        }
    });

    // Logout
    document.getElementById('logout-btn').addEventListener('click', logout);

    // Check sesión activa
    const savedUser = getCurrentUser();
    if (savedUser) loadDashboard(savedUser);
});

function loadDashboard(user) {
    currentUser = user;
    views.login.classList.add('hidden');
    views.dashboard.classList.remove('hidden');
    views.dashboard.style.display = 'flex'; // Fix flex layout

    document.getElementById('user-name-display').textContent = user.name;
    renderNav(user.role);
    navigate('home');
}

function renderNav(role) {
    let items = [];
    if (role === 'admin') {
        items = [
            { id: 'home', label: 'Inicio', icon: 'fa-home' },
            { id: 'students', label: 'Estudiantes', icon: 'fa-user-graduate' },
            { id: 'teachers', label: 'Docentes', icon: 'fa-chalkboard-teacher' },
            { id: 'subjects', label: 'Materias', icon: 'fa-book' },
            { id: 'honor', label: 'Cuadro de Honor', icon: 'fa-trophy' }
        ];
    } else if (role === 'teacher') {
        items = [
            { id: 'my-subjects', label: 'Mis Materias', icon: 'fa-list' },
            { id: 'attendance', label: 'Asistencia', icon: 'fa-calendar-check' },
            { id: 'grades', label: 'Evaluaciones', icon: 'fa-star' }
        ];
    } else if (role === 'student') {
        items = [
            { id: 'my-record', label: 'Mi Récord', icon: 'fa-file-alt' },
            { id: 'schedule', label: 'Horario', icon: 'fa-clock' }
        ];
    }

    navMenu.innerHTML = items.map(item =>
        `<button onclick="navigate('${item.id}')"><i class="fas ${item.icon}"></i> ${item.label}</button>`
    ).join('');
}

// Navegación Simple
window.navigate = async (viewId) => {
    // Actualizar UI activa
    document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));
    const activeBtn = Array.from(document.querySelectorAll('nav button')).find(b => b.textContent.includes(viewIdToLabel(viewId)));
    if(activeBtn) activeBtn.classList.add('active');

    dynamicContent.innerHTML = '<p>Cargando...</p>';

    // Renderizar contenido según rol y vista
    if (currentUser.role === 'admin') renderAdminView(viewId);
    else if (currentUser.role === 'teacher') renderTeacherView(viewId);
    else if (currentUser.role === 'student') renderStudentView(viewId);
};

function viewIdToLabel(id) {
    // Helper simple para matchear botón
    const map = { 'home': 'Inicio', 'my-subjects': 'Mis Materias', 'my-record': 'Mi Récord' };
    return map[id] || '';
}

// --- RENDERIZADORES POR ROL ---

async function renderAdminView(viewId) {
    if (viewId === 'home') {
        const students = await getAll('students');
        const teachers = await getAll('teachers');
        dynamicContent.innerHTML = `
            <div class="card-grid">
                <div class="glass-panel stat-card">
                    <h3>Estudiantes</h3>
                    <div class="stat-number">${students ? students.length : 0}</div>
                </div>
                <div class="glass-panel stat-card">
                    <h3>Docentes</h3>
                    <div class="stat-number">${teachers ? teachers.length : 0}</div>
                </div>
            </div>
            <div class="glass-panel" style="margin-top:20px; padding:20px;">
                <h3>Bienvenido, Admin</h3>
                <p>Gestione usuarios, materias y horarios desde el menú lateral.</p>
            </div>
        `;
    } else if (viewId === 'students') {
        // Formulario simple de registro
        const students = await getAll('students');
        let tableRows = students ? students.map(s => `<tr><td>${s.nombre}</td><td>${s.matricula}</td><td>${s.turno}</td></tr>`).join('') : '';

        dynamicContent.innerHTML = `
            <div class="glass-panel" style="padding:20px;">
                <h3>Gestión de Estudiantes</h3>
                <form id="add-student-form" style="display:flex; gap:10px; margin:15px 0;">
                    <input class="form-control" placeholder="Nombre" id="st-name" required>
                    <input class="form-control" placeholder="Matrícula" id="st-mat" required>
                    <select class="form-control" id="st-turn"><option>Mañana</option><option>Tarde</option></select>
                    <button type="submit" class="btn-primary" style="width:auto;">Agregar</button>
                </form>
                <table>
                    <thead><tr><th>Nombre</th><th>Matrícula</th><th>Turno</th></tr></thead>
                    <tbody>${tableRows}</tbody>
                </table>
            </div>
        `;

        document.getElementById('add-student-form').onsubmit = async (e) => {
            e.preventDefault();
            await addRecord('students', {
                nombre: document.getElementById('st-name').value,
                matricula: document.getElementById('st-mat').value,
                turno: document.getElementById('st-turn').value,
                cedula: '000', telefono: '', email: '' // Simplificado
            });
            navigate('students'); // Recargar
            showToast('Estudiante registrado');
        };
    }
}

async function renderTeacherView(viewId) {
    if (viewId === 'my-subjects') {
        // Simulación: El docente ve sus materias asignadas en su objeto usuario
        const subjectsCodes = currentUser.subjects || [];
        const allSubjects = await getAll('subjects');
        const mySubjects = allSubjects.filter(s => subjectsCodes.includes(s.codigo));

        let html = `<div class="card-grid">`;
        mySubjects.forEach(sub => {
            html += `
                <div class="glass-panel stat-card">
                    <h3>${sub.nombre}</h3>
                    <p>Código: ${sub.codigo}</p>
                    <p>Mínimo Aprobatoria: ${sub.minPass}</p>
                    <button class="btn-primary" style="margin-top:10px;" onclick="openGrading('${sub.codigo}')">Gestionar Notas</button>
                </div>
            `;
        });
        html += `</div>`;
        dynamicContent.innerHTML = html;
    }
}

async function renderStudentView(viewId) {
    if (viewId === 'my-record') {
        // Simular búsqueda de notas del estudiante logueado
        // En un sistema real, buscaríamos en 'enrollments' donde studentMatricula == currentUser.id
        dynamicContent.innerHTML = `
            <div class="glass-panel" style="padding:20px;">
                <h3>Mi Récord Académico</h3>
                <p>Mostrando resultados simulados para demostración.</p>
                <table>
                    <thead>
                        <tr>
                            <th>Materia</th>
                            <th>Asistencia (10%)</th>
                            <th>Rúbrica (90%)</th>
                            <th>Teórica (20%)</th>
                            <th>Nota Final</th>
                            <th>Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Instrumento Principal</td>
                            <td>9.50</td>
                            <td>8.80</td>
                            <td>9.00</td>
                            <td><strong>9.04</strong></td>
                            <td><span class="badge badge-pass">Aprobado (Min 7)</span></td>
                        </tr>
                        <tr>
                            <td>Historia de la Música</td>
                            <td>6.00</td>
                            <td>7.00</td>
                            <td>5.00</td>
                            <td><strong>6.70</strong></td>
                            <td><span class="badge badge-pass">Aprobado (Min 6)</span></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;
    }
}

// Función global para acceso desde HTML inyectado
window.openGrading = async (subjectCode) => {
    // Interfaz simplificada de evaluación para el docente
    const subject = await getByKey('subjects', subjectCode);
    dynamicContent.innerHTML = `
        <div class="glass-panel" style="padding:20px;">
            <h3>Evaluando: ${subject.nombre}</h3>
            <p>Regla: 80% Rúbrica (10% Asist + 90% Obj) + 20% Teórica.</p>

            <div style="margin-top:20px; border-top:1px solid var(--glass-border); padding-top:20px;">
                <h4>Simulación de Cálculo para un Estudiante</h4>
                <div class="form-group">
                    <label>Asistencias (0-16):</label>
                    <input type="number" id="sim-att" class="form-control" value="14" max="16">
                </div>
                <div class="form-group">
                    <label>Promedio Objetivos (1-10):</label>
                    <input type="number" id="sim-obj" class="form-control" value="8.5" max="10" step="0.1">
                </div>
                <div class="form-group">
                    <label>Nota Prueba Teórica (1-10):</label>
                    <input type="number" id="sim-theo" class="form-control" value="7.0" max="10" step="0.1">
                </div>
                <button class="btn-primary" onclick="calculateDemo(${subject.minPass})">Calcular Nota Final</button>

                <div id="calc-result" style="margin-top:20px; font-weight:bold; font-size:1.2rem;"></div>
            </div>
        </div>
    `;
};

window.calculateDemo = (minPass) => {
    const att = parseFloat(document.getElementById('sim-att').value);
    const obj = parseFloat(document.getElementById('sim-obj').value);
    const theo = parseFloat(document.getElementById('sim-theo').value);

    const result = processEvaluation(att, obj, theo, minPass);

    const resDiv = document.getElementById('calc-result');
    resDiv.innerHTML = `
        Nota Asistencia: ${result.attendanceScore}<br>
        Nota Rúbrica Total: ${result.rubricTotal}<br>
        NOTA FINAL: ${result.finalScore} <br>
        ${result.passed ? '<span style="color:var(--success)">APROBADO</span>' : '<span style="color:var(--danger)">REPROBADO</span>'}
    `;
};

function showToast(msg, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.style.borderLeftColor = type === 'error' ? 'var(--danger)' : 'var(--success)';
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}