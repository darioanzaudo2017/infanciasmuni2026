# CAPA 4 — Row Level Security (RLS) en Supabase

## Verificar estado de RLS en todas las tablas

```sql
-- Tablas SIN RLS activado (riesgo crítico)
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = false;
```

Si el resultado tiene filas → esas tablas son accesibles por CUALQUIER usuario
autenticado (o anónimo si la policy lo permite).

## Verificar políticas existentes

```sql
-- Ver todas las políticas RLS del proyecto
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

## Patrones problemáticos a detectar

```sql
-- ❌ MAL: policy que permite todo a cualquiera
CREATE POLICY "allow_all" ON tramites FOR ALL USING (true);

-- ❌ MAL: tabla con RLS activado pero SIN políticas
-- (bloquea TODO — ni el propio usuario puede leer sus datos)
ALTER TABLE documentos ENABLE ROW LEVEL SECURITY;
-- sin ningún CREATE POLICY → nadie puede acceder

-- ✅ CORRECTO: política por usuario autenticado
CREATE POLICY "own_data" ON tramites
  FOR ALL USING (auth.uid() = user_id);

-- ✅ CORRECTO: lectura pública, escritura solo autenticado
CREATE POLICY "public_read" ON noticias
  FOR SELECT USING (true);
CREATE POLICY "auth_write" ON noticias
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
```

## Verificar uso de service_role vs anon key

```sql
-- Ver si hay funciones con SECURITY DEFINER (bypasean RLS)
SELECT routine_name, security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND security_type = 'DEFINER';
```

⚠️ Las funciones `SECURITY DEFINER` corren con permisos del owner y
**bypasean RLS**. Usar solo cuando sea estrictamente necesario.
Preferir `SECURITY INVOKER` por defecto.

---

## Notas específicas para proyectos municipales

Los proyectos municipales tienen consideraciones extra:

1. **Datos sensibles de ciudadanos** (DNI, domicilio, situación social):
   las políticas RLS deben ser más restrictivas que proyectos comerciales.
   Nunca exponer datos de terceros a través de la anon key.

2. **Roles municipales** (`vecino`, `inspector`, `admin_area`, `admin_municipio`):
   cada tabla debe tener políticas para CADA rol explícitamente.
   No asumir que "si no hay policy de ese rol, no puede acceder" — verificarlo.

3. **Auditoría de accesos**: considerar agregar triggers de Supabase que
   logueen accesos a tablas sensibles (NNyA, datos médicos, etc.):
   ```sql
   CREATE TABLE audit_log (
     id uuid DEFAULT gen_random_uuid(),
     user_id uuid REFERENCES auth.users,
     tabla text,
     operacion text,
     created_at timestamptz DEFAULT now()
   );
   ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
   -- Solo admins pueden leer
   CREATE POLICY "admin_only" ON audit_log
     FOR SELECT USING (
       EXISTS (
         SELECT 1 FROM usuarios
         WHERE id = auth.uid() AND rol = 'admin_municipio'
       )
     );
   ```
