# CLAUDE.md — Sistema de Protección de Derechos NNyA

## Identidad

- **Nombre:** Sistema de Protección de Derechos de NNyA
- **Cliente:** Municipalidad de Córdoba Capital — Servicios de Protección de Derechos (SPD)
- **Tipo:** Municipal / Gestión de casos sociales
- **Supabase project-ref:** `rannzostkvolaxulzvsn` (us-west-2)
- **Estado:** Producción activa — cambios con cuidado

---

## Stack técnico

| Tecnología | Versión |
|---|---|
| React | 19.2.0 |
| TypeScript | ~5.9.3 |
| Vite | ^7.2.4 |
| Tailwind CSS | ^4.1.18 |
| Supabase JS | ^2.91.1 |
| React Router DOM | ^7.13.0 |
| date-fns | ^4.1.0 |
| React Hook Form | ^7.71.1 |
| TanStack Query | ^5.90.20 |
| TanStack Table | ^8.21.3 |
| Recharts | ^3.7.0 |
| Zod | ^4.3.6 |
| @react-pdf/renderer | ^4.3.2 |
| docx / jspdf | generación de documentos Word y PDF |
| lucide-react | íconos secundarios |
| vitest | tests unitarios |
| vite-plugin-pwa | ^1.2.0 — app instalable (manifest + service worker), configurado sep/2026 |

Dev server: `npm run dev` → `http://localhost:5173`

---

## Estructura de carpetas

```
src/
├── App.tsx                        # Rutas de la aplicación
├── main.tsx
├── lib/
│   └── supabase.ts                # Cliente Supabase (singleton)
├── services/                      # TODA llamada a Supabase va aquí
│   ├── expedienteService.ts       # crearExpedienteConIngreso()
│   ├── ingresoService.ts
│   ├── ceseService.ts
│   └── vinculacionService.ts
├── hooks/
│   ├── useNotifications.ts
│   └── usePwaInstall.ts            # Nuevo sep/2026 — botón "Instalar Aplicación"
├── components/
│   ├── auth/
│   │   └── ProtectedRoute.tsx
│   ├── shared/
│   │   ├── Sidebar.tsx
│   │   ├── Navbar.tsx
│   │   └── MainLayout.tsx
│   └── ui/
│       ├── Badge.tsx
│       ├── Button.tsx
│       ├── StatCard.tsx
│       ├── StageStepper.tsx
│       └── Breadcrumbs.tsx
└── features/
    ├── Dashboard.tsx
    ├── auth/                      # Login, Recovery, SetPassword
    ├── admin/
    │   ├── users/                 # UserManagementPage, UserFormDrawer
    │   └── derechos/              # DerechosManagementPage, DerechoFormDrawer
    ├── help/
    │   └── AlcanceSistemaPage.tsx
    ├── expedientes/
    │   ├── ExpedientesList.tsx    # Lista con filtros y anulación
    │   ├── NuevaRecepcion.tsx
    │   ├── recepcion/
    │   │   └── FormularioRecepcion.tsx   # Wizard 4 pasos
    │   ├── ingresos/
    │   │   ├── IngresosPage.tsx
    │   │   ├── IngresoDetail.tsx
    │   │   ├── IntervencionesPDF.tsx
    │   │   └── EmailNotificationModal.tsx
    │   ├── ampliacion/
    │   │   ├── AmpliacionContainer.tsx
    │   │   ├── AccionesAmpliacion.tsx    # Modal de intervenciones + participantes
    │   │   └── PlanificacionAmpliacion.tsx
    │   ├── sintesis/
    │   │   ├── InformeSintesis.tsx
    │   │   └── InformeSintesisPDF.tsx
    │   ├── definicion/
    │   │   ├── DefinicionMedidas.tsx
    │   │   ├── PlanAccionMedida.tsx
    │   │   └── ActaCompromiso.tsx
    │   ├── cese/
    │   │   └── CierreIngreso.tsx
    │   └── senaf/
    │       ├── SolicitudSenafForm.tsx    # Medidas excepcionales (requiere gate)
    │       ├── SolicitudSenafSummary.tsx
    │       └── SenafManagementPage.tsx
    └── admin/
        ├── users/                        # UserManagementPage, UserFormDrawer
        ├── derechos/                     # DerechosManagementPage, DerechoFormDrawer
        └── spd/
            └── SpdManagementPage.tsx     # Gestión de SPD y asignación de zonas (Admin/Coordinador)
```

---

## Flujo de trabajo de un expediente

```
1. Recepción de la Demanda   → FormularioRecepcion (wizard 4 pasos)
2. Ampliación y Verificación → AccionesAmpliacion (intervenciones + planificación)
3. Síntesis                  → InformeSintesis
4. Definición de Medidas     → DefinicionMedidas → PlanAccionMedida
5. Cese / Cierre             → CierreIngreso
   └── Medida Excepcional (opcional) → SolicitudSenafForm
```

**Rutas principales:**
- `/expedientes` — lista con filtros (Activos / Cerrados / Anulados / Todos)
- `/expedientes/nuevo` — crear expediente
- `/expedientes/:id/recepcion/:ingresoId` — editar recepción
- `/expedientes/:id/ampliacion/:ingresoId` — etapa 2
- `/expedientes/:id/sintesis/:ingresoId` — síntesis
- `/expedientes/:id/definicion/:ingresoId` — medidas
- `/expedientes/:id/senaf/:ingresoId` — medida excepcional SENAF
- `/usuarios` — gestión de usuarios (Admin/Coordinador)
- `/derechos` — catálogo de derechos (Admin/Coordinador)
- `/senaf` — listado de solicitudes SENAF (Admin/Coordinador)
- `/configuracion` — gestión de SPD y zonas (Admin/Coordinador) → `SpdManagementPage`

---

## Base de datos — tablas principales

