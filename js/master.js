Router.register('master-dashboard', { title: '📊 Dashboard', allowedRoles: ['master'], render: renderMasterDashboard });
Router.register('master-students', { title: '🎓 Estudiantes', allowedRoles: ['master'], render: renderStudentsView });
Router.register('master-teachers', { title: '👨‍🏫 Docentes', allowedRoles: ['master'], render: renderTeachersView });
Router.register('master-subjects', { title: '📚 Materias', allowedRoles: ['master'], render: renderSubjectsView });
Router.register('master-enrollments', { title: '📝 Matrículas', allowedRoles: ['master'], render: renderEnrollmentsView });
Router.register('master-schedule', { title: '🗓️ Horarios', allowedRoles: ['master'], render: renderScheduleView });
Router.register('master-users', { title: '🔐 Usuarios', allowedRoles: ['master'], render: renderUsersView });
Router.register('master-honor', { title: '🏆 Cuadro de Honor', allowedRoles: ['master'], render: renderHonorRollView });

/* ============================================================
 *  DASHBOARD
 * ============================================================ */
async function renderMasterDashboard(root) {
  const [est, doc, mat, mater, hor] = await Promise.all([
    DB.getAll('estudiantes'), DB.getAll('docentes'),
    DB.getAll('matriculas'), DB.getAll('materias'),
    DB.getAll('horarios')
  ]);

  root.innerHTML = `
    <div class="view-header">
      <h3>Panel Administrativo</h3>
      <span class="muted">Período actual · ${new Date().toLocaleDateString('es-CR')}</span>
    </div>

    <div class="grid grid-cols-4" style="margin-bottom:20px">
      <div class="stat-card"><div class="stat-icon">🎓</div><div class="stat-value">${est.length}</div><div class="stat-label">Estudiantes</div></div>
      <div class="stat-card"><div class="stat-icon">👨‍🏫</div><div class="stat-value">${doc.length}</div><div class="stat-label">Docentes</div></div>
      <div class="stat-card"><div class="stat-icon">📚</div><div class="stat-value">${mater.length}</div><div class="stat-label">Materias</div></div>
      <div class="stat-card"><div class="stat-icon">📝</div><div class="stat-value">${mat.length}</div><div class="stat-label">Matrículas</div></div>
    </div>

    <div class="card" style="margin-bottom:20px">
      <h3>💾 Gestión de Datos</h3>
      <p class="muted">Backup completo o importación de base histórica.</p>
      <div class="row" style="margin-top:10px">
        <button class="btn btn-primary" id="btn-export">📥 Backup Completo</button>
        <button class="btn" id="btn-template">📋 Template Base JSON</button>
        <button class="btn" id="btn-import">📤 Importar JSON</button>
        <input type="file" id="file-import" accept=".json" style="display:none" />
      </div>
      <div style="margin-top:16px;padding-top:16px;border-top:1px solid var(--glass-border)">
        <h4 style="margin:0 0 8px;font-size:14px">🚀 Importación Base Histórica</h4>
        <p class="muted" style="font-size:12px">Importa el Excel completo con todos los estudiantes y sus notas históricas.</p>
        <div class="row">
          <button class="btn btn-sm btn-success" id="btn-imp-hist">🚀 Importar Base Histórica Completa</button>
          <input type="file" id="file-hist" accept=".csv" style="display:none" />
        </div>
      </div>
    </div>

    <div class="grid grid-cols-2">
      <div class="card">
        <h3>Accesos rápidos</h3>
        <div class="row" style="margin-top:10px; flex-direction:column; align-items:stretch">
          <button class="btn" data-go="master-students">➕ Gestionar estudiantes</button>
          <button class="btn" data-go="master-enrollments">📝 Ver matrículas</button>
          <button class="btn" data-go="master-schedule">🗓️ Ver horarios</button>
          <button class="btn" data-go="master-honor">🏆 Cuadro de Honor</button>
        </div>
      </div>
      <div class="card">
        <h3>Horarios registrados</h3>
        <p class="muted">${hor.length} bloque(s) de clase programado(s)</p>
        <div style="margin-top:10px">
          <button class="btn btn-primary" data-go="master-schedule">Ver cuadrante</button>
        </div>
      </div>
    </div>
  `;

  root.querySelectorAll('[data-go]').forEach(b => b.onclick = () => Router.navigate(b.dataset.go));
  Utils.$('#btn-export').onclick = () => DataIO.exportAll();
  Utils.$('#btn-template').onclick = () => DataIO.exportBaseTemplate();
  Utils.$('#btn-import').onclick = () => Utils.$('#file-import').click();
  Utils.$('#file-import').onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    const ok = await DataIO.importJSON(f);
    if (ok) setTimeout(() => location.reload(), 1000);
  };
  Utils.$('#btn-imp-hist').onclick = () => Utils.$('#file-hist').click();
  Utils.$('#file-hist').onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    if (!confirm('⚠️ Esto importará todos los estudiantes y sus notas históricas.\n\n¿Continuar?')) return;
    await DataIO.importBaseDatosHistorica(f);
    setTimeout(() => location.reload(), 2000);
  };
}

/* ============================================================
 *  ESTUDIANTES
 * ============================================================ */
async function renderStudentsView(root) {
  const estudiantes = await DB.getAll('estudiantes');
  root.innerHTML = `
    <div class="view-header">
      <h3>Estudiantes</h3>
      <div class="actions">
        <div class="search-bar"><span>🔍</span><input id="stu-search" placeholder="Buscar por nombre o cédula..." /></div>
        <button class="btn btn-primary" id="stu-new">+ Nuevo estudiante</button>
      </div>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Matrícula</th><th>Nombre completo</th><th>Cédula</th><th>Turno</th><th>Teléfono</th><th>Correo</th><th></th></tr></thead>
        <tbody id="stu-tbody"></tbody>
      </table>
    </div>
  `;

  const renderRows = (list) => {
    const tbody = Utils.$('#stu-tbody');
    if (!list.length) { tbody.innerHTML = `<tr><td colspan="7" class="muted" style="text-align:center;padding:24px">Sin estudiantes registrados</td></tr>`; return; }
    tbody.innerHTML = list.map(e => `
      <tr>
        <td><span class="badge info">${e.matricula}</span></td>
        <td><strong>${e.nombres}</strong> ${e.apellidos}</td>
        <td>${e.cedula}</td>
        <td>${e.turno}</td>
        <td>${e.telefono}</td>
        <td>${e.correo}</td>
        <td><div class="row-actions"><button class="btn btn-sm" data-edit="${e.id}">✏️</button><button class="btn btn-sm btn-danger" data-del="${e.id}">🗑️</button></div></td>
      </tr>
    `).join('');
    tbody.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => studentForm(+b.dataset.edit));
    tbody.querySelectorAll('[data-del]').forEach(b => b.onclick = () => studentDelete(+b.dataset.del));
  };

  renderRows(estudiantes);
  Utils.$('#stu-search').oninput = (e) => {
    const q = e.target.value.toLowerCase();
    renderRows(estudiantes.filter(x => `${x.nombres} ${x.apellidos} ${x.cedula} ${x.matricula}`.toLowerCase().includes(q)));
  };
  Utils.$('#stu-new').onclick = () => studentForm();
}

