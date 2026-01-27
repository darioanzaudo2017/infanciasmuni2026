import { Link } from 'react-router-dom';

const RecoveryPage = () => {
    return (
        <div className="bg-background-light dark:bg-background-dark min-h-screen flex flex-col font-manrope transition-colors duration-300">
            {/* Top Navigation Bar */}
            <header className="w-full bg-white dark:bg-slate-900 border-b border-[#f0f4f4] dark:border-slate-800 transition-colors">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="size-8 text-primary-recovery">
                            <svg fill="currentColor" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                                <path clipRule="evenodd" d="M24 18.4228L42 11.475V34.3663C42 34.7796 41.7457 35.1504 41.3601 35.2992L24 42V18.4228Z" fillRule="evenodd"></path>
                                <path clipRule="evenodd" d="M24 8.18819L33.4123 11.574L24 15.2071L14.5877 11.574L24 8.18819ZM9 15.8487L21 20.4805V37.6263L9 32.9945V15.8487ZM27 37.6263V20.4805L39 15.8487V32.9945L27 37.6263ZM25.354 2.29885C24.4788 1.98402 23.5212 1.98402 22.646 2.29885L4.98454 8.65208C3.7939 9.08038 3 10.2097 3 11.475V34.3663C3 36.0196 4.01719 37.5026 5.55962 38.098L22.9197 44.7987C23.6149 45.0671 24.3851 45.0671 25.0803 44.7987L42.4404 38.098C43.9828 37.5026 45 36.0196 45 34.3663V11.475C45 10.2097 44.2061 9.08038 43.0155 8.65208L25.354 2.29885Z" fillRule="evenodd"></path>
                            </svg>
                        </div>
                        <h2 className="text-[#121717] dark:text-white text-xl font-extrabold tracking-tight">SIPNNA</h2>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="hidden md:inline text-sm text-[#658686] dark:text-slate-400 font-medium">República Argentina</span>
                        <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 mx-2"></div>
                        <Link to="/login" className="bg-primary-recovery hover:bg-primary-recovery/90 text-white px-5 py-2 rounded-lg text-sm font-bold transition-all shadow-sm">
                            Iniciar Sesión
                        </Link>
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-grow flex items-center justify-center p-6 sm:p-12">
                <div className="w-full max-w-[520px] transition-all">
                    {/* Branding/Illustration Placeholder */}
                    <div className="flex justify-center mb-8">
                        <div className="relative w-24 h-24 bg-primary-recovery/10 rounded-full flex items-center justify-center">
                            <span className="material-symbols-outlined text-primary-recovery text-5xl">lock_reset</span>
                        </div>
                    </div>
                    {/* Recovery Card */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-[#e2e8e8] dark:border-slate-800 overflow-hidden">
                        <div className="p-8">
                            {/* Headline Section */}
                            <div className="text-center mb-8">
                                <h1 className="text-2xl font-bold text-[#121717] dark:text-white mb-3">Recuperar Contraseña</h1>
                                <p className="text-[#658686] dark:text-slate-400 text-sm leading-relaxed">
                                    Ingrese su correo electrónico institucional y le enviaremos un enlace seguro para restablecer su contraseña.
                                </p>
                            </div>
                            {/* Form Section */}
                            <form className="space-y-6">
                                <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-[#121717] dark:text-slate-200" htmlFor="email">
                                        Correo electrónico institucional
                                    </label>
                                    <div className="relative group">
                                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl group-focus-within:text-primary-recovery transition-colors">mail</span>
                                        <input
                                            className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-800 border border-[#dce5e5] dark:border-slate-700 rounded-lg text-[#121717] dark:text-white focus:ring-2 focus:ring-primary-recovery/20 focus:border-primary-recovery outline-none transition-all placeholder:text-[#a0b0b0]"
                                            id="email"
                                            placeholder="ej. usuario@organismo.gob.ar"
                                            required
                                            type="email"
                                        />
                                    </div>
                                    <p className="text-[11px] text-[#658686] dark:text-slate-500 italic mt-1.5 flex items-center gap-1">
                                        <span className="material-symbols-outlined text-xs">info</span>
                                        Debe ser una cuenta oficial finalizada en @organismo.gob.ar
                                    </p>
                                </div>
                                <button
                                    className="w-full bg-primary-recovery hover:bg-primary-recovery/90 text-white font-bold py-3.5 rounded-lg transition-all shadow-md active:scale-[0.98] flex items-center justify-center gap-2"
                                    type="submit"
                                >
                                    <span>Enviar enlace de recuperación</span>
                                    <span className="material-symbols-outlined text-lg">arrow_forward</span>
                                </button>
                            </form>
                            {/* Alert / Info Box */}
                            <div className="mt-8 p-4 bg-primary-recovery/5 dark:bg-primary-recovery/10 border border-primary-recovery/10 rounded-lg flex gap-3">
                                <span className="material-symbols-outlined text-primary-recovery text-xl flex-shrink-0">verified_user</span>
                                <div className="space-y-1">
                                    <p className="text-xs font-bold text-primary-recovery">Seguridad del Sistema</p>
                                    <p className="text-xs text-primary-recovery/80 leading-snug">
                                        Por motivos de seguridad, si la dirección no pertenece a nuestro registro institucional, no se enviará ningún correo.
                                    </p>
                                </div>
                            </div>
                        </div>
                        {/* Footer Link */}
                        <div className="px-8 py-5 bg-background-light dark:bg-slate-800/50 border-t border-[#f0f4f4] dark:border-slate-800 text-center">
                            <Link to="/login" className="text-primary-recovery hover:text-primary-recovery/80 text-sm font-bold flex items-center justify-center gap-2 group transition-all">
                                <span className="material-symbols-outlined text-lg group-hover:-translate-x-1 transition-transform">arrow_back</span>
                                Volver al inicio de sesión
                            </Link>
                        </div>
                    </div>
                    {/* Institutional Footer */}
                    <div className="mt-10 text-center space-y-4">
                        <div className="flex justify-center items-center gap-6 opacity-60 grayscale hover:grayscale-0 transition-all duration-300">
                            <div className="w-16 h-12 bg-slate-200 dark:bg-slate-700 rounded-sm flex items-center justify-center">
                                <span className="text-[10px] font-bold text-slate-500">ESCUDO NACIONAL</span>
                            </div>
                            <div className="w-24 h-8 bg-slate-200 dark:bg-slate-700 rounded-sm flex items-center justify-center">
                                <span className="text-[10px] font-bold text-slate-500">ARGENTINA.GOB.AR</span>
                            </div>
                        </div>
                        <p className="text-[11px] text-[#658686] dark:text-slate-500 font-medium tracking-wide uppercase">
                            Secretaría de Niñez, Adolescencia y Familia
                        </p>
                    </div>
                </div>
            </main>
            {/* Decorative Elements (Abstract Patterns) */}
            <div className="fixed bottom-0 left-0 w-full h-1 bg-gradient-to-r from-primary-recovery/10 via-primary-recovery to-primary-recovery/10"></div>
        </div>
    );
};

export default RecoveryPage;
