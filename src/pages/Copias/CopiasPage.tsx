import React, { useState, useRef, useEffect } from 'react';
import { storageManager } from '../../utils/storageManager';

const CopiasPage = () => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Interface para os datos completos de backup
  interface BackupData {
    profesores: any[];
    alumnos: any[];
    asignaturas: any[];
    matriculas: any[];
    notas: any[];
    timestamp: string;
    version: string;
  }

  // Función para recoller todos os datos da aplicación
  const getAllApplicationData = (): BackupData => {
    console.log("Recollendo todos os datos da aplicación para o backup...");
    return {
      profesores: storageManager.getProfesores(),
      alumnos: storageManager.getAlumnos(),
      asignaturas: storageManager.getAsignaturas(),
      matriculas: storageManager.getMatriculas(),
      notas: storageManager.getNotas(),
      timestamp: new Date().toISOString(),
      version: '1.0' // Versión do formato de backup
    };
  };

  // Función para crear unha copia de seguridade e gardala no localStorage
  const handleBackup = () => {
    setLoading(true);
    setMessage('');
    setMessageType('');
    
    try {
      // Recoller todos os datos
      const backupData = getAllApplicationData();
      
      // Gardar a copia no localStorage
      localStorage.setItem('kampos_xestion_backup', JSON.stringify(backupData));
      
      setLoading(false);
      setMessage('Copia de seguridade creada correctamente');
      setMessageType('success');
    } catch (error) {
      console.error('Erro ao crear a copia de seguridade:', error);
      setLoading(false);
      setMessage('Ocorreu un erro ao crear a copia de seguridade');
      setMessageType('error');
    }
  };
  
  // Función para restaurar a copia de seguridade desde o localStorage
  const handleRestore = () => {
    if (window.confirm('Está seguro de que quere restaurar a última copia de seguridade? Este proceso sobrescribirá todos os datos actuais.')) {
      setLoading(true);
      setMessage('');
      setMessageType('');
      
      try {
        // Obter a copia do localStorage
        const backupString = localStorage.getItem('kampos_xestion_backup');
        if (!backupString) {
          throw new Error('Non se atopou ningunha copia de seguridade');
        }
        
        const backupData = JSON.parse(backupString) as BackupData;
        
        // Verificar que a copia ten todos os datos necesarios
        if (!backupData.profesores || !backupData.alumnos || !backupData.asignaturas || 
            !backupData.matriculas || !backupData.notas) {
          throw new Error('A copia de seguridade está incompleta ou danada');
        }
        
        // Restaurar todos os datos
        storageManager.saveProfesores(backupData.profesores);
        storageManager.saveAlumnos(backupData.alumnos);
        storageManager.saveAsignaturas(backupData.asignaturas);
        storageManager.saveMatriculas(backupData.matriculas);
        storageManager.saveNotas(backupData.notas);
        
        setLoading(false);
        setMessage('Copia de seguridade restaurada correctamente');
        setMessageType('success');
      } catch (error) {
        console.error('Erro ao restaurar a copia de seguridade:', error);
        setLoading(false);
        setMessage(`Ocorreu un erro ao restaurar a copia: ${error instanceof Error ? error.message : 'Erro descoñecido'}`);
        setMessageType('error');
      }
    }
  };

  // Función para exportar datos a un arquivo JSON
  const handleExportData = () => {
    setLoading(true);
    try {
      // Obter todos os datos da aplicación
      const backupData = getAllApplicationData();
      
      // Crear un blob con os datos en formato JSON
      const jsonData = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonData], { type: 'application/json' });
      
      // Crear un URL para o blob e un enlace para descargalo
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Nome do arquivo coa data actual
      const dateStr = new Date().toISOString().split('T')[0];
      link.download = `kampos_xestion_backup_${dateStr}.json`;
      
      // Simular un clic no enlace para iniciar a descarga
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Liberar o URL
      URL.revokeObjectURL(url);
      
      setMessage('Datos exportados correctamente');
      setMessageType('success');
    } catch (error) {
      console.error('Erro ao exportar os datos:', error);
      setMessage('Ocorreu un erro ao exportar os datos');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  // Función para importar datos desde un arquivo JSON
  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) {
      return;
    }
    
    setLoading(true);
    setMessage('');
    setMessageType('');
    
    const file = event.target.files[0];
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        if (typeof e.target?.result !== 'string') {
          throw new Error('O formato do arquivo non é válido');
        }
        
        // Verificar que o usuario quere realmente restaurar os datos
        if (window.confirm('Está seguro de que quere restaurar os datos desde o arquivo? Isto sobrescribirá todos os datos actuais.')) {
          const backupData = JSON.parse(e.target.result) as BackupData;
          
          // Verificar que o backup ten todos os datos necesarios
          if (!backupData.profesores || !backupData.alumnos || !backupData.asignaturas || 
              !backupData.matriculas || !backupData.notas) {
            throw new Error('O arquivo de backup está incompleto ou non é compatible');
          }
          
          // Restaurar todos os datos
          storageManager.saveProfesores(backupData.profesores);
          storageManager.saveAlumnos(backupData.alumnos);
          storageManager.saveAsignaturas(backupData.asignaturas);
          storageManager.saveMatriculas(backupData.matriculas);
          storageManager.saveNotas(backupData.notas);
          
          // Gardar tamén como backup local
          localStorage.setItem('kampos_xestion_backup', JSON.stringify(backupData));
          
          setMessage('Datos restaurados correctamente desde o arquivo');
          setMessageType('success');
        }
      } catch (error) {
        console.error('Erro ao importar os datos:', error);
        setMessage(`Ocorreu un erro ao importar os datos: ${error instanceof Error ? error.message : 'Erro descoñecido'}`);
        setMessageType('error');
      } finally {
        setLoading(false);
        // Resetear o input de arquivo para permitir seleccionar o mesmo arquivo de novo
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    
    reader.onerror = () => {
      setLoading(false);
      setMessage('Ocorreu un erro ao ler o arquivo');
      setMessageType('error');
      // Resetear o input de arquivo
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    
    // Ler o arquivo como texto
    reader.readAsText(file);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-blue-800 mb-6">Copias de Seguridade</h1>
      
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Crear Copia de Seguridade</h2>
          <p className="mb-4 text-gray-600">
            Crea unha copia de seguridade de todos os datos da aplicación (alumnos, asignaturas, cualificacións, etc.).
            Esta copia almacenarase localmente no teu navegador e poderá ser restaurada posteriormente.
          </p>
          <button
            onClick={handleBackup}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg disabled:bg-blue-300"
          >
            {loading ? 'Creando copia...' : 'Crear Copia de Seguridade'}
          </button>
        </div>
        
        <hr className="my-6 border-gray-200" />
        
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Restaurar Copia de Seguridade</h2>
          <p className="mb-4 text-gray-600">
            Restaura a última copia de seguridade creada. Esta acción sobrescribirá todos os datos actuais.
            <br />
            <span className="text-amber-600 font-medium">IMPORTANTE: Esta acción é irreversible.</span>
          </p>
          <button
            onClick={handleRestore}
            disabled={loading}
            className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-2 rounded-lg disabled:bg-amber-300"
          >
            {loading ? 'Restaurando copia...' : 'Restaurar Última Copia'}
          </button>
        </div>
        
        <hr className="my-6 border-gray-200" />
        
        <div className="mb-4">
          <h2 className="text-xl font-semibold mb-4">Exportar/Importar Datos</h2>
          <p className="mb-4 text-gray-600">
            Exporta os datos para gardalos nun arquivo JSON ou importa datos dende un arquivo previamente exportado.
            <br />
            Isto é útil para transferir datos entre dispositivos ou para manter copias de seguridade externas.
          </p>
          <div className="flex flex-wrap gap-4">
            <button 
              onClick={handleExportData}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg disabled:bg-green-300"
            >
              {loading ? 'Exportando...' : 'Exportar Datos (JSON)'}
            </button>
            <label className={`bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg cursor-pointer ${loading ? 'opacity-70' : ''}`}>
              {loading ? 'Importando...' : 'Importar Datos'}
              <input 
                type="file" 
                className="hidden" 
                accept=".json" 
                onChange={handleImportData}
                disabled={loading}
                ref={fileInputRef}
              />
            </label>
          </div>
          <p className="mt-2 text-sm text-gray-500">
            Exporta os datos para crear unha copia de seguridade externa ou importa unha copia anteriormente creada.
          </p>
        </div>
        
        {message && (
          <div className={`mt-6 p-4 rounded-lg ${
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
