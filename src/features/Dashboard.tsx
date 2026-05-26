import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#FF6B9D', '#C23B22', '#2ECC71'];

const TIPO_FECHA_OPTIONS = [
    { value: 'fecha_ingreso', label: 'Fecha de ingreso' },
    { value: 'fecha_apertura', label: 'Fecha de apertura' },
];

const Dashboard = () => {
    const [loading, setLoading] = useState(true);
    const [rawKpis, setRawKpis] = useState<any[]>([]);
    const [rawDerechos, setRawDerechos] = useState<any[]>([]);
    const [spds, setSpds] = useState<any[]>([]);
    const [categorias, setCategorias] = useState<string[]>([]);

    // Filtros
    const [selectedSPD, setSelectedSPD] = useState('all');
    const [tipoFecha, setTipoFecha] = useState('fecha_ingreso');
    const [fechaDesde, setFechaDesde] = useState('');
    const [fechaHasta, setFechaHasta] = useState('');
    const [selectedCategoria, setSelectedCategoria] = useState('all');
    const [selectedSubcategoria, setSelectedSubcategoria] = useState('all');
    const [selectedDerecho, setSelectedDerecho] = useState<string | null>(null); // drill-down pie

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [
                { data: kpisData },
                { data: derechosData },
                { data: spdsData },
                { data: catData }
            ] = await Promise.all([
                supabase.from('vw_dashboard_kpis').select('*'),
                supabase.from('vw_dashboard_derechos').select('*'),
                supabase.from('vw_spds_por_rol').select('*'),
                supabase.from('catalogo_derechos').select('categoria').order('categoria')
            ]);

            setRawKpis(kpisData || []);
            setRawDerechos(derechosData || []);
            setSpds(spdsData || []);

            const cats = [...new Set((catData || []).map((c: any) => c.categoria))].filter(Boolean);
            setCategorias(cats);
        } catch (err) {
            console.error('Error cargando dashboard:', err);
        } finally {
            setLoading(false);
        }
    };

    // Subcategorías disponibles para la categoría seleccionada
    const subcategorias = useMemo(() => {
        if (selectedCategoria === 'all') return [];
        return [...new Set(
            rawDerechos
                .filter(d => d.categoria === selectedCategoria)
                .map(d => d.subcategoria)
        )].filter(Boolean).sort();
    }, [selectedCategoria, rawDerechos]);

    // Filtra las filas de KPIs según todos los filtros activos
    const filteredKpis = useMemo(() => {
        return rawKpis.filter(row => {
            if (selectedSPD !== 'all' && String(row.servicio_proteccion_id) !== String(selectedSPD)) return false;

            const fechaRef = tipoFecha === 'fecha_ingreso' ? row.fecha_ingreso : row.fecha_apertura;
            if (fechaDesde && fechaRef && fechaRef < fechaDesde) return false;
            if (fechaHasta && fechaRef && fechaRef > fechaHasta + 'T23:59:59') return false;

            return true;
        });
    }, [rawKpis, selectedSPD, tipoFecha, fechaDesde, fechaHasta]);

    // Filtra derechos vulnerados según todos los filtros activos
    const filteredDerechos = useMemo(() => {
        return rawDerechos.filter(row => {
            if (selectedSPD !== 'all' && String(row.servicio_proteccion_id) !== String(selectedSPD)) return false;

            const fechaRef = tipoFecha === 'fecha_ingreso' ? row.fecha_ingreso : row.fecha_apertura;
            if (fechaDesde && fechaRef && fechaRef < fechaDesde) return false;
            if (fechaHasta && fechaRef && fechaRef > fechaHasta + 'T23:59:59') return false;

            if (selectedCategoria !== 'all' && row.categoria !== selectedCategoria) return false;
            if (selectedSubcategoria !== 'all' && row.subcategoria !== selectedSubcategoria) return false;

            return true;
        });
    }, [rawDerechos, selectedSPD, tipoFecha, fechaDesde, fechaHasta, selectedCategoria, selectedSubcategoria]);

    // KPIs calculados sobre filas filtradas (expedientes únicos e ingresos)
    const stats = useMemo(() => {
        const ingresoIdsConDerecho = new Set(filteredDerechos.map(d => d.ingreso_id));

        // Si hay filtro de derecho, limitar KPIs a esos ingresos
        const kpisBase = (selectedCategoria !== 'all' || selectedSubcategoria !== 'all')
            ? filteredKpis.filter(r => r.ingreso_id && ingresoIdsConDerecho.has(r.ingreso_id))
            : filteredKpis;

        const expedientesUnicos = new Set(kpisBase.map(r => r.expediente_id)).size;
        const ingresosAbiertos = kpisBase.filter(r => r.estado === 'abierto').length;
        const abordajeIntegral = kpisBase.filter(r =>
            r.estado === 'abierto' && ['ampliacion', 'sintesis', 'definicion', 'seguimiento'].includes(r.etapa)
        ).length;
        const cerradosTotal = kpisBase.filter(r => r.estado === 'cerrado').length;
        const cerradosAsesoramiento = kpisBase.filter(r =>
            r.estado === 'cerrado' && r.motivo_cierre?.toLowerCase().includes('asesoramiento')
        ).length;
        const cerradosSENAF = kpisBase.filter(r =>
            r.estado === 'cerrado' && r.decision_id === 'derivacion'
        ).length;

        return { expedientesUnicos, ingresosAbiertos, abordajeIntegral, cerradosTotal, cerradosAsesoramiento, cerradosSENAF };
    }, [filteredKpis, filteredDerechos, selectedCategoria, selectedSubcategoria]);

    // Datos para el pie chart de derechos
    const pieData = useMemo(() => {
        if (selectedDerecho) {
            const subCounts: Record<string, number> = {};
            filteredDerechos
                .filter(d => d.categoria === selectedDerecho)
                .forEach(d => {
                    const sub = d.subcategoria || 'Sin subcategoría';
                    subCounts[sub] = (subCounts[sub] || 0) + 1;
                });
            return Object.entries(subCounts).map(([nombre, cantidad]) => ({ nombre, cantidad })).sort((a, b) => b.cantidad - a.cantidad);
        }
        const catCounts: Record<string, number> = {};
        filteredDerechos.forEach(d => {
            const cat = d.categoria || 'Sin categoría';
            catCounts[cat] = (catCounts[cat] || 0) + 1;
        });
        return Object.entries(catCounts).map(([nombre, cantidad]) => ({ nombre, cantidad })).sort((a, b) => b.cantidad - a.cantidad);
    }, [filteredDerechos, selectedDerecho]);

    // Datos para gráficos de barras por zona y SPD (respetan filtros)
    const zonaStats = useMemo(() => {
        const counts: Record<string, number> = {};
        filteredKpis.forEach(r => {
            const nombre = r.zona_nombre || 'Sin zona';
            counts[nombre] = (counts[nombre] || 0) + 1;
        });
        return Object.entries(counts).map(([nombre, cantidad]) => ({ nombre, cantidad })).sort((a, b) => b.cantidad - a.cantidad);
    }, [filteredKpis]);

    const spdStats = useMemo(() => {
        const counts: Record<string, number> = {};
        filteredKpis.forEach(r => {
            const nombre = r.spd_nombre || 'Sin SPD';
            counts[nombre] = (counts[nombre] || 0) + 1;
        });
        return Object.entries(counts).map(([nombre, cantidad]) => ({ nombre, cantidad })).sort((a, b) => b.cantidad - a.cantidad);
    }, [filteredKpis]);

    const handleClearFilters = () => {
        setSelectedSPD('all');
        setTipoFecha('fecha_ingreso');
        setFechaDesde('');
        setFechaHasta('');
        setSelectedCategoria('all');
        setSelectedSubcategoria('all');
        setSelectedDerecho(null);
    };

    const hayFiltrosActivos = selectedSPD !== 'all' || fechaDesde || fechaHasta || selectedCategoria !== 'all' || selectedSubcategoria !== 'all';

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-[#60708a]">Cargando datos del panel...</p>
                </div>
            </div>
        );
    }

    return (
        <div>
            {/* Título */}
            <div className="mb-6">
                <h2 className="text-2xl font-bold tracking-tight dark:text-white">Panel de Control</h2>
                <p className="text-[#60708a] mt-1">Estado general del sistema según tu perfil de acceso.</p>
            </div>

            {/* Filtros */}
            <div className="bg-white dark:bg-zinc-900 border border-[#e5e7eb] dark:border-[#333] rounded-xl p-5 mb-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-[#60708a]">Filtros</h3>
                    {hayFiltrosActivos && (
                        <button
                            onClick={handleClearFilters}
                            className="text-xs text-primary font-bold hover:underline flex items-center gap-1"
                        >
                            <span className="material-symbols-outlined text-sm">filter_alt_off</span>
                            Limpiar filtros
                        </button>
                    )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
                    {/* SPD */}
                    {spds.length > 1 && (
                        <div className="xl:col-span-2">
                            <label className="block text-xs font-medium text-[#60708a] mb-1">Servicio de Protección</label>
                            <select
                                value={selectedSPD}
                                onChange={e => setSelectedSPD(e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-[#e5e7eb] dark:border-[#333] rounded-lg bg-white dark:bg-zinc-800 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                            >
                                <option value="all">Todos los SPD</option>
                                {spds.map(spd => (
                                    <option key={spd.id} value={spd.id}>{spd.nombre}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Tipo de fecha */}
                    <div>
                        <label className="block text-xs font-medium text-[#60708a] mb-1">Tipo de fecha</label>
                        <select
                            value={tipoFecha}
                            onChange={e => setTipoFecha(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-[#e5e7eb] dark:border-[#333] rounded-lg bg-white dark:bg-zinc-800 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                        >
                            {TIPO_FECHA_OPTIONS.map(o => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Desde */}
                    <div>
                        <label className="block text-xs font-medium text-[#60708a] mb-1">Desde</label>
                        <input
                            type="date"
                            value={fechaDesde}
                            onChange={e => setFechaDesde(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-[#e5e7eb] dark:border-[#333] rounded-lg bg-white dark:bg-zinc-800 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                    </div>

                    {/* Hasta */}
                    <div>
                        <label className="block text-xs font-medium text-[#60708a] mb-1">Hasta</label>
                        <input
                            type="date"
                            value={fechaHasta}
                            onChange={e => setFechaHasta(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-[#e5e7eb] dark:border-[#333] rounded-lg bg-white dark:bg-zinc-800 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                    </div>

                    {/* Categoría de derecho */}
                    <div>
                        <label className="block text-xs font-medium text-[#60708a] mb-1">Derecho (categoría)</label>
                        <select
                            value={selectedCategoria}
                            onChange={e => { setSelectedCategoria(e.target.value); setSelectedSubcategoria('all'); setSelectedDerecho(null); }}
                            className="w-full px-3 py-2 text-sm border border-[#e5e7eb] dark:border-[#333] rounded-lg bg-white dark:bg-zinc-800 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                        >
                            <option value="all">Todos los derechos</option>
                            {categorias.map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </div>

                    {/* Subcategoría */}
                    {selectedCategoria !== 'all' && subcategorias.length > 0 && (
                        <div>
                            <label className="block text-xs font-medium text-[#60708a] mb-1">Subcategoría</label>
                            <select
                                value={selectedSubcategoria}
                                onChange={e => setSelectedSubcategoria(e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-[#e5e7eb] dark:border-[#333] rounded-lg bg-white dark:bg-zinc-800 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                            >
                                <option value="all">Todas las subcategorías</option>
                                {subcategorias.map(s => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {[
                    { label: 'Expedientes', value: stats.expedientesUnicos, icon: 'folder', color: 'primary', badge: 'Total' },
                    { label: 'Ingresos Abiertos', value: stats.ingresosAbiertos, icon: 'door_open', color: 'success', badge: 'Activos' },
                    { label: 'Abordaje Integral', value: stats.abordajeIntegral, icon: 'psychology', color: 'blue-600', badge: 'Integral' },
                    { label: 'Cerrados por Asesoramiento', value: stats.cerradosAsesoramiento, icon: 'support_agent', color: 'purple-600', badge: 'Cerrado' },
                    { label: 'Ingresos Cerrados (Total)', value: stats.cerradosTotal, icon: 'check_circle', color: 'gray-600', badge: 'Total' },
                    { label: 'Cerrados por Solicitud SENAF', value: stats.cerradosSENAF, icon: 'account_balance', color: 'orange-600', badge: 'SENAF' },
                ].map(({ label, value, icon, color, badge }) => (
                    <div key={label} className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-[#e5e7eb] dark:border-[#333] shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                            <div className={`p-2 bg-${color}/10 text-${color} rounded-lg`}>
                                <span className="material-symbols-outlined">{icon}</span>
                            </div>
                            <span className={`text-${color} text-xs font-bold bg-${color}/10 px-2 py-1 rounded-full`}>{badge}</span>
                        </div>
                        <p className="text-[#60708a] text-sm font-medium">{label}</p>
                        <p className="text-2xl font-bold mt-1 dark:text-white">{value.toLocaleString()}</p>
                    </div>
                ))}
            </div>

            {/* Gráfico de Derechos Vulnerados */}
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-[#e5e7eb] dark:border-[#333] shadow-sm mb-6">
                <div className="flex justify-between items-center mb-5">
                    <h3 className="font-bold text-lg dark:text-white flex items-center gap-2">
                        {selectedDerecho ? (
                            <>
                                <button
                                    onClick={() => setSelectedDerecho(null)}
                                    className="p-1 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
                                >
                                    <span className="material-symbols-outlined text-primary">arrow_back</span>
                                </button>
                                {selectedDerecho}
                            </>
                        ) : 'Derechos Vulnerados'}
                    </h3>
                    {selectedDerecho && (
                        <span className="text-xs font-bold text-[#60708a] uppercase tracking-wider bg-gray-100 dark:bg-zinc-800 px-3 py-1 rounded-full">
                            Desglose por subcategoría
                        </span>
                    )}
                </div>

                {pieData.length > 0 ? (() => {
                    const total = pieData.reduce((s, d) => s + d.cantidad, 0);
                    return (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div>
                                <ResponsiveContainer width="100%" height={350}>
                                    <PieChart>
                                        <Pie
                                            data={pieData}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={(entry: any) => {
                                                const pct = ((entry.cantidad / total) * 100).toFixed(0);
                                                return pct !== '0' ? `${pct}%` : '';
                                            }}
                                            outerRadius={120}
                                            dataKey="cantidad"
                                            onClick={(data) => {
                                                if (!selectedDerecho && data?.nombre) setSelectedDerecho(data.nombre);
                                            }}
                                            className={!selectedDerecho ? 'cursor-pointer' : ''}
                                        >
                                            {pieData.map((_e, i) => (
                                                <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                                {!selectedDerecho && (
                                    <p className="text-center text-xs text-[#60708a] mt-2 italic">
                                        Clic en una porción para ver subcategorías
                                    </p>
                                )}
                            </div>
                            <div className="flex flex-col justify-center space-y-2 overflow-y-auto max-h-[380px] pr-1">
                                {pieData.map((item, i) => (
                                    <div
                                        key={i}
                                        onClick={() => !selectedDerecho && setSelectedDerecho(item.nombre)}
                                        className={`flex items-center justify-between p-3 bg-gray-50 dark:bg-zinc-800 rounded-lg transition-all ${!selectedDerecho ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-700 hover:translate-x-1' : ''}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                            <span className="text-sm font-medium dark:text-white line-clamp-2">{item.nombre}</span>
                                        </div>
                                        <span className="text-sm font-bold dark:text-white ml-2">{item.cantidad}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })() : (
                    <p className="text-center text-[#60708a] py-12">No hay datos de derechos para los filtros seleccionados</p>
                )}
            </div>

            {/* Gráficos de barras Zona y SPD */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-[#e5e7eb] dark:border-[#333] shadow-sm">
                    <h3 className="font-bold text-lg mb-5 dark:text-white">Expedientes por Zona</h3>
                    {zonaStats.length > 0 ? (
                        <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={zonaStats}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                <XAxis dataKey="nombre" tick={{ fontSize: 11 }} angle={-35} textAnchor="end" height={70} />
                                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                                <Tooltip />
                                <Bar dataKey="cantidad" fill="#0088FE" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <p className="text-center text-[#60708a] py-12">Sin datos</p>
                    )}
                </div>

                <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-[#e5e7eb] dark:border-[#333] shadow-sm">
                    <h3 className="font-bold text-lg mb-5 dark:text-white">Expedientes por Servicio de Protección</h3>
                    {spdStats.length > 0 ? (
                        <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={spdStats}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                <XAxis dataKey="nombre" tick={{ fontSize: 11 }} angle={-35} textAnchor="end" height={70} />
                                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                                <Tooltip />
                                <Bar dataKey="cantidad" fill="#00C49F" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <p className="text-center text-[#60708a] py-12">Sin datos</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
