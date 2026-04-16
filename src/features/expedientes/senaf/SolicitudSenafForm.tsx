
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import Breadcrumbs from '../../../components/ui/Breadcrumbs';
import { generateSenafWord } from './generateSenafWord';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Seguimiento {
    id: number;
    fecha: string;
    estado: string;
    observacion: string;
    usuarios?: {
        nombre_completo: string;
    };
}

const SolicitudSenafForm = () => {
    const { expedienteId, ingresoId } = useParams<{ expedienteId: string; ingresoId: string }>();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [solicitudId, setSolicitudId] = useState<number | null>(null);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [status, setStatus] = useState<string>('En elaboración');
    const [observationModal, setObservationModal] = useState(false);
    const [observationText, setObservationText] = useState('');
    const [history, setHistory] = useState<Seguimiento[]>([]);
    const [assignedProfId, setAssignedProfId] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        agoto_medidas: false,
        riesgo_vida: false,
        valoracion_integral: '',
        fecha_solicitud: new Date().toISOString().split('T')[0],
        documento_url: ''
    });

    const fetchHistory = async (solId: number) => {
        try {
            const { data, error } = await supabase
                .from('solicitudes_seguimiento')
                .select('*, usuarios(nombre_completo)')
                .eq('solicitud_id', solId)
                .order('fecha', { ascending: false });

            if (data) setHistory(data);
            if (error) console.error("Error history query:", error);
        } catch (error) {
            console.error("Error fetching history:", error);
        }
    };

    useEffect(() => {
        const fetchAll = async () => {
            if (!ingresoId) return;
            setLoading(true);
            try {
                // Fetch User Role
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const { data: profile } = await supabase
                        .from('usuarios')
                        .select('*, usuarios_roles(roles(nombre))')
                        .eq('id', user.id)
                        .single();
                    setUserRole(profile?.usuarios_roles?.[0]?.roles?.nombre || 'Profesional');
                }

                // Fetch Ingreso Details and check Cese reason
                const { data: ingreso, error: ingresoError } = await supabase
                    .from('ingresos')
                    .select('profesional_asignado_id, cese:form9_cese_ingreso(*)')
                    .eq('id', ingresoId)
                    .single();

                if (ingresoError || !ingreso) {
                    throw new Error("No se encontró el ingreso especificado.");
                }

                setAssignedProfId(ingreso.profesional_asignado_id);

                // PROTECTION: Check if cese reason is correct
                // If there's no cese or the reason is not SENAF, redirect unless there's already a SENAF record (for history)
                const { data: senafRecord } = await supabase
                    .from('solicitudes_senaf')
                    .select('*')
                    .eq('ingreso_id', ingresoId)
                    .maybeSingle();

                const ceseRow = Array.isArray(ingreso.cese) ? ingreso.cese[0] : ingreso.cese;
                const matchesMotive = ceseRow?.motivo_cese === 'solicitud_medida_excepcional';

                if (!matchesMotive && !senafRecord) {
                    alert("Para acceder a este módulo, debe seleccionar 'Solicitud de medida excepcional' en el formulario de Cese de Intervención.");
                    navigate(`/expedientes/${expedienteId}/ingresos/${ingresoId}`);
                    return;
                }

                if (senafRecord) {
                    setSolicitudId(senafRecord.id);
                    setStatus(senafRecord.estado);
                    setFormData(prev => ({
                        ...prev,
                        valoracion_integral: senafRecord.valoracion_integral || '',
                        fecha_solicitud: senafRecord.fecha_solicitud || new Date().toISOString().split('T')[0],
                        documento_url: senafRecord.documento_url || ''
                    }));
                    fetchHistory(senafRecord.id);
                }
            } catch (error) {
                console.error("Error fetching data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchAll();
    }, [ingresoId]);

    const handleAction = async (action: 'save' | 'elevate' | 'observe' | 'approve') => {
        setSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            let nextStatus = status;
            let logMsg = '';

            if (action === 'save') {
                logMsg = 'Borrador guardado.';
            } else if (action === 'elevate') {
                if (userRole === 'Profesional') nextStatus = 'Pendiente Coordinación';
                else if (userRole === 'Coordinador') nextStatus = 'Pendiente Administración';
                logMsg = 'Solicitud elevada.';
            } else if (action === 'observe') {
                if (userRole === 'Coordinador') nextStatus = 'Observado Coordinación';
                else if (userRole === 'Administrador') nextStatus = 'Observado Administración';
                logMsg = `Observación cargada: ${observationText}`;
            } else if (action === 'approve' && userRole === 'Administrador') {
                nextStatus = 'Aprobado';
                logMsg = 'Solicitud aprobada finalmente.';
            }

            const payload = {
                ingreso_id: ingresoId,
                ...formData,
                estado: nextStatus
            };

            let currentSolId = solicitudId;
            if (currentSolId) {
                const { error: updateError } = await supabase.from('solicitudes_senaf').update(payload).eq('id', currentSolId);
                if (updateError) throw updateError;
            } else {
                const { data, error: insertError } = await supabase.from('solicitudes_senaf').insert(payload).select().single();
                if (insertError) throw insertError;
                currentSolId = data?.id;
                setSolicitudId(currentSolId);
            }

            // Track record
            if (currentSolId) {
                const { error: historyError } = await supabase.from('solicitudes_seguimiento').insert({
                    solicitud_id: currentSolId,
                    fecha: new Date().toISOString(),
                    estado: nextStatus,
                    observacion: logMsg,
                    responsable_id: user?.id
                });
                if (historyError) throw historyError;
                fetchHistory(currentSolId);

                // --- NOTIFICATIONS SYSTEM ---
                try {
                    const notificationPayloads: any[] = [];
                    const now = new Date().toISOString();
                    const link = `/expedientes/${expedienteId}/senaf/${ingresoId}`;

                    // Fetch users once to avoid complex join-based filters in DB
                    const { data: allUsers } = await supabase
                        .from('usuarios')
                        .select('id, servicio_proteccion_id, usuarios_roles(roles(nombre))');

                    if (allUsers) {
                        const admins = allUsers.filter(u => (u.usuarios_roles as any[])?.some(r => r.roles?.nombre === 'Administrador'));
                        const allCoordinators = allUsers.filter(u =>
                            (u.usuarios_roles as any[])?.some(r => r.roles?.nombre === 'Coordinador')
                        );

                        // 1. Notify Coordinators when Professional elevates
                        if (action === 'elevate' && userRole === 'Profesional') {
                            allCoordinators.forEach((coord: any) => {
                                notificationPayloads.push({
                                    usuario_id: coord.id,
                                    titulo: 'Nueva Solicitud SENAF',
                                    mensaje: `Se ha elevado una solicitud para el expediente #${expedienteId}.`,
                                    tipo: 'info',
                                    link,
                                    created_at: now
                                });
                            });
                        }

                        // 2. Notify Admins when Coordinator elevates
                        if (action === 'elevate' && userRole === 'Coordinador') {
                            admins.forEach(admin => {
                                notificationPayloads.push({
                                    usuario_id: admin.id,
                                    titulo: 'Revisión SENAF Requerida',
                                    mensaje: `Un coordinador ha elevado una solicitud para aprobación final (#${expedienteId}).`,
                                    tipo: 'info',
                                    link,
                                    created_at: now
                                });
                            });
                        }

                        // 3. Notify Professional when observed
                        if (action === 'observe' && assignedProfId) {
                            notificationPayloads.push({
                                usuario_id: assignedProfId,
                                titulo: 'Solicitud SENAF Observada',
                                mensaje: 'Tu solicitud ha sido observada y requiere cambios.',
                                tipo: 'warning',
                                link,
                                created_at: now
                            });
                        }

                        // 4. Notify Professional and Coordinators when Approved
                        if (action === 'approve') {
                            if (assignedProfId) {
                                notificationPayloads.push({
                                    usuario_id: assignedProfId,
                                    titulo: 'Solicitud SENAF APROBADA',
                                    mensaje: `¡Buenas noticias! La solicitud del expediente #${expedienteId} fue aprobada.`,
                                    tipo: 'success',
                                    link,
                                    created_at: now
                                });
                            }
                            allCoordinators.forEach((coord: any) => {
                                if (coord.id !== user?.id) {
                                    notificationPayloads.push({
                                        usuario_id: coord.id,
                                        titulo: 'SENAF Aprobada y Cerrada',
                                        mensaje: `Se completó la solicitud para el expediente #${expedienteId}.`,
                                        tipo: 'success',
                                        link,
                                        created_at: now
                                    });
                                }
                            });
                        }
                    }

                    if (notificationPayloads.length > 0) {
                        await supabase.from('notificaciones').insert(notificationPayloads);
                    }
                } catch (notifError) {
                    console.error('Error creating notifications:', notifError);
                }
            } // End if (currentSolId) for notifications
            // --- END NOTIFICATIONS ---

            // Close Case if approved
            if (nextStatus === 'Aprobado') {
                const { error: closingError } = await supabase.from('ingresos').update({
                    estado: 'cerrado',
                    etapa: 'cerrado',
                    ultimo_usuario_id: user?.id,
                    updated_at: new Date().toISOString()
                }).eq('id', ingresoId);
                if (closingError) throw closingError;
            }

            alert('Acción realizada con éxito');
            if (action !== 'save') navigate(`/expedientes/${expedienteId}/ingresos/${ingresoId}`);
            else setStatus(nextStatus);

        } catch (error) {
            console.error(error);
            alert('Error al realizar la acción');
        } finally {
            setSaving(false);
            setObservationModal(false);
        }
    };

    const handleDownloadWord = async () => {
        if (!ingresoId) return;
        setLoading(true);
        try {
            const { data: fullData, error } = await supabase
                .from('ingresos')
                .select(`
                    *,
                    expedientes (
                        *, 
                        servicios_proteccion (*), 
                        ninos (*),
                        grupo_conviviente!grupo_conviviente_expediente_id_fkey (*)
                    ),
                    form1_datos_nino (*),
                    form1_motivo (*),
                    derechos_vulnerados (*, catalogo_derechos (*)),
                    medidas (*, acciones (*))
                `)
                .eq('id', ingresoId)
                .single();

            if (error) throw error;

            const pdfData = {
                fecha: new Date().toISOString(),
                spd: {
                    nombre: fullData.expedientes?.servicios_proteccion?.nombre || 'SPD Municipalidad de Córdoba',
                    telefono: fullData.expedientes?.servicios_proteccion?.telefono || '-',
                    email: fullData.expedientes?.servicios_proteccion?.email || '-',
                },
                nna: {
                    nombre_completo: `${fullData.expedientes?.ninos?.nombre} ${fullData.expedientes?.ninos?.apellido}`,
                    dni: fullData.expedientes?.ninos?.dni?.toString() || '-',
                    rnp: fullData.expedientes?.ninos?.dni ? 'Si' : 'No',
                    historia_clinica: fullData.form1_datos_nino?.historia_clinica || '-',
                    cud: fullData.form1_datos_nino?.tiene_cud ? 'Si' : 'No',
                    obra_social: fullData.form1_datos_nino?.obra_social || '-',
                    escuela: fullData.form1_datos_nino?.escuela || '-',
                    grado: fullData.form1_datos_nino?.curso || '-',
                    turno: fullData.form1_datos_nino?.turno || '-',
                    domicilio_escuela: '-',
                    telefono_escuela: '-',
                    concurrencia: fullData.form1_datos_nino?.asiste_regularmente ? 'Si' : 'No',
                    nivel_alcanzado: fullData.form1_datos_nino?.curso || '-',
                    referente_escuela: '-',
                    trabaja: fullData.form1_datos_nino?.trabaja ? 'Si' : 'No',
                    tipo_trabajo: fullData.form1_datos_nino?.trabajo_detalle || '-',
                    tipo_familia: '-',
                },
                grupo_familiar: fullData.expedientes?.grupo_conviviente || [],
                valoracion_integral: formData.valoracion_integral || '',
                derechos_vulnerados: fullData.derechos_vulnerados || [],
                indicadores_vulneracion: fullData.derechos_vulnerados?.map((d: any) => d.indicador).join(', ') || '-',
                medidas_implementadas: fullData.medidas || [],
                indicadores_riesgo: [],
                agoto_medidas: formData.agoto_medidas,
                riesgo_vida: formData.riesgo_vida,
                firmas: ''
            };

            await generateSenafWord(pdfData);

        } catch (error) {
            console.error(error);
            alert('Error al generar el documento Word');
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !ingresoId || !expedienteId) return;

        setSaving(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `signed_senaf_${ingresoId}_${Date.now()}.${fileExt}`;
            const filePath = `${expedienteId}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('expedientes')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage.from('expedientes').getPublicUrl(filePath);

            setFormData(prev => ({ ...prev, documento_url: publicUrl }));

            if (solicitudId) {
                await supabase.from('solicitudes_senaf').update({ documento_url: publicUrl }).eq('id', solicitudId);
            }

            alert('Documento firmado subido correctamente');
        } catch (error) {
            console.error(error);
            alert('Error al subir el documento');
        } finally {
            setSaving(false);
        }
    };

    const isViewOnly = (userRole === 'Profesional' && status !== 'En elaboración' && !status.includes('Observado')) ||
        (userRole === 'Coordinador' && status === 'Pendiente Administración') ||
        (userRole === 'Administrador' && status === 'Pendiente Administración') ||
        (status === 'Aprobado');

    const getStatusColor = (est: string) => {
        if (est === 'Aprobado') return 'bg-green-500';
        if (est.includes('Observado')) return 'bg-red-500';
        if (est === 'En elaboración') return 'bg-gray-400';
        return 'bg-amber-500';
    };

    if (loading) return <div className="p-10 text-center">Cargando...</div>;

    return (
        <div className="min-h-screen bg-[#f6f8f8] dark:bg-[#121e20] text-[#121617] dark:text-white font-sans">
            <main className="max-w-[1200px] mx-auto py-10 px-6">
                <Breadcrumbs
                    items={[
                        { label: 'Inicio', path: '/' },
                        { label: 'Expedientes', path: '/expedientes' },
                        { label: 'Detalle', path: `/expedientes/${expedienteId}/ingresos/${ingresoId}` },
                        { label: 'Solicitud SENAF', active: true }
                    ]}
                />

                <div className="mb-10 text-center">
                    <h1 className="text-4xl font-black text-primary mb-2">Cese de la Intervención</h1>
                    <p className="text-gray-500 font-medium italic">Solicitud de medida excepcional a SENAF</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* Main Form */}
                    <div className="lg:col-span-8 bg-white dark:bg-[#1a2b2e] rounded-2xl shadow-xl p-8 border border-gray-100 dark:border-zinc-800 space-y-8">

                        <div className="flex justify-between items-center py-4 border-y border-gray-50 dark:border-zinc-800">
                            <div className="flex flex-col gap-1">
                                <span className="text-sm font-bold text-gray-600 dark:text-gray-400">Estado de la Solicitud</span>
                                <div className="flex items-center gap-2">
                                    <span className={`size-3 rounded-full ${status === 'Aprobado' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : status.includes('Observado') ? 'bg-red-500' : 'bg-amber-500 animate-pulse'}`}></span>
                                    <span className="text-sm font-black uppercase tracking-widest">{status}</span>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter mb-1">Fecha de Inicio</p>
                                <div className="bg-primary/10 text-primary px-4 py-2 rounded-lg font-black text-sm">
                                    {formData.fecha_solicitud}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <h2 className="text-xl font-bold text-primary border-l-4 border-primary pl-4">
                                Se resuelve el CESE DE LAS MEDIDAS DE PROTECCIÓN DE DERECHOS y la SOLICITUD DE LA MEDIDA EXCEPCIONAL A SENAF en razón de
                            </h2>

                            <div className="space-y-6 bg-gray-50 dark:bg-zinc-800/50 p-6 rounded-xl">
                                <div className="flex items-start justify-between gap-6">
                                    <p className="text-sm leading-relaxed">
                                        a) Haber agotado las Medidas de protección posibles para la restitución de los derechos vulnerados sin que los mismos hayan podido ser restituidos. (art 42, 45, 48 y 51 de la ley 9944)
                                    </p>
                                    <div className="flex gap-4 shrink-0">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="radio" disabled={isViewOnly} checked={formData.agoto_medidas === true} onChange={() => setFormData({ ...formData, agoto_medidas: true })} className="text-primary focus:ring-primary" />
                                            <span className="text-sm font-bold">Si</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="radio" disabled={isViewOnly} checked={formData.agoto_medidas === false} onChange={() => setFormData({ ...formData, agoto_medidas: false })} className="text-primary focus:ring-primary" />
                                            <span className="text-sm font-bold">No</span>
                                        </label>
                                    </div>
                                </div>

                                <div className="flex items-start justify-between gap-6 pt-6 border-t border-gray-200 dark:border-zinc-700">
                                    <p className="text-sm leading-relaxed">
                                        b) Existir un grave riesgo para la vida e integridad psicofísica de la niña, niño o adolescente, Sin haberse adoptado medidas de protección, se requiere urgente intervención del tercer nivel (art 42 e 51 de la ley 9944)
                                    </p>
                                    <div className="flex gap-4 shrink-0">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="radio" disabled={isViewOnly} checked={formData.riesgo_vida === true} onChange={() => setFormData({ ...formData, riesgo_vida: true })} className="text-primary focus:ring-primary" />
                                            <span className="text-sm font-bold">Si</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="radio" disabled={isViewOnly} checked={formData.riesgo_vida === false} onChange={() => setFormData({ ...formData, riesgo_vida: false })} className="text-primary focus:ring-primary" />
                                            <span className="text-sm font-bold">No</span>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase text-gray-400 mb-2">Valoración Integral</label>
                                    <textarea
                                        className="w-full bg-gray-50 dark:bg-zinc-800 border-none rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary/20"
                                        rows={10}
                                        disabled={isViewOnly}
                                        value={formData.valoracion_integral}
                                        onChange={e => setFormData({ ...formData, valoracion_integral: e.target.value })}
                                        placeholder="Fundamente la solicitud de medida excepcional con una valoración integral de la situación..."
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="pt-8 border-t border-gray-100 dark:border-zinc-800 flex flex-wrap gap-4 justify-between">
                            <div className="flex gap-3">
                                <button
                                    onClick={handleDownloadWord}
                                    className="px-6 py-3 border border-gray-200 dark:border-zinc-700 rounded-xl font-bold text-sm hover:bg-gray-50 flex items-center gap-2"
                                >
                                    <span className="material-symbols-outlined">download</span>
                                    Descargar Word Editable
                                </button>
                                <label className="px-6 py-3 border border-gray-200 dark:border-zinc-700 rounded-xl font-bold text-sm hover:bg-gray-50 flex items-center gap-2 cursor-pointer">
                                    <span className="material-symbols-outlined">{formData.documento_url ? 'task_alt' : 'upload'}</span>
                                    {formData.documento_url ? 'Archivo Subido' : 'Subir Firmado'}
                                    <input type="file" className="hidden" onChange={handleFileUpload} accept=".pdf,.doc,.docx,image/*" />
                                </label>
                                {formData.documento_url && (
                                    <a href={formData.documento_url} target="_blank" rel="noreferrer" className="p-3 text-primary hover:bg-primary/5 rounded-xl">
                                        <span className="material-symbols-outlined">visibility</span>
                                    </a>
                                )}
                            </div>

                            <div className="flex gap-3">
                                {!isViewOnly && userRole !== 'Administrador' && (
                                    <>
                                        <button
                                            onClick={() => handleAction('save')}
                                            disabled={saving}
                                            className="px-6 py-3 text-gray-500 font-bold hover:text-gray-700"
                                        >
                                            Guardar Borrador
                                        </button>
                                        <button
                                            onClick={() => handleAction('elevate')}
                                            disabled={saving || (userRole === 'Profesional' && !formData.documento_url)}
                                            className={`px-10 py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:brightness-110 transition-all flex items-center gap-2 ${(userRole === 'Profesional' && !formData.documento_url) ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            title={userRole === 'Profesional' && !formData.documento_url ? 'Debe subir el archivo firmado para elevar' : ''}
                                        >
                                            <span className="material-symbols-outlined">send</span>
                                            {userRole === 'Profesional' ? 'Elevar a Coordinación' : 'Elevar a Administración'}
                                        </button>
                                    </>
                                )}

                                {((userRole === 'Coordinador' && status === 'Pendiente Coordinación') || (userRole === 'Administrador' && status === 'Pendiente Administración')) && (
                                    <>
                                        <button
                                            onClick={() => setObservationModal(true)}
                                            disabled={saving}
                                            className="px-6 py-3 bg-red-50 text-red-600 rounded-xl font-bold hover:bg-red-100 transition-all"
                                        >
                                            Observar
                                        </button>
                                        {userRole === 'Administrador' && (
                                            <button
                                                onClick={() => handleAction('approve')}
                                                disabled={saving}
                                                className="px-10 py-3 bg-green-600 text-white rounded-xl font-bold shadow-lg shadow-green-600/20 hover:bg-green-700 transition-all flex items-center gap-2"
                                            >
                                                <span className="material-symbols-outlined">send</span>
                                                Aprobar y Enviar
                                            </button>
                                        )}
                                    </>
                                )}

                                {status === 'Aprobado' && (
                                    <button
                                        onClick={() => navigate(`/expedientes/${expedienteId}/senaf/${ingresoId}/resumen`)}
                                        className="px-10 py-3 bg-zinc-800 text-white rounded-xl font-bold shadow-lg hover:bg-zinc-900 transition-all"
                                    >
                                        Ver Resumen de Cierre
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Timeline Sidebar */}
                    <div className="lg:col-span-4 bg-white dark:bg-[#1a2b2e] rounded-2xl shadow-xl p-8 border border-gray-100 dark:border-zinc-800">
                        <h3 className="text-lg font-black text-[#121617] dark:text-white flex items-center gap-2 mb-8">
                            <span className="material-symbols-outlined text-primary">analytics</span>
                            Historial de la Solicitud
                        </h3>

                        {history.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                                <span className="material-symbols-outlined text-4xl mb-2">pending_actions</span>
                                <p className="text-xs font-bold uppercase tracking-widest text-center">Buscando registros...</p>
                            </div>
                        ) : (
                            <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
                                {history.map((item, idx) => (
                                    <div key={item.id} className={`relative flex items-center group ${idx === 0 ? 'animate-in fade-in slide-in-from-top-4' : ''}`}>
                                        {/* Dot */}
                                        <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-white dark:border-[#1a2b2e] shadow-sm shrink-0 z-10 ${getStatusColor(item.estado)}`}>
                                            <span className="material-symbols-outlined text-white text-base">
                                                {item.estado === 'Aprobado' ? 'verified' : item.estado.includes('Observado') ? 'error' : 'history'}
                                            </span>
                                        </div>
                                        {/* Content */}
                                        <div className="ml-6 flex-1 p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/30 shadow-sm transition-all hover:shadow-md">
                                            <div className="flex items-center justify-between space-x-2 mb-1">
                                                <div className="font-black text-primary text-[10px] uppercase tracking-wider">{item.estado}</div>
                                                <time className="font-bold text-[10px] text-slate-500 whitespace-nowrap">{format(new Date(item.fecha), "dd/MM HH:mm", { locale: es })}</time>
                                            </div>
                                            <p className="text-xs font-medium text-slate-600 dark:text-slate-400 leading-relaxed mb-2 break-words">
                                                {item.observacion}
                                            </p>
                                            {item.usuarios?.nombre_completo && (
                                                <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-zinc-800">
                                                    <div className="size-5 rounded-full bg-primary/20 flex items-center justify-center">
                                                        <span className="text-[10px] font-black text-primary">
                                                            {item.usuarios.nombre_completo[0]}
                                                        </span>
                                                    </div>
                                                    <span className="text-[10px] font-bold text-slate-400">{item.usuarios.nombre_completo}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="mt-10 p-4 rounded-xl bg-primary/5 border border-primary/10">
                            <p className="text-[10px] leading-tight text-primary/70 font-bold uppercase tracking-widest text-center">
                                El proceso requiere la aprobación final de Administración para el cierre del legajo.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Observation Modal */}
                {observationModal && (
                    <div className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
                            <div className="p-6 border-b border-gray-100 dark:border-zinc-800 flex justify-between items-center">
                                <h3 className="font-black text-xl">Realizar Observación</h3>
                                <button onClick={() => setObservationModal(false)}><span className="material-symbols-outlined">close</span></button>
                            </div>
                            <div className="p-6">
                                <textarea
                                    className="w-full bg-gray-50 dark:bg-zinc-800 border-none rounded-xl p-4 text-sm focus:ring-2 focus:ring-red-500/20"
                                    rows={4}
                                    placeholder="Detalle los motivos de la observación..."
                                    value={observationText}
                                    onChange={e => setObservationText(e.target.value)}
                                />
                            </div>
                            <div className="p-6 bg-gray-50 dark:bg-zinc-800 flex justify-end gap-3">
                                <button onClick={() => setObservationModal(false)} className="px-4 py-2 font-bold text-gray-500">Cancelar</button>
                                <button
                                    onClick={() => handleAction('observe')}
                                    disabled={!observationText}
                                    className="px-6 py-2 bg-red-600 text-white rounded-xl font-bold disabled:opacity-50"
                                >
                                    Confirmar Observación
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default SolicitudSenafForm;
