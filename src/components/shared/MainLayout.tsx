import { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { supabase } from '../../lib/supabase';

const MainLayout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(false);

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

    // Cierra el drawer del sidebar en mobile al navegar a otra sección
    useEffect(() => {
        setSidebarOpen(false);
    }, [location.pathname]);

    return (
        <div className="flex min-h-screen overflow-hidden text-[#111418] font-display">
            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 md:hidden"
                    onClick={() => setSidebarOpen(false)}
                    aria-hidden="true"
                />
            )}
            <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
                <Navbar onMenuClick={() => setSidebarOpen(true)} />
                <main className="flex-1 overflow-y-auto bg-[#f8fafc] dark:bg-[#1a1a1a]">
                    <div className="p-4 sm:p-6 lg:p-8">
                        <Outlet />
                    </div>

                    <footer className="px-4 sm:px-8 py-4 text-[10px] text-[#60708a] flex flex-col sm:flex-row gap-2 justify-between items-start sm:items-center opacity-60">
                        <p>© 2024 Sistema Protección Derechos NnyA Municipal</p>
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
