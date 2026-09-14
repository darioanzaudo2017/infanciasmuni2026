// React import removed
import NotificationsMenu from '../../features/NotificationsMenu';

interface NavbarProps {
    onMenuClick: () => void;
}

const Navbar = ({ onMenuClick }: NavbarProps) => {
    return (
        <header className="sticky top-0 z-10 bg-white dark:bg-[#1a1a1a] border-b border-[#f0f2f5] dark:border-[#333] px-4 sm:px-8 py-4 flex items-center gap-3 justify-between">
            <button
                onClick={onMenuClick}
                className="md:hidden shrink-0 p-2 rounded-lg bg-[#f0f2f5] dark:bg-zinc-800 text-[#111418] dark:text-white hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
                aria-label="Abrir menú"
            >
                <span className="material-symbols-outlined text-[20px]">menu</span>
            </button>
            <div className="flex items-center gap-6 flex-1 min-w-0 max-w-2xl">
                <div className="flex-1 min-w-0">
                    <label className="relative block group">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-[#60708a] group-focus-within:text-primary">
                            <span className="material-symbols-outlined text-[20px]">search</span>
                        </span>
                        <input
                            className="w-full bg-[#f0f2f5] dark:bg-zinc-800 border-none rounded-xl py-2.5 pl-11 pr-4 focus:ring-2 focus:ring-primary/20 text-sm placeholder:text-[#60708a] dark:text-white"
                            placeholder="Buscar por DNI o Número de Expediente (Ej: 24.582-X)"
                            type="text"
                        />
                    </label>
                </div>
            </div>
            <div className="flex items-center gap-3 ml-4 shrink-0">
                <NotificationsMenu />
                <button className="p-2 rounded-lg bg-[#f0f2f5] dark:bg-zinc-800 text-[#111418] dark:text-white hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors">
                    <span className="material-symbols-outlined text-[20px]">chat_bubble</span>
                </button>
            </div>
        </header>
    );
};

export default Navbar;
