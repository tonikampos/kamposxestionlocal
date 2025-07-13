import { ref, get, set, push, remove, query, orderByChild, equalTo, update, child } from "firebase/database";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { db, auth } from "../firebase/config";
import { ErrorHandler } from '../utils/errorHandler';
import type { 
  Alumno, 
  Asignatura, 
  Matricula, 
  NotaAlumno, 
  NotaAvaliacion, 
  NotaProba, 
  Profesor,
  ConfiguracionAvaliacion,
  Avaliacion,
  Proba
} from "../utils/storageManager";

class RealtimeDatabaseManager {
  private usuarioActual: string | null = null;
  // Mapa para rastrear los IDs de las últimas notas guardadas por cada combinación alumno-asignatura
  private lastSavedNotaIdMap: Record<string, string> = {};
  
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
      console.log("RealtimeDBManager: Obteniendo alumnos para el profesor:", profesorId);
      
      if (!profesorId) {
        console.error("RealtimeDBManager: Se proporcionó un profesorId vacío");
        return [];
      }
      
      // Primero obtenemos todos los alumnos y luego filtramos por profesorId
      const alumnosRef = ref(db, "alumnos");
      const snapshot = await get(alumnosRef);
      
      if (!snapshot.exists()) {
        console.log("RealtimeDBManager: No se encontraron alumnos en la base de datos");
        return [];
      }
      
      const alumnosData = snapshot.val();
      console.log("RealtimeDBManager: Todos los datos de alumnos obtenidos", alumnosData);
      
      // Convertir objeto a array y filtrar por profesorId
      const alumnosArray = Object.keys(alumnosData)
        .map(key => ({
          ...alumnosData[key],
          id: key
        }))
        .filter(alumno => alumno.profesorId === profesorId);
      
      console.log(`RealtimeDBManager: Se encontraron ${alumnosArray.length} alumnos para el profesor ${profesorId}:`, alumnosArray);
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
      // Implementación más robusta para verificar matrículas sin depender completamente de índices
      // Primero verificamos si el alumno existe
      const alumnoRef = ref(db, `alumnos/${id}`);
      const alumnoSnapshot = await get(alumnoRef);
      
      if (!alumnoSnapshot.exists()) {
        throw new Error("O alumno non existe");
      }
      
      // Comprobar si hay matrículas asociadas a este alumno
      // Esta implementación alternativa es más segura si hay problemas con índices
      let tieneMatriculas = false;
      let matriculasDelAlumno: any[] = [];
      
      try {
        // Intentamos usar la consulta con índice
        const matriculasRef = ref(db, "matriculas");
        const matriculasQuery = query(matriculasRef, orderByChild("alumnoId"), equalTo(id));
        const matriculasSnapshot = await get(matriculasQuery);
        
        if (matriculasSnapshot.exists()) {
          tieneMatriculas = true;
          const matriculasData = matriculasSnapshot.val();
          matriculasDelAlumno = Object.values(matriculasData);
        }
      } catch (indexError) {
        console.warn("Error al buscar matrículas con índice:", indexError);
        
        // Si falla la consulta por índice, hacemos una búsqueda manual
        // Esto es más lento pero funciona sin índices
        const todasMatriculasRef = ref(db, "matriculas");
        const todasMatriculasSnapshot = await get(todasMatriculasRef);
        
        if (todasMatriculasSnapshot.exists()) {
          const todasMatriculas = todasMatriculasSnapshot.val();
          
          // Filtrar manualmente
          Object.values(todasMatriculas).forEach((matricula: any) => {
            if (matricula.alumnoId === id) {
              tieneMatriculas = true;
              matriculasDelAlumno.push(matricula);
            }
          });
        }
      }
      
      // Si tiene matrículas, mostramos información detallada
      if (tieneMatriculas) {
        // Obtener información de las asignaturas
        const asignaturasIds = matriculasDelAlumno.map((m: any) => m.asignaturaId);
        
        const asignaturasInfo = await Promise.all(
          asignaturasIds.map(async (asigId: string) => {
            const asigSnapshot = await get(ref(db, `asignaturas/${asigId}`));
            if (asigSnapshot.exists()) {
              const asigData = asigSnapshot.val();
              return `${asigData.nome} (${asigData.nivel} - ${asigData.curso}º)`;
            }
            return `Asignatura ID: ${asigId}`;
          })
        );
        
        // Construir mensaje de error con información sobre las asignaturas
        const asignaturasLista = asignaturasInfo.join(", ");
        throw new Error(
          `Non se pode eliminar un alumno con matrículas activas. ` +
          `O alumno está matriculado nas seguintes asignaturas: ${asignaturasLista}. ` +
          `Debe eliminarse a matrícula antes de eliminar o alumno.`
        );
      }
      
