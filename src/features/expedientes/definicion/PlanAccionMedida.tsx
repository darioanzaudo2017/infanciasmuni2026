
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import Breadcrumbs from '../../../components/ui/Breadcrumbs';

const PlanAccionMedida = () => {
    const { medidaId, expedienteId, ingresoId } = useParams<{ medidaId: string; expedienteId: string; ingresoId: string }>();
    const [medida, setMedida] = useState<any>(null);
    const [acciones, setAcciones] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    // Form state
    const [newAccion, setNewAccion] = useState({
        nombre: '',
        descripcion: '',
        responsable: '',
        requiere_recurso: false,
        tipo_recurso: '',
        monto: ''
    });

    useEffect(() => {
        const fetchDatos = async () => {
            if (!medidaId) return;
            setLoading(true);
            try {
                const { data: mData } = await supabase.from('medidas').select('*').eq('id', medidaId).single();
                setMedida(mData);

                const { data: aData } = await supabase.from('medidas_acciones').select('*').eq('medida_id', medidaId).order('created_at', { ascending: true });
                setAcciones(aData || []);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchDatos();
    }, [medidaId]);

    const handleSaveAccion = async () => {
        if (!newAccion.nombre || !medidaId) return;
        try {
            const { error } = await supabase.from('medidas_acciones').insert({
                medida_id: medidaId,
                nombre: newAccion.nombre,
                descripcion: newAccion.descripcion,
                responsable: newAccion.responsable,
                requiere_recurso: newAccion.requiere_recurso,
                tipo_recurso: newAccion.tipo_recurso,
                monto: newAccion.monto ? parseFloat(newAccion.monto) : null,
                estado: 'pendiente'
            });

            if (error) throw error;

            // Refresh
            const { data: aData } = await supabase.from('medidas_acciones').select('*').eq('medida_id', medidaId).order('created_at', { ascending: true });
            setAcciones(aData || []);

            setShowModal(false);
            setNewAccion({ nombre: '', descripcion: '', responsable: '', requiere_recurso: false, tipo_recurso: '', monto: '' });

            // Track user in parent ingreso
            const { data: { user } } = await supabase.auth.getUser();
            if (user && ingresoId) {
                await supabase.from('ingresos').update({
                    ultimo_usuario_id: user.id,
                    updated_at: new Date().toISOString()
                }).eq('id', ingresoId);

                await supabase.from('auditoria').insert({
                    tabla: 'ingresos',
                    registro_id: parseInt(ingresoId),
                    accion: 'NUEVA_ACCION_PLAN',
                    usuario_id: user.id
                });
            }
        } catch (error) {
            console.error('Error saving action', error);
            alert('Error al guardar acción');
        }
    };

    const handleUpdateStatus = async (accionId: number, currentStatus: string) => {
        const nextStatus = currentStatus === 'pendiente' ? 'en_curso' : currentStatus === 'en_curso' ? 'completado' : 'pendiente';
        try {
            await supabase.from('medidas_acciones').update({ estado: nextStatus }).eq('id', accionId);
            // Refresh
            const { data: aData } = await supabase.from('medidas_acciones').select('*').eq('medida_id', medidaId).order('created_at', { ascending: true });
            setAcciones(aData || []);
        } catch (error) {
            console.error(error);
        }
    };

    if (loading) return <div className="p-10 text-center">Cargando...</div>;
    if (!medida) return <div className="p-10 text-center">No s encontró la medida</div>;

    const completedCount = acciones.filter(a => a.estado === 'completado').length;
    const progress = acciones.length > 0 ? Math.round((completedCount / acciones.length) * 100) : 0;

    return (
        <div className="flex flex-col min-h-screen bg-[#f9fafa] dark:bg-[#1a1e23] text-[#121617] dark:text-gray-100 font-sans">

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
                    <div className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col">
                        <div className="px-8 py-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                            <h2 className="text-xl font-black tracking-tight dark:text-white">Nueva Acción</h2>
                            <button onClick={() => setShowModal(false)} className="size-8 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 flex items-center justify-center">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="p-8 space-y-4">
                            <div>
                                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Nombre de la Acción</label>
                                <input
                                    className="w-full bg-gray-50 dark:bg-zinc-800 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 dark:text-white"
                                    placeholder="Ej: Entrevista con grupo familiar"
                                    value={newAccion.nombre}
                                    onChange={e => setNewAccion({ ...newAccion, nombre: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Descripción</label>
                                <textarea
                                    className="w-full bg-gray-50 dark:bg-zinc-800 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 dark:text-white"
                                    placeholder="Detalles sobre la acción a realizar..."
                                    rows={3}
                                    value={newAccion.descripcion}
                                    onChange={e => setNewAccion({ ...newAccion, descripcion: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Responsable</label>
                                <input
                                    className="w-full bg-gray-50 dark:bg-zinc-800 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 dark:text-white"
                                    placeholder="Ej: Lic. Ana Garcia"
                                    value={newAccion.responsable}
                                    onChange={e => setNewAccion({ ...newAccion, responsable: e.target.value })}
                                />
                            </div>

                            <div className="flex items-center gap-3 py-2">
                                <input
                                    type="checkbox"
                                    id="reqRecurso"
                                    className="rounded text-primary focus:ring-primary"
                                    checked={newAccion.requiere_recurso}
                                    onChange={e => setNewAccion({ ...newAccion, requiere_recurso: e.target.checked })}
                                />
                                <label htmlFor="reqRecurso" className="text-sm font-bold dark:text-gray-300 select-none cursor-pointer">Requiere asignación de recursos</label>
                            </div>

                            {newAccion.requiere_recurso && (
                                <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                                    <div>
                                        <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Tipo de Recurso</label>
                                        <select
                                            className="w-full bg-gray-50 dark:bg-zinc-800 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 dark:text-white"
                                            value={newAccion.tipo_recurso}
                                            onChange={e => setNewAccion({ ...newAccion, tipo_recurso: e.target.value })}
                                        >
                                            <option value="">Seleccionar...</option>
                                            <option value="economico">Económico / Monetario</option>
                                            <option value="material">Material / Insumos</option>
                                            <option value="humano">Recurso Humano Extra</option>
                                            <option value="traslado">Logística / Traslado</option>
                                        </select>
                                    </div>
                                    {newAccion.tipo_recurso === 'economico' && (
                                        <div>
                                            <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Monto Estimado</label>
                                            <div className="relative">
                                                <span className="absolute left-4 top-3 text-gray-400">$</span>
                                                <input
                                                    type="number"
                                                    className="w-full bg-gray-50 dark:bg-zinc-800 border-none rounded-xl pl-8 pr-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 dark:text-white"
                                                    placeholder="0.00"
                                                    value={newAccion.monto}
                                                    onChange={e => setNewAccion({ ...newAccion, monto: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                        </div>
                        <div className="px-8 py-6 bg-gray-50 dark:bg-zinc-800/50 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-800">
                            <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-xl font-bold text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">Cancelar</button>
                            <button onClick={handleSaveAccion} className="px-6 py-2 rounded-xl bg-primary text-white font-bold text-xs shadow-lg shadow-primary/20 hover:brightness-110">Guardar</button>
                        </div>
                    </div>
                </div>
            )}

            <main className="flex-1 flex flex-col p-6 lg:p-10 max-w-[1400px] mx-auto w-full">
                {/* Breadcrumbs */}
                <Breadcrumbs
                    items={[
                        { label: 'Inicio', path: '/' },
                        { label: 'Expedientes', path: '/expedientes' },
                        { label: 'Historial de Ingresos', path: `/expedientes/${expedienteId}/ingresos` },
                        { label: 'Detalle de Legajo', path: `/expedientes/${expedienteId}/ingresos/${ingresoId}` },
                        { label: 'Definición de Medidas', path: `/expedientes/${expedienteId}/definicion/${ingresoId}` },
                        { label: 'Plan de Acción', active: true }
                    ]}
                />

                {/* Header */}
                <div className="mb-10">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
                        <div>
                            <h1 className="text-3xl font-black tracking-tight mb-2 dark:text-white">{medida.medida_propuesta}</h1>
                            <p className="text-gray-500 dark:text-gray-400 max-w-2xl">{medida.descripcion}</p>
                        </div>
                        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all">
                            <span className="material-symbols-outlined">add_task</span>
                            Nueva Acción
                        </button>
                    </div>

                    {/* Progress */}
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-gray-100 dark:border-zinc-800 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Progreso General de la Medida</span>
                            <span className="text-primary font-black text-lg">{progress}%</span>
                        </div>
                        <div className="h-3 w-full bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full transition-all duration-1000" style={{ width: `${progress}%` }}></div>
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                            <span className="text-xs text-gray-400 font-medium italic">{completedCount} de {acciones.length} acciones completadas</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold text-lg dark:text-white">Acciones del Plan</h3>
                    <div className="flex items-center gap-3">
                        <select className="text-sm border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-lg focus:ring-primary focus:border-primary py-2 pl-3 pr-8 shadow-sm">
                            <option>Todos los estados</option>
                            <option>Pendiente</option>
                            <option>En Curso</option>
                            <option>Completado</option>
                        </select>
                        <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg shadow-sm">
                            <span className="material-symbols-outlined text-[20px]">sort</span>
                        </button>
                    </div>
                </div>

                <div className="space-y-4">
                    {acciones.length === 0 && (
                        <div className="text-center py-10 border-2 border-dashed border-gray-200 dark:border-zinc-800 rounded-2xl">
                            <p className="text-gray-400 font-medium">No hay acciones registradas para esta medida.</p>
                        </div>
                    )}

                    {acciones.map((accion) => (
                        <div key={accion.id} className="group bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 p-5 rounded-xl flex flex-col md:flex-row items-start md:items-center gap-6 hover:shadow-md transition-shadow">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-1">
                                    <span className={`text-xs font-bold uppercase tracking-widest 
                                        ${accion.estado === 'completado' ? 'text-emerald-500' : accion.estado === 'en_curso' ? 'text-amber-500' : 'text-red-500'}`}>
                                        {accion.estado === 'completado' ? 'Completado' : accion.estado === 'en_curso' ? 'En Curso' : 'Pendiente'}
                                    </span>
                                    <span className={`w-1.5 h-1.5 rounded-full ${accion.estado === 'completado' ? 'bg-emerald-500' : accion.estado === 'en_curso' ? 'bg-amber-500' : 'bg-red-500'}`}></span>
                                </div>
                                <h4 className="font-bold text-gray-800 dark:text-gray-100 mb-1">{accion.nombre}</h4>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{accion.descripcion}</p>
                            </div>
                            <div className="flex items-center gap-8 w-full md:w-auto justify-between md:justify-end">
                                <div className="flex flex-col items-center">
                                    <span className="text-[10px] text-gray-400 uppercase font-bold mb-1">Responsable</span>
                                    <div className="flex items-center gap-2 bg-gray-50 dark:bg-zinc-800 px-3 py-1 rounded-full border border-gray-100 dark:border-zinc-700">
                                        <span className="w-2 h-2 rounded-full bg-primary"></span>
                                        <span className="text-xs font-bold text-gray-600 dark:text-gray-300">{accion.responsable || 'Sin asignar'}</span>
                                    </div>
                                </div>

                                {accion.requiere_recurso && (
                                    <div className="flex flex-col items-center">
                                        <span className="text-[10px] text-gray-400 uppercase font-bold mb-1">Recursos</span>
                                        <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-lg border border-amber-100 dark:border-amber-900/30 text-amber-700 dark:text-amber-400">
                                            <span className="material-symbols-outlined text-xs">
                                                {accion.tipo_recurso === 'economico' ? 'attach_money' :
                                                    accion.tipo_recurso === 'traslado' ? 'local_taxi' :
                                                        accion.tipo_recurso === 'humano' ? 'group_add' : 'inventory_2'}
                                            </span>
                                            {accion.tipo_recurso === 'economico' && accion.monto ? (
                                                <span className="text-[10px] font-bold">${accion.monto}</span>
                                            ) : (
                                                <span className="text-[10px] font-bold capitalize">{accion.tipo_recurso}</span>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <div className="flex flex-col items-center min-w-[80px]">
                                    <span className="text-[10px] text-gray-400 uppercase font-bold mb-1">Estado</span>
                                    <button onClick={() => handleUpdateStatus(accion.id, accion.estado)} className="text-gray-300 hover:text-primary transition-colors">
                                        {accion.estado === 'completado' ? (
                                            <span className="material-symbols-outlined text-emerald-500" style={{ fontVariationSettings: "'FILL' 1" }}>check_box</span>
                                        ) : (
                                            <span className="material-symbols-outlined">check_box_outline_blank</span>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer CTA */}
                <div className="mt-12 text-center py-8 border-t border-gray-100 dark:border-zinc-800">
                    <p className="text-sm text-gray-400 mb-4 font-medium italic">¿Necesitas agregar más detalles técnicos?</p>
                    <button className="inline-flex items-center gap-2 text-primary font-bold hover:underline decoration-2 underline-offset-4">
                        <span className="material-symbols-outlined">description</span>
                        Redactar Informe de Seguimiento Mensual
                    </button>
                </div>

            </main>
        </div>
    );
};

export default PlanAccionMedida;
