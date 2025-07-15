# 📦 Sistema de Copias de Seguridad Mejorado - v3.0

## 🎯 Resumen de las mejoras implementadas

El sistema de copias de seguridad ha sido completamente renovado para proporcionar una **copia total** de todas las tablas de Firebase y una **restauración completa** del sistema.

---

## 🔧 **Cambios técnicos principales**

### **1. Copia de Seguridad Total (v3.0)**
- ✅ **Descarga TODAS las tablas** de Firebase directamente desde la base de datos
- ✅ **Preserva todos los IDs** y relaciones originales de Firebase
- ✅ **Formato optimizado** para máxima fiabilidad en la restauración
- ✅ **Metadata incluida** con timestamp, versión y URL de Firebase

#### **Estructura del archivo de backup v3.0:**
```json
{
  "profesores": { 
    "firebase_id_1": { "nome": "...", "email": "..." },
    "firebase_id_2": { "nome": "...", "email": "..." }
  },
  "alumnos": {
    "firebase_id_3": { "nome": "...", "profesorId": "firebase_id_1" }
  },
  "asignaturas": { /* ... */ },
  "matriculas": { /* ... */ },
  "notas": { /* ... */ },
  "metadata": {
    "timestamp": "2025-07-15T12:30:00.000Z",
    "version": "3.0",
    "firebaseUrl": "https://tu-proyecto.firebaseio.com/"
  }
}
```

### **2. Restauración Completa**
- ✅ **Elimina TODOS los datos** existentes de Firebase
- ✅ **Restaura TODAS las tablas** desde el archivo de backup
- ✅ **Mantiene los IDs originales** preservando las relaciones
- ✅ **Restauración 1:1** sin pérdida de datos
- ✅ **Compatible con formatos legacy** (v2.0 y anteriores)

### **3. Inicialización de Nuevo Curso**
- ✅ **Copia automática** antes de eliminar datos
- ✅ **Eliminación selectiva** (solo alumnos, matrículas y notas)
- ✅ **Preserva profesores y asignaturas** para reutilizar
- ✅ **Doble confirmación** para evitar errores

---

## 📋 **Funcionalidades disponibles**

### 🟢 **COPIA SEGURIDADE TOTAL**
**Qué hace:**
- Descarga todas las tablas de Firebase (profesores, alumnos, asignaturas, matrículas, notas)
- Genera un archivo JSON con estructura optimizada
- Incluye metadata para trazabilidad

**Cuándo usar:**
- Antes de hacer cambios importantes al sistema
- Para migrar a otro servidor/instancia
- Como backup periódico completo

**Archivo generado:**
`kampos_xestion_backup_completo_YYYY-MM-DD_HH-mm-ss.json`

### 🟡 **RESTAURAR COPIA DE SEGURIDADE**
**Qué hace:**
- Elimina TODOS los datos actuales de Firebase
- Restaura completamente todas las tablas desde el archivo
- Preserva todos los IDs y relaciones originales

**Cuándo usar:**
- Recuperación de desastres
- Migración desde otro sistema
- Restaurar estado anterior del sistema

**Formatos soportados:**
- ✅ v3.0 (nuevo formato optimizado)
- ✅ v2.0 y anteriores (compatibilidad legacy)

### 🟣 **INICIALIZAR CURSO**
**Qué hace:**
1. Crea automáticamente una copia de seguridad completa
2. Elimina solo alumnos, matrículas y notas
3. Mantiene profesores y asignaturas

**Cuándo usar:**
- Inicio de nuevo año académico
- Mantener configuración pero eliminar datos de estudiantes

**Archivo generado:**
`backup_antes_novo_curso_YYYY-MM-DD_HH-mm-ss.json`

---

## 🔒 **Medidas de seguridad implementadas**

### **Autenticación requerida**
- Solo usuarios autenticados pueden realizar operaciones de backup/restauración

