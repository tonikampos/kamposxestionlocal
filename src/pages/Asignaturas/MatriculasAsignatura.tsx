import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRealtimeAuth } from '../../firebase/RealtimeAuthContext';
import { dataManager } from '../../utils/dataManager';
import type { Asignatura, Alumno } from '../../utils/storageManager';

const MatriculasAsignatura: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useRealtimeAuth();
  
  const [asignatura, setAsignatura] = useState<Asignatura | null>(null);
  const [alumnosMatriculados, setAlumnosMatriculados] = useState<Alumno[]>([]);
  const [alumnosDisponibles, setAlumnosDisponibles] = useState<Alumno[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Alumno[]>([]);

  const handleVerNotas = (alumnoId: string) => {
    try {
      if (!id) return;
      
      // Guardar el ID del alumno en sessionStorage para que NotasPage pueda recuperarlo
      sessionStorage.setItem('alumnoSeleccionadoId', alumnoId);
      
      // Navegar a la página de notas
      navigate('/notas');
    } catch (error) {
      console.error('Error al acceder a las notas del alumno:', error);
      alert('Erro ao acceder ás notas do alumno');
    }
  };

  useEffect(() => {
    if (!id || !currentUser) return;

    const cargarDatos = async () => {
      setLoading(true);
      try {
        console.log('MatriculasAsignatura: Cargando asignatura con ID:', id);
        // Cargar asignatura
        const asignaturaData = await dataManager.getAsignaturaById(id);
        if (!asignaturaData) {
          alert('A asignatura non existe');
          navigate('/asignaturas');
          return;
        }

        console.log('MatriculasAsignatura: Asignatura cargada:', asignaturaData);

        // Verificar que la asignatura pertenece al profesor autenticado
        if (asignaturaData.profesorId !== currentUser.id) {
          alert('Non tes permiso para acceder a esta asignatura');
          navigate('/asignaturas');
          return;
        }

        setAsignatura(asignaturaData);

        // Cargar alumnos matriculados y sus matrículas
        console.log('MatriculasAsignatura: Obteniendo matrículas para la asignatura:', id);
        const matriculas = await dataManager.getMatriculasByAsignatura(id);
        console.log('MatriculasAsignatura: Matrículas obtenidas:', matriculas);
        
        const alumnosIds = matriculas.map(m => m.alumnoId);
        console.log('MatriculasAsignatura: IDs de alumnos matriculados:', alumnosIds);
        
        // Cargar detalles de los alumnos matriculados
        const alumnosMatr: Alumno[] = [];
        for (const alumnoId of alumnosIds) {
          console.log('MatriculasAsignatura: Cargando alumno con ID:', alumnoId);
          const alumno = await dataManager.getAlumnoById(alumnoId);
          if (alumno) {
            console.log('MatriculasAsignatura: Alumno cargado:', alumno.nome, alumno.apelidos);
            alumnosMatr.push(alumno);
          } else {
            console.warn('MatriculasAsignatura: No se encontró el alumno con ID:', alumnoId);
          }
        }
        
        console.log('MatriculasAsignatura: Total de alumnos matriculados cargados:', alumnosMatr.length);
        setAlumnosMatriculados(alumnosMatr);

        // Cargar todos los alumnos del profesor
        console.log('MatriculasAsignatura: Cargando todos los alumnos del profesor:', currentUser.id);
        const todosAlumnos = await dataManager.getAlumnosByProfesor(currentUser.id);
        console.log('MatriculasAsignatura: Total de alumnos del profesor:', todosAlumnos.length);
        
        // Filtrar los que no están matriculados
        const disponibles = todosAlumnos.filter(
          alumno => !alumnosIds.includes(alumno.id)
        );
        
        console.log('MatriculasAsignatura: Alumnos disponibles para matricular:', disponibles.length);
        setAlumnosDisponibles(disponibles);
        setSearchResults(disponibles); // Inicialmente los resultados son todos los disponibles
      } catch (error) {
        console.error('Error al cargar los datos:', error);
        alert('Erro ao cargar os datos da asignatura');
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, [id, currentUser, navigate]);

  useEffect(() => {
    // Filtrar alumnos disponibles por término de búsqueda
    if (searchTerm.trim() === '') {
      setSearchResults(alumnosDisponibles);
      return;
    }

    const termLower = searchTerm.toLowerCase();
    const filtrados = alumnosDisponibles.filter(
      alumno =>
        alumno.nome.toLowerCase().includes(termLower) ||
        alumno.apelidos.toLowerCase().includes(termLower) ||
        alumno.email.toLowerCase().includes(termLower)
    );
    setSearchResults(filtrados);
  }, [searchTerm, alumnosDisponibles]);

  const handleMatricular = async (alumnoId: string) => {
    try {
      if (!id) return;

      console.log('MatriculasAsignatura: Matriculando alumno con ID:', alumnoId, 'en asignatura con ID:', id);
      await dataManager.matricularAlumno(alumnoId, id);
      console.log('MatriculasAsignatura: Alumno matriculado exitosamente');
      
      // Actualizar listas
      const alumnoMatriculado = alumnosDisponibles.find(a => a.id === alumnoId);
      if (alumnoMatriculado) {
        console.log('MatriculasAsignatura: Actualizando listas con el alumno matriculado:', alumnoMatriculado.nome, alumnoMatriculado.apelidos);
        setAlumnosMatriculados(prev => [...prev, alumnoMatriculado]);
        setAlumnosDisponibles(prev => prev.filter(a => a.id !== alumnoId));
        setSearchResults(prev => prev.filter(a => a.id !== alumnoId));
        
        // Mostrar mensaje de éxito
        alert(`Alumno ${alumnoMatriculado.nome} ${alumnoMatriculado.apelidos} matriculado con éxito.`);
      } else {
        console.warn('MatriculasAsignatura: No se encontró el alumno en la lista de disponibles');
      }
    } catch (error) {
      console.error('Error al matricular alumno:', error);
      alert(error instanceof Error ? error.message : 'Erro ao matricular o alumno');
    }
  };

  const handleEliminarMatricula = async (alumnoId: string) => {
    try {
      if (!id) return;

      if (window.confirm('¿Está seguro de que quere eliminar a matrícula deste alumno? Tamén se eliminarán todas as notas do alumno nesta asignatura.')) {
        await dataManager.eliminarMatricula(alumnoId, id);
        
        // Eliminar también las notas asociadas
        await dataManager.eliminarNotasAlumnoAsignatura(alumnoId, id);
        
        // Actualizar listas
        const alumnoDesmatriculado = alumnosMatriculados.find(a => a.id === alumnoId);
        if (alumnoDesmatriculado) {
          setAlumnosDisponibles(prev => [...prev, alumnoDesmatriculado]);
          setAlumnosMatriculados(prev => prev.filter(a => a.id !== alumnoId));
          
          // Mostrar mensaje de éxito
          alert(`Alumno ${alumnoDesmatriculado.nome} ${alumnoDesmatriculado.apelidos} desmatriculado con éxito. Tamén se eliminaron as notas asociadas.`);
        }
      }
    } catch (error) {
      console.error('Error al eliminar matrícula:', error);
      alert('Erro ao eliminar a matrícula');
    }
  };

  if (loading) {
    return <div className="text-center py-8">Cargando datos...</div>;
  }

  if (!asignatura) {
    return <div className="text-center py-8 text-red-500">Asignatura non atopada</div>;
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-blue-800">
            Matricular: {asignatura.nome} ({asignatura.nivel} {asignatura.curso}º)
          </h2>
          <button
            onClick={() => navigate('/asignaturas')}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded-lg transition-colors"
          >
            Volver á lista
          </button>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Alumnos matriculados</h3>
          
          {alumnosMatriculados.length === 0 ? (
            <div className="bg-gray-50 p-4 rounded-md text-center text-gray-600">
              Non hai alumnos matriculados nesta asignatura
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="py-3 px-4 text-left">Nome</th>
                    <th className="py-3 px-4 text-left">Apelidos</th>
                    <th className="py-3 px-4 text-left">Email</th>
                    <th className="py-3 px-4 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {alumnosMatriculados.map(alumno => (
                    <tr key={alumno.id} className="hover:bg-gray-50">
                      <td className="py-3 px-4">{alumno.nome}</td>
                      <td className="py-3 px-4">{alumno.apelidos}</td>
                      <td className="py-3 px-4">{alumno.email}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end space-x-4">
                          <button
                            onClick={() => handleVerNotas(alumno.id)}
                            className="text-blue-600 hover:text-blue-800"
                            title="Ver notas do alumno nesta asignatura"
                          >
                            Ver notas
                          </button>
                          <button
                            onClick={() => handleEliminarMatricula(alumno.id)}
                            className="text-red-600 hover:text-red-800"
                            title="Eliminar matrícula"
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-2">Matricular novos alumnos</h3>
          
          <div className="mb-4">
            <input
              type="text"
              placeholder="Buscar alumno por nome, apelidos ou email..."
              className="w-full p-2 border border-gray-300 rounded-md"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {alumnosDisponibles.length === 0 ? (
            <div className="bg-gray-50 p-4 rounded-md text-center text-gray-600">
              Non hai máis alumnos dispoñibles para matricular
            </div>
          ) : searchResults.length === 0 ? (
            <div className="bg-gray-50 p-4 rounded-md text-center text-gray-600">
              Non se atoparon alumnos que coincidan coa búsqueda
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="py-3 px-4 text-left">Nome</th>
                    <th className="py-3 px-4 text-left">Apelidos</th>
                    <th className="py-3 px-4 text-left">Email</th>
                    <th className="py-3 px-4 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {searchResults.map(alumno => (
                    <tr key={alumno.id} className="hover:bg-gray-50">
                      <td className="py-3 px-4">{alumno.nome}</td>
                      <td className="py-3 px-4">{alumno.apelidos}</td>
                      <td className="py-3 px-4">{alumno.email}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleMatricular(alumno.id)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Matricular alumno"
                        >
                          Matricular
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MatriculasAsignatura;
