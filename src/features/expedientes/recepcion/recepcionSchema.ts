import { z } from 'zod';

export const recepcionSchema = z.object({
    // Paso 1: Datos y Asignación
    nombre: z.string().min(1, 'El nombre es obligatorio'),
    apellido: z.string().min(1, 'El apellido es obligatorio'),
    dni: z.string().optional().refine((val) => {
        if (!val || val.trim() === '') return true;
        return /^\d{3,8}$/.test(val);
    }, 'El DNI debe tener entre 3 y 8 dígitos numéricos'),
    fecha_nacimiento: z.string().optional(),
    genero: z.string().optional(),
    spd_id: z.union([z.string(), z.number()]).optional(),
    zona_id: z.union([z.string(), z.number()]).optional(),

    // Paso 2: Salud y Educación
    domicilio: z.string().optional(),
    localidad: z.string().optional(),
    barrio: z.string().optional(),
    centro_salud: z.string().optional(),
    historia_clinica: z.string().optional(),
    tiene_cud: z.boolean().default(false),
    cobertura_medica: z.string().optional(),
    nivel_educativo: z.string().optional(),
    curso: z.string().optional(),
    turno: z.string().optional(),
    institucion_educativa: z.string().optional(),
    asiste_regularmente: z.boolean().default(true),

    // Paso 5: Motivo de Intervención
    motivo_principal: z.string().min(1, 'El motivo principal es obligatorio'),
    gravedad: z.string().refine(val => ['Baja', 'Moderada', 'Urgente'].includes(val), {
        message: 'La gravedad debe ser Baja, Moderada o Urgente'
    }),
    relato_situacion: z.string().min(1, 'El relato de situación es obligatorio'),

    // Paso 6: Vulneración de Derechos
    vulneraciones: z.array(z.object({
        derecho_id: z.string().min(1, 'Debe seleccionar un derecho'),
        indicador: z.string().optional(),
        observaciones: z.string().optional(),
        es_principal: z.boolean().optional(),
        grave: z.boolean().optional()
    })).min(1, 'Debe identificar al menos un derecho vulnerado'),

    // Otros campos
    decision_id: z.enum(['asesoramiento', 'derivacion', 'abordaje_integral']).default('abordaje_integral'),
});

export type RecepcionFormData = z.infer<typeof recepcionSchema>;
