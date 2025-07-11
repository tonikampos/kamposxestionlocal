import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import type { User } from "firebase/auth";
import { auth } from "../firebase/config";
import { firebaseStorageManager } from "./firebaseStorageManager";
import type { Profesor } from "../utils/storageManager";

interface AuthContextType {
  currentUser: Profesor | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (profesor: Omit<Profesor, "id" | "activo">) => Promise<string>;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
  register: async () => "",
});

export function useAuth() {
  return useContext(AuthContext);
}

export function FirebaseAuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<Profesor | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);

  // Efecto para cargar datos del usuario cuando cambia la autenticación de Firebase
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      
      if (user) {
        try {
          // Cargar datos del profesor desde Firestore
          const profesor = await firebaseStorageManager.getProfesorById(user.uid);
          if (profesor) {
            setCurrentUser(profesor);
          } else {
            // Si no encontramos los datos del profesor, cerrar sesión
            await auth.signOut();
            setCurrentUser(null);
          }
        } catch (error) {
          console.error("Error al cargar datos del profesor:", error);
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Función para iniciar sesión
  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const profesor = await firebaseStorageManager.loginProfesor(email, password);
      setCurrentUser(profesor);
    } catch (error) {
      console.error("Error en login:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Función para cerrar sesión
  const logout = async () => {
    setLoading(true);
    try {
      await firebaseStorageManager.logoutProfesor();
      setCurrentUser(null);
    } catch (error) {
      console.error("Error en logout:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Función para registrar un nuevo profesor
  const register = async (profesorData: Omit<Profesor, "id" | "activo">) => {
    setLoading(true);
    try {
      // Añadimos la propiedad activo que requiere el método
      const profesor = { ...profesorData, activo: true };
      const profesorId = await firebaseStorageManager.registerProfesor(profesor);
      return profesorId;
    } catch (error) {
      console.error("Error en registro:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const value = {
    currentUser,
    loading,
    login,
    logout,
    register,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
