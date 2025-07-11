import { ref, get, set, push, remove, query, orderByChild, equalTo, update, child } from "firebase/database";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { db, auth } from "../firebase/config";
import type { Alumno, Asignatura, Matricula, NotaAlumno, Profesor } from "../utils/storageManager";

class RealtimeDatabaseManager {
  // GESTIÓN DE AUTENTICACIÓN
  
  // Registrar un nuevo profesor (también crea la cuenta de autenticación)
  async registerProfesor(profesor: Omit<Profesor, "id">): Promise<string> {
    try {
      // 1. Crear cuenta de autenticación
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        profesor.email,
        profesor.contrasinal
      );
      
      const uid = userCredential.user.uid;
      
      // 2. Guardar datos del profesor en Realtime Database
      const profesorData = {
        ...profesor,
        id: uid,
        activo: true
      };
      
      // Eliminar la contraseña antes de almacenar en la base de datos
      const { contrasinal, ...profesorSinPassword } = profesorData;
      
      // Guardar en la ruta "profesores/{uid}"
      await set(ref(db, `profesores/${uid}`), profesorSinPassword);
      
      return uid;
    } catch (error) {
      console.error("Error al registrar profesor:", error);
      throw error;
    }
  }
  
  // Iniciar sesión
  async loginProfesor(email: string, password: string): Promise<Profesor> {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;
      
      // Obtener datos del profesor de la base de datos
      const profesorRef = ref(db, `profesores/${uid}`);
      const snapshot = await get(profesorRef);
      
      if (!snapshot.exists()) {
        throw new Error("O profesor non existe na base de datos");
      }
      
      // Devolver los datos del profesor
      const profesorData = snapshot.val();
      return {
        ...profesorData,
        id: uid
      };
    } catch (error) {
      console.error("Error al iniciar sesión:", error);
      throw error;
    }
  }
  
  // Cerrar sesión
  async logoutProfesor(): Promise<void> {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      throw error;
    }
  }
  
  // GESTIÓN DE PROFESORES
  
  // Obtener todos los profesores
  async getProfesores(): Promise<Profesor[]> {
    try {
      const profesoresRef = ref(db, "profesores");
      const snapshot = await get(profesoresRef);
      
      if (!snapshot.exists()) {
        return [];
      }
      
      const profesoresData = snapshot.val();
      
      // Convertir objeto a array
      return Object.keys(profesoresData).map(key => ({
        ...profesoresData[key],
        id: key
      }));
    } catch (error) {
      console.error("Error al obtener profesores:", error);
      return [];
    }
  }
  
  // Obtener profesor por ID
  async getProfesorById(id: string): Promise<Profesor | undefined> {
    try {
      const profesorRef = ref(db, `profesores/${id}`);
      const snapshot = await get(profesorRef);
      
      if (!snapshot.exists()) {
        return undefined;
      }
      
      return {
        ...snapshot.val(),
        id: id
      };
    } catch (error) {
      console.error("Error al obtener profesor por ID:", error);
      return undefined;
    }
  }
  
  // Actualizar profesor
  async updateProfesor(profesor: Profesor): Promise<void> {
    try {
      const profesorRef = ref(db, `profesores/${profesor.id}`);
      
      // Clonar el objeto para no modificar el original
      const { id, ...profesorSinId } = profesor;
      
      await update(profesorRef, profesorSinId);
    } catch (error) {
      console.error("Error al actualizar profesor:", error);
      throw error;
    }
  }
  
  // GESTIÓN DE ALUMNOS
  
  // Obtener alumnos de un profesor
  async getAlumnosByProfesor(profesorId: string): Promise<Alumno[]> {
    try {
      console.log("Obteniendo alumnos para el profesor:", profesorId);
      const alumnosRef = ref(db, "alumnos");
      const alumnosPorProfesorQuery = query(alumnosRef, orderByChild("profesorId"), equalTo(profesorId));
      const snapshot = await get(alumnosPorProfesorQuery);
      
      if (!snapshot.exists()) {
        console.log("No se encontraron alumnos para este profesor");
        return [];
      }
      
      const alumnosData = snapshot.val();
      console.log("Datos de alumnos obtenidos:", alumnosData);
      
      // Convertir objeto a array
      const alumnosArray = Object.keys(alumnosData).map(key => ({
        ...alumnosData[key],
        id: key
      }));
      
      console.log("Array de alumnos procesado:", alumnosArray);
      return alumnosArray;
    } catch (error) {
      console.error("Error al obtener alumnos:", error);
      return [];
    }
  }
  
  // Añadir un alumno
  async addAlumno(alumno: Omit<Alumno, "id" | "createdAt" | "updatedAt">): Promise<string> {
    try {
      console.log("Añadiendo alumno:", alumno);
      
      // Verificar que el profesorId está presente
      if (!alumno.profesorId) {
        console.error("Error: No se proporcionó el profesorId para el alumno");
        throw new Error("El campo profesorId es obligatorio para crear un alumno");
      }
      
      const now = new Date().toISOString();
      const alumnoData = {
        ...alumno,
        createdAt: now,
        updatedAt: now
      };
      
      console.log("Datos de alumno a guardar:", alumnoData);
      
      // Crear una nueva entrada con ID automático
      const newAlumnoRef = push(ref(db, "alumnos"));
      await set(newAlumnoRef, alumnoData);
      
      console.log("Alumno guardado correctamente con ID:", newAlumnoRef.key);
      return newAlumnoRef.key!;
    } catch (error) {
      console.error("Error al añadir alumno:", error);
      throw error;
    }
  }
  
  // Añadir múltiples alumnos (para importación)
  async addMultipleAlumnos(alumnos: Omit<Alumno, "id" | "createdAt" | "updatedAt">[]): Promise<string[]> {
    try {
      console.log(`Añadiendo ${alumnos.length} alumnos en lote`);
      
      // Verificar que todos los alumnos tienen profesorId
      for (const alumno of alumnos) {
        if (!alumno.profesorId) {
          console.error("Error: Uno de los alumnos no tiene profesorId");
          throw new Error("Todos los alumnos deben tener un profesorId válido");
        }
      }
      
      const now = new Date().toISOString();
      const ids: string[] = [];
      
      // Crear una actualización por lotes (más eficiente)
      const updates: Record<string, any> = {};
      
      for (const alumno of alumnos) {
        const alumnoData = {
          ...alumno,
          createdAt: now,
          updatedAt: now
        };
        
        const newAlumnoRef = push(ref(db, "alumnos"));
        const key = newAlumnoRef.key!;
        
        updates[`alumnos/${key}`] = alumnoData;
        ids.push(key);
      }
      
      console.log(`Guardando ${Object.keys(updates).length} actualizaciones en lote`);
      
      // Ejecutar todas las actualizaciones a la vez
      await update(ref(db), updates);
      
      console.log(`${ids.length} alumnos guardados correctamente`);
      return ids;
    } catch (error) {
      console.error("Error al añadir múltiples alumnos:", error);
      throw error;
    }
  }
  
  // Actualizar un alumno
  async updateAlumno(alumno: Alumno): Promise<void> {
    try {
      const alumnoRef = ref(db, `alumnos/${alumno.id}`);
      
      // Actualizar fecha de modificación
      const { id, ...alumnoSinId } = {
        ...alumno,
        updatedAt: new Date().toISOString()
      };
      
      await update(alumnoRef, alumnoSinId);
    } catch (error) {
      console.error("Error al actualizar alumno:", error);
      throw error;
    }
  }
  
  // Eliminar un alumno
  async deleteAlumno(id: string): Promise<void> {
    try {
      // Verificar primero si el alumno tiene matrículas
      const matriculasRef = ref(db, "matriculas");
      const matriculasQuery = query(matriculasRef, orderByChild("alumnoId"), equalTo(id));
      const matriculasSnapshot = await get(matriculasQuery);
      
      if (matriculasSnapshot.exists()) {
        throw new Error("No se puede eliminar un alumno con matrículas activas");
      }
      
      // Si no tiene matrículas, podemos eliminar
      await remove(ref(db, `alumnos/${id}`));
    } catch (error) {
      console.error("Error al eliminar alumno:", error);
      throw error;
    }
  }
  
  // Obtener alumno por ID
  async getAlumnoById(id: string): Promise<Alumno | undefined> {
    try {
      const alumnoRef = ref(db, `alumnos/${id}`);
      const snapshot = await get(alumnoRef);
      
      if (!snapshot.exists()) {
        return undefined;
      }
      
      return {
        ...snapshot.val(),
        id: id
      };
    } catch (error) {
      console.error("Error al obtener alumno por ID:", error);
      return undefined;
    }
  }
  
  // GESTIÓN DE ASIGNATURAS
  
  // Obtener asignaturas de un profesor
  async getAsignaturasByProfesor(profesorId: string): Promise<Asignatura[]> {
    try {
      console.log("Obteniendo asignaturas para el profesor:", profesorId);
      const asignaturasRef = ref(db, "asignaturas");
      const asignaturasPorProfesorQuery = query(asignaturasRef, orderByChild("profesorId"), equalTo(profesorId));
      const snapshot = await get(asignaturasPorProfesorQuery);
      
      if (!snapshot.exists()) {
        console.log("No se encontraron asignaturas para este profesor");
        return [];
      }
      
      const asignaturasData = snapshot.val();
      console.log("Datos de asignaturas obtenidos:", asignaturasData);
      
      // Convertir objeto a array
      const asignaturasArray = Object.keys(asignaturasData).map(key => ({
        ...asignaturasData[key],
        id: key
      }));
      
      console.log("Array de asignaturas procesado:", asignaturasArray);
      return asignaturasArray;
    } catch (error) {
      console.error("Error al obtener asignaturas:", error);
      return [];
    }
  }
  
  // Añadir una asignatura
  async addAsignatura(asignatura: Omit<Asignatura, "id" | "createdAt" | "updatedAt">): Promise<string> {
    try {
      console.log("Añadiendo asignatura:", asignatura);
      
      // Verificar que el profesorId está presente
      if (!asignatura.profesorId) {
        console.error("Error: No se proporcionó el profesorId para la asignatura");
        throw new Error("El campo profesorId es obligatorio para crear una asignatura");
      }
      
      const now = new Date().toISOString();
      const asignaturaData = {
        ...asignatura,
        createdAt: now,
        updatedAt: now
      };
      
      console.log("Datos de asignatura a guardar:", asignaturaData);
      
      // Crear una nueva entrada con ID automático
      const newAsignaturaRef = push(ref(db, "asignaturas"));
      await set(newAsignaturaRef, asignaturaData);
      
      console.log("Asignatura guardada correctamente con ID:", newAsignaturaRef.key);
      return newAsignaturaRef.key!;
    } catch (error) {
      console.error("Error al añadir asignatura:", error);
      throw error;
    }
  }
  
  // Actualizar una asignatura
  async updateAsignatura(asignatura: Asignatura): Promise<void> {
    try {
      const asignaturaRef = ref(db, `asignaturas/${asignatura.id}`);
      
      // Actualizar fecha de modificación
      const { id, ...asignaturaSinId } = {
        ...asignatura,
        updatedAt: new Date().toISOString()
      };
      
      await update(asignaturaRef, asignaturaSinId);
    } catch (error) {
      console.error("Error al actualizar asignatura:", error);
      throw error;
    }
  }
  
  // Eliminar una asignatura
  async deleteAsignatura(id: string): Promise<void> {
    try {
      // Verificar primero si la asignatura tiene matrículas
      const matriculasRef = ref(db, "matriculas");
      const matriculasQuery = query(matriculasRef, orderByChild("asignaturaId"), equalTo(id));
      const matriculasSnapshot = await get(matriculasQuery);
      
      if (matriculasSnapshot.exists()) {
        throw new Error("No se puede eliminar una asignatura con alumnos matriculados");
      }
      
      // Si no tiene matrículas, podemos eliminar
      await remove(ref(db, `asignaturas/${id}`));
    } catch (error) {
      console.error("Error al eliminar asignatura:", error);
      throw error;
    }
  }
  
  // Obtener asignatura por ID
  async getAsignaturaById(id: string): Promise<Asignatura | undefined> {
    try {
      const asignaturaRef = ref(db, `asignaturas/${id}`);
      const snapshot = await get(asignaturaRef);
      
      if (!snapshot.exists()) {
        return undefined;
      }
      
      return {
        ...snapshot.val(),
        id: id
      };
    } catch (error) {
      console.error("Error al obtener asignatura por ID:", error);
      return undefined;
    }
  }
  
  // GESTIÓN DE MATRÍCULAS
  
  // Matricular un alumno en una asignatura
  async matricularAlumno(alumnoId: string, asignaturaId: string): Promise<string> {
    try {
      // Verificar si ya existe la matrícula
      const matriculasRef = ref(db, "matriculas");
      const snapshot = await get(matriculasRef);
      
      if (snapshot.exists()) {
        const matriculasData = snapshot.val();
        
        // Buscar si ya existe una matrícula con este alumno y asignatura
        const existeMatricula = Object.values(matriculasData).some((matricula: any) => 
          matricula.alumnoId === alumnoId && matricula.asignaturaId === asignaturaId
        );
        
        if (existeMatricula) {
          throw new Error("O alumno xa está matriculado nesta asignatura");
        }
      }
      
      // Crear nueva matrícula
      const now = new Date().toISOString();
      const matriculaData = {
        alumnoId,
        asignaturaId,
        createdAt: now,
        updatedAt: now
      };
      
      const newMatriculaRef = push(ref(db, "matriculas"));
      await set(newMatriculaRef, matriculaData);
      
      return newMatriculaRef.key!;
    } catch (error) {
      console.error("Error al matricular alumno:", error);
      throw error;
    }
  }
  
  // Obtener matrículas por asignatura
  async getMatriculasByAsignatura(asignaturaId: string): Promise<Matricula[]> {
    try {
      const matriculasRef = ref(db, "matriculas");
      const matriculasPorAsignaturaQuery = query(matriculasRef, orderByChild("asignaturaId"), equalTo(asignaturaId));
      const snapshot = await get(matriculasPorAsignaturaQuery);
      
      if (!snapshot.exists()) {
        return [];
      }
      
      const matriculasData = snapshot.val();
      
      // Convertir objeto a array
      return Object.keys(matriculasData).map(key => ({
        ...matriculasData[key],
        id: key
      }));
    } catch (error) {
      console.error("Error al obtener matrículas por asignatura:", error);
      return [];
    }
  }
  
  // Obtener matrículas por alumno
  async getMatriculasByAlumno(alumnoId: string): Promise<Matricula[]> {
    try {
      const matriculasRef = ref(db, "matriculas");
      const matriculasPorAlumnoQuery = query(matriculasRef, orderByChild("alumnoId"), equalTo(alumnoId));
      const snapshot = await get(matriculasPorAlumnoQuery);
      
      if (!snapshot.exists()) {
        return [];
      }
      
      const matriculasData = snapshot.val();
      
      // Convertir objeto a array
      return Object.keys(matriculasData).map(key => ({
        ...matriculasData[key],
        id: key
      }));
    } catch (error) {
      console.error("Error al obtener matrículas por alumno:", error);
      return [];
    }
  }
  
  // Eliminar matrícula (y notas asociadas)
  async eliminarMatricula(alumnoId: string, asignaturaId: string): Promise<void> {
    try {
      // Encontrar la matrícula
      const matriculasRef = ref(db, "matriculas");
      const snapshot = await get(matriculasRef);
      
      if (!snapshot.exists()) {
        return;
      }
      
      const matriculasData = snapshot.val();
      let matriculaId: string | null = null;
      
      // Buscar ID de la matrícula
      Object.keys(matriculasData).forEach(key => {
        const matricula = matriculasData[key];
        if (matricula.alumnoId === alumnoId && matricula.asignaturaId === asignaturaId) {
          matriculaId = key;
        }
      });
      
      if (!matriculaId) {
        console.log("No se encontró la matrícula para eliminar");
        return;
      }
      
      // Primero eliminar las notas asociadas a esta matrícula
      await this.eliminarNotasAlumnoAsignatura(alumnoId, asignaturaId);
      
      // Luego eliminar la matrícula
      await remove(ref(db, `matriculas/${matriculaId}`));
    } catch (error) {
      console.error("Error al eliminar matrícula:", error);
      throw error;
    }
  }
  
  // GESTIÓN DE NOTAS
  
  // Obtener nota de un alumno en una asignatura
  async getNotaAlumno(alumnoId: string, asignaturaId: string): Promise<NotaAlumno | null> {
    try {
      const notasRef = ref(db, "notas");
      const snapshot = await get(notasRef);
      
      if (!snapshot.exists()) {
        return null;
      }
      
      const notasData = snapshot.val();
      let notaEncontrada: NotaAlumno | null = null;
      
      // Buscar la nota del alumno en la asignatura
      Object.keys(notasData).forEach(key => {
        const nota = notasData[key];
        if (nota.alumnoId === alumnoId && nota.asignaturaId === asignaturaId) {
          notaEncontrada = {
            ...nota,
            id: key
          };
        }
      });
      
      return notaEncontrada;
    } catch (error) {
      console.error("Error al obtener nota de alumno:", error);
      return null;
    }
  }
  
  // Inicializar las notas de un alumno en una asignatura
  async initNotaAlumno(alumnoId: string, asignaturaId: string): Promise<NotaAlumno> {
    try {
      const existingNota = await this.getNotaAlumno(alumnoId, asignaturaId);
      if (existingNota) return existingNota;

      // Obtener la configuración de evaluación de la asignatura
      const asignatura = await this.getAsignaturaById(asignaturaId);
      if (!asignatura || !asignatura.configuracionAvaliacion) {
        throw new Error('A asignatura non ten configuración de avaliación');
      }

      // Crear estructura de notas vacía
      const notasAvaliaciois = asignatura.configuracionAvaliacion.avaliaciois.map(avaliacion => {
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

      const now = new Date().toISOString();
      const nuevaNota = {
        alumnoId,
        asignaturaId,
        notasAvaliaciois,
        createdAt: now,
        updatedAt: now
      };

      // Guardar en la base de datos
      const newNotaRef = push(ref(db, "notas"));
      await set(newNotaRef, nuevaNota);
      
      return {
        ...nuevaNota,
        id: newNotaRef.key!
      };
    } catch (error) {
      console.error('Error al inicializar notas del alumno:', error);
      throw new Error('Non se puideron inicializar as notas do alumno');
    }
  }
  
  // Actualizar nota de un alumno
  async updateNotaAlumno(nota: NotaAlumno): Promise<void> {
    try {
      if (!nota.id) {
        // Si no tiene ID, es una nueva nota (aunque esto no debería ocurrir si se usa initNotaAlumno)
        const existingNota = await this.getNotaAlumno(nota.alumnoId, nota.asignaturaId);
        
        if (existingNota) {
          nota.id = existingNota.id;
        } else {
          const now = new Date().toISOString();
          const nuevaNota = {
            ...nota,
            createdAt: now,
            updatedAt: now
          };
          
          const newNotaRef = push(ref(db, "notas"));
          await set(newNotaRef, nuevaNota);
          return;
        }
      }
      
      // Actualizar la nota existente
      const notaRef = ref(db, `notas/${nota.id}`);
      
      // Actualizar fecha de modificación
      const { id, ...notaSinId } = {
        ...nota,
        updatedAt: new Date().toISOString()
      };
      
      await update(notaRef, notaSinId);
    } catch (error) {
      console.error("Error al actualizar nota de alumno:", error);
      throw error;
    }
  }
  
  // Eliminar notas de un alumno en una asignatura
  async eliminarNotasAlumnoAsignatura(alumnoId: string, asignaturaId: string): Promise<void> {
    try {
      const nota = await this.getNotaAlumno(alumnoId, asignaturaId);
      
      if (nota && nota.id) {
        await remove(ref(db, `notas/${nota.id}`));
      }
    } catch (error) {
      console.error("Error al eliminar notas:", error);
      throw error;
    }
  }
  
  // Obtener todas las notas
  async getNotas(): Promise<NotaAlumno[]> {
    try {
      const notasRef = ref(db, "notas");
      const snapshot = await get(notasRef);
      
      if (!snapshot.exists()) {
        return [];
      }
      
      const notasData = snapshot.val();
      
      // Convertir objeto a array
      return Object.keys(notasData).map(key => ({
        ...notasData[key],
        id: key
      }));
    } catch (error) {
      console.error("Error al obtener notas:", error);
      return [];
    }
  }
  
  // Obtener notas por asignatura
  async getNotasAsignatura(asignaturaId: string): Promise<NotaAlumno[]> {
    try {
      const notasRef = ref(db, "notas");
      const snapshot = await get(notasRef);
      
      if (!snapshot.exists()) {
        return [];
      }
      
      const notasData = snapshot.val();
      const notasAsignatura: NotaAlumno[] = [];
      
      // Filtrar notas por asignatura
      Object.keys(notasData).forEach(key => {
        const nota = notasData[key];
        if (nota.asignaturaId === asignaturaId) {
          notasAsignatura.push({
            ...nota,
            id: key
          });
        }
      });
      
      return notasAsignatura;
    } catch (error) {
      console.error("Error al obtener notas por asignatura:", error);
      return [];
    }
  }
}

export const realtimeDatabaseManager = new RealtimeDatabaseManager();
