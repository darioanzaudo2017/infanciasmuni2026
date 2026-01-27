
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import Breadcrumbs from '../../../components/ui/Breadcrumbs';
import { generateSenafWord } from './generateSenafWord';

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

    const [formData, setFormData] = useState({
        agoto_medidas: false,
        riesgo_vida: false,
        causa: '',
        fundamentacion: '',
        fecha_solicitud: new Date().toISOString().split('T')[0],
        documento_url: ''
    });

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

                const { data } = await supabase
                    .from('solicitudes_senaf')
                    .select('*')
                    .eq('ingreso_id', ingresoId)
                    .maybeSingle();

                if (data) {
                    setSolicitudId(data.id);
                    setStatus(data.estado);
                    setFormData({
                        agoto_medidas: data.agoto_medidas,
                        riesgo_vida: data.riesgo_vida,
                        causa: data.causa || '',
                        fundamentacion: data.fundamentacion || '',
                        fecha_solicitud: data.fecha_solicitud || new Date().toISOString().split('T')[0],
                        documento_url: data.documento_url || ''
                    });
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
                await supabase.from('solicitudes_senaf').update(payload).eq('id', currentSolId);
            } else {
                const { data } = await supabase.from('solicitudes_senaf').insert(payload).select().single();
                currentSolId = data?.id;
                setSolicitudId(currentSolId);
            }

            // Track record
            if (currentSolId) {
                await supabase.from('solicitudes_seguimiento').insert({
                    solicitud_id: currentSolId,
                    fecha: new Date().toISOString(),
                    estado: nextStatus,
                    observacion: logMsg,
                    responsable_id: user?.id
                });
            }

            // Close Case if approved
            if (nextStatus === 'Aprobado') {
                await supabase.from('ingresos').update({
                    estado: 'cerrado',
                    etapa: 'cerrado',
                    ultimo_usuario_id: user?.id,
                    updated_at: new Date().toISOString()
                }).eq('id', ingresoId);
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
                        grupo_conviviente (*)
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
                resena_situacion: formData.causa || fullData.form1_motivo?.descripcion_situacion || '',
                derechos_vulnerados: fullData.derechos_vulnerados || [],
                indicadores_vulneracion: fullData.derechos_vulnerados?.map((d: any) => d.indicador).join(', ') || '-',
                medidas_implementadas: fullData.medidas || [],
                fundamentacion: formData.fundamentacion || '',
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
        (status === 'Aprobado');

    if (loading) return <div className="p-10 text-center">Cargando...</div>;

    return (
        <div className="min-h-screen bg-[#f6f8f8] dark:bg-[#121e20] text-[#121617] dark:text-white font-sans">
            <main className="max-w-[1000px] mx-auto py-10 px-6">
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

                <div className="bg-white dark:bg-[#1a2b2e] rounded-2xl shadow-xl p-8 border border-gray-100 dark:border-zinc-800 space-y-8">

                    <div className="flex justify-between items-center py-4 border-y border-gray-50 dark:border-zinc-800">
                        <div className="flex flex-col gap-1">
                            <span className="text-sm font-bold text-gray-600 dark:text-gray-400">Estado Actual</span>
                            <div className="flex items-center gap-2">
                                <span className={`size-2 rounded-full ${status === 'Aprobado' ? 'bg-green-500' : status.includes('Observado') ? 'bg-red-500' : 'bg-amber-500'}`}></span>
                                <span className="text-xs font-black uppercase tracking-widest">{status}</span>
                            </div>
                        </div>
                        <div className="bg-primary/10 text-primary px-4 py-2 rounded-lg font-bold">
                            {formData.fecha_solicitud}
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
                                    b) Existir un grave riesgo para la vida e integridad psicofísica de la niña, niño o adolescente, Sin haberse adoptado medidas de protección, se requiere urgente intervención del tercer nivel (art 42 y 51 de la ley 9944)
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
                                <label className="block text-xs font-bold uppercase text-gray-400 mb-2">Reseña de la situación</label>
                                <textarea
                                    className="w-full bg-gray-50 dark:bg-zinc-800 border-none rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary/20"
                                    rows={4}
                                    disabled={isViewOnly}
                                    value={formData.causa}
                                    onChange={e => setFormData({ ...formData, causa: e.target.value })}
                                    placeholder="Describa brevemente la situación actual..."
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase text-gray-400 mb-2">Fundamentación</label>
                                <textarea
                                    className="w-full bg-gray-50 dark:bg-zinc-800 border-none rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary/20"
                                    rows={6}
                                    disabled={isViewOnly}
                                    value={formData.fundamentacion}
                                    onChange={e => setFormData({ ...formData, fundamentacion: e.target.value })}
                                    placeholder="Fundamente la solicitud de medida excepcional..."
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
                            {!isViewOnly && (
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
                                            className="px-10 py-3 bg-green-600 text-white rounded-xl font-bold shadow-lg shadow-green-600/20 hover:bg-green-700 transition-all"
                                        >
                                            Aprobar Solicitud
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
