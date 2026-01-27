import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { PDFDownloadLink } from '@react-pdf/renderer';
import IntervencionesPDF from './IntervencionesPDF';
import { generateExpedientePDF } from './generateExpedientePDF';
import Breadcrumbs from '../../../components/ui/Breadcrumbs';

interface IngresoDetalle {
    id: number;
    expediente_id: number;
    numero_ingreso: number;
    fecha_ingreso: string;
    es_emergencia: boolean;
    etapa: string;
    estado: string;
    fecha_cierre: string | null;
    motivo_cierre: string | null;
    expediente_numero: string;
    expediente_activo: boolean;
    nino_nombre: string;
    nino_apellido: string;
    nino_dni: string;
    nino_fecha_nacimiento: string;
    nino_genero: string;
    nino_foto_url?: string;
    ultimo_profesional_nombre: string | null;
    profesional_asignado_nombre: string | null;
    nino_domicilio?: string;
    nino_localidad?: string;
    nino_barrio?: string;
    nino_centro_salud?: string;
    nino_historia_clinica?: string;
    nino_tiene_cud?: boolean;
    nino_cobertura_medica?: string;
    nino_nivel_educativo?: string;
    nino_curso?: string;
    nino_turno?: string;
    nino_institucion_educativa?: string;
    nino_asiste_regularmente?: boolean;
    nino_observaciones_salud?: string;
    derivacion?: any;
    motivo?: any;
    vulneraciones?: any[];
    grupo_familiar?: any[];
    referentes?: any[];
    decision?: any;
    documentos?: any[];
    planificacion?: any;
    intervenciones?: any[];
    informe_sintesis?: any;
    cese?: any;
}

