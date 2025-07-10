// Definir tipos para nuestra aplicación
export interface Profesor {
  id: string;
  nome: string;
  apelidos: string;
  email: string;
  telefono: string;
  contrasinal: string; // Contraseña para validación
  activo: boolean;
}

// Interfaz para los alumnos
export interface Alumno {
  id: string;
  profesorId: string; // ID del profesor al que está asociado
  nome: string;
  apelidos: string;
  email: string;
  telefono?: string; // Opcional
  createdAt: string;
  updatedAt: string;
}

// Constantes para los niveles educativos
export const NIVEL_EDUCATIVO = {
  SMR: 'SMR',
  DAW: 'DAW',
  DAM: 'DAM',
  FPBASICA: 'FPBASICA',
  ESO: 'ESO',
  BACHILLERATO: 'BACHILLERATO',
  OUTROS: 'OUTROS'
} as const;

// Tipo para los niveles educativos
export type NivelEducativo = typeof NIVEL_EDUCATIVO[keyof typeof NIVEL_EDUCATIVO];

// Interfaz para una prueba de evaluación
export interface Proba {
  id: string;
  nome: string; // Nombre de la prueba (examen, trabajo, etc.)
  porcentaxe: number; // Porcentaje que representa en la evaluación (0-100)
  descripcion?: string; // Descripción opcional
}

// Interfaz para una evaluación
export interface Avaliacion {
  id: string;
  numero: number; // Número de evaluación (1, 2, 3...)
  porcentaxeNota: number; // Porcentaje que aporta a la nota final (0-100)
  probas: Proba[]; // Pruebas que componen la evaluación
}

// Configuración de evaluación para una asignatura
export interface ConfiguracionAvaliacion {
  asignaturaId: string; // ID de la asignatura a la que pertenece
  avaliaciois: Avaliacion[]; // Lista de evaluaciones configuradas
}

// Interfaz para las asignaturas
export interface Asignatura {
  id: string;
  profesorId: string; // ID del profesor al que pertenece la asignatura
  nome: string;
  nivel: NivelEducativo;
  curso: number; // Curso (1º, 2º, etc.)
  sesionsSemanais: number;
  numeroAvaliaciois: number;
  configuracionAvaliacion?: ConfiguracionAvaliacion; // Configuración de evaluación
  createdAt: string; // Fecha de creación
  updatedAt: string; // Fecha de última actualización
}

// Interfaz para matrículas (relación alumno-asignatura)
export interface Matricula {
  id: string;
  alumnoId: string;     // ID del alumno matriculado
  asignaturaId: string; // ID de la asignatura en la que está matriculado
  createdAt: string;    // Fecha de creación/matriculación
  updatedAt: string;    // Fecha de última actualización
}

// Interfaz para las notas de una prueba
export interface NotaProba {
  probaId: string;     // ID de la prueba
  valor: number;       // Valor de la nota (0-10)
  observacions?: string; // Observaciones opcionales
}

// Interfaz para las notas de una evaluación
export interface NotaAvaliacion {
  avaliacionId: string;  // ID de la evaluación
  notasProbas: NotaProba[]; // Notas de las pruebas
  notaFinal?: number;    // Nota final calculada
}

// Interfaz para las notas de un alumno en una asignatura
export interface NotaAlumno {
  id: string;
  alumnoId: string;       // ID del alumno
  asignaturaId: string;   // ID de la asignatura
  notasAvaliaciois: NotaAvaliacion[]; // Notas por evaluación
  notaFinal?: number;     // Nota final del curso
  createdAt: string;
  updatedAt: string;
}

// Prefijo para todas las claves de almacenamiento
const STORAGE_PREFIX = 'kampos_xestion_';

// Ya no creamos un profesor predeterminado

// Clase para gestionar el almacenamiento local
class StorageManager {
  constructor() {
    // Inicializar con datos predeterminados si el almacenamiento está vacío
    this.initializeStorage();
  }

  // Inicializar el almacenamiento si está vacío
  private initializeStorage(): void {
    try {
      // Ya no añadimos un profesor predeterminado
      const profesores = this.getProfesores();
      if (profesores.length === 0) {
        console.log('Almacenamiento inicializado sin profesor predeterminado');
      }
    } catch (error) {
      console.error('Error al inicializar el almacenamiento:', error);
    }
  }

  // Método para obtener profesores del localStorage
  getProfesores(): Profesor[] {
    try {
      const profesores = localStorage.getItem(`${STORAGE_PREFIX}profesores`);
      return profesores ? JSON.parse(profesores) : [];
    } catch (error) {
      console.error('Error al obtener profesores:', error);
      return [];
    }
  }

