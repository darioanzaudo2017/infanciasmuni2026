import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface IngresoData {
    id: number;
    expediente_numero: string;
    numero_ingreso: number;
    fecha_ingreso: string;
    estado: string;
    etapa: string;
    nino_nombre: string;
    nino_apellido: string;
    nino_dni: string;
    nino_fecha_nacimiento: string;
    nino_genero: string;
    nino_domicilio?: string;
    nino_localidad?: string;
    nino_centro_salud?: string;
    nino_cobertura_medica?: string;
    nino_nivel_educativo?: string;
    nino_institucion_educativa?: string;
    derivacion?: any;
    motivo?: any;
    vulneraciones?: any[];
    grupo_familiar?: any[];
    referentes?: any[];
    decision?: any;
    planificacion?: any;
    intervenciones?: any[];
    informe_sintesis?: any;
    cese?: any;
    documentos?: any[];
    senaf?: any;
    senaf_seguimiento?: any[];
}

interface MedidaData {
    id: number;
    medida_propuesta: string;
    estado: string;
    responsables?: string;
    created_at: string;
    acciones?: any[];
}

// Labels for closure reasons
const motivoLabels: Record<string, string> = {
    'restitucion_integral': 'Restitución integral de los derechos vulnerados',
    'incumplimiento_estrategias': 'Incumplimiento reiterado de las estrategias acordadas',
    'fallecimiento': 'Fallecimiento del NNA',
    'otra_causal': 'Otra causal que impide la continuidad de intervención',
    'cambio_residencia': 'Cambio de ciudad de residencia',
    'solicitud_medida_excepcional': 'Solicitud de medida excepcional (SENAF)'
};

