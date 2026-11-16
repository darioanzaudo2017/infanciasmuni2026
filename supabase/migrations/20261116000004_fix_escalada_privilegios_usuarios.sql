-- Fix de 2 vulnerabilidades de escalada de privilegios encontradas en auditoria de seguridad (nov/2026).
-- Probadas en producción dentro de transacciones con ROLLBACK (no quedó nada escrito):
--
-- 1) Cualquier usuario autenticado podía UPDATE su propia fila de `usuarios` cambiando
--    zona_id / servicio_proteccion_id (la política RLS_USUARIOS/UPDATE_USUARIOS permite
--    `id = auth.uid()`, y esas 2 columnas tienen GRANT de UPDATE para `authenticated`).
--    Como puede_leer_datos()/puede_escribir_datos() deciden TODO el acceso por zona/SPD
--    leyendo esas 2 columnas, un Profesional podía auto-asignarse otro SPD y pasar a ver
--    los expedientes de ese SPD. Probado: user@colon.com (SPD 151, 51 expedientes) se
--    cambió a SPD 155 y pasó a ver los 10 expedientes de ese otro SPD.
--    No hay ningún flujo de UI que edite la propia zona/SPD (solo UserFormDrawer.tsx,
--    que edita SIEMPRE la fila de OTRO usuario, desde /usuarios) — es un bug puro.
--
-- 2) Un Coordinador podía INSERT en `usuarios_roles` asignándose a sí mismo el rol
--    Administrador (la política RLS_USUARIOS_ROLES solo exigía es_admin() OR es_coordinador()
--    para escribir, sin restringir QUÉ rol se asigna). es_admin() no tiene límite de zona
--    (a diferencia de es_coordinador()), así que esto es una escalada real, no un alias.
--    Probado: user@coordinacion.com se insertó el rol Administrador y pasó de ver su zona
--    a ver las 77 filas de usuarios y los 641 expedientes de todo el sistema.
--    Decisión del cliente (nov/2026): un Coordinador NO debe poder asignar el rol
--    Administrador (ni a sí mismo ni a otro usuario) — solo un Administrador puede hacerlo.
--    Coordinador sigue pudiendo asignar Profesional/Coordinador como hasta ahora.
--
-- Complementa el fix de la Edge Function `create-user` (service_role, bypassea RLS) que
-- tenía el mismo problema sin ninguna validación del caller.

begin;

-- 1) Nadie que no sea Admin/Coordinador puede cambiar zona_id/servicio_proteccion_id,
--    ni siquiera en su propia fila. Admin/Coordinador conservan la posibilidad de editar
--    esas columnas en CUALQUIER usuario (gestión desde /usuarios, UserFormDrawer.tsx).
create or replace function public.fn_bloquear_autoescalada_usuarios()
returns trigger language plpgsql security definer set search_path = public as $function$
begin
  if not (es_admin() or es_coordinador()) then
    if new.zona_id is distinct from old.zona_id
       or new.servicio_proteccion_id is distinct from old.servicio_proteccion_id then
      raise exception 'No tenés permiso para cambiar tu zona o servicio de protección.'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$function$;

drop trigger if exists trg_bloquear_autoescalada_usuarios on public.usuarios;
create trigger trg_bloquear_autoescalada_usuarios
  before update on public.usuarios
  for each row execute function public.fn_bloquear_autoescalada_usuarios();

-- 2) Solo un Administrador puede asignar el rol "Administrador" en usuarios_roles.
--    Un Coordinador sigue pudiendo insertar/actualizar filas con cualquier OTRO rol
--    (Profesional, Coordinador, Consulta) — mismo comportamiento que hasta ahora.
alter policy "RLS_USUARIOS_ROLES" on public.usuarios_roles
  using (
    (usuario_id = (select auth.uid()))
    or (select public.es_admin())
    or (select public.es_coordinador())
  )
  with check (
    (select public.es_admin())
    or (
      (select public.es_coordinador())
      and rol_id <> (select id from public.roles where nombre = 'Administrador')
    )
  );

commit;

-- VERIFICACION POST-APLICACION (dentro de transacciones con ROLLBACK, no dejan nada escrito):
--
-- A) Un Profesional ya NO puede cambiar su propio SPD:
--   begin;
--   select set_config('request.jwt.claims','{"sub":"<uuid_profesional>","role":"authenticated"}', true);
--   set local role authenticated;
--   update usuarios set servicio_proteccion_id = 155 where id = '<uuid_profesional>';
--   -- debe fallar con "No tenés permiso para cambiar tu zona o servicio de protección."
--   rollback;
--
-- B) Un Coordinador ya NO puede asignarse Administrador:
--   begin;
--   select set_config('request.jwt.claims','{"sub":"<uuid_coordinador>","role":"authenticated"}', true);
--   set local role authenticated;
--   insert into usuarios_roles (usuario_id, rol_id)
--     values ('<uuid_coordinador>', (select id from roles where nombre='Administrador'));
--   -- debe fallar con "new row violates row-level security policy"
--   rollback;
--
-- C) Un Coordinador SIGUE pudiendo asignar Profesional a alguien (no debe romperse):
--   insert/update con rol_id = (select id from roles where nombre='Profesional') debe funcionar igual que antes.
