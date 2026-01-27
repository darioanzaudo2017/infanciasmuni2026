import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import Breadcrumbs from '../../components/ui/Breadcrumbs';

interface ChildResult {
    id: number;
    nombre: string;
    apellido: string;
    dni: string;
    fecha_nacimiento: string;
    genero: string;
    has_active_expediente?: boolean;
    has_open_ingreso?: boolean;
    expediente_id?: number;
    expediente_numero?: string;
    expediente_spd_id?: number;
    expediente_zona_id?: number;
    expediente_spd_nombre?: string;
}

const NuevaRecepcion: React.FC = () => {
    const navigate = useNavigate();
    const [dni, setDni] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<ChildResult | null>(null);
    const [searchResults, setSearchResults] = useState<ChildResult[]>([]);
    const [hasTyped, setHasTyped] = useState(false);
    const [userProfile, setUserProfile] = useState<any>(null);

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase
                    .from('usuarios')
                    .select('*, usuarios_roles(roles(nombre))')
                    .eq('id', user.id)
                    .single();
                setUserProfile(profile);
            }
        };
        fetchUser();
    }, []);

    const processChild = async (child: any): Promise<ChildResult> => {
        const { data: exp } = await supabase
            .from('expedientes')
            .select('id, numero, servicio_proteccion_id, zona_id, servicios_proteccion(nombre)')
            .eq('nino_id', child.id)
            .eq('activo', true)
            .maybeSingle();

        let hasOpenIngreso = false;
        if (exp) {
            const { data: openIngreso } = await supabase
                .from('ingresos')
                .select('id')
                .eq('expediente_id', exp.id)
                .is('fecha_cierre', null)
                .limit(1)
                .maybeSingle();
            hasOpenIngreso = !!openIngreso;
        }

        return {
            ...child,
            has_active_expediente: !!exp,
            has_open_ingreso: hasOpenIngreso,
            expediente_id: exp?.id,
            expediente_numero: exp?.numero,
            expediente_spd_id: exp?.servicio_proteccion_id,
            expediente_zona_id: exp?.zona_id,
            expediente_spd_nombre: (exp?.servicios_proteccion as any)?.nombre
        };
    };

    const handleSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const searchTerm = dni.trim();
        if (!searchTerm) return;

        setLoading(true);
        setHasTyped(true);
        setResult(null);
        setSearchResults([]);

        try {
            const isNumeric = /^\d+$/.test(searchTerm.replace(/\./g, ''));
            let childrenData: any[] = [];

            if (isNumeric) {
                const { data } = await supabase
                    .from('ninos')
                    .select('*')
                    .eq('dni', searchTerm.replace(/\./g, ''));
                childrenData = data || [];
            } else {
                const { data } = await supabase
                    .from('ninos')
                    .select('*')
                    .or(`nombre.ilike.%${searchTerm}%,apellido.ilike.%${searchTerm}%`);
                childrenData = data || [];
            }

            if (childrenData.length === 1) {
                const processed = await processChild(childrenData[0]);
                setResult(processed);
            } else if (childrenData.length > 1) {
                // For list, we don't process all sub-data immediately for performance
                // but we map them to the ChildResult shape
                setSearchResults(childrenData.map(c => ({ ...c })));
            }
        } catch (error) {
            console.error('Error during search:', error);
        } finally {
            setLoading(false);
        }
    };

    const selectChildFromList = async (child: any) => {
        setLoading(true);
        const processed = await processChild(child);
        setResult(processed);
        setSearchResults([]);
        setLoading(false);
    };

    const calculateAge = (birthDate: string) => {
        if (!birthDate) return 0;
        const diff = new Date().getTime() - new Date(birthDate).getTime();
        return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
    };

    const userRole = userProfile?.usuarios_roles?.[0]?.roles?.nombre;
    const isRestricted = result?.has_active_expediente && (
        (userRole === 'Profesional' && result.expediente_spd_id !== userProfile.servicio_proteccion_id) ||
        (userRole === 'Coordinador' && result.expediente_zona_id !== userProfile.zona_id)
    );

    return (
        <main className="max-w-[960px] mx-auto px-4 py-8">
            <Breadcrumbs
                items={[
                    { label: 'Inicio', path: '/' },
                    { label: 'Expedientes', path: '/expedientes' },
                    { label: 'Nueva Recepción', active: true }
                ]}
            />

            {/* Header Section */}
            <div className="text-center mb-10">
                <h1 className="text-[#111418] dark:text-white text-4xl font-extrabold tracking-tight mb-4">Recepción de Demanda</h1>
                <p className="text-gray-600 dark:text-gray-400 text-lg max-w-2xl mx-auto">
                    Inicie el proceso identificando al niño, niña o adolescente por DNI o Nombre para verificar antecedentes.
                </p>
            </div>

            {/* Central Search Bar */}
            <div className="max-w-2xl mx-auto mb-12">
                <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <span className="material-symbols-outlined text-gray-400 group-focus-within:text-primary transition-colors">search</span>
                    </div>
                    <form onSubmit={handleSearch}>
                        <input
                            className="block w-full pl-12 pr-32 py-5 bg-white dark:bg-gray-800 border-none rounded-xl shadow-xl shadow-blue-500/5 focus:ring-2 focus:ring-primary text-xl font-medium placeholder-gray-400 dark:text-white transition-all outline-none"
                            placeholder="Ingrese DNI o Nombre (ej: Valentina)"
                            type="text"
                            value={dni}
                            onChange={(e) => setDni(e.target.value)}
                        />
                        <div className="absolute inset-y-2 right-2 flex items-center">
                            <button
                                type="submit"
                                disabled={loading}
                                className="bg-primary hover:bg-primary/90 text-white px-8 h-full rounded-lg font-bold transition-all flex items-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-50"
                            >
                                {loading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                                <span className="material-symbols-outlined text-xl">search</span>
                                Buscar
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Dynamic Content Area */}
            <div className="grid gap-8">
                {loading && (
                    <div className="flex justify-center p-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                    </div>
                )}

                {!hasTyped && !loading && (
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-start gap-6 animate-in fade-in slide-in-from-bottom-4">
                        <div className="p-4 bg-primary/10 rounded-xl">
                            <span className="material-symbols-outlined text-primary text-3xl">info</span>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 tracking-tight">Instrucciones de Recepción</h3>
                            <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-6">
                                Busque al niño para verificar si ya posee un legajo abierto en su SPD o en otra zona.
                            </p>
                        </div>
                    </div>
                )}

                {!loading && searchResults.length > 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 uppercase text-[10px] font-bold tracking-widest text-gray-500">
                            Se encontraron {searchResults.length} coincidencias
                        </div>
                        <div className="divide-y divide-gray-100 dark:divide-gray-700">
                            {searchResults.map((child) => (
                                <button
                                    key={child.id}
                                    onClick={() => selectChildFromList(child)}
                                    className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors text-left"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="size-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-400">
                                            <span className="material-symbols-outlined">person</span>
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-900 dark:text-white uppercase">{child.apellido}, {child.nombre}</p>
                                            <p className="text-xs text-gray-500">DNI: {child.dni} • {calculateAge(child.fecha_nacimiento)} años</p>
                                        </div>
                                    </div>
                                    <span className="material-symbols-outlined text-gray-300">chevron_right</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {!loading && hasTyped && result && (
                    <div className={`relative overflow-hidden bg-white dark:bg-gray-800 rounded-xl border-l-4 ${isRestricted ? 'border-amber-500' : 'border-primary'} shadow-lg p-6 animate-in zoom-in-95`}>
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="flex items-center gap-5">
                                <div className="size-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden border border-gray-200 dark:border-gray-600">
                                    <span className="material-symbols-outlined text-gray-400 text-4xl">person</span>
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h4 className="text-xl font-bold text-gray-900 dark:text-white uppercase tracking-tight">{result.apellido}, {result.nombre}</h4>
                                        <span className={`px-2 py-0.5 text-xs font-bold rounded-full uppercase ${result.has_active_expediente ? (isRestricted ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700') : 'bg-gray-100 text-gray-500'}`}>
                                            {result.has_active_expediente ? (isRestricted ? 'Acceso Limitado' : 'Legajo Activo') : 'Sin Legajo'}
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap gap-y-1 gap-x-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                                        <span className="flex items-center gap-1"><span className="material-symbols-outlined text-lg">cake</span> {calculateAge(result.fecha_nacimiento)} años</span>
                                        <span className="flex items-center gap-1"><span className="material-symbols-outlined text-lg">fingerprint</span> DNI {result.dni}</span>
                                        {result.expediente_numero && (
                                            <span className="flex items-center gap-1 font-bold text-primary"><span className="material-symbols-outlined text-lg">folder</span> Legajo #{result.expediente_numero}</span>
                                        )}
                                    </div>
                                    {result.expediente_spd_nombre && (
                                        <p className="mt-2 text-xs font-bold text-slate-400 uppercase tracking-tighter">SPD Asignado: {result.expediente_spd_nombre}</p>
                                    )}
                                </div>
                            </div>

                            {isRestricted ? (
                                <div className="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-xl border border-amber-100 dark:border-amber-800 flex items-center gap-3">
                                    <span className="material-symbols-outlined text-amber-500">lock</span>
                                    <p className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase leading-none">Caso asignado a otro SPD.<br /><span className="lowercase font-medium">Contacte a la unidad responsable.</span></p>
                                </div>
                            ) : (
                                <button
                                    onClick={() => {
                                        if (result.has_open_ingreso) {
                                            navigate(`/expedientes/${result.expediente_id}/ingresos`);
                                            return;
                                        }
                                        const path = result.has_active_expediente
                                            ? `/expedientes/recepcion/nuevo?nino_id=${result.id}&expediente_id=${result.expediente_id}`
                                            : `/expedientes/recepcion/nuevo?nino_id=${result.id}`;
                                        navigate(path);
                                    }}
                                    className={`px-6 py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${result.has_open_ingreso ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20' : 'bg-primary hover:bg-blue-600 shadow-primary/20'} text-white`}
                                >
                                    <span className="material-symbols-outlined">{result.has_open_ingreso ? 'visibility' : 'add_circle'}</span>
                                    {result.has_open_ingreso ? 'Ver Ingreso Abierto' : result.has_active_expediente ? 'Crear Nuevo Ingreso' : 'Abrir Expediente'}
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {!loading && hasTyped && !result && searchResults.length === 0 && (
                    <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 p-8 rounded-xl flex flex-col items-center text-center shadow-sm animate-in zoom-in-95 transition-all">
                        <div className="size-20 bg-amber-50 dark:bg-amber-900/20 rounded-full flex items-center justify-center text-amber-500 mb-6 border border-amber-100 dark:border-amber-800/30">
                            <span className="material-symbols-outlined text-5xl">person_search</span>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">No se encontraron resultados</h3>
                        <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md text-sm leading-relaxed">
                            No se encontró ninguna coincidencia para "<span className="font-bold text-slate-800 dark:text-white">{dni}</span>".
                        </p>
                        <button
                            onClick={() => navigate(`/expedientes/recepcion/nuevo?dni=${dni}`)}
                            className="bg-primary hover:bg-blue-600 text-white px-10 py-3.5 rounded-xl font-bold flex items-center gap-3 transition-all shadow-lg shadow-primary/20 active:scale-95"
                        >
                            <span className="material-symbols-outlined">person_add</span>
                            Registrar Nuevo Niño/a
                        </button>
                    </div>
                )}
            </div>
            {/* Quick Actions Grid */}
            <div className="mt-20 border-t border-gray-200 dark:border-gray-800 pt-10">
                <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.3em] mb-8 text-center">Protocolos y Recursos</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div className="p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-primary transition-all cursor-pointer group shadow-sm hover:shadow-md">
                        <span className="material-symbols-outlined text-primary mb-4 block text-3xl">description</span>
                        <h4 className="font-bold text-gray-900 dark:text-white group-hover:text-primary transition-colors tracking-tight">Guías de Actuación</h4>
                        <p className="text-xs text-gray-500 mt-2 font-medium">Protocolos de recepción y derivación</p>
                    </div>
                    <div className="p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-primary transition-all cursor-pointer group shadow-sm hover:shadow-md">
                        <span className="material-symbols-outlined text-primary mb-4 block text-3xl">map</span>
                        <h4 className="font-bold text-gray-900 dark:text-white group-hover:text-primary transition-colors tracking-tight">Red de Servicios</h4>
                        <p className="text-xs text-gray-500 mt-2 font-medium">Mapa interactivo de centros locales</p>
                    </div>
                    <div className="p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-primary transition-all cursor-pointer group shadow-sm hover:shadow-md">
                        <span className="material-symbols-outlined text-primary mb-4 block text-3xl">emergency</span>
                        <h4 className="font-bold text-gray-900 dark:text-white group-hover:text-primary transition-colors tracking-tight">Mesa de Ayuda</h4>
                        <p className="text-xs text-gray-500 mt-2 font-medium">Soporte técnico y normativo 24hs</p>
                    </div>
                </div>
            </div>

            <footer className="mt-20 py-8 text-center text-gray-400 text-[10px] font-bold uppercase tracking-widest opacity-50">
                <p>© 2024 Secretaría de Niñez, Adolescencia y Familia</p>
                <p className="mt-1 text-primary/60 tracking-normal font-sans">v2.4.0-stable • Interno de soporte: 4402</p>
            </footer>
        </main>
    );
};

export default NuevaRecepcion;
