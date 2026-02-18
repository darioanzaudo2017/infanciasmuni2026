import { SupabaseClient } from '@supabase/supabase-js';

export interface VinculacionResult {
    linkedExpedienteId: string | null;
    linkedIngresoId: string | null;
}

/**
 * Verifica si un DNI pertenece a un niño con un expediente activo
 * y devuelve los IDs necesarios para la vinculación.
 */
export async function buscarVinculacionPorDni(
    supabase: SupabaseClient,
    dni: string | number,
    expedienteActualId?: string | null
): Promise<VinculacionResult> {
    const cleanDni = dni ? parseInt(String(dni).replace(/\D/g, '')) : null;

    // Permitimos DNIs a partir de 3 dígitos (para soporte de tests y casos especiales)
    if (!cleanDni || String(cleanDni).length < 3) {
        return { linkedExpedienteId: null, linkedIngresoId: null };
    }

    try {
        // 1. Buscar niño por DNI
        const { data: nino } = await supabase
            .from('ninos')
            .select('id')
            .eq('dni', cleanDni)
            .maybeSingle();

        if (!nino) {
            return { linkedExpedienteId: null, linkedIngresoId: null };
        }

        // 2. Buscar último expediente para ese niño (aunque no esté activo, para historial)
        const { data: exp } = await supabase
            .from('expedientes')
            .select('id')
            .eq('nino_id', nino.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        // Si no hay expediente activo o es el mismo que el actual, no vinculamos
        if (!exp || exp.id === expedienteActualId) {
            return { linkedExpedienteId: null, linkedIngresoId: null };
        }

        // 3. Buscar el ingreso más reciente (preferentemente no cerrado)
        const { data: activeIngreso } = await supabase
            .from('ingresos')
            .select('id')
            .eq('expediente_id', exp.id)
            .neq('estado', 'cerrado')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (activeIngreso) {
            return { linkedExpedienteId: exp.id, linkedIngresoId: activeIngreso.id };
        }

        // Si no hay ingresos activos, buscamos el último de cualquier estado
        const { data: latestIngreso } = await supabase
            .from('ingresos')
            .select('id')
            .eq('expediente_id', exp.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        return {
            linkedExpedienteId: exp.id,
            linkedIngresoId: latestIngreso?.id || null
        };

    } catch (error) {
        console.error('Error en buscarVinculacionPorDni:', error);
        return { linkedExpedienteId: null, linkedIngresoId: null };
    }
}
