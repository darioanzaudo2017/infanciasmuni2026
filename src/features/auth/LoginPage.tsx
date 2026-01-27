import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

const LoginPage: React.FC = () => {
    const [showPassword, setShowPassword] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { error: authError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (authError) throw authError;
            navigate('/');
        } catch (err: any) {
            setError(err.message || 'Error al iniciar sesión');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="font-display bg-background-light dark:bg-background-dark min-h-screen flex items-center justify-center overflow-hidden">
            <div className="flex w-full min-h-screen">
                {/* Left Panel: Brand & Illustration */}
                <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 bg-primary">
                    {/* Background Image with Overlay */}
                    <div className="absolute inset-0 z-0">
                        <img
                            alt="Infancia y Protección"
                            className="w-full h-full object-cover opacity-20 mix-blend-overlay"
                            src="https://lh3.googleusercontent.com/aida-public/AB6AXuD_sasQ4arnsvAt5GV0s3zwkpjGNO5abdaEP-Y3XhO92Y89lWxAY5sXnNJFRuCQGMQp9yZXKKe2S4OjoGAXj3RF4bWiE-gC4TunZ8NGpnft9645IVsPJf_lW8PSoZY6g9FlEnpiztBkG6DFOAWyvFPd4gSyO4AplT7_Nll2TzQbNJFTOClpKMNzRy5qDZl1MQeOdF3CcVw6-dqXlf5NGf5XdARf0OzgjeKEX7DN7T93QOpxNkjvd9XknOXx5-MLgC4hIjQZCaQVwGvt"
                        />
                    </div>
                    {/* Logo Section */}
                    <div className="relative z-10 flex items-center gap-4">
                        <div className="bg-white p-3 rounded-xl shadow-lg">
                            <img
                                alt="Logo Gobierno"
                                className="h-12 w-auto"
                                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBaBp-IqwT7DxqaAorMlCuyVUdQVgdn-c5mqwp2Ri-1g3P_mqOTgV9Rk-czw0ZIE0609DpzycdR7m5wwmvF7ZyN8dcERGvIZFjBovgN4TSHOINznjUgnbYTrBw9tR72GtcsRTCzVeu94dr1Ozo9IIvEhDWy3h0K9d0Z4jVj8CfzwlNF3W6u1EIfZwzjb8fO1r8rzya219xAb5mwsRQqNY8U2JHzj5hs4wZ3qQEBYEogyNxGcOL2HNAbyrwtIFUO8Z7yQfoUz9OZGED1"
                            />
                        </div>
                        <div className="text-white border-l-2 border-white/30 pl-4">
                            <h2 className="text-2xl font-bold tracking-tight">SIPNNA</h2>
                            <p className="text-xs font-medium uppercase tracking-widest opacity-80">República Argentina</p>
                        </div>
                    </div>
                    {/* Content Section */}
                    <div className="relative z-10 max-w-lg">
                        <h1 className="text-5xl font-extrabold text-white leading-tight mb-6">
                            Protegiendo el futuro de nuestras infancias.
                        </h1>
                        <p className="text-xl text-blue-50/90 leading-relaxed">
                            Sistema de Gestión de Protección de Derechos de Niñas, Niños y Adolescentes. Una herramienta federal para la garantía de derechos.
                        </p>
                    </div>
                    {/* Footer Section */}
                    <div className="relative z-10 text-white/60 text-sm flex gap-6">
                        <span>© 2024 SIPNNA</span>
                        <a className="hover:text-white transition-colors" href="#">Términos y Condiciones</a>
                        <a className="hover:text-white transition-colors" href="#">Privacidad</a>
                    </div>
                </div>

                {/* Right Panel: Login Form */}
                <div className="w-full lg:w-1/2 flex flex-col justify-center items-center px-6 sm:px-12 lg:px-24 bg-background-light dark:bg-background-dark text-slate-800 dark:text-white">
                    <div className="w-full max-w-md">
                        {/* Mobile Header (Hidden on Desktop) */}
                        <div className="lg:hidden mb-10 flex flex-col items-center text-center">
                            <img
                                alt="Logo Gobierno"
                                className="h-16 w-auto mb-4"
                                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDHdmJ8KobT6ubLHNpUsRpa1jKv3IMS7h5vU6nN_NOz487HrOTGCTMvWTk3meLnzXehWMHmf-LAgRiFueMxSCp9UpxQcEVbcx7BTWkLBop0uY-pZqqIT_bF1ahFdpjQ4FsCyqs1fN_18_y9ra2Xym5VhB2kggd5-Dqbw066sWvm0pl6mF6X0TwU-xB-Cswc70crcx05u5hSaMrNtrqTU0JZgh89hRFy-VdEk3vz7gX454FKgKY8uZB3uGNzYqv708XhCc4xKOvZPG8A"
                            />
                            <h2 className="text-3xl font-bold">SIPNNA</h2>
                        </div>
                        {/* Form Header */}
                        <div className="mb-8">
                            <h3 className="text-2xl font-bold mb-2 text-slate-800 dark:text-white">Acceso al Sistema</h3>
                            <p className="text-slate-500 dark:text-slate-400">Por favor, ingrese sus credenciales para continuar.</p>
                        </div>

                        <form className="space-y-6" onSubmit={handleSubmit}>
                            {error && (
                                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3 text-red-600 dark:text-red-400 text-sm animate-in fade-in zoom-in duration-300">
                                    <span className="material-icons text-lg">error_outline</span>
                                    <p className="font-medium">{error}</p>
                                </div>
                            )}

                            {/* Email Field */}
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300" htmlFor="email">Correo Electrónico</label>
                                <div className="relative text-slate-400">
                                    <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2">mail_outline</span>
                                    <input
                                        className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none text-slate-800 dark:text-white placeholder-slate-400"
                                        id="email"
                                        name="email"
                                        placeholder="ejemplo@dominio.gob.ar"
                                        required
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        disabled={loading}
                                    />
                                </div>
                            </div>
                            {/* Password Field */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300" htmlFor="password">Contraseña</label>
                                    <Link className="text-xs font-semibold text-primary hover:underline transition-all" to="/recuperar-password">¿Olvidó su contraseña?</Link>
                                </div>
                                <div className="relative text-slate-400">
                                    <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2">lock_outline</span>
                                    <input
                                        className="w-full pl-10 pr-12 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none text-slate-800 dark:text-white placeholder-slate-400"
                                        id="password"
                                        name="password"
                                        placeholder="••••••••"
                                        required
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        disabled={loading}
                                    />
                                    <button
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        disabled={loading}
                                    >
                                        <span className="material-icons text-xl">{showPassword ? "visibility_off" : "visibility"}</span>
                                    </button>
                                </div>
                            </div>
                            {/* Remember Me */}
                            <div className="flex items-center">
                                <input
                                    className="w-4 h-4 text-primary bg-white border-slate-300 rounded focus:ring-primary focus:ring-offset-0"
                                    id="remember"
                                    name="remember"
                                    type="checkbox"
                                />
                                <label className="ml-2 text-sm text-slate-600 dark:text-slate-400 cursor-pointer" htmlFor="remember">Mantener sesión iniciada</label>
                            </div>
                            {/* Submit Button */}
                            <button
                                className={`w-full bg-primary hover:bg-blue-600 text-white font-bold py-3.5 rounded-lg shadow-lg shadow-primary/25 transition-all flex items-center justify-center gap-2 group ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                                type="submit"
                                disabled={loading}
                            >
                                {loading ? (
                                    <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    <>
                                        <span>Iniciar Sesión</span>
                                        <span className="material-icons group-hover:translate-x-1 transition-transform">arrow_forward</span>
                                    </>
                                )}
                            </button>
                        </form>
                        {/* Help Link */}
                        <div className="mt-12 pt-8 border-t border-slate-100 dark:border-slate-800 text-center">
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                ¿Necesita asistencia técnica?
                                <a className="text-primary font-semibold hover:underline" href="#">Contactar soporte</a>
                            </p>
                        </div>
                        {/* Accessibility/Security Badges */}
                        <div className="mt-8 flex justify-center gap-8 grayscale opacity-50 dark:invert">
                            <div className="flex items-center gap-1">
                                <span className="material-icons text-lg">security</span>
                                <span className="text-[10px] font-bold uppercase tracking-tighter">Conexión Segura</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="material-icons text-lg">verified_user</span>
                                <span className="text-[10px] font-bold uppercase tracking-tighter">Datos Protegidos</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
