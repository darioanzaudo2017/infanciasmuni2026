-- Corrige la lógica de "activo" en las vistas de expedientes e ingresos.
-- Un expediente se considera ACTIVO si tiene al menos un ingreso que NO esté 'cerrado'.

-- 0. Eliminar vistas existentes para evitar conflictos de columnas (ERROR 42P16)
DROP VIEW IF EXISTS vw_ingresos_detalle CASCADE;
DROP VIEW IF EXISTS vw_expedientes_list CASCADE;


-- 1. Vista de lista de expedientes
CREATE OR REPLACE VIEW vw_expedientes_list AS
SELECT 
    e.id,
    e.numero,
    e.fecha_apertura,
    -- Lógica Dinámica: Activo si existe algún ingreso no cerrado para este expediente
    (EXISTS (
        SELECT 1 
        FROM ingresos i 
        WHERE i.expediente_id = e.id 
        AND i.estado != 'cerrado'
    )) as activo, 
    n.nombre as nino_nombre,
    n.apellido as nino_apellido,
    n.dni as nino_dni,
    u.nombre_completo as ultimo_profesional,
    s.nombre as spd_nombre,
    e.created_at
FROM expedientes e
JOIN ninos n ON e.nino_id = n.id
LEFT JOIN servicios_proteccion s ON e.servicio_proteccion_id = s.id
LEFT JOIN usuarios u ON e.profesional_id = u.id;

-- 2. Vista de detalle de ingreso
-- Se asegura de utilizar la misma lógica para 'expediente_activo'
CREATE OR REPLACE VIEW vw_ingresos_detalle AS
SELECT 
    i.id,
    i.expediente_id,
    i.numero_ingreso,
    i.fecha_ingreso,
    i.es_emergencia,
    i.etapa,
    i.estado,
    i.fecha_cierre,
    i.motivo_cierre,
    e.numero as expediente_numero,
    -- Lógica Dinámica: Misma que en exp_list
    (EXISTS (
        SELECT 1 
        FROM ingresos i2 
        WHERE i2.expediente_id = e.id 
        AND i2.estado != 'cerrado'
    )) as expediente_activo,
    n.nombre as nino_nombre,
    n.apellido as nino_apellido,
    n.dni as nino_dni,
    n.fecha_nacimiento as nino_fecha_nacimiento,
    n.genero as nino_genero,
    -- Intentamos obtener datos del formulario 1 para complementar (si existen)
    f1.domicilio as nino_domicilio,
    f1.centro_salud as nino_centro_salud,
    f1.historia_clinica as nino_historia_clinica,
    f1.tiene_cud as nino_tiene_cud,
    f1.obra_social as nino_cobertura_medica,
    f1.escuela as nino_institucion_educativa,
    f1.curso as nino_curso,
    f1.turno as nino_turno,
    f1.asiste_regularmente as nino_asiste_regularmente,
    -- Profesional
    u.nombre_completo as profesional_asignado_nombre,
    u.nombre_completo as ultimo_profesional_nombre
FROM ingresos i
JOIN expedientes e ON i.expediente_id = e.id
JOIN ninos n ON e.nino_id = n.id
LEFT JOIN usuarios u ON e.profesional_id = u.id
LEFT JOIN form1_datos_nino f1 ON i.id = f1.ingreso_id;
