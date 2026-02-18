import { describe, it, expect } from 'vitest';
import { recepcionSchema } from './recepcionSchema';

describe('Validaciones del Formulario de Recepción', () => {

    const validBaseData = {
        nombre: 'Juan',
        apellido: 'Pérez',
        motivo_principal: 'Abandono',
        gravedad: 'Moderada',
        relato_situacion: 'El niño se encuentra solo...',
        vulneraciones: [{ derecho_id: '1', indicador: 'Falta de cuidados' }]
    };

    it('debe fallar si los campos obligatorios están vacíos', () => {
        const result = recepcionSchema.safeParse({
            nombre: '',
            apellido: '',
            motivo_principal: '',
            relato_situacion: '',
            vulneraciones: []
        });
        expect(result.success).toBe(false);
        if (!result.success) {
            const errors = result.error.flatten().fieldErrors;
            expect(errors.nombre).toContain('El nombre es obligatorio');
            expect(errors.apellido).toContain('El apellido es obligatorio');
            expect(errors.motivo_principal).toContain('El motivo principal es obligatorio');
            expect(errors.relato_situacion).toContain('El relato de situación es obligatorio');
            expect(errors.vulneraciones).toContain('Debe identificar al menos un derecho vulnerado');
        }
    });

    it('debe ser exitoso con datos válidos y SIN DNI', () => {
        const result = recepcionSchema.safeParse(validBaseData);
        expect(result.success).toBe(true);
    });

    it('debe ser exitoso con datos válidos y CON DNI de 8 dígitos', () => {
        const data = { ...validBaseData, dni: '12345678' };
        const result = recepcionSchema.safeParse(data);
        expect(result.success).toBe(true);
    });

    it('debe ser exitoso con datos válidos y CON DNI de 7 dígitos', () => {
        const data = { ...validBaseData, dni: '1234567' };
        const result = recepcionSchema.safeParse(data);
        expect(result.success).toBe(true);
    });

    it('debe fallar si el DNI tiene letras', () => {
        const data = { ...validBaseData, dni: '1234567A' };
        const result = recepcionSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.flatten().fieldErrors.dni).toContain('El DNI debe tener entre 7 y 8 dígitos numéricos');
        }
    });

    it('debe fallar si el DNI tiene menos de 7 dígitos', () => {
        const data = { ...validBaseData, dni: '123456' };
        const result = recepcionSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.flatten().fieldErrors.dni).toContain('El DNI debe tener entre 7 y 8 dígitos numéricos');
        }
    });

    it('debe fallar si el DNI tiene más de 8 dígitos', () => {
        const data = { ...validBaseData, dni: '123456789' };
        const result = recepcionSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.flatten().fieldErrors.dni).toContain('El DNI debe tener entre 7 y 8 dígitos numéricos');
        }
    });

    it('debe fallar si la gravedad no es uno de los valores permitidos', () => {
        const data = { ...validBaseData, gravedad: 'Extrema' };
        const result = recepcionSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.flatten().fieldErrors.gravedad).toContain('La gravedad debe ser Baja, Moderada o Urgente');
        }
    });

    it('debe fallar si no hay al menos una vulneración de derechos', () => {
        const data = { ...validBaseData, vulneraciones: [] };
        const result = recepcionSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.flatten().fieldErrors.vulneraciones).toContain('Debe identificar al menos un derecho vulnerado');
        }
    });

});