| Tabla | Descripción |
|---|---|
| `expedientes` | Registro principal. Campos: `numero`, `fecha_apertura`, `activo`, `anulado`, `motivo_anulacion`, `anulado_por`, `anulado_at` |
| `ingresos` | Cada intervención/ingreso del expediente. Campos: `etapa`, `estado`, `fecha_ingreso`, `origen_consulta` |
| `ninos` | NNyA. Constraint `chk_ninos_genero`: solo `'Masculino'`, `'Femenino'`, `'Otro'` o `null` (nunca `""`) |
| `grupo_familiar` | Familiares/red de apoyo vinculados al ingreso |
| `form2_intervenciones` | Intervenciones de la etapa de ampliación. Columna `participantes jsonb` para múltiples entrevistados |
| `form2_intervencion_profesionales` | Profesionales por intervención (relación M:N) |
| `usuarios` | Perfiles. Vinculados a `roles`, `servicios_proteccion`, `zonas` |
| `usuarios_roles` | Roles por usuario |
| `roles` | `Administrador`, `Coordinador`, `Profesional` |
| `servicios_proteccion` | SPD (Servicio de Protección de Derechos) |
| `zonas` | Zonas geográficas |
| `derechos` | Catálogo de derechos vulnerados |
| `medidas` / `medidas_acciones` / `medidas_derechos` | Medidas de protección sugeridas por ingreso y su plan de acción |
| `solicitudes_senaf` | Solicitudes de medidas excepcionales |
| `ingreso_responsables` | **Nueva ago/2026**: varios-a-varios entre `ingresos` y `usuarios` — los profesionales responsables de un caso (distinto de `profesional_asignado_id`, que es uno solo). Se asigna/gestiona desde `IngresoDetail.tsx` (card "Responsables" + modal con buscador) |
| `auditoria` | Log de acciones: tabla, registro_id, accion, usuario_id, datos_anteriores/datos_nuevos (jsonb). **Activa desde jul/2026** vía trigger `fn_auditoria_log()` en 18 tablas (sumada `origenes_consulta_adicionales`) — antes existía pero no se escribía nunca (INSERT bloqueado por RLS y sin trigger). **Política de lectura reescrita ago/2026**: `fn_auditoria_puede_leer(tabla, registro_id, datos_nuevos, datos_anteriores)` (SECURITY DEFINER) resuelve el `ingreso_id` real según la tabla auditada (directo, vía columna `ingreso_id` en el jsonb, o vía `medida_id`/`planificacion_id` para `medidas_acciones`/`form2_equipo`) y aplica `puede_leer_datos()` por zona/SPD — reemplaza la política anterior que solo dejaba leer a Administrador. **Política reescrita otra vez nov/2026 (fix de timeout)**: `fn_auditoria_puede_leer()` ya **no se usa** (queda definida sin llamadores). Ahora la tabla tiene la columna `ingreso_id bigint` (sin FK, para que el historial sobreviva al borrado del ingreso; indexada) que completa `fn_auditoria_log()` al escribir y que se rellenó con backfill para las filas históricas; la política `SELECT_AUDITORIA` es `(select es_admin()) OR (tabla='expedientes' AND registro_id IN (expedientes visibles)) OR ingreso_id IN (ingresos visibles vía puede_leer_datos())`, y las subconsultas se calculan **una sola vez** (hashed SubPlan) en vez de una por fila. Filas sin `ingreso_id` (`ingreso_responsables` y eventos de tablas hijas cuyo padre ya no existe) solo las ve el Administrador — igual que antes |
| `notificaciones` | Notificaciones internas por usuario |

**Vistas:**
- `vw_expedientes_list` — lista de expedientes con datos de nino, spd, zona, profesional, anulado, **última sección modificada** (`ultima_seccion`/`ultima_seccion_fecha`). Creada con `security_invoker = true`. **Corregida ago/2026**: `ultimo_profesional` debe salir del `ultimo_usuario_id` del ingreso más reciente del expediente (vía `LEFT JOIN LATERAL`), no de `expedientes.profesional_id` (campo fijo desde la creación, nunca se actualiza — mismo bug que ya se había corregido en `vw_ingresos_detalle` en jul/2026, pero esta vista quedó afuera en esa primera pasada)
- `vw_ingresos_detalle` — detalle de ingreso con datos de niño y profesionales. Creada con `security_invoker = true`. **Corregida jul/2026**: `profesional_asignado_nombre` y `ultimo_profesional_nombre` deben salir de `ingresos.profesional_asignado_id` / `ingresos.ultimo_usuario_id` (antes ambas apuntaban por error a `expedientes.profesional_id`, mostrando "Sincronización" cuando ese campo era null)
- `vw_ultima_modificacion_ingreso` — **nueva ago/2026**: por cada `ingreso_id`, la sección (Recepción/Ampliación/Informe Síntesis/Definición de Medidas/SENAF/Documentación/Datos Generales) y usuario del evento de `auditoria` más reciente entre las 18 tablas auditadas. `vw_expedientes_list` la usa para mostrar la última sección del ingreso más reciente de cada expediente. Limitación conocida: si se borra una fila de `medidas_acciones` o `form2_equipo`, ese evento de borrado puede no resolverse a un `ingreso_id` si el registro padre (medida/planificación) también fue borrado — caso raro. **Reescrita nov/2026**: antes leía `auditoria` 13 veces (11 ramas `UNION ALL` + 2 CTE, extrayendo `ingreso_id` del jsonb); ahora lee la tabla **una sola vez** usando la columna `auditoria.ingreso_id`, con las mismas columnas y secciones (verificado: 0 diferencias fila por fila contra la definición vieja). Como `vw_expedientes_list` depende de ella, al cambiarla hay que hacer `DROP` + `CREATE` de las dos, ambas con `security_invoker = true`. `IngresosPage.tsx` también consulta esta vista directamente

---

## Roles y permisos

| Rol | Acceso |
|---|---|
| `Administrador` | Todo: usuarios, derechos, SENAF, anular expedientes, ver anulados |
| `Coordinador` | Igual que Administrador |
| `Profesional` | Solo sus expedientes, sin gestión de usuarios ni anulación |

Detección de rol en componentes:
```ts
const userRole = userProfile?.usuarios_roles?.[0]?.roles?.nombre;
const canManageUsers = userRole === 'Administrador' || userRole === 'Coordinador';
```

⚠️ **Discrepancia conocida en RLS:** la función SQL `es_admin()` solo devuelve `true` para rol `Administrador` — **no incluye a Coordinador**, a pesar de que en el resto del sistema "Coordinador = mismos permisos que Administrador". Esto causó el bug de duplicación de 1.1 (ver Pendientes) porque varias políticas `DELETE` usaban `es_admin()` en vez de `puede_escribir_datos()`. Antes de usar `es_admin()` en una política nueva, confirmar si el Coordinador debería quedar incluido. Ojo con el caso inverso: esta misma diferencia (Admin sin límite de zona, Coordinador sí) fue la causa de la escalada de privilegios de nov/2026 — un Coordinador podía asignarse a sí mismo el rol Administrador y saltarse su propio límite de zona (ver "Incidente de seguridad" más abajo).

---

## Convenciones de código

### Supabase
- El cliente se importa SIEMPRE desde `src/lib/supabase.ts` — nunca crear otro cliente
- Las operaciones de BD complejas van en `src/services/` — no directo desde componentes
- Las vistas que usan RLS deben crearse con `security_invoker = true`
- Nunca usar `service_role` key en el cliente
- **Rendimiento de RLS (incidente nov/2026)**: una política que llama una función fila por fila (`USING (mi_funcion(col1, col2))`) **no escala**: con `security_invoker`, cada vez que una vista toca esa tabla se paga la función por cada fila, y una vista con varias ramas `UNION ALL` sobre la misma tabla multiplica el costo. La Bandeja de Expedientes del rol Profesional llegó a 10 s (timeout `57014`, límite ~8 s del rol `authenticated`) mientras el Administrador no lo notaba porque `es_admin()` corta antes. Reglas: (1) preferir políticas con subconsultas no correlacionadas (`col IN (SELECT ...)`), que Postgres calcula una sola vez; (2) guardar en la tabla la columna que la política necesita (como `auditoria.ingreso_id`) en vez de extraerla del jsonb o resolverla por fila; (3) una vista debe leer cada tabla con RLS **una sola vez**; (4) **probar siempre con un usuario Profesional**, no solo con Administrador, y medir con `EXPLAIN (ANALYZE)` bajo `set local role authenticated` + `request.jwt.claims` del usuario; (5) las funciones usadas por RLS (`puede_leer_datos`, `es_admin`, `es_coordinador`) deben ser baratas: una sola consulta, sin llamar a otras funciones `SECURITY DEFINER` encadenadas

