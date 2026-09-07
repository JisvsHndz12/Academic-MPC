// js/db.js

const DB_NAME = 'MusikalesProDB';
const DB_VERSION = 1;
let dbInstance = null;

// Promesa global para esperar a que la DB esté lista
const dbReady = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Store Usuarios
        if (!db.objectStoreNames.contains('usuarios')) {
            const userStore = db.createObjectStore('usuarios', { keyPath: 'cedula' });
            userStore.createIndex('username', 'username', { unique: true });
            userStore.createIndex('role', 'role', { unique: false });
        }

        // Store Estudiantes
        if (!db.objectStoreNames.contains('estudiantes')) {
            const estStore = db.createObjectStore('estudiantes', { keyPath: 'matricula' });
        }

        // Store Materias/Rubricas
        if (!db.objectStoreNames.contains('materias')) {
            const matStore = db.createObjectStore('materias', { keyPath: 'id' });
        }
    };

    request.onsuccess = (event) => {
        dbInstance = event.target.result;
        console.log('DB Conectada exitosamente');
        seedInitialData()
            .then(() => resolve(dbInstance))
            .catch((error) => reject(error));
    };

    request.onerror = (event) => {
        console.error('Error al abrir DB:', event.target.errorCode);
        reject(event.target.errorCode);
    };
});

// Función para obtener la instancia de la DB (espera si es necesario)
async function getDB() {
    if (dbInstance) return dbInstance;
    return await dbReady;
}

// Seed Data: Crea usuarios si la DB está vacía
async function seedInitialData() {
    const db = await getDB();
    const count = await new Promise((resolve, reject) => {
        const request = db.transaction('usuarios', 'readonly').objectStore('usuarios').count();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });

    if (count > 0) return;

    const defaultUsers = [
        { cedula: '1001', username: 'admin', password: '123', role: 'admin', nombre: 'Administrador General' },
        { cedula: '2001', username: 'docente1', password: '123', role: 'docente', nombre: 'Prof. Juan Pérez', materias: ['Instrumento Principal', 'Teoría'] },
        { cedula: '3001', username: 'estudiante1', password: '123', role: 'estudiante', nombre: 'Alumno Demo', matricula: 'MUS-2024-001' }
    ];

    await new Promise((resolve, reject) => {
        const transaction = db.transaction('usuarios', 'readwrite');
        const store = transaction.objectStore('usuarios');
        defaultUsers.forEach((user) => store.add(user));
        transaction.oncomplete = resolve;
        transaction.onerror = () => reject(transaction.error);
    });
}

// Función de Login Real
async function loginUser(username, password) {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('usuarios', 'readonly');
        const store = tx.objectStore('usuarios');
        const index = store.index('username');

        const request = index.get(username);

        request.onsuccess = () => {
            const user = request.result;
            if (user && user.password === password) {
                resolve(user);
            } else {
                reject('Credenciales inválidas');
            }
        };

        request.onerror = () => reject('Error en la base de datos');
    });
}