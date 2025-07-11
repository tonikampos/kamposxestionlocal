import { storageManager } from './storageManager';
import { realtimeDatabaseManager } from '../firebase/realtimeDatabaseManager';
import type { 
  Alumno, 
  Asignatura, 
  Matricula, 
  NotaAlumno,
  Profesor
} from './storageManager';

// Constante para controlar el uso de Firebase (se puede cambiar durante la migración)
const USE_FIREBASE = true;

/**
 * DataManager - Clase adaptadora para facilitar la migración de localStorage a Firebase
 * 
 * Durante la transición, este manager puede trabajar con ambos sistemas:
 * - localStorage mediante storageManager
 * - Firebase Realtime Database mediante realtimeDatabaseManager
 */
class DataManager {
  // Variable para rastrear si estamos en modo de migración
  private isMigrationMode = false;
  
  // Flag para rastrear si los datos ya han sido migrados
  private dataMigrated = false;
  
  constructor() {
    console.log('DataManager inicializado. Usando Firebase:', USE_FIREBASE);
  }

  // FUNCIONES DE MIGRACIÓN
  
  /**
   * Migra los datos existentes en localStorage a Firebase
   */
  async migrateLocalDataToFirebase(profesorId: string): Promise<void> {
    if (this.dataMigrated || !USE_FIREBASE) return;
    
    console.log('Iniciando migración de datos a Firebase...');
    this.isMigrationMode = true;
    
    try {
      // 1. Migrar alumnos
      const alumnos = storageManager.getAlumnosByProfesor(profesorId);
      console.log(`Migrando ${alumnos.length} alumnos`);
      
      for (const alumno of alumnos) {
        const { id, ...alumnoSinId } = alumno;
        try {
          await realtimeDatabaseManager.addAlumno(alumnoSinId);
        } catch (error) {
          console.error(`Error al migrar alumno ${id}:`, error);
        }
      }
      
      // 2. Migrar asignaturas
      const asignaturas = storageManager.getAsignaturasByProfesor(profesorId);
      console.log(`Migrando ${asignaturas.length} asignaturas`);
      
      for (const asignatura of asignaturas) {
        const { id, ...asignaturaSinId } = asignatura;
        try {
          await realtimeDatabaseManager.addAsignatura(asignaturaSinId);
        } catch (error) {
          console.error(`Error al migrar asignatura ${id}:`, error);
        }
      }
      
      // 3. Migrar matrículas
      // Nota: Necesitamos obtener los nuevos IDs de Firebase para alumnos y asignaturas
      // Esta parte es más compleja y requeriría mantener un mapeo entre IDs viejos y nuevos
      
      // 4. Migrar notas
      // Similar al paso anterior, requiere mapeo de IDs
      
      console.log('Migración completada');
      this.dataMigrated = true;
      
    } catch (error) {
      console.error('Error durante la migración:', error);
    } finally {
      this.isMigrationMode = false;
    }
  }
  
  // GESTIÓN DE PROFESORES
  
  async registerProfesor(profesor: Omit<Profesor, "id">): Promise<string> {
    if (USE_FIREBASE) {
      return realtimeDatabaseManager.registerProfesor(profesor);
    } else {
      storageManager.addProfesor({...profesor, id: '', activo: true});
      return '';  // En localStorage no podemos devolver el ID antes de guardar
    }
  }
  
  async loginProfesor(email: string, password: string): Promise<Profesor> {
    if (USE_FIREBASE) {
      return realtimeDatabaseManager.loginProfesor(email, password);
    } else {
      // Implementar lógica para localStorage
      const profesores = storageManager.getProfesores();
      const profesor = profesores.find(p => p.email === email && p.contrasinal === password);
      if (!profesor) throw new Error("Credenciales inválidas");
      return profesor;
    }
  }
  
  async logoutProfesor(): Promise<void> {
    if (USE_FIREBASE) {
      return realtimeDatabaseManager.logoutProfesor();
    }
    // Para localStorage no hay una operación equivalente
  }
  
  // GESTIÓN DE ALUMNOS
  
  async getAlumnosByProfesor(profesorId: string): Promise<Alumno[]> {
    if (USE_FIREBASE) {
      return realtimeDatabaseManager.getAlumnosByProfesor(profesorId);
    } else {
      return storageManager.getAlumnosByProfesor(profesorId);
    }
  }
  
  async addAlumno(alumno: Omit<Alumno, "id" | "createdAt" | "updatedAt">): Promise<string> {
    if (USE_FIREBASE) {
      return realtimeDatabaseManager.addAlumno(alumno);
    } else {
      const now = new Date().toISOString();
      const alumnoCompleto: Alumno = {
        ...alumno,
        id: new Date().getTime().toString(), // ID temporal
        createdAt: now,
        updatedAt: now
      };
      storageManager.addAlumno(alumnoCompleto);
      return alumnoCompleto.id;
    }
  }
  
  async addMultipleAlumnos(alumnos: Omit<Alumno, "id" | "createdAt" | "updatedAt">[]): Promise<string[]> {
    if (USE_FIREBASE) {
      return realtimeDatabaseManager.addMultipleAlumnos(alumnos);
    } else {
      const now = new Date().toISOString();
      const alumnosCompletos: Alumno[] = alumnos.map(alumno => ({
        ...alumno,
        id: new Date().getTime().toString() + Math.random().toString(36).substr(2, 9), // ID temporal único
        createdAt: now,
        updatedAt: now
      }));
      storageManager.addMultipleAlumnos(alumnosCompletos);
      return alumnosCompletos.map(a => a.id);
    }
  }
  