export const generateExpedientePDF = async (
    ingreso: IngresoData,
    medidas: MedidaData[]
) => {
    // Debug: ver qué datos estamos recibiendo
    console.log('=== GENERANDO PDF ===');
    console.log('Informe Síntesis:', ingreso.informe_sintesis);
    console.log('Medidas recibidas:', medidas);
    console.log('Intervenciones:', ingreso.intervenciones);

    const doc = new jsPDF();
    let yPos = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pageWidth - 2 * margin;

    // Helper function to add new page if needed
    const checkPageBreak = (neededSpace: number) => {
        if (yPos + neededSpace > pageHeight - 20) {
            doc.addPage();
            yPos = 20;
            return true;
        }
        return false;
    };

    // Helper to add main stage title (ETAPA)
    const addStageTitle = (number: string, title: string) => {
        checkPageBreak(20);
        doc.setFillColor(37, 123, 244);
        doc.rect(margin, yPos, contentWidth, 12, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(`ETAPA ${number}: ${title.toUpperCase()}`, margin + 3, yPos + 8);
        doc.setTextColor(0, 0, 0);
        yPos += 18;
    };

    // Helper to add section title
    const addSectionTitle = (title: string) => {
        checkPageBreak(12);
        doc.setFillColor(230, 235, 240);
        doc.rect(margin, yPos, contentWidth, 8, 'F');
        doc.setTextColor(37, 123, 244);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(title, margin + 2, yPos + 5.5);
        doc.setTextColor(0, 0, 0);
        yPos += 12;
    };

    // Helper to add field
    const addField = (label: string, value: string) => {
        checkPageBreak(10);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text(label + ':', margin, yPos);
        doc.setFont('helvetica', 'normal');
        const lines = doc.splitTextToSize(value || 'N/A', contentWidth - 50);
        doc.text(lines, margin + 50, yPos);
        yPos += lines.length * 5 + 2;
    };

    // Helper to add text block
    const addTextBlock = (label: string, text: string) => {
        if (!text) return;

        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');

        // Calculate space needed for label
        checkPageBreak(10);
        doc.text(label + ':', margin, yPos);
        yPos += 5;

        // Split text properly to fit within margins
        doc.setFont('helvetica', 'normal');
        const lines = doc.splitTextToSize(text, contentWidth - 5); // Extra margin for safety

        // Check if we need page break for the content
        const linesHeight = lines.length * 5;
        checkPageBreak(linesHeight + 5);

        doc.text(lines, margin + 2, yPos);
        yPos += linesHeight + 3;
    };

    // ========== HEADER ==========
    doc.setFillColor(240, 242, 245);
    doc.rect(0, 0, pageWidth, 40, 'F');

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(37, 123, 244);
    doc.text('EXPEDIENTE COMPLETO', pageWidth / 2, 15, { align: 'center' });

    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    doc.text(`Legajo #${ingreso.expediente_numero} • Ingreso #${ingreso.numero_ingreso}`, pageWidth / 2, 25, { align: 'center' });
    doc.text(`Generado: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })}`, pageWidth / 2, 32, { align: 'center' });

    doc.setTextColor(0, 0, 0);
    yPos = 50;

    // ========== DATOS FILIATORIOS (Siempre al inicio) ==========
    addSectionTitle('DATOS FILIATORIOS DEL NIÑO, NIÑA O ADOLESCENTE');

    addField('Apellido y Nombre', `${ingreso.nino_apellido}, ${ingreso.nino_nombre}`);
    addField('DNI', ingreso.nino_dni);
    addField('Fecha de Nacimiento', format(new Date(ingreso.nino_fecha_nacimiento), "dd/MM/yyyy", { locale: es }));
    addField('Género', ingreso.nino_genero);
    addField('Domicilio', ingreso.nino_domicilio || 'No especificado');
    addField('Localidad', ingreso.nino_localidad || 'No especificado');
    addField('Centro de Salud', ingreso.nino_centro_salud || 'No especificado');
    addField('Cobertura Médica', ingreso.nino_cobertura_medica || 'No especificado');
    addField('Nivel Educativo', ingreso.nino_nivel_educativo || 'No especificado');
    addField('Institución Educativa', ingreso.nino_institucion_educativa || 'No especificado');

    yPos += 8;

    // ========== ETAPA 1: RECEPCIÓN ==========
    addStageTitle('1', 'RECEPCIÓN');

    addField('Fecha de Ingreso', format(new Date(ingreso.fecha_ingreso), "dd/MM/yyyy", { locale: es }));
    addField('Vía de Ingreso', ingreso.derivacion?.via_ingreso || 'No especificado');
    addField('Organismo Derivante', ingreso.derivacion?.organismo_derivante || 'No especificado');
    addField('Motivo de Consulta', ingreso.motivo?.motivo_consulta || 'No especificado');

    yPos += 3;
    addTextBlock('Descripción de la Situación', ingreso.motivo?.descripcion_situacion);

    // Derechos Vulnerados
    if (ingreso.vulneraciones && ingreso.vulneraciones.length > 0) {
        yPos += 3;
        addSectionTitle('Derechos Vulnerados Identificados');

        ingreso.vulneraciones.forEach((vuln: any) => {
            checkPageBreak(6);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.text(`• ${vuln.catalogo_derechos?.categoria || 'N/A'} - ${vuln.catalogo_derechos?.subcategoria || ''}`, margin + 3, yPos);
            yPos += 5;
        });
        yPos += 3;
    }

    // Grupo Familiar
    if (ingreso.grupo_familiar && ingreso.grupo_familiar.length > 0) {
        yPos += 3;
        addSectionTitle('Grupo Conviviente');

        autoTable(doc, {
            startY: yPos,
            head: [['Nombre', 'Vínculo', 'Edad', 'Ocupación']],
            body: ingreso.grupo_familiar.map((fam: any) => [
                fam.nombre || 'N/A',
                fam.vinculo || 'N/A',
                fam.edad?.toString() || 'N/A',
                fam.ocupacion || 'N/A'
            ]),
            theme: 'grid',
            headStyles: { fillColor: [37, 123, 244], fontSize: 9 },
            bodyStyles: { fontSize: 8 },
            margin: { left: margin, right: margin }
        });

        yPos = (doc as any).lastAutoTable.finalY + 8;
    }

    // Red de Apoyo (Referentes)
    if (ingreso.referentes && ingreso.referentes.length > 0) {
        yPos += 3;
        addSectionTitle('Red de Apoyo');

        autoTable(doc, {
            startY: yPos,
            head: [['Nombre', 'Vínculo', 'Teléfono', 'Observaciones']],
            body: ingreso.referentes.map((ref: any) => [
                ref.nombre || 'N/A',
                ref.vinculo || 'N/A',
                ref.telefono || 'N/A',
                ref.observaciones || '-'
            ]),
            theme: 'grid',
            headStyles: { fillColor: [37, 123, 244], fontSize: 9 },
            bodyStyles: { fontSize: 8 },
            margin: { left: margin, right: margin }
        });

        yPos = (doc as any).lastAutoTable.finalY + 8;
    }

    // Decisión
    if (ingreso.decision) {
        yPos += 3;
        addSectionTitle('Decisión Adoptada');

        // Format decision_id: replace underscores and capitalize
        const decisionText = ingreso.decision.decision_id
            ? ingreso.decision.decision_id.split('_').map((word: string) =>
                word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' ')
            : 'No especificado';

        addField('Decisión', decisionText);
        addTextBlock('Fundamentación', ingreso.decision.observaciones);
    }

    yPos += 5;

    // ========== ETAPA 2: AMPLIACIÓN ==========
    if (ingreso.planificacion || (ingreso.intervenciones && ingreso.intervenciones.length > 0)) {
        addStageTitle('2', 'AMPLIACIÓN');

        // Planificación
        if (ingreso.planificacion) {
            addSectionTitle('Planificación de la Intervención');

            addTextBlock('Objetivos', ingreso.planificacion.objetivos);
            addTextBlock('Estrategias', ingreso.planificacion.estrategias);

            if (ingreso.planificacion.plazo_estimado) {
                addField('Plazo Estimado', ingreso.planificacion.plazo_estimado);
            }

            yPos += 5;
        }

        // Intervenciones/Entrevistas
        if (ingreso.intervenciones && ingreso.intervenciones.length > 0) {
            addSectionTitle(`Intervenciones Realizadas (${ingreso.intervenciones.length})`);

            autoTable(doc, {
                startY: yPos,
                head: [['Fecha', 'Entrevistado', 'Vínculo', 'Modalidad', 'Asistencia']],
                body: ingreso.intervenciones.map((inter: any) => [
                    format(new Date(inter.fecha), "dd/MM/yyyy", { locale: es }),
                    inter.entrevistado_nombre || 'N/A',
                    inter.vinculo || 'N/A',
                    inter.modalidad || 'N/A',
                    inter.asistencia || 'N/A'
                ]),
                theme: 'grid',
                headStyles: { fillColor: [37, 123, 244], fontSize: 9 },
                bodyStyles: { fontSize: 8 },
                margin: { left: margin, right: margin }
            });

            yPos = (doc as any).lastAutoTable.finalY + 8;

            // Detalle de intervenciones con observaciones/registro
            if (ingreso.intervenciones.some((i: any) => i.registro || i.observaciones)) {
                addSectionTitle('Registro de Intervenciones');

                ingreso.intervenciones.forEach((inter: any) => {
                    const contenido = inter.registro || inter.observaciones;
                    if (contenido) {
                        checkPageBreak(15);
                        doc.setFontSize(9);
                        doc.setFont('helvetica', 'bold');
                        doc.text(`${format(new Date(inter.fecha), "dd/MM/yyyy", { locale: es })} - ${inter.entrevistado_nombre}:`, margin, yPos);
                        yPos += 5;
                        doc.setFont('helvetica', 'normal');
                        const obsLines = doc.splitTextToSize(contenido, contentWidth);
                        doc.text(obsLines, margin, yPos);
                        yPos += obsLines.length * 5 + 5;
                    }
                });
            }
        }

        yPos += 5;
    }

    // ========== ETAPA 3: INFORME SÍNTESIS ==========
    if (ingreso.informe_sintesis) {
        addStageTitle('3', 'INFORME SÍNTESIS');

        addTextBlock('Fundamento Normativo', ingreso.informe_sintesis.fundamento_normativo);
        addTextBlock('Valoración Integral', ingreso.informe_sintesis.valoracion_integral);
        addTextBlock('Plan de Acción', ingreso.informe_sintesis.plan_accion);

        yPos += 5;
    }

    // ========== ETAPA 4: DEFINICIÓN DE MEDIDAS ==========
    if (medidas && medidas.length > 0) {
        addStageTitle('4', 'DEFINICIÓN DE MEDIDAS');

        for (let i = 0; i < medidas.length; i++) {
            const medida = medidas[i];
            checkPageBreak(25);

            // Medida header
            doc.setFillColor(245, 247, 250);
            doc.rect(margin, yPos, contentWidth, 10, 'F');
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(37, 123, 244);
            doc.text(`MEDIDA ${i + 1}: ${medida.medida_propuesta}`, margin + 2, yPos + 6);
            doc.setTextColor(0, 0, 0);
            yPos += 12;

            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.text(`Estado: ${medida.estado || 'Activa'}`, margin + 2, yPos);
            doc.text(`Fecha: ${format(new Date(medida.created_at), "dd/MM/yyyy", { locale: es })}`, margin + 60, yPos);
            if (medida.responsables) {
                doc.text(`Responsables: ${medida.responsables}`, margin + 120, yPos);
            }
            yPos += 7;

            // Acciones de la medida
            if (medida.acciones && medida.acciones.length > 0) {
                doc.setFontSize(9);
                doc.setFont('helvetica', 'bold');
                doc.text(`Acciones (${medida.acciones.length}):`, margin + 3, yPos);
                yPos += 5;

                medida.acciones.forEach((accion: any) => {
                    checkPageBreak(10);
                    doc.setFontSize(8);
                    doc.setFont('helvetica', 'normal');

                    const estadoBadge = accion.estado === 'completada' ? '✓' : accion.estado === 'en_proceso' ? '⟳' : '○';
                    const accionText = `${estadoBadge} ${accion.descripcion || 'N/A'}`;
                    const accionLines = doc.splitTextToSize(accionText, contentWidth - 15);
                    doc.text(accionLines, margin + 8, yPos);
                    yPos += accionLines.length * 4 + 1;

                    if (accion.fecha_limite) {
                        doc.setTextColor(100, 100, 100);
                        doc.text(`   Plazo: ${format(new Date(accion.fecha_limite), "dd/MM/yyyy", { locale: es })}`, margin + 8, yPos);
                        doc.setTextColor(0, 0, 0);
                        yPos += 4;
                    }
                });

                yPos += 3;
            } else {
                doc.setFontSize(8);
                doc.setTextColor(150, 150, 150);
                doc.text('Sin acciones registradas', margin + 5, yPos);
                doc.setTextColor(0, 0, 0);
                yPos += 5;
            }

            yPos += 5;
        }
    }

    // ========== ETAPA 5: CESE DE INTERVENCIÓN ==========
    if (ingreso.cese) {
        addStageTitle('5', 'CESE DE INTERVENCIÓN');

        addField('Fecha de Cierre', ingreso.cese.fecha_cierre ? format(new Date(ingreso.cese.fecha_cierre), "dd/MM/yyyy", { locale: es }) : 'N/A');

        addField('Motivo de Cese', motivoLabels[ingreso.cese.motivo_cese] || ingreso.cese.motivo_cese);

        yPos += 3;
        addTextBlock('Resumen de Logros Alcanzados', ingreso.cese.resumen_logros);
        addTextBlock('Observaciones Finales', ingreso.cese.observaciones_finales);
    }

    // ========== SOLICITUD SENAF (si existe) ==========
    if (ingreso.senaf) {
        addStageTitle('6', 'SOLICITUD DE MEDIDA EXCEPCIONAL (SENAF)');

        addField('Estado de la Solicitud', ingreso.senaf.estado || 'En elaboración');
        addField('Fecha de Solicitud', ingreso.senaf.fecha_solicitud ? format(new Date(ingreso.senaf.fecha_solicitud), "dd/MM/yyyy", { locale: es }) : 'N/A');
        addField('Agotó Medidas de Protección', ingreso.senaf.agoto_medidas ? 'Sí' : 'No');
        addField('Riesgo Grave para la Vida', ingreso.senaf.riesgo_vida ? 'Sí' : 'No');

        yPos += 3;
        addTextBlock('Reseña de la Situación', ingreso.senaf.causa);
        addTextBlock('Fundamentación', ingreso.senaf.fundamentacion);

        if (ingreso.senaf.documento_url) {
            addField('Documento Firmado', 'Adjunto disponible');
        }

        // Historial de seguimiento SENAF
        if (ingreso.senaf_seguimiento && ingreso.senaf_seguimiento.length > 0) {
            yPos += 5;
            addSectionTitle('Historial de Seguimiento SENAF');

            autoTable(doc, {
                startY: yPos,
                head: [['Fecha', 'Estado', 'Responsable', 'Observación']],
                body: ingreso.senaf_seguimiento.map((seg: any) => [
                    seg.fecha ? format(new Date(seg.fecha), "dd/MM/yyyy HH:mm", { locale: es }) : 'N/A',
                    seg.estado || seg.estado_nuevo || 'N/A',
                    seg.usuarios?.nombre_completo || seg.responsable || 'Sistema',
                    seg.observacion || seg.observaciones || '-'
                ]),
                theme: 'grid',
                headStyles: { fillColor: [37, 123, 244], fontSize: 9 },
                bodyStyles: { fontSize: 8 },
                margin: { left: margin, right: margin },
                columnStyles: {
                    0: { cellWidth: 35 },
                    1: { cellWidth: 40 },
                    2: { cellWidth: 40 },
                    3: { cellWidth: 'auto' }
                }
            });

            yPos = (doc as any).lastAutoTable.finalY + 8;
        }

        yPos += 5;
    }

    // ========== DOCUMENTOS ADJUNTOS ==========
    if (ingreso.documentos && ingreso.documentos.length > 0) {
        checkPageBreak(40);
        yPos += 10;

        addStageTitle('', 'DOCUMENTOS ADJUNTOS');

        autoTable(doc, {
            startY: yPos,
            head: [['Nombre del Documento', 'Tipo', 'Fecha de Carga']],
            body: ingreso.documentos.map((doc: any) => [
                doc.nombre || 'Sin nombre',
                doc.subcategoria || doc.tipo || 'N/A',
                doc.created_at ? format(new Date(doc.created_at), "dd/MM/yyyy HH:mm", { locale: es }) : 'N/A'
            ]),
            theme: 'grid',
            headStyles: { fillColor: [37, 123, 244], fontSize: 9, fontStyle: 'bold' },
            bodyStyles: { fontSize: 8 },
            margin: { left: margin, right: margin },
            columnStyles: {
                0: { cellWidth: 'auto' },
                1: { cellWidth: 50 },
                2: { cellWidth: 40 }
            }
        });

        yPos = (doc as any).lastAutoTable.finalY + 10;
    }

    // ========== MAPA HISTÓRICO DEL PROCESO ==========
    doc.addPage();
    yPos = 20;

    doc.setFillColor(37, 123, 244);
    doc.rect(margin, yPos, contentWidth, 12, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('MAPA HISTÓRICO DEL PROCESO', margin + 3, yPos + 8);
    doc.setTextColor(0, 0, 0);
    yPos += 20;

    // Timeline vertical line
    const timelineX = pageWidth / 2;

    // Helper to draw timeline node
    const drawTimelineNode = (number: string, title: string, date: string, details: string[], isCompleted: boolean = true) => {
        checkPageBreak(40);

        // Draw vertical line segment
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(1);
        doc.line(timelineX, yPos - 10, timelineX, yPos + 30);

        // Draw circle node
        if (isCompleted) {
            doc.setFillColor(37, 123, 244);
        } else {
            doc.setFillColor(200, 200, 200);
        }
        doc.circle(timelineX, yPos, 8, 'F');

        // Draw number in circle
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(number, timelineX, yPos + 3, { align: 'center' });

        // Draw title
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(title, timelineX + 15, yPos);

        // Draw date
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text(date, timelineX + 15, yPos + 5);

        yPos += 12;

        // Draw details
        doc.setFontSize(8);
        doc.setTextColor(60, 60, 60);
        details.forEach(detail => {
            doc.text(`• ${detail}`, timelineX + 15, yPos);
            yPos += 4;
        });

        yPos += 10;
    };

    // Stage 1: Recepción
    const recepcionDetails = [
        `Vía: ${ingreso.derivacion?.via_ingreso || 'N/A'}`,
        `Derechos vulnerados: ${ingreso.vulneraciones?.length || 0}`,
        `Grupo familiar: ${ingreso.grupo_familiar?.length || 0} personas`
    ];
    drawTimelineNode('1', 'RECEPCIÓN', format(new Date(ingreso.fecha_ingreso), "dd/MM/yyyy", { locale: es }), recepcionDetails, true);

    // Stage 2: Planificación (if exists)
    if (ingreso.planificacion) {
        const planDetails = [
            'Plan de intervención definido',
            ingreso.planificacion.plazo_estimado ? `Plazo: ${ingreso.planificacion.plazo_estimado}` : 'Plazo no especificado'
        ];
        drawTimelineNode('2', 'PLANIFICACIÓN', ingreso.planificacion.created_at ? format(new Date(ingreso.planificacion.created_at), "dd/MM/yyyy", { locale: es }) : 'N/A', planDetails, true);
    }

    // Stage 3: Ampliación (if interventions exist)
    if (ingreso.intervenciones && ingreso.intervenciones.length > 0) {
        const ampDetails = [
            `${ingreso.intervenciones.length} intervenciones realizadas`,
            `Última: ${format(new Date(ingreso.intervenciones[0].fecha), "dd/MM/yyyy", { locale: es })}`
        ];
        const stageNum = ingreso.planificacion ? '3' : '2';
        drawTimelineNode(stageNum, 'AMPLIACIÓN', format(new Date(ingreso.intervenciones[ingreso.intervenciones.length - 1].fecha), "dd/MM/yyyy", { locale: es }), ampDetails, true);
    }

    // Stage 4: Informe Síntesis (if exists)
    if (ingreso.informe_sintesis) {
        const informeDetails = [
            'Diagnóstico de situación completado',
            'Valoración integral realizada'
        ];
        let stageNum = '2';
        if (ingreso.planificacion) stageNum = '3';
        if (ingreso.intervenciones && ingreso.intervenciones.length > 0) stageNum = String(Number(stageNum) + 1);

        drawTimelineNode(stageNum, 'INFORME SÍNTESIS', ingreso.informe_sintesis.created_at ? format(new Date(ingreso.informe_sintesis.created_at), "dd/MM/yyyy", { locale: es }) : 'N/A', informeDetails, true);
    }

    // Stage 5: Definición de Medidas (if exists)
    if (medidas && medidas.length > 0) {
        const medidasDetails = [
            `${medidas.length} medida${medidas.length !== 1 ? 's' : ''} de protección`,
            `Acciones totales: ${medidas.reduce((sum, m) => sum + (m.acciones?.length || 0), 0)}`
        ];
        let stageNum = '2';
        if (ingreso.planificacion) stageNum = '3';
        if (ingreso.intervenciones && ingreso.intervenciones.length > 0) stageNum = String(Number(stageNum) + 1);
        if (ingreso.informe_sintesis) stageNum = String(Number(stageNum) + 1);

        drawTimelineNode(stageNum, 'DEFINICIÓN DE MEDIDAS', medidas[0].created_at ? format(new Date(medidas[0].created_at), "dd/MM/yyyy", { locale: es }) : 'N/A', medidasDetails, true);
    }

    // Stage 6: Cese (if exists)
    if (ingreso.cese) {
        const ceseDetails = [
            motivoLabels[ingreso.cese.motivo_cese] || ingreso.cese.motivo_cese,
            'Caso cerrado'
        ];
        let stageNum = '2';
        if (ingreso.planificacion) stageNum = '3';
        if (ingreso.intervenciones && ingreso.intervenciones.length > 0) stageNum = String(Number(stageNum) + 1);
        if (ingreso.informe_sintesis) stageNum = String(Number(stageNum) + 1);
        if (medidas && medidas.length > 0) stageNum = String(Number(stageNum) + 1);

        drawTimelineNode(stageNum, 'CESE', ingreso.cese.fecha_cierre ? format(new Date(ingreso.cese.fecha_cierre), "dd/MM/yyyy", { locale: es }) : 'N/A', ceseDetails, true);
    } else {
        // Show pending closure
        const pendingDetails = [
            'Caso activo',
            'Cierre pendiente'
        ];
        let stageNum = '2';
        if (ingreso.planificacion) stageNum = '3';
        if (ingreso.intervenciones && ingreso.intervenciones.length > 0) stageNum = String(Number(stageNum) + 1);
        if (ingreso.informe_sintesis) stageNum = String(Number(stageNum) + 1);
        if (medidas && medidas.length > 0) stageNum = String(Number(stageNum) + 1);

        drawTimelineNode(stageNum, 'CESE', 'Pendiente', pendingDetails, false);
    }

    // ========== FOOTER ON ALL PAGES ==========
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
            `Página ${i} de ${pageCount} • SIPNNA - Sistema de Protección Integral`,
            pageWidth / 2,
            pageHeight - 10,
            { align: 'center' }
        );
    }

    // Save PDF
    const fileName = `Expediente_${ingreso.expediente_numero}_Ingreso_${ingreso.numero_ingreso}.pdf`;
    doc.save(fileName);
};
