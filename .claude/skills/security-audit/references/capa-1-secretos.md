# CAPA 1 — Secretos expuestos en archivos del proyecto

## Qué buscar

Escanear TODO el proyecto con:
```bash
# Buscar patrones de keys/tokens hardcodeados
grep -rn "eyJ" --include="*.ts" --include="*.tsx" --include="*.js" \
     --include="*.json" --include="*.env" --include="*.md" .

grep -rn "SUPABASE_SERVICE_ROLE\|service_role\|anon_key\|ANON_KEY" \
     --include="*.ts" --include="*.tsx" --include="*.js" \
     --include="*.json" --include="*.md" --include="CLAUDE.md" .

grep -rn "sk-\|Bearer \|token.*=\|key.*=\|secret.*=" \
     --include="*.ts" --include="*.tsx" --include="*.js" .
```

## Archivos de alto riesgo a revisar manualmente
- `CLAUDE.md` — NUNCA debe contener keys ni tokens
- `.mcp.json` — las keys deben ser `${ENV_VAR}`, nunca literales
- `.claude/settings.json` — mismo criterio
- `src/lib/supabase.ts` — solo debe usar `import.meta.env.*`
- Cualquier `*.config.ts` o `*.config.js`

## Resultado esperado (correcto)
```typescript
// ✅ CORRECTO — usa variables de entorno
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

// ❌ MAL — key hardcodeada
const supabase = createClient(
  'https://abcdef.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
)
```

## Herramientas externas recomendadas (instalar una vez)

```bash
# Trufflehog — detecta secretos en git history
brew install trufflehog
trufflehog git file://. --only-verified

# detect-secrets (Python)
pip install detect-secrets
detect-secrets scan > .secrets.baseline
```
