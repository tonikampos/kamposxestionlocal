import React, { useState, useEffect } from 'react';
import { useRealtimeAuth } from '../../firebase/RealtimeAuthContext';
import { dataManager } from '../../utils/dataManager';
import { 
  calcularEstadisticasAsignatura, 
  calcularEstadisticasGenerales,
  type EstadisticasAsignatura,
  type EstadisticasGenerales
} from '../../utils/estadisticasManager';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar
} from 'recharts';
import type { Asignatura, Alumno, NotaAlumno } from '../../utils/storageManager';

const EstadisticasPage = () => {
  const { currentUser } = useRealtimeAuth();
  const [loading, setLoading] = useState(true);
  const [estadisticasGenerales, setEstadisticasGenerales] = useState<EstadisticasGenerales | null>(null);
  const [estadisticasAsignaturas, setEstadisticasAsignaturas] = useState<EstadisticasAsignatura[]>([]);
  const [asignaturaSeleccionada, setAsignaturaSeleccionada] = useState<string>('');
  const [vistaActiva, setVistaActiva] = useState<'general' | 'asignatura'>('general');

  // Colores para las gráficas
  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088fe'];
  const ROJO_COLORS = ['#ef4444', '#dc2626', '#b91c1c', '#991b1b', '#7f1d1d'];
  const VERDE_COLORS = ['#22c55e', '#16a34a', '#15803d', '#166534', '#14532d'];

  useEffect(() => {
    const loadAllStats = async () => {
      if (!currentUser) return;
      
      setLoading(true);
      try {
        console.log("Cargando estadísticas completas...");
        
        // Cargar todas las asignaturas del profesor
        const asignaturas = await dataManager.getAsignaturasByProfesor(currentUser.id);
        console.log("Asignaturas cargadas:", asignaturas.length);
        
        if (asignaturas.length === 0) {
          setEstadisticasGenerales({
            totalAsignaturas: 0,
            totalAlumnos: 0,
            totalMatriculas: 0,
            asignaturasConNotas: 0,
            notaMediaGeneral: 0,
            tasaAprobacionGeneral: 0,
            asignaturasPorNivel: [],
            evolucionPorEvaluacion: []
          });
          setEstadisticasAsignaturas([]);
          return;
        }
        
        // Calcular estadísticas para cada asignatura
        const estadisticasPorAsignatura: EstadisticasAsignatura[] = [];
        
        for (const asignatura of asignaturas) {
          try {
            // Obtener alumnos matriculados
            const matriculas = await dataManager.getMatriculasByAsignatura(asignatura.id);
            const alumnos: Alumno[] = [];
            const notas: NotaAlumno[] = [];
            
            // Cargar datos de alumnos y sus notas
            for (const matricula of matriculas) {
              try {
                const alumno = await dataManager.getAlumnoById(matricula.alumnoId);
                if (alumno) {
                  alumnos.push(alumno);
                  
                  const notaAlumno = await dataManager.getNotaAlumno(alumno.id, asignatura.id);
                  if (notaAlumno) {
                    notas.push(notaAlumno);
                  }
                }
              } catch (error) {
                console.error(`Error procesando alumno ${matricula.alumnoId}:`, error);
              }
            }
            
            // Calcular estadísticas de la asignatura
            const estadisticasAsig = calcularEstadisticasAsignatura(asignatura, alumnos, notas);
            estadisticasPorAsignatura.push(estadisticasAsig);
            
            console.log(`Estadísticas calculadas para ${asignatura.nome}:`, {
              alumnos: alumnos.length,
              conNotas: estadisticasAsig.alumnosConNotas,
              notaMedia: estadisticasAsig.notaMedia
            });
            
          } catch (error) {
            console.error(`Error procesando asignatura ${asignatura.nome}:`, error);
          }
        }
        
        // Calcular estadísticas generales
        const statsGenerales = calcularEstadisticasGenerales(asignaturas, estadisticasPorAsignatura);
        
        setEstadisticasAsignaturas(estadisticasPorAsignatura);
        setEstadisticasGenerales(statsGenerales);
        
        // Seleccionar la primera asignatura por defecto
        if (estadisticasPorAsignatura.length > 0) {
          setAsignaturaSeleccionada(estadisticasPorAsignatura[0].asignatura.id);
        }
        
        console.log("Estadísticas generales calculadas:", statsGenerales);
        
      } catch (error) {
        console.error("Error al cargar estadísticas:", error);
        alert("Error al cargar las estadísticas. Por favor, intenta de nuevo.");
      } finally {
        setLoading(false);
      }
    };
    
    loadAllStats();
  }, [currentUser]);

  const asignaturaActual = estadisticasAsignaturas.find(
    est => est.asignatura.id === asignaturaSeleccionada
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-gray-600">Cargando estadísticas...</span>
      </div>
    );
  }

  if (!estadisticasGenerales) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-500">No hay datos suficientes para mostrar estadísticas.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-blue-800">📊 Estadísticas</h1>
        
        {/* Selector de vista */}
        <div className="flex space-x-2">
          <button
            onClick={() => setVistaActiva('general')}
            className={`px-4 py-2 rounded-lg font-medium ${
              vistaActiva === 'general'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Vista General
          </button>
          <button
            onClick={() => setVistaActiva('asignatura')}
            className={`px-4 py-2 rounded-lg font-medium ${
              vistaActiva === 'asignatura'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Por Asignatura
          </button>
        </div>
      </div>

      {vistaActiva === 'general' ? (
        <VistaGeneral 
          estadisticas={estadisticasGenerales}
          estadisticasAsignaturas={estadisticasAsignaturas}
          colors={COLORS}
          verdeColors={VERDE_COLORS}
          rojoColors={ROJO_COLORS}
        />
      ) : (
        <VistaAsignatura
          estadisticasAsignaturas={estadisticasAsignaturas}
          asignaturaSeleccionada={asignaturaSeleccionada}
          setAsignaturaSeleccionada={setAsignaturaSeleccionada}
          asignaturaActual={asignaturaActual}
          colors={COLORS}
          verdeColors={VERDE_COLORS}
          rojoColors={ROJO_COLORS}
        />
      )}
    </div>
  );
};

