Router.register('estudiante-dashboard', {
  title: '🎓 Mi Expediente',
  allowedRoles: ['estudiante'],
  async render(root, user) {
    const est = await DB.get('estudiantes', user.personaRef);
    if (!est) { root.innerHTML = '<div class="card"><h3>Error</h3></div>'; return; }

    const mats = (await DB.getAll('matriculas')).filter(m => m.estudianteId === est.id);
    const sub = await DB.getAll('materias');
    const allA = await DB.getAll('asistencia'), allR = await DB.getAll('rubricas'), allP = await DB.getAll('pruebas');

    // 🔑 CORRECCIÓN: Calcular UC correctamente según estado REAL
    let ucAprob = 0, ucReprob = 0, ucCurso = 0, sumaPond = 0, sumaUC = 0;
    const materiasData = [];

    for (const m of mats) {
      const mat = sub.find(s => s.id === m.materiaId);
      if (!mat) continue;

      const ac = allA.filter(a => a.matriculaId === m.id).length;
      const rub = allR.find(r => r.matriculaId === m.id);
      const pru = allP.find(p => p.matriculaId === m.id);

      // 🔑 PASAR notaFinalHistorica para que funcione con datos históricos
      const calc = Utils.calcularNotaFinal({
        asistenciaCount: ac,
        objetivos: rub?.objetivos || [],
        pruebaNota: pru?.nota || 0,
        notaFinalHistorica: m.notaFinalHistorica
      });

      // 🔑 PASAR el período para aplicar la regla histórica
      const apr = Utils.aprueba(mat, calc.final, m.periodo);

      // 🔑 CORRECCIÓN CLAVE: Usar m.notaFinalHistorica directamente para el promedio
      const notaParaPromedio = m.notaFinalHistorica ?? calc.final;

      // 🔑 Contar UC según estado REAL de la matrícula
      if (m.estado === 'aprobada') {
        ucAprob += mat.creditos;
        sumaPond += notaParaPromedio * mat.creditos;
        sumaUC += mat.creditos;
      } else if (m.estado === 'reprobada') {
        ucReprob += mat.creditos;
        sumaPond += notaParaPromedio * mat.creditos;
        sumaUC += mat.creditos;
      } else {
        // Materia en curso o sin estado definido
        ucCurso += mat.creditos;
      }

      materiasData.push({ matricula: m, materia: mat, calc, apr, asistCount: ac, rub, pru });
    }

    const promedio = sumaUC > 0 ? sumaPond / sumaUC : 0;
    const mencion = Utils.getMencionHonorifica(promedio);

    // Agrupar por semestre
    const bySemestre = {};
    materiasData.forEach(d => {
      const sem = d.materia.semestre || 1;
      if (!bySemestre[sem]) bySemestre[sem] = [];
      bySemestre[sem].push(d);
    });

    const inicial = est.nombres[0] + est.apellidos[0];

    root.innerHTML = `
      <div class="est-header">
        <div class="est-avatar">${inicial}</div>
        <div class="est-info">
          <h2>${est.nombres} ${est.apellidos}</h2>
          <div class="meta">
            <span>🎓 Matrícula: <strong>${est.matricula}</strong></span>
            <span>🕐 Turno: ${est.turno}</span>
            <span>📧 ${est.correo || '—'}</span>
          </div>
          ${mencion ? `<div class="mencion-destacada ${mencion.clase}">${mencion.icono} ${mencion.nombre}</div>` : ''}
        </div>
      </div>

      <div class="est-stats">
        <div class="est-stat">
          <div class="label">Promedio General</div>
          <div class="value ${promedio>=7?'good':promedio>=6?'warn':'bad'}">${promedio.toFixed(2)}</div>
        </div>
        <div class="est-stat">
          <div class="label">UC Aprobadas</div>
          <div class="value good">${ucAprob}</div>
        </div>
        <div class="est-stat">
          <div class="label">UC Reprobadas</div>
          <div class="value bad">${ucReprob}</div>
        </div>
        <div class="est-stat">
          <div class="label">UC En Curso</div>
          <div class="value warn">${ucCurso}</div>
        </div>
        <div class="est-stat">
          <div class="label">Progreso Carrera</div>
          <div class="value primary">${ucAprob} / 66 (${((ucAprob/66)*100).toFixed(0)}%)</div>
        </div>
      </div>

      <div class="est-tabs">
        <div class="est-tab active" data-tab="grafico">📊 Gráfico</div>
        <div class="est-tab" data-tab="historial">📚 Historial</div>
        <div class="est-tab" data-tab="detalle">🔍 Detalle</div>
        <div class="est-tab" data-tab="honor">🏆 Cuadro de Honor</div>
      </div>

      <div id="est-tab-content"></div>
    `;

    const tabs = root.querySelectorAll('.est-tab');
    const switchTab = (name) => {
      tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === name));
      const c = Utils.$('#est-tab-content');
      if (name === 'grafico') renderGrafico(c, materiasData);
      else if (name === 'historial') renderHistorial(c, bySemestre);
      else if (name === 'detalle') renderDetalle(c, materiasData);
      else if (name === 'honor') renderHonorEstudiante(c);
    };
    tabs.forEach(t => t.onclick = () => switchTab(t.dataset.tab));
    switchTab('grafico');
  }
});