### Filtros `.or()` con PostgREST — regla importante
El comodín de `ilike`/`like` dentro de un string crudo para `.or()` es `*`, **no** `%` (SQL) — PostgREST lo traduce internamente. Además, **PostgREST no soporta casteos (`columna::tipo`) dentro del árbol de filtros de `.or()`** (tira `PGRST100: failed to parse logic tree`), aunque ese mismo casteo funcione perfecto en SQL directo. Si hace falta buscar por una columna numérica como texto (ej. DNI), exponer una columna ya casteada en la vista (`n.dni::text AS nino_dni_texto`) y filtrar sobre esa, en vez de castear en la query.

```ts
// MAL — comodín SQL, no de PostgREST
query.or(`numero.ilike.%${term}%`)

// MAL — cast dentro de or(), rompe con PGRST100
query.or(`nino_dni::text.ilike.*${term}*`)

// BIEN
query.or(`numero.ilike.*${term}*,nino_dni_texto.ilike.*${term}*`)  // columna ya casteada en la vista
```

### Fechas — regla crítica
Las fechas en Supabase se guardan como `DATE` (solo fecha, sin hora).
Al mostrar en el frontend, `new Date("2026-06-13")` se interpreta como UTC midnight y en Argentina (UTC-3) muestra el día anterior.

**Siempre** agregar `T12:00:00` al parsear fechas del tipo `yyyy-MM-dd`:
```ts
// MAL
new Date(row.fecha_apertura)

// BIEN
new Date(row.fecha_apertura + 'T12:00:00')
```

Al **guardar** fechas del día actual, usar fecha local (no `toISOString()` que es UTC):
```ts
// MAL
new Date().toISOString().split('T')[0]

// BIEN
(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })()
```

### Géneros
La tabla `ninos` tiene constraint que solo acepta `'Masculino'`, `'Femenino'`, `'Otro'` o `null`.
Siempre usar `genero: value || null`, nunca `""`.

### Componentes
- Componentes en PascalCase, archivos `.tsx`
- Estado del formulario en `useState` con objeto completo (no múltiples `useState` por campo)
- Al resetear un formulario modal, siempre incluir TODOS los campos del estado inicial
- Íconos: `material-symbols-outlined` (Google) como clase en `<span>` — es la librería principal del proyecto

### Tailwind
- Versión 4 (configuración en `vite.config.ts` con plugin, no en `tailwind.config.js`)
- Clase primaria: `primary` (color principal del sistema)
- Dark mode: clases `dark:` — el proyecto soporta modo oscuro

---

## Variables de entorno

```env
VITE_SUPABASE_URL=https://rannzostkvolaxulzvsn.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
```

Solo estas dos variables. Nunca agregar secrets con prefijo `VITE_` (van al bundle público).

---

## Edge Functions

| Función | Descripción |
|---|---|
| `create-user` | Crea usuario en `auth.users` + fila en `usuarios` + `usuarios_roles` + link de invitación. Usa `SUPABASE_SERVICE_ROLE_KEY` (**ignora toda RLS**) porque `auth.admin.createUser()`/`generateLink()` solo existen en el cliente admin. **Reescrita nov/2026 (vulnerabilidad crítica)**: no validaba quién la llamaba — como el `verify_jwt` de Supabase solo exige *algún* JWT válido (la `anon key` pública también lo es), cualquiera en internet sin loguearse podía invocarla y crearse una cuenta con `rol_id: 1` (Administrador). Ahora valida explícitamente, al principio de la función: (a) que el `Authorization` sea el token de una sesión de usuario real (`auth.getUser()`), no la anon key; (b) que ese usuario tenga rol Administrador o Coordinador en `usuarios_roles`; (c) que si no es Administrador, no pueda pedir `rol_id` = Administrador. Ver regla nueva en "Lo que NO hacer" |
| `send-email` | Sin revisar en esta auditoría — confirmar si también usa `service_role` y si necesita la misma validación de caller |

**Desplegar un cambio:** `supabase functions deploy <nombre> --project-ref rannzostkvolaxulzvsn`, o pegar el código en el dashboard → Edge Functions → la función → editar → Deploy. Editar el archivo en `supabase/functions/` no alcanza por sí solo.

---

## Migraciones aplicadas en producción

