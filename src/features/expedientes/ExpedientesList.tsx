import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
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
    ultima_seccion: string | null;
    ultima_seccion_fecha: string | null;
    creado_por_nombre: string | null;
    creado_por_fecha: string | null;
}

const PAGE_SIZE = 20;

// Solo las columnas que la pantalla muestra (las de ExpedienteRow). Pedir '*' trae también
// grupo_familiar_texto / referentes_texto / *_normalizado, que sirven únicamente para buscar y
// obligan a recalcular los familiares de TODOS los expedientes visibles antes de paginar
// (~2x más lento para el Administrador). La búsqueda filtra por esas columnas sin necesidad de seleccionarlas.
const COLUMNAS_LISTA =
    'id,numero,fecha_apertura,activo,anulado,motivo_anulacion,anulado_at,' +
    'nino_nombre,nino_apellido,nino_dni,ultimo_profesional,spd_nombre,' +
    'ultima_seccion,ultima_seccion_fecha,creado_por_nombre,creado_por_fecha';

// Saca acentos/diacríticos para que la búsqueda coincida contra las columnas
// ya normalizadas en vw_expedientes_list (unaccent aplicado en la vista)
const normalizarTexto = (texto: string) =>
    texto
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase();

const VALID_ESTADOS = ['Activos', 'Cerrados', 'Todos', 'Anulados'];

