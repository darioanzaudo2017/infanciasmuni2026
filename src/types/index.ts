export type EtapaIngreso =
    | 'Recepción'
    | 'Ampliación'
    | 'Informe Síntesis'
    | 'Definición de Medidas'
    | 'Acta'
    | 'Seguimiento'
    | 'Cerrado';

export interface Nino {
    id: string;
    nombre: string;
    apellido: string;
    dni?: number;
    fecha_nacimiento?: string;
    genero?: string;
    created_at?: string;
}

export interface Expediente {
    id: string;
    numero: string;
    nino_id: string;
    servicio_proteccion_id?: number;
    zona_id?: number;
    profesional_id?: string;
    fecha_apertura: string;
    activo: boolean;
    nino?: Nino;
}

export interface Ingreso {
    id: string;
    expediente_id: string;
    numero_ingreso: number;
    fecha_ingreso: string;
    es_emergencia: boolean;
    etapa: EtapaIngreso;
    estado: string;
    fecha_cierre?: string;
    motivo_cierre?: string;
}

export interface Form1DatosNino {
    ingreso_id: string;
    domicilio?: string;
    telefono?: string;
    barrio_id?: number;
    centro_salud?: string;
    historia_clinica?: string;
    tiene_cud: boolean;
    obra_social?: string;
    escuela?: string;
    curso?: string;
    turno?: string;
    asiste_regularmente?: boolean;
}