async function studentForm(id = null) {
  const item = id ? await DB.get('estudiantes', id) : { nombres:'', apellidos:'', cedula:'', telefono:'', matricula:'', turno:'Matutino', correo:'' };
  const { close } = Utils.modal({
    title: id ? 'Editar estudiante' : 'Nuevo estudiante',
    body: `
      <div class="form-grid cols-2">
        <div class="field"><label>Nombres</label><input id="f-nombres" value="${item.nombres}" /></div>
        <div class="field"><label>Apellidos</label><input id="f-apellidos" value="${item.apellidos}" /></div>
        <div class="field"><label>Cédula</label><input id="f-cedula" value="${item.cedula}" /></div>
        <div class="field"><label>Teléfono</label><input id="f-telefono" value="${item.telefono}" /></div>
        <div class="field"><label>Matrícula</label><input id="f-matricula" value="${item.matricula}" /></div>
        <div class="field"><label>Turno</label>
          <select id="f-turno">
            <option ${item.turno==='Matutino'?'selected':''}>Matutino</option>
            <option ${item.turno==='Vespertino'?'selected':''}>Vespertino</option>
            <option ${item.turno==='Nocturno'?'selected':''}>Nocturno</option>
          </select>
        </div>
        <div class="field" style="grid-column:1/-1"><label>Correo</label><input id="f-correo" type="email" value="${item.correo}" /></div>
      </div>
    `,
    footer: `<button class="btn btn-ghost" id="f-cancel">Cancelar</button><button class="btn btn-primary" id="f-save">Guardar</button>`
  });

  Utils.$('#f-cancel').onclick = close;
  Utils.$('#f-save').onclick = async () => {
    const data = {
      nombres: Utils.$('#f-nombres').value.trim(),
      apellidos: Utils.$('#f-apellidos').value.trim(),
      cedula: Utils.$('#f-cedula').value.trim(),
      telefono: Utils.$('#f-telefono').value.trim(),
      matricula: Utils.$('#f-matricula').value.trim(),
      turno: Utils.$('#f-turno').value,
      correo: Utils.$('#f-correo').value.trim()
    };
    if (!data.nombres || !data.apellidos || !data.cedula || !data.matricula) { Utils.toast('Complete los campos obligatorios', 'error'); return; }
    try {
      if (id) await DB.put('estudiantes', { ...item, ...data });
      else await DB.add('estudiantes', data);
      Utils.toast('Guardado correctamente', 'success'); close();
      renderStudentsView(Utils.$('#view-container'));
    } catch (ex) { Utils.toast('Error: ' + ex.message, 'error'); }
  };
}

async function studentDelete(id) {
  if (!confirm('¿Eliminar este estudiante? Se eliminarán también sus matrículas asociadas.')) return;
  const mats = (await DB.getAll('matriculas')).filter(m => m.estudianteId === id);
  for (const m of mats) await DB.delete('matriculas', m.id);
  await DB.delete('estudiantes', id);
  Utils.toast('Estudiante eliminado', 'success');
  renderStudentsView(Utils.$('#view-container'));
}

/* ============================================================
 *  DOCENTES
 * ============================================================ */
async function renderTeachersView(root) {
  const docentes = await DB.getAll('docentes');
  const materias = await DB.getAll('materias');
  root.innerHTML = `
    <div class="view-header">
      <h3>Docentes</h3>
      <div class="actions">
        <div class="search-bar"><span>🔍</span><input id="tea-search" placeholder="Buscar docente..." /></div>
        <button class="btn btn-primary" id="tea-new">+ Nuevo docente</button>
      </div>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Nombre</th><th>Cédula</th><th>Teléfono</th><th>Carga horaria</th><th>Materias</th><th></th></tr></thead>
        <tbody id="tea-tbody"></tbody>
      </table>
    </div>
  `;

  const renderRows = (list) => {
    const tbody = Utils.$('#tea-tbody');
    if (!list.length) { tbody.innerHTML = `<tr><td colspan="6" class="muted" style="text-align:center;padding:24px">Sin docentes</td></tr>`; return; }
    tbody.innerHTML = list.map(d => {
      const matsNames = (d.materiasIds || []).map(id => materias.find(m => m.id === id)?.codigo || '?').join(', ') || '—';
      return `
        <tr>
          <td><strong>${d.nombres}</strong> ${d.apellidos}</td>
          <td>${d.cedula}</td>
          <td>${d.telefono}</td>
          <td>${d.cargaHoraria} HA</td>
          <td><span class="muted">${matsNames}</span></td>
          <td><div class="row-actions"><button class="btn btn-sm" data-edit="${d.id}">✏️</button><button class="btn btn-sm btn-danger" data-del="${d.id}">🗑️</button></div></td>
        </tr>
      `;
    }).join('');
    tbody.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => teacherForm(+b.dataset.edit));
    tbody.querySelectorAll('[data-del]').forEach(b => b.onclick = () => teacherDelete(+b.dataset.del));
  };

  renderRows(docentes);
  Utils.$('#tea-search').oninput = (e) => {
    const q = e.target.value.toLowerCase();
    renderRows(docentes.filter(x => `${x.nombres} ${x.apellidos}`.toLowerCase().includes(q)));
  };
  Utils.$('#tea-new').onclick = () => teacherForm();
}

async function teacherForm(id = null) {
  const materias = await DB.getAll('materias');
  const item = id ? await DB.get('docentes', id) : { nombres:'', apellidos:'', cedula:'', telefono:'', cargaHoraria:0, materiasIds:[] };

  const grouped = {};
  materias.forEach(m => {
    const sem = m.semestre || 1;
    if (!grouped[sem]) grouped[sem] = [];
    grouped[sem].push(m);
  });

  const { close } = Utils.modal({
    title: id ? 'Editar docente' : 'Nuevo docente',
    body: `
      <div class="form-grid cols-2">
        <div class="field"><label>Nombres</label><input id="f-nombres" value="${item.nombres}" /></div>
        <div class="field"><label>Apellidos</label><input id="f-apellidos" value="${item.apellidos}" /></div>
        <div class="field"><label>Cédula</label><input id="f-cedula" value="${item.cedula}" /></div>
        <div class="field"><label>Teléfono</label><input id="f-telefono" value="${item.telefono}" /></div>
        <div class="field"><label>Carga horaria (HA/semana)</label><input id="f-carga" type="number" min="0" value="${item.cargaHoraria}" /></div>
        <div class="field" style="grid-column:1/-1">
          <label>Materias que imparte <span class="muted">(selecciona las asignaturas)</span></label>
          <div class="materias-selector">
            ${[1,2,3,4].map(sem => grouped[sem] ? `
              <div class="sem-header">Semestre ${sem}</div>
              ${grouped[sem].map(m => `
                <label class="materia-check-item">
                  <input type="checkbox" value="${m.id}" ${item.materiasIds?.includes(m.id)?'checked':''} />
                  <div>
                    <span class="codigo">${m.codigo}</span>
                    ${m.nombre}
                    ${m.esEspecial ? '<span class="especial-badge">ESP</span>' : ''}
                  </div>
                </label>
              `).join('')}
            ` : '').join('')}
          </div>
        </div>
      </div>
    `,
    footer: `<button class="btn btn-ghost" id="f-cancel">Cancelar</button><button class="btn btn-primary" id="f-save">Guardar</button>`
  });

  Utils.$('#f-cancel').onclick = close;
  Utils.$('#f-save').onclick = async () => {
    const matsIds = [...Utils.$$('.materias-selector input:checked')].map(c => +c.value);
    const data = {
      nombres: Utils.$('#f-nombres').value.trim(),
      apellidos: Utils.$('#f-apellidos').value.trim(),
      cedula: Utils.$('#f-cedula').value.trim(),
      telefono: Utils.$('#f-telefono').value.trim(),
      cargaHoraria: +Utils.$('#f-carga').value || 0,
      materiasIds: matsIds
    };
    if (!data.nombres || !data.cedula) { Utils.toast('Complete campos obligatorios','error'); return; }
    try {
      if (id) await DB.put('docentes', { ...item, ...data });
      else await DB.add('docentes', data);
      Utils.toast('Guardado','success'); close();
      renderTeachersView(Utils.$('#view-container'));
    } catch (ex) { Utils.toast('Error: '+ex.message,'error'); }
  };
}

async function teacherDelete(id) {
  if (!confirm('¿Eliminar este docente?')) return;
  await DB.delete('docentes', id);
  Utils.toast('Docente eliminado','success');
  renderTeachersView(Utils.$('#view-container'));
}

