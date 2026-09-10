const Utils = {
  $(sel, ctx = document) { return ctx.querySelector(sel); },
  $$(sel, ctx = document) { return [...ctx.querySelectorAll(sel)]; },
  el(html) {
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  },
  toast(msg, type = 'info', ms = 2800) {
    const root = Utils.$('#toast-root');
    const el = Utils.el(`<div class="toast ${type}"></div>`);
    el.textContent = msg;
    root.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 250); }, ms);
  },
  modal({ title = '', body = '', footer = '' }) {
    const root = Utils.$('#modal-root');
    Utils.$('#modal-title').textContent = title;
    Utils.$('#modal-body').innerHTML = body;
    Utils.$('#modal-footer').innerHTML = footer;
    root.hidden = false;
    const close = () => { root.hidden = true; };
    Utils.$('.modal-close').onclick = close;
    Utils.$('.modal-backdrop').onclick = close;
    return { close };
  },
  fmtNota(n) {
    if (n == null || isNaN(n)) return '—';
    return Number(n).toFixed(2);
  },

  /**
   * Calcula la nota final. Si la matrícula tiene notaFinalHistorica, la usa directamente.
   */
  calcularNotaFinal({ asistenciaCount = 0, objetivos = [], pruebaNota = 0, notaFinalHistorica = null }) {
    // Si hay nota histórica, usarla directamente
    if (notaFinalHistorica != null && !isNaN(notaFinalHistorica)) {
      const nota = Math.max(0, Math.min(10, Number(notaFinalHistorica)));
      return {
        asistenciaEscala10: 0, aporteAsistencia: 0,
        objetivosEscala10: 0, aporteObjetivos: 0,
        rubrica: 0, prueba: 0,
        final: nota,
        esHistorica: true
      };
    }

    // Cálculo normal (períodos actuales)
    const asistenciaEscala10 = Math.min(10, (asistenciaCount / 16) * 10);
    const aporteAsistencia = asistenciaEscala10 * 0.10;

    const puntajePorEstado = { logrado: 9.5, proceso: 7, no: 3 };
    let sumaObjetivos = 0, sumaPesos = 0;
    objetivos.forEach(o => {
      sumaObjetivos += (o.peso || 0) * (puntajePorEstado[o.estado] ?? 0);
      sumaPesos += (o.peso || 0);
    });
    const objetivosEscala10 = sumaPesos > 0 ? sumaObjetivos / sumaPesos : 0;
    const aporteObjetivos = objetivosEscala10 * 0.90;

    const rubrica = aporteAsistencia + aporteObjetivos;
    const prueba = Math.max(0, Math.min(10, Number(pruebaNota) || 0));
    const final = rubrica * 0.80 + prueba * 0.20;

    return {
      asistenciaEscala10, aporteAsistencia,
      objetivosEscala10, aporteObjetivos,
      rubrica, prueba, final,
      esHistorica: false
    };
  },

  /**
   * Determina si aprueba según la materia y el período.
   * 
   * REGLA:
   * - Períodos anteriores a 2026-I: TODO aprueba con 6 puntos (pensum anterior)
   * - Períodos >= 2026-I: Especiales con 7, regulares con 6
   * 
   * @param {Object} materia - { esEspecial, ... }
   * @param {Number} notaFinal - Nota final del estudiante
   * @param {String} periodoMatricula - Período de cursado (ej: "2024-I", "2026-I")
   * @returns {Boolean} true si aprueba
   */
  aprueba(materia, notaFinal, periodoMatricula = null) {
    // Si no se pasa período, usar lógica por defecto (retrocompatible)
    if (!periodoMatricula) {
      const min = materia?.esEspecial ? 7 : 6;
      return notaFinal >= min;
    }

    // Convertir período a número comparable
    const periodoNum = this._periodoANum(periodoMatricula);
    const corteNuevasReglas = 20261; // 2026-I

    // 🔑 Períodos anteriores a 2026-I: TODO aprueba con 6
    if (periodoNum < corteNuevasReglas) {
      return notaFinal >= 6;
    }

    // Períodos >= 2026-I: aplicar regla 7/6 según tipo de materia
    const min = materia?.esEspecial ? 7 : 6;
    return notaFinal >= min;
  },

  /**
   * Convierte un período a número comparable
   * "2022-I" → 20221, "2025-II" → 20252, "2026-I" → 20261
   */
  _periodoANum(periodo) {
    if (!periodo) return 0;
    const match = String(periodo).match(/(\d{4})\s*[-–]?\s*(I{1,2})/i);
    if (!match) return 0;
    const year = parseInt(match[1]);
    const sem = match[2].toUpperCase() === 'II' ? 2 : 1;
    return year * 10 + sem;
  },

  /**
   * Obtiene la mención honorífica según el promedio
   */
  getMencionHonorifica(promedio) {
    if (promedio >= 9.75) return { nombre: 'SUMMA CUM LAUDE', clase: 'summa', icono: '🏅' };
    if (promedio >= 9.50) return { nombre: 'MAGNA CUM LAUDE', clase: 'magna', icono: '🎖️' };
    if (promedio >= 9.20) return { nombre: 'CUM LAUDE', clase: 'cum', icono: '🎗️' };
    return null;
  },

  /**
   * Obtiene el mínimo aprobatorio para mostrar en UI
   */
  getMinimoAprobacion(materia, periodoMatricula = null) {
    if (!periodoMatricula) {
      return materia?.esEspecial ? 7 : 6;
    }
    const periodoNum = this._periodoANum(periodoMatricula);
    if (periodoNum < 20261) return 6;
    return materia?.esEspecial ? 7 : 6;
  }
};