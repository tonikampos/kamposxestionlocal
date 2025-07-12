import { realtimeDatabaseManager } from '../firebase/realtimeDatabaseManager';
import type { 
  Alumno, 
  Asignatura, 
  Matricula, 
  NotaAlumno,
  Profesor
} from './storageManager';

// Ya no necesitamos una constante para controlar el uso de Firebase, siempre usamos Firebase
const USE_FIREBASE = true;

/**
 * DataManager - Clase que utiliza Firebase Realtime Database para todas las operaciones
 * 
 * Este manager usa exclusivamente Firebase Realtime Database para:
 * - Gestión de usuarios (profesores)
 * - Gestión de alumnos, asignaturas, matrículas y notas
 */
class DataManager {
  constructor() {
    console.log('DataManager inicializado con Firebase Realtime Database');
  }
  
  // GESTIÓN DE PROFESORES
  
  async registerProfesor(profesor: Omit<Profesor, "id">): Promise<string> {
    return realtimeDatabaseManager.registerProfesor(profesor);
  }
  
  async loginProfesor(email: string, password: string): Promise<Profesor> {
    return realtimeDatabaseManager.loginProfesor(email, password);
  }
  
  async logoutProfesor(): Promise<void> {
    return realtimeDatabaseManager.logoutProfesor();
  }
  
  // GESTIÓN DE ALUMNOS
  
  async getAlumnosByProfesor(profesorId: string): Promise<Alumno[]> {
    console.log('dataManager: obteniendo alumnos para el profesor', profesorId);
    return realtimeDatabaseManager.getAlumnosByProfesor(profesorId);
  }
  
  async addAlumno(alumno: Omit<Alumno, "id" | "createdAt" | "updatedAt">): Promise<string> {
    console.log('dataManager: añadiendo un nuevo alumno', alumno);
    return realtimeDatabaseManager.addAlumno(alumno);
  }
  
  async addMultipleAlumnos(alumnos: Omit<Alumno, "id" | "createdAt" | "updatedAt">[]): Promise<string[]> {
    console.log(`dataManager: añadiendo ${alumnos.length} alumnos`);
    return realtimeDatabaseManager.addMultipleAlumnos(alumnos);
  }
  
  async updateAlumno(alumno: Alumno): Promise<void> {
    console.log('dataManager: actualizando alumno', alumno.id);
    return realtimeDatabaseManager.updateAlumno(alumno);
  }
  
  async deleteAlumno(id: string): Promise<void> {
    console.log('dataManager: eliminando alumno', id);
    return realtimeDatabaseManager.deleteAlumno(id);
  }
  
  async getAlumnoById(id: string): Promise<Alumno | undefined> {
    return realtimeDatabaseManager.getAlumnoById(id);
  }
  
  // GESTIÓN DE ASIGNATURAS
  
  async getAsignaturasByProfesor(profesorId: string): Promise<Asignatura[]> {
    console.log('dataManager: obteniendo asignaturas para el profesor', profesorId);
    return realtimeDatabaseManager.getAsignaturasByProfesor(profesorId);
  }
  
  async addAsignatura(asignatura: Omit<Asignatura, "id" | "createdAt" | "updatedAt">): Promise<string> {
    console.log('dataManager: añadiendo una nueva asignatura', asignatura);
    return realtimeDatabaseManager.addAsignatura(asignatura);
  }
  
  async updateAsignatura(asignatura: Asignatura): Promise<void> {
    console.log('dataManager: actualizando asignatura', asignatura.id);
    return realtimeDatabaseManager.updateAsignatura(asignatura);
  }
  
  async deleteAsignatura(id: string): Promise<void> {
    console.log('dataManager: eliminando asignatura', id);
    return realtimeDatabaseManager.deleteAsignatura(id);
  }
  
  async getAsignaturaById(id: string): Promise<Asignatura | undefined> {
    return realtimeDatabaseManager.getAsignaturaById(id);
  }
  
  // GESTIÓN DE MATRÍCULAS
  