function renderGrafico(root, data) {
  const maxNota = 10;
  root.innerHTML = `
    <div class="chart-card">
      <h3>Mis Calificaciones por Materia</h3>
      ${data.length === 0 ? '<p class="muted">Sin materias registradas aún.</p>' : `
        <div class="bar-chart">
          ${data.map(d => {
            const h = (d.calc.final / maxNota) * 100;
            const cls = d.apr ? 'aprobado' : 'reprobado';
            return `
              <div class="bar-item" title="${d.materia.nombre}: ${d.calc.final.toFixed(2)}">
                <div class="bar ${cls}" style="height:${h}%">
                  <div class="bar-value">${d.calc.final.toFixed(1)}</div>
                </div>
                <div class="bar-label">${d.materia.codigo.replace(/FEB|FEP/g,'')}</div>
              </div>
            `;
          }).join('')}
        </div>
        <div style="margin-top:16px;display:flex;gap:20px;justify-content:center;font-size:12px">
          <span><span style="display:inline-block;width:12px;height:12px;background:var(--success);border-radius:3px;vertical-align:middle"></span> Aprueba</span>
          <span><span style="display:inline-block;width:12px;height:12px;background:var(--danger);border-radius:3px;vertical-align:middle"></span> Reprueba</span>
        </div>
      `}
    </div>
  `;
}

