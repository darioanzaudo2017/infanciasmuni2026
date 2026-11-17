-- Nueva vista para el Panel de Control: permite graficar las Medidas de
-- Protección del sistema agrupadas por estado (pendiente/en proceso/completa)
-- y por tipo, respetando el mismo filtro de zona/SPD que el resto del
-- dashboard (vw_dashboard_kpis/vw_dashboard_derechos). security_invoker=true
-- para que la RLS de medidas/ingresos/expedientes decida qué filas ve cada rol.

CREATE VIEW vw_dashboard_medidas
WITH (security_invoker = true) AS
SELECT
    m.id AS medida_id,
    m.ingreso_id,
    m.estado,
    m.medida_propuesta,
    e.id AS expediente_id,
    e.servicio_proteccion_id,
    e.zona_id,
    sp.nombre AS spd_nombre,
    z.nombre AS zona_nombre,
    i.fecha_ingreso
FROM medidas m
JOIN ingresos i ON i.id = m.ingreso_id
JOIN expedientes e ON e.id = i.expediente_id
JOIN servicios_proteccion sp ON sp.id = e.servicio_proteccion_id
JOIN zonas z ON z.id = e.zona_id;

GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
    ON vw_dashboard_medidas TO anon, authenticated, service_role, postgres;
