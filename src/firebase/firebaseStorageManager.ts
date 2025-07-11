import { collection, doc, addDoc, setDoc, getDocs, query, where, deleteDoc, getDoc, updateDoc, QueryConstraint } from "firebase/firestore";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { db, auth } from "../firebase/config";
import type { Alumno, Asignatura, Matricula, NotaAlumno, Profesor } from "../utils/storageManager";

class FirebaseStorageManager {
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
      
      // 2. Guardar datos del profesor en Firestore
      const profesorData = {
        ...profesor,
        id: userCredential.user.uid, // Usamos el UID de Firebase Auth como ID del profesor
        activo: true
      };
      
      // Eliminar la contraseña antes de almacenar en Firestore (ya está en Auth)
      delete profesorData.contrasinal;
      
      // Guardar en la colección "profesores"
      await setDoc(doc(db, "profesores", userCredential.user.uid), profesorData);
      
      return userCredential.user.uid;
    } catch (error) {
      console.error("Error al registrar profesor:", error);
      throw error;
    }
  }
  
  // Iniciar sesión
  async loginProfesor(email: string, password: string): Promise<Profesor> {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Obtener datos del profesor de Firestore
      const profesorDoc = await getDoc(doc(db, "profesores", userCredential.user.uid));
      
      if (!profesorDoc.exists()) {
        throw new Error("O profesor non existe na base de datos");
      }
      
      // Devolver los datos del profesor
      const profesorData = profesorDoc.data() as Profesor;
      return {
        ...profesorData,
        id: userCredential.user.uid
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
      const profesoresRef = collection(db, "profesores");
      const snapshot = await getDocs(profesoresRef);
      
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id
        } as Profesor;
      });
    } catch (error) {
      console.error("Error al obtener profesores:", error);
      return [];
    }
  }
  
  // Obtener profesor por ID
  async getProfesorById(id: string): Promise<Profesor | undefined> {
    try {
      const profesorDoc = await getDoc(doc(db, "profesores", id));
      if (!profesorDoc.exists()) {
        return undefined;
      }
      
      return {
        ...profesorDoc.data(),
        id: profesorDoc.id
      } as Profesor;
    } catch (error) {
      console.error("Error al obtener profesor por ID:", error);
      return undefined;
    }
  }
  
  // Actualizar profesor
  async updateProfesor(profesor: Profesor): Promise<void> {
    try {
      const profesorRef = doc(db, "profesores", profesor.id);
      
      // Hacer una copia del objeto para no modificar el original
      const profesorData = { ...profesor };
      delete profesorData.id; // Eliminar el ID porque ya está en la referencia del documento
      
      await updateDoc(profesorRef, profesorData);
    } catch (error) {
      console.error("Error al actualizar profesor:", error);
      throw error;
    }
  }
  
  // GESTIÓN DE ALUMNOS
  
  // Obtener alumnos de un profesor
  async getAlumnosByProfesor(profesorId: string): Promise<Alumno[]> {
    try {
      const alumnosRef = collection(db, "alumnos");
      const q = query(alumnosRef, where("profesorId", "==", profesorId));
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => {
        return {
          ...doc.data(),
          id: doc.id
        } as Alumno;
      });
    } catch (error) {
      console.error("Error al obtener alumnos:", error);
      return [];
    }
  }
  
  // Añadir un alumno
  async addAlumno(alumno: Omit<Alumno, "id" | "createdAt" | "updatedAt">): Promise<string> {
    try {
      const now = new Date().toISOString();
      const alumnoData = {
        ...alumno,
        createdAt: now,
        updatedAt: now
      };
      
      const docRef = await addDoc(collection(db, "alumnos"), alumnoData);
      return docRef.id;
    } catch (error) {
      console.error("Error al añadir alumno:", error);
      throw error;
    }
  }
  
  // Actualizar un alumno
  async updateAlumno(alumno: Alumno): Promise<void> {
    try {
      const alumnoRef = doc(db, "alumnos", alumno.id);
      
      // Actualizar fecha de modificación
      const alumnoData = {
        ...alumno,
        updatedAt: new Date().toISOString()
      };
      delete alumnoData.id; // Eliminar el ID porque ya está en la referencia del documento
      
      await updateDoc(alumnoRef, alumnoData);
    } catch (error) {
      console.error("Error al actualizar alumno:", error);
      throw error;
    }
  }
  
  // Eliminar un alumno
  async deleteAlumno(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, "alumnos", id));
      
      // También podríamos eliminar sus matrículas y notas
      // Esto debería hacerse con una función de Cloud Functions para garantizar atomicidad
    } catch (error) {
      console.error("Error al eliminar alumno:", error);
      throw error;
    }
  }
  
  // GESTIÓN DE ASIGNATURAS
  
  // Obtener asignaturas de un profesor
  async getAsignaturasByProfesor(profesorId: string): Promise<Asignatura[]> {
    try {
      const asignaturasRef = collection(db, "asignaturas");
      const q = query(asignaturasRef, where("profesorId", "==", profesorId));
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => {
        return {
          ...doc.data(),
          id: doc.id
        } as Asignatura;
      });
    } catch (error) {
      console.error("Error al obtener asignaturas:", error);
      return [];
    }
  }
  
  // Añadir una asignatura
  async addAsignatura(asignatura: Omit<Asignatura, "id" | "createdAt" | "updatedAt">): Promise<string> {
    try {
      const now = new Date().toISOString();
      const asignaturaData = {
        ...asignatura,
        createdAt: now,
        updatedAt: now
      };
      
      const docRef = await addDoc(collection(db, "asignaturas"), asignaturaData);
      return docRef.id;
    } catch (error) {
      console.error("Error al añadir asignatura:", error);
      throw error;
    }
  }
  
  // GESTIÓN DE MATRÍCULAS
  
  // Matricular un alumno en una asignatura
  async matricularAlumno(alumnoId: string, asignaturaId: string): Promise<string> {
    try {
      // Verificar si ya existe la matrícula
      const matriculasRef = collection(db, "matriculas");
      const q = query(
        matriculasRef, 
        where("alumnoId", "==", alumnoId),
        where("asignaturaId", "==", asignaturaId)
      );
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        throw new Error("O alumno xa está matriculado nesta asignatura");
      }
      
      // Crear nueva matrícula
      const now = new Date().toISOString();
      const matriculaData = {
        alumnoId,
        asignaturaId,
        createdAt: now,
        updatedAt: now
      };
      
      const docRef = await addDoc(collection(db, "matriculas"), matriculaData);
      return docRef.id;
    } catch (error) {
      console.error("Error al matricular alumno:", error);
      throw error;
    }
  }
  
  // Obtener matrículas por asignatura
  async getMatriculasByAsignatura(asignaturaId: string): Promise<Matricula[]> {
    try {
      const matriculasRef = collection(db, "matriculas");
      const q = query(matriculasRef, where("asignaturaId", "==", asignaturaId));
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => {
        return {
          ...doc.data(),
          id: doc.id
        } as Matricula;
      });
    } catch (error) {
      console.error("Error al obtener matrículas:", error);
      return [];
    }
  }
  
  // GESTIÓN DE NOTAS
  
  // Obtener nota de un alumno en una asignatura
  async getNotaAlumno(alumnoId: string, asignaturaId: string): Promise<NotaAlumno | null> {
    try {
      const notasRef = collection(db, "notas");
      const q = query(
        notasRef, 
        where("alumnoId", "==", alumnoId),
        where("asignaturaId", "==", asignaturaId)
      );
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        return null;
      }
      
      const doc = snapshot.docs[0];
      return {
        ...doc.data(),
        id: doc.id
      } as NotaAlumno;
    } catch (error) {
      console.error("Error al obtener nota de alumno:", error);
      return null;
    }
  }
  
  // Actualizar nota de un alumno
  async updateNotaAlumno(nota: NotaAlumno): Promise<void> {
    try {
      // Si no tiene ID, es una nueva nota
      if (!nota.id) {
        // Verificar si ya existe una nota para este alumno y asignatura
        const existingNota = await this.getNotaAlumno(nota.alumnoId, nota.asignaturaId);
        
        if (existingNota) {
          // Si existe, actualizar
          nota.id = existingNota.id;
        } else {
          // Si no existe, crear una nueva
          const now = new Date().toISOString();
          const notaData = {
            ...nota,
            createdAt: now,
            updatedAt: now
          };
          
          const docRef = await addDoc(collection(db, "notas"), notaData);
          return;
        }
      }
      
      // Actualizar la nota existente
      const notaRef = doc(db, "notas", nota.id);
      const notaData = {
        ...nota,
        updatedAt: new Date().toISOString()
      };
      delete notaData.id;
      
      await updateDoc(notaRef, notaData);
    } catch (error) {
      console.error("Error al actualizar nota de alumno:", error);
      throw error;
    }
  }
}

export const firebaseStorageManager = new FirebaseStorageManager();