  // Método para guardar profesores en localStorage
  saveProfesores(profesores: Profesor[]): void {
    try {
      localStorage.setItem(`${STORAGE_PREFIX}profesores`, JSON.stringify(profesores));
      // Verificar que los datos se guardaron correctamente
      const saved = localStorage.getItem(`${STORAGE_PREFIX}profesores`);
      if (!saved) {
        throw new Error('Los datos no se guardaron correctamente');
      }
      console.log('Profesores guardados con éxito:', profesores.length);
    } catch (error) {
      console.error('Error al guardar profesores:', error);
      alert('Ocorreu un erro ao gardar os datos. Por favor, inténteo de novo.');
    }
  }

  // Método para agregar un profesor
  addProfesor(profesor: Profesor): void {
    try {
      const profesores = this.getProfesores();
      // Asignar ID único (usando timestamp)
      profesor.id = new Date().getTime().toString();
      profesores.push(profesor);
      this.saveProfesores(profesores);
      console.log('Profesor añadido con éxito:', profesor.nome);
    } catch (error) {
      console.error('Error al añadir profesor:', error);
      throw error;
    }
  }

  // Método para actualizar un profesor
  updateProfesor(profesor: Profesor): void {
    try {
      const profesores = this.getProfesores();
      const index = profesores.findIndex(p => p.id === profesor.id);
      if (index !== -1) {
        profesores[index] = profesor;
        this.saveProfesores(profesores);
        console.log('Profesor actualizado con éxito:', profesor.nome);
      } else {
        console.warn('Profesor no encontrado para actualizar:', profesor.id);
      }
    } catch (error) {
      console.error('Error al actualizar profesor:', error);
      throw error;
    }
  }

  // Método para eliminar un profesor
  deleteProfesor(id: string): void {
    try {
      const profesores = this.getProfesores();
      const updatedProfesores = profesores.filter(p => p.id !== id);
      this.saveProfesores(updatedProfesores);
      console.log('Profesor eliminado con éxito:', id);
    } catch (error) {
      console.error('Error al eliminar profesor:', error);
      throw error;
    }
  }

  // Método para obtener un profesor por ID
  getProfesorById(id: string): Profesor | undefined {
    try {
      const profesores = this.getProfesores();
      return profesores.find(p => p.id === id);
    } catch (error) {
      console.error('Error al obtener profesor por ID:', error);
      return undefined;
    }
  }

  // Método para obtener un profesor por email
  getProfesorByEmail(email: string): Profesor | undefined {
    try {
      const profesores = this.getProfesores();
      return profesores.find(p => p.email === email);
    } catch (error) {
      console.error('Error al obtener profesor por email:', error);
      return undefined;
    }
  }

  // GESTIÓN DE ASIGNATURAS

  // Método para obtener asignaturas
  getAsignaturas(): Asignatura[] {
    try {
      const asignaturas = localStorage.getItem(`${STORAGE_PREFIX}asignaturas`);
      return asignaturas ? JSON.parse(asignaturas) : [];
    } catch (error) {
      console.error('Error al obtener asignaturas:', error);
      return [];
    }
  }

  // Método para obtener asignaturas de un profesor específico
  getAsignaturasByProfesor(profesorId: string): Asignatura[] {
    try {
      const asignaturas = this.getAsignaturas();
      return asignaturas.filter(a => a.profesorId === profesorId);
    } catch (error) {
      console.error('Error al obtener asignaturas del profesor:', error);
      return [];
    }
  }

  // Método para guardar asignaturas
  saveAsignaturas(asignaturas: Asignatura[]): void {
    try {
      localStorage.setItem(`${STORAGE_PREFIX}asignaturas`, JSON.stringify(asignaturas));
      console.log('Asignaturas guardadas con éxito:', asignaturas.length);
    } catch (error) {
      console.error('Error al guardar asignaturas:', error);
      alert('Ocorreu un erro ao gardar as asignaturas. Por favor, inténteo de novo.');
    }
  }

  // Método para añadir una asignatura
  addAsignatura(asignatura: Asignatura): void {
    try {
      const asignaturas = this.getAsignaturas();
      // Asignar ID único y fechas
      asignatura.id = new Date().getTime().toString();
      asignatura.createdAt = new Date().toISOString();
      asignatura.updatedAt = new Date().toISOString();
      asignaturas.push(asignatura);
      this.saveAsignaturas(asignaturas);
      console.log('Asignatura añadida con éxito:', asignatura.nome);
    } catch (error) {
      console.error('Error al añadir asignatura:', error);
      throw error;
    }
  }

