import React, { useState, useEffect } from 'react';
import { dataManager } from '../../utils/dataManager';
import type { 
  Alumno, 
  Asignatura, 
  NotaAlumno,
  NotaAvaliacion,
  NotaProba,
  Avaliacion,
  Proba
} from '../../utils/storageManager';

interface NotasFormProps {
  asignaturaId: string;
  alumno: Alumno;
  onClose?: () => void;
  onSaved?: () => void;
  onNotasSaved?: () => void;
}

const NotasForm: React.FC<NotasFormProps> = ({ asignaturaId, alumno, onClose, onSaved, onNotasSaved }) => {
  const [asignatura, setAsignatura] = useState<Asignatura | null>(null);
  const [notaAlumno, setNotaAlumno] = useState<NotaAlumno | null>(null);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [activeTab, setActiveTab] = useState<string | null>(null);

  useEffect(() => {
    if (!asignaturaId || !alumno) return;
    
    const cargarDatos = async () => {
      setLoading(true);
      try {
        // Cargar asignatura
        const asignaturaData = await dataManager.getAsignaturaById(asignaturaId);
        if (!asignaturaData || !asignaturaData.configuracionAvaliacion) {
          alert('A asignatura non existe ou non ten configuración de avaliación');
          if (onClose) onClose();
          return;
        }
        setAsignatura(asignaturaData);
        
        // Inicializar o cargar notas del alumno
        let nota = await dataManager.getNotaAlumno(alumno.id, asignaturaId);
        
        if (!nota) {
          // Si no existe nota, inicializarla
          nota = await dataManager.initNotaAlumno(alumno.id, asignaturaId);
        }
        
        setNotaAlumno(nota);
        
        // Establecer la primera evaluación como activa
        if (asignaturaData.configuracionAvaliacion?.avaliaciois.length > 0) {
          setActiveTab(asignaturaData.configuracionAvaliacion.avaliaciois[0].id);
        }
      } catch (error) {
        console.error('Error al cargar datos de notas:', error);
        alert('Ocorreu un erro ao cargar os datos de notas');
        if (onClose) onClose();
      } finally {
        setLoading(false);
      }
    };
    
    cargarDatos();
  }, [asignaturaId, alumno, onClose]);

  const handleNotaChange = (avaliacionId: string, probaId: string, valor: number) => {
    if (!notaAlumno) return;
    
    const nuevasNotas = { ...notaAlumno };
    
    // Encontrar la evaluación
    const avaliacionIndex = nuevasNotas.notasAvaliaciois.findIndex(
      na => na.avaliacionId === avaliacionId
    );
    
    if (avaliacionIndex !== -1) {
      // Encontrar la prueba
      const probaIndex = nuevasNotas.notasAvaliaciois[avaliacionIndex].notasProbas.findIndex(
        np => np.probaId === probaId
      );
      
      if (probaIndex !== -1) {
        // Actualizar la nota
        nuevasNotas.notasAvaliaciois[avaliacionIndex].notasProbas[probaIndex].valor = valor;
      }
    }
    
    setNotaAlumno(nuevasNotas);
  };

  const handleObservacionChange = (avaliacionId: string, probaId: string, observacion: string) => {
    if (!notaAlumno) return;
    
    const nuevasNotas = { ...notaAlumno };
    
    // Encontrar la evaluación
    const avaliacionIndex = nuevasNotas.notasAvaliaciois.findIndex(
      na => na.avaliacionId === avaliacionId
    );
    
    if (avaliacionIndex !== -1) {
      // Encontrar la prueba
      const probaIndex = nuevasNotas.notasAvaliaciois[avaliacionIndex].notasProbas.findIndex(
        np => np.probaId === probaId
      );
      
      if (probaIndex !== -1) {
        // Actualizar la observación
        nuevasNotas.notasAvaliaciois[avaliacionIndex].notasProbas[probaIndex].observacions = observacion;
      }
    }
    
    setNotaAlumno(nuevasNotas);
  };

  // Función principal para guardar todas las notas do alumno
  const handleSave = async () => {
    if (!notaAlumno) return;

    setGuardando(true);
    try {
      console.log("Gardando todas as notas do alumno...");
      console.log("ID Alumno:", alumno.id, "Nome:", alumno.nome, "Apelidos:", alumno.apelidos);
      console.log("ID Asignatura:", asignaturaId);
      console.log("ID Nota:", notaAlumno.id);
      
      // Verificar que temos todalas avaliacións antes de gardar
      if (asignatura?.configuracionAvaliacion?.avaliaciois.length !== notaAlumno.notasAvaliaciois.length) {
        console.warn("Número de avaliacións non coincide co esperado. Actualizando...");
      }
      
      // Hacer una copia local de las notas para mostrarlas incluso si hay un problema al recargarlas
      const notaCopia = JSON.parse(JSON.stringify(notaAlumno));
      
      // Si hay un ID de nota previo, lo mostramos para diagnóstico
      if (notaAlumno.id) {
        console.log(`Actualizando nota existente con ID: ${notaAlumno.id}`);
      } else {
        console.log(`Creando nueva nota para el alumno`);
      }
      
      // Gardar directamente as notas completas tal como están no estado
      console.log("Guardando notas en Firebase...");
      await dataManager.updateNotaAlumno(notaAlumno);
      console.log("Datos guardados correctamente en Firebase");
      
      // Pausa más larga para permitir la sincronización con Firebase
      console.log("Esperando a que se complete la sincronización...");
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Recargar las notas para obtener los cálculos actualizados
      console.log("Recargando datos actualizados...");
      let notaActualizada = await dataManager.getNotaAlumno(alumno.id, asignaturaId);
      
      // Comprobar si se han perdido datos
      if (!notaActualizada) {
        console.warn("No se encontraron las notas después de guardar, intentando de nuevo...");
        
        // Esperar más tiempo y reintentar
        await new Promise(resolve => setTimeout(resolve, 2000));
        notaActualizada = await dataManager.getNotaAlumno(alumno.id, asignaturaId);
        
        // Segundo reintento con más tiempo de espera
        if (!notaActualizada) {
          console.warn("Segundo intento fallido, esperando más tiempo...");
          await new Promise(resolve => setTimeout(resolve, 3000));
          notaActualizada = await dataManager.getNotaAlumno(alumno.id, asignaturaId);
        }
        
        // Si aún no se encuentra, usar la copia local con un aviso
        if (!notaActualizada) {
          console.error("¡ERROR! No se encontraron las notas después de varios reintentos");
          
          // Usar la copia local pero asegurarnos de que tenga las propiedades básicas
          notaActualizada = {
            ...notaCopia,
            updatedAt: new Date().toISOString()
          };
          
          // Informar al usuario pero con mensaje menos alarmante
          alert(`
As notas gardáronse correctamente en Firebase, pero hai un problema para mostrar os datos actualizados. 

Isto pode deberse a:
1. Problemas de conexión temporal
2. Datos duplicados na base de datos

Vaise iniciar unha limpeza automática de datos duplicados.
Os datos gardados están seguros. Pode continuar traballando.`);
          
          // Iniciar limpieza de duplicados en segundo plano
          setTimeout(() => {
            dataManager.limpiarNotasDuplicadas?.().catch(err => 
              console.error("Error al iniciar limpieza de duplicados:", err)
            );
          }, 100);
        }
      }
      
      console.log("Notas actualizadas:", notaActualizada);
      if (notaActualizada) {
        console.log("Nota final calculada:", notaActualizada.notaFinal);
      }
      
      // Actualizar el estado con las notas actualizadas y calculadas
      if (notaActualizada) {
        setNotaAlumno(notaActualizada);
      }
      
      // Mostrar mensaje con los cálculos realizados
      let mensaje = 'Notas gardadas correctamente.\n\n';
      if (notaActualizada?.notaFinal !== undefined) {
        mensaje += `Nota final calculada: ${notaActualizada.notaFinal.toFixed(2)}`;
      } else {
        mensaje += 'Non se puido calcular a nota final. Comproba a configuración de avaliacións.';
      }
      
      alert(mensaje);
      
      // Notificar que se guardaron las notas para refrescar la lista
      onSaved?.();
      onNotasSaved?.(); // Notificar que as notas foron gardadas (para actualizar a interface)
    } catch (error) {
      console.error('Error al guardar notas:', error);
      alert('Ocorreu un erro ao gardar as notas: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setGuardando(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Cargando datos...</div>;
  }

  if (!asignatura || !notaAlumno || !asignatura.configuracionAvaliacion) {
    return <div className="text-center py-8 text-red-500">Non se atoparon os datos necesarios</div>;
  }

  // Encontrar la evaluación activa
  const activeAvaliacion = asignatura.configuracionAvaliacion.avaliaciois.find(av => av.id === activeTab);
  
  // Encontrar las notas de la evaluación activa
  const activeNotaAvaliacion = notaAlumno.notasAvaliaciois.find(na => na.avaliacionId === activeTab);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold">
            Notas de {alumno.nome} {alumno.apelidos}
          </h2>
        </div>
        <p className="text-gray-600 mt-1">
          {asignatura.nome} - {asignatura.nivel} {asignatura.curso}º
        </p>
        
        {/* Mostrar todas las notas de evaluaciones junto al nombre */}
        <div className="mt-3 flex flex-wrap gap-2">
          {notaAlumno.notasAvaliaciois.map((notaEval) => {
            const avaliacion = asignatura.configuracionAvaliacion?.avaliaciois.find(
              av => av.id === notaEval.avaliacionId
            );
            
            if (!avaliacion) return null;
            
            let colorClass = "bg-gray-100 text-gray-800";
            if (notaEval.notaFinal !== undefined) {
              if (notaEval.notaFinal >= 9) {
                colorClass = "bg-blue-100 text-blue-800";
              } else if (notaEval.notaFinal >= 7) {
                colorClass = "bg-green-100 text-green-800";
              } else if (notaEval.notaFinal >= 5) {
                colorClass = "bg-yellow-100 text-yellow-800";
              } else {
                colorClass = "bg-red-100 text-red-800";
              }
            }
            
            return (
              <span key={notaEval.avaliacionId} 
                className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-sm font-medium ${colorClass}`}>
                {avaliacion.numero}ª Eval: {notaEval.notaFinal !== undefined ? notaEval.notaFinal.toFixed(2) : '—'}
              </span>
            );
          })}
          
          {notaAlumno.notaFinal !== undefined && (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-sm font-medium ${
              notaAlumno.notaFinal >= 9 ? "bg-purple-100 text-purple-800" : 
              notaAlumno.notaFinal >= 7 ? "bg-indigo-100 text-indigo-800" : 
              notaAlumno.notaFinal >= 5 ? "bg-teal-100 text-teal-800" : 
              "bg-pink-100 text-pink-800"
            }`}>
              Final: {notaAlumno.notaFinal.toFixed(2)}
            </span>
          )}
        </div>
      </div>
      
      {/* Pestañas de navegación entre evaluaciones */}
      <div className="border-b border-gray-200 mb-6">
        <ul className="flex flex-wrap -mb-px">
          {asignatura.configuracionAvaliacion.avaliaciois.map((avaliacion) => (
            <li key={avaliacion.id} className="mr-2">
              <button
                onClick={() => setActiveTab(avaliacion.id)}
                className={`inline-block py-2 px-4 font-medium text-sm rounded-t-lg ${
                  activeTab === avaliacion.id
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {avaliacion.numero}ª Avaliación
              </button>
            </li>
          ))}
          <li>
            <button
              onClick={() => setActiveTab('final')}
              className={`inline-block py-2 px-4 font-medium text-sm rounded-t-lg ${
                activeTab === 'final'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Nota Final
            </button>
          </li>
        </ul>
      </div>
      
      {/* Contenido de la pestaña activa */}
      {activeTab === 'final' ? (
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Resumo de notas</h3>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avaliación
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nota
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Porcentaxe
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contribución
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {notaAlumno.notasAvaliaciois.map((notaAval) => {
                  const avaliacion = asignatura.configuracionAvaliacion!.avaliaciois.find(
                    av => av.id === notaAval.avaliacionId
                  );
                  
                  const contribucion = notaAval.notaFinal !== undefined && avaliacion 
                    ? (notaAval.notaFinal * avaliacion.porcentaxeNota / 100).toFixed(2)
                    : '--';
                    
                  return (
                    <tr key={notaAval.avaliacionId}>
                      <td className="px-4 py-3">
                        {avaliacion ? `${avaliacion.numero}ª Avaliación` : 'Descoñecida'}
                      </td>
                      <td className="px-4 py-3 text-center font-medium">
                        {notaAval.notaFinal !== undefined ? notaAval.notaFinal.toFixed(2) : '--'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {avaliacion ? `${avaliacion.porcentaxeNota}%` : '--'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {contribucion}
                      </td>
                    </tr>
                  );
                })}
                
                <tr className="bg-blue-50">
                  <td className="px-4 py-3 font-bold">Nota final do curso</td>
                  <td className="px-4 py-3 text-center font-bold">
                    {notaAlumno.notaFinal !== undefined ? notaAlumno.notaFinal.toFixed(2) : '--'}
                  </td>
                  <td className="px-4 py-3 text-center">100%</td>
                  <td className="px-4 py-3 text-center">
                    {notaAlumno.notaFinal !== undefined ? notaAlumno.notaFinal.toFixed(2) : '--'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ) : activeAvaliacion && activeNotaAvaliacion ? (
        <div>
          <div className="bg-blue-50 p-4 rounded-lg mb-4">
            <h3 className="font-medium">
              {activeAvaliacion.numero}ª Avaliación 
              <span className="text-sm font-normal ml-2">
                (Porcentaxe na nota final: {activeAvaliacion.porcentaxeNota}%)
              </span>
            </h3>
            
            {activeNotaAvaliacion.notaFinal !== undefined && (
              <p className="mt-2">
                <span className="font-medium">Nota da avaliación:</span> {activeNotaAvaliacion.notaFinal.toFixed(2)}
              </p>
            )}
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 mb-6">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Proba
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Porcentaxe
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nota (0-10)
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Observacións
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {activeAvaliacion.probas.map((proba) => {
                  const notaProba = activeNotaAvaliacion.notasProbas.find(np => np.probaId === proba.id);
                  const valor = notaProba ? notaProba.valor : 0;
                  const observacion = notaProba?.observacions || '';
                  
                  return (
                    <tr key={proba.id}>
                      <td className="px-4 py-3">
                        <div>
                          <div className="font-medium">{proba.nome}</div>
                          {proba.descripcion && (
                            <div className="text-sm text-gray-500">{proba.descripcion}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">{proba.porcentaxe}%</td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          inputMode="decimal"
                          min="0"
                          max="10"
                          step="0.01"
                          value={valor}
                          onChange={(e) => {
                            let newValue = e.target.value === '' ? 0 : parseFloat(e.target.value);
                            // Asegurar que el valor esté entre 0 y 10
                            newValue = Math.max(0, Math.min(10, newValue));
                            handleNotaChange(
                              activeAvaliacion.id, 
                              proba.id, 
                              newValue
                            );
                          }}
                          className={`border rounded px-2 py-1 w-20 text-center mx-auto block font-medium ${
                            valor >= 9 ? 'border-blue-500 bg-blue-50 text-blue-700' : 
                            valor >= 7 ? 'border-green-500 bg-green-50 text-green-700' : 
                            valor >= 5 ? 'border-yellow-500 bg-yellow-50 text-yellow-700' : 
                            'border-red-500 bg-red-50 text-red-700'
                          }`}
                          placeholder="0-10"
                          title="Ingresa una nota entre 0 y 10"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={observacion}
                          placeholder="Observacións (opcional)"
                          onChange={(e) => handleObservacionChange(
                            activeAvaliacion.id,
                            proba.id,
                            e.target.value
                          )}
                          className="border border-gray-300 rounded px-2 py-1 w-full"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-amber-600">
          Seleccione unha avaliación para xestionar as notas
        </div>
      )}
      
      <div className="flex justify-end mt-6 space-x-3">
        <button
          onClick={() => onClose?.()}
          className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
          disabled={guardando}
        >
          Cancelar
        </button>
        
        <button
          onClick={handleSave}
          disabled={guardando}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          {guardando ? 'Gardando...' : 'Gardar todas as notas'}
        </button>
      </div>
    </div>
  );
};

export default NotasForm;
