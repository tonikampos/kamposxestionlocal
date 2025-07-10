import React, { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { storageManager } from '../../utils/storageManager';
import type { Alumno } from '../../utils/storageManager';

interface ImportarAlumnosCSVProps {
  onImportComplete: () => void;
  onCancel: () => void;
}

interface CSVParseResult {
  successful: Array<Omit<Alumno, 'id' | 'createdAt' | 'updatedAt'>>;
  errors: Array<{
    line: number;
    reason: string;
    data: string;
  }>;
}

const ImportarAlumnosCSV: React.FC<ImportarAlumnosCSVProps> = ({ onImportComplete, onCancel }) => {
  const { currentUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [parseResult, setParseResult] = useState<CSVParseResult | null>(null);
  const [delimiter, setDelimiter] = useState(',');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
      setParseResult(null); // Reset previous results
    }
  };

  const handleDelimiterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setDelimiter(e.target.value);
  };

  const parseCSV = (text: string, delimiter: string): CSVParseResult => {
    const result: CSVParseResult = {
      successful: [],
      errors: []
    };

    const lines = text.split(/\r?\n/);
    
    // Verificar si hay encabezados
    if (lines.length < 2) {
      result.errors.push({
        line: 1,
        reason: 'O arquivo está baleiro ou non contén datos suficientes',
        data: lines[0] || ''
      });
      return result;
    }

    // Identificar encabezados
    const headers = lines[0].split(delimiter).map(h => h.trim().toLowerCase());
    const requiredFields = ['nome', 'apelidos', 'email'];
    const headerIndexes: Record<string, number> = {};
    
    // Comprobar campos requeridos y mapear índices
    for (const field of requiredFields) {
      const possibleHeaders = [
        field, // galego
        field === 'nome' ? 'nombre' : field, // castellano para 'nome'
        field === 'apelidos' ? 'apellidos' : field // castellano para 'apelidos'
      ];
      
      const index = headers.findIndex(h => possibleHeaders.includes(h));
      if (index === -1) {
        result.errors.push({
          line: 1,
          reason: `Non se atopou a columna requerida: ${field}`,
          data: headers.join(delimiter)
        });
        return result;
      }
      headerIndexes[field] = index;
    }

    // Procesar cada línea de datos
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue; // Ignorar líneas vacías
      
      const values = line.split(delimiter);
      
      // Verificar que hay suficientes valores
      if (values.length < Math.max(...Object.values(headerIndexes)) + 1) {
        result.errors.push({
          line: i + 1,
          reason: 'Liña con insuficientes campos',
          data: line
        });
        continue;
      }

      // Obtener valores y validar
      const nome = values[headerIndexes.nome].trim();
      const apelidos = values[headerIndexes.apelidos].trim();
      const email = values[headerIndexes.email].trim();
      
      // Encontrar índice de teléfono si existe
      const telefonoIndex = headers.findIndex(h => 
        ['telefono', 'teléfono', 'tel', 'tlf', 'móvil', 'movil'].includes(h));
      const telefono = telefonoIndex >= 0 && values.length > telefonoIndex 
        ? values[telefonoIndex].trim() 
        : undefined;
      
      // Validar campos obligatorios
      if (!nome || !apelidos || !email) {
        result.errors.push({
          line: i + 1,
          reason: 'Faltan campos obrigatorios (nome, apelidos ou email)',
          data: line
        });
        continue;
      }

      // Validar formato de email
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        result.errors.push({
          line: i + 1,
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

    return result;
  };

  const handlePreviewFile = async () => {
    if (!selectedFile || !currentUser) return;
    
    setIsLoading(true);
    
    try {
      const text = await selectedFile.text();
      const result = parseCSV(text, delimiter);
      setParseResult(result);
    } catch (error) {
      console.error('Error al procesar el archivo CSV:', error);
      alert('Error al procesar el archivo. Verifique que es un archivo CSV válido.');
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
      <h2 className="text-xl font-semibold mb-4">Importar Alumnos desde CSV</h2>
      
      <div className="mb-6">
        <p className="text-gray-600 mb-2">
          Suba un arquivo CSV cos seguintes campos: <span className="font-medium">nome</span>, <span className="font-medium">apelidos</span>, <span className="font-medium">email</span> (obrigatorios) e <span className="font-medium">telefono</span> (opcional).
        </p>
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
          <p className="text-sm">
            Formatos aceptados:
            <br />
            - A primeira liña debe conter os nomes das columnas
            <br />
            - Os alumnos serán asociados ao profesor actual
          </p>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-center mb-4">
          <label htmlFor="delimiter" className="block text-gray-700 mr-3">
            Delimitador:
          </label>
          <select
            id="delimiter"
            value={delimiter}
            onChange={handleDelimiterChange}
            className="border border-gray-300 rounded p-2"
          >
            <option value=",">Coma (,)</option>
            <option value=";">Punto e coma (;)</option>
            <option value="\t">Tabulación</option>
          </select>
        </div>
        
        <div className="flex items-center">
          <input
            type="file"
            accept=".csv,.txt"
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
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Liña</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Motivo</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Datos</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {parseResult.errors.map((error, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-sm">{error.line}</td>
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

export default ImportarAlumnosCSV;