| Migración | Descripción |
|---|---|
| `add_participantes_jsonb_to_intervenciones` | Columna `participantes jsonb` en `form2_intervenciones` |
| `add_origen_consulta_to_ingresos` | Columna `origen_consulta text` en `ingresos` |
| `add_anulado_to_expedientes` | Columnas `anulado`, `motivo_anulacion`, `anulado_por`, `anulado_at` en `expedientes` |
| `update_vw_expedientes_list_add_anulado_v2` | Vista recreada con campos de anulación y `security_invoker=true` |
| `add_genero_constraint_ninos` | CHECK constraint en `ninos.genero` |
| `add_ocupacion_nivel_educativo_grupo_conviviente` | Campos adicionales en grupo familiar |
| `fix_delete_policy_form2_equipo` | Política DELETE de `form2_equipo` alineada a `puede_escribir_datos()` (antes solo `es_admin()`) |
| `fix_vw_ingresos_detalle_profesional_columns` | Vista `vw_ingresos_detalle` recreada: columnas de profesional corregidas (ver sección Base de datos) |
| `create_auditoria_trigger_function` | Función `fn_auditoria_log()` (SECURITY DEFINER) — registra INSERT/UPDATE/DELETE en `auditoria` |
| `attach_auditoria_triggers` | Trigger `trg_auditoria` en 17 tablas del flujo de expediente |
| `fix_auditoria_trigger_missing_id_column` | Fix de `fn_auditoria_log()`: usar `to_jsonb(NEW)->>'id'` con fallback a `->>'ingreso_id'` en vez de `NEW.id` directo (rompía tablas sin columna `id`, ej. `form1_motivo`) |
| `fix_delete_policies_recepcion_tables` | Política DELETE alineada a `puede_escribir_datos()` en `grupo_conviviente`, `referentes_comunitarios`, `derechos_vulnerados`, `documentos`, `form1_datos_nino` — fix del bug de duplicación (ver 1.1 abajo) |
| `add_index_auditoria_tabla_registro` | Índice `(tabla, registro_id, created_at DESC)` en `auditoria` para las consultas de historial |
| `allow_read_auditoria_planificacion_por_zona` | Política SELECT adicional en `auditoria`, acotada a `tabla = 'form2_planificacion'`, con `puede_leer_datos()` por zona/SPD — la política original (`es_admin()`) seguía limitando la lectura de auditoría solo a Administrador; esta nueva política no toca las otras 16 tablas auditadas |
| `fix_vw_expedientes_list_ultimo_profesional` | Vista `vw_expedientes_list` recreada: `ultimo_profesional` sale del `ultimo_usuario_id` del ingreso más reciente (antes salía de `expedientes.profesional_id`, mostrando "Sin asignar" en casos con ese campo null aunque tuvieran actividad real) |
| `create_fn_auditoria_puede_leer` + reescritura de política SELECT en `auditoria` | Ver detalle en sección Base de datos |
| `create_vw_ultima_modificacion_ingreso` | Ver detalle en sección Base de datos |
| `add_ultima_seccion_a_vw_expedientes_list` | `vw_expedientes_list` recreada sumando `ultima_seccion`/`ultima_seccion_fecha` (join a `vw_ultima_modificacion_ingreso` sobre el ingreso más reciente) |
| `fix_transferir_expediente_reset_profesional_asignado` | RPC `transferir_expediente()` ahora también limpia `ingresos.profesional_asignado_id` (antes solo `expedientes.profesional_id`) — fix del bug de 3.1 |
| `add_creador_a_vw_ultima_modificacion_ingreso` | `vw_ultima_modificacion_ingreso` suma `creado_por_id`/`creado_por_nombre`/`creado_por_fecha` (primer evento INSERT en `auditoria` para ese ingreso) |
| `add_creado_por_a_vw_expedientes_list` | `vw_expedientes_list` recreada sumando `creado_por_nombre`/`creado_por_fecha` |
| `create_ingreso_responsables` | Tabla nueva `ingreso_responsables` (M:N ingreso↔usuario) + RLS (`puede_leer_datos`/`puede_escribir_datos`, DELETE incluido) + trigger de auditoría |
| `add_nino_dni_texto_a_vw_expedientes_list_v2` | `vw_expedientes_list` recreada sumando `nino_dni_texto` (dni casteado a texto) para poder buscar por DNI vía `.or()` sin castear en la query (ver regla de PostgREST en Convenciones de código) |
| `sync_expedientes_zona_con_spd` | Backfill de 35 expedientes con `zona_id` desincronizado de su SPD + trigger `trg_sync_zona_expedientes` en `servicios_proteccion` que propaga automáticamente cualquier cambio de zona a los expedientes de ese SPD |
| `add_busqueda_familiares_a_vw_expedientes_list` | `vw_expedientes_list` recreada sumando `grupo_familiar_texto`/`referentes_texto` (nombre+apellido+DNI concatenados de cada integrante, vía subquery) para que el buscador de Expedientes también encuentre por familiares/red de apoyo, no solo por el niño/a titular |
| `create_origenes_consulta_adicionales` | Nueva tabla (relacionada por `ingreso_id`) para registrar más de un origen de consulta/derivación sobre un mismo caso activo. RLS con `puede_escribir_datos()` en todo incluido DELETE, trigger de auditoría conectado |
| `generar_numero_expediente_desde_id` | Trigger `BEFORE INSERT` (`fn_generar_numero_expediente`) que arma `expedientes.numero` como `EXP-YYYY-MM-000ID` a partir del `id` autoincremental y el año/mes de `fecha_apertura` — reemplaza el número aleatorio duplicado en `FormularioRecepcion.tsx` y `expedienteService.ts` (ambos insert siguen mandando un `numero` pero el trigger lo sobreescribe). Incluye backfill de los 180 expedientes existentes |
| `create_fn_estado_legajo_nino` | Función `estado_legajo_nino(p_nino_id bigint)` — **`SECURITY DEFINER`** (justificado y aprobado explícitamente por el usuario), `STABLE`, `search_path = public`, `EXECUTE` revocado a `public`/`anon` y otorgado solo a `authenticated`; devuelve `null` sin sesión (`auth.uid()`). Devuelve únicamente `expediente_id`, `numero`, `activo`, `anulado`, `servicio_proteccion_id`, `spd_nombre`, `zona_id` del expediente del niño (uno solo por `UNIQUE (nino_id)`), **sin datos personales**. Existe porque la RLS de `expedientes` (`puede_leer_datos`) le oculta al usuario los legajos de otros SPD/zonas, y `NuevaRecepcion` necesita saber que existen para avisar (ver "Nuevo sep/2026 — Aviso de legajo existente") |
| `add_busqueda_sin_acentos_a_vw_expedientes_list` | Extensión `unaccent` (schema `extensions`) + `vw_expedientes_list` recreada sumando `nino_nombre_normalizado`/`nino_apellido_normalizado`/`grupo_familiar_normalizado`/`referentes_normalizado` (todas `unaccent(lower(...))`) para que el buscador de Expedientes encuentre coincidencias sin importar tildes (ej. "gonzalez" encuentra "González"). El frontend normaliza el término de búsqueda de la misma forma (`normalizarTexto()` en `ExpedientesList.tsx`) antes de armar el `.or()`. **Incidente**: el frontend se deployó apuntando a estas columnas nuevas *antes* de aplicar la migración — la búsqueda quedó rota unas horas (PostgREST tiraba error por columna inexistente, y el catch de `fetchExpedientes` solo hacía `console.error` sin limpiar la lista, mostrando resultados viejos sin ningún aviso). Ya corregido de las dos formas: se aplicó la migración y `fetchExpedientes` ahora limpia la lista y muestra un banner de error visible si la query falla |
| `add_ingreso_id_a_auditoria_y_politica_select_eficiente` (nov/2026) | Columna `auditoria.ingreso_id` + índice, `fn_auditoria_log()` actualizada para completarla (misma lógica que usaba `fn_auditoria_puede_leer`), backfill de 6.678 de 7.618 filas y política `SELECT_AUDITORIA` reescrita con subconsultas calculadas una sola vez. Archivo: `supabase/migrations/20261116000000_*`. Aplicada a mano en el SQL Editor de producción. **Por sí sola no alcanzó** para arreglar el timeout del Profesional (seguía en 8,5 s): faltaba la siguiente |
| `optimizar_puede_leer_datos_y_vw_ultima_modificacion` (nov/2026) | `puede_leer_datos()` reescrita como **una sola consulta** (misma semántica, sigue `SECURITY DEFINER` + `STABLE`, ahora con `search_path = public`): costaba ~1,1 ms por llamada por encadenar `es_admin()`/`es_coordinador()`/2 `EXISTS`. Verificada con 0 diferencias contra la versión anterior para profesional, coordinador, administrador, usuario inexistente y sin sesión, en todas las combinaciones zona/SPD. Además `vw_ultima_modificacion_ingreso` y `vw_expedientes_list` recreadas (`DROP` + `CREATE`, `security_invoker = true`, mismos permisos) para leer `auditoria` una sola vez. Archivo: `supabase/migrations/20261116000001_*`. **Resultado medido**: Bandeja del Profesional 10,4 s → 171 ms; Coordinador (263 expedientes) 441 ms |
| `indices_faltantes_y_analyze` (nov/2026) | 7 índices en claves foráneas que se consultaban por `ingreso_id`/`expediente_id` sin índice: `grupo_conviviente` (`expediente_id` e `ingreso_id`; tenía 19.419 lecturas secuenciales que leyeron ~29M de filas, y `vw_expedientes_list` la barría completa por cada expediente), `documentos`, `form2_intervenciones`, `medidas`, `form3_informe_sintesis`, `form9_cese_ingreso`. Más `ANALYZE` de las 17 tablas del flujo: las estadísticas estaban sin actualizar (`grupo_conviviente` 139 vs 1.566 reales, `ninos` 68 vs 644, `usuarios` 0 vs 77) y el planificador elegía mal. Archivo: `supabase/migrations/20261116000002_*`. **Resultado medido** (listado Bandeja, limit 20, 3 corridas): Admin 1.359 → ~287 ms, Coordinador 441 → ~228 ms, Profesional 171 → ~97 ms; abrir un caso (6 consultas por `ingreso_id`) 47 → 6,9 ms con 0 `Seq Scan`. Respuesta HTTP real del listado del Profesional: 222 ms (`x-envoy-upstream-service-time`, incluye `count=exact`). **Regla**: al crear una tabla con FK hacia `ingresos`/`expedientes`, crear también el índice de esa columna |
| `rls_initplan_y_funciones_de_rol` (nov/2026) | Continuación de la optimización de RLS: 8 políticas en `usuarios`, `usuarios_roles`, `notificaciones`, `notificaciones_usuarios` que llamaban `auth.uid()`/`es_admin()`/`es_coordinador()` sin envolver en `(select ...)` (se reevaluaban por fila en vez de una sola vez — advisor `auth_rls_initplan`). `es_admin()`, `es_coordinador()` y `puede_escribir_datos()` pasaron a tener `search_path = public` fijo (advisor `function_search_path_mutable`); `puede_escribir_datos()` reescrita como una sola consulta, igual que se había hecho con `puede_leer_datos()` (verificada con 0 diferencias para los 5 perfiles de usuario probados). Archivo: `supabase/migrations/20261116000003_*` |
| `fix_escalada_privilegios_usuarios` (nov/2026) | **Fix de 2 vulnerabilidades de escalada de privilegios** encontradas en auditoría de seguridad — ver detalle completo en "Incidente de seguridad nov/2026" más abajo. (1) Trigger `trg_bloquear_autoescalada_usuarios` en `usuarios`: nadie que no sea Admin/Coordinador puede cambiar `zona_id`/`servicio_proteccion_id`, ni en su propia fila (antes cualquier Profesional podía auto-asignarse otro SPD y ver sus expedientes). (2) Política `RLS_USUARIOS_ROLES` reescrita: solo un Administrador puede asignar el rol `Administrador` en `usuarios_roles` (antes un Coordinador podía asignárselo a sí mismo y saltarse el límite de zona que sí tiene `es_coordinador()`). Coordinador sigue pudiendo asignar Profesional/Coordinador/Consulta igual que antes. Archivo: `supabase/migrations/20261116000004_*`. Probado en producción dentro de transacciones con `ROLLBACK` antes y después del fix |

