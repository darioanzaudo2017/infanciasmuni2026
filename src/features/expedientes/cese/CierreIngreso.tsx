
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import Breadcrumbs from '../../../components/ui/Breadcrumbs';

const CierreIngreso = () => {
    const { expedienteId, ingresoId } = useParams<{ expedienteId: string; ingresoId: string }>();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ totalMedidas: 0, completedMedidas: 0 });
    const [formData, setFormData] = useState({
        motivo_cese: '',
        resumen_logros: '',
        observaciones_finales: ''
    });
    const [senafData, setSenafData] = useState({
        agoto_medidas: false,
        riesgo_vida: false,
        causa: '',
        fundamentacion: '',
    });
    const [senafStatus, setSenafStatus] = useState<string | null>(null);
    const [solicitudId, setSolicitudId] = useState<number | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [documentoUrl, setDocumentoUrl] = useState<string | null>(null);

    useEffect(() => {
        const fetchStats = async () => {
            if (!ingresoId) return;
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const { data: profile } = await supabase
                        .from('usuarios')
                        .select('*, usuarios_roles(roles(nombre))')
                        .eq('id', user.id)
                        .single();
                    setUserRole(profile?.usuarios_roles?.[0]?.roles?.nombre || 'Profesional');
                }

                const { data: medidas } = await supabase
                    .from('medidas')
                    .select('restituido')
                    .eq('ingreso_id', ingresoId);

                const total = medidas?.length || 0;
                const completed = medidas?.filter(m => m.restituido).length || 0;
                setStats({ totalMedidas: total, completedMedidas: completed });

                // Load existing cese data if available
                const { data: ceseData } = await supabase
                    .from('form9_cese_ingreso')
                    .select('*')
                    .eq('ingreso_id', parseInt(ingresoId))
                    .maybeSingle();

                if (ceseData) {
                    setFormData({
                        motivo_cese: ceseData.motivo_cese || '',
                        resumen_logros: ceseData.resumen_logros || '',
                        observaciones_finales: ceseData.observaciones_finales || ''
                    });
                }

                // Check for SENAF data
                const { data: senafRecord } = await supabase
                    .from('solicitudes_senaf')
                    .select('*')
                    .eq('ingreso_id', ingresoId)
                    .maybeSingle();

                if (senafRecord) {
                    setSolicitudId(senafRecord.id);
                    setSenafStatus(senafRecord.estado);
                    setDocumentoUrl(senafRecord.documento_url);
                    setSenafData({
                        agoto_medidas: senafRecord.agoto_medidas,
                        riesgo_vida: senafRecord.riesgo_vida,
                        causa: senafRecord.causa || '',
                        fundamentacion: senafRecord.fundamentacion || '',
                    });
                }
            } catch (error) {
                console.error("Error fetching stats:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, [ingresoId]);

    const handleSubmit = async () => {
        if (!ingresoId) return;
        setIsSaving(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();

            // 1. Check if cese already exists
            const { data: existingCese } = await supabase
                .from('form9_cese_ingreso')
                .select('id')
                .eq('ingreso_id', parseInt(ingresoId))
                .maybeSingle();

            // 2. Upsert Form 9 Record
            const cesePayload = {
                ingreso_id: parseInt(ingresoId),
                motivo_cese: formData.motivo_cese,
                resumen_logros: formData.resumen_logros,
                observaciones_finales: formData.observaciones_finales,
                fecha_cierre: new Date().toISOString()
            };

            if (existingCese) {
                await supabase.from('form9_cese_ingreso').update(cesePayload).eq('id', existingCese.id);
            } else {
                await supabase.from('form9_cese_ingreso').insert(cesePayload);
            }

            // 3. Handle SENAF if needed
            if (formData.motivo_cese === 'solicitud_medida_excepcional') {
                const senafPayload = {
                    ingreso_id: parseInt(ingresoId),
                    agoto_medidas: senafData.agoto_medidas,
                    riesgo_vida: senafData.riesgo_vida,
                    causa: senafData.causa || '',
                    fundamentacion: senafData.fundamentacion || '',
                    estado: senafStatus || 'En elaboración'
                };

                if (solicitudId) {
                    await supabase.from('solicitudes_senaf').update(senafPayload).eq('id', solicitudId);
                } else {
                    const { data: newSenaf } = await supabase.from('solicitudes_senaf').insert(senafPayload).select().single();
                    if (newSenaf) setSolicitudId(newSenaf.id);
                }

                // If it's a new or existing record, touch the ingreso but don't close it yet
                await supabase.from('ingresos').update({
                    ultimo_usuario_id: user?.id,
                    updated_at: new Date().toISOString()
                }).eq('id', parseInt(ingresoId));

                alert('Datos de cese y borrador SENAF guardados correctamente. Proceda a completar la elevación.');
                navigate(`/expedientes/${expedienteId}/senaf/${ingresoId}`);
            } else {
                // 4. Close Case for other reasons
                await supabase.from('ingresos').update({
                    estado: 'cerrado',
                    etapa: 'cerrado',
                    ultimo_usuario_id: user?.id,
                    updated_at: new Date().toISOString()
                }).eq('id', parseInt(ingresoId));

                await supabase.from('expedientes').update({
                    activo: false,
                    updated_at: new Date().toISOString()
                }).eq('id', parseInt(expedienteId || '0'));

                alert('Cierre registrado correctamente. El caso y el expediente han sido finalizados.');
                navigate(`/expedientes`);
            }

            // Audit
            if (user) {
                await supabase.from('auditoria').insert({
                    tabla: 'ingresos',
                    registro_id: parseInt(ingresoId),
                    accion: 'CIERRE_INTERVENCION',
                    usuario_id: user.id,
                    datos_nuevos: { ...formData, ...senafData }
                });
            }

        } catch (error) {
            console.error(error);
            alert('Error al registrar el cierre');
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) return <div className="flex h-screen items-center justify-center">Cargando...</div>;

    const progress = stats.totalMedidas > 0 ? (stats.completedMedidas / stats.totalMedidas) * 100 : 0;
    const isElevated = !!(senafStatus && senafStatus !== 'En elaboración' && !senafStatus.includes('Observado'));

    // For a Coordinator, if it's "Pendiente Coordinación", it's effectively read-only in this view
    const isLockedForRole = !!((userRole === 'Coordinador' || userRole === 'Administrador') && isElevated);

    return (
        <div className="min-h-screen bg-[#f6f8f8] dark:bg-[#121e20] text-[#121617] dark:text-white font-['Manrope',sans-serif]">
            {/* Top Navigation Bar from template (simplified for React context if needed, usually MainLayout handles this but this looks like a standalone or specific layout page based on HTML provided. I will assume it renders inside MainLayout or similar, but the user provided full HTML body, so I'll wrap it nicely) */}

            <main className="max-w-[1000px] mx-auto py-10 px-6">
                {/* Breadcrumbs */}
                <Breadcrumbs
                    items={[
                        { label: 'Inicio', path: '/' },
                        { label: 'Expedientes', path: '/expedientes' },
                        { label: 'Historial de Ingresos', path: `/expedientes/${expedienteId}/ingresos` },
                        { label: 'Detalle de Legajo', path: `/expedientes/${expedienteId}/ingresos/${ingresoId}` },
                        { label: 'Cierre de Ingreso', active: true }
                    ]}
                />

                {/* Page Heading */}
                <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-10">
                    <div className="flex flex-col gap-2">
                        <h1 className="text-[#121617] dark:text-white text-4xl font-black leading-tight tracking-tight">Formulario de Cese y Cierre de Ingreso</h1>
                        <p className="text-[#658086] text-lg font-medium">Expediente: Cierre de Intervención</p>
                    </div>
                    <button
                        onClick={() => navigate(`/expedientes/${expedienteId}/senaf/${ingresoId}/resumen`)}
                        className="flex items-center gap-2 rounded-lg h-10 px-4 bg-white dark:bg-[#1a2b2e] border border-[#e5e7eb] dark:border-[#2d3a3d] text-[#121617] dark:text-white text-sm font-bold hover:bg-gray-50 transition-colors shadow-sm"
                    >
                        <span className="material-symbols-outlined text-lg">history</span>
                        <span>Ver Historial</span>
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Form */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Main Form Section */}
                        <section className="bg-white dark:bg-[#1a2b2e] p-8 rounded-xl shadow-sm border border-[#e5e7eb] dark:border-[#2d3a3d]">
                            <div className="space-y-6">
                                {/* Motivo de Cese */}
                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-bold text-[#121617] dark:text-gray-300" htmlFor="motivo">Motivo de Cese</label>
                                    <select
                                        className="w-full h-12 px-4 rounded-lg bg-[#f6f8f8] dark:bg-[#121e20] border-[#dce3e5] dark:border-[#2d3a3d] focus:ring-2 focus:ring-[#1f96ad] focus:border-[#1f96ad] transition-all disabled:opacity-75"
                                        id="motivo"
                                        disabled={isLockedForRole}
                                        value={formData.motivo_cese}
                                        onChange={(e) => setFormData({ ...formData, motivo_cese: e.target.value })}
                                    >
                                        <option disabled value="">Seleccione un motivo...</option>
                                        <option value="restitucion_integral">Restitución integral de los derechos vulnerados</option>
                                        <option value="incumplimiento_estrategias">Incumplimiento reiterado de las estrategias acordadas</option>
                                        <option value="fallecimiento">Fallecimiento del NNA</option>
                                        <option value="otra_causal">Otra causal que impide la continuidad de intervencion</option>
                                        <option value="cambio_residencia">Cambio de ciudad de residencia (Se notifica por principio de corresponsabilidad)</option>
                                        <option value="solicitud_medida_excepcional">Solicitud de medida excepcional al organismo provincial de protección de derechos (SENAF)</option>
                                    </select>
                                </div>

                                {/* Conditional Section: SENAF Summary */}
                                {formData.motivo_cese === 'solicitud_medida_excepcional' && (
                                    <div className="bg-[#1f96ad]/5 dark:bg-[#1f96ad]/10 border border-[#1f96ad]/20 rounded-xl p-6 space-y-6">
                                        <div className="flex items-center gap-2 text-[#1f96ad]">
                                            <span className="material-symbols-outlined">gavel</span>
                                            <p className="font-bold text-sm uppercase tracking-wider">Criterios de Medida Excepcional</p>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between p-4 bg-white dark:bg-[#1a2b2e] rounded-lg border border-[#e5e7eb] dark:border-[#2d3a3d]">
                                                <p className="text-sm font-medium">¿Se agotaron las medidas de protección posibles?</p>
                                                <div className="flex gap-4">
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input type="radio" disabled={isLockedForRole} checked={senafData.agoto_medidas === true} onChange={() => setSenafData({ ...senafData, agoto_medidas: true })} className="text-primary focus:ring-primary" />
                                                        <span className="text-sm font-bold">Si</span>
                                                    </label>
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input type="radio" disabled={isLockedForRole} checked={senafData.agoto_medidas === false} onChange={() => setSenafData({ ...senafData, agoto_medidas: false })} className="text-primary focus:ring-primary" />
                                                        <span className="text-sm font-bold">No</span>
                                                    </label>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between p-4 bg-white dark:bg-[#1a2b2e] rounded-lg border border-[#e5e7eb] dark:border-[#2d3a3d]">
                                                <p className="text-sm font-medium">¿Existe grave riesgo para la vida o integridad?</p>
                                                <div className="flex gap-4">
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input type="radio" disabled={isLockedForRole} checked={senafData.riesgo_vida === true} onChange={() => setSenafData({ ...senafData, riesgo_vida: true })} className="text-primary focus:ring-primary" />
                                                        <span className="text-sm font-bold">Si</span>
                                                    </label>
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input type="radio" disabled={isLockedForRole} checked={senafData.riesgo_vida === false} onChange={() => setSenafData({ ...senafData, riesgo_vida: false })} className="text-primary focus:ring-primary" />
                                                        <span className="text-sm font-bold">No</span>
                                                    </label>
                                                </div>
                                            </div>
                                        </div>

                                        <p className="text-[11px] text-gray-500 italic">Al confirmar, se guardará un borrador de la solicitud SENAF con estos criterios y los logros/observaciones detallados a continuación.</p>
                                    </div>
                                )}

                                {/* Resumen de Logros */}
                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-bold text-[#121617] dark:text-gray-300" htmlFor="logros">Resumen de Logros Alcanzados</label>
                                    <textarea
                                        className="w-full p-4 rounded-lg bg-[#f6f8f8] dark:bg-[#121e20] border-[#dce3e5] dark:border-[#2d3a3d] focus:ring-2 focus:ring-[#1f96ad] transition-all disabled:opacity-75"
                                        id="logros"
                                        disabled={isLockedForRole}
                                        placeholder="Describa los avances y metas cumplidas durante la intervención..."
                                        rows={4}
                                        value={formData.resumen_logros}
                                        onChange={(e) => setFormData({ ...formData, resumen_logros: e.target.value })}
                                    />
                                </div>

                                {/* Observaciones Finales */}
                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-bold text-[#121617] dark:text-gray-300" htmlFor="observaciones">Observaciones Finales</label>
                                    <textarea
                                        className="w-full p-4 rounded-lg bg-[#f6f8f8] dark:bg-[#121e20] border-[#dce3e5] dark:border-[#2d3a3d] focus:ring-2 focus:ring-[#1f96ad] transition-all disabled:opacity-75"
                                        id="observaciones"
                                        disabled={isLockedForRole}
                                        placeholder="Información relevante adicional para el cierre definitivo..."
                                        rows={3}
                                        value={formData.observaciones_finales}
                                        onChange={(e) => setFormData({ ...formData, observaciones_finales: e.target.value })}
                                    />
                                </div>

                                {/* Inline History/Tracking Section */}
                                <div className="pt-6 border-t border-gray-100 dark:border-zinc-800">
                                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-primary">timeline</span>
                                        Seguimiento de Elevación
                                    </h3>
                                    <div className="bg-[#f6f8f8] dark:bg-[#121e20] rounded-xl p-4 border border-[#e5e7eb] dark:border-[#2d3a3d]">
                                        <div className="flex items-center justify-between mb-4">
                                            <p className="text-sm text-gray-500 font-medium">Estado de Solicitud:</p>
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${senafStatus === 'Aprobado' ? 'bg-green-100 text-green-700' :
                                                senafStatus?.includes('Observado') ? 'bg-red-100 text-red-700' :
                                                    'bg-amber-100 text-amber-700'
                                                }`}>
                                                {senafStatus || 'No iniciada'}
                                            </span>
                                        </div>
                                        <div className="flex flex-col gap-3">
                                            <button
                                                onClick={() => navigate(`/expedientes/${expedienteId}/senaf/${ingresoId}`)}
                                                className="w-full py-3 bg-white dark:bg-[#1a2b2e] border border-primary/30 rounded-lg text-primary font-bold text-sm hover:bg-primary/5 transition-colors flex items-center justify-center gap-2"
                                            >
                                                <span className="material-symbols-outlined text-lg">visibility</span>
                                                {isLockedForRole ? 'Revisar Solicitud SENAF' : 'Ver Historial Completo y Detalles'}
                                            </button>

                                            {documentoUrl && (
                                                <a
                                                    href={documentoUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="w-full py-3 bg-primary/5 border border-primary/20 rounded-lg text-primary font-bold text-sm hover:bg-primary/10 transition-colors flex items-center justify-center gap-2"
                                                >
                                                    <span className="material-symbols-outlined text-lg">description</span>
                                                    Ver Solicitud Subida (Adjunto)
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* Right Column: Summary & Actions */}
                    <div className="space-y-6">
                        {/* Status Card */}
                        <div className="bg-white dark:bg-[#1a2b2e] p-6 rounded-xl shadow-sm border border-[#e5e7eb] dark:border-[#2d3a3d]">
                            <h3 className="text-base font-bold mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined text-[#2D8A4E]">verified</span>
                                Estado de Medidas
                            </h3>
                            <div className="flex flex-col gap-4">
                                <div className="flex justify-between items-end">
                                    <p className="text-2xl font-black text-[#121617] dark:text-white">{stats.completedMedidas}/{stats.totalMedidas}</p>
                                    <p className="text-sm font-bold text-[#2D8A4E]">Completadas</p>
                                </div>
                                <div className="w-full bg-[#dce3e5] dark:bg-[#2d3a3d] h-3 rounded-full overflow-hidden">
                                    <div className="bg-[#2D8A4E] h-full" style={{ width: `${progress}%` }}></div>
                                </div>
                                {/* In a real app, list dynamic measures here */}
                            </div>
                        </div>

                        {/* Intervention Progress Card */}
                        <div className="bg-[#121617] dark:bg-[#0a1112] p-6 rounded-xl shadow-lg text-white">
                            <div className="flex flex-col gap-3">
                                <div className="flex gap-6 justify-between items-center">
                                    <p className="text-sm font-medium opacity-80">Progreso de Intervención</p>
                                    <p className="text-xl font-bold">{Math.round(progress)}%</p>
                                </div>
                                <div className="rounded-full bg-white/20 h-2">
                                    <div className="h-full rounded-full bg-[#1f96ad] shadow-[0_0_12px_rgba(31,150,173,0.5)]" style={{ width: `${progress}%` }}></div>
                                </div>
                                <p className="text-xs opacity-60 italic">Todos los requisitos administrativos han sido verificados.</p>
                            </div>
                        </div>

                        {/* Final Action Section */}
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={handleSubmit}
                                disabled={(!formData.motivo_cese || isSaving) && !isLockedForRole}
                                className={`w-full text-white font-bold py-4 px-6 rounded-lg transition-all shadow-md flex items-center justify-center gap-3 ${((!formData.motivo_cese || isSaving) && !isLockedForRole) ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#B3243F] hover:bg-[#B3243F]/90'}`}
                            >
                                <span className="material-symbols-outlined">{isSaving ? 'sync' : isLockedForRole ? 'rate_review' : 'assignment_turned_in'}</span>
                                {isSaving ? 'Guardando...' :
                                    isLockedForRole ? 'Revisar Solicitud a SENAF' :
                                        formData.motivo_cese === 'solicitud_medida_excepcional' ? 'Guardar y Continuar a SENAF' : 'Confirmar Cierre y Generar Informe'}
                            </button>
                            <button
                                onClick={() => navigate(-1)}
                                className="w-full bg-transparent hover:bg-gray-100 dark:hover:bg-white/5 text-[#658086] font-bold py-3 px-6 rounded-lg transition-all"
                            >
                                Cancelar y Volver
                            </button>
                            <div className="p-4 border border-dashed border-[#dce3e5] dark:border-[#2d3a3d] rounded-lg">
                                <p className="text-[11px] text-[#658086] text-center leading-relaxed">
                                    Al confirmar, se generará el <strong>Informe de Cese</strong> en formato PDF y el expediente quedará bloqueado para futuras ediciones.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Abstract Graphics */}
                <div className="fixed top-0 right-0 -z-10 opacity-20 dark:opacity-10 pointer-events-none">
                    <div className="w-[600px] h-[600px] bg-gradient-to-br from-[#1f96ad] to-transparent rounded-full blur-[120px] -mr-64 -mt-64"></div>
                </div>
                <div className="fixed bottom-0 left-0 -z-10 opacity-10 pointer-events-none">
                    <div className="w-[400px] h-[400px] bg-gradient-to-tr from-[#B3243F] to-transparent rounded-full blur-[100px] -ml-48 -mb-48"></div>
                </div>
            </main>
        </div>
    );
};

export default CierreIngreso;
