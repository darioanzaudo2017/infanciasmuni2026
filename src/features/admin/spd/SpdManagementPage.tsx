import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '../../../lib/supabase';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import Breadcrumbs from '../../../components/ui/Breadcrumbs';

// Interface matching the schema for servicios_proteccion
export interface SpdRow {
    id: number;
    nombre: string;
    telefono: string | null;
    email: string | null;
    direccion: string | null;
    zona_id: number | null;
    carpeta_drive_id: string | null;
    zonas: {
        id: number;
        nombre: string;
    } | null;
    usuarios: {
        count: number;
    }[] | null;
}

export interface ZonaRow {
    id: number;
    nombre: string;
    created_at?: string;
}

// Zod Validation Schema for form fields (all inputs start as string types)
const spdSchema = z.object({
    nombre: z.string()
        .min(3, 'El nombre debe tener al menos 3 caracteres')
        .max(200, 'El nombre es demasiado largo'),
    zona_id: z.string().refine(val => {
        const n = Number(val);
        return !isNaN(n) && n > 0;
    }, {
        message: 'Debe seleccionar una zona válida'
    }),
    direccion: z.string().optional(),
    telefono: z.string().optional(),
    email: z.string()
        .optional()
        .refine(val => !val || z.string().email().safeParse(val).success, {
            message: 'Formato de correo electrónico inválido'
        })
});

type SpdFormData = z.infer<typeof spdSchema>;

