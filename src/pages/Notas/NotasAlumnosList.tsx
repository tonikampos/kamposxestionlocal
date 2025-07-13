import React, { useState, useEffect } from 'react';
import { dataManager } from '../../utils/dataManager';
import type { Asignatura, Alumno, NotaAlumno, NotaAvaliacion, Avaliacion } from '../../utils/storageManager';

interface NotasAlumnosListProps {
  asignaturaId: string;
  onAlumnoSelected: (alumno: Alumno) => void;
  refreshKey?: number;
  selectedAlumnoId?: string;
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

const NotasAlumnosList: React.FC<NotasAlumnosListProps> = ({ 
  asignaturaId, 
  onAlumnoSelected,
  refreshKey = 0,
  selectedAlumnoId
}) => {
  const [asignatura, setAsignatura] = useState<Asignatura | null>(null);
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [notas, setNotas] = useState<Record<string, NotaAlumno>>({});
  const [avaliacionsMap, setAvaliacionsMap] = useState<Record<string, Avaliacion>>({});
  const [loading, setLoading] = useState(true);

  // Cargar datos cuando cambia la asignatura seleccionada o refreshKey
  useEffect(() => {
    cargarDatos();
  }, [asignaturaId, refreshKey]);

  // Función para cargar los datos de la asignatura y los alumnos matriculados
  const cargarDatos = async () => {
    setLoading(true);
    try {
      console.log("Cargando datos de alumnos para asignatura:", asignaturaId);
      
      // Obtener datos de la asignatura
      const asignaturaData = await dataManager.getAsignaturaById(asignaturaId);
      if (!asignaturaData) {
        throw new Error('No se encontró la asignatura');
      }
      setAsignatura(asignaturaData);
      
      // Crear un mapa de evaluaciones para acceso rápido
      const avalMap: Record<string, Avaliacion> = {};
      if (asignaturaData.configuracionAvaliacion?.avaliaciois) {
        asignaturaData.configuracionAvaliacion.avaliaciois.forEach(aval => {
          avalMap[aval.id] = aval;
        });
      }
      setAvaliacionsMap(avalMap);
      
      // Obtener matrículas de la asignatura
      const matriculas = await dataManager.getMatriculasByAsignatura(asignaturaId);
      
      // Cargar datos de los alumnos
      const alumnosData: Alumno[] = [];
      const notasAlumnos: Record<string, NotaAlumno> = {};
      
      for (const matricula of matriculas) {
        try {
          // Obtener datos del alumno
          const alumno = await dataManager.getAlumnoById(matricula.alumnoId);
          if (alumno) {
            alumnosData.push(alumno);
            
            // Obtener notas del alumno
            const notaAlumno = await dataManager.getNotaAlumno(alumno.id, asignaturaId);
            if (notaAlumno) {
              notasAlumnos[alumno.id] = notaAlumno;
            }
          }
        } catch (error) {
          console.error(`Error al procesar alumno ${matricula.alumnoId}:`, error);
        }
      }
      
      console.log("Alumnos matriculados:", alumnosData.length);
      setAlumnos(alumnosData);
      
      console.log("Notas de alumnos cargadas:", Object.keys(notasAlumnos).length);
      setNotas(notasAlumnos);
      
    } catch (error) {
      console.error('Error al cargar datos:', error);
      alert('Erro ao cargar os datos dos alumnos');
    } finally {
      setLoading(false);
    }
  };

  // Función auxiliar para calcular la nota media usando las funciones de cálculo mejoradas
  const calcularNotaMedia = (alumnoId: string): number | null => {
    try {
      const notaAlumno = notas[alumnoId];
      if (!notaAlumno || !asignatura) {
        return null;
      }
      
      // Usar la función de cálculo consistente
      const notaCalculada = calcularNotaFinalAsignatura(notaAlumno, asignatura);
      
      // Si no se pudo calcular, devolver null
      if (isNaN(notaCalculada) || notaCalculada === 0) {
        return null;
      }
      
      return notaCalculada;
    } catch (error) {
      console.error(`Error al calcular nota media para alumno ${alumnoId}:`, error);
      return null;
    }
  };

  // Función para formatear una nota
  const formatarNota = (nota: number | null): string => {
    if (nota === null) return '-';
    return nota.toFixed(2).replace('.00', '');
  };

  // Función para determinar el color de fondo según la nota
  const getBackgroundColor = (nota: number | null): string => {
    if (nota === null) return '';
    if (nota < 5) return 'bg-red-100';
    if (nota < 7) return 'bg-yellow-100';
    if (nota < 9) return 'bg-green-100';
    return 'bg-blue-100';
  };

  if (loading) {
    return <div className="text-center p-4">Cargando alumnos...</div>;
  }

  if (!asignatura) {
    return <div className="text-red-500">Erro: Non se puido cargar a asignatura</div>;
  }

  if (alumnos.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-100 p-4 rounded-lg">
        <p className="text-yellow-700">
          Non hai alumnos matriculados nesta asignatura.
        </p>
        <p className="text-yellow-600 text-sm mt-2">
          Para matricular alumnos, vai á sección de Asignaturas e selecciona "Xestionar Matrículas".
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="text-sm text-gray-500 mb-2">
        Selecciona un alumno para ver/editar as súas notas:
      </div>
      <div className="space-y-1 max-h-96 overflow-y-auto">
        {alumnos.map(alumno => {
          const notaMedia = calcularNotaMedia(alumno.id);
          const bgColor = getBackgroundColor(notaMedia);
          const notaAlumno = notas[alumno.id];
          
          return (
            <div 
              key={alumno.id}
              className={`p-3 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                bgColor
              } ${
                selectedAlumnoId === alumno.id ? 'ring-2 ring-blue-500' : ''
              }`}
              onClick={() => onAlumnoSelected(alumno)}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="font-medium">{alumno.nome} {alumno.apelidos}</div>
                  <div className="text-xs text-gray-500 mb-2">{alumno.email}</div>
                  
                  {/* Mostrar notas de evaluaciones */}
                  {notaAlumno && asignatura?.configuracionAvaliacion?.avaliaciois && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {asignatura.configuracionAvaliacion.avaliaciois.map(avaliacion => {
                        const notaEval = notaAlumno.notasAvaliaciois?.find(na => na.avaliacionId === avaliacion.id);
                        const notaEvaluacion = notaEval ? calcularNotaEvaluacion(notaEval, avaliacion) : null;
                        
                        let colorClass = "bg-gray-100 text-gray-600";
                        if (notaEvaluacion !== null && notaEvaluacion > 0) {
                          if (notaEvaluacion >= 9) {
                            colorClass = "bg-blue-100 text-blue-700";
                          } else if (notaEvaluacion >= 7) {
                            colorClass = "bg-green-100 text-green-700";
                          } else if (notaEvaluacion >= 5) {
                            colorClass = "bg-yellow-100 text-yellow-700";
                          } else {
                            colorClass = "bg-red-100 text-red-700";
                          }
                        }
                        
                        return (
                          <span 
                            key={avaliacion.id}
                            className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${colorClass}`}
                          >
                            {avaliacion.numero}ª: {notaEvaluacion !== null && notaEvaluacion > 0 ? notaEvaluacion.toFixed(1) : '—'}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
                
                <div className="ml-3">
                  <div className={`
                    w-12 h-12 rounded-full flex flex-col items-center justify-center
                    ${notaMedia !== null ? (notaMedia >= 5 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800') : 'bg-gray-100 text-gray-500'}
                    font-bold text-sm
                  `}>
                    <span className="text-lg">{formatarNota(notaMedia)}</span>
                    <span className="text-xs font-normal">Final</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default NotasAlumnosList;