  // Método para actualizar una asignatura
  updateAsignatura(asignatura: Asignatura): void {
    try {
      const asignaturas = this.getAsignaturas();
      const index = asignaturas.findIndex(a => a.id === asignatura.id);
      if (index !== -1) {
        // Mantener la fecha de creación original pero actualizar la fecha de modificación
        asignatura.updatedAt = new Date().toISOString();
        asignaturas[index] = asignatura;
        this.saveAsignaturas(asignaturas);
        console.log('Asignatura actualizada con éxito:', asignatura.nome);
      } else {
        console.warn('Asignatura no encontrada para actualizar:', asignatura.id);
      }
    } catch (error) {
      console.error('Error al actualizar asignatura:', error);
      throw error;
    }
  }

  // Método para eliminar una asignatura
  deleteAsignatura(id: string): void {
    try {
      const asignaturas = this.getAsignaturas();
      const updatedAsignaturas = asignaturas.filter(a => a.id !== id);
      this.saveAsignaturas(updatedAsignaturas);
      console.log('Asignatura eliminada con éxito:', id);
    } catch (error) {
      console.error('Error al eliminar asignatura:', error);
      throw error;
    }
  }

  // Método para obtener una asignatura por ID
  getAsignaturaById(id: string): Asignatura | undefined {
    try {
      const asignaturas = this.getAsignaturas();
      return asignaturas.find(a => a.id === id);
    } catch (error) {
      console.error('Error al obtener asignatura por ID:', error);
      return undefined;
    }
  }

  // GESTIÓN DE CONFIGURACIÓN DE EVALUACIONES

  // Método para guardar la configuración de evaluación de una asignatura
  saveConfiguracionAvaliacion(asignaturaId: string, configuracion: ConfiguracionAvaliacion): void {
    try {
      const asignaturas = this.getAsignaturas();
      const index = asignaturas.findIndex(a => a.id === asignaturaId);
      
      if (index === -1) {
        throw new Error(`No se encontró la asignatura con ID ${asignaturaId}`);
      }

      // Actualizar la configuración de evaluación
      asignaturas[index].configuracionAvaliacion = configuracion;
      asignaturas[index].updatedAt = new Date().toISOString();
      
      this.saveAsignaturas(asignaturas);
      console.log(`Configuración de evaluación guardada para asignatura ${asignaturas[index].nome}`);
    } catch (error) {
      console.error('Error al guardar configuración de evaluación:', error);
      throw error;
    }
  }

  // Método para obtener la configuración de evaluación de una asignatura
  getConfiguracionAvaliacion(asignaturaId: string): ConfiguracionAvaliacion | undefined {
    try {
      const asignatura = this.getAsignaturaById(asignaturaId);
      return asignatura?.configuracionAvaliacion;
    } catch (error) {
      console.error('Error al obtener configuración de evaluación:', error);
      return undefined;
    }
  }

  // Método para crear una configuración de evaluación predeterminada
  createDefaultConfiguracionAvaliacion(asignatura: Asignatura): ConfiguracionAvaliacion {
    const avaliaciois: Avaliacion[] = [];
    
    // Porcentaje equitativo entre evaluaciones (100 / número de evaluaciones)
    const porcentajePorAvaliacion = Math.floor(100 / asignatura.numeroAvaliaciois);
    
    // Crear cada evaluación
    for (let i = 1; i <= asignatura.numeroAvaliaciois; i++) {
      // Última evaluación toma el resto para llegar a 100%
      const porcentaje = i === asignatura.numeroAvaliaciois 
        ? 100 - (porcentajePorAvaliacion * (asignatura.numeroAvaliaciois - 1))
        : porcentajePorAvaliacion;
        
      avaliaciois.push({
        id: `aval_${new Date().getTime()}_${i}`,
        numero: i,
        porcentaxeNota: porcentaje,
        probas: [
          {
            id: `proba_${new Date().getTime()}_${i}_1`,
            nome: 'Exame final',
            porcentaxe: 70,
            descripcion: 'Exame final da avaliación'
          },
          {
            id: `proba_${new Date().getTime()}_${i}_2`,
            nome: 'Traballos',
            porcentaxe: 30,
            descripcion: 'Traballos realizados durante a avaliación'
          }
        ]
      });
    }
    
    return {
      asignaturaId: asignatura.id,
      avaliaciois
    };
  }

  // GESTIÓN DE ALUMNOS

