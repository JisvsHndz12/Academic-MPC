# 🎵 MusiKales Pro — Contexto del Sistema

## 1. Descripción General
- **Sistema**: Sistema Académico Web Frontend para gestión de calificaciones
- **Carrera**: Músico Profesional por Competencias (MPC)
- **Academia**: Musicales 2.0, C.A.
- **Registro MPPE**: R-202112020503-AR
- **Pensum**: Año 2021, régimen semestral
- **Total UC carrera**: 66 unidades de crédito

## 2. Arquitectura Técnica
- **Stack**: HTML5 + CSS3 + JavaScript Vanilla (sin frameworks)
- **Persistencia**: IndexedDB (sin backend)
- **Estructura modular**: Archivos separados por responsabilidad
- **Diseño**: Glassmorphism con temas claro/oscuro
- **Responsive**: Mobile-first (móvil, tablet, desktop)

### Estructura de carpetas:

musikales-pro/
├── index.html
├── CONTEXT.md
├── css/
│ ├── variables.css (temas claro/oscuro)
│ ├── glassmorphism.css (efectos visuales)
│ ├── layout.css (estructura general)
│ ├── components.css (botones, inputs, tablas)
│ ├── master.css (panel admin)
│ ├── docente.css (panel docente)
│ ├── estudiante.css (panel estudiante)
│ └── styles.css (orquestador)
├── js/
│ ├── db.js (IndexedDB + seed)
│ ├── utils.js (helpers + reglas de negocio)
│ ├── theme.js (toggle temas)
│ ├── auth.js (login + sesiones)
│ ├── router.js (navegación SPA)
│ ├── master.js (panel administrativo)
│ ├── docente.js (panel docente)
│ ├── estudiante.js (panel estudiante)
│ ├── data-io.js (import/export JSON/CSV)
│ └── app.js (bootstrap inicial)
└── assets/ (iconos, logo)


## 3. Reglas de Negocio (CRÍTICO)

### 3.1 Escala de Calificación
- **Rango**: 1 a 10 puntos
- **Nota mínima aprobatoria estándar**: 6 puntos
- **Nota mínima materias especiales**: 7 puntos

### 3.2 Regla Histórica de Aprobación (ACTUALIZADA)
- **Períodos anteriores a 2026-I** (2022-I, 2024-I, 2024-II, 2025-I, 2025-II):
  - TODO aprueba con **6 puntos** (pensum anterior, sin distinción especiales/regulares)
- **Períodos desde 2026-I en adelante** (2026-I, 2026-II, ...):
  - Materias **especiales**: mínimo **7 puntos**
  - Materias **regulares**: mínimo **6 puntos**
- **Excepción**: Si un estudiante de cohorte 2026-I cursa materias de semestres superiores (rezago/adelanto), esas materias se aprueban con 6 pts sin importar si son especiales.

### 3.3 Fórmula de Cálculo de Nota Final

Nota Final = Rúbrica (80%) + Prueba Teórica (20%)
Dentro de la Rúbrica (80%):
Asistencia: 10% (16 asistencias = 10 pts)
Objetivos: 90% (evaluación cualitativa)
Logrado: 9-10 pts
En Proceso: 6-8 pts
No Logra: 1-5 pts


### 3.4 Menciones Honoríficas (NUEVO)
- **CUM LAUDE**: 9.20 - 9.49
- **MAGNA CUM LAUDE**: 9.50 - 9.74
- **SUMMA CUM LAUDE**: 9.75 - 10.00

### 3.5 Materias Especiales (mínimo 7 desde 2026-I)
- Instrumento Principal (I, II, III, IV) - todas las variantes
- Teoría y Lenguaje Musical (I, II, III, IV)
- Armonía I
- Concierto de Grado

## 4. Pensum MPC (4 semestres)

