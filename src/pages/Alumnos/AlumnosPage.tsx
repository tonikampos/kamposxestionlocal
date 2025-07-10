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
      
      <div className="bg-white p-6 rounded-lg shadow-md">
        {currentView === VIEW.LIST && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Listado de Alumnos</h2>
              <div className="space-x-2">
                <button 
                  onClick={handleImportCSVClick}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
                >
                  Importar CSV
                </button>
                <button 
                  onClick={handleImportJSONClick}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
                >
                  Importar JSON
                </button>
                <button 
                  onClick={handleAddClick}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                >
                  Novo Alumno
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
