import React, { useState } from 'react';
import AlumnosList from './AlumnosList';
import AlumnosForm from './AlumnosForm';
import ImportarAlumnosCSV from './ImportarAlumnosCSV';
import ImportarAlumnosJSON from './ImportarAlumnosJSON';
import type { Alumno } from '../../utils/storageManager';

// Constantes para las vistas
const VIEW = {
  LIST: 'list',
  FORM: 'form',
  IMPORT_CSV: 'import_csv',
  IMPORT_JSON: 'import_json'
} as const;

type View = typeof VIEW[keyof typeof VIEW];

const AlumnosPage = () => {
  const [currentView, setCurrentView] = useState<View>(VIEW.LIST);
  const [selectedAlumno, setSelectedAlumno] = useState<Alumno | undefined>(undefined);

  const handleAddClick = () => {
    setSelectedAlumno(undefined); // Ensure we're adding, not editing
    setCurrentView(VIEW.FORM);
  };

  const handleImportCSVClick = () => {
    setCurrentView(VIEW.IMPORT_CSV);
  };

  const handleImportJSONClick = () => {
    setCurrentView(VIEW.IMPORT_JSON);
  };

  const handleEditAlumno = (alumno: Alumno) => {
    setSelectedAlumno(alumno);
    setCurrentView(VIEW.FORM);
  };

  const handleCancelForm = () => {
    setCurrentView(VIEW.LIST);
    setSelectedAlumno(undefined);
  };

  const handleFormSave = () => {
    setCurrentView(VIEW.LIST);
    setSelectedAlumno(undefined);
  };

  const handleImportComplete = () => {
    setCurrentView(VIEW.LIST);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-blue-800 mb-6">Xestión de Alumnos</h1>
      
      <div className="bg-white p-4 md:p-6 rounded-lg shadow-md">
        {currentView === VIEW.LIST && (
          <div>
            <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6">
              <h2 className="text-xl font-semibold mb-4 md:mb-0">Listado de Alumnos</h2>
              <div className="flex flex-wrap gap-2">
                <button 
                  onClick={handleAddClick}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex-1 md:flex-none text-center"
                >
                  Novo Alumno
                </button>
                <button 
                  onClick={handleImportCSVClick}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex-1 md:flex-none text-center"
                >
                  Importar CSV
                </button>
                <button 
                  onClick={handleImportJSONClick}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex-1 md:flex-none text-center"
                >
                  Importar JSON
                </button>
              </div>
            </div>
            
            <AlumnosList onEditAlumno={handleEditAlumno} />
          </div>
        )}

        {currentView === VIEW.FORM && (
          <AlumnosForm 
            alumno={selectedAlumno} 
            onSave={handleFormSave} 
            onCancel={handleCancelForm} 
          />
        )}

        {currentView === VIEW.IMPORT_CSV && (
          <ImportarAlumnosCSV 
            onImportComplete={handleImportComplete} 
            onCancel={handleCancelForm} 
          />
        )}
        
        {currentView === VIEW.IMPORT_JSON && (
          <ImportarAlumnosJSON 
            onImportComplete={handleImportComplete} 
            onCancel={handleCancelForm} 
          />
        )}
      </div>
    </div>
  );
};

export default AlumnosPage;
