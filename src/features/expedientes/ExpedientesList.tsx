import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Search,
    Filter,
    Plus,
    MoreVertical,
    ExternalLink,
    Download,
    Calendar,
    User
} from 'lucide-react';
import Button from '../../components/ui/Button';
import Breadcrumbs from '../../components/ui/Breadcrumbs';

import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';

interface ExpedienteRow {
    id: number;
    numero: string;
    fecha_apertura: string;
    activo: boolean; // Actually 'esta_activo' in view but renamed here for compatibility
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

    useEffect(() => {
        const fetchExpedientes = async () => {
            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from('vw_expedientes_list')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (error) throw error;
                setExpedientes(data as any);
            } catch (error) {
                console.error('Error fetching expedientes:', error);
            } finally {
                setLoading(false);
            }
        };

        void fetchExpedientes();
    }, []);

    const filteredExpedientes = (expedientes || []).filter((row: ExpedienteRow) => {
        const search = searchTerm.toLowerCase();
        return (
            row.numero?.toLowerCase().includes(search) ||
            row.nino_nombre?.toLowerCase().includes(search) ||
            row.nino_apellido?.toLowerCase().includes(search) ||
            row.nino_dni?.toString().includes(search)
        );
    });

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
                    <h1 className="text-2xl font-bold text-slate-900 leading-tight">Bandeja de Expedientes</h1>
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
                    <select className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20 text-slate-700">
                        <option>Todos los estados</option>
                        <option>Activos</option>
                        <option>Cerrados</option>
                    </select>
                    <Button variant="outline" className="flex items-center gap-2 border-slate-200 px-4 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-50">
                        <Filter size={18} />
                        <span>Filtros</span>
                    </Button>
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
                        <tbody className="text-sm divide-y divide-slate-100 italic-text-none">
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
                                    <tr key={row.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-5">
                                            <div className="flex flex-col gap-1">
                                                <span className="font-bold text-slate-900 text-base tracking-tight">{row.numero}</span>
                                                <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1 uppercase">
                                                    <Calendar size={12} className="text-slate-300" /> Apertura: {format(new Date(row.fecha_apertura), 'dd MMM yyyy')}
                                                </span>
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
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-semibold text-slate-600">{row.ultimo_profesional || 'Sin asignar'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-2">
                                                <div className="flex items-center gap-1.5 bg-slate-100 text-slate-700 px-2.5 py-1.5 rounded-lg border border-slate-200">
                                                    <span className="material-symbols-outlined text-[18px] text-primary/70">account_balance</span>
                                                    <span className="text-xs font-extrabold uppercase tracking-tight">
                                                        {row.spd_nombre || 'No asignado'}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex justify-center">
                                                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${row.activo ? 'bg-success/10 text-success border-success/20' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                                                    <div className={`size-2 rounded-full ${row.activo ? 'bg-success' : 'bg-slate-400'}`}></div>
                                                    <span className="text-[10px] font-bold uppercase tracking-wider leading-none">
                                                        {row.activo ? "ACTIVO" : "INACTIVO"}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Link
                                                    to={`/expedientes/${row.id}/ingresos`}
                                                    className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
                                                    title="Ver detalle"
                                                >
                                                    <ExternalLink size={20} />
                                                </Link>
                                                <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all" title="Descargar PDF">
                                                    <Download size={20} />
                                                </button>
                                                <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all">
                                                    <MoreVertical size={20} />
                                                </button>
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
                                            <p className="text-slate-400 font-medium">No se encontraron expedientes que coincidan con la búsqueda</p>
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
        </div>
    );
};

export default ExpedientesList;
