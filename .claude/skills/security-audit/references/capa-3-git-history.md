# CAPA 3 — Git history (el más peligroso)

Si alguna vez se commiteó un secreto, borrarlo del working tree NO es suficiente.
Queda en el historial para siempre.

## Detectar si hay secretos en el historial
```bash
# Buscar en TODO el historial git
git log --all --full-history -- "*.env" "*.env.local"
git log -S "eyJ" --oneline  # busca JWTs en commits
git log -S "service_role" --oneline
git log -S "SUPABASE" --oneline
```

## Si se encuentra algo → protocolo de emergencia

⚠️ **Estas son acciones destructivas e irreversibles sobre el historial compartido.
Nunca ejecutarlas sin mostrarle al usuario el hallazgo primero y esperar confirmación explícita
— reescribir historial y hacer force push afecta a todos los colaboradores del repo.**

1. **Rotar inmediatamente** las keys expuestas (Supabase dashboard → API Keys → Regenerate)
2. **NO usar `git revert`** — el secreto sigue en historial
3. Usar `git filter-repo` para reescribir el historial:
   ```bash
   pip install git-filter-repo
   git filter-repo --path .env --invert-paths
   ```
4. Force push a todas las ramas: `git push origin --force --all`
5. Notificar a colaboradores para que rehagan sus clones

## Prevención — pre-commit hook
Crear `.git/hooks/pre-commit`:
```bash
#!/bin/sh
# Bloquear commits con posibles secretos
if git diff --cached --name-only | xargs grep -l "eyJ\|service_role\|ANON_KEY" 2>/dev/null; then
  echo "❌ BLOQUEADO: posibles secretos detectados en el commit"
  echo "Revisá los archivos marcados arriba"
  exit 1
fi
```
```bash
chmod +x .git/hooks/pre-commit
```

## Herramienta externa alternativa — git-secrets

```bash
brew install git-secrets
git secrets --install
git secrets --register-aws  # patrones AWS
# agregar patrones Supabase:
git secrets --add 'eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}'
```
