import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import Breadcrumbs from '../../components/ui/Breadcrumbs';

export interface UserProfile {
    id: string;
    nombre_completo: string | null;
    email: string;
    activo: boolean;
    zona_id: number | null;
    servicio_proteccion_id: number | null;
    usuarios_roles?: {
        rol_id: number;
        roles: {
            nombre: string;
        };
    }[];
    servicios_proteccion?: {
        nombre: string;
    } | null;
    zonas?: {
        nombre: string;
    } | null;
}

const AlcanceSistemaPage: React.FC = () => {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'directorio' | 'alcance' | 'roles' | 'seguridad'>('directorio');
    const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);

    useEffect(() => {
        const fetchCurrentUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase
                    .from('usuarios')
                    .select('*, usuarios_roles(roles(nombre))')
                    .eq('id', user.id)
                    .maybeSingle();
                setCurrentUserProfile(profile);
            }
        };
        void fetchCurrentUser();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('usuarios')
                .select(`
                    *,
                    usuarios_roles(rol_id, roles(nombre)),
                    servicios_proteccion(nombre),
                    zonas(nombre)
                `);

            if (error) {
                console.error('Error fetching users for directory:', error);
            } else {
                setUsers((data as unknown as UserProfile[]) || []);
            }
        } catch (err) {
            console.error('Unexpected error:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void fetchUsers();
    }, []);

    const filteredUsers = users.filter((user) => {
        const term = searchTerm.toLowerCase().trim();
        const nameMatch = user.nombre_completo?.toLowerCase().includes(term) || false;
        const emailMatch = user.email?.toLowerCase().includes(term) || false;
        const roleMatch = user.usuarios_roles?.[0]?.roles?.nombre.toLowerCase().includes(term) || false;
        const spdMatch = user.servicios_proteccion?.nombre.toLowerCase().includes(term) || false;
        const zonaMatch = user.zonas?.nombre.toLowerCase().includes(term) || false;
        return nameMatch || emailMatch || roleMatch || spdMatch || zonaMatch;
    });

    const userRole = currentUserProfile?.usuarios_roles?.[0]?.roles?.nombre || 'Miembro';

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            {/* Header section with brand-blue gradient and high aesthetics */}
            <div className="relative bg-gradient-to-r from-primary to-[#0066b2] text-white p-8 rounded-[24px] shadow-lg overflow-hidden transition-all duration-300">
                <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
                <div className="absolute left-1/3 bottom-0 translate-y-1/2 w-48 h-48 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>

                <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-brand-yellow text-3xl animate-pulse">shield</span>
                            <span className="bg-white/20 text-white text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full backdrop-blur-md">
                                Guía & Transparencia
                            </span>
                        </div>
                        <h2 className="text-3xl font-extrabold tracking-tight leading-tight">
                            Alcance, Seguridad y Directorio del Sistema
                        </h2>
                        <p className="text-white/80 text-sm max-w-2xl font-light">
                            Conoce cómo funciona nuestra plataforma de protección de derechos de NNyA, quiénes la integran y de qué manera protegemos la privacidad de la información.
                        </p>
                    </div>

                    <div className="flex flex-col gap-1 items-start md:items-end bg-white/10 border border-white/20 p-4 rounded-xl backdrop-blur-sm self-start md:self-auto">
                        <p className="text-xs text-white/70 uppercase font-bold tracking-wider">Tu Nivel de Acceso</p>
                        <p className="text-lg font-bold text-brand-yellow flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-sm">verified_user</span>
                            {userRole}
                        </p>
                        <p className="text-[10px] text-white/50">Límites aplicados por RLS de forma automática</p>
                    </div>
                </div>
            </div>

            {/* Breadcrumbs */}
            <Breadcrumbs
                items={[
                    { label: 'Inicio', path: '/' },
                    { label: 'Alcance y Seguridad', active: true }
                ]}
            />

            {/* Premium Tab Navigation */}
            <div className="flex flex-wrap gap-2 p-1.5 bg-slate-100 dark:bg-zinc-800/80 rounded-xl border border-slate-200/50 dark:border-zinc-700/50">
                <button
                    onClick={() => setActiveTab('directorio')}
                    className={`flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-bold transition-all duration-300 ${
                        activeTab === 'directorio'
                            ? 'bg-white dark:bg-zinc-900 text-primary dark:text-white shadow-md shadow-slate-200/50 dark:shadow-none'
                            : 'text-[#60708a] hover:text-[#004884] dark:hover:text-white hover:bg-white/50 dark:hover:bg-zinc-800'
                    }`}
                >
                    <span className="material-symbols-outlined text-lg">group</span>
                    Directorio del Equipo
                </button>
                <button
                    onClick={() => setActiveTab('alcance')}
                    className={`flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-bold transition-all duration-300 ${
                        activeTab === 'alcance'
                            ? 'bg-white dark:bg-zinc-900 text-primary dark:text-white shadow-md shadow-slate-200/50 dark:shadow-none'
                            : 'text-[#60708a] hover:text-[#004884] dark:hover:text-white hover:bg-white/50 dark:hover:bg-zinc-800'
                    }`}
                >
                    <span className="material-symbols-outlined text-lg">info</span>
                    ¿Para qué sirve el Sistema?
                </button>
                <button
                    onClick={() => setActiveTab('roles')}
                    className={`flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-bold transition-all duration-300 ${
                        activeTab === 'roles'
                            ? 'bg-white dark:bg-zinc-900 text-primary dark:text-white shadow-md shadow-slate-200/50 dark:shadow-none'
                            : 'text-[#60708a] hover:text-[#004884] dark:hover:text-white hover:bg-white/50 dark:hover:bg-zinc-800'
                    }`}
                >
                    <span className="material-symbols-outlined text-lg">supervised_user_circle</span>
                    Roles y Funciones
                </button>
                <button
                    onClick={() => setActiveTab('seguridad')}
                    className={`flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-bold transition-all duration-300 ${
                        activeTab === 'seguridad'
                            ? 'bg-white dark:bg-zinc-900 text-primary dark:text-white shadow-md shadow-slate-200/50 dark:shadow-none'
                            : 'text-[#60708a] hover:text-[#004884] dark:hover:text-white hover:bg-white/50 dark:hover:bg-zinc-800'
                    }`}
                >
                    <span className="material-symbols-outlined text-lg">admin_panel_settings</span>
                    Seguridad y Privacidad
                </button>
            </div>

            {/* TAB CONTENTS */}
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-[24px] border border-[#dce5e5] dark:border-[#333] shadow-sm min-h-[450px] transition-all">
                {/* 1. TAB: DIRECTORIO */}
                {activeTab === 'directorio' && (
                    <div className="space-y-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h3 className="text-xl font-bold text-[#121717] dark:text-white">Directorio de Usuarios Activos</h3>
                                <p className="text-sm text-[#658686] dark:text-[#a0b0b0] mt-1">
                                    Aquí puedes buscar y conocer a los miembros del equipo que forman parte de la red de protección.
                                </p>
                            </div>
                            
                            {/* Buscador */}
                            <div className="relative w-full md:w-80">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                    <span className="material-symbols-outlined text-[#658686] dark:text-[#a0b0b0] text-xl">search</span>
                                </span>
                                <input
                                    type="text"
                                    placeholder="Buscar por nombre, rol, zona o SPD..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-10 py-2.5 text-sm rounded-lg border border-[#dce5e5] dark:border-[#333] bg-[#f0f4f4] dark:bg-zinc-800 text-slate-800 dark:text-white placeholder-[#658686] dark:placeholder-[#a0b0b0]/60 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                                />
                                {searchTerm && (
                                    <button
                                        onClick={() => setSearchTerm('')}
                                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-[#658686] hover:text-slate-800 dark:hover:text-white transition-colors"
                                    >
                                        <span className="material-symbols-outlined text-lg">close</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Interactive Warning explaining that RLS is filtering results */}
                        <div className="p-4 bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-xl flex gap-3 text-sm text-[#004884] dark:text-sky-300">
                            <span className="material-symbols-outlined shrink-0 text-2xl">privacy_tip</span>
                            <div className="space-y-1">
                                <p className="font-bold">Seguridad en tiempo real activa (Demostración de RLS)</p>
                                <p className="font-light text-xs opacity-90 leading-relaxed">
                                    De acuerdo con la política de seguridad RLS <strong>(Seguridad a nivel de fila)</strong>, este directorio se filtra automáticamente.
                                    {userRole === 'Administrador' ? (
                                        <span> Como tienes acceso de <strong>Administrador</strong>, estás visualizando la lista global de usuarios en el sistema.</span>
                                    ) : userRole === 'Coordinador' ? (
                                        <span> Como eres <strong>Coordinador</strong>, solo puedes ver a los profesionales y usuarios vinculados a tu misma <strong>Zona de Jurisdicción</strong>. Los usuarios de otras zonas están completamente ocultos para garantizar la compartimentación de datos.</span>
                                    ) : (
                                        <span> Como eres <strong>Profesional</strong>, solo ves a los miembros de tu propio <strong>Servicio de Protección de Derechos (SPD)</strong> asignado o tu propio perfil para asegurar el máximo secreto profesional y privacidad de datos.</span>
                                    )}
                                </p>
                            </div>
                        </div>

                        {/* Table of users */}
                        <div className="border border-slate-100 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center p-20 gap-3">
                                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                                    <p className="text-xs text-[#658686] animate-pulse">Cargando directorio seguro...</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-[#f0f4f4]/40 dark:bg-zinc-800/50 text-[#121717] dark:text-white border-b border-[#dce5e5] dark:border-[#333]">
                                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Nombre Completo</th>
                                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Email Institucional</th>
                                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Rol de Sistema</th>
                                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Área / Zona</th>
                                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Servicio de Protección (SPD)</th>
                                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Estado</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#dce5e5] dark:divide-[#333] text-slate-700 dark:text-zinc-300">
                                            {filteredUsers.map((user) => {
                                                const role = user.usuarios_roles?.[0]?.roles?.nombre || 'Miembro';
                                                return (
                                                    <tr key={user.id} className="hover:bg-[#f6f8f8] dark:hover:bg-zinc-800/40 transition-colors group">
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="size-9 rounded-full bg-primary/10 text-primary dark:bg-primary/20 dark:text-sky-300 flex items-center justify-center font-bold text-sm">
                                                                    {user.nombre_completo?.substring(0, 2).toUpperCase() || 'U'}
                                                                </div>
                                                                <span className="text-sm font-semibold text-[#121717] dark:text-white">{user.nombre_completo || 'Usuario sin nombre'}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-sm font-mono text-[#658686] dark:text-[#a0b0b0]">{user.email}</td>
                                                        <td className="px-6 py-4">
                                                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold border tracking-wider uppercase ${
                                                                role === 'Administrador'
                                                                    ? 'bg-primary text-white border-primary'
                                                                    : role === 'Coordinador'
                                                                        ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800'
                                                                        : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800'
                                                            }`}>
                                                                {role}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-sm font-medium">
                                                            {user.zonas?.nombre ? (
                                                                <span className="flex items-center gap-1">
                                                                    <span className="material-symbols-outlined text-sm text-slate-400">location_on</span>
                                                                    {user.zonas.nombre}
                                                                </span>
                                                            ) : '-'}
                                                        </td>
                                                        <td className="px-6 py-4 text-sm">
                                                            {user.servicios_proteccion?.nombre ? (
                                                                <span className="flex items-center gap-1 text-[#658686] dark:text-[#a0b0b0]">
                                                                    <span className="material-symbols-outlined text-sm text-slate-400">corporate_fare</span>
                                                                    {user.servicios_proteccion.nombre}
                                                                </span>
                                                            ) : '-'}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-1 text-xs font-bold uppercase text-green-600 dark:text-green-400">
                                                                <span className="size-2 bg-green-500 rounded-full animate-pulse"></span>
                                                                Activo
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                            {filteredUsers.length === 0 && (
                                                <tr>
                                                    <td colSpan={6} className="px-6 py-16 text-center text-[#658686]">
                                                        <span className="material-symbols-outlined text-4xl block mb-2 text-slate-300">search_off</span>
                                                        No se encontraron usuarios que coincidan con la búsqueda.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 2. TAB: ALCANCE */}
                {activeTab === 'alcance' && (
                    <div className="space-y-8 animate-fade-in">
                        <div className="text-center max-w-3xl mx-auto space-y-3">
                            <span className="material-symbols-outlined text-5xl text-primary">diversity_3</span>
                            <h3 className="text-2xl font-extrabold text-[#121717] dark:text-white">
                                ¿Qué es y para qué sirve este Sistema?
                            </h3>
                            <p className="text-[#658686] dark:text-[#a0b0b0] text-base font-light">
                                Es una herramienta tecnológica institucional creada para acompañar y registrar, de manera ordenada y segura, el proceso de acompañamiento a niñas, niños y adolescentes en situación de vulnerabilidad.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="p-6 bg-slate-50 dark:bg-zinc-800/50 rounded-2xl border border-slate-100 dark:border-zinc-800 hover:border-primary/30 transition-all duration-300 group">
                                <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary dark:bg-primary/20 dark:text-sky-300 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <span className="material-symbols-outlined">folder_open</span>
                                </div>
                                <h4 className="text-lg font-bold mb-2">Centralizar Expedientes</h4>
                                <p className="text-sm text-[#658686] dark:text-[#a0b0b0] leading-relaxed">
                                    Reemplaza las carpetas físicas dispersas por un <strong>expediente digital único</strong> por niño o grupo familiar. Evita la pérdida de datos históricos y permite que los profesionales conozcan los antecedentes de forma instantánea.
                                </p>
                            </div>

                            <div className="p-6 bg-slate-50 dark:bg-zinc-800/50 rounded-2xl border border-slate-100 dark:border-zinc-800 hover:border-primary/30 transition-all duration-300 group">
                                <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary dark:bg-primary/20 dark:text-sky-300 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <span className="material-symbols-outlined">assignment_turned_in</span>
                                </div>
                                <h4 className="text-lg font-bold mb-2">Guiar la Intervención</h4>
                                <p className="text-sm text-[#658686] dark:text-[#a0b0b0] leading-relaxed">
                                    Ofrece formularios estandarizados para cada etapa: desde la <strong>recepción inicial</strong>, la <strong>síntesis diagnóstica</strong>, hasta la <strong>definición de medidas de protección</strong> y planes de acción con compromisos familiares.
                                </p>
                            </div>

                            <div className="p-6 bg-slate-50 dark:bg-zinc-800/50 rounded-2xl border border-slate-100 dark:border-zinc-800 hover:border-primary/30 transition-all duration-300 group">
                                <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary dark:bg-primary/20 dark:text-sky-300 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <span className="material-symbols-outlined">sync_alt</span>
                                </div>
                                <h4 className="text-lg font-bold mb-2">Articulación con SENAF</h4>
                                <p className="text-sm text-[#658686] dark:text-[#a0b0b0] leading-relaxed">
                                    Facilita la comunicación y el envío de solicitudes de medidas excepcionales directamente a la <strong>SENAF</strong> (Secretaría de Niñez, Adolescencia y Familia), reduciendo los tiempos burocráticos cuando un niño requiere cuidados urgentes.
                                </p>
                            </div>
                        </div>

                        {/* El Flujo del Expediente */}
                        <div className="bg-slate-50 dark:bg-zinc-800/30 p-6 rounded-2xl border border-slate-100 dark:border-zinc-800">
                            <h4 className="text-lg font-bold mb-6 text-center text-[#121717] dark:text-white flex items-center justify-center gap-2">
                                <span className="material-symbols-outlined text-primary">route</span>
                                El Camino de un Caso en la Plataforma
                            </h4>
                            
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative">
                                <div className="hidden md:block absolute top-8 left-16 right-16 h-0.5 bg-slate-200 dark:bg-zinc-700 -z-0"></div>
                                
                                <div className="flex flex-col items-center text-center relative z-10 space-y-2">
                                    <div className="size-10 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm">1</div>
                                    <p className="font-bold text-xs uppercase tracking-wider text-primary">Recepción</p>
                                    <p className="text-[11px] text-[#658686] dark:text-[#a0b0b0]">Se detecta una vulneración y se abre la ficha de ingreso.</p>
                                </div>
                                <div className="flex flex-col items-center text-center relative z-10 space-y-2">
                                    <div className="size-10 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm">2</div>
                                    <p className="font-bold text-xs uppercase tracking-wider text-primary">Ampliación</p>
                                    <p className="text-[11px] text-[#658686] dark:text-[#a0b0b0]">El equipo realiza entrevistas, visitas y reúne información familiar.</p>
                                </div>
                                <div className="flex flex-col items-center text-center relative z-10 space-y-2">
                                    <div className="size-10 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm">3</div>
                                    <p className="font-bold text-xs uppercase tracking-wider text-primary">Diagnóstico</p>
                                    <p className="text-[11px] text-[#658686] dark:text-[#a0b0b0]">Se redacta el Informe de Síntesis identificando derechos vulnerados.</p>
                                </div>
                                <div className="flex flex-col items-center text-center relative z-10 space-y-2">
                                    <div className="size-10 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm">4</div>
                                    <p className="font-bold text-xs uppercase tracking-wider text-primary">Medidas</p>
                                    <p className="text-[11px] text-[#658686] dark:text-[#a0b0b0]">Se definen planes de acción concretos, actas y medidas ordinarias/excepcionales.</p>
                                </div>
                                <div className="flex flex-col items-center text-center relative z-10 space-y-2">
                                    <div className="size-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">5</div>
                                    <p className="font-bold text-xs uppercase tracking-wider text-emerald-600">Cierre / Cese</p>
                                    <p className="text-[11px] text-[#658686] dark:text-[#a0b0b0]">Al restituirse los derechos, se registra el cese formal de la intervención.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 3. TAB: ROLES */}
                {activeTab === 'roles' && (
                    <div className="space-y-8 animate-fade-in">
                        <div>
                            <h3 className="text-xl font-bold text-[#121717] dark:text-white">¿Quién es quién? Roles de Usuario</h3>
                            <p className="text-sm text-[#658686] dark:text-[#a0b0b0] mt-1">
                                Para garantizar el orden administrativo y la seguridad de los datos, el sistema asigna tres niveles de funciones diferentes:
                            </p>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Card Profesional */}
                            <div className="flex flex-col h-full bg-slate-50 dark:bg-zinc-800/40 border border-slate-100 dark:border-zinc-800 rounded-2xl p-6 relative overflow-hidden">
                                <div className="absolute right-0 top-0 w-24 h-24 bg-emerald-500/5 rounded-bl-full pointer-events-none"></div>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="size-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-2xl select-none">psychology</span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider bg-emerald-500/5 px-2 py-0.5 rounded-md">Nivel 1</span>
                                        <h4 className="text-lg font-bold text-slate-800 dark:text-white leading-tight">Profesional / Operador</h4>
                                    </div>
                                </div>
                                <p className="text-xs text-[#658686] dark:text-[#a0b0b0] mb-6 leading-relaxed">
                                    Es el personal de campo que trabaja codo a codo con los niños y familias en las sedes operativas (SPD).
                                </p>
                                <div className="mt-auto space-y-3">
                                    <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400">¿Qué puede hacer?</h5>
                                    <ul className="text-sm space-y-2 text-slate-600 dark:text-zinc-300">
                                        <li className="flex items-start gap-2">
                                            <span className="material-symbols-outlined text-sm text-green-500 mt-0.5">check_circle</span>
                                            <span>Registrar ingresos y completar formularios de niños.</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="material-symbols-outlined text-sm text-green-500 mt-0.5">check_circle</span>
                                            <span>Subir ampliaciones, informes técnicos y actas.</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="material-symbols-outlined text-sm text-green-500 mt-0.5">check_circle</span>
                                            <span>Ver y editar exclusivamente <strong>los expedientes de su propio SPD</strong>.</span>
                                        </li>
                                    </ul>
                                </div>
                            </div>

                            {/* Card Coordinador */}
                            <div className="flex flex-col h-full bg-slate-50 dark:bg-zinc-800/40 border border-slate-100 dark:border-zinc-800 rounded-2xl p-6 relative overflow-hidden">
                                <div className="absolute right-0 top-0 w-24 h-24 bg-blue-500/5 rounded-bl-full pointer-events-none"></div>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="size-12 rounded-xl bg-blue-500/10 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-2xl">supervised_user_circle</span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider bg-blue-500/5 px-2 py-0.5 rounded-md">Nivel 2</span>
                                        <h4 className="text-lg font-bold text-slate-800 dark:text-white leading-tight">Coordinador de Zona</h4>
                                    </div>
                                </div>
                                <p className="text-xs text-[#658686] dark:text-[#a0b0b0] mb-6 leading-relaxed">
                                    Supervisa las acciones de una zona geográfica completa que abarca múltiples oficinas operativas (SPDs).
                                </p>
                                <div className="mt-auto space-y-3">
                                    <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400">¿Qué puede hacer?</h5>
                                    <ul className="text-sm space-y-2 text-slate-600 dark:text-zinc-300">
                                        <li className="flex items-start gap-2">
                                            <span className="material-symbols-outlined text-sm text-green-500 mt-0.5">check_circle</span>
                                            <span>Visualizar la totalidad de los expedientes de <strong>toda su Zona</strong>.</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="material-symbols-outlined text-sm text-green-500 mt-0.5">check_circle</span>
                                            <span>Asignar y derivar casos entre los distintos SPDs de su jurisdicción.</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="material-symbols-outlined text-sm text-green-500 mt-0.5">check_circle</span>
                                            <span>Validar informes, autorizar solicitudes a SENAF y supervisar el avance.</span>
                                        </li>
                                    </ul>
                                </div>
                            </div>

                            {/* Card Administrador */}
                            <div className="flex flex-col h-full bg-slate-50 dark:bg-zinc-800/40 border border-slate-100 dark:border-zinc-800 rounded-2xl p-6 relative overflow-hidden">
                                <div className="absolute right-0 top-0 w-24 h-24 bg-primary/5 rounded-bl-full pointer-events-none"></div>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="size-12 rounded-xl bg-primary/10 text-primary dark:bg-primary/20 dark:text-sky-300 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-2xl">admin_panel_settings</span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-primary dark:text-sky-300 font-bold uppercase tracking-wider bg-primary/5 px-2 py-0.5 rounded-md">Nivel 3</span>
                                        <h4 className="text-lg font-bold text-slate-800 dark:text-white leading-tight">Administrador General</h4>
                                    </div>
                                </div>
                                <p className="text-xs text-[#658686] dark:text-[#a0b0b0] mb-6 leading-relaxed">
                                    Es el soporte de la plataforma y el encargado de velar por su correcto funcionamiento técnico y de seguridad.
                                </p>
                                <div className="mt-auto space-y-3">
                                    <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400">¿Qué puede hacer?</h5>
                                    <ul className="text-sm space-y-2 text-slate-600 dark:text-zinc-300">
                                        <li className="flex items-start gap-2">
                                            <span className="material-symbols-outlined text-sm text-green-500 mt-0.5">check_circle</span>
                                            <span>Dar de alta, desactivar o modificar las cuentas de usuarios en el sistema.</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="material-symbols-outlined text-sm text-green-500 mt-0.5">check_circle</span>
                                            <span>Modificar catálogos del sistema (Catálogo de Derechos vulnerados, barrios).</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="material-symbols-outlined text-sm text-green-500 mt-0.5">check_circle</span>
                                            <span>Acceso global a registros, auditorías de cambios e historial del sistema.</span>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 4. TAB: SEGURIDAD */}
                {activeTab === 'seguridad' && (
                    <div className="space-y-8 animate-fade-in text-slate-700 dark:text-zinc-300">
                        <div>
                            <h3 className="text-xl font-bold text-[#121717] dark:text-white">Nuestra Fortaleza de Seguridad</h3>
                            <p className="text-sm text-[#658686] dark:text-[#a0b0b0] mt-1">
                                Trabajamos con información sumamente sensible relacionada con la vida y la privacidad de menores. Por eso, implementamos medidas de seguridad informática estrictas explicadas a continuación en palabras sencillas:
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Autenticación */}
                            <div className="p-6 bg-slate-50 dark:bg-zinc-800/40 rounded-2xl border border-slate-100 dark:border-zinc-800 space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary dark:bg-primary/20 dark:text-sky-300 flex items-center justify-center">
                                        <span className="material-symbols-outlined select-none">vpn_key</span>
                                    </div>
                                    <h4 className="text-lg font-bold text-slate-800 dark:text-white">1. Autenticación (Llave de Ingreso)</h4>
                                </div>
                                <p className="text-sm leading-relaxed text-slate-600 dark:text-zinc-400">
                                    <strong>¿Qué es?</strong> Es el control de identidad en la puerta del sistema. Para entrar, necesitas escribir tu correo institucional y tu contraseña personal.
                                </p>
                                <div className="space-y-2 text-xs">
                                    <p className="font-bold text-primary">¿Cómo te protege en la práctica?</p>
                                    <ul className="space-y-2 pl-4 list-disc">
                                        <li><strong>Invitaciones Cerradas:</strong> Nadie puede registrarse por su cuenta. Solo un Administrador puede crear una cuenta y enviarle un enlace de activación seguro al correo del nuevo profesional.</li>
                                        <li><strong>Contraseñas Robustas:</strong> Al abrir el enlace, el usuario establece una contraseña que viaja de forma encriptada (codificada como un mensaje secreto) para que nadie pueda leerla en el trayecto.</li>
                                        <li><strong>Cierre por inactividad:</strong> Si dejas tu sesión abierta y te alejas, la plataforma te desconecta automáticamente después de un tiempo para evitar que otra persona use tu computadora abierta.</li>
                                    </ul>
                                </div>
                            </div>

                            {/* RLS */}
                            <div className="p-6 bg-slate-50 dark:bg-zinc-800/40 rounded-2xl border border-slate-100 dark:border-zinc-800 space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-brand-yellow/10 text-[#a87f00] dark:bg-brand-yellow/20 dark:text-brand-yellow flex items-center justify-center">
                                        <span className="material-symbols-outlined select-none">security</span>
                                    </div>
                                    <h4 className="text-lg font-bold text-slate-800 dark:text-white">2. RLS o Seguridad a Nivel de Fila</h4>
                                </div>
                                <p className="text-sm leading-relaxed text-slate-600 dark:text-zinc-400">
                                    <strong>¿Qué es?</strong> RLS (Row Level Security) es el corazón de nuestra privacidad. Actúa como paredes de hormigón digitales que separan la base de datos en oficinas seguras e independientes.
                                </p>
                                <div className="space-y-2 text-xs">
                                    <p className="font-bold text-[#a87f00] dark:text-brand-yellow">¿Cómo te protege en la práctica?</p>
                                    <ul className="space-y-2 pl-4 list-disc">
                                        <li><strong>"Solo lo que te corresponde":</strong> Si eres un profesional del <strong>SPD Norte</strong>, la base de datos oculta de forma automática el 100% de los casos del <strong>SPD Sur</strong>. Tus consultas ni siquiera reciben una respuesta vacía: para tu usuario, el resto de los datos directamente no existen.</li>
                                        <li><strong>Privacidad Garantizada:</strong> Esto previene fugas de información accidental y el "curioseo" de legajos de menores por parte de profesionales que no están asignados para intervenir en su acompañamiento.</li>
                                        <li><strong>Seguridad a nivel base de datos:</strong> No es un simple bloqueo visual de la pantalla. Aunque un hacker intentara saltearse el menú visual, la base de datos misma rechazaría el pedido por carecer de la 'llave de fila' correspondiente.</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        {/* Interactive diagram representation */}
                        <div className="bg-primary/5 dark:bg-zinc-800/20 p-6 rounded-2xl border border-primary/20 space-y-4">
                            <h4 className="text-base font-bold text-primary dark:text-sky-300 flex items-center gap-2">
                                <span className="material-symbols-outlined">query_stats</span>
                                Ilustración Práctica: ¿Cómo actúan estas medidas juntas?
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                                <div className="p-4 bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-slate-100 dark:border-zinc-800">
                                    <span className="material-symbols-outlined text-3xl text-slate-400 mb-2">login</span>
                                    <h5 className="font-bold text-xs uppercase text-slate-400 tracking-wider">Paso 1: Entras a la Plataforma</h5>
                                    <p className="text-[11px] text-[#658686] mt-1">La <strong>Autenticación</strong> valida que eres tú y te otorga tu credencial de sesión.</p>
                                </div>
                                <div className="p-4 bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-slate-100 dark:border-zinc-800">
                                    <span className="material-symbols-outlined text-3xl text-slate-400 mb-2">vpn_key</span>
                                    <h5 className="font-bold text-xs uppercase text-slate-400 tracking-wider">Paso 2: La Base de Datos lee tu Rol</h5>
                                    <p className="text-[11px] text-[#658686] mt-1">Reconoce si eres Profesional, Coordinador o Admin, y tu <strong>SPD/Zona</strong> asignada.</p>
                                </div>
                                <div className="p-4 bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-slate-100 dark:border-zinc-800">
                                    <span className="material-symbols-outlined text-3xl text-brand-yellow mb-2">security</span>
                                    <h5 className="font-bold text-xs uppercase text-slate-400 tracking-wider">Paso 3: RLS Filtra los Expedientes</h5>
                                    <p className="text-[11px] text-[#658686] mt-1">El <strong>RLS</strong> crea un túnel seguro. Solo viajan a tu pantalla los registros autorizados.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AlcanceSistemaPage;
