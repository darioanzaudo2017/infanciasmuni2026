
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const SolicitudSenafSummary = () => {
    const { expedienteId, ingresoId } = useParams<{ expedienteId: string; ingresoId: string }>();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    const [userRole, setUserRole] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            if (!ingresoId) return;
            try {
                // Fetch user role
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const { data: profile } = await supabase
                        .from('usuarios')
                        .select('*, usuarios_roles(roles(nombre))')
                        .eq('id', user.id)
                        .single();
                    setUserRole(profile?.usuarios_roles?.[0]?.roles?.nombre || null);
                }

                // Fetch basic info and timeline
                const { data: ingData } = await supabase.from('vw_ingresos_detalle').select('*').eq('id', ingresoId).single();
                const { data: solData } = await supabase.from('solicitudes_senaf').select('*').eq('ingreso_id', ingresoId).maybeSingle();
                const { data: segData } = await supabase.from('solicitudes_seguimiento').select('*, usuarios(nombre_completo)').eq('solicitud_id', solData?.id).order('fecha', { ascending: true });

                // Fetch achievements (from cese record)
                const { data: ceseData } = await supabase.from('form9_cese_ingreso').select('*').eq('ingreso_id', ingresoId).maybeSingle();

                setData({
                    ingreso: ingData,
                    solicitud: solData,
                    seguimiento: segData,
                    cese: ceseData
                });
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [ingresoId]);

    if (loading) return <div className="p-10 text-center">Cargando resumen...</div>;
    if (!data?.ingreso) return <div className="p-10 text-center text-red-500">No se encontró el ingreso.</div>;

    const { ingreso, cese } = data;

    return (
        <div className="bg-[#f9fafb] dark:bg-[#1c1f22] text-[#141514] dark:text-slate-200 font-sans min-h-screen pb-20">
            <header className="bg-white dark:bg-zinc-900 border-b border-[#f2f3f2] dark:border-zinc-800 sticky top-0 z-50 no-print px-6 h-16 flex items-center justify-between">
                <div className="max-w-[1200px] mx-auto w-full flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="size-8 bg-primary text-white flex items-center justify-center rounded-lg">
                            <span className="material-symbols-outlined text-xl">shield_with_heart</span>
                        </div>
                        <h1 className="text-lg font-bold tracking-tight">Protección NNyA</h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <button className="size-10 flex items-center justify-center rounded-lg bg-[#f2f3f2] dark:bg-zinc-800">
                            <span className="material-symbols-outlined">notifications</span>
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-[1000px] mx-auto px-6 py-8">
                <nav className="flex items-center gap-2 mb-6 no-print">
                    <a className="text-[#717a75] text-sm font-medium hover:text-primary" onClick={() => navigate('/')}>Inicio</a>
                    <span className="material-symbols-outlined text-sm text-[#717a75]">chevron_right</span>
                    <span className="text-[#141514] dark:text-white text-sm font-semibold">Resumen Histórico de Cierre</span>
                </nav>

                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                    <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-full text-xs font-bold uppercase tracking-wider">
                            <span className="size-2 bg-zinc-500 rounded-full"></span>
                            Estado: {ingreso.estado === 'cerrado' ? 'Archivado' : 'En Trámite'}
                        </div>
                        <h2 className="text-4xl font-extrabold tracking-tight text-[#141514] dark:text-white">Resumen Histórico de Cierre</h2>
                        <p className="text-[#717a75] dark:text-zinc-400 text-lg">Legajo #{ingreso.expediente_numero} • Carátula: {ingreso.nino_nombre}</p>
                    </div>
                    <div className="flex gap-3 no-print">
                        <button onClick={() => navigate(-1)} className="flex items-center gap-2 h-11 px-5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm font-bold hover:bg-zinc-50 transition-colors">
                            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                            Volver
                        </button>
                        {/* Action button for Coordinators/Admins when request is pending */}
                        {(userRole === 'Coordinador' || userRole === 'Administrador') &&
                            data.solicitud?.estado &&
                            !['Aprobado', 'En elaboración'].includes(data.solicitud.estado) && (
                                <button
                                    onClick={() => navigate(`/expedientes/${expedienteId}/senaf/${ingresoId}`)}
                                    className="flex items-center gap-2 h-11 px-5 rounded-xl bg-amber-500 text-white text-sm font-bold hover:bg-amber-600 transition-colors"
                                >
                                    <span className="material-symbols-outlined text-[20px]">rate_review</span>
                                    Revisar y Aprobar
                                </button>
                            )}
                        <button className="flex items-center gap-2 h-11 px-5 rounded-xl bg-primary text-white text-sm font-bold hover:opacity-90 transition-opacity" onClick={() => window.print()}>
                            <span className="material-symbols-outlined text-[20px]">print</span>
                            Imprimir Registro
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
                    <div className="bg-white dark:bg-zinc-900 border border-[#dfe2e0] dark:border-zinc-800 p-6 rounded-xl">
                        <p className="text-[#717a75] dark:text-zinc-400 text-xs font-bold uppercase tracking-widest mb-1">Cerrado por</p>
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">person_check</span>
                            <p className="text-xl font-bold dark:text-white">{ingreso.ultimo_usuario_nombre || 'S/D'}</p>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-zinc-900 border border-[#dfe2e0] dark:border-zinc-800 p-6 rounded-xl">
                        <p className="text-[#717a75] dark:text-zinc-400 text-xs font-bold uppercase tracking-widest mb-1">Fecha de Cierre</p>
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">calendar_today</span>
                            <p className="text-xl font-bold dark:text-white">{cese?.fecha_cierre ? new Date(cese.fecha_cierre).toLocaleDateString() : '-'}</p>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-zinc-900 border border-[#dfe2e0] dark:border-zinc-800 p-6 rounded-xl">
                        <p className="text-[#717a75] dark:text-zinc-400 text-xs font-bold uppercase tracking-widest mb-1">Tipo de Cierre</p>
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">folder_open</span>
                            <p className="text-sm font-bold dark:text-white line-clamp-1">{cese?.motivo_cese || 'S/D'}</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-8">
                        <div className="bg-white dark:bg-zinc-900 border border-[#dfe2e0] dark:border-zinc-800 rounded-xl p-8">
                            <h3 className="text-xl font-bold mb-8 flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">history</span>
                                Línea de Tiempo del Proceso
                            </h3>
                            <div className="relative border-l-2 border-gray-100 dark:border-zinc-800 ml-3 space-y-10 pl-8">
                                {data.seguimiento?.map((seg: any) => (
                                    <div key={seg.id} className="relative">
                                        <div className="absolute -left-[41px] top-1 size-6 bg-white dark:bg-zinc-900 border-2 border-primary rounded-full z-10 flex items-center justify-center">
                                            <div className="size-2 bg-primary rounded-full"></div>
                                        </div>
                                        <span className="text-xs font-bold text-primary uppercase tracking-wider">
                                            {format(new Date(seg.fecha), "dd/MM/yyyy HH:mm", { locale: es })}
                                        </span>
                                        <h4 className="text-lg font-bold dark:text-white">{seg.estado_nuevo}</h4>
                                        <div className="text-[#717a75] dark:text-zinc-400 mt-1 leading-relaxed">
                                            <p className="font-medium text-sm text-zinc-600 dark:text-zinc-300">Responsable: {seg.usuarios?.nombre_completo || 'Sistema'}</p>
                                            {seg.observaciones && (
                                                <p className="mt-2 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-100 dark:border-zinc-800 text-sm italic">
                                                    "{seg.observaciones}"
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}

                                {cese && (
                                    <div className="relative">
                                        <div className={`absolute -left-[41px] top-1 size-6 ${ingreso.estado === 'cerrado' ? 'bg-green-500 border-green-500' : 'bg-primary border-primary'} border-2 rounded-full z-10 flex items-center justify-center shadow-lg`}>
                                            <span className="material-symbols-outlined text-[14px] text-white font-bold">
                                                {ingreso.estado === 'cerrado' ? 'done_all' : 'pending_actions'}
                                            </span>
                                        </div>
                                        <span className={`text-xs font-bold ${ingreso.estado === 'cerrado' ? 'text-green-600' : 'text-primary'} uppercase tracking-wider`}>
                                            {new Date(cese.fecha_cierre).toLocaleDateString()}
                                        </span>
                                        <h4 className={`text-lg font-bold ${ingreso.estado === 'cerrado' ? 'text-green-600' : 'text-primary'}`}>
                                            {ingreso.estado === 'cerrado' ? 'Proceso Finalizado' : 'Cierre en Trámite (SENAF)'}
                                        </h4>
                                        <p className="text-[#333C45] dark:text-zinc-300 mt-1 leading-relaxed">
                                            {ingreso.estado === 'cerrado'
                                                ? 'Cierre definitivo registrado y aprobado en plataforma.'
                                                : 'Se ha iniciado la solicitud de medida excepcional. El ingreso cerrará automáticamente al recibir la aprobación final.'}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="bg-white dark:bg-zinc-900 border border-[#dfe2e0] dark:border-zinc-800 rounded-xl p-6">
                            <h3 className="font-bold text-sm uppercase tracking-widest text-[#717a75] mb-4">Detalles del Cierre</h3>
                            <p className="text-sm leading-relaxed italic text-gray-600 dark:text-gray-400">
                                "{cese?.observaciones_finales || 'Sin observaciones adicionales'}"
                            </p>
                        </div>

                        <div className="bg-zinc-100 dark:bg-zinc-800/50 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl p-6 text-center">
                            <span className="material-symbols-outlined text-4xl text-zinc-400 mb-2">picture_as_pdf</span>
                            <h3 className="font-bold text-sm mb-1">Informe Final de Cese</h3>
                            <p className="text-xs text-[#717a75] mb-4">
                                {data.solicitud?.documento_url ? 'Documento firmado digitalmente' : 'Sin documento adjunto'}
                            </p>
                            {data.solicitud?.documento_url ? (
                                <a
                                    href={data.solicitud.documento_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="w-full py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-bold hover:bg-zinc-50 transition-colors flex items-center justify-center gap-2"
                                >
                                    <span className="material-symbols-outlined text-base">download</span>
                                    Descargar Documento
                                </a>
                            ) : (
                                <button
                                    disabled
                                    className="w-full py-2 bg-zinc-200 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs font-bold text-zinc-400 cursor-not-allowed"
                                >
                                    No disponible
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <footer className="mt-12 py-10 border-t border-zinc-200 dark:border-zinc-800 text-center">
                    <p className="text-xs text-[#717a75] mb-4">Este documento es un resumen histórico oficial generado por el Sistema de Protección de Derechos NNyA.</p>
                </footer>
            </main>
        </div>
    );
};

export default SolicitudSenafSummary;
