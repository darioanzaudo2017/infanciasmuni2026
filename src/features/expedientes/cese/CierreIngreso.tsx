
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

    useEffect(() => {
        const fetchStats = async () => {
            if (!ingresoId) return;
            try {
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

        try {
            // 1. Check if cese already exists
            const { data: existingCese } = await supabase
                .from('form9_cese_ingreso')
                .select('id')
                .eq('ingreso_id', parseInt(ingresoId))
                .maybeSingle();

            // 2. Upsert Form 9 Record
            if (existingCese) {
                // Update existing
                const { error: formError } = await supabase
                    .from('form9_cese_ingreso')
                    .update({
                        motivo_cese: formData.motivo_cese,
                        resumen_logros: formData.resumen_logros,
                        observaciones_finales: formData.observaciones_finales,
                        fecha_cierre: new Date().toISOString()
                    })
                    .eq('id', existingCese.id);

                if (formError) throw formError;
            } else {
                // Insert new
                const { error: formError } = await supabase
                    .from('form9_cese_ingreso')
                    .insert({
                        ingreso_id: parseInt(ingresoId),
                        motivo_cese: formData.motivo_cese,
                        resumen_logros: formData.resumen_logros,
                        observaciones_finales: formData.observaciones_finales,
                        fecha_cierre: new Date().toISOString()
                    });

                if (formError) throw formError;
            }

            // 3. Close Ingreso if not SENAF
            if (formData.motivo_cese !== 'solicitud_medida_excepcional') {
                const { error: ingError } = await supabase
                    .from('ingresos')
                    .update({ estado: 'cerrado', etapa: 'cerrado' })
                    .eq('id', ingresoId);

                if (ingError) throw ingError;
            }

            // Redirect or Notify
            alert('Cierre registrado correctamente');
            navigate(`/expedientes`);

        } catch (error) {
            console.error(error);
            alert('Error al registrar el cierre');
        }
    };

    if (loading) return <div className="flex h-screen items-center justify-center">Cargando...</div>;

    const progress = stats.totalMedidas > 0 ? (stats.completedMedidas / stats.totalMedidas) * 100 : 0;

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
                    <button className="flex items-center gap-2 rounded-lg h-10 px-4 bg-white dark:bg-[#1a2b2e] border border-[#e5e7eb] dark:border-[#2d3a3d] text-[#121617] dark:text-white text-sm font-bold hover:bg-gray-50 transition-colors shadow-sm">
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
                                        className="w-full h-12 px-4 rounded-lg bg-[#f6f8f8] dark:bg-[#121e20] border-[#dce3e5] dark:border-[#2d3a3d] focus:ring-2 focus:ring-[#1f96ad] focus:border-[#1f96ad] transition-all"
                                        id="motivo"
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
                                    <div className="bg-[#1f96ad]/5 dark:bg-[#1f96ad]/10 border border-[#1f96ad]/20 rounded-lg p-6 flex flex-col gap-4">
                                        <div className="flex items-center gap-2 text-[#1f96ad]">
                                            <span className="material-symbols-outlined">info</span>
                                            <p className="font-bold text-sm">Información de Solicitud SENAF</p>
                                        </div>
                                        <p className="text-sm">Al seleccionar esta opción, se iniciará el proceso de solicitud de medida excepcional a SENAF. El expediente permanecerá abierto hasta la resolución.</p>
                                    </div>
                                )}

                                {/* Resumen de Logros */}
                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-bold text-[#121617] dark:text-gray-300" htmlFor="logros">Resumen de Logros Alcanzados</label>
                                    <textarea
                                        className="w-full p-4 rounded-lg bg-[#f6f8f8] dark:bg-[#121e20] border-[#dce3e5] dark:border-[#2d3a3d] focus:ring-2 focus:ring-[#1f96ad] transition-all"
                                        id="logros"
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
                                        className="w-full p-4 rounded-lg bg-[#f6f8f8] dark:bg-[#121e20] border-[#dce3e5] dark:border-[#2d3a3d] focus:ring-2 focus:ring-[#1f96ad] transition-all"
                                        id="observaciones"
                                        placeholder="Información relevante adicional para el cierre definitivo..."
                                        rows={3}
                                        value={formData.observaciones_finales}
                                        onChange={(e) => setFormData({ ...formData, observaciones_finales: e.target.value })}
                                    />
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
                                disabled={!formData.motivo_cese}
                                className={`w-full text-white font-bold py-4 px-6 rounded-lg transition-all shadow-md flex items-center justify-center gap-3 ${!formData.motivo_cese ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#B3243F] hover:bg-[#B3243F]/90'}`}
                            >
                                <span className="material-symbols-outlined">assignment_turned_in</span>
                                Confirmar Cierre y Generar Informe
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
