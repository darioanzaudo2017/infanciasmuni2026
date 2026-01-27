-- ==============================================================================
-- MIGRACIÓN PARA SEGUIMIENTO DE USUARIOS EN INGRESOS
-- ==============================================================================
-- Instrucciones: Ejecute este script en el Editor SQL de Supabase para habilitar
-- el seguimiento automático del último usuario que realizó cambios.

BEGIN;

-- 1. Agregar la columna para rastrear el ID del último usuario
ALTER TABLE public.ingresos 
ADD COLUMN IF NOT EXISTS ultimo_usuario_id UUID REFERENCES public.usuarios(id);

-- 2. Crear o actualizar la función que maneja el timestamp y el usuario
CREATE OR REPLACE FUNCTION public.actualizar_auditoria_ingreso()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    
    -- Intentamos obtener el ID del usuario desde la sesión de Supabase
    -- Esto funciona automáticamente para cambios realizados vía API/App
    IF auth.uid() IS NOT NULL THEN
        NEW.ultimo_usuario_id = auth.uid();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Crear el trigger para la tabla ingresos
DROP TRIGGER IF EXISTS trg_ingresos_auditoria ON public.ingresos;
CREATE TRIGGER trg_ingresos_auditoria
BEFORE UPDATE ON public.ingresos
FOR EACH ROW EXECUTE FUNCTION public.actualizar_auditoria_ingreso();

-- 4. Actualizar la Vista para que muestre el nombre del usuario
-- NOTA: Reemplaza la vista con esta nueva definición que incluye el join
CREATE OR REPLACE VIEW public.vw_ingresos_detalle AS
SELECT 
    i.*,
    e.numero AS expediente_numero,
    e.activo AS expediente_activo,
    n.nombre AS nino_nombre,
    n.apellido AS nino_apellido,
    n.dni AS nino_dni,
    n.fecha_nacimiento AS nino_fecha_nacimiento,
    -- Calculamos la edad (opcional, si se usa en la UI)
    EXTRACT(YEAR FROM AGE(NOW(), n.fecha_nacimiento)) AS nino_edad,
    -- Nombre del último que realizó un cambio
    u_last.nombre_completo AS ultimo_profesional_nombre,
    -- Nombre del profesional asignado originalmente
    u_asig.nombre_completo AS profesional_asignado_nombre
FROM public.ingresos i
JOIN public.expedientes e ON i.expediente_id = e.id
JOIN public.ninos n ON e.nino_id = n.id
LEFT JOIN public.usuarios u_last ON i.ultimo_usuario_id = u_last.id
LEFT JOIN public.usuarios u_asig ON i.profesional_asignado_id = u_asig.id;

-- 5. Función para "tocar" el ingreso padre cuando cambian datos relacionados
-- Esto asegura que si se cambia una vulneración o se sube un documento, 
-- el ingreso se marque como actualizado por el usuario actual.
CREATE OR REPLACE FUNCTION public.track_parent_ingreso_change()
RETURNS TRIGGER AS $$
DECLARE
    v_ingreso_id BIGINT;
BEGIN
    -- Determinar el ID del ingreso según la tabla
    CASE TG_TABLE_NAME
        WHEN 'derechos_vulnerados' THEN v_ingreso_id := NEW.ingreso_id;
        WHEN 'form1_datos_nino' THEN v_ingreso_id := NEW.ingreso_id;
        WHEN 'form1_derivacion' THEN v_ingreso_id := NEW.ingreso_id;
        WHEN 'form1_motivo' THEN v_ingreso_id := NEW.ingreso_id;
        WHEN 'form1_decision' THEN v_ingreso_id := NEW.ingreso_id;
        WHEN 'form2_planificacion' THEN v_ingreso_id := NEW.ingreso_id;
        WHEN 'form2_intervenciones' THEN v_ingreso_id := NEW.ingreso_id;
        WHEN 'form3_informe_sintesis' THEN v_ingreso_id := NEW.ingreso_id;
        WHEN 'medidas' THEN v_ingreso_id := NEW.ingreso_id;
        WHEN 'documentos' THEN v_ingreso_id := NEW.ingreso_id;
        WHEN 'grupo_conviviente' THEN v_ingreso_id := NEW.ingreso_id;
        WHEN 'referentes_comunitarios' THEN v_ingreso_id := NEW.ingreso_id;
        ELSE v_ingreso_id := NULL;
    END CASE;

    IF v_ingreso_id IS NOT NULL THEN
        UPDATE public.ingresos 
        SET updated_at = NOW() 
        WHERE id = v_ingreso_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aplicar triggers de "toque" a todas las tablas relacionales
-- (Agregue más según sea necesario)
DROP TRIGGER IF EXISTS trg_track_form1_motivo ON public.form1_motivo;
CREATE TRIGGER trg_track_form1_motivo AFTER INSERT OR UPDATE ON public.form1_motivo FOR EACH ROW EXECUTE FUNCTION public.track_parent_ingreso_change();

DROP TRIGGER IF EXISTS trg_track_vulneraciones ON public.derechos_vulnerados;
CREATE TRIGGER trg_track_vulneraciones AFTER INSERT OR UPDATE ON public.derechos_vulnerados FOR EACH ROW EXECUTE FUNCTION public.track_parent_ingreso_change();

DROP TRIGGER IF EXISTS trg_track_intervenciones ON public.form2_intervenciones;
CREATE TRIGGER trg_track_intervenciones AFTER INSERT OR UPDATE ON public.form2_intervenciones FOR EACH ROW EXECUTE FUNCTION public.track_parent_ingreso_change();

DROP TRIGGER IF EXISTS trg_track_medidas ON public.medidas;
CREATE TRIGGER trg_track_medidas AFTER INSERT OR UPDATE ON public.medidas FOR EACH ROW EXECUTE FUNCTION public.track_parent_ingreso_change();

COMMIT;
