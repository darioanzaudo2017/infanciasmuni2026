-- Segundo paso del fix del timeout (57014) en vw_expedientes_list para rol Profesional.
-- La migracion 20261116000000 elimino las ~7000 llamadas por fila a fn_auditoria_puede_leer(), pero la
-- Bandeja seguia tardando ~8.5s porque:
--   (a) puede_leer_datos() costaba ~1.1ms por llamada (4 funciones SECURITY DEFINER encadenadas + 2 EXISTS), y
--   (b) vw_ultima_modificacion_ingreso leia auditoria 13 veces (11 ramas UNION ALL + 2 CTE), repitiendo el
--       calculo de visibilidad en cada lectura.
-- Cambios:
--   1) puede_leer_datos(): misma logica de permisos en UNA sola consulta (verificado: 0 diferencias contra la
--      version anterior para profesional, coordinador, administrador, usuario inexistente y sin sesion, en todas
--      las combinaciones zona/SPD existentes).
--   2) vw_ultima_modificacion_ingreso: lee auditoria UNA vez usando la columna ingreso_id (mismas columnas,
--      mismas secciones, mismo orden). vw_expedientes_list depende de ella, por eso se recrean las dos
--      (DROP + CREATE, nunca CREATE OR REPLACE cuando cambia la definicion), ambas con security_invoker = true.

begin;

-- 1) puede_leer_datos(): misma semantica, una sola consulta.
--    Se mantiene SECURITY DEFINER + STABLE (ya lo era); se agrega search_path fijo.
create or replace function public.puede_leer_datos(p_zona_id bigint, p_spd_id bigint)
returns boolean
language sql
stable
security definer
set search_path = public
as $function$
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

-- 2) Vistas (se borra primero la dependiente)
drop view public.vw_expedientes_list;
drop view public.vw_ultima_modificacion_ingreso;

create view public.vw_ultima_modificacion_ingreso with (security_invoker = true) as
with aud as (
  select a.ingreso_id, a.tabla, a.accion, a.usuario_id, a.created_at
  from public.auditoria a
  where a.ingreso_id is not null
    and a.tabla in (
      'form1_motivo','form1_datos_nino','form1_decision','form1_derivacion',
      'derechos_vulnerados','grupo_conviviente','referentes_comunitarios','origenes_consulta_adicionales',
      'documentos',
      'form2_planificacion','form2_intervenciones','form2_equipo',
      'form3_informe_sintesis',
      'medidas','medidas_acciones',
      'solicitudes_senaf',
      'ingresos'
    )
),
eventos as (
  select
    aud.ingreso_id,
    case
      when aud.tabla in ('form1_motivo','form1_datos_nino','form1_decision','form1_derivacion',
                         'derechos_vulnerados','grupo_conviviente','referentes_comunitarios',
                         'origenes_consulta_adicionales')            then 'Recepción de la Demanda'
      when aud.tabla = 'documentos'                                   then 'Documentación'
      when aud.tabla in ('form2_planificacion','form2_intervenciones','form2_equipo')
                                                                       then 'Ampliación de Información'
      when aud.tabla = 'form3_informe_sintesis'                       then 'Informe de Síntesis'
      when aud.tabla in ('medidas','medidas_acciones')                then 'Definición de Medidas'
      when aud.tabla = 'solicitudes_senaf'                            then 'SENAF'
      else                                                                  'Datos Generales'
    end as seccion,
    aud.usuario_id,
    aud.created_at
  from aud
),
creacion as (
  select aud.ingreso_id, aud.usuario_id, aud.created_at
  from aud
  where aud.tabla = 'ingresos' and aud.accion = 'INSERT'
)
select distinct on (ev.ingreso_id)
  ev.ingreso_id,
  ev.seccion,
  ev.usuario_id,
  u.nombre_completo  as usuario_nombre,
  ev.created_at,
  c.usuario_id       as creado_por_id,
  uc.nombre_completo as creado_por_nombre,
  c.created_at       as creado_por_fecha
from eventos ev
left join public.usuarios u  on u.id  = ev.usuario_id
left join creacion c         on c.ingreso_id = ev.ingreso_id
left join public.usuarios uc on uc.id = c.usuario_id
order by ev.ingreso_id, ev.created_at desc;

create view public.vw_expedientes_list with (security_invoker = true) as
select
  e.id,
  e.numero,
  e.fecha_apertura,
  e.anulado,
  e.motivo_anulacion,
  e.anulado_at,
  (exists (select 1 from public.ingresos i
           where i.expediente_id = e.id and i.estado::text <> 'cerrado'::text)) as activo,
  n.nombre   as nino_nombre,
  n.apellido as nino_apellido,
  n.dni      as nino_dni,
  coalesce(u_ultimo.nombre_completo, u_creador.nombre_completo) as ultimo_profesional,
  s.nombre   as spd_nombre,
  e.created_at,
  um.seccion    as ultima_seccion,
  um.created_at as ultima_seccion_fecha,
  um.creado_por_nombre,
  um.creado_por_fecha,
  n.dni::text   as nino_dni_texto,
  gf.grupo_familiar_texto,
  rf.referentes_texto,
  extensions.unaccent(lower(coalesce(n.nombre, ''::character varying)::text))    as nino_nombre_normalizado,
  extensions.unaccent(lower(coalesce(n.apellido, ''::character varying)::text))  as nino_apellido_normalizado,
  extensions.unaccent(lower(coalesce(gf.grupo_familiar_texto, ''::text)))        as grupo_familiar_normalizado,
  extensions.unaccent(lower(coalesce(rf.referentes_texto, ''::text)))            as referentes_normalizado
from public.expedientes e
join public.ninos n on e.nino_id = n.id
left join public.servicios_proteccion s on e.servicio_proteccion_id = s.id
left join public.usuarios u_creador on e.profesional_id = u_creador.id
left join lateral (
  select i.id, i.ultimo_usuario_id
  from public.ingresos i
  where i.expediente_id = e.id
  order by i.id desc
  limit 1
) ult on true
left join public.usuarios u_ultimo on ult.ultimo_usuario_id = u_ultimo.id
left join public.vw_ultima_modificacion_ingreso um on um.ingreso_id = ult.id
left join lateral (
  select string_agg(distinct concat_ws(' '::text, gc.nombre, gc.apellido, gc.dni::text), ' | '::text) as grupo_familiar_texto
  from public.grupo_conviviente gc
  where gc.expediente_id = e.id
) gf on true
left join lateral (
  select string_agg(distinct concat_ws(' '::text, rc.nombre, rc.apellido, rc.dni::text), ' | '::text) as referentes_texto
  from public.referentes_comunitarios rc
  where rc.expediente_id = e.id
) rf on true;

-- Mismos permisos que tenian antes (postgres/anon/authenticated/service_role = arwdDxtm)
grant all on public.vw_ultima_modificacion_ingreso to anon, authenticated, service_role;
grant all on public.vw_expedientes_list            to anon, authenticated, service_role;

commit;

-- ---------------------------------------------------------------------------------------------
-- VERIFICACION POST-APLICACION (solo lectura, correr aparte):
--   select reloptions from pg_class where relname in ('vw_expedientes_list','vw_ultima_modificacion_ingreso');
--     -> ambas deben mostrar {security_invoker=true}
--   select count(*) from vw_ultima_modificacion_ingreso;           -- como admin: ~ cantidad de ingresos con auditoria
--   select ultima_seccion, count(*) from vw_expedientes_list group by 1 order by 2 desc;
-- ---------------------------------------------------------------------------------------------