function renderHistorial(root, bySem) {
  const semestres = Object.keys(bySem).sort((a,b) => a-b);
  root.innerHTML = `
    <div class="timeline">
      ${semestres.length === 0 ? '<div class="card"><p class="muted" style="text-align:center">Sin materias registradas</p></div>' : ''}
      ${semestres.map(sem => {
        const items = bySem[sem];
        const suma = items.reduce((s,d) => s + d.calc.final * d.materia.creditos, 0);
        const uc = items.reduce((s,d) => s + d.materia.creditos, 0);
        const promSem = uc > 0 ? suma / uc : 0;
        const aprobadas = items.filter(d => d.apr).length;
        return `
          <div class="semestre-block">
            <div class="semestre-header">
              <h4>📚 Semestre ${sem}</h4>
              <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
                <span class="muted" style="font-size:12px">${aprobadas}/${items.length} aprobadas</span>
                <span class="periodo">Promedio: ${promSem.toFixed(2)}</span>
              </div>
            </div>
            <div class="materias-list">
              ${items.map(d => `
                <div class="materia-row">
                  <div class="materia-info">
                    <span class="codigo">${d.materia.codigo}</span>
                    <div class="nombre">${d.materia.nombre}</div>
                  </div>
                  <div class="nota ${d.apr?'aprobado':'reprobado'}">${d.calc.final.toFixed(2)}</div>
                  <div class="asistencia-col">
                    ${d.matricula.notaFinalHistorica != null ? '📜 Histórica' : `📅 ${d.asistCount}/16`}
                  </div>
                  <div class="estado-col">
                    <span class="badge ${d.apr?'success':'danger'}">${d.apr?'✓ Aprueba':'✗ Reprueba'}</span>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

async function renderDetalle(root, data) {
  if (data.length === 0) {
    root.innerHTML = '<div class="card"><p class="muted" style="text-align:center">Sin materias registradas</p></div>';
    return;
  }

  root.innerHTML = `
    <div class="field" style="margin-bottom:16px">
      <label>Selecciona una materia para ver el desglose completo</label>
      <select id="sel-mat">
        ${data.map((d,i) => `<option value="${i}">${d.materia.codigo} — ${d.materia.nombre}</option>`).join('')}
      </select>
    </div>
    <div id="detalle-content"></div>
  `;

  const render = (idx) => {
    const d = data[idx];
    const { calc, mat, rub, pru, asistCount, matricula } = d;
    const objetivos = rub?.objetivos || [];
    const esHistorica = matricula.notaFinalHistorica != null;
    const minimo = Utils.getMinimoAprobacion(mat, matricula.periodo);

    Utils.$('#detalle-content').innerHTML = `
      <div class="detalle-materia">
        <div class="row" style="margin-bottom:16px">
          <div>
            <span class="badge info">${mat.codigo}</span>
            <h3 style="margin:6px 0 0">${mat.nombre}</h3>
            <span class="muted">
              Período: ${matricula.periodo} · Semestre ${mat.semestre} · ${mat.creditos} UC · 
              Mínimo aprobar: <strong>${minimo} pts</strong>
              ${mat.esEspecial && Utils._periodoANum(matricula.periodo) >= 20261 ? ' (Especial)' : ''}
            </span>
            ${esHistorica ? '<div style="margin-top:6px"><span class="badge warn">📜 Nota Histórica Importada</span></div>' : ''}
          </div>
          <div class="spacer"></div>
          <div style="text-align:right">
            <div class="muted">NOTA FINAL</div>
            <div class="nota-final ${d.apr?'aprobado':'reprobado'}" style="font-size:32px">${calc.final.toFixed(2)}</div>
            <span class="badge ${d.apr?'success':'danger'}">${d.apr?'✓ APRUEBA':'✗ REPRUEBA'}</span>
          </div>
        </div>

        ${esHistorica ? `
          <div class="card" style="background:rgba(245,158,11,.1);border-color:rgba(245,158,11,.3);padding:16px;margin-top:16px">
            <h4 style="margin:0 0 8px">📜 Nota Histórica</h4>
            <p style="margin:0;font-size:13px">Esta nota fue importada desde el récord académico oficial del período <strong>${matricula.periodo}</strong> y no tiene desglose de rúbrica disponible.</p>
          </div>
        ` : `
          <div class="desglose-grid">
            <div class="desglose-item">
              <div class="label">Asistencia</div>
              <div class="value">${asistCount}/16</div>
              <div class="muted" style="font-size:11px">${calc.asistenciaEscala10.toFixed(1)} pts → ${calc.aporteAsistencia.toFixed(2)} pts (10%)</div>
            </div>
            <div class="desglose-item">
              <div class="label">Objetivos (90% Rúbrica)</div>
              <div class="value">${calc.objetivosEscala10.toFixed(2)}</div>
              <div class="muted" style="font-size:11px">Aporte: ${calc.aporteObjetivos.toFixed(2)} pts</div>
            </div>
            <div class="desglose-item">
              <div class="label">Rúbrica Total (80%)</div>
              <div class="value">${calc.rubrica.toFixed(2)}</div>
              <div class="muted" style="font-size:11px">Aporte a final: ${(calc.rubrica*0.8).toFixed(2)} pts</div>
            </div>
            <div class="desglose-item">
              <div class="label">Prueba Teórica (20%)</div>
              <div class="value">${pru?.nota?.toFixed(1) || '—'}</div>
              <div class="muted" style="font-size:11px">Aporte: ${calc.prueba.toFixed(2)} pts</div>
            </div>
          </div>

          ${objetivos.length > 0 ? `
            <h4 style="margin:20px 0 10px">Objetivos Evaluados</h4>
            ${objetivos.map(o => {
              const est = o.estado === 'logrado' ? '✅ Logrado' : o.estado === 'proceso' ? '⚠️ En Proceso' : '❌ No Logra';
              const cls = o.estado === 'logrado' ? 'success' : o.estado === 'proceso' ? 'warn' : 'danger';
              return `
                <div class="objetivo-detail">
                  <div>${o.nombre} <span class="muted">(${(o.peso*100).toFixed(0)}%)</span></div>
                  <div><span class="badge ${cls}">${est}</span></div>
                  <div><strong>${o.estado==='logrado'?9.5:o.estado==='proceso'?7:3}</strong></div>
                </div>
              `;
            }).join('')}
          ` : '<p class="muted" style="margin-top:16px">El docente aún no ha configurado los objetivos de evaluación.</p>'}
        `}
      </div>
    `;
  };

  Utils.$('#sel-mat').onchange = (e) => render(+e.target.value);
  render(0);
}

/* ============ CUADRO DE HONOR (solo lectura para estudiante) ============ */
async function renderHonorEstudiante(root) {
  const [mats, est, sub] = await Promise.all([
    DB.getAll('matriculas'), DB.getAll('estudiantes'), DB.getAll('materias')
  ]);
  const periodos = [...new Set(mats.map(m => m.periodo))].filter(Boolean).sort().reverse();

  root.innerHTML = `
    <div class="card">
      <div class="row" style="margin-bottom:16px">
        <h3 style="margin:0">🏆 Cuadro de Honor</h3>
        <div class="spacer"></div>
        <select id="filtro-periodo-est" class="btn">
          <option value="">Todos los períodos</option>
          ${periodos.map(p => `<option value="${p}">${p}</option>`).join('')}
        </select>
      </div>
      <p class="muted">Ranking de mejores promedios ponderados por UC.</p>
      <div id="honor-est-content"></div>
    </div>
  `;

  const render = async () => {
    const filtro = Utils.$('#filtro-periodo-est').value;
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

        // 🔑 SOLO contar materias FINALIZADAS
        const estadoFinal = m.estado;
        if (estadoFinal !== 'aprobada' && estadoFinal !== 'reprobada') {
          ucEnCurso += materia.creditos;
          continue;
        }

        const asist = (await DB.getAll('asistencia')).filter(a => a.matriculaId === m.id);
        const rubricas = (await DB.getAll('rubricas')).filter(r => r.matriculaId === m.id);
        const pruebas = (await DB.getAll('pruebas')).filter(p => p.matriculaId === m.id);
        const objetivos = rubricas.flatMap(r => r.objetivos || []);
        const pruebaNota = pruebas.length ? pruebas[pruebas.length-1].nota : 0;

        // 🔑 PASAR notaFinalHistorica y período
        const calc = Utils.calcularNotaFinal({
          asistenciaCount: asist.length,
          objetivos,
          pruebaNota,
          notaFinalHistorica: m.notaFinalHistorica
        });

        sumaPonderada += calc.final * materia.creditos;
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
          mencion,
          ucAprobadas,
          ucReprobadas,
          ucEnCurso,
          ucTotal: sumaUC,
          materias: misMats.length
        });
      }
    }

    promedios.sort((a,b) => b.promedio - a.promedio);
    const top3 = promedios.slice(0, 3);
    const medals = ['🥇','🥈','🥉'];
    const classes = ['gold','silver','bronze'];

    Utils.$('#honor-est-content').innerHTML = `
      ${top3.length ? `
        <div class="honor-podium" style="margin:20px 0">
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
        <div style="text-align:center;padding:30px">
          <div style="font-size:48px;margin-bottom:10px">🎼</div>
          <p class="muted">Sin datos para este período</p>
        </div>
      `}
      <div class="table-wrap" style="margin-top:20px">
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
    `;
  };

  Utils.$('#filtro-periodo-est').onchange = render;
  await render();
}