---

## ⚠️ Incidente de seguridad — escalada de privilegios (nov/2026)

Durante una revisión de UX/performance se encontraron y corrigieron 3 vulnerabilidades reales, probadas en producción con transacciones `ROLLBACK` (lectura/prueba) antes de escribir cada fix:

1. **Edge Function `create-user` sin autenticación** — la más grave: cualquiera en internet, sin loguearse, podía crearse una cuenta Administrador (ver sección Edge Functions). Desplegada la versión corregida.
2. **Coordinador → Administrador**: un Coordinador podía `INSERT` en `usuarios_roles` asignándose el rol Administrador, que no tiene límite de zona (a diferencia de `es_coordinador()`) — pasaba de ver su zona a ver las 77 filas de `usuarios` y los 641 expedientes de todo el sistema. **Decisión del cliente**: Coordinador no debe poder asignar el rol Administrador (ni a sí mismo ni a otro usuario). Fix: `fix_escalada_privilegios_usuarios`.
3. **Auto-cambio de SPD/zona**: cualquier usuario autenticado podía `UPDATE` su propia fila de `usuarios` cambiando `zona_id`/`servicio_proteccion_id` (esas columnas tenían `GRANT UPDATE` para `authenticated` y la política solo exigía `id = auth.uid()`). Como `puede_leer_datos()`/`puede_escribir_datos()` deciden todo el acceso leyendo esas 2 columnas, un Profesional podía auto-asignarse otro SPD y ver expedientes ajenos. No hay ningún flujo de UI que edite la propia zona/SPD (solo `UserFormDrawer.tsx`, que siempre edita la fila de OTRO usuario desde `/usuarios`) — era un bug puro, no una funcionalidad mal cuidada. Fix: mismo archivo que el punto 2.

**Frontend**: `UserFormDrawer.tsx` ahora obtiene el rol de quien está logueado (`viewerIsAdmin`) y oculta la opción "Administrador" de la lista de roles cuando quien edita es Coordinador — evita que llegue a intentarlo y choque con el error de la base. Verificado en el navegador.

**Por qué no se vio antes**: las tres dependían de que alguien probara específicamente con una cuenta Coordinador/Profesional intentando una acción fuera de lo que la UI permite — la UI nunca exponía estos caminos, así que no aparecían probando solo los flujos normales.

---

## Lo que NO hacer

- **Nunca** deshabilitar RLS en ninguna tabla
- **Nunca** usar `SECURITY DEFINER` sin justificación explícita del usuario
- **Nunca** escribir keys o tokens en archivos de código
- **Nunca** usar `service_role` key en el cliente
- **Nunca** escribir una Edge Function que use `SUPABASE_SERVICE_ROLE_KEY` sin validar primero quién la está llamando — el `verify_jwt` de Supabase solo exige *algún* JWT válido, y la `anon key` pública (va en el bundle de cualquier navegador) cumple eso. Una función con `service_role` ignora toda RLS, así que es ella misma quien tiene que chequear `auth.getUser(token)` + el rol del caller en `usuarios_roles` antes de hacer nada (ver incidente de `create-user`, nov/2026)
- **Nunca** `new Date("yyyy-MM-dd")` sin `T12:00:00` — rompe fechas en Argentina
- **Nunca** guardar `""` en campos con enum constraint (usar `|| null`)
- **Nunca** hacer `CREATE OR REPLACE VIEW` cuando cambia el orden de columnas — hacer `DROP VIEW` + `CREATE VIEW`
- **Nunca** pushear a `main` sin que el usuario confirme
- **Nunca** modificar archivos de migración ya aplicados en producción — crear una nueva migración
- **Nunca** deployar/commitear un cambio de frontend que dependa de una columna o vista nueva antes de aplicar esa migración en producción — pasó con la búsqueda sin acentos (ver `add_busqueda_sin_acentos_a_vw_expedientes_list`) y el error quedó tragado en silencio. Si el cambio de frontend depende de una migración, aplicar la migración primero (o en el mismo paso)

---

## Lista de mejoras — observaciones SPD (presupuesto en curso, jul/2026)

Estado a la espera de aprobación del presupuesto por el cliente. Actualizar esta sección a medida que se avance.

