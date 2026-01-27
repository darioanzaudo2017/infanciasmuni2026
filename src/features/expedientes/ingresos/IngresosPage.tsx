import { useEffect, useState, Fragment } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale/es';
import Breadcrumbs from '../../../components/ui/Breadcrumbs';

interface IngresoDetalle {
    id: number;
    expediente_id: number;
    numero_ingreso: number;
    fecha_ingreso: string;
    es_emergencia: boolean;
    etapa: string;
    estado: string;
    fecha_cierre: string | null;
    motivo_cierre: string | null;
    expediente_numero: string;
    expediente_activo: boolean;
    nino_nombre: string;
    nino_apellido: string;
    nino_dni: string;
    nino_fecha_nacimiento: string;
    ultimo_profesional_nombre: string | null;
    profesional_asignado_nombre: string | null;
}

interface ExpedienteDetalle {
    id: number;
    numero: string;
    activo: boolean;
    servicio_proteccion_id: string;
    servicios_proteccion: {
        nombre: string;
    };
}

const IngresosPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [ingresos, setIngresos] = useState<IngresoDetalle[]>([]);
    const [expediente, setExpediente] = useState<ExpedienteDetalle | null>(null);
    const [loading, setLoading] = useState(true);
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [spds, setSpds] = useState<any[]>([]);
    const [transferData, setTransferData] = useState({
        destinoSpdId: '',
        motivo: '',
        fecha: format(new Date(), 'yyyy-MM-dd')
    });

    const [userProfile, setUserProfile] = useState<{ id: string } | null>(null);

    useEffect(() => {
        const fetchUserAndIngresos = async () => {
            setLoading(true);
            try {
                // Fetch current user session
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user) {
                    const { data: profile } = await supabase
                        .from('usuarios')
                        .select('id')
                        .eq('id', session.user.id)
                        .single();
                    setUserProfile(profile);
                } else {
                    console.warn('Sin sesión activa. Usando usuario de respaldo para desarrollo.');
                    // Fallback para desarrollo: obtener primer usuario disponible si no hay sesión
                    const { data: fallbackUser } = await supabase
                        .from('usuarios')
                        .select('id')
                        .limit(1)
                        .single();
                    if (fallbackUser) setUserProfile(fallbackUser);
                }

                if (id) {
                    // Fetch expediente info with SPD
                    const { data: expData } = await supabase
                        .from('expedientes')
                        .select('*, servicios_proteccion(nombre)')
                        .eq('id', id)
                        .single();

                    if (expData) setExpediente(expData as any);

                    const { data, error } = await supabase
                        .from('vw_ingresos_detalle')
                        .select('*')
                        .eq('expediente_id', id)
                        .order('numero_ingreso', { ascending: false });

                    if (error) throw error;
                    setIngresos(data as IngresoDetalle[]);
                }
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setLoading(false);
            }
        };

        void fetchUserAndIngresos();
    }, [id]);

    useEffect(() => {
        const fetchSpds = async () => {
            const { data } = await supabase.from('servicios_proteccion').select('id, nombre').order('nombre');
            setSpds(data || []);
        };
        fetchSpds();
    }, []);

    const handleNuevoCaso = async () => {
        console.log('Inicio handleNuevoCaso - ID:', id, 'UserProfile:', userProfile);

        if (!id) {
            console.error('ID de expediente no encontrado');
            return;
        }

        if (!userProfile) {
            console.warn('UserProfile no encontrado, intentando re-obtener...');
            alert('Error: Debe estar autenticado para realizar esta acción. Verifique su sesión.');
            return;
        }

        setLoading(true);
        try {
            console.log('Buscando último número de ingreso...');
            const maxNumero = ingresos.length > 0
                ? Math.max(...ingresos.map(i => i.numero_ingreso))
                : 0;

            const nextNumero = maxNumero + 1;
            console.log('Siguiente número correlativo:', nextNumero);

            const { data: newIngreso, error: insertError } = await supabase
                .from('ingresos')
                .insert({
                    expediente_id: parseInt(id),
                    numero_ingreso: nextNumero,
                    fecha_ingreso: new Date().toISOString().split('T')[0],
                    es_emergencia: false,
                    etapa: 'Recepción',
                    estado: 'Activo',
                    profesional_asignado_id: userProfile.id,
                    ultimo_usuario_id: userProfile.id
                })
                .select()
                .single();

            if (insertError) {
                console.error('Error al insertar ingreso:', insertError);
                throw insertError;
            }

            console.log('Ingreso creado exitosamente. ID:', newIngreso.id);

            // Register audit - Optimized registry
            const { error: auditError } = await supabase.from('auditoria').insert({
                tabla: 'ingresos',
                registro_id: newIngreso.id,
                accion: 'INSERT',
                usuario_id: userProfile.id,
                datos_nuevos: newIngreso
            });

            if (auditError) {
                console.warn('Error al registrar auditoría (no bloqueante):', auditError);
            }

            // Refetch data
            console.log('Refrescando listado...');
            const { data: refreshed, error: fetchError } = await supabase
                .from('vw_ingresos_detalle')
                .select('*')
                .eq('expediente_id', id)
                .order('numero_ingreso', { ascending: false });

            if (fetchError) throw fetchError;
            setIngresos(refreshed as IngresoDetalle[]);
            console.log('Carga finalizada con éxito');
        } catch (error) {
            console.error('Excepción en handleNuevoCaso:', error);
            alert('Hubo un problema al crear el nuevo caso. Revise la consola para más detalles.');
        } finally {
            setLoading(false);
        }
    };

    const handleTransfer = async () => {
        if (!id || !transferData.destinoSpdId || !headerData) return;

        const destinoSpdIdNum = parseInt(transferData.destinoSpdId, 10);
        console.log('Iniciando transferencia:', { expedienteId: id, destinoSpdId: destinoSpdIdNum });

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No user found');

            // 1. Get current expediente to know current SPD
            const { data: exp } = await supabase
                .from('expedientes')
                .select('servicio_proteccion_id')
                .eq('id', id)
                .single();

            console.log('SPD Actual:', exp?.servicio_proteccion_id, '-> Nuevo SPD:', destinoSpdIdNum);

            // 2. Insert transfer record
            const { error: transferError } = await supabase.from('transferencias_expedientes').insert({
                expediente_id: parseInt(id),
                spd_origen_id: exp?.servicio_proteccion_id,
                spd_destino_id: destinoSpdIdNum,
                usuario_emisor_id: user.id,
                fecha_transferencia: transferData.fecha,
                motivo: transferData.motivo
            });

            if (transferError) throw transferError;

            // 3. Update expediente current SPD
            const { error: updateError, data: updateData } = await supabase.from('expedientes')
                .update({ servicio_proteccion_id: destinoSpdIdNum })
                .eq('id', id)
                .select();

            console.log('Resultado del UPDATE:', updateData, updateError);

            if (updateError) throw updateError;

            // 4. Send notifications to users in destination SPD
            const { data: destUsers } = await supabase
                .from('usuarios')
                .select('id')
                .eq('servicio_proteccion_id', transferData.destinoSpdId);

            if (destUsers && destUsers.length > 0) {
                const notifications = destUsers.map(u => ({
                    usuario_id: u.id,
                    titulo: 'Expediente Transferido',
                    mensaje: `Se ha transferido el expediente #${headerData.expediente_numero} a su SPD.`,
                    tipo: 'info',
                    link: `/expedientes/${id}/ingresos`
                }));
                await supabase.from('notificaciones').insert(notifications);
            }

            alert('Expediente transferido correctamente');
            setShowConfirmModal(false);
            setShowTransferModal(false);
            window.location.reload();
        } catch (error) {
            console.error('Error in transfer:', error);
            alert('Error al transferir el expediente');
        }
    };

    const calculateAge = (birthDate: string) => {
        return differenceInDays(new Date(), new Date(birthDate)) / 365.25;
    };

    const getPermanencia = (ingreso: IngresoDetalle) => {
        const start = new Date(ingreso.fecha_ingreso);
        const end = ingreso.fecha_cierre ? new Date(ingreso.fecha_cierre) : new Date();
        const days = differenceInDays(end, start);
        return days;
    };

    const hasActiveCase = ingresos.some(i => i.estado === 'Activo' || i.estado === 'abierto');
    const headerData = ingresos[0];

    return (
        <main className="max-w-[1200px] mx-auto py-6 px-4 md:px-10 space-y-8">
            <Breadcrumbs
                items={[
                    { label: 'Expedientes', path: '/expedientes' },
                    { label: 'Historial de Ingresos', active: true }
                ]}
            />

            {/* Header / Summary Card */}
            {headerData && (
                <div className="bg-white dark:bg-[#1a2e2e] p-6 rounded-2xl border border-[#f0f4f4] dark:border-[#223636] shadow-sm overflow-hidden relative group">
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                        <span className="material-symbols-outlined text-8xl">child_care</span>
                    </div>
                    <div className="flex flex-col md:flex-row gap-8 items-center relative z-10">
                        <div className="size-24 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                            <span className="material-symbols-outlined text-5xl">face</span>
                        </div>
                        <div className="flex-1 space-y-2 text-center md:text-left">
                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                                <h1 className="text-3xl font-black tracking-tight">{headerData.nino_nombre} {headerData.nino_apellido}</h1>
                                <span className="px-3 py-1 bg-primary text-[#112121] text-[10px] font-black rounded-full uppercase tracking-widest">
                                    {headerData.expediente_activo ? 'Expediente Activo' : 'Expediente Inactivo'}
                                </span>
                            </div>
                            <div className="flex flex-wrap justify-center md:justify-start gap-6 text-sm font-medium text-[#638888] dark:text-gray-400">
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-base">fingerprint</span>
                                    <span>DNI: {headerData.nino_dni}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-base">cake</span>
                                    <span>{Math.floor(calculateAge(headerData.nino_fecha_nacimiento))} años</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-base">badge</span>
                                    <span>Exp. N°: {headerData.expediente_numero}</span>
                                </div>
                                <div className="flex items-center gap-2 px-3 py-1 bg-[#638888]/10 dark:bg-white/5 rounded-lg border border-[#638888]/10">
                                    <span className="material-symbols-outlined text-base text-primary">account_balance</span>
                                    <span className="text-primary font-bold">SPD: {expediente?.servicios_proteccion?.nombre || 'Cargando...'}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col items-center md:items-end gap-3 flex-shrink-0">
                            <div className="flex flex-col items-center md:items-end gap-2 bg-[#f0f4f4]/50 dark:bg-[#112121]/50 p-4 rounded-xl border border-[#f0f4f4] dark:border-[#223636] min-w-[200px]">
                                <span className="text-[10px] font-black text-[#638888] uppercase tracking-widest">Profesional Responsable</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold">{headerData.profesional_asignado_nombre || 'No asignado'}</span>
                                    <div className="size-8 rounded-full bg-primary flex items-center justify-center text-[#112121] font-black text-xs">
                                        {headerData.profesional_asignado_nombre?.substring(0, 2).toUpperCase() || '??'}
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowTransferModal(true)}
                                className="w-full flex items-center justify-center gap-2 rounded-xl h-10 px-4 bg-white dark:bg-[#1a2e2e] text-[#638888] dark:text-gray-300 text-xs font-bold hover:bg-gray-50 dark:hover:bg-[#223636] border border-[#f0f4f4] dark:border-[#223636] transition-all shadow-sm"
                            >
                                <span className="material-symbols-outlined text-lg">swap_horiz</span>
                                Transferir Expediente
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Page Heading & Action */}
            <div className="flex flex-wrap justify-between items-center gap-4">
                <div className="flex flex-col gap-1">
                    <h2 className="text-2xl font-black leading-tight">Historial de Ingresos</h2>
                    <p className="text-sm text-[#638888] dark:text-gray-400">Seguimiento de etapas y estados del legajo</p>
                </div>
                <button
                    onClick={handleNuevoCaso}
                    disabled={hasActiveCase || loading}
                    className={`flex min-w-[140px] items-center gap-2 justify-center rounded-lg h-11 px-6 text-sm font-bold leading-normal transition-all group
                        ${hasActiveCase
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                            : 'bg-primary text-[#112121] hover:shadow-lg hover:shadow-primary/20 cursor-pointer'
                        }`}
                    title={hasActiveCase ? "Ya existe un caso activo para este expediente" : "Abrir nuevo ingreso"}
                >
                    <span className="material-symbols-outlined group-hover:rotate-90 transition-transform">add_circle</span>
                    <span>{hasActiveCase ? 'Caso Activo' : 'Nuevo Caso'}</span>
                </button>
            </div>

            {/* Table Container */}
            <div className="overflow-hidden bg-white dark:bg-[#1a2e2e] border border-[#f0f4f4] dark:border-[#223636] rounded-2xl shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-[#fcfcfc] dark:bg-[#1d3535] border-b border-[#f0f4f4] dark:border-[#223636]">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold text-[#638888] uppercase tracking-wider">Ingreso #</th>
                                <th className="px-6 py-4 text-xs font-bold text-[#638888] uppercase tracking-wider">Etapa Actual</th>
                                <th className="px-6 py-4 text-xs font-bold text-[#638888] uppercase tracking-wider">Fecha Apertura</th>
                                <th className="px-6 py-4 text-xs font-bold text-[#638888] uppercase tracking-wider">Último Cambio por</th>
                                <th className="px-6 py-4 text-xs font-bold text-[#638888] uppercase tracking-wider text-center">Días Abierto</th>
                                <th className="px-6 py-4 text-xs font-bold text-[#638888] uppercase tracking-wider text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#f0f4f4] dark:divide-[#223636]">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-20 text-center">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                                    </td>
                                </tr>
                            ) : (
                                ingresos.map((ingreso) => {
                                    const daysOpen = getPermanencia(ingreso);
                                    const isUrgent = ingreso.es_emergencia;
                                    const isClosed = ingreso.estado === 'Cerrado';

                                    return (
                                        <Fragment key={ingreso.id}>
                                            <tr className={`hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors group ${isClosed ? 'opacity-70 grayscale-[0.5]' : ''}`}>
                                                <td className="px-6 py-5">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-sm font-bold text-[#111818] dark:text-white">#{ingreso.numero_ingreso}</span>
                                                        {isUrgent && (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black bg-red-100 text-red-600 border border-red-200 uppercase tracking-tighter animate-pulse">
                                                                URGENTE
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${ingreso.etapa === 'Seguimiento' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600' :
                                                        ingreso.etapa === 'Ampliación' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' :
                                                            ingreso.etapa === 'Recepción' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600' :
                                                                'bg-green-100 dark:bg-green-900/30 text-green-600'
                                                        }`}>
                                                        {ingreso.etapa}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-5 text-sm font-medium text-[#111818] dark:text-gray-300">
                                                    {format(new Date(ingreso.fecha_ingreso), "dd MMM yyyy", { locale: es })}
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="size-8 rounded-xl bg-primary/10 flex items-center justify-center text-[10px] font-black text-primary border border-primary/20 shadow-sm">
                                                            {ingreso.ultimo_profesional_nombre?.substring(0, 2).toUpperCase() || (ingreso.profesional_asignado_nombre?.substring(0, 2).toUpperCase()) || '--'}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-bold text-[#111818] dark:text-gray-200">
                                                                {ingreso.ultimo_profesional_nombre || ingreso.profesional_asignado_nombre || 'Sincronización'}
                                                            </span>
                                                            <span className="text-[10px] font-medium text-slate-400 font-bold uppercase tracking-tighter">
                                                                {ingreso.ultimo_profesional_nombre ? 'Última modificación' : 'Profesional asignado'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 text-center">
                                                    <span className={`text-sm font-bold ${daysOpen > 10 && !isClosed ? 'text-red-500 animate-pulse' : 'text-[#638888]'}`}>
                                                        {isClosed ? 'Cerrado' : `${daysOpen} días`}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-5 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Link
                                                            to={`/expedientes/${id}/ingresos/${ingreso.id}`}
                                                            className="p-2 rounded-lg text-[#638888] hover:bg-primary/20 hover:text-primary transition-all"
                                                            title="Ver Detalle"
                                                        >
                                                            <span className="material-symbols-outlined text-xl">visibility</span>
                                                        </Link>
                                                        <button className="p-2 rounded-lg text-[#638888] hover:bg-primary/20 hover:text-primary transition-all" title="Historial">
                                                            <span className="material-symbols-outlined text-xl">history</span>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                            {isClosed && (
                                                <tr className="bg-slate-50/50 dark:bg-black/10">
                                                    <td colSpan={6} className="px-6 py-3">
                                                        <div className="flex items-center gap-4 text-xs font-medium text-[#638888]">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="material-symbols-outlined text-sm">event_busy</span>
                                                                <span>Cerrado el: {ingreso.fecha_cierre && format(new Date(ingreso.fecha_cierre), "dd/MM/yyyy")}</span>
                                                            </div>
                                                            <div className="flex items-center gap-1.5 flex-1">
                                                                <span className="material-symbols-outlined text-sm">chat_bubble</span>
                                                                <span>Motivo: {ingreso.motivo_cierre || 'No especificado'}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </Fragment>
                                    );
                                })
                            )}
                            {!loading && ingresos.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-20 text-center text-[#638888]">No se encontraron ingresos para este expediente</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="px-6 py-4 flex items-center justify-between border-t border-[#f0f4f4] dark:border-[#223636] bg-[#fcfcfc] dark:bg-[#1d3535]">
                    <p className="text-xs font-medium text-[#638888]">
                        Total: {ingresos.length} ingresos registrados
                    </p>
                </div>
            </div>

            {/* Transfer Modal */}
            {showTransferModal && (
                <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
                    <div className="bg-white dark:bg-[#1a2e2e] w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-[#f0f4f4] dark:border-[#223636]">
                        <div className="px-8 py-6 border-b border-[#f0f4f4] dark:border-[#223636] flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-black tracking-tight dark:text-white">Transferir Expediente</h2>
                                <p className="text-xs text-primary uppercase font-bold tracking-widest mt-1">
                                    SPD Actual: {expediente?.servicios_proteccion?.nombre || '...'}
                                </p>
                            </div>
                            <button onClick={() => setShowTransferModal(false)} className="size-10 rounded-full hover:bg-gray-100 dark:hover:bg-[#112121] flex items-center justify-center transition-all text-[#638888]">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="p-8 space-y-6">
                            <div>
                                <label className="block text-xs font-black text-[#638888] uppercase tracking-widest mb-2">Nuevo Servicio de Protección (SPD)</label>
                                <select
                                    className="w-full bg-[#fcfcfc] dark:bg-[#112121] border border-[#f0f4f4] dark:border-[#223636] rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 dark:text-white outline-none"
                                    value={transferData.destinoSpdId}
                                    onChange={(e) => setTransferData({ ...transferData, destinoSpdId: e.target.value })}
                                >
                                    <option value="">Seleccionar SPD destino...</option>
                                    {spds.map((s) => (
                                        <option key={s.id} value={s.id}>{s.nombre}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-black text-[#638888] uppercase tracking-widest mb-2">Fecha de Transferencia</label>
                                <input
                                    type="date"
                                    className="w-full bg-[#fcfcfc] dark:bg-[#112121] border border-[#f0f4f4] dark:border-[#223636] rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 dark:text-white outline-none"
                                    value={transferData.fecha}
                                    onChange={(e) => setTransferData({ ...transferData, fecha: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-black text-[#638888] uppercase tracking-widest mb-2">Motivo de la Transferencia</label>
                                <textarea
                                    className="w-full bg-[#fcfcfc] dark:bg-[#112121] border border-[#f0f4f4] dark:border-[#223636] rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary/20 dark:text-white outline-none"
                                    placeholder="Explique las razones del traslado..."
                                    rows={4}
                                    value={transferData.motivo}
                                    onChange={(e) => setTransferData({ ...transferData, motivo: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="px-8 py-6 bg-[#fcfcfc] dark:bg-[#1d3535] flex justify-end gap-4 border-t border-[#f0f4f4] dark:border-[#223636]">
                            <button onClick={() => setShowTransferModal(false)} className="px-6 py-2.5 rounded-xl font-bold text-sm text-[#638888] hover:text-[#111818] dark:hover:text-white">Cancelar</button>
                            <button
                                onClick={() => setShowConfirmModal(true)}
                                disabled={!transferData.destinoSpdId || !transferData.motivo}
                                className="px-8 py-2.5 rounded-xl bg-primary text-[#112121] font-bold text-sm shadow-lg shadow-primary/20 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Confirmar Transferencia
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirmation Alert Modal */}
            {showConfirmModal && (
                <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-[#1a2e2e] w-full max-w-sm rounded-3xl shadow-2xl p-8 border border-[#f0f4f4] dark:border-[#223636] text-center space-y-6">
                        <div className="size-20 rounded-full bg-amber-100 dark:bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-500 mx-auto">
                            <span className="material-symbols-outlined text-4xl">warning</span>
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xl font-black dark:text-white mt-4">¿Confirmar Movimiento?</h3>
                            <p className="text-sm text-[#638888] font-medium leading-relaxed">
                                Al transferir este expediente, el <span className="text-primary font-bold">{expediente?.servicios_proteccion?.nombre}</span> y sus profesionales <span className="text-rose-500 font-bold uppercase underline">perderán la visibilidad</span> total del caso.
                            </p>
                        </div>
                        <div className="flex flex-col gap-3 pt-4">
                            <button
                                onClick={handleTransfer}
                                className="w-full py-3.5 rounded-2xl bg-amber-500 text-white font-black text-sm shadow-lg shadow-amber-500/20 hover:brightness-110 active:scale-95 transition-all"
                            >
                                SÍ, TRANSFERIR AHORA
                            </button>
                            <button
                                onClick={() => setShowConfirmModal(false)}
                                className="w-full py-3.5 rounded-2xl bg-slate-100 dark:bg-[#112121] text-[#638888] font-black text-sm hover:bg-slate-200 dark:hover:bg-[#223636] transition-all"
                            >
                                CANCELAR
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main >
    );
};

export default IngresosPage;
