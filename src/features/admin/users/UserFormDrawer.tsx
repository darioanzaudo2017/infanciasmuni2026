import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import type { UserProfile } from './UserManagementPage';

interface Role {
    id: number;
    nombre: string;
}

interface Zona {
    id: number;
    nombre: string;
}

interface SPD {
    id: number;
    nombre: string;
    zona_id: number;
}

interface UserFormDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    onUserCreated?: () => void;
    user?: UserProfile | null;
}

const UserFormDrawer: React.FC<UserFormDrawerProps> = ({ isOpen, onClose, onUserCreated, user }) => {
    const [roles, setRoles] = useState<Role[]>([]);
    const [zonas, setZonas] = useState<Zona[]>([]);
    const [spds, setSpds] = useState<SPD[]>([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        nombre_completo: '',
        email: '',
        rol_id: '',
        zona_id: '',
        servicio_proteccion_id: '',
        activo: true
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const [rRes, zRes, sRes] = await Promise.all([
                supabase.from('roles').select('*'),
                supabase.from('zonas').select('*'),
                supabase.from('servicios_proteccion').select('*')
            ]);

            if (rRes.data) setRoles(rRes.data as Role[]);
            if (zRes.data) setZonas(zRes.data as Zona[]);
            if (sRes.data) setSpds(sRes.data as SPD[]);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            void fetchData();
            if (user) {
                const roleId = user.usuarios_roles?.[0]?.rol_id;
                setFormData({
                    nombre_completo: user.nombre_completo || '',
                    email: user.email || '',
                    rol_id: roleId?.toString() || '',
                    zona_id: user.zona_id?.toString() || '',
                    servicio_proteccion_id: user.servicio_proteccion_id?.toString() || '',
                    activo: user.activo !== undefined ? user.activo : true
                });
            } else {
                setFormData({
                    nombre_completo: '',
                    email: '',
                    rol_id: '',
                    zona_id: '',
                    servicio_proteccion_id: '',
                    activo: true
                });
            }
        }
    }, [isOpen, user]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            if (user) {
                // MODO EDICIÓN
                const { error: updateError } = await supabase
                    .from('usuarios')
                    .update({
                        nombre_completo: formData.nombre_completo,
                        zona_id: formData.zona_id ? parseInt(formData.zona_id) : null,
                        servicio_proteccion_id: formData.servicio_proteccion_id ? parseInt(formData.servicio_proteccion_id) : null,
                        activo: formData.activo
                    })
                    .eq('id', user.id);

                if (updateError) throw updateError;

                // Actualizar Rol
                await supabase
                    .from('usuarios_roles')
                    .delete()
                    .eq('usuario_id', user.id);

                const { error: roleInsertError } = await supabase
                    .from('usuarios_roles')
                    .insert({
                        usuario_id: user.id,
                        rol_id: parseInt(formData.rol_id)
                    });

                if (roleInsertError) throw roleInsertError;

                alert('Usuario actualizado exitosamente');
            } else {
                // MODO CREACIÓN
                const { error } = await supabase.functions.invoke('create-user', {
                    body: {
                        email: formData.email,
                        nombre_completo: formData.nombre_completo,
                        rol_id: parseInt(formData.rol_id),
                        zona_id: formData.zona_id ? parseInt(formData.zona_id) : null,
                        servicio_proteccion_id: formData.servicio_proteccion_id ? parseInt(formData.servicio_proteccion_id) : null,
                        activo: formData.activo
                    }
                });

                if (error) throw error;
                alert('Usuario creado exitosamente. Se ha enviado un correo de invitación.');
            }

            if (onUserCreated) onUserCreated();
            onClose();
        } catch (err: unknown) {
            console.error('Error:', err);
            const message = err instanceof Error ? err.message : JSON.stringify(err);
            alert('Error al procesar la solicitud: ' + message);
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const selectedRole = roles.find(r => r.id.toString() === formData.rol_id);
    const roleName = selectedRole?.nombre;

    return (
        <>
            <div
                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity"
                onClick={onClose}
            ></div>

            <div className="fixed top-0 right-0 h-full w-full max-w-[520px] bg-white dark:bg-[#112121] z-50 shadow-2xl flex flex-col border-l border-[#dce5e5] dark:border-[#2d4141] transition-transform animate-slide-in-right">
                <div className="flex flex-col gap-1 p-6 border-b border-[#dce5e5] dark:border-[#2d4141]">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-[#111818] dark:text-white tracking-tight text-2xl font-bold leading-tight">
                                {user ? 'Editar Usuario' : 'Nuevo Usuario'}
                            </h2>
                            <p className="text-[#638888] dark:text-[#a3bdbd] text-sm font-normal leading-normal">
                                {user ? `Editando cuenta de ${user.email}` : 'Complete los datos para dar de alta un usuario en el sistema.'}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                        >
                            <span className="material-symbols-outlined text-[#638888]">close</span>
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <form className="flex flex-col gap-8 py-6" id="userForm" onSubmit={handleSubmit}>
                        <section>
                            <div className="flex items-center gap-2 px-6 mb-2">
                                <span className="material-symbols-outlined text-primary text-sm">person</span>
                                <h3 className="text-[#111818] dark:text-white text-lg font-bold leading-tight tracking-[-0.015em]">Datos Personales</h3>
                            </div>
                            <div className="px-6 flex flex-col gap-4">
                                <label className="flex flex-col">
                                    <p className="text-[#111818] dark:text-white text-sm font-medium leading-normal pb-1.5">Nombre Completo</p>
                                    <input
                                        className="w-full rounded-lg text-[#111818] dark:text-white border border-[#dce5e5] dark:border-[#2a3a3a] bg-white dark:bg-[#1a2d2d] h-12 placeholder:text-[#638888]/60 p-[12px] text-base font-normal focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                        placeholder="Ej: Juan Pérez"
                                        type="text"
                                        value={formData.nombre_completo}
                                        onChange={e => setFormData({ ...formData, nombre_completo: e.target.value })}
                                        required
                                    />
                                </label>
                                <label className="flex flex-col">
                                    <p className="text-[#111818] dark:text-white text-sm font-medium leading-normal pb-1.5">Correo Electrónico Institucional</p>
                                    <input
                                        className={`w-full rounded-lg text-[#111818] dark:text-white border border-[#dce5e5] dark:border-[#2a3a3a] bg-white dark:bg-[#1a2d2d] h-12 p-[12px] text-base font-normal focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all ${user ? 'opacity-60 grayscale cursor-not-allowed' : ''}`}
                                        placeholder="usuario@organismo.gob.ar"
                                        type="email"
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        required
                                        readOnly={!!user}
                                    />
                                </label>
                            </div>
                        </section>

                        <hr className="mx-6 border-[#dce5e5] dark:border-[#2d4141]" />

                        <section>
                            <div className="flex items-center gap-2 px-6 mb-2">
                                <span className="material-symbols-outlined text-primary text-sm">shield_person</span>
                                <h3 className="text-[#111818] dark:text-white text-lg font-bold leading-tight tracking-[-0.015em]">Rol y Permisos</h3>
                            </div>
                            <div className="px-6 flex flex-col gap-3">
                                <p className="text-[#111818] dark:text-white text-sm font-medium leading-normal">Perfil de Usuario</p>
                                <div className="grid grid-cols-1 gap-2">
                                    {roles.map((role) => (
                                        <label key={role.id} className="relative flex items-center p-3 cursor-pointer rounded-lg border border-[#dce5e5] dark:border-[#2a3a3a] bg-white dark:bg-[#1a2d2d] hover:bg-slate-50 dark:hover:bg-[#1d3535] transition-colors">
                                            <input
                                                className="w-4 h-4 text-primary border-gray-300 focus:ring-primary"
                                                name="role"
                                                type="radio"
                                                value={role.id}
                                                checked={formData.rol_id === role.id.toString()}
                                                onChange={e => setFormData({ ...formData, rol_id: e.target.value })}
                                                required
                                            />
                                            <div className="ml-3">
                                                <p className="text-sm font-bold text-[#111818] dark:text-white leading-none">{role.nombre}</p>
                                                <p className="text-xs text-[#638888] mt-1">Acceso nivel {role.nombre}</p>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </section>

                        <hr className="mx-6 border-[#dce5e5] dark:border-[#2d4141]" />

                        {formData.rol_id && roleName !== 'Administrador' && (
                            <section>
                                <div className="flex items-center gap-2 px-6 mb-2">
                                    <span className="material-symbols-outlined text-primary text-sm">account_balance</span>
                                    <h3 className="text-[#111818] dark:text-white text-lg font-bold leading-tight tracking-[-0.015em]">Asignación Institucional</h3>
                                </div>
                                <div className="px-6 flex flex-col gap-4">
                                    <label className="flex flex-col">
                                        <p className="text-[#111818] dark:text-white text-sm font-medium leading-normal pb-1.5">Zona / Jurisdicción</p>
                                        <div className="relative">
                                            <select
                                                className="appearance-none w-full rounded-lg text-[#111818] dark:text-white border border-[#dce5e5] dark:border-[#2a3a3a] bg-white dark:bg-[#1a2d2d] h-12 p-[12px] text-base font-normal focus:outline-0 focus:ring-2 focus:ring-primary transition-all"
                                                value={formData.zona_id}
                                                onChange={e => setFormData({ ...formData, zona_id: e.target.value })}
                                                required={roleName === 'Coordinador' || roleName === 'Profesional'}
                                            >
                                                <option value="">Seleccione zona</option>
                                                {zonas.map(z => <option key={z.id} value={z.id}>{z.nombre}</option>)}
                                            </select>
                                            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[#638888] pointer-events-none">unfold_more</span>
                                        </div>
                                    </label>

                                    {roleName === 'Profesional' && (
                                        <label className="flex flex-col">
                                            <p className="text-[#111818] dark:text-white text-sm font-medium leading-normal pb-1.5">Organismo (SPD)</p>
                                            <div className="relative">
                                                <select
                                                    className="appearance-none w-full rounded-lg text-[#111818] dark:text-white border border-[#dce5e5] dark:border-[#2a3a3a] bg-white dark:bg-[#1a2d2d] h-12 p-[12px] text-base font-normal focus:outline-0 focus:ring-2 focus:ring-primary transition-all"
                                                    value={formData.servicio_proteccion_id}
                                                    onChange={e => setFormData({ ...formData, servicio_proteccion_id: e.target.value })}
                                                    required
                                                >
                                                    <option value="">Seleccione el organismo</option>
                                                    {spds
                                                        .filter(s => !formData.zona_id || s.zona_id.toString() === formData.zona_id)
                                                        .map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)
                                                    }
                                                </select>
                                                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[#638888] pointer-events-none">unfold_more</span>
                                            </div>
                                        </label>
                                    )}
                                </div>
                            </section>
                        )}

                        <hr className="mx-6 border-[#dce5e5] dark:border-[#2d4141]" />

                        <section className="pb-10">
                            <div className="px-6 flex items-center justify-between">
                                <div className="flex flex-col">
                                    <h3 className="text-[#111818] dark:text-white text-base font-bold leading-tight">Estado de la Cuenta</h3>
                                    <p className="text-[#638888] text-xs font-normal">Habilite o deshabilite el acceso inmediato.</p>
                                </div>
                                <label className="inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={formData.activo}
                                        onChange={e => setFormData({ ...formData, activo: e.target.checked })}
                                    />
                                    <div className="relative w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                                    <span className="ms-3 text-sm font-medium text-[#111818] dark:text-white">Activo</span>
                                </label>
                            </div>
                        </section>
                    </form>
                </div>

                <div className="p-6 border-t border-[#dce5e5] dark:border-[#2d4141] flex gap-3 bg-white dark:bg-[#112121]">
                    <button
                        onClick={onClose}
                        type="button"
                        disabled={submitting}
                        className="flex-1 px-4 py-3 rounded-lg border border-[#dce5e5] dark:border-[#2d4141] text-[#111818] dark:text-white font-bold text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
                        form="userForm"
                        disabled={submitting || loading}
                        className="flex-[2] px-4 py-3 rounded-lg bg-primary text-slate-900 font-bold text-sm shadow-lg shadow-primary/20 hover:brightness-105 active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                        {submitting ? (
                            <div className="flex items-center justify-center gap-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-900"></div>
                                <span>Procesando...</span>
                            </div>
                        ) : (user ? 'Guardar Cambios' : 'Crear Usuario')}
                    </button>
                </div>
            </div>
        </>
    );
};

export default UserFormDrawer;
