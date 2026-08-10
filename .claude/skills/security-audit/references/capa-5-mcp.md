# CAPA 5 — Configuración de MCP y Claude Code

## .mcp.json — verificar que no tenga keys literales

```json
// ✅ CORRECTO — referencia a variable de entorno del sistema
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": ["@supabase/mcp-server-supabase@latest"],
      "env": {
        "SUPABASE_SERVICE_ROLE_KEY": "${SUPABASE_SERVICE_ROLE_KEY}"
      }
    }
  }
}

// ❌ MAL — key literal en el archivo
{
  "mcpServers": {
    "supabase": {
      "env": {
        "SUPABASE_SERVICE_ROLE_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI..."
      }
    }
  }
}
```

## .claude/settings.json — verificar permisos

```json
// ✅ CORRECTO — bloquea lectura de .env
{
  "permissions": {
    "deny": [
      "Read(.env)",
      "Read(.env.*)",
      "Read(.env.local)"
    ]
  }
}
```
