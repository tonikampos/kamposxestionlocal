import React from 'react';
import { useRealtimeAuth } from '../firebase/RealtimeAuthContext';
import { useNavigate } from 'react-router-dom';

const MigracionPage = () => {
  const { currentUser } = useRealtimeAuth();
  const navigate = useNavigate();

  return (
    <div className="max-w-2xl mx-auto bg-white p-4 md:p-8 rounded-lg shadow-md">
      <h1 className="text-2xl font-bold text-blue-800 mb-6">
        Firebase Realtime Database
      </h1>
      
      <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6">
        <p className="text-green-700 mb-2">
          <strong>¡Completado!</strong> La aplicación ahora utiliza exclusivamente Firebase Realtime Database.
        </p>
        <p className="text-green-700">
          Todos los datos se almacenan en la nube y puedes acceder a ellos desde cualquier dispositivo.
        </p>
      </div>
      
      <p className="mb-4">
        La migración desde el almacenamiento local (localStorage) a Firebase Realtime Database ha sido completada. 
        Ahora puedes disfrutar de estas ventajas:
      </p>
      
      <ul className="list-disc pl-5 mb-6 space-y-2">
        <li>Acceso a tus datos desde cualquier dispositivo</li>
        <li>Sincronización en tiempo real</li>
        <li>Mayor seguridad y respaldo de datos</li>
        <li>Posibilidad de compartir datos entre usuarios</li>
        <li>Mejor rendimiento y escalabilidad</li>
      </ul>
      
      <div className="flex justify-center">
        <button
          onClick={() => navigate('/alumnos')}
          className="py-3 px-6 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Ir a la gestión de alumnos
        </button>
      </div>
    </div>
  );
};

export default MigracionPage;