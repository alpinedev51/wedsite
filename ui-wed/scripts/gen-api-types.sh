#!/usr/bin/env sh
# Regenerates src/lib/api.schema.ts from service-wed's OpenAPI schema, so the
# frontend's request/response types come from the backend instead of being
# copied by hand. Run after changing a backend schema: `npm run gen:api`.
# The schema is read straight from the FastAPI app (no server needed).
set -eu
cd "$(dirname "$0")/.."
schema="$(mktemp)"
trap 'rm -f "$schema"' EXIT
(cd ../service-wed && uv run --quiet python -c \
  "import json; from service_wed.main import app; print(json.dumps(app.openapi()))") > "$schema"
# Pinned and run through npx rather than installed: openapi-typescript
# declares a TypeScript 5 peer dependency, and this project is on 6.
npx --yes openapi-typescript@7.13.0 "$schema" -o src/lib/api.schema.ts
npx prettier --write src/lib/api.schema.ts > /dev/null
