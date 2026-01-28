-- ==============================================================================
-- MIGRACIÓN PARA VINCULACIÓN DE EXPEDIENTES E INGRESOS FAMILIARES
-- ==============================================================================

BEGIN;

-- 1. Agregar columnas a grupo_conviviente para vinculación
ALTER TABLE public.grupo_conviviente 
ADD COLUMN IF NOT EXISTS linked_expediente_id UUID REFERENCES public.expedientes(id),
ADD COLUMN IF NOT EXISTS linked_ingreso_id UUID REFERENCES public.ingresos(id);

-- 2. Comentarios para documentación
COMMENT ON COLUMN public.grupo_conviviente.linked_expediente_id IS 'ID del expediente activo asociado a este integrante del grupo familiar.';
COMMENT ON COLUMN public.grupo_conviviente.linked_ingreso_id IS 'ID del ingreso activo asociado a este integrante del grupo familiar.';

-- 3. Asegurar que la columna edad existe (por si no se ejecutó el script anterior)
ALTER TABLE public.grupo_conviviente ADD COLUMN IF NOT EXISTS edad TEXT;

COMMIT;
