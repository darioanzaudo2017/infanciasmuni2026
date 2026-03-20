import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

const SetPasswordPage = () => {
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        // Verificar si hay una sesión activa (Supabase la detecta automáticamente del hash de la URL)
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                // Si no hay sesión, podría ser que el link expiró o es inválido
                console.warn("No se detectó sesión activa en el redireccionamiento.");
            }
        };
        checkSession();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden');
            return;
        }

        if (password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres');
            return;
        }

        setLoading(true);

        try {
            const { error: updateError } = await supabase.auth.updateUser({
                password: password
            });

            if (updateError) throw updateError;

            setSuccess(true);
            // Redirigir al login después de 3 segundos
            setTimeout(() => {
                navigate('/login');
            }, 3000);

        } catch (err: any) {
            console.error("Error actualizando contraseña:", err);
            setError(err.message || 'Error al actualizar la contraseña');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="bg-background-light dark:bg-background-dark min-h-screen flex items-center justify-center p-6">
                <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-xl max-w-md w-full text-center animate-zoom-in">
                    <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6 text-green-600 dark:text-green-400">
                        <span className="material-symbols-outlined text-5xl">check_circle</span>
                    </div>
                    <h2 className="text-2xl font-bold mb-4 dark:text-white">¡Contraseña Activada!</h2>
                    <p className="text-[#658686] dark:text-slate-400 mb-8">
                        Tu cuenta ha sido configurada correctamente. Serás redirigido al inicio de sesión en unos momentos.
                    </p>
                    <button 
                        onClick={() => navigate('/login')}
                        className="text-primary font-bold hover:underline"
                    >
                        Ir al Login ahora
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-background-light dark:bg-background-dark min-h-screen flex flex-col font-manrope">
            <header className="w-full bg-white dark:bg-slate-900 border-b border-[#f0f4f4] dark:border-slate-800 h-16 flex items-center px-6">
                <div className="max-w-7xl mx-auto w-full flex items-center gap-3">
                    <div className="size-8 text-primary">
                        <svg fill="currentColor" viewBox="0 0 48 48">
                            <path d="M24 18.4228L42 11.475V34.3663C42 34.7796 41.7457 35.1504 41.3601 35.2992L24 42V18.4228Z" />
                        </svg>
                    </div>
                    <h2 className="text-[#121717] dark:text-white text-xl font-extrabold tracking-tight">SIPNNA</h2>
                </div>
            </header>

            <main className="flex-grow flex items-center justify-center p-6 sm:p-12">
                <div className="w-full max-w-[460px]">
                    <div className="text-center mb-10">
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/10 rounded-3xl mb-6">
                            <span className="material-symbols-outlined text-primary text-4xl">key</span>
                        </div>
                        <h1 className="text-3xl font-bold text-[#121717] dark:text-white mb-3">Configurar Contraseña</h1>
                        <p className="text-[#658686] dark:text-slate-400">
                            Por favor, define una contraseña segura para tu nueva cuenta institucional.
                        </p>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 shadow-sm border border-[#e2e8e8] dark:border-slate-800">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-[#121717] dark:text-slate-200">
                                    Nueva Contraseña
                                </label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all dark:text-white"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-[#121717] dark:text-slate-200">
                                    Confirmar Contraseña
                                </label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all dark:text-white"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>

                            {error && (
                                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-lg text-red-600 dark:text-red-400 text-sm flex items-center gap-2">
                                    <span className="material-symbols-outlined text-lg">error</span>
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/25 disabled:opacity-50 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                            >
                                {loading ? 'Actualizando...' : 'Activar Cuenta'}
                                {!loading && <span className="material-symbols-outlined">verified</span>}
                            </button>
                        </form>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default SetPasswordPage;
