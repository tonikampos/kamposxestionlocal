import React, { useState, useEffect } from 'react';
import { useRealtimeAuth } from '../../firebase/RealtimeAuthContext';
import { dataManager } from '../../utils/dataManager';

const EstadisticasPage = () => {
  const { currentUser } = useRealtimeAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalAlumnos: 0,
    totalAsignaturas: 0,
    totalMatriculas: 0,
    asignaturasConNotas: 0,
  });

  useEffect(() => {
    const loadStats = async () => {
      if (!currentUser) return;
      
      setLoading(true);
      try {
        // Cargar alumnos
        const alumnos = await dataManager.getAlumnosByProfesor(currentUser.id);
        
        // Cargar asignaturas
        const asignaturas = await dataManager.getAsignaturasByProfesor(currentUser.id);
        
        // Contar matrículas
        let totalMatriculas = 0;
        let asignaturasConNotas = 0;
        
        for (const asignatura of asignaturas) {
          const matriculas = await dataManager.getMatriculasByAsignatura(asignatura.id);
          totalMatriculas += matriculas.length;
          
          // Verificar si hay notas registradas
          if (matriculas.length > 0) {
            const alumno = await dataManager.getAlumnoById(matriculas[0].alumnoId);
            if (alumno) {
              const nota = await dataManager.getNotaAlumno(alumno.id, asignatura.id);
              if (nota && nota.notasAvaliaciois && nota.notasAvaliaciois.length > 0) {
                asignaturasConNotas++;
              }
            }
          }
        }
        
        setStats({
          totalAlumnos: alumnos.length,
          totalAsignaturas: asignaturas.length,
          totalMatriculas,
          asignaturasConNotas,
        });
      } catch (error) {
        console.error("Error al cargar estadísticas:", error);
      } finally {
        setLoading(false);
      }
    };
    
    loadStats();
  }, [currentUser]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-blue-800">Estadísticas</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Tarjeta de alumnos */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Total Alumnos</p>
              <p className="text-3xl font-bold text-blue-800">{stats.totalAlumnos}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
          </div>
        </div>
        
        {/* Tarjeta de asignaturas */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Total Asignaturas</p>
              <p className="text-3xl font-bold text-green-700">{stats.totalAsignaturas}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
          </div>
        </div>
        
        {/* Tarjeta de matrículas */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Total Matrículas</p>
              <p className="text-3xl font-bold text-purple-700">{stats.totalMatriculas}</p>
            </div>
            <div className="bg-purple-100 p-3 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
        </div>
        
        {/* Tarjeta de asignaturas con notas */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Asignaturas con Notas</p>
              <p className="text-3xl font-bold text-orange-600">{stats.asignaturasConNotas}</p>
            </div>
            <div className="bg-orange-100 p-3 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Detalles de Estadísticas</h2>
        <p className="text-gray-600 mb-4">
          Esta página mostrará estadísticas más detalladas en futuras actualizaciones:
        </p>
        <ul className="list-disc pl-5 space-y-2 text-gray-600">
          <li>Gráficos de rendimiento por asignatura</li>
          <li>Distribución de notas por rango</li>
          <li>Evolución de notas por evaluación</li>
          <li>Comparativas entre grupos</li>
          <li>Tasas de aprobados/suspensos</li>
        </ul>
      </div>
    </div>
  );
};

export default EstadisticasPage;