  // Método para obtener todos los alumnos
  getAlumnos(): Alumno[] {
    try {
      const alumnos = localStorage.getItem(`${STORAGE_PREFIX}alumnos`);
      return alumnos ? JSON.parse(alumnos) : [];
    } catch (error) {
      console.error('Error al obtener alumnos:', error);
      return [];
    }
  }

  // Método para obtener alumnos de un profesor específico
  getAlumnosByProfesor(profesorId: string): Alumno[] {
    try {
      const alumnos = this.getAlumnos();
      return alumnos.filter(a => a.profesorId === profesorId);
    } catch (error) {
      console.error('Error al obtener alumnos del profesor:', error);
      return [];
    }
  }

  // Método para guardar alumnos
  saveAlumnos(alumnos: Alumno[]): void {
    try {
      localStorage.setItem(`${STORAGE_PREFIX}alumnos`, JSON.stringify(alumnos));
      console.log('Alumnos gardados con éxito:', alumnos.length);
    } catch (error) {
      console.error('Error al guardar alumnos:', error);
      alert('Ocorreu un erro ao gardar os alumnos. Por favor, inténteo de novo.');
    }
  }

  // Método para añadir un alumno
  addAlumno(alumno: Alumno): void {
    try {
      const alumnos = this.getAlumnos();
      // Asignar ID único y fechas
      alumno.id = new Date().getTime().toString();
      alumno.createdAt = new Date().toISOString();
      alumno.updatedAt = new Date().toISOString();
      alumnos.push(alumno);
      this.saveAlumnos(alumnos);
      console.log('Alumno engadido con éxito:', alumno.nome);
    } catch (error) {
      console.error('Error al añadir alumno:', error);
      throw error;
    }
  }

  // Método para añadir múltiples alumnos (útil para importación CSV)
  addMultipleAlumnos(alumnos: Omit<Alumno, 'id' | 'createdAt' | 'updatedAt'>[]): void {
    try {
      const alumnosExistentes = this.getAlumnos();
      const now = new Date().toISOString();
      
      const nuevosAlumnos = alumnos.map(alumno => ({
        ...alumno,
        id: new Date().getTime().toString() + Math.floor(Math.random() * 1000), // Para evitar colisiones si se añaden en el mismo milisegundo
        createdAt: now,
        updatedAt: now
      }));
      
      this.saveAlumnos([...alumnosExistentes, ...nuevosAlumnos]);
      console.log(`${nuevosAlumnos.length} alumnos importados con éxito`);
    } catch (error) {
      console.error('Error al importar alumnos:', error);
      throw error;
    }
  }

  // Método para actualizar un alumno
  updateAlumno(alumno: Alumno): void {
    try {
      const alumnos = this.getAlumnos();
      const index = alumnos.findIndex(a => a.id === alumno.id);
      if (index !== -1) {
        // Mantener la fecha de creación original pero actualizar la fecha de modificación
        alumno.updatedAt = new Date().toISOString();
        alumnos[index] = alumno;
        this.saveAlumnos(alumnos);
        console.log('Alumno actualizado con éxito:', alumno.nome);
      } else {
        console.warn('Alumno no encontrado para actualizar:', alumno.id);
      }
    } catch (error) {
      console.error('Error al actualizar alumno:', error);
      throw error;
    }
  }

  // Método para eliminar un alumno
  deleteAlumno(id: string): void {
    try {
      const alumnos = this.getAlumnos();
      const updatedAlumnos = alumnos.filter(a => a.id !== id);
      this.saveAlumnos(updatedAlumnos);
      console.log('Alumno eliminado con éxito:', id);
    } catch (error) {
      console.error('Error al eliminar alumno:', error);
      throw error;
    }
  }

  // Método para obtener un alumno por ID
  getAlumnoById(id: string): Alumno | undefined {
    try {
      const alumnos = this.getAlumnos();
      return alumnos.find(a => a.id === id);
    } catch (error) {
      console.error('Error al obtener alumno por ID:', error);
      return undefined;
    }
  }

  // GESTIÓN DE MATRÍCULAS

  // Método para obtener todas las matrículas
  getMatriculas(): Matricula[] {
    try {
      const matriculas = localStorage.getItem(`${STORAGE_PREFIX}matriculas`);
      return matriculas ? JSON.parse(matriculas) : [];
    } catch (error) {
      console.error('Error al obtener matrículas:', error);
      return [];
    }
  }

  // Método para guardar matrículas
  saveMatriculas(matriculas: Matricula[]): void {
    try {
      localStorage.setItem(`${STORAGE_PREFIX}matriculas`, JSON.stringify(matriculas));
      console.log('Matrículas guardadas con éxito:', matriculas.length);
    } catch (error) {
      console.error('Error al guardar matrículas:', error);
      alert('Ocorreu un erro ao gardar as matrículas. Por favor, inténteo de novo.');
    }
  }

