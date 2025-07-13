import React, { useState, useEffect } from 'react';
import { dataManager } from '../../utils/dataManager';
import { ErrorHandler } from '../../utils/errorHandler';
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

// Función para calcular la nota final de una evaluación basada en las pruebas y sus porcentajes
const calcularNotaEvaluacion = (notaAvaliacion: NotaAvaliacion, avaliacion: Avaliacion): number => {
  if (!notaAvaliacion?.notasProbas || !avaliacion?.probas) {
    return 0;
  }

  let sumaNotasPonderadas = 0;
  let sumaPorcentajes = 0;

  // Para cada nota de prueba, buscar su configuración correspondiente
  notaAvaliacion.notasProbas.forEach(notaProba => {
    const configProba = avaliacion.probas.find(p => p.id === notaProba.probaId);
    if (configProba && typeof notaProba.valor === 'number' && !isNaN(notaProba.valor)) {
      sumaNotasPonderadas += notaProba.valor * (configProba.porcentaxe / 100);
      sumaPorcentajes += configProba.porcentaxe;
    }
  });

  // Si no hay porcentajes válidos, devolver 0
  if (sumaPorcentajes === 0) {
    return 0;
  }

  // Ajustar si los porcentajes no suman 100% (normalizar)
  if (sumaPorcentajes !== 100) {
    sumaNotasPonderadas = (sumaNotasPonderadas * 100) / sumaPorcentajes;
  }

  return Math.round(sumaNotasPonderadas * 100) / 100; // Redondear a 2 decimales
};

// Función para calcular la nota final de la asignatura basada en las evaluaciones y sus porcentajes
const calcularNotaFinalAsignatura = (notaAlumno: NotaAlumno, asignatura: Asignatura): number => {
  if (!notaAlumno?.notasAvaliaciois || !asignatura?.configuracionAvaliacion?.avaliaciois) {
    return 0;
  }

  let sumaNotasPonderadas = 0;
  let sumaPorcentajes = 0;

  // Para cada evaluación, calcular su nota y aplicar el porcentaje correspondiente
  notaAlumno.notasAvaliaciois.forEach(notaEval => {
    const configEval = asignatura.configuracionAvaliacion!.avaliaciois.find(e => e.id === notaEval.avaliacionId);
    if (configEval) {
      const notaEvaluacion = calcularNotaEvaluacion(notaEval, configEval);
      if (!isNaN(notaEvaluacion)) {
        sumaNotasPonderadas += notaEvaluacion * (configEval.porcentaxeNota / 100);
        sumaPorcentajes += configEval.porcentaxeNota;
      }
    }
  });

  // Si no hay porcentajes válidos, devolver 0
  if (sumaPorcentajes === 0) {
    return 0;
  }

  // Ajustar si los porcentajes no suman 100% (normalizar)
  if (sumaPorcentajes !== 100) {
    sumaNotasPonderadas = (sumaNotasPonderadas * 100) / sumaPorcentajes;
  }

  return Math.round(sumaNotasPonderadas * 100) / 100; // Redondear a 2 decimales
};

// Función para recalcular todas las notas de un alumno
const recalcularTodasLasNotas = (notaAlumno: NotaAlumno, asignatura: Asignatura): NotaAlumno => {
  if (!notaAlumno?.notasAvaliaciois || !asignatura?.configuracionAvaliacion?.avaliaciois) {
    return notaAlumno;
  }

  const notasActualizadas = { ...notaAlumno };
  let huboCambios = false;

  // Recalcular la nota de cada evaluación
  notasActualizadas.notasAvaliaciois = notasActualizadas.notasAvaliaciois.map(notaEval => {
    const configEval = asignatura.configuracionAvaliacion!.avaliaciois.find(e => e.id === notaEval.avaliacionId);
    if (configEval) {
      const notaEvaluacionCalculada = calcularNotaEvaluacion(notaEval, configEval);
      if (notaEval.notaFinal !== notaEvaluacionCalculada) {
        huboCambios = true;
        return { ...notaEval, notaFinal: notaEvaluacionCalculada };
      }
    }
    return notaEval;
  });

  // Recalcular la nota final de la asignatura
  const notaFinalCalculada = calcularNotaFinalAsignatura(notasActualizadas, asignatura);
  if (notasActualizadas.notaFinal !== notaFinalCalculada) {
    huboCambios = true;
    notasActualizadas.notaFinal = notaFinalCalculada;
  }

  return huboCambios ? notasActualizadas : notaAlumno;
};

