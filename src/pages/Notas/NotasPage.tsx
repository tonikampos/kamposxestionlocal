import React, { useState, useEffect } from 'react';
import NotasAsignaturasSelector from './NotasAsignaturasSelector';
import NotasAlumnosList from './NotasAlumnosList';
import NotasForm from './NotasForm';
import { useRealtimeAuth } from '../../firebase/RealtimeAuthContext';
import { dataManager } from '../../utils/dataManager';
import type { Alumno } from '../../utils/storageManager';

const NotasPage = () => {
  const [selectedAsignaturaId, setSelectedAsignaturaId] = useState<string | null>(null);
  const [selectedAlumno, setSelectedAlumno] = useState<Alumno | null>(null);
  const [refreshKey, setRefreshKey] = useState<number>(0); // Clave para forzar refrescado de componentes
  const { currentUser } = useRealtimeAuth();

  // Efecto para cargar el alumno seleccionado desde la lista de alumnos (si existe)
  useEffect(() => {
    const alumnoId = sessionStorage.getItem('alumnoSeleccionadoId');
    if (alumnoId && currentUser) {
      const loadAlumno = async () => {
        try {
          // Buscar el alumno por su ID
          const alumno = await dataManager.getAlumnoById(alumnoId);
          if (alumno) {
            setSelectedAlumno(alumno);
            
            // Buscar las matrículas del alumno para seleccionar la primera asignatura
            const matriculas = await dataManager.getMatriculasByAlumno(alumnoId);
            if (matriculas.length > 0) {
              setSelectedAsignaturaId(matriculas[0].asignaturaId);
            }
            
            // Limpiar el sessionStorage para no cargar este alumno en futuras visitas
            sessionStorage.removeItem('alumnoSeleccionadoId');
          }
        } catch (error) {
          console.error('Error al cargar el alumno seleccionado:', error);
        }
      };
      
      loadAlumno();
    }
  }, [currentUser]);

  const handleAsignaturaSelected = (asignaturaId: string) => {
    setSelectedAsignaturaId(asignaturaId);
    setSelectedAlumno(null); // Resetear alumno seleccionado al cambiar de asignatura
  };

  const handleAlumnoSelected = (alumno: Alumno) => {
    setSelectedAlumno(alumno);
  };

  const handleNotasSaved = () => {
    // Incrementar refreshKey para forzar la recarga de componentes
    setRefreshKey(prevKey => prevKey + 1);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-blue-800">Xestión de Notas</h1>

      {/* Selector de Asignatura */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Selecciona unha Asignatura</h2>
        <NotasAsignaturasSelector 
          onAsignaturaSelected={handleAsignaturaSelected} 
          selectedAsignaturaId={selectedAsignaturaId}
        />
      </div>

      {selectedAsignaturaId && (
        <div className="grid md:grid-cols-3 gap-6">
          {/* Lista de Alumnos */}
          <div className="md:col-span-1">
            <div className="bg-white p-6 rounded-lg shadow h-full">
              <h2 className="text-lg font-semibold mb-4">Alumnos Matriculados</h2>
              <NotasAlumnosList 
                asignaturaId={selectedAsignaturaId} 
                onAlumnoSelected={handleAlumnoSelected} 
                refreshKey={refreshKey}
                selectedAlumnoId={selectedAlumno?.id}
              />
            </div>
          </div>
          
          {/* Formulario de Notas */}
          <div className="md:col-span-2">
            {selectedAlumno ? (
              <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-lg font-semibold mb-4">
                  Notas de {selectedAlumno.nome} {selectedAlumno.apelidos}
                </h2>
                <NotasForm 
                  alumno={selectedAlumno} 
                  asignaturaId={selectedAsignaturaId}
                  onNotasSaved={handleNotasSaved}
                />
              </div>
            ) : (
              <div className="bg-white p-6 rounded-lg shadow">
                <p className="text-gray-500">Selecciona un alumno para xestionar as súas notas</p>
              </div>
            )}
          </div>
        </div>
      )}

      {!selectedAsignaturaId && (
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-gray-500">Selecciona unha asignatura para continuar</p>
        </div>
      )}
    </div>
  );
};

export default NotasPage;
