import { NavLink, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useEffect, useState } from 'react';

const Sidebar = () => {
    const navigate = useNavigate();
    const [userProfile, setUserProfile] = useState<any>(null);

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase
                    .from('usuarios')
                    .select('*, usuarios_roles(roles(nombre)), servicios_proteccion(nombre), zonas(nombre)')
                    .eq('id', user.id)
                    .maybeSingle();
                setUserProfile(profile || { nombre_completo: user.email, email: user.email });
            }
        };
        void fetchUser();
    }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/login');
    };

    const userRole = userProfile?.usuarios_roles?.[0]?.roles?.nombre;
    const canManageUsers = userRole === 'Administrador' || userRole === 'Coordinador';

    const menuItems = [
        { title: 'Panel de Control', icon: 'dashboard', path: '/' },
        { title: 'Expedientes', icon: 'folder_shared', path: '/expedientes' },
        ...(canManageUsers ? [{ title: 'Usuarios', icon: 'group', path: '/usuarios' }] : []),
    ];

    return (
        <aside className="w-64 border-r border-[#e5e7eb] dark:border-[#333] flex flex-col bg-white dark:bg-[#1a1a1a] shrink-0 h-screen sticky top-0">
            <div className="p-6 border-b border-[#f0f2f5] dark:border-[#333] flex justify-center">
                <img
                    src="/logo_cordoba.png"
                    alt="Córdoba Capital"
                    className="h-auto w-auto max-w-full max-h-16 object-contain"
                />
            </div>

            <nav className="flex-1 p-4 flex flex-col gap-1 overflow-y-auto">
                {menuItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) => `
              flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors
              ${isActive
                                ? 'bg-primary/10 text-primary font-semibold'
                                : 'text-[#60708a] hover:bg-gray-100 dark:hover:bg-zinc-800'}
            `}
                    >
                        <span className="material-symbols-outlined">{item.icon}</span>
                        <span className="text-sm">{item.title}</span>
                    </NavLink>
                ))}

                <div className="mt-6 pt-6 border-t border-[#f0f2f5] dark:border-[#333] flex flex-col gap-1">
                    <NavLink
                        to="/configuracion"
                        className={({ isActive }) => `
              flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors
              ${isActive
                                ? 'bg-primary/10 text-primary font-semibold'
                                : 'text-[#60708a] hover:bg-gray-100 dark:hover:bg-zinc-800'}
            `}
                    >
                        <span className="material-symbols-outlined text-[20px]">settings</span>
                        <span className="text-sm">Configuración</span>
                    </NavLink>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors mt-1 w-full text-left"
                    >
                        <span className="material-symbols-outlined text-[20px]">logout</span>
                        <span className="text-sm font-semibold">Cerrar Sesión</span>
                    </button>
                </div>
            </nav>

            <div className="p-4 border-t border-[#f0f2f5] dark:border-[#333]">
                <div className="flex items-center gap-3 px-2">
                    <div className="size-9 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-primary font-bold text-xs">
                        {userProfile?.nombre_completo?.substring(0, 2).toUpperCase() || 'U'}
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                        <p className="text-sm font-bold truncate dark:text-white leading-tight">
                            {userProfile?.nombre_completo || 'Usuario'}
                        </p>
                        <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
                            <span className="text-[10px] font-bold text-primary uppercase tracking-tight">
                                {userProfile?.usuarios_roles?.[0]?.roles?.nombre || 'Miembro'}
                            </span>
                            {userProfile?.servicios_proteccion?.nombre && (
                                <span className="text-[10px] text-[#60708a] border-l border-slate-300 pl-2">
                                    {userProfile.servicios_proteccion.nombre}
                                </span>
                            )}
                            {userProfile?.zonas?.nombre && (
                                <span className="text-[10px] text-[#60708a] border-l border-slate-300 pl-2">
                                    {userProfile.zonas.nombre}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
