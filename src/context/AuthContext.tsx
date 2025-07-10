import React, { createContext, useState, useContext, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { Profesor } from '../utils/storageManager';
import { storageManager } from '../utils/storageManager';

// Prefijo para todas las claves de almacenamiento (debe coincidir con el de storageManager)
const STORAGE_PREFIX = 'kampos_xestion_';
const AUTH_USER_KEY = `${STORAGE_PREFIX}auth_user`;

// Tipo para el usuario autenticado
interface AuthUser {
  id: string;
  nome: string;
  apelidos: string;
  email: string;
}

// Tipo para el contexto de autenticación
interface AuthContextType {
  currentUser: AuthUser | null;
  login: (email: string, contrasinal: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
}

// Crear el contexto
const AuthContext = createContext<AuthContextType | null>(null);

// Proveedor del contexto
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  // Verificar si hay un usuario en localStorage al cargar
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem(AUTH_USER_KEY);
      if (savedUser) {
        try {
          const parsedUser = JSON.parse(savedUser);
          setCurrentUser(parsedUser);
          setIsAuthenticated(true);
          console.log('Usuario autenticado cargado correctamente:', parsedUser.nome);
        } catch (error) {
          console.error('Error parsing saved user', error);
          localStorage.removeItem(AUTH_USER_KEY);
        }
      } else {
        console.log('No se encontró ningún usuario autenticado');
      }
    } catch (error) {
      console.error('Error accediendo al localStorage:', error);
    }
  }, []);

  // Función de login
  const login = async (email: string, contrasinal: string): Promise<boolean> => {
    try {
      const profesores = storageManager.getProfesores();
      console.log(`Intentando login con email: ${email}`);
      console.log(`Profesores disponibles: ${profesores.length}`);
      
      const profesor = profesores.find(p => p.email === email && p.contrasinal === contrasinal);
      
      if (profesor) {
        const authUser: AuthUser = {
          id: profesor.id,
          nome: profesor.nome,
          apelidos: profesor.apelidos,
          email: profesor.email
        };
        
        setCurrentUser(authUser);
        setIsAuthenticated(true);
        
        try {
          localStorage.setItem(AUTH_USER_KEY, JSON.stringify(authUser));
          console.log('Usuario autenticado guardado en localStorage:', authUser.nome);
        } catch (storageError) {
          console.error('Error guardando usuario en localStorage:', storageError);
        }
        
        return true;
      }
      
      console.log('Credenciales inválidas');
      return false;
    } catch (error) {
      console.error('Error durante el login:', error);
      return false;
    }
  };

  // Función de logout
  const logout = () => {
    try {
      setCurrentUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem(AUTH_USER_KEY);
      console.log('Sesión cerrada correctamente');
    } catch (error) {
      console.error('Error durante el logout:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ currentUser, login, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook personalizado para usar el contexto
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};
