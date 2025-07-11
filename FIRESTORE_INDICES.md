# Índices para Firestore

Para optimizar las consultas en tu aplicación Kampos Xestión con Firebase, necesitarás crear algunos índices compuestos en Firestore. Estos índices son necesarios cuando realizas consultas que filtran por más de un campo o cuando ordenas los resultados.

## Índices necesarios

### 1. Colección "alumnos"

- **Filtrar alumnos por profesor**
  - Colección: `alumnos`
  - Campos: `profesorId` ASC
  - Alcance: Colección

### 2. Colección "asignaturas"

- **Filtrar asignaturas por profesor**
  - Colección: `asignaturas`
  - Campos: `profesorId` ASC
  - Alcance: Colección

### 3. Colección "matriculas"

- **Filtrar matrículas por alumno**
  - Colección: `matriculas`
  - Campos: `alumnoId` ASC
  - Alcance: Colección

- **Filtrar matrículas por asignatura**
  - Colección: `matriculas`
  - Campos: `asignaturaId` ASC
  - Alcance: Colección

- **Filtrar matrículas por alumno y asignatura**
  - Colección: `matriculas`
  - Campos: `alumnoId` ASC, `asignaturaId` ASC
  - Alcance: Colección

### 4. Colección "notas"

- **Filtrar notas por alumno**
  - Colección: `notas`
  - Campos: `alumnoId` ASC
  - Alcance: Colección

- **Filtrar notas por asignatura**
  - Colección: `notas`
  - Campos: `asignaturaId` ASC
  - Alcance: Colección

- **Filtrar notas por alumno y asignatura**
  - Colección: `notas`
  - Campos: `alumnoId` ASC, `asignaturaId` ASC
  - Alcance: Colección

## Cómo crear índices en Firestore

1. Ve a la consola de Firebase y selecciona tu proyecto
2. En el menú lateral, ve a "Firestore Database"
3. Selecciona la pestaña "Índices"
4. Haz clic en "Crear índice"
5. Selecciona la colección adecuada
6. Añade los campos necesarios y especifica el orden (ASC o DESC)
7. Configura el alcance como "Colección"
8. Haz clic en "Crear índice"

Firestore también creará automáticamente índices cuando los necesite si realizas consultas que los requieran. Cuando ejecutes una consulta que necesite un índice que no existe, Firestore te mostrará un enlace en la consola que puedes seguir para crear el índice necesario.

## Ejemplo de creación automática de índices

Cuando ejecutes por primera vez una consulta como esta:

```typescript
const q = query(
  collection(db, "matriculas"),
  where("alumnoId", "==", alumnoId),
  where("asignaturaId", "==", asignaturaId)
);
```

Si el índice no existe, Firebase te mostrará un error en la consola con un enlace para crear el índice necesario. Solo tienes que hacer clic en ese enlace para crear el índice.

## Nota importante

Los índices pueden tardar varios minutos en crearse y estar disponibles. Durante este tiempo, las consultas que dependen de estos índices pueden fallar.
