# Migración a Firebase Realtime Database

Este documento describe el proceso de migración de la aplicación de almacenamiento local (localStorage) a Firebase Realtime Database.

## Pasos para la migración

### 1. Configuración inicial (Completado)

- [x] Configurar Firebase en el proyecto (`src/firebase/config.ts`)
- [x] Crear el gestor de datos para Realtime Database (`src/firebase/realtimeDatabaseManager.ts`)
- [x] Crear un contexto de autenticación para Firebase (`src/firebase/RealtimeAuthContext.tsx`)

### 2. Implementación de la migración

#### Fase 1: Coexistencia de ambos sistemas

Durante esta fase, la aplicación podrá leer y escribir en ambos sistemas (localStorage y Firebase Realtime Database) para facilitar la transición.

1. Modifique el componente `App.tsx` para utilizar el nuevo proveedor de autenticación:
   ```tsx
   import { RealtimeAuthProvider } from './firebase/RealtimeAuthContext';

   function App() {
     return (
       <RealtimeAuthProvider>
         <AppContent />
       </RealtimeAuthProvider>
     )
   }
   ```

2. Actualice el componente `ProtectedRoute.tsx` para usar la nueva autenticación:
   ```tsx
   import { useRealtimeAuth } from '../firebase/RealtimeAuthContext';

   const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
     const { currentUser, loading } = useRealtimeAuth();

     if (loading) {
       return <div>Cargando...</div>;
     }

     if (!currentUser) {
       return <Navigate to="/login" />;
     }

     return <>{children}</>;
   };
   ```

3. Cree un adaptador para facilitar la migración:
   - Cree `src/utils/dataManager.ts` que servirá como punto de entrada unificado para los datos
   - Este adaptador usará Firebase cuando esté disponible y localStorage como respaldo

#### Fase 2: Migración de componentes

Actualice los componentes principales para utilizar el nuevo gestor de datos:

1. Páginas de alumnos (`src/pages/Alumnos/*.tsx`)
2. Páginas de asignaturas (`src/pages/Asignaturas/*.tsx`)
3. Páginas de notas (`src/pages/Notas/*.tsx`)
4. Otros componentes que utilicen `storageManager`

#### Fase 3: Migración de datos existentes

Una vez que la aplicación esté utilizando Firebase Realtime Database, migre los datos existentes:

1. Implemente una función de migración para transferir datos de localStorage a Firebase
2. Ejecute la migración para cada usuario la primera vez que inicie sesión con el nuevo sistema

### 3. Validación y pruebas

1. Verifique que los datos se guarden correctamente en Firebase
2. Compruebe que la autenticación funcione correctamente
3. Pruebe la aplicación en múltiples dispositivos para verificar la sincronización de datos

### 4. Eliminación del sistema antiguo

Una vez completada la migración y verificado su correcto funcionamiento:

1. Elimine el código relacionado con localStorage
2. Mantenga solo las interfaces de tipos compartidas entre ambos sistemas

## Reglas de seguridad para Realtime Database

Para asegurar su base de datos, configure las reglas de seguridad en la consola de Firebase:

```json
{
  "rules": {
    "profesores": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid"
      }
    },
    "alumnos": {
      ".indexOn": ["profesorId"],
      "$alumnoId": {
        ".read": "data.child('profesorId').val() === auth.uid",
        ".write": "newData.child('profesorId').val() === auth.uid"
      }
    },
    "asignaturas": {
      ".indexOn": ["profesorId"],
      "$asignaturaId": {
        ".read": "data.child('profesorId').val() === auth.uid",
        ".write": "newData.child('profesorId').val() === auth.uid"
      }
    },
    "matriculas": {
      ".indexOn": ["alumnoId", "asignaturaId"],
      "$matriculaId": {
        ".read": "root.child('alumnos').child(data.child('alumnoId').val()).child('profesorId').val() === auth.uid",
        ".write": "root.child('alumnos').child(newData.child('alumnoId').val()).child('profesorId').val() === auth.uid"
      }
    },
    "notas": {
      ".indexOn": ["alumnoId", "asignaturaId"],
      "$notaId": {
        ".read": "root.child('alumnos').child(data.child('alumnoId').val()).child('profesorId').val() === auth.uid",
        ".write": "root.child('alumnos').child(newData.child('alumnoId').val()).child('profesorId').val() === auth.uid"
      }
    }
  }
}
```

Estas reglas garantizan que cada profesor solo pueda acceder y modificar sus propios datos.
