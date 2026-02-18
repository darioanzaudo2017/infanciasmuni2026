import { describe, it, expect } from 'vitest';
import { validarTransicionEtapa, ETAPAS_ORDEN } from './ingresoService';

describe('Lógica de Transición de Etapas de Ingreso', () => {

    const createIngreso = (etapa: string, estado: string = 'Activo') => ({
        id: 1,
        etapa,
        estado
    });

    describe('Transiciones Válidas', () => {
        it('debe permitir avanzar de Recepción a Ampliación', () => {
            const ingreso = createIngreso('Ficha de Recepción');
            const result = validarTransicionEtapa(ingreso, 'Ficha de Ampliación');
            expect(result.valida).toBe(true);
        });

        it('debe permitir avanzar de Ampliación a Informe Síntesis', () => {
            const ingreso = createIngreso('Ficha de Ampliación');
            const result = validarTransicionEtapa(ingreso, 'Informe Síntesis');
            expect(result.valida).toBe(true);
        });

        it('debe permitir avanzar de Informe Síntesis a Definición de Medidas', () => {
            const ingreso = createIngreso('Informe Síntesis');
            const result = validarTransicionEtapa(ingreso, 'Definición de Medidas');
            expect(result.valida).toBe(true);
        });

        it('debe permitir avanzar de Definición de Medidas a Cese de Intervención', () => {
            const ingreso = createIngreso('Definición de Medidas');
            const result = validarTransicionEtapa(ingreso, 'Cese de Intervención');
            expect(result.valida).toBe(true);
        });
    });

    describe('Transiciones Inválidas (Reglas de Negocio)', () => {
        it('debe fallar si se intenta saltar etapas (ej: Recepción a Informe Síntesis)', () => {
            const ingreso = createIngreso('Ficha de Recepción');
            const result = validarTransicionEtapa(ingreso, 'Informe Síntesis');
            expect(result.valida).toBe(false);
            expect(result.error).toContain('No se permite saltar etapas');
        });

        it('debe fallar si se intenta retroceder de etapa (ej: Ampliación a Recepción)', () => {
            const ingreso = createIngreso('Ficha de Ampliación');
            const result = validarTransicionEtapa(ingreso, 'Ficha de Recepción');
            expect(result.valida).toBe(false);
            expect(result.error).toContain('No se permite retroceder');
        });

        it('debe fallar si el ingreso no está en estado Activo', () => {
            const ingreso = createIngreso('Ficha de Recepción', 'Inactivo');
            const result = validarTransicionEtapa(ingreso, 'Ficha de Ampliación');
            expect(result.valida).toBe(false);
            expect(result.error).toContain('estado Activo');
        });

        it('debe fallar si el ingreso ya está en Cese de Intervención', () => {
            const ingreso = createIngreso('Cese de Intervención');
            const result = validarTransicionEtapa(ingreso, 'Ficha de Recepción');
            expect(result.valida).toBe(false);
            expect(result.error).toContain('etapa final');
        });

        it('debe fallar si se intenta cambiar a la misma etapa', () => {
            const ingreso = createIngreso('Ficha de Ampliación');
            const result = validarTransicionEtapa(ingreso, 'Ficha de Ampliación');
            expect(result.valida).toBe(false);
            expect(result.error).toContain('ya se encuentra en esta etapa');
        });
    });
});