const ExpedientesList = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const urlEstado = searchParams.get('estado');
    const [expedientes, setExpedientes] = useState<ExpedienteRow[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState(
        urlEstado && VALID_ESTADOS.includes(urlEstado) ? urlEstado : 'Activos'
    );
    const [userRole, setUserRole] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [fetchError, setFetchError] = useState<string | null>(null);

    // Modal anulación
    const [anulando, setAnulando] = useState<ExpedienteRow | null>(null);
    const [motivoAnulacion, setMotivoAnulacion] = useState('');
    const [savingAnulacion, setSavingAnulacion] = useState(false);

    const { notifications } = useNotifications();

    // Debounce del texto de búsqueda para no disparar una consulta por cada tecla
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm.trim()), 350);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Sincronizar estado cuando cambia la URL
    useEffect(() => {
        if (urlEstado && VALID_ESTADOS.includes(urlEstado) && urlEstado !== statusFilter) {
            setStatusFilter(urlEstado);
        }
    }, [urlEstado]);

    // Volver a la página 1 cuando cambian los filtros/búsqueda
    useEffect(() => {
        setPage(1);
    }, [statusFilter, debouncedSearchTerm]);

    const fetchExpedientes = async (forzarConteo = false) => {
        setLoading(true);
        setFetchError(null);
        try {
            // El conteo exacto repite el trabajo de toda la vista: se pide solo al entrar a la página 1
            // (que es donde se aterriza al cambiar filtro/búsqueda) o cuando cambia el total (anular).
            // Al paginar (página 2 en adelante) se reutiliza el total ya conocido.
            const pedirConteo = forzarConteo || page === 1;
            let query = supabase
                .from('vw_expedientes_list')
                .select(COLUMNAS_LISTA, pedirConteo ? { count: 'exact' } : undefined);

            if (statusFilter === 'Activos') query = query.eq('activo', true).eq('anulado', false);
            if (statusFilter === 'Cerrados') query = query.eq('activo', false).eq('anulado', false);
            if (statusFilter === 'Anulados') query = query.eq('anulado', true);

            if (debouncedSearchTerm) {
                const term = debouncedSearchTerm.replace(/[,()]/g, '');
                const termNormalizado = normalizarTexto(term);
                query = query.or(`numero.ilike.*${term}*,nino_dni_texto.ilike.*${term}*,nino_nombre_normalizado.ilike.*${termNormalizado}*,nino_apellido_normalizado.ilike.*${termNormalizado}*,grupo_familiar_normalizado.ilike.*${termNormalizado}*,referentes_normalizado.ilike.*${termNormalizado}*`);
            }

            const from = (page - 1) * PAGE_SIZE;
            const to = from + PAGE_SIZE - 1;
            query = query.order('created_at', { ascending: false }).range(from, to);

            const { data, count, error } = await query;
            if (error) throw error;
            setExpedientes((data || []) as any);
            if (pedirConteo) setTotalCount(count ?? 0);
        } catch (error) {
            console.error('Error fetching expedientes:', error);
            setExpedientes([]);
            setTotalCount(0);
            setFetchError('No se pudo cargar la lista de expedientes. Probá de nuevo o avisá a soporte técnico.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Se separa de fetchUserRole: un hipo interno de Supabase en auth.getUser()
        // (ej. AbortError del lock de sesión entre pestañas) no debe impedir que
        // se cargue la lista de expedientes.
        const fetchUserRole = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const { data: profile } = await supabase
                        .from('usuarios')
                        .select('usuarios_roles(roles(nombre))')
                        .eq('id', user.id)
                        .single();
                    setUserRole((profile as any)?.usuarios_roles?.[0]?.roles?.nombre || null);
                }
            } catch (error) {
                console.error('Error fetching user role:', error);
            }
        };

        void fetchUserRole();
    }, []);

    useEffect(() => {
        void fetchExpedientes();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, statusFilter, debouncedSearchTerm]);

    const canAnular = userRole === 'Administrador' || userRole === 'Coordinador';
    const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

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
            setAnulando(null);
            setMotivoAnulacion('');
            void fetchExpedientes(true); // el total cambió: se vuelve a contar
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
                    { label: 'Expedientes', active: true }
                ]}
            />
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <h1 className="text-2xl font-bold text-slate-900 leading-tight">Bandeja de Expedientes</h1>
                        {!loading && (
                            <span className="bg-primary/10 text-primary text-sm font-bold px-3 py-0.5 rounded-full border border-primary/20 shadow-sm">
                                {totalCount} {totalCount === 1 ? 'resultado' : 'resultados'}
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
                        aria-label="Filtrar por estado"
                        value={statusFilter}
                        onChange={(e) => {
                            const val = e.target.value;
                            setStatusFilter(val);
                            setSearchParams(prev => {
                                const next = new URLSearchParams(prev);
                                next.set('estado', val);
                                return next;
                            });
                        }}
                        className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20 text-slate-700"
                    >
                        <option value="Activos">Activos</option>
                        <option value="Cerrados">Cerrados</option>
                        <option value="Todos">Todos los estados</option>
                        {canAnular && <option value="Anulados">Anulados</option>}
                    </select>
                </div>
            </div>

            {fetchError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-600 text-sm font-medium rounded-xl p-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-lg">error</span>
                    {fetchError}
                </div>
            )}

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Vista Mobile: Tarjetas (<640px) */}
                <div className="sm:hidden divide-y divide-slate-100">
                    {loading ? (
                        <div className="p-8 text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                            <span className="text-slate-400 text-xs font-medium">Cargando expedientes...</span>
                        </div>
                    ) : expedientes.length === 0 ? (
                        <div className="p-8 text-center flex flex-col items-center gap-2">
                            <span className="material-symbols-outlined text-3xl text-slate-300">search_off</span>
                            <p className="text-slate-500 text-xs font-medium">No se encontraron expedientes</p>
                        </div>
                    ) : (
                        expedientes.map((row: ExpedienteRow) => (
                            <div
                                key={row.id}
                                onClick={() => {
                                    if (!row.anulado) {
                                        navigate(`/expedientes/${row.id}/ingresos`);
                                    }
                                }}
                                className={`p-4 flex flex-col gap-3 transition-colors ${!row.anulado ? 'cursor-pointer active:bg-slate-50' : 'opacity-60 bg-rose-50/20'} ${hasUnreadNotification(row) ? 'bg-amber-50/30' : ''}`}
                            >
                                {/* Header: Número + Fecha apertura + Estado */}
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-2">
                                            {hasUnreadNotification(row) && (
                                                <span className="size-2 bg-amber-500 rounded-full animate-pulse"></span>
                                            )}
                                            <span className={`font-bold text-base ${row.anulado ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                                                {row.numero}
                                            </span>
                                            {hasUnreadNotification(row) && (
                                                <span className="flex items-center gap-1 text-[11px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-md uppercase tracking-tighter">
                                                    <Bell size={10} />
                                                    Novedad
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1 uppercase mt-0.5">
                                            <Calendar size={12} className="text-slate-400" />
                                            Apertura: {format(new Date(row.fecha_apertura + 'T12:00:00'), 'dd MMM yyyy')}
                                        </span>
                                        {row.anulado && row.motivo_anulacion && (
                                            <span className="text-xs text-rose-600 font-medium italic mt-0.5">Motivo: {row.motivo_anulacion}</span>
                                        )}
                                    </div>
                                    <div className="shrink-0">
                                        {row.anulado ? (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border bg-rose-50 text-rose-700 border-rose-200 text-[11px] font-bold uppercase">
                                                Anulado
                                            </span>
                                        ) : (
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-bold uppercase ${row.activo ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                                <span className={`size-1.5 rounded-full ${row.activo ? 'bg-emerald-600' : 'bg-slate-400'}`}></span>
                                                {row.activo ? 'Activo' : 'Inactivo'}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Niño/a + DNI */}
                                <div className="flex items-center gap-2.5 bg-slate-50 rounded-xl p-2.5 border border-slate-100">
                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                        <User size={16} />
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <span className="font-bold text-slate-800 text-sm truncate">{row.nino_nombre} {row.nino_apellido}</span>
                                        <span className="text-xs font-medium text-slate-600">DNI: {row.nino_dni}</span>
                                    </div>
                                </div>

                                {/* Profesional + SPD */}
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div>
                                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Responsable</span>
                                        <span className="font-semibold text-slate-700 truncate block">{row.ultimo_profesional || 'Sin asignar'}</span>
                                    </div>
                                    <div>
                                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">SPD</span>
                                        <span className="font-bold text-slate-700 truncate block">{row.spd_nombre || 'No asignado'}</span>
                                    </div>
                                </div>

                                {/* Acciones */}
                                <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                                    {!row.anulado && (
                                        <Link
                                            to={`/expedientes/${row.id}/ingresos`}
                                            onClick={(e) => e.stopPropagation()}
                                            className="flex items-center gap-1 text-xs font-bold text-primary px-2.5 py-1.5 rounded-lg hover:bg-primary/5 transition-colors"
                                        >
                                            <ExternalLink size={16} />
                                            Ver detalle
                                        </Link>
                                    )}
                                    {!row.anulado && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                            }}
                                            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                            title="Descargar PDF"
                                        >
                                            <Download size={18} />
                                        </button>
                                    )}
                                    {canAnular && !row.anulado && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setAnulando(row);
                                                setMotivoAnulacion('');
                                            }}
                                            className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                                            title="Anular expediente"
                                        >
                                            <Ban size={18} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Vista Desktop / Tablet: Tabla (>=640px) */}
                <div className="hidden sm:block overflow-x-auto">
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
                                expedientes.map((row: ExpedienteRow) => (
                                    <tr
                                        key={row.id}
                                        onClick={() => {
                                            if (!row.anulado) {
                                                navigate(`/expedientes/${row.id}/ingresos`);
                                            }
                                        }}
                                        className={`hover:bg-slate-50/50 transition-colors group ${!row.anulado ? 'cursor-pointer' : ''} ${row.anulado ? 'opacity-60 bg-rose-50/30' : ''} ${hasUnreadNotification(row) ? 'bg-amber-50/30' : ''}`}
                                    >
                                        <td className="px-6 py-5">
                                            <div className="flex flex-col gap-1 relative">
                                                <div className="flex items-center gap-2">
                                                    {hasUnreadNotification(row) && (
                                                        <div className="size-2 bg-amber-500 rounded-full animate-pulse absolute -left-3 top-1.5"></div>
                                                    )}
                                                    <span className={`font-bold text-base tracking-tight ${row.anulado ? 'line-through text-slate-400' : 'text-slate-900'}`}>{row.numero}</span>
                                                    {hasUnreadNotification(row) && (
                                                        <span className="flex items-center gap-1 text-[11px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-md uppercase tracking-tighter">
                                                            <Bell size={10} />
                                                            Novedad
                                                        </span>
                                                    )}
                                                    {row.anulado && (
                                                        <span className="text-[11px] font-black bg-rose-100 text-rose-700 px-2 py-0.5 rounded-md uppercase tracking-widest">Anulado</span>
                                                    )}
                                                </div>
                                                <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1 uppercase">
                                                    <Calendar size={12} className="text-slate-400" /> Apertura: {format(new Date(row.fecha_apertura + 'T12:00:00'), 'dd MMM yyyy')}
                                                </span>
                                                {row.anulado && row.motivo_anulacion && (
                                                    <span className="text-xs text-rose-600 font-medium italic">Motivo: {row.motivo_anulacion}</span>
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
                                                    <span className="text-xs font-medium text-slate-600">DNI: {row.nino_dni}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-semibold text-slate-600">{row.ultimo_profesional || 'Sin asignar'}</span>
                                                {row.ultima_seccion && (
                                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-tighter">
                                                        {row.ultima_seccion}
                                                        {row.ultima_seccion_fecha ? ` · ${format(new Date(row.ultima_seccion_fecha), 'dd/MM/yyyy')}` : ''}
                                                    </span>
                                                )}
                                                {row.creado_por_nombre && (
                                                    <span className="text-xs text-slate-500" title={row.creado_por_fecha ? format(new Date(row.creado_por_fecha), 'dd/MM/yyyy HH:mm') : ''}>
                                                        Cargado por: {row.creado_por_nombre}
                                                    </span>
                                                )}
                                            </div>
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
                                                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border bg-rose-50 text-rose-700 border-rose-200">
                                                        <div className="size-2 rounded-full bg-rose-600"></div>
                                                        <span className="text-[11px] font-bold uppercase tracking-wider leading-none">ANULADO</span>
                                                    </div>
                                                ) : (
                                                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${row.activo ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                                        <div className={`size-2 rounded-full ${row.activo ? 'bg-emerald-600' : 'bg-slate-400'}`}></div>
                                                        <span className="text-[11px] font-bold uppercase tracking-wider leading-none">
                                                            {row.activo ? 'ACTIVO' : 'INACTIVO'}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <div className="flex items-center justify-end gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                                {!row.anulado && (
                                                    <Link
                                                        to={`/expedientes/${row.id}/ingresos`}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
                                                        title="Ver detalle"
                                                    >
                                                        <ExternalLink size={20} />
                                                    </Link>
                                                )}
                                                {!row.anulado && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                        }}
                                                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                                                        title="Descargar PDF"
                                                    >
                                                        <Download size={20} />
                                                    </button>
                                                )}
                                                {canAnular && !row.anulado && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setAnulando(row);
                                                            setMotivoAnulacion('');
                                                        }}
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
                            {!loading && expedientes.length === 0 && (
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
                <div className="bg-slate-50/50 px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                    <span>
                        {totalCount === 0
                            ? 'Sin resultados'
                            : `Mostrando ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, totalCount)} de ${totalCount} expedientes`}
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page <= 1 || loading}
                            className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-white hover:text-primary disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-500 transition-colors"
                            title="Página anterior"
                        >
                            <span className="material-symbols-outlined text-lg leading-none block">chevron_left</span>
                        </button>
                        <span className="normal-case font-semibold text-slate-500 px-1">
                            Página {page} de {totalPages}
                        </span>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page >= totalPages || loading}
                            className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-white hover:text-primary disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-500 transition-colors"
                            title="Página siguiente"
                        >
                            <span className="material-symbols-outlined text-lg leading-none block">chevron_right</span>
                        </button>
                    </div>
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