/* ============================================================
 *  MATERIAS
 * ============================================================ */
async function renderSubjectsView(root) {
  const materias = await DB.getAll('materias');
  root.innerHTML = `
    <div class="view-header"><h3>Materias del Pensum MPC</h3><div class="actions"><button class="btn btn-primary" id="sub-new">+ Nueva materia</button></div></div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Código</th><th>Nombre</th><th>Sem</th><th>UC</th><th>Tipo</th><th>Prelaciones</th><th></th></tr></thead>
        <tbody id="sub-tbody"></tbody>
      </table>
    </div>
  `;

  const tbody = Utils.$('#sub-tbody');
  if (!materias.length) tbody.innerHTML = `<tr><td colspan="7" class="muted" style="text-align:center;padding:24px">Sin materias</td></tr>`;
  else tbody.innerHTML = materias.map(m => `
    <tr>
      <td><span class="badge info">${m.codigo}</span></td>
      <td><strong>${m.nombre}</strong></td>
      <td>${m.semestre || '-'}</td>
      <td>${m.creditos}</td>
      <td><span class="badge ${m.esEspecial?'warn':'success'}">${m.esEspecial ? 'Especial (7)' : 'Regular (6)'}</span></td>
      <td class="muted">${m.prelaciones?.length ? m.prelaciones.join(', ') : '—'}</td>
      <td><div class="row-actions"><button class="btn btn-sm" data-edit="${m.id}">✏️</button><button class="btn btn-sm btn-danger" data-del="${m.id}">🗑️</button></div></td>
    </tr>
  `).join('');

  tbody.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => subjectForm(+b.dataset.edit));
  tbody.querySelectorAll('[data-del]').forEach(b => b.onclick = () => subjectDelete(+b.dataset.del));
  Utils.$('#sub-new').onclick = () => subjectForm();
}

async function subjectForm(id = null) {
  const item = id ? await DB.get('materias', id) : { codigo:'', nombre:'', creditos:2, semestre:1, esEspecial:false, prelaciones:[] };
  const todasMaterias = await DB.getAll('materias');

  const { close } = Utils.modal({
    title: id ? 'Editar materia' : 'Nueva materia',
    body: `
      <div class="form-grid cols-2">
        <div class="field"><label>Código</label><input id="f-codigo" value="${item.codigo}" /></div>
        <div class="field"><label>Nombre</label><input id="f-nombre" value="${item.nombre}" /></div>
        <div class="field"><label>Créditos (UC)</label><input id="f-creditos" type="number" min="1" value="${item.creditos}" /></div>
        <div class="field"><label>Semestre</label>
          <select id="f-semestre">
            ${[1,2,3,4].map(s => `<option value="${s}" ${item.semestre===s?'selected':''}>Semestre ${s}</option>`).join('')}
          </select>
        </div>
        <div class="field"><label>Tipo de asignatura</label>
          <select id="f-especial">
            <option value="false" ${!item.esEspecial?'selected':''}>Regular (mínimo 6)</option>
            <option value="true" ${item.esEspecial?'selected':''}>Especial (mínimo 7)</option>
          </select>
        </div>
        <div class="field" style="grid-column:1/-1">
          <label>Prelaciones (materias que debe aprobar antes)</label>
          <div id="f-prelaciones" style="display:grid;gap:6px;padding:10px;background:var(--glass-bg);border:1px solid var(--glass-border);border-radius:var(--radius-md);max-height:200px;overflow:auto">
            ${todasMaterias.filter(m => m.codigo !== item.codigo).map(m => `
              <label style="display:flex;gap:8px;align-items:center;cursor:pointer">
                <input type="checkbox" value="${m.codigo}" ${item.prelaciones?.includes(m.codigo)?'checked':''} />
                <span>${m.codigo} (Sem ${m.semestre})</span>
              </label>
            `).join('')}
          </div>
        </div>
      </div>
    `,
    footer: `<button class="btn btn-ghost" id="f-cancel">Cancelar</button><button class="btn btn-primary" id="f-save">Guardar</button>`
  });

  Utils.$('#f-cancel').onclick = close;
  Utils.$('#f-save').onclick = async () => {
    const prelaciones = [...Utils.$$('#f-prelaciones input:checked')].map(c => c.value);
    const data = {
      codigo: Utils.$('#f-codigo').value.trim(),
      nombre: Utils.$('#f-nombre').value.trim(),
      creditos: +Utils.$('#f-creditos').value || 1,
      semestre: +Utils.$('#f-semestre').value,
      esEspecial: Utils.$('#f-especial').value === 'true',
      prelaciones: prelaciones
    };
    if (!data.codigo || !data.nombre) { Utils.toast('Complete los campos','error'); return; }
    try {
      if (id) await DB.put('materias', { ...item, ...data });
      else await DB.add('materias', data);
      Utils.toast('Guardado','success'); close();
      renderSubjectsView(Utils.$('#view-container'));
    } catch (ex) { Utils.toast('Error: '+ex.message,'error'); }
  };
}

async function subjectDelete(id) {
  if (!confirm('¿Eliminar esta materia?')) return;
  await DB.delete('materias', id);
  Utils.toast('Materia eliminada','success');
  renderSubjectsView(Utils.$('#view-container'));
}

/* ============================================================
 *  MATRÍCULAS — VISTA SIMPLIFICADA (maestro-detalle)
 * ============================================================ */
let _selectedStudent = null;

async function renderEnrollmentsView(root) {
  const [estudiantes, materias] = await Promise.all([
    DB.getAll('estudiantes'), DB.getAll('materias')
  ]);

  estudiantes.sort((a, b) => {
    if (a.matricula !== b.matricula) return b.matricula.localeCompare(a.matricula);
    return (a.apellidos + a.nombres).localeCompare(b.apellidos + b.nombres);
  });

  root.innerHTML = `
    <div class="view-header">
      <h3>Matrículas por Estudiante</h3>
      <div class="actions">
        <div class="search-bar"><span>🔍</span><input id="enr-search" placeholder="Buscar estudiante..." /></div>
        <button class="btn btn-primary" id="enr-new">+ Nueva inscripción</button>
      </div>
    </div>
    <div class="enrollments-layout">
      <div class="enrollments-sidebar">
        <div class="enrollments-sidebar-header">
          <strong>${estudiantes.length}</strong> estudiantes
        </div>
        <div id="enr-students-list" class="enrollments-students-list"></div>
      </div>
      <div class="enrollments-detail" id="enr-detail">
        <div class="enrollments-empty">
          <div style="font-size:48px;margin-bottom:10px">👈</div>
          <h3>Selecciona un estudiante</h3>
          <p class="muted">Verás todas sus materias inscritas organizadas por período.</p>
        </div>
      </div>
    </div>
  `;

  const renderStudentsList = (filter = '') => {
    const list = Utils.$('#enr-students-list');
    const q = filter.toLowerCase();
    const filtered = estudiantes.filter(e =>
      `${e.nombres} ${e.apellidos} ${e.cedula} ${e.matricula}`.toLowerCase().includes(q)
    );

    const byCohorte = {};
    filtered.forEach(e => {
      if (!byCohorte[e.matricula]) byCohorte[e.matricula] = [];
      byCohorte[e.matricula].push(e);
    });

    const cohorteKeys = Object.keys(byCohorte).sort().reverse();
    list.innerHTML = cohorteKeys.map(c => `
      <div class="enr-cohorte-group">
        <div class="enr-cohorte-label">📅 ${c} <span class="muted">(${byCohorte[c].length})</span></div>
        ${byCohorte[c].map(e => `
          <div class="enr-student-item ${_selectedStudent === e.id ? 'active' : ''}" data-id="${e.id}">
            <div class="enr-student-name">${e.nombres} ${e.apellidos}</div>
            <div class="enr-student-meta">${e.cedula}</div>
          </div>
        `).join('')}
      </div>
    `).join('');

    list.querySelectorAll('.enr-student-item').forEach(item => {
      item.onclick = () => selectStudent(+item.dataset.id, estudiantes, materias);
    });
  };

  renderStudentsList();
  Utils.$('#enr-search').oninput = (e) => renderStudentsList(e.target.value);
  Utils.$('#enr-new').onclick = () => enrollmentForm();

  if (_selectedStudent) {
    selectStudent(_selectedStudent, estudiantes, materias);
  }
}

