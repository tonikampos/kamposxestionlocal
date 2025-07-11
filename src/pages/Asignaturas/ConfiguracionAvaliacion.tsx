import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { dataManager } from '../../utils/dataManager';
import type { 
  Asignatura, 
  ConfiguracionAvaliacion, 
  Avaliacion, 
  Proba 
} from '../../utils/storageManager';

const ConfiguracionAvaliacionPage = () => {
  const { id: asignaturaId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  const [asignatura, setAsignatura] = useState<Asignatura | null>(null);
  const [configuracion, setConfiguracion] = useState<ConfiguracionAvaliacion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Función para crear una configuración de evaluación predeterminada
  const createDefaultConfiguracionAvaliacion = (asignatura: Asignatura): ConfiguracionAvaliacion => {
    const avaliaciois: Avaliacion[] = [];
    const numeroAvaliaciois = asignatura.numeroAvaliaciois || 3;
    
    // Calcular el porcentaje equitativo para cada evaluación
    const porcentajePorAval = 100 / numeroAvaliaciois;
    
    for (let i = 1; i <= numeroAvaliaciois; i++) {
      const avalId = `aval_${i}_${Date.now() + i}`;
      
      // Crear pruebas predeterminadas
      const probas: Proba[] = [
        {
          id: `proba_examen_${avalId}`,
          nome: 'Exame',
          descripcion: 'Exame escrito',
          porcentaxe: 70
        },
        {
          id: `proba_traballos_${avalId}`,
          nome: 'Traballos',
          descripcion: 'Traballos e tarefas',
          porcentaxe: 20
        },
        {
          id: `proba_actitude_${avalId}`,
          nome: 'Actitude',
          descripcion: 'Comportamento e participación',
          porcentaxe: 10
        }
      ];
      
      avaliaciois.push({
        id: avalId,
        numero: i,
        porcentaxeNota: porcentajePorAval,
        probas
      });
    }
    
    return {
      asignaturaId: asignatura.id,
      avaliaciois
    };
  };

  // Cargar la asignatura y su configuración
  useEffect(() => {
    const loadAsignatura = async () => {
      if (!asignaturaId || !currentUser?.id) return;
      
      setLoading(true);
      try {
        const asig = await dataManager.getAsignaturaById(asignaturaId);
        
        if (!asig) {
          setError('Non se atopou a asignatura solicitada');
          return;
        }
        
        // Verificar que la asignatura pertenece al profesor actual
        if (asig.profesorId !== currentUser.id) {
          setError('Non ten permisos para configurar esta asignatura');
          return;
        }
        
        setAsignatura(asig);
        
        // Usar configuración existente o crear una predeterminada
        let config = asig.configuracionAvaliacion;
        
        if (!config) {
          // Si no existe configuración, crear una predeterminada
          config = createDefaultConfiguracionAvaliacion(asig);
        }
        
        setConfiguracion(config);
      } catch (err) {
        console.error('Error al cargar asignatura:', err);
        setError('Ocorreu un erro ao cargar a información da asignatura');
      } finally {
        setLoading(false);
      }
    };
    
    loadAsignatura();
  }, [asignaturaId, currentUser]);

  // Manejar cambios en los porcentajes de evaluación
  const handlePorcentaxeChange = (avalId: string, value: number) => {
    if (!configuracion) return;
    
    setConfiguracion(prevConfig => {
      if (!prevConfig) return null;
      
      const newAvaliaciois = prevConfig.avaliaciois.map(aval => {
        if (aval.id === avalId) {
          return { ...aval, porcentaxeNota: value };
        }
        return aval;
      });
      
      return {
        ...prevConfig,
        avaliaciois: newAvaliaciois
      };
    });
  };

  // Manejar cambios en los porcentajes de pruebas
  const handleProbaPorcentaxeChange = (avalId: string, probaId: string, value: number) => {
    if (!configuracion) return;
    
    setConfiguracion(prevConfig => {
      if (!prevConfig) return null;
      
      const newAvaliaciois = prevConfig.avaliaciois.map(aval => {
        if (aval.id === avalId) {
          const newProbas = aval.probas.map(proba => {
            if (proba.id === probaId) {
              return { ...proba, porcentaxe: value };
            }
            return proba;
          });
          
          return { ...aval, probas: newProbas };
        }
        return aval;
      });
      
      return {
        ...prevConfig,
        avaliaciois: newAvaliaciois
      };
    });
  };

  // Manejar cambio en el nombre de una prueba
  const handleProbaNameChange = (avalId: string, probaId: string, value: string) => {
    if (!configuracion) return;
    
    setConfiguracion(prevConfig => {
      if (!prevConfig) return null;
      
      const newAvaliaciois = prevConfig.avaliaciois.map(aval => {
        if (aval.id === avalId) {
          const newProbas = aval.probas.map(proba => {
            if (proba.id === probaId) {
              return { ...proba, nome: value };
            }
            return proba;
          });
          
          return { ...aval, probas: newProbas };
        }
        return aval;
      });
      
      return {
        ...prevConfig,
        avaliaciois: newAvaliaciois
      };
    });
  };

  // Añadir una nueva prueba a una evaluación
  const handleAddProba = (avalId: string) => {
    if (!configuracion) return;
    
    setConfiguracion(prevConfig => {
      if (!prevConfig) return null;
      
      const newAvaliaciois = prevConfig.avaliaciois.map(aval => {
        if (aval.id === avalId) {
          // Crear nueva prueba
          const newProba: Proba = {
            id: `proba_${new Date().getTime()}`,
            nome: 'Nova proba',
            porcentaxe: 10, // Valor predeterminado
            descripcion: 'Descrición da proba'
          };
          
          // Añadir la nueva prueba
          return { 
            ...aval, 
            probas: [...aval.probas, newProba]
          };
        }
        return aval;
      });
      
      return {
        ...prevConfig,
        avaliaciois: newAvaliaciois
      };
    });
  };

  // Eliminar una prueba
  const handleDeleteProba = (avalId: string, probaId: string) => {
    if (!configuracion) return;
    
    setConfiguracion(prevConfig => {
      if (!prevConfig) return null;
      
      const newAvaliaciois = prevConfig.avaliaciois.map(aval => {
        if (aval.id === avalId) {
          // Filtrar para eliminar la prueba
          const newProbas = aval.probas.filter(proba => proba.id !== probaId);
          
          return { ...aval, probas: newProbas };
        }
        return aval;
      });
      
      return {
        ...prevConfig,
        avaliaciois: newAvaliaciois
      };
    });
  };

  // Guardar la configuración
  const handleSaveConfiguracion = async () => {
    if (!configuracion || !asignatura) return;
    
    try {
      // Validar que los porcentajes de evaluación sumen 100%
      const totalPorcentaxeAval = configuracion.avaliaciois.reduce(
        (sum, aval) => sum + aval.porcentaxeNota, 
        0
      );
      
      if (Math.round(totalPorcentaxeAval) !== 100) {
        setError(`A suma dos porcentaxes das avaliacións debe ser 100%. Actualmente é ${totalPorcentaxeAval}%`);
        return;
      }
      
      // Validar que los porcentajes de cada prueba sumen 100%
      for (const aval of configuracion.avaliaciois) {
        const totalPorcentaxeProbas = aval.probas.reduce(
          (sum, proba) => sum + proba.porcentaxe, 
          0
        );
        
        if (Math.round(totalPorcentaxeProbas) !== 100) {
          setError(`Na avaliación ${aval.numero}, a suma dos porcentaxes das probas debe ser 100%. Actualmente é ${totalPorcentaxeProbas}%`);
          return;
        }
      }
      
      // Guardar la configuración actualizando la asignatura
      const asignaturaActualizada = {
        ...asignatura,
        configuracionAvaliacion: configuracion,
        updatedAt: new Date().toISOString()
      };
      
      await dataManager.updateAsignatura(asignaturaActualizada);
      
      setSuccessMessage('Configuración gardada con éxito');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Error al guardar configuración:', err);
      setError('Ocorreu un erro ao gardar a configuración');
    }
  };

  if (loading) {
    return <div className="text-center py-8">Cargando configuración da asignatura...</div>;
  }

  if (!asignatura || !configuracion) {
    return (
      <div className="bg-red-50 p-6 rounded-lg shadow-md text-center">
        <p className="text-red-700">{error || 'Non se puido cargar a configuración'}</p>
        <button 
          onClick={() => navigate('/asignaturas')}
          className="mt-4 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors"
        >
          Volver á lista de asignaturas
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-blue-800">
          conf. Avaliacion: {asignatura.nome}
        </h1>
        <button
          onClick={() => navigate('/asignaturas')}
          className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-lg transition-colors"
        >
          Volver
        </button>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 text-red-700">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6 text-green-700">
            {successMessage}
          </div>
        )}

        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Distribución das avaliacións</h2>
          <p className="text-sm text-gray-600 mb-4">
            Define o porcentaxe que cada avaliación aporta á nota final. A suma debe ser 100%.
          </p>

          {/* Porcentajes de evaluaciones */}
          <div className="bg-gray-50 p-4 rounded-md">
            <div className="grid grid-cols-3 gap-4">
              {configuracion.avaliaciois.map(aval => (
                <div key={aval.id} className="flex flex-col">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {`${aval.numero}ª Avaliación (%)`}
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={aval.porcentaxeNota}
                    onChange={(e) => handlePorcentaxeChange(aval.id, Number(e.target.value))}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              ))}
            </div>
            <div className="mt-2 text-sm text-gray-600">
              Total: {configuracion.avaliaciois.reduce((sum, aval) => sum + aval.porcentaxeNota, 0)}%
            </div>
          </div>
        </div>

        {/* Configuración de pruebas por evaluación */}
        <div className="space-y-8 mt-8">
          <h2 className="text-lg font-semibold border-b pb-2">Configuración de probas por avaliación</h2>
          
          {configuracion.avaliaciois.map(aval => (
            <div key={aval.id} className="bg-gray-50 p-4 rounded-md">
              <h3 className="text-md font-semibold mb-3">
                {`${aval.numero}ª Avaliación (${aval.porcentaxeNota}% da nota final)`}
              </h3>
              
              <div className="mb-2 text-sm text-gray-600">
                Define as probas e o seu peso na avaliación. A suma debe ser 100%.
              </div>
              
              <div className="space-y-4">
                {aval.probas.map(proba => (
                  <div key={proba.id} className="grid grid-cols-6 gap-2 items-center">
                    <div className="col-span-3">
                      <input
                        type="text"
                        value={proba.nome}
                        onChange={(e) => handleProbaNameChange(aval.id, proba.id, e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Nome da proba"
                      />
                    </div>
                    <div className="col-span-2">
                      <div className="flex items-center">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={proba.porcentaxe}
                          onChange={(e) => handleProbaPorcentaxeChange(aval.id, proba.id, Number(e.target.value))}
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        />
                        <span className="ml-2">%</span>
                      </div>
                    </div>
                    <div className="col-span-1 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteProba(aval.id, proba.id)}
                        className="text-red-600 hover:text-red-800"
                        disabled={aval.probas.length <= 1}
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))}
                
                <div className="mt-2 text-sm text-gray-600">
                  Total: {aval.probas.reduce((sum, proba) => sum + proba.porcentaxe, 0)}%
                </div>
                
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={() => handleAddProba(aval.id)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    + Engadir proba
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8">
          <button
            onClick={handleSaveConfiguracion}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Gardar configuración
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfiguracionAvaliacionPage;
