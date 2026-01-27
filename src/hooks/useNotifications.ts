import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface Notification {
    id: string;
    titulo: string;
    mensaje: string;
    tipo: 'info' | 'warning' | 'success' | 'error';
    leida: boolean;
    link?: string;
    metadata?: any;
    created_at: string;
}

export const useNotifications = () => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);

    const fetchNotifications = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('notificaciones')
                .select('*')
                .eq('usuario_id', user.id)
                .order('created_at', { ascending: false })
                .limit(20);

            if (error) throw error;

            setNotifications(data || []);
            setUnreadCount(data?.filter(n => !n.leida).length || 0);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    const markAsRead = async (id: string) => {
        try {
            const { error } = await supabase
                .from('notificaciones')
                .update({ leida: true })
                .eq('id', id);

            if (error) throw error;

            setNotifications(prev => prev.map(n => n.id === id ? { ...n, leida: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    const markAllAsRead = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { error } = await supabase
                .from('notificaciones')
                .update({ leida: true })
                .eq('usuario_id', user.id)
                .eq('leida', false);

            if (error) throw error;

            setNotifications(prev => prev.map(n => ({ ...n, leida: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error('Error marking all as read:', error);
        }
    };

    useEffect(() => {
        fetchNotifications();

        // Subscribe to real-time changes
        const channel = supabase
            .channel('notificaciones-db-changes')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notificaciones'
                },
                (payload) => {
                    const newNotif = payload.new as Notification;
                    setNotifications(prev => [newNotif, ...prev.slice(0, 19)]);
                    if (!newNotif.leida) setUnreadCount(count => count + 1);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    return {
        notifications,
        unreadCount,
        loading,
        markAsRead,
        markAllAsRead,
        refresh: fetchNotifications
    };
};
