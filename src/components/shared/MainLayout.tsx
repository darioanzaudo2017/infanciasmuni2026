import { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { supabase } from '../../lib/supabase';

const MainLayout = () => {
    const navigate = useNavigate();

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'SIGNED_OUT') {
                navigate('/login', { replace: true });
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [navigate]);

    return (
        <div className="flex min-h-screen overflow-hidden text-[#111418] font-display">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
                <Navbar />
                <main className="flex-1 overflow-y-auto bg-[#f8fafc] dark:bg-[#1a1a1a]">
                    <div className="p-8">
                        <Outlet />
                    </div>

                    <footer className="px-8 py-4 text-[10px] text-[#60708a] flex justify-between items-center opacity-60">
                        <p>© 2024 SIPNNA - Sistema de Gestión de Protección Integral de Niñez, Adolescencia y Familia</p>
                        <div className="flex gap-4">
                            <span className="flex items-center gap-1">
                                <div className="size-1.5 bg-success rounded-full"></div>
                                Servidor Operativo
                            </span>
                            <span>Versión 2.4.0-stable</span>
                        </div>
                    </footer>
                </main>
            </div>
        </div>
    );
};

export default MainLayout;
