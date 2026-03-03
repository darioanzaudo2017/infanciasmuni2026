import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';

interface Derecho {
    id: number;
    categoria: string;
    subcategoria: string;
}

interface DerechoFormDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    derecho?: Derecho | null;
    existingCategories: string[];
}

const DerechoFormDrawer: React.FC<DerechoFormDrawerProps> = ({
    isOpen,
    onClose,
    onSuccess,
    derecho,
    existingCategories
}) => {
    const [isSaving, setIsSaving] = useState(false);
    const [useCustomCategory, setUseCustomCategory] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        categoria: '',
        subcategoria: ''
    });

    useEffect(() => {
        if (isOpen) {
            if (derecho) {
                setFormData({
                    categoria: derecho.categoria,
                    subcategoria: derecho.subcategoria
                });
                setUseCustomCategory(!existingCategories.includes(derecho.categoria));
            } else {
                setFormData({
                    categoria: '',
                    subcategoria: ''
                });
                setUseCustomCategory(false);
            }
        }
    }, [isOpen, derecho, existingCategories]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.categoria || !formData.subcategoria) {
            alert('Por favor complete todos los campos');
            return;
        }

        setIsSaving(true);
        try {
            if (derecho?.id) {
                // MODAL EDICIÓN
                const { error } = await supabase
                    .from('catalogo_derechos')
                    .update({
                        categoria: formData.categoria,
                        subcategoria: formData.subcategoria
                    })
                    .eq('id', derecho.id);

                if (error) throw error;
                alert('Derecho actualizado exitosamente');
            } else {
                // MODO CREACIÓN
                const { error } = await supabase
                    .from('catalogo_derechos')
                    .insert([{
                        categoria: formData.categoria,
                        subcategoria: formData.subcategoria
                    }]);

                if (error) throw error;
                alert('Nuevo derecho agregado al catálogo');
            }

            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Error saving derecho:', error);
            alert(`Error al procesar la solicitud: ${error.message || 'Error desconocido'}`);
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <>
            <div
                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] transition-opacity"
                onClick={onClose}
            ></div>

            <div className="fixed top-0 right-0 h-full w-full max-w-[520px] bg-white dark:bg-[#112121] z-[101] shadow-2xl flex flex-col border-l border-[#dce5e5] dark:border-[#2d4141] transition-transform animate-slide-in-right">
                <div className="flex flex-col gap-1 p-6 border-b border-[#dce5e5] dark:border-[#2d4141]">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-[#111818] dark:text-white tracking-tight text-2xl font-bold leading-tight">
                                {derecho ? 'Editar Derecho' : 'Nuevo Derecho'}
                            </h2>
                            <p className="text-[#638888] dark:text-[#a3bdbd] text-sm font-normal leading-normal">
                                {derecho ? 'Modifique los datos del derecho seleccionado.' : 'Complete los datos para agregar una nueva categoría o subcategoría al catálogo.'}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                        >
                            <span className="material-symbols-outlined text-[#638888]">close</span>
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                    <form className="flex flex-col gap-8" id="derechoForm" onSubmit={handleSubmit}>
                        <section className="space-y-6">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-primary text-sm">category</span>
                                        <h3 className="text-[#111818] dark:text-white text-lg font-bold leading-tight tracking-[-0.015em]">Categoría</h3>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setUseCustomCategory(!useCustomCategory)}
                                        className="text-[10px] font-black text-primary hover:underline uppercase tracking-widest"
                                    >
                                        {useCustomCategory ? 'Seleccionar existente' : 'Escribir nueva'}
                                    </button>
                                </div>

                                {useCustomCategory ? (
                                    <input
                                        className="w-full rounded-lg text-[#111818] dark:text-white border border-[#dce5e5] dark:border-[#2a3a3a] bg-white dark:bg-[#1a2d2d] h-12 p-[12px] text-base font-normal focus:ring-2 focus:ring-primary outline-none transition-all"
                                        placeholder="Escriba la nueva categoría..."
                                        type="text"
                                        value={formData.categoria}
                                        onChange={e => setFormData({ ...formData, categoria: e.target.value })}
                                        required
                                    />
                                ) : (
                                    <div className="relative">
                                        <select
                                            className="appearance-none w-full rounded-lg text-[#111818] dark:text-white border border-[#dce5e5] dark:border-[#2a3a3a] bg-white dark:bg-[#1a2d2d] h-12 p-[12px] text-base font-normal focus:ring-2 focus:ring-primary outline-none transition-all"
                                            value={formData.categoria}
                                            onChange={e => setFormData({ ...formData, categoria: e.target.value })}
                                            required
                                        >
                                            <option value="">Seleccione una categoría</option>
                                            {existingCategories.map(cat => (
                                                <option key={cat} value={cat}>{cat}</option>
                                            ))}
                                        </select>
                                        <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[#638888] pointer-events-none">expand_more</span>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary text-sm">description</span>
                                    <h3 className="text-[#111818] dark:text-white text-lg font-bold leading-tight tracking-[-0.015em]">Subcategoría / Descripción</h3>
                                </div>
                                <textarea
                                    className="w-full rounded-lg text-[#111818] dark:text-white border border-[#dce5e5] dark:border-[#2a3a3a] bg-white dark:bg-[#1a2d2d] min-h-[140px] p-[12px] text-base font-normal focus:ring-2 focus:ring-primary outline-none transition-all resize-none"
                                    placeholder="Describa el derecho o vulneración específica..."
                                    value={formData.subcategoria}
                                    onChange={e => setFormData({ ...formData, subcategoria: e.target.value })}
                                    required
                                />
                            </div>
                        </section>
                    </form>
                </div>

                <div className="p-6 border-t border-[#dce5e5] dark:border-[#2d4141] flex gap-3 bg-white dark:bg-[#112121]">
                    <button
                        onClick={onClose}
                        type="button"
                        disabled={isSaving}
                        className="flex-1 px-4 py-3 rounded-lg border border-[#dce5e5] dark:border-[#2d4141] text-[#111818] dark:text-white font-bold text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
                        form="derechoForm"
                        disabled={isSaving}
                        className="flex-[2] px-4 py-3 rounded-lg bg-primary text-white font-bold text-sm shadow-lg shadow-primary/20 hover:brightness-105 active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                        {isSaving ? 'Guardando...' : (derecho ? 'Guardar Cambios' : 'Agregar Derecho')}
                    </button>
                </div>
            </div>
        </>
    );
};

export default DerechoFormDrawer;