### Semestre 1 (16 UC)
| Código | Asignatura | UC | Especial |
|--------|-----------|-----|----------|
| FEBIP I (BJ/BT/CT/GT/TC) | Instrumento Principal I | 3 | ✅ |
| FEBPCOM I | Piano Complementario I | 3 | ❌ |
| FEBAM I | Apreciación Musical I | 2 | ❌ |
| FEBTLM I | Teoría y Lenguaje Musical I | 2 | ✅ |
| FEBEV I | Educación Vocal I | 2 | ❌ |
| FEBPC I | Práctica Coral I | 2 | ❌ |
| FEPAM I | Agrupaciones Musicales I | 2 | ❌ |

### Semestre 2 (16 UC)
| Código | Asignatura | UC | Especial | Prelación |4 |
|--------|-----------|-----|----------|----------|
| FEBIP II (BJ/BT/CT/GT/TC) | Instrumento Principal II | 3 | ✅ | FEBIP I |
| FEBPCOM II | Piano Complementario II | 3 | ❌ | FEBPC斯巴) |
| FEBAM II | Apreciación Musical II | 2 | ❌ | FEBAM I |
| FEBTLM II | Teoría y Lenguaje Musical II | 2 | ✅ | FEBTLM I |
| FEBEV II | Educación Vocal II | 2 | ❌ | FEBEV I |
| FEBPC II | Práctica Coral II | 2 | ❌ | FEBPC I |
| FEPAM II | Agrupaciones Musicales II | 2 | ❌ | FEPAM I |

### Semestre 3 (16 UC)
| Código | Asignatura | UC | Especial | Prelación |
|--------|-----------|-----|----------|----------|
| FEBIP III (BJ/BT/CT/GT/TC) | Instrumento Principal III | 3 | ✅ | FEBIP II |
| FEPPIC I | Práctica Instrumental Colectiva I | 3 | ❌ | FEPAM II |
| FEBHM | Historia de la Música | 2 | ❌ | FEBAM II |
| FEBTLM III | Teoría y Lenguaje Musical III | 2 | ✅ | FEBTLM II |
| FEBEV III | Educación Vocal III | 2 | ❌ | FEBEV II |
| FEBPC III | Práctica Coral III | 2 | ❌ | FEBPC II |
| FEPAM III | Agrupaciones Musicales III | 2 | ❌ | FEPAM II |

### Semestre 4 (18 UC)
| Código | Asignatura | UC | Especial | Prelación |
|--------|-----------|-----|----------|----------|
| FEBIP IV (BJ/BT/CT/GT/TC) | Instrumento Principal IV | 3 | ✅ | FEBIP III |
| FEBA | Armonía I | 2 | ✅ | FEBPCOM II + FEBTLM III |
| FEPPIC II | Práctica Instrumental Colectiva II | 3 | ❌ | FEPPIC I |
| FEBTLM IV | Teoría y Lenguaje Musical IV | 2 | ✅ | FEBTLM III |
| FEBEV IV | Educación Vocal IV | 2 | ❌ | FEBEV III |
| FEBPC IV | Práctica Coral IV | 2 | ❌ | FEBPC III |
| FEPAM IV | Agrupaciones Musicales IV | 2 | ❌ | FEPAM III |
| FEBCG | Concierto de Grado | 2 | ✅ | — |

## 5. Estructura de Datos (IndexedDB)

### Stores:
- **usuarios**: login con roles (master/docente/estudiante)
- **estudiantes**: datos personales + cohorte (matrícula)
- **docentes**: datos + materias que imparte
- **materias**: código, nombre, créditos, semestre, esEspecial, prelaciones
- **matriculas**: relación estudiante-materia-docente + período + estado + notaFinalHistorica
- **horarios**: bloques de clase (día, hora, aula)
- **asistencia**: registro semanal (1-16)
- **rubricas**: evaluación por objetivos
- **pruebas**: nota de prueba teórica
- **config_rubricas**: configuración de objetivos por materia-docente
- **sesion**: usuario activo

### Campo clave: `notaFinalHistorica`
- Si tiene valor: se usa directamente como nota final (ignora cálculo de rúbrica)
- Si es null: se calcula normalmente con asistencia + objetivos + prueba

## 6. Roles y Permisos

