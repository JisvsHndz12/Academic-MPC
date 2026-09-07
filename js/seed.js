import { getAll, saveMany } from "./db.js";

const users = [{ email: "admin@academic.local", password: "admin123", name: "Admin", role: "Administrador" }];
const courses = [
  { id: "armonia", name: "Armonía aplicada", teacher: "Mtra. Elena Ruiz", grade: 18, completed: true, competency: true },
  { id: "instrumento", name: "Instrumento principal", teacher: "Dr. Mateo Salas", grade: 17, completed: true, competency: true },
  { id: "ensamble", name: "Práctica de ensamble", teacher: "Mtro. Luis Vega", grade: 16, completed: false, competency: true },
  { id: "produccion", name: "Producción musical", teacher: "Lic. Nora Campos", grade: 15, completed: false, competency: false }
];

export async function seedDatabase() {
  if (!(await getAll("users")).length) await saveMany("users", users);
  if (!(await getAll("courses")).length) await saveMany("courses", courses);
}