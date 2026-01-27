
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, AlignmentType, WidthType } from 'docx';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface SenafWordData {
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

export const generateSenafWord = async (data: SenafWordData) => {
    const doc = new Document({
        sections: [{
            properties: {},
            children: [
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                        new TextRun({
                            text: "SOLICITUD DE MEDIDA EXCEPCIONAL A SeNAF",
                            bold: true,
                            size: 28,
                        }),
                    ],
                }),
                new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [
                        new TextRun({
                            text: `Fecha: Córdoba, ${format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: es })}`,
                            size: 22,
                        }),
                    ],
                    spacing: { before: 200, after: 400 },
                }),
                new Paragraph({
                    children: [
                        new TextRun({
                            text: "A LA SECRETARÍA DE NIÑEZ,\nADOLESCENCIA Y FAMILIA\nSENAF - CÓRDOBA\nS--------------------/-------------------D",
                            bold: true,
                            size: 22,
                        }),
                    ],
                    spacing: { after: 400 },
                }),
                new Paragraph({
                    children: [
                        new TextRun({
                            text: `Por la presente, el Equipo Técnico del Servicio de Protección de Derechos de Niñas, Niños y Adolescentes (SPD) ${data.spd.nombre} Teléfono ${data.spd.telefono} Mail ${data.spd.email} dependiente de la Subdirección de Infancias, Juventudes y Familias de la Municipalidad de Córdoba, se dirige a Ud., y por su intermedio a quien corresponda, a los fines de SOLICITAR se adopte de manera URGENTE una MEDIDA EXCEPCIONAL a favor de `,
                            size: 22,
                        }),
                        new TextRun({
                            text: data.nna.nombre_completo,
                            bold: true,
                            size: 22,
                        }),
                        new TextRun({
                            text: `, con el fin de promover el pleno ejercicio y goce de sus derechos vulnerados y la reparación de sus consecuencias, conforme al interés superior del niño, que exige la máxima e integral satisfacción de todos los derechos consagrados en la Convención sobre los Derechos del Niño.`,
                            size: 22,
                        }),
                    ],
                    spacing: { after: 400 },
                }),

                // 1. OTROS DATOS
                new Paragraph({
                    children: [
                        new TextRun({
                            text: "1- OTROS DATOS de Niño/s, Niña/s o Adolescente/s.",
                            bold: true,
                            size: 22,
                        }),
                    ],
                    spacing: { before: 200 },
                }),
                new Paragraph({ children: [new TextRun({ text: `¿Está inscrito/a en el Registro Nacional de las Personas? ${data.nna.rnp}`, size: 20 })] }),
                new Paragraph({ children: [new TextRun({ text: `DNI Nº: ${data.nna.dni}`, size: 20 })] }),
                new Paragraph({ children: [new TextRun({ text: `- Centro de Salud donde se atiende: ${data.nna.historia_clinica}`, size: 20 })] }),
                new Paragraph({ children: [new TextRun({ text: `¿Posee CUD? ${data.nna.cud}. Obra Social: ${data.nna.obra_social}`, size: 20 })] }),
                new Paragraph({ children: [new TextRun({ text: `- Escuela / Colegio al que concurre: ${data.nna.escuela}. Sala/Grado/Año: ${data.nna.grado}. Turno: ${data.nna.turno}`, size: 20 })] }),
                new Paragraph({ children: [new TextRun({ text: `Domicilio: ${data.nna.domicilio_escuela}. Teléfono: ${data.nna.telefono_escuela}`, size: 20 })] }),
                new Paragraph({ children: [new TextRun({ text: `Concurrencia escolar actual: ${data.nna.concurrencia}. Nivel Alcanzado: ${data.nna.nivel_alcanzado}. Referente: ${data.nna.referente_escuela}`, size: 20 })] }),
                new Paragraph({ children: [new TextRun({ text: `Trabaja NNyA: ${data.nna.trabaja}. Tipo: ${data.nna.tipo_trabajo}`, size: 20 })] }),

                new Paragraph({
                    children: [new TextRun({ text: "Grupo Conviviente y No Conviviente:", bold: true, size: 20 })],
                    spacing: { before: 200 },
                }),

                // GF Table
                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: [
                        new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Nombre", bold: true, size: 18 })] })] }),
                                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Vínculo", bold: true, size: 18 })] })] }),
                                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Edad", bold: true, size: 18 })] })] }),
                                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Convive", bold: true, size: 18 })] })] }),
                            ],
                        }),
                        ...data.grupo_familiar.map(f => new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: f.nombre || '-', size: 18 })] })] }),
                                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: f.vinculo || '-', size: 18 })] })] }),
                                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: f.edad?.toString() || '-', size: 18 })] })] }),
                                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: f.convive ? 'Si' : 'No', size: 18 })] })] }),
                            ],
                        })),
                    ],
                }),

                new Paragraph({
                    children: [new TextRun({ text: `TIPO DE FAMILIA: ${data.nna.tipo_familia}`, size: 20 })],
                    spacing: { before: 200, after: 400 },
                }),

                // 2. RESEÑA
                new Paragraph({
                    children: [new TextRun({ text: "2- RESEÑA DE SITUACIÓN:", bold: true, size: 22 })],
                }),
                new Paragraph({
                    children: [new TextRun({ text: data.resena_situacion || "Sin reseña.", size: 20 })],
                    spacing: { after: 400 },
                }),

                // 3. DERECHOS
                new Paragraph({
                    children: [new TextRun({ text: "3- DERECHOS VULNERADOS:", bold: true, size: 22 })],
                }),
                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: [
                        new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Derecho", bold: true, size: 18 })] })] }),
                                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Indicador", bold: true, size: 18 })] })] }),
                            ],
                        }),
                        ...data.derechos_vulnerados.map(d => new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: d.catalogo_derechos?.categoria || '-', size: 18 })] })] }),
                                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: d.indicador || '-', size: 18 })] })] }),
                            ],
                        })),
                    ],
                }),

                // 4. MEDIDAS
                new Paragraph({
                    children: [new TextRun({ text: "4- MEDIDAS DE PROTECCIÓN IMPLEMENTADAS:", bold: true, size: 22 })],
                    spacing: { before: 400 },
                }),
                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: [
                        new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Medida", bold: true, size: 18 })] })] }),
                                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Acciones", bold: true, size: 18 })] })] }),
                                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Responsable", bold: true, size: 18 })] })] }),
                            ],
                        }),
                        ...data.medidas_implementadas.map(m => new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: m.medida_propuesta, size: 18 })] })] }),
                                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: m.acciones?.map((a: any) => a.accion).join(', ') || '-', size: 18 })] })] }),
                                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: m.responsables || '-', size: 18 })] })] }),
                            ],
                        })),
                    ],
                }),

                // 5. VALORACION
                new Paragraph({
                    children: [new TextRun({ text: "5- VALORACIÓN PROFESIONAL:", bold: true, size: 22 })],
                    spacing: { before: 400 },
                }),
                new Paragraph({
                    children: [new TextRun({ text: "Este equipo de trabajo ha intentado realizar abordaje desde segundo nivel de intervención con la familia, no habiendo logrado revertir las situaciones problemáticas y de riesgo a causa de las cuales se recibió la derivación.", size: 20 })],
                }),
                new Paragraph({
                    children: [new TextRun({ text: data.fundamentacion, size: 20 })],
                    spacing: { after: 200 },
                }),
                new Paragraph({
                    children: [new TextRun({ text: "Factores e indicadores de riesgo identificación:", bold: true, size: 20 })],
                }),
                ...data.indicadores_riesgo.map(ind => new Paragraph({
                    children: [new TextRun({ text: `• ${ind}`, size: 20 })],
                })),

                new Paragraph({
                    children: [new TextRun({ text: "Que se han cumplimentado las medidas dispuestas por los Art. 41 y Art. 42 y siguientes, de la Ley Provincial N° 9944 y las estrategias específicas de intervención dispuestas por este equipo. Habiendo fracasado las medidas de protección, se consideran agotadas las instancias de intervención correspondientes al 1º y 2º nivel del Sistema de Protección Integral de Derechos de nnya.\nEn virtud de ello:", size: 20 })],
                    spacing: { before: 200, after: 400 },
                }),

                new Paragraph({
                    children: [new TextRun({ text: "SE RESUELVE el CESE DE LAS MEDIDAS DE PROTECCIÓN DE DERECHOS y la SOLICITUD DE LA MEDIDA EXCEPCIONAL A SENAF en razón de:", bold: true, size: 22 })],
                }),
                new Paragraph({ children: [new TextRun({ text: `1- Haber agotado las Medidas de protección posibles... [${data.agoto_medidas ? 'X' : ' '}]`, size: 22 })] }),
                new Paragraph({ children: [new TextRun({ text: `2- Que la permanencia en su medio familiar implica un grave riesgo... [${data.riesgo_vida ? 'X' : ' '}]`, size: 22 })] }),

                new Paragraph({
                    children: [new TextRun({ text: "Consideramos procedente la intervención de SeNAF a los fines de valorar la aplicación de una MEDIDA EXCEPCIONAL en relación a las niñas/o de referencia.\nSin más, saludamos Atte.-", size: 20 })],
                    spacing: { before: 400, after: 800 },
                }),

                new Paragraph({
                    children: [new TextRun({ text: "Firma y aclaración de profesionales del SPD solicitante", italics: true, size: 20 })],
                }),
                new Paragraph({
                    children: [new TextRun({ text: "_________________________          _________________________", size: 20 })],
                }),
            ],
        }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `Solicitud_SENAF_${data.nna.nombre_completo.replace(' ', '_')}.docx`);
};
