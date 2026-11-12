#!/usr/bin/env bash
# Dump do Postgres do Quitou para um diretório no host, fora do volume.
# A senha fica no env do compose. Este script não a lê nem a grava.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DEST="${1:-}"

if [[ -z "$DEST" ]]; then
  echo "uso: deploy/postgres/backup.sh <diretorio-fora-do-volume>" >&2
  exit 2
fi

mkdir -p "$DEST"

STAMP="$(date +%Y%m%d%H%M%S)"
OUT="$DEST/quitou-$STAMP.dump"

docker compose --env-file "$ROOT/deploy/postgres/.env" -f "$ROOT/deploy/postgres/compose.yml" \
  exec -T postgres \
  sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc --no-owner --no-acl' \
  > "$OUT"

if [[ ! -s "$OUT" ]]; then
  rm -f "$OUT"
  echo "dump vazio" >&2
  exit 1
fi

# Mantém as sete cópias mais novas. O caminho pode ter espaço.
python3 - "$DEST" << 'PY'
import sys
from pathlib import Path

dest = Path(sys.argv[1])
files = sorted(dest.glob("quitou-*.dump"), key=lambda path: path.stat().st_mtime, reverse=True)
for old in files[7:]:
    old.unlink()
PY

echo "$OUT"
