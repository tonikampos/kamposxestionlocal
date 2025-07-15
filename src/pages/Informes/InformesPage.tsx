import React, { useState, useEffect, useRef } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useRealtimeAuth } from '../../firebase/RealtimeAuthContext';
import { dataManager } from '../../utils/dataManager';
import { calcularEstadisticasAsignatura } from '../../utils/estadisticasManager';
import type { Alumno, Asignatura, NotaAlumno, Avaliacion, NotaAvaliacion } from '../../utils/storageManager';

// Tipos para jspdf-autotable
interface AutoTableOptions {
  head?: any[][];
  body?: any[][];
  startY?: number;
  headStyles?: any;
  bodyStyles?: any;
  alternateRowStyles?: any;
  columnStyles?: any;
  margin?: any;
  styles?: any;
  tableLineColor?: number[];
  tableLineWidth?: number;
}

// Componente para seleccionar alumnos de una asignatura
interface AlumnosAsignaturaSelectorProps {
  asignaturaId: string;
  onSelect: (alumnoId: string) => void;
}

const AlumnosAsignaturaSelector: React.FC<AlumnosAsignaturaSelectorProps> = ({ asignaturaId, onSelect }) => {
  const [alumnosMatriculados, setAlumnosMatriculados] = useState<Alumno[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAlumnos = async () => {
      setLoading(true);
      try {
        const alumnos = await dataManager.getAlumnosByAsignatura(asignaturaId);
        setAlumnosMatriculados(alumnos);
      } catch (error) {
        console.error('Error al obtener alumnos matriculados:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAlumnos();
  }, [asignaturaId]);

  if (loading) {
    return <option disabled>Cargando alumnos...</option>;
  }

  if (alumnosMatriculados.length === 0) {
    return <option disabled>Non hai alumnos matriculados</option>;
  }

  return (
    <>
      {alumnosMatriculados.map(alumno => (
        <option key={alumno.id} value={alumno.id}>
          {alumno.nome} {alumno.apelidos}
        </option>
      ))}
    </>
  );
};

const InformesPage = () => {
  const { currentUser } = useRealtimeAuth();
  const [selectedReport, setSelectedReport] = useState('alumnos');
  const [loading, setLoading] = useState(false);
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [asignaturas, setAsignaturas] = useState<Asignatura[]>([]);
  const [selectedAsignatura, setSelectedAsignatura] = useState<string>('');
  const [selectedAlumno, setSelectedAlumno] = useState<string>('');
  const [selectedEvaluacion, setSelectedEvaluacion] = useState<string>('todas');
  const [includeContactInfo, setIncludeContactInfo] = useState(false);
  const [orderBy, setOrderBy] = useState('apellidos');
  // Estados para filtros y diseño de informes
  const [filtroAlumnos, setFiltroAlumnos] = useState('todos');
  const [busquedaAlumno, setBusquedaAlumno] = useState('');
  const [colorTema, setColorTema] = useState('azul');
  const [tipoBoletinMasivo, setTipoBoletinMasivo] = useState<'basico' | 'detallado'>('basico');
  
  // Estado para el modal de previsualización de PDF
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [pdfTitle, setPdfTitle] = useState<string>('');
  const pdfIframeRef = useRef<HTMLIFrameElement>(null);
  
  // Cargar datos cuando se monta el componente
  useEffect(() => {
    const cargarDatos = async () => {
      if (currentUser) {
        try {
          // Cargar alumnos del profesor actual
          const alumnosProfesor = await dataManager.getAlumnosByProfesor(currentUser.id);
          setAlumnos(alumnosProfesor);
          
          // Cargar asignaturas del profesor actual
          const asignaturasProfesor = await dataManager.getAsignaturasByProfesor(currentUser.id);
          setAsignaturas(asignaturasProfesor);
        } catch (error) {
          console.error("Error al cargar datos para informes:", error);
        }
      }
    };
    
    cargarDatos();
  }, [currentUser]);

  // Opciones para generar el PDF según el tipo de informe
  const handleGenerateReport = async () => {
    setLoading(true);
    try {
      console.log('Generando informe tipo:', selectedReport);
      
      switch (selectedReport) {
        case 'alumnos':
          console.log('Generando informe de alumnos...');
          await generateAlumnosReport();
          break;
        case 'notas':
          if (selectedAsignatura && selectedAlumno) {
            console.log('Generando informe individual de notas...');
            await generateNotasIndividualReport();
          } else if (selectedAsignatura) {
            console.log('Generando informe de notas por asignatura...');
            await generateNotasAsignaturaReport();
          } else {
            alert('Debe seleccionar unha asignatura');
          }
          break;
        case 'estadisticas':
          if (selectedAsignatura) {
            console.log('Generando informe de estadísticas por asignatura...');
            await generateEstatisticasReport();
          } else {
            alert('Debe seleccionar unha asignatura para ver as estatísticas');
          }
          break;
        case 'boletins-masivos':
          if (selectedAsignatura) {
            console.log('Generando boletíns masivos por asignatura...');
            await generateBoletinsMasivosReport();
          } else {
            alert('Debe seleccionar unha asignatura para xerar os boletíns masivos');
          }
          break;
      }
    } catch (error) {
      console.error('Error al generar informe:', error);
      console.error('Detalles del error:', JSON.stringify(error, null, 2));
      alert('Ocorreu un erro ao xerar o informe. Consulta a consola para máis detalles.');
    } finally {
      setLoading(false);
    }
  };

  // Funcións para xerar os diferentes tipos de informes en PDF
  const generateAlumnosReport = async () => {
    try {
      console.log("Iniciando generación de informe de alumnos...");
      
      if (!currentUser) {
        console.error("No hay usuario autenticado");
        return;
      }
      
      // Cargar alumnos del profesor actual de forma asíncrona
      const alumnosDelProfesor = await dataManager.getAlumnosByProfesor(currentUser.id);
      console.log(`Número de alumnos encontrados: ${alumnosDelProfesor.length}`);
      
      // Filtrar alumnos según los criterios seleccionados
      let alumnosFiltrados = [...alumnosDelProfesor];
      
      // Filtro por búsqueda de texto
      if (busquedaAlumno && busquedaAlumno.trim() !== '') {
        const busquedaLower = busquedaAlumno.toLowerCase();
        alumnosFiltrados = alumnosFiltrados.filter(alumno => 
          alumno.nome.toLowerCase().includes(busquedaLower) || 
          alumno.apelidos.toLowerCase().includes(busquedaLower) ||
          alumno.email?.toLowerCase().includes(busquedaLower) || 
          (alumno.telefono && alumno.telefono.toString().includes(busquedaLower))
        );
      }
      
      // Filtro por asignatura matriculada
      if (filtroAlumnos && filtroAlumnos !== 'todos') {
        const alumnosIds = new Set<string>();
        const matriculas = await dataManager.getMatriculasByAsignatura(filtroAlumnos);
        
        matriculas.forEach(matricula => {
          alumnosIds.add(matricula.alumnoId);
        });
        
        alumnosFiltrados = alumnosFiltrados.filter(alumno => alumnosIds.has(alumno.id));
      }
      
      // Ordenar según el criterio seleccionado
      if (orderBy === 'apellidos') {
        alumnosFiltrados.sort((a, b) => a.apelidos.localeCompare(b.apelidos));
      } else if (orderBy === 'nombre') {
        alumnosFiltrados.sort((a, b) => a.nome.localeCompare(b.nome));
      }
      
      console.log(`Alumnos filtrados: ${alumnosFiltrados.length}`);
      
      // Crear PDF
      console.log("Creando documento PDF...");
      const doc = new jsPDF();
      
      // Configurar colores según el tema seleccionado
      let colorPrincipal: [number, number, number] = [66, 135, 245]; // Azul por defecto
      let colorSecundario: [number, number, number] = [235, 242, 254];
      let colorTexto: [number, number, number] = [0, 0, 0]; // Negro
      
      switch (colorTema) {
        case 'verde':
          colorPrincipal = [46, 125, 50];
          colorSecundario = [232, 245, 233];
          break;
        case 'morado':
          colorPrincipal = [106, 27, 154];
          colorSecundario = [237, 231, 246];
          break;
        case 'elegante':
          colorPrincipal = [33, 33, 33];
          colorSecundario = [240, 240, 240];
          break;
      }
      
      // Añadir un encabezado con estilo
      doc.setFillColor(colorPrincipal[0], colorPrincipal[1], colorPrincipal[2]);
      doc.rect(0, 0, 210, 30, 'F');
      
      // Añadir título
      doc.setFontSize(22);
      doc.setTextColor(255);
      doc.text('Listado de Alumnos', 14, 15);
      
      // Añadir información del profesor y fecha
      doc.setFontSize(11);
      doc.text(`Profesor: ${currentUser.nome} ${currentUser.apelidos}`, 14, 22);
      doc.text(`Data: ${new Date().toLocaleDateString('gl-ES')}`, 14, 27);
      
      // Añadir un subtítulo con los filtros aplicados
      doc.setTextColor(colorPrincipal[0], colorPrincipal[1], colorPrincipal[2]);
      doc.setFontSize(14);
      let subtitulo = 'Listado completo';
      
      if (filtroAlumnos !== 'todos') {
        const asignatura = asignaturas.find(a => a.id === filtroAlumnos);
        if (asignatura) {
          subtitulo = `Alumnos matriculados en ${asignatura.nome}`;
        }
      }
      
      if (busquedaAlumno) {
        subtitulo += ` - Filtro: "${busquedaAlumno}"`;
      }
      
      doc.text(subtitulo, 14, 40);
      
      // Información sobre la cantidad de alumnos
      doc.setFontSize(11);
      doc.setTextColor(100);
      doc.text(`Total de alumnos: ${alumnosFiltrados.length}`, 14, 46);
      
      // Crear tabla de alumnos con autoTable con diseño mejorado
      const tableColumn = includeContactInfo 
        ? ['Nome', 'Apelidos', 'Email', 'Teléfono'] 
        : ['Nome', 'Apelidos'];
      
      const tableRows = alumnosFiltrados.map(alumno => {
        if (includeContactInfo) {
          return [alumno.nome, alumno.apelidos, alumno.email || '-', alumno.telefono || '-'];
        } else {
          return [alumno.nome, alumno.apelidos];
        }
      });
      
      // Añadir bordes y estilos elegantes a la tabla
      try {
        autoTable(doc, {
          head: [tableColumn],
          body: tableRows,
          startY: 52,
          headStyles: {
            fillColor: colorPrincipal,
            textColor: 255,
            fontStyle: 'bold',
            halign: 'center'
          },
          bodyStyles: {
            textColor: colorTexto,
          },
          alternateRowStyles: {
            fillColor: colorSecundario
          },
          columnStyles: {
            0: { cellWidth: 35 },
            1: { cellWidth: 40 },
          },
          margin: { top: 52, right: 14, bottom: 20, left: 14 },
          styles: {
            cellPadding: 5,
            fontSize: 10,
            lineColor: [200, 200, 200],
            lineWidth: 0.1,
          },
          tableLineColor: [80, 80, 80],
          tableLineWidth: 0.1,
        });
      } catch (tableError) {
        console.warn("Error al generar tabla con autoTable:", tableError);
        alert("Houbo un problema ao xerar a táboa do informe. Proba outra configuración.");
        return;
      }
      
      // Añadir pie de página
      // Obtener la cantidad de páginas
      const numPages = (doc as any).internal.pages.length - 1;
      for (let i = 1; i <= numPages; i++) {
        doc.setPage(i);
        doc.setFontSize(9);
        doc.setTextColor(150);
        doc.text(
          `Kampos Xestión - Páxina ${i} de ${numPages}`, 
          doc.internal.pageSize.width / 2, 
          doc.internal.pageSize.height - 10, 
          { align: 'center' }
        );
      }
      
      // Mostrar el PDF en el modal en lugar de descargarlo
      showPdfInModal(doc, `Listado_de_Alumnos_${currentUser.nome}`);
      
      console.log("Informe de alumnos generado con éxito");
      return doc; // Retornar el documento por si se necesita en otro lugar
    } catch (error) {
      console.error("Error en generateAlumnosReport:", error);
      throw error;
    }
  };
  
  // Función para generar informe individual de notas de un alumno
  const generateNotasIndividualReport = async () => {
    try {
      console.log("Iniciando generación de informe individual de notas...");
      
      if (!currentUser || !selectedAsignatura || !selectedAlumno) {
        console.error("Faltan datos necesarios: usuario, asignatura o alumno");
        return;
      }
      
      // Obtener datos actualizados de la asignatura y alumno
      const asignatura = await dataManager.getAsignaturaById(selectedAsignatura);
      const alumno = await dataManager.getAlumnoById(selectedAlumno);
      
      if (!asignatura || !alumno) {
        alert('Non se atopou a asignatura ou o alumno seleccionado');
        console.error("No se encontró la asignatura o el alumno seleccionado");
        return;
      }
      
      console.log("Obteniendo notas del alumno...");
      // Obtener las notas del alumno para la asignatura seleccionada
      const notasAlumno = await dataManager.getNotaAlumno(selectedAlumno, selectedAsignatura);
      
      if (!notasAlumno) {
        alert('O alumno non ten notas para esta asignatura');
        console.error("El alumno no tiene notas para esta asignatura");
        return;
      }

      // Log completo para debug
      console.log("Datos para boletín:", {
        alumno,
        asignatura,
        notasAlumno,
        configuracionAvaliacion: asignatura.configuracionAvaliacion
      });
      
      console.log("Creando documento PDF...");
      // Crear PDF
      const doc = new jsPDF();
      
      // Configurar colores según el tema seleccionado
      let colorPrincipal: [number, number, number] = [41, 128, 185]; // Azul por defecto
      let colorSecundario: [number, number, number] = [248, 249, 250];
      
      switch (colorTema) {
        case 'verde':
          colorPrincipal = [46, 125, 50];
          colorSecundario = [232, 245, 233];
          break;
        case 'morado':
          colorPrincipal = [106, 27, 154];
          colorSecundario = [237, 231, 246];
          break;
        case 'elegante':
          colorPrincipal = [33, 33, 33];
          colorSecundario = [240, 240, 240];
          break;
        case 'azul':
        default:
          colorPrincipal = [41, 128, 185];
          colorSecundario = [248, 249, 250];
          break;
      }
      
      // Título principal con mellor formato
      doc.setFontSize(20);
      doc.setTextColor(40, 40, 40);
      doc.text('BOLETÍN INDIVIDUAL DE NOTAS', 105, 25, { align: 'center' });
      
      // Línea separadora
      doc.setDrawColor(200, 200, 200);
      doc.line(20, 30, 190, 30);
      
      // Información do alumno e asignatura con mellor deseño
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text(`Alumno: ${alumno.nome} ${alumno.apelidos}`, 20, 40);
      doc.text(`Asignatura: ${asignatura.nome}`, 20, 47);
      doc.text(`Nivel: ${asignatura.nivel} - ${asignatura.curso}º curso`, 20, 54);
      doc.text(`Profesor: ${currentUser.nome} ${currentUser.apelidos}`, 20, 61);
      doc.text(`Data: ${new Date().toLocaleDateString('gl-ES')}`, 20, 68);
      
      // Crear tabla de notas con mellor estrutura
      const tableColumn = ['Avaliación', 'Probas e Notas', 'Puntuación'];
      const tableRows: string[][] = [];
      
      // Procesar las notas para cada evaluación
      if (notasAlumno.notasAvaliaciois && Array.isArray(notasAlumno.notasAvaliaciois)) {
        notasAlumno.notasAvaliaciois.forEach((notaAval: { avaliacionId: string; notasProbas: any[]; notaFinal?: number }) => {
          const avaliacion = asignatura.configuracionAvaliacion?.avaliaciois.find(
            av => av.id === notaAval.avaliacionId
          );
          
          if (avaliacion) {
            // Cabeceira da avaliación
            tableRows.push([
              `${avaliacion.numero}ª AVALIACIÓN`,
              `Peso: ${avaliacion.porcentaxeNota}% da nota final`,
              ''
            ]);

            // Añadir las notas de cada prueba
            if (notaAval.notasProbas && Array.isArray(notaAval.notasProbas)) {
              notaAval.notasProbas.forEach((notaProba: { probaId: string; valor: number; observacions?: string }) => {
                const proba = avaliacion.probas.find(p => p.id === notaProba.probaId);
                if (proba) {
                  tableRows.push([
                    '',
                    `• ${proba.nome} (${proba.porcentaxe}%)`,
                    notaProba.valor.toFixed(2)
                  ]);
                }
              });
              
              // Nota final da avaliación
              if (notaAval.notaFinal !== undefined) {
                tableRows.push([
                  '',
                  'NOTA DA AVALIACIÓN',
                  `${notaAval.notaFinal.toFixed(2)}`
                ]);
              }
            } else {
              tableRows.push([
                '',
                'Sen probas avaliadas',
                'N/A'
              ]);
            }
            
            // Separador entre avaliacións
            tableRows.push(['', '', '']);
          }
        });
      } else {
        tableRows.push([
          'Sen avaliacións',
          'Non hai datos de avaliacións',
          ''
        ]);
      }
      
      // Nota final do curso destacada
      tableRows.push([
        'NOTA FINAL DO CURSO',
        'Nota calculada automaticamente',
        notasAlumno.notaFinal !== undefined ? `${notasAlumno.notaFinal.toFixed(2)}` : 'Non calculada'
      ]);
      
      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 75,
        headStyles: {
          fillColor: colorPrincipal,
          textColor: 255,
          fontStyle: 'bold',
          halign: 'center'
        },
        bodyStyles: {
          textColor: [40, 40, 40],
        },
        alternateRowStyles: {
          fillColor: colorSecundario
        },
        columnStyles: {
          0: { cellWidth: 45, fontStyle: 'bold' },
          1: { cellWidth: 90 },
          2: { cellWidth: 25, halign: 'center' }
        },
        margin: { top: 75, right: 20, bottom: 20, left: 20 },
        styles: {
          cellPadding: 5,
          fontSize: 10,
          lineColor: [200, 200, 200],
          lineWidth: 0.1,
        },
        theme: 'grid',
        // Función para aplicar cores condicionais ás notas
        didParseCell: function(data: any) {
          // Aplicar cores só á columna de puntuación (columna 2) e só ás filas de datos (non cabeceiras)
          if (data.row.section === 'body' && data.column.index === 2) {
            const backgroundColor = getNotaBackgroundColor(data.cell.text[0] || '');
            if (backgroundColor) {
              data.cell.styles.fillColor = backgroundColor;
            }
          }
        }
      });
      
      // Engadir lenda das cores
      const finalY = (doc as any).lastAutoTable?.finalY || 100;
      
      doc.setFontSize(9);
      doc.setTextColor(80, 80, 80);
      doc.text('LENDA DE CORES:', 20, finalY + 15);
      
      // Cadriño verde
      doc.setFillColor(220, 255, 220);
      doc.rect(20, finalY + 20, 8, 4, 'F');
      doc.text('Aprobado / Nota ≥ 5', 30, finalY + 23);
      
      // Cadriño vermello
      doc.setFillColor(255, 220, 220);
      doc.rect(20, finalY + 28, 8, 4, 'F');
      doc.text('Suspenso / Nota < 5', 30, finalY + 31);
      
      // Pé de páxina
      const pageHeight = doc.internal.pageSize.height;
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text('Xerado automaticamente polo sistema Kampos Xestión', 105, pageHeight - 10, { align: 'center' });
      
      // Mostrar el PDF en el modal
      showPdfInModal(doc, `Boletin_${alumno.nome}_${alumno.apelidos}`);
      
      console.log("Informe individual de notas generado con éxito");
      return doc;
    } catch (error) {
      console.error("Error en generateNotasIndividualReport:", error);
      throw error;
    }
  };

  // Función para generar informe de notas de una asignatura (todos los alumnos)
  const generateNotasAsignaturaReport = async () => {
    try {
      console.log("Iniciando generación de informe de notas por asignatura...");
      
      if (!currentUser || !selectedAsignatura) {
        console.error("Faltan datos necesarios: usuario o asignatura");
        return;
      }
      
      // Obtener datos actualizados de la asignatura
      const asignatura = await dataManager.getAsignaturaById(selectedAsignatura);
      
      if (!asignatura) {
        alert('Non se atopou a asignatura seleccionada');
        console.error("No se encontró la asignatura seleccionada");
        return;
      }
      
      console.log("Obteniendo alumnos matriculados...");
      // Obtener alumnos matriculados
      const alumnosMatriculados = await dataManager.getAlumnosByAsignatura(selectedAsignatura);
      
      if (alumnosMatriculados.length === 0) {
        alert('Non hai alumnos matriculados nesta asignatura');
        console.error("No hay alumnos matriculados en esta asignatura");
        return;
      }
      
      // Obtener todas las notas para la asignatura
      const notasAsignatura = await dataManager.getNotasAsignatura(selectedAsignatura);
      
      console.log(`Número de alumnos matriculados: ${alumnosMatriculados.length}`);
      console.log(`Notas recuperadas: ${notasAsignatura?.length || 0}`);
      
      console.log("Creando documento PDF...");
      // Crear PDF con mellor formato
      const doc = new jsPDF();
      
      // Configurar colores según el tema seleccionado
      let colorPrincipal: [number, number, number] = [41, 128, 185]; // Azul por defecto
      let colorSecundario: [number, number, number] = [248, 249, 250];
      
      switch (colorTema) {
        case 'verde':
          colorPrincipal = [46, 125, 50];
          colorSecundario = [232, 245, 233];
          break;
        case 'morado':
          colorPrincipal = [106, 27, 154];
          colorSecundario = [237, 231, 246];
          break;
        case 'elegante':
          colorPrincipal = [33, 33, 33];
          colorSecundario = [240, 240, 240];
          break;
        case 'azul':
        default:
          colorPrincipal = [41, 128, 185];
          colorSecundario = [248, 249, 250];
          break;
      }
      
      // Título principal
      doc.setFontSize(20);
      doc.setTextColor(40, 40, 40);
      doc.text('LISTADO DE NOTAS POR ASIGNATURA', 105, 25, { align: 'center' });
      
      // Línea separadora
      doc.setDrawColor(200, 200, 200);
      doc.line(20, 30, 190, 30);
      
      // Información da asignatura
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text(`Asignatura: ${asignatura.nome}`, 20, 40);
      doc.text(`Nivel: ${asignatura.nivel} - ${asignatura.curso}º curso`, 20, 47);
      doc.text(`Profesor: ${currentUser.nome} ${currentUser.apelidos}`, 20, 54);
      doc.text(`Data: ${new Date().toLocaleDateString('gl-ES')}`, 20, 61);
      doc.text(`Avaliación: ${selectedEvaluacion === 'todas' ? 'TODAS AS AVALIACIÓNS' : selectedEvaluacion === 'final' ? 'NOTA FINAL DO CURSO' : selectedEvaluacion + 'ª AVALIACIÓN'}`, 20, 68);
      
      // Crear tabla de notas con mellor formato - adaptar columnas según a opción seleccionada
      let tableColumn: string[];
      if (selectedEvaluacion === 'todas') {
        // Obtener número de evaluaciones configuradas
        const numAvaliacois = asignatura.configuracionAvaliacion?.avaliaciois?.length || 0;
        tableColumn = ['Nº', 'Alumno'];
        
        // Engadir columnas para cada avaliación
        for (let i = 1; i <= numAvaliacois; i++) {
          tableColumn.push(`${i}ª Aval.`);
        }
        tableColumn.push('Final', 'Estado');
      } else {
        tableColumn = ['Nº', 'Alumno', 'Nota', 'Estado'];
      }
      const tableRows: string[][] = [];
      
      // Procesar as notas para cada alumno
      alumnosMatriculados.sort((a, b) => a.apelidos.localeCompare(b.apelidos));
      
      alumnosMatriculados.forEach((alumno: Alumno, index: number) => {
        const notaAlumno = notasAsignatura?.find((n: NotaAlumno) => n.alumnoId === alumno.id);
        
        if (selectedEvaluacion === 'todas') {
          // Mostrar todas as avaliacións
          const row = [
            (index + 1).toString(),
            `${alumno.apelidos}, ${alumno.nome}`
          ];
          
          // Engadir nota de cada avaliación
          const avaliacioisConfiguradas = asignatura.configuracionAvaliacion?.avaliaciois?.sort((a, b) => a.numero - b.numero) || [];
          
          avaliacioisConfiguradas.forEach((avaliacion) => {
            let notaAval = 'N/A';
            
            if (notaAlumno?.notasAvaliaciois && Array.isArray(notaAlumno.notasAvaliaciois)) {
              const notaEval = notaAlumno.notasAvaliaciois.find((na: NotaAvaliacion) => na.avaliacionId === avaliacion.id);
              if (notaEval?.notaFinal !== undefined) {
                notaAval = notaEval.notaFinal.toFixed(2);
              }
            }
            
            row.push(notaAval);
          });
          
          // Engadir nota final e estado
          let notaFinal = 'N/C';
          let estado = 'Pendente';
          
          if (notaAlumno?.notaFinal !== undefined) {
            notaFinal = notaAlumno.notaFinal.toFixed(2);
            estado = parseFloat(notaFinal) >= 5 ? 'Aprobado' : 'Suspenso';
          } else {
            estado = 'Sen datos';
          }
          
          row.push(notaFinal, estado);
          tableRows.push(row);
          
        } else {
          // Lóxica orixinal para una soa avaliación
          let nota = 'Sen avaliar';
          let estado = 'Pendente';
          
          if (notaAlumno) {
            if (selectedEvaluacion === 'final') {
              // Mostrar nota final do curso
              if (notaAlumno.notaFinal !== undefined) {
                nota = notaAlumno.notaFinal.toFixed(2);
                estado = parseFloat(nota) >= 5 ? 'Aprobado' : 'Suspenso';
              } else {
                nota = 'Non calculada';
                estado = 'Sen datos';
              }
            } else {
              // Mostrar nota da avaliación seleccionada
              const evalNum = parseInt(selectedEvaluacion);
              
              if (notaAlumno.notasAvaliaciois && Array.isArray(notaAlumno.notasAvaliaciois)) {
                const notaAval = notaAlumno.notasAvaliaciois.find((na: NotaAvaliacion) => {
                  const avaliacion = asignatura.configuracionAvaliacion?.avaliaciois.find(av => av.id === na.avaliacionId);
                  return avaliacion?.numero === evalNum;
                });
                
                if (notaAval?.notaFinal !== undefined) {
                  nota = notaAval.notaFinal.toFixed(2);
                  estado = parseFloat(nota) >= 5 ? 'Aprobado' : 'Suspenso';
                } else {
                  nota = 'Sen datos';
                  estado = 'Pendente';
                }
              }
            }
          }
          
          tableRows.push([
            (index + 1).toString(),
            `${alumno.apelidos}, ${alumno.nome}`,
            nota,
            estado
          ]);
        }
      });
      
      // Configurar estilos de columnas dinamicamente
      let columnStyles: any = {};
      
      if (selectedEvaluacion === 'todas') {
        // Para o formato de todas as avaliacións
        columnStyles = {
          0: { cellWidth: 12, halign: 'center' }, // Nº
          1: { cellWidth: 60 }, // Alumno
        };
        
        const numAvaliacois = asignatura.configuracionAvaliacion?.avaliaciois?.length || 0;
        const widthPerEval = Math.max(15, Math.floor(80 / (numAvaliacois + 2))); // Distribuir espacio
        
        // Columnas de avaliacións
        for (let i = 2; i < 2 + numAvaliacois; i++) {
          columnStyles[i] = { cellWidth: widthPerEval, halign: 'center' };
        }
        
        // Columnas Final e Estado
        columnStyles[2 + numAvaliacois] = { cellWidth: 20, halign: 'center' }; // Final
        columnStyles[3 + numAvaliacois] = { cellWidth: 25, halign: 'center' }; // Estado
      } else {
        // Para o formato de una soa avaliación
        columnStyles = {
          0: { cellWidth: 15, halign: 'center' },
          1: { cellWidth: 80 },
          2: { cellWidth: 25, halign: 'center' },
          3: { cellWidth: 30, halign: 'center' }
        };
      }
      
      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 75,
        headStyles: {
          fillColor: colorPrincipal,
          textColor: 255,
          fontStyle: 'bold',
          halign: 'center'
        },
        bodyStyles: {
          textColor: [40, 40, 40],
        },
        alternateRowStyles: {
          fillColor: colorSecundario
        },
        columnStyles: columnStyles,
        margin: { top: 75, right: 20, bottom: 20, left: 20 },
        styles: {
          cellPadding: 4,
          fontSize: selectedEvaluacion === 'todas' ? 8 : 10, // Fonte máis pequena para moitas columnas
          lineColor: [200, 200, 200],
          lineWidth: 0.1,
        },
        theme: 'grid',
        // Función para aplicar cores condicionais ás celdas
        didParseCell: function(data: any) {
          // Só aplicar cores ás celdas de notas (non á primeira columna do número nin á columna do nome)
          // E só ás filas de datos, non ás cabeceiras
          if (data.row.section === 'body') { // Só ás filas de datos, non ás cabeceiras
            if (selectedEvaluacion === 'todas') {
              // Para o formato de todas as avaliacións
              const numAvaliacois = asignatura.configuracionAvaliacion?.avaliaciois?.length || 0;
              // Columnas de notas: desde a 2 ata antes das últimas dúas (Final e Estado)
              if (data.column.index >= 2 && data.column.index < 2 + numAvaliacois + 1) { // +1 para incluír Final
                const backgroundColor = getNotaBackgroundColor(data.cell.text[0] || '');
                if (backgroundColor) {
                  data.cell.styles.fillColor = backgroundColor;
                }
              }
              // Aplicar cores á columna de Estado (última columna)
              if (data.column.index === 2 + numAvaliacois + 1) { // Columna de Estado
                const backgroundColor = getEstadoBackgroundColor(data.cell.text[0] || '');
                if (backgroundColor) {
                  data.cell.styles.fillColor = backgroundColor;
                }
              }
            } else {
              // Para o formato de una soa avaliación - columna 2 é a nota, columna 3 é o estado
              if (data.column.index === 2) {
                const backgroundColor = getNotaBackgroundColor(data.cell.text[0] || '');
                if (backgroundColor) {
                  data.cell.styles.fillColor = backgroundColor;
                }
              }
              // Aplicar cores á columna de Estado (columna 3)
              if (data.column.index === 3) {
                const backgroundColor = getEstadoBackgroundColor(data.cell.text[0] || '');
                if (backgroundColor) {
                  data.cell.styles.fillColor = backgroundColor;
                }
              }
            }
          }
        }
      });
      
      // Engadir estatísticas na parte inferior
      const totalAlumnos = alumnosMatriculados.length;
      let alumnosAvaliados = 0;
      let alumnosAprobados = 0;
      let alumnosSuspensos = 0;
      
      if (selectedEvaluacion === 'todas') {
        // Para todas as avaliacións, usar a nota final
        alumnosAvaliados = tableRows.filter(row => row[row.length - 2] !== 'N/C' && row[row.length - 2] !== 'Sen avaliar').length;
        alumnosAprobados = tableRows.filter(row => row[row.length - 1] === 'Aprobado').length;
        alumnosSuspensos = tableRows.filter(row => row[row.length - 1] === 'Suspenso').length;
      } else {
        // Para una soa avaliación
        alumnosAvaliados = tableRows.filter(row => row[2] !== 'Sen avaliar' && row[2] !== 'Non calculada' && row[2] !== 'Sen datos').length;
        alumnosAprobados = tableRows.filter(row => row[3] === 'Aprobado').length;
        alumnosSuspensos = tableRows.filter(row => row[3] === 'Suspenso').length;
      }
      
      // Posición para as estatísticas
      const finalY = (doc as any).lastAutoTable?.finalY || 75 + (tableRows.length * 10);
      
      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);
      doc.text('RESUMO ESTATÍSTICO:', 20, finalY + 15);
      doc.text(`Total de alumnos: ${totalAlumnos}`, 20, finalY + 25);
      doc.text(`Alumnos avaliados: ${alumnosAvaliados}`, 20, finalY + 32);
      doc.text(`Aprobados: ${alumnosAprobados}`, 20, finalY + 39);
      doc.text(`Suspensos: ${alumnosSuspensos}`, 20, finalY + 46);
      if (alumnosAvaliados > 0) {
        doc.text(`Taxa de aprobados: ${((alumnosAprobados / alumnosAvaliados) * 100).toFixed(1)}%`, 20, finalY + 53);
      }
      
      // Lenda das cores
      doc.setFontSize(9);
      doc.setTextColor(80, 80, 80);
      doc.text('LENDA DE CORES:', 120, finalY + 15);
      
      // Cadriño verde
      doc.setFillColor(220, 255, 220);
      doc.rect(120, finalY + 20, 8, 4, 'F');
      doc.text('Aprobado / Nota ≥ 5', 130, finalY + 23);
      
      // Cadriño vermello
      doc.setFillColor(255, 220, 220);
      doc.rect(120, finalY + 28, 8, 4, 'F');
      doc.text('Suspenso / Nota < 5', 130, finalY + 31);
      
      // Pé de páxina
      const pageHeight = doc.internal.pageSize.height;
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text('Xerado automaticamente polo sistema Kampos Xestión', 105, pageHeight - 10, { align: 'center' });
      
      // Mostrar el PDF en el modal en lugar de descargarlo
      const nombreArchivo = selectedEvaluacion === 'todas' 
        ? `Notas_Completas_${asignatura.nome}` 
        : `Notas_${asignatura.nome}_${selectedEvaluacion === 'final' ? 'Final' : selectedEvaluacion + 'Avaliacion'}`;
      
      showPdfInModal(doc, nombreArchivo);
      
      console.log("Informe de notas por asignatura generado con éxito");
      return doc;
    } catch (error) {
      console.error("Error en generateNotasAsignaturaReport:", error);
      throw error;
    }
  };

  // Función para xerar informe de estatísticas por asignatura
  const generateEstatisticasReport = async () => {
    try {
      console.log("Iniciando generación de informe de estatísticas...");
      
      if (!currentUser || !selectedAsignatura) {
        console.error("Faltan datos necesarios: usuario o asignatura");
        return;
      }
      
      setLoading(true);
      
      // Obter datos da asignatura
      const asignatura = asignaturas.find(a => a.id === selectedAsignatura);
      if (!asignatura) {
        console.error("Non se atopou a asignatura seleccionada");
        return;
      }
      
      // Obter alumnos matriculados na asignatura
      const alumnosMatriculados = await dataManager.getAlumnosByAsignatura(selectedAsignatura);
      
      // Obter notas da asignatura
      const notas = await dataManager.getNotasAsignatura(selectedAsignatura);
      
      // Calcular estatísticas
      const estadisticas = calcularEstadisticasAsignatura(asignatura, alumnosMatriculados, notas);
      
      console.log("Estatísticas calculadas:", estadisticas);
      
      // Crear PDF
      const doc = new jsPDF();
      
      // Configurar colores según el tema seleccionado
      let colorPrincipal: [number, number, number] = [66, 135, 245]; // Azul por defecto
      let colorSecundario: [number, number, number] = [235, 242, 254];
      
      switch (colorTema) {
        case 'verde':
          colorPrincipal = [34, 197, 94];
          colorSecundario = [220, 252, 231];
          break;
        case 'morado':
          colorPrincipal = [147, 51, 234];
          colorSecundario = [243, 232, 255];
          break;
        case 'elegante':
          colorPrincipal = [55, 65, 81];
          colorSecundario = [249, 250, 251];
          break;
      }
      
      // Cabeceira do documento
      doc.setFillColor(colorPrincipal[0], colorPrincipal[1], colorPrincipal[2]);
      doc.rect(0, 0, 210, 40, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('INFORME DE ESTATÍSTICAS', 105, 20, { align: 'center' });
      
      doc.setFontSize(14);
      doc.setFont('helvetica', 'normal');
      doc.text(`${asignatura.nome} - ${asignatura.nivel} ${asignatura.curso}º`, 105, 30, { align: 'center' });
      
      // Información xeral
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('INFORMACIÓN XERAL', 20, 55);
      
      const infoXeral = [
        ['Total de alumnos matriculados:', estadisticas.totalAlumnos.toString()],
        ['Alumnos con notas:', estadisticas.alumnosConNotas.toString()],
        ['Nota media da asignatura:', estadisticas.notaMedia.toFixed(2)],
        ['Nota máxima:', estadisticas.notaMaxima.toFixed(2)],
        ['Nota mínima:', estadisticas.notaMinima.toFixed(2)],
        ['Alumnos aprobados:', estadisticas.aprobados.toString()],
        ['Alumnos suspensos:', estadisticas.suspensos.toString()],
        ['Taxa de aprobación:', `${estadisticas.tasaAprobacion.toFixed(1)}%`]
      ];
      
      autoTable(doc, {
        body: infoXeral,
        startY: 60,
        theme: 'plain',
        styles: {
          fontSize: 10,
          cellPadding: 2
        },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 70 },
          1: { cellWidth: 30, halign: 'right' }
        },
        margin: { left: 20, right: 20 }
      });
      
      // Distribución de notas por rangos
      let currentY = (doc as any).lastAutoTable.finalY + 15;
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('DISTRIBUCIÓN DE NOTAS POR RANGOS', 20, currentY);
      
      const distribucionData = estadisticas.distribucionNotas.map(rango => [
        rango.rango,
        rango.cantidad.toString(),
        `${rango.porcentaje.toFixed(1)}%`
      ]);
      
      autoTable(doc, {
        head: [['Rango de Notas', 'Nº Alumnos', 'Porcentaxe']],
        body: distribucionData,
        startY: currentY + 5,
        headStyles: {
          fillColor: colorPrincipal,
          textColor: 255,
          fontStyle: 'bold',
          halign: 'center'
        },
        bodyStyles: {
          textColor: [40, 40, 40],
          halign: 'center'
        },
        alternateRowStyles: {
          fillColor: colorSecundario
        },
        columnStyles: {
          0: { cellWidth: 40 },
          1: { cellWidth: 30 },
          2: { cellWidth: 30 }
        },
        margin: { left: 20, right: 20 },
        styles: {
          cellPadding: 4,
          fontSize: 10
        }
      });
      
      // Estatísticas por avaliación
      if (estadisticas.notasPorEvaluacion.length > 0) {
        currentY = (doc as any).lastAutoTable.finalY + 15;
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('ESTATÍSTICAS POR AVALIACIÓN', 20, currentY);
        
        const avaliacionsData = estadisticas.notasPorEvaluacion.map(evalData => [
          evalData.evaluacion,
          evalData.notaMedia.toFixed(2),
          evalData.aprobados.toString(),
          evalData.suspensos.toString(),
          evalData.aprobados + evalData.suspensos > 0 ? 
            `${((evalData.aprobados / (evalData.aprobados + evalData.suspensos)) * 100).toFixed(1)}%` : '0%'
        ]);
        
        autoTable(doc, {
          head: [['Avaliación', 'Nota Media', 'Aprobados', 'Suspensos', 'Taxa Aprobación']],
          body: avaliacionsData,
          startY: currentY + 5,
          headStyles: {
            fillColor: colorPrincipal,
            textColor: 255,
            fontStyle: 'bold',
            halign: 'center'
          },
          bodyStyles: {
            textColor: [40, 40, 40],
            halign: 'center'
          },
          alternateRowStyles: {
            fillColor: colorSecundario
          },
          columnStyles: {
            0: { cellWidth: 40 },
            1: { cellWidth: 25 },
            2: { cellWidth: 25 },
            3: { cellWidth: 25 },
            4: { cellWidth: 35 }
          },
          margin: { left: 20, right: 20 },
          styles: {
            cellPadding: 4,
            fontSize: 10
          }
        });
      }
      
      // Pé de páxina
      const totalPages = 1;
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        const fechaHora = new Date().toLocaleString('es-ES');
        doc.text(`Xerado o ${fechaHora}`, 20, 285);
        doc.text(`Páxina ${i} de ${totalPages}`, 190, 285, { align: 'right' });
      }
      
      console.log("Informe de estatísticas xerado con éxito");
      
      // Mostrar PDF no modal
      const nombreArchivo = `Estatisticas_${asignatura.nome.replace(/\s+/g, '_')}_${asignatura.nivel}_${asignatura.curso}`;
      showPdfInModal(doc, nombreArchivo);
      
      return doc;
    } catch (error) {
      console.error("Error en generateEstatisticasReport:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Función para xerar boletíns masivos de todos os alumnos dunha asignatura
  const generateBoletinsMasivosReport = async () => {
    try {
      console.log("Iniciando xeración de boletíns masivos...");
      
      if (!currentUser || !selectedAsignatura) {
        console.error("Faltan datos obrigatorios");
        return;
      }

      // Obter datos da asignatura
      const asignatura = asignaturas.find(a => a.id === selectedAsignatura);
      if (!asignatura) {
        console.error("Asignatura non atopada");
        return;
      }

      // Obter alumnos matriculados na asignatura
      const alumnosMatriculados = await dataManager.getAlumnosMatriculadosEnAsignatura(selectedAsignatura);
      
      if (!alumnosMatriculados || alumnosMatriculados.length === 0) {
        alert('Non hai alumnos matriculados nesta asignatura');
        return;
      }

      console.log(`Xerando boletíns para ${alumnosMatriculados.length} alumnos...`);

      // Xerar un PDF por cada alumno
      const pdfs: Array<{blob: Blob, nome: string}> = [];
      
      for (const alumno of alumnosMatriculados) {
        try {
          console.log(`Xerando boletín para ${alumno.nome} ${alumno.apelidos}...`);
          
          // Obter notas do alumno para esta asignatura (usando a mesma función que funciona no individual)
          const notaAlumno = await dataManager.getNotaAlumno(alumno.id, selectedAsignatura);
          
          if (!notaAlumno) {
            console.log(`Sen notas para ${alumno.nome} ${alumno.apelidos}, omitindo...`);
            continue;
          }

          // Crear PDF individual
          const doc = new jsPDF();
          
          // Configurar colores según el tema seleccionado
          let colorPrincipal: [number, number, number] = [66, 135, 245]; // Azul por defecto
          let colorSecundario: [number, number, number] = [235, 242, 254];
          
          switch (colorTema) {
            case 'verde':
              colorPrincipal = [46, 125, 50];
              colorSecundario = [232, 245, 233];
              break;
            case 'morado':
              colorPrincipal = [106, 27, 154];
              colorSecundario = [237, 231, 246];
              break;
            case 'elegante':
              colorPrincipal = [33, 33, 33];
              colorSecundario = [240, 240, 240];
              break;
          }

          // Engadir encabezado con estilo
          doc.setFillColor(colorPrincipal[0], colorPrincipal[1], colorPrincipal[2]);
          doc.rect(0, 0, 210, 35, 'F');
          
          // Título
          doc.setFontSize(20);
          doc.setTextColor(255);
          doc.text(`Boletín de Notas ${tipoBoletinMasivo === 'detallado' ? 'Detallado' : 'Individual'}`, 14, 15);
          
          // Información do profesor e data
          doc.setFontSize(10);
          doc.text(`Profesor: ${currentUser.nome} ${currentUser.apelidos}`, 14, 25);
          doc.text(`Data: ${new Date().toLocaleDateString('gl-ES')}`, 14, 30);

          // Información do alumno
          doc.setTextColor(colorPrincipal[0], colorPrincipal[1], colorPrincipal[2]);
          doc.setFontSize(14);
          doc.text(`Alumno: ${alumno.nome} ${alumno.apelidos}`, 14, 45);
          doc.text(`Asignatura: ${asignatura.nome}`, 14, 55);
          doc.text(`Nivel: ${asignatura.nivel} - Curso: ${asignatura.curso}`, 14, 65);

          // Preparar datos para a táboa de notas
          let headers: string[];
          let data: string[][];
          
          if (tipoBoletinMasivo === 'detallado') {
            // Formato detallado: mostrar todas las pruebas de cada evaluación
            headers = ['Avaliación', 'Probas e Notas', 'Puntuación'];
            data = [];
            
            // Procesar las notas para cada evaluación (igual que en el informe individual)
            if (notaAlumno.notasAvaliaciois && Array.isArray(notaAlumno.notasAvaliaciois)) {
              notaAlumno.notasAvaliaciois.forEach((notaAval: { avaliacionId: string; notasProbas: any[]; notaFinal?: number }) => {
                // Se hai unha avaliación específica seleccionada, filtrar
                if (selectedEvaluacion && selectedEvaluacion !== 'todas') {
                  const avaliacionConfig = asignatura.configuracionAvaliacion?.avaliaciois.find(av => av.id === notaAval.avaliacionId);
                  if (!avaliacionConfig || avaliacionConfig.numero.toString() !== selectedEvaluacion) {
                    return; // Saltar esta evaluación
                  }
                }

                const avaliacion = asignatura.configuracionAvaliacion?.avaliaciois.find(
                  av => av.id === notaAval.avaliacionId
                );
                
                if (avaliacion) {
                  // Cabeceira da avaliación
                  data.push([
                    `${avaliacion.numero}ª AVALIACIÓN`,
                    `Peso: ${avaliacion.porcentaxeNota}% da nota final`,
                    ''
                  ]);

                  // Añadir las notas de cada prueba
                  if (notaAval.notasProbas && Array.isArray(notaAval.notasProbas)) {
                    notaAval.notasProbas.forEach((notaProba: { probaId: string; valor: number; observacions?: string }) => {
                      const proba = avaliacion.probas.find(p => p.id === notaProba.probaId);
                      if (proba) {
                        data.push([
                          '',
                          `• ${proba.nome} (${proba.porcentaxe}%)`,
                          notaProba.valor.toFixed(2)
                        ]);
                      }
                    });
                    
                    // Nota final da avaliación
                    if (notaAval.notaFinal !== undefined) {
                      data.push([
                        '',
                        'NOTA DA AVALIACIÓN',
                        `${notaAval.notaFinal.toFixed(2)}`
                      ]);
                    }
                  } else {
                    data.push([
                      '',
                      'Sen probas avaliadas',
                      'N/A'
                    ]);
                  }
                  
                  // Separador entre avaliacións
                  data.push(['', '', '']);
                }
              });
            }
            
            // Nota final do curso destacada
            if (selectedEvaluacion === 'todas') {
              data.push([
                'NOTA FINAL DO CURSO',
                'Nota calculada automaticamente',
                notaAlumno.notaFinal !== undefined ? `${notaAlumno.notaFinal.toFixed(2)}` : 'Non calculada'
              ]);
            }
            
          } else {
            // Formato básico: solo mostrar nota final por evaluación
            headers = ['Avaliación', 'Nota', 'Estado'];
            data = [];

            // Procesar as notas de avaliacións do alumno
            if (notaAlumno.notasAvaliaciois && Array.isArray(notaAlumno.notasAvaliaciois)) {
              for (const notaAvaliacion of notaAlumno.notasAvaliaciois) {
                // Se hai unha avaliación específica seleccionada, filtrar
                if (selectedEvaluacion && selectedEvaluacion !== 'todas') {
                  // Obter o número da avaliación dende a configuración
                  const avaliacionConfig = asignatura.configuracionAvaliacion?.avaliaciois.find(av => av.id === notaAvaliacion.avaliacionId);
                  if (!avaliacionConfig || avaliacionConfig.numero.toString() !== selectedEvaluacion) {
                    continue;
                  }
                }

                // Obter o nome da avaliación dende a configuración
                const avaliacionConfig = asignatura.configuracionAvaliacion?.avaliaciois.find(av => av.id === notaAvaliacion.avaliacionId);
                const nomeAvaliacion = avaliacionConfig ? `${avaliacionConfig.numero}ª Avaliación` : `Avaliación ${notaAvaliacion.avaliacionId}`;
                
                const notaFinal = notaAvaliacion.notaFinal || 0;
                const notaString = notaFinal.toFixed(2);
                const estado = notaFinal >= 5 ? 'Aprobado' : 'Suspenso';
                
                data.push([nomeAvaliacion, notaString, estado]);
              }
            }
          }

          // Se non hai datos, engadir unha fila indicándoo
          if (data.length === 0) {
            data.push(['Sen datos', 'Non hai notas dispoñibles', 'Pendente']);
          }

          // Xerar táboa de notas
          autoTable(doc, {
            startY: 75,
            head: [headers],
            body: data,
            theme: 'grid',
            headStyles: { 
              fillColor: colorPrincipal,
              textColor: 255,
              fontStyle: 'bold',
              halign: 'center'
            },
            bodyStyles: { 
              halign: 'center',
              fontSize: 10
            },
            columnStyles: tipoBoletinMasivo === 'detallado' ? {
              0: { cellWidth: 45, fontStyle: 'bold' },
              1: { cellWidth: 90 },
              2: { cellWidth: 25, halign: 'center' }
            } : {
              0: { halign: 'left' },
              1: { halign: 'center' },
              2: { halign: 'center' }
            },
            didParseCell: function(data: any) {
              // Aplicar cores condicionais só ás celas de notas e estado (non ás cabeceiras)
              if (data.section === 'body') {
                if (tipoBoletinMasivo === 'detallado') {
                  // Para formato detallado: aplicar cores só á columna de puntuación (columna 2)
                  if (data.column.index === 2) {
                    const backgroundColor = getNotaBackgroundColor(data.cell.text[0]);
                    if (backgroundColor) {
                      data.cell.styles.fillColor = backgroundColor;
                    }
                  }
                } else {
                  // Para formato básico: aplicar cores ás columnas de nota e estado
                  if (data.column.index === 1) { // Columna de notas
                    const backgroundColor = getNotaBackgroundColor(data.cell.text[0]);
                    if (backgroundColor) {
                      data.cell.styles.fillColor = backgroundColor;
                    }
                  } else if (data.column.index === 2) { // Columna de estado
                    const backgroundColor = getEstadoBackgroundColor(data.cell.text[0]);
                    if (backgroundColor) {
                      data.cell.styles.fillColor = backgroundColor;
                    }
                  }
                }
              }
            },
            margin: { top: 20, right: 14, bottom: 20, left: 14 }
          });

          // Engadir lenda de cores
          const finalY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 15 : 150;
          
          doc.setFontSize(12);
          doc.setTextColor(colorPrincipal[0], colorPrincipal[1], colorPrincipal[2]);
          doc.text('Lenda de cores:', 14, finalY);
          
          doc.setFontSize(10);
          doc.setTextColor(0);
          doc.text('• Verde claro: Nota aprobada (≥ 5.0)', 14, finalY + 8);
          doc.text('• Vermello claro: Nota suspensa (< 5.0)', 14, finalY + 16);

          // Crear blob do PDF
          const pdfBlob = doc.output('blob');
          const nomeArquivo = `Boletin_${tipoBoletinMasivo === 'detallado' ? 'Detallado' : 'Basico'}_${alumno.nome}_${alumno.apelidos}_${asignatura.nome}`.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
          
          pdfs.push({
            blob: pdfBlob,
            nome: nomeArquivo
          });

        } catch (error) {
          console.error(`Erro ao xerar boletín para ${alumno.nome} ${alumno.apelidos}:`, error);
        }
      }

      if (pdfs.length === 0) {
        alert('Non se puido xerar ningún boletín. Comproba que os alumnos teñen notas.');
        return;
      }

      console.log(`Xeráronse ${pdfs.length} boletíns correctamente`);

      // Se só hai un PDF, descargalo directamente
      if (pdfs.length === 1) {
        const url = URL.createObjectURL(pdfs[0].blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = pdfs[0].nome + '.pdf';
        link.click();
        URL.revokeObjectURL(url);
        alert('Boletín descargado correctamente');
        return;
      }

      // Se hai múltiples PDFs, crear ZIP
      console.log('Creando arquivo ZIP con todos os boletíns...');
      
      // Importar JSZip dinámicamente
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      // Engadir cada PDF ao ZIP
      for (const pdf of pdfs) {
        zip.file(pdf.nome + '.pdf', pdf.blob);
      }

      // Xerar e descargar ZIP
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const zipUrl = URL.createObjectURL(zipBlob);
      const zipLink = document.createElement('a');
      zipLink.href = zipUrl;
      zipLink.download = `Boletins_${tipoBoletinMasivo === 'detallado' ? 'Detallados' : 'Basicos'}_${asignatura.nome}_${new Date().toISOString().split('T')[0]}.zip`;
      zipLink.click();
      URL.revokeObjectURL(zipUrl);

      alert(`Descargáronse ${pdfs.length} boletíns nun arquivo ZIP`);

    } catch (error) {
      console.error("Error en generateBoletinsMasivosReport:", error);
      alert('Ocorreu un erro ao xerar os boletíns masivos. Consulta a consola para máis detalles.');
      throw error;
    }
  };

  // Función para mostrar un PDF en el modal
  const showPdfInModal = (pdfDoc: jsPDF, title: string) => {
    try {
      console.log("Preparando PDF para visualización en modal...");
      
      // En vez de usar datauristring (que Chrome bloquea en iframes), 
      // creamos un blob y generamos una URL para él
      const pdfBlob = pdfDoc.output('blob');
      // Creamos una URL segura para el blob
      const blobUrl = URL.createObjectURL(pdfBlob);
      
      console.log("PDF generado correctamente como blob URL");
      
      // Actualizar estado
      setPdfUrl(blobUrl);
      setPdfTitle(title);
      setShowPdfPreview(true);
      
      console.log("Modal de previsualización abierto con éxito");
    } catch (error) {
      console.error('Error al generar vista previa del PDF:', error);
      console.error('Detalles del error:', error instanceof Error ? error.message : String(error));
      alert('Error al mostrar el PDF. Intentando descargar directamente...');
      
      try {
        // Intentar descargar directamente como fallback
        pdfDoc.save(title + '.pdf');
      } catch (saveError) {
        console.error('Error al descargar el PDF:', saveError);
        alert('No se pudo mostrar ni descargar el PDF. Consulta la consola para más detalles.');
      }
    }
  };

  // Función auxiliar para determinar a cor de fondo das notas
  const getNotaBackgroundColor = (notaString: string): [number, number, number] | null => {
    // Limpar e normalizar a string
    const cleanNota = notaString?.toString().trim().replace(',', '.');
    
    // Lista de valores que non son notas numéricas
    const nonNumericValues = ['N/A', 'N/C', 'Sen avaliar', 'Non calculada', 'Sen datos', 'Pendente', '-'];
    
    // Se é un valor non numérico, non aplicar cor
    if (!cleanNota || nonNumericValues.includes(cleanNota)) {
      return null;
    }
    
    // Intentar convertir a string a número
    const nota = parseFloat(cleanNota);
    
    // Se non é un número válido, non aplicar cor
    if (isNaN(nota)) {
      return null;
    }
    
    // Verde claro para aprobados (>= 5)
    if (nota >= 5) {
      return [220, 255, 220]; // Verde moi claro
    } 
    // Vermello claro para suspensos (< 5)
    else {
      return [255, 220, 220]; // Vermello moi claro
    }
  };

  // Función auxiliar para determinar a cor de fondo do estado (Aprobado/Suspenso)
  const getEstadoBackgroundColor = (estadoString: string): [number, number, number] | null => {
    // Limpar e normalizar a string
    const cleanEstado = estadoString?.toString().trim();
    
    // Aplicar cores según o estado
    if (cleanEstado === 'Aprobado') {
      return [220, 255, 220]; // Verde moi claro (igual que as notas aprobadas)
    } else if (cleanEstado === 'Suspenso') {
      return [255, 220, 220]; // Vermello moi claro (igual que as notas suspensas)
    }
    
    // Para outros estados (Pendente, Sen datos, etc.) non aplicar cor
    return null;
  };

  return (
    <div className="max-w-6xl mx-auto p-4 bg-white shadow-lg rounded-lg">
      <h1 className="text-2xl font-bold text-blue-800 mb-6">Xestión de Informes</h1>
      
      <div className="mb-6">
        <div>
          <h2 className="text-xl font-medium mb-4">Selecciona o tipo de informe</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div 
              className={`p-4 rounded-lg cursor-pointer border-2 transition-all ${
                selectedReport === 'alumnos' 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-blue-300'
              }`}
              onClick={() => setSelectedReport('alumnos')}
            >
              <h3 className="font-medium mb-2">Alumnos</h3>
              <p className="text-sm text-gray-600">
                Listado de alumnos matriculados
              </p>
            </div>
            
            <div 
              className={`p-4 rounded-lg cursor-pointer border-2 transition-all ${
                selectedReport === 'notas' 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-blue-300'
              }`}
              onClick={() => setSelectedReport('notas')}
            >
              <h3 className="font-medium mb-2">Notas</h3>
              <p className="text-sm text-gray-600">
                Boletíns de notas por alumno ou asignatura
              </p>
            </div>
            
            <div 
              className={`p-4 rounded-lg cursor-pointer border-2 transition-all ${
                selectedReport === 'estadisticas' 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-blue-300'
              }`}
              onClick={() => setSelectedReport('estadisticas')}
            >
              <h3 className="font-medium mb-2">Estatísticas</h3>
              <p className="text-sm text-gray-600">
                Relatorio completo de estatísticas por asignatura
              </p>
            </div>
            
            <div 
              className={`p-4 rounded-lg cursor-pointer border-2 transition-all ${
                selectedReport === 'boletins-masivos' 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-blue-300'
              }`}
              onClick={() => setSelectedReport('boletins-masivos')}
            >
              <h3 className="font-medium mb-2">Boletíns Masivos</h3>
              <p className="text-sm text-gray-600">
                Xerar boletíns individuais para todos os alumnos dunha asignatura
              </p>
            </div>
          </div>
          
          {/* Opción de estilo visual do PDF - sempre visible */}
          <div className="mt-6 max-w-md">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Estilo visual do PDF
            </label>
            <select 
              className="w-full p-2 border border-gray-300 rounded-md"
              value={colorTema || 'azul'}
              onChange={(e) => setColorTema(e.target.value)}
            >
              <option value="azul">Azul corporativo</option>
              <option value="verde">Verde</option>
              <option value="morado">Morado</option>
              <option value="elegante">Elegante (gris/negro)</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Aplícase a todos os tipos de informes
            </p>
          </div>
        </div>
        
        {selectedReport === 'alumnos' && (
          <div className="mb-6">
            <h3 className="font-medium mb-3">Opcións do informe de alumnos</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Incluír información de contacto
                </label>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    checked={includeContactInfo}
                    onChange={(e) => setIncludeContactInfo(e.target.checked)}
                  />
                  <span className="ml-2 text-sm text-gray-600">
                    Mostrar email e teléfono
                  </span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ordenar por
                </label>
                <select 
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={orderBy}
                  onChange={(e) => setOrderBy(e.target.value)}
                >
                  <option value="apellidos">Apelidos</option>
                  <option value="nombre">Nome</option>
                </select>
              </div>
            </div>
            
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Filtrar alumnos
                </label>
                <input
                  type="text"
                  placeholder="Buscar por nome ou apelidos..."
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={busquedaAlumno || ''}
                  onChange={(e) => setBusquedaAlumno(e.target.value)}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Filtrar por asignatura matriculada
                </label>
                <select 
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={filtroAlumnos || 'todos'}
                  onChange={(e) => setFiltroAlumnos(e.target.value)}
                >
                  <option value="todos">Todos os alumnos</option>
                  {asignaturas.map(asignatura => (
                    <option key={asignatura.id} value={asignatura.id}>
                      {asignatura.nome} ({asignatura.nivel} - {asignatura.curso}º)
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filtrar alumnos
              </label>
              <div className="flex gap-2">
                <select 
                  className="flex-1 p-2 border border-gray-300 rounded-md"
                  value={filtroAlumnos}
                  onChange={(e) => setFiltroAlumnos(e.target.value)}
                >
                  <option value="todos">Todos</option>
                  <option value="sin_notas">Sen notas</option>
                  <option value="con_notas">Con notas</option>
                </select>
                
                <input
                  type="text"
                  className="flex-1 p-2 border border-gray-300 rounded-md"
                  placeholder="Buscar por nome, apelidos, email..."
                  value={busquedaAlumno}
                  onChange={(e) => setBusquedaAlumno(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}
        
        {selectedReport === 'notas' && (
          <div className="mb-6">
            <h3 className="font-medium mb-3">Opcións do boletín de notas</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Asignatura
                </label>
                <select 
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={selectedAsignatura}
                  onChange={(e) => setSelectedAsignatura(e.target.value)}
                >
                  <option value="">Selecciona unha asignatura</option>
                  {asignaturas.map(asignatura => (
                    <option key={asignatura.id} value={asignatura.id}>
                      {asignatura.nome} ({asignatura.nivel} - {asignatura.curso}º)
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Alumno (Opcional - para boletín individual)
                </label>
                <select 
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={selectedAlumno}
                  onChange={(e) => setSelectedAlumno(e.target.value)}
                  disabled={!selectedAsignatura}
                >
                  <option value="">Todos os alumnos</option>
                  {selectedAsignatura && (
                    <AlumnosAsignaturaSelector 
                      asignaturaId={selectedAsignatura} 
                      onSelect={setSelectedAlumno} 
                    />
                  )}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Avaliación
                </label>
                <select 
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={selectedEvaluacion}
                  onChange={(e) => setSelectedEvaluacion(e.target.value)}
                >
                  <option value="todas">Todas as Avaliacións</option>
                  <option value="final">Nota Final</option>
                  <option value="1">1ª Avaliación</option>
                  <option value="2">2ª Avaliación</option>
                  <option value="3">3ª Avaliación</option>
                </select>
              </div>
            </div>
          </div>
        )}
        
        {selectedReport === 'estadisticas' && (
          <div className="mb-6">
            <h3 className="font-medium mb-3">Opcións do informe de estatísticas</h3>
            <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Asignatura <span className="text-red-500">*</span>
                </label>
                <select 
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={selectedAsignatura}
                  onChange={(e) => setSelectedAsignatura(e.target.value)}
                >
                  <option value="">Selecciona unha asignatura</option>
                  {asignaturas.map(asignatura => (
                    <option key={asignatura.id} value={asignatura.id}>
                      {asignatura.nome} ({asignatura.nivel} - {asignatura.curso}º)
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Selecciona a asignatura da que queres ver as estatísticas
                </p>
              </div>
            </div>
            
            {selectedAsignatura && (
              <div className="mt-4 p-3 bg-blue-50 border-l-4 border-blue-400 rounded">
                <p className="text-sm text-blue-700">
                  <strong>Informe seleccionado:</strong> Estatísticas completas da asignatura "
                  {asignaturas.find(a => a.id === selectedAsignatura)?.nome}"
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  O informe incluirá: distribución de notas, estatísticas por avaliación, 
                  taxa de aprobación e outros datos relevantes.
                </p>
              </div>
            )}
          </div>
        )}
        
        {selectedReport === 'boletins-masivos' && (
          <div className="mb-6">
            <h3 className="font-medium mb-3">Opcións dos boletíns masivos</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Asignatura <span className="text-red-500">*</span>
                </label>
                <select 
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={selectedAsignatura}
                  onChange={(e) => setSelectedAsignatura(e.target.value)}
                >
                  <option value="">Selecciona unha asignatura</option>
                  {asignaturas.map(asignatura => (
                    <option key={asignatura.id} value={asignatura.id}>
                      {asignatura.nome} ({asignatura.nivel} - {asignatura.curso}º)
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Selecciona a asignatura para xerar boletíns de todos os seus alumnos
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Avaliación
                </label>
                <select 
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={selectedEvaluacion}
                  onChange={(e) => setSelectedEvaluacion(e.target.value)}
                >
                  <option value="todas">Todas as avaliacións</option>
                  <option value="1">1ª Avaliación</option>
                  <option value="2">2ª Avaliación</option>
                  <option value="3">3ª Avaliación</option>
                  <option value="final">Nota final do curso</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Escolle que avaliacións incluír nos boletíns
                </p>
              </div>
            </div>
            
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de boletín
                </label>
                <select 
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={tipoBoletinMasivo}
                  onChange={(e) => setTipoBoletinMasivo(e.target.value as 'basico' | 'detallado')}
                >
                  <option value="basico">Básico - Só nota final por avaliación</option>
                  <option value="detallado">Detallado - Notas de todas as probas</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  O formato detallado mostra as notas de cada proba individual
                </p>
              </div>
            </div>
            
            {selectedAsignatura && (
              <div className="mt-4 p-3 bg-green-50 border-l-4 border-green-400 rounded">
                <p className="text-sm text-green-700">
                  <strong>Boletíns masivos {tipoBoletinMasivo === 'detallado' ? 'detallados' : 'básicos'}:</strong> Xerarase un PDF individual para cada alumno matriculado en "
                  {asignaturas.find(a => a.id === selectedAsignatura)?.nome}"
                </p>
                <p className="text-xs text-green-600 mt-1">
                  • Se hai múltiples alumnos, descargaranse nun arquivo ZIP<br/>
                  • Só se xerarán boletíns para alumnos con notas dispoñibles<br/>
                  • O nome de cada arquivo incluirá o nome do alumno e a asignatura<br/>
                  {tipoBoletinMasivo === 'detallado' && 
                    "• Formato detallado: mostra todas las probas de cada avaliación<br/>"
                  }
                  {tipoBoletinMasivo === 'basico' && 
                    "• Formato básico: mostra só a nota final de cada avaliación<br/>"
                  }
                </p>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end space-x-4">
          {/* Mensaje de validación si faltan datos */}
          {((selectedReport === 'notas' || selectedReport === 'estadisticas' || selectedReport === 'boletins-masivos') && !selectedAsignatura) && (
            <div className="flex items-center text-amber-600 mr-4">
              <svg className="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="text-sm">
                {selectedReport === 'estadisticas' ? 'Selecciona unha asignatura' : 
                 selectedReport === 'boletins-masivos' ? 'Selecciona unha asignatura' : 
                 'Selecciona unha asignatura'}
              </span>
            </div>
          )}
          
          <button
            onClick={handleGenerateReport}
            disabled={loading || ((selectedReport === 'notas' || selectedReport === 'estadisticas' || selectedReport === 'boletins-masivos') && !selectedAsignatura)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg flex items-center disabled:bg-blue-300 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Xerando...
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                Xerar Informe
              </>
            )}
          </button>
        </div>
      </div>
      
      {showPdfPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center border-b border-gray-200 px-6 py-3">
              <h3 className="text-xl font-bold text-blue-800">{pdfTitle}</h3>
              <div className="flex space-x-2">
                <button 
                  className="text-gray-500 hover:text-gray-700"
                  onClick={() => {
                  if (pdfUrl && pdfUrl.startsWith('blob:')) {
                    URL.revokeObjectURL(pdfUrl);
                  }
                  setShowPdfPreview(false);
                  setPdfUrl('');
                }}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-1 bg-gray-100">
              <iframe 
                ref={pdfIframeRef}
                src={pdfUrl} 
                className="w-full h-full border-0 bg-white" 
                title={`Vista previa de ${pdfTitle}`}
              />
            </div>
            <div className="flex justify-between items-center border-t border-gray-200 px-6 py-3">
              <div>
                <button 
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center"
                  onClick={() => {
                    // Descargar el PDF
                    const link = document.createElement('a');
                    link.href = pdfUrl;
                    link.download = `${pdfTitle.replace(/\s+/g, '_')}.pdf`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  Descargar PDF
                </button>
              </div>
              <div>
                <button 
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md flex items-center"
                  onClick={() => {
                    // Abrir en una nueva pestaña
                    window.open(pdfUrl, '_blank');
                  }}
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 003-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                  Abrir en nova pestana
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InformesPage;
