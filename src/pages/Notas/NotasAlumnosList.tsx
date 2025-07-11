import React, { useState, useEffect } from 'react';
import { dataManager } from '../../utils/dataManager';
import type { Asignatura, Alumno, NotaAlumno, NotaAvaliacion, Avaliacion } from '../../utils/storageManager';

interface NotasAlumnosListProps {
  asignaturaId: string;
  onAlumnoSelected: (alumno: Alumno) => void;
  refreshKey?: number;
  selectedAlumnoId?: string;
}

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

  // Función auxiliar para calcular la nota media
  const calcularNotaMedia = (alumnoId: string): number | null => {
    try {
      const notaAlumno = notas[alumnoId];
      if (!notaAlumno || !notaAlumno.notasAvaliaciois || notaAlumno.notasAvaliaciois.length === 0) {
        return null;
      }
      
      // Si ya tiene nota final calculada, usarla
      if (notaAlumno.notaFinal !== undefined) {
        return notaAlumno.notaFinal;
      }
      
      // Calcular la nota final según los porcentajes de las evaluaciones
      let notaFinal = 0;
      let porcentajeTotal = 0;
      
      notaAlumno.notasAvaliaciois.forEach((avaliacion: NotaAvaliacion) => {
        if (typeof avaliacion.notaFinal === 'number') {
          // Obtener el porcentaje de la evaluación desde la configuración
          const avalConfig = avaliacionsMap[avaliacion.avaliacionId];
          if (avalConfig) {
            notaFinal += avaliacion.notaFinal * avalConfig.porcentaxeNota;
            porcentajeTotal += avalConfig.porcentaxeNota;
          }
        }
      });
      
      // Si no hay evaluaciones con notas, devolver null
      if (porcentajeTotal === 0) {
        return null;
      }
      
      // Normalizar por el porcentaje total (por si no suma 100)
      return porcentajeTotal > 0 ? notaFinal / (porcentajeTotal / 100) : null;
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
          
          return (
            <div 
              key={alumno.id}
              className={`p-2 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                bgColor
              } ${
                selectedAlumnoId === alumno.id ? 'ring-2 ring-blue-500' : ''
              }`}
              onClick={() => onAlumnoSelected(alumno)}
            >
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-medium">{alumno.nome} {alumno.apelidos}</div>
                  <div className="text-xs text-gray-500">{alumno.email}</div>
                </div>
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center
                  ${notaMedia !== null ? (notaMedia >= 5 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800') : 'bg-gray-100 text-gray-500'}
                  font-bold text-lg
                `}>
                  {formatarNota(notaMedia)}
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
