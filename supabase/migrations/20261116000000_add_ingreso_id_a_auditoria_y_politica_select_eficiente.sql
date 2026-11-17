-- Fix: timeout (57014) en vw_expedientes_list para rol Profesional.
-- Causa: la politica SELECT_AUDITORIA llamaba fn_auditoria_puede_leer() fila por fila (~7000 veces)
-- cuando vw_ultima_modificacion_ingreso lee toda la tabla auditoria (8s+ para no-admin).
-- Solucion: guardar ingreso_id en auditoria y evaluar la visibilidad UNA vez (subconsulta hasheada).
-- fn_auditoria_puede_leer() queda sin cambios (ya no la usa la politica).

alter table public.auditoria add column ingreso_id bigint;

create or replace function public.fn_auditoria_log()
returns trigger language plpgsql security definer set search_path to 'public' as $function$
declare
  v_row jsonb;
  v_registro_id bigint;
  v_ingreso_id bigint;
begin
  v_row := case when TG_OP = 'DELETE' then to_jsonb(OLD) else to_jsonb(NEW) end;
  v_registro_id := coalesce((v_row->>'id')::bigint, (v_row->>'ingreso_id')::bigint);

  v_ingreso_id := case
    when TG_TABLE_NAME in ('ingresos','form1_motivo','form1_datos_nino','form1_decision','form1_derivacion')
      then v_registro_id
    when TG_TABLE_NAME in ('derechos_vulnerados','documentos','grupo_conviviente','referentes_comunitarios',
                           'origenes_consulta_adicionales','form2_planificacion','form2_intervenciones',
                           'form3_informe_sintesis','medidas','solicitudes_senaf')
      then (v_row->>'ingreso_id')::bigint
    when TG_TABLE_NAME = 'form2_equipo'
      then (select fp.ingreso_id from form2_planificacion fp where fp.id = (v_row->>'planificacion_id')::bigint)
    when TG_TABLE_NAME = 'medidas_acciones'
      then (select m.ingreso_id from medidas m where m.id = (v_row->>'medida_id')::bigint)
    else null
  end;

  insert into auditoria (tabla, registro_id, accion, usuario_id, datos_anteriores, datos_nuevos, ingreso_id)
  values (
    TG_TABLE_NAME, v_registro_id, TG_OP, auth.uid(),
    case when TG_OP in ('UPDATE','DELETE') then to_jsonb(OLD) else null end,
    case when TG_OP in ('INSERT','UPDATE') then to_jsonb(NEW) else null end,
    v_ingreso_id
  );
  return coalesce(NEW, OLD);
end;
$function$;

-- Backfill (misma logica que fn_auditoria_puede_leer)
update auditoria set ingreso_id = registro_id
 where tabla in ('ingresos','form1_motivo','form1_datos_nino','form1_decision','form1_derivacion');

update auditoria set ingreso_id = coalesce((datos_nuevos->>'ingreso_id')::bigint, (datos_anteriores->>'ingreso_id')::bigint)
 where tabla in ('derechos_vulnerados','documentos','grupo_conviviente','referentes_comunitarios',
                 'origenes_consulta_adicionales','form2_planificacion','form2_intervenciones',
                 'form3_informe_sintesis','medidas','solicitudes_senaf');

update auditoria a set ingreso_id = fp.ingreso_id from form2_planificacion fp
 where a.tabla = 'form2_equipo'
   and fp.id = coalesce((a.datos_nuevos->>'planificacion_id')::bigint, (a.datos_anteriores->>'planificacion_id')::bigint);

update auditoria a set ingreso_id = m.ingreso_id from medidas m
 where a.tabla = 'medidas_acciones'
   and m.id = coalesce((a.datos_nuevos->>'medida_id')::bigint, (a.datos_anteriores->>'medida_id')::bigint);

create index idx_auditoria_ingreso_id on auditoria (ingreso_id);

drop policy "SELECT_AUDITORIA" on auditoria;
create policy "SELECT_AUDITORIA" on auditoria for select to authenticated using (
  (select es_admin())
  or (tabla = 'expedientes' and registro_id in (
        select e.id from expedientes e where puede_leer_datos(e.zona_id, e.servicio_proteccion_id)))
  or (ingreso_id in (
        select i.id from ingresos i join expedientes e on e.id = i.expediente_id
        where puede_leer_datos(e.zona_id, e.servicio_proteccion_id)))
);