### **Confirmaciones múltiples**
- **Restauración:** 1 confirmación con advertencia clara
- **Inicializar curso:** 2 confirmaciones con detalles específicos

### **Backups automáticos**
- La función "Inicializar curso" crea automáticamente una copia antes de eliminar

### **Validación de archivos**
- Verificación de estructura del archivo antes de restaurar
- Soporte para múltiples versiones de formato
- Mensajes de error detallados

---

## 📊 **Información técnica**

### **Tablas incluidas en el backup:**
1. **profesores** - Datos de usuarios/profesores
2. **alumnos** - Datos de estudiantes
3. **asignaturas** - Materias y configuraciones
4. **matriculas** - Relaciones alumno-asignatura
5. **notas** - Calificaciones y evaluaciones

### **Métodos implementados:**

#### **realtimeDatabaseManager.ts:**
- `createFullDatabaseBackup()` - Crea backup completo
- `restoreFullDatabaseBackup()` - Restaura backup completo
- `getAllAlumnos()` - Obtiene todos los alumnos
- `getAllAsignaturas()` - Obtiene todas las asignaturas
- `getAllMatriculas()` - Obtiene todas las matrículas
- `getAllNotas()` - Obtiene todas las notas
- `clearAlumnosYNotas()` - Elimina solo alumnos y notas
- `clearAllData()` - Elimina todos los datos

#### **dataManager.ts:**
- Expone todos los métodos con interfaz simplificada

### **Compatibilidad:**
- ✅ **Hacia atrás:** Archivos v2.0 y anteriores funcionan
- ✅ **Hacia adelante:** Nuevos archivos v3.0 optimizados
- ✅ **Migración:** Conversión automática de formatos legacy

---

## 🚀 **Ventajas del nuevo sistema**

### **Para el usuario:**
- ✅ Proceso simplificado (un solo botón para backup completo)
- ✅ Información detallada de lo que se descarga/restaura
- ✅ Mensajes claros sobre el impacto de cada operación
- ✅ Contadores de elementos procesados

### **Para el sistema:**
- ✅ Backup 1:1 sin pérdida de datos
- ✅ Preservación de IDs de Firebase
- ✅ Restauración completa garantizada
- ✅ Optimización de consultas paralelas
- ✅ Logging detallado para debugging

### **Para mantenimiento:**
- ✅ Migración entre sistemas simplificada
- ✅ Recuperación de desastres robusta
- ✅ Gestión de nuevos cursos académicos
- ✅ Trazabilidad completa de operaciones

---

## 📝 **Registro de cambios**

### **v3.0 (Actual)**
- Implementado backup completo de todas las tablas de Firebase
- Añadida restauración completa con eliminación previa
- Mejorada la función de inicializar curso
- Añadida compatibilidad con formatos legacy
- Implementadas medidas de seguridad adicionales

### **v2.0 (Anterior)**
- Backup basado en arrays de objetos
- Restauración parcial
- Función básica de exportar/importar

### **v1.0 (Original)**
- Solo backup en localStorage
- Funcionalidad limitada

---

## 🎯 **Casos de uso principales**

### 📚 **Inicio de curso académico**
```
Usuario: Profesor/Administrador
Acción: "Inicializar Curso"
Resultado: Mantiene profesores y asignaturas, elimina alumnos antiguos
```

### 🔄 **Migración de sistema**
```
Sistema origen: Crea "Copia Seguridade Total"
Sistema destino: "Restaurar Copia de Seguridade"
Resultado: Sistema idéntico con todos los datos
```

### 🆘 **Recuperación de emergencia**
```
Problema: Pérdida de datos o corrupción
Solución: "Restaurar Copia de Seguridade" desde backup reciente
Resultado: Sistema restaurado completamente
```

### 🔧 **Backup preventivo**
```
Frecuencia: Antes de cambios importantes
Acción: "Copia Seguridade Total"
Resultado: Backup completo para rollback si es necesario
```
