import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

interface DashboardStats {
    totalExpedientes: number;
    ingresosAbiertos: number;
    ingresosAbordajeIntegral: number;
    ingresosCerradosAsesoramiento: number;
    ingresosCerradosGeneral: number;
    ingresosCerradosSENAF: number;
}

interface DerechoStats {
    nombre: string;
    cantidad: number;
}

interface ZonaStats {
    nombre: string;
    cantidad: number;
}

interface SPDStats {
    nombre: string;
    cantidad: number;
}

const Dashboard = () => {
    const [stats, setStats] = useState<DashboardStats>({
        totalExpedientes: 0,
        ingresosAbiertos: 0,
        ingresosAbordajeIntegral: 0,
        ingresosCerradosAsesoramiento: 0,
        ingresosCerradosGeneral: 0,
        ingresosCerradosSENAF: 0
    });
    const [derechoStats, setDerechoStats] = useState<DerechoStats[]>([]);
    const [zonaStats, setZonaStats] = useState<ZonaStats[]>([]);
    const [spdStats, setSpdStats] = useState<SPDStats[]>([]);
    const [rawVulneraciones, setRawVulneraciones] = useState<any[]>([]);
    const [selectedDerecho, setSelectedDerecho] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedSPD, setSelectedSPD] = useState<string>('all');
    const [selectedZona, setSelectedZona] = useState<string>('all');
    const [spds, setSpds] = useState<any[]>([]);
    const [zonas, setZonas] = useState<any[]>([]);

    // Colors for pie chart
    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#FF6B9D', '#C23B22', '#2ECC71'];

    useEffect(() => {
        loadFilters();
    }, []);

    useEffect(() => {
        loadDashboardData();
    }, [selectedSPD, selectedZona]);

    const loadFilters = async () => {
        // Load SPDs
        const { data: spdData } = await supabase
            .from('servicios_proteccion')
            .select('id, nombre')
            .order('nombre');
        if (spdData) setSpds(spdData);

        // Load Zonas
        const { data: zonaData } = await supabase
            .from('zonas')
            .select('id, nombre')
            .order('nombre');
        if (zonaData) setZonas(zonaData);
    };

    const loadDashboardData = async () => {
        setLoading(true);
        try {
            // Build base expediente filter
            let expedienteQuery = supabase
                .from('expedientes')
                .select('id');

            if (selectedSPD !== 'all') {
                expedienteQuery = expedienteQuery.eq('servicio_proteccion_id', selectedSPD);
            }
            if (selectedZona !== 'all') {
                expedienteQuery = expedienteQuery.eq('zona_id', selectedZona);
            }


            const { data: expedientes } = await expedienteQuery;
            const expedienteIds = expedientes?.map(e => e.id) || [];


            // If no expedientes match the filter, set all stats to 0
            if (expedienteIds.length === 0) {
                setStats({
                    totalExpedientes: 0,
                    ingresosAbiertos: 0,
                    ingresosAbordajeIntegral: 0,
                    ingresosCerradosAsesoramiento: 0,
                    ingresosCerradosGeneral: 0,
                    ingresosCerradosSENAF: 0
                });
                setDerechoStats([]);
                setLoading(false);
                return;
            }

            // 1. Total Expedientes
            const { count: countExpedientes } = await supabase
                .from('expedientes')
                .select('id', { count: 'exact', head: true })
                .in('id', expedienteIds);

            // 2. Ingresos Abiertos
            const { count: ingresosAbiertos } = await supabase
                .from('ingresos')
                .select('id', { count: 'exact', head: true })
                .eq('estado', 'abierto')
                .in('expediente_id', expedienteIds);

            // 3. Ingresos con Abordaje Integral (abiertos + etapa >= ampliacion)
            const { count: ingresosAbordaje } = await supabase
                .from('ingresos')
                .select('id', { count: 'exact', head: true })
                .eq('estado', 'abierto')
                .in('etapa', ['ampliacion', 'sintesis', 'definicion', 'seguimiento'])
                .in('expediente_id', expedienteIds);

            // 4. Ingresos Cerrados por Asesoramiento
            const { count: cerradosAsesoramiento } = await supabase
                .from('ingresos')
                .select('id', { count: 'exact', head: true })
                .eq('estado', 'cerrado')
                .ilike('motivo_cierre', '%asesoramiento%')
                .in('expediente_id', expedienteIds);

            // 5. Ingresos Cerrados General
            const { count: cerradosGeneral } = await supabase
                .from('ingresos')
                .select('id', { count: 'exact', head: true })
                .eq('estado', 'cerrado')
                .in('expediente_id', expedienteIds);

            // 6. Ingresos Cerrados por Solicitud SENAF (decision = derivacion)
            // First get ingresos that are closed
            const { data: ingresosCerrados } = await supabase
                .from('ingresos')
                .select('id')
                .eq('estado', 'cerrado')
                .in('expediente_id', expedienteIds);

            const ingresosCerradosIds = ingresosCerrados?.map(i => i.id) || [];

            let cerradosSENAF = 0;
            if (ingresosCerradosIds.length > 0) {
                const { count } = await supabase
                    .from('form1_decision')
                    .select('id', { count: 'exact', head: true })
                    .eq('decision_id', 'derivacion')
                    .in('ingreso_id', ingresosCerradosIds);
                cerradosSENAF = count || 0;
            }

            setStats({
                totalExpedientes: countExpedientes || 0,
                ingresosAbiertos: ingresosAbiertos || 0,
                ingresosAbordajeIntegral: ingresosAbordaje || 0,
                ingresosCerradosAsesoramiento: cerradosAsesoramiento || 0,
                ingresosCerradosGeneral: cerradosGeneral || 0,
                ingresosCerradosSENAF: cerradosSENAF
            });

            // Load Derechos Vulnerados distribution
            // Get all ingresos for the filtered expedientes
            const { data: ingresosData } = await supabase
                .from('ingresos')
                .select('id')
                .in('expediente_id', expedienteIds);

            const ingresoIds = ingresosData?.map(i => i.id) || [];

            if (ingresoIds.length > 0) {
                // Using the correct table 'derechos_vulnerados'
                // The column in catalogo_derechos is 'categoria', and we need 'subcategoria' for drill-down
                const { data: vulneraciones } = await supabase
                    .from('derechos_vulnerados')
                    .select('derecho_id, indicador, catalogo_derechos(categoria, subcategoria)')
                    .in('ingreso_id', ingresoIds);

                if (vulneraciones) {
                    setRawVulneraciones(vulneraciones);
                    const derechoCounts: Record<string, number> = {};
                    vulneraciones.forEach((vuln: any) => {
                        // Handle both object and array from Supabase join
                        const catData = Array.isArray(vuln.catalogo_derechos) ? vuln.catalogo_derechos[0] : vuln.catalogo_derechos;
                        const nombre = catData?.categoria || 'Sin Especificar';
                        derechoCounts[nombre] = (derechoCounts[nombre] || 0) + 1;
                    });

                    const derechoArray: DerechoStats[] = Object.entries(derechoCounts)
                        .map(([nombre, cantidad]) => ({ nombre, cantidad }))
                        .sort((a, b) => b.cantidad - a.cantidad);

                    setDerechoStats(derechoArray);
                    setSelectedDerecho(null); // Reset drill-down when filters change
                }
            } else {
                setRawVulneraciones([]);
                setDerechoStats([]);
                setSelectedDerecho(null);
            }

            // Load Zona Distribution (for all expedientes, not filtered)
            const { data: allExpedientes } = await supabase
                .from('expedientes')
                .select('zona_id, zonas(nombre)');

            if (allExpedientes) {
                const zonaCounts: Record<string, number> = {};
                allExpedientes.forEach((exp: any) => {
                    const zonaName = exp.zonas?.nombre || 'Sin Zona';
                    zonaCounts[zonaName] = (zonaCounts[zonaName] || 0) + 1;
                });

                const zonaArray: ZonaStats[] = Object.entries(zonaCounts)
                    .map(([nombre, cantidad]) => ({ nombre, cantidad }))
                    .sort((a, b) => b.cantidad - a.cantidad);

                setZonaStats(zonaArray);
            }

            // Load SPD Distribution (for all expedientes, not filtered)
            const { data: allExpedientesSPD } = await supabase
                .from('expedientes')
                .select('servicio_proteccion_id, servicios_proteccion(nombre)');

            if (allExpedientesSPD) {
                const spdCounts: Record<string, number> = {};
                allExpedientesSPD.forEach((exp: any) => {
                    const spdName = exp.servicios_proteccion?.nombre || 'Sin SPD';
                    spdCounts[spdName] = (spdCounts[spdName] || 0) + 1;
                });

                const spdArray: SPDStats[] = Object.entries(spdCounts)
                    .map(([nombre, cantidad]) => ({ nombre, cantidad }))
                    .sort((a, b) => b.cantidad - a.cantidad);

                setSpdStats(spdArray);
            }


        } catch (error) {
            console.error('Error loading dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-[#60708a]">Cargando datos del dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div>
            {/* Page Title */}
            <div className="mb-8">
                <h2 className="text-2xl font-bold tracking-tight dark:text-white">Panel de Control Principal</h2>
                <p className="text-[#60708a] mt-1">Estado general del sistema y casos críticos prioritarios.</p>
            </div>

            {/* Filters */}
            <div className="mb-6 flex gap-4 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-sm font-medium text-[#60708a] mb-2">
                        Servicio de Protección
                    </label>
                    <select
                        value={selectedSPD}
                        onChange={(e) => setSelectedSPD(e.target.value)}
                        className="w-full px-4 py-2 border border-[#e5e7eb] dark:border-[#333] rounded-lg bg-white dark:bg-zinc-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                        <option value="all">Todos los SPD</option>
                        {spds.map(spd => (
                            <option key={spd.id} value={spd.id}>{spd.nombre}</option>
                        ))}
                    </select>
                </div>
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-sm font-medium text-[#60708a] mb-2">
                        Zona
                    </label>
                    <select
                        value={selectedZona}
                        onChange={(e) => setSelectedZona(e.target.value)}
                        className="w-full px-4 py-2 border border-[#e5e7eb] dark:border-[#333] rounded-lg bg-white dark:bg-zinc-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                        <option value="all">Todas las Zonas</option>
                        {zonas.map(zona => (
                            <option key={zona.id} value={zona.id}>{zona.nombre}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {/* Total Expedientes */}
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-[#e5e7eb] dark:border-[#333] shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-2 bg-primary/10 text-primary rounded-lg">
                            <span className="material-symbols-outlined">folder</span>
                        </div>
                        <span className="text-primary text-xs font-bold bg-primary/10 px-2 py-1 rounded-full">Total</span>
                    </div>
                    <p className="text-[#60708a] text-sm font-medium">Total Expedientes</p>
                    <p className="text-2xl font-bold mt-1 dark:text-white">{stats.totalExpedientes.toLocaleString()}</p>
                </div>

                {/* Ingresos Abiertos */}
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-[#e5e7eb] dark:border-[#333] shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-2 bg-success/10 text-success rounded-lg">
                            <span className="material-symbols-outlined">door_open</span>
                        </div>
                        <span className="text-success text-xs font-bold bg-success/10 px-2 py-1 rounded-full">Activos</span>
                    </div>
                    <p className="text-[#60708a] text-sm font-medium">Ingresos Abiertos</p>
                    <p className="text-2xl font-bold mt-1 dark:text-white">{stats.ingresosAbiertos}</p>
                </div>

                {/* Abordaje Integral */}
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-[#e5e7eb] dark:border-[#333] shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                            <span className="material-symbols-outlined">psychology</span>
                        </div>
                        <span className="text-blue-600 text-xs font-bold bg-blue-50 px-2 py-1 rounded-full">Integral</span>
                    </div>
                    <p className="text-[#60708a] text-sm font-medium">Abordaje Integral</p>
                    <p className="text-2xl font-bold mt-1 dark:text-white">{stats.ingresosAbordajeIntegral}</p>
                </div>

                {/* Cerrados por Asesoramiento */}
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-[#e5e7eb] dark:border-[#333] shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                            <span className="material-symbols-outlined">support_agent</span>
                        </div>
                        <span className="text-purple-600 text-xs font-bold bg-purple-50 px-2 py-1 rounded-full">Cerrado</span>
                    </div>
                    <p className="text-[#60708a] text-sm font-medium">Cerrados por Asesoramiento</p>
                    <p className="text-2xl font-bold mt-1 dark:text-white">{stats.ingresosCerradosAsesoramiento}</p>
                </div>

                {/* Cerrados General */}
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-[#e5e7eb] dark:border-[#333] shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-2 bg-gray-100 text-gray-600 rounded-lg">
                            <span className="material-symbols-outlined">check_circle</span>
                        </div>
                        <span className="text-gray-600 text-xs font-bold bg-gray-50 px-2 py-1 rounded-full">Total</span>
                    </div>
                    <p className="text-[#60708a] text-sm font-medium">Ingresos Cerrados (Total)</p>
                    <p className="text-2xl font-bold mt-1 dark:text-white">{stats.ingresosCerradosGeneral}</p>
                </div>

                {/* Cerrados por SENAF */}
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-[#e5e7eb] dark:border-[#333] shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
                            <span className="material-symbols-outlined">account_balance</span>
                        </div>
                        <span className="text-orange-600 text-xs font-bold bg-orange-50 px-2 py-1 rounded-full">SENAF</span>
                    </div>
                    <p className="text-[#60708a] text-sm font-medium">Cerrados por Solicitud SENAF</p>
                    <p className="text-2xl font-bold mt-1 dark:text-white">{stats.ingresosCerradosSENAF}</p>
                </div>
            </div>

            {/* Derechos Vulnerados Chart */}
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-[#e5e7eb] dark:border-[#333] shadow-sm mb-8">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-lg dark:text-white">
                        {selectedDerecho ? (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setSelectedDerecho(null)}
                                    className="p-1 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors flex items-center justify-center"
                                >
                                    <span className="material-symbols-outlined text-primary">arrow_back</span>
                                </button>
                                <span>{selectedDerecho}</span>
                            </div>
                        ) : (
                            'Derechos Vulnerados'
                        )}
                    </h3>
                    {selectedDerecho && (
                        <span className="text-xs font-bold text-[#60708a] uppercase tracking-wider bg-gray-100 dark:bg-zinc-800 px-3 py-1 rounded-full">
                            Desglose por Subcategoría
                        </span>
                    )}
                </div>

                {derechoStats.length > 0 ? (
                    (() => {
                        // 1. Group raw data by category to avoid string matching issues
                        const groupedByCat: Record<string, any[]> = {};
                        rawVulneraciones.forEach(v => {
                            const catData = Array.isArray(v.catalogo_derechos) ? v.catalogo_derechos[0] : v.catalogo_derechos;
                            const catName = (catData?.categoria || 'Sin Especificar').trim();
                            if (!groupedByCat[catName]) groupedByCat[catName] = [];
                            groupedByCat[catName].push(v);
                        });

                        // 2. Get data for current view
                        let currentData: any[] = [];

                        if (selectedDerecho && groupedByCat[selectedDerecho]) {
                            const subCounts: Record<string, number> = {};
                            groupedByCat[selectedDerecho].forEach(v => {
                                const catData = Array.isArray(v.catalogo_derechos) ? v.catalogo_derechos[0] : v.catalogo_derechos;
                                const subName = catData?.subcategoria || 'Sin Subcategoría';
                                subCounts[subName] = (subCounts[subName] || 0) + 1;
                            });

                            currentData = Object.entries(subCounts)
                                .map(([nombre, cantidad]) => ({ nombre, cantidad }))
                                .sort((a, b) => b.cantidad - a.cantidad);

                        } else {
                            currentData = derechoStats;
                        }

                        const total = currentData.reduce((sum, d) => sum + d.cantidad, 0);

                        if (currentData.length === 0) {
                            return (
                                <div className="flex flex-col items-center justify-center py-12">
                                    <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">info</span>
                                    <p className="text-[#60708a]">No se encontraron datos para esta selección</p>
                                    {selectedDerecho && (
                                        <button
                                            onClick={() => setSelectedDerecho(null)}
                                            className="mt-4 text-primary font-bold hover:underline"
                                        >
                                            Volver al gráfico general
                                        </button>
                                    )}
                                </div>
                            );
                        }

                        return (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Pie Chart */}
                                <div>
                                    <div className="relative">
                                        <ResponsiveContainer width="100%" height={350}>
                                            <PieChart>
                                                <Pie
                                                    data={currentData}
                                                    cx="50%"
                                                    cy="50%"
                                                    labelLine={false}
                                                    label={(entry: any) => {
                                                        if (total === 0) return '';
                                                        const percent = ((entry.cantidad / total) * 100).toFixed(0);
                                                        return percent !== '0' ? `${percent}%` : '';
                                                    }}
                                                    outerRadius={120}
                                                    fill="#8884d8"
                                                    dataKey="cantidad"
                                                    onClick={(data) => {
                                                        // Use the data name from the payload
                                                        const clickedName = data?.nombre || data?.payload?.nombre;
                                                        if (!selectedDerecho && clickedName) {
                                                            setSelectedDerecho(clickedName);
                                                        }
                                                    }}
                                                    className={!selectedDerecho ? 'cursor-pointer' : ''}
                                                >
                                                    {currentData.map((_entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    {!selectedDerecho && (
                                        <p className="text-center text-xs text-[#60708a] mt-2 italic">
                                            💡 Haz clic en una porción para ver el desglose por subcategoría
                                        </p>
                                    )}
                                </div>

                                {/* Legend with counts */}
                                <div className="flex flex-col justify-center space-y-3 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
                                    {currentData.map((item, index) => (
                                        <div
                                            key={index}
                                            onClick={() => !selectedDerecho && setSelectedDerecho(item.nombre)}
                                            className={`flex items-center justify-between p-3 bg-gray-50 dark:bg-zinc-800 rounded-lg transition-all ${!selectedDerecho ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-700 hover:translate-x-1' : ''}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className="w-4 h-4 rounded-full flex-shrink-0"
                                                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                                />
                                                <span className="text-sm font-medium dark:text-white line-clamp-2">{item.nombre}</span>
                                            </div>
                                            <span className="text-sm font-bold dark:text-white ml-2">{item.cantidad}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })()
                ) : (
                    <p className="text-center text-[#60708a] py-12">No hay datos de derechos vulnerados para los filtros seleccionados</p>
                )}

            </div>

            {/* Zona and SPD Distribution Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Expedientes por Zona */}
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-[#e5e7eb] dark:border-[#333] shadow-sm">
                    <h3 className="font-bold text-lg mb-6 dark:text-white">Expedientes por Zona</h3>
                    {zonaStats.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={zonaStats}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                <XAxis
                                    dataKey="nombre"
                                    tick={{ fontSize: 12 }}
                                    angle={-45}
                                    textAnchor="end"
                                    height={80}
                                />
                                <YAxis tick={{ fontSize: 12 }} />
                                <Tooltip />
                                <Bar dataKey="cantidad" fill="#0088FE" radius={[8, 8, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <p className="text-center text-[#60708a] py-12">No hay datos disponibles</p>
                    )}
                </div>

                {/* Expedientes por SPD */}
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-[#e5e7eb] dark:border-[#333] shadow-sm">
                    <h3 className="font-bold text-lg mb-6 dark:text-white">Expedientes por Servicio de Protección</h3>
                    {spdStats.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={spdStats}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                <XAxis
                                    dataKey="nombre"
                                    tick={{ fontSize: 12 }}
                                    angle={-45}
                                    textAnchor="end"
                                    height={80}
                                />
                                <YAxis tick={{ fontSize: 12 }} />
                                <Tooltip />
                                <Bar dataKey="cantidad" fill="#00C49F" radius={[8, 8, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <p className="text-center text-[#60708a] py-12">No hay datos disponibles</p>
                    )}
                </div>
            </div>


            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <button
                    onClick={() => window.location.href = '/expedientes/nuevo'}
                    className="flex items-center justify-between p-4 bg-primary text-white rounded-xl shadow-md hover:bg-blue-600 transition-all group"
                >
                    <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined">add_circle</span>
                        <span className="font-bold">Nuevo Expediente</span>
                    </div>
                    <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
                </button>
                <button
                    onClick={() => window.location.href = '/expedientes'}
                    className="flex items-center justify-between p-4 bg-white dark:bg-zinc-900 text-primary border border-primary/20 rounded-xl shadow-sm hover:shadow-md transition-all group"
                >
                    <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined">folder_open</span>
                        <span className="font-bold">Ver Expedientes</span>
                    </div>
                    <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
                </button>
                <button className="flex items-center justify-between p-4 bg-white dark:bg-zinc-900 text-[#111418] dark:text-white border border-[#e5e7eb] dark:border-[#333] rounded-xl shadow-sm hover:shadow-md transition-all group">
                    <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined">print</span>
                        <span className="font-bold">Generar Estadística</span>
                    </div>
                    <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
                </button>
            </div>
        </div>
    );
};

export default Dashboard;
