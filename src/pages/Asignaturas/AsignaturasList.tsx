import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRealtimeAuth } from '../../firebase/RealtimeAuthContext';
import { NIVEL_EDUCATIVO } from '../../utils/storageManager';
import { dataManager } from '../../utils/dataManager';
import type { Asignatura } from '../../utils/storageManager';

const AsignaturasList = () => {
  const [asignaturas, setAsignaturas] = useState<Asignatura[]>([]);
  const [loading, setLoading] = useState(true);
  const [asignaturasConMatriculas, setAsignaturasConMatriculas] = useState<Record<string, number>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const navigate = useNavigate();
  const { currentUser } = useRealtimeAuth();

  // Cargar asignaturas del profesor autenticado
  useEffect(() => {
    if (currentUser?.id) {
      loadAsignaturas();
    }
  }, [currentUser]);

  const loadAsignaturas = async () => {
    setLoading(true);
    try {
      const asignaturasProfesor = await dataManager.getAsignaturasByProfesor(currentUser!.id);
      setAsignaturas(asignaturasProfesor);
      
      // Cargar información de matrículas para cada asignatura
      const matriculasInfo: Record<string, number> = {};
      
      for (const asignatura of asignaturasProfesor) {
        const matriculas = await dataManager.getMatriculasByAsignatura(asignatura.id);
        matriculasInfo[asignatura.id] = matriculas.length;
      }
      
      setAsignaturasConMatriculas(matriculasInfo);
      
      // Limpiar mensajes de error previos al cargar con éxito
      setErrorMessage(null);
    } catch (error) {
      console.error('Error al cargar asignaturas:', error);
      const message = error instanceof Error ? error.message : 'Ocorreu un erro ao cargar as asignaturas';
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Está seguro de que quere eliminar esta asignatura?')) {
      try {
        await dataManager.deleteAsignatura(id);
        loadAsignaturas(); // Recargar la lista
        setSuccessMessage('Asignatura eliminada con éxito');
        setTimeout(() => setSuccessMessage(null), 5000); // Desaparece después de 5 segundos
      } catch (error) {
        console.error('Error al eliminar asignatura:', error);
        // Mostrar mensaje de error específico si está disponible
        const message = error instanceof Error ? error.message : 'Ocorreu un erro ao eliminar a asignatura';
        setErrorMessage(message);
      }
    }
  };

  if (loading) {
    return <div className="text-center py-8">Cargando asignaturas...</div>;
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md relative">
      {/* Mensaje de éxito */}
      {successMessage && (
        <div className="fixed top-4 right-4 bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded shadow-md z-50 max-w-md">
          <div className="flex items-center">
            <div className="py-1">
              <svg className="h-6 w-6 text-green-500 mr-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="font-bold">Éxito</p>
              <p className="text-sm">{successMessage}</p>
            </div>
            <div className="ml-auto">
              <button onClick={() => setSuccessMessage(null)} className="text-green-500 hover:text-green-700">
                <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Mensaje de error */}
      {errorMessage && (
        <div className="fixed top-4 right-4 bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded shadow-md z-50 max-w-md">
          <div className="flex">
            <div className="py-1">
              <svg className="h-6 w-6 text-red-500 mr-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <p className="font-bold">Erro</p>
              <p className="text-sm">{errorMessage}</p>
            </div>
            <div className="ml-auto">
              <button onClick={() => setErrorMessage(null)} className="text-red-500 hover:text-red-700">
                <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-blue-800">As miñas asignaturas</h2>
        <button
          onClick={() => navigate('/asignaturas/nova')}
          className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors"
        >
          Engadir asignatura
        </button>
      </div>

      {asignaturas.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-md">
          <p className="text-gray-600">Non ten ningunha asignatura rexistrada</p>
          <button
            onClick={() => navigate('/asignaturas/nova')}
            className="mt-4 bg-blue-100 hover:bg-blue-200 text-blue-800 py-2 px-4 rounded-lg transition-colors"
          >
            Rexistrar a miña primeira asignatura
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead className="bg-gray-100">
              <tr>
                <th className="py-3 px-4 text-left text-gray-700">Nome</th>
                <th className="py-3 px-4 text-left text-gray-700">Nivel</th>
                <th className="py-3 px-4 text-center text-gray-700">Curso</th>
                <th className="py-3 px-4 text-center text-gray-700">Sesións</th>
                <th className="py-3 px-4 text-center text-gray-700">Avaliacións</th>
                <th className="py-3 px-4 text-center text-gray-700">Matriculados</th>
                <th className="py-3 px-4 text-right text-gray-700">Accións</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {asignaturas.map((asignatura) => (
                <tr key={asignatura.id} className="hover:bg-gray-50">
                  <td className="py-3 px-4 text-gray-800">
                    {asignatura.nome}
                    <div className="mt-1 flex flex-wrap gap-1">
                      {asignatura.configuracionAvaliacion && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Avaliación configurada
                        </span>
                      )}
                      {asignaturasConMatriculas[asignatura.id] > 0 && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                          {asignaturasConMatriculas[asignatura.id]} alumnos matriculados
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-gray-800">{asignatura.nivel}</td>
                  <td className="py-3 px-4 text-center text-gray-800">{asignatura.curso}º</td>
                  <td className="py-3 px-4 text-center text-gray-800">{asignatura.sesionsSemanais}</td>
                  <td className="py-3 px-4 text-center text-gray-800">{asignatura.numeroAvaliaciois}</td>
                  <td className="py-3 px-4 text-center text-gray-800">
                    {asignaturasConMatriculas[asignatura.id] || 0}
                  </td>
                  <td className="py-3 px-4 text-right space-x-2">
                    <button
                      onClick={() => navigate(`/asignaturas/matriculas/${asignatura.id}`)}
                      className="text-indigo-600 hover:text-indigo-800 mr-2"
                      title="Xestionar matrículas"
                    >
                      Matricular
                    </button>
                    <button
                      onClick={() => navigate(`/asignaturas/configurar/${asignatura.id}`)}
                      className="text-green-600 hover:text-green-800 mr-2"
                      title="Configurar avaliación"
                    >
                      conf. Avaliacion
                    </button>
                    <button
                      onClick={() => navigate(`/asignaturas/editar/${asignatura.id}`)}
                      className="text-blue-600 hover:text-blue-800 mr-2"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(asignatura.id)}
                      className="text-red-600 hover:text-red-800"
                      title={asignaturasConMatriculas[asignatura.id] > 0 
                        ? `Non se pode eliminar: ten ${asignaturasConMatriculas[asignatura.id]} alumnos matriculados` 
                        : "Eliminar asignatura"}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AsignaturasList;
