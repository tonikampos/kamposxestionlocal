import React, { useState, useEffect, useRef } from 'react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable'; // Volvemos a activar autoTable ahora que sabemos que funciona
import { useRealtimeAuth } from '../../firebase/RealtimeAuthContext';
import { dataManager } from '../../utils/dataManager';
import type { Alumno, Asignatura, NotaAlumno, Avaliacion, NotaAvaliacion } from '../../utils/storageManager';

// Ampliar la definición de jsPDF para TypeScript
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
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
  const [selectedEvaluacion, setSelectedEvaluacion] = useState<string>('final');
  const [includeContactInfo, setIncludeContactInfo] = useState(false);
  const [orderBy, setOrderBy] = useState('apellidos');
  const [nivelEducativo, setNivelEducativo] = useState('todos');
  
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
        case 'asignaturas':
          console.log('Generando informe de asignaturas...');
          await generateAsignaturasReport();
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
          alert('Función non implementada aínda');
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
      
      // Ordenar según el criterio seleccionado
      if (orderBy === 'apellidos') {
        alumnosDelProfesor.sort((a, b) => a.apelidos.localeCompare(b.apelidos));
      } else if (orderBy === 'nombre') {
        alumnosDelProfesor.sort((a, b) => a.nome.localeCompare(b.nome));
      }
      
      // Crear PDF
      console.log("Creando documento PDF...");
      const doc = new jsPDF();
      
      // Añadir título
      const title = 'Listado de Alumnos';
      doc.setFontSize(18);
      doc.text(title, 14, 22);
      
      // Añadir información del profesor
      doc.setFontSize(12);
      doc.text(`Profesor: ${currentUser.nome} ${currentUser.apelidos}`, 14, 32);
      doc.text(`Data: ${new Date().toLocaleDateString('gl-ES')}`, 14, 38);
      
      // Crear tabla de alumnos con autoTable
      const tableColumn = includeContactInfo 
        ? ['Nome', 'Apelidos', 'Email', 'Teléfono'] 
        : ['Nome', 'Apelidos'];
      
      const tableRows = alumnosDelProfesor.map(alumno => {
        if (includeContactInfo) {
          return [alumno.nome, alumno.apelidos, alumno.email, alumno.telefono || ''];
        } else {
          return [alumno.nome, alumno.apelidos];
        }
      });
      
      // Intentar usar autoTable si está disponible
      try {
        doc.autoTable({
          head: [tableColumn],
          body: tableRows,
          startY: 45,
          headStyles: {
            fillColor: [66, 135, 245],
            textColor: 255
          },
          alternateRowStyles: {
            fillColor: [240, 240, 240]
          }
        });
      } catch (tableError) {
        console.warn("Error al generar tabla con autoTable:", tableError);
        // Fallback: crear una tabla simple si autoTable falla
        let yPos = 45;
        doc.setFontSize(11);
        
        // Encabezado simple
        tableColumn.forEach((col, index) => {
          doc.text(col, 20 + (index * 40), yPos);
        });
        yPos += 10;
        
        // Datos simples
        tableRows.forEach(row => {
          row.forEach((cell, index) => {
            doc.text(cell, 20 + (index * 40), yPos);
          });
          yPos += 7;
        });
      }
      
      // Mostrar el PDF en el modal en lugar de descargarlo
      showPdfInModal(doc, `Listado de Alumnos`);
      
      console.log("Informe de alumnos generado con éxito");
      return doc; // Retornar el documento por si se necesita en otro lugar
    } catch (error) {
      console.error("Error en generateAlumnosReport:", error);
      throw error;
    }
  };
  
  // Función para generar informe de asignaturas
  const generateAsignaturasReport = async () => {
    try {
      console.log("Iniciando generación de informe de asignaturas...");
      
      if (!currentUser) {
        console.error("No hay usuario autenticado");
        return;
      }
      
      // Obtener las asignaturas del profesor directamente de dataManager
      // en vez de usar el estado que podría estar vacío o desactualizado
      const asignaturasDelProfesor = await dataManager.getAsignaturasByProfesor(currentUser.id);
      console.log(`Asignaturas iniciales obtenidas del dataManager: ${asignaturasDelProfesor.length}`, 
        asignaturasDelProfesor.map(a => ({ id: a.id, nombre: a.nome, nivel: a.nivel, curso: a.curso })));
      
      // Verificamos que tenemos el ID del profesor actual
      console.log(`ID del profesor actual: ${currentUser.id}`);
      
      // Lista filtrada que vamos a usar para el informe
      let asignaturasParaInforme = [...asignaturasDelProfesor];
      
      // Filtrar por nivel educativo si se ha seleccionado uno específico
      if (nivelEducativo !== 'todos') {
        console.log(`Filtrando por nivel educativo: ${nivelEducativo}`);
        asignaturasParaInforme = asignaturasParaInforme.filter(
          asignatura => asignatura.nivel === nivelEducativo
        );
        console.log(`Después de filtrar por nivel ${nivelEducativo}: ${asignaturasParaInforme.length} asignaturas`);
      }
      
      // Ordenar según el criterio seleccionado
      if (orderBy === 'nombre') {
        asignaturasParaInforme.sort((a, b) => a.nome.localeCompare(b.nome));
        console.log("Ordenando asignaturas por nombre");
      } else if (orderBy === 'curso') {
        asignaturasParaInforme.sort((a, b) => a.curso - b.curso);
        console.log("Ordenando asignaturas por curso");
      } else if (orderBy === 'horas') {
        asignaturasParaInforme.sort((a, b) => a.sesionsSemanais - b.sesionsSemanais);
        console.log("Ordenando asignaturas por horas semanales");
      }
      
      console.log(`Número de asignaturas para el informe después de filtrar y ordenar: ${asignaturasParaInforme.length}`);
      console.log("Datos de asignaturas para el informe:", 
        asignaturasParaInforme.map(a => ({ nombre: a.nome, nivel: a.nivel, curso: a.curso })));
      
      // Si no hay asignaturas, mostramos un mensaje
      if (asignaturasParaInforme.length === 0) {
        alert('Non se atoparon asignaturas para xerar o informe');
        console.error("No hay asignaturas para generar el informe");
        return;
      }
      
      // Crear PDF
      console.log("Creando documento PDF...");
      const doc = new jsPDF();
      
      // Añadir título
      const title = 'Listado de Asignaturas';
      doc.setFontSize(18);
      doc.text(title, 14, 22);
      
      // Añadir información del profesor
      doc.setFontSize(12);
      doc.text(`Profesor: ${currentUser.nome} ${currentUser.apelidos}`, 14, 32);
      doc.text(`Data: ${new Date().toLocaleDateString('gl-ES')}`, 14, 38);
      
      // Añadir información del filtro si se aplicó
      if (nivelEducativo !== 'todos') {
        doc.text(`Nivel: ${nivelEducativo}`, 14, 44);
      }
      
      // Crear tabla de asignaturas con autoTable
      const tableColumn = ['Nome', 'Nivel', 'Curso', 'Sesións Semanais', 'Avaliacións'];
      
      // Procesamos los datos asegurándonos de que no haya valores undefined o null
      const tableRows = asignaturasParaInforme.map(asignatura => [
        asignatura.nome || '',
        asignatura.nivel || '',
        asignatura.curso ? `${asignatura.curso}º` : '',
        asignatura.sesionsSemanais ? asignatura.sesionsSemanais.toString() : '',
        asignatura.numeroAvaliaciois ? asignatura.numeroAvaliaciois.toString() : ''
      ]);
      
      // Mostrar los datos que se van a incluir en la tabla para debugging
      console.log("Datos para la tabla de asignaturas:", tableRows);
      
      try {
        const startY = nivelEducativo !== 'todos' ? 50 : 45;
        doc.autoTable({
          head: [tableColumn],
          body: tableRows,
          startY: startY,
          headStyles: {
            fillColor: [66, 135, 245],
            textColor: 255
          },
          alternateRowStyles: {
            fillColor: [240, 240, 240]
          }
        });
      } catch (tableError) {
        console.error("Error al generar tabla con autoTable:", tableError);
        // Fallback: crear una tabla simple si autoTable falla
        let yPos = nivelEducativo !== 'todos' ? 50 : 45;
        doc.setFontSize(11);
        
        // Encabezado simple
        tableColumn.forEach((col, index) => {
          doc.text(col, 20 + (index * 30), yPos);
        });
        yPos += 10;
        
        // Datos simples
        tableRows.forEach(row => {
          row.forEach((cell, index) => {
            doc.text(cell.toString(), 20 + (index * 30), yPos);
          });
          yPos += 7;
        });
      }
      
      // Mostrar el PDF en el modal en lugar de descargarlo
      showPdfInModal(doc, `Listado_Asignaturas_${currentUser.nome}`);
      
      console.log("Informe de asignaturas generado con éxito");
      return doc; // Retornar el documento por si se necesita en otro lugar
    } catch (error) {
      console.error("Error en generateAsignaturasReport:", error);
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
      
      console.log("Creando documento PDF...");
      // Crear PDF
      const doc = new jsPDF();
      
      // Añadir título
      const title = 'Boletín Individual de Notas';
      doc.setFontSize(18);
      doc.text(title, 14, 22);
      
      // Añadir información
      doc.setFontSize(12);
      doc.text(`Alumno: ${alumno.nome} ${alumno.apelidos}`, 14, 32);
      doc.text(`Asignatura: ${asignatura.nome} (${asignatura.nivel} - ${asignatura.curso}º)`, 14, 38);
      doc.text(`Profesor: ${currentUser.nome} ${currentUser.apelidos}`, 14, 44);
      doc.text(`Data: ${new Date().toLocaleDateString('gl-ES')}`, 14, 50);
      
      // Crear tabla de notas
      const tableColumn = ['Avaliación', 'Probas', 'Nota'];
      const tableRows: string[][] = [];
      
      // Procesar las notas para cada evaluación
      notasAlumno.notasAvaliaciois.forEach((notaAval: { avaliacionId: string; notasProbas: any[]; notaFinal?: number }) => {
        const avaliacion = asignatura.configuracionAvaliacion?.avaliaciois.find(
          av => av.id === notaAval.avaliacionId
        );
        
        if (avaliacion) {
          // Añadir las notas de cada prueba
          notaAval.notasProbas.forEach((notaProba: { probaId: string; valor: number; observacions?: string }) => {
            const proba = avaliacion.probas.find(p => p.id === notaProba.probaId);
            if (proba) {
              tableRows.push([
                `${avaliacion.numero}ª Avaliación`,
                `${proba.nome} (${proba.porcentaxe}%)`,
                `${notaProba.valor.toFixed(2)}`
              ]);
            }
          });
          
          // Añadir la nota final de la evaluación
          if (notaAval.notaFinal !== undefined) {
            tableRows.push([
              `${avaliacion.numero}ª Avaliación`,
              'Nota Final',
              `${notaAval.notaFinal.toFixed(2)}`
            ]);
          }
        }
      });
      
      // Añadir la nota final del curso
      if (notasAlumno.notaFinal !== undefined) {
        tableRows.push([
          'Curso Completo',
          'Nota Final',
          `${notasAlumno.notaFinal.toFixed(2)}`
        ]);
      }
      
      doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 56,
        headStyles: {
          fillColor: [66, 135, 245],
          textColor: 255
        },
        alternateRowStyles: {
          fillColor: [240, 240, 240]
        }
      });
      
      // Mostrar el PDF en el modal en lugar de descargarlo
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
      
      console.log("Creando documento PDF...");
      // Crear PDF
      const doc = new jsPDF();
      
      // Añadir título
      const title = 'Boletín de Notas por Asignatura';
      doc.setFontSize(18);
      doc.text(title, 14, 22);
      
      // Añadir información
      doc.setFontSize(12);
      doc.text(`Asignatura: ${asignatura.nome} (${asignatura.nivel} - ${asignatura.curso}º)`, 14, 32);
      doc.text(`Profesor: ${currentUser.nome} ${currentUser.apelidos}`, 14, 38);
      doc.text(`Data: ${new Date().toLocaleDateString('gl-ES')}`, 14, 44);
      doc.text(`Avaliación: ${selectedEvaluacion === 'final' ? 'Final' : selectedEvaluacion + 'ª Avaliación'}`, 14, 50);
      
      // Crear tabla de notas
      const tableColumn = ['Alumno', 'Nota'];
      const tableRows: string[][] = [];
      
      // Procesar las notas para cada alumno
      alumnosMatriculados.forEach((alumno: Alumno) => {
        const notaAlumno = notasAsignatura.find((n: NotaAlumno) => n.alumnoId === alumno.id);
        
        if (notaAlumno) {
          if (selectedEvaluacion === 'final') {
            // Mostrar nota final del curso
            const notaFinal = notaAlumno.notaFinal !== undefined
              ? notaAlumno.notaFinal.toFixed(2)
              : 'N/A';
            
            tableRows.push([
              `${alumno.nome} ${alumno.apelidos}`,
              notaFinal
            ]);
          } else {
            // Mostrar nota de la evaluación seleccionada
            const evalNum = parseInt(selectedEvaluacion);
            const notaAval = notaAlumno.notasAvaliaciois.find((na: NotaAvaliacion) => {
              const avaliacion = asignatura.configuracionAvaliacion?.avaliaciois.find(av => av.id === na.avaliacionId);
              return avaliacion?.numero === evalNum;
            });
            
            const notaEval = notaAval?.notaFinal !== undefined
              ? notaAval.notaFinal.toFixed(2)
              : 'N/A';
            
            tableRows.push([
              `${alumno.nome} ${alumno.apelidos}`,
              notaEval
            ]);
          }
        } else {
          tableRows.push([
            `${alumno.nome} ${alumno.apelidos}`,
            'Sen avaliar'
          ]);
        }
      });
      
      doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 56,
        headStyles: {
          fillColor: [66, 135, 245],
          textColor: 255
        },
        alternateRowStyles: {
          fillColor: [240, 240, 240]
        }
      });
      
      // Mostrar el PDF en el modal en lugar de descargarlo
      showPdfInModal(doc, `Notas_${asignatura.nome}_${selectedEvaluacion === 'final' ? 'Final' : selectedEvaluacion + 'Avaliacion'}`);
      
      console.log("Informe de notas por asignatura generado con éxito");
      return doc;
    } catch (error) {
      console.error("Error en generateNotasAsignaturaReport:", error);
      throw error;
    }
  };

  // Función de prueba para un PDF simple
  const testSimplePDF = () => {
    try {
      console.log("Probando generación de PDF simple...");
      
      // Crear un PDF básico muy simple para diagnóstico
      const doc = new jsPDF();
      
      // Añadir título
      doc.setFontSize(18);
      doc.setTextColor(0, 0, 128);
      doc.text("Proba de xeración de PDF", 20, 20);
      
      // Añadir texto básico
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text(`Data: ${new Date().toLocaleDateString('gl-ES')}`, 20, 30);
      doc.text("Este é un PDF de proba para verificar a visualización no modal", 20, 40);
      doc.text("Se podes ler este texto, a xeración básica funciona correctamente", 20, 50);
      
      // Añadir texto de instrucciones
      doc.setTextColor(0, 128, 0);
      doc.text("- Comproba que o texto é lexible", 20, 70);
      doc.text("- Comproba que os botóns de imprimir e descargar funcionan", 20, 80);
      doc.text("- Se hai problemas, usa o botón para abrir o PDF nunha nova pestana", 20, 90);
      
      // Mostrar en el modal en lugar de descargar directamente
      showPdfInModal(doc, "Test de visualización de PDF");
      
      console.log("PDF de prueba básico generado con éxito y mostrado en modal");
    } catch (error) {
      console.error("Error al generar PDF de prueba:", error);
      alert("Error ao xerar o PDF de proba. Revisa a consola para máis detalles.");
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
      alert('Ocorreu un erro ao xerar a vista previa do PDF');
    }
  };
  
  // Función para imprimir el PDF actual
  const printCurrentPdf = () => {
    try {
      console.log("Intentando imprimir PDF...");
      if (pdfIframeRef.current && pdfIframeRef.current.contentWindow) {
        // Intentamos imprimir desde el iframe
        pdfIframeRef.current.contentWindow.focus();
        setTimeout(() => {
          try {
            pdfIframeRef.current?.contentWindow?.print();
            console.log("Comando de impresión enviado al navegador");
          } catch (printError) {
            console.error("Error durante la impresión:", printError);
            // Plan B: Abrir el PDF en una nueva ventana
            window.open(pdfUrl, '_blank')?.print();
          }
        }, 500); // Damos tiempo para que el PDF se cargue completamente
      } else {
        // Si no podemos acceder al iframe, intentamos abrir en nueva ventana
        console.log("No se pudo acceder al iframe, intentando abrir en nueva ventana");
        window.open(pdfUrl, '_blank');
      }
    } catch (error) {
      console.error("Error al imprimir:", error);
      console.error("Detalles:", error instanceof Error ? error.message : String(error));
      
      // Ofrecemos alternativa al usuario
      if (confirm("Non se puido imprimir directamente. Queres abrir o PDF nunha nova pestana?")) {
        window.open(pdfUrl, '_blank');
      }
    }
  };
  
  // Función para descargar el PDF currente
  const downloadCurrentPdf = () => {
    try {
      console.log("Intentando descargar PDF...");
      // Crear un enlace temporal para la descarga
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = `${pdfTitle}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log("PDF descargado correctamente");
    } catch (error) {
      console.error("Error al descargar el PDF:", error);
      alert("Error ao descargar o PDF. Revisa a consola para máis detalles.");
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-blue-800 mb-6">Xestión de Informes</h1>
      
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Selecciona o tipo de informe</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div 
              className={`p-4 rounded-lg cursor-pointer border-2 transition-all ${
                selectedReport === 'alumnos' 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-blue-300'
              }`}
              onClick={() => setSelectedReport('alumnos')}
            >
              <h3 className="font-medium mb-2">Listado de Alumnos</h3>
              <p className="text-sm text-gray-600">
                Informe completo dos alumnos matriculados
              </p>
            </div>
            
            <div 
              className={`p-4 rounded-lg cursor-pointer border-2 transition-all ${
                selectedReport === 'asignaturas' 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-blue-300'
              }`}
              onClick={() => setSelectedReport('asignaturas')}
            >
              <h3 className="font-medium mb-2">Listado de Asignaturas</h3>
              <p className="text-sm text-gray-600">
                Informe das asignaturas dispoñibles
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
              <h3 className="font-medium mb-2">Boletín de Notas</h3>
              <p className="text-sm text-gray-600">
                Boletín de notas por alumno
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
              <h3 className="font-medium mb-2">Estadísticas</h3>
              <p className="text-sm text-gray-600">
                Estatísticas de rendemento académico
              </p>
            </div>
          </div>
        </div>
        
        {selectedReport === 'alumnos' && (
          <div className="mb-6">
            <h3 className="font-medium mb-3">Opcións do informe de alumnos</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              
              <div className="md:col-span-2">
                <label className="flex items-center">
                  <input 
                    type="checkbox" 
                    className="mr-2" 
                    checked={includeContactInfo}
                    onChange={(e) => setIncludeContactInfo(e.target.checked)}
                  />
                  <span className="text-sm text-gray-700">Incluír datos de contacto</span>
                </label>
              </div>
            </div>
          </div>
        )}
        
        {selectedReport === 'asignaturas' && (
          <div className="mb-6">
            <h3 className="font-medium mb-3">Opcións do informe de asignaturas</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nivel educativo
                </label>
                <select 
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={nivelEducativo}
                  onChange={(e) => setNivelEducativo(e.target.value)}
                >
                  <option value="todos">Todos os niveis</option>
                  <option value="SMR">SMR</option>
                  <option value="DAW">DAW</option>
                  <option value="DAM">DAM</option>
                  <option value="FPBASICA">FP Básica</option>
                  <option value="ESO">ESO</option>
                  <option value="BACHILLERATO">Bacharelato</option>
                  <option value="OUTROS">Outros</option>
                </select>
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
                  <option value="nombre">Nome</option>
                  <option value="curso">Curso</option>
                  <option value="horas">Horas semanais</option>
                </select>
              </div>
            </div>
          </div>
        )}
        
        {selectedReport === 'notas' && (
          <div className="mb-6">
            <h3 className="font-medium mb-3">Opcións do boletín de notas</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <option value="final">Avaliación Final</option>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de estatística
                </label>
                <select className="w-full p-2 border border-gray-300 rounded-md">
                  <option value="media">Nota media por asignatura</option>
                  <option value="aprobados">Porcentaxe de aprobados</option>
                  <option value="suspensos">Porcentaxe de suspensos</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Periodo
                </label>
                <select className="w-full p-2 border border-gray-300 rounded-md">
                  <option value="actual">Curso actual</option>
                  <option value="anterior">Curso anterior</option>
                  <option value="comparativa">Comparativa</option>
                </select>
              </div>
            </div>
          </div>
        )}
        
        <div className="flex justify-end space-x-4">
          <button
            onClick={testSimplePDF}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Test Visualización PDF
          </button>
          <button
            onClick={handleGenerateReport}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg disabled:bg-blue-300 flex items-center"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Xerando...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Xerar Informe
              </>
            )}
          </button>
        </div>
      </div>
      
      {/* Modal de previsualización de PDF */}
      {showPdfPreview && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-4xl w-full mx-4">
            <div className="flex justify-between items-center mb-4 border-b pb-3">
              <h3 className="text-xl font-bold text-blue-800">{pdfTitle}</h3>
              
              <button
                onClick={() => {
                  // Limpiar URL del blob al cerrar para evitar memory leaks
                  if (pdfUrl && pdfUrl.startsWith('blob:')) {
                    URL.revokeObjectURL(pdfUrl);
                  }
                  setShowPdfPreview(false);
                  setPdfUrl('');
                }}
                className="text-gray-500 hover:text-red-700 transition-colors"
                aria-label="Pechar"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="mb-4 border rounded-lg overflow-hidden">
              {pdfUrl ? (
                <>
                  <div className="bg-blue-50 p-3 border-b flex items-center justify-between">
                    <p className="text-blue-800 text-sm">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline-block mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Se non podes ver o PDF correctamente, 
                      <button 
                        onClick={() => window.open(pdfUrl, '_blank')}
                        className="text-blue-600 hover:text-blue-800 font-medium px-1"
                      >
                        fai clic aquí para abrilo nunha nova pestana
                      </button>.
                    </p>
                  </div>
                  <iframe 
                    ref={pdfIframeRef}
                    src={pdfUrl}
                    className="w-full h-[65vh] md:h-[60vh] lg:h-[65vh]"
                    frameBorder="0"
                    title={`Vista previa de ${pdfTitle}`}
                    allow="clipboard-write; clipboard-read"
                    onError={(e) => {
                      console.error("Error cargando el iframe:", e);
                    }}
                  ></iframe>
                </>
              ) : (
                <div className="w-full h-[70vh] flex items-center justify-center bg-gray-100">
                  <p className="text-gray-600">Cargando PDF...</p>
                </div>
              )}
            </div>
            
            <div className="flex justify-end space-x-3 mt-2">
              <button
                onClick={printCurrentPdf}
                className="flex items-center bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-lg transition-colors font-medium"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2z" />
                </svg>
                Imprimir
              </button>
              
              <button
                onClick={downloadCurrentPdf}
                className="flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Descargar PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InformesPage;
