import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Breadcrumbs from '../../../components/ui/Breadcrumbs';

interface AccionesProps {
    ingreso: any;
    planificacion: any;
}

const AccionesAmpliacion: React.FC<AccionesProps> = ({ ingreso, planificacion }) => {
    const [intervenciones, setIntervenciones] = useState<any[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [usuarios, setUsuarios] = useState<any[]>([]);
    const [personasDisponibles, setPersonasDisponibles] = useState<any[]>([]);
    const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
    const [selectedIntervencion, setSelectedIntervencion] = useState<any | null>(null);

    // Form state for new intervention
    const [newIntervencion, setNewIntervencion] = useState({
        tipo_entrevistado: 'Adulto',
        fecha: format(new Date(), 'yyyy-MM-dd'),
        hora: format(new Date(), 'HH:mm'),
        entrevistado_nombre: '',
        vinculo: 'Padre/Madre',
        convive: false,
        registro: '',
        asistencia: 'Asistió',
        profesionales_ids: [] as string[],
        documentos: [] as { file: File; nombre: string; subcategoria: string }[]
    });

    const fetchIntervenciones = async () => {
        const { data } = await supabase
            .from('form2_intervenciones')
            .select('*, form2_intervencion_profesionales(usuario_id)')
            .eq('ingreso_id', ingreso.id)
            .order('fecha', { ascending: false })
            .order('hora', { ascending: false });

        if (data) setIntervenciones(data);
    };

    const fetchUsuarios = async () => {
        const { data } = await supabase.from('usuarios').select('id, nombre_completo').eq('activo', true);
        if (data) setUsuarios(data);
    };

    const fetchPersonas = async () => {
        const [family, support] = await Promise.all([
            supabase.from('grupo_conviviente').select('*').eq('ingreso_id', ingreso.id),
            supabase.from('referentes_comunitarios').select('*').eq('ingreso_id', ingreso.id)
        ]);

        const combined = [
            ...(family.data || []).map(p => ({ ...p, source: 'Familiar' })),
            ...(support.data || []).map(p => ({ ...p, source: 'Referente' }))
        ];
        setPersonasDisponibles(combined);
    };

    useEffect(() => {
        void fetchIntervenciones();
        void fetchUsuarios();
        void fetchPersonas();
    }, [ingreso.id]);

    const handleSaveIntervencion = async () => {
        if (!newIntervencion.entrevistado_nombre || !newIntervencion.registro) {
            alert('Por favor complete el nombre y el registro.');
            return;
        }

        setIsSaving(true);
        try {
            const { data: intervencion, error: intErr } = await supabase.from('form2_intervenciones').insert({
                ingreso_id: ingreso.id,
                tipo_entrevistado: newIntervencion.tipo_entrevistado,
                fecha: newIntervencion.fecha,
                hora: newIntervencion.hora,
                entrevistado_nombre: newIntervencion.entrevistado_nombre,
                vinculo: newIntervencion.vinculo,
                convive: newIntervencion.convive,
                registro: newIntervencion.registro,
                asistencia: newIntervencion.asistencia
            }).select().single();

            if (intErr) throw intErr;

            if (newIntervencion.profesionales_ids.length > 0) {
                const profPayload = newIntervencion.profesionales_ids.map(uid => ({
                    intervencion_id: intervencion.id,
                    usuario_id: uid
                }));
                await supabase.from('form2_intervencion_profesionales').insert(profPayload);
            }

            // Save documents with real upload
            if (newIntervencion.documentos.length > 0) {
                for (const doc of newIntervencion.documentos) {
                    try {
                        const fileExt = doc.file.name.split('.').pop();
                        const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
                        const filePath = `${ingreso.expediente_id}/${fileName}`;

                        // 1. Upload to Storage
                        const { error: uploadError } = await supabase.storage
                            .from('expedientes')
                            .upload(filePath, doc.file);

                        if (uploadError) throw uploadError;

                        // 2. Get Public URL
                        const { data: { publicUrl } } = supabase.storage
                            .from('expedientes')
                            .getPublicUrl(filePath);

                        // 3. Insert into DB
                        const { error: docErr } = await supabase.from('documentos').insert({
                            ingreso_id: ingreso.id,
                            intervencion_id: intervencion.id,
                            origen: 'Ampliación',
                            tipo: fileExt?.toUpperCase() === 'PDF' ? 'PDF' : 'Imagen',
                            subcategoria: doc.subcategoria,
                            nombre: doc.nombre,
                            url: publicUrl
                        });

                        if (docErr) console.warn('Error al guardar registro de documento:', docErr);
                    } catch (err) {
                        console.error('Error subiendo archivo:', doc.nombre, err);
                        alert(`Error al subir el archivo ${doc.nombre}. Se guardará la intervención pero el archivo podría faltar.`);
                    }
                }
            }

            // Track last user in parent ingreso
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await supabase.from('ingresos').update({
                    ultimo_usuario_id: user.id,
                    updated_at: new Date().toISOString()
                }).eq('id', ingreso.id);

                // Optional: Audit record
                await supabase.from('auditoria').insert({
                    tabla: 'ingresos',
                    registro_id: ingreso.id,
                    accion: 'NUEVA_INTERVENCION',
                    usuario_id: user.id
                });
            }

            setIsModalOpen(false);
            setNewIntervencion({
                tipo_entrevistado: 'Adulto',
                fecha: format(new Date(), 'yyyy-MM-dd'),
                hora: format(new Date(), 'HH:mm'),
                entrevistado_nombre: '',
                vinculo: 'Padre/Madre',
                convive: false,
                registro: '',
                asistencia: 'Asistió',
                profesionales_ids: [],
                documentos: []
            });
            void fetchIntervenciones();
        } catch (error: any) {
            alert('Error al guardar: ' + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-[#101722] font-display">
            {/* Main Content */}
            <div className="flex-1 flex flex-col max-w-7xl mx-auto w-full pb-12">
                {/* Breadcrumbs & Header */}
                <div className="px-6 pt-10 space-y-4">
                    <Breadcrumbs
                        items={[
                            { label: 'Inicio', path: '/' },
                            { label: 'Expedientes', path: '/expedientes' },
                            { label: 'Historial de Ingresos', path: `/expedientes/${ingreso.expediente_id}/ingresos` },
                            { label: 'Detalle de Legajo', path: `/expedientes/${ingreso.expediente_id}/ingresos/${ingreso.id}` },
                            { label: 'Planificación y Ampliación', active: true }
                        ]}
                    />

                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden relative group">
                        <div className="absolute top-0 left-0 w-2 h-full bg-primary/20 group-hover:bg-primary transition-all"></div>
                        <div className="flex flex-col gap-2 relative z-10">
                            <h1 className="text-[#111418] dark:text-white text-3xl font-black leading-tight tracking-tight">Acciones e Historial de Ampliación</h1>
                            <p className="text-[#60728a] dark:text-slate-400 text-sm max-w-2xl font-medium italic">"{planificacion.objetivos.substring(0, 100)}..."</p>
                        </div>
                        <div className="flex gap-3 relative z-10">
                            <button onClick={() => setIsModalOpen(true)} className="px-6 h-14 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2">
                                <span className="material-symbols-outlined text-xl">add_box</span>
                                <span>Nueva Intervención</span>
                            </button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 px-6 mt-8">
                    {/* Left Column: Summary & Quick Actions */}
                    <div className="lg:col-span-4 space-y-6">
                        {/* Profile Card */}
                        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm text-center flex flex-col items-center gap-4">
                            <div className="size-24 rounded-3xl bg-primary/10 flex items-center justify-center text-primary">
                                <span className="material-symbols-outlined text-5xl">person</span>
                            </div>
                            <div>
                                <h3 className="text-xl font-black tracking-tight">{ingreso.expedientes?.ninos?.nombre} {ingreso.expedientes?.ninos?.apellido}</h3>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{ingreso.expedientes?.ninos?.dni || 'S/D DNI'}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-3 w-full pt-4 border-t border-slate-50 dark:border-slate-800">
                                <div className="p-3 bg-slate-50/50 dark:bg-slate-800/50 rounded-2xl text-left">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Etapa</p>
                                    <p className="text-xs font-bold capitalize">{ingreso.etapa}</p>
                                </div>
                                <div className="p-3 bg-slate-50/50 dark:bg-slate-800/50 rounded-2xl text-left">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">DNI Niño/a</p>
                                    <p className="text-xs font-bold">{ingreso.expedientes?.ninos?.dni || '-'}</p>
                                </div>
                            </div>
                        </div>

                        {/* Planning Info */}
                        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
                            <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Detalles del Plan</h4>
                            <div className="space-y-4">
                                <div className="flex gap-4">
                                    <span className="material-symbols-outlined text-primary bg-primary/10 p-2 rounded-xl h-fit">target</span>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-[#60708a] mb-1">Estrategia</p>
                                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300 leading-snug">{planificacion.estrategias}</p>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <span className="material-symbols-outlined text-primary bg-primary/10 p-2 rounded-xl h-fit">calendar_month</span>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-[#60708a] mb-1">Cierre Estimado</p>
                                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                            {planificacion.fecha_fin_estimada ? format(new Date(planificacion.fecha_fin_estimada), "dd 'de' MMMM", { locale: es }) : 'Pendiente'}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsPlanModalOpen(true)}
                                    className="w-full mt-2 py-3 bg-slate-50 dark:bg-slate-800 text-primary border border-primary/20 hover:border-primary rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2"
                                >
                                    <span className="material-symbols-outlined text-lg">visibility</span>
                                    Ver Plan Completo
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Timeline */}
                    <div className="lg:col-span-8 space-y-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-black tracking-tight text-[#111418] dark:text-white uppercase tracking-[0.05em] flex items-center gap-3">
                                <span className="material-symbols-outlined text-primary">history</span>
                                Historial de Intervenciones ({intervenciones.length})
                            </h2>
                        </div>

                        {intervenciones.length === 0 ? (
                            <div className="bg-white dark:bg-slate-900 rounded-[32px] p-20 border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-center">
                                <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-200 mb-6">
                                    <span className="material-symbols-outlined text-5xl">history</span>
                                </div>
                                <h3 className="text-lg font-black uppercase tracking-widest text-slate-400 mb-2">Sin actividad registrada</h3>
                                <p className="text-slate-400 max-w-xs text-sm">Comience registrando una entrevista o solicitud oficial utilizando el botón de arriba.</p>
                            </div>
                        ) : (
                            <div className="relative space-y-6 before:absolute before:left-8 before:top-2 before:bottom-2 before:w-1 before:bg-slate-100 dark:before:bg-slate-800">
                                {intervenciones.map((item, idx) => (
                                    <div key={idx} className="relative flex gap-12 group">
                                        {/* Status Icon */}
                                        <div className={`z-10 size-16 rounded-3xl flex items-center justify-center shadow-xl transition-all group-hover:scale-110 ${item.asistencia === 'Asistió' ? 'bg-emerald-500 text-white shadow-emerald-500/20' :
                                            item.asistencia === 'No asistió' ? 'bg-rose-500 text-white shadow-rose-500/20' :
                                                'bg-amber-500 text-white shadow-amber-500/20'
                                            }`}>
                                            <span className="material-symbols-outlined text-2xl">
                                                {item.asistencia === 'Asistió' ? 'done_all' :
                                                    item.asistencia === 'No asistió' ? 'close' : 'schedule'}
                                            </span>
                                        </div>

                                        {/* Card Content */}
                                        <div className="flex-1 bg-white dark:bg-slate-900 p-8 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all relative overflow-hidden">
                                            <div className="absolute top-0 right-0 p-4">
                                                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">#{intervenciones.length - idx}</span>
                                            </div>
                                            <div className="flex flex-wrap justify-between items-start mb-4">
                                                <div>
                                                    <h3 className="text-xl font-black text-[#111418] dark:text-white leading-tight uppercase tracking-tight">{item.entrevistado_nombre}</h3>
                                                    <p className="text-[10px] font-black text-primary uppercase mt-1 tracking-widest">
                                                        {format(new Date(item.fecha), "dd MMM yyyy", { locale: es })} • {item.hora}
                                                    </p>
                                                </div>
                                                <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${item.asistencia === 'Asistió' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                    item.asistencia === 'No asistió' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                                        'bg-amber-50 text-amber-600 border-amber-100'
                                                    }`}>
                                                    {item.asistencia}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-start gap-6">
                                                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-6 italic flex-1">
                                                    "{item.registro.length > 200 ? `${item.registro.substring(0, 200)}...` : item.registro}"
                                                </p>
                                                {item.registro.length > 200 && (
                                                    <button
                                                        onClick={() => setSelectedIntervencion(item)}
                                                        className="shrink-0 px-4 py-2 bg-slate-50 dark:bg-slate-800 text-primary rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all"
                                                    >
                                                        Leer más
                                                    </button>
                                                )}
                                                {item.registro.length <= 200 && (
                                                    <button
                                                        onClick={() => setSelectedIntervencion(item)}
                                                        className="shrink-0 p-2 text-slate-300 hover:text-primary transition-all"
                                                        title="Ver detalle"
                                                    >
                                                        <span className="material-symbols-outlined">visibility</span>
                                                    </button>
                                                )}
                                            </div>
                                            <div className="flex flex-wrap items-center gap-3 pt-6 border-t border-slate-50 dark:border-slate-800">
                                                <div className="flex -space-x-3">
                                                    {(item.form2_intervencion_profesionales || []).map((_: any, i: number) => (
                                                        <div key={i} title="Profesional" className="size-8 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-white dark:border-slate-900 flex items-center justify-center text-[10px] font-black text-slate-500 uppercase">
                                                            P
                                                        </div>
                                                    ))}
                                                </div>
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                                                    {item.vinculo} • {item.tipo_entrevistado}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal de Registro de Intervención */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>

                    <div className="bg-[#f5f7f8] dark:bg-[#101722] w-full max-w-4xl max-h-[90vh] rounded-[32px] shadow-2xl flex flex-col overflow-hidden relative z-10 border border-slate-200 dark:border-slate-800">
                        {/* Header */}
                        <div className="flex items-center justify-between px-8 py-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                            <div>
                                <h2 className="text-[#111418] dark:text-white text-2xl font-black leading-tight uppercase tracking-tight">Registro de Intervención</h2>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Etapa 2 - Ampliación de Información</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="size-10 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                                <span className="material-symbols-outlined text-slate-500">close</span>
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-8">
                            <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-[#60708a] uppercase tracking-widest">Tipo de Entrevistado</label>
                                    <div className="flex h-14 items-center justify-center rounded-2xl bg-slate-200/50 dark:bg-slate-800/50 p-1.5">
                                        {['Adulto', 'NNyA'].map(type => (
                                            <button
                                                key={type}
                                                onClick={() => setNewIntervencion({ ...newIntervencion, tipo_entrevistado: type })}
                                                className={`flex-1 h-full rounded-xl text-xs font-black uppercase tracking-widest transition-all ${newIntervencion.tipo_entrevistado === type ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-slate-500'}`}
                                            >
                                                {type}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black text-[#60708a] uppercase tracking-widest">Fecha</label>
                                        <input
                                            className="w-full h-14 rounded-2xl border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white px-4 text-sm font-bold focus:ring-2 focus:ring-primary outline-none"
                                            type="date"
                                            value={newIntervencion.fecha}
                                            onChange={e => setNewIntervencion({ ...newIntervencion, fecha: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black text-[#60708a] uppercase tracking-widest">Hora</label>
                                        <input
                                            className="w-full h-14 rounded-2xl border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white px-4 text-sm font-bold focus:ring-2 focus:ring-primary outline-none"
                                            type="time"
                                            value={newIntervencion.hora}
                                            onChange={e => setNewIntervencion({ ...newIntervencion, hora: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </section>

                            {/* Interviewee & Professionals */}
                            <section className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-6">
                                <h3 className="text-[#111418] dark:text-white text-sm font-black uppercase tracking-widest flex items-center gap-3">
                                    <span className="material-symbols-outlined text-primary">person</span>
                                    Sujeto de la Intervención
                                </h3>

                                {/* Quick Select Personas */}
                                {personasDisponibles.length > 0 && (
                                    <div className="space-y-3">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sugerencias (Grupo Familiar / Red de Apoyo)</p>
                                        <div className="flex flex-wrap gap-2">
                                            {personasDisponibles.map((p, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => setNewIntervencion({
                                                        ...newIntervencion,
                                                        entrevistado_nombre: `${p.nombre} ${p.apellido || ''}`.trim(),
                                                        vinculo: p.vinculo || 'Padre/Madre',
                                                        convive: p.convive || false
                                                    })}
                                                    className="px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:border-primary hover:text-primary transition-all flex items-center gap-2"
                                                >
                                                    <span className="material-symbols-outlined text-sm">{p.source === 'Familiar' ? 'home' : 'group'}</span>
                                                    {p.nombre} ({p.vinculo})
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-[#60708a] uppercase tracking-widest">Nombre del Entrevistado</label>
                                        <input
                                            className="w-full h-14 rounded-2xl border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-4 text-sm font-bold focus:ring-2 focus:ring-primary outline-none"
                                            placeholder="Ej: Carmen (Madre)"
                                            value={newIntervencion.entrevistado_nombre}
                                            onChange={e => setNewIntervencion({ ...newIntervencion, entrevistado_nombre: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-[#60708a] uppercase tracking-widest">Vínculo</label>
                                        <select
                                            className="w-full h-14 rounded-2xl border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-4 text-sm font-bold focus:ring-2 focus:ring-primary outline-none appearance-none"
                                            value={newIntervencion.vinculo}
                                            onChange={e => setNewIntervencion({ ...newIntervencion, vinculo: e.target.value })}
                                        >
                                            <option>Padre/Madre</option>
                                            <option>Tío/a</option>
                                            <option>Referente afectivo</option>
                                            <option>Institución</option>
                                            <option>Vecino/a</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 pt-2">
                                    <div
                                        onClick={() => setNewIntervencion({ ...newIntervencion, convive: !newIntervencion.convive })}
                                        className={`size-6 rounded-lg border-2 flex items-center justify-center transition-all cursor-pointer ${newIntervencion.convive ? 'bg-primary border-primary text-white' : 'border-slate-200'}`}
                                    >
                                        {newIntervencion.convive && <span className="material-symbols-outlined text-[14px]">check</span>}
                                    </div>
                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">¿Convive con el niño, niña o adolescente?</span>
                                </div>
                            </section>

                            {/* Summary / Record */}
                            <section className="space-y-4">
                                <label className="text-[10px] font-black text-[#60708a] uppercase tracking-widest">Relato y Hallazgos de la Intervención</label>
                                <textarea
                                    className="w-full p-8 rounded-[32px] border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-bold italic focus:ring-2 focus:ring-primary outline-none shadow-sm min-h-[160px]"
                                    placeholder="Describa aquí lo conversado, clima de la entrevista, preocupaciones detectadas y compromisos asumidos..."
                                    value={newIntervencion.registro}
                                    onChange={e => setNewIntervencion({ ...newIntervencion, registro: e.target.value })}
                                />
                            </section>

                            {/* Professionals Selection (Tag style) */}
                            <section className="space-y-4">
                                <label className="text-[10px] font-black text-[#60708a] uppercase tracking-widest">Profesionales Intervinientes</label>
                                <div className="flex flex-wrap gap-2">
                                    {usuarios.map(u => {
                                        const isSel = newIntervencion.profesionales_ids.includes(u.id);
                                        return (
                                            <button
                                                key={u.id}
                                                onClick={() => {
                                                    const ids = isSel
                                                        ? newIntervencion.profesionales_ids.filter(id => id !== u.id)
                                                        : [...newIntervencion.profesionales_ids, u.id];
                                                    setNewIntervencion({ ...newIntervencion, profesionales_ids: ids });
                                                }}
                                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${isSel ? 'bg-primary text-white border-primary' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'}`}
                                            >
                                                {u.nombre_completo}
                                            </button>
                                        );
                                    })}
                                </div>
                            </section>

                            {/* Documentation Section */}
                            <section className="space-y-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-black text-[#60708a] uppercase tracking-widest flex items-center gap-2">
                                        <span className="material-symbols-outlined text-sm">attach_file</span>
                                        Documentación Respaldatoria
                                    </label>
                                    <label className="cursor-pointer px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-primary/10 hover:text-primary rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                                        + Seleccionar Archivos
                                        <input
                                            type="file"
                                            multiple
                                            className="hidden"
                                            onChange={(e) => {
                                                const files = Array.from(e.target.files || []);
                                                const newDocs = files.map(f => ({
                                                    file: f,
                                                    nombre: f.name,
                                                    subcategoria: 'Informe Técnico'
                                                }));
                                                setNewIntervencion({ ...newIntervencion, documentos: [...newIntervencion.documentos, ...newDocs] });
                                            }}
                                        />
                                    </label>
                                </div>

                                {newIntervencion.documentos.length > 0 ? (
                                    <div className="space-y-3">
                                        {newIntervencion.documentos.map((doc, idx) => (
                                            <div key={idx} className="flex flex-col md:flex-row gap-4 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm animate-in slide-in-from-left-4 duration-300">
                                                <div className="flex-1 space-y-2">
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Nombre del Archivo</p>
                                                    <input
                                                        className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-800 rounded-lg text-xs font-bold outline-none focus:ring-1 focus:ring-primary"
                                                        value={doc.nombre}
                                                        onChange={(e) => {
                                                            const docs = [...newIntervencion.documentos];
                                                            docs[idx].nombre = e.target.value;
                                                            setNewIntervencion({ ...newIntervencion, documentos: docs });
                                                        }}
                                                    />
                                                </div>
                                                <div className="w-full md:w-64 space-y-2">
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Clasificación</p>
                                                    <select
                                                        className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-800 rounded-lg text-xs font-bold outline-none focus:ring-1 focus:ring-primary appearance-none cursor-pointer"
                                                        value={doc.subcategoria}
                                                        onChange={(e) => {
                                                            const docs = [...newIntervencion.documentos];
                                                            docs[idx].subcategoria = e.target.value;
                                                            setNewIntervencion({ ...newIntervencion, documentos: docs });
                                                        }}
                                                    >
                                                        <option>Acta de Entrevista</option>
                                                        <option>Informe Técnico</option>
                                                        <option>Copia de DNI</option>
                                                        <option>Certificado Médico</option>
                                                        <option>Oficio Judicial</option>
                                                        <option>Otro</option>
                                                    </select>
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        const docs = newIntervencion.documentos.filter((_, i) => i !== idx);
                                                        setNewIntervencion({ ...newIntervencion, documentos: docs });
                                                    }}
                                                    className="mt-6 md:mt-5 p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                                                >
                                                    <span className="material-symbols-outlined">delete</span>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-8 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-3xl flex flex-col items-center justify-center text-center opacity-60">
                                        <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">upload_file</span>
                                        <p className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-400">Sin archivos adjuntos</p>
                                    </div>
                                )}
                            </section>

                            <section className="space-y-4 pb-8">
                                <label className="text-[10px] font-black text-[#60708a] uppercase tracking-widest">Resultado de la acción</label>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    {['Asistió', 'No asistió', 'Reprogramada'].map(status => (
                                        <button
                                            key={status}
                                            onClick={() => setNewIntervencion({ ...newIntervencion, asistencia: status })}
                                            className={`p-4 rounded-2xl border-2 flex items-center justify-between transition-all ${newIntervencion.asistencia === status ? 'border-primary bg-primary/5 text-primary' : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900'}`}
                                        >
                                            <span className="text-xs font-black uppercase tracking-widest">{status}</span>
                                            <span className={`material-symbols-outlined text-lg ${newIntervencion.asistencia === status ? 'text-primary' : 'text-slate-200'}`}>
                                                {status === 'Asistió' ? 'check_circle' : status === 'No asistió' ? 'cancel' : 'update'}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </section>
                        </div>

                        {/* Footer */}
                        <div className="px-8 py-6 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 flex items-center justify-end gap-4">
                            <button onClick={() => setIsModalOpen(false)} className="px-6 h-12 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50">
                                Cancelar
                            </button>
                            <button
                                onClick={handleSaveIntervencion}
                                disabled={isSaving}
                                className="bg-primary hover:bg-primary/90 text-white px-10 h-14 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20 transition-all font-bold disabled:opacity-50"
                            >
                                {isSaving ? 'Guardando...' : 'Guardar Intervención'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Detalle del Plan */}
            {isPlanModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsPlanModalOpen(false)}></div>
                    <div className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[90vh] rounded-[32px] shadow-2xl flex flex-col overflow-hidden relative z-10 border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between px-8 py-6 border-b border-slate-200 dark:border-slate-800">
                            <div>
                                <h2 className="text-[#111418] dark:text-white text-2xl font-black leading-tight uppercase tracking-tight">Detalles de Planificación</h2>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Estrategias y Objetivos de la Intervención</p>
                            </div>
                            <button onClick={() => setIsPlanModalOpen(false)} className="size-10 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                                <span className="material-symbols-outlined text-slate-500">close</span>
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
                            <section>
                                <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-4">01. Objetivos Generales</h4>
                                <div className="bg-slate-50/50 dark:bg-slate-800/50 rounded-2xl p-6 border border-slate-100 dark:border-slate-800">
                                    <p className="text-slate-700 dark:text-slate-300 text-lg font-medium leading-relaxed italic">
                                        "{planificacion.objetivos}"
                                    </p>
                                </div>
                            </section>

                            <section>
                                <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-4">02. Estrategias y Metodología</h4>
                                <div className="bg-slate-50/50 dark:bg-slate-800/50 rounded-2xl p-6 border border-slate-100 dark:border-slate-800 whitespace-pre-wrap text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                                    {planificacion.estrategias}
                                </div>
                            </section>

                            <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div>
                                    <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-4">03. Plazos de la Etapa</h4>
                                    <div className="flex items-center gap-4 bg-white dark:bg-slate-800/30 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                                        <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                            <span className="material-symbols-outlined text-xl">date_range</span>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Inicio y Fin Estimado</p>
                                            <p className="text-xs font-bold">
                                                {format(new Date(planificacion.fecha_inicio), "dd/MM/yyyy")} — {format(new Date(planificacion.fecha_fin_estimada), "dd/MM/yyyy")}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-4">04. Equipo Técnico</h4>
                                    <div className="flex -space-x-3 items-center">
                                        {(planificacion.form2_equipo || []).map((member: any, i: number) => {
                                            const userName = usuarios.find(u => u.id === member.usuario_id)?.nombre_completo || 'P';
                                            return (
                                                <div key={i} title={userName} className="size-12 rounded-full bg-slate-100 dark:bg-slate-800 border-4 border-white dark:border-slate-900 flex items-center justify-center text-xs font-black text-slate-500 hover:z-20 hover:scale-110 transition-all cursor-help uppercase shadow-sm">
                                                    {userName.substring(0, 2)}
                                                </div>
                                            );
                                        })}
                                        <span className="ml-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Profesionales</span>
                                    </div>
                                </div>
                            </section>
                        </div>
                        <div className="p-8 border-t border-slate-200 dark:border-slate-800 flex justify-end">
                            <button onClick={() => setIsPlanModalOpen(false)} className="px-8 py-3 bg-slate-900 dark:bg-slate-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all hover:bg-black">
                                Cerrar Detalles
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Detalle de Intervención */}
            {selectedIntervencion && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedIntervencion(null)}></div>
                    <div className="bg-[#fcfdfe] dark:bg-[#0f172a] w-full max-w-4xl max-h-[90vh] rounded-[40px] shadow-2xl flex flex-col overflow-hidden relative z-10 border border-white/20 animate-in slide-in-from-bottom-4 duration-300">
                        {/* Status bar at top */}
                        <div className={`h-2 w-full ${selectedIntervencion.asistencia === 'Asistió' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-10 md:p-14">
                            <div className="flex flex-col md:flex-row justify-between items-start gap-8 mb-12">
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{selectedIntervencion.entrevistado_nombre}</h2>
                                        <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${selectedIntervencion.asistencia === 'Asistió' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                                            {selectedIntervencion.asistencia}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg">
                                            <span className="material-symbols-outlined text-sm text-primary">calendar_today</span>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400">
                                                {format(new Date(selectedIntervencion.fecha), "dd MMMM yyyy", { locale: es })}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg">
                                            <span className="material-symbols-outlined text-sm text-primary">schedule</span>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400">
                                                {selectedIntervencion.hora} hs
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col items-end gap-2">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sujeto de Intervención</span>
                                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 px-4 py-2 rounded-xl border border-slate-100 dark:border-slate-700">
                                        {selectedIntervencion.vinculo} • {selectedIntervencion.tipo_entrevistado}
                                    </p>
                                </div>
                            </div>

                            <div className="relative">
                                <div className="absolute -left-6 top-0 bottom-0 w-1 bg-primary/20 rounded-full"></div>
                                <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-lg">description</span>
                                    Relato y Hallazgos Registrados
                                </h4>
                                <div className="prose dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 text-lg leading-relaxed whitespace-pre-wrap font-medium font-serif italic bg-slate-50/50 dark:bg-slate-800/30 p-8 rounded-3xl border border-slate-100 dark:border-slate-800">
                                    "{selectedIntervencion.registro}"
                                </div>
                            </div>
                        </div>

                        <div className="p-8 md:px-14 md:py-8 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-6">
                            <div className="flex items-center gap-4">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Profesionales en la Intervención:</span>
                                <div className="flex -space-x-2">
                                    {(selectedIntervencion.form2_intervencion_profesionales || []).map((_: any, i: number) => (
                                        <div key={i} className="size-8 rounded-full bg-white dark:bg-slate-800 border-2 border-primary/20 flex items-center justify-center text-[10px] font-black text-primary">
                                            P
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedIntervencion(null)}
                                className="w-full md:w-auto px-10 h-14 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl hover:scale-105 transition-all"
                            >
                                Cerrar Lectura
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AccionesAmpliacion;
