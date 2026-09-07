import { getAll, addRecord, updateRecord, getByKey } from './db.js';

export const calculateFinalGrade = async (enrollmentId) => {
    // 1. Obtener Asistencia (16 semanas)
    // Asumimos estructura: attendance { enrollmentId, week (1-16), present (bool) }
    // En un caso real, filtraríamos por enrollmentId. Aquí simulamos el cálculo.

    // NOTA: Para simplificar la demo, asumimos que pasamos los datos crudos
    // Esta función recibe los datos necesarios para calcular

    return {
        attendanceScore: 0, // Se calcula abajo
        rubricScore: 0,
        theoryScore: 0,
        finalScore: 0,
        passed: false,
        message: ''
    };
};

// Regla: Nota Final = 80% Rúbrica + 20% Teórica
// Rúbrica = 10% Asistencia + 90% Objetivos
export const processEvaluation = (attendanceCount, rubricObjectivesAvg, theoryScore, subjectMinPass) => {
    // 1. Calcular nota de asistencia (Escala 1-10)
    // 16 clases = 10 puntos. Regla de 3 simple.
    const attendanceScore = (attendanceCount / 16) * 10;

    // Limitar a 10 max
    const safeAttendance = Math.min(attendanceScore, 10);

    // 2. Componente Rúbrica (Total 100% de la rúbrica)
    // La rúbrica completa vale "10 puntos" en la escala general antes del peso del 80%
    // Estructura interna de la rúbrica:
    // - Asistencia pesa 10% de la rúbrica -> (safeAttendance * 0.10)
    // - Objetivos pesan 90% de la rúbrica -> (rubricObjectivesAvg * 0.90)

    const rubricComponent = (safeAttendance * 0.10) + (rubricObjectivesAvg * 0.90);

    // 3. Nota Final Ponderada
    // 80% viene de la Rúbrica calculada arriba
    // 20% viene de la Prueba Teórica
    const finalScore = (rubricComponent * 0.80) + (theoryScore * 0.20);

    // Redondear a 2 decimales
    const finalFixed = Math.round(finalScore * 100) / 100;

    // 4. Validación Aprobación
    const passed = finalFixed >= subjectMinPass;

    return {
        attendanceScore: safeAttendance.toFixed(2),
        rubricTotal: rubricComponent.toFixed(2),
        finalScore: finalFixed,
        passed: passed,
        threshold: subjectMinPass
    };
};

// Helper para evaluar objetivos cualitativos
export const evaluateObjective = (level) => {
    switch(level) {
        case 'logrado': return 9.5; // Promedio 9-10
        case 'proceso': return 7.0; // Promedio 6-8
        case 'no_logra': return 3.0; // 1-5
        default: return 0;
    }
};