import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import Breadcrumbs from '../../../components/ui/Breadcrumbs';

interface SenafRequest {
    id: number;
    ingreso_id: number;
    estado: string;
    fecha_solicitud: string;
    expediente_numero: string;
    nino_nombre: string;
    profesional_nombre: string;
    spd_nombre: string;
}

const SenafManagementPage: React.FC = () => {
    const navigate = useNavigate();
    const [requests, setRequests] = useState<SenafRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('Todos');

    const fetchRequests = async () => {
        setLoading(true);
        try {
            // Using a join to get necessary details
            const { data, error } = await supabase
                .from('solicitudes_senaf')
                .select(`
                    id, 
                    ingreso_id, 
                    estado, 
                    fecha_solicitud,
                    ingresos (
                        expedientes (
                            numero,
                            ninos (nombre, apellido),
                            servicios_proteccion (nombre)
                        ),
                        usuarios!ingresos_profesional_asignado_id_fkey (nombre_completo)
                    )
                `)
                .order('fecha_solicitud', { ascending: false });

            if (error) throw error;

            const mapped = data?.map((s: any) => ({
                id: s.id,
                ingreso_id: s.ingreso_id,
                estado: s.estado,
                fecha_solicitud: s.fecha_solicitud,
                expediente_numero: s.ingresos?.expedientes?.numero || 'S/D',
                nino_nombre: `${s.ingresos?.expedientes?.ninos?.nombre} ${s.ingresos?.expedientes?.ninos?.apellido}` || 'S/D',
                profesional_nombre: s.ingresos?.usuarios?.nombre_completo || 'S/D',
                spd_nombre: s.ingresos?.expedientes?.servicios_proteccion?.nombre || 'S/D'
            })) || [];

            setRequests(mapped);
        } catch (error) {
            console.error('Error fetching SENAF requests:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    const filteredRequests = requests.filter(r => {
        const matchesSearch = r.expediente_numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.nino_nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.profesional_nombre.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'Todos' || r.estado === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const getStatusColor = (status: string) => {
        if (status === 'Aprobado') return 'bg-green-100 text-green-700 border-green-200';
        if (status.includes('Observado')) return 'bg-red-100 text-red-700 border-red-200';
        if (status === 'En elaboración') return 'bg-gray-100 text-gray-700 border-gray-200';
        return 'bg-amber-100 text-amber-700 border-amber-200';
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-[#121717] dark:text-white">
                        <span className="material-symbols-outlined text-primary text-3xl">account_balance</span>
                        <h2 className="text-xl font-bold leading-tight tracking-tight">Gestión de Medidas Excepcionales (SENAF)</h2>
                    </div>
                </div>

                <Breadcrumbs
                    items={[
                        { label: 'Administración' },
                        { label: 'SENAF', active: true }
                    ]}
                />

                <div className="flex flex-wrap items-center gap-4 bg-white dark:bg-zinc-900 p-4 rounded-xl border border-[#dce5e5] dark:border-[#333] shadow-sm">
                    <div className="flex-1 min-w-[300px] relative">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#658686] text-xl">search</span>
                        <input
                            type="text"
                            placeholder="Buscar por expediente, NNyA o profesional..."
                            className="w-full pl-10 pr-4 h-11 rounded-lg border-[#dce5e5] dark:border-[#333] bg-[#f8fafc] dark:bg-zinc-800 focus:ring-2 focus:ring-primary font-medium text-sm outline-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-[#658686] dark:text-[#a0b0b0]">Estado:</span>
                        <select
                            className="h-11 px-4 rounded-lg bg-[#f0f4f4] dark:bg-zinc-800 border-none text-sm font-medium dark:text-white outline-none"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="Todos">Todos los estados</option>
                            <option value="En elaboración">En elaboración</option>
                            <option value="Pendiente Coordinación">Pendiente Coordinación</option>
                            <option value="Pendiente Administración">Pendiente Administración</option>
                            <option value="Aprobado">Aprobado</option>
                            <option value="Observado Coordinación">Observado Coordinación</option>
                            <option value="Observado Administración">Observado Administración</option>
                        </select>
                    </div>
                </div>

                <div className="bg-white dark:bg-zinc-900 rounded-xl border border-[#dce5e5] dark:border-[#333] shadow-sm overflow-hidden text-slate-800 dark:text-white min-h-[400px]">
                    {loading ? (
                        <div className="flex items-center justify-center p-20">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-[#f0f4f4]/50 dark:bg-[#1a2e2e]/50 text-[#121717] dark:text-white border-b border-[#dce5e5] dark:border-[#333]">
                                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Fecha</th>
                                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Expediente / NNyA</th>
                                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">SPD / Profesional</th>
                                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Estado</th>
                                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#dce5e5] dark:divide-[#333]">
                                    {filteredRequests.map((r) => (
                                        <tr key={r.id} className="hover:bg-[#f6f8f8] dark:hover:bg-zinc-800 transition-colors group">
                                            <td className="px-6 py-4">
                                                <span className="text-xs font-bold text-slate-500">{new Date(r.fecha_solicitud).toLocaleDateString()}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-black text-primary">#{r.expediente_numero}</span>
                                                    <span className="text-xs font-medium text-slate-500">{r.nino_nombre}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold uppercase tracking-tighter text-slate-400">{r.spd_nombre}</span>
                                                    <span className="text-sm font-medium">{r.profesional_nombre}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusColor(r.estado)}`}>
                                                    {r.estado}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => navigate(`/expedientes/${r.ingreso_id}/senaf/${r.ingreso_id}`)}
                                                    className="inline-flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-primary hover:text-white text-zinc-600 dark:text-zinc-400 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                                                >
                                                    <span className="material-symbols-outlined text-sm">visibility</span>
                                                    <span>Ver Detalles</span>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredRequests.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-20 text-center text-[#658686]">No se encontraron solicitudes que coincidan con la búsqueda</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SenafManagementPage;