const NotasForm: React.FC<NotasFormProps> = ({ asignaturaId, alumno, onClose, onSaved, onNotasSaved }) => {
  const [asignatura, setAsignatura] = useState<Asignatura | null>(null);
  const [notaAlumno, setNotaAlumno] = useState<NotaAlumno | null>(null);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

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
        
        // Recalcular todas las notas después de cargar
        if (nota && asignaturaData?.configuracionAvaliacion) {
          const notasRecalculadas = recalcularTodasLasNotas(nota, asignaturaData);
          if (notasRecalculadas !== nota) {
            setNotaAlumno(notasRecalculadas);
          }
        }
        
        // Establecer la primera evaluación como activa
        if (asignaturaData.configuracionAvaliacion?.avaliaciois.length > 0) {
          setActiveTab(asignaturaData.configuracionAvaliacion.avaliaciois[0].id);
        }
      } catch (error) {
        ErrorHandler.logError('NotasForm cargarDatos', error, { alumnoId: alumno.id, asignaturaId });
        console.error('Error al cargar datos de notas:', error);
        const message = error instanceof Error ? error.message : 'Error desconocido';
        alert(`Ocorreu un erro ao cargar os datos de notas: ${message}`);
        if (onClose) onClose();
      } finally {
        setLoading(false);
      }
    };
    
    cargarDatos();
  }, [asignaturaId, alumno, onClose]);

  const handleNotaChange = (avaliacionId: string, probaId: string, valor: number) => {
    if (!notaAlumno || !asignatura) return;
    
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
        
        // Recalcular automáticamente la nota de esta evaluación
        const configEval = asignatura.configuracionAvaliacion?.avaliaciois.find(e => e.id === avaliacionId);
        if (configEval) {
          const notaEvaluacionCalculada = calcularNotaEvaluacion(nuevasNotas.notasAvaliaciois[avaliacionIndex], configEval);
          nuevasNotas.notasAvaliaciois[avaliacionIndex].notaFinal = notaEvaluacionCalculada;
        }
        
        // Recalcular automáticamente la nota final de la asignatura
        const notaFinalCalculada = calcularNotaFinalAsignatura(nuevasNotas, asignatura);
        nuevasNotas.notaFinal = notaFinalCalculada;
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
    if (!notaAlumno) {
      console.error("Error: No hay datos de notas para guardar");
      alert("No hay datos de notas para guardar");
      return;
    }

    setGuardando(true);
    try {
      // Validar que la estructura básica está presente
      if (!notaAlumno.alumnoId || !notaAlumno.asignaturaId) {
        console.error("Error: Faltan datos esenciales (alumnoId o asignaturaId)");
        alert("Error con los datos de notas. Por favor, recarga la página e inténtalo de novo.");
        setGuardando(false);
        return;
      }
      
      // Hacer una copia profunda de las notas actuales de forma segura
      let notaCopia: NotaAlumno;
      try {
        notaCopia = JSON.parse(JSON.stringify(notaAlumno)) as NotaAlumno;
        
        // Asegurar que todas las propiedades necesarias estén presentes
        if (!Array.isArray(notaCopia.notasAvaliaciois)) {
          console.warn("Inicializando array de notasAvaliaciois");
          notaCopia.notasAvaliaciois = [];
        }
        
        // Asegurar que la nota tiene ID
        if (!notaCopia.id) {
          console.warn("La nota no tiene ID, generando uno");
          notaCopia.id = `${alumno.id}-${asignaturaId}`;
        }
        
      } catch (parseError) {
        console.error("Error al copiar las notas:", parseError);
        alert("Error al preparar los datos. Por favor, inténtalo de nuevo.");
        setGuardando(false);
        return;
      }
      
      console.log("Guardando notas:", {
        alumnoId: notaCopia.alumnoId,
        asignaturaId: notaCopia.asignaturaId,
        id: notaCopia.id,
        evaluaciones: notaCopia.notasAvaliaciois?.length || 0
      });
      
      // Validar y limpiar datos antes de guardar
      if (notaCopia.notaFinal === undefined) {
        delete (notaCopia as any).notaFinal;
      }
      
      // Validar que las evaluaciones están bien formadas
      if (notaCopia.notasAvaliaciois) {
        notaCopia.notasAvaliaciois = notaCopia.notasAvaliaciois.map(aval => ({
          ...aval,
          notasProbas: aval.notasProbas.map(proba => ({
            probaId: proba.probaId,
            valor: proba.valor || 0,
            observacions: proba.observacions || ''
          }))
        }));
      }
      
      try {
        // Guardar las notas en Firebase directamente - versión simplificada
        await dataManager.updateNotaAlumno(notaCopia);
        console.log("Notas guardadas correctamente en Firebase");
      } catch (saveError) {
        console.error("Error al guardar notas en Firebase:", saveError);
        alert("Error al guardar las notas. Por favor, inténtalo de nuevo.");
        setGuardando(false);
        return;
      }
      
      // Breve pausa para permitir sincronización
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Verificar que las notas se guardaron correctamente - enfoque simple
      try {
        console.log("Verificando datos guardados...");
        const notaActualizada = await dataManager.getNotaAlumno(alumno.id, asignaturaId);
        
        if (notaActualizada) {
          // Actualizar el estado con los datos verificados
          console.log("Verificación exitosa, actualizando estado local");
          setNotaAlumno(notaActualizada);
          console.log("Notas recargadas correctamente después del guardado.");
        } else {
          // Si no se pudieron recuperar, mantenemos la copia local
          console.warn("No se pudieron verificar las notas, manteniendo estado local");
        }
      } catch (verifyError) {
        console.error("Error al verificar notas guardadas:", verifyError);
        // Mantenemos la copia local si hay error en la verificación
      }
      
      // Mensaje simple de confirmación
      alert('Notas gardadas correctamente');
      
      // Notificar que se guardaron las notas para refrescar la lista
      if (onSaved) onSaved();
      if (onNotasSaved) onNotasSaved();
    } catch (error) {
      ErrorHandler.logError('NotasForm guardar', error, { alumnoId: alumno.id, asignaturaId });
      console.error('Error al guardar notas:', error);
      const message = error instanceof Error ? error.message : 'Error desconocido';
      alert(`Ocorreu un erro ao gardar as notas: ${message}`);
    } finally {
      setGuardando(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Cargando datos...</div>;
  }

  if (!asignatura || !asignatura.configuracionAvaliacion) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500 mb-2">Non se atoparon os datos da asignatura ou a configuración de avaliación</p>
        <button 
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          onClick={onClose}
        >
          Volver
        </button>
      </div>
    );
  }

  if (!notaAlumno) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500 mb-2">Non se atoparon os datos de notas para este alumno</p>
        <button 
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          onClick={() => {
            try {
              // Intentar inicializar las notas
              dataManager.initNotaAlumno(alumno.id, asignaturaId)
                .then(nota => {
                  setNotaAlumno(nota);
                })
                .catch(err => {
                  console.error("Error al inicializar notas:", err);
                });
            } catch (error) {
              console.error("Error general al inicializar notas:", error);
            }
          }}
        >
          Inicializar notas
        </button>
        <button 
          className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded ml-2"
          onClick={onClose}
        >
          Volver
        </button>
      </div>
    );
  }

  // Encontrar la evaluación activa
  const activeAvaliacion = asignatura.configuracionAvaliacion.avaliaciois.find(av => av.id === activeTab);
  
  // Función para inicializar la estructura de notas (fuera de useEffect para evitar problemas)
  const inicializarEstructuraNotas = () => {
    try {
      if (!asignatura || !asignatura.configuracionAvaliacion || !notaAlumno) {
        console.log("No se puede inicializar: faltan datos necesarios");
        return;
      }
      
      console.log("Verificando estructura de notas...");
      
      // Copia profunda para no modificar el estado directamente
      let notasActualizadas: NotaAlumno;
      try {
        notasActualizadas = JSON.parse(JSON.stringify(notaAlumno));
        // Asegurar que la propiedad notasAvaliaciois existe y es un array
        if (!Array.isArray(notasActualizadas.notasAvaliaciois)) {
          console.log("Inicializando array de notasAvaliaciois porque no existía o no era un array");
          notasActualizadas.notasAvaliaciois = [];
        }
      } catch (error) {
        console.error("Error al clonar objeto de notas:", error);
        // Si falla la copia, crear un objeto nuevo con los datos esenciales
        notasActualizadas = {
          id: notaAlumno.id || `${alumno.id}-${asignaturaId}`,
          alumnoId: alumno.id,
          asignaturaId: asignaturaId,
          notasAvaliaciois: [],
          createdAt: notaAlumno.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      }
      
      let notasModificadas = false;
      
      // Verificar si faltan evaluaciones
      const evaluacionesExistentesMap = new Map();
      notasActualizadas.notasAvaliaciois.forEach((na: any) => {
        evaluacionesExistentesMap.set(na.avaliacionId, na);
      });
      
      // Crear las evaluaciones que faltan
      asignatura.configuracionAvaliacion.avaliaciois.forEach(avaliacion => {
        if (!evaluacionesExistentesMap.has(avaliacion.id)) {
          console.log(`Añadiendo evaluación: ${avaliacion.id} (${avaliacion.numero}ª Evaluación)`);
          notasModificadas = true;
          
          // Crear evaluación con sus pruebas inicializadas
          const notasProbas = avaliacion.probas.map(proba => ({
            probaId: proba.id,
            valor: 0,
            observacions: ''
          }));
          
          notasActualizadas.notasAvaliaciois.push({
            avaliacionId: avaliacion.id,
            notasProbas
          });
        }
      });
      
      // Verificar que cada evaluación tenga todas sus pruebas
      notasActualizadas.notasAvaliaciois.forEach((notaAval: any) => {
        const avaliacion = asignatura.configuracionAvaliacion?.avaliaciois.find(
          av => av.id === notaAval.avaliacionId
        );
        
        if (avaliacion) {
          // Crear un mapa para acceso rápido a las pruebas existentes
          const pruebasExistentesMap = new Map();
          notaAval.notasProbas.forEach((np: any) => {
            pruebasExistentesMap.set(np.probaId, np);
          });
          
          // Verificar que estén todas las pruebas
          avaliacion.probas.forEach(proba => {
            if (!pruebasExistentesMap.has(proba.id)) {
              console.log(`Añadiendo prueba en evaluación ${avaliacion.id}: ${proba.id}`);
              notasModificadas = true;
              
              notaAval.notasProbas.push({
                probaId: proba.id,
                valor: 0,
                observacions: ''
              });
            }
          });
        }
      });
      
      // Si se han añadido evaluaciones o pruebas, actualizar el estado
      if (notasModificadas) {
        console.log("Actualizando estructura de notas...");
        setNotaAlumno(notasActualizadas);
        
        // Guardar en Firebase de forma segura - versión mejorada con validación
      try {
        // Asegurarse que la estructura es válida antes de guardar
        if (!Array.isArray(notasActualizadas.notasAvaliaciois)) {
          console.error("La estructura de notas no es válida");
          return;
        }
        
        // Asegurarse de que la nota tiene un ID
        if (!notasActualizadas.id) {
          console.warn("La nota no tiene ID al intentar actualizarla");
          notasActualizadas.id = notaAlumno.id || `${alumno.id}-${asignaturaId}`;
        }
        
        dataManager.updateNotaAlumno(notasActualizadas)
          .then(() => console.log("Estructura actualizada guardada correctamente"))
          .catch(err => console.error("Error al guardar estructura actualizada:", err));
      } catch (saveError) {
        console.error("Error al preparar datos para guardar:", saveError);
      }
      }
    } catch (error) {
      console.error("Error al inicializar estructura de notas:", error);
    }
  };
  
  // Encontrar las notas de la evaluación activa con protección contra errores
  const activeNotaAvaliacion = notaAlumno && 
    Array.isArray(notaAlumno.notasAvaliaciois) ? 
    notaAlumno.notasAvaliaciois.find((na: any) => na?.avaliacionId === activeTab) : 
    undefined;

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
          {Array.isArray(notaAlumno?.notasAvaliaciois) ? (
            notaAlumno.notasAvaliaciois.map((notaEval) => {
              if (!notaEval) return null;
              const avaliacion = asignatura?.configuracionAvaliacion?.avaliaciois?.find?.(
                av => av.id === notaEval?.avaliacionId
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
            })
          ) : (
            <span className="text-gray-500">No hay evaluaciones disponibles</span>
          )}
          
          {notaAlumno?.notaFinal !== undefined && (
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
          {asignatura.configuracionAvaliacion.avaliaciois.map((avaliacion) => {
            // Buscar la nota de esta evaluación
            const notaEval = notaAlumno?.notasAvaliaciois?.find(na => na.avaliacionId === avaliacion.id);
            const notaEvaluacion = notaEval?.notaFinal;
            
            return (
              <li key={avaliacion.id} className="mr-2">
                <button
                  onClick={() => setActiveTab(avaliacion.id)}
                  className={`inline-block py-2 px-4 font-medium text-sm rounded-t-lg ${
                    activeTab === avaliacion.id
                      ? 'border-b-2 border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <div className="flex flex-col items-center">
                    <span>{avaliacion.numero}ª Avaliación</span>
                    <span className="text-xs">
                      {notaEvaluacion !== undefined ? `${notaEvaluacion.toFixed(2)}` : '—'} 
                      <span className="text-gray-400"> ({avaliacion.porcentaxeNota}%)</span>
                    </span>
                  </div>
                </button>
              </li>
            );
          })}
          <li>
            <button
              onClick={() => setActiveTab('final')}
              className={`inline-block py-2 px-4 font-medium text-sm rounded-t-lg ${
                activeTab === 'final'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex flex-col items-center">
                <span>Resumo Final</span>
                <span className="text-xs">
                  {notaAlumno?.notaFinal !== undefined ? `${notaAlumno.notaFinal.toFixed(2)}` : '—'}
                </span>
              </div>
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
                {Array.isArray(notaAlumno?.notasAvaliaciois) && notaAlumno.notasAvaliaciois.map((notaAval) => {
                  if (!notaAval) return null;
                  const avaliacion = asignatura?.configuracionAvaliacion?.avaliaciois?.find?.(
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
      ) : (activeAvaliacion && activeNotaAvaliacion) ? (
        <div>
          <div className="bg-blue-50 p-4 rounded-lg mb-4">
            <h3 className="font-medium">
              {activeAvaliacion?.numero || '?'}ª Avaliación 
              <span className="text-sm font-normal ml-2">
                (Porcentaxe na nota final: {activeAvaliacion?.porcentaxeNota || 0}%)
              </span>
            </h3>
            
            {activeNotaAvaliacion?.notaFinal !== undefined && (
              <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="font-medium">Nota da avaliación:</span> 
                  <span className={`ml-2 font-bold text-lg ${
                    activeNotaAvaliacion.notaFinal >= 9 ? 'text-blue-600' : 
                    activeNotaAvaliacion.notaFinal >= 7 ? 'text-green-600' : 
                    activeNotaAvaliacion.notaFinal >= 5 ? 'text-yellow-600' : 
                    'text-red-600'
                  }`}>
                    {activeNotaAvaliacion.notaFinal.toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Contribución á nota final:</span>
                  <span className="ml-2 font-bold text-lg text-purple-600">
                    {((activeNotaAvaliacion.notaFinal * (activeAvaliacion?.porcentaxeNota || 0)) / 100).toFixed(2)}
                  </span>
                </div>
              </div>
            )}
            
            {/* Mostrar cálculo detallado */}
            {activeAvaliacion?.probas && activeNotaAvaliacion?.notasProbas && (
              <div className="mt-3 pt-3 border-t border-blue-200">
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Cálculo: </span>
                  {activeAvaliacion.probas.map((proba, index) => {
                    const notaProba = activeNotaAvaliacion.notasProbas.find(np => np.probaId === proba.id);
                    const valor = notaProba?.valor || 0;
                    const contribucion = (valor * proba.porcentaxe) / 100;
                    return (
                      <span key={proba.id}>
                        {index > 0 && ' + '}
                        <span className="text-gray-800">{valor.toFixed(2)}</span>
                        <span className="text-gray-500">×{proba.porcentaxe}%</span>
                        <span className="text-gray-400"> ({contribucion.toFixed(2)})</span>
                      </span>
                    );
                  })}
                  <span className="ml-2 font-medium">= {activeNotaAvaliacion.notaFinal?.toFixed(2) || '0.00'}</span>
                </div>
              </div>
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
                {activeAvaliacion?.probas?.map((proba) => {
                  if (!proba) return null;
                  // Si no existe la estructura de evaluación, crear un valor por defecto
                  const notasProbas = Array.isArray(activeNotaAvaliacion?.notasProbas) ? activeNotaAvaliacion.notasProbas : [];
                  const notaProba = notasProbas.find(np => np?.probaId === proba.id);
                  const valor = (notaProba && typeof notaProba.valor === 'number') ? notaProba.valor : 0;
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
                        <div className="flex flex-col items-center">
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
                            className={`border rounded px-2 py-1 w-20 text-center font-medium ${
                              valor >= 9 ? 'border-blue-500 bg-blue-50 text-blue-700' : 
                              valor >= 7 ? 'border-green-500 bg-green-50 text-green-700' : 
                              valor >= 5 ? 'border-yellow-500 bg-yellow-50 text-yellow-700' : 
                              'border-red-500 bg-red-50 text-red-700'
                            }`}
                            placeholder="0-10"
                            title="Ingresa una nota entre 0 y 10"
                          />
                          <div className="text-xs text-gray-500 mt-1">
                            Contribución: {((valor * proba.porcentaxe) / 100).toFixed(2)}
                          </div>
                        </div>
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
      
      <div className="flex justify-between items-center mt-6">
        {/* Botón de diagnóstico */}
        <button
          onClick={() => setShowDiagnostics(!showDiagnostics)}
          className="px-3 py-1 text-xs bg-gray-200 text-gray-600 rounded hover:bg-gray-300"
          type="button"
        >
          {showDiagnostics ? 'Ocultar' : 'Mostrar'} diagnósticos
        </button>
        
        <div className="flex space-x-3">
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
      
      {/* Panel de diagnósticos */}
      {showDiagnostics && (
        <div className="mt-4 p-4 bg-gray-50 border rounded-md">
          <h4 className="font-semibold mb-2">Información de diagnóstico</h4>
          <div className="text-sm space-y-1">
            <p><strong>Alumno ID:</strong> {alumno.id}</p>
            <p><strong>Asignatura ID:</strong> {asignaturaId}</p>
            <p><strong>Asignatura nome:</strong> {asignatura?.nome || 'No cargada'}</p>
            <p><strong>Configuración avaliación:</strong> {asignatura?.configuracionAvaliacion ? 'Sí' : 'No'}</p>
            <p><strong>Evaluaciones configuradas:</strong> {asignatura?.configuracionAvaliacion?.avaliaciois?.length || 0}</p>
            <p><strong>Nota alumno ID:</strong> {notaAlumno?.id || 'No asignado'}</p>
            <p><strong>Evaluaciones en nota:</strong> {notaAlumno?.notasAvaliaciois?.length || 0}</p>
            <p><strong>Tab activo:</strong> {activeTab || 'Ninguno'}</p>
            <p><strong>URL actual:</strong> {window.location.href}</p>
          </div>
          <button
            onClick={async () => {
              console.log('=== DIAGNÓSTICO MANUAL ===');
              console.log('Alumno:', alumno);
              console.log('Asignatura:', asignatura);
              console.log('Nota alumno:', notaAlumno);
              console.log('Active tab:', activeTab);
              
              try {
                console.log('Probando conexión Firebase...');
                const testNota = await dataManager.getNotaAlumno(alumno.id, asignaturaId);
                console.log('Nota obtenida desde Firebase:', testNota);
              } catch (error) {
                console.error('Error en diagnóstico:', error);
              }
            }}
            className="mt-2 px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
          >
            Ejecutar diagnóstico en consola
          </button>
        </div>
      )}
    </div>
  );
};

export default NotasForm;