      // Si no tiene matrículas, podemos eliminar
      await remove(alumnoRef);
      console.log(`Alumno con ID ${id} eliminado correctamente`);

      // También eliminar cualquier nota asociada al alumno
      let notasEliminadas = false;
      
      try {
        const notasRef = ref(db, "notas");
        const notasQuery = query(notasRef, orderByChild("alumnoId"), equalTo(id));
        const notasSnapshot = await get(notasQuery);
        
        if (notasSnapshot.exists()) {
          const notasData = notasSnapshot.val();
          // Eliminar cada registro de notas
          for (const notaKey in notasData) {
            await remove(ref(db, `notas/${notaKey}`));
            notasEliminadas = true;
          }
        }
      } catch (indexError) {
        console.warn("Error al buscar notas con índice:", indexError);
        
        // Búsqueda manual de notas si falla el índice
        const todasNotasRef = ref(db, "notas");
        const todasNotasSnapshot = await get(todasNotasRef);
        
        if (todasNotasSnapshot.exists()) {
          const todasNotas = todasNotasSnapshot.val();
          
          // Filtrar y eliminar manualmente
          for (const notaKey in todasNotas) {
            const nota = todasNotas[notaKey];
            if (nota.alumnoId === id) {
              await remove(ref(db, `notas/${notaKey}`));
              notasEliminadas = true;
            }
          }
        }
      }
      
