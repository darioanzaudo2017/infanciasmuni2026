import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import Breadcrumbs from '../../../components/ui/Breadcrumbs';
import DerechoFormDrawer from './DerechoFormDrawer';

interface Derecho {
    id: number;
    categoria: string;
    subcategoria: string;
}

const DerechosManagementPage: React.FC = () => {
    const [derechos, setDerechos] = useState<Derecho[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [selectedDerecho, setSelectedDerecho] = useState<Derecho | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('Todas');

    const fetchDerechos = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('catalogo_derechos')
                .select('*')
                .order('categoria', { ascending: true })
                .order('subcategoria', { ascending: true });

            if (error) throw error;
            setDerechos(data || []);
        } catch (error) {
            console.error('Error fetching derechos:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void fetchDerechos();
    }, []);

    const categories = ['Todas', ...Array.from(new Set(derechos.map(d => d.categoria)))];

    const filteredDerechos = derechos.filter(d => {
        const matchesSearch = d.subcategoria.toLowerCase().includes(searchTerm.toLowerCase()) ||
            d.categoria.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === 'Todas' || d.categoria === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const handleEdit = (derecho: Derecho) => {
        setSelectedDerecho(derecho);
        setIsDrawerOpen(true);
    };

    const handleNew = () => {
        setSelectedDerecho(null);
        setIsDrawerOpen(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-[#121717] dark:text-white">
                        <span className="material-symbols-outlined text-primary text-3xl">gavel</span>
                        <h2 className="text-xl font-bold leading-tight tracking-tight">Catálogo de Derechos Vulnerados</h2>
                    </div>
                    <button
                        onClick={handleNew}
                        className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-sm"
                    >
                        <span className="material-symbols-outlined text-xl">add</span>
                        <span>Nuevo Derecho</span>
                    </button>
                </div>

                <Breadcrumbs
                    items={[
                        { label: 'Administración' },
                        { label: 'Catálogo de Derechos', active: true }
                    ]}
                />

                <div className="flex flex-wrap items-center gap-4 bg-white dark:bg-zinc-900 p-4 rounded-xl border border-[#dce5e5] dark:border-[#333] shadow-sm">
                    <div className="flex-1 min-w-[200px] relative">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#658686] text-xl">search</span>
                        <input
                            type="text"
                            placeholder="Buscar por derecho o categoría..."
                            className="w-full pl-10 pr-4 h-11 rounded-lg border-[#dce5e5] dark:border-[#333] bg-[#f8fafc] dark:bg-zinc-800 focus:ring-2 focus:ring-primary font-medium text-sm transition-all outline-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-[#658686] dark:text-[#a0b0b0]">Filtrar Categoría:</span>
                        <select
                            className="h-11 px-4 rounded-lg bg-[#f0f4f4] dark:bg-zinc-800 border-none text-sm font-medium dark:text-white focus:ring-2 focus:ring-primary outline-none transition-all"
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                        >
                            {categories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>

                    {(searchTerm || selectedCategory !== 'Todas') && (
                        <button
                            onClick={() => { setSearchTerm(''); setSelectedCategory('Todas'); }}
                            className="text-primary text-xs font-bold uppercase tracking-wider hover:underline"
                        >
                            Limpiar Filtros
                        </button>
                    )}
                </div>

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
                                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider w-16 text-center">ID</th>
                                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Categoría de Derecho</th>
                                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Subcategoría / Descripción</th>
                                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#dce5e5] dark:divide-[#333]">
                                    {filteredDerechos.map((d) => (
                                        <tr key={d.id} className="hover:bg-[#f6f8f8] dark:hover:bg-zinc-800 transition-colors group">
                                            <td className="px-6 py-4 text-center">
                                                <span className="text-[10px] font-bold text-[#658686] bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded">
                                                    {d.id}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-black uppercase tracking-tight text-primary">{d.categoria}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-sm font-medium leading-relaxed max-w-2xl">{d.subcategoria}</p>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => handleEdit(d)}
                                                    className="text-[#658686] dark:text-[#a0b0b0] hover:text-primary transition-colors p-2 rounded-lg"
                                                    title="Editar Derecho"
                                                >
                                                    <span className="material-symbols-outlined">edit</span>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredDerechos.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-20 text-center text-[#658686]">No se encontraron derechos en este catálogo</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                    <div className="px-6 py-4 border-t border-[#dce5e5] dark:border-[#333] flex items-center justify-between bg-[#f6f8f8] dark:bg-zinc-800/50">
                        <p className="text-xs font-medium text-[#658686] dark:text-[#a0b0b0]">
                            Mostrando <span className="text-[#121717] dark:text-white font-bold">{filteredDerechos.length}</span> registros de un total de {derechos.length}
                        </p>
                    </div>
                </div>
            </div>

            <DerechoFormDrawer
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                onSuccess={fetchDerechos}
                derecho={selectedDerecho}
                existingCategories={Array.from(new Set(derechos.map(d => d.categoria)))}
            />
        </div>
    );
};

export default DerechosManagementPage;