async function selectStudent(estudianteId, estudiantes, materias) {
  _selectedStudent = estudianteId;
  const estudiante = estudiantes.find(e => e.id === estudianteId);
  if (!estudiante) return;

  // Marcar como activo en la lista
  Utils.$$('.enr-student-item').forEach(i => i.classList.toggle('active', +i.dataset.id === estudianteId));

  const matriculas = (await DB.getAll('matriculas')).filter(m => m.estudianteId === estudianteId);
  const detail = Utils.$('#enr-detail');

  if (matriculas.length === 0) {
    detail.innerHTML = `
      <div class="enrollments-empty">
        <div style="font-size:48px;margin-bottom:10px">📭</div>
        <h3>${estudiante.nombres} ${estudiante.apellidos}</h3>
        <p class="muted">Este estudiante no tiene materias inscritas.</p>
      </div>
    `;
    return;
  }

  // 🔑 CORRECCIÓN: Calcular UC correctamente según estado REAL
  let ucAprob = 0, ucReprob = 0, ucCurso = 0, sumaPond = 0, sumaUC = 0;
  
  for (const m of matriculas) {
    const mat = materias.find(s => s.id === m.materiaId);
    if (!mat) continue;

    const nota = m.notaFinalHistorica ?? 0;

    // 🔑 CORRECCIÓN CLAVE: Contar UC según estado REAL de la matrícula
    if (m.estado === 'aprobada') {
      ucAprob += mat.creditos;
      sumaPond += nota * mat.creditos;
      sumaUC += mat.creditos;
    } else if (m.estado === 'reprobada') {
      ucReprob += mat.creditos;
      sumaPond += nota * mat.creditos;
      sumaUC += mat.creditos;
    } else {
      // Materia en curso o sin estado definido
      ucCurso += mat.creditos;
    }
  }

  const promedio = sumaUC > 0 ? sumaPond / sumaUC : 0;

  // Agrupar por período
  const byPeriodo = {};
  matriculas.forEach(m => {
    if (!byPeriodo[m.periodo]) byPeriodo[m.periodo] = [];
    byPeriodo[m.periodo].push(m);
  });
  const periodos = Object.keys(byPeriodo).sort();

  detail.innerHTML = `
    <div class="enr-detail-header">
      <div>
        <h3 style="margin:0">${estudiante.nombres} ${estudiante.apellidos}</h3>
        <div class="muted" style="margin-top:4px">
          <span class="badge info">${estudiante.matricula}</span>
          <span style="margin-left:8px">${estudiante.cedula}</span>
          <span style="margin-left:8px">${estudiante.turno}</span>
        </div>
      </div>
      <div class="enr-stats-mini">
        <div class="enr-stat-mini">
          <div class="label">Promedio</div>
          <div class="value ${promedio>=7?'good':promedio>=6?'warn':'bad'}">${promedio.toFixed(2)}</div>
        </div>
        <div class="enr-stat-mini">
          <div class="label">UC Aprob</div>
          <div class="value good">${ucAprob}</div>
        </div>
        <div class="enr-stat-mini">
          <div class="label">UC Reprob</div>
          <div class="value bad">${ucReprob}</div>
        </div>
        <div class="enr-stat-mini">
          <div class="label">UC Curso</div>
          <div class="value warn">${ucCurso}</div>
        </div>
      </div>
    </div>

    <div class="enr-periodos">
      ${periodos.map(p => {
        const matsPeriodo = byPeriodo[p];
        const ucPer = matsPeriodo.reduce((s, m) => {
          const mat = materias.find(x => x.id === m.materiaId);
          return s + (mat?.creditos || 0);
        }, 0);
        const sumaPer = matsPeriodo.reduce((s, m) => {
          const mat = materias.find(x => x.id === m.materiaId);
          return s + ((m.notaFinalHistorica || 0) * (mat?.creditos || 0));
        }, 0);
        const promPer = ucPer > 0 ? sumaPer / ucPer : 0;

        return `
          <div class="enr-periodo-block">
            <div class="enr-periodo-header">
              <h4>📅 ${p}</h4>
              <div class="muted">
                ${matsPeriodo.length} materia(s) · ${ucPer} UC · Promedio: <strong>${promPer.toFixed(2)}</strong>
              </div>
            </div>
            <div class="enr-materias-grid">
              ${matsPeriodo.map(m => {
                const mat = materias.find(x => x.id === m.materiaId);
                if (!mat) return '';
                const nota = m.notaFinalHistorica ?? 0;
                const apr = m.estado === 'aprobada';
                return `
                  <div class="enr-materia-card ${apr ? 'aprobada' : 'reprobada'}">
                    <div class="enr-materia-top">
                      <span class="badge info">${mat.codigo}</span>
                      <span class="enr-nota ${apr ? 'good' : 'bad'}">${nota.toFixed ? nota.toFixed(1) : nota}</span>
                    </div>
                    <div class="enr-materia-nombre">${mat.nombre}</div>
                    <div class="enr-materia-bottom">
                      <span class="muted">${mat.creditos} UC · Sem ${mat.semestre}</span>
                      <span class="badge ${apr ? 'success' : 'danger'}">${apr ? '✓ Aprob' : '✗ Reprob'}</span>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

async function enrollmentForm() {
  const [est, doc, sub, mats] = await Promise.all([
    DB.getAll('estudiantes'), DB.getAll('docentes'), DB.getAll('materias'), DB.getAll('matriculas')
  ]);

  const { close } = Utils.modal({
    title: 'Nueva inscripción',
    body: `
      <div class="form-grid">
        <div class="field"><label>Estudiante</label>
          <select id="f-est"><option value="">Seleccione...</option>${est.map(e => `<option value="${e.id}">${e.nombres} ${e.apellidos} (${e.matricula})</option>`).join('')}</select>
        </div>
        <div class="field"><label>Materia</label>
          <select id="f-sub"><option value="">Seleccione...</option>${sub.map(s => `<option value="${s.id}">${s.codigo} — ${s.nombre} (Sem ${s.semestre})</option>`).join('')}</select>
        </div>
        <div class="field"><label>Docente asignado</label>
          <select id="f-doc"><option value="">Seleccione materia primero</option></select>
        </div>
        <div class="field"><label>Período</label><input id="f-per" value="2026-II" /></div>
        <div id="prelaciones-warn" class="card" style="display:none;background:rgba(245,158,11,.1);border-color:rgba(245,158,11,.3);padding:12px">
          <strong style="color:var(--warning)">⚠️ Prelaciones no cumplidas:</strong>
          <div id="prelaciones-list" style="margin-top:6px;font-size:13px"></div>
        </div>
      </div>
    `,
    footer: `<button class="btn btn-ghost" id="f-cancel">Cancelar</button><button class="btn btn-primary" id="f-save">Inscribir</button>`
  });

  const updateDocentes = () => {
    const subId = +Utils.$('#f-sub').value;
    const docSelect = Utils.$('#f-doc');
    if (!subId) { docSelect.innerHTML = '<option>—</option>'; return; }
    const candidatos = doc.filter(d => (d.materiasIds||[]).includes(subId));
    docSelect.innerHTML = candidatos.length
      ? `<option value="">Seleccione...</option>` + candidatos.map(d => `<option value="${d.id}">${d.nombres} ${d.apellidos}</option>`).join('')
      : '<option value="">Sin docentes para esta materia</option>';
    checkPrelaciones();
  };

  const checkPrelaciones = async () => {
    const estId = +Utils.$('#f-est').value;
    const subId = +Utils.$('#f-sub').value;
    const warn = Utils.$('#prelaciones-warn');
    const list = Utils.$('#prelaciones-list');
    if (!estId || !subId) { warn.style.display = 'none'; return; }

    const materia = sub.find(s => s.id === subId);
    if (!materia?.prelaciones?.length) { warn.style.display = 'none'; return; }

    const matsEst = mats.filter(m => m.estudianteId === estId);
    const aprobadas = new Set();
    for (const m of matsEst) {
      const mat = sub.find(s => s.id === m.materiaId);
      if (!mat) continue;
      const nota = m.notaFinalHistorica ?? 0;
      // 🔑 Pasar el período de la matrícula para aplicar la regla correcta
      if (Utils.aprueba(mat, nota, m.periodo)) aprobadas.add(mat.codigo);
    }

    const noCumplidas = materia.prelaciones.filter(p => !aprobadas.has(p));
    if (noCumplidas.length > 0) {
      warn.style.display = 'block';
      list.innerHTML = noCumplidas.map(p => `<div>• <code>${p}</code></div>`).join('');
    } else {
      warn.style.display = 'none';
    }
  };

  Utils.$('#f-sub').addEventListener('change', updateDocentes);
  Utils.$('#f-est').addEventListener('change', checkPrelaciones);
  Utils.$('#f-cancel').onclick = close;
  Utils.$('#f-save').onclick = async () => {
    const data = {
      estudianteId: +Utils.$('#f-est').value,
      materiaId: +Utils.$('#f-sub').value,
      docenteId: +Utils.$('#f-doc').value,
      periodo: Utils.$('#f-per').value.trim(),
      semanaActual: 1,
      estado: 'activa'
    };
    if (!data.estudianteId || !data.materiaId || !data.docenteId) { Utils.toast('Complete todos los campos','error'); return; }
    await DB.add('matriculas', data);
    Utils.toast('Inscripción creada','success'); close();
    renderEnrollmentsView(Utils.$('#view-container'));
  };
}

/* ============================================================
 *  HORARIOS — Con restauración automática
 * ============================================================ */
async function renderScheduleView(root) {
  let [hor, sub, doc] = await Promise.all([DB.getAll('horarios'), DB.getAll('materias'), DB.getAll('docentes')]);

  if (hor.length === 0) {
    await restoreRealSchedule();
    hor = await DB.getAll('horarios');
    doc = await DB.getAll('docentes');
  }

  const dias = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const byDay = {};
  dias.forEach(d => byDay[d] = []);
  hor.forEach(h => { if (byDay[h.dia]) byDay[h.dia].push(h); });

  const parseH = (t) => {
    const p = t.trim().split(/\s+/);
    let [h,m] = p[0].split(':').map(Number);
    const mod = (p[1]||'').toUpperCase();
    if (h===12) h=0;
    if (mod==='PM'||mod==='M') h+=12;
    return h*60+m;
  };
  dias.forEach(d => byDay[d].sort((a,b) => parseH(a.horaInicio) - parseH(b.horaInicio)));

  root.innerHTML = `
    <div class="view-header"><h3>Horarios de Clases</h3><div class="actions"><button class="btn btn-primary" id="sch-new">+ Nuevo bloque</button></div></div>
    <div class="grid grid-cols-3" style="margin-bottom:20px">
      <div class="stat-card"><div class="stat-icon">📅</div><div class="stat-value">${hor.length}</div><div class="stat-label">Bloques totales</div></div>
      <div class="stat-card"><div class="stat-icon">👨‍🏫</div><div class="stat-value">${doc.length}</div><div class="stat-label">Docentes</div></div>
      <div class="stat-card"><div class="stat-icon">⏱️</div><div class="stat-value">${doc.reduce((s,d)=>s+(d.cargaHoraria||0),0)}</div><div class="stat-label">HA totales</div></div>
    </div>
    <div class="grid grid-cols-2" id="schedule-container"></div>
  `;

  const container = Utils.$('#schedule-container');
  for (const dia of dias) {
    const bloques = byDay[dia];
    const card = Utils.el(`
      <div class="card">
        <h3 style="font-size:16px;margin-bottom:12px">📅 ${dia}</h3>
        ${bloques.length === 0 ? '<p class="muted">Sin clases</p>' : ''}
        <div class="table-wrap">
          <table>
            <thead><tr><th>Hora</th><th>Materia</th><th>Docente</th><th>Aula</th><th>Cohorte</th></tr></thead>
            <tbody>
              ${bloques.map(b => {
                const m = sub.find(s => s.id === b.materiaId);
                const d = doc.find(x => x.id === b.docenteId);
                return `<tr>
                  <td><strong>${b.horaInicio} - ${b.horaFin}</strong></td>
                  <td><span class="badge info">${m?.codigo||'?'}</span> <span class="muted">${m?.nombre||''}</span></td>
                  <td>${d?.nombres||''} ${d?.apellidos||''}</td>
                  <td>${b.aula||'—'}</td>
                  <td><span class="muted">${b.cohorte||''}</span></td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `);
    container.appendChild(card);
  }

  Utils.$('#sch-new').onclick = () => scheduleForm();
}

async function restoreRealSchedule() {
  const scheduleData = [
    { docente:'Cristian González',  gen:'Instrumento Principal (TC)', cohorte:'2025-II',              dia:'Lunes',    hi:'5:15 PM',  hf:'6:50 PM',  aula:'A-101' },
    { docente:'Cristian González',  gen:'Instrumento Principal (TC)', cohorte:'2026-I (Interdiario)', dia:'Martes',   hi:'1:05 PM',  hf:'2:40 PM',  aula:'A-101' },
    { docente:'Cristian González',  gen:'Instrumento Principal (TC)', cohorte:'2025-I',               dia:'Martes',   hi:'5:15 PM',  hf:'6:50 PM',  aula:'A-102' },
    { docente:'Cristian González',  gen:'Instrumento Principal (TC)', cohorte:'2024-II',              dia:'Viernes',  hi:'1:05 PM',  hf:'2:40 PM',  aula:'A-103' },
    { docente:'Cristian González',  gen:'Instrumento Principal (TC)', cohorte:'2026-I (Intensivo)',   dia:'Sábado',   hi:'10:40 AM', hf:'12:15 PM', aula:'A-101' },
    { docente:'Cristian González',  gen:'Instrumento Principal (TC)', cohorte:'2026-I (Intensivo)',   dia:'Sábado',   hi:'9:00 AM',  hf:'10:35 AM', aula:'A-101' },
    { docente:'Cristian González',  gen:'Piano Complementario',       cohorte:'2026-I (Interdiario)', dia:'Jueves',   hi:'1:05 PM',  hf:'2:40 PM',  aula:'B-201' },
    { docente:'Cristian González',  gen:'Piano Complementario',       cohorte:'2026-I (Intensivo)',   dia:'Sábado',   hi:'1:05 PM',  hf:'2:40 PM',  aula:'B-201' },
    { docente:'Cristian González',  gen:'Historia de la Música',      cohorte:'2025-I',               dia:'Martes',   hi:'6:55 PM',  hf:'8:30 PM',  aula:'C-301' },
    { docente:'Cristian González',  gen:'Armonía',                    cohorte:'2024-II',              dia:'Viernes',  hi:'5:00 PM',  hf:'6:25 PM',  aula:'C-302' },
    { docente:'Leonel Rondón',      gen:'Piano Complementario',       cohorte:'2025-II',              dia:'Miércoles',hi:'5:15 PM',  hf:'6:50 PM',  aula:'B-201' },
    { docente:'Leonel Rondón',      gen:'Teoría Musical',             cohorte:'2025-I',               dia:'Jueves',   hi:'6:55 PM',  hf:'8:30 PM',  aula:'C-301' },
    { docente:'Leonel Rondón',      gen:'Teoría Musical',             cohorte:'2025-II',              dia:'Lunes',    hi:'6:55 PM',  hf:'8:30 PM',  aula:'C-301' },
    { docente:'Jonathan Ortiz',     gen:'Instrumento Principal (BT)', cohorte:'2025-II',              dia:'Lunes',    hi:'5:15 PM',  hf:'6:50 PM',  aula:'Sala BT' },
    { docente:'Jonathan Ortiz',     gen:'Instrumento Principal (BT)', cohorte:'2026-I (Interdiario)', dia:'Martes',   hi:'1:05 PM',  hf:'2:40 PM',  aula:'Sala BT' },
    { docente:'Jonathan Ortiz',     gen:'Instrumento Principal (BT)', cohorte:'2025-I',               dia:'Martes',   hi:'5:15 PM',  hf:'6:50 PM',  aula:'Sala BT' },
    { docente:'Jonathan Ortiz',     gen:'Instrumento Principal (BT)', cohorte:'2024-II',              dia:'Viernes',  hi:'1:05 PM',  hf:'2:40 PM',  aula:'Sala BT' },
    { docente:'Jonathan Ortiz',     gen:'Instrumento Principal (BT)', cohorte:'2026-I (Intensivo)',   dia:'Sábado',   hi:'10:40 AM', hf:'12:15 PM', aula:'Sala BT' },
    { docente:'Ricardo Barrios',    gen:'Instrumento Principal (GT)', cohorte:'2025-II',              dia:'Lunes',    hi:'5:15 PM',  hf:'6:50 PM',  aula:'Sala GT' },
    { docente:'Ricardo Barrios',    gen:'Instrumento Principal (GT)', cohorte:'2024-II',              dia:'Viernes',  hi:'1:05 PM',  hf:'2:40 PM',  aula:'Sala GT' },
    { docente:'Ricardo Barrios',    gen:'Instrumento Principal (GT)', cohorte:'2026-I (Intensivo)',   dia:'Sábado',   hi:'10:40 AM', hf:'12:15 PM', aula:'Sala GT' },
    { docente:'José Serven',        gen:'Instrumento Principal (GT)', cohorte:'2026-I (Interdiario)', dia:'Martes',   hi:'1:05 PM',  hf:'2:40 PM',  aula:'Sala GT' },
    { docente:'José Serven',        gen:'Instrumento Principal (BJ)', cohorte:'2025-I',               dia:'Martes',   hi:'5:15 PM',  hf:'6:50 PM',  aula:'Sala BJ' },
    { docente:'José Serven',        gen:'Instrumento Principal (BJ)', cohorte:'2026-I (Intensivo)',   dia:'Sábado',   hi:'10:40 AM', hf:'12:15 PM', aula:'Sala BJ' },
    { docente:'Gledis Camacaro',    gen:'Instrumento Principal (CT)', cohorte:'2025-II',              dia:'Lunes',    hi:'5:15 PM',  hf:'6:50 PM',  aula:'Sala Canto' },
    { docente:'Gledis Camacaro',    gen:'Instrumento Principal (CT)', cohorte:'2024-II',              dia:'Viernes',  hi:'2:45 PM',  hf:'4:20 PM',  aula:'Sala Canto' },
    { docente:'Jesús Hernández',    gen:'Instrumento Principal (CT)', cohorte:'2026-I (Interdiario)', dia:'Martes',   hi:'1:05 PM',  hf:'2:40 PM',  aula:'Sala Canto' },
    { docente:'Jesús Hernández',    gen:'Teoría Musical',             cohorte:'2026-I (Interdiario)', dia:'Martes',   hi:'2:45 PM',  hf:'4:20 PM',  aula:'C-301' },
    { docente:'Jesús Hernández',    gen:'Instrumento Principal (CT)', cohorte:'2025-I',               dia:'Martes',   hi:'5:15 PM',  hf:'6:50 PM',  aula:'Sala Canto' },
    { docente:'Jesús Hernández',    gen:'Teoría Musical',             cohorte:'2026-I (Intensivo)',   dia:'Sábado',   hi:'9:00 AM',  hf:'10:35 AM', aula:'C-301' },
    { docente:'Jesús Hernández',    gen:'Teoría Musical',             cohorte:'2024-II',              dia:'Viernes',  hi:'1:05 PM',  hf:'2:40 PM',  aula:'C-301' },
    { docente:'Jesús Hernández',    gen:'Teoría Musical',             cohorte:'2024-II',              dia:'Viernes',  hi:'2:45 PM',  hf:'4:20 PM',  aula:'C-301' },
    { docente:'Jesús Hernández',    gen:'Instrumento Principal (CT)', cohorte:'2026-I (Intensivo)',   dia:'Sábado',   hi:'10:40 AM', hf:'12:15 PM', aula:'Sala Canto' },
    { docente:'Jesús Hernández',    gen:'Instrumento Principal (CT)', cohorte:'2026-I (Intensivo)',   dia:'Sábado',   hi:'1:05 PM',  hf:'2:40 PM',  aula:'Sala Canto' },
    { docente:'Osluar Lermo',       gen:'Práctica Coral',             cohorte:'2025-II',              dia:'Miércoles',hi:'6:55 PM',  hf:'8:30 PM',  aula:'Coro' },
    { docente:'Osluar Lermo',       gen:'Práctica Coral',             cohorte:'2026-I (Interdiario)', dia:'Jueves',   hi:'2:45 PM',  hf:'4:20 PM',  aula:'Coro' },
    { docente:'Osluar Lermo',       gen:'Práctica Coral',             cohorte:'2025-I',               dia:'Jueves',   hi:'5:15 PM',  hf:'6:50 PM',  aula:'Coro' },
    { docente:'Osluar Lermo',       gen:'Práctica Coral',             cohorte:'2024-II',              dia:'Viernes',  hi:'6:30 PM',  hf:'7:40 PM',  aula:'Coro' },
    { docente:'Osluar Lermo',       gen:'Práctica Coral',             cohorte:'2026-I (Intensivo)',   dia:'Sábado',   hi:'2:45 PM',  hf:'4:20 PM',  aula:'Coro' },
  ];

  const materias = await DB.getAll('materias');
  const docentes = await DB.getAll('docentes');

  const semCohorte = { '2024-II':4, '2025-I':4, '2025-II':3, '2026-I':2, '2026-II':1 };
  const romanos = ['','I','II','III','IV'];

  function matId(gen, cohorte) {
    const sem = semCohorte[cohorte.replace(/\s*\(.*\)/,'')] || 1;
    const r = romanos[sem];
    const inst = gen.match(/\((BJ|BT|CT|GT|TC)\)/)?.[1] || '';
    if (gen.includes('Instrumento Principal')) { const f=materias.find(m=>m.codigo===`FEBIP ${r} (${inst})`); return f?.id; }
    if (gen.includes('Piano Complementario'))  { const f=materias.find(m=>m.codigo===`FEBPCOM ${r}`); return f?.id; }
    if (gen.includes('Historia'))              { return materias.find(m=>m.codigo==='FEBHM')?.id; }
    if (gen.includes('Armonía'))               { return materias.find(m=>m.codigo==='FEBA')?.id; }
    if (gen.includes('Teoría'))                { const f=materias.find(m=>m.codigo===`FEBTLM ${r}`); return f?.id; }
    if (gen.includes('Apreciación'))           { const f=materias.find(m=>m.codigo===`FEBAM ${r}`); return f?.id; }
    if (gen.includes('Práctica Coral'))        { const f=materias.find(m=>m.codigo===`FEBPC ${r}`); return f?.id; }
    if (gen.includes('Educación Vocal'))       { const f=materias.find(m=>m.codigo===`FEBEV ${r}`); return f?.id; }
    return null;
  }

  const docenteHA = {};
  const docenteMats = {};

  for (const item of scheduleData) {
    const doc = docentes.find(d => `${d.nombres} ${d.apellidos}` === item.docente);
    if (!doc) continue;
    const mId = matId(item.gen, item.cohorte);
    if (!mId) continue;

    const ha = DB._calcHA(item.hi, item.hf);
    docenteHA[doc.id] = (docenteHA[doc.id] || 0) + ha;
    if (!docenteMats[doc.id]) docenteMats[doc.id] = new Set();
    docenteMats[doc.id].add(mId);

    await DB.add('horarios', {
      materiaId: mId, docenteId: doc.id,
      dia: item.dia, horaInicio: item.hi, horaFin: item.hf,
      aula: item.aula, cohorte: item.cohorte
    });
  }

  for (const d of docentes) {
    d.cargaHoraria = docenteHA[d.id] || 0;
    d.materiasIds = docenteMats[d.id] ? [...docenteMats[d.id]] : d.materiasIds || [];
    await DB.put('docentes', d);
  }

  Utils.toast(`${scheduleData.length} bloques horarios restaurados`, 'success');
}

async function scheduleForm() {
  const [sub, doc] = await Promise.all([DB.getAll('materias'), DB.getAll('docentes')]);
  const dias = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const horas = ['07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00'];

  const { close } = Utils.modal({
    title: 'Nuevo bloque horario',
    body: `
      <div class="form-grid cols-2">
        <div class="field"><label>Materia</label><select id="f-sub">${sub.map(s => `<option value="${s.id}">${s.codigo} — ${s.nombre}</option>`).join('')}</select></div>
        <div class="field"><label>Docente</label><select id="f-doc">${doc.map(d => `<option value="${d.id}">${d.nombres} ${d.apellidos}</option>`).join('')}</select></div>
        <div class="field"><label>Día</label><select id="f-dia">${dias.map(d => `<option>${d}</option>`).join('')}</select></div>
        <div class="field"><label>Hora inicio</label><select id="f-hi">${horas.map(h => `<option>${h}</option>`).join('')}</select></div>
        <div class="field"><label>Hora fin</label><select id="f-hf">${horas.map(h => `<option>${h}</option>`).join('')}</select></div>
        <div class="field"><label>Aula</label><input id="f-aula" placeholder="Ej: A-101" /></div>
      </div>
    `,
    footer: `<button class="btn btn-ghost" id="f-cancel">Cancelar</button><button class="btn btn-primary" id="f-save">Guardar</button>`
  });

  Utils.$('#f-cancel').onclick = close;
  Utils.$('#f-save').onclick = async () => {
    await DB.add('horarios', {
      materiaId: +Utils.$('#f-sub').value,
      docenteId: +Utils.$('#f-doc').value,
      dia: Utils.$('#f-dia').value,
      horaInicio: Utils.$('#f-hi').value,
      horaFin: Utils.$('#f-hf').value,
      aula: Utils.$('#f-aula').value.trim()
    });
    Utils.toast('Bloque agregado','success'); close();
    renderScheduleView(Utils.$('#view-container'));
  };
}

/* ============================================================
 *  USUARIOS
 * ============================================================ */
async function renderUsersView(root) {
  const usuarios = await DB.getAll('usuarios');
  root.innerHTML = `
    <div class="view-header">
      <h3>Usuarios del Sistema</h3>
      <div class="actions">
        <div class="search-bar"><span>🔍</span><input id="usr-search" placeholder="Buscar usuario..." /></div>
        <button class="btn btn-primary" id="usr-new">+ Nuevo usuario</button>
      </div>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Usuario</th><th>Nombre</th><th>Rol</th><th>Estado</th><th>Último acceso</th><th></th></tr></thead>
        <tbody id="usr-tbody"></tbody>
      </table>
    </div>
  `;

  const renderRows = (list) => {
    const tbody = Utils.$('#usr-tbody');
    if (!list.length) { tbody.innerHTML = `<tr><td colspan="6" class="muted" style="text-align:center;padding:24px">Sin usuarios</td></tr>`; return; }
    tbody.innerHTML = list.map(u => `
      <tr>
        <td><code>@${u.username}</code></td>
        <td>${u.nombres} ${u.apellidos}</td>
        <td><span class="badge ${u.rol==='master'?'warn':u.rol==='docente'?'info':'success'}">${u.rol}</span></td>
        <td><span class="badge ${u.activo!==false?'success':'danger'}">${u.activo!==false?'Activo':'Inactivo'}</span></td>
        <td class="muted">${u.ultimoAcceso ? new Date(u.ultimoAcceso).toLocaleString() : 'Nunca'}</td>
        <td>
          <div class="row-actions">
            <button class="btn btn-sm" data-edit="${u.id}">✏️</button>
            <button class="btn btn-sm btn-primary" data-pass="${u.id}">🔑</button>
            ${u.username !== 'admin' ? `<button class="btn btn-sm btn-danger" data-del="${u.id}">🗑️</button>` : '<span class="muted">protegido</span>'}
          </div>
        </td>
      </tr>
    `).join('');
    tbody.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => userForm(+b.dataset.edit));
    tbody.querySelectorAll('[data-pass]').forEach(b => b.onclick = () => changePassword(+b.dataset.pass));
    tbody.querySelectorAll('[data-del]').forEach(b => b.onclick = () => userDelete(+b.dataset.del));
  };

  renderRows(usuarios);
  Utils.$('#usr-search').oninput = (e) => {
    const q = e.target.value.toLowerCase();
    renderRows(usuarios.filter(u => `${u.username} ${u.nombres} ${u.apellidos}`.toLowerCase().includes(q)));
  };
  Utils.$('#usr-new').onclick = () => userForm();
}

async function userForm(id = null) {
  const [est, doc] = await Promise.all([DB.getAll('estudiantes'), DB.getAll('docentes')]);
  const item = id ? await DB.get('usuarios', id) : { username:'', password:'', rol:'estudiante', personaRef:null, nombres:'', apellidos:'', activo:true };

  const { close } = Utils.modal({
    title: id ? 'Editar usuario' : 'Nuevo usuario',
    body: `
      <div class="form-grid cols-2">
        <div class="field"><label>Usuario</label><input id="f-username" value="${item.username}" ${id?'readonly':''} /></div>
        <div class="field"><label>Contraseña ${id?'(vacío = no cambiar)':''}</label><input id="f-password" type="text" value="" /></div>
        <div class="field"><label>Rol</label>
          <select id="f-rol">
            <option value="master" ${item.rol==='master'?'selected':''}>Master</option>
            <option value="docente" ${item.rol==='docente'?'selected':''}>Docente</option>
            <option value="estudiante" ${item.rol==='estudiante'?'selected':''}>Estudiante</option>
          </select>
        </div>
        <div class="field"><label>Estado</label>
          <select id="f-activo">
            <option value="true" ${item.activo!==false?'selected':''}>Activo</option>
            <option value="false" ${item.activo===false?'selected':''}>Inactivo</option>
          </select>
        </div>
        <div class="field"><label>Nombres</label><input id="f-nombres" value="${item.nombres}" /></div>
        <div class="field"><label>Apellidos</label><input id="f-apellidos" value="${item.apellidos}" /></div>
        <div class="field" style="grid-column:1/-1"><label>Persona asociada</label>
          <select id="f-persona"><option value="">— Ninguna —</option></select>
        </div>
      </div>
    `,
    footer: `<button class="btn btn-ghost" id="f-cancel">Cancelar</button><button class="btn btn-primary" id="f-save">Guardar</button>`
  });

  const updatePersona = () => {
    const rol = Utils.$('#f-rol').value;
    const sel = Utils.$('#f-persona');
    const list = rol === 'docente' ? doc : rol === 'estudiante' ? est : [];
    sel.innerHTML = '<option value="">— Ninguna —</option>' + list.map(p => `<option value="${p.id}" ${item.personaRef===p.id?'selected':''}>${p.nombres} ${p.apellidos}</option>`).join('');
  };
  Utils.$('#f-rol').addEventListener('change', updatePersona);
  updatePersona();
  Utils.$('#f-cancel').onclick = close;
  Utils.$('#f-save').onclick = async () => {
    const password = Utils.$('#f-password').value;
    if (!id && !password) { Utils.toast('Contraseña obligatoria','error'); return; }
    const data = {
      username: Utils.$('#f-username').value.trim().toLowerCase(),
      rol: Utils.$('#f-rol').value,
      activo: Utils.$('#f-activo').value === 'true',
      nombres: Utils.$('#f-nombres').value.trim(),
      apellidos: Utils.$('#f-apellidos').value.trim(),
      personaRef: +Utils.$('#f-persona').value || null
    };
    if (password) data.password = password;
    if (!data.nombres || !data.apellidos) { Utils.toast('Nombre y apellido obligatorios','error'); return; }
    try {
      if (id) await DB.put('usuarios', { ...item, ...data });
      else await DB.add('usuarios', data);
      Utils.toast('Guardado','success'); close();
      renderUsersView(Utils.$('#view-container'));
    } catch (ex) { Utils.toast('Error: '+ex.message,'error'); }
  };
}

async function changePassword(userId) {
  const user = await DB.get('usuarios', userId);
  if (!user) return;

  const { close } = Utils.modal({
    title: `Cambiar contraseña de @${user.username}`,
    body: `
      <div class="form-grid">
        <div class="field"><label>Nueva contraseña</label><input id="f-newpass" type="text" /></div>
        <div class="row">
          <button class="btn btn-sm" id="f-generate">🎲 Generar</button>
          <button class="btn btn-sm" id="f-copy">📋 Copiar</button>
        </div>
      </div>
    `,
    footer: `<button class="btn btn-ghost" id="f-cancel">Cancelar</button><button class="btn btn-primary" id="f-save">Guardar</button>`
  });

  Utils.$('#f-generate').onclick = () => {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let pass = '';
    for (let i = 0; i < 8; i++) pass += chars[Math.floor(Math.random() * chars.length)];
    Utils.$('#f-newpass').value = pass;
  };
  Utils.$('#f-copy').onclick = () => {
    navigator.clipboard.writeText(Utils.$('#f-newpass').value).then(() => Utils.toast('Copiada','success'));
  };
  Utils.$('#f-cancel').onclick = close;
  Utils.$('#f-save').onclick = async () => {
    const newPass = Utils.$('#f-newpass').value.trim();
    if (!newPass) { Utils.toast('Ingrese contraseña','error'); return; }
    user.password = newPass;
    await DB.put('usuarios', user);
    Utils.toast('Contraseña actualizada','success');
    close();
  };
}

async function userDelete(id) {
  if (!confirm('¿Eliminar este usuario?')) return;
  await DB.delete('usuarios', id);
  Utils.toast('Eliminado','success');
  renderUsersView(Utils.$('#view-container'));
}

/* ============================================================
 *  CUADRO DE HONOR — Con menciones honoríficas
 * ============================================================ */
async function renderHonorRollView(root) {
  const [mats, est, sub] = await Promise.all([
    DB.getAll('matriculas'), DB.getAll('estudiantes'), DB.getAll('materias')
  ]);
  const periodos = [...new Set(mats.map(m => m.periodo))].filter(Boolean).sort().reverse();

  root.innerHTML = `
    <div class="view-header">
      <h3>🏆 Cuadro de Honor</h3>
      <div class="actions">
        <select id="filtro-periodo" class="btn">
          <option value="">Todos los períodos</option>
          ${periodos.map(p => `<option value="${p}">${p}</option>`).join('')}
        </select>
      </div>
    </div>
    <div id="honor-content"></div>
  `;

  const render = async () => {
    const filtro = Utils.$('#filtro-periodo').value;
    const matsFiltradas = filtro ? mats.filter(m => m.periodo === filtro) : mats;

    const promedios = [];
    for (const e of est) {
      const misMats = matsFiltradas.filter(m => m.estudianteId === e.id);
      if (!misMats.length) continue;

      let sumaPonderada = 0, sumaUC = 0;
      let ucAprobadas = 0, ucReprobadas = 0, ucEnCurso = 0;

      for (const m of misMats) {
        const materia = sub.find(s => s.id === m.materiaId);
        if (!materia) continue;

        const estadoFinal = m.estado;
        if (estadoFinal !== 'aprobada' && estadoFinal !== 'reprobada') {
          ucEnCurso += materia.creditos;
          continue;
        }

        const nota = m.notaFinalHistorica ?? 0;
        sumaPonderada += nota * materia.creditos;
        sumaUC += materia.creditos;

        if (estadoFinal === 'aprobada') ucAprobadas += materia.creditos;
        else if (estadoFinal === 'reprobada') ucReprobadas += materia.creditos;
      }

      if (sumaUC > 0) {
        const promedio = sumaPonderada / sumaUC;
        const mencion = Utils.getMencionHonorifica(promedio);
        promedios.push({
          estudiante: e,
          promedio,
          ucAprobadas,
          ucReprobadas,
          ucEnCurso,
          ucTotal: sumaUC,
          materias: misMats.length,
          mencion
        });
      }
    }

    promedios.sort((a,b) => b.promedio - a.promedio);
    const top3 = promedios.slice(0, 3);
    const medals = ['🥇','🥈','🥉'];
    const classes = ['gold','silver','bronze'];

    Utils.$('#honor-content').innerHTML = `
      ${top3.length ? `
        <div class="honor-podium">
          ${top3.map((p, i) => `
            <div class="honor-place ${classes[i]}">
              <div class="honor-medal">${medals[i]}</div>
              <div class="honor-name">${p.estudiante.nombres} ${p.estudiante.apellidos}</div>
              <div class="muted">${p.estudiante.matricula}</div>
              <div class="honor-average">${p.promedio.toFixed(2)}</div>
              ${p.mencion ? `<div class="honor-mencion ${p.mencion.clase}">${p.mencion.icono} ${p.mencion.nombre}</div>` : ''}
              <div class="muted">${p.ucAprobadas} UC aprobadas</div>
            </div>
          `).join('')}
        </div>
      ` : `
        <div class="card" style="text-align:center;padding:40px">
          <div style="font-size:48px;margin-bottom:10px">🎼</div>
          <h3>Sin datos para este período</h3>
          <p class="muted">Seleccione otro período o espere a que se registren evaluaciones.</p>
        </div>
      `}
      <div class="card" style="margin-top:20px">
        <h3>Ranking completo ${filtro ? `· ${filtro}` : ''}</h3>
        <div class="table-wrap" style="margin-top:10px">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Estudiante</th>
                <th>Matrícula</th>
                <th>UC Aprob</th>
                <th>UC Reprob</th>
                <th>UC Curso</th>
                <th>Promedio</th>
                <th>Mención</th>
              </tr>
            </thead>
            <tbody>
              ${promedios.length ? promedios.map((p,i) => `
                <tr>
                  <td><strong>${i+1}</strong></td>
                  <td>${p.estudiante.nombres} ${p.estudiante.apellidos}</td>
                  <td><span class="badge info">${p.estudiante.matricula}</span></td>
                  <td><span style="color:var(--success);font-weight:700">${p.ucAprobadas}</span></td>
                  <td><span style="color:var(--danger);font-weight:700">${p.ucReprobadas}</span></td>
                  <td><span style="color:var(--warning);font-weight:700">${p.ucEnCurso}</span></td>
                  <td><strong style="color:var(--primary)">${p.promedio.toFixed(2)}</strong></td>
                  <td>${p.mencion ? `<span class="mencion-badge ${p.mencion.clase}">${p.mencion.icono} ${p.mencion.nombre}</span>` : '<span class="muted">—</span>'}</td>
                </tr>
              `).join('') : `<tr><td colspan="8" class="muted" style="text-align:center;padding:20px">Sin datos</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
    `;
  };

  Utils.$('#filtro-periodo').onchange = render;
  await render();
}