**Recepción de la Demanda**
- 1.1 Duplicación de referentes/grupo familiar/documentos al editar — ✅ **Causa raíz resuelta** (RLS, jul/2026) + ✅ **guardado reescrito como edición real** (ago/2026): `handleFinalizarRecepcion` en `FormularioRecepcion.tsx` ya no borra todo y reinserta — ahora hace UPDATE por `id` para filas existentes, INSERT solo para las nuevas (sin `id`), y DELETE solo de los ids que el usuario sacó explícitamente (`handleRemoveMember`/`handleRemoveReferente`/`handleRemoveVulneracion`/eliminar documento, que ahora trackean el id eliminado en `eliminatedGrupoFamiliarIds`/`eliminatedReferentesIds`/`eliminatedVulneracionesIds`/`eliminatedDocumentoIds`). `form1_datos_nino` pasó a `upsert` (ya tenía `ingreso_id` como PK). Los documentos existentes sin cambio de archivo ya no se reinsertan, solo se actualiza nombre/subcategoría por `id`. Tests (33) y compilación OK. **Validado en vivo** (ago/2026, ingreso 241): se creó un ingreso, se editó dos veces agregando un integrante de grupo familiar cada vez — las 2 filas quedaron sin duplicar, y la primera mantuvo su `created_at` original sin tocarse en la segunda edición (confirma que ahora es UPDATE selectivo, no "borrar todo"). **Aparte**: limpiar los 36 expedientes con duplicados históricos ya generados (paso 4, todavía no encarado — a definir criterio de conservación)
- **Bug adicional encontrado y resuelto ago/2026 — modal "crear expediente vinculado" para menores convivientes**: `handleSaveMember` (`FormularioRecepcion.tsx`) usaba `ageNum > 0 && ageNum < 18`, excluyendo a recién nacidos (edad 0) de la pregunta de vincular expediente. Corregido a `ageNum >= 0`
- 1.2 Justificación técnica al marcar derechos vulnerados — pendiente de decisión (evaluar si se saca por redundante con etapas posteriores)
- 1.3 Fecha de ingreso manual — ✅ hecho (`FormularioRecepcion.tsx`, sección "Fechas del Caso"). Pendiente presupuestado: mostrar también "fecha de carga" (timestamp de sistema) por separado
- 1.4 Barrios predefinidos — ✅ hecho (524 barrios en catálogo). Pendiente presupuestado: auto-registrar en el catálogo un barrio cargado manualmente como "Otro"
- 1.5 Reingreso — ✅ hecho: botón dinámico "Agregar Ingreso" / "Nuevo Reingreso" / "Caso Activo" según corresponda (`IngresosPage.tsx`). Múltiples orígenes de consulta sobre un caso activo resuelto con tabla `origenes_consulta_adicionales` + sección/modal en `IngresoDetail.tsx`. Pendiente presupuestado: hacer editable la recepción original cuando el caso sigue abierto (se evaluará junto con 1.1)
- 1.6 Número de legajo correlativo y compartido entre todos los SPD — ✅ hecho. Trigger `fn_generar_numero_expediente()` genera `EXP-YYYY-MM-000ID` a partir del `id` (compartido por todos los SPD, ya que es una sola tabla) y el año/mes de `fecha_apertura`. Backfill aplicado a los 180 expedientes existentes (autorizado por el cliente, informes aún no impresos)
- 1.7 Etiqueta "solicitud de intervención" en carga de archivos — ✅ hecho: opción "Ficha de Solicitud de Intervención" sumada al clasificador de documentos en `FormularioRecepcion.tsx`, `IngresoDetail.tsx` y `AccionesAmpliacion.tsx`
- **Nuevo ago/2026 — Autoguardado de borrador local**: ✅ hecho. `FormularioRecepcion.tsx` guarda el wizard (`formData` + paso actual) en `localStorage` cada ~1.2s de inactividad una vez que hay contenido real cargado (no arranca con el formulario vacío), tanto para creación como para edición — protege contra pérdida de datos por corte de luz/internet, ya que no depende de la red para guardar. Clave por caso (`recepcion_draft_new` o `recepcion_draft_edit_<ingresoId>`); si se reabre el formulario con un borrador pendiente aparece un banner para restaurarlo o descartarlo. Se limpia solo al finalizar y guardar de verdad en la base. Limitación conocida: los archivos adjuntos todavía no subidos (sin `url`) no se pueden serializar a `localStorage` y se pierden si no llegó a guardarse — se avisa al usuario al restaurar. De paso se sacó el panel de debug (usuario/roles/estado de sesión) que quedaba visible en producción

- **Nuevo sep/2026 — Aviso de legajo existente en otro SPD (`NuevaRecepcion.tsx`)**: ✅ hecho, ya en `main`. **Bug reportado por usuarios**: al buscar un niño/a que ya tenía legajo en otro SPD/zona, la búsqueda lo mostraba como "Sin Legajo" con "Abrir Expediente" habilitado, y el error recién aparecía al finalizar los 8 pasos. **Causa**: `processChild` leía `expedientes` con la sesión del usuario y la RLS (`SELECT_EXPEDIENTES`) ocultaba el legajo ajeno, así que el bloque `isRestricted` ("Acceso Limitado") nunca se activaba; el niño sí aparecía porque `SELECT_NINOS` es `true`. Al guardar, `expedientes` tiene `UNIQUE (nino_id)` (un solo expediente por niño, de por vida) y `ninos` tiene `UNIQUE (dni)`, por eso fallaba con duplicate key recién al final (el `UPDATE` sobre `ninos` lo bloquea la RLS en silencio, sin error). **Fix**: `processChild` usa `supabase.rpc('estado_legajo_nino')` (ver migración `create_fn_estado_legajo_nino`); si el legajo es de otro SPD (Profesional) u otra zona (Coordinador) se muestra badge "Legajo en otro SPD", número de legajo y SPD, se oculta el botón y aparece la leyenda "No podés crear un expediente nuevo… comunicate con {SPD}". Administrador nunca queda restringido. Botón deshabilitado hasta que carga el perfil del usuario. También se detectan legajos **cerrados** (`activo = false`, 83 en la base a sep/2026): antes el filtro `.eq('activo', true)` los mostraba como "Sin Legajo" y fallaban igual al guardar — ahora aparece "Legajo Cerrado" + "Crear Nuevo Ingreso" para el SPD dueño. Además `handleFinalizarRecepcion` traduce el error `23505`/`expedientes_nino_id_key` a un mensaje claro (y aclara que el borrador local sigue guardado). Limitaciones conocidas: no se valida el DNI del niño titular mientras se tipea en el formulario (solo el de familiares), y el botón "Registrar Nuevo Niño/a" sigue permitiendo llegar al guardado con un DNI ya existente (lo frena el mensaje de error, no la pantalla)

**Ampliación de Información**
- 2.1 Confusión "plan de ampliación" vs. "acciones específicas" — ✅ hecho: título/breadcrumb unificados a "Ampliación de Información", card del plan renombrada a "Plan de Ampliación" con ícono de edición directa (abre el modal ya en modo edición), botón principal "Nueva Intervención" → "Nueva Acción" (mismo cambio en el modal), sección de abajo "Historial de Intervenciones" → "Acciones Registradas"
- 2.2/2.4 No editable una vez pasada la etapa (intervenciones recursivas) — ✅ **Revisado, no hacía falta corregir nada**: no existe ningún bloqueo técnico real (ni en rutas, ni en las pestañas de `IngresoDetail.tsx`, ni en RLS). La función `validarTransicionEtapa()` en `ingresoService.ts` existe y tiene test, pero nunca se importa ni se usa en ningún componente — es código muerto. Confirmado en producción: se puede editar Recepción o agregar Acciones de Ampliación en cualquier etapa. El reclamo original probablemente describía una versión anterior del sistema o era un problema de percepción/UX, ya no aplica
- 2.3 Solo existe tipo de acción "entrevista" — pendiente presupuestado, **a la espera de que se confirme con el cliente la lista exacta de tipos de acción**. Diseño ya definido: agregar columna `tipo_accion text DEFAULT 'Entrevista'` en `form2_intervenciones` (sin romper filas existentes, sin tocar RLS) + el modal de `AccionesAmpliacion.tsx` muestra campos distintos según el tipo elegido (Entrevista = como está hoy; Solicitud/Recepción de Informe y Reunión Institucional reutilizan `nombre_institucion` y la sección de documentos, sin pedir vínculo/asistencia)
- 2.5 Modal "Detalles de Planificación" editable — ✅ hecho: objetivos, estrategias, fechas y equipo técnico editables (RLS de `form2_equipo` corregida). ✅ Historial versionado hecho: botón "Ver Historial" en el modal lee de `auditoria` (reutiliza los snapshots `datos_anteriores`/`datos_nuevos` que ya se guardan por el trigger de auditoría — no se creó tabla nueva), con "ventanitas" laterales por fecha de edición y quién la hizo. Requirió política RLS nueva (`allow_read_auditoria_planificacion_por_zona`) porque la política original de `auditoria` solo dejaba leer a Administrador. Limitación conocida: el historial de "Equipo Técnico" no se reconstruye (solo objetivos/estrategias/fechas), porque `form2_equipo` es una tabla separada

