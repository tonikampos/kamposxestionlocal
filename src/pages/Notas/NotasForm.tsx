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
      
      // Gardar directamente as notas completas tal como están no estado
      // Ahora el updateNotaAlumno calculará las notas finales de evaluaciones y curso
      await dataManager.updateNotaAlumno(notaAlumno);
      
      // Recargar las notas para obtener los cálculos actualizados
      const notaActualizada = await dataManager.getNotaAlumno(alumno.id, asignaturaId);
      
      // Comprobar si se han perdido datos
      if (!notaActualizada) {
        console.error("¡ERROR! No se encontraron las notas después de guardar");
        throw new Error("Non se atoparon as notas despois de gardar");
      }
      
      console.log("Notas actualizadas:", notaActualizada);
      console.log("Nota final calculada:", notaActualizada.notaFinal);
      
      // Actualizar el estado con las notas actualizadas y calculadas
      setNotaAlumno(notaActualizada);
      
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
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold">
            Notas de {alumno.nome} {alumno.apelidos}
          </h2>
          <p className="text-gray-600 mt-1">
            {asignatura.nome} - {asignatura.nivel} {asignatura.curso}º
          </p>
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
                            const newValue = e.target.value === '' ? 0 : parseFloat(e.target.value);
                            handleNotaChange(
                              activeAvaliacion.id, 
                              proba.id, 
                              newValue
                            );
                          }}
                          className="border border-gray-300 rounded px-2 py-1 w-20 text-center mx-auto block"
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
