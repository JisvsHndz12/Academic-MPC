Router.register('docente-dashboard', {
  title: '🎼 Mis Grupos',
  allowedRoles: ['docente'],
  render: renderDocenteDashboard
});
Router.register('docente-group', {
  title: '📋 Detalle de Grupo',
  allowedRoles: ['docente'],
  render: renderDocenteGroup
});

let _currentGroup = null;

async function renderDocenteDashboard(root, user) {
  const docente = await DB.get('docentes', user.personaRef);
  if (!docente) { root.innerHTML = '<div class="card"><h3>Error: docente no encontrado</h3></div>'; return; }

  const matriculas = (await DB.getAll('matriculas')).filter(m => m.docenteId === docente.id);
  const gruposMap = {};
  for (const m of matriculas) {
    const key = `${m.materiaId}||${m.periodo}`;
    if (!gruposMap[key]) gruposMap[key] = { materiaId: m.materiaId, periodo: m.periodo, count: 0 };
    gruposMap[key].count++;
  }
  const grupos = Object.values(gruposMap);

  root.innerHTML = `
    <div class="view-header">
      <div>
        <h3>Mis Grupos</h3>
        <span class="muted">${docente.nombres} ${docente.apellidos} · ${docente.cargaHoraria} HA · ${grupos.length} grupo(s)</span>
      </div>
    </div>
    <div class="grupos-grid" id="grupos-container">
      ${grupos.length === 0 ? '<div class="card" style="grid-column:1/-1;text-align:center;padding:40px"><h3>Sin grupos asignados</h3></div>' : ''}
    </div>
  `;

  const container = Utils.$('#grupos-container');
  for (const g of grupos) {
    const materia = await DB.get('materias', g.materiaId);
    if (!materia) continue;
    const horarios = (await DB.getAll('horarios')).filter(h => h.materiaId === g.materiaId && h.docenteId === docente.id && h.cohorte === g.periodo);
    const dias = [...new Set(horarios.map(h => h.dia))].join(', ');
    const card = Utils.el(`
      <div class="grupo-card">
        <div class="grupo-codigo">${materia.codigo}</div>
        <div class="grupo-materia">${materia.nombre}</div>
        <span class="badge ${materia.esEspecial?'warn':'success'}">${materia.esEspecial?'Especial (7)':'Regular (6)'}</span>
        <div class="grupo-meta">
          <span>📅 ${g.periodo}</span>
          <span>👥 ${g.count}</span>
          <span>🕐 ${dias||'—'}</span>
        </div>
      </div>
    `);
    card.onclick = () => { _currentGroup = { materiaId: g.materiaId, periodo: g.periodo }; Router.navigate('docente-group'); };
    container.appendChild(card);
  }
}

async function renderDocenteGroup(root, user) {
  if (!_currentGroup) { Router.navigate('docente-dashboard'); return; }
  const docente = await DB.get('docentes', user.personaRef);
  const materia = await DB.get('materias', _currentGroup.materiaId);
  const matriculas = (await DB.getAll('matriculas')).filter(m =>
    m.materiaId === _currentGroup.materiaId && m.docenteId === docente.id && m.periodo === _currentGroup.periodo
  );

  root.innerHTML = `
    <div class="view-header">
      <div>
        <button class="btn btn-sm btn-ghost" id="btn-volver">← Volver</button>
        <h3 style="margin-top:8px">${materia.nombre}</h3>
        <span class="muted">${materia.codigo} · ${_currentGroup.periodo} · ${matriculas.length} estudiante(s)</span>
      </div>
    </div>
    <div class="tabs">
      <div class="tab active" data-tab="asistencia">📋 Asistencia</div>
      <div class="tab" data-tab="rubrica">📝 Rúbrica</div>
      <div class="tab" data-tab="prueba">📄 Prueba</div>
      <div class="tab" data-tab="resumen">📊 Resumen</div>
    </div>
    <div id="tab-content"></div>
  `;

  Utils.$('#btn-volver').onclick = () => Router.navigate('docente-dashboard');
  const tabs = root.querySelectorAll('.tab');
  const switchTab = async (name) => {
    tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === name));
    const c = Utils.$('#tab-content');
    if (name === 'asistencia') await renderAsistenciaTab(c, docente, materia, matriculas);
    else if (name === 'rubrica') await renderRubricaTab(c, docente, materia, matriculas);
    else if (name === 'prueba') await renderPruebaTab(c, docente, materia, matriculas);
    else if (name === 'resumen') await renderResumenTab(c, docente, materia, matriculas);
  };
  tabs.forEach(t => t.onclick = () => switchTab(t.dataset.tab));
  await switchTab('asistencia');
}

