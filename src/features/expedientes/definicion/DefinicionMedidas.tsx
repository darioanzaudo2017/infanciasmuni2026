
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { format } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { MEASURE_TYPES } from './constants';
import Breadcrumbs from '../../../components/ui/Breadcrumbs';

const DefinicionMedidas = () => {
    const { expedienteId, ingresoId } = useParams<{ expedienteId: string; ingresoId: string }>();
    const navigate = useNavigate();
    const [ingreso, setIngreso] = useState<any>(null);
    const [vulneraciones, setVulneraciones] = useState<any[]>([]);
    const [medidas, setMedidas] = useState<any[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(true);

    // Form state
    const [newMedida, setNewMedida] = useState<{
        medida_propuesta: string;
        descripcion: string;
        responsables: string;
        fecha_plazo: string;
        selectedRights: number[];
    }>({
        medida_propuesta: '',
        descripcion: '',
        responsables: '',
        fecha_plazo: '',
        selectedRights: []
    });

    useEffect(() => {
        const fetchData = async () => {
            if (!ingresoId) return;
            setLoading(true);
            try {
                // Fetch Ingreso
                const { data: ingData } = await supabase
                    .from('vw_ingresos_detalle')
                    .select('*')
                    .eq('id', ingresoId)
                    .single();
                setIngreso(ingData);

                // Fetch Vulneraciones
                const { data: vulData } = await supabase
                    .from('derechos_vulnerados')
                    .select('*, catalogo_derechos(id, categoria, subcategoria)')
                    .eq('ingreso_id', ingresoId);
                setVulneraciones(vulData || []);

                // Fetch Medidas
                const { data: medData } = await supabase
                    .from('medidas')
                    .select('*, medidas_derechos(derecho_id)')
                    .eq('ingreso_id', ingresoId)
                    .order('created_at', { ascending: false });
                setMedidas(medData || []);

                // Fetch Sintesis Status to validate if enabled
                const { data: sintesis } = await supabase
                    .from('form3_informe_sintesis')
                    .select('estado')
                    .eq('ingreso_id', ingresoId)
                    .maybeSingle();

                if (sintesis?.estado !== 'finalizado') {
                    // In a real app we might redirect or show a locked state.
                    // For now we will check in render.
                }

            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [ingresoId]);

    const handleSaveMedida = async () => {
        if (!ingresoId || !newMedida.medida_propuesta) return;

        try {
            // Save Medida
            const { data: insertedMedida, error } = await supabase.from('medidas').insert({
                ingreso_id: ingresoId,
                medida_propuesta: newMedida.medida_propuesta,
                descripcion: newMedida.descripcion,
                responsables: newMedida.responsables,
                fecha_plazo: newMedida.fecha_plazo || null,
                estado: 'activa',
                restituido: false
            }).select().single();

            if (error) throw error;

            // Link Rights
            if (newMedida.selectedRights.length > 0) {
                const rightsPayload = newMedida.selectedRights.map(rid => ({
                    medida_id: insertedMedida.id,
                    derecho_id: rid
                }));
                await supabase.from('medidas_derechos').insert(rightsPayload);
            }

            // Refresh
            const { data: medData } = await supabase
                .from('medidas')
                .select('*, medidas_derechos(derecho_id)')
                .eq('ingreso_id', ingresoId)
                .order('created_at', { ascending: false });
            setMedidas(medData || []);

            // Track user in parent ingreso
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await supabase.from('ingresos').update({
                    ultimo_usuario_id: user.id,
                    updated_at: new Date().toISOString()
                }).eq('id', ingresoId);

                await supabase.from('auditoria').insert({
                    tabla: 'ingresos',
                    registro_id: ingresoId as unknown as number,
                    accion: 'NUEVA_MEDIDA',
                    usuario_id: user.id
                });
            }

            setShowModal(false);
            setNewMedida({
                medida_propuesta: '',
                descripcion: '',
                responsables: '',
                fecha_plazo: '',
                selectedRights: []
            });

        } catch (error) {
            console.error('Error saving measure', error);
            alert('Error al guardar medida');
        }
    };

    if (loading) return <div className="p-10 flex justify-center text-slate-500">Cargando definición de medidas...</div>;

    return (
        <div className="flex flex-col min-h-screen bg-[#f9fafa] dark:bg-[#1a1e23] text-[#121617] dark:text-gray-100 font-sans">

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
                    <div className="bg-white dark:bg-zinc-900 w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="px-8 py-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-black tracking-tight dark:text-white">Nueva Medida de Protección</h2>
                                <p className="text-xs text-gray-500 uppercase font-bold tracking-widest mt-1">Configuración detallada</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="size-10 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 flex items-center justify-center transition-all">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="p-8 overflow-y-auto space-y-8 flex-1">
                            <div>
                                <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-300">Tipo de Medida</label>
                                <select
                                    className="w-full bg-gray-50 dark:bg-zinc-800 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 dark:text-white"
                                    value={newMedida.medida_propuesta}
                                    onChange={(e) => setNewMedida({ ...newMedida, medida_propuesta: e.target.value })}
                                >
                                    <option value="">Seleccionar tipo...</option>
                                    {MEASURE_TYPES.map((t, i) => (
                                        <option key={i} value={t}>{t}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-300">Descripción Detallada</label>
                                <textarea
                                    className="w-full bg-gray-50 dark:bg-zinc-800 border-none rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary/20 dark:text-white"
                                    placeholder="Justificación y detalles de la medida..."
                                    rows={4}
                                    value={newMedida.descripcion}
                                    onChange={(e) => setNewMedida({ ...newMedida, descripcion: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold mb-4 text-gray-700 dark:text-gray-300">Derechos Vinculados</label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-40 overflow-y-auto custom-scrollbar">
                                    {vulneraciones.map((vul) => (
                                        <label key={vul.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-zinc-700 cursor-pointer hover:bg-primary/5 dark:hover:bg-zinc-800 transition-colors">
                                            <input
                                                type="checkbox"
                                                className="rounded text-primary focus:ring-primary"
                                                checked={newMedida.selectedRights.includes(vul.catalogo_derechos?.id)}
                                                onChange={(e) => {
                                                    const id = vul.catalogo_derechos?.id;
                                                    if (e.target.checked) setNewMedida(prev => ({ ...prev, selectedRights: [...prev.selectedRights, id] }));
                                                    else setNewMedida(prev => ({ ...prev, selectedRights: prev.selectedRights.filter(x => x !== id) }));
                                                }}
                                            />
                                            <span className="text-xs font-semibold dark:text-gray-300">
                                                {vul.catalogo_derechos?.categoria} - {vul.catalogo_derechos?.subcategoria}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-300">Responsable Principal</label>
                                    <input
                                        type="text"
                                        className="w-full bg-gray-50 dark:bg-zinc-800 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 dark:text-white"
                                        placeholder="Ej: Equipo Técnico, Escuela, etc."
                                        value={newMedida.responsables}
                                        onChange={(e) => setNewMedida({ ...newMedida, responsables: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-300">Plazo de Revisión</label>
                                    <input
                                        type="date"
                                        className="w-full bg-gray-50 dark:bg-zinc-800 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 dark:text-white"
                                        value={newMedida.fecha_plazo}
                                        onChange={(e) => setNewMedida({ ...newMedida, fecha_plazo: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="px-8 py-6 bg-gray-50 dark:bg-zinc-800/50 flex justify-end gap-4 border-t border-gray-100 dark:border-gray-800">
                            <button onClick={() => setShowModal(false)} className="px-6 py-2.5 rounded-xl font-bold text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">Cancelar</button>
                            <button onClick={handleSaveMedida} className="px-8 py-2.5 rounded-xl bg-primary text-white font-bold text-sm shadow-lg shadow-primary/20 hover:brightness-110">Guardar Medida</button>
                        </div>
                    </div>
                </div>
            )}

            <main className="flex-1 flex flex-col p-6 lg:p-10 pb-32 max-w-[1400px] mx-auto w-full">
                <Breadcrumbs
                    items={[
                        { label: 'Inicio', path: '/' },
                        { label: 'Expedientes', path: '/expedientes' },
                        { label: 'Historial de Ingresos', path: `/expedientes/${ingreso?.expediente_id}/ingresos` },
                        { label: 'Detalle de Legajo', path: `/expedientes/${ingreso?.expediente_id}/ingresos/${ingresoId}` },
                        { label: 'Definición de Medidas', active: true }
                    ]}
                />

                {/* Page Heading */}
                <div className="mb-8">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-black tracking-tight text-[#121617] dark:text-white">Definición de Medidas</h1>
                            <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-2xl">Configure las acciones legales y sociales requeridas para la restitución de derechos del niño, niña o adolescente.</p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => navigate(`/expedientes/${expedienteId}/cierre/${ingresoId}`)}
                                disabled={medidas.length === 0}
                                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all shrink-0 border ${medidas.length === 0 ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:text-gray-900 shadow-sm'}`}
                            >
                                <span className="material-symbols-outlined">gavel</span>
                                Cierre de Intervención
                            </button>
                            <button
                                onClick={() => setShowModal(true)}
                                className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all shrink-0"
                            >
                                <span className="material-symbols-outlined">add_circle</span>
                                Nueva Medida
                            </button>
                        </div>
                    </div>
                </div>

                {/* Rights Summary */}
                <section className="mb-10 bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                        <span className="material-symbols-outlined text-primary text-xl">warning</span>
                        <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400">Derechos Vulnerados Identificados</h2>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {vulneraciones.map((v, i) => (
                            <div key={i} className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 px-3 py-1.5 rounded-full text-xs font-bold border border-red-100 dark:border-red-900/30">
                                <span className="material-symbols-outlined text-base">shield</span>
                                {v.catalogo_derechos?.categoria} ({v.catalogo_derechos?.subcategoria})
                            </div>
                        ))}
                        {vulneraciones.length === 0 && <span className="text-sm text-gray-400 italic">No se han marcado derechos vulnerados en etapas previas.</span>}
                    </div>
                </section>

                {/* Measures Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {medidas.map((m) => (
                        <div
                            key={m.id}
                            onClick={() => navigate(`/expedientes/${expedienteId}/definicion/${ingresoId}/medida/${m.id}`)}
                            className="measure-card bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 shadow-sm p-6 flex flex-col hover:-translate-y-1 transition-transform duration-200 cursor-pointer group"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="px-3 py-1 bg-primary/10 text-primary rounded-lg text-[10px] font-bold uppercase tracking-widest">Medida Activa</div>
                                <span className="material-symbols-outlined text-gray-400 group-hover:text-primary transition-colors">arrow_forward</span>
                            </div>
                            <h3 className="text-md font-bold mb-2 dark:text-white line-clamp-2">{m.medida_propuesta}</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-6 line-clamp-3">
                                {m.descripcion}
                            </p>

                            <div className="space-y-3 mb-6 mt-auto">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-gray-400 flex items-center gap-1 font-bold uppercase tracking-wider"><span className="material-symbols-outlined text-sm">groups</span> Responsables:</span>
                                    <span className="font-semibold dark:text-gray-300">{m.responsables || 'S/D'}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-gray-400 flex items-center gap-1 font-bold uppercase tracking-wider"><span className="material-symbols-outlined text-sm">event</span> Plazo:</span>
                                    <span className="font-bold text-amber-600">
                                        {m.fecha_plazo ? format(new Date(m.fecha_plazo), "dd MMM yyyy", { locale: es }) : 'Indefinido'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Empty State / Add Placeholder */}
                    <div onClick={() => setShowModal(true)} className="border-2 border-dashed border-gray-200 dark:border-zinc-800 rounded-2xl flex flex-col items-center justify-center p-10 group cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all min-h-[300px]">
                        <div className="size-14 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-400 group-hover:bg-primary/20 group-hover:text-primary transition-all mb-4">
                            <span className="material-symbols-outlined text-3xl">add</span>
                        </div>
                        <p className="font-bold text-gray-500 group-hover:text-primary">Definir Nueva Medida</p>
                        <p className="text-xs text-gray-400 mt-1">Haga clic para iniciar el formulario</p>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default DefinicionMedidas;
