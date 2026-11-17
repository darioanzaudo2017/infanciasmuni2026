-- Endurecimiento y costo de las funciones de rol + politicas RLS que llamaban auth.uid()/es_admin() por fila.
--
-- Motivo (advisors de Supabase, nov/2026):
--   * auth_rls_initplan (8 politicas): usuarios, usuarios_roles, notificaciones, notificaciones_usuarios usaban
--     auth.uid() / es_admin() / es_coordinador() sin envolver en (select ...), lo que obliga a reevaluarlos por cada
--     fila en vez de una sola vez por consulta (InitPlan).
--   * function_search_path_mutable: es_admin, es_coordinador y puede_escribir_datos no fijaban search_path.
--   * puede_escribir_datos() tenia el mismo patron costoso que tenia puede_leer_datos() (varias funciones
--     SECURITY DEFINER encadenadas + 2 EXISTS por llamada).
--
-- ALCANCE: cambio de rendimiento/hardening con la MISMA semantica. No se agrega ni se quita ningun permiso.
--   Verificado: puede_escribir_datos() nueva = actual (0 diferencias) para profesional, coordinador, administrador,
--   usuario inexistente y sin sesion, en todas las combinaciones zona/SPD existentes.
--   Las politicas se modifican con ALTER POLICY: conservan comando, roles y permisividad.
--
-- NO INCLUIDO (requiere decision aparte, ver informe): las politicas de usuarios/usuarios_roles son mas amplias de
-- lo esperado (RLS_USUARIOS es FOR ALL con id = auth.uid() / es_coordinador()). Se preservan tal cual aqui.

begin;

-- 1) Funciones de rol: mismo cuerpo, search_path fijo.
create or replace function public.es_admin()
returns boolean language sql stable security definer set search_path = public as $function$
  select exists (
    select 1 from public.usuarios_roles ur
    join public.roles r on ur.rol_id = r.id
    where ur.usuario_id = auth.uid() and r.nombre = 'Administrador'
  )
$function$;

create or replace function public.es_coordinador()
returns boolean language sql stable security definer set search_path = public as $function$
  select exists (
    select 1 from public.usuarios_roles ur
    join public.roles r on ur.rol_id = r.id
    where ur.usuario_id = auth.uid() and r.nombre = 'Coordinador'
  )
$function$;

-- 2) puede_escribir_datos(): misma logica que puede_leer_datos(), una sola consulta.
create or replace function public.puede_escribir_datos(p_zona_id bigint, p_spd_id bigint)
returns boolean language sql stable security definer set search_path = public as $function$
  select case
    when coalesce(r.adm, false)   then true
    when coalesce(r.coord, false) then coalesce(u.zona_id = p_zona_id, false)
    else                               coalesce(u.servicio_proteccion_id = p_spd_id, false)
  end
  from (
    select bool_or(ro.nombre = 'Administrador') as adm,
           bool_or(ro.nombre = 'Coordinador')   as coord
    from public.usuarios_roles ur
    join public.roles ro on ur.rol_id = ro.id
    where ur.usuario_id = auth.uid()
  ) r
  left join public.usuarios u on u.id = auth.uid()
$function$;

-- 3) Politicas: auth.uid() / es_admin() / es_coordinador() evaluados una sola vez por consulta.
alter policy "SELECT_NOTIFICACIONES" on public.notificaciones
  using ((usuario_id = (select auth.uid())) or (select public.es_admin()));

alter policy "UPDATE_NOTIFICACIONES" on public.notificaciones
  using ((usuario_id = (select auth.uid())) or (select public.es_admin()))
  with check ((usuario_id = (select auth.uid())) or (select public.es_admin()));

alter policy "SELECT_NOTIFICACIONES_USUARIOS" on public.notificaciones_usuarios
  using ((usuario_id = (select auth.uid())) or (select public.es_admin()));

alter policy "UPDATE_NOTIFICACIONES_USUARIOS" on public.notificaciones_usuarios
  using ((usuario_id = (select auth.uid())) or (select public.es_admin()))
  with check ((usuario_id = (select auth.uid())) or (select public.es_admin()));

alter policy "RLS_USUARIOS" on public.usuarios
  using ((id = (select auth.uid())) or (select public.es_admin()) or (select public.es_coordinador()))
  with check ((id = (select auth.uid())) or (select public.es_admin()) or (select public.es_coordinador()));

alter policy "SELECT_USUARIOS" on public.usuarios
  using ((id = (select auth.uid())) or (select public.es_admin()) or (select public.es_coordinador()));

alter policy "UPDATE_USUARIOS" on public.usuarios
  using ((id = (select auth.uid())) or (select public.es_admin()) or (select public.es_coordinador()))
  with check ((id = (select auth.uid())) or (select public.es_admin()) or (select public.es_coordinador()));

alter policy "RLS_USUARIOS_ROLES" on public.usuarios_roles
  using ((usuario_id = (select auth.uid())) or (select public.es_admin()) or (select public.es_coordinador()))
  with check ((select public.es_admin()) or (select public.es_coordinador()));

commit;

-- VERIFICACION POST-APLICACION (solo lectura):
--   select polname, pg_get_expr(polqual, polrelid) from pg_policy
--   where polrelid in ('public.usuarios'::regclass,'public.usuarios_roles'::regclass,'public.notificaciones'::regclass,'public.notificaciones_usuarios'::regclass);
--     -> las expresiones deben mostrar (SELECT auth.uid() AS uid) y (SELECT es_admin() AS es_admin)
--   Advisors de performance: debe desaparecer auth_rls_initplan (8).
