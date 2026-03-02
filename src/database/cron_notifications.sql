-- 1. Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Función para notificar medidas próximas a vencer (3 días)
CREATE OR REPLACE FUNCTION notify_upcoming_deadlines()
RETURNS void AS $$
DECLARE
    rec RECORD;
BEGIN
    FOR rec IN 
        SELECT m.id, m.ingreso_id, i.profesional_asignado_id, e.numero_expediente
        FROM medidas m
        JOIN ingresos i ON m.ingreso_id = i.id
        JOIN expedientes e ON i.expediente_id = e.id
        WHERE m.estado = 'activo' 
          AND m.fecha_vencimiento::date = (CURRENT_DATE + INTERVAL '3 days')::date
    LOOP
        INSERT INTO notificaciones (usuario_id, titulo, mensaje, tipo, link)
        VALUES (
            rec.profesional_asignado_id,
            'Vencimiento Próximo (3 días)',
            'La medida del expediente #' || rec.numero_expediente || ' vence en 3 días.',
            'warning',
            '/expedientes/' || (SELECT expediente_id FROM ingresos WHERE id = rec.ingreso_id) || '/ingresos/' || rec.ingreso_id
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 3. Función para notificar expedientes inactivos (15 días)
CREATE OR REPLACE FUNCTION notify_inactive_expedientes()
RETURNS void AS $$
DECLARE
    rec RECORD;
BEGIN
    FOR rec IN 
        SELECT i.id, i.profesional_asignado_id, e.numero_expediente, i.expediente_id
        FROM ingresos i
        JOIN expedientes e ON i.expediente_id = e.id
        WHERE i.estado = 'activo' 
          AND i.updated_at::date = (CURRENT_DATE - INTERVAL '15 days')::date
    LOOP
        INSERT INTO notificaciones (usuario_id, titulo, mensaje, tipo, link)
        VALUES (
            rec.profesional_asignado_id,
            'Alerta de Inactividad',
            'El expediente #' || rec.numero_expediente || ' no ha tenido movimientos en 15 días.',
            'info',
            '/expedientes/' || rec.expediente_id || '/ingresos/' || rec.id
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 4. Programar las tareas (Cron Jobs)
-- Nota: Se ejecutan diariamente a las 08:00 y 08:30 GMT
SELECT cron.schedule('check-deadlines-08am', '0 8 * * *', 'SELECT notify_upcoming_deadlines()');
SELECT cron.schedule('check-inactivity-0830am', '30 8 * * *', 'SELECT notify_inactive_expedientes()');
