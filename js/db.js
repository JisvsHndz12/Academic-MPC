const DB_NAME = 'MusikalesProDB';
const DB_VERSION = 1;

const DB_INIT = {
    users: { keyPath: 'id' }, // id será la cédula
    students: { keyPath: 'matricula' },
    teachers: { keyPath: 'cedula' },
    subjects: { keyPath: 'codigo' },
    enrollments: { keyPath: 'id', autoIncrement: true }, // studentMatricula, subjectCode, period
    attendance: { keyPath: 'id', autoIncrement: true }, // enrollmentId, week, status (1/0)
    grades: { keyPath: 'id', autoIncrement: true } // enrollmentId, rubricScore, theoryScore, finalScore
};

let db;

export const initDB = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (e) => {
            db = e.target.result;
            // Crear Object Stores
            Object.keys(DB_INIT).forEach(store => {
                if (!db.objectStoreNames.contains(store)) {
                    db.createObjectStore(store, DB_INIT[store]);
                }
            });

            // Seed inicial si es la primera vez
            const userStore = request.transaction.objectStore('users');
            if (userStore.count() === 0) {
                // Admin
                userStore.add({ id: 'admin', pass: '123', role: 'admin', name: 'Administrador' });
                // Docente Demo
                userStore.add({ id: '101', pass: '123', role: 'teacher', name: 'Prof. Piano', subjects: ['PIANO-01', 'TEO-01'] });
                // Estudiante Demo
                userStore.add({ id: '102', pass: '123', role: 'student', name: 'Juan Alumno' });

                const subStore = request.transaction.objectStore('subjects');
                subStore.add({ codigo: 'PIANO-01', nombre: 'Instrumento Principal', minPass: 7 });
                subStore.add({ codigo: 'TEO-01', nombre: 'Teoría Musical', minPass: 7 });
                subStore.add({ codigo: 'HIST-01', nombre: 'Historia de la Música', minPass: 6 });
            }
        };

        request.onsuccess = (e) => {
            db = e.target.result;
            console.log('DB Iniciada');
            resolve(db);
        };

        request.onerror = (e) => reject('Error DB: ' + e.target.error);
    });
};

// Helpers genéricos para CRUD
export const dbAction = (storeName, mode, callback) => {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, mode);
        const store = tx.objectStore(storeName);
        const request = callback(store);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

export const getAll = (storeName) => dbAction(storeName, 'readonly', store => store.getAll());
export const addRecord = (storeName, data) => dbAction(storeName, 'readwrite', store => store.add(data));
export const updateRecord = (storeName, data) => dbAction(storeName, 'readwrite', store => store.put(data));
// Buscar por índice o clave primaria simple
export const getByKey = (storeName, key) => dbAction(storeName, 'readonly', store => store.get(key));