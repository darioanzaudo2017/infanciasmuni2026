import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Search,
    Plus,
    ExternalLink,
    Download,
    Calendar,
    User,
    Bell,
    Ban
} from 'lucide-react';
import Button from '../../components/ui/Button';
import Breadcrumbs from '../../components/ui/Breadcrumbs';

import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';
import { useNotifications } from '../../hooks/useNotifications';

interface ExpedienteRow {
    id: number;
    numero: string;
    fecha_apertura: string;
    activo: boolean;
    anulado: boolean;
    motivo_anulacion: string | null;
    anulado_at: string | null;
    nino_nombre: string;
    nino_apellido: string;
    nino_dni: number;
    ultimo_profesional: string;
    spd_nombre: string;
}

const ExpedientesList = () => {
    const [expedientes, setExpedientes] = useState<ExpedienteRow[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('Activos');
    const [userRole, setUserRole] = useState<string | null>(null);

    // Modal anulación
    const [anulando, setAnulando] = useState<ExpedienteRow | null>(null);
    const [motivoAnulacion, setMotivoAnulacion] = useState('');
    const [savingAnulacion, setSavingAnulacion] = useState(false);

    const { notifications } = useNotifications();

    useEffect(() => {
        const fetchAll = async () => {
            setLoading(true);
            try {
                const [{ data }, { data: { user } }] = await Promise.all([
                    supabase.from('vw_expedientes_list').select('*').order('created_at', { ascending: false }),
                    supabase.auth.getUser()
                ]);
                if (data) setExpedientes(data as any);
                if (user) {
                    const { data: profile } = await supabase
                        .from('usuarios')
                        .select('usuarios_roles(roles(nombre))')
                        .eq('id', user.id)
                        .single();
                    setUserRole((profile as any)?.usuarios_roles?.[0]?.roles?.nombre || null);
                }
            } catch (error) {
                console.error('Error fetching expedientes:', error);
            } finally {
                setLoading(false);
            }
        };
        void fetchAll();
    }, []);

    const canAnular = userRole === 'Administrador' || userRole === 'Coordinador';

    const filteredExpedientes = (expedientes || []).filter((row: ExpedienteRow) => {
        const search = searchTerm.toLowerCase();
        const matchesSearch = row.numero?.toLowerCase().includes(search) ||
            row.nino_nombre?.toLowerCase().includes(search) ||
            row.nino_apellido?.toLowerCase().includes(search) ||
            row.nino_dni?.toString().includes(search);

        let matchesStatus = true;
        if (statusFilter === 'Activos') matchesStatus = row.activo === true && !row.anulado;
        if (statusFilter === 'Cerrados') matchesStatus = row.activo === false && !row.anulado;
        if (statusFilter === 'Anulados') matchesStatus = row.anulado === true;
        if (statusFilter === 'Todos') matchesStatus = true;

        return matchesSearch && matchesStatus;
    });

    const handleAnular = async () => {
        if (!anulando || !motivoAnulacion.trim()) return;
        setSavingAnulacion(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const { error } = await supabase
                .from('expedientes')
                .update({
                    anulado: true,
                    motivo_anulacion: motivoAnulacion.trim(),
                    anulado_por: user?.id,
                    anulado_at: new Date().toISOString()
                })
                .eq('id', anulando.id);
            if (error) throw error;
            setExpedientes(prev => prev.map(e =>
                e.id === anulando.id ? { ...e, anulado: true, motivo_anulacion: motivoAnulacion.trim() } : e
            ));
            setAnulando(null);
            setMotivoAnulacion('');
        } catch (err: any) {
            alert('Error al anular: ' + err.message);
        } finally {
            setSavingAnulacion(false);
        }
    };

    const hasUnreadNotification = (row: ExpedienteRow) => {
        if (!row.activo) return false;
        return notifications.some(n =>
            !n.leida &&
            ((n.link && n.link.includes(`/expedientes/${row.id}/`)) ||
                (n as any).expediente_id === row.id)
        );
    };

    return (
        <div className="space-y-6 text-slate-800">
            <Breadcrumbs
                items={[
                    { label: 'Inicio', path: '/' },
                    { label: 'Expedientes', active: true }
                ]}
            />
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <h1 className="text-2xl font-bold text-slate-900 leading-tight">Bandeja de Expedientes</h1>
                        {!loading && (
                            <span className="bg-primary/10 text-primary text-sm font-bold px-3 py-0.5 rounded-full border border-primary/20 shadow-sm">
                                {filteredExpedientes.length} {filteredExpedientes.length === 1 ? 'resultado' : 'resultados'}
                            </span>
                        )}
                    </div>
                    <p className="text-slate-500 text-sm">Gestiona y realiza seguimiento de todos los casos de vulneración.</p>
                </div>
                <Link to="/expedientes/nuevo">
                    <Button className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white font-bold p-3 rounded-xl transition-all shadow-md">
                        <Plus size={20} />
                        <span>Nuevo Expediente</span>
                    </Button>
                </Link>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar por DNI, Nombre o Nº de Expediente..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm font-medium"
                    />
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20 text-slate-700"
                    >
                        <option value="Activos">Activos</option>
                        <option value="Cerrados">Cerrados</option>
                        <option value="Todos">Todos los estados</option>
                        {canAnular && <option value="Anulados">Anulados</option>}
                    </select>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-200 text-slate-500 text-[11px] font-bold uppercase tracking-widest">
                                <th className="px-6 py-4">Información del Caso</th>
                                <th className="px-6 py-4">Niño / Niña</th>
                                <th className="px-6 py-4">Profesional Responsable</th>
                                <th className="px-6 py-4">Jurisdicción (SPD)</th>
                                <th className="px-6 py-4">Estado</th>
                                <th className="px-6 py-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                                            <span className="text-slate-400 font-medium">Cargando expedientes...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredExpedientes.map((row: ExpedienteRow) => (
                                    <tr key={row.id} className={`hover:bg-slate-50/50 transition-colors group ${row.anulado ? 'opacity-60 bg-rose-50/30' : ''} ${hasUnreadNotification(row) ? 'bg-amber-50/30' : ''}`}>
                                        <td className="px-6 py-5">
                                            <div className="flex flex-col gap-1 relative">
                                                <div className="flex items-center gap-2">
                                                    {hasUnreadNotification(row) && (
                                                        <div className="size-2 bg-amber-500 rounded-full animate-pulse absolute -left-3 top-1.5"></div>
                                                    )}
                                                    <span className={`font-bold text-base tracking-tight ${row.anulado ? 'line-through text-slate-400' : 'text-slate-900'}`}>{row.numero}</span>
                                                    {hasUnreadNotification(row) && (
                                                        <span className="flex items-center gap-1 text-[10px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-md uppercase tracking-tighter">
                                                            <Bell size={10} />
                                                            Novedad
                                                        </span>
                                                    )}
                                                    {row.anulado && (
                                                        <span className="text-[10px] font-black bg-rose-100 text-rose-600 px-2 py-0.5 rounded-md uppercase tracking-widest">Anulado</span>
                                                    )}
                                                </div>
                                                <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1 uppercase">
                                                    <Calendar size={12} className="text-slate-300" /> Apertura: {format(new Date(row.fecha_apertura + 'T12:00:00'), 'dd MMM yyyy')}
                                                </span>
                                                {row.anulado && row.motivo_anulacion && (
                                                    <span className="text-[10px] text-rose-400 font-medium italic">Motivo: {row.motivo_anulacion}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                                    <User size={18} />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-800 leading-tight">{row.nino_nombre} {row.nino_apellido}</span>
                                                    <span className="text-xs font-medium text-slate-400">DNI: {row.nino_dni}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className="text-sm font-semibold text-slate-600">{row.ultimo_profesional || 'Sin asignar'}</span>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-1.5 bg-slate-100 text-slate-700 px-2.5 py-1.5 rounded-lg border border-slate-200 w-fit">
                                                <span className="material-symbols-outlined text-[18px] text-primary/70">account_balance</span>
                                                <span className="text-xs font-extrabold uppercase tracking-tight">
                                                    {row.spd_nombre || 'No asignado'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex justify-center">
                                                {row.anulado ? (
                                                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border bg-rose-50 text-rose-500 border-rose-200">
                                                        <div className="size-2 rounded-full bg-rose-400"></div>
                                                        <span className="text-[10px] font-bold uppercase tracking-wider leading-none">ANULADO</span>
                                                    </div>
                                                ) : (
                                                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${row.activo ? 'bg-success/10 text-success border-success/20' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                                                        <div className={`size-2 rounded-full ${row.activo ? 'bg-success' : 'bg-slate-400'}`}></div>
                                                        <span className="text-[10px] font-bold uppercase tracking-wider leading-none">
                                                            {row.activo ? 'ACTIVO' : 'INACTIVO'}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {!row.anulado && (
                                                    <Link
                                                        to={`/expedientes/${row.id}/ingresos`}
                                                        className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
                                                        title="Ver detalle"
                                                    >
                                                        <ExternalLink size={20} />
                                                    </Link>
                                                )}
                                                {!row.anulado && (
                                                    <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all" title="Descargar PDF">
                                                        <Download size={20} />
                                                    </button>
                                                )}
                                                {canAnular && !row.anulado && (
                                                    <button
                                                        onClick={() => { setAnulando(row); setMotivoAnulacion(''); }}
                                                        className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                                                        title="Anular expediente"
                                                    >
                                                        <Ban size={20} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                            {!loading && filteredExpedientes.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-24 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <span className="material-symbols-outlined text-4xl text-slate-200">search_off</span>
                                            <p className="text-slate-400 font-medium">No se encontraron expedientes</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="bg-slate-50/50 px-6 py-4 border-t border-slate-200 flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                    <span>Mostrando {filteredExpedientes.length} de {expedientes.length} expedientes</span>
                </div>
            </div>

            {/* Modal Anular */}
            {anulando && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setAnulando(null)}></div>
                    <div className="relative z-10 bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-4 px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-rose-50 dark:bg-rose-900/20">
                            <div className="size-10 rounded-xl bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center text-rose-500">
                                <Ban size={20} />
                            </div>
                            <div>
                                <h3 className="font-black text-slate-800 dark:text-white">Anular Expediente</h3>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{anulando.numero}</p>
                            </div>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-sm text-slate-600 dark:text-slate-300">
                                El expediente quedará anulado y no aparecerá en la lista. Esta acción queda registrada y puede consultarse con el filtro "Anulados".
                            </p>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Motivo de anulación <span className="text-rose-500">*</span></label>
                                <textarea
                                    className="w-full p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-medium focus:ring-2 focus:ring-rose-400 outline-none min-h-[100px] resize-none"
                                    placeholder="Describa el motivo de la anulación..."
                                    value={motivoAnulacion}
                                    onChange={e => setMotivoAnulacion(e.target.value)}
                                    autoFocus
                                />
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                            <button
                                onClick={() => setAnulando(null)}
                                className="px-5 h-11 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleAnular}
                                disabled={!motivoAnulacion.trim() || savingAnulacion}
                                className="px-6 h-11 bg-rose-500 hover:bg-rose-600 disabled:opacity-40 text-white rounded-xl text-sm font-black uppercase tracking-widest transition-all shadow-lg shadow-rose-500/20"
                            >
                                {savingAnulacion ? 'Anulando...' : 'Confirmar Anulación'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExpedientesList;