// Componente para la vista general
interface VistaGeneralProps {
  estadisticas: EstadisticasGenerales;
  estadisticasAsignaturas: EstadisticasAsignatura[];
  colors: string[];
  verdeColors: string[];
  rojoColors: string[];
}

const VistaGeneral: React.FC<VistaGeneralProps> = ({ 
  estadisticas, 
  estadisticasAsignaturas, 
  colors,
  verdeColors,
  rojoColors 
}) => {
  // Preparar datos para gráficas
  const datosRendimiento = estadisticasAsignaturas.map(est => ({
    nombre: est.asignatura.nome.length > 15 ? 
      est.asignatura.nome.substring(0, 15) + '...' : 
      est.asignatura.nome,
    notaMedia: est.notaMedia,
    aprobados: est.aprobados,
    suspensos: est.suspensos,
    tasaAprobacion: est.tasaAprobacion
  }));

  const datosNiveles = estadisticas.asignaturasPorNivel.map(nivel => ({
    ...nivel,
    fill: colors[estadisticas.asignaturasPorNivel.indexOf(nivel) % colors.length]
  }));

  const datosEvolucion = estadisticas.evolucionPorEvaluacion;

  return (
    <div className="space-y-6">
      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Total Asignaturas</p>
              <p className="text-3xl font-bold text-blue-600">{estadisticas.totalAsignaturas}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <svg className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Total Matrículas</p>
              <p className="text-3xl font-bold text-purple-600">{estadisticas.totalMatriculas}</p>
            </div>
            <div className="bg-purple-100 p-3 rounded-full">
              <svg className="h-6 w-6 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Nota Media General</p>
              <p className="text-3xl font-bold text-green-600">{estadisticas.notaMediaGeneral.toFixed(2)}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <svg className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Tasa Aprobados</p>
              <p className="text-3xl font-bold text-orange-600">{estadisticas.tasaAprobacionGeneral.toFixed(1)}%</p>
            </div>
            <div className="bg-orange-100 p-3 rounded-full">
              <svg className="h-6 w-6 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Gráficas principales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rendimiento por asignatura */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">📈 Rendimiento por Asignatura</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={datosRendimiento}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="nombre" 
                angle={-45}
                textAnchor="end"
                height={80}
                fontSize={12}
              />
              <YAxis />
              <Tooltip 
                formatter={(value: any, name: string) => {
                  if (name === 'notaMedia') return [value.toFixed(2), 'Nota Media'];
                  if (name === 'tasaAprobacion') return [value.toFixed(1) + '%', 'Tasa Aprobados'];
                  return [value, name];
                }}
              />
              <Legend />
              <Bar dataKey="notaMedia" fill="#3B82F6" name="Nota Media" />
              <Bar dataKey="tasaAprobacion" fill="#10B981" name="Tasa Aprobados %" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Distribución por niveles */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">🎯 Asignaturas por Nivel</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={datosNiveles}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ nivel, cantidad }) => `${nivel}: ${cantidad}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="cantidad"
              >
                {datosNiveles.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Evolución por evaluaciones */}
      {datosEvolucion.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">📊 Evolución por Evaluaciones</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={datosEvolucion}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="evaluacion" />
              <YAxis domain={[0, 10]} />
              <Tooltip formatter={(value: any) => [value.toFixed(2), 'Nota Media']} />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="notaMedia" 
                stroke="#8884d8" 
                strokeWidth={3}
                dot={{ fill: '#8884d8', strokeWidth: 2, r: 6 }}
                name="Nota Media"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Tabla de rendimiento detallado */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-800">📋 Resumen Detallado por Asignatura</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Asignatura
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Alumnos
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nota Media
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aprobados
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Suspensos
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tasa Aprobados
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {estadisticasAsignaturas.map((est, index) => (
                <tr key={est.asignatura.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{est.asignatura.nome}</div>
                    <div className="text-sm text-gray-500">{est.asignatura.nivel} {est.asignatura.curso}º</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                    {est.alumnosConNotas}/{est.totalAlumnos}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`text-sm font-medium ${
                      est.notaMedia >= 7 ? 'text-green-600' : 
                      est.notaMedia >= 5 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {est.notaMedia.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-green-600 font-medium">
                    {est.aprobados}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-red-600 font-medium">
                    {est.suspensos}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`text-sm font-medium ${
                      est.tasaAprobacion >= 80 ? 'text-green-600' : 
                      est.tasaAprobacion >= 60 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {est.tasaAprobacion.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Componente para la vista por asignatura
interface VistaAsignaturaProps {
  estadisticasAsignaturas: EstadisticasAsignatura[];
  asignaturaSeleccionada: string;
  setAsignaturaSeleccionada: (id: string) => void;
  asignaturaActual?: EstadisticasAsignatura;
  colors: string[];
  verdeColors: string[];
  rojoColors: string[];
}

const VistaAsignatura: React.FC<VistaAsignaturaProps> = ({
  estadisticasAsignaturas,
  asignaturaSeleccionada,
  setAsignaturaSeleccionada,
  asignaturaActual,
  colors,
  verdeColors,
  rojoColors
}) => {
  if (!asignaturaActual) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-500">Selecciona una asignatura para ver sus estadísticas detalladas.</p>
      </div>
    );
  }

  // Preparar datos para gráficas
  const datosDistribucion = asignaturaActual.distribucionNotas.map((dist, index) => ({
    ...dist,
    fill: dist.rango.includes('0-2') || dist.rango.includes('3-4') ? rojoColors[index % rojoColors.length] : 
          dist.rango.includes('5-6') ? colors[index % colors.length] : 
          verdeColors[index % verdeColors.length]
  }));

  const datosEvaluaciones = asignaturaActual.notasPorEvaluacion;

  const datosAprobacionRadial = [
    {
      name: 'Aprobados',
      value: asignaturaActual.tasaAprobacion,
      fill: '#10B981'
    },
    {
      name: 'Suspensos',
      value: 100 - asignaturaActual.tasaAprobacion,
      fill: '#EF4444'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Selector de asignatura */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Seleccionar Asignatura:
        </label>
        <select
          value={asignaturaSeleccionada}
          onChange={(e) => setAsignaturaSeleccionada(e.target.value)}
          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        >
          {estadisticasAsignaturas.map(est => (
            <option key={est.asignatura.id} value={est.asignatura.id}>
              {est.asignatura.nome} ({est.asignatura.nivel} {est.asignatura.curso}º)
            </option>
          ))}
        </select>
      </div>

      {/* Tarjetas de resumen de la asignatura */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Alumnos Matriculados</p>
              <p className="text-3xl font-bold text-blue-600">{asignaturaActual.totalAlumnos}</p>
              <p className="text-xs text-gray-400">Con notas: {asignaturaActual.alumnosConNotas}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <svg className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Nota Media</p>
              <p className="text-3xl font-bold text-green-600">{asignaturaActual.notaMedia.toFixed(2)}</p>
              <p className="text-xs text-gray-400">Rango: {asignaturaActual.notaMinima.toFixed(2)} - {asignaturaActual.notaMaxima.toFixed(2)}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <svg className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Aprobados</p>
              <p className="text-3xl font-bold text-emerald-600">{asignaturaActual.aprobados}</p>
              <p className="text-xs text-gray-400">{asignaturaActual.tasaAprobacion.toFixed(1)}% del total</p>
            </div>
            <div className="bg-emerald-100 p-3 rounded-full">
              <svg className="h-6 w-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Suspensos</p>
              <p className="text-3xl font-bold text-red-600">{asignaturaActual.suspensos}</p>
              <p className="text-xs text-gray-400">{(100 - asignaturaActual.tasaAprobacion).toFixed(1)}% del total</p>
            </div>
            <div className="bg-red-100 p-3 rounded-full">
              <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Gráficas de la asignatura */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribución de notas */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">📊 Distribución de Notas</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={datosDistribucion}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="rango" />
              <YAxis />
              <Tooltip 
                formatter={(value: any) => [`${value} alumnos`, 'Cantidad']}
                labelFormatter={(label) => `Rango: ${label}`}
              />
              <Bar dataKey="cantidad" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Tasa de aprobados visual */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">🎯 Tasa de Aprobados</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={datosAprobacionRadial}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }: any) => `${name}: ${value ? value.toFixed(1) : 0}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {datosAprobacionRadial.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip formatter={(value: any) => [`${value.toFixed(1)}%`, '']} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Rendimiento por evaluaciones */}
      {datosEvaluaciones.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">📈 Rendimiento por Evaluaciones</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={datosEvaluaciones}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="evaluacion" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="notaMedia" fill="#3B82F6" name="Nota Media" />
              <Bar dataKey="aprobados" fill="#10B981" name="Aprobados" />
              <Bar dataKey="suspensos" fill="#EF4444" name="Suspensos" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Tabla detallada de distribución */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-800">📋 Detalle de Distribución de Notas</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rango de Notas
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cantidad de Alumnos
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Porcentaje
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Barra Visual
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {asignaturaActual.distribucionNotas.map((dist, index) => (
                <tr key={dist.rango} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{dist.rango}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                    {dist.cantidad}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                    {dist.porcentaje.toFixed(1)}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          dist.rango.includes('0-2') || dist.rango.includes('3-4') ? 'bg-red-500' : 
                          dist.rango.includes('5-6') ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${dist.porcentaje}%` }}
                      ></div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default EstadisticasPage;
