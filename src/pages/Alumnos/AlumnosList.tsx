import React, { useState, useEffect } from 'react';
import { useRealtimeAuth } from '../../firebase/RealtimeAuthContext';
import { dataManager } from '../../utils/dataManager';
import type { Alumno } from '../../utils/storageManager';
import { useNavigate } from 'react-router-dom';

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
  const navigate = useNavigate();

  // Cargar alumnos al montar el componente y cuando cambie el usuario
  useEffect(() => {
    if (currentUser) {
      loadAlumnos();
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
            console.log('AlumnosList: Verificando matrículas para alumno', alumno.id);
            const matriculasAlumno = await dataManager.getMatriculasByAlumno(alumno.id);
            matriculados[alumno.id] = matriculasAlumno.length > 0;
          }
        } else {
          console.log('AlumnosList: No hay alumnos para cargar matrículas');
        }
        
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
    // Verificar si el alumno está matriculado
    if (matriculadosMap[id]) {
      alert('Non se pode eliminar un alumno que está matriculado en algunha asignatura');
      return;
    }

    if (window.confirm('¿Estás seguro de que queres eliminar este alumno?')) {
      try {
        await dataManager.deleteAlumno(id);
        loadAlumnos(); // Recargar la lista
      } catch (error) {
        console.error('Error al eliminar alumno:', error);
        alert('Erro ao eliminar o alumno');
      }
    }
  };

  const irANotas = (alumno: Alumno) => {
    // Si el alumno no está matriculado, mostrar un mensaje
    if (!matriculadosMap[alumno.id]) {
      alert('O alumno non está matriculado en ningunha asignatura');
      return;
    }
    
    // Guardar el alumno en sessionStorage para recuperarlo en la página de notas
    sessionStorage.setItem('alumnoSeleccionadoId', alumno.id);
    
    // Navegar a la página de notas
    navigate('/notas');
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
                        Matriculado
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
                      {matriculadosMap[alumno.id] ? (
                        <button 
                          onClick={() => irANotas(alumno)}
                          className="text-green-600 hover:text-green-800"
                        >
                          Ver notas
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleDeleteAlumno(alumno.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Eliminar
                        </button>
                      )}
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
                        Matriculado
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
                  {matriculadosMap[alumno.id] ? (
                    <button 
                      onClick={() => irANotas(alumno)}
                      className="text-green-600 hover:text-green-800 text-sm py-1 px-2 border border-green-600 rounded"
                    >
                      Ver notas
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleDeleteAlumno(alumno.id)}
                      className="text-red-600 hover:text-red-800 text-sm py-1 px-2 border border-red-600 rounded"
                    >
                      Eliminar
                    </button>
                  )}
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
          <li>Os alumnos matriculados teñen acceso directo ás súas notas.</li>
          <li>Para matricular un alumno, debe ir á sección de Asignaturas e engadir o alumno á matrícula da asignatura.</li>
        </ul>
      </div>
    </div>
  );
};

export default AlumnosList;