**Asignación de profesionales**
- 3.1 Lógica de asignación poco clara — ✅ hecho: buscador de profesionales en "Equipo Técnico" (`AccionesAmpliacion.tsx`, `PlanificacionAmpliacion.tsx`). **Bug real encontrado y corregido**: `transferir_expediente()` (RPC) limpiaba `expedientes.profesional_id` al transferir a otro SPD, pero nunca tocaba `ingresos.profesional_asignado_id` — así que el profesional del SPD de origen (a veces de un SPD totalmente distinto, por transferencias en cadena) seguía figurando como responsable después de la transferencia, aunque ya no tuviera acceso al caso. Corregido: ahora también limpia `profesional_asignado_id` en los ingresos activos del expediente transferido. Backfill aplicado al único caso activo afectado (ingreso 127, expediente 146)
- 3.2 Quién cargó / quién hizo la acción — ✅ hecho: columna "Última Sección Modificada" (sección + usuario + fecha) en `IngresosPage.tsx` y `ExpedientesList.tsx`, más "Cargado por" (creador original, del primer evento INSERT en `auditoria` para ese ingreso) — distingue creador original vs. última acción. Limitación conocida: ingresos creados antes de que se activara el trigger de auditoría (jul/2026) no tienen ese primer evento, así que "Cargado por" queda vacío para esos casos históricos
- **Bug adicional encontrado y resuelto ago/2026 — contador "Días Abierto"**: `ceseService.ts` (flujo real de "Cese de Intervención") nunca escribía `ingresos.fecha_cierre` — solo lo guardaba en `form9_cese_ingreso`, así que el contador de días seguía sumando para siempre en casos cerrados por ese camino (el cierre rápido de "Asesoramiento" en Recepción sí lo hacía bien). Sumado a un bug de mayúsculas en `IngresosPage.tsx` (`estado === 'Cerrado'` vs. el valor real `'cerrado'`) que además impedía mostrar la etiqueta "Cerrado". Ambos corregidos + backfill aplicado a los 3 casos ya afectados (ingresos 61, 52, 201)
- **Nuevo ago/2026 — Paginación de Lista de Expedientes**: ✅ hecho. `ExpedientesList.tsx` pasó de traer todos los expedientes de una vez a paginación server-side (`.range()`, 20 por página) con botones anterior/siguiente. Filtro de estado (Activos/Cerrados/Anulados/Todos) y búsqueda (con debounce de 350ms) también pasaron a resolverse en el servidor vía `.eq()`/`.or()`, en vez de filtrar en el cliente sobre el array completo ya cargado. **Optimizado nov/2026**: (1) `select` con solo las 16 columnas que la pantalla muestra (`COLUMNAS_LISTA`) en vez de `'*'` — las columnas `grupo_familiar_texto`/`referentes_texto`/`*_normalizado` existen para *buscar* (el `.or()` filtra por ellas sin necesidad de seleccionarlas) y pedirlas obliga a recalcular los familiares de todos los expedientes visibles antes de paginar (Admin ~295 → ~147 ms en SQL); (2) `count: 'exact'` solo al entrar a la página 1 (donde se aterriza al cambiar filtro/búsqueda) o tras anular (`fetchExpedientes(true)`); al paginar a la 2+ se reutiliza el total (la respuesta trae `content-range: 20-39/*`). Medido en el navegador con el Profesional: página 1 con conteo 199 ms, página 2 sin conteo 118 ms. **No volver a `select('*')`** en esta lista
- **Nuevo ago/2026 — Responsables del Caso**: ✅ hecho. Card "Responsables" en `IngresoDetail.tsx` (avatares + modal con buscador) permite asignar varios profesionales responsables por ingreso (tabla `ingreso_responsables`), distinto del único `profesional_asignado_id`. Complementa 3.1/3.2 y da base para 3.3
- 3.3 Sumar otros profesionales a una intervención — pendiente presupuestado (esto es a nivel de una acción/intervención puntual, no del caso completo — ver ítem de "Responsables del Caso" arriba para el nivel de caso)
- **Nuevo sep/2026 — Búsqueda sin acentos en Bandeja de Expedientes**: ✅ hecho. Ver migración `add_busqueda_sin_acentos_a_vw_expedientes_list`. De paso, `ExpedientesList.tsx` ya no traga errores de carga en silencio (banner visible si falla la query)

