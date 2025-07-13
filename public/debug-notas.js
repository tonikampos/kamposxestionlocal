// Script de verificación simple para la funcionalidad de notas
// Ejecutar en la consola del navegador para diagnóstico

window.testNotasFunctionality = async function(alumnoId = 'test', asignaturaId = 'test') {
  console.log('🧪 Iniciando prueba de funcionalidad de notas...');
  
  try {
    // Importar los módulos necesarios
    const { dataManager } = await import('/src/utils/dataManager.js');
    const { realtimeDatabaseManager } = await import('/src/firebase/realtimeDatabaseManager.js');
    
    console.log('📦 Módulos importados correctamente');
    
    // 1. Verificar conectividad
    console.log('1️⃣ Verificando conectividad...');
    const connectivity = await realtimeDatabaseManager.verifyConnectivity();
    console.log('Conectividad:', connectivity ? '✅' : '❌');
    
    // 2. Verificar permisos
    console.log('2️⃣ Verificando permisos...');
    const permissions = await realtimeDatabaseManager.verifyPermissions();
    console.log('Permisos:', permissions ? '✅' : '❌');
    
    // 3. Probar obtener asignatura
    console.log('3️⃣ Probando obtener asignatura...');
    const asignatura = await dataManager.getAsignaturaById(asignaturaId);
    console.log('Asignatura encontrada:', asignatura ? '✅' : '❌', asignatura);
    
    if (!asignatura) {
      console.log('❌ No se encontró la asignatura. Las siguientes pruebas pueden fallar.');
      return false;
    }
    
    // 4. Verificar configuración de evaluación
    console.log('4️⃣ Verificando configuración de evaluación...');
    if (asignatura.configuracionAvaliacion) {
      console.log('✅ Configuración de evaluación presente');
      console.log('Evaluaciones:', asignatura.configuracionAvaliacion.avaliaciois.length);
    } else {
      console.log('❌ Sin configuración de evaluación');
      return false;
    }
    
    // 5. Probar obtener notas del alumno
    console.log('5️⃣ Probando obtener notas del alumno...');
    const notas = await dataManager.getNotaAlumno(alumnoId, asignaturaId);
    console.log('Notas encontradas:', notas ? '✅' : 'ℹ️', notas);
    
    // 6. Si no hay notas, probar inicializar
    if (!notas) {
      console.log('6️⃣ Probando inicializar notas...');
      const notasInicializadas = await dataManager.initNotaAlumno(alumnoId, asignaturaId);
      console.log('Notas inicializadas:', notasInicializadas ? '✅' : '❌', notasInicializadas);
    }
    
    console.log('✅ Todas las pruebas completadas');
    return true;
    
  } catch (error) {
    console.error('❌ Error en las pruebas:', error);
    return false;
  }
};

console.log('🔧 Script de diagnóstico cargado. Ejecuta window.testNotasFunctionality() para probar.');
