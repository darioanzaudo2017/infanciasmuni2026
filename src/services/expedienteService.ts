import { SupabaseClient } from '@supabase/supabase-js';

export interface NinoData {
    dni?: string;
    nombre: string;
    apellido: string;
    fecha_nacimiento?: string;
    genero?: string;
}

export async function crearExpedienteConIngreso(
    supabase: SupabaseClient,
    ninoData: NinoData,
    spdId: number,
    zonaId: number,
    usuarioId: string
) {
    // 1. Crear o Actualizar Niño (Nino)
    let ninoId: number;
    const cleanDni = ninoData.dni ? parseInt(String(ninoData.dni).replace(/\D/g, '')) : null;

    if (cleanDni) {
        const { data: existingNino } = await supabase
            .from('ninos')
            .select('id')
            .eq('dni', cleanDni)
            .maybeSingle();

        if (existingNino) {
            ninoId = existingNino.id;
        } else {
            const { data: newNino, error: ninoError } = await supabase
                .from('ninos')
                .insert({
                    dni: cleanDni,
                    nombre: ninoData.nombre,
                    apellido: ninoData.apellido,
                    fecha_nacimiento: ninoData.fecha_nacimiento,
                    genero: ninoData.genero
                })
                .select()
                .single();
            if (ninoError) throw ninoError;
            ninoId = newNino.id;
        }
    } else {
        const { data: newNino, error: ninoError } = await supabase
            .from('ninos')
            .insert({
                nombre: ninoData.nombre,
                apellido: ninoData.apellido,
                fecha_nacimiento: ninoData.fecha_nacimiento,
                genero: ninoData.genero
            })
            .select()
            .single();
        if (ninoError) throw ninoError;
        ninoId = newNino.id;
    }

    // 2. Crear Expediente
    const year = new Date().getFullYear();
    const randomNum = Math.floor(Math.random() * 90000) + 10000;
    const numeroExpediente = `EXP-${year}-${randomNum}`;

    const { data: expediente, error: expError } = await supabase
        .from('expedientes')
        .insert({
            nino_id: ninoId,
            servicio_proteccion_id: spdId,
            zona_id: zonaId,
            profesional_id: usuarioId,
            numero: numeroExpediente,
            fecha_apertura: new Date().toISOString().split('T')[0],
            activo: true
        })
        .select()
        .single();
    if (expError) throw expError;

    // 3. Crear Ingreso
    const { data: ingreso, error: ingError } = await supabase
        .from('ingresos')
        .insert({
            expediente_id: expediente.id,
            numero_ingreso: 1,
            fecha_ingreso: new Date().toISOString().split('T')[0],
            etapa: 'recepcion',
            estado: 'abierto',
            profesional_asignado_id: usuarioId,
            ultimo_usuario_id: usuarioId
        })
        .select()
        .single();
    if (ingError) throw ingError;

    return {
        expedienteId: expediente.id,
        ingresoId: ingreso.id,
        ninoId
    };
}
