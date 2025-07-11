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

        // IMPORTANTE: Limpiar los estados antes de cargar nuevos datos
        setAlumnosMatriculados([]);
        setAlumnosDisponibles([]);
        setSearchResults([]);

        // PASO 1: Cargar TODOS los alumnos del profesor para tener la lista completa
        console.log('MatriculasAsignatura: Cargando todos los alumnos del profesor:', currentUser.id);
        const todosAlumnos = await dataManager.getAlumnosByProfesor(currentUser.id);
        console.log('MatriculasAsignatura: Total de alumnos del profesor:', todosAlumnos.length, todosAlumnos);

        if (todosAlumnos.length === 0) {
          console.warn('MatriculasAsignatura: El profesor no tiene alumnos registrados');
          return; // No hay alumnos que mostrar ni matricular
        }
        
        // PASO 2: Obtener las matrículas de esta asignatura
        console.log('MatriculasAsignatura: Obteniendo matrículas para la asignatura:', id);
        const matriculas = await dataManager.getMatriculasByAsignatura(id);
        console.log('MatriculasAsignatura: Matrículas obtenidas para esta asignatura:', matriculas);
        
        // Mapear los IDs de los alumnos matriculados
        const alumnosIdsMatriculados = matriculas.map(m => m.alumnoId);
        console.log('MatriculasAsignatura: IDs de alumnos matriculados:', alumnosIdsMatriculados);
        
        // PASO 3: Procesar alumnos matriculados y disponibles a partir de la lista completa
        const alumnosMatriculadosArray: Alumno[] = [];
        const alumnosDisponiblesArray: Alumno[] = [];
        
        // Clasificar cada alumno según esté matriculado o no
        todosAlumnos.forEach(alumno => {
          if (alumnosIdsMatriculados.includes(alumno.id)) {
            console.log('MatriculasAsignatura: Alumno matriculado:', alumno.nome, alumno.apelidos, alumno.id);
            alumnosMatriculadosArray.push(alumno);
          } else {
            alumnosDisponiblesArray.push(alumno);
          }
        });
        
        console.log('MatriculasAsignatura: Total de alumnos matriculados procesados:', alumnosMatriculadosArray.length);
        console.log('MatriculasAsignatura: Total de alumnos disponibles procesados:', alumnosDisponiblesArray.length);
        
        // Actualizar el estado con los resultados
        setAlumnosMatriculados(alumnosMatriculadosArray);
        setAlumnosDisponibles(alumnosDisponiblesArray);
        setSearchResults(alumnosDisponiblesArray); // Inicialmente los resultados son todos los disponibles
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
      
      // Buscar el alumno en la lista de disponibles
      const alumnoToMatricular = alumnosDisponibles.find(a => a.id === alumnoId);
      if (!alumnoToMatricular) {
        console.error('MatriculasAsignatura: No se encontró el alumno en la lista de disponibles');
        
        // Intentar obtener el alumno directamente de la base de datos
        const alumnoFromDB = await dataManager.getAlumnoById(alumnoId);
        if (!alumnoFromDB) {
          throw new Error('No se pudo encontrar información del alumno');
        }
        
        // Matricular el alumno
        await dataManager.matricularAlumno(alumnoId, id);
        console.log('MatriculasAsignatura: Alumno matriculado exitosamente (desde DB):', alumnoFromDB.nome);
        
        // Actualizar listas usando el alumno obtenido de la base de datos
        setAlumnosMatriculados(prev => [...prev, alumnoFromDB]);
        
        // Mostrar mensaje de éxito
        alert(`Alumno ${alumnoFromDB.nome} ${alumnoFromDB.apelidos} matriculado con éxito.`);
        return;
      }
      
      // Matricular el alumno
      await dataManager.matricularAlumno(alumnoId, id);
      console.log('MatriculasAsignatura: Alumno matriculado exitosamente:', alumnoToMatricular.nome);
      
      // Actualizar listas
      console.log('MatriculasAsignatura: Actualizando listas con el alumno matriculado:', alumnoToMatricular.nome);
      setAlumnosMatriculados(prev => [...prev, alumnoToMatricular]);
      setAlumnosDisponibles(prev => prev.filter(a => a.id !== alumnoId));
      setSearchResults(prev => prev.filter(a => a.id !== alumnoId));
      
      // Mostrar mensaje de éxito
      alert(`Alumno ${alumnoToMatricular.nome} ${alumnoToMatricular.apelidos} matriculado con éxito.`);
      
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

  // Función para recargar datos manualmente
  const handleRecargarDatos = async () => {
    if (!id || !currentUser) return;
    console.log('MatriculasAsignatura: Recargando datos manualmente');
    setLoading(true);
    
    try {
      // Actualizar datos de alumnos matriculados
      const matriculas = await dataManager.getMatriculasByAsignatura(id);
      console.log('MatriculasAsignatura: Matrículas recargadas:', matriculas.length, matriculas);
      
      const alumnosIds = matriculas.map(m => m.alumnoId);
      
      // Cargar detalles de los alumnos matriculados
      const alumnosMatr: Alumno[] = [];
      for (const alumnoId of alumnosIds) {
        const alumno = await dataManager.getAlumnoById(alumnoId);
        if (alumno) {
          alumnosMatr.push(alumno);
        }
      }
      
      console.log('MatriculasAsignatura: Alumnos matriculados recargados:', alumnosMatr.length);
      setAlumnosMatriculados(alumnosMatr);
      
      // Recargar alumnos disponibles
      const todosAlumnos = await dataManager.getAlumnosByProfesor(currentUser.id);
      
      // Filtrar los que no están matriculados
      const disponibles = todosAlumnos.filter(
        alumno => !alumnosIds.includes(alumno.id)
      );
      
      setAlumnosDisponibles(disponibles);
      setSearchResults(disponibles);
      alert('Datos actualizados correctamente');
    } catch (error) {
      console.error('Error al recargar datos:', error);
      alert('Error al recargar los datos');
    } finally {
      setLoading(false);
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

        <div className="mt-8">
          <button
            onClick={handleRecargarDatos}
            className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors"
          >
            Recargar datos
          </button>
        </div>
      </div>
    </div>
  );
};

export default MatriculasAsignatura;