const IngresoDetail = () => {
    const { ingresoId } = useParams<{ expedienteId: string; ingresoId: string }>();
    const navigate = useNavigate();
    const [ingreso, setIngreso] = useState<IngresoDetalle | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('recepcion');
    const [measuresSummary, setMeasuresSummary] = useState<any[]>([]);
    const [transferHistory, setTransferHistory] = useState<any[]>([]);

    useEffect(() => {
        const fetchDetail = async () => {
            setLoading(true);
            setIngreso(null); // Clear previous data
            try {
                const { data, error } = await supabase
                    .from('vw_ingresos_detalle')
                    .select('*')
                    .eq('id', ingresoId)
                    .single();

                if (error) throw error;
                const ingresoData = data as IngresoDetalle;

                // Fetch extra data
                const [
                    { data: derivacion },
                    { data: motivo },
                    { data: vulnerabilityData },
                    { data: familyData },
                    { data: supportData },
                    { data: decisionData },
                    { data: docData },
                    { data: extraNinoData },
                    { data: planData },
                    { data: interData },
                    { data: informeData },
                    { data: ceseData }
                ] = await Promise.all([
                    supabase.from('form1_derivacion').select('*').eq('ingreso_id', ingresoId).maybeSingle(),
                    supabase.from('form1_motivo').select('*').eq('ingreso_id', ingresoId).maybeSingle(),
                    supabase.from('derechos_vulnerados').select('*, catalogo_derechos(categoria, subcategoria)').eq('ingreso_id', ingresoId),
                    supabase.from('grupo_conviviente').select('*').eq('ingreso_id', ingresoId),
                    supabase.from('referentes_comunitarios').select('*').eq('ingreso_id', ingresoId),
                    supabase.from('form1_decision').select('*').eq('ingreso_id', ingresoId).maybeSingle(),
                    supabase.from('documentos').select('*').eq('ingreso_id', ingresoId),
                    supabase.from('form1_datos_nino').select('*').eq('ingreso_id', ingresoId).maybeSingle(),
                    supabase.from('form2_planificacion').select('*, form2_equipo(usuario_id)').eq('ingreso_id', ingresoId).maybeSingle(),
                    supabase.from('form2_intervenciones').select('*').eq('ingreso_id', ingresoId).order('fecha', { ascending: false }).order('hora', { ascending: false }),
                    supabase.from('form3_informe_sintesis').select('*').eq('ingreso_id', ingresoId).maybeSingle(),
                    supabase.from('form9_cese_ingreso').select('*').eq('ingreso_id', ingresoId).maybeSingle()
                ]);

                setIngreso({
                    ...ingresoData,
                    // Map historical situation data to the template fields
                    nino_domicilio: extraNinoData?.domicilio || ingresoData.nino_domicilio,
                    nino_localidad: extraNinoData?.localidad || ingresoData.nino_localidad,
                    nino_centro_salud: extraNinoData?.centro_salud || ingresoData.nino_centro_salud,
                    nino_historia_clinica: extraNinoData?.historia_clinica || ingresoData.nino_historia_clinica,
                    nino_tiene_cud: extraNinoData?.tiene_cud ?? ingresoData.nino_tiene_cud,
                    nino_cobertura_medica: extraNinoData?.obra_social || ingresoData.nino_cobertura_medica,
                    nino_nivel_educativo: extraNinoData?.nivel_educativo || ingresoData.nino_nivel_educativo,
                    nino_curso: extraNinoData?.curso || ingresoData.nino_curso,
                    nino_turno: extraNinoData?.turno || ingresoData.nino_turno,
                    nino_institucion_educativa: extraNinoData?.escuela || ingresoData.nino_institucion_educativa,
                    nino_asiste_regularmente: extraNinoData?.asiste_regularmente ?? ingresoData.nino_asiste_regularmente,
                    nino_observaciones_salud: extraNinoData?.observaciones_salud || ingresoData.nino_observaciones_salud,

                    derivacion,
                    motivo,
                    vulneraciones: vulnerabilityData || [],
                    grupo_familiar: familyData || [],
                    referentes: supportData || [],
                    decision: decisionData,
                    documentos: docData || [],
                    planificacion: planData,
                    intervenciones: interData || [],
                    informe_sintesis: informeData,
                    cese: ceseData
                });
            } catch (error) {
                console.error('Error fetching detail:', error);
            } finally {
                setLoading(false);
            }
        };

        if (ingresoId) {
            void fetchDetail();
        }
    }, [ingresoId]);

    // Fetch SPDs and Transfer History
    useEffect(() => {
        const fetchTransferRelated = async () => {
            if (!ingreso?.expediente_id) return;

            const { data: history } = await supabase.from('transferencias_expedientes')
                .select('*, spd_origen:servicios_proteccion!spd_origen_id(nombre), spd_destino:servicios_proteccion!spd_destino_id(nombre), usuario_emisor:usuarios(nombre_completo)')
                .eq('expediente_id', ingreso.expediente_id)
                .order('created_at', { ascending: false });

            setTransferHistory(history || []);
        };

        if (ingreso) {
            fetchTransferRelated();
        }
    }, [ingreso]);

    useEffect(() => {
        const fetchMeasures = async () => {
            if (!ingresoId) return;

            // Fetch measures
            const { data: medidasData } = await supabase
                .from('medidas')
                .select('id, medida_propuesta, estado, responsables, created_at')
                .eq('ingreso_id', ingresoId)
                .order('created_at', { ascending: false });

            if (medidasData) {
                // Fetch actions for each measure
                const medidasConAcciones = await Promise.all(
                    medidasData.map(async (medida) => {
                        const { data: acciones } = await supabase
                            .from('acciones')
                            .select('*')
                            .eq('medida_id', medida.id)
                            .order('created_at', { ascending: false });

                        return {
                            ...medida,
                            acciones: acciones || []
                        };
                    })
                );

                setMeasuresSummary(medidasConAcciones);
            }
        }
        if (ingreso && (ingreso.etapa === 'definicion' || ingreso.etapa === 'Definición' || activeTab === 'definicion' || activeTab === 'historial')) {
            fetchMeasures();
        }
    }, [ingresoId, ingreso, activeTab]);

    const handleFinalizeStage = async () => {
        if (!ingreso || !ingreso.id) return;

        let nextStage = '';
        if (ingreso.etapa === 'Recepción') nextStage = 'ampliacion';
        else if (ingreso.etapa === 'Ampliación') nextStage = 'informe_sintesis';
        else if (ingreso.etapa === 'Informe Síntesis' || ingreso.etapa === 'informe_sintesis') nextStage = 'definicion';
        else if (ingreso.etapa === 'Definición' || ingreso.etapa === 'definicion') nextStage = 'cerrado';

        if (nextStage) {
            const confirm = window.confirm(`¿Está seguro que desea finalizar la etapa ${ingreso.etapa} y avanzar a ${nextStage}?`);
            if (confirm) {
            }
        }
    };

    const calculateAge = (birthDate: string) => {
        if (!birthDate) return 0;
        return Math.floor(differenceInDays(new Date(), new Date(birthDate)) / 365.25);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!ingreso) {
        return (
            <div className="p-20 text-center space-y-4">
                <span className="material-symbols-outlined text-6xl text-slate-300">error</span>
                <p className="text-slate-500 font-medium font-manrope text-sm uppercase tracking-widest">No se encontró el ingreso</p>
                <Link to="/expedientes" className="text-primary font-bold hover:underline block text-sm">Volver a Expedientes</Link>
            </div>
        );
    }

    const stageMap: { [key: string]: number } = {
        'recepcion': 0,
        'ampliacion': 1,
        'informe_sintesis': 2,
        'definicion': 3,
        'cerrado': 4
    };
    let activeStageIndex = stageMap[ingreso.etapa?.toLowerCase() || 'recepcion'] ?? 0;

    // Si la etapa es todavía recepción pero ya se tomó la decisión de abordaje integral,
    // forzamos que se muestre como que ya puede entrar a ampliación.
    if (activeStageIndex === 0 && ingreso.decision?.decision_id === 'abordaje_integral') {
        activeStageIndex = 1;
    }

    const isClosed = ingreso.estado === 'cerrado';

    const allStages = ['Recepción', 'Ampliación', 'Informe Síntesis', 'Definición de Medidas', 'Cerrado'];
    const stages = allStages.map((name: string, idx: number) => {
        let status: 'completed' | 'active' | 'locked' = 'locked';
        let icon = 'lock';
        let date = 'Pendiente';

        if (idx === 4) { // Cese Caso
            if (isClosed) {
                status = 'completed';
                icon = 'verified';
                date = 'Caso Cerrado';
            } else {
                status = 'locked';
                icon = 'lock';
            }
        } else if (idx < activeStageIndex) {
            status = 'completed';
            icon = 'check_circle';
            date = 'Completado';
        } else if (idx === activeStageIndex) {
            if (isClosed) {
                status = 'completed';
                icon = 'check_circle';
                date = 'Completado';
            } else {
                status = 'active';
                icon = 'pending';
                date = 'En curso';
            }
        } else {
            status = 'locked';
            icon = 'lock';
        }

        return {
            name: name === 'Definición de Medidas' ? 'Definición' : name === 'Cerrado' ? 'Cese Caso' : name,
            icon,
            date,
            status
        };
    });

    return (
        <main className="flex-1 font-manrope">
            {/* VISTA DE IMPRESIÓN (OCULTA EN WEB) */}
            <div className="hidden print:block bg-white p-10 text-[#111] print-only no-print-background">
                <header className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-8">
                    <div>
                        <h1 className="text-2xl font-black uppercase tracking-tighter">Servicio local de promoción y protección de derechos de NNyA</h1>
                        <p className="text-xs font-bold text-slate-600">Ministerio de Justicia y Derechos Humanos - Provincia de Córdoba</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xl font-black text-primary"># {ingreso.expediente_numero}</p>
                        <p className="text-[10px] uppercase font-bold text-slate-400 italic">Fecha de Impresión: {format(new Date(), "dd/MM/yyyy HH:mm")}</p>
                    </div>
                </header>

                <div className="space-y-10">
                    {/* Informe Section */}
                    <div className="text-center py-4 bg-slate-100 rounded-lg border border-slate-200">
                        <h2 className="text-xl font-bold uppercase tracking-widest text-slate-800">Informe Técnico de Recepción</h2>
                    </div>

                    {/* Datos del NNYA */}
                    <section>
                        <h3 className="text-sm font-black uppercase border-b border-slate-300 pb-1 mb-4">1. Datos Personales del NNyA</h3>
                        <div className="grid grid-cols-2 gap-y-4 gap-x-12 text-sm">
                            <div><span className="font-bold text-slate-500 uppercase text-[10px] block">Nombre y Apellido</span> {ingreso.nino_nombre} {ingreso.nino_apellido}</div>
                            <div><span className="font-bold text-slate-500 uppercase text-[10px] block">DNI</span> {ingreso.nino_dni || 'No informado'}</div>
                            <div><span className="font-bold text-slate-500 uppercase text-[10px] block">Fecha de Nacimiento</span> {ingreso.nino_fecha_nacimiento ? format(new Date(ingreso.nino_fecha_nacimiento), "dd/MM/yyyy") : 'N/A'} ({calculateAge(ingreso.nino_fecha_nacimiento)} años)</div>
                            <div><span className="font-bold text-slate-500 uppercase text-[10px] block">Domicilio Declarado</span> {ingreso.nino_domicilio || 'N/A'}, {ingreso.nino_localidad || ''}</div>
                            <div><span className="font-bold text-slate-500 uppercase text-[10px] block">Escolaridad</span> {ingreso.nino_nivel_educativo || 'N/A'} {ingreso.nino_curso ? `- ${ingreso.nino_curso}` : ''}</div>
                            <div><span className="font-bold text-slate-500 uppercase text-[10px] block">Centro de Salud</span> {ingreso.nino_centro_salud || 'N/A'}</div>
                        </div>
                    </section>

                    {/* Origen */}
                    <section>
                        <h3 className="text-sm font-black uppercase border-b border-slate-300 pb-1 mb-4">2. Origen de la Demanda / Derivación</h3>
                        <div className="grid grid-cols-2 gap-y-4 gap-x-12 text-sm">
                            <div><span className="font-bold text-slate-500 uppercase text-[10px] block">Vía de Ingreso</span> {ingreso.derivacion?.via_ingreso || 'N/A'}</div>
                            <div><span className="font-bold text-slate-500 uppercase text-[10px] block">Nro Oficio/Exp. Externo</span> {ingreso.derivacion?.oficio_numero || 'S/N'}</div>
                            <div className="col-span-2"><span className="font-bold text-slate-500 uppercase text-[10px] block">Sujeto/Institución Derivante</span> {ingreso.derivacion?.nombre_solicitante || 'Particular'} - {ingreso.derivacion?.cargo_solicitante || ''}</div>
                        </div>
                    </section>

                    {/* Vulneraciones */}
                    <section>
                        <h3 className="text-sm font-black uppercase border-b border-slate-300 pb-1 mb-4">3. Derechos Vulnerados (Presunto)</h3>
                        <div className="space-y-4">
                            {ingreso.vulneraciones?.map((v, i) => (
                                <div key={i} className="pl-4 border-l-2 border-primary/30 py-1">
                                    <p className="text-sm font-bold uppercase text-slate-800">{v.catalogo_derechos?.categoria}</p>
                                    <p className="text-xs font-bold text-primary italic mb-1">{v.catalogo_derechos?.subcategoria}</p>
                                    <p className="text-sm text-slate-700">{v.indicador}</p>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Relato */}
                    <section className="print-break">
                        <h3 className="text-sm font-black uppercase border-b border-slate-300 pb-1 mb-4">4. Relato de la Situación (Demanda Inicial)</h3>
                        <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 italic shadow-inner">
                            <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-line">
                                "{ingreso.motivo?.descripcion_situacion || 'No se registró relato de situación.'}"
                            </p>
                        </div>
                    </section>

                    {/* Grupo Familiar */}
                    <section>
                        <h3 className="text-sm font-black uppercase border-b border-slate-300 pb-1 mb-4">5. Grupo Familiar y Conviviente</h3>
                        <table className="w-full text-sm border-collapse">
                            <thead>
                                <tr className="bg-slate-100 text-[10px] font-black uppercase text-slate-500">
                                    <th className="border border-slate-200 p-2 text-left">Nombre y Apellido</th>
                                    <th className="border border-slate-200 p-2 text-left">Vínculo</th>
                                    <th className="border border-slate-200 p-2 text-center">Convive</th>
                                </tr>
                            </thead>
                            <tbody>
                                {ingreso.grupo_familiar?.map((m, i) => (
                                    <tr key={i} className="text-xs">
                                        <td className="border border-slate-200 p-2 font-bold">{m.nombre} {m.apellido}</td>
                                        <td className="border border-slate-200 p-2">{m.vinculo}</td>
                                        <td className="border border-slate-200 p-2 text-center">{m.convive ? 'SI' : 'NO'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </section>

                    {/* Dictamen */}
                    <section className="mt-auto">
                        <h3 className="text-sm font-black uppercase border-b border-slate-300 pb-1 mb-4">6. Dictamen Técnico y Sugerencia de Intervención</h3>
                        <div className="mb-6">
                            <p className="text-[10px] font-black text-slate-500 uppercase mb-2">Decisión Inicial:</p>
                            <span className="px-6 py-2 bg-slate-100 border-2 border-slate-800 text-slate-800 font-black uppercase text-xs rounded-full">
                                {ingreso.decision?.decision_id?.replace('_', ' ') || 'Asesoramiento'}
                            </span>
                        </div>
                        <div className="p-6 border-2 border-dashed border-slate-300 rounded-xl">
                            <p className="text-sm font-bold text-slate-400 uppercase text-[9px] mb-2 tracking-widest">Fundamentación:</p>
                            <p className="text-sm text-slate-800 leading-relaxed italic">
                                {ingreso.decision?.observaciones || 'Sin fundamentación registrada.'}
                            </p>
                        </div>
                    </section>

                    {/* Firmas */}
                    <div className="pt-20 grid grid-cols-2 gap-20">
                        <div className="border-t border-slate-400 pt-4 text-center">
                            <p className="text-[10px] font-black uppercase text-slate-500 mb-1">Firma y Sello</p>
                            <p className="text-xs font-bold">{ingreso.profesional_asignado_nombre || 'Profesional Actuante'}</p>
                        </div>
                        <div className="border-t border-slate-400 pt-4 text-center">
                            <p className="text-[10px] font-black uppercase text-slate-500 mb-1">Responsable del Servicio</p>
                            <div className="h-4"></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* UI NORMAL (OCULTA EN IMPRESIÓN) */}
            <div className="no-print">
                {/* Header and Breadcrumbs Row */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                        <Breadcrumbs
                            items={[
                                { label: 'Inicio', path: '/' },
                                { label: 'Expedientes', path: '/expedientes' },
                                { label: 'Historial de Ingresos', path: `/expedientes/${ingreso.expediente_id}/ingresos` },
                                { label: 'Detalle de Legajo', active: true }
                            ]}
                        />
                        <h1 className="text-[#111818] dark:text-white text-xl font-bold tracking-tight">Detalle del Caso</h1>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={async () => {
                                if (!ingreso || !ingresoId) return;

                                // Cargar medidas con acciones si no están cargadas
                                let medidasParaPDF = measuresSummary;

                                if (!medidasParaPDF || medidasParaPDF.length === 0) {
                                    const { data: medidasData } = await supabase
                                        .from('medidas')
                                        .select('id, medida_propuesta, estado, responsables, created_at')
                                        .eq('ingreso_id', ingresoId)
                                        .order('created_at', { ascending: false });

                                    if (medidasData) {
                                        medidasParaPDF = await Promise.all(
                                            medidasData.map(async (medida) => {
                                                const { data: acciones } = await supabase
                                                    .from('acciones')
                                                    .select('*')
                                                    .eq('medida_id', medida.id)
                                                    .order('created_at', { ascending: false });

                                                return {
                                                    ...medida,
                                                    acciones: acciones || []
                                                };
                                            })
                                        );
                                    }
                                }

                                generateExpedientePDF(ingreso as any, medidasParaPDF || []);
                            }}
                            className="flex items-center justify-center gap-2 rounded-xl h-9 px-4 bg-white dark:bg-zinc-800 text-[#60708a] dark:text-white text-[11px] font-bold hover:bg-gray-50 border border-[#e5e7eb] dark:border-[#333] transition-colors"
                        >
                            <span className="material-symbols-outlined text-[18px]">download</span>
                            Descargar PDF
                        </button>
                        <button
                            onClick={handleFinalizeStage}
                            className="flex items-center justify-center rounded-xl h-9 px-5 bg-primary text-[#112121] text-[11px] font-bold hover:brightness-110 transition-all shadow-sm uppercase tracking-wider"
                        >
                            Finalizar Etapa
                        </button>
                    </div>
                </div>

                {/* Compact Informative Strip */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                    {/* Child Summary - Smaller */}
                    <div className="col-span-1 md:col-span-2 lg:col-span-2 bg-white dark:bg-zinc-900 rounded-xl p-4 border border-[#f0f2f5] dark:border-[#333] shadow-sm flex items-center gap-4">
                        <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/10">
                            <span className="material-symbols-outlined text-2xl">face</span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <h2 className="text-sm font-bold tracking-tight truncate">{ingreso.nino_nombre} {ingreso.nino_apellido}</h2>
                            <div className="flex gap-3 text-[10px] font-semibold text-[#60708a]">
                                <span>DNI: {ingreso.nino_dni}</span>
                                <span>{calculateAge(ingreso.nino_fecha_nacimiento)} años</span>
                                <span className="text-primary font-bold">{ingreso.expediente_numero}</span>
                            </div>
                        </div>
                        <div className="px-2 py-1 bg-primary/10 rounded-lg shrink-0">
                            <span className="text-[10px] font-bold text-primary uppercase">{ingreso.expediente_activo ? 'Activo' : 'Inactivo'}</span>
                        </div>
                    </div>

                    {/* Micro Stats Row */}
                    <div className="col-span-1 bg-white dark:bg-zinc-900 rounded-xl p-4 border border-[#f0f2f5] dark:border-[#333] shadow-sm flex flex-col justify-center">
                        <p className="text-[#60708a] text-[9px] font-bold uppercase tracking-widest leading-none mb-1">Profesional</p>
                        <p className="text-[#111818] dark:text-white text-sm font-bold truncate">
                            {ingreso.profesional_asignado_nombre || 'Sin asignar'}
                        </p>
                    </div>

                    <div className="col-span-1 bg-white dark:bg-zinc-900 rounded-xl p-4 border border-[#f0f2f5] dark:border-[#333] shadow-sm flex flex-col justify-center border-l-2 border-l-primary/30">
                        <p className="text-[#60708a] text-[9px] font-bold uppercase tracking-widest leading-none mb-1">Días Totales</p>
                        <div className="flex items-center gap-2">
                            <p className="text-[#111818] dark:text-white text-sm font-bold">
                                {differenceInDays(
                                    ingreso.fecha_cierre ? new Date(ingreso.fecha_cierre) : new Date(),
                                    new Date(ingreso.fecha_ingreso)
                                )} días
                            </p>
                            {ingreso.fecha_cierre && (
                                <span className="material-symbols-outlined text-xs text-danger" title="Caso Cerrado">lock</span>
                            )}
                        </div>
                    </div>

                    <div className="col-span-1 bg-white dark:bg-zinc-900 rounded-xl p-4 border border-[#f0f2f5] dark:border-[#333] shadow-sm flex flex-col justify-center border-l-2 border-l-amber-500/30">
                        <p className="text-[#60708a] text-[9px] font-bold uppercase tracking-widest leading-none mb-1">Días en Etapa</p>
                        <p className="text-[#111818] dark:text-white text-sm font-bold">
                            {/* Note: This is currently using fecha_ingreso as proxy for stage start */}
                            {differenceInDays(
                                ingreso.fecha_cierre ? new Date(ingreso.fecha_cierre) : new Date(),
                                new Date(ingreso.fecha_ingreso)
                            )} días
                        </p>
                    </div>
                </div>

                {/* Main Area: High Preponderance Section */}
                <div className="bg-white dark:bg-zinc-900 border border-[#f0f2f5] dark:border-[#333] rounded-2xl overflow-hidden shadow-md flex flex-col min-h-[500px]">
                    {/* Stepper Integrated as a Header of the Work Section */}
                    <div className="p-6 bg-slate-50/50 dark:bg-black/10 border-b border-[#f0f2f5] dark:border-[#333]">
                        <div className="flex items-center w-full max-w-4xl mx-auto">
                            {stages.map((stage, idx) => {
                                const isLast = idx === stages.length - 1;
                                const isReception = stage.name === 'Recepción';
                                let circleClass = "";
                                let textClass = "";

                                if (stage.status === 'completed') {
                                    circleClass = "bg-primary/10 text-primary";
                                    textClass = "text-primary";
                                } else if (stage.status === 'active') {
                                    circleClass = "bg-primary text-[#112121] ring-2 ring-primary/20 shadow-sm";
                                    textClass = "text-primary";
                                } else {
                                    circleClass = "bg-gray-200 dark:bg-zinc-800 text-[#60708a]";
                                    textClass = "text-[#60708a]";
                                }

                                const stepContent = (
                                    <div className="flex flex-col items-center flex-1 relative group">
                                        <div className={`size-8 rounded-full flex items-center justify-center z-10 transition-all duration-300 ${circleClass} ${isReception ? 'group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-primary/20' : ''}`}>
                                            <span className="material-symbols-outlined text-lg font-bold">{stage.icon}</span>
                                        </div>
                                        {!isLast && (
                                            <div className={`absolute top-4 left-1/2 w-full h-[1.5px] ${stage.status === 'completed' ? 'bg-primary' : 'bg-gray-200 dark:bg-[#333]'}`}></div>
                                        )}
                                        <p className={`mt-2 text-[9px] font-bold uppercase tracking-wider ${textClass}`}>{stage.name}</p>
                                    </div>
                                );

                                if (isReception) {
                                    return (
                                        <Link key={idx} to={`/expedientes/${ingreso.expediente_id}/recepcion/${ingresoId}`} className="flex-1 block">
                                            {stepContent}
                                        </Link>
                                    );
                                }

                                if (stage.name === 'Ampliación' && (stage.status === 'active' || stage.status === 'completed')) {
                                    return (
                                        <Link key={idx} to={`/expedientes/${ingreso.expediente_id}/ampliacion/${ingresoId}`} className="flex-1 block">
                                            {stepContent}
                                        </Link>
                                    );
                                }

                                if (stage.name === 'Definición' && (stage.status === 'active' || stage.status === 'completed')) {
                                    return (
                                        <Link key={idx} to={`/expedientes/${ingreso.expediente_id}/definicion/${ingresoId}`} className="flex-1 block">
                                            {stepContent}
                                        </Link>
                                    );
                                }

                                if (stage.name === 'Informe Síntesis' && (stage.status === 'active' || stage.status === 'completed')) {
                                    return (
                                        <Link key={idx} to={`/expedientes/${ingreso.expediente_id}/sintesis/${ingresoId}`} className="flex-1 block">
                                            {stepContent}
                                        </Link>
                                    );
                                }

                                return (
                                    <div key={idx} className="flex-1">
                                        {stepContent}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Operation Tabs */}
                    <div className="flex border-b border-[#f0f2f5] dark:border-[#333] px-2">
                        {[
                            { id: 'recepcion', label: 'Ficha de Recepción', icon: 'assignment' },
                            ...(activeStageIndex >= 1 ? [{ id: 'ampliacion', label: 'Ficha de Ampliación', icon: 'insights' }] : []),
                            ...(activeStageIndex >= 2 || (ingreso.intervenciones && ingreso.intervenciones.length > 0) ? [{ id: 'sintesis', label: 'Informe Síntesis', icon: 'gavel' }] : []),
                            ...(activeStageIndex >= 3 ? [{ id: 'definicion', label: 'Definición de Medidas', icon: 'security' }] : []),
                            ...((ingreso.cese || ingreso.estado === 'cerrado') ? [{ id: 'cese', label: 'Cese de Intervención', icon: 'verified' }] : []),
                            { id: 'transferencias', label: 'Transferencias', icon: 'swap_horiz' },
                            { id: 'historial', label: 'Historial', icon: 'history' },
                            { id: 'documentos', label: 'Documentos', icon: 'description' }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-6 py-4 text-[11px] font-bold uppercase tracking-widest flex items-center gap-2 transition-all relative
                                ${activeTab === tab.id
                                        ? 'text-primary'
                                        : 'text-[#60708a] hover:text-primary hover:bg-gray-50'}`}
                            >
                                <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
                                {tab.label}
                                {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"></div>}
                            </button>
                        ))}
                    </div>

                    <div className="p-8">
                        {activeTab === 'ampliacion' && (
                            <div className="space-y-10 animate-in fade-in duration-500">
                                <div className="flex justify-between items-center border-b border-slate-100 dark:border-zinc-800 pb-8">
                                    <div>
                                        <h3 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white mb-2">Resumen de Ampliación de Información</h3>
                                        <p className="text-slate-500 font-medium text-sm italic">Desarrollo de objetivos y estrategias del plan de acción.</p>
                                    </div>
                                    <button
                                        onClick={() => navigate(`/expedientes/${ingreso.expediente_id}/ampliacion/${ingreso.id}`)}
                                        className="px-8 h-12 bg-primary text-[#112121] text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all text-sm font-bold"
                                    >
                                        Ir al Módulo de Trabajo
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                    <section className="space-y-8">
                                        <div className="bg-slate-50/50 dark:bg-zinc-800/20 p-8 rounded-[40px] border border-slate-100 dark:border-zinc-800 space-y-6">
                                            <div>
                                                <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-md">target</span>
                                                    Objetivos del Plan
                                                </h4>
                                                <p className="text-slate-700 dark:text-slate-300 text-md font-medium leading-relaxed italic">
                                                    "{ingreso.planificacion?.objetivos || 'Sin planificación registrada'}"
                                                </p>
                                            </div>
                                            <div className="pt-6 border-t border-slate-100 dark:border-zinc-800">
                                                <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-md">strategy</span>
                                                    Estrategia Seleccionada
                                                </h4>
                                                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap">
                                                    {ingreso.planificacion?.estrategias || '-'}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-4 pt-4">
                                                <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-zinc-700 shadow-sm">
                                                    <span className="material-symbols-outlined text-sm text-primary">event</span>
                                                    <span className="text-[10px] font-black uppercase tracking-widest">Fin: {ingreso.planificacion?.fecha_fin_estimada ? format(new Date(ingreso.planificacion.fecha_fin_estimada), "dd/MM/yyyy") : '-'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </section>

                                    <section className="space-y-6">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] flex items-center gap-2">
                                                <span className="material-symbols-outlined text-md">history</span>
                                                Historial de Acciones ({ingreso.intervenciones?.length || 0})
                                            </h4>

                                            {(ingreso.intervenciones || []).length > 0 && (
                                                <PDFDownloadLink
                                                    document={<IntervencionesPDF ingreso={ingreso} intervenciones={ingreso.intervenciones || []} />}
                                                    fileName={`Entrevistas_${ingreso.expediente_numero}.pdf`}
                                                >
                                                    {({ loading: pdfLoading }) => (
                                                        <button disabled={pdfLoading} className="text-[10px] font-bold text-slate-500 hover:text-primary flex items-center gap-1 uppercase tracking-wider">
                                                            <span className="material-symbols-outlined text-sm">picture_as_pdf</span>
                                                            {pdfLoading ? '...' : 'Descargar'}
                                                        </button>
                                                    )}
                                                </PDFDownloadLink>
                                            )}
                                        </div>
                                        <div className="space-y-3">
                                            {(ingreso.intervenciones || []).length === 0 ? (
                                                <div className="p-8 text-center bg-slate-50 dark:bg-zinc-800/30 rounded-3xl border border-dashed border-slate-200">
                                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Sin intervenciones registradas</p>
                                                </div>
                                            ) : (
                                                (ingreso.intervenciones || []).map((inter, i) => (
                                                    <div key={i} className="p-5 bg-white dark:bg-zinc-900 rounded-[24px] border border-slate-100 dark:border-zinc-800 shadow-sm hover:border-primary/30 transition-all flex items-center justify-between group">
                                                        <div className="flex items-center gap-4">
                                                            <div className={`size-3 rounded-full ${inter.asistencia === 'Asistió' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                                                            <div>
                                                                <p className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-tight">{inter.entrevistado_nombre}</p>
                                                                <p className="text-[10px] text-slate-500 font-medium">{format(new Date(inter.fecha), "dd MMM yyyy", { locale: es })} • {inter.vinculo}</p>
                                                            </div>
                                                        </div>
                                                        <Link to={`/expedientes/${ingreso.expediente_id}/ampliacion/${ingreso.id}`} className="p-2 text-slate-300 group-hover:text-primary transition-colors">
                                                            <span className="material-symbols-outlined">chevron_right</span>
                                                        </Link>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </section>
                                </div>
                            </div>
                        )}
                        {activeTab === 'sintesis' && (
                            <div className="space-y-10 animate-in fade-in duration-500">
                                <div className="flex justify-between items-center border-b border-slate-100 dark:border-zinc-800 pb-8">
                                    <div>
                                        <h3 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white mb-2">Informe Síntesis</h3>
                                        <p className="text-slate-500 font-medium text-sm italic">Evaluación técnica y cierre de la etapa investigativa.</p>
                                    </div>
                                    <button
                                        onClick={() => navigate(`/expedientes/${ingreso.expediente_id}/sintesis/${ingreso.id}`)}
                                        className="px-8 h-12 bg-primary text-[#112121] text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all text-sm font-bold"
                                    >
                                        {ingreso.informe_sintesis ? 'Editar Informe' : 'Redactar Informe'}
                                    </button>
                                </div>

                                {ingreso.informe_sintesis ? (
                                    <div className="grid grid-cols-1 gap-8">
                                        <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-slate-100 dark:border-zinc-800 shadow-sm relative overflow-hidden">
                                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                                <span className="material-symbols-outlined text-8xl text-primary">gavel</span>
                                            </div>
                                            <h4 className="text-sm font-black text-primary uppercase tracking-widest mb-4">Fundamento Normativo</h4>
                                            <p className="text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap text-sm">
                                                {ingreso.informe_sintesis.fundamento_normativo || 'Sin contenido.'}
                                            </p>
                                        </div>

                                        <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-slate-100 dark:border-zinc-800 shadow-sm relative overflow-hidden">
                                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                                <span className="material-symbols-outlined text-8xl text-primary">psychology</span>
                                            </div>
                                            <h4 className="text-sm font-black text-primary uppercase tracking-widest mb-4">Valoración Integral</h4>
                                            <p className="text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap text-sm">
                                                {ingreso.informe_sintesis.valoracion_integral || 'Sin contenido.'}
                                            </p>
                                        </div>

                                        <div className="bg-gradient-to-br from-primary/5 to-transparent p-8 rounded-3xl border border-primary/20 shadow-sm">
                                            <h4 className="text-sm font-black text-primary uppercase tracking-widest mb-4">Plan de Acción</h4>
                                            <p className="text-slate-800 dark:text-white font-medium leading-relaxed whitespace-pre-wrap text-sm">
                                                {ingreso.informe_sintesis.plan_accion || 'Sin contenido.'}
                                            </p>
                                        </div>

                                        <div className="flex justify-end pt-4">
                                            <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-zinc-800 rounded-lg">
                                                <span className={`size-2 rounded-full ${ingreso.informe_sintesis.estado === 'finalizado' ? 'bg-primary' : 'bg-orange-400 animate-pulse'}`}></span>
                                                <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Estado: {ingreso.informe_sintesis.estado}</span>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-slate-50/50 dark:bg-zinc-800/20 p-8 rounded-[40px] border border-slate-100 dark:border-zinc-800 space-y-6 text-center">
                                        <span className="material-symbols-outlined text-6xl text-slate-300">description</span>
                                        <p className="text-slate-500 font-medium">Acceda al módulo de redacción para completar la evaluación técnica.</p>
                                    </div>
                                )}
                            </div>
                        )}
                        {activeTab === 'definicion' && (
                            <div className="space-y-10 animate-in fade-in duration-500">
                                <div className="flex justify-between items-center border-b border-slate-100 dark:border-zinc-800 pb-8">
                                    <div>
                                        <h3 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white mb-2">Definición de Medidas</h3>
                                        <p className="text-slate-500 font-medium text-sm italic">Estrategias de protección y restitución de derechos.</p>
                                    </div>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => navigate(`/expedientes/${ingreso.expediente_id}/acta/${ingresoId}`)}
                                            className="px-6 h-12 bg-white dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-slate-300 text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-slate-50 dark:hover:bg-zinc-700 transition-all text-sm flex items-center gap-2"
                                        >
                                            <span className="material-symbols-outlined text-lg">description</span>
                                            Acta
                                        </button>
                                        <button
                                            onClick={() => navigate(`/expedientes/${ingreso.expediente_id}/definicion/${ingresoId}`)}
                                            className="px-8 h-12 bg-primary text-[#112121] text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all text-sm font-bold"
                                        >
                                            Gestionar Medidas
                                        </button>
                                    </div>
                                </div>

                                {measuresSummary.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {measuresSummary.map(m => (
                                            <div key={m.id} className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 p-4 rounded-2xl flex items-center justify-between shadow-sm">
                                                <div>
                                                    <h4 className="font-bold text-sm text-slate-800 dark:text-white mb-1">{m.medida_propuesta}</h4>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`size-2 rounded-full ${m.estado === 'activa' ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                                                        <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">{m.estado}</span>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Responsable</span>
                                                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{m.responsables || '-'}</span>
                                                </div>
                                            </div>
                                        ))}
                                        <div onClick={() => navigate(`/expedientes/${ingreso.expediente_id}/definicion/${ingresoId}`)} className="bg-slate-50 dark:bg-zinc-800/50 border border-dashed border-slate-200 dark:border-zinc-700 p-4 rounded-2xl flex items-center justify-center cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors">
                                            <span className="text-xs font-bold text-primary uppercase tracking-widest">+ Ver Detalle Completo</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-10 text-center bg-slate-50 dark:bg-zinc-800/30 rounded-3xl border border-dashed border-slate-200">
                                        <span className="material-symbols-outlined text-6xl text-slate-300 mb-4">security</span>
                                        <p className="text-slate-500 font-medium">Acceda al módulo de gestión para configurar las medidas de protección.</p>
                                    </div>
                                )}
                            </div>
                        )}
                        {activeTab === 'recepcion' && (
                            <div className="space-y-10 animate-in fade-in duration-500">
                                {/* Summary Header */}
                                <div className="flex justify-between items-center border-b border-slate-100 dark:border-zinc-800 pb-8">
                                    <div>
                                        <h3 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white mb-2">Informe de Recepción y Demanda</h3>
                                        <div className="flex items-center gap-4">
                                            <p className="text-slate-500 font-medium text-sm">Registro técnico consolidado de la primera escucha e intervención inicial.</p>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => navigate(`/expedientes/${ingreso.expediente_id}/recepcion/${ingreso.id}`)}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-zinc-800 hover:bg-primary hover:text-[#112121] text-slate-600 dark:text-slate-300 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all"
                                                >
                                                    <span className="material-symbols-outlined text-sm">edit</span>
                                                    Editar Informe
                                                </button>
                                                <button
                                                    onClick={() => window.print()}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-zinc-800 hover:bg-primary hover:text-[#112121] text-slate-600 dark:text-slate-300 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all"
                                                >
                                                    <span className="material-symbols-outlined text-sm">picture_as_pdf</span>
                                                    Generar PDF
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${ingreso.estado === 'cerrado' ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                            {ingreso.estado === 'cerrado' ? 'Proceso Finalizado' : 'Proceso en Trámite'}
                                        </span>
                                        <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-tighter">Fecha: {format(new Date(ingreso.fecha_ingreso), "dd/MM/yyyy")}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                    {/* Left Column: Origin and Motive */}
                                    <div className="space-y-8">
                                        <section>
                                            <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-4">01. Origen de la Demanda</h4>
                                            <div className="bg-slate-50/50 dark:bg-zinc-800/30 rounded-2xl p-6 border border-slate-100 dark:border-zinc-800">
                                                <div className="grid grid-cols-2 gap-6">
                                                    <div>
                                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Vía de Ingreso</p>
                                                        <p className="font-bold text-sm">{ingreso.derivacion?.via_ingreso || 'N/A'}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Nro Oficio/Exp.</p>
                                                        <p className="font-bold text-sm">{ingreso.derivacion?.oficio_numero || 'Sin número'}</p>
                                                    </div>
                                                    <div className="col-span-2">
                                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Solicitante / Institución</p>
                                                        <p className="font-bold text-sm">{ingreso.derivacion?.nombre_solicitante || 'Persona Particular'}</p>
                                                        <p className="text-[10px] text-slate-500 mt-1 capitalize">{ingreso.derivacion?.cargo_solicitante || ''}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </section>

                                        <section>
                                            <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-4">02. Motivo y Relato</h4>
                                            <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-slate-100 dark:border-zinc-800 shadow-sm">
                                                <div className="mb-4 flex items-center gap-2">
                                                    <span className={`size-3 rounded-full ${ingreso.motivo?.gravedad === 'Urgente' ? 'bg-rose-500' : 'bg-amber-500'}`}></span>
                                                    <span className="text-[10px] font-black uppercase tracking-widest">{ingreso.motivo?.gravedad || 'Moderada'}</span>
                                                </div>
                                                <p className="text-[#334155] dark:text-slate-300 text-[13px] leading-relaxed whitespace-pre-line italic bg-slate-50/30 dark:bg-slate-800/20 p-4 rounded-xl">
                                                    "{ingreso.motivo?.descripcion_situacion || 'No se registró relato de situación.'}"
                                                </p>
                                            </div>
                                        </section>

                                        <section>
                                            <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-4">02b. Salud y Educación</h4>
                                            <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-slate-100 dark:border-zinc-800 shadow-sm grid grid-cols-2 gap-4">
                                                <div>
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Escolaridad</p>
                                                    <p className="font-bold text-xs">{ingreso.nino_nivel_educativo || 'No informada'} {ingreso.nino_curso ? `(${ingreso.nino_curso})` : ''}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">CUD</p>
                                                    <p className="font-bold text-xs">{ingreso.nino_tiene_cud ? 'Posee CUD' : 'No posee / No informa'}</p>
                                                </div>
                                                <div className="col-span-2">
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Centro de Salud / Hospital</p>
                                                    <p className="font-bold text-xs">{ingreso.nino_centro_salud || 'No informado'}</p>
                                                </div>
                                            </div>
                                        </section>

                                        <section>
                                            <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-4">03. Vulneración de Derechos</h4>
                                            <div className="space-y-3">
                                                {ingreso.vulneraciones?.map((v, i) => (
                                                    <div key={i} className="flex gap-4 p-4 bg-white dark:bg-zinc-900 rounded-xl border border-slate-100 dark:border-zinc-800 shadow-sm items-start">
                                                        <div className="size-8 rounded-lg bg-rose-50 dark:bg-rose-900/20 text-rose-500 flex items-center justify-center shrink-0">
                                                            <span className="material-symbols-outlined text-[18px]">gavel</span>
                                                        </div>
                                                        <div>
                                                            <p className="text-[11px] font-black text-slate-800 dark:text-white uppercase tracking-tight">{v.catalogo_derechos?.categoria}</p>
                                                            <p className="text-[10px] text-slate-500 font-bold mb-2 tracking-wide uppercase">{v.catalogo_derechos?.subcategoria}</p>
                                                            <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">{v.indicador}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                                {(!ingreso.vulneraciones || ingreso.vulneraciones.length === 0) && (
                                                    <p className="text-[11px] text-slate-400 font-medium italic">Sin vulneraciones registradas.</p>
                                                )}
                                            </div>
                                        </section>
                                    </div>

                                    {/* Right Column: Context and Decision */}
                                    <div className="space-y-8">
                                        <section>
                                            <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-4">04. Entorno Familiar</h4>
                                            <div className="space-y-2">
                                                {ingreso.grupo_familiar?.map((m, i) => (
                                                    <div key={i} className="flex items-center justify-between p-3 bg-slate-50/50 dark:bg-zinc-800/30 rounded-xl border border-slate-100 dark:border-zinc-800 text-[11px]">
                                                        <div className="flex items-center gap-3">
                                                            <span className="font-bold">{m.nombre} {m.apellido}</span>
                                                            <span className="px-2 py-0.5 bg-slate-200 dark:bg-zinc-700 rounded-full text-[9px] uppercase font-black">{m.vinculo}</span>
                                                        </div>
                                                        <span className={m.convive ? "text-emerald-500 font-bold" : "text-slate-400"}>{m.convive ? 'Convive' : 'No convive'}</span>
                                                    </div>
                                                ))}
                                                {(!ingreso.grupo_familiar || ingreso.grupo_familiar.length === 0) && (
                                                    <p className="text-[11px] text-slate-400 font-medium italic">Sin datos de familia registrados.</p>
                                                )}
                                            </div>
                                        </section>

                                        <section>
                                            <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-4">05. Decisión Técnica</h4>
                                            <div className={`p-6 rounded-2xl border-2 ${ingreso.decision?.decision_id === 'asesoramiento' ? 'border-blue-500/20 bg-blue-50/10' : 'border-emerald-500/20 bg-emerald-50/10'}`}>
                                                <div className="flex items-center gap-3 mb-4">
                                                    <span className="material-symbols-outlined text-3xl text-primary">analytics</span>
                                                    <div>
                                                        <p className="text-[10px] font-black uppercase tracking-widest text-[#60708a]">Dictamen Final de Recepción</p>
                                                        <h5 className="text-lg font-black tracking-tight capitalize text-primary">
                                                            {ingreso.decision?.decision_id?.replace('_', ' ') || 'Asesoramiento'}
                                                        </h5>
                                                    </div>
                                                </div>
                                                <div className="p-4 bg-white dark:bg-zinc-900/50 rounded-xl border border-slate-100 dark:border-zinc-800 shadow-inner">
                                                    <p className="text-[12px] leading-relaxed text-slate-600 dark:text-slate-300 font-medium">
                                                        {ingreso.decision?.observaciones || 'Sin fundamentación registrada.'}
                                                    </p>
                                                </div>
                                            </div>
                                        </section>

                                        <div className="p-6 bg-slate-900 rounded-2xl text-white relative overflow-hidden group">
                                            <div className="relative z-10 flex items-center justify-between">
                                                <div>
                                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Estado del Legajo</p>
                                                    <h4 className="text-lg font-black uppercase tracking-tight">
                                                        {ingreso.estado === 'cerrado' ? 'Intervención Cerrada' : 'Intervención Activa'}
                                                    </h4>
                                                </div>
                                                <span className="material-symbols-outlined text-4xl text-primary/40 group-hover:scale-110 transition-transform">{ingreso.estado === 'cerrado' ? 'verified' : 'pending'}</span>
                                            </div>
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        {activeTab === 'documentos' && (
                            <div className="space-y-6 animate-in fade-in duration-500">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-md font-bold tracking-tight text-slate-800 dark:text-white uppercase flex items-center gap-2">
                                        <span className="material-symbols-outlined text-primary text-lg">folder_open</span>
                                        Documentación del Ingreso ({ingreso.documentos?.length || 0})
                                    </h3>
                                    <button className="px-4 py-2 bg-slate-100 dark:bg-zinc-800 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-primary hover:text-white transition-all">
                                        Subir Nuevo
                                    </button>
                                </div>

                                {ingreso.documentos && ingreso.documentos.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {ingreso.documentos.map((doc, idx) => (
                                            <div key={idx} className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                                                <div className="flex items-start justify-between mb-4">
                                                    <div className={`p-3 rounded-xl ${doc.tipo === 'PDF' ? 'bg-rose-50 text-rose-500' : 'bg-blue-50 text-blue-500'} transition-colors group-hover:bg-primary group-hover:text-white`}>
                                                        <span className="material-symbols-outlined text-2xl">
                                                            {doc.tipo === 'PDF' ? 'picture_as_pdf' : 'image'}
                                                        </span>
                                                    </div>
                                                    <button className="text-slate-300 hover:text-primary transition-colors">
                                                        <span className="material-symbols-outlined">more_vert</span>
                                                    </button>
                                                </div>
                                                <h4 className="font-bold text-sm text-slate-800 dark:text-white mb-1 truncate" title={doc.nombre}>{doc.nombre}</h4>
                                                <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-50 dark:border-zinc-800">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                                                        {format(new Date(doc.created_at), "dd MMM yyyy", { locale: es })}
                                                    </span>
                                                    <a
                                                        href={doc.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center gap-1 text-[10px] font-black text-primary uppercase tracking-widest hover:underline cursor-pointer"
                                                    >
                                                        Descargar
                                                        <span className="material-symbols-outlined text-sm">download</span>
                                                    </a>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-20 bg-slate-50/50 dark:bg-zinc-800/20 rounded-3xl border-2 border-dashed border-slate-200 dark:border-zinc-800">
                                        <span className="material-symbols-outlined text-6xl text-slate-200 mb-4">cloud_off</span>
                                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Sin documentos adjuntos</p>
                                    </div>
                                )}
                            </div>
                        )}
                        {activeTab === 'cese' && (
                            <div className="space-y-10 animate-in fade-in duration-500">
                                <div className="flex justify-between items-center border-b border-slate-100 dark:border-zinc-800 pb-8">
                                    <div>
                                        <h3 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white mb-2">Cese de Intervención</h3>
                                        <p className="text-slate-500 font-medium text-sm italic">Cierre formal del expediente y conclusión del proceso.</p>
                                    </div>
                                    <button
                                        onClick={() => navigate(`/expedientes/${ingreso.expediente_id}/cierre/${ingreso.id}`)}
                                        className="px-8 h-12 bg-primary text-[#112121] text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all text-sm font-bold"
                                    >
                                        Ver Formulario de Cese
                                    </button>
                                </div>

                                {ingreso.cese ? (
                                    <div className="grid grid-cols-1 gap-8">
                                        {/* Motivo de Cese */}
                                        <div className="bg-gradient-to-br from-danger/5 to-transparent p-8 rounded-3xl border border-danger/20 shadow-sm">
                                            <h4 className="text-sm font-black text-danger uppercase tracking-widest mb-4 flex items-center gap-2">
                                                <span className="material-symbols-outlined">gavel</span>
                                                Motivo de Cese
                                            </h4>
                                            <p className="text-slate-800 dark:text-white font-bold text-lg">
                                                {ingreso.cese.motivo_cese === 'restitucion_integral' && 'Restitución integral de los derechos vulnerados'}
                                                {ingreso.cese.motivo_cese === 'incumplimiento_estrategias' && 'Incumplimiento reiterado de las estrategias acordadas'}
                                                {ingreso.cese.motivo_cese === 'fallecimiento' && 'Fallecimiento del NNA'}
                                                {ingreso.cese.motivo_cese === 'otra_causal' && 'Otra causal que impide la continuidad de intervención'}
                                                {ingreso.cese.motivo_cese === 'cambio_residencia' && 'Cambio de ciudad de residencia (Se notifica por principio de corresponsabilidad)'}
                                                {ingreso.cese.motivo_cese === 'solicitud_medida_excepcional' && 'Solicitud de medida excepcional al organismo provincial de protección de derechos (SENAF)'}
                                            </p>
                                        </div>

                                        {/* Resumen de Logros */}
                                        <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-slate-100 dark:border-zinc-800 shadow-sm relative overflow-hidden">
                                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                                <span className="material-symbols-outlined text-8xl text-primary">emoji_events</span>
                                            </div>
                                            <h4 className="text-sm font-black text-primary uppercase tracking-widest mb-4">Resumen de Logros Alcanzados</h4>
                                            <p className="text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap text-sm">
                                                {ingreso.cese.resumen_logros || 'Sin contenido.'}
                                            </p>
                                        </div>

                                        {/* Observaciones Finales */}
                                        <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-slate-100 dark:border-zinc-800 shadow-sm relative overflow-hidden">
                                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                                <span className="material-symbols-outlined text-8xl text-primary">description</span>
                                            </div>
                                            <h4 className="text-sm font-black text-primary uppercase tracking-widest mb-4">Observaciones Finales</h4>
                                            <p className="text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap text-sm">
                                                {ingreso.cese.observaciones_finales || 'Sin observaciones adicionales.'}
                                            </p>
                                        </div>

                                        {/* Fecha de Cierre */}
                                        <div className="flex justify-end pt-4">
                                            <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-zinc-800 rounded-lg">
                                                <span className="material-symbols-outlined text-sm text-danger">event</span>
                                                <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                                                    Fecha de Cierre: {ingreso.cese.fecha_cierre ? format(new Date(ingreso.cese.fecha_cierre), "dd/MM/yyyy", { locale: es }) : 'N/A'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-slate-50/50 dark:bg-zinc-800/20 p-8 rounded-[40px] border border-slate-100 dark:border-zinc-800 space-y-6 text-center">
                                        <span className="material-symbols-outlined text-6xl text-slate-300">verified</span>
                                        <p className="text-slate-500 font-medium">No hay información de cese registrada para este ingreso.</p>
                                    </div>
                                )}
                            </div>
                        )}
                        {activeTab === 'transferencias' && (
                            <div className="space-y-6 animate-in fade-in duration-500">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h3 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white mb-2">Historial de Transferencias</h3>
                                        <p className="text-slate-500 font-medium text-sm">Registro de movimientos del expediente entre servicios de protección</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {transferHistory.length === 0 ? (
                                        <div className="p-20 text-center bg-slate-50/50 dark:bg-zinc-800/20 rounded-[40px] border-2 border-dashed border-slate-200 dark:border-zinc-800">
                                            <span className="material-symbols-outlined text-6xl text-slate-200 mb-4">swap_horiz</span>
                                            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No hay transferencias registradas</p>
                                        </div>
                                    ) : (
                                        transferHistory.map((t, i) => (
                                            <div key={i} className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-6 rounded-2xl shadow-sm relative overflow-hidden group">
                                                <div className="absolute top-0 right-0 p-4">
                                                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{format(new Date(t.created_at), "dd/MM/yyyy HH:mm")}</span>
                                                </div>
                                                <div className="flex flex-col md:flex-row md:items-center gap-8">
                                                    <div className="flex items-center gap-4 flex-1">
                                                        <div className="text-right">
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Origen</p>
                                                            <p className="font-bold text-sm text-slate-700 dark:text-slate-300">{(t.spd_origen as any)?.nombre || 'S/D'}</p>
                                                        </div>
                                                        <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                                            <span className="material-symbols-outlined">arrow_forward</span>
                                                        </div>
                                                        <div className="text-left">
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Destino</p>
                                                            <p className="font-bold text-sm text-primary">{(t.spd_destino as any)?.nombre}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex-1 border-t md:border-t-0 md:border-l border-slate-100 dark:border-zinc-800 pt-4 md:pt-0 md:pl-8">
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Motivo de Transferencia</p>
                                                        <p className="text-sm text-slate-600 dark:text-slate-400 italic">"{t.motivo || 'Sin motivo registrado'}"</p>
                                                        <p className="mt-2 text-[10px] font-bold text-slate-500 uppercase tracking-tighter flex items-center gap-1">
                                                            <span className="material-symbols-outlined text-xs">person</span>
                                                            Emitido por: {(t.usuario_emisor as any)?.nombre_completo}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                        {activeTab === 'historial' && (
                            <div className="space-y-6 animate-in fade-in duration-500">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h3 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white mb-2">Mapa Histórico del Proceso</h3>
                                        <p className="text-slate-500 font-medium text-sm">Visualización cronológica completa del expediente</p>
                                    </div>
                                </div>

                                {/* Timeline Container */}
                                <div className="relative">
                                    {/* Central Vertical Spine */}
                                    <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary via-primary/50 to-transparent transform -translate-x-1/2"></div>

                                    <div className="space-y-16">
                                        {/* Stage 1: Recepción */}
                                        <div className="relative flex flex-col items-center">
                                            <div className="z-10 size-12 rounded-full bg-primary flex items-center justify-center text-white font-bold text-lg ring-8 ring-white dark:ring-zinc-900 shadow-lg">
                                                1
                                            </div>
                                            <div className="mt-4 text-center">
                                                <h3 className="text-xl font-bold text-slate-800 dark:text-white">Recepción</h3>
                                                <p className="text-sm text-slate-500 font-semibold">
                                                    {format(new Date(ingreso.fecha_ingreso), "dd 'de' MMMM 'de' yyyy", { locale: es })}
                                                </p>
                                            </div>

                                            {/* Branches */}
                                            <div className="w-full max-w-4xl grid grid-cols-2 mt-8 gap-12 relative">
                                                <div className="absolute top-1/2 left-0 w-full h-px bg-slate-200 dark:bg-slate-700 -z-10"></div>

                                                {/* Left Branch */}
                                                <div className="flex flex-col items-end gap-3">
                                                    <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm w-64 hover:border-primary cursor-pointer transition-all">
                                                        <div className="flex items-center gap-3 mb-2">
                                                            <span className="material-symbols-outlined text-primary">assignment</span>
                                                            <p className="text-sm font-bold">Formulario de Recepción</p>
                                                        </div>
                                                        <p className="text-xs text-slate-500">
                                                            {ingreso.derivacion?.via_ingreso || 'Derivación directa'}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Right Branch */}
                                                <div className="flex flex-col items-start gap-3">
                                                    <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm w-64 hover:border-primary cursor-pointer transition-all">
                                                        <div className="flex items-center gap-3 mb-2">
                                                            <span className="material-symbols-outlined text-green-500">person</span>
                                                            <p className="text-sm font-bold">Profesional Asignado</p>
                                                        </div>
                                                        <p className="text-xs text-slate-500">
                                                            {ingreso.profesional_asignado_nombre || 'Sin asignar'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Stage 2: Planificación (if exists) */}
                                        {ingreso.planificacion && (
                                            <div className="relative flex flex-col items-center">
                                                <div className="z-10 size-12 rounded-full bg-primary flex items-center justify-center text-white font-bold text-lg ring-8 ring-white dark:ring-zinc-900 shadow-lg">
                                                    2
                                                </div>
                                                <div className="mt-4 text-center">
                                                    <h3 className="text-xl font-bold text-slate-800 dark:text-white">Planificación</h3>
                                                    <p className="text-sm text-slate-500 font-semibold">
                                                        {ingreso.planificacion.created_at && format(new Date(ingreso.planificacion.created_at), "dd 'de' MMMM", { locale: es })}
                                                    </p>
                                                </div>

                                                <div className="w-full max-w-2xl mt-8">
                                                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-6 rounded-2xl">
                                                        <p className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider mb-4">Objetivos del Plan</p>
                                                        <p className="text-sm text-slate-700 dark:text-slate-300 italic">
                                                            "{ingreso.planificacion.objetivos?.substring(0, 200)}..."
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Stage 3: Intervenciones */}
                                        {ingreso.intervenciones && ingreso.intervenciones.length > 0 && (
                                            <div className="relative flex flex-col items-center">
                                                <div className="z-10 size-12 rounded-full bg-primary flex items-center justify-center text-white font-bold text-lg ring-8 ring-white dark:ring-zinc-900 shadow-lg">
                                                    {ingreso.planificacion ? '3' : '2'}
                                                </div>
                                                <div className="mt-4 text-center">
                                                    <h3 className="text-xl font-bold text-slate-800 dark:text-white">Ampliación</h3>
                                                    <p className="text-sm text-slate-500 font-semibold">
                                                        {format(new Date(ingreso.intervenciones[ingreso.intervenciones.length - 1].fecha), "dd MMM", { locale: es })} - {format(new Date(ingreso.intervenciones[0].fecha), "dd MMM yyyy", { locale: es })}
                                                    </p>
                                                </div>

                                                <div className="w-full flex justify-center gap-6 mt-8 flex-wrap">
                                                    {ingreso.intervenciones.slice(0, 3).map((inter: any, idx: number) => (
                                                        <div key={idx} className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm w-56 hover:border-primary cursor-pointer transition-all">
                                                            <div className="flex items-center gap-3 mb-2">
                                                                <span className="material-symbols-outlined text-blue-400">chat</span>
                                                                <p className="text-sm font-bold">{inter.modalidad}</p>
                                                            </div>
                                                            <p className="text-xs text-slate-500">
                                                                {inter.entrevistado_nombre} • {inter.vinculo}
                                                            </p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Stage 4: Informe Síntesis */}
                                        {ingreso.informe_sintesis && (
                                            <div className="relative flex flex-col items-center">
                                                <div className="z-10 size-12 rounded-full bg-primary flex items-center justify-center text-white font-bold text-lg ring-8 ring-white dark:ring-zinc-900 shadow-lg">
                                                    {(ingreso.planificacion ? 1 : 0) + (ingreso.intervenciones && ingreso.intervenciones.length > 0 ? 1 : 0) + 2}
                                                </div>
                                                <div className="mt-4 text-center">
                                                    <h3 className="text-xl font-bold text-slate-800 dark:text-white">Informe Síntesis</h3>
                                                    <p className="text-sm text-slate-500 font-semibold">
                                                        {ingreso.informe_sintesis.created_at && format(new Date(ingreso.informe_sintesis.created_at), "dd 'de' MMMM 'de' yyyy", { locale: es })}
                                                    </p>
                                                </div>

                                                <div className="w-full max-w-2xl mt-8">
                                                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-6 rounded-2xl">
                                                        <p className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-4">Diagnóstico de Situación</p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {ingreso.vulneraciones?.slice(0, 3).map((v: any, i: number) => (
                                                                <span key={i} className="bg-white dark:bg-slate-800 px-3 py-1.5 rounded-full text-sm font-medium border border-amber-200 dark:border-amber-800 flex items-center gap-2">
                                                                    <span className="material-symbols-outlined text-[18px] text-amber-500">warning</span>
                                                                    {v.catalogo_derechos?.categoria}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Stage 5: Definición de Medidas */}
                                        {measuresSummary && measuresSummary.length > 0 && (
                                            <div className="relative flex flex-col items-center">
                                                <div className="z-10 size-12 rounded-full bg-primary flex items-center justify-center text-white font-bold text-lg ring-8 ring-white dark:ring-zinc-900 shadow-lg">
                                                    {(ingreso.planificacion ? 1 : 0) + (ingreso.intervenciones && ingreso.intervenciones.length > 0 ? 1 : 0) + (ingreso.informe_sintesis ? 1 : 0) + 2}
                                                </div>
                                                <div className="mt-4 text-center">
                                                    <h3 className="text-xl font-bold text-slate-800 dark:text-white">Definición de Medidas</h3>
                                                    <p className="text-sm text-slate-500 font-semibold">{measuresSummary.length} medida{measuresSummary.length !== 1 ? 's' : ''} de protección</p>
                                                </div>

                                                <div className="w-full max-w-3xl mt-8 space-y-4">
                                                    {measuresSummary.map((medida: any, idx: number) => (
                                                        <div key={idx} className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border-l-4 border-l-primary border border-slate-200 dark:border-zinc-800 shadow-md hover:shadow-lg transition-all">
                                                            <div className="flex justify-between items-start mb-3">
                                                                <span className={`text-xs font-bold px-2 py-1 rounded ${medida.estado === 'activa' ? 'bg-primary/10 text-primary' : medida.estado === 'finalizada' ? 'bg-slate-100 dark:bg-slate-800 text-slate-500' : 'bg-orange-100 text-orange-600'}`}>
                                                                    {medida.estado || 'Activa'}
                                                                </span>
                                                                {medida.created_at && (
                                                                    <p className="text-xs text-slate-400">
                                                                        {format(new Date(medida.created_at), "dd/MM/yyyy", { locale: es })}
                                                                    </p>
                                                                )}
                                                            </div>
                                                            <h4 className="font-bold text-base mb-2 text-slate-800 dark:text-white">{medida.medida_propuesta}</h4>
                                                            <p className="text-sm text-slate-500">
                                                                Responsables: {medida.responsables || 'Equipo técnico'}
                                                            </p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Stage 6: Cese */}
                                        {ingreso.cese ? (
                                            <div className="relative flex flex-col items-center">
                                                <div className="z-10 size-12 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-lg ring-8 ring-white dark:ring-zinc-900 shadow-lg">
                                                    <span className="material-symbols-outlined">verified</span>
                                                </div>
                                                <div className="mt-4 text-center">
                                                    <h3 className="text-xl font-bold text-slate-800 dark:text-white">Cese</h3>
                                                    <p className="text-sm text-slate-500 font-semibold">
                                                        {ingreso.cese.fecha_cierre && format(new Date(ingreso.cese.fecha_cierre), "dd 'de' MMMM 'de' yyyy", { locale: es })}
                                                    </p>
                                                </div>

                                                <div className="mt-10 bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800 p-8 rounded-3xl w-full max-w-md text-center">
                                                    <span className="material-symbols-outlined text-4xl text-green-500 mb-3">check_circle</span>
                                                    <h4 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Caso Cerrado</h4>
                                                    <p className="text-sm text-slate-600 dark:text-slate-400">
                                                        {ingreso.cese.motivo_cese === 'restitucion_integral' && 'Restitución integral de derechos'}
                                                        {ingreso.cese.motivo_cese === 'solicitud_medida_excepcional' && 'Derivado a SENAF'}
                                                    </p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="relative flex flex-col items-center">
                                                <div className="z-10 size-12 rounded-full bg-slate-300 dark:bg-slate-700 flex items-center justify-center text-white font-bold text-lg ring-8 ring-white dark:ring-zinc-900 shadow-lg">
                                                    <span className="material-symbols-outlined">lock_open</span>
                                                </div>
                                                <div className="mt-4 text-center">
                                                    <h3 className="text-xl font-bold text-slate-800 dark:text-white">Cese</h3>
                                                    <p className="text-sm text-slate-500 font-semibold">En Proceso</p>
                                                </div>

                                                <div className="mt-10 bg-white dark:bg-zinc-900 border-2 border-dashed border-slate-300 dark:border-slate-700 p-8 rounded-3xl w-full max-w-md text-center">
                                                    <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600 mb-3">pending</span>
                                                    <h4 className="text-lg font-bold text-slate-400 dark:text-slate-500">Cierre Pendiente</h4>
                                                    <p className="text-sm text-slate-400 dark:text-slate-500 italic mt-2">
                                                        El caso permanece activo. Acceda a Definición de Medidas para iniciar el cierre.
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

        </main >
    );
};

export default IngresoDetail;
