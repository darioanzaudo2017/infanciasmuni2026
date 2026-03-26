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
    const [resendingEmail, setResendingEmail] = useState<string | null>(null);
    const [showInvitationModal, setShowInvitationModal] = useState(false);
    const [invitationLink, setInvitationLink] = useState('');
    const [copied, setCopied] = useState(false);
    const [sendingResend, setSendingResend] = useState(false);
    const [invitingUser, setInvitingUser] = useState<{ email: string; nombre_completo: string } | null>(null);

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

    const handleResendEmail = async (user: UserProfile) => {
        setResendingEmail(user.id);
        try {
            const { data, error } = await supabase.functions.invoke('create-user', {
                body: { 
                    email: user.email,
                    nombre_completo: user.nombre_completo,
                    rol_id: user.usuarios_roles?.[0]?.rol_id,
                    redirectTo: `${window.location.origin}/set-password`
                }
            });

            if (error) throw error;

            const isConfirmed = data.is_confirmed;
            const inviteLink = data.invite_link;

            if (isConfirmed) {
                alert('El usuario ya activó su cuenta anteriormente.');
            } else {
                // En lugar de enviar directo, abrimos el modal con el link
                setInvitationLink(inviteLink);
                setInvitingUser({ 
                    email: user.email, 
                    nombre_completo: user.nombre_completo || 'Usuario' 
                });
                setShowInvitationModal(true);
            }

        } catch (err) {
            console.error('Error resending email:', err);
            alert('Error al intentar generar la invitación.');
        } finally {
            setResendingEmail(null);
        }
    };

    const handleSendResendEmail = async () => {
        if (!invitingUser) return;
        
        setSendingResend(true);
        try {
            const { error: sendError } = await supabase.functions.invoke('send-email', {
                body: {
                    to: invitingUser.email,
                    subject: "Invitación al Sistema de Protección de Derechos NNyA",
                    html: `
                        <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px; overflow: hidden;">
                            <div style="background-color: #1a2e2e; padding: 20px; text-align: center;">
                                <h1 style="color: white; margin: 0; font-size: 20px;">Sistema de Protección de Derechos NNyA</h1>
                            </div>
                            <div style="padding: 30px;">
                                <h2 style="color: #1a2e2e; margin-top: 0;">¡Hola ${invitingUser.nombre_completo}!</h2>
                                <p>Te recordamos que se ha creado tu cuenta institucional en nuestra plataforma y aún no has activado tu acceso.</p>
                                <p>Para configurar tu contraseña y entrar al sistema, haz clic en el siguiente botón:</p>
                                <div style="text-align: center; margin: 30px 0;">
                                    <a href="${invitationLink}" 
                                       style="display: inline-block; padding: 14px 28px; background-color: #00897b; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                                       Activar mi cuenta y acceder
                                    </a>
                                </div>
                                <p style="font-size: 14px; color: #666; border-top: 1px solid #eee; padding-top: 20px;">
                                    Si el botón no funciona, copia y pega este enlace en tu navegador:<br>
                                    <span style="color: #00897b; overflow-wrap: break-word;">${invitationLink}</span>
                                </p>
                            </div>
                            <div style="background-color: #f9f9f9; padding: 20px; text-align: center; font-size: 12px; color: #888;">
                                &copy; 2026 Sistema de Infancias. Este es un mensaje automático.
                            </div>
                        </div>
                    `
                }
            });

            if (sendError) throw sendError;
            alert('¡Invitación enviada con éxito!');
            setShowInvitationModal(false);
        } catch (err) {
            console.error('Error al enviar con Resend:', err);
            alert('Error al enviar el correo automático.');
        } finally {
            setSendingResend(false);
        }
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
                                                    <div className="flex justify-end gap-1">
                                                        <button
                                                            onClick={() => handleResendEmail(user)}
                                                            disabled={resendingEmail === user.id}
                                                            className={`text-[#658686] dark:text-[#a0b0b0] hover:text-primary transition-colors p-2 rounded-lg flex items-center justify-center ${resendingEmail === user.id ? 'animate-pulse' : ''}`}
                                                            title="Re-enviar Acceso por Email"
                                                        >
                                                            {resendingEmail === user.id ? (
                                                                <div className="size-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                                                            ) : (
                                                                <span className="material-symbols-outlined text-xl">mail</span>
                                                            )}
                                                        </button>
                                                        <button
                                                            onClick={() => handleEdit(user)}
                                                            className="text-[#658686] dark:text-[#a0b0b0] hover:text-primary transition-colors p-2 rounded-lg"
                                                            title="Editar Usuario"
                                                        >
                                                            <span className="material-symbols-outlined text-xl">edit</span>
                                                        </button>
                                                    </div>
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

            {/* Modal de Invitación / Resend */}
            {showInvitationModal && invitingUser && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div 
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-fade-in"
                        onClick={() => setShowInvitationModal(false)}
                    ></div>
                    
                    <div className="relative glass p-8 rounded-2xl shadow-2xl max-w-md w-full animate-zoom-in flex flex-col items-center text-center">
                        <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mb-6">
                            <span className="material-symbols-outlined text-primary text-4xl">mark_email_read</span>
                        </div>
                        
                        <h2 className="text-[#111818] dark:text-white text-2xl font-bold mb-2">Re-enviar Invitación</h2>
                        <p className="text-[#638888] dark:text-[#a3bdbd] text-sm mb-8">
                            Se ha generado un nuevo acceso para <span className="font-bold text-primary">{invitingUser.email}</span>.
                        </p>
                        
                        <div className="w-full mb-6 text-slate-800 dark:text-white">
                            <p className="text-left text-xs font-bold text-[#638888] mb-2 uppercase tracking-wider">Enlace de Activación</p>
                            <div className="flex gap-2">
                                <input 
                                    readOnly 
                                    value={invitationLink}
                                    className="flex-1 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-600 dark:text-slate-300 outline-none focus:ring-1 focus:ring-primary"
                                />
                                <button 
                                    onClick={() => {
                                        navigator.clipboard.writeText(invitationLink);
                                        setCopied(true);
                                        setTimeout(() => setCopied(false), 2000);
                                    }}
                                    className={`p-2 rounded-lg transition-all duration-300 flex items-center justify-center ${copied ? 'bg-green-100 dark:bg-green-900/30' : 'bg-slate-100 dark:bg-zinc-700 hover:bg-slate-200 dark:hover:bg-zinc-600'}`}
                                    title={copied ? "¡Copiado!" : "Copiar enlace"}
                                >
                                    <span className={`material-symbols-outlined text-sm transition-all ${copied ? 'text-green-600 dark:text-green-400 scale-110' : 'text-slate-600 dark:text-slate-300'}`}>
                                        {copied ? 'check' : 'content_copy'}
                                    </span>
                                </button>
                            </div>
                        </div>
                        
                        <div className="flex flex-col gap-3 w-full">
                            <button
                                onClick={() => {
                                    const subject = encodeURIComponent("Invitación al Sistema de Protección de Derechos NNyA");
                                    const body = encodeURIComponent(
                                        `Hola ${invitingUser.nombre_completo},\n\n` +
                                        `Se ha generado un nuevo acceso a tu cuenta en el sistema. Para activar tu acceso y configurar tu contraseña, por favor haz clic en el siguiente enlace:\n\n` +
                                        `${invitationLink}\n\n` +
                                        `Si tienes algún problema para ingresar, contacta al administrador.\n\n` +
                                        `Saludos.`
                                    );
                                    window.location.href = `mailto:${invitingUser.email}?subject=${subject}&body=${body}`;
                                }}
                                className="w-full py-3 text-primary text-sm font-semibold hover:underline flex items-center justify-center gap-1"
                            >
                                <span className="material-symbols-outlined text-sm">alternate_email</span>
                                Abrir en cliente de correo local
                            </button>

                            <button
                                onClick={handleSendResendEmail}
                                disabled={sendingResend}
                                className="w-full py-4 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/30 hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                            >
                                {sendingResend ? (
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                ) : (
                                    <span className="material-symbols-outlined">send_and_archive</span>
                                )}
                                {sendingResend ? 'Enviando...' : 'Enviar Invitación Institucional'}
                            </button>
                            
                            <button
                                onClick={() => setShowInvitationModal(false)}
                                className="w-full py-3 text-slate-500 dark:text-slate-400 font-medium text-sm hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagementPage;
