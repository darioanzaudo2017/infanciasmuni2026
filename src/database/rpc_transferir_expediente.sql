-- ==============================================================================
-- FUNCIÓN RPC: transferir_expediente
-- ==============================================================================
-- Esta función realiza la transferencia de un expediente entre servicios de 
-- protección (SPD) de forma atómica y segura (SECURITY DEFINER).
-- ==============================================================================

BEGIN;

-- 1. Asegurar que la tabla transferencias_expedientes tiene la columna destino_zona_id
ALTER TABLE public.transferencias_expedientes 
ADD COLUMN IF NOT EXISTS destino_zona_id BIGINT REFERENCES public.zonas(id);

-- 2. Crear o reemplazar la función de transferencia
CREATE OR REPLACE FUNCTION public.transferir_expediente(
  p_expediente_id bigint,
  p_spd_destino_id bigint,
  p_motivo text
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_spd_origen_id bigint;
  v_zona_origen_id bigint;
  v_zona_destino_id bigint;
BEGIN
  -- Obtener datos actuales del expediente
  SELECT servicio_proteccion_id, zona_id
  INTO v_spd_origen_id, v_zona_origen_id
  FROM public.expedientes
  WHERE id = p_expediente_id;

  -- Verificar que el usuario tiene acceso al expediente origen
  -- (Usamos la función de seguridad existente)
  IF NOT public.puede_escribir_datos(v_zona_origen_id, v_spd_origen_id) THEN
    RAISE EXCEPTION 'Sin permiso para transferir este expediente';
  END IF;

  -- Obtener zona del SPD destino
  SELECT zona_id INTO v_zona_destino_id
  FROM public.servicios_proteccion
  WHERE id = p_spd_destino_id;

  -- Actualizar el expediente
  UPDATE public.expedientes
  SET
    servicio_proteccion_id = p_spd_destino_id,
    zona_id = v_zona_destino_id,
    updated_at = now()
  WHERE id = p_expediente_id;

  -- Registrar transferencia en el historial
  INSERT INTO public.transferencias_expedientes (
    expediente_id,
    spd_origen_id,
    spd_destino_id,
    destino_zona_id,
    usuario_emisor_id,
    motivo
  ) VALUES (
    p_expediente_id,
    v_spd_origen_id,
    p_spd_destino_id,
    v_zona_destino_id,
    auth.uid(),
    p_motivo
  );
END;
$$;

COMMIT;
