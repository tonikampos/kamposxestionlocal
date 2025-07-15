import React, { useState, useRef } from 'react';
import { useRealtimeAuth } from '../../firebase/RealtimeAuthContext';
import { dataManager } from '../../utils/dataManager';
import type { Alumno, Asignatura, Matricula, NotaAlumno, Profesor } from '../../utils/storageManager';

const CopiasPage = () => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');
  const folderInputRef = useRef<HTMLInputElement>(null);
  const { currentUser } = useRealtimeAuth();

  // Interface para os datos completos de backup
  interface BackupData {
    profesores: Profesor[];
    alumnos: Alumno[];
    asignaturas: Asignatura[];
    matriculas: Matricula[];
    notas: NotaAlumno[];
    timestamp: string;
    version: string;
  }

  // Función para crear COPIA SEGURIDADE TOTAL (descarga TODAS las tablas de Firebase)
  const handleCopiaSeguridadeTotal = async () => {
    if (!currentUser) {
      setMessage('Debe estar autenticado para crear unha copia de seguridade');
      setMessageType('error');
      return;
    }

    setLoading(true);
    setMessage('');
    setMessageType('');
    
    try {
      // Recoller TODAS las tablas directamente desde Firebase
      const backupData = await dataManager.createFullDatabaseBackup();
      
      // Crear un blob con os datos en formato JSON
      const jsonData = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonData], { type: 'application/json' });
      
      // Crear un URL para o blob e un enlace para descargalo
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Nome do arquivo coa data actual
      const dateStr = new Date().toISOString().split('T')[0];
      const timeStr = new Date().toISOString().split('T')[1].split('.')[0].replace(/:/g, '-');
      link.download = `kampos_xestion_backup_completo_${dateStr}_${timeStr}.json`;
      
      // Simular un clic no enlace para iniciar a descarga
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Liberar o URL
      URL.revokeObjectURL(url);
      
      const counts = {
        profesores: Object.keys(backupData.profesores).length,
        alumnos: Object.keys(backupData.alumnos).length,
        asignaturas: Object.keys(backupData.asignaturas).length,
        matriculas: Object.keys(backupData.matriculas).length,
        notas: Object.keys(backupData.notas).length
      };
      
      setMessage(`✅ Copia de seguridade COMPLETA creada correctamente.\\n\\n📊 DATOS DESCARGADOS:\\n• ${counts.profesores} profesores\\n• ${counts.alumnos} alumnos\\n• ${counts.asignaturas} asignaturas\\n• ${counts.matriculas} matrículas\\n• ${counts.notas} notas\\n\\n📁 Arquivo: kampos_xestion_backup_completo_${dateStr}_${timeStr}.json\\n\\nEsta copia inclúe TODAS as tablas de Firebase e permite unha restauración completa do sistema.`);
      setMessageType('success');
    } catch (error) {
      console.error('Erro ao crear a copia de seguridade total:', error);
      setMessage('Ocorreu un erro ao crear a copia de seguridade total');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  // Función para restaurar copia de seguridade desde arquivo
  const handleRestaurarCopia = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) {
      return;
    }
    
    if (!currentUser) {
      setMessage('Debe estar autenticado para restaurar unha copia de seguridade');
      setMessageType('error');
      return;
    }
    
    setLoading(true);
    setMessage('');
    setMessageType('');
    
    const file = event.target.files[0];
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        if (typeof e.target?.result !== 'string') {
          throw new Error('O formato do arquivo non é válido');
        }
        
        // Verificar que o usuario quere realmente restaurar os datos
        if (window.confirm('⚠️ RESTAURACIÓN COMPLETA ⚠️\\n\\nEsta operación VAI ELIMINAR TODOS OS DATOS ACTUAIS do sistema e restaurar os datos do arquivo seleccionado.\\n\\nEsta acción é IRREVERSIBLE.\\n\\n¿Está COMPLETAMENTE SEGURO de que desexa continuar?')) {
          const backupData = JSON.parse(e.target.result);
          
          // Verificar que o backup ten a estrutura correcta
          if (!backupData.profesores && !backupData.alumnos && !backupData.asignaturas && 
              !backupData.matriculas && !backupData.notas) {
            throw new Error('O arquivo de backup non ten unha estrutura válida');
          }
          
          // Verificar se é un backup novo (v3.0) ou antigo
          const isNewFormat = backupData.metadata && backupData.metadata.version === "3.0";
          
          if (isNewFormat) {
            // Usar el nuevo método de restauración completa
            await dataManager.restoreFullDatabaseBackup(backupData);
            
            const counts = {
              profesores: Object.keys(backupData.profesores || {}).length,
              alumnos: Object.keys(backupData.alumnos || {}).length,
              asignaturas: Object.keys(backupData.asignaturas || {}).length,
              matriculas: Object.keys(backupData.matriculas || {}).length,
              notas: Object.keys(backupData.notas || {}).length
            };
            
            setMessage(`✅ SISTEMA RESTAURADO COMPLETAMENTE\\n\\n📊 DATOS RESTAURADOS:\\n• ${counts.profesores} profesores\\n• ${counts.alumnos} alumnos\\n• ${counts.asignaturas} asignaturas\\n• ${counts.matriculas} matrículas\\n• ${counts.notas} notas\\n\\n🔄 Todas as tablas de Firebase foron restauradas completamente.\\n\\n⚠️ Recomendase recargar a páxina para asegurar que todos os datos se mostren correctamente.`);
          } else {
            // Backward compatibility: usar el método legacy
            await dataManager.restoreAllData(backupData);
            setMessage(`✅ Datos restaurados correctamente desde arquivo legacy.\\n\\n⚠️ Recomendase crear unha nova copia de seguridade co formato actualizado.`);
          }
          
          setMessageType('success');
        }
      } catch (error) {
        console.error('Erro ao restaurar os datos:', error);
        setMessage(`❌ Ocorreu un erro ao restaurar os datos:\\n\\n${error instanceof Error ? error.message : 'Erro descoñecido'}\\n\\nVerifique que o arquivo sexa unha copia de seguridade válida creada por esta aplicación.`);
        setMessageType('error');
      } finally {
        setLoading(false);
        // Resetear o input de arquivo para permitir seleccionar o mesmo arquivo de novo
        if (folderInputRef.current) {
          folderInputRef.current.value = '';
        }
      }
    };
    
    reader.onerror = () => {
      setLoading(false);
      setMessage('Ocorreu un erro ao ler o arquivo');
      setMessageType('error');
      // Resetear o input de arquivo
      if (folderInputRef.current) {
        folderInputRef.current.value = '';
      }
    };
    
    // Ler o arquivo como texto
    reader.readAsText(file);
  };

  // Función para inicializar novo curso
  const handleInicializarCurso = async () => {
    if (!currentUser) {
      setMessage('Debe estar autenticado para inicializar un novo curso');
      setMessageType('error');
      return;
    }

    // Primera confirmación
    const primeraConfirmacion = window.confirm(
      '⚠️ INICIALIZAR NOVO CURSO ⚠️\\n\\n' +
      'Esta operación realizará:\\n' +
      '1. Unha copia de seguridade completa do sistema actual\\n' +
      '2. ELIMINARÁ TODOS OS ALUMNOS E NOTAS\\n' +
      '3. Manterá profesores e asignaturas para o novo curso\\n\\n' +
      'Esta acción é IRREVERSIBLE.\\n\\n' +
      '¿Está seguro de que quere continuar?'
    );

    if (!primeraConfirmacion) return;

    // Segunda confirmación
    const segundaConfirmacion = window.confirm(
      '⚠️ ÚLTIMA CONFIRMACIÓN ⚠️\\n\\n' +
      'Vai a ELIMINAR TODOS OS ALUMNOS E NOTAS.\\n' +
      'Primeiro crearase unha copia de seguridade automática.\\n\\n' +
      '¿Confirma que desexa INICIALIZAR O NOVO CURSO?'
    );

    if (!segundaConfirmacion) return;

    setLoading(true);
    setMessage('');
    setMessageType('');
    
    try {
      // 1. Crear copia de seguridade antes de eliminar
      console.log("Creando copia de seguridade antes de inicializar novo curso...");
      const backupData = await dataManager.createFullDatabaseBackup();
      
      // Descargar la copia de seguridade automáticamente
      const jsonData = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const dateStr = new Date().toISOString().split('T')[0];
      const timeStr = new Date().toISOString().split('T')[1].split('.')[0].replace(/:/g, '-');
      link.download = `backup_antes_novo_curso_${dateStr}_${timeStr}.json`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      // Contar datos antes de eliminar
      const counts = {
        alumnos: Object.keys(backupData.alumnos).length,
        notas: Object.keys(backupData.notas).length,
        asignaturas: Object.keys(backupData.asignaturas).length,
        profesores: Object.keys(backupData.profesores).length
      };
      
      // 2. Eliminar alumnos e notas
      console.log("Eliminando alumnos e notas para novo curso...");
      await dataManager.clearAlumnosYNotas();
      
      setMessage(`✅ NOVO CURSO INICIALIZADO CORRECTAMENTE\\n\\n📦 COPIA DE SEGURIDADE CREADA:\\n• Arquivo: backup_antes_novo_curso_${dateStr}_${timeStr}.json\\n• Descargado automáticamente\\n\\n🗑️ DATOS ELIMINADOS:\\n• ${counts.alumnos} alumnos eliminados\\n• ${counts.notas} notas eliminadas\\n• Matrículas eliminadas\\n\\n✅ DATOS MANTIDOS:\\n• ${counts.profesores} profesores\\n• ${counts.asignaturas} asignaturas\\n\\n🎓 O sistema está listo para o novo curso académico.\\nPode comezar a matricular novos alumnos nas asignaturas existentes.`);
      setMessageType('success');
    } catch (error) {
      console.error('Erro ao inicializar novo curso:', error);
      setMessage('Ocorreu un erro ao inicializar o novo curso');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-blue-800 mb-6">Xestión de Copias de Seguridade</h1>
      
      <div className="bg-white p-6 rounded-lg shadow-md">
        {/* COPIA SEGURIDADE TOTAL */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-green-700">📦 Copia Seguridade Total</h2>
          <p className="mb-4 text-gray-600">
            Descarga unha copia completa de <strong>TODAS AS TABLAS</strong> de Firebase: profesores, alumnos, asignaturas, matrículas e notas.
            Esta copia permite restaurar completamente o sistema noutra instalación ou en caso de perda de datos.
            <br />
            <strong>📊 Que se descarga:</strong> Un arquivo JSON que contén unha copia exacta de todas as tablas da base de datos.
          </p>
          <div className="bg-green-50 p-3 rounded-lg mb-4">
            <p className="text-green-800 text-sm">
              <strong>� Ventajas da copia completa:</strong><br />
              • Inclúe todos os IDs de Firebase preservando as relacións<br />
              • Permite restauración 1:1 sen perda de datos<br />
              • Compatible con migracións entre sistemas<br />
              • Formato optimizado para máxima fiabilidade
            </p>
          </div>
          <button
            onClick={handleCopiaSeguridadeTotal}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg disabled:bg-green-300 font-medium"
          >
            {loading ? 'Creando copia total...' : '📦 Crear Copia Seguridade Total'}
          </button>
        </div>
        
        <hr className="my-6 border-gray-200" />
        
        {/* RESTAURAR COPIA DE SEGURIDADE */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-amber-700">🔄 Restaurar Copia de Seguridade</h2>
          <p className="mb-4 text-gray-600">
            Restaura todos os datos do sistema desde un arquivo de copia de seguridade previamente creado.
            Esta acción <strong>ELIMINA TODOS OS DATOS ACTUAIS</strong> e restaura completamente todas as tablas de Firebase.
          </p>
          <div className="bg-amber-50 p-3 rounded-lg mb-4">
            <p className="text-amber-800 text-sm">
              <strong>⚠️ PROCESO DE RESTAURACIÓN:</strong><br />
              1. Elimínanse TODAS as tablas existentes de Firebase<br />
              2. Restáuranse todas as tablas desde o arquivo<br />
              3. Mantéñense todos os IDs e relacións orixinais<br />
              <br />
              <strong>📋 IMPORTANTE:</strong> Esta acción é irreversible. Asegúrese de ter unha copia de seguridade actual antes de continuar.
            </p>
          </div>
          <label className={`bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 rounded-lg cursor-pointer font-medium inline-block ${loading ? 'opacity-70' : ''}`}>
            {loading ? 'Restaurando...' : '🔄 Seleccionar Arquivo de Copia'}
            <input 
              type="file" 
              className="hidden" 
              accept=".json" 
              onChange={handleRestaurarCopia}
              disabled={loading}
              ref={folderInputRef}
            />
          </label>
        </div>
        
        <hr className="my-6 border-gray-200" />
        
        {/* INICIALIZAR CURSO */}
        <div className="mb-4">
          <h2 className="text-xl font-semibold mb-4 text-purple-700">🎓 Inicializar Curso</h2>
          <p className="mb-4 text-gray-600">
            Prepara o sistema para un novo curso académico. Esta operación:
          </p>
          <div className="bg-purple-50 p-4 rounded-lg mb-4">
            <ul className="text-purple-800 text-sm space-y-1">
              <li><strong>1.</strong> Crea unha copia de seguridade completa automática</li>
              <li><strong>2.</strong> Elimina TODOS os alumnos e notas</li>
              <li><strong>3.</strong> Mantén profesores e asignaturas para reutilizar</li>
            </ul>
          </div>
          <div className="bg-red-50 p-3 rounded-lg mb-4">
            <p className="text-red-800 text-sm">
              <strong>⚠️ ATENCIÓN:</strong> Esta acción elimina permanentemente alumnos e notas. Pídese confirmación dúas veces para evitar erros.
            </p>
          </div>
          <button 
            onClick={handleInicializarCurso}
            disabled={loading}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg disabled:bg-purple-300 font-medium"
          >
            {loading ? 'Inicializando curso...' : '🎓 Inicializar Novo Curso'}
          </button>
        </div>
        
        {message && (
          <div className={`mt-6 p-4 rounded-lg whitespace-pre-line ${
            messageType === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
};

export default CopiasPage;
