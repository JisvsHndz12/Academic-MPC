const DB_NAME = 'musikales_pro_db';
const DB_VERSION = 5; // ⬆️ v5: campo notaFinalHistorica en matrículas

const DB = {
  _db: null,

  async init() {
    if (this._db) return this._db;
    this._db = await new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => this._onUpgrade(e.target.result);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    await this._seedIfEmpty();
    return this._db;
  },

  _onUpgrade(db) {
    const stores = [
      'usuarios','estudiantes','docentes','materias',
      'matriculas','horarios','asistencia','rubricas','pruebas','sesion',
      'config_rubricas'
    ];
    stores.forEach(name => {
      if (!db.objectStoreNames.contains(name)) {
        const os = db.createObjectStore(name, { keyPath: 'id', autoIncrement: true });
        if (name === 'usuarios') os.createIndex('username', 'username', { unique: true });
        if (name === 'estudiantes') os.createIndex('cedula', 'cedula', { unique: true });
        if (name === 'docentes') os.createIndex('cedula', 'cedula', { unique: true });
        if (name === 'materias') os.createIndex('codigo', 'codigo', { unique: true });
      }
    });
  },

  _tx(store, mode = 'readonly') {
    return this._db.transaction(store, mode).objectStore(store);
  },
  async getAll(store) {
    return new Promise((res, rej) => {
      const r = this._tx(store).getAll();
      r.onsuccess = () => res(r.result || []);
      r.onerror = () => rej(r.error);
    });
  },
  async get(store, id) {
    return new Promise((res, rej) => {
      const r = this._tx(store).get(id);
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
  },
  async add(store, obj) {
    return new Promise((res, rej) => {
      const r = this._tx(store, 'readwrite').add(obj);
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
  },
  async put(store, obj) {
    return new Promise((res, rej) => {
      const r = this._tx(store, 'readwrite').put(obj);
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
  },
  async delete(store, id) {
    return new Promise((res, rej) => {
      const r = this._tx(store, 'readwrite').delete(id);
      r.onsuccess = () => res();
      r.onerror = () => rej(r.error);
    });
  },
  async getByIndex(store, indexName, value) {
    return new Promise((res, rej) => {
      const r = this._tx(store).index(indexName).get(value);
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
  },
  async clear(store) {
    return new Promise((res, rej) => {
      const r = this._tx(store, 'readwrite').clear();
      r.onsuccess = () => res();
      r.onerror = () => rej(r.error);
    });
  },

  _calcHA(inicio, fin) {
    const parse = (t) => {
      const parts = t.trim().split(/\s+/);
      const [h, m] = parts[0].split(':').map(Number);
      const mod = (parts[1] || '').toUpperCase();
      let hour = h;
      if (hour === 12) hour = 0;
      if (mod === 'PM' || mod === 'M') hour += 12;
      return hour * 60 + m;
    };
    return Math.round((parse(fin) - parse(inicio)) / 45);
  },

  async _seedIfEmpty() {
    const usuarios = await this.getAll('usuarios');
    if (usuarios.length > 0) return;

    // ===================== MATERIAS (45) =====================
    const M = [
      { id:1,  codigo:'FEBIP I (BJ)',  nombre:'Instrumento Principal I - Bajo',     creditos:3, semestre:1, esEspecial:true,  prelaciones:[] },
      { id:2,  codigo:'FEBIP I (BT)',  nombre:'Instrumento Principal I - Batería',  creditos:3, semestre:1, esEspecial:true,  prelaciones:[] },
      { id:3,  codigo:'FEBIP I (CT)',  nombre:'Instrumento Principal I - Canto',    creditos:3, semestre:1, esEspecial:true,  prelaciones:[] },
      { id:4,  codigo:'FEBIP I (GT)',  nombre:'Instrumento Principal I - Guitarra', creditos:3, semestre:1, esEspecial:true,  prelaciones:[] },
      { id:5,  codigo:'FEBIP I (TC)',  nombre:'Instrumento Principal I - Teclado',  creditos:3, semestre:1, esEspecial:true,  prelaciones:[] },
      { id:6,  codigo:'FEBPCOM I',     nombre:'Piano Complementario I',             creditos:3, semestre:1, esEspecial:false, prelaciones:[] },
      { id:7,  codigo:'FEBAM I',       nombre:'Apreciación Musical I',              creditos:2, semestre:1, esEspecial:false, prelaciones:[] },
      { id:8,  codigo:'FEBTLM I',      nombre:'Teoría y Lenguaje Musical I',        creditos:2, semestre:1, esEspecial:true,  prelaciones:[] },
      { id:9,  codigo:'FEBEV I',       nombre:'Educación Vocal I',                  creditos:2, semestre:1, esEspecial:false, prelaciones:[] },
      { id:10, codigo:'FEBPC I',       nombre:'Práctica Coral I',                   creditos:2, semestre:1, esEspecial:false, prelaciones:[] },
      { id:11, codigo:'FEPAM I',       nombre:'Agrupaciones Musicales I',            creditos:2, semestre:1, esEspecial:false, prelaciones:[] },
      { id:12, codigo:'FEBIP II (BJ)', nombre:'Instrumento Principal II - Bajo',     creditos:3, semestre:2, esEspecial:true,  prelaciones:['FEBIP I (BJ)'] },
      { id:13, codigo:'FEBIP II (BT)', nombre:'Instrumento Principal II - Batería',  creditos:3, semestre:2, esEspecial:true,  prelaciones:['FEBIP I (BT)'] },
      { id:14, codigo:'FEBIP II (CT)', nombre:'Instrumento Principal II - Canto',    creditos:3, semestre:2, esEspecial:true,  prelaciones:['FEBIP I (CT)'] },
      { id:15, codigo:'FEBIP II (GT)', nombre:'Instrumento Principal II - Guitarra', creditos:3, semestre:2, esEspecial:true,  prelaciones:['FEBIP I (GT)'] },
      { id:16, codigo:'FEBIP II (TC)', nombre:'Instrumento Principal II - Teclado',  creditos:3, semestre:2, esEspecial:true,  prelaciones:['FEBIP I (TC)'] },
      { id:17, codigo:'FEBPCOM II',    nombre:'Piano Complementario II',             creditos:3, semestre:2, esEspecial:false, prelaciones:['FEBPCOM I'] },
      { id:18, codigo:'FEBAM II',      nombre:'Apreciación Musical II',              creditos:2, semestre:2, esEspecial:false, prelaciones:['FEBAM I'] },
      { id:19, codigo:'FEBTLM II',     nombre:'Teoría y Lenguaje Musical II',        creditos:2, semestre:2, esEspecial:true,  prelaciones:['FEBTLM I'] },
      { id:20, codigo:'FEBEV II',      nombre:'Educación Vocal II',                  creditos:2, semestre:2, esEspecial:false, prelaciones:['FEBEV I'] },
      { id:21, codigo:'FEBPC II',      nombre:'Práctica Coral II',                   creditos:2, semestre:2, esEspecial:false, prelaciones:['FEBPC I'] },
      { id:22, codigo:'FEPAM II',      nombre:'Agrupaciones Musicales II',            creditos:2, semestre:2, esEspecial:false, prelaciones:['FEPAM I'] },
      { id:23, codigo:'FEBIP III (BJ)',nombre:'Instrumento Principal III - Bajo',     creditos:3, semestre:3, esEspecial:true,  prelaciones:['FEBIP II (BJ)'] },
      { id:24, codigo:'FEBIP III (BT)',nombre:'Instrumento Principal III - Batería',  creditos:3, semestre:3, esEspecial:true,  prelaciones:['FEBIP II (BT)'] },
      { id:25, codigo:'FEBIP III (CT)',nombre:'Instrumento Principal III - Canto',    creditos:3, semestre:3, esEspecial:true,  prelaciones:['FEBIP II (CT)'] },
      { id:26, codigo:'FEBIP III (GT)',nombre:'Instrumento Principal III - Guitarra', creditos:3, semestre:3, esEspecial:true,  prelaciones:['FEBIP II (GT)'] },
      { id:27, codigo:'FEBIP III (TC)',nombre:'Instrumento Principal III - Teclado',  creditos:3, semestre:3, esEspecial:true,  prelaciones:['FEBIP II (TC)'] },
      { id:28, codigo:'FEPPIC I',      nombre:'Práctica Instrumental Colectiva I',   creditos:3, semestre:3, esEspecial:false, prelaciones:['FEPAM II'] },
      { id:29, codigo:'FEBHM',         nombre:'Historia de la Música',               creditos:2, semestre:3, esEspecial:false, prelaciones:['FEBAM II'] },
      { id:30, codigo:'FEBTLM III',    nombre:'Teoría y Lenguaje Musical III',       creditos:2, semestre:3, esEspecial:true,  prelaciones:['FEBTLM II'] },
      { id:31, codigo:'FEBEV III',     nombre:'Educación Vocal III',                 creditos:2, semestre:3, esEspecial:false, prelaciones:['FEBEV II'] },
      { id:32, codigo:'FEBPC III',     nombre:'Práctica Coral III',                  creditos:2, semestre:3, esEspecial:false, prelaciones:['FEBPC II'] },
      { id:33, codigo:'FEPAM III',     nombre:'Agrupaciones Musicales III',           creditos:2, semestre:3, esEspecial:false, prelaciones:['FEPAM II'] },
      { id:34, codigo:'FEBIP IV (BJ)', nombre:'Instrumento Principal IV - Bajo',     creditos:3, semestre:4, esEspecial:true,  prelaciones:['FEBIP III (BJ)'] },
      { id:35, codigo:'FEBIP IV (BT)', nombre:'Instrumento Principal IV - Batería',  creditos:3, semestre:4, esEspecial:true,  prelaciones:['FEBIP III (BT)'] },
      { id:36, codigo:'FEBIP IV (CT)', nombre:'Instrumento Principal IV - Canto',    creditos:3, semestre:4, esEspecial:true,  prelaciones:['FEBIP III (CT)'] },
      { id:37, codigo:'FEBIP IV (GT)', nombre:'Instrumento Principal IV - Guitarra', creditos:3, semestre:4, esEspecial:true,  prelaciones:['FEBIP III (GT)'] },
      { id:38, codigo:'FEBIP IV (TC)', nombre:'Instrumento Principal IV - Teclado',  creditos:3, semestre:4, esEspecial:true,  prelaciones:['FEBIP III (TC)'] },
      { id:39, codigo:'FEBA',          nombre:'Armonía I',                           creditos:2, semestre:4, esEspecial:true,  prelaciones:['FEBPCOM II','FEBTLM III'] },
      { id:40, codigo:'FEPPIC II',     nombre:'Práctica Instrumental Colectiva II',  creditos:3, semestre:4, esEspecial:false, prelaciones:['FEPPIC I'] },
      { id:41, codigo:'FEBTLM IV',     nombre:'Teoría y Lenguaje Musical IV',        creditos:2, semestre:4, esEspecial:true,  prelaciones:['FEBTLM III'] },
      { id:42, codigo:'FEBEV IV',      nombre:'Educación Vocal IV',                  creditos:2, semestre:4, esEspecial:false, prelaciones:['FEBEV III'] },
      { id:43, codigo:'FEBPC IV',      nombre:'Práctica Coral IV',                   creditos:2, semestre:4, esEspecial:false, prelaciones:['FEBPC III'] },
      { id:44, codigo:'FEPAM IV',      nombre:'Agrupaciones Musicales IV',            creditos:2, semestre:4, esEspecial:false, prelaciones:['FEPAM III'] },
      { id:45, codigo:'FEBCG',         nombre:'Concierto de Grado',                  creditos:2, semestre:4, esEspecial:true,  prelaciones:[] },
    ];
    for (const m of M) await this.put('materias', m);

    // ===================== DOCENTES (8) =====================
    const D = [
      { id:1, nombres:'Cristian',  apellidos:'González',  cedula:'V-00.000.001', telefono:'0414-0000001', cargaHoraria:0, materiasIds:[] },
      { id:2, nombres:'Leonel',    apellidos:'Rondón',    cedula:'V-00.000.002', telefono:'0414-0000002', cargaHoraria:0, materiasIds:[] },
      { id:3, nombres:'Jonathan',  apellidos:'Ortiz',     cedula:'V-00.000.003', telefono:'0414-0000003', cargaHoraria:0, materiasIds:[] },
      { id:4, nombres:'Ricardo',   apellidos:'Barrios',   cedula:'V-00.000.004', telefono:'0414-0000004', cargaHoraria:0, materiasIds:[] },
      { id:5, nombres:'José',      apellidos:'Serven',    cedula:'V-00.000.005', telefono:'0414-0000005', cargaHoraria:0, materiasIds:[] },
      { id:6, nombres:'Gledis',    apellidos:'Camacaro',  cedula:'V-00.000.006', telefono:'0414-0000006', cargaHoraria:0, materiasIds:[] },
      { id:7, nombres:'Jesús',     apellidos:'Hernández', cedula:'V-00.000.007', telefono:'0414-0000007', cargaHoraria:0, materiasIds:[] },
      { id:8, nombres:'Osluar',    apellidos:'Lermo',     cedula:'V-00.000.008', telefono:'0414-0000008', cargaHoraria:0, materiasIds:[] },
    ];
    for (const d of D) await this.put('docentes', d);

    // ===================== ESTUDIANTES (6 de ejemplo) =====================
    const E = [
      { id:1, nombres:'Pedro',  apellidos:'Ruiz',    cedula:'V-26.000.001', telefono:'0412-3333331', matricula:'2025-I',  turno:'Interdiario', correo:'pedro@musikales.pro' },
      { id:2, nombres:'Marta',  apellidos:'Gómez',   cedula:'V-26.000.002', telefono:'0412-3333332', matricula:'2025-I',  turno:'Intensivo',   correo:'marta@musikales.pro' },
      { id:3, nombres:'Carla',  apellidos:'Méndez',  cedula:'V-27.000.001', telefono:'0412-2222221', matricula:'2025-II', turno:'Interdiario', correo:'carla@musikales.pro' },
      { id:4, nombres:'Andrés', apellidos:'Paredes', cedula:'V-27.000.002', telefono:'0412-2222222', matricula:'2025-II', turno:'Intensivo',   correo:'andres@musikales.pro' },
      { id:5, nombres:'Ana',    apellidos:'Pérez',   cedula:'V-28.000.001', telefono:'0412-1111111', matricula:'2026-I',  turno:'Interdiario', correo:'ana@musikales.pro' },
      { id:6, nombres:'Luis',   apellidos:'Díaz',    cedula:'V-28.000.002', telefono:'0412-1111112', matricula:'2026-I',  turno:'Intensivo',   correo:'luis@musikales.pro' },
    ];
    for (const e of E) await this.put('estudiantes', e);

    // ===================== HORARIOS (vacíos por ahora, se llenan con importación) =====================
    // Los horarios reales se pueden agregar después desde el panel administrativo

    // ===================== USUARIOS =====================
    const U = [
      { id:1,  username:'admin',      password:'admin123', rol:'master',     personaRef:null, nombres:'Administrador', apellidos:'Sistema' },
      { id:2,  username:'cgonzalez',  password:'doc123',   rol:'docente',    personaRef:1,    nombres:'Cristian',  apellidos:'González' },
      { id:3,  username:'lrondon',    password:'doc123',   rol:'docente',    personaRef:2,    nombres:'Leonel',    apellidos:'Rondón' },
      { id:4,  username:'jortiz',     password:'doc123',   rol:'docente',    personaRef:3,    nombres:'Jonathan',  apellidos:'Ortiz' },
      { id:5,  username:'rbarrios',   password:'doc123',   rol:'docente',    personaRef:4,    nombres:'Ricardo',   apellidos:'Barrios' },
      { id:6,  username:'jserven',    password:'doc123',   rol:'docente',    personaRef:5,    nombres:'José',      apellidos:'Serven' },
      { id:7,  username:'gcamacaro',  password:'doc123',   rol:'docente',    personaRef:6,    nombres:'Gledis',    apellidos:'Camacaro' },
      { id:8,  username:'jhernandez', password:'doc123',   rol:'docente',    personaRef:7,    nombres:'Jesús',     apellidos:'Hernández' },
      { id:9,  username:'olermo',     password:'doc123',   rol:'docente',    personaRef:8,    nombres:'Osluar',    apellidos:'Lermo' },
      { id:10, username:'2025-i',     password:'est123',   rol:'estudiante', personaRef:1,    nombres:'Pedro',     apellidos:'Ruiz' },
      { id:11, username:'2025-ii',    password:'est123',   rol:'estudiante', personaRef:3,    nombres:'Carla',     apellidos:'Méndez' },
      { id:12, username:'2026-i',     password:'est123',   rol:'estudiante', personaRef:5,    nombres:'Ana',       apellidos:'Pérez' },
    ];
    for (const u of U) await this.put('usuarios', u);
  }
};