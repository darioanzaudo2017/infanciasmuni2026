import React, { useEffect, useState } from 'react';
import UserFormDrawer from './UserFormDrawer';
import { supabase } from '../../../lib/supabase';
import Breadcrumbs from '../../../components/ui/Breadcrumbs';

// Definición de tipos para mejorar el soporte de TypeScript
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

const UserManagementPage: React.FC = () => {
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);

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
                console.error('Error fetching users:', error);
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

    const handleEdit = (user: UserProfile) => {
        setSelectedUser(user);
        setIsDrawerOpen(true);
    };

    const handleNew = () => {
        setSelectedUser(null);
        setIsDrawerOpen(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-[#121717] dark:text-white">
                        <span className="material-symbols-outlined text-primary text-3xl">badge</span>
                        <h2 className="text-xl font-bold leading-tight tracking-tight">Gestión de Usuarios y Accesos</h2>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={handleNew}
                            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-sm"
                        >
                            <span className="material-symbols-outlined text-xl">person_add</span>
                            <span>Nuevo Usuario</span>
                        </button>
                    </div>
                </div>

                {/* Breadcrumbs */}
                <Breadcrumbs
                    items={[
                        { label: 'Administración' },
                        { label: 'Usuarios', active: true }
                    ]}
                />

                {/* Filters Section */}
                <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-zinc-900 p-4 rounded-xl border border-[#dce5e5] dark:border-[#333] shadow-sm">
                    <span className="text-sm font-bold text-[#658686] dark:text-[#a0b0b0] mr-2">Filtrar por:</span>
                    <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#f0f4f4] dark:bg-zinc-800 hover:bg-primary/10 transition-colors text-sm font-medium dark:text-white">
                        <span>Rol: Todos</span>
                        <span className="material-symbols-outlined text-lg">expand_more</span>
                    </button>
                    <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#f0f4f4] dark:bg-zinc-800 hover:bg-primary/10 transition-colors text-sm font-medium dark:text-white">
                        <span>SPD: Todos</span>
                        <span className="material-symbols-outlined text-lg">expand_more</span>
                    </button>
                    <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#f0f4f4] dark:bg-zinc-800 hover:bg-primary/10 transition-colors text-sm font-medium dark:text-white">
                        <span>Zona: Todas</span>
                        <span className="material-symbols-outlined text-lg">expand_more</span>
                    </button>
                    <div className="ml-auto">
                        <button className="text-primary text-xs font-bold uppercase tracking-wider hover:underline">Limpiar Filtros</button>
                    </div>
                </div>

                {/* Main Data Table Container */}
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
                                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Nombre Completo</th>
                                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Email</th>
                                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Rol</th>
                                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Servicio (SPD)</th>
                                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Zona</th>
                                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Estado</th>
                                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#dce5e5] dark:divide-[#333]">
                                    {users.map((user) => {
                                        const role = user.usuarios_roles?.[0]?.roles?.nombre || 'Sin Rol';
                                        return (
                                            <tr key={user.id} className={`hover:bg-[#f6f8f8] dark:hover:bg-zinc-800 transition-colors group ${!user.activo ? 'opacity-50' : ''}`}>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="size-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">
                                                            {user.nombre_completo?.substring(0, 2).toUpperCase() || 'U'}
                                                        </div>
                                                        <span className="text-sm font-semibold">{user.nombre_completo}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-[#658686] dark:text-[#a0b0b0]">{user.email}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold border ${role === 'Administrador'
                                                        ? 'bg-primary text-white border-primary'
                                                        : role === 'Coordinador'
                                                            ? 'bg-primary/10 text-primary border-primary/20'
                                                            : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-zinc-700'
                                                        }`}>
                                                        {role}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-[#658686] dark:text-[#a0b0b0]">{user.servicios_proteccion?.nombre || '-'}</td>
                                                <td className="px-6 py-4 text-sm">{user.zonas?.nombre || '-'}</td>
                                                <td className="px-6 py-4">
                                                    <div className={`flex items-center gap-1.5 font-bold text-xs uppercase ${user.activo ? 'text-green-600 dark:text-green-400' : 'text-slate-400'}`}>
                                                        <span className={`size-2 rounded-full ${user.activo ? 'bg-green-500' : 'bg-slate-400'}`}></span>
                                                        {user.activo ? 'Activo' : 'Inactivo'}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button
                                                        onClick={() => handleEdit(user)}
                                                        className="text-[#658686] dark:text-[#a0b0b0] hover:text-primary transition-colors p-2 rounded-lg"
                                                        title="Editar Usuario"
                                                    >
                                                        <span className="material-symbols-outlined">edit</span>
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {users.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="px-6 py-20 text-center text-[#658686]">No se encontraron usuarios</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                    <div className="px-6 py-4 border-t border-[#dce5e5] dark:border-[#333] flex items-center justify-between bg-[#f6f8f8] dark:bg-zinc-800/50">
                        <p className="text-xs font-medium text-[#658686] dark:text-[#a0b0b0]">Mostrando <span className="text-[#121717] dark:text-white">{users.length}</span> usuarios</p>
                    </div>
                </div>
            </div>

            <UserFormDrawer
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                onUserCreated={fetchUsers}
                user={selectedUser}
            />
        </div>
    );
};

export default UserManagementPage;
