-- #################################################################
-- SOLUCIÓN INTEGRAL PARA NOTIFICACIONES DE SENAF Y SEGURIDAD (RLS)
-- Pega todo este código en tu SQL Editor de Supabase y presiona "Run".
-- #################################################################

-- 1. ASEGURAR QUE LA TABLA DE NOTIFICACIONES TENGA RLS Y PERMISOS
ALTER TABLE notificaciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios pueden ver sus propias notificaciones" ON notificaciones;
CREATE POLICY "Usuarios pueden ver sus propias notificaciones" ON notificaciones
FOR SELECT TO authenticated USING (auth.uid() = usuario_id);

DROP POLICY IF EXISTS "Sistema y usuarios pueden insertar notificaciones" ON notificaciones;
CREATE POLICY "Sistema y usuarios pueden insertar notificaciones" ON notificaciones
FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Usuarios pueden marcar como leídas sus notificaciones" ON notificaciones;
CREATE POLICY "Usuarios pueden marcar como leídas sus notificaciones" ON notificaciones
FOR UPDATE TO authenticated USING (auth.uid() = usuario_id);

-- 2. ASEGURAR VISIBILIDAD DE USUARIOS Y ROLES (Para que el frente pueda "ver" a quién notificar)
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lectura pública de perfiles para usuarios autenticados" ON usuarios;
CREATE POLICY "Lectura pública de perfiles para usuarios autenticados" ON usuarios
FOR SELECT TO authenticated USING (true);

ALTER TABLE usuarios_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lectura pública de roles para usuarios autenticados" ON usuarios_roles;
CREATE POLICY "Lectura pública de roles para usuarios autenticados" ON usuarios_roles
FOR SELECT TO authenticated USING (true);

-- 3. TRIGGER AUTOMÁTICO PARA SENAF (VISIBILIDAD GLOBAL)
CREATE OR REPLACE FUNCTION fn_notify_senaf_event()
RETURNS TRIGGER AS $$
DECLARE
    notif_user_id UUID;
    v_prof_id UUID;
    v_exp_id BIGINT;
    v_exp_num TEXT;
    v_link TEXT;
BEGIN
    -- Obtener datos del expediente e ingreso relacionados
    SELECT i.profesional_asignado_id, i.expediente_id, e.numero_expediente 
    INTO v_prof_id, v_exp_id, v_exp_num
    FROM ingresos i
    JOIN expedientes e ON i.expediente_id = e.id
    WHERE i.id = NEW.ingreso_id;

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
            VALUES (
                notif_user_id,
                'Nueva Solicitud SENAF',
                'Se ha elevado una solicitud para el expediente #' || COALESCE(v_exp_num, 'S/D') || '.',
                'info',
                v_link
            );
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
            VALUES (
                notif_user_id,
                'Revisión SENAF Requerida',
                'Un coordinador ha elevado una solicitud para aprobación final (#' || COALESCE(v_exp_num, 'S/D') || ').',
                'info',
                v_link
            );
        END LOOP;
    END IF;

    -- Escenario C: Observaciones
    IF NEW.estado LIKE 'Observado%' AND OLD.estado != NEW.estado THEN
        IF v_prof_id IS NOT NULL THEN
            INSERT INTO notificaciones (usuario_id, titulo, mensaje, tipo, link)
            VALUES (
                v_prof_id,
                'Solicitud SENAF Observada',
                'Tu solicitud para el expediente #' || COALESCE(v_exp_num, 'S/D') || ' tiene observaciones.',
                'warning',
                v_link
            );
        END IF;
    END IF;

    -- Escenario D: Aprobación Final
    IF NEW.estado = 'Aprobado' AND OLD.estado != 'Aprobado' THEN
        IF v_prof_id IS NOT NULL THEN
            INSERT INTO notificaciones (usuario_id, titulo, mensaje, tipo, link)
            VALUES (
                v_prof_id,
                'Solicitud SENAF APROBADA',
                '!Éxito! La solicitud del expediente #' || COALESCE(v_exp_num, 'S/D') || ' fue aprobada.',
                'success',
                v_link
            );
        END IF;
        
        FOR notif_user_id IN 
            SELECT u.id FROM usuarios u
            JOIN usuarios_roles ur ON u.id = ur.usuario_id
            JOIN roles r ON ur.rol_id = r.id
            WHERE r.nombre = 'Coordinador'
        LOOP
            INSERT INTO notificaciones (usuario_id, titulo, mensaje, tipo, link)
            VALUES (
                notif_user_id,
                'SENAF Finalizada',
                'Se aprobó la medida para el expediente #' || COALESCE(v_exp_num, 'S/D') || '.',
                'success',
                v_link
            );
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear el trigger
DROP TRIGGER IF EXISTS trg_senaf_notifications_global ON solicitudes_senaf;
CREATE TRIGGER trg_senaf_notifications_global
AFTER INSERT OR UPDATE ON solicitudes_senaf
FOR EACH ROW
EXECUTE FUNCTION fn_notify_senaf_event();
