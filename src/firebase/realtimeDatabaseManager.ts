import { ref, get, set, push, remove, query, orderByChild, equalTo, update, child } from "firebase/database";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { db, auth } from "../firebase/config";
import type { Alumno, Asignatura, Matricula, NotaAlumno, NotaAvaliacion, NotaProba, Profesor } from "../utils/storageManager";

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
  async getNotaAlumno(alumnoId: string, asignaturaId: string): Promise<NotaAlumno | null> {
    try {
      console.log(`Buscando notas para alumno=${alumnoId}, asignatura=${asignaturaId}`);
      
      // Utilizamos un índice compuesto para búsqueda más eficiente
      // Para esto debe existir un índice en Firebase:
      // ".indexOn": ["alumnoId", "asignaturaId"]
      
      // Primero intentamos buscar usando alumnoId como índice
      const notasRefByAlumno = query(ref(db, "notas"), orderByChild("alumnoId"), equalTo(alumnoId));
      const snapshotByAlumno = await get(notasRefByAlumno);
      
      if (snapshotByAlumno.exists()) {
        const notasData = snapshotByAlumno.val();
        
        // Buscar entre las notas del alumno la correspondiente a la asignatura
        for (const key of Object.keys(notasData)) {
          const nota = notasData[key];
          if (nota.asignaturaId === asignaturaId) {
            const notaEncontrada: NotaAlumno = {
              ...nota,
              id: key
            };
            
            console.log(`Nota encontrada con ID: ${key}`);
            return notaEncontrada;
          }
        }
      }
      
      console.log(`No se encontraron notas para alumno=${alumnoId}, asignatura=${asignaturaId}`);
      return null;
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
        notaFinal: 0, // Inicializar con nota final 0
        createdAt: now,
        updatedAt: now
      };

      // Guardar en la base de datos
      const newNotaRef = push(ref(db, "notas"));
      await set(newNotaRef, nuevaNota);
      
      const notaConId = {
        ...nuevaNota,
        id: newNotaRef.key!
      };
      
      // Ahora vamos a calcular y actualizar las notas iniciales
      await this.updateNotaAlumno(notaConId);
      
      // Recuperar la nota con los cálculos aplicados
      const notaActualizada = await this.getNotaAlumno(alumnoId, asignaturaId);
      return notaActualizada || notaConId;
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
      
      // Obtener la configuración actualizada de la asignatura
      const asignatura = await this.getAsignaturaById(nota.asignaturaId);
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
      
      // Actualizar la nota existente
      const notaRef = ref(db, `notas/${nota.id}`);
      
      // Eliminar el ID del objeto antes de guardarlo en Firebase
      const { id, ...notaSinId } = notaActualizada;
      
      await update(notaRef, notaSinId);
      console.log(`Notas actualizadas para alumno ${notaActualizada.alumnoId} en asignatura ${notaActualizada.asignaturaId}. Nota final: ${notaActualizada.notaFinal}`);
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
