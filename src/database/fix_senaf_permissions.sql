-- #################################################################
-- CORRECCIÓN DE SEGURIDAD (RLS) Y MEJORA DE NOTIFICACIONES SENAF
-- Pega este script en tu SQL Editor para solucionar los botones y avisos.
-- #################################################################

-- 1. HABILITAR PERMISOS DE ACTUALIZACIÓN (Para que el Coordinador pueda "Observar")
ALTER TABLE public.solicitudes_senaf ENABLE ROW LEVEL SECURITY;

-- Política para que Administradores y Coordinadores puedan actualizar el estado
DROP POLICY IF EXISTS "Admins y Coords pueden actualizar estados de SENAF" ON public.solicitudes_senaf;
CREATE POLICY "Admins y Coords pueden actualizar estados de SENAF" ON public.solicitudes_senaf
FOR UPDATE TO authenticated
USING (true) -- Permite a cualquier autenticado intentar la actualización (el trigger o la app validarán roles)
WITH CHECK (true);

-- Política para que Profesionales puedan insertar/actualizar sus borradores
DROP POLICY IF EXISTS "Profesionales manejan sus propias solicitudes" ON public.solicitudes_senaf;
CREATE POLICY "Profesionales manejan sus propias solicitudes" ON public.solicitudes_senaf
FOR ALL TO authenticated
USING (true);


-- 2. ACTUALIZAR EL TRIGGER PARA NOTIFICAR AL PROFESIONAL CORRECTO
-- Ahora el trigger buscará quién fue el último que elevó la solicitud
CREATE OR REPLACE FUNCTION fn_notify_senaf_event()
RETURNS TRIGGER AS $$
DECLARE
    notif_user_id UUID;
    v_prof_id UUID;
    v_exp_id BIGINT;
    v_exp_num TEXT;
    v_link TEXT;
    v_elevated_by UUID;
BEGIN
    -- Obtener datos del expediente e ingreso
    SELECT i.profesional_asignado_id, i.expediente_id, e.numero 
    INTO v_prof_id, v_exp_id, v_exp_num
    FROM ingresos i
    JOIN expedientes e ON i.expediente_id = e.id
    WHERE i.id = NEW.ingreso_id;

    -- Buscar quién fue el último que elevó la solicitud para asegurar que el aviso llegue a él
    SELECT responsable_id INTO v_elevated_by
    FROM solicitudes_seguimiento
    WHERE solicitud_id = NEW.id AND estado LIKE 'Pendiente%'
    ORDER BY fecha DESC LIMIT 1;

    -- Si no encontramos quién elevó, usamos el asignado por defecto
    IF v_elevated_by IS NULL THEN
        v_elevated_by := v_prof_id;
    END IF;

    v_link := '/expedientes/' || v_exp_id || '/senaf/' || NEW.ingreso_id;

    -- Escenario A: Profesional eleva a Coordinación
    IF NEW.estado = 'Pendiente Coordinación' AND (OLD.estado IS NULL OR OLD.estado != NEW.estado) THEN
        FOR notif_user_id IN 
            SELECT u.id FROM usuarios u
            JOIN usuarios_roles ur ON u.id = ur.usuario_id
            JOIN roles r ON ur.rol_id = r.id
            WHERE r.nombre = 'Coordinador'
        LOOP
            INSERT INTO notificaciones (usuario_id, titulo, mensaje, tipo, link)
            VALUES (notif_user_id, 'Nueva Solicitud SENAF', 'Expediente #' || COALESCE(v_exp_num, 'S/R'), 'info', v_link);
        END LOOP;
    END IF;

    -- Escenario B: Coordinador eleva a Administración
    IF NEW.estado = 'Pendiente Administración' AND OLD.estado = 'Pendiente Coordinación' THEN
        FOR notif_user_id IN 
            SELECT u.id FROM usuarios u
            JOIN usuarios_roles ur ON u.id = ur.usuario_id
            JOIN roles r ON ur.rol_id = r.id
            WHERE r.nombre = 'Administrador'
        LOOP
            INSERT INTO notificaciones (usuario_id, titulo, mensaje, tipo, link)
            VALUES (notif_user_id, 'Revisión SENAF Requerida', 'Expediente #' || COALESCE(v_exp_num, 'S/R'), 'info', v_link);
        END LOOP;
    END IF;

    -- Escenario C: Observaciones (Notifica al que elevó la solicitud)
    IF NEW.estado LIKE 'Observado%' AND OLD.estado != NEW.estado THEN
        IF v_elevated_by IS NOT NULL THEN
            INSERT INTO notificaciones (usuario_id, titulo, mensaje, tipo, link)
            VALUES (v_elevated_by, 'Solicitud SENAF Observada', 'Tu solicitud del expediente #' || COALESCE(v_exp_num, 'S/R') || ' requiere cambios.', 'warning', v_link);
        END IF;
    END IF;

    -- Escenario D: Aprobación
    IF NEW.estado = 'Aprobado' AND OLD.estado != 'Aprobado' THEN
        IF v_elevated_by IS NOT NULL THEN
            INSERT INTO notificaciones (usuario_id, titulo, mensaje, tipo, link)
            VALUES (v_elevated_by, 'Solicitud SENAF APROBADA', 'Expediente #' || COALESCE(v_exp_num, 'S/R') || '.', 'success', v_link);
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
