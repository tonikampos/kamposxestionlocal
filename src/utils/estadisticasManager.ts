import type { 
  Asignatura, 
  Alumno, 
  NotaAlumno, 
  NotaAvaliacion, 
  Avaliacion,
  Proba 
} from './storageManager';

// Función para calcular la nota final de una evaluación basada en las pruebas y sus porcentajes
export const calcularNotaEvaluacion = (notaAvaliacion: NotaAvaliacion, avaliacion: Avaliacion): number => {
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
export const calcularNotaFinalAsignatura = (notaAlumno: NotaAlumno, asignatura: Asignatura): number => {
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

// Tipos para estadísticas
export interface EstadisticasAsignatura {
  asignatura: Asignatura;
  totalAlumnos: number;
  alumnosConNotas: number;
  notaMedia: number;
  notaMaxima: number;
  notaMinima: number;
  aprobados: number;
  suspensos: number;
  tasaAprobacion: number;
  distribucionNotas: {
    rango: string;
    cantidad: number;
    porcentaje: number;
  }[];
  notasPorEvaluacion: {
    evaluacion: string;
    notaMedia: number;
    aprobados: number;
    suspensos: number;
  }[];
}

export interface EstadisticasGenerales {
  totalAsignaturas: number;
  totalAlumnos: number;
  totalMatriculas: number;
  asignaturasConNotas: number;
  notaMediaGeneral: number;
  tasaAprobacionGeneral: number;
  asignaturasPorNivel: {
    nivel: string;
    cantidad: number;
  }[];
  evolucionPorEvaluacion: {
    evaluacion: string;
    notaMedia: number;
    tendencia: 'subida' | 'bajada' | 'estable';
  }[];
}

// Función para calcular estadísticas de una asignatura
export const calcularEstadisticasAsignatura = (
  asignatura: Asignatura, 
  alumnos: Alumno[], 
  notas: NotaAlumno[]
): EstadisticasAsignatura => {
  const notasFinales: number[] = [];
  let alumnosConNotas = 0;

  // Calcular notas finales de todos los alumnos
  alumnos.forEach(alumno => {
    const notaAlumno = notas.find(n => n.alumnoId === alumno.id);
    if (notaAlumno) {
      const notaFinal = calcularNotaFinalAsignatura(notaAlumno, asignatura);
      if (notaFinal > 0) {
        notasFinales.push(notaFinal);
        alumnosConNotas++;
      }
    }
  });

  // Estadísticas básicas
  const notaMedia = notasFinales.length > 0 ? 
    notasFinales.reduce((sum, nota) => sum + nota, 0) / notasFinales.length : 0;
  const notaMaxima = notasFinales.length > 0 ? Math.max(...notasFinales) : 0;
  const notaMinima = notasFinales.length > 0 ? Math.min(...notasFinales) : 0;
  const aprobados = notasFinales.filter(nota => nota >= 5).length;
  const suspensos = notasFinales.filter(nota => nota < 5).length;
  const tasaAprobacion = notasFinales.length > 0 ? (aprobados / notasFinales.length) * 100 : 0;

  // Distribución por rangos
  const rangos = [
    { nombre: '0-2.9', min: 0, max: 2.9 },
    { nombre: '3-4.9', min: 3, max: 4.9 },
    { nombre: '5-6.9', min: 5, max: 6.9 },
    { nombre: '7-8.9', min: 7, max: 8.9 },
    { nombre: '9-10', min: 9, max: 10 }
  ];

  const distribucionNotas = rangos.map(rango => {
    const cantidad = notasFinales.filter(nota => nota >= rango.min && nota <= rango.max).length;
    const porcentaje = notasFinales.length > 0 ? (cantidad / notasFinales.length) * 100 : 0;
    return {
      rango: rango.nombre,
      cantidad,
      porcentaje: Math.round(porcentaje * 100) / 100
    };
  });

  // Estadísticas por evaluación
  const notasPorEvaluacion: EstadisticasAsignatura['notasPorEvaluacion'] = [];
  
  if (asignatura.configuracionAvaliacion?.avaliaciois) {
    asignatura.configuracionAvaliacion.avaliaciois.forEach(evaluacion => {
      const notasEvaluacion: number[] = [];
      
      notas.forEach(notaAlumno => {
        const notaEval = notaAlumno.notasAvaliaciois?.find(na => na.avaliacionId === evaluacion.id);
        if (notaEval) {
          const notaCalculada = calcularNotaEvaluacion(notaEval, evaluacion);
          if (notaCalculada > 0) {
            notasEvaluacion.push(notaCalculada);
          }
        }
      });

      const notaMediaEval = notasEvaluacion.length > 0 ?
        notasEvaluacion.reduce((sum, nota) => sum + nota, 0) / notasEvaluacion.length : 0;
      const aprobadosEval = notasEvaluacion.filter(nota => nota >= 5).length;
      const suspensosEval = notasEvaluacion.filter(nota => nota < 5).length;

      notasPorEvaluacion.push({
        evaluacion: `${evaluacion.numero}ª Evaluación`,
        notaMedia: Math.round(notaMediaEval * 100) / 100,
        aprobados: aprobadosEval,
        suspensos: suspensosEval
      });
    });
  }

  return {
    asignatura,
    totalAlumnos: alumnos.length,
    alumnosConNotas,
    notaMedia: Math.round(notaMedia * 100) / 100,
    notaMaxima: Math.round(notaMaxima * 100) / 100,
    notaMinima: Math.round(notaMinima * 100) / 100,
    aprobados,
    suspensos,
    tasaAprobacion: Math.round(tasaAprobacion * 100) / 100,
    distribucionNotas,
    notasPorEvaluacion
  };
};

// Función para calcular estadísticas generales
export const calcularEstadisticasGenerales = (
  asignaturas: Asignatura[],
  estadisticasAsignaturas: EstadisticasAsignatura[]
): EstadisticasGenerales => {
  const totalAsignaturas = asignaturas.length;
  const totalMatriculas = estadisticasAsignaturas.reduce((sum, est) => sum + est.totalAlumnos, 0);
  const asignaturasConNotas = estadisticasAsignaturas.filter(est => est.alumnosConNotas > 0).length;
  
  // Calcular nota media general ponderada
  let sumaNotas = 0;
  let totalAlumnosConNotas = 0;
  
  estadisticasAsignaturas.forEach(est => {
    if (est.alumnosConNotas > 0) {
      sumaNotas += est.notaMedia * est.alumnosConNotas;
      totalAlumnosConNotas += est.alumnosConNotas;
    }
  });
  
  const notaMediaGeneral = totalAlumnosConNotas > 0 ? sumaNotas / totalAlumnosConNotas : 0;
  
  // Calcular tasa de aprobación general
  const totalAprobados = estadisticasAsignaturas.reduce((sum, est) => sum + est.aprobados, 0);
  const totalConNotas = estadisticasAsignaturas.reduce((sum, est) => sum + est.alumnosConNotas, 0);
  const tasaAprobacionGeneral = totalConNotas > 0 ? (totalAprobados / totalConNotas) * 100 : 0;
  
  // Agrupar asignaturas por nivel
  const nivelesMap: Map<string, number> = new Map();
  asignaturas.forEach(asig => {
    const nivel = `${asig.nivel} ${asig.curso}º`;
    nivelesMap.set(nivel, (nivelesMap.get(nivel) || 0) + 1);
  });
  
  const asignaturasPorNivel = Array.from(nivelesMap.entries()).map(([nivel, cantidad]) => ({
    nivel,
    cantidad
  }));
  
  // Calcular evolución por evaluación (promedio de todas las asignaturas)
  const evaluacionesMap: Map<string, number[]> = new Map();
  
  estadisticasAsignaturas.forEach(est => {
    est.notasPorEvaluacion.forEach(evalData => {
      if (!evaluacionesMap.has(evalData.evaluacion)) {
        evaluacionesMap.set(evalData.evaluacion, []);
      }
      evaluacionesMap.get(evalData.evaluacion)!.push(evalData.notaMedia);
    });
  });
  
  const evolucionPorEvaluacion = Array.from(evaluacionesMap.entries()).map(([evaluacion, notas]) => {
    const notaMedia = notas.reduce((sum, nota) => sum + nota, 0) / notas.length;
    return {
      evaluacion,
      notaMedia: Math.round(notaMedia * 100) / 100,
      tendencia: 'estable' as const // Simplificado por ahora
    };
  });
  
  return {
    totalAsignaturas,
    totalAlumnos: totalMatriculas, // Total de matrículas únicas
    totalMatriculas,
    asignaturasConNotas,
    notaMediaGeneral: Math.round(notaMediaGeneral * 100) / 100,
    tasaAprobacionGeneral: Math.round(tasaAprobacionGeneral * 100) / 100,
    asignaturasPorNivel,
    evolucionPorEvaluacion
  };
};