  // Método para obtener matrículas por asignatura
  getMatriculasByAsignatura(asignaturaId: string): Matricula[] {
    try {
      const matriculas = this.getMatriculas();
      return matriculas.filter(m => m.asignaturaId === asignaturaId);
    } catch (error) {
      console.error('Error al obtener matrículas por asignatura:', error);
      return [];
    }
  }

  // Método para obtener matrículas por alumno
  getMatriculasByAlumno(alumnoId: string): Matricula[] {
    try {
      const matriculas = this.getMatriculas();
      return matriculas.filter(m => m.alumnoId === alumnoId);
    } catch (error) {
      console.error('Error al obtener matrículas por alumno:', error);
      return [];
    }
  }

  // Método para obtener alumnos matriculados en una asignatura
  getAlumnosMatriculadosEnAsignatura(asignaturaId: string): Alumno[] {
    try {
      const matriculas = this.getMatriculasByAsignatura(asignaturaId);
      const alumnoIds = matriculas.map(m => m.alumnoId);
      const alumnos = this.getAlumnos();
      return alumnos.filter(a => alumnoIds.includes(a.id));
    } catch (error) {
      console.error('Error al obtener alumnos matriculados:', error);
      return [];
    }
  }

  // Método para obtener asignaturas en las que está matriculado un alumno
  getAsignaturasDeAlumno(alumnoId: string): Asignatura[] {
    try {
      const matriculas = this.getMatriculasByAlumno(alumnoId);
      const asignaturaIds = matriculas.map(m => m.asignaturaId);
      const asignaturas = this.getAsignaturas();
      return asignaturas.filter(a => asignaturaIds.includes(a.id));
    } catch (error) {
      console.error('Error al obtener asignaturas del alumno:', error);
      return [];
    }
  }

