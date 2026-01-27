
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface SenafPDFData {
    fecha: string;
    spd: {
        nombre: string;
        telefono: string;
        email: string;
    };
    nna: {
        nombre_completo: string;
        dni: string;
        rnp: string;
        historia_clinica: string;
        cud: string;
        obra_social: string;
        escuela: string;
        grado: string;
        turno: string;
        domicilio_escuela: string;
        telefono_escuela: string;
        concurrencia: string;
        nivel_alcanzado: string;
        referente_escuela: string;
        trabaja: string;
        tipo_trabajo: string;
        tipo_familia: string;
    };
    grupo_familiar: any[];
    resena_situacion: string;
    derechos_vulnerados: any[];
    indicadores_vulneracion: string;
    medidas_implementadas: any[];
    fundamentacion: string;
    indicadores_riesgo: string[];
    agoto_medidas: boolean;
    riesgo_vida: boolean;
    firmas: string;
}

export const generateSenafPDF = (data: SenafPDFData) => {
    const doc = new jsPDF();
    let yPos = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - 2 * margin;

    const checkPageBreak = (needed: number) => {
        if (yPos + needed > 280) {
            doc.addPage();
            yPos = 20;
            return true;
        }
        return false;
    };

    // Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('SOLICITUD DE MEDIDA EXCEPCIONAL A SeNAF', pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    const fechaText = `Fecha: Córdoba, ${format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: es })}`;
    doc.text(fechaText, pageWidth - margin, yPos, { align: 'right' });
    yPos += 15;

    // Recipient
    doc.setFont('helvetica', 'bold');
    doc.text('A LA SECRETARÍA DE NIÑEZ,\nADOLESCENCIA Y FAMILIA\nSENAF - CÓRDOBA\nS--------------------/-------------------D', margin, yPos);
    yPos += 25;

    // Body Intro
    doc.setFont('helvetica', 'normal');
    const intro = `Por la presente, el Equipo Técnico del Servicio de Protección de Derechos de Niñas, Niños y Adolescentes (SPD) ${data.spd.nombre} Teléfono ${data.spd.telefono} Mail ${data.spd.email} dependiente de la Subdirección de Infancias, Juventudes y Familias de la Municipalidad de Córdoba, se dirige a Ud., y por su intermedio a quien corresponda, a los fines de SOLICITAR se adopte de manera URGENTE una MEDIDA EXCEPCIONAL a favor de ${data.nna.nombre_completo}, con el fin de promover el pleno ejercicio y goce de sus derechos vulnerados y la reparación de sus consecuencias, conforme al interés superior del niño, que exige la máxima e integral satisfacción de todos los derechos consagrados en la Convención sobre los Derechos del Niño.`;

    const introLines = doc.splitTextToSize(intro, contentWidth);
    doc.text(introLines, margin, yPos);
    yPos += (introLines.length * 6) + 10;

    // 1. Otros Datos
    checkPageBreak(10);
    doc.setFont('helvetica', 'bold');
    doc.text('1- OTROS DATOS de Niño/s, Niña/s o Adolescente/s.', margin, yPos);
    yPos += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const datosNNA = [
        `¿Está inscrito/a en el Registro Nacional de las Personas? ${data.nna.rnp}`,
        `DNI Nº: ${data.nna.dni}`,
        `- Centro de Salud donde se atiende: ${data.nna.historia_clinica ? '(Historia Clínica: ' + data.nna.historia_clinica + ')' : 'S/D'}`,
        `¿Posee CUD? ${data.nna.cud}. Obra Social: ${data.nna.obra_social}`,
        `- Escuela / Colegio al que concurre: ${data.nna.escuela}. Sala/Grado/Año: ${data.nna.grado}. Turno: ${data.nna.turno}`,
        `Domicilio: ${data.nna.domicilio_escuela}. Teléfono: ${data.nna.telefono_escuela}`,
        `Concurrencia escolar actual: ${data.nna.concurrencia}. Nivel Alcanzado: ${data.nna.nivel_alcanzado}. Referente: ${data.nna.referente_escuela}`,
        `Trabaja NNyA: ${data.nna.trabaja}. Tipo: ${data.nna.tipo_trabajo}`
    ];

    datosNNA.forEach(line => {
        checkPageBreak(6);
        doc.text(line, margin + 5, yPos);
        yPos += 6;
    });
    yPos += 4;

    // Grupo Familiar Table
    checkPageBreak(15);
    doc.setFont('helvetica', 'bold');
    doc.text('Grupo Conviviente y No Conviviente:', margin + 5, yPos);
    yPos += 5;

    autoTable(doc, {
        startY: yPos,
        margin: { left: margin + 5, right: margin },
        head: [['Nombre', 'Vínculo', 'Edad', 'Convive']],
        body: data.grupo_familiar.map(f => [f.nombre || '-', f.vinculo || '-', f.edad || '-', f.convive ? 'Si' : 'No']),
        theme: 'grid',
        styles: { fontSize: 8 }
    });
    yPos = (doc as any).lastAutoTable.finalY + 8;

    checkPageBreak(10);
    doc.text(`TIPO DE FAMILIA: ${data.nna.tipo_familia}`, margin + 5, yPos);
    yPos += 12;

    // 2. Reseña
    checkPageBreak(15);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('2- RESEÑA DE SITUACIÓN:', margin, yPos);
    yPos += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const resenaLines = doc.splitTextToSize(data.resena_situacion || 'Sin reseña proporcionada.', contentWidth);
    doc.text(resenaLines, margin + 5, yPos);
    yPos += (resenaLines.length * 5) + 12;

    // 3. Derechos
    checkPageBreak(15);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('3- DERECHOS VULNERADOS E INDICADORES:', margin, yPos);
    yPos += 8;

    autoTable(doc, {
        startY: yPos,
        margin: { left: margin + 5, right: margin },
        head: [['Derecho', 'Indicador', 'Principal']],
        body: data.derechos_vulnerados.map(d => [d.catalogo_derechos?.categoria || '-', d.indicador || '-', d.es_principal ? 'Si' : 'No']),
        theme: 'grid',
        styles: { fontSize: 8 }
    });
    yPos = (doc as any).lastAutoTable.finalY + 8;

    // 4. Medidas Form 6
    checkPageBreak(15);
    doc.setFont('helvetica', 'bold');
    doc.text('4- MEDIDAS DE PROTECCIÓN IMPLEMENTADAS:', margin, yPos);
    yPos += 8;

    autoTable(doc, {
        startY: yPos,
        margin: { left: margin + 5, right: margin },
        head: [['Medida', 'Acción', 'Responsable']],
        body: data.medidas_implementadas.map(m => [m.medida_propuesta, m.acciones?.map((a: any) => a.accion).join(', ') || '-', m.responsables || '-']),
        theme: 'grid',
        styles: { fontSize: 8 }
    });
    yPos = (doc as any).lastAutoTable.finalY + 12;

    // 5. Valoracion
    checkPageBreak(40);
    doc.setFont('helvetica', 'bold');
    doc.text('5- VALORACIÓN PROFESIONAL:', margin, yPos);
    yPos += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const valIntro = "Este equipo de trabajo ha intentado realizar abordaje desde segundo nivel de intervención con la familia, no habiendo logrado revertir las situaciones problemáticas y de riesgo a causa de las cuales se recibió la derivación.";
    const valIntroLines = doc.splitTextToSize(valIntro, contentWidth);
    doc.text(valIntroLines, margin + 5, yPos);
    yPos += (valIntroLines.length * 5) + 5;

    const fundLines = doc.splitTextToSize(data.fundamentacion, contentWidth);
    doc.text(fundLines, margin + 5, yPos);
    yPos += (fundLines.length * 5) + 8;

    doc.setFont('helvetica', 'bold');
    doc.text('Factores e indicadores de riesgo identificados:', margin + 5, yPos);
    yPos += 6;
    doc.setFont('helvetica', 'normal');
    data.indicadores_riesgo.forEach(ind => {
        checkPageBreak(5);
        doc.text(`• ${ind}`, margin + 10, yPos);
        yPos += 5;
    });
    yPos += 5;

    const concl = "Que se han cumplimentado las medidas dispuestas por los Art. 41 y Art. 42 y siguientes, de la Ley Provincial N° 9944 y las estrategias específicas de intervención dispuestas por este equipo. Habiendo fracasado las medidas de protección, se consideran agotadas las instancias de intervención correspondientes al 1º y 2º nivel del Sistema de Protección Integral de Derechos de nnya.\nEn virtud de ello:";
    const conclLines = doc.splitTextToSize(concl, contentWidth);
    doc.text(conclLines, margin, yPos);
    yPos += (conclLines.length * 5) + 10;

    // Resolution
    checkPageBreak(30);
    doc.setFont('helvetica', 'bold');
    doc.text('SE RESUELVE el CESE DE LAS MEDIDAS DE PROTECCIÓN DE DERECHOS y la SOLICITUD DE LA MEDIDA EXCEPCIONAL A SENAF en razón de:', margin, yPos);
    yPos += 10;

    doc.setFont('helvetica', 'normal');
    doc.text(`1- Haber agotado las Medidas de protección posibles... (Art. 42, 45, 48 y 51 Ley 9944) [${data.agoto_medidas ? 'X' : ' '}]`, margin + 5, yPos);
    yPos += 8;
    doc.text(`2- Que la permanencia en su medio familiar implica un grave riesgo... (Art. 42 y 51 Ley 9944) [${data.riesgo_vida ? 'X' : ' '}]`, margin + 5, yPos);
    yPos += 15;

    doc.text('Consideramos procedente la intervención de SeNAF a los fines de valorar la aplicación de una MEDIDA EXCEPCIONAL en relación a las niñas/o de referencia.\nSin más, saludamos Atte.-', margin, yPos);
    yPos += 20;

    // Signatures
    checkPageBreak(30);
    doc.setFont('helvetica', 'italic');
    doc.text('Firma y aclaración de profesionales del SPD solicitante', margin, yPos);
    yPos += 15;
    doc.line(margin, yPos, margin + 60, yPos);
    doc.line(margin + 80, yPos, margin + 140, yPos);

    doc.save(`Solicitud_SENAF_${data.nna.nombre_completo.replace(' ', '_')}.pdf`);
};