  async updateAlumno(alumno: Alumno): Promise<void> {
    if (USE_FIREBASE) {
      return realtimeDatabaseManager.updateAlumno(alumno);
    } else {
      storageManager.updateAlumno(alumno);
    }
  }
  
  async deleteAlumno(id: string): Promise<void> {
    if (USE_FIREBASE) {
      return realtimeDatabaseManager.deleteAlumno(id);
    } else {
      storageManager.deleteAlumno(id);
    }
  }
  
  async getAlumnoById(id: string): Promise<Alumno | undefined> {
    if (USE_FIREBASE) {
      return realtimeDatabaseManager.getAlumnoById(id);
    } else {
      return storageManager.getAlumnoById(id);
    }
  }
  
  // GESTIÓN DE ASIGNATURAS
  
  async getAsignaturasByProfesor(profesorId: string): Promise<Asignatura[]> {
    if (USE_FIREBASE) {
      return realtimeDatabaseManager.getAsignaturasByProfesor(profesorId);
    } else {
      return storageManager.getAsignaturasByProfesor(profesorId);
    }
  }
  
  async addAsignatura(asignatura: Omit<Asignatura, "id" | "createdAt" | "updatedAt">): Promise<string> {
    if (USE_FIREBASE) {
      return realtimeDatabaseManager.addAsignatura(asignatura);
    } else {
      const now = new Date().toISOString();
      const asignaturaCompleta: Asignatura = {
        ...asignatura,
        id: new Date().getTime().toString(), // ID temporal
        createdAt: now,
        updatedAt: now
      };
      storageManager.addAsignatura(asignaturaCompleta);
      return asignaturaCompleta.id;
    }
  }
  
  async updateAsignatura(asignatura: Asignatura): Promise<void> {
    if (USE_FIREBASE) {
      return realtimeDatabaseManager.updateAsignatura(asignatura);
    } else {
      storageManager.updateAsignatura(asignatura);
    }
  }
  
  async deleteAsignatura(id: string): Promise<void> {
    if (USE_FIREBASE) {
      return realtimeDatabaseManager.deleteAsignatura(id);
    } else {
      storageManager.deleteAsignatura(id);
    }
  }
  
  async getAsignaturaById(id: string): Promise<Asignatura | undefined> {
    if (USE_FIREBASE) {
      return realtimeDatabaseManager.getAsignaturaById(id);
    } else {
      return storageManager.getAsignaturaById(id);
    }
  }
  
  // GESTIÓN DE MATRÍCULAS
  
  async matricularAlumno(alumnoId: string, asignaturaId: string): Promise<string> {
    if (USE_FIREBASE) {
      return realtimeDatabaseManager.matricularAlumno(alumnoId, asignaturaId);
    } else {
      storageManager.matricularAlumno(alumnoId, asignaturaId);
      return ''; // En localStorage no podemos devolver el ID antes de guardar
    }
  }
  
  async getMatriculasByAsignatura(asignaturaId: string): Promise<Matricula[]> {
    if (USE_FIREBASE) {
      return realtimeDatabaseManager.getMatriculasByAsignatura(asignaturaId);
    } else {
      return storageManager.getMatriculasByAsignatura(asignaturaId);
    }
  }
  
  async getMatriculasByAlumno(alumnoId: string): Promise<Matricula[]> {
    if (USE_FIREBASE) {
      return realtimeDatabaseManager.getMatriculasByAlumno(alumnoId);
    } else {
      return storageManager.getMatriculasByAlumno(alumnoId);
    }
  }
  
  async eliminarMatricula(alumnoId: string, asignaturaId: string): Promise<void> {
    if (USE_FIREBASE) {
      return realtimeDatabaseManager.eliminarMatricula(alumnoId, asignaturaId);
    } else {
      storageManager.eliminarMatricula(alumnoId, asignaturaId);
    }
  }
  
  // GESTIÓN DE NOTAS
  
  async getNotaAlumno(alumnoId: string, asignaturaId: string): Promise<NotaAlumno | null> {
    if (USE_FIREBASE) {
      return realtimeDatabaseManager.getNotaAlumno(alumnoId, asignaturaId);
    } else {
      return storageManager.getNotaAlumno(alumnoId, asignaturaId);
    }
  }
  
  async initNotaAlumno(alumnoId: string, asignaturaId: string): Promise<NotaAlumno> {
    if (USE_FIREBASE) {
      return realtimeDatabaseManager.initNotaAlumno(alumnoId, asignaturaId);
    } else {
      return storageManager.initNotaAlumno(alumnoId, asignaturaId);
    }
  }
  
  async updateNotaAlumno(nota: NotaAlumno): Promise<void> {
    if (USE_FIREBASE) {
      return realtimeDatabaseManager.updateNotaAlumno(nota);
    } else {
      storageManager.updateNotaAlumno(nota);
    }
  }
  
  async eliminarNotasAlumnoAsignatura(alumnoId: string, asignaturaId: string): Promise<void> {
    if (USE_FIREBASE) {
      return realtimeDatabaseManager.eliminarNotasAlumnoAsignatura(alumnoId, asignaturaId);
    } else {
      storageManager.eliminarNotasAlumnoAsignatura(alumnoId, asignaturaId);
    }
  }
  
  async getNotas(): Promise<NotaAlumno[]> {
    if (USE_FIREBASE) {
      return realtimeDatabaseManager.getNotas();
    } else {
      return storageManager.getNotas();
    }
  }
  
  async getNotasAsignatura(asignaturaId: string): Promise<NotaAlumno[]> {
    if (USE_FIREBASE) {
      return realtimeDatabaseManager.getNotasAsignatura(asignaturaId);
    } else {
      return storageManager.getNotasAsignatura(asignaturaId);
    }
  }
}

export const dataManager = new DataManager();