**Nuevos (sumados jul/2026)**
- 4.1 Accesos según nueva división de SPD por zonas — pendiente presupuestado, depende de que Marisel habilite la nueva división como Administradora
- **Bug crítico encontrado y resuelto ago/2026 — zona de expedientes no seguía al SPD**: `expedientes.zona_id` es una copia tomada al crear el expediente, y `SpdManagementPage.tsx` al editar un SPD solo actualizaba `servicios_proteccion.zona_id` — nunca propagaba el cambio a los expedientes ya creados de ese SPD. Resultado: al reasignar zonas, los Coordinadores dejaban de ver expedientes de su propia zona (el Dashboard mostraba 0 aunque el Administrador viera los datos reales), porque `puede_leer_datos()` compara la zona del usuario contra `expedientes.zona_id` (desactualizado), no contra la zona actual del SPD. Se encontraron 35 expedientes desincronizados en 4 SPD (Mercado, Guiñazú, Argüello, Monseñor Pablo Cabrera). Corregido con backfill + trigger `trg_sync_zona_expedientes` en `servicios_proteccion` que propaga automáticamente cualquier cambio de zona a los expedientes de ese SPD — cubre este formulario y cualquier otro lugar que edite un SPD a futuro
- 4.2 Coordinadores: ver (solo lectura) intervenciones de todos los SPD sin poder intervenir fuera de su zona — **en espera, no se va a implementar por ahora**: depende de una decisión del cliente todavía no tomada
- 4.3 Hacer la aplicación **responsiva** (usable en celular/tablet, hoy está pensada para escritorio) — ✅ hecho (sep/2026), **ya mergeado a `main`** (PR #2 de `responsive-wizards`). Se dividió en dos bloques de trabajo en paralelo:
  - **Bloque 1** (layout compartido + listados + admin): `Sidebar`/`Navbar`/`MainLayout` con drawer off-canvas en mobile (botón hamburguesa, overlay oscuro, cierre automático al navegar); `NotificationsMenu` con ancho acotado al viewport; `Dashboard` con KPIs en 2 columnas y compactados en mobile; `ExpedientesList` con acciones de fila visibles en touch; `IngresoDetail` con el stepper de etapas y la barra de pestañas con scroll horizontal en vez de aplastarse, grillas internas de 2 columnas responsivas; `UserManagementPage`/`DerechosManagementPage`/`SpdManagementPage` con headers apilables
  - **Bloque 2** (wizards del flujo de expediente): `FormularioRecepcion` (con selector de pasos táctil nuevo — el nav lateral de 8 pasos estaba `hidden lg:flex` sin ningún reemplazo en mobile/tablet), `AccionesAmpliacion`/`PlanificacionAmpliacion`, `InformeSintesis`, `DefinicionMedidas`/`PlanAccionMedida`/`ActaCompromiso`, `CierreIngreso`, `SolicitudSenafForm`/`SolicitudSenafSummary`/`SenafManagementPage`, `EmailNotificationModal`. Hecho con Gemini a partir de un prompt con las convenciones ya fijadas en el Bloque 1 (patrones de header apilable, grillas `grid-cols-1 sm:grid-cols-2`, stepper/tabs con `overflow-x-auto`)
  - **Bug real encontrado y corregido de paso**: varios botones de acción con `opacity-0 group-hover:opacity-100` (tablas/filas en `ExpedientesList.tsx`, `FormularioRecepcion.tsx`) quedaban invisibles en touch porque no existe hover — cambiados a `opacity-100 md:opacity-0 md:group-hover:opacity-100`
  - **Hallazgo sin resolver, anotado en el código**: el bundle principal de producción pesa ~5.4MB sin comprimir (sin code-splitting), lo que obligó a subir `maximumFileSizeToCacheInBytes` en la config de PWA para que el build no fallara (ver 4.4). Dividir el bundle (lazy loading de rutas pesadas y de librerías como `@react-pdf/renderer`/`docx`/`html2canvas`) queda pendiente como mejora de performance aparte, relevante sobre todo en redes móviles
  - `StatCard.tsx` y `StageStepper.tsx` (en `components/ui/`) son código muerto — no se importan en ningún componente — así que quedaron fuera de esta auditoría a propósito
- 4.4 Hacer la aplicación **instalable como PWA** — ✅ hecho (sep/2026), ya en `main` junto con 4.3. `vite-plugin-pwa` configurado en `vite.config.ts` (`registerType: 'autoUpdate'`, sin `runtimeCaching` — las llamadas a Supabase nunca pasan por el service worker, así que no hay riesgo de servir datos de casos desactualizados offline). Íconos generados desde el logo de Córdoba Capital ya existente (`public/logo_cordoba.png`, 512×512) con `@vite-pwa/assets-generator` (preset `minimal`). Botón "Instalar Aplicación" en el `Sidebar` (lógica en `src/hooks/usePwaInstall.ts`), visible solo cuando el navegador dispara `beforeinstallprompt` (Chrome/Android — **no soportado en iOS Safari**, ahí no hay botón posible, solo "Compartir → Agregar a inicio" manual) y oculto si ya está instalada (`display-mode: standalone`). El Service Worker viejo huérfano que se había detectado en navegadores de prueba queda resuelto de forma natural: el nuevo `sw.js` generado por `vite-plugin-pwa` se sirve en la misma ruta (`/sw.js`) y lo reemplaza en el próximo ciclo de actualización del navegador — no hizo falta un script de limpieza aparte. Pendiente: confirmar el flujo de instalación real en un Android/Chrome físico (no se pudo disparar `beforeinstallprompt` de verdad en el entorno de pruebas headless, solo se verificó que el manifest y el service worker cumplen los criterios de instalabilidad)

---

## Pendientes conocidos

- **Bug resuelto nov/2026 — Bandeja de Expedientes con error para el rol Profesional** ("No se pudo cargar la lista de expedientes", `57014 canceling statement due to statement timeout`): el Administrador no lo veía. Causa y fix en la sección de Base de datos (`auditoria`, `vw_ultima_modificacion_ingreso`) y en las dos migraciones de nov/2026. **No hizo falta ningún cambio de frontend**: el fix es 100% de base de datos y ya está activo en producción porque el frontend y el entorno local usan la misma base. Verificado en el navegador con el usuario Profesional (49 expedientes de SPD Colón) y "Ver Historial" de la planificación
- `fn_auditoria_puede_leer()` quedó sin uso tras el fix de nov/2026 — se puede borrar más adelante (no se hizo por prudencia)
- **Observación sin resolver**: en "Ver Historial" y en "Profesional Responsable" el Profesional ve "Usuario desconocido"/"Sin asignar" cuando el autor es de otro SPD, porque la política de lectura de `usuarios` solo deja ver nombres del propio SPD (más uno mismo). No lo causó el fix; falta decidir con el cliente si es el comportamiento deseado

- Módulo `/reportes` es placeholder sin implementar
- `/configuracion` implementado como gestión de SPD — considerar ruta más descriptiva (`/spd`) a futuro
- Usuarios con rol `Profesional` sin SPD asignado (aprox. 12 usuarios) — pendiente depurar
- Tests en `src/services/*.test.ts` existen pero cobertura parcial
- **Búsqueda por nombre en `NuevaRecepcion.tsx`** usa `%` dentro de `.or()` (`nombre.ilike.%…%`), y según la regla de PostgREST de este archivo el comodín correcto es `*` — probablemente falle o no devuelva coincidencias. Sin verificar en vivo; corregir a `*` y probar
- **Decisión de privacidad pendiente con el cliente**: qué puede ver un Profesional sobre niños de otros SPD. Propuesta: búsqueda por **DNI exacto** a todo el sistema con respuesta mínima (existe / SPD / legajo, ya implementado vía `estado_legajo_nino`), y búsqueda por **nombre** limitada a lo que el usuario ya puede ver (buscar por nombre en todo el sistema revelaría qué niños atiende otro SPD y da falsos positivos con nombres comunes). Limitación: un niño sin DNI cargado no puede detectarse como duplicado entre SPD
- ⚠️ **CRÍTICO (auditoría de seguridad ago/2026)**: `SELECT_NINOS` (política RLS de la tabla `ninos`) tiene `qual = true` — cualquier usuario autenticado de cualquier SPD puede leer el DNI, domicilio, historia clínica, discapacidad, etc. de cualquier niño/a del sistema, sin restricción de zona/SPD (a diferencia de `UPDATE_NINOS`, que sí está bien restringido). **No corregir con el mismo patrón de UPDATE sin más**: `vinculacionService.ts` depende de poder buscar por DNI en toda la tabla para detectar niños ya vinculados a un expediente en otro SPD y evitar duplicados. Fix correcto: una función `SECURITY DEFINER` tipo `buscar_nino_por_dni()` que devuelva solo lo mínimo para ese matching (id, expediente vinculado), y restringir el `SELECT` directo a la tabla por zona/SPD como el resto del sistema. **Avance parcial sep/2026**: `estado_legajo_nino()` ya cubre la parte de "saber si el niño tiene legajo y dónde" sin exponer datos, pero **`SELECT_NINOS` sigue en `true`** y `NuevaRecepcion` sigue haciendo `select('*')` sobre `ninos` — cualquier usuario recibe la ficha completa de cualquier niño. Falta armar la función de búsqueda mínima y restringir la política (depende de la decisión de privacidad de arriba)
