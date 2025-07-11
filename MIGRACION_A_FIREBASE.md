# Guía para Implementar Firebase en Kampos Xestión

Esta guía te ayudará a migrar tu aplicación de almacenamiento local (localStorage) a Firebase, lo que permitirá que los datos sean accesibles desde cualquier dispositivo.

## Por qué LocalStorage no es adecuado para datos compartidos

El problema que estás experimentando (no poder acceder a los mismos datos desde diferentes dispositivos) es inherente a cómo funciona `localStorage`:

- Los datos de localStorage están limitados al navegador específico en un dispositivo específico
- No hay sincronización automática entre dispositivos
- Cada dispositivo tiene su propio almacenamiento local aislado

## Solución con Firebase

Firebase proporciona:
- Autenticación de usuarios (login/registro)
- Base de datos en la nube (Firestore)
- Sincronización en tiempo real entre dispositivos
- Reglas de seguridad para proteger los datos

## Pasos para la implementación

### 1. Crear un proyecto en Firebase

1. Ve a [console.firebase.google.com](https://console.firebase.google.com/)
2. Haz clic en "Añadir proyecto"
3. Sigue los pasos para crear un nuevo proyecto (por ejemplo, "kampos-xestion")
4. Habilita Firestore y Authentication en el panel de Firebase

### 2. Obtener las credenciales de configuración

1. En la consola de Firebase, ve a la configuración del proyecto
2. Selecciona la opción "Añadir app" y escoge la plataforma web
3. Registra la aplicación y copia el objeto `firebaseConfig`
4. Reemplaza las credenciales en `src/firebase/config.ts` con las tuyas

### 3. Habilitar servicios de Firebase

#### Authentication
1. En la consola de Firebase, ve a "Authentication" > "Sign-in method"
2. Habilita el proveedor "Correo electrónico/contraseña"

#### Firestore
1. Ve a "Firestore Database" y crea una base de datos
2. Comienza en modo de prueba (para desarrollo)
3. Más adelante, configura reglas de seguridad adecuadas

### 4. Actualizar el contexto de autenticación

Reemplaza `src/context/AuthContext.tsx` con nuestro nuevo `src/firebase/FirebaseAuthContext.tsx`:

```tsx
import { FirebaseAuthProvider } from '../firebase/FirebaseAuthContext';

// En tu App.tsx o donde uses el proveedor de autenticación
function App() {
  return (
    <FirebaseAuthProvider>
      {/* Tu aplicación */}
    </FirebaseAuthProvider>
  );
}
```

### 5. Migrar del almacenamiento local a Firebase

#### Estrategia de migración gradual

Para minimizar el riesgo, puedes implementar una migración gradual:

1. Primero, migra la autenticación y el registro de profesores
2. Luego, migra la gestión de alumnos
3. Después, migra asignaturas y matrículas
4. Finalmente, migra las notas

#### Ejemplo de migración para profesores

```tsx
// En ProfesoresForm.tsx
import { useAuth } from '../firebase/FirebaseAuthContext';
import { firebaseStorageManager } from '../firebase/firebaseStorageManager';

// Usar useAuth de Firebase en lugar del contexto actual
const { register } = useAuth();

// Al registrar un profesor:
try {
  await register({
    nome: formData.nome,
    apelidos: formData.apelidos,
    email: formData.email,
    telefono: formData.telefono,
    contrasinal: formData.contrasinal
  });
  navigate('/login');
} catch (error) {
  console.error('Error al registrar:', error);
  // Manejar error
}
```

### 6. Estructura de datos en Firestore

Firestore organiza los datos en colecciones y documentos. Sugerimos la siguiente estructura:

- **profesores**: Colección de profesores registrados
  - `[profesorId]`: ID único del profesor (mismo que el UID de Auth)
    - nome: string
    - apelidos: string
    - email: string
    - telefono: string
    - activo: boolean

- **alumnos**: Colección de alumnos
  - `[alumnoId]`: ID único generado automáticamente
    - profesorId: string (referencia al profesor)
    - nome: string
    - apelidos: string
    - email: string
    - telefono: string
    - createdAt: timestamp
    - updatedAt: timestamp

- **asignaturas**: Colección de asignaturas
  - `[asignaturaId]`: ID único
    - profesorId: string
    - nome: string
    - nivel: string
    - curso: number
    - sesionsSemanais: number
    - numeroAvaliaciois: number
    - configuracionAvaliacion: object
    - createdAt: timestamp
    - updatedAt: timestamp

- **matriculas**: Colección de relaciones alumno-asignatura
  - `[matriculaId]`: ID único
    - alumnoId: string
    - asignaturaId: string
    - createdAt: timestamp
    - updatedAt: timestamp

- **notas**: Colección de notas de alumnos
  - `[notaId]`: ID único
    - alumnoId: string
    - asignaturaId: string
    - notasAvaliaciois: array
    - notaFinal: number
    - createdAt: timestamp
    - updatedAt: timestamp

### 7. Migración de datos existentes

Si ya tienes datos en localStorage que deseas conservar:

```typescript
// Función para migrar datos existentes
async function migrarDatosExistentes() {
  // 1. Obtener datos de localStorage
  const profesores = storageManager.getProfesores();
  const alumnos = storageManager.getAlumnos();
  const asignaturas = storageManager.getAsignaturas();
  const matriculas = storageManager.getMatriculas();
  const notas = storageManager.getNotas();
  
  // 2. Subir datos a Firebase
  // NOTA: Esto es un ejemplo simplificado, deberás manejar las credenciales
  // y las relaciones correctamente
  
  // Migrar profesores
  for (const profesor of profesores) {
    try {
      // Crear usuario de autenticación
      // Este paso requiere una función en el backend (Cloud Functions)
      // para crear usuarios con contraseñas existentes
      
      // Alternativamente, pedir a los usuarios que restablezcan sus contraseñas
      await setDoc(doc(db, "profesores", profesor.id), {
        nome: profesor.nome,
        apelidos: profesor.apelidos,
        email: profesor.email,
        telefono: profesor.telefono,
        activo: profesor.activo
      });
    } catch (error) {
      console.error(`Error al migrar profesor ${profesor.id}:`, error);
    }
  }
  
  // Migrar otros datos siguiendo el mismo patrón...
}
```

### 8. Consideraciones de seguridad

1. **Reglas de Firestore**: Configura reglas para asegurar que los usuarios solo puedan acceder a sus propios datos:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Permitir a los profesores leer/escribir sus propios datos
    match /profesores/{profesorId} {
      allow read, update, delete: if request.auth != null && request.auth.uid == profesorId;
      allow create: if request.auth != null;
    }
    
    // Alumnos solo pueden ser modificados por su profesor
    match /alumnos/{alumnoId} {
      allow read, write: if request.auth != null && 
                           resource.data.profesorId == request.auth.uid;
    }
    
    // Reglas similares para asignaturas, matrículas y notas
  }
}
```

2. **Protege las API Keys**: Aunque las API Keys de Firebase son públicas, es una buena práctica configurar restricciones de dominio en la consola de Firebase.

### 9. Implementación y prueba

1. Prueba la autenticación con Firebase
2. Prueba la creación y recuperación de datos
3. Verifica la sincronización entre diferentes dispositivos
4. Configura reglas de seguridad adecuadas

### 10. Consideraciones adicionales

- **Modo offline**: Firebase permite trabajar offline y sincronizar cuando hay conexión.
- **Costos**: El plan gratuito de Firebase tiene límites generosos, pero revisa la documentación.
- **Backup**: Configura copias de seguridad periódicas de los datos de Firestore.
