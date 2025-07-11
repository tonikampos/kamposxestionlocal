# Configuración de Firebase Realtime Database

Para que la aplicación funcione correctamente con Firebase Realtime Database, es necesario configurar los índices adecuados en las reglas de seguridad.

## Instrucciones para aplicar las reglas

1. Accede a la [consola de Firebase](https://console.firebase.google.com/)
2. Selecciona tu proyecto
3. En el menú lateral, ve a "Realtime Database"
4. Haz clic en la pestaña "Reglas"
5. Copia y pega el contenido de `firebase-database-rules.json`
6. Haz clic en "Publicar"

## Contenido de las reglas

```json
{
  "rules": {
    ".read": "auth != null",
    ".write": "auth != null",
    
    "matriculas": {
      ".indexOn": ["alumnoId", "asignaturaId"]
    },
    "alumnos": {
      ".indexOn": ["profesorId"]
    },
    "asignaturas": {
      ".indexOn": ["profesorId"]
    },
    "notas": {
      ".indexOn": ["alumnoId", "asignaturaId"]
    }
  }
}
```

Estas reglas configuran:
- Permisos de lectura y escritura solo para usuarios autenticados
- Índices para búsquedas eficientes en las colecciones principales