/* ---- ASISTENCIA ---- */
async function renderAsistenciaTab(root, docente, materia, matriculas) {
  const allAsist = await DB.getAll('asistencia');
  let html = `<div class="card"><h3>Asistencia · 16 Semanas</h3>
    <p class="muted">16 asistencias = 10 pts (10% de rúbrica)</p>
    <div class="asistencia-wrap"><table class="asistencia-table"><thead><tr>
    <th class="sticky-col">Estudiante</th>`;
  for (let i = 1; i <= 16; i++) html += `<th>S${i}</th>`;
  html += `<th>Total</th><th>Nota</th></tr></thead><tbody>`;

  for (const m of matriculas) {
    const est = await DB.get('estudiantes', m.estudianteId);
    if (!est) continue;
    const semanas = new Set(allAsist.filter(a => a.matriculaId === m.id).map(a => a.semana));
    const total = semanas.size;
    const nota = ((total / 16) * 10).toFixed(1);
    html += `<tr><td class="sticky-col"><strong>${est.nombres}</strong> ${est.apellidos}</td>`;
    for (let s = 1; s <= 16; s++) {
      const p = semanas.has(s);
      html += `<td class="asistencia-cell ${p?'present':''}"><input type="checkbox" class="asistencia-check" data-mid="${m.id}" data-s="${s}" ${p?'checked':''}/></td>`;
    }
    html += `<td><strong>${total}/16</strong></td><td><span class="badge ${total>=13?'success':total>=10?'warn':'danger'}">${nota}</span></td></tr>`;
  }
  html += `</tbody></table></div></div>`;
  root.innerHTML = html;

  root.querySelectorAll('.asistencia-check').forEach(cb => {
    cb.onchange = async () => {
      const mid = +cb.dataset.mid, s = +cb.dataset.s;
      if (cb.checked) {
        await DB.add('asistencia', { matriculaId: mid, semana: s, fecha: Date.now() });
      } else {
        const a = (await DB.getAll('asistencia')).find(x => x.matriculaId === mid && x.semana === s);
        if (a) await DB.delete('asistencia', a.id);
      }
      await renderAsistenciaTab(root, docente, materia, matriculas);
    };
  });
}

