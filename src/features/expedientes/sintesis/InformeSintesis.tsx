import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { format } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { PDFDownloadLink } from '@react-pdf/renderer';
import InformeSintesisPDF from './InformeSintesisPDF';
import Breadcrumbs from '../../../components/ui/Breadcrumbs';

const InformeSintesis = () => {
    const { expedienteId, ingresoId } = useParams<{ expedienteId: string; ingresoId: string }>();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Data states
    const [ingreso, setIngreso] = useState<any>(null);
    const [datosNino, setDatosNino] = useState<any>(null);
    const [motivoRecepcion, setMotivoRecepcion] = useState<any>(null);
    const [informe, setInforme] = useState({
        fundamento_normativo: '',
        valoracion_integral: '',
        plan_accion: '',
        estado: 'borrador',
        profesionales_ids: [] as string[]
    });
    const [vulneraciones, setVulneraciones] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [history, setHistory] = useState<any[]>([]);

    // Right selection states
    const [catalogo, setCatalogo] = useState<any[]>([]);
    const [showRightSelector, setShowRightSelector] = useState(false);
    const [selectedRight, setSelectedRight] = useState('');

    // State for history preview
    const [previewVersion, setPreviewVersion] = useState<any>(null);

    useEffect(() => {
        const fetchData = async () => {
            if (!ingresoId) return;
            setLoading(true);
            try {
                // Fetch Ingreso basic data
                const { data: ingData } = await supabase
                    .from('vw_ingresos_detalle')
                    .select('*')
                    .eq('id', ingresoId)
                    .single();
                setIngreso(ingData);

                // Fetch Extended Antecedents (Form 1 Data)
                const { data: ninoData } = await supabase
                    .from('form1_datos_nino')
                    .select('*')
                    .eq('ingreso_id', ingresoId)
                    .maybeSingle();
                setDatosNino(ninoData);

                const { data: motivoData } = await supabase
                    .from('form1_motivo')
                    .select('*')
                    .eq('ingreso_id', ingresoId)
                    .maybeSingle();
                setMotivoRecepcion(motivoData);

                // Fetch Vulneraciones (Pre-load)
                const { data: vulData } = await supabase
                    .from('derechos_vulnerados')
                    .select('*, catalogo_derechos(categoria, subcategoria)')
                    .eq('ingreso_id', ingresoId);
                setVulneraciones(vulData || []);

                // Fetch existing informe if any
                const { data: informData } = await supabase
                    .from('form3_informe_sintesis')
                    .select('*')
                    .eq('ingreso_id', ingresoId)
                    .maybeSingle();

                if (informData) {
                    setInforme(informData);
                }

                // Fetch Users for selection
                const { data: usersData } = await supabase.from('usuarios').select('id, nombre_completo');
                if (usersData) setUsers(usersData);

                // Fetch Catalog for rights
                const { data: catData } = await supabase.from('catalogo_derechos').select('id, categoria, subcategoria').order('categoria');
                if (catData) setCatalogo(catData);

                // Fetch History
                if (informData) {
                    const { data: histData } = await supabase
                        .from('form3_informe_sintesis_historial')
                        .select('*')
                        .eq('informe_id', informData.id)
                        .order('created_at', { ascending: false });
                    setHistory(histData || []);
                }

            } catch (error) {
                console.error('Error fetching data', error);
            } finally {
                setLoading(false);
            }
        };

        void fetchData();
    }, [ingresoId]);

    const handleSave = async (finalizar = false) => {
        if (!ingresoId) return;
        setSaving(true);
        try {
            const payload = {
                ingreso_id: ingresoId,
                fundamento_normativo: informe.fundamento_normativo,
                valoracion_integral: informe.valoracion_integral,
                plan_accion: informe.plan_accion,
                profesionales_ids: informe.profesionales_ids,
                estado: finalizar ? 'finalizado' : 'borrador',
                updated_at: new Date().toISOString()
            };

            const { data: existing } = await supabase
                .from('form3_informe_sintesis')
                .select('id')
                .eq('ingreso_id', ingresoId)
                .maybeSingle();

            let reportId = existing?.id;

            if (existing) {
                await supabase.from('form3_informe_sintesis').update(payload).eq('id', existing.id);
            } else {
                const { data: newReport } = await supabase.from('form3_informe_sintesis').insert(payload).select('id').single();
                reportId = newReport?.id;
            }

            if (reportId) {
                // Save history entry
                await supabase.from('form3_informe_sintesis_historial').insert({
                    informe_id: reportId,
                    fundamento_normativo: payload.fundamento_normativo,
                    valoracion_integral: payload.valoracion_integral,
                    plan_accion: payload.plan_accion,
                    profesionales_ids: payload.profesionales_ids,
                    estado: payload.estado,
                    created_at: new Date().toISOString()
                });

                // Refresh history
                const { data: histData } = await supabase
                    .from('form3_informe_sintesis_historial')
                    .select('*')
                    .eq('informe_id', reportId)
                    .order('created_at', { ascending: false });
                setHistory(histData || []);
            }

            if (finalizar) {
                // Update Ingreso Etapa and track user
                const { data: { user } } = await supabase.auth.getUser();
                await supabase.from('ingresos').update({
                    etapa: 'definicion',
                    ultimo_usuario_id: user?.id,
                    updated_at: new Date().toISOString()
                }).eq('id', ingresoId);

                // Register audit
                await supabase.from('auditoria').insert({
                    tabla: 'ingresos',
                    registro_id: ingresoId as unknown as number,
                    accion: 'FINALIZADO_SINTESIS',
                    usuario_id: user?.id,
                    datos_nuevos: { etapa: 'definicion' }
                });

                alert('Informe Finalizado Correctamente');
                navigate(`/expedientes/${expedienteId}/ingresos/${ingresoId}`);
            } else {
                // Track user even on draft save
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    await supabase.from('ingresos').update({
                        ultimo_usuario_id: user.id,
                        updated_at: new Date().toISOString()
                    }).eq('id', ingresoId);
                }
                alert('Borrador Guardado');
            }

        } catch (error) {
            console.error('Error saving', error);
            alert('Error al guardar');
        } finally {
            setSaving(false);
        }
    };
    const handleAddRight = async () => {
        if (!selectedRight || !ingresoId) return;
        try {
            await supabase.from('derechos_vulnerados').insert({
                ingreso_id: ingresoId,
                derecho_id: selectedRight,
                observaciones: 'Agregado en etapa de Informe Síntesis'
            });

            // Refresh rights
            const { data: vulData } = await supabase
                .from('derechos_vulnerados')
                .select('*, catalogo_derechos(categoria, subcategoria)')
                .eq('ingreso_id', ingresoId);
            setVulneraciones(vulData || []);
            setShowRightSelector(false);
            setSelectedRight('');
        } catch (error) {
            console.error('Error adding right', error);
        }
    };

    const restoreVersion = (h: any) => {
        setInforme(prev => ({
            ...prev,
            fundamento_normativo: h.fundamento_normativo,
            valoracion_integral: h.valoracion_integral,
            plan_accion: h.plan_accion,
            profesionales_ids: h.profesionales_ids || []
        }));
        setPreviewVersion(null);
        alert('Versión restaurada en el editor. Recuerde guardar para aplicar los cambios.');
    };

    if (loading) return <div className="p-10 flex justify-center">Cargando información...</div>;
    if (!ingreso) return <div className="p-10 text-center">No se pudo cargar la información del ingreso.</div>;

    return (
        <div className="flex flex-col min-h-screen bg-[#f9fafa] dark:bg-[#1a1e23] text-[#121617] dark:text-gray-100 font-sans relative">

            {/* History Preview Modal */}
            {previewVersion && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-800">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-zinc-800/50">
                            <div>
                                <h3 className="text-lg font-bold">Vista Previa de Versión</h3>
                                <p className="text-xs text-gray-500">{format(new Date(previewVersion.created_at), "dd MMM yyyy - HH:mm", { locale: es })}</p>
                            </div>
                            <button onClick={() => setPreviewVersion(null)} className="p-2 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded-full transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            <div>
                                <h4 className="text-xs font-bold uppercase text-primary mb-2">Fundamento Normativo</h4>
                                <div className="p-4 bg-gray-50 dark:bg-zinc-800 rounded-lg text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                                    {previewVersion.fundamento_normativo || 'Sin contenido'}
                                </div>
                            </div>
                            <div>
                                <h4 className="text-xs font-bold uppercase text-primary mb-2">Valoración Integral</h4>
                                <div className="p-4 bg-gray-50 dark:bg-zinc-800 rounded-lg text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                                    {previewVersion.valoracion_integral || 'Sin contenido'}
                                </div>
                            </div>
                            <div>
                                <h4 className="text-xs font-bold uppercase text-primary mb-2">Plan de Acción</h4>
                                <div className="p-4 bg-gray-50 dark:bg-zinc-800 rounded-lg text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                                    {previewVersion.plan_accion || 'Sin contenido'}
                                </div>
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3 bg-gray-50 dark:bg-zinc-800/50">
                            <button onClick={() => setPreviewVersion(null)} className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                                Cerrar
                            </button>
                            <button onClick={() => restoreVersion(previewVersion)} className="px-4 py-2 bg-primary text-white text-sm font-bold rounded-lg shadow-lg shadow-primary/20 hover:scale-105 transition-all flex items-center gap-2">
                                <span className="material-symbols-outlined text-[18px]">history</span>
                                Restaurar esta versión
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <main className="flex-1 flex overflow-hidden h-[calc(100vh-64px)]">
                {/* Side Navigation (Left) */}

                {/* Main Content Area */}
                <section className="flex-1 flex flex-col overflow-y-auto custom-scrollbar scroll-smooth">
                    {/* Page Heading */}
                    <div className="p-6 md:p-10 max-w-4xl mx-auto w-full">
                        <Breadcrumbs
                            items={[
                                { label: 'Inicio', path: '/' },
                                { label: 'Expedientes', path: '/expedientes' },
                                { label: 'Historial de Ingresos', path: `/expedientes/${expedienteId}/ingresos` },
                                { label: 'Detalle de Legajo', path: `/expedientes/${expedienteId}/ingresos/${ingresoId}` },
                                { label: 'Informe Síntesis', active: true }
                            ]}
                        />
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10 border-b border-gray-100 dark:border-gray-800 pb-8">
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-widest">
                                    <span className="material-symbols-outlined text-[18px]">edit_note</span>
                                    Etapa 3 - Evaluación Técnica
                                </div>
                                <h1 className="text-4xl font-extrabold tracking-tight dark:text-white">Elaboración de Informe Síntesis</h1>
                                <p className="text-gray-500 dark:text-gray-400 text-lg">Caso #{ingreso?.expediente_numero || 'S/D'} | Sujeto: {ingreso?.nino_nombre} {ingreso?.nino_apellido} ({ingreso?.nino_edad || 'S/D'} años)</p>
                            </div>
                        </div>

                        {/* Form Content */}
                        <div className="flex flex-col gap-12 pb-32">
                            {/* Antecedentes Section */}
                            <div id="antecedentes" className="scroll-mt-24">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-2xl font-bold flex items-center gap-3">
                                        <span className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                                            <span className="material-symbols-outlined text-[20px]">history</span>
                                        </span>
                                        Antecedentes del Caso
                                    </h2>
                                    <span className="text-xs font-bold bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-500 uppercase">Pre-cargado de Form 1</span>
                                </div>
                                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
                                        <div className="w-full h-48 md:h-full bg-slate-200 dark:bg-slate-700 bg-center bg-no-repeat bg-cover flex items-center justify-center">
                                            <span className="material-symbols-outlined text-6xl text-slate-300">folder_shared</span>
                                        </div>
                                        <div className="p-6 md:col-span-2">
                                            <h4 className="font-bold text-lg mb-4">Información del Sistema de Ingreso</h4>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                                                <div className="col-span-1 md:col-span-2 space-y-1">
                                                    <p className="text-gray-500 font-bold uppercase text-[10px] tracking-wider">Motivo de Intervención</p>
                                                    <p className="font-medium text-gray-800 dark:text-gray-200">
                                                        {motivoRecepcion?.motivo_principal || 'No especificado'}
                                                    </p>
                                                    <p className="text-xs text-gray-500 line-clamp-2 italic">
                                                        "{motivoRecepcion?.descripcion_situacion || 'Sin descripción'}"
                                                    </p>
                                                </div>

                                                <div className="space-y-1">
                                                    <p className="text-gray-500 font-bold uppercase text-[10px] tracking-wider flex items-center gap-1">
                                                        <span className="material-symbols-outlined text-[14px]">school</span> Educación
                                                    </p>
                                                    <div className="text-gray-700 dark:text-gray-300 space-y-0.5">
                                                        <p><span className="font-semibold">Nivel:</span> {datosNino?.nivel_educativo || '-'}</p>
                                                        <p><span className="font-semibold">Escuela:</span> {datosNino?.escuela || '-'}</p>
                                                        <p><span className="font-semibold">Asiste:</span> {datosNino?.asiste_regularmente ? 'Sí' : 'No'}</p>
                                                    </div>
                                                </div>

                                                <div className="space-y-1">
                                                    <p className="text-gray-500 font-bold uppercase text-[10px] tracking-wider flex items-center gap-1">
                                                        <span className="material-symbols-outlined text-[14px]">medical_services</span> Salud
                                                    </p>
                                                    <div className="text-gray-700 dark:text-gray-300 space-y-0.5">
                                                        <p><span className="font-semibold">Centro:</span> {datosNino?.centro_salud || '-'}</p>
                                                        <p><span className="font-semibold">CUD:</span> {datosNino?.tiene_cud ? 'Sí' : 'No'}</p>
                                                        <p><span className="font-semibold">Obs:</span> {datosNino?.observaciones_salud || '-'}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between border-t border-gray-50 dark:border-gray-800 pt-4 mt-4">
                                                <button onClick={() => window.open(`/expedientes/${expedienteId}/recepcion/${ingresoId}`, '_blank')} className="text-primary text-sm font-bold flex items-center gap-1 hover:underline">
                                                    <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                                                    Ver Formulario de Recepción
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Fundamento Section */}
                            <div id="fundamento" className="scroll-mt-24">
                                <h2 className="text-2xl font-bold flex items-center gap-3 mb-6">
                                    <span className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                                        <span className="material-symbols-outlined text-[20px]">gavel</span>
                                    </span>
                                    Fundamento de la Intervención
                                </h2>
                                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
                                    <label className="block text-sm font-bold text-gray-500 uppercase mb-3">Marco Normativo y Justificación Técnica</label>
                                    <textarea
                                        className="w-full rounded-lg border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:ring-primary focus:border-primary text-sm leading-relaxed p-4 min-h-[160px]"
                                        placeholder="Describa la base legal y técnica que sustenta la medida actual..."
                                        rows={6}
                                        value={informe.fundamento_normativo || ''}
                                        onChange={(e) => setInforme({ ...informe, fundamento_normativo: e.target.value })}
                                    />
                                    <div className="flex justify-end mt-3">
                                        <p className="text-[10px] text-gray-400 font-medium">Mínimo 200 palabras recomendado</p>
                                    </div>
                                </div>
                            </div>

                            {/* Valoración Section */}
                            <div id="valoracion" className="scroll-mt-24">
                                <h2 className="text-2xl font-bold flex items-center gap-3 mb-6">
                                    <span className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                                        <span className="material-symbols-outlined text-[20px]">psychology</span>
                                    </span>
                                    Valoración Integral
                                </h2>
                                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-1 shadow-sm overflow-hidden">
                                    <div className="flex items-center gap-2 p-2 border-b border-gray-50 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                                        <button className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"><span className="material-symbols-outlined text-[18px]">format_bold</span></button>
                                        <button className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"><span className="material-symbols-outlined text-[18px]">format_italic</span></button>
                                        <button className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"><span className="material-symbols-outlined text-[18px]">format_list_bulleted</span></button>
                                    </div>
                                    <textarea
                                        className="w-full border-none bg-transparent focus:ring-0 text-sm p-6 leading-loose min-h-[300px]"
                                        placeholder="Inicie el análisis de la situación psicosocial, vínculos y entorno..."
                                        rows={10}
                                        value={informe.valoracion_integral || ''}
                                        onChange={(e) => setInforme({ ...informe, valoracion_integral: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Plan de Acción Section */}
                            <div id="plan" className="scroll-mt-24">
                                <h2 className="text-2xl font-bold flex items-center gap-3 mb-6">
                                    <span className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                                        <span className="material-symbols-outlined text-[20px]">list_alt</span>
                                    </span>
                                    Plan de Acción Sugerido
                                </h2>
                                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
                                    <label className="block text-sm font-bold text-gray-500 uppercase mb-3">Estrategias y Próximos Pasos</label>
                                    <textarea
                                        className="w-full rounded-lg border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:ring-primary focus:border-primary text-sm leading-relaxed p-4 min-h-[160px]"
                                        placeholder="Enumere las acciones a seguir..."
                                        rows={6}
                                        value={informe.plan_accion || ''}
                                        onChange={(e) => setInforme({ ...informe, plan_accion: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Derechos Vulnerados Section */}
                            <div id="derechos" className="scroll-mt-24">
                                <h2 className="text-2xl font-bold flex items-center gap-3 mb-6">
                                    <span className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                                        <span className="material-symbols-outlined text-[20px]">shield</span>
                                    </span>
                                    Derechos Vulnerados (Detectados y/o Ampliados)
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {vulneraciones.length > 0 ? (
                                        vulneraciones.map((vul, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-4 rounded-xl border-2 border-primary/20 bg-primary/5">
                                                <div className="flex items-center gap-3">
                                                    <span className="material-symbols-outlined text-primary">warning</span>
                                                    <span className="text-sm font-bold">{vul.catalogo_derechos?.categoria} - {vul.catalogo_derechos?.subcategoria}</span>
                                                </div>
                                                <span className="material-symbols-outlined text-primary text-[20px] fill-primary">check_circle</span>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-slate-500">No hay derechos vulnerados marcados.</p>
                                    )}
                                </div>

                                {/* Add Selector UI */}
                                {showRightSelector && (
                                    <div className="p-4 bg-gray-50 dark:bg-zinc-800 rounded-xl border border-dashed border-primary animate-in fade-in zoom-in-95 mt-4">
                                        <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Seleccione el derecho a agregar</label>
                                        <select
                                            className="w-full p-2 rounded-lg border-gray-300 dark:border-gray-700 dark:bg-zinc-700 text-sm mb-3"
                                            value={selectedRight}
                                            onChange={(e) => setSelectedRight(e.target.value)}
                                        >
                                            <option value="">-- Seleccionar --</option>
                                            {catalogo.map(c => (
                                                <option key={c.id} value={c.id}>{c.categoria} - {c.subcategoria}</option>
                                            ))}
                                        </select>
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => setShowRightSelector(false)} className="px-3 py-1.5 text-xs font-bold text-gray-500 hover:bg-gray-200 rounded-lg transition-colors">Cancelar</button>
                                            <button onClick={handleAddRight} disabled={!selectedRight} className="px-3 py-1.5 text-xs font-bold bg-primary text-white rounded-lg shadow-sm hover:brightness-110 disabled:opacity-50 transition-all">Confirmar</button>
                                        </div>
                                    </div>
                                )}

                                {!showRightSelector && (
                                    <div className="mt-4">
                                        <button onClick={() => setShowRightSelector(true)} className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-widest hover:bg-primary/5 px-4 py-2 rounded-lg border border-dashed border-primary/30 transition-all">
                                            <span className="material-symbols-outlined text-lg">add_circle</span>
                                            Agregar otro derecho
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Professionals Section */}
                            <div id="profesionales" className="scroll-mt-24">
                                <h2 className="text-2xl font-bold flex items-center gap-3 mb-6">
                                    <span className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                                        <span className="material-symbols-outlined text-[20px]">groups</span>
                                    </span>
                                    Equipo Interviniente
                                </h2>
                                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
                                    <label className="block text-sm font-bold text-gray-500 uppercase mb-4">Seleccione los profesionales que firman este informe</label>
                                    <div className="flex flex-wrap gap-3">
                                        {users.map(user => {
                                            const isSelected = (informe.profesionales_ids || []).includes(user.id);
                                            return (
                                                <button
                                                    key={user.id}
                                                    onClick={() => {
                                                        const current = informe.profesionales_ids || [];
                                                        const newItem = isSelected
                                                            ? current.filter(id => id !== user.id)
                                                            : [...current, user.id];
                                                        setInforme({ ...informe, profesionales_ids: newItem });
                                                    }}
                                                    className={`px-4 py-2 rounded-full text-xs font-bold border transition-all flex items-center gap-2
                                                        ${isSelected
                                                            ? 'bg-primary text-white border-primary shadow-md shadow-primary/20 transform scale-105'
                                                            : 'bg-white dark:bg-zinc-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-zinc-700 hover:border-primary/50'
                                                        }`}
                                                >
                                                    {isSelected && <span className="material-symbols-outlined text-[16px]">check</span>}
                                                    {user.nombre_completo}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {(informe.profesionales_ids || []).length === 0 && (
                                        <p className="text-xs text-orange-500 mt-3 font-medium flex items-center gap-1">
                                            <span className="material-symbols-outlined text-sm">warning</span>
                                            Debe seleccionar al menos un profesional.
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Change History Sidebar (Right) - Simplified for frontend demo, non-functional */}
                <aside className="hidden lg:flex w-80 flex-col border-l border-[#e5e7eb] dark:border-gray-800 bg-white dark:bg-[#1a1e23] p-0">
                    <div className="p-6 border-b border-gray-100 dark:border-gray-800">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500">Historial de Cambios</h3>
                            <span className="material-symbols-outlined text-[20px] text-gray-400 cursor-pointer hover:text-primary">settings_backup_restore</span>
                        </div>
                        <p className="text-xs text-gray-400">Seguimiento en tiempo real de versiones del informe.</p>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                        {/* History Item 1 */}
                        <div className="relative pl-6 border-l-2 border-primary/20">
                            <div className="absolute -left-[9px] top-0 size-4 rounded-full bg-primary border-4 border-white dark:border-gray-900"></div>
                            <p className="text-[10px] font-bold text-primary uppercase mb-1">Ahora</p>
                            <p className="text-xs font-semibold mb-1">En edición</p>
                            <p className="text-[11px] text-gray-500 mb-2">Trabajando en el borrador actual.</p>
                        </div>

                        {history.map((h) => (
                            <div key={h.id} className="relative pl-6 border-l-2 border-gray-200 dark:border-gray-800">
                                <div className="absolute -left-[5px] top-0 size-2.5 rounded-full bg-gray-300 dark:bg-gray-700 border-2 border-white dark:border-gray-900"></div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">{format(new Date(h.created_at), "dd MMM HH:mm", { locale: es })}</p>
                                <p className="text-xs font-semibold mb-1 text-gray-600 dark:text-gray-300">{h.estado === 'finalizado' ? 'Informe Finalizado' : 'Versión Guardada'}</p>
                                <p className="text-[11px] text-gray-400 mb-2 truncate">
                                    {(h.fundamento_normativo || '').substring(0, 50)}...
                                </p>
                                <button onClick={() => setPreviewVersion(h)} className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[12px]">visibility</span>
                                    Ver esta versión
                                </button>
                            </div>
                        ))}
                    </div>
                </aside>
            </main>

            {/* Sticky Footer Actions */}
            <footer className="sticky bottom-0 z-50 bg-white/90 dark:bg-[#1a1e23]/90 backdrop-blur-md border-t border-[#e5e7eb] dark:border-gray-800 px-6 md:px-10 py-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="hidden sm:flex items-center gap-2 text-xs text-gray-400">
                        <span className="material-symbols-outlined text-[16px]">cloud_done</span>
                        {saving ? 'Guardando...' : 'Cambios guardados localmente'}
                    </div>
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                        <PDFDownloadLink
                            document={
                                <InformeSintesisPDF
                                    ingreso={ingreso}
                                    informe={informe}
                                    vulneraciones={vulneraciones}
                                    users={users}
                                    motivoRecepcion={motivoRecepcion}
                                    datosNino={datosNino}
                                />
                            }
                            fileName={`Informe_Sintesis_${ingreso?.expediente_numero}.pdf`}
                            className="flex-1 sm:flex-none"
                        >
                            {({ loading: pdfLoading }) => (
                                <button disabled={pdfLoading} className="w-full flex items-center justify-center gap-2 min-w-[140px] px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition-all font-sans text-gray-700 dark:text-gray-300">
                                    <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
                                    {pdfLoading ? 'Generando...' : 'PDF'}
                                </button>
                            )}
                        </PDFDownloadLink>

                        <button onClick={() => handleSave(false)} disabled={saving} className="flex-1 sm:flex-none min-w-[140px] px-6 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition-all font-sans">
                            Guardar Borrador
                        </button>
                        <button onClick={() => handleSave(true)} disabled={saving} className="flex-1 sm:flex-none min-w-[160px] px-6 py-2.5 rounded-lg bg-primary text-white text-sm font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all font-sans">
                            Finalizar Informe
                        </button>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default InformeSintesis;