  // Método para matricular un alumno en una asignatura
  matricularAlumno(alumnoId: string, asignaturaId: string): void {
    try {
      // Verificar si ya existe la matrícula
      const matriculas = this.getMatriculas();
      const matriculaExistente = matriculas.find(
        m => m.alumnoId === alumnoId && m.asignaturaId === asignaturaId
      );

      if (matriculaExistente) {
        throw new Error('O alumno xa está matriculado nesta asignatura');
      }

      // Crear nueva matrícula
      const nuevaMatricula: Matricula = {
        id: new Date().getTime().toString(),
        alumnoId,
        asignaturaId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      matriculas.push(nuevaMatricula);
      this.saveMatriculas(matriculas);
      console.log('Alumno matriculado con éxito');
    } catch (error) {
      console.error('Error al matricular alumno:', error);
      throw error;
    }
  }

  // Método para eliminar la matrícula de un alumno en una asignatura y sus notas asociadas
  eliminarMatricula(alumnoId: string, asignaturaId: string): void {
    try {
      const matriculas = this.getMatriculas();
      const matriculasActualizadas = matriculas.filter(
        m => !(m.alumnoId === alumnoId && m.asignaturaId === asignaturaId)
      );

      if (matriculas.length === matriculasActualizadas.length) {
        console.log('No se encontró la matrícula para eliminar');
        return;
      }

      // Primero eliminamos las notas asociadas a esta matrícula
      this.eliminarNotasAlumnoAsignatura(alumnoId, asignaturaId);
      
      // Luego guardamos las matrículas actualizadas
      this.saveMatriculas(matriculasActualizadas);
      
      console.log('Matrícula y notas asociadas eliminadas con éxito');
    } catch (error) {
      console.error('Error al eliminar matrícula:', error);
      throw error;
    }
  }

  // Método para comprobar si un alumno está matriculado en una asignatura
  isAlumnoMatriculado(alumnoId: string, asignaturaId: string): boolean {
    try {
      const matriculas = this.getMatriculas();
      return matriculas.some(m => m.alumnoId === alumnoId && m.asignaturaId === asignaturaId);
    } catch (error) {
      console.error('Error al comprobar matrícula:', error);
      return false;
    }
  }

  // MÉTODOS PARA GESTIONAR NOTAS

  // Método para obtener todas las notas
  getNotas(): NotaAlumno[] {
    try {
      const notasJson = localStorage.getItem(`${STORAGE_PREFIX}notas`);
      return notasJson ? JSON.parse(notasJson) : [];
    } catch (error) {
      console.error('Error al obtener notas:', error);
      return [];
    }
  }

  // Método para guardar todas las notas
  saveNotas(notas: NotaAlumno[]): void {
    try {
      console.log(`Gardando ${notas.length} notas no localStorage`);
      
      // Para debug: verificar la integridad de los datos
      if (!Array.isArray(notas)) {
        throw new Error('Os datos non son un array');
      }
      
      // Asegurarse de que no hay notas duplicadas antes de guardar
      const idsUnicos = new Set<string>();
      const alumnosAsignaturaUnicos = new Set<string>();
      const notasSinDuplicados = notas.filter(nota => {
        const alumnoAsignaturaKey = `${nota.alumnoId}_${nota.asignaturaId}`;
        
        // Si ya hemos visto este par alumno-asignatura, es un duplicado
        if (alumnosAsignaturaUnicos.has(alumnoAsignaturaKey)) {
          console.warn(`Se eliminó un duplicado para alumno ${nota.alumnoId} en asignatura ${nota.asignaturaId}`);
          return false;
        }
        
        // Si ya hemos visto este ID, es un duplicado
        if (idsUnicos.has(nota.id)) {
          console.warn(`Se eliminó una nota con ID duplicado: ${nota.id}`);
          return false;
        }
        
        // Agregar para futuras verificaciones
        alumnosAsignaturaUnicos.add(alumnoAsignaturaKey);
        idsUnicos.add(nota.id);
        return true;
      });
      
      // Si se eliminaron duplicados, informar
      if (notasSinDuplicados.length < notas.length) {
        console.warn(`Se eliminaron ${notas.length - notasSinDuplicados.length} notas duplicadas antes de guardar`);
      }
      
      localStorage.setItem(`${STORAGE_PREFIX}notas`, JSON.stringify(notasSinDuplicados));
      
      // Verificar que se guardó correctamente
      const saved = localStorage.getItem(`${STORAGE_PREFIX}notas`);
      const parsedSaved = saved ? JSON.parse(saved) : [];
      console.log(`Verificación: ${parsedSaved.length} notas guardadas correctamente`);
    } catch (error) {
      console.error('Error al guardar notas:', error);
      throw new Error('Non se puideron gardar as notas');
    }
  }

  // Método para obtener las notas de un alumno en una asignatura
  getNotaAlumno(alumnoId: string, asignaturaId: string): NotaAlumno | null {
    try {
      const notas = this.getNotas();
      return notas.find(n => n.alumnoId === alumnoId && n.asignaturaId === asignaturaId) || null;
    } catch (error) {
      console.error('Error al obtener nota de alumno:', error);
      return null;
    }
  }

  // Método para inicializar las notas de un alumno en una asignatura
  initNotaAlumno(alumnoId: string, asignaturaId: string): NotaAlumno {
    try {
      const existingNota = this.getNotaAlumno(alumnoId, asignaturaId);
      if (existingNota) return existingNota;

      // Obtener la configuración de evaluación de la asignatura
      const asignatura = this.getAsignaturaById(asignaturaId);
      if (!asignatura || !asignatura.configuracionAvaliacion) {
        throw new Error('A asignatura non ten configuración de avaliación');
      }

      // Crear estructura de notas vacía
      const notasAvaliaciois: NotaAvaliacion[] = asignatura.configuracionAvaliacion.avaliaciois.map(avaliacion => {
        return {
          avaliacionId: avaliacion.id,
          notasProbas: avaliacion.probas.map(proba => {
            return {
              probaId: proba.id,
              valor: 0 // Inicializar con nota 0
            };
          })
        };
      });

      const nuevaNota: NotaAlumno = {
        id: new Date().getTime().toString(),
        alumnoId,
        asignaturaId,
        notasAvaliaciois,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Guardar en el almacenamiento
      const notas = this.getNotas();
      notas.push(nuevaNota);
      this.saveNotas(notas);

      return nuevaNota;
    } catch (error) {
      console.error('Error al inicializar notas del alumno:', error);
      throw new Error('Non se puideron inicializar as notas do alumno');
    }
  }

  // Método para actualizar las notas de un alumno (todas las evaluaciones)
  updateNotaAlumno(nota: NotaAlumno): void {
    try {
      console.log("Actualizando notas para alumno:", nota.alumnoId, "en asignatura:", nota.asignaturaId);
      
      const notas = this.getNotas();
      const index = notas.findIndex(n => n.id === nota.id);
      
      // Verificación para asegurarse de que estamos actualizando la nota correcta
      if (index === -1) {
        // Si no se encuentra por ID, buscar por alumnoId y asignaturaId
        const altIndex = notas.findIndex(
          n => n.alumnoId === nota.alumnoId && n.asignaturaId === nota.asignaturaId
        );
        
        if (altIndex === -1) {
          console.log("No se encontró nota existente, creando una nueva entrada");
          // Si realmente no existe, entonces crear una nueva entrada
          const nuevaNota = {
            ...nota,
            id: new Date().getTime().toString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          
          // Añadir la nueva nota y continuar el procesamiento
          notas.push(nuevaNota);
          
          // Actualizar la referencia para que las operaciones siguientes usen la nueva nota
          nota = nuevaNota;
        } else {
          console.log("Nota encontrada por alumnoId y asignaturaId pero no por ID");
          // Si se encontró por los IDs pero no por el ID principal, actualizar el ID en la nota pasada
          nota.id = notas[altIndex].id;
        }
      } else {
        console.log("Nota encontrada por ID:", index);
      }

      // Obtener la configuración actualizada de la asignatura
      const asignatura = this.getAsignaturaById(nota.asignaturaId);
      if (!asignatura || !asignatura.configuracionAvaliacion) {
        throw new Error('A asignatura non ten configuración de avaliación');
      }

      // Hacer una copia profunda del objeto nota para no modificar la entrada original
      // hasta que estemos seguros de que todos los cálculos son correctos
      const notaActualizada = JSON.parse(JSON.stringify(nota));
      
      // Asegurarse de que existen todas las evaluaciones y pruebas según la configuración actual
      asignatura.configuracionAvaliacion.avaliaciois.forEach(avaliacion => {
        // Buscar la evaluación en las notas
        let notaAvaliacion = notaActualizada.notasAvaliaciois.find(
          (na: NotaAvaliacion) => na.avaliacionId === avaliacion.id
        );
        
        // Si no existe, crearla
        if (!notaAvaliacion) {
          notaAvaliacion = {
            avaliacionId: avaliacion.id,
            notasProbas: []
          };
          notaActualizada.notasAvaliaciois.push(notaAvaliacion);
        }
        
        // Asegurarse de que existen todas las pruebas según la configuración actual
        avaliacion.probas.forEach(proba => {
          // Buscar la prueba en las notas
          const existeNotaProba = notaAvaliacion.notasProbas.some(
            (np: NotaProba) => np.probaId === proba.id
          );
          
          // Si no existe, crearla
          if (!existeNotaProba) {
            notaAvaliacion.notasProbas.push({
              probaId: proba.id,
              valor: 0
            });
          }
        });
      });

      // Actualizar notas y calcular notas finales
      notaActualizada.updatedAt = new Date().toISOString();
      
      // Calcular nota final de cada evaluación
      if (asignatura && asignatura.configuracionAvaliacion) {
        notaActualizada.notasAvaliaciois.forEach((notaAval: NotaAvaliacion) => {
          const avaliacion = asignatura.configuracionAvaliacion!.avaliaciois.find(
            av => av.id === notaAval.avaliacionId
          );
          
          if (avaliacion) {
            let sumaNotas = 0;
            let sumaPorcentajes = 0;
            
            notaAval.notasProbas.forEach((notaProba: NotaProba) => {
              const proba = avaliacion.probas.find(p => p.id === notaProba.probaId);
              if (proba) {
                sumaNotas += (notaProba.valor * proba.porcentaxe) / 100;
                sumaPorcentajes += proba.porcentaxe;
              }
            });
            
            // Si hay porcentajes definidos, calcular nota final de la evaluación
            if (sumaPorcentajes > 0) {
              notaAval.notaFinal = sumaNotas;
            }
          }
        });
        
        // Calcular nota final del curso
        let sumaNotas = 0;
        let sumaPorcentajes = 0;
        
        notaActualizada.notasAvaliaciois.forEach((notaAval: NotaAvaliacion) => {
          const avaliacion = asignatura.configuracionAvaliacion!.avaliaciois.find(
            av => av.id === notaAval.avaliacionId
          );
          
          if (avaliacion && notaAval.notaFinal !== undefined) {
            sumaNotas += (notaAval.notaFinal * avaliacion.porcentaxeNota) / 100;
            sumaPorcentajes += avaliacion.porcentaxeNota;
          }
        });
        
        if (sumaPorcentajes > 0) {
          notaActualizada.notaFinal = parseFloat(sumaNotas.toFixed(2));
        }
      }
      
      // Guardar notas actualizadas - Asegurarse de que solo se actualiza la nota del alumno actual
      const updatedIndex = notas.findIndex(n => n.id === notaActualizada.id);
      if (updatedIndex !== -1) {
        // Guardar la nota actualizada en la misma posición
        console.log(`Actualizando nota existente en posición ${updatedIndex}`);
        notas[updatedIndex] = notaActualizada;
      } else {
        // Si no se encontró por ID, esto es una nueva entrada
        console.log("Añadiendo nueva nota al array de notas");
        notas.push(notaActualizada);
      }
      
      // Verificar que no estamos duplicando notas para el mismo alumno/asignatura
      const duplicados = notas.filter(
        n => n.alumnoId === notaActualizada.alumnoId && 
             n.asignaturaId === notaActualizada.asignaturaId
      );
      
      if (duplicados.length > 1) {
        console.warn(`Se encontraron ${duplicados.length} entradas para el mismo alumno/asignatura. Eliminando duplicados.`);
        
        // Aquí está el problema: necesitamos mantener todas las notas y solo eliminar duplicados
        // para el alumno y asignatura actuales, no eliminar todas las demás notas
        
        // Primero, filtramos para quedarnos con todas las notas que NO son del alumno y asignatura actuales
        const notasDeOtrosAlumnos = notas.filter(
          n => !(n.alumnoId === notaActualizada.alumnoId && n.asignaturaId === notaActualizada.asignaturaId)
        );
        
        // Luego añadimos la nota actualizada del alumno actual
        const notasLimpias = [...notasDeOtrosAlumnos, notaActualizada];
        
        console.log(`Total de notas después de limpiar duplicados: ${notasLimpias.length} (se eliminaron ${duplicados.length - 1} duplicados)`);
        
        // Guardar la versión limpia
        this.saveNotas(notasLimpias);
        return; // Terminar aquí porque ya guardamos
      }
      
      // Guardar todas las notas
      this.saveNotas(notas);
      
      // Registrar en la consola para depuración
      console.log(`Notas actualizadas para alumno ${notaActualizada.alumnoId} en asignatura ${notaActualizada.asignaturaId}. ID de nota: ${notaActualizada.id}`);
    } catch (error) {
      console.error('Error al actualizar nota de alumno:', error);
      throw new Error('Non se puideron actualizar as notas do alumno');
    }
  }

  // Método para obtener las notas de todos los alumnos de una asignatura
  getNotasAsignatura(asignaturaId: string): NotaAlumno[] {
    try {
      const notas = this.getNotas();
      return notas.filter(n => n.asignaturaId === asignaturaId);
    } catch (error) {
      console.error('Error al obtener notas de asignatura:', error);
      return [];
    }
  }

  // Método para inicializar notas para todos los alumnos matriculados en una asignatura
  initNotasAsignatura(asignaturaId: string): void {
    try {
      // Obtener todos los alumnos matriculados
      const alumnos = this.getAlumnosMatriculadosEnAsignatura(asignaturaId);
      
      // Inicializar notas para cada alumno si no existen
      alumnos.forEach(alumno => {
        if (!this.getNotaAlumno(alumno.id, asignaturaId)) {
          this.initNotaAlumno(alumno.id, asignaturaId);
        }
      });
    } catch (error) {
      console.error('Error al inicializar notas de asignatura:', error);
      throw new Error('Non se puideron inicializar as notas da asignatura');
    }
  }

  // Método para eliminar las notas de un alumno en una asignatura específica
  eliminarNotasAlumnoAsignatura(alumnoId: string, asignaturaId: string): void {
    try {
      console.log(`Eliminando notas del alumno ${alumnoId} en la asignatura ${asignaturaId}...`);
      
      // Obtener todas las notas
      const notas = this.getNotas();
      
      // Filtrar las notas para eliminar las del alumno en la asignatura específica
      const notasActualizadas = notas.filter(
        nota => !(nota.alumnoId === alumnoId && nota.asignaturaId === asignaturaId)
      );
      
      // Verificar si se encontraron notas para eliminar
      if (notas.length === notasActualizadas.length) {
        console.log(`No se encontraron notas para eliminar del alumno ${alumnoId} en la asignatura ${asignaturaId}`);
        return;
      }
      
      // Guardar las notas actualizadas
      this.saveNotas(notasActualizadas);
      
      console.log(`Eliminadas con éxito las notas del alumno ${alumnoId} en la asignatura ${asignaturaId}`);
      console.log(`Notas eliminadas: ${notas.length - notasActualizadas.length}`);
    } catch (error) {
      console.error('Error al eliminar las notas del alumno en la asignatura:', error);
      throw error;
    }
  }
}

export const storageManager = new StorageManager();
