-- ==============================================================================
-- MIGRACIÓN PARA VINCULACIÓN DE EXPEDIENTES E INTERVENCIONES GRUPALES
-- ==============================================================================
-- Este script prepara la base de datos para agrupar expedientes de hermanos
-- y permitir la gestión de intervenciones con alcance grupal.

BEGIN;

-- 1. Crear tabla de Grupos Familiares (agrupador lógico)
CREATE TABLE IF NOT EXISTS public.grupos_familiares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Vincular Expedientes a Grupos Familiares
ALTER TABLE public.expedientes 
ADD COLUMN IF NOT EXISTS grupo_familiar_id UUID REFERENCES public.grupos_familiares(id);

-- 3. Preparar tabla de Intervenciones para alcance grupal
-- Dependiendo del nombre exacto de la tabla (asumimos form2_intervenciones por el contexto previo)
ALTER TABLE public.form2_intervenciones 
ADD COLUMN IF NOT EXISTS es_grupal BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS grupo_intervencion_id UUID; -- Para identificar notas que son réplicas una de otra

-- Comentario para el profesional técnico: 
-- El grupo_intervencion_id permitirá que si se edita una nota "grupal" desde un expediente, 
-- se pueda preguntar si se desea actualizar en todos los legajos vinculados.

COMMIT;
