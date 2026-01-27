import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { format } from 'date-fns';
import Breadcrumbs from '../../../components/ui/Breadcrumbs';

interface PlanificacionProps {
    ingreso: any;
    onPlanned: () => void;
}

const PlanificacionAmpliacion: React.FC<PlanificacionProps> = ({ ingreso, onPlanned }) => {
    const navigate = useNavigate();
    const [isSaving, setIsSaving] = useState(false);
    const [usuarios, setUsuarios] = useState<any[]>([]);

    const [formData, setFormData] = useState({
        objetivos: '',
        estrategias: '',
        fecha_inicio: format(new Date(), 'yyyy-MM-dd'),
        fecha_fin_estimada: format(new Date(), 'yyyy-MM-dd'),
        equipo_ids: [] as string[]
    });

    useEffect(() => {
        const fetchUsuarios = async () => {
            const { data } = await supabase.from('usuarios').select('id, nombre_completo, email').eq('activo', true);
            if (data) setUsuarios(data);
        };
        void fetchUsuarios();
    }, []);

    const handleToggleUser = (userId: string) => {
        setFormData(prev => ({
            ...prev,
            equipo_ids: prev.equipo_ids.includes(userId)
                ? prev.equipo_ids.filter(id => id !== userId)
                : [...prev.equipo_ids, userId]
        }));
    };

    const handleSave = async () => {
        if (!formData.objetivos || !formData.estrategias) {
            alert('Por favor complete objetivos y estrategias.');
            return;
        }

        setIsSaving(true);
        try {
            // 1. Save Plan
            const { data: plan, error: planErr } = await supabase.from('form2_planificacion').insert({
                ingreso_id: ingreso.id,
                objetivos: formData.objetivos,
                estrategias: formData.estrategias,
                fecha_inicio: formData.fecha_inicio,
                fecha_fin_estimada: formData.fecha_fin_estimada
            }).select().single();

            if (planErr) throw planErr;

            // 2. Save Team
            if (formData.equipo_ids.length > 0) {
                const teamPayload = formData.equipo_ids.map(uid => ({
                    planificacion_id: plan.id,
                    usuario_id: uid
                }));
                const { error: teamErr } = await supabase.from('form2_equipo').insert(teamPayload);
                if (teamErr) throw teamErr;
            }

            // 3. Update Ingreso Step (if needed, although it might stay in 'ampliacion' until finished)
            // For now just refresh
            onPlanned();
        } catch (error: any) {
            console.error('Error saving plan:', error);
            alert('Error al guardar: ' + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <main className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-8 p-6 animate-in fade-in duration-500 font-display">
            {/* Sidebar: Case Information */}
            <aside className="space-y-6">
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
                    <div className="flex flex-col gap-6">
                        <div className="flex items-start gap-4">
                            <div className="size-14 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                <span className="material-symbols-outlined text-3xl">child_care</span>
                            </div>
                            <div className="flex flex-col">
                                <h3 className="text-lg font-bold leading-tight">{ingreso.expedientes?.ninos?.nombre} {ingreso.expedientes?.ninos?.apellido}</h3>
                                <p className="text-slate-500 text-sm">{ingreso.expedientes?.ninos?.dni || 'S/D DNI'}</p>
                                <span className="mt-1 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary w-fit">Exp. #{ingreso.expedientes?.numero || ingreso.expediente_id}</span>
                            </div>
                        </div>
                        <div className="h-px bg-slate-100 dark:bg-slate-800"></div>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                                    <span className="material-symbols-outlined text-primary">shield</span>
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Estado Actual</p>
                                    <p className="text-sm font-semibold capitalize">{ingreso.etapa}</p>
                                </div>
                            </div>
                        </div>
                        <div className="pt-4">
                            <button onClick={() => navigate(`/expedientes/${ingreso.expediente_id}/ingresos/${ingreso.id}`)} className="w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold py-2.5 rounded-lg text-sm transition-all">
                                Volver al Detalle
                            </button>
                        </div>
                    </div>
                </div>

                {/* Vertical Stepper */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
                    <h4 className="text-sm font-bold mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-lg">route</span>
                        Progreso del Caso
                    </h4>
                    <div className="relative space-y-1">
                        {[
                            { name: 'Recepción', icon: 'check_circle', status: 'done' },
                            { name: 'Planificación', icon: 'play_circle', status: 'current' },
                            { name: 'Ejecución', icon: 'circle', status: 'pending' },
                            { name: 'Conclusión', icon: 'circle', status: 'pending' }
                        ].map((s, idx) => (
                            <div key={idx} className={`flex gap-4 ${s.status === 'pending' ? 'opacity-50' : ''}`}>
                                <div className="flex flex-col items-center">
                                    <span className={`material-symbols-outlined ${s.status === 'done' ? 'text-green-500 fill-current' : s.status === 'current' ? 'text-primary' : 'text-slate-300'}`}>{s.icon}</span>
                                    {idx < 3 && <div className={`w-0.5 h-6 my-1 ${s.status === 'done' ? 'bg-green-500' : 'bg-slate-200 dark:bg-slate-800'}`}></div>}
                                </div>
                                <div className="pb-4">
                                    <p className={`text-sm font-bold ${s.status === 'current' ? 'text-primary' : 'text-slate-800 dark:text-slate-200'}`}>{s.name}</p>
                                    <p className="text-xs text-slate-500">{s.status === 'done' ? 'Completado' : s.status === 'current' ? 'En etapa' : 'Pendiente'}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <section className="space-y-6">
                <Breadcrumbs
                    items={[
                        { label: 'Inicio', path: '/' },
                        { label: 'Expedientes', path: '/expedientes' },
                        { label: 'Historial de Ingresos', path: `/expedientes/${ingreso.expediente_id}/ingresos` },
                        { label: 'Detalle de Legajo', path: `/expedientes/${ingreso.expediente_id}/ingresos/${ingreso.id}` },
                        { label: 'Planificación de Ampliación', active: true }
                    ]}
                />

                <div className="bg-white dark:bg-slate-900 rounded-xl p-8 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Planificación de la Ampliación</h1>
                        <p className="text-slate-500 mt-1">Etapa 2: Defina los objetivos y estrategias para el expediente actual.</p>
                    </div>
                    <div className="flex gap-3">
                        <button className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-bold hover:bg-slate-200 transition-colors">
                            Guardar Borrador
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="px-5 py-2.5 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary/90 transition-all shadow-md shadow-primary/20 disabled:opacity-50"
                        >
                            {isSaving ? 'Guardando...' : 'Finalizar Planificación'}
                        </button>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Objectives Section */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                            <h2 className="text-lg font-bold flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">target</span>
                                Objetivos de la Intervención
                            </h2>
                            <p className="text-sm text-slate-500 mt-1">Describa los propósitos principales que se buscan alcanzar con esta ampliación.</p>
                        </div>
                        <div className="p-6">
                            <textarea
                                className="w-full h-40 p-4 rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
                                placeholder="Ej: Realizar una evaluación interdisciplinaria para determinar la situación familiar actual..."
                                value={formData.objetivos}
                                onChange={e => setFormData({ ...formData, objetivos: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Strategies Section */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                            <h2 className="text-lg font-bold flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">strategy</span>
                                Estrategias y Metodología
                            </h2>
                            <p className="text-sm text-slate-500 mt-1">Defina los pasos concretos, entrevistas, visitas domiciliarias y articulaciones necesarias.</p>
                        </div>
                        <div className="p-6">
                            <textarea
                                className="w-full h-40 p-4 rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
                                placeholder="1. Entrevista con referentes afectivos..."
                                value={formData.estrategias}
                                onChange={e => setFormData({ ...formData, estrategias: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Timeline & Team */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-12">
                        {/* Timeline */}
                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
                            <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
                                <span className="material-symbols-outlined text-primary">calendar_today</span>
                                Plazos Estimados
                            </h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Fecha de Inicio</label>
                                    <input
                                        className="w-full h-11 px-4 rounded-xl bg-slate-50 dark:bg-slate-800 border-none text-sm font-bold focus:ring-2 focus:ring-primary"
                                        type="date"
                                        value={formData.fecha_inicio}
                                        onChange={e => setFormData({ ...formData, fecha_inicio: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Fecha de Finalización Estimada</label>
                                    <input
                                        className="w-full h-11 px-4 rounded-xl bg-slate-50 dark:bg-slate-800 border-none text-sm font-bold focus:ring-2 focus:ring-primary"
                                        type="date"
                                        value={formData.fecha_fin_estimada}
                                        onChange={e => setFormData({ ...formData, fecha_fin_estimada: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Team */}
                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col">
                            <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
                                <span className="material-symbols-outlined text-primary">group</span>
                                Equipo Asignado
                            </h2>
                            <div className="flex-1 overflow-y-auto max-h-60 custom-scrollbar space-y-2 pr-2">
                                {usuarios.map(u => {
                                    const isSelected = formData.equipo_ids.includes(u.id);
                                    return (
                                        <div
                                            key={u.id}
                                            onClick={() => handleToggleUser(u.id)}
                                            className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all cursor-pointer ${isSelected ? 'border-primary bg-primary/5' : 'border-slate-100 dark:border-slate-800 hover:border-slate-200'}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`size-8 rounded-full flex items-center justify-center font-bold text-[10px] ${isSelected ? 'bg-primary text-white' : 'bg-slate-200 dark:bg-slate-700'}`}>
                                                    {u.nombre_completo.substring(0, 2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold leading-none mb-1">{u.nombre_completo}</p>
                                                    <p className="text-[10px] text-slate-500">{isSelected ? 'Seleccionado' : 'Asignar'}</p>
                                                </div>
                                            </div>
                                            <span className={`material-symbols-outlined text-xl ${isSelected ? 'text-primary' : 'text-slate-300'}`}>
                                                {isSelected ? 'check_circle' : 'add_circle'}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
};

export default PlanificacionAmpliacion;