/* ---- RÚBRICA ---- */
async function renderRubricaTab(root, docente, materia, matriculas) {
  let config = (await DB.getAll('config_rubricas')).find(c => c.materiaId === materia.id && c.docenteId === docente.id);
  if (!config) {
    config = { materiaId: materia.id, docenteId: docente.id, objetivos: [
      { nombre:'Técnica instrumental', peso:0.30 }, { nombre:'Lectura musical', peso:0.25 },
      { nombre:'Repertorio', peso:0.25 }, { nombre:'Actitud y disciplina', peso:0.20 }
    ]};
    config.id = await DB.add('config_rubricas', config);
  }
  const puntaje = { logrado:9.5, proceso:7, no:3 };
  const allRub = await DB.getAll('rubricas');

  let html = `<div class="rubrica-config">
    <div class="row" style="margin-bottom:12px"><h3 style="margin:0">Objetivos (90% de Rúbrica)</h3><div class="spacer"></div><button class="btn btn-sm btn-primary" id="add-obj">+ Objetivo</button></div>
    <div id="obj-list">`;
  config.objetivos.forEach((o, i) => {
    html += `<div class="objetivo-row" data-i="${i}"><input type="text" value="${o.nombre}" data-f="n"/><input type="number" step="0.05" min="0" max="1" value="${o.peso}" data-f="p"/><button class="btn-del" data-del="${i}">✕</button></div>`;
  });
  const suma = config.objetivos.reduce((s,o)=>s+o.peso,0);
  html += `</div><div style="margin-top:10px;text-align:right"><span class="muted">Suma: </span><strong id="sp">${suma.toFixed(2)}</strong><button class="btn btn-sm btn-success" id="save-cfg" style="margin-left:10px">Guardar</button></div></div>`;

  html += `<div class="card"><h3>Evaluación</h3><div class="table-wrap"><table class="eval-table"><thead><tr><th>Estudiante</th>`;
  config.objetivos.forEach(o => html += `<th>${o.nombre} <span class="muted">(${(o.peso*100).toFixed(0)}%)</span></th>`);
  html += `<th>Nota</th></tr></thead><tbody>`;

  for (const m of matriculas) {
    const est = await DB.get('estudiantes', m.estudianteId);
    if (!est) continue;
    let rub = allRub.find(r => r.matriculaId === m.id);
    if (!rub) {
      rub = { matriculaId: m.id, docenteId: docente.id, materiaId: materia.id, objetivos: config.objetivos.map(o=>({nombre:o.nombre,peso:o.peso,estado:'proceso'})) };
      rub.id = await DB.add('rubricas', rub);
    }
    let sP=0, sW=0;
    rub.objetivos.forEach(o => { sP += (o.peso||0)*(puntaje[o.estado]||7); sW += (o.peso||0); });
    const nota = sW>0 ? sP/sW : 0;
    html += `<tr data-mid="${m.id}"><td><strong>${est.nombres}</strong> ${est.apellidos}</td>`;
    rub.objetivos.forEach((o, i) => {
      html += `<td><select class="estado-select ${o.estado}" data-oi="${i}"><option value="logrado" ${o.estado==='logrado'?'selected':''}>✅ Logrado</option><option value="proceso" ${o.estado==='proceso'?'selected':''}>⚠️ Proceso</option><option value="no" ${o.estado==='no'?'selected':''}>❌ No Logra</option></select></td>`;
    });
    html += `<td><strong class="nota-final ${nota>=6?'aprobado':'reprobado'}">${nota.toFixed(2)}</strong></td></tr>`;
  }
  html += `</tbody></table></div></div>`;
  root.innerHTML = html;

  Utils.$('#add-obj').onclick = () => { config.objetivos.push({nombre:'Nuevo',peso:0.10}); renderRubricaTab(root,docente,materia,matriculas); };
  root.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { config.objetivos.splice(+b.dataset.del,1); renderRubricaTab(root,docente,materia,matriculas); });
  root.querySelectorAll('[data-f="n"]').forEach(inp => inp.oninput = () => { config.objetivos[+inp.closest('.objetivo-row').dataset.i].nombre = inp.value; });
  root.querySelectorAll('[data-f="p"]').forEach(inp => inp.oninput = () => { config.objetivos[+inp.closest('.objetivo-row').dataset.i].peso = +inp.value; Utils.$('#sp').textContent = config.objetivos.reduce((s,o)=>s+o.peso,0).toFixed(2); });
  Utils.$('#save-cfg').onclick = async () => { await DB.put('config_rubricas', config); Utils.toast('Guardado','success'); renderRubricaTab(root,docente,materia,matriculas); };
  root.querySelectorAll('.estado-select').forEach(sel => sel.onchange = async () => {
    const mid = +sel.closest('tr').dataset.mid;
    const rub = (await DB.getAll('rubricas')).find(r => r.matriculaId === mid);
    rub.objetivos[+sel.dataset.oi].estado = sel.value;
    sel.className = `estado-select ${sel.value}`;
    await DB.put('rubricas', rub);
    let sP=0,sW=0; rub.objetivos.forEach(o=>{sP+=(o.peso||0)*(puntaje[o.estado]||7);sW+=(o.peso||0);});
    const n = sW>0?sP/sW:0;
    const nf = sel.closest('tr').querySelector('.nota-final');
    nf.textContent = n.toFixed(2); nf.className = `nota-final ${n>=6?'aprobado':'reprobado'}`;
  });
}

