-- =====================================================
-- SEGURIDAD: POLÍTICAS DE RLS (Row Level Security)
-- =====================================================

-- Habilitar RLS en tablas clave
ALTER TABLE servicios_proteccion ENABLE ROW LEVEL SECURITY;
ALTER TABLE zonas ENABLE ROW LEVEL SECURITY;
ALTER TABLE expedientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingresos ENABLE ROW LEVEL SECURITY;

-- 1. POLÍTICAS PARA TABLAS DE CATÁLOGO
-- Permite que cualquier usuario autenticado vea los servicios y zonas (necesario para selects en el front)

DROP POLICY IF EXISTS "Lectura pública para usuarios autenticados" ON servicios_proteccion;
CREATE POLICY "Lectura pública para usuarios autenticados" ON servicios_proteccion
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Lectura pública para usuarios autenticados" ON zonas;
CREATE POLICY "Lectura pública para usuarios autenticados" ON zonas
FOR SELECT TO authenticated USING (true);


-- 2. POLÍTICAS PARA EXPEDIENTES (VISIBILIDAD SEGÚN ROL)

-- Borrar políticas previas si existen para evitar conflictos
DROP POLICY IF EXISTS "Admins pueden ver todo" ON expedientes;
DROP POLICY IF EXISTS "Coordinadores ven su zona" ON expedientes;
DROP POLICY IF EXISTS "Profesionales ven su SPD" ON expedientes;

-- Regla 1: Administradores ven todo
CREATE POLICY "Admins pueden ver todo" ON expedientes
FOR SELECT TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM usuarios_roles ur 
    JOIN roles r ON ur.rol_id = r.id 
    WHERE ur.usuario_id = auth.uid() AND r.nombre = 'Administrador'
  )
);

-- Regla 2: Coordinadores ven su zona
CREATE POLICY "Coordinadores ven su zona" ON expedientes
FOR SELECT TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM usuarios u
    JOIN usuarios_roles ur ON u.id = ur.usuario_id
    JOIN roles r ON ur.rol_id = r.id
    WHERE ur.usuario_id = auth.uid() 
    AND r.nombre = 'Coordinador'
    AND u.zona_id = expedientes.zona_id
  )
);

-- Regla 3: Profesionales ven su SPD
CREATE POLICY "Profesionales ven su SPD" ON expedientes
FOR SELECT TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM usuarios u
    JOIN usuarios_roles ur ON u.id = ur.usuario_id
    JOIN roles r ON ur.rol_id = r.id
    WHERE ur.usuario_id = auth.uid() 
    AND r.nombre = 'Profesional'
    AND u.servicio_proteccion_id = expedientes.servicio_proteccion_id
  )
);


-- 3. POLÍTICAS PARA INGRESOS (Heredan permisos de expediente)

DROP POLICY IF EXISTS "Visibilidad basada en expediente" ON ingresos;
CREATE POLICY "Visibilidad basada en expediente" ON ingresos
FOR SELECT TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM expedientes e WHERE e.id = ingresos.expediente_id
  )
);
