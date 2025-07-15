import React, { useState, useEffect } from 'react';
import { useRealtimeAuth } from '../../firebase/RealtimeAuthContext';
import { dataManager } from '../../utils/dataManager';
import type { Alumno } from '../../utils/storageManager';

interface AlumnosListProps {
  onEditAlumno: (alumno: Alumno) => void;
}

const AlumnosList: React.FC<AlumnosListProps> = ({ onEditAlumno }) => {
  const { currentUser } = useRealtimeAuth();
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [filteredAlumnos, setFilteredAlumnos] = useState<Alumno[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [matriculadosMap, setMatriculadosMap] = useState<Record<string, boolean>>({});

  // Cargar alumnos al montar el componente y cuando cambie el usuario
  useEffect(() => {
    if (currentUser) {
      loadAlumnos();
      
      // Configurar un intervalo para refrescar periódicamente el estado de matriculación
      const intervalId = setInterval(() => {
        refreshMatriculacionStatus();
      }, 5000); // Cada 5 segundos para una actualización más rápida
      
      return () => clearInterval(intervalId);
    }
  }, [currentUser]);

  // Filtrar alumnos cuando cambie el término de búsqueda o la lista de alumnos
  useEffect(() => {
    filterAlumnos();
  }, [searchTerm, alumnos]);

  const loadAlumnos = async () => {
    setIsLoading(true);
    try {
      if (currentUser) {
        console.log('AlumnosList: Cargando alumnos para profesor', currentUser.id);
        
        // Usamos dataManager que trabaja con Firebase
        const alumnosFromStorage = await dataManager.getAlumnosByProfesor(currentUser.id);
        console.log('AlumnosList: Alumnos cargados', alumnosFromStorage);
        
        // Siempre establecer el estado, incluso si es un array vacío
        setAlumnos(alumnosFromStorage || []);
        
        // Verificar qué alumnos están matriculados en alguna asignatura
        const matriculados: Record<string, boolean> = {};
        
        if (alumnosFromStorage && alumnosFromStorage.length > 0) {
          for (const alumno of alumnosFromStorage) {
            console.log('AlumnosList: Verificando matrículas para alumno', alumno.id, alumno.nome);
            const matriculasAlumno = await dataManager.getMatriculasByAlumno(alumno.id);
            console.log(`AlumnosList: Alumno ${alumno.nome} tiene ${matriculasAlumno.length} matrículas:`, matriculasAlumno);
            matriculados[alumno.id] = matriculasAlumno.length > 0;
            console.log(`AlumnosList: Estado de ${alumno.nome}: ${matriculados[alumno.id] ? 'Matriculado' : 'No matriculado'}`);
          }
        } else {
          console.log('AlumnosList: No hay alumnos para cargar matrículas');
        }
        
        console.log('AlumnosList: Estado final de matriculación:', matriculados);
        setMatriculadosMap(matriculados);
      } else {
        console.log('AlumnosList: No hay usuario actual, no se cargan alumnos');
        setAlumnos([]);
        setMatriculadosMap({});
      }
    } catch (error) {
      console.error('Error al cargar alumnos:', error);
      alert('Erro ao cargar os alumnos');
    } finally {
      setIsLoading(false);
    }
  };

  // Función para refrescar solo el estado de matriculación sin recargar todos los alumnos
  const refreshMatriculacionStatus = async () => {
    if (!currentUser || alumnos.length === 0) return;
    
    try {
      console.log('AlumnosList: Refrescando estado de matriculación...');
      const matriculados: Record<string, boolean> = {...matriculadosMap};
      let cambiosDetectados = false;
      
      // Procesamos por lotes para no sobrecargar la base de datos
      const batchSize = 5;
      for (let i = 0; i < alumnos.length; i += batchSize) {
        const alumnosBatch = alumnos.slice(i, i + batchSize);
        const promesas = alumnosBatch.map(async (alumno) => {
          try {
            const matriculasAlumno = await dataManager.getMatriculasByAlumno(alumno.id);
            const estaMatriculado = matriculasAlumno.length > 0;
            
            // Solo actualizar si hay cambios
            if (matriculados[alumno.id] !== estaMatriculado) {
              matriculados[alumno.id] = estaMatriculado;
              return { id: alumno.id, cambio: true, estaMatriculado };
            }
            return { id: alumno.id, cambio: false };
          } catch (error) {
            console.error(`Error al verificar matrículas para alumno ${alumno.id}:`, error);
            return { id: alumno.id, cambio: false };
          }
        });
        
        const resultados = await Promise.all(promesas);
        resultados.forEach(resultado => {
          if (resultado.cambio) {
            cambiosDetectados = true;
            console.log(`Estado de matriculación actualizado para alumno ${resultado.id}: ${resultado.estaMatriculado ? 'Matriculado' : 'No matriculado'}`);
          }
        });
        
        // Pequeña pausa entre lotes para no sobrecargar Firebase
        if (i + batchSize < alumnos.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      // Actualizar el estado solo si se detectaron cambios
      if (cambiosDetectados) {
        setMatriculadosMap(matriculados);
        console.log('AlumnosList: Estado de matriculación actualizado');
      }
    } catch (error) {
      console.error('Error al refrescar estado de matriculación:', error);
    }
  };

  const filterAlumnos = () => {
    if (!searchTerm.trim()) {
      setFilteredAlumnos(alumnos);
      return;
    }

    const searchTermLower = searchTerm.toLowerCase();
    const filtered = alumnos.filter(
      alumno =>
        alumno.nome.toLowerCase().includes(searchTermLower) ||
        alumno.apelidos.toLowerCase().includes(searchTermLower) ||
        alumno.email.toLowerCase().includes(searchTermLower)
    );
    setFilteredAlumnos(filtered);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleDeleteAlumno = async (id: string) => {
    // Verificar que el alumno no esté matriculado antes de eliminarlo
    const estaMatriculado = matriculadosMap[id];
    
    if (estaMatriculado) {
      alert('Non se pode eliminar un alumno que está matriculado en algunha asignatura. Primeiro debe dalo de baixa en todas as asignaturas.');
      return;
    }
    
    if (window.confirm('¿Estás seguro de que queres eliminar este alumno?')) {
      try {
        await dataManager.deleteAlumno(id);
        loadAlumnos(); // Recargar la lista
      } catch (error) {
        console.error('Error al eliminar alumno:', error);
        // Mostrar mensaje de error detallado si está disponible
        const errorMessage = error instanceof Error ? error.message : 'Erro ao eliminar o alumno';
        alert(errorMessage);
      }
    }
  };

  if (isLoading) {
    return <div className="text-center py-4">Cargando alumnos...</div>;
  }

  return (
    <div>
      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar alumno por nome, apelidos ou email..."
          className="w-full p-2 border border-gray-300 rounded-lg"
          value={searchTerm}
          onChange={handleSearchChange}
        />
      </div>
      
      {/* Vista de tabla para pantallas medianas y grandes */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full bg-white">
          <thead className="bg-gray-100">
            <tr>
              <th className="py-3 px-4 text-left">Nome</th>
              <th className="py-3 px-4 text-left">Apelidos</th>
              <th className="py-3 px-4 text-left">Email</th>
              <th className="py-3 px-4 text-left">Teléfono</th>
              <th className="py-3 px-4 text-left">Estado</th>
              <th className="py-3 px-4 text-center">Accións</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredAlumnos.length > 0 ? (
              filteredAlumnos.map(alumno => (
                <tr 
                  key={alumno.id} 
                  className={`hover:bg-gray-50 ${!matriculadosMap[alumno.id] ? 'bg-red-50' : ''}`}
                >
                  <td className="py-3 px-4">{alumno.nome}</td>
                  <td className="py-3 px-4">{alumno.apelidos}</td>
                  <td className="py-3 px-4">{alumno.email}</td>
                  <td className="py-3 px-4">{alumno.telefono || '-'}</td>
                  <td className="py-3 px-4">
                    {matriculadosMap[alumno.id] ? (
                      <span className="bg-green-100 text-green-800 py-1 px-2 rounded-full text-xs font-medium">
                        Activo
                      </span>
                    ) : (
                      <span className="bg-red-100 text-red-800 py-1 px-2 rounded-full text-xs font-medium">
                        Non matriculado
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex justify-center space-x-2">
                      <button 
                        onClick={() => onEditAlumno(alumno)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        Editar
                      </button>
                      
                      <button 
                        onClick={() => handleDeleteAlumno(alumno.id)}
                        className={`${
                          matriculadosMap[alumno.id] 
                            ? "text-gray-400 cursor-not-allowed" 
                            : "text-red-600 hover:text-red-800"
                        }`}
                        disabled={matriculadosMap[alumno.id]}
                        title={matriculadosMap[alumno.id] ? 
                          "Non se pode eliminar un alumno matriculado" : 
                          "Eliminar alumno"}
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="py-6 text-center text-gray-500">
                  {searchTerm.trim() 
                    ? 'Non se atoparon alumnos que coincidan coa busca.' 
                    : 'Non hai alumnos rexistrados. Engade alumnos para que aparezan aquí.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Vista de tarjetas para móviles */}
      <div className="md:hidden">
        {filteredAlumnos.length > 0 ? (
          <div className="space-y-4">
            {filteredAlumnos.map(alumno => (
              <div 
                key={alumno.id} 
                className={`border rounded-lg p-4 shadow-sm ${!matriculadosMap[alumno.id] ? 'bg-red-50 border-red-200' : 'bg-white'}`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium">{alumno.nome} {alumno.apelidos}</h3>
                    <div className="text-sm text-gray-600 mt-1">
                      <p>{alumno.email}</p>
                      <p>Tel: {alumno.telefono || 'Non dispoñible'}</p>
                    </div>
                  </div>
                  <div>
                    {matriculadosMap[alumno.id] ? (
                      <span className="bg-green-100 text-green-800 py-1 px-2 rounded-full text-xs font-medium">
                        Activo
                      </span>
                    ) : (
                      <span className="bg-red-100 text-red-800 py-1 px-2 rounded-full text-xs font-medium">
                        Non matriculado
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="mt-3 pt-3 border-t border-gray-200 flex justify-end space-x-2">
                  <button 
                    onClick={() => onEditAlumno(alumno)}
                    className="text-blue-600 hover:text-blue-800 text-sm py-1 px-2 border border-blue-600 rounded"
                  >
                    Editar
                  </button>
                  
                  <button 
                    onClick={() => handleDeleteAlumno(alumno.id)}
                    className={`text-sm py-1 px-2 border rounded ${
                      matriculadosMap[alumno.id] 
                        ? "text-gray-400 border-gray-300 cursor-not-allowed" 
                        : "text-red-600 hover:text-red-800 border-red-600"
                    }`}
                    disabled={matriculadosMap[alumno.id]}
                    title={matriculadosMap[alumno.id] ? 
                      "Non se pode eliminar un alumno matriculado" : 
                      "Eliminar alumno"}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-6 text-center text-gray-500">
            {searchTerm.trim() 
              ? 'Non se atoparon alumnos que coincidan coa busca.' 
              : 'Non hai alumnos rexistrados. Engade alumnos para que aparezan aquí.'}
          </div>
        )}
      </div>
      
      <div className="mt-4 text-sm text-gray-500">
        <p>Mostrando {filteredAlumnos.length} de {alumnos.length} alumnos</p>
      </div>
      
      <div className="mt-4 p-4 bg-blue-50 rounded-lg">
        <h3 className="text-sm font-medium text-blue-800 mb-1">Información</h3>
        <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1">
          <li>Os alumnos <span className="bg-red-100 text-red-800 py-0.5 px-1 rounded text-xs">non matriculados</span> poden ser eliminados.</li>
          <li>Os alumnos <span className="bg-green-100 text-green-800 py-0.5 px-1 rounded text-xs">activos</span> están matriculados en algunha asignatura e non poden ser eliminados.</li>
          <li>Para matricular un alumno, debe ir á sección de Asignaturas e engadir o alumno á matrícula da asignatura.</li>
        </ul>
      </div>
    </div>
  );
};

export default AlumnosList;
