import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

interface ProtectedRouteProps {
    children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
    const [loading, setLoading] = useState(true);
    const [authenticated, setAuthenticated] = useState(false);
    const location = useLocation();

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                setAuthenticated(!!session);
            } catch (error) {
                console.error('Error checking auth session:', error);
                setAuthenticated(false);
            } finally {
                setLoading(false);
            }
        };

        checkAuth();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setAuthenticated(!!session);
            setLoading(false);
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] dark:bg-[#1a1a1a]">
                <div className="flex flex-col items-center gap-4">
                    <div className="size-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                    <p className="text-sm font-bold text-slate-500 animate-pulse">Verificando sesión...</p>
                </div>
            </div>
        );
    }

    if (!authenticated) {
        // Redirect to login but save the current location to redirect back after login
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return <>{children}</>;
};

export default ProtectedRoute;