      if (notasEliminadas) {
        console.log(`Notas asociadas al alumno ${id} eliminadas correctamente`);
      }
    } catch (error) {
      console.error("Error al eliminar alumno:", error);
      throw error;
    }
  }
  
  // Obtener alumno por ID
  async getAlumnoById(id: string): Promise<Alumno | undefined> {
    try {
      if (!id) {
        console.error('realtimeDatabaseManager: ID de alumno inválido:', id);
        return undefined;
      }
      
      console.log('realtimeDatabaseManager: getAlumnoById - Buscando alumno con ID:', id);
      
      // Intentar obtener directamente el alumno
      const alumnoRef = ref(db, `alumnos/${id}`);
      const snapshot = await get(alumnoRef);
      
      if (!snapshot.exists()) {
        console.log('realtimeDatabaseManager: No se encontró ningún alumno con ID:', id);
        
        // Método alternativo: buscar manualmente el alumno entre todos los alumnos
        console.log('realtimeDatabaseManager: Buscando manualmente el alumno en todos los registros');
        const todosAlumnosRef = ref(db, 'alumnos');
        const todosAlumnosSnapshot = await get(todosAlumnosRef);
        
        if (todosAlumnosSnapshot.exists()) {
          const alumnos = todosAlumnosSnapshot.val();
          console.log('realtimeDatabaseManager: Total de alumnos disponibles:', Object.keys(alumnos).length);
          
          // Buscar manualmente por ID
          for (const alumnoKey of Object.keys(alumnos)) {
            const alumno = alumnos[alumnoKey];
            if (alumnoKey === id || alumno.id === id) {
              console.log('realtimeDatabaseManager: Alumno encontrado manualmente:', alumno.nome, alumno.apelidos);
              return {
                ...alumno,
                id: alumnoKey
              };
            }
          }
          
          console.warn('realtimeDatabaseManager: Alumno no encontrado ni siquiera en la búsqueda manual');
        } else {
          console.log('realtimeDatabaseManager: No hay alumnos en la base de datos');
        }
        
        return undefined;
      }
      
      const alumnoData = snapshot.val();
      console.log('realtimeDatabaseManager: Alumno encontrado directamente:', alumnoData.nome, alumnoData.apelidos);
      
      return {
        ...alumnoData,
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
      console.log("RealtimeDBManager: Obteniendo asignaturas para el profesor:", profesorId);
      
      if (!profesorId) {
        console.error("RealtimeDBManager: Se proporcionó un profesorId vacío");
        return [];
      }
      
      // Primero obtenemos todas las asignaturas y luego filtramos por profesorId
      const asignaturasRef = ref(db, "asignaturas");
      const snapshot = await get(asignaturasRef);
      
      if (!snapshot.exists()) {
        console.log("RealtimeDBManager: No se encontraron asignaturas en la base de datos");
        return [];
      }
      
      const asignaturasData = snapshot.val();
      console.log("RealtimeDBManager: Todos los datos de asignaturas obtenidos", asignaturasData);
      
      // Convertir objeto a array y filtrar por profesorId
      const asignaturasArray = Object.keys(asignaturasData)
        .map(key => ({
          ...asignaturasData[key],
          id: key
        }))
        .filter(asignatura => asignatura.profesorId === profesorId);
      
      console.log(`RealtimeDBManager: Se encontraron ${asignaturasArray.length} asignaturas para el profesor ${profesorId}:`, asignaturasArray);
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
      // Verificar primero si la asignatura existe
      const asignaturaRef = ref(db, `asignaturas/${id}`);
      const asignaturaSnapshot = await get(asignaturaRef);
      
      if (!asignaturaSnapshot.exists()) {
        throw new Error("A asignatura non existe");
      }
      
      // Obtener nombre de la asignatura para mensajes informativos
      const asignaturaData = asignaturaSnapshot.val();
      const asignaturaNombre = asignaturaData.nome || id;
      
      // Comprobar si hay matrículas asociadas a esta asignatura
      // Esta implementación alternativa es más segura si hay problemas con índices
      let tieneMatriculas = false;
      let alumnosMatriculados: any[] = [];
      let matriculasIds: string[] = [];
      
      try {
        // Intentamos usar la consulta con índice
        const matriculasRef = ref(db, "matriculas");
        const matriculasQuery = query(matriculasRef, orderByChild("asignaturaId"), equalTo(id));
        const matriculasSnapshot = await get(matriculasQuery);
        
        if (matriculasSnapshot.exists()) {
          tieneMatriculas = true;
          const matriculasData = matriculasSnapshot.val();
          Object.entries(matriculasData).forEach(([matriculaId, matricula]: [string, any]) => {
            alumnosMatriculados.push(matricula.alumnoId);
            matriculasIds.push(matriculaId);
          });
        }
      } catch (indexError) {
        console.warn("Error al buscar matrículas con índice:", indexError);
        
        // Si falla la consulta por índice, hacemos una búsqueda manual
        // Esto es más lento pero funciona sin índices
        const todasMatriculasRef = ref(db, "matriculas");
        const todasMatriculasSnapshot = await get(todasMatriculasRef);
        
        if (todasMatriculasSnapshot.exists()) {
          const todasMatriculas = todasMatriculasSnapshot.val();
          
          // Filtrar manualmente
          Object.entries(todasMatriculas).forEach(([matriculaId, matricula]: [string, any]) => {
            if (matricula.asignaturaId === id) {
              tieneMatriculas = true;
              alumnosMatriculados.push(matricula.alumnoId);
              matriculasIds.push(matriculaId);
            }
          });
        }
      }
      
      // Si tiene matrículas, mostramos información detallada
      if (tieneMatriculas) {
        // Obtener información de los alumnos
        const alumnosInfo = await Promise.all(
          [...new Set(alumnosMatriculados)].map(async (alumnoId: string) => {
            const alumnoSnapshot = await get(ref(db, `alumnos/${alumnoId}`));
            if (alumnoSnapshot.exists()) {
              const alumnoData = alumnoSnapshot.val();
              return `${alumnoData.nome} ${alumnoData.apelidos}`;
            }
            return `Alumno ID: ${alumnoId}`;
          })
        );
        
        // Construir mensaje de error con información sobre los alumnos
        const alumnosLista = alumnosInfo.join(", ");
        throw new Error(
          `Non se pode eliminar a asignatura "${asignaturaNombre}" porque ten alumnos matriculados. ` +
          `Alumnos matriculados: ${alumnosLista}. ` +
          `Debe eliminarse as matrículas antes de eliminar a asignatura.`
        );
      }
      
      // También eliminar cualquier nota asociada a la asignatura
      let notasEliminadas = 0;
      
      try {
        const notasRef = ref(db, "notas");
        const notasQuery = query(notasRef, orderByChild("asignaturaId"), equalTo(id));
        const notasSnapshot = await get(notasQuery);
        
        if (notasSnapshot.exists()) {
          const notasData = notasSnapshot.val();
          // Eliminar cada registro de notas
          for (const notaKey in notasData) {
            await remove(ref(db, `notas/${notaKey}`));
            notasEliminadas++;
          }
        }
      } catch (indexError) {
        console.warn("Error al buscar notas con índice:", indexError);
        
        // Búsqueda manual de notas si falla el índice
        const todasNotasRef = ref(db, "notas");
        const todasNotasSnapshot = await get(todasNotasRef);
        
        if (todasNotasSnapshot.exists()) {
          const todasNotas = todasNotasSnapshot.val();
          
          // Filtrar y eliminar manualmente
          for (const notaKey in todasNotas) {
            const nota = todasNotas[notaKey];
            if (nota.asignaturaId === id) {
              await remove(ref(db, `notas/${notaKey}`));
              notasEliminadas++;
            }
          }
        }
      }
      
      // Si no tiene matrículas, podemos eliminar la asignatura
      await remove(asignaturaRef);
      console.log(`Asignatura "${asignaturaNombre}" (ID: ${id}) eliminada correctamente`);
      
      if (notasEliminadas > 0) {
        console.log(`${notasEliminadas} notas asociadas a la asignatura "${asignaturaNombre}" eliminadas correctamente`);
      }
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
      if (!asignaturaId) {
        console.warn('realtimeDatabaseManager: ID de asignatura inválido para getMatriculasByAsignatura:', asignaturaId);
        return [];
      }
      
      console.log('realtimeDatabaseManager: getMatriculasByAsignatura - Buscando matrículas para asignatura:', asignaturaId);
      
      // MÉTODO DIRECTO: Primero obtener TODAS las matrículas y filtrarlas manualmente
      // Este enfoque puede ser más confiable que usar query con orderByChild en algunos casos
      const matriculasRef = ref(db, "matriculas");
      const allMatriculasSnapshot = await get(matriculasRef);
      
      if (!allMatriculasSnapshot.exists()) {
        console.log('realtimeDatabaseManager: No hay matrículas en la base de datos');
        return [];
      }
      
      const allMatriculas = allMatriculasSnapshot.val();
      console.log('realtimeDatabaseManager: Total de matrículas en la base de datos:', Object.keys(allMatriculas).length);
      
      // Filtrar manualmente las matrículas por asignaturaId
      const matriculasFiltradas: Matricula[] = [];
      Object.keys(allMatriculas).forEach(key => {
        const matricula = allMatriculas[key];
        if (matricula.asignaturaId === asignaturaId) {
          matriculasFiltradas.push({
            ...matricula,
            id: key
          });
        }
      });
      
      console.log('realtimeDatabaseManager: Matrículas encontradas para la asignatura', asignaturaId, ':', matriculasFiltradas.length, matriculasFiltradas);
      return matriculasFiltradas;
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
  async getNotaAlumno(alumnoId: string, asignaturaId: string, retryCount = 0): Promise<NotaAlumno | null> {
    try {
      console.log(`[getNotaAlumno] Buscando notas para alumno=${alumnoId}, asignatura=${asignaturaId}`);
      
      // Verificar primero usando el mapa de IDs guardados
      const mapKey = `${alumnoId}-${asignaturaId}`;
      const savedId = this.lastSavedNotaIdMap[mapKey];
      
      // Si tenemos un ID guardado, intentar recuperar directamente
      if (savedId) {
        console.log(`[getNotaAlumno] Intentando recuperar nota usando ID guardado: ${savedId}`);
        try {
          const notaRefById = ref(db, `notas/${savedId}`);
          const snapshotById = await get(notaRefById);
          
          if (snapshotById.exists()) {
            const notaData = snapshotById.val();
            const notaEncontrada: NotaAlumno = {
              ...notaData,
              id: savedId
            };
            console.log(`[getNotaAlumno] ✅ Nota recuperada exitosamente por ID guardado: ${savedId}`);
            return notaEncontrada;
          } else {
            console.log(`[getNotaAlumno] ⚠️ El ID guardado ${savedId} ya no existe, buscando alternativas...`);
            // Limpiar el ID inválido del mapa
            delete this.lastSavedNotaIdMap[mapKey];
          }
        } catch (error) {
          console.error(`[getNotaAlumno] Error al buscar por ID guardado:`, error);
          // Limpiar el ID problemático del mapa
          delete this.lastSavedNotaIdMap[mapKey];
        }
      }
      
      // BÚSQUEDA MANUAL: Obtener TODAS las notas y filtrar manualmente
      console.log(`[getNotaAlumno] 🔍 Realizando búsqueda manual entre todas las notas...`);
      const todasNotasRef = ref(db, "notas");
      const allNotasSnapshot = await get(todasNotasRef);
      
      if (!allNotasSnapshot.exists()) {
        console.log('[getNotaAlumno] 📭 No hay notas en la base de datos');
        return null;
      }
      
      const todasNotas = allNotasSnapshot.val();
      const totalNotas = Object.keys(todasNotas).length;
      console.log(`[getNotaAlumno] 📊 Total de notas en la base de datos: ${totalNotas}`);
      
      // Filtrar manualmente las notas por alumnoId y asignaturaId
      const notasCoincidentes: {id: string, nota: any}[] = [];
      let notasRevisadas = 0;
      
      for (const [key, nota] of Object.entries(todasNotas)) {
        notasRevisadas++;
        if (nota && typeof nota === 'object' && (nota as any).alumnoId === alumnoId && (nota as any).asignaturaId === asignaturaId) {
          notasCoincidentes.push({
            id: key,
            nota: nota
          });
          console.log(`[getNotaAlumno] 🎯 Nota coincidente encontrada: ${key}`);
        }
      }
      
      console.log(`[getNotaAlumno] 📈 Revisadas ${notasRevisadas} notas, encontradas ${notasCoincidentes.length} coincidencias`);
      
      // Si encontramos más de una, usamos la más reciente
      if (notasCoincidentes.length > 1) {
        console.log(`[getNotaAlumno] ⚠️ Múltiples notas encontradas (${notasCoincidentes.length}), seleccionando la más reciente`);
        
        // Ordenar por fecha de actualización (la más reciente primero)
        notasCoincidentes.sort((a, b) => {
          const fechaA = a.nota.updatedAt ? new Date(a.nota.updatedAt).getTime() : 0;
          const fechaB = b.nota.updatedAt ? new Date(b.nota.updatedAt).getTime() : 0;
          return fechaB - fechaA;
        });
        
        const notaMasReciente = notasCoincidentes[0];
        this.lastSavedNotaIdMap[mapKey] = notaMasReciente.id;
        
        console.log(`[getNotaAlumno] ✅ Usando nota más reciente: ${notaMasReciente.id}`);
        return {
          ...notaMasReciente.nota,
          id: notaMasReciente.id
        };
      }
      
      // Si solo hay una nota, la devolvemos
      if (notasCoincidentes.length === 1) {
        const notaEncontrada = notasCoincidentes[0];
        console.log(`[getNotaAlumno] ✅ Nota única encontrada: ${notaEncontrada.id}`);
        
        // Guardar el ID en el mapa para futuras búsquedas
        this.lastSavedNotaIdMap[mapKey] = notaEncontrada.id;
        
        return {
          ...notaEncontrada.nota,
          id: notaEncontrada.id
        };
      }
      
      // Si no se encontró nada y podemos reintentar
      if (retryCount < 1) {
        console.log(`[getNotaAlumno] 🔄 Reintentando búsqueda (intento ${retryCount + 1}/1)...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return this.getNotaAlumno(alumnoId, asignaturaId, retryCount + 1);
      }
      
      console.log(`[getNotaAlumno] ❌ No se encontraron notas para alumno=${alumnoId}, asignatura=${asignaturaId}`);
      return null;
      
    } catch (error) {
      ErrorHandler.logError('getNotaAlumno', error, { alumnoId, asignaturaId, retryCount });
      console.error(`[getNotaAlumno] ❌ Error al obtener nota de alumno:`, error);
      
      // En caso de error, si podemos reintentar, hacerlo
      if (retryCount < 1) {
        console.log(`[getNotaAlumno] 🔄 Reintentando tras error (intento ${retryCount + 1}/1)...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        return this.getNotaAlumno(alumnoId, asignaturaId, retryCount + 1);
      }
      
      return null;
    }
  }
  
  // Helper para verificar si debemos revisar notas en cero (posible error)
  private deberiaComprobarCeros(nota: NotaAlumno): boolean {
    // Esta función podría implementarse para detectar patrones sospechosos
    // Por ahora solo devuelve false para no ejecutar ninguna lógica adicional
    return false;
  }
  




  // Método para inicializar una nota para un alumno en una asignatura
  async initNotaAlumno(alumnoId: string, asignaturaId: string): Promise<NotaAlumno> {
    try {      
      console.log(`Inicializando notas para alumno=${alumnoId}, asignatura=${asignaturaId}`);
      
      // Verificar si ya existe una nota, con múltiples reintentos para asegurar consistencia
      const notaExistente = await this.getNotaAlumno(alumnoId, asignaturaId);
      if (notaExistente) {
        console.log(`Nota existente encontrada con ID=${notaExistente.id}, verificando si está completa...`);
        
        // Obtener la configuración de la asignatura para verificar si la nota existente está completa
        const asignatura = await this.getAsignaturaById(asignaturaId);
        if (!asignatura || !asignatura.configuracionAvaliacion) {
          console.log(`La asignatura ${asignaturaId} no tiene configuración de evaluación`);
          return notaExistente;
        }
        
        // Verificar si la nota existente tiene todas las evaluaciones y pruebas configuradas
        let notaModificada = false;
        const notaActualizada = JSON.parse(JSON.stringify(notaExistente)) as NotaAlumno;
        
        // Mapa para acceder rápidamente a las evaluaciones existentes
        const avalExistentesMap = new Map();
        notaActualizada.notasAvaliaciois.forEach(aval => {
          avalExistentesMap.set(aval.avaliacionId, aval);
        });
        
        // Verificar si faltan evaluaciones
        asignatura.configuracionAvaliacion.avaliaciois.forEach(configAval => {
          let notaAval = avalExistentesMap.get(configAval.id);
          
          if (!notaAval) {
            console.log(`Añadiendo evaluación faltante: ${configAval.id}`);
            notaModificada = true;
            
            // Crear la evaluación faltante con todas sus pruebas
            notaAval = {
              avaliacionId: configAval.id,
              notasProbas: configAval.probas.map(proba => ({
                probaId: proba.id,
                valor: 0,
                observacions: ''
              }))
            };
            
            notaActualizada.notasAvaliaciois.push(notaAval);
          } else {
            // Verificar si faltan pruebas en esta evaluación
            const probasExistentesMap = new Map();
            notaAval.notasProbas.forEach((proba: any) => {
              probasExistentesMap.set(proba.probaId, proba);
            });
            
            configAval.probas.forEach(configProba => {
              if (!probasExistentesMap.has(configProba.id)) {
                console.log(`Añadiendo prueba faltante en evaluación ${configAval.id}: ${configProba.id} (${configProba.nome})`);
                notaModificada = true;
                
                // Añadir la prueba faltante
                notaAval.notasProbas.push({
                  probaId: configProba.id,
                  valor: 0,
                  observacions: ''
                });
              }
            });
          }
        });
        
        // Si se modificó la nota, guardar los cambios
        if (notaModificada) {
          console.log(`La nota existente fue actualizada con evaluaciones/pruebas faltantes, guardando cambios...`);
          notaActualizada.updatedAt = new Date().toISOString();
          await this.updateNotaAlumno(notaActualizada);
          return notaActualizada;
        }
        
        // Si no hubo cambios, devolver la nota existente
        console.log(`La nota existente está completa, no requiere inicialización adicional`);
        return notaExistente;
      }

      console.log(`No se encontró nota existente, creando una nueva`);
      
      // Obtener la configuración de la asignatura
      const asignatura = await this.getAsignaturaById(asignaturaId);
      if (!asignatura || !asignatura.configuracionAvaliacion) {
        throw new Error("Asignatura sen configuración de avaliación");
      }

      // Crear una nueva nota con evaluaciones y pruebas inicializadas
      const now = new Date().toISOString();
      
      // Inicializar las notas de evaluaciones basadas en la configuración de la asignatura
      const notasAvaliaciois = asignatura.configuracionAvaliacion.avaliaciois.map(avaliacion => {
        // Para cada evaluación, inicializar las notas de las pruebas
        const notasProbas = avaliacion.probas.map(proba => {
          return {
            probaId: proba.id,
            valor: 0,
            observacions: ''
          };
        });
        
        return {
          avaliacionId: avaliacion.id,
          notasProbas: notasProbas
        };
      });

      const notaData: Omit<NotaAlumno, "id"> = this.cleanUndefinedValues({
        alumnoId,
        asignaturaId,
        notasAvaliaciois: notasAvaliaciois,
        createdAt: now,
        updatedAt: now
      });

      // Comprobar si ya tenemos un ID guardado en el mapa
      const mapKey = `${alumnoId}-${asignaturaId}`;
      const existingId = this.lastSavedNotaIdMap[mapKey];
      
      if (existingId) {
        console.log(`Usando ID existente ${existingId} para guardar la nueva nota`);
        // Si ya hay un ID guardado, actualizar ese registro en lugar de crear uno nuevo
        await set(ref(db, `notas/${existingId}`), notaData);
        return {
          ...notaData,
          id: existingId
        };
      } else {
        console.log(`Creando nuevo registro para la nota`);
        // Si no hay ID guardado, crear un nuevo registro
        const newNotaRef = push(ref(db, "notas"));
        await set(newNotaRef, notaData);
        
        // Guardar el ID en el mapa para futuras referencias
        this.lastSavedNotaIdMap[mapKey] = newNotaRef.key!;
        
        return {
          ...notaData,
          id: newNotaRef.key!
        };
      }
    } catch (error) {
      ErrorHandler.logError('initNotaAlumno', error, { alumnoId, asignaturaId });
      console.error("Error al inicializar nota de alumno:", error);
      throw error;
    }
  }

  // Actualizar la nota de un alumno
  async updateNotaAlumno(nota: NotaAlumno): Promise<void> {
    try {      
      console.log(`updateNotaAlumno: Actualizando nota para alumno=${nota.alumnoId}, asignatura=${nota.asignaturaId}`);
      
      // Manejo simplificado y más robusto
      const mapKey = `${nota.alumnoId}-${nota.asignaturaId}`;
      const savedId = this.lastSavedNotaIdMap[mapKey];
      
      // Determinar qué ID usar (prioridad: nota.id, savedId, nuevo ID)
      let idToUse: string | undefined = nota.id;
      let datosExistentes = null;
      
      // Verificar si el ID actual existe
      if (idToUse) {
        try {
          const notaRef = ref(db, `notas/${idToUse}`);
          const snapshot = await get(notaRef);
          if (snapshot.exists()) {
            datosExistentes = snapshot.val();
            console.log(`Usando ID actual existente: ${idToUse}`);
          } else {
            console.log(`ID actual ${idToUse} no existe en Firebase`);
            idToUse = undefined; // Marcar como no válido para intentar con savedId
          }
        } catch (err) {
          console.error(`Error al verificar ID actual:`, err);
          idToUse = undefined; // Marcar como no válido para intentar con savedId
        }
      }
      
      // Si el ID actual no es válido pero tenemos un ID guardado, usarlo
      if (idToUse === undefined && savedId) {
        try {
          console.log(`Intentando con ID guardado: ${savedId}`);
          const notaRef = ref(db, `notas/${savedId}`);
          const snapshot = await get(notaRef);
          if (snapshot.exists()) {
            idToUse = savedId;
            datosExistentes = snapshot.val();
            console.log(`Usando ID guardado existente: ${idToUse}`);
          } else {
            console.log(`ID guardado ${savedId} no existe en Firebase`);
          }
        } catch (err) {
          console.error(`Error al verificar ID guardado:`, err);
        }
      }
      
      // Si no tenemos un ID válido, crear uno nuevo
      if (idToUse === undefined) {
        try {
          const newNotaRef = push(ref(db, "notas"));
          idToUse = newNotaRef.key!;
          console.log(`Creando nuevo ID para la nota: ${idToUse}`);
        } catch (err) {
          console.error(`Error al crear nuevo ID:`, err);
          throw new Error("No se pudo crear un ID válido para la nota");
        }
      }
      
      // Preparar datos para guardar (con fecha actualizada)
      const notaToSave = this.cleanUndefinedValues({
        alumnoId: nota.alumnoId,
        asignaturaId: nota.asignaturaId,
        notasAvaliaciois: nota.notasAvaliaciois || [],
        notaFinal: nota.notaFinal,
        createdAt: nota.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      
      // No hacemos fusión compleja para evitar problemas
      // Solo guardamos los datos tal como vienen
      console.log(`Guardando nota con ID: ${idToUse}`, notaToSave);
      
      try {
        await set(ref(db, `notas/${idToUse}`), notaToSave);
        
        // Actualizar el mapa con el ID usado
        this.lastSavedNotaIdMap[mapKey] = idToUse;
        
        console.log(`Nota guardada exitosamente con ID: ${idToUse}`);
      } catch (saveErr) {
        console.error("Error al guardar nota:", saveErr);
        console.error("Datos que se intentaron guardar:", notaToSave);
        throw saveErr;
      }
    } catch (error) {
      ErrorHandler.logError('updateNotaAlumno', error, { alumnoId: nota.alumnoId, asignaturaId: nota.asignaturaId });
      console.error("Error general en updateNotaAlumno:", error);
      throw error;
    }
  }

  // Eliminar todas las notas de un alumno en una asignatura
  async eliminarNotasAlumnoAsignatura(alumnoId: string, asignaturaId: string): Promise<void> {
    try {
      console.log(`realtimeDatabaseManager: eliminando notas para alumno=${alumnoId}, asignatura=${asignaturaId}`);
      
      // Buscar todas las notas del alumno
      const notasRefByAlumno = query(ref(db, "notas"), orderByChild("alumnoId"), equalTo(alumnoId));
      const snapshot = await get(notasRefByAlumno);
      
      if (!snapshot.exists()) {
        console.log("No se encontraron notas para eliminar");
        return;
      }
      
      const notasData = snapshot.val();
      let notasEliminadas = 0;
      
      // Eliminar las notas que coincidan con la asignatura
      for (const key of Object.keys(notasData)) {
        const nota = notasData[key];
        if (nota.asignaturaId === asignaturaId) {
          await remove(ref(db, `notas/${key}`));
          notasEliminadas++;
        }
      }
      
      // Eliminar la entrada del mapa de notas guardadas
      delete this.lastSavedNotaIdMap[`${alumnoId}-${asignaturaId}`];
      
      console.log(`realtimeDatabaseManager: ${notasEliminadas} notas eliminadas`);
    } catch (error) {
      console.error("Error al eliminar notas de alumno en asignatura:", error);
      throw error;
    }
  }

  // Obtener todas las notas
  async getNotas(): Promise<NotaAlumno[]> {
    try {
      console.log('realtimeDatabaseManager: obteniendo todas las notas');
      
      const notasRef = ref(db, "notas");
      const snapshot = await get(notasRef);
      
      if (!snapshot.exists()) {
        return [];
      }
      
      const notasData = snapshot.val();
      
      // Convertir objeto a array de notas
      const notasArray: NotaAlumno[] = Object.keys(notasData).map(key => ({
        ...notasData[key],
        id: key
      }));
      
      console.log(`realtimeDatabaseManager: se encontraron ${notasArray.length} notas`);
      return notasArray;
    } catch (error) {
      console.error("Error al obtener todas las notas:", error);
      return [];
    }
  }

  // Obtener notas por asignatura
  async getNotasAsignatura(asignaturaId: string): Promise<NotaAlumno[]> {
    try {
      console.log('realtimeDatabaseManager: obteniendo notas para la asignatura', asignaturaId);
      
      // Obtener todas las notas (ya que Firebase no permite directamente filtrar por asignaturaId)
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
      
      console.log(`realtimeDatabaseManager: se encontraron ${notasAsignatura.length} notas para la asignatura ${asignaturaId}`);
      return notasAsignatura;
    } catch (error) {
      console.error("Error al obtener notas por asignatura:", error);
      return [];
    }
  }

  // Verificar conectividad con Firebase
  async verifyConnectivity(): Promise<boolean> {
    try {
      console.log('Verificando conectividad con Firebase...');
      // Usar un path más simple que no cause problemas de token
      const testRef = ref(db, 'test');
      const snapshot = await get(testRef);
      console.log('Conectividad Firebase verificada correctamente');
      return true;
    } catch (error) {
      console.error('Error al verificar conectividad:', error);
      return false;
    }
  }

  // Verificar permisos básicos
  async verifyPermissions(): Promise<boolean> {
    try {
      console.log('Verificando permisos básicos...');
      // Intentar leer algo simple para verificar permisos
      const testRef = ref(db, 'test');
      await get(testRef);
      console.log('Permisos de lectura verificados');
      return true;
    } catch (error) {
      console.error('Error de permisos:', error);
      return false;
    }
  }

  // Función auxiliar para limpiar valores undefined de un objeto
  private cleanUndefinedValues(obj: any): any {
    if (obj === null || obj === undefined) {
      return null;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.cleanUndefinedValues(item)).filter(item => item !== undefined);
    }
    
    if (typeof obj === 'object') {
      const cleaned: any = {};
      for (const [key, value] of Object.entries(obj)) {
        if (value !== undefined) {
          cleaned[key] = this.cleanUndefinedValues(value);
        }
      }
      return cleaned;
    }
    
    return obj;
  }
}

export const realtimeDatabaseManager = new RealtimeDatabaseManager();
