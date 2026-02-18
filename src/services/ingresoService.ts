export type EtapaIngreso =
    | 'Ficha de Recepción'
    | 'Ficha de Ampliación'
    | 'Informe Síntesis'
    | 'Definición de Medidas'
    | 'Cese de Intervención';

export const ETAPAS_ORDEN: EtapaIngreso[] = [
    'Ficha de Recepción',
    'Ficha de Ampliación',
    'Informe Síntesis',
    'Definición de Medidas',
    'Cese de Intervención'
];

export interface IngresoBase {
    id: string | number;
    etapa: string;
    estado: string;
}

/**
 * Valida si una transición de etapa es permitida según las reglas de negocio.
 * 
 * Reglas:
 * - Solo se puede avanzar a la etapa siguiente, no saltar etapas.
 * - No se puede retroceder de etapa.
 * - Solo un ingreso con estado "Activo" puede cambiar de etapa.
 * - Un ingreso en etapa "Cese de Intervención" no puede cambiar de etapa.
 */
export function validarTransicionEtapa(
    ingreso: IngresoBase,
    nuevaEtapa: string
): { valida: boolean; error?: string } {
    // 1. Validar estado Activo
    if (ingreso.estado !== 'Activo') {
        return { valida: false, error: 'Solo se puede cambiar la etapa de un ingreso en estado Activo.' };
    }

    const etapaActualIndex = ETAPAS_ORDEN.indexOf(ingreso.etapa as EtapaIngreso);
    const nuevaEtapaIndex = ETAPAS_ORDEN.indexOf(nuevaEtapa as EtapaIngreso);

    // 2. Validar que la nueva etapa sea válida
    if (nuevaEtapaIndex === -1) {
        return { valida: false, error: 'La etapa destino no es válida.' };
    }

    // 3. Validar que no esté ya en la última etapa
    if (ingreso.etapa === 'Cese de Intervención') {
        return { valida: false, error: 'El ingreso ya se encuentra en la etapa final (Cese de Intervención).' };
    }

    // 4. Validar retroceso
    if (nuevaEtapaIndex < etapaActualIndex) {
        return { valida: false, error: 'No se permite retroceder a una etapa anterior.' };
    }

    // 5. Validar misma etapa
    if (nuevaEtapaIndex === etapaActualIndex) {
        return { valida: false, error: 'El ingreso ya se encuentra en esta etapa.' };
    }

    // 6. Validar salto de etapas (solo se permite el siguiente inmediato)
    if (nuevaEtapaIndex !== etapaActualIndex + 1) {
        return { valida: false, error: 'No se permite saltar etapas. Debe avanzar a la siguiente etapa inmediata.' };
    }

    return { valida: true };
}
