import { SupabaseClient } from '@supabase/supabase-js';

export interface CesePayload {
    motivo_cese: string;
    fecha_cierre: string;
    resumen_logros?: string;
    observaciones_finales?: string;
}

export interface IngresoForCese {
    id: number;
    etapa: string;
    estado: string;
}

/**
 * Valida y registra el cierre de un ingreso.
 * 
 * Reglas actualizadas:
 * - motivo_cese es obligatorio y no puede estar vacío.
 * - fecha_cierre es ingresada por el usuario (manual), es obligatoria y debe ser válida.
 * - Solo se puede cerrar un ingreso que esté en etapa "Cese de Intervención".
 * - Un ingreso ya cerrado no puede cerrarse de nuevo.
 * - El ingreso debe pasar a estado "Cerrado" al registrar el cese.
 */
export async function registrarCeseIngreso(
    supabase: SupabaseClient,
    ingreso: IngresoForCese,
    payload: CesePayload,
    userId?: string
) {
    // 1. Validaciones de negocio
    if (!payload.motivo_cese || payload.motivo_cese.trim() === '') {
        throw new Error('El motivo de cese es obligatorio.');
    }

    if (!payload.fecha_cierre || payload.fecha_cierre.trim() === '') {
        throw new Error('La fecha de cierre es obligatoria.');
    }

    // Validar formato de fecha
    const date = new Date(payload.fecha_cierre);
    if (isNaN(date.getTime())) {
        throw new Error('La fecha de cierre tiene un formato inválido.');
    }

    if (ingreso.estado === 'cerrado') {
        throw new Error('El ingreso ya se encuentra cerrado.');
    }

    // Normalización de etapa estricta
    if (ingreso.etapa !== 'Cese de Intervención') {
        throw new Error('Solo se puede cerrar un ingreso que esté en la etapa de "Cese de Intervención".');
    }

    try {
        // En un entorno real, esto sería una transacción
        // 1. Registrar en form9_cese_ingreso
        const { error: ceseError } = await supabase
            .from('form9_cese_ingreso')
            .upsert({
                ingreso_id: ingreso.id,
                motivo_cese: payload.motivo_cese,
                resumen_logros: payload.resumen_logros,
                observaciones_finales: payload.observaciones_finales,
                fecha_cierre: payload.fecha_cierre // Usamos la fecha manual
            }, { onConflict: 'ingreso_id' });

        if (ceseError) throw ceseError;

        // 2. Actualizar Ingreso a estado "Cerrado"
        const { error: ingError } = await supabase
            .from('ingresos')
            .update({
                estado: 'cerrado',
                etapa: 'cerrado',
                ultimo_usuario_id: userId,
                updated_at: new Date().toISOString()
            })
            .eq('id', ingreso.id);

        if (ingError) throw ingError;

        return { success: true };

    } catch (error: any) {
        console.error('Error al registrar cese:', error);
        throw new Error(error.message || 'Error al registrar el cierre del ingreso.');
    }
}
