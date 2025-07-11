import React, { useState } from 'react';
import { dataManager } from '../utils/dataManager';
import { useRealtimeAuth } from '../firebase/RealtimeAuthContext';

const MigracionPage = () => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const { currentUser } = useRealtimeAuth();

  const handleMigrarDatos = async () => {
    if (!currentUser) {
      setMessage('Necesitas iniciar sesión para migrar datos');
      return;
    }

    if (window.confirm('¿Estás seguro de que quieres migrar tus datos de localStorage a Firebase? Este proceso puede tardar unos momentos.')) {
      setLoading(true);
      setMessage('Migrando datos...');
      
      try {
        await dataManager.migrateLocalDataToFirebase(currentUser.id);
        setMessage('¡Migración completada con éxito! Tus datos ahora están en Firebase.');
      } catch (error: any) {
        console.error('Error durante la migración:', error);
        setMessage(`Error durante la migración: ${error.message || 'Desconocido'}`);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white p-4 md:p-8 rounded-lg shadow-md">
      <h1 className="text-2xl font-bold text-blue-800 mb-6">
        Migración de Datos a Firebase
      </h1>
      
      <p className="mb-4">
        Esta herramienta te permite migrar tus datos actuales desde el almacenamiento local del navegador (localStorage) 
        a Firebase Realtime Database. Esto permitirá acceder a tus datos desde cualquier dispositivo.
      </p>
      
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
        <p className="text-yellow-700">
          <strong>Importante:</strong> Antes de proceder, asegúrate de tener una copia de seguridad de tus datos. 
          La migración intentará transferir todos tus datos, pero algunas relaciones complejas podrían requerir ajustes manuales.
        </p>
      </div>
      
      {message && (
        <div className={`p-4 mb-6 ${message.includes('Error') ? 'bg-red-50 text-red-700 border-l-4 border-red-500' : 'bg-green-50 text-green-700 border-l-4 border-green-500'}`}>
          {message}
        </div>
      )}
      
      <div className="flex justify-center">
        <button
          onClick={handleMigrarDatos}
          disabled={loading || !currentUser}
          className="py-3 px-6 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300"
        >
          {loading ? 'Migrando datos...' : 'Iniciar Migración de Datos'}
        </button>
      </div>
      
      {!currentUser && (
        <p className="mt-4 text-center text-red-600">
          Debes iniciar sesión para migrar tus datos
        </p>
      )}
    </div>
  );
};

export default MigracionPage;
