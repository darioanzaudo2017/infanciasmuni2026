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
│   └── useNotifications.ts
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
| `medidas_proteccion` | Medidas sugeridas por ingreso |
| `senaf_solicitudes` | Solicitudes de medidas excepcionales |
| `auditoria` | Log de acciones: tabla, registro_id, accion, usuario_id |
| `notificaciones` | Notificaciones internas por usuario |

**Vistas:**
- `vw_expedientes_list` — lista de expedientes con datos de nino, spd, zona, profesional, anulado. Creada con `security_invoker = true`

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

---

## Convenciones de código

### Supabase
- El cliente se importa SIEMPRE desde `src/lib/supabase.ts` — nunca crear otro cliente
- Las operaciones de BD complejas van en `src/services/` — no directo desde componentes
- Las vistas que usan RLS deben crearse con `security_invoker = true`
- Nunca usar `service_role` key en el cliente

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

## Migraciones aplicadas en producción

| Migración | Descripción |
|---|---|
| `add_participantes_jsonb_to_intervenciones` | Columna `participantes jsonb` en `form2_intervenciones` |
| `add_origen_consulta_to_ingresos` | Columna `origen_consulta text` en `ingresos` |
| `add_anulado_to_expedientes` | Columnas `anulado`, `motivo_anulacion`, `anulado_por`, `anulado_at` en `expedientes` |
| `update_vw_expedientes_list_add_anulado_v2` | Vista recreada con campos de anulación y `security_invoker=true` |
| `add_genero_constraint_ninos` | CHECK constraint en `ninos.genero` |
| `add_ocupacion_nivel_educativo_grupo_conviviente` | Campos adicionales en grupo familiar |

---

## Lo que NO hacer

- **Nunca** deshabilitar RLS en ninguna tabla
- **Nunca** usar `SECURITY DEFINER` sin justificación explícita del usuario
- **Nunca** escribir keys o tokens en archivos de código
- **Nunca** usar `service_role` key en el cliente
- **Nunca** `new Date("yyyy-MM-dd")` sin `T12:00:00` — rompe fechas en Argentina
- **Nunca** guardar `""` en campos con enum constraint (usar `|| null`)
- **Nunca** hacer `CREATE OR REPLACE VIEW` cuando cambia el orden de columnas — hacer `DROP VIEW` + `CREATE VIEW`
- **Nunca** pushear a `main` sin que el usuario confirme
- **Nunca** modificar archivos de migración ya aplicados en producción — crear una nueva migración

---

## Pendientes conocidos

- Módulos `/reportes` y `/configuracion` son placeholders sin implementar
- Usuarios con rol `Profesional` sin SPD asignado (aprox. 12 usuarios) — pendiente depurar
- Tests en `src/services/*.test.ts` existen pero cobertura parcial