  async matricularAlumno(alumnoId: string, asignaturaId: string): Promise<string> {
    console.log('dataManager: matriculando alumno', alumnoId, 'en asignatura', asignaturaId);
    return realtimeDatabaseManager.matricularAlumno(alumnoId, asignaturaId);
  }
  
  async getMatriculasByAsignatura(asignaturaId: string): Promise<Matricula[]> {
    console.log('dataManager: obteniendo matrículas para la asignatura', asignaturaId);
    return realtimeDatabaseManager.getMatriculasByAsignatura(asignaturaId);
  }
  
  async getMatriculasByAlumno(alumnoId: string): Promise<Matricula[]> {
    console.log('dataManager: obteniendo matrículas para el alumno', alumnoId);
    return realtimeDatabaseManager.getMatriculasByAlumno(alumnoId);
  }
  
  async eliminarMatricula(alumnoId: string, asignaturaId: string): Promise<void> {
    console.log('dataManager: eliminando matrícula de alumno', alumnoId, 'en asignatura', asignaturaId);
    return realtimeDatabaseManager.eliminarMatricula(alumnoId, asignaturaId);
  }
  
  // GESTIÓN DE NOTAS
  
  async getNotaAlumno(alumnoId: string, asignaturaId: string): Promise<NotaAlumno | null> {
    return realtimeDatabaseManager.getNotaAlumno(alumnoId, asignaturaId);
  }
  
  async initNotaAlumno(alumnoId: string, asignaturaId: string): Promise<NotaAlumno> {
    console.log('dataManager: inicializando nota para alumno', alumnoId, 'en asignatura', asignaturaId);
    return realtimeDatabaseManager.initNotaAlumno(alumnoId, asignaturaId);
  }
  
  async updateNotaAlumno(nota: NotaAlumno): Promise<void> {
    console.log('dataManager: actualizando nota', nota.id);
    return realtimeDatabaseManager.updateNotaAlumno(nota);
  }
  
  async eliminarNotasAlumnoAsignatura(alumnoId: string, asignaturaId: string): Promise<void> {
    console.log('dataManager: eliminando notas de alumno', alumnoId, 'en asignatura', asignaturaId);
    return realtimeDatabaseManager.eliminarNotasAlumnoAsignatura(alumnoId, asignaturaId);
  }
  
  async getNotas(): Promise<NotaAlumno[]> {
    return realtimeDatabaseManager.getNotas();
  }
  
  async getNotasAsignatura(asignaturaId: string): Promise<NotaAlumno[]> {
    console.log('dataManager: obteniendo notas para la asignatura', asignaturaId);
    return realtimeDatabaseManager.getNotasAsignatura(asignaturaId);
  }

  async getAlumnosByAsignatura(asignaturaId: string): Promise<Alumno[]> {
    console.log('dataManager: obteniendo alumnos matriculados en asignatura', asignaturaId);
    
    try {
      // Obtener las matrículas de la asignatura
      const matriculas = await this.getMatriculasByAsignatura(asignaturaId);
      
      if (!matriculas || matriculas.length === 0) {
        return [];
      }
      
      // Para cada matrícula, obtener el alumno correspondiente
      const alumnosPromises = matriculas.map(matricula => 
        this.getAlumnoById(matricula.alumnoId)
      );
      
      // Esperar a que se resuelvan todas las promesas
      const alumnos = await Promise.all(alumnosPromises);
      
      // Filtrar los posibles nulos (alumnos que no existen)
      return alumnos.filter((alumno): alumno is Alumno => alumno !== undefined);
    } catch (error) {
      console.error('Error al obtener alumnos por asignatura:', error);
      return [];
    }
  }

  async getAlumnosMatriculadosEnAsignatura(asignaturaId: string): Promise<Alumno[]> {
    return this.getAlumnosByAsignatura(asignaturaId);
  }

  async limpiarNotasDuplicadas(): Promise<void> {
    console.log('dataManager: iniciando limpieza de notas duplicadas');
    return realtimeDatabaseManager.limpiarNotasDuplicadas();
  }
}

export const dataManager = new DataManager();
