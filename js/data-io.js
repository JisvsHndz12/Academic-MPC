const DataIO = {
  STORES: ['usuarios','estudiantes','docentes','materias','matriculas','horarios','asistencia','rubricas','pruebas','config_rubricas'],

  async exportAll() {
    const data = {};
    for (const s of this.STORES) data[s] = await DB.getAll(s);
    const json = JSON.stringify({ version: 2, exportedAt: new Date().toISOString(), data }, null, 2);
    this._download(json, `musikales-backup-${this._dateStamp()}.json`, 'application/json');
    Utils.toast('Backup completo exportado', 'success');
  },

  async exportBaseTemplate() {
    const [materias, docentes, horarios] = await Promise.all([
      DB.getAll('materias'), DB.getAll('docentes'), DB.getAll('horarios')
    ]);
    const template = {
      version: 2, type: 'base-template', exportedAt: new Date().toISOString(),
      data: { materias, docentes, horarios, estudiantes: [], matriculas: [], asistencia: [], rubricas: [], pruebas: [], config_rubricas: [], usuarios: [] }
    };
    this._download(JSON.stringify(template, null, 2), `musikales-template-base-${this._dateStamp()}.json`, 'application/json');
    Utils.toast('Template base exportado', 'success');
  },

  async importJSON(file, options = { merge: false }) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const backup = JSON.parse(e.target.result);
          if (!backup.data) throw new Error('Formato inválido');
          const action = options.merge ? 'Se AGREGARÁN los datos' : 'Se REEMPLAZARÁN todos los datos';
          if (!confirm(`${action}.\n\n¿Continuar?`)) { resolve(false); return; }
          if (!options.merge) for (const s of this.STORES) await DB.clear(s);
          let total = 0;
          for (const s of this.STORES) {
            if (backup.data[s]) for (const item of backup.data[s]) { await DB.put(s, item); total++; }
          }
          Utils.toast(`${total} registros importados`, 'success');
          resolve(true);
        } catch (ex) { Utils.toast('Error: ' + ex.message, 'error'); reject(ex); }
      };
      reader.readAsText(file);
    });
  },

  /* ============================================================
   *  IMPORTADOR ESPECIALIZADO: Base de Datos Histórica
   *  Soporta CSV con separador COMA (,) o PUNTO Y COMA (;)
   * ============================================================ */
    async importBaseDatosHistorica(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          // 🔑 Detectar codificación automáticamente
          const buffer = e.target.result;
          const decoder = new TextDecoder('utf-8', { fatal: false });
          let text = decoder.decode(buffer);
          
          // Si hay caracteres inválidos, intentar con Windows-1252 (Latin-1)
          if (text.includes('')) {
            const decoder2 = new TextDecoder('windows-1252');
            text = decoder2.decode(buffer);
          }

          const lines = text.split(/\r?\n/).filter(l => l.trim());
          if (lines.length < 2) throw new Error('Archivo vacío');

          const separator = this._detectSeparator(lines[0]);
          console.log('🔍 Separador:', separator === ';' ? 'PUNTO Y COMA' : 'COMA');

          const headers = this._parseCSVLine(lines[0], separator).map(h => h.trim());
          const dataLines = lines.slice(1);

          console.log('📋 Encabezados:', headers);

          const findCol = (patterns) => {
            for (const p of patterns) {
              const idx = headers.findIndex(h => h.toUpperCase().includes(p));
              if (idx !== -1) return idx;
            }
            return -1;
          };

          const idxInstrumento = findCol(['INSTRUMENTO']);
          const idxMatricula = findCol(['MATRICULA', 'MATRÍCULA']);
          const idxPeriodo1 = findCol(['PERIODO 1', 'PERÍODO 1']);
          const idxPeriodo2 = findCol(['PERIODO 2', 'PERÍODO 2']);
          const idxPeriodo3 = findCol(['PERIODO 3', 'PERÍODO 3']);
          const idxPeriodo4 = findCol(['PERIODO 4', 'PERÍODO 4']);
          const idxCedula = findCol(['CEDULA', 'CÉDULA']);
          const idxNombres = findCol(['NOMBRES']);
          const idxApellidos = findCol(['APELLIDOS']);

          if (idxCedula === -1 || idxNombres === -1 || idxApellidos === -1) {
            throw new Error(`Columnas obligatorias no encontradas. Encabezados: ${headers.join(' | ')}`);
          }

          const materiasCols = [];
          headers.forEach((h, i) => {
            const hUp = h.toUpperCase().trim();
            if (hUp.startsWith('FEB') || hUp.startsWith('FEP') || hUp === 'FEBA' || hUp === 'FEBCG') {
              materiasCols.push({ index: i, codigo: hUp });
            }
          });

          const [materias, docentes, estudiantes, matriculas, usuarios] = await Promise.all([
            DB.getAll('materias'), DB.getAll('docentes'),
            DB.getAll('estudiantes'), DB.getAll('matriculas'),
            DB.getAll('usuarios')
          ]);

          let nextEstId = Math.max(0, ...estudiantes.map(e => e.id)) + 1;
          let nextMatId = Math.max(0, ...matriculas.map(m => m.id)) + 1;
          let nextUserId = Math.max(0, ...usuarios.map(u => u.id)) + 1;

          let estudiantesCreados = 0, matriculasCreadas = 0, errores = [];

          for (let i = 0; i < dataLines.length; i++) {
            const cols = this._parseCSVLine(dataLines[i], separator);
            if (cols.every(c => !c || !c.trim())) continue;
            if (cols.length < 9) { errores.push(`Línea ${i+2}: columnas insuficientes`); continue; }

            const instrumento = cols[idxInstrumento]?.trim() || '';
            const cohorte = cols[idxMatricula]?.trim() || '';
            const periodo1 = cols[idxPeriodo1]?.trim() || '';
            const periodo2 = cols[idxPeriodo2]?.trim() || '';
            const periodo3 = cols[idxPeriodo3]?.trim() || '';
            const periodo4 = cols[idxPeriodo4]?.trim() || '';
            const cedula = cols[idxCedula]?.trim() || '';
            const nombres = cols[idxNombres]?.trim() || '';
            const apellidos = cols[idxApellidos]?.trim() || '';

            if (!cedula || !nombres || !apellidos) {
              errores.push(`Línea ${i+2}: faltan datos obligatorios`);
              continue;
            }

            let estudiante = estudiantes.find(e => e.cedula === cedula);
            if (!estudiante) {
              estudiante = {
                id: nextEstId++,
                nombres, apellidos, cedula,
                telefono: '',
                matricula: cohorte,
                turno: 'Interdiario',
                correo: ''
              };
              await DB.add('estudiantes', estudiante);
              estudiantes.push(estudiante);
              estudiantesCreados++;

              const username = cedula.toLowerCase().replace(/[\s.]/g, '');
              if (!usuarios.find(u => u.username === username)) {
                await DB.add('usuarios', {
                  id: nextUserId++,
                  username,
                  password: 'est123',
                  rol: 'estudiante',
                  personaRef: estudiante.id,
                  nombres, apellidos,
                  activo: true
                });
                usuarios.push({ username });
              }
            }

            const semPeriodos = { 1: periodo1, 2: periodo2, 3: periodo3, 4: periodo4 };

            for (const matCol of materiasCols) {
              const notaStr = cols[matCol.index]?.trim();
              if (!notaStr) continue;

              const nota = parseFloat(notaStr.replace(',', '.'));
              if (isNaN(nota) || nota < 1 || nota > 10) {
                errores.push(`Línea ${i+2}: nota inválida "${notaStr}" en ${matCol.codigo}`);
                continue;
              }

              const materia = materias.find(m => m.codigo.toUpperCase() === matCol.codigo);
              if (!materia) {
                errores.push(`Línea ${i+2}: materia ${matCol.codigo} no encontrada`);
                continue;
              }

              const semestre = materia.semestre;
              const periodo = semPeriodos[semestre];
              if (!periodo) {
                errores.push(`Línea ${i+2}: no hay período para semestre ${semestre}`);
                continue;
              }

              let materiaId = materia.id;
              if (materia.codigo.startsWith('FEBIP')) {
                const variante = this._getVarianteInstrumento(instrumento);
                if (variante) {
                  const codigoVariante = materia.codigo.replace(/\(.*\)/, `(${variante})`);
                  const matVariante = materias.find(m => m.codigo === codigoVariante);
                  if (matVariante) materiaId = matVariante.id;
                }
              }

              const docente = docentes.find(d => d.materiasIds?.includes(materiaId)) || docentes[0];

              const existente = matriculas.find(m =>
                m.estudianteId === estudiante.id &&
                m.materiaId === materiaId &&
                m.periodo === periodo
              );

              if (existente) {
                existente.notaFinalHistorica = nota;
                existente.estado = Utils.aprueba(materia, nota) ? 'aprobada' : 'reprobada';
                await DB.put('matriculas', existente);
              } else {
                await DB.add('matriculas', {
                  id: nextMatId++,
                  estudianteId: estudiante.id,
                  materiaId: materiaId,
                  docenteId: docente.id,
                  periodo: periodo,
                  semanaActual: 16,
                  estado: Utils.aprueba(materia, nota) ? 'aprobada' : 'reprobada',
                  notaFinalHistorica: nota
                });
                matriculasCreadas++;
              }
            }
          }

          const msg = `✅ ${estudiantesCreados} estudiantes, ${matriculasCreadas} matrículas` + (errores.length ? `\n⚠️ ${errores.length} detalles` : '');
          if (errores.length) console.warn('Detalles:', errores);
          Utils.toast(msg, estudiantesCreados > 0 ? 'success' : 'error', 6000);
          resolve({ estudiantesCreados, matriculasCreadas, errores });
        } catch (ex) {
          console.error('Error:', ex);
          Utils.toast('Error: ' + ex.message, 'error', 8000);
          reject(ex);
        }
      };
      reader.onerror = () => reject(new Error('Error al leer archivo'));
      reader.readAsArrayBuffer(file); // 🔑 Leer como ArrayBuffer para detectar codificación
    });
  },

  /* 🔑 Detecta si el archivo usa coma o punto y coma */
  _detectSeparator(line) {
    const commas = (line.match(/,/g) || []).length;
    const semis = (line.match(/;/g) || []).length;
    return semis > commas ? ';' : ',';
  },

  _getVarianteInstrumento(instrumento) {
    const inst = instrumento.toUpperCase();
    if (inst.includes('CANTO')) return 'CT';
    if (inst.includes('GUITARRA')) return 'GT';
    if (inst.includes('BAJO')) return 'BJ';
    if (inst.includes('BATER')) return 'BT';
    if (inst.includes('TECL')) return 'TC';
    return null;
  },

  /* 🔑 Parser mejorado que acepta el separador como parámetro */
  _parseCSVLine(line, separator = ',') {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') { inQuotes = !inQuotes; }
      else if (c === separator && !inQuotes) { result.push(current); current = ''; }
      else { current += c; }
    }
    result.push(current);
    return result;
  },

  _download(content, filename, type = 'text/csv;charset=utf-8') {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  },
  _dateStamp() { return new Date().toISOString().slice(0,10); }
};