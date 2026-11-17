-- Los expedientes anulados (expedientes.anulado = true) son registros
-- administrativamente inválidos/erróneos, pero hasta ahora ninguna vista del
-- Panel de Control los excluía: seguían sumando en todos los KPIs y gráficos
-- de Dashboard.tsx igual que un caso real. Probado en vivo nov/2026: se anuló
-- un expediente de prueba y los 8 KPIs del Panel de Control no cambiaron.
--
-- Se agrega WHERE NOT coalesce(e.anulado, false) a las 3 vistas del dashboard
-- que parten de expedientes (vw_dashboard_kpis, vw_dashboard_derechos,
-- vw_dashboard_medidas). No se agrega columna "anulado" a ninguna: el filtro
-- es incondicional porque un anulado nunca debe contarse en el dashboard.
-- DROP + CREATE por consistencia con la convención del proyecto.

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
LEFT JOIN usuarios up ON up.id = i.profesional_asignado_id
WHERE NOT coalesce(e.anulado, false);

GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
    ON vw_dashboard_kpis TO anon, authenticated, service_role, postgres;

DROP VIEW IF EXISTS vw_dashboard_derechos;

CREATE VIEW vw_dashboard_derechos
WITH (security_invoker = true) AS
SELECT
    dv.id AS vulneracion_id,
    dv.ingreso_id,
    dv.derecho_id,
    dv.grave,
    i.expediente_id,
    i.fecha_ingreso,
    i.estado AS ingreso_estado,
    e.servicio_proteccion_id,
    e.zona_id,
    e.fecha_apertura,
    cd.categoria,
    cd.subcategoria
FROM derechos_vulnerados dv
JOIN ingresos i ON i.id = dv.ingreso_id
JOIN expedientes e ON e.id = i.expediente_id
JOIN catalogo_derechos cd ON cd.id = dv.derecho_id
WHERE NOT coalesce(e.anulado, false);

GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
    ON vw_dashboard_derechos TO anon, authenticated, service_role, postgres;

DROP VIEW IF EXISTS vw_dashboard_medidas;

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
JOIN zonas z ON z.id = e.zona_id
WHERE NOT coalesce(e.anulado, false);

GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
    ON vw_dashboard_medidas TO anon, authenticated, service_role, postgres;
