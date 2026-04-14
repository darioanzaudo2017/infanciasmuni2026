-- =====================================================================
-- RLS REFINADO - SISTEMA INTEGRAL DE PROTECCIÓN DE DERECHOS
-- =====================================================================
-- Este script implementa un sistema de seguridad basado en alcances:
-- Administrador: Global
-- Coordinador: Por Zona (lectura zona, escritura SPD-Zona)
-- Profesional: Por SPD (lectura/escritura SPD)
-- =====================================================================

-- 0. ACTIVACIÓN DE RLS EN TODAS LAS TABLAS
---------------------------------------------------------------------
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') 
    LOOP
        EXECUTE 'ALTER TABLE public.' || quote_ident(r.tablename) || ' ENABLE ROW LEVEL SECURITY;';
    END LOOP;
END $$;

-- 1. FUNCIONES AUXILIARES (SECURITY DEFINER para evitar recursividad)
---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION es_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM usuarios_roles ur
    JOIN roles r ON ur.rol_id = r.id
    WHERE ur.usuario_id = auth.uid() AND r.nombre = 'Administrador'
  )
$$;

CREATE OR REPLACE FUNCTION es_coordinador()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM usuarios_roles ur
    JOIN roles r ON ur.rol_id = r.id
    WHERE ur.usuario_id = auth.uid() AND r.nombre = 'Coordinador'
  )
$$;

-- Función Maestra de Lectura
CREATE OR REPLACE FUNCTION puede_leer_datos(p_zona_id bigint, p_spd_id bigint)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT
    es_admin()
    OR EXISTS (
      SELECT 1 FROM usuarios u
      WHERE u.id = auth.uid()
      AND (
        (u.zona_id = p_zona_id) -- Coordinador ve toda su zona
        OR 
        (u.servicio_proteccion_id = p_spd_id) -- Profesional ve su SPD
      )
    )
$$;

-- Función Maestra de Escritura
CREATE OR REPLACE FUNCTION puede_escribir_datos(p_zona_id bigint, p_spd_id bigint)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT
    es_admin()
    OR EXISTS (
      SELECT 1 FROM usuarios u
      WHERE u.id = auth.uid()
      AND (
        -- Coordinador escribe en cualquier SPD de su zona
        (es_coordinador() AND u.zona_id = p_zona_id)
        OR
        -- Profesional escribe en su SPD asignado
        (u.servicio_proteccion_id = p_spd_id)
      )
    )
$$;

-- 2. POLÍTICAS PARA TABLAS DE CATÁLOGO (Solo lectura)
---------------------------------------------------------------------
-- Zonas, Barrios, Estados, Roles, Servicios, Catálogo Derechos
DO $$ 
DECLARE 
    tbl TEXT;
    catalog_tables TEXT[] := ARRAY['zonas', 'barrios', 'estados', 'roles', 'servicios_proteccion', 'catalogo_derechos'];
BEGIN
    FOREACH tbl IN ARRAY catalog_tables LOOP
        EXECUTE 'DROP POLICY IF EXISTS "SELECT_PUBLIC" ON ' || tbl;
        EXECUTE 'CREATE POLICY "SELECT_PUBLIC" ON ' || tbl || ' FOR SELECT TO authenticated USING (true)';
        
        EXECUTE 'DROP POLICY IF EXISTS "ADMIN_ALL" ON ' || tbl;
        EXECUTE 'CREATE POLICY "ADMIN_ALL" ON ' || tbl || ' FOR ALL TO authenticated USING (es_admin()) WITH CHECK (es_admin())';
    END LOOP;
END $$;

-- 3. POLÍTICA PARA USUARIOS (Privacidad de perfiles)
---------------------------------------------------------------------
DROP POLICY IF EXISTS "RLS_USUARIOS" ON usuarios;
CREATE POLICY "RLS_USUARIOS" ON usuarios
FOR ALL TO authenticated
USING (id = auth.uid() OR es_admin() OR es_coordinador())
WITH CHECK (id = auth.uid() OR es_admin());

DROP POLICY IF EXISTS "RLS_USUARIOS_ROLES" ON usuarios_roles;
CREATE POLICY "RLS_USUARIOS_ROLES" ON usuarios_roles
FOR ALL TO authenticated
USING (usuario_id = auth.uid() OR es_admin())
WITH CHECK (es_admin());

-- 4. POLÍTICAS PARA NINOS (Paso previo al expediente)
---------------------------------------------------------------------
DROP POLICY IF EXISTS "RLS_NINOS" ON ninos;
CREATE POLICY "RLS_NINOS" ON ninos
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- 5. POLÍTICAS PARA EXPEDIENTES
---------------------------------------------------------------------
DROP POLICY IF EXISTS "SELECT_EXPEDIENTES" ON expedientes;
CREATE POLICY "SELECT_EXPEDIENTES" ON expedientes FOR SELECT TO authenticated
  USING (puede_leer_datos(zona_id, servicio_proteccion_id));

DROP POLICY IF EXISTS "INSERT_EXPEDIENTES" ON expedientes;
CREATE POLICY "INSERT_EXPEDIENTES" ON expedientes FOR INSERT TO authenticated
  WITH CHECK (puede_escribir_datos(zona_id, servicio_proteccion_id));

