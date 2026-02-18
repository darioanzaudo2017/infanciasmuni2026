import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buscarVinculacionPorDni } from './vinculacionService';

describe('Servicio de Vinculación por DNI', () => {

    // Mock de Supabase Client
    const mockSupabase = {
        from: vi.fn(() => mockSupabase),
        select: vi.fn(() => mockSupabase),
        eq: vi.fn(() => mockSupabase),
        neq: vi.fn(() => mockSupabase),
        order: vi.fn(() => mockSupabase),
        limit: vi.fn(() => mockSupabase),
        maybeSingle: vi.fn(),
    } as any;

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('Familiar con DNI que YA tiene expediente activo → debe vincular', async () => {
        // Arrange
        const dni = '12345678';
        const ninoId = 'nino-123';
        const expId = 'exp-456';
        const ingresoId = 'ingreso-789';

        // Mock ninos
        mockSupabase.maybeSingle.mockResolvedValueOnce({ data: { id: ninoId }, error: null });
        // Mock expedientes
        mockSupabase.maybeSingle.mockResolvedValueOnce({ data: { id: expId }, error: null });
        // Mock ingresos (active)
        mockSupabase.maybeSingle.mockResolvedValueOnce({ data: { id: ingresoId }, error: null });

        // Act
        const result = await buscarVinculacionPorDni(mockSupabase, dni);

        // Assert
        expect(result.linkedExpedienteId).toBe(expId);
        expect(result.linkedIngresoId).toBe(ingresoId);
        expect(mockSupabase.from).toHaveBeenCalledWith('ninos');
        expect(mockSupabase.from).toHaveBeenCalledWith('expedientes');
        expect(mockSupabase.from).toHaveBeenCalledWith('ingresos');
    });

    it('Familiar con DNI que existe pero expediente inactivo → no vincula', async () => {
        // Arrange
        const dni = '12345678';
        const ninoId = 'nino-123';

        // Mock ninos (exists)
        mockSupabase.maybeSingle.mockResolvedValueOnce({ data: { id: ninoId }, error: null });
        // Mock expedientes (inactive/not found)
        mockSupabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null });

        // Act
        const result = await buscarVinculacionPorDni(mockSupabase, dni);

        // Assert
        expect(result.linkedExpedienteId).toBeNull();
        expect(result.linkedIngresoId).toBeNull();
    });

    it('Familiar con DNI que no existe en el sistema → no vincula', async () => {
        // Arrange
        const dni = '99999999';

        // Mock ninos (not found)
        mockSupabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null });

        // Act
        const result = await buscarVinculacionPorDni(mockSupabase, dni);

        // Assert
        expect(result.linkedExpedienteId).toBeNull();
        expect(result.linkedIngresoId).toBeNull();
    });

    it('Familiar sin DNI → se carga sin intentar vinculación', async () => {
        // Act
        const result = await buscarVinculacionPorDni(mockSupabase, '');

        // Assert
        expect(result.linkedExpedienteId).toBeNull();
        expect(result.linkedIngresoId).toBeNull();
        expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it('DNI muy corto (menos de 3 dígitos) no debe intentar vinculación', async () => {
        const result = await buscarVinculacionPorDni(mockSupabase, '12');
        expect(result.linkedExpedienteId).toBeNull();
        expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it('DNI de 3 dígitos debe permitir vinculación', async () => {
        mockSupabase.maybeSingle.mockResolvedValueOnce({ data: { id: 'nino-123' }, error: null });
        mockSupabase.maybeSingle.mockResolvedValueOnce({ data: { id: 'exp-456' }, error: null });
        mockSupabase.maybeSingle.mockResolvedValueOnce({ data: { id: 'ingreso-789' }, error: null });

        const result = await buscarVinculacionPorDni(mockSupabase, '345');
        expect(result.linkedExpedienteId).toBe('exp-456');
    });

    it('Debe vincular incluso si el expediente no está activo', async () => {
        const ninoId = 'nino-123';
        const expId = 'exp-456';
        const ingresoId = 'ingreso-789';

        mockSupabase.maybeSingle.mockResolvedValueOnce({ data: { id: ninoId }, error: null });
        mockSupabase.maybeSingle.mockResolvedValueOnce({ data: { id: expId }, error: null });
        mockSupabase.maybeSingle.mockResolvedValueOnce({ data: { id: ingresoId }, error: null });

        const result = await buscarVinculacionPorDni(mockSupabase, '555666');
        expect(result.linkedExpedienteId).toBe(expId);
        expect(result.linkedIngresoId).toBe(ingresoId);
    });

    it('Familiar con DNI válido pero sin expediente → no vincula', async () => {
        // Arrange
        const dni = '12345678';
        const ninoId = 'nino-123';

        // Mock ninos
        mockSupabase.maybeSingle.mockResolvedValueOnce({ data: { id: ninoId }, error: null });
        // Mock expedientes (none)
        mockSupabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null });

        // Act
        const result = await buscarVinculacionPorDni(mockSupabase, dni);

        // Assert
        expect(result.linkedExpedienteId).toBeNull();
        expect(result.linkedIngresoId).toBeNull();
    });

    it('no debe vincular si el expediente encontrado es el mismo que el actual', async () => {
        // Arrange
        const dni = '12345678';
        const ninoId = 'nino-123';
        const currentExpId = 'exp-same';

        mockSupabase.maybeSingle.mockResolvedValueOnce({ data: { id: ninoId }, error: null });
        mockSupabase.maybeSingle.mockResolvedValueOnce({ data: { id: currentExpId }, error: null });

        // Act
        const result = await buscarVinculacionPorDni(mockSupabase, dni, currentExpId);

        // Assert
        expect(result.linkedExpedienteId).toBeNull();
    });
});