### Master/Administrativo
- Control total: usuarios, estudiantes, docentes, materias, horarios
- Importación/exportación de datos
- Cuadro de Honor con menciones honoríficas

### Docente
- Ve sus grupos activos
- Registra asistencia semanal (16 semanas)
- Configura y llena rúbricas de evaluación
- Registra notas de prueba teórica
- Ve resumen de calificaciones

### Estudiante
- Ve su expediente académico completo
- Estadísticas: promedio, UC aprobadas/reprobadas, progreso
- Gráfico de calificaciones por materia
- Historial por semestre
- Detalle desglosado por materia
- Cuadro de Honor (solo lectura)

## 7. Períodos Históricos

| Período | Cohorte | Semestre cursado | Regla aprobación |
|---------|---------|------------------|------------------|
| 2022-I | 2022-I | 1 | Todo con 6 |
| 2022-II | 2022-I | 2 | Todo con 6 |
| 2023-I | 2022-I | 3 | Todo con 6 |
| 2023-II | 2022-I | 4 | Todo con 6 |
| 2024-I | 2024-I | 1 | Todo con 6 |
| 2024-II | 2024-II | 1 | Todo con 6 |
| 2025-I | 2025-I | 1 | Todo con 6 |
| 2025-II | 2025-II | 1 | Todo con 6 |
| 2026-I | 2026-I | 1 | 7 especiales / 6 regulares |
| 2026-II | 2026-II | 1 | 7 especiales / 6 regulares |

## 8. Docentes Activos (8)

1. Cristian González (TC, Piano, Historia, Armonía)
2. Leonel Rondón (Piano, TLM)
3. Jonathan Ortiz (BT)
4. Ricardo Barrios (GT)
5. José Serven (GT, BJ)
6. Gledis Camacaro (CT)
7. Jesús Hernández (CT, TLM)
8. Osluar Lermo (Coro/Educación Vocal)

## 9. Variantes de Instrumento Principal

- **BJ**: Bajo
- **BT**: Batería
- **CT**: Canto
- **GT**: Guitarra
- **TC**: Teclado

Cada variante tiene su propia materia (ej: FEBIP I (CT), FEBIP I (GT), etc.)

## 10. Flujo de Importación de Datos

### Fase 1: Estudiantes (CSV)
- Formato: nombres, apellidos, cédula, teléfono, matrícula, turno, correo

### Fase 2: Calificaciones históricas (CSV)
- Formato: matrícula_estudiante, codigo_materia, periodo, nota_final
- Se importa con `notaFinalHistorica` (no requiere rúbricas)

### Fase 3: Rúbricas (opcional, futuro)
- Para períodos actuales donde se requiere desglose completo

## 11. Estado Actual del Sistema

✅ Login con roles y sesiones
✅ Panel Master completo (CRUD + importación)
✅ Panel Docente (asistencia + rúbricas + pruebas)
✅ Panel Estudiante (expediente + estadísticas)
✅ Cuadro de Honor con menciones honoríficas
✅ Regla histórica de aprobación (6 antes de 2026-I, 7/6 desde 2026-I)
✅ Importación masiva de datos históricos
✅ Restauración automática de horarios
✅ Validación de prelaciones
✅ Temas claro/oscuro
✅ Responsive completo

## 12. Credenciales de Prueba

### Master
- admin / admin123
- coordinadora / coord123

### Docentes
- cgonzalez / doc123
- lrondon / doc123
- jortiz / doc123
- rbarrios / doc123
- jserven / doc123
- gcamacaro / doc123
- jhernandez / doc123
- olermo / doc123

### Estudiantes (ejemplos)
- v-34637158 / est123 (Andrea Valentina Castellanos)
- v-7210218 / est123 (Tiamara Magaly Nieves)

## 13. Reglas UI/UX

- **Glassmorphism**: fondos translúcidos, blur, bordes sutiles
- **Temas**: toggle claro/oscuro con variables CSS
- **Responsive**: mobile-first, sidebar colapsable en desktop, off-canvas en móvil
- **Feedback**: toasts para acciones, modales para formularios
- **Accesibilidad**: labels, aria-labels, contraste adecuado