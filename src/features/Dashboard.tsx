import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';
import { supabase } from '../lib/supabase';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#FF6B9D', '#C23B22', '#2ECC71'];

const TIPO_FECHA_OPTIONS = [
    { value: 'fecha_ingreso', label: 'Fecha de ingreso' },
    { value: 'fecha_apertura', label: 'Fecha de apertura' },
];

// Códigos reales de ingresos.etapa (ver distribución real en producción antes de tocar esto)
const ETAPA_LABELS: Record<string, string> = {
    recepcion: 'Recepción',
    ampliacion: 'Ampliación',
    informe_sintesis: 'Informe Síntesis',
    definicion: 'Definición de Medidas',
    cese: 'Cese',
};
const ETAPA_ORDEN = ['recepcion', 'ampliacion', 'informe_sintesis', 'definicion', 'cese'];

const MEDIDA_ESTADO_LABELS: Record<string, string> = {
    pendiente: 'Pendiente',
    activa: 'En Proceso',
    'en proceso': 'En Proceso',
    completa: 'Completa',
};

const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const Dashboard = () => {
    const [loading, setLoading] = useState(true);
    const [rawKpis, setRawKpis] = useState<any[]>([]);
    const [rawDerechos, setRawDerechos] = useState<any[]>([]);
    const [rawMedidas, setRawMedidas] = useState<any[]>([]);
    const [spds, setSpds] = useState<any[]>([]);
    const [categorias, setCategorias] = useState<string[]>([]);

    // Filtros
    const [selectedSPD, setSelectedSPD] = useState('all');
    const [tipoFecha, setTipoFecha] = useState('fecha_ingreso');
    const [fechaDesde, setFechaDesde] = useState('');
    const [fechaHasta, setFechaHasta] = useState('');
    const [selectedCategoria, setSelectedCategoria] = useState('all');
    const [selectedSubcategoria, setSelectedSubcategoria] = useState('all');
    const [selectedEtapa, setSelectedEtapa] = useState('all');
    const [selectedProfesional, setSelectedProfesional] = useState('all');
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
                { data: medidasData },
                { data: spdsData },
                { data: catData }
            ] = await Promise.all([
                supabase.from('vw_dashboard_kpis').select('*'),
                supabase.from('vw_dashboard_derechos').select('*'),
                supabase.from('vw_dashboard_medidas').select('*'),
                supabase.from('vw_spds_por_rol').select('*'),
                supabase.from('catalogo_derechos').select('categoria').order('categoria')
            ]);

            setRawKpis(kpisData || []);
            setRawDerechos(derechosData || []);
            setRawMedidas(medidasData || []);
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
            if (selectedEtapa !== 'all' && row.etapa !== selectedEtapa) return false;
            if (selectedProfesional !== 'all' && String(row.profesional_asignado_id) !== String(selectedProfesional)) return false;

            const fechaRef = tipoFecha === 'fecha_ingreso' ? row.fecha_ingreso : row.fecha_apertura;
            if (fechaDesde && fechaRef && fechaRef < fechaDesde) return false;
            if (fechaHasta && fechaRef && fechaRef > fechaHasta + 'T23:59:59') return false;

            return true;
        });
    }, [rawKpis, selectedSPD, selectedEtapa, selectedProfesional, tipoFecha, fechaDesde, fechaHasta]);

    // Lista de profesionales con casos asignados, para el filtro (no se recalcula con los filtros)
    const profesionales = useMemo(() => {
        const map = new Map<string, string>();
        rawKpis.forEach(r => {
            if (r.profesional_asignado_id && r.profesional_asignado_nombre) {
                map.set(String(r.profesional_asignado_id), r.profesional_asignado_nombre);
            }
        });
        return [...map.entries()].map(([id, nombre]) => ({ id, nombre })).sort((a, b) => a.nombre.localeCompare(b.nombre));
    }, [rawKpis]);

    // Filtra medidas de protección según SPD y fecha (la vista no tiene categoría/subcategoría de derecho ni profesional)
    const filteredMedidas = useMemo(() => {
        return rawMedidas.filter(row => {
            if (selectedSPD !== 'all' && String(row.servicio_proteccion_id) !== String(selectedSPD)) return false;
            if (fechaDesde && row.fecha_ingreso && row.fecha_ingreso < fechaDesde) return false;
            if (fechaHasta && row.fecha_ingreso && row.fecha_ingreso > fechaHasta + 'T23:59:59') return false;
            return true;
        });
    }, [rawMedidas, selectedSPD, fechaDesde, fechaHasta]);

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
        // OJO: los códigos reales de ingresos.etapa son recepcion/ampliacion/informe_sintesis/definicion/cese
        // (antes este filtro buscaba 'sintesis' y 'seguimiento', que nunca existieron en la base, así que
        // "Abordaje Integral" venía subcontando todos los casos en Informe Síntesis y en Cese)
        const abordajeIntegral = kpisBase.filter(r =>
            r.estado === 'abierto' && ['ampliacion', 'informe_sintesis', 'definicion', 'cese'].includes(r.etapa)
        ).length;
        const cerradosTotal = kpisBase.filter(r => r.estado === 'cerrado').length;
        const cerradosAsesoramiento = kpisBase.filter(r =>
            r.estado === 'cerrado' && r.motivo_cierre?.toLowerCase().includes('asesoramiento')
        ).length;
        const cerradosSENAF = kpisBase.filter(r =>
            r.estado === 'cerrado' && r.decision_id === 'derivacion'
        ).length;
        const sinResponsable = kpisBase.filter(r => r.estado === 'abierto' && !r.tiene_responsable).length;

        const cerradosConFechas = kpisBase.filter(r => r.estado === 'cerrado' && r.fecha_cierre && r.fecha_ingreso);
        const diasPromedioCierre = cerradosConFechas.length > 0
            ? Math.round(
                cerradosConFechas.reduce((sum, r) => {
                    const dias = (new Date(r.fecha_cierre).getTime() - new Date(r.fecha_ingreso).getTime()) / 86400000;
                    return sum + Math.max(dias, 0);
                }, 0) / cerradosConFechas.length
            )
            : 0;

        return { expedientesUnicos, ingresosAbiertos, abordajeIntegral, cerradosTotal, cerradosAsesoramiento, cerradosSENAF, sinResponsable, diasPromedioCierre };
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

    // Datos para gráficos de barras por zona y SPD: ingresos abiertos vs cerrados
    // (cuenta ingresos, no expedientes — un expediente sin ningún ingreso todavía no suma a ninguna de las dos barras)
    const zonaStats = useMemo(() => {
        const counts: Record<string, { abiertos: number; cerrados: number }> = {};
        filteredKpis.forEach(r => {
            if (!r.ingreso_id) return;
            const nombre = r.zona_nombre || 'Sin zona';
            if (!counts[nombre]) counts[nombre] = { abiertos: 0, cerrados: 0 };
            if (r.estado === 'abierto') counts[nombre].abiertos++;
            else if (r.estado === 'cerrado') counts[nombre].cerrados++;
        });
        return Object.entries(counts)
            .map(([nombre, v]) => ({ nombre, ...v }))
            .sort((a, b) => (b.abiertos + b.cerrados) - (a.abiertos + a.cerrados));
    }, [filteredKpis]);

    const spdStats = useMemo(() => {
        const counts: Record<string, { abiertos: number; cerrados: number }> = {};
        filteredKpis.forEach(r => {
            if (!r.ingreso_id) return;
            const nombre = r.spd_nombre || 'Sin SPD';
            if (!counts[nombre]) counts[nombre] = { abiertos: 0, cerrados: 0 };
            if (r.estado === 'abierto') counts[nombre].abiertos++;
            else if (r.estado === 'cerrado') counts[nombre].cerrados++;
        });
        return Object.entries(counts)
            .map(([nombre, v]) => ({ nombre, ...v }))
            .sort((a, b) => (b.abiertos + b.cerrados) - (a.abiertos + a.cerrados));
    }, [filteredKpis]);

    // Distribución de casos activos por etapa del proceso (funnel)
    const etapaStats = useMemo(() => {
        const counts: Record<string, number> = {};
        filteredKpis.forEach(r => {
            if (r.estado !== 'abierto' || !r.etapa) return;
            counts[r.etapa] = (counts[r.etapa] || 0) + 1;
        });
        return ETAPA_ORDEN
            .filter(key => counts[key])
            .map(key => ({ nombre: ETAPA_LABELS[key], cantidad: counts[key] }));
    }, [filteredKpis]);

    // Altas de ingresos por mes (últimos 12 meses con datos, según filtros activos)
    const evolucionMensual = useMemo(() => {
        const counts: Record<string, number> = {};
        filteredKpis.forEach(r => {
            if (!r.ingreso_id || !r.fecha_ingreso) return;
            const d = new Date(r.fecha_ingreso + 'T12:00:00');
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            counts[key] = (counts[key] || 0) + 1;
        });
        return Object.entries(counts)
            .sort(([a], [b]) => a.localeCompare(b))
            .slice(-12)
            .map(([key, cantidad]) => {
                const mes = parseInt(key.split('-')[1], 10);
                return { nombre: MESES_CORTOS[mes - 1], cantidad };
            });
    }, [filteredKpis]);

    // Medidas de Protección por estado (pendiente/en proceso/completa)
    const medidasPorEstado = useMemo(() => {
        const counts: Record<string, number> = {};
        filteredMedidas.forEach(m => {
            const key = m.estado || 'sin_estado';
            counts[key] = (counts[key] || 0) + 1;
        });
        return Object.entries(counts)
            .map(([key, cantidad]) => ({
                nombre: MEDIDA_ESTADO_LABELS[key] || (key.charAt(0).toUpperCase() + key.slice(1)),
                cantidad
            }))
            .sort((a, b) => b.cantidad - a.cantidad);
    }, [filteredMedidas]);

    const handleClearFilters = () => {
        setSelectedSPD('all');
        setTipoFecha('fecha_ingreso');
        setFechaDesde('');
        setFechaHasta('');
        setSelectedCategoria('all');
        setSelectedSubcategoria('all');
        setSelectedEtapa('all');
        setSelectedProfesional('all');
        setSelectedDerecho(null);
    };

    const hayFiltrosActivos = Boolean(selectedSPD !== 'all' || fechaDesde || fechaHasta || selectedCategoria !== 'all' || selectedSubcategoria !== 'all' || selectedEtapa !== 'all' || selectedProfesional !== 'all');

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-on-surface-variant">Cargando datos del panel...</p>
                </div>
            </div>
        );
    }

    return (
        <div>
            {/* Título */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight dark:text-white">Panel de Control</h2>
                    <p className="text-on-surface-variant mt-1">Estado general del sistema según tu perfil de acceso.</p>
                </div>
                <Link to="/expedientes/nuevo" className="w-full sm:w-auto">
                    <Button
                        variant="primary"
                        size="md"
                        className="flex items-center justify-center gap-2 w-full sm:w-auto uppercase tracking-wider"
                    >
                        <span className="material-symbols-outlined text-xl">add_box</span>
                        Nuevo Expediente
                    </Button>
                </Link>
            </div>

            {/* KPI Cards (arriba) */}
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-6">
                {[
                    { label: 'Expedientes', key: 'expedientesUnicos', icon: 'folder', textClass: 'text-secondary', bgClass: 'bg-secondary/10', borderClass: 'border-secondary/20', badge: 'Total', link: '/expedientes?estado=Todos' },
                    { label: 'Ingresos Abiertos', key: 'ingresosAbiertos', icon: 'door_open', textClass: 'text-emerald-700', bgClass: 'bg-emerald-50', borderClass: 'border-emerald-200', badge: 'Activos', link: '/expedientes?estado=Activos' },
                    { label: 'Abordaje Integral', key: 'abordajeIntegral', icon: 'psychology', textClass: 'text-blue-700', bgClass: 'bg-blue-50', borderClass: 'border-blue-200', badge: 'Integral', link: '/expedientes?estado=Activos' },
                    { label: 'Cerrados por Asesoramiento', key: 'cerradosAsesoramiento', icon: 'support_agent', textClass: 'text-purple-700', bgClass: 'bg-purple-50', borderClass: 'border-purple-200', badge: 'Cerrado', link: '/expedientes?estado=Cerrados' },
                    { label: 'Ingresos Cerrados (Total)', key: 'cerradosTotal', icon: 'check_circle', textClass: 'text-slate-700', bgClass: 'bg-slate-100', borderClass: 'border-slate-200', badge: 'Total', link: '/expedientes?estado=Cerrados' },
                    { label: 'Cerrados por Solicitud SENAF', key: 'cerradosSENAF', icon: 'account_balance', textClass: 'text-amber-800', bgClass: 'bg-amber-50', borderClass: 'border-amber-200', badge: 'SENAF', link: '/expedientes?estado=Cerrados' },
                    { label: 'Casos Activos sin Responsable', key: 'sinResponsable', icon: 'person_off', textClass: 'text-rose-700', bgClass: 'bg-rose-50', borderClass: 'border-rose-200', badge: 'Alerta', link: '/expedientes?estado=Activos' },
                    { label: 'Días Promedio hasta el Cierre', key: 'diasPromedioCierre', icon: 'schedule', textClass: 'text-cyan-700', bgClass: 'bg-cyan-50', borderClass: 'border-cyan-200', badge: 'Promedio', suffix: ' días', link: '/expedientes?estado=Cerrados' },
                ].map(({ label, key, icon, textClass, bgClass, borderClass, badge, link, suffix }) => {
                    const value = (stats as any)[key] ?? 0;
                    return (
                        <Link
                            key={label}
                            to={link}
                            className="bg-white dark:bg-zinc-900 p-3 sm:p-5 rounded-xl border border-[#e5e7eb] dark:border-[#333] shadow-sm hover:shadow-md hover:border-secondary/40 transition-all cursor-pointer block group"
                            title={`Ver expedientes: ${label}`}
                        >
                            <div className="flex items-center justify-between mb-1.5 sm:mb-3">
                                <div className={`p-1.5 sm:p-2 ${bgClass} ${textClass} rounded-lg`}>
                                    <span className="material-symbols-outlined text-lg sm:text-2xl">{icon}</span>
                                </div>
                                <span className={`${textClass} ${bgClass} border ${borderClass} text-[11px] sm:text-xs font-bold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full`}>{badge}</span>
                            </div>
                            <p className="text-on-surface-variant text-xs sm:text-sm font-medium leading-tight">{label}</p>
                            <p className="text-lg sm:text-2xl font-bold mt-0.5 sm:mt-1 dark:text-white group-hover:text-secondary transition-colors">{value.toLocaleString()}{suffix || ''}</p>
                        </Link>
                    );
                })}
            </div>

            {/* Filtros (después de los KPIs en acordeón colapsable) */}
            <details className="group bg-white dark:bg-zinc-900 border border-[#e5e7eb] dark:border-[#333] rounded-xl p-5 mb-6 shadow-sm" open={hayFiltrosActivos}>
                <summary className="flex items-center justify-between cursor-pointer list-none select-none">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-secondary text-xl">tune</span>
                        <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Filtros de Búsqueda</h3>
                        {hayFiltrosActivos && (
                            <span className="size-2 rounded-full bg-secondary animate-pulse" title="Filtros aplicados"></span>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        {hayFiltrosActivos && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    handleClearFilters();
                                }}
                                className="text-xs text-secondary font-bold hover:underline flex items-center gap-1"
                            >
                                <span className="material-symbols-outlined text-sm">filter_alt_off</span>
                                Limpiar filtros
                            </button>
                        )}
                        <span className="material-symbols-outlined text-slate-400 group-open:rotate-180 transition-transform">
                            expand_more
                        </span>
                    </div>
                </summary>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 pt-4 mt-4 border-t border-slate-100 dark:border-zinc-800">
                    {/* SPD */}
                    {spds.length > 1 && (
                        <div className="xl:col-span-2">
                            <label className="block text-xs font-medium text-on-surface-variant mb-1">Servicio de Protección</label>
                            <select
                                value={selectedSPD}
                                onChange={e => setSelectedSPD(e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-[#e5e7eb] dark:border-[#333] rounded-lg bg-white dark:bg-zinc-800 dark:text-white focus:ring-2 focus:ring-secondary focus:border-transparent"
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
                        <label className="block text-xs font-medium text-on-surface-variant mb-1">Tipo de fecha</label>
                        <select
                            value={tipoFecha}
                            onChange={e => setTipoFecha(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-[#e5e7eb] dark:border-[#333] rounded-lg bg-white dark:bg-zinc-800 dark:text-white focus:ring-2 focus:ring-secondary focus:border-transparent"
                        >
                            {TIPO_FECHA_OPTIONS.map(o => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Desde */}
                    <div>
                        <label className="block text-xs font-medium text-on-surface-variant mb-1">Desde</label>
                        <input
                            type="date"
                            value={fechaDesde}
                            onChange={e => setFechaDesde(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-[#e5e7eb] dark:border-[#333] rounded-lg bg-white dark:bg-zinc-800 dark:text-white focus:ring-2 focus:ring-secondary focus:border-transparent"
                        />
                    </div>

                    {/* Hasta */}
                    <div>
                        <label className="block text-xs font-medium text-on-surface-variant mb-1">Hasta</label>
                        <input
                            type="date"
                            value={fechaHasta}
                            onChange={e => setFechaHasta(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-[#e5e7eb] dark:border-[#333] rounded-lg bg-white dark:bg-zinc-800 dark:text-white focus:ring-2 focus:ring-secondary focus:border-transparent"
                        />
                    </div>

                    {/* Categoría de derecho */}
                    <div>
                        <label className="block text-xs font-medium text-on-surface-variant mb-1">Derecho (categoría)</label>
                        <select
                            value={selectedCategoria}
                            onChange={e => { setSelectedCategoria(e.target.value); setSelectedSubcategoria('all'); setSelectedDerecho(null); }}
                            className="w-full px-3 py-2 text-sm border border-[#e5e7eb] dark:border-[#333] rounded-lg bg-white dark:bg-zinc-800 dark:text-white focus:ring-2 focus:ring-secondary focus:border-transparent"
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
                            <label className="block text-xs font-medium text-on-surface-variant mb-1">Subcategoría</label>
                            <select
                                value={selectedSubcategoria}
                                onChange={e => setSelectedSubcategoria(e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-[#e5e7eb] dark:border-[#333] rounded-lg bg-white dark:bg-zinc-800 dark:text-white focus:ring-2 focus:ring-secondary focus:border-transparent"
                            >
                                <option value="all">Todas las subcategorías</option>
                                {subcategorias.map(s => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Etapa del proceso */}
                    <div>
                        <label className="block text-xs font-medium text-on-surface-variant mb-1">Etapa del proceso</label>
                        <select
                            value={selectedEtapa}
                            onChange={e => setSelectedEtapa(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-[#e5e7eb] dark:border-[#333] rounded-lg bg-white dark:bg-zinc-800 dark:text-white focus:ring-2 focus:ring-secondary focus:border-transparent"
                        >
                            <option value="all">Todas las etapas</option>
                            {ETAPA_ORDEN.map(key => (
                                <option key={key} value={key}>{ETAPA_LABELS[key]}</option>
                            ))}
                        </select>
                    </div>

                    {/* Profesional responsable */}
                    {profesionales.length > 1 && (
                        <div>
                            <label className="block text-xs font-medium text-on-surface-variant mb-1">Profesional asignado</label>
                            <select
                                value={selectedProfesional}
                                onChange={e => setSelectedProfesional(e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-[#e5e7eb] dark:border-[#333] rounded-lg bg-white dark:bg-zinc-800 dark:text-white focus:ring-2 focus:ring-secondary focus:border-transparent"
                            >
                                <option value="all">Todos los profesionales</option>
                                {profesionales.map(p => (
                                    <option key={p.id} value={p.id}>{p.nombre}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
            </details>

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
                                    <span className="material-symbols-outlined text-secondary">arrow_back</span>
                                </button>
                                {selectedDerecho}
                            </>
                        ) : 'Derechos Vulnerados'}
                    </h3>
                    {selectedDerecho && (
                        <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider bg-gray-100 dark:bg-zinc-800 px-3 py-1 rounded-full">
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
                                    <p className="text-center text-xs text-on-surface-variant mt-2 italic">
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
                    <p className="text-center text-on-surface-variant py-12">No hay datos de derechos para los filtros seleccionados</p>
                )}
            </div>

            {/* Gráficos de barras Zona y SPD */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-[#e5e7eb] dark:border-[#333] shadow-sm">
                    <h3 className="font-bold text-lg mb-1 dark:text-white">Ingresos por Zona</h3>
                    <p className="text-xs text-on-surface-variant mb-5">Abiertos vs. cerrados, según los filtros elegidos arriba.</p>
                    {zonaStats.length > 0 ? (
                        <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={zonaStats}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                <XAxis dataKey="nombre" tick={{ fontSize: 11 }} angle={-35} textAnchor="end" height={70} />
                                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                                <Tooltip />
                                <Legend wrapperStyle={{ fontSize: 12 }} />
                                <Bar dataKey="abiertos" name="Abiertos" fill="#10B981" radius={[6, 6, 0, 0]} />
                                <Bar dataKey="cerrados" name="Cerrados" fill="#64748b" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <p className="text-center text-on-surface-variant py-12">Sin datos</p>
                    )}
                </div>

                <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-[#e5e7eb] dark:border-[#333] shadow-sm">
                    <h3 className="font-bold text-lg mb-1 dark:text-white">Ingresos por Servicio de Protección</h3>
                    <p className="text-xs text-on-surface-variant mb-5">Abiertos vs. cerrados, según los filtros elegidos arriba.</p>
                    {spdStats.length > 0 ? (
                        <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={spdStats}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                <XAxis dataKey="nombre" tick={{ fontSize: 11 }} angle={-35} textAnchor="end" height={70} />
                                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                                <Tooltip />
                                <Legend wrapperStyle={{ fontSize: 12 }} />
                                <Bar dataKey="abiertos" name="Abiertos" fill="#10B981" radius={[6, 6, 0, 0]} />
                                <Bar dataKey="cerrados" name="Cerrados" fill="#64748b" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <p className="text-center text-on-surface-variant py-12">Sin datos</p>
                    )}
                </div>
            </div>

            {/* Distribución de casos activos por etapa del proceso */}
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-[#e5e7eb] dark:border-[#333] shadow-sm mt-6">
                <h3 className="font-bold text-lg mb-1 dark:text-white">Casos Activos por Etapa del Proceso</h3>
                <p className="text-xs text-on-surface-variant mb-5">Dónde están, hoy, los ingresos abiertos dentro del flujo de trabajo.</p>
                {etapaStats.length > 0 ? (
                    <ResponsiveContainer width="100%" height={240}>
                        <BarChart data={etapaStats} layout="vertical" margin={{ left: 24 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                            <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                            <YAxis type="category" dataKey="nombre" tick={{ fontSize: 12 }} width={150} />
                            <Tooltip />
                            <Bar dataKey="cantidad" fill="#0d50d5" radius={[0, 6, 6, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <p className="text-center text-on-surface-variant py-12">Sin casos activos para los filtros seleccionados</p>
                )}
            </div>

            {/* Evolución mensual y Medidas de Protección */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-[#e5e7eb] dark:border-[#333] shadow-sm">
                    <h3 className="font-bold text-lg mb-1 dark:text-white">Evolución Mensual de Ingresos</h3>
                    <p className="text-xs text-on-surface-variant mb-5">Altas de ingresos por mes (según el tipo de fecha y rango elegidos arriba).</p>
                    {evolucionMensual.length > 0 ? (
                        <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={evolucionMensual}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                <XAxis dataKey="nombre" tick={{ fontSize: 11 }} />
                                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                                <Tooltip />
                                <Bar dataKey="cantidad" fill="#0d50d5" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <p className="text-center text-on-surface-variant py-12">Sin datos</p>
                    )}
                </div>

                <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-[#e5e7eb] dark:border-[#333] shadow-sm">
                    <h3 className="font-bold text-lg mb-1 dark:text-white">Medidas de Protección por Estado</h3>
                    <p className="text-xs text-on-surface-variant mb-5">Todas las medidas definidas en el sistema, agrupadas por su estado actual.</p>
                    {medidasPorEstado.length > 0 ? (
                        <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={medidasPorEstado}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                <XAxis dataKey="nombre" tick={{ fontSize: 11 }} />
                                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                                <Tooltip />
                                <Bar dataKey="cantidad" fill="#FFBB28" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <p className="text-center text-on-surface-variant py-12">Sin medidas registradas para los filtros seleccionados</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