DROP POLICY IF EXISTS "UPDATE_EXPEDIENTES" ON expedientes;
CREATE POLICY "UPDATE_EXPEDIENTES" ON expedientes FOR UPDATE TO authenticated
  USING (puede_escribir_datos(zona_id, servicio_proteccion_id))
  WITH CHECK (true);

DROP POLICY IF EXISTS "DELETE_EXPEDIENTES" ON expedientes;
CREATE POLICY "DELETE_EXPEDIENTES" ON expedientes FOR DELETE TO authenticated
  USING (es_admin());

-- 6. POLÍTICAS PARA INGRESOS (Heredan de expediente)
---------------------------------------------------------------------
DROP POLICY IF EXISTS "RLS_INGRESOS" ON ingresos;

CREATE POLICY "SELECT_INGRESOS" ON ingresos FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM expedientes e WHERE e.id = expediente_id AND puede_leer_datos(e.zona_id, e.servicio_proteccion_id)));

CREATE POLICY "INSERT_INGRESOS" ON ingresos FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM expedientes e WHERE e.id = expediente_id AND puede_escribir_datos(e.zona_id, e.servicio_proteccion_id)));

CREATE POLICY "UPDATE_INGRESOS" ON ingresos FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM expedientes e WHERE e.id = expediente_id AND puede_escribir_datos(e.zona_id, e.servicio_proteccion_id)))
  WITH CHECK (true);

CREATE POLICY "DELETE_INGRESOS" ON ingresos FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM expedientes e WHERE e.id = expediente_id AND es_admin()));

-- 7. TABLAS LIGADAS A INGRESO (Pattern unificado)
---------------------------------------------------------------------
DO $$ 
DECLARE 
    tbl TEXT;
    ingreso_tables TEXT[] := ARRAY[
        'actas', 'ampliaciones', 'derechos_vulnerados', 'documentos',
        'form1_criterios', 'form1_datos_nino', 'form1_decision', 'form1_derivacion',
        'form1_intervenciones_previas', 'form1_motivo', 'form1_situacion',
        'form2_intervenciones', 'form2_planificacion', 'form3_informe_sintesis',
        'form9_cese_ingreso', 'informes_tecnicos', 'medidas', 'solicitudes_senaf'
    ];
BEGIN
    FOREACH tbl IN ARRAY ingreso_tables LOOP
        EXECUTE 'DROP POLICY IF EXISTS "RLS_' || tbl || '" ON ' || tbl;
        EXECUTE 'CREATE POLICY "RLS_' || tbl || '" ON ' || tbl || ' FOR ALL TO authenticated 
            USING (EXISTS (SELECT 1 FROM ingresos i JOIN expedientes e ON i.expediente_id = e.id WHERE i.id = ingreso_id AND puede_leer_datos(e.zona_id, e.servicio_proteccion_id)))
            WITH CHECK (EXISTS (SELECT 1 FROM ingresos i JOIN expedientes e ON i.expediente_id = e.id WHERE i.id = ingreso_id AND puede_escribir_datos(e.zona_id, e.servicio_proteccion_id)))';
    END LOOP;
END $$;

-- 8. TABLAS LIGADAS A EXPEDIENTE DIRECTO
---------------------------------------------------------------------
DO $$ 
DECLARE 
    tbl TEXT;
    expediente_tables TEXT[] := ARRAY['grupo_conviviente', 'referentes_comunitarios', 'notificaciones', 'transferencias_expedientes'];
BEGIN
    FOREACH tbl IN ARRAY expediente_tables LOOP
        EXECUTE 'DROP POLICY IF EXISTS "RLS_' || tbl || '" ON ' || tbl;
        EXECUTE 'CREATE POLICY "RLS_' || tbl || '" ON ' || tbl || ' FOR ALL TO authenticated 
            USING (EXISTS (SELECT 1 FROM expedientes e WHERE e.id = expediente_id AND puede_leer_datos(e.zona_id, e.servicio_proteccion_id)))
            WITH CHECK (EXISTS (SELECT 1 FROM expedientes e WHERE e.id = expediente_id AND puede_escribir_datos(e.zona_id, e.servicio_proteccion_id)))';
    END LOOP;
END $$;

-- 9. NOTIFICACIONES ESPECÍFICAS
---------------------------------------------------------------------
DROP POLICY IF EXISTS "RLS_NOTIFICACIONES_USUARIOS" ON notificaciones_usuarios;
CREATE POLICY "RLS_NOTIFICACIONES_USUARIOS" ON notificaciones_usuarios
FOR ALL TO authenticated
USING (usuario_id = auth.uid() OR es_admin())
WITH CHECK (usuario_id = auth.uid() OR es_admin());

-- 10. AUDITORÍA (Solo lectura para Admin)
---------------------------------------------------------------------
DROP POLICY IF EXISTS "RLS_AUDITORIA" ON auditoria;
CREATE POLICY "RLS_AUDITORIA" ON auditoria
FOR SELECT TO authenticated USING (es_admin());
