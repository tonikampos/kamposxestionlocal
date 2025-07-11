# Reglas de seguridad para Firestore

Este archivo contiene reglas de seguridad recomendadas para tu aplicación Kampos Xestión con Firebase. Puedes copiarlas y pegarlas en la consola de Firebase en la sección "Reglas" de Firestore.

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Función para verificar si el usuario está autenticado
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Función para verificar si el usuario es el propietario del documento
    function isOwner(profesorId) {
      return request.auth.uid == profesorId;
    }
    
    // Profesores solo pueden leer/escribir sus propios datos
    match /profesores/{profesorId} {
      allow read: if isAuthenticated() && isOwner(profesorId);
      allow update, delete: if isAuthenticated() && isOwner(profesorId);
      allow create: if isAuthenticated();
    }
    
    // Alumnos solo pueden ser leídos/modificados por su profesor
    match /alumnos/{alumnoId} {
      allow read, write: if isAuthenticated() && 
                           resource.data.profesorId == request.auth.uid;
      allow create: if isAuthenticated() && 
                      request.resource.data.profesorId == request.auth.uid;
    }
    
    // Asignaturas solo pueden ser leídas/modificadas por su profesor
    match /asignaturas/{asignaturaId} {
      allow read, write: if isAuthenticated() && 
                           resource.data.profesorId == request.auth.uid;
      allow create: if isAuthenticated() && 
                      request.resource.data.profesorId == request.auth.uid;
    }
    
    // Matrículas: verificar que el profesor sea propietario del alumno o la asignatura
    match /matriculas/{matriculaId} {
      // Función para verificar si el profesor es dueño del alumno
      function isAlumnoOwner(alumnoId) {
        return get(/databases/$(database)/documents/alumnos/$(alumnoId)).data.profesorId == request.auth.uid;
      }
      
      // Función para verificar si el profesor es dueño de la asignatura
      function isAsignaturaOwner(asignaturaId) {
        return get(/databases/$(database)/documents/asignaturas/$(asignaturaId)).data.profesorId == request.auth.uid;
      }
      
      allow read: if isAuthenticated() && (
                    isAlumnoOwner(resource.data.alumnoId) || 
                    isAsignaturaOwner(resource.data.asignaturaId)
                  );
                  
      allow create: if isAuthenticated() && (
                      isAlumnoOwner(request.resource.data.alumnoId) && 
                      isAsignaturaOwner(request.resource.data.asignaturaId)
                    );
                    
      allow update, delete: if isAuthenticated() && (
                              isAlumnoOwner(resource.data.alumnoId) && 
                              isAsignaturaOwner(resource.data.asignaturaId)
                            );
    }
    
    // Notas: verificar que el profesor sea propietario del alumno y la asignatura
    match /notas/{notaId} {
      function isAlumnoOwner(alumnoId) {
        return get(/databases/$(database)/documents/alumnos/$(alumnoId)).data.profesorId == request.auth.uid;
      }
      
      function isAsignaturaOwner(asignaturaId) {
        return get(/databases/$(database)/documents/asignaturas/$(asignaturaId)).data.profesorId == request.auth.uid;
      }
      
      allow read, write: if isAuthenticated() && (
                           isAlumnoOwner(resource.data.alumnoId) && 
                           isAsignaturaOwner(resource.data.asignaturaId)
                         );
                         
      allow create: if isAuthenticated() && (
                      isAlumnoOwner(request.resource.data.alumnoId) && 
                      isAsignaturaOwner(request.resource.data.asignaturaId)
                    );
    }
  }
}
