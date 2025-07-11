import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { NIVEL_EDUCATIVO } from '../../utils/storageManager';
import { dataManager } from '../../utils/dataManager';
import type { Asignatura } from '../../utils/storageManager';

const AsignaturasList = () => {
  const [asignaturas, setAsignaturas] = useState<Asignatura[]>([]);
  const [loading, setLoading] = useState(true);
  const [asignaturasConMatriculas, setAsignaturasConMatriculas] = useState<Record<string, number>>({});
  const navigate = useNavigate();
  const { currentUser } = useAuth();

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
    } catch (error) {
      console.error('Error al cargar asignaturas:', error);
      alert('Ocorreu un erro ao cargar as asignaturas');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Está seguro de que quere eliminar esta asignatura?')) {
      try {
        await dataManager.deleteAsignatura(id);
        loadAsignaturas(); // Recargar la lista
        alert('Asignatura eliminada con éxito');
      } catch (error) {
        console.error('Error al eliminar asignatura:', error);
        alert('Ocorreu un erro ao eliminar a asignatura');
      }
    }
  };

  if (loading) {
    return <div className="text-center py-8">Cargando asignaturas...</div>;
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
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