/* ---- PRUEBA ---- */
async function renderPruebaTab(root, docente, materia, matriculas) {
  const allP = await DB.getAll('pruebas');
  let html = `<div class="card"><h3>Prueba Teórica (20%)</h3><p class="muted">Nota 1-10</p><div class="table-wrap"><table class="eval-table"><thead><tr><th>Estudiante</th><th>Nota</th><th>Fecha</th></tr></thead><tbody>`;
  for (const m of matriculas) {
    const est = await DB.get('estudiantes', m.estudianteId);
    if (!est) continue;
    const p = allP.find(x => x.matriculaId === m.id);
    html += `<tr data-mid="${m.id}"><td><strong>${est.nombres}</strong> ${est.apellidos}</td><td><input type="number" min="1" max="10" step="0.1" value="${p?.nota||''}" class="prueba-input" style="width:100px;padding:6px"/></td><td class="muted">${p?.fecha?new Date(p.fecha).toLocaleDateString():'—'}</td></tr>`;
  }
  html += `</tbody></table></div><div style="margin-top:16px;text-align:right"><button class="btn btn-primary" id="save-p">💾 Guardar</button></div></div>`;
  root.innerHTML = html;
  Utils.$('#save-p').onclick = async () => {
    for (const row of root.querySelectorAll('tr[data-mid]')) {
      const mid = +row.dataset.mid, nota = +row.querySelector('.prueba-input').value;
      if (!nota || nota<1 || nota>10) continue;
      const ex = (await DB.getAll('pruebas')).find(p => p.matriculaId === mid);
      if (ex) { ex.nota = nota; ex.fecha = Date.now(); await DB.put('pruebas', ex); }
      else await DB.add('pruebas', { matriculaId: mid, nota, fecha: Date.now() });
    }
    Utils.toast('Guardado','success'); renderPruebaTab(root,docente,materia,matriculas);
  };
}

/* ---- RESUMEN ---- */
async function renderResumenTab(root, docente, materia, matriculas) {
  const allA = await DB.getAll('asistencia'), allR = await DB.getAll('rubricas'), allP = await DB.getAll('pruebas');
  
  let html = `<div class="card"><h3>Resumen · ${materia.nombre}</h3>
    <p class="muted">Rúbrica 80% + Prueba 20% · Mín: ${materia.esEspecial ? 7 : 6}</p>
    <div class="table-wrap"><table class="eval-table"><thead><tr>
    <th>Estudiante</th><th>Asist</th><th>Rúbrica</th><th>Prueba</th><th>FINAL</th><th>Estado</th></tr></thead><tbody>`;
  
  for (const m of matriculas) {
    const est = await DB.get('estudiantes', m.estudianteId);
    if (!est) continue;
    
    const ac = allA.filter(a => a.matriculaId === m.id).length;
    const rub = allR.find(r => r.matriculaId === m.id);
    const pru = allP.find(p => p.matriculaId === m.id);
    const c = Utils.calcularNotaFinal({
      asistenciaCount: ac,
      objetivos: rub?.objetivos || [],
      pruebaNota: pru?.nota || 0,
      notaFinalHistorica: m.notaFinalHistorica
    });
    
    // 🔑 Usar la nueva regla con contexto de período
    const apr = Utils.aprueba(materia, c.final, m.periodo);
    
    html += `<tr><td><strong>${est.nombres}</strong> ${est.apellidos}</td>
      <td>${ac}/16</td>
      <td>${c.rubrica.toFixed(2)}</td>
      <td>${pru?.nota?.toFixed(1) || '—'}</td>
      <td><span class="nota-final ${apr ? 'aprobado' : 'reprobado'}">${c.final.toFixed(2)}</span></td>
      <td><span class="badge ${apr ? 'success' : 'danger'}">${apr ? 'Aprueba' : 'Reprueba'}</span></td></tr>`;
  }
  
  html += `</tbody></table></div></div>`;
  root.innerHTML = html;
}