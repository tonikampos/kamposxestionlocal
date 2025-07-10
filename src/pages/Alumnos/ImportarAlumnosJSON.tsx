import React, { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { storageManager } from '../../utils/storageManager';
import type { Alumno } from '../../utils/storageManager';

interface ImportarAlumnosJSONProps {
  onImportComplete: () => void;
  onCancel: () => void;
}

interface JSONParseResult {
  successful: Array<Omit<Alumno, 'id' | 'createdAt' | 'updatedAt'>>;
  errors: Array<{
    reason: string;
    data: string;
  }>;
}

interface AlumnoJSON {
  name: string;
  surname: string;
  email: string;
  phone?: string;
  [key: string]: any; // Para permitir otros campos en el JSON
}

const ImportarAlumnosJSON: React.FC<ImportarAlumnosJSONProps> = ({ onImportComplete, onCancel }) => {
  const { currentUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [parseResult, setParseResult] = useState<JSONParseResult | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
      setParseResult(null); // Reset previous results
    }
  };

  const parseJSON = (text: string): JSONParseResult => {
    const result: JSONParseResult = {
      successful: [],
      errors: []
    };

    try {
      const jsonData = JSON.parse(text);
      
      // Detectar estructura del JSON
      let alumnosArray: AlumnoJSON[] = [];
      
      if (Array.isArray(jsonData)) {
        // Si es un array directamente
        alumnosArray = jsonData;
      } else if (jsonData.data && jsonData.data.students && Array.isArray(jsonData.data.students)) {
        // Si tiene la estructura como el ejemplo proporcionado
        alumnosArray = jsonData.data.students;
      } else {
        result.errors.push({
          reason: 'Formato de JSON non recoñecido. O arquivo debe conter un array de alumnos ou unha estructura con data.students',
          data: JSON.stringify(jsonData).substring(0, 100) + '...'
        });
        return result;
      }
      
      // Procesar cada alumno
      for (let i = 0; i < alumnosArray.length; i++) {
        const alumnoJson = alumnosArray[i];
        
        // Verificar campos requeridos
        const nome = alumnoJson.name;
        const apelidos = alumnoJson.surname;
        const email = alumnoJson.email;
        const telefono = alumnoJson.phone || '';
        
        // Validar campos obligatorios
        if (!nome || !apelidos || !email) {
          result.errors.push({
            reason: 'Faltan campos obrigatorios (nome, apelidos ou email)',
            data: JSON.stringify(alumnoJson)
          });
          continue;
        }

        // Validar formato de email
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          result.errors.push({
            reason: 'Formato de email non válido',
            data: email
          });
          continue;
        }

        // Añadir alumno a exitosos
        if (currentUser) {
          result.successful.push({
            profesorId: currentUser.id,
            nome,
            apelidos,
            email,
            telefono
          });
        }
      }
      
    } catch (error) {
      result.errors.push({
        reason: 'Error ao parsear o JSON: ' + (error instanceof Error ? error.message : String(error)),
        data: text.substring(0, 100) + '...'
      });
    }

    return result;
  };

  const handlePreviewFile = async () => {
    if (!selectedFile || !currentUser) return;
    
    setIsLoading(true);
    
    try {
      const text = await selectedFile.text();
      const result = parseJSON(text);
      setParseResult(result);
    } catch (error) {
      console.error('Error al procesar el archivo JSON:', error);
      alert('Error ao procesar o arquivo. Verifique que é un arquivo JSON válido.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = () => {
    if (!parseResult || !parseResult.successful.length || !currentUser) {
      return;
    }
    
    try {
      // Importar alumnos
      storageManager.addMultipleAlumnos(parseResult.successful);
      onImportComplete();
    } catch (error) {
      console.error('Error al importar alumnos:', error);
      alert('Ocorreu un erro ao importar os alumnos. Por favor, inténteo de novo.');
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md max-w-4xl mx-auto">
      <h2 className="text-xl font-semibold mb-4">Importar Alumnos desde JSON</h2>
      
      <div className="mb-6">
        <p className="text-gray-600 mb-2">
          Suba un arquivo JSON cos campos: <span className="font-medium">name</span>, <span className="font-medium">surname</span>, <span className="font-medium">email</span> (obrigatorios) e <span className="font-medium">phone</span> (opcional).
        </p>
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
          <p className="text-sm">
            Formatos aceptados:
            <br />
            - Array de obxectos con alumnos
            <br />
            - Obxecto JSON con estructura {"{data: {students: [...]}}"}
            <br />
            - Os alumnos serán asociados ao profesor actual
          </p>
        </div>
      </div>
      
      <div className="mb-6">
        <div className="flex items-center">
          <input
            type="file"
            accept=".json"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded-md"
          >
            Seleccionar arquivo
          </button>
          <span className="ml-3 text-gray-600">
            {selectedFile ? selectedFile.name : 'Ningún arquivo seleccionado'}
          </span>
        </div>
      </div>

      {selectedFile && !parseResult && (
        <div className="mb-6">
          <button
            onClick={handlePreviewFile}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
          >
            {isLoading ? 'Procesando...' : 'Vista previa dos datos'}
          </button>
        </div>
      )}

      {parseResult && (
        <div className="mb-6">
          <h3 className="font-medium mb-2">Resultado da importación</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-green-600 font-medium mb-2">
                Rexistros correctos: {parseResult.successful.length}
              </h4>
              {parseResult.successful.length > 0 && (
                <div className="max-h-60 overflow-auto border border-gray-200 rounded p-2">
                  <table className="min-w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Nome</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Apelidos</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Email</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {parseResult.successful.map((alumno, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-sm">{alumno.nome}</td>
                          <td className="px-3 py-2 text-sm">{alumno.apelidos}</td>
                          <td className="px-3 py-2 text-sm">{alumno.email}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            
            <div>
              <h4 className="text-red-600 font-medium mb-2">
                Rexistros con erros: {parseResult.errors.length}
              </h4>
              {parseResult.errors.length > 0 && (
                <div className="max-h-60 overflow-auto border border-gray-200 rounded p-2">
                  <table className="min-w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Motivo</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Datos</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {parseResult.errors.map((error, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-sm">{error.reason}</td>
                          <td className="px-3 py-2 text-sm truncate max-w-xs" title={error.data}>
                            {error.data}
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
      )}

      <div className="flex justify-end space-x-3">
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
        >
          Cancelar
        </button>
        
        {parseResult && parseResult.successful.length > 0 && (
          <button
            onClick={handleImport}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Importar {parseResult.successful.length} alumnos
          </button>
        )}
      </div>
    </div>
  );
};

export default ImportarAlumnosJSON;
