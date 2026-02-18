import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registrarCeseIngreso } from './ceseService';

describe('Servicio de Cese de Ingreso (Validaciones)', () => {

    // Mock de Supabase Client
    const mockSupabase = {
        from: vi.fn(() => mockSupabase),
        upsert: vi.fn(() => mockSupabase),
        update: vi.fn(() => mockSupabase),
        eq: vi.fn(() => mockSupabase),
    } as any;

    beforeEach(() => {
        vi.clearAllMocks();
        // Configuramos para que las llamadas finales retornen la promesa con error: null
        mockSupabase.upsert.mockResolvedValue({ error: null });
        mockSupabase.eq.mockResolvedValue({ error: null });
        // update debe retornar el objeto para permitir encadenar .eq()
        mockSupabase.update.mockReturnValue(mockSupabase);
        mockSupabase.from.mockReturnValue(mockSupabase);
    });

    const mockIngreso = {
        id: 123,
        etapa: 'Cese de Intervención',
        estado: 'activo'
    };

    const payloadValido = {
        motivo_cese: 'restitucion_integral',
        fecha_cierre: '2026-02-18T10:00:00Z',
        resumen_logros: 'Objetivos cumplidos'
    };

    it('Cierre exitoso con todos los datos válidos', async () => {
        // Act
        const result = await registrarCeseIngreso(mockSupabase, mockIngreso, payloadValido, 'user-1');

        // Assert
        expect(result.success).toBe(true);
        expect(mockSupabase.from).toHaveBeenCalledWith('form9_cese_ingreso');
        expect(mockSupabase.from).toHaveBeenCalledWith('ingresos');

        // Verificar que el ingreso pasa a estado "Cerrado"
        const updateCall = mockSupabase.update.mock.calls[0][0];
        expect(updateCall.estado).toBe('cerrado');
        expect(updateCall.etapa).toBe('cerrado');
    });

    it('Fallo si motivo_cese está vacío', async () => {
        const payload = { ...payloadValido, motivo_cese: '' };
        await expect(registrarCeseIngreso(mockSupabase, mockIngreso, payload))
            .rejects.toThrow('El motivo de cese es obligatorio.');
    });

    it('Fallo si fecha_cierre está vacía', async () => {
        const payload = { ...payloadValido, fecha_cierre: '' };
        await expect(registrarCeseIngreso(mockSupabase, mockIngreso, payload))
            .rejects.toThrow('La fecha de cierre es obligatoria.');
    });

    it('Fallo si fecha_cierre tiene formato inválido', async () => {
        const payload = { ...payloadValido, fecha_cierre: 'fecha-invalida' };
        await expect(registrarCeseIngreso(mockSupabase, mockIngreso, payload))
            .rejects.toThrow('La fecha de cierre tiene un formato inválido.');
    });

    it('Fallo si se intenta cerrar un ingreso que no está en etapa "Cese de Intervención"', async () => {
        const ingresoInvalido = { ...mockIngreso, etapa: 'Recepción' };
        await expect(registrarCeseIngreso(mockSupabase, ingresoInvalido, payloadValido))
            .rejects.toThrow('Solo se puede cerrar un ingreso que esté en la etapa de "Cese de Intervención".');
    });

    it('Fallo si el ingreso ya está cerrado', async () => {
        const ingresoCerrado = { ...mockIngreso, estado: 'cerrado' };
        await expect(registrarCeseIngreso(mockSupabase, ingresoCerrado, payloadValido))
            .rejects.toThrow('El ingreso ya se encuentra cerrado.');
    });

    it('Verificar que el ingreso pasa a estado "Cerrado" en la base de datos', async () => {
        await registrarCeseIngreso(mockSupabase, mockIngreso, payloadValido);

        // Buscamos la llamada a la tabla 'ingresos'
        const ingresosCall = mockSupabase.from.mock.calls.find((call: any[]) => call[0] === 'ingresos');
        expect(ingresosCall).toBeDefined();

        const updateData = mockSupabase.update.mock.calls[0][0];
        expect(updateData.estado).toBe('cerrado');
    });
});
