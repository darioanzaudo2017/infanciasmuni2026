-- ==============================================================================
-- MIGRACIÓN PARA SECCIÓN DE EDAD Y CAMPOS ADICIONALES
-- ==============================================================================
-- Instrucciones: Ejecute este script en el Editor SQL de Supabase para corregir 
-- el error de guardado y habilitar los nuevos campos del formulario.

BEGIN;

-- 1. Agregar columna 'edad' a la tabla maestra de niños
ALTER TABLE public.ninos 
ADD COLUMN IF NOT EXISTS edad TEXT;

-- 2. Agregar columna 'edad' al grupo conviviente
ALTER TABLE public.grupo_conviviente 
ADD COLUMN IF NOT EXISTS edad TEXT;

-- 3. Asegurar que 'form1_datos_nino' tenga la columna 'edad'
ALTER TABLE public.form1_datos_nino 
ADD COLUMN IF NOT EXISTS edad TEXT;

-- 4. Otros campos que podrían faltar en ninos según el nuevo payload
ALTER TABLE public.ninos 
ADD COLUMN IF NOT EXISTS barrio TEXT,
ADD COLUMN IF NOT EXISTS centro_salud TEXT,
ADD COLUMN IF NOT EXISTS historia_clinica TEXT,
ADD COLUMN IF NOT EXISTS tiene_cud BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS cobertura_medica TEXT,
ADD COLUMN IF NOT EXISTS nivel_educativo TEXT,
ADD COLUMN IF NOT EXISTS curso TEXT,
ADD COLUMN IF NOT EXISTS turno TEXT,
ADD COLUMN IF NOT EXISTS institucion_educativa TEXT,
ADD COLUMN IF NOT EXISTS asiste_regularmente BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS observaciones_salud TEXT,
ADD COLUMN IF NOT EXISTS referencia_ubicacion TEXT,
ADD COLUMN IF NOT EXISTS tiene_discapacidad BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS tipo_discapacidad TEXT;

COMMIT;
