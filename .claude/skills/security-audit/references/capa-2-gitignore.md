# CAPA 2 — Archivos .gitignore y .claudeignore

## Verificar que .gitignore contenga MÍNIMAMENTE

```gitignore
# Variables de entorno
.env
.env.local
.env.*.local
.env.development
.env.production

# Claude Code — configuración personal
.claude/settings.local.json
CLAUDE.local.md

# Supabase local
supabase/.branches
supabase/.temp

# Dependencias
node_modules/

# Build
dist/
build/
.next/

# Certificados y keys
*.pem
*.key
*.p12
*.pfx
secrets/
credentials/
```

## Verificar que .claudeignore exista y contenga

```
# .claudeignore — archivos que Claude Code NO debe leer
.env
.env.*
*.pem
*.key
secrets/
credentials/
node_modules/
dist/
```

## Comando de verificación
```bash
# Ver qué archivos rastrearían un git add accidental
git status --short
git ls-files --others --exclude-standard | grep -E "\.env|\.key|\.pem|secret"
```