const SpdManagementPage: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedZonaFilter, setSelectedZonaFilter] = useState<string>('all');
    
    // Data States
    const [zonas, setZonas] = useState<ZonaRow[]>([]);
    const [spds, setSpds] = useState<SpdRow[]>([]);
    const [isLoadingZonas, setIsLoadingZonas] = useState(false);
    const [isLoadingSpds, setIsLoadingSpds] = useState(false);
    const [spdLoadError, setSpdLoadError] = useState<any>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // UI Drawer and Confirm Dialog States
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [editingSpd, setEditingSpd] = useState<SpdRow | null>(null);
    const [deleteConfirmSpd, setDeleteConfirmSpd] = useState<SpdRow | null>(null);
    
    // Inline notifications
    const [globalMessage, setGlobalMessage] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);
    const [formMessage, setFormMessage] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);

    // React Hook Form Setup
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors }
    } = useForm<SpdFormData>({
        resolver: zodResolver(spdSchema),
        defaultValues: {
            nombre: '',
            zona_id: '0',
            direccion: '',
            telefono: '',
            email: ''
        }
    });

    // Fetch Zonas
    const fetchZonas = async () => {
        setIsLoadingZonas(true);
        try {
            const { data, error } = await supabase
                .from('zonas')
                .select('id, nombre')
                .order('id');
            if (error) throw error;
            setZonas(data || []);
        } catch (err) {
            console.error('Error fetching zonas:', err);
        } finally {
            setIsLoadingZonas(false);
        }
    };

    // Fetch SPDs with relational Zona and count of assigned Users
    const fetchSpds = async () => {
        setIsLoadingSpds(true);
        setSpdLoadError(null);
        try {
            const { data, error } = await supabase
                .from('servicios_proteccion')
                .select(`
                    *,
                    zonas(id, nombre),
                    usuarios(count)
                `)
                .order('nombre');
            
            if (error) throw error;
            setSpds((data as unknown as SpdRow[]) || []);
        } catch (err: any) {
            console.error('Error fetching spds:', err);
            setSpdLoadError(err);
        } finally {
            setIsLoadingSpds(false);
        }
    };

    // Load data on mount
    useEffect(() => {
        void fetchZonas();
        void fetchSpds();
    }, []);

    // Open Drawer to Create
    const handleNewClick = () => {
        setEditingSpd(null);
        setFormMessage(null);
        reset({
            nombre: '',
            zona_id: '0',
            direccion: '',
            telefono: '',
            email: ''
        });
        setIsDrawerOpen(true);
    };

    // Open Drawer to Edit
    const handleEditClick = (spd: SpdRow) => {
        setEditingSpd(spd);
        setFormMessage(null);
        reset({
            nombre: spd.nombre,
            zona_id: String(spd.zona_id || 0),
            direccion: spd.direccion || '',
            telefono: spd.telefono || '',
            email: spd.email || ''
        });
        setIsDrawerOpen(true);
    };

    // Submit Form (Create / Edit)
    const onSubmit = async (data: SpdFormData) => {
        setFormMessage(null);
        setIsSubmitting(true);

        const payload = {
            nombre: data.nombre.trim(),
            zona_id: Number(data.zona_id),
            direccion: data.direccion?.trim() || null,
            telefono: data.telefono?.trim() || null,
            email: data.email?.trim() || null
        };

        try {
            if (editingSpd) {
                // UPDATE
                const { error } = await supabase
                    .from('servicios_proteccion')
                    .update(payload)
                    .eq('id', editingSpd.id);
                
                if (error) throw error;

                setGlobalMessage({ type: 'success', text: 'El SPD se ha actualizado con éxito.' });
                setIsDrawerOpen(false);
                setEditingSpd(null);
                reset();
                setTimeout(() => setGlobalMessage(null), 5000);
            } else {
                // INSERT
                const { error } = await supabase
                    .from('servicios_proteccion')
                    .insert([payload]);

                if (error) throw error;

                setGlobalMessage({ type: 'success', text: 'El SPD se ha creado con éxito.' });
                setIsDrawerOpen(false);
                reset();
                setTimeout(() => setGlobalMessage(null), 5000);
            }
            void fetchSpds();
        } catch (err: any) {
            console.error('Error submitting spd:', err);
            setFormMessage({ type: 'danger', text: err.message || 'Ocurrió un error al intentar guardar el SPD.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Confirm and Delete
    const handleDeleteExecute = async () => {
        if (!deleteConfirmSpd) return;
        
        const userCount = getUserCount(deleteConfirmSpd);
            
        if (userCount > 0) {
            setGlobalMessage({ type: 'danger', text: 'No se puede eliminar un SPD con usuarios asignados.' });
            setDeleteConfirmSpd(null);
            return;
        }

        setIsDeleting(true);
        try {
            const { error } = await supabase
                .from('servicios_proteccion')
                .delete()
                .eq('id', deleteConfirmSpd.id);

            if (error) throw error;

            setGlobalMessage({ type: 'success', text: 'El SPD se ha eliminado con éxito.' });
            setDeleteConfirmSpd(null);
            setTimeout(() => setGlobalMessage(null), 5000);
            void fetchSpds();
        } catch (err: any) {
            console.error('Error deleting spd:', err);
            setGlobalMessage({ type: 'danger', text: err.message || 'No se pudo eliminar el SPD.' });
            setDeleteConfirmSpd(null);
            setTimeout(() => setGlobalMessage(null), 5000);
        } finally {
            setIsDeleting(false);
        }
    };

    // Filtering logic
    const filteredSpds = spds.filter((spd) => {
        // Name Search
        const matchesSearch = spd.nombre.toLowerCase().includes(searchTerm.toLowerCase().trim());
        
        // Zone Filter
        const matchesZona = selectedZonaFilter === 'all' || String(spd.zona_id) === selectedZonaFilter;

        return matchesSearch && matchesZona;
    });

    // Helper for Zone Badge styling (Curated harmonious color palette)
    const getZoneBadgeVariant = (zonaId: number | null) => {
        switch (zonaId) {
            case 1:
                return 'primary'; // Blue-ish
            case 2:
                return 'info'; // Cyan-ish
            case 3:
                return 'warning'; // Amber/Yellow-ish
            case 4:
                return 'success'; // Green/Teal-ish
            default:
                return 'neutral'; // Grey
        }
    };

    // Helper to extract user counts safely
    const getUserCount = (spd: SpdRow): number => {
        if (!spd.usuarios) return 0;
        if (Array.isArray(spd.usuarios)) {
            return spd.usuarios[0]?.count ?? 0;
        }
        return (spd.usuarios as any).count ?? 0;
    };

    return (
        <div className="space-y-6">
            {/* Header section */}
            <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-[#121717] dark:text-white">
                        <span className="material-symbols-outlined text-primary text-3xl">home_work</span>
                        <div>
                            <h2 className="text-xl font-bold leading-tight tracking-tight">Servicios de Protección de Derechos (SPD)</h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Gestión de sedes territoriales y su asignación de zonas municipales.</p>
                        </div>
                    </div>
                    <Button
                        onClick={handleNewClick}
                        variant="primary"
                        className="flex items-center gap-2 text-sm font-bold shadow-sm"
                    >
                        <span className="material-symbols-outlined text-lg">add_circle</span>
                        <span>Nuevo SPD</span>
                    </Button>
                </div>

                {/* Breadcrumbs */}
                <Breadcrumbs
                    items={[
                        { label: 'Administración' },
                        { label: 'Configuración SPD', active: true }
                    ]}
                />

                {/* Global Messages (Inline) */}
                {globalMessage && (
                    <div className={`p-4 rounded-xl border flex items-start gap-3 animate-fade-in ${
                        globalMessage.type === 'success' 
                            ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300' 
                            : 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-300'
                    }`}>
                        <span className="material-symbols-outlined mt-0.5">
                            {globalMessage.type === 'success' ? 'check_circle' : 'error'}
                        </span>
                        <div className="flex-1 text-sm font-semibold">
                            {globalMessage.text}
                        </div>
                        <button 
                            onClick={() => setGlobalMessage(null)}
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                        >
                            <span className="material-symbols-outlined text-lg">close</span>
                        </button>
                    </div>
                )}

                {/* Filter and Search Bar */}
                <div className="flex flex-wrap items-center gap-4 bg-white dark:bg-zinc-900 p-4 rounded-xl border border-[#dce5e5] dark:border-zinc-800 shadow-sm">
                    {/* Search by Name */}
                    <div className="relative flex-1 min-w-[260px] max-w-md">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                            <span className="material-symbols-outlined text-[#658686] dark:text-[#a0b0b0] text-xl">search</span>
                        </span>
                        <input
                            type="text"
                            placeholder="Buscar SPD por nombre..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-10 py-2 text-sm rounded-lg border border-[#dce5e5] dark:border-zinc-700 bg-[#f0f4f4] dark:bg-zinc-800 text-slate-800 dark:text-white placeholder-[#658686] dark:placeholder-[#a0b0b0]/60 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="absolute inset-y-0 right-0 flex items-center pr-3 text-[#658686] hover:text-slate-800 dark:hover:text-white transition-colors"
                                title="Limpiar búsqueda"
                            >
                                <span className="material-symbols-outlined text-lg">close</span>
                            </button>
                        )}
                    </div>

                    <div className="h-6 w-[1px] bg-[#dce5e5] dark:bg-zinc-800 hidden md:block"></div>

                    {/* Zone Dropdown filter */}
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-[#658686] dark:text-[#a0b0b0] shrink-0">Zona:</span>
                        <select
                            value={selectedZonaFilter}
                            onChange={(e) => setSelectedZonaFilter(e.target.value)}
                            className="px-3 py-1.5 text-sm rounded-lg border border-[#dce5e5] dark:border-zinc-700 bg-[#f0f4f4] dark:bg-zinc-800 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                        >
                            <option value="all">Todas las Zonas</option>
                            {isLoadingZonas ? (
                                <option disabled>Cargando zonas...</option>
                            ) : (
                                zonas.map((zona) => (
                                    <option key={zona.id} value={String(zona.id)}>
                                        {zona.nombre}
                                    </option>
                                ))
                            )}
                        </select>
                    </div>

                    {(searchTerm || selectedZonaFilter !== 'all') && (
                        <button
                            onClick={() => {
                                setSearchTerm('');
                                setSelectedZonaFilter('all');
                            }}
                            className="ml-auto text-primary text-xs font-bold uppercase tracking-wider hover:underline transition-colors"
                        >
                            Limpiar Filtros
                        </button>
                    )}
                </div>

                {/* Table Section */}
                <div className="bg-white dark:bg-zinc-900 rounded-xl border border-[#dce5e5] dark:border-zinc-800 shadow-sm overflow-hidden text-slate-800 dark:text-white min-h-[300px]">
                    {isLoadingSpds || isLoadingZonas ? (
                        <div className="flex flex-col items-center justify-center p-20 gap-4">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                            <span className="text-sm text-slate-500 dark:text-slate-400">Cargando servicios de protección...</span>
                        </div>
                    ) : spdLoadError ? (
                        <div className="flex flex-col items-center justify-center p-20 gap-4 text-rose-500">
                            <span className="material-symbols-outlined text-4xl">error</span>
                            <span className="text-sm font-semibold">Error al obtener los SPD. Intente nuevamente.</span>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-[#f0f4f4]/50 dark:bg-zinc-800/40 text-[#121717] dark:text-white border-b border-[#dce5e5] dark:border-zinc-800">
                                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Nombre</th>
                                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Zona</th>
                                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Dirección</th>
                                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Teléfono</th>
                                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Email</th>
                                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-center">Usuarios</th>
                                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#dce5e5] dark:divide-zinc-800">
                                    {filteredSpds.map((spd) => {
                                        const userCount = getUserCount(spd);
                                        const isDeletable = userCount === 0;
                                        
                                        return (
                                            <tr 
                                                key={spd.id} 
                                                className="hover:bg-[#f6f8f8] dark:hover:bg-zinc-800/50 transition-colors group"
                                            >
                                                {/* Nombre */}
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                                            <span className="material-symbols-outlined text-sm">home_work</span>
                                                        </div>
                                                        <span className="text-sm font-semibold text-slate-800 dark:text-white">
                                                            {spd.nombre}
                                                        </span>
                                                    </div>
                                                </td>

                                                {/* Zona Badge */}
                                                <td className="px-6 py-4">
                                                    {spd.zonas ? (
                                                        <Badge variant={getZoneBadgeVariant(spd.zona_id)}>
                                                            {spd.zonas.nombre}
                                                        </Badge>
                                                    ) : (
                                                        <span className="text-xs text-slate-400 dark:text-slate-500 italic">Sin Zona</span>
                                                    )}
                                                </td>

                                                {/* Dirección */}
                                                <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                                                    {spd.direccion || <span className="text-slate-300 dark:text-slate-600 italic">—</span>}
                                                </td>

                                                {/* Teléfono */}
                                                <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                                                    {spd.telefono || <span className="text-slate-300 dark:text-slate-600 italic">—</span>}
                                                </td>

                                                {/* Email */}
                                                <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                                                    {spd.email || <span className="text-slate-300 dark:text-slate-600 italic">—</span>}
                                                </td>

                                                {/* Usuarios */}
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`inline-flex items-center justify-center px-2.5 py-1 text-xs font-bold rounded-full ${
                                                        userCount > 0 
                                                            ? 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-zinc-700' 
                                                            : 'bg-slate-50 dark:bg-zinc-900/30 text-slate-400 border border-slate-100 dark:border-zinc-800'
                                                    }`}>
                                                        {userCount}
                                                    </span>
                                                </td>

                                                {/* Acciones */}
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end gap-1.5">
                                                        <button
                                                            onClick={() => handleEditClick(spd)}
                                                            className="text-slate-500 dark:text-[#a0b0b0] hover:text-primary dark:hover:text-primary transition-colors p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800"
                                                            title="Editar SPD"
                                                        >
                                                            <span className="material-symbols-outlined text-xl">edit</span>
                                                        </button>

                                                        <div className="relative inline-block" title={!isDeletable ? "No se puede eliminar un SPD con usuarios asignados" : undefined}>
                                                            <button
                                                                onClick={() => setDeleteConfirmSpd(spd)}
                                                                disabled={!isDeletable}
                                                                className={`p-1.5 rounded-lg transition-colors ${
                                                                    isDeletable
                                                                        ? 'text-slate-500 dark:text-[#a0b0b0] hover:text-danger dark:hover:text-danger hover:bg-rose-50 dark:hover:bg-rose-950/20'
                                                                        : 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
                                                                }`}
                                                            >
                                                                 <span className="material-symbols-outlined text-xl">delete</span>
                                                            </button>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}

                                    {filteredSpds.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="px-6 py-20 text-center text-slate-500 dark:text-slate-400">
                                                {searchTerm || selectedZonaFilter !== 'all' 
                                                    ? 'No se encontraron SPDs que coincidan con los filtros aplicados' 
                                                    : 'No hay servicios de protección registrados.'}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Slide-over Drawer for Create / Edit Form */}
            {isDrawerOpen && (
                <div className="fixed inset-0 z-50 overflow-hidden">
                    {/* Dark Backdrop overlay */}
                    <div 
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300 ease-in-out animate-fade-in"
                        onClick={() => setIsDrawerOpen(false)}
                    ></div>

                    {/* Drawer Content */}
                    <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
                        <div className="w-screen max-w-md bg-white dark:bg-zinc-900 shadow-2xl border-l border-slate-200 dark:border-zinc-800 animate-slide-in-right flex flex-col">
                            {/* Drawer Header */}
                            <div className="px-6 py-5 bg-slate-50 dark:bg-zinc-800/40 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between">
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                                    {editingSpd ? 'Editar SPD' : 'Nuevo SPD'}
                                </h3>
                                <button
                                    onClick={() => setIsDrawerOpen(false)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                                >
                                    <span className="material-symbols-outlined text-xl">close</span>
                                </button>
                            </div>

                            {/* Drawer Body (Form) */}
                            <form 
                                onSubmit={handleSubmit(onSubmit)} 
                                className="flex-1 flex flex-col overflow-y-auto p-6 space-y-6"
                            >
                                {/* Form Inline Message */}
                                {formMessage && (
                                    <div className={`p-4 rounded-xl border flex items-start gap-2 animate-fade-in ${
                                        formMessage.type === 'success'
                                            ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300'
                                            : 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-300'
                                    }`}>
                                        <span className="material-symbols-outlined text-lg mt-0.5">
                                            {formMessage.type === 'success' ? 'check_circle' : 'error'}
                                        </span>
                                        <span className="text-xs font-semibold">{formMessage.text}</span>
                                    </div>
                                )}

                                {/* Field: Nombre */}
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                        Nombre <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Ej: SPD Guiñazú"
                                        {...register('nombre')}
                                        className={`w-full px-3 py-2 text-sm rounded-lg border bg-slate-50 dark:bg-zinc-800 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all ${
                                            errors.nombre 
                                                ? 'border-rose-400 focus:border-rose-500' 
                                                : 'border-slate-200 dark:border-zinc-700 focus:border-primary'
                                        }`}
                                    />
                                    {errors.nombre && (
                                        <p className="text-xs font-semibold text-rose-500 flex items-center gap-1 animate-fade-in mt-1">
                                            <span className="material-symbols-outlined text-sm">error</span>
                                            {errors.nombre.message}
                                        </p>
                                    )}
                                </div>

                                {/* Field: Zona */}
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                        Zona <span className="text-rose-500">*</span>
                                    </label>
                                    <select
                                        {...register('zona_id')}
                                        className={`w-full px-3 py-2 text-sm rounded-lg border bg-slate-50 dark:bg-zinc-800 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all ${
                                            errors.zona_id 
                                                ? 'border-rose-400 focus:border-rose-500' 
                                                : 'border-slate-200 dark:border-zinc-700 focus:border-primary'
                                        }`}
                                    >
                                        <option value="0">Seleccionar Zona...</option>
                                        {zonas.map((zona) => (
                                            <option key={zona.id} value={zona.id}>
                                                {zona.nombre}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.zona_id && (
                                        <p className="text-xs font-semibold text-rose-500 flex items-center gap-1 animate-fade-in mt-1">
                                            <span className="material-symbols-outlined text-sm">error</span>
                                            {errors.zona_id.message}
                                        </p>
                                    )}
                                </div>

                                {/* Field: Dirección */}
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                        Dirección
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Calle 123, B° Centro"
                                        {...register('direccion')}
                                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                                    />
                                </div>

                                {/* Field: Teléfono */}
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                        Teléfono
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Ej: 3514285600"
                                        {...register('telefono')}
                                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                                    />
                                </div>

                                {/* Field: Email */}
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                        Email
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Ej: spdarguello@cordoba.gov.ar"
                                        {...register('email')}
                                        className={`w-full px-3 py-2 text-sm rounded-lg border bg-slate-50 dark:bg-zinc-800 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all ${
                                            errors.email 
                                                ? 'border-rose-400 focus:border-rose-500' 
                                                : 'border-slate-200 dark:border-zinc-700 focus:border-primary'
                                        }`}
                                    />
                                    {errors.email && (
                                        <p className="text-xs font-semibold text-rose-500 flex items-center gap-1 animate-fade-in mt-1">
                                            <span className="material-symbols-outlined text-sm">error</span>
                                            {errors.email.message}
                                        </p>
                                    )}
                                </div>

                                {/* Action Buttons */}
                                <div className="pt-6 border-t border-slate-200 dark:border-zinc-800 flex items-center justify-end gap-3 mt-auto">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setIsDrawerOpen(false)}
                                        disabled={isSubmitting}
                                        className="text-xs font-bold"
                                    >
                                        Cancelar
                                    </Button>
                                    <Button
                                        type="submit"
                                        variant="primary"
                                        isLoading={isSubmitting}
                                        className="text-xs font-bold"
                                    >
                                        Guardar
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Dialog for Delete Confirmation */}
            {deleteConfirmSpd && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div 
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
                        onClick={() => setDeleteConfirmSpd(null)}
                    ></div>
                    
                    <div className="relative bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-6 rounded-2xl shadow-2xl max-w-sm w-full animate-zoom-in flex flex-col items-center text-center">
                        <div className="w-12 h-12 bg-rose-50 dark:bg-rose-950/20 rounded-full flex items-center justify-center mb-4 text-danger">
                            <span className="material-symbols-outlined text-3xl">warning</span>
                        </div>
                        
                        <h4 className="text-slate-950 dark:text-white text-lg font-bold mb-1">¿Confirmar eliminación?</h4>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
                            Esta acción es irreversible. ¿Estás seguro de que deseas eliminar el servicio de protección <span className="font-semibold text-slate-800 dark:text-white">"{deleteConfirmSpd.nombre}"</span>?
                        </p>
                        
                        <div className="flex gap-3 w-full">
                            <Button
                                onClick={() => setDeleteConfirmSpd(null)}
                                variant="outline"
                                className="flex-1 text-xs font-bold py-2.5"
                                disabled={isDeleting}
                            >
                                Cancelar
                            </Button>
                            <Button
                                onClick={handleDeleteExecute}
                                variant="danger"
                                isLoading={isDeleting}
                                className="flex-1 text-xs font-bold py-2.5"
                            >
                                Eliminar
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SpdManagementPage;
