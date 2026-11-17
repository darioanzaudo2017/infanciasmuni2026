-- Indices faltantes en claves foraneas usadas por las pantallas + actualizacion de estadisticas.
--
-- Hallazgos (nov/2026):
--   * grupo_conviviente solo tenia el indice de la PK: 19.419 lecturas secuenciales que leyeron ~29M de filas.
--     vw_expedientes_list la barre completa POR CADA expediente (lateral gf) -> Seq Scan loops=508 para el Admin.
--   * documentos / form2_intervenciones / medidas / form3_informe_sintesis / form9_cese_ingreso se consultan por
--     ingreso_id al abrir un caso, sin indice (hoy son chicas, pero crecen).
--   * Las estadisticas del planificador estaban desactualizadas (grupo_conviviente: 139 estimadas vs 1.566 reales;
--     ninos 68 vs 644; usuarios 0 vs 77): el planificador elegia Nested Loop + Materialize en vez de Hash Join.
--
-- Linea base medida ANTES (EXPLAIN ANALYZE bajo set local role authenticated + request.jwt.claims):
--   Listado Bandeja (limit 20, activos):  Admin 1359 ms | Coordinador 441 ms | Profesional 171 ms
--   Abrir caso (6 conteos por ingreso_id): 47 ms, 6 Seq Scan
--
-- Son tablas chicas (<2.000 filas): CREATE INDEX normal, lock de escritura de milisegundos.
-- No se toca ninguna politica RLS ni ninguna funcion.

begin;

create index if not exists idx_grupo_conviviente_expediente on public.grupo_conviviente (expediente_id);
create index if not exists idx_grupo_conviviente_ingreso    on public.grupo_conviviente (ingreso_id);

create index if not exists idx_documentos_ingreso              on public.documentos (ingreso_id);
create index if not exists idx_form2_intervenciones_ingreso    on public.form2_intervenciones (ingreso_id);
create index if not exists idx_medidas_ingreso                 on public.medidas (ingreso_id);
create index if not exists idx_form3_informe_sintesis_ingreso  on public.form3_informe_sintesis (ingreso_id);
create index if not exists idx_form9_cese_ingreso_ingreso      on public.form9_cese_ingreso (ingreso_id);

commit;

-- Estadisticas: ANALYZE puede correr dentro de una transaccion, pero se deja fuera de la anterior a proposito
-- para que un problema aqui nunca deshaga la creacion de los indices.
analyze public.grupo_conviviente;
analyze public.ninos;
analyze public.usuarios;
analyze public.usuarios_roles;
analyze public.roles;
analyze public.zonas;
analyze public.servicios_proteccion;
analyze public.catalogo_derechos;
analyze public.documentos;
analyze public.form2_intervenciones;
analyze public.form3_informe_sintesis;
analyze public.form9_cese_ingreso;
analyze public.medidas;
analyze public.ingresos;
analyze public.expedientes;
analyze public.referentes_comunitarios;
analyze public.auditoria;
