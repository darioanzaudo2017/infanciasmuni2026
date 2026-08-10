---
name: security-audit
description: >
  Usar cuando el usuario pida revisar seguridad del proyecto: keys/tokens
  expuestos, variables de entorno en git, políticas RLS de Supabase,
  .gitignore/.claudeignore, configuración del .mcp.json, o antes de
  cualquier push/deploy a producción. También activar si se detectan
  credenciales hardcodeadas en cualquier archivo del proyecto.
---

# Skill: Auditoría de Seguridad — PWA Municipal + Supabase

## Las 5 capas a auditar (siempre en este orden)

Cada capa tiene su detalle completo (comandos, queries, ejemplos correcto/incorrecto)
en `references/`. Leer el archivo de la capa correspondiente al llegar a ella —
no hace falta cargar las 5 references de una sola vez.

### CAPA 1 — Secretos expuestos en archivos del proyecto
Qué se audita: keys/tokens hardcodeados en código, `CLAUDE.md`, `.mcp.json`, `settings.json`.
Ver `references/capa-1-secretos.md` (comandos grep, archivos de alto riesgo, herramientas externas).

### CAPA 2 — Archivos .gitignore y .claudeignore
Qué se audita: que `.gitignore` y `.claudeignore` cubran env files, certificados, node_modules, etc.
Ver `references/capa-2-gitignore.md` (contenido mínimo esperado, comandos de verificación).

### CAPA 3 — Git history (el más peligroso)
Qué se audita: si algún secreto quedó commiteado alguna vez, aunque ya se haya borrado del working tree.
Ver `references/capa-3-git-history.md` (comandos de detección, protocolo de emergencia, pre-commit hook).

⚠️ Esta capa puede recomendar reescribir historial y force-push — son acciones
destructivas sobre un repo compartido. Nunca ejecutarlas sin mostrarle el hallazgo
al usuario y esperar confirmación explícita primero.

### CAPA 4 — Row Level Security (RLS) en Supabase
Qué se audita: tablas sin RLS, políticas faltantes o demasiado permisivas, funciones `SECURITY DEFINER`.
Ver `references/capa-4-rls.md` (queries de verificación, patrones problemáticos, consideraciones para proyectos municipales).

### CAPA 5 — Configuración de MCP y Claude Code
Qué se audita: `.mcp.json` y `.claude/settings.json` sin keys literales.
Ver `references/capa-5-mcp.md` (ejemplos correcto/incorrecto).

---

## Checklist de reporte (output de la auditoría)

Al terminar el análisis, generar un reporte con este formato:

```markdown
## 🔐 Reporte de Seguridad — [nombre-proyecto] — [fecha]

### CAPA 1: Secretos en archivos
- [ ] ✅/❌ Sin keys hardcodeadas en src/
- [ ] ✅/❌ CLAUDE.md sin credenciales
- [ ] ✅/❌ .mcp.json usa variables de entorno

### CAPA 2: Archivos ignorados
- [ ] ✅/❌ .gitignore cubre .env y variantes
- [ ] ✅/❌ .claudeignore existe y es correcto

### CAPA 3: Git history
- [ ] ✅/❌ Sin secretos detectados en historial
- [ ] ✅/❌ pre-commit hook instalado

### CAPA 4: RLS Supabase
- [ ] ✅/❌ Todas las tablas tienen RLS activado
- [ ] ✅/❌ Políticas cubren todos los roles
- [ ] ✅/❌ Sin SECURITY DEFINER innecesarios

### CAPA 5: Claude Code / MCP
- [ ] ✅/❌ .mcp.json sin keys literales
- [ ] ✅/❌ settings.json bloquea .env

### Hallazgos críticos (acción inmediata)
[lista de problemas que requieren rotación de keys]

### Hallazgos medios (corregir antes del próximo deploy)
[lista de problemas de configuración]

### Recomendaciones
[mejoras opcionales]
```
