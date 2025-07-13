// Utilidad para diagnosticar problemas de conectividad con Firebase

import { db } from '../firebase/config';
import { ref, get } from 'firebase/database';
import { realtimeDatabaseManager } from '../firebase/realtimeDatabaseManager';

export class FirebaseDebugger {
  static async runDiagnostics() {
    console.log('🔍 Iniciando diagnósticos de Firebase...');
    
    const results = {
      connectivity: false,
      permissions: false,
      database: false,
      config: false,
      dataAccess: false
    };
    
    try {
      // 1. Verificar configuración básica
      console.log('1️⃣ Verificando configuración...');
      if (db) {
        results.config = true;
        console.log('✅ Firebase Database configurado correctamente');
      } else {
        console.log('❌ Firebase Database no configurado');
        return results;
      }
      
      // 2. Verificar conectividad
      console.log('2️⃣ Verificando conectividad...');
      const connectivityTest = await realtimeDatabaseManager.verifyConnectivity();
      results.connectivity = connectivityTest;
      if (connectivityTest) {
        console.log('✅ Conectividad Firebase OK');
      } else {
        console.log('❌ Problemas de conectividad Firebase');
      }
      
      // 3. Verificar permisos
      console.log('3️⃣ Verificando permisos...');
      const permissionsTest = await realtimeDatabaseManager.verifyPermissions();
      results.permissions = permissionsTest;
      if (permissionsTest) {
        console.log('✅ Permisos Firebase OK');
      } else {
        console.log('❌ Problemas de permisos Firebase');
      }
      
      // 4. Verificar acceso a base de datos
      console.log('4️⃣ Verificando acceso a datos...');
      try {
        const testRef = ref(db, 'test');
        await get(testRef);
        results.database = true;
        console.log('✅ Acceso a base de datos OK');
      } catch (error) {
        console.log('❌ Error de acceso a base de datos:', error);
      }
      
      // 5. Verificar acceso a datos específicos (asignaturas)
      console.log('5️⃣ Verificando datos de asignaturas...');
      try {
        const asignaturas = await realtimeDatabaseManager.getAsignaturasByProfesor('test');
        results.dataAccess = true;
        console.log('✅ Acceso a datos específicos OK');
      } catch (error) {
        console.log('❌ Error de acceso a datos específicos:', error);
      }
      
    } catch (error) {
      console.error('Error general en diagnósticos:', error);
    }
    
    console.log('📊 Resultados de diagnósticos:', results);
    return results;
  }
  
  static async testNotasFunctionality(alumnoId: string, asignaturaId: string) {
    console.log('🧪 Probando funcionalidad de notas...');
    
    try {
      // Verificar si existe la asignatura
      console.log('Verificando asignatura...');
      const asignatura = await realtimeDatabaseManager.getAsignaturaById(asignaturaId);
      if (!asignatura) {
        console.error('❌ Asignatura no encontrada');
        return false;
      }
      console.log('✅ Asignatura encontrada:', asignatura.nome);
      
      // Verificar configuración de evaluación
      if (!asignatura.configuracionAvaliacion) {
        console.error('❌ Asignatura sin configuración de evaluación');
        return false;
      }
      console.log('✅ Configuración de evaluación presente');
      
      // Intentar obtener notas del alumno
      console.log('Obteniendo notas del alumno...');
      const notas = await realtimeDatabaseManager.getNotaAlumno(alumnoId, asignaturaId);
      if (notas) {
        console.log('✅ Notas encontradas:', notas.id);
      } else {
        console.log('ℹ️ No se encontraron notas, intentando inicializar...');
        const notasInicializadas = await realtimeDatabaseManager.initNotaAlumno(alumnoId, asignaturaId);
        if (notasInicializadas) {
          console.log('✅ Notas inicializadas correctamente:', notasInicializadas.id);
        } else {
          console.error('❌ Error al inicializar notas');
          return false;
        }
      }
      
      console.log('✅ Funcionalidad de notas OK');
      return true;
    } catch (error) {
      console.error('❌ Error en prueba de funcionalidad de notas:', error);
      return false;
    }
  }
}
