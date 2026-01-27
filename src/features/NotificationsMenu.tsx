import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../hooks/useNotifications';
import type { Notification } from '../hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale/es';

const NotificationsMenu = () => {
    const [isOpen, setIsOpen] = useState(false);
    const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
    const menuRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleNotificationClick = (notif: Notification) => {
        if (!notif.leida) {
            markAsRead(notif.id);
        }
        if (notif.link) {
            navigate(notif.link);
        }
        setIsOpen(false);
    };

    const getTypeStyles = (tipo: string) => {
        switch (tipo) {
            case 'warning': return 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-500';
            case 'error': return 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-500';
            case 'success': return 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-500';
            default: return 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-500';
        }
    };

    const getTypeIcon = (tipo: string) => {
        switch (tipo) {
            case 'warning': return 'warning';
            case 'error': return 'error';
            case 'success': return 'check_circle';
            default: return 'info';
        }
    };

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 rounded-lg bg-[#f0f2f5] dark:bg-zinc-800 text-[#111418] dark:text-white relative hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
            >
                <span className="material-symbols-outlined text-[20px]">notifications</span>
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[10px] font-bold rounded-full border-2 border-white dark:border-zinc-800 flex items-center justify-center transform translate-x-1/4 -translate-y-1/4">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 md:w-96 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-[#e5e7eb] dark:border-[#333] overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-4 border-b border-[#f0f2f5] dark:border-[#333] flex justify-between items-center">
                        <h3 className="font-bold text-sm dark:text-white">Notificaciones</h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllAsRead}
                                className="text-[10px] font-bold text-primary hover:underline uppercase tracking-wider"
                            >
                                Marcar todas como leídas
                            </button>
                        )}
                    </div>

                    <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                        {notifications.length === 0 ? (
                            <div className="p-10 text-center">
                                <span className="material-symbols-outlined text-4xl text-gray-200 mb-2">notifications_off</span>
                                <p className="text-xs text-[#60708a]">No tienes notificaciones pendientes</p>
                            </div>
                        ) : (
                            notifications.map((notif) => (
                                <div
                                    key={notif.id}
                                    onClick={() => handleNotificationClick(notif)}
                                    className={`p-4 border-b border-[#f0f2f5] dark:border-[#333] hover:bg-gray-50 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors relative flex gap-4 ${!notif.leida ? 'bg-primary/5 dark:bg-primary/5' : ''}`}
                                >
                                    {!notif.leida && (
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary"></div>
                                    )}
                                    <div className={`size-10 rounded-xl flex items-center justify-center shrink-0 ${getTypeStyles(notif.tipo)}`}>
                                        <span className="material-symbols-outlined text-xl">{getTypeIcon(notif.tipo)}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className={`text-sm mb-1 truncate ${!notif.leida ? 'font-bold dark:text-white' : 'text-[#60708a]'}`}>
                                            {notif.titulo}
                                        </h4>
                                        <p className="text-xs text-[#60708a] line-clamp-2 mb-2 leading-relaxed">
                                            {notif.mensaje}
                                        </p>
                                        <p className="text-[10px] font-medium text-slate-400">
                                            {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true, locale: es })}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="p-3 bg-gray-50 dark:bg-black/20 text-center">
                        <button className="text-[10px] font-bold text-[#60708a] hover:text-primary uppercase tracking-widest">
                            Ver todas las notificaciones
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationsMenu;
