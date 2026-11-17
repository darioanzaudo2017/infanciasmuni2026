-- Extiende vw_dashboard_kpis para soportar nuevos KPIs/filtros del Panel de Control:
-- - fecha_cierre: permite calcular tiempo promedio de intervención (dias entre
--   fecha_ingreso y fecha_cierre) para casos cerrados.
-- - profesional_asignado_id / profesional_asignado_nombre: permite filtrar el
--   dashboard por profesional responsable.
-- - tiene_responsable: permite el KPI "Casos sin responsable asignado"
--   (EXISTS contra ingreso_responsables, que ya tiene indice por ingreso_id).
-- No cambia el orden de las columnas existentes, solo agrega al final, pero se
-- hace DROP + CREATE por consistencia con la convencion del proyecto.

DROP VIEW IF EXISTS vw_dashboard_kpis;

CREATE VIEW vw_dashboard_kpis
WITH (security_invoker = true) AS
SELECT
    e.id AS expediente_id,
    e.servicio_proteccion_id,
    e.zona_id,
    e.fecha_apertura,
    sp.nombre AS spd_nombre,
    z.nombre AS zona_nombre,
    i.id AS ingreso_id,
    i.fecha_ingreso,
    i.fecha_cierre,
    i.estado,
    i.etapa,
    i.motivo_cierre,
    fd.decision_id,
    i.profesional_asignado_id,
    up.nombre_completo AS profesional_asignado_nombre,
    EXISTS (
        SELECT 1 FROM ingreso_responsables ir WHERE ir.ingreso_id = i.id
    ) AS tiene_responsable
FROM expedientes e
JOIN servicios_proteccion sp ON sp.id = e.servicio_proteccion_id
JOIN zonas z ON z.id = e.zona_id
LEFT JOIN ingresos i ON i.expediente_id = e.id
LEFT JOIN form1_decision fd ON fd.ingreso_id = i.id
LEFT JOIN usuarios up ON up.id = i.profesional_asignado_id;

GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
    ON vw_dashboard_kpis TO anon, authenticated, service_role, postgres;
