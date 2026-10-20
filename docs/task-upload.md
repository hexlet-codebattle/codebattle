# Uploading tasks

Send `POST /ext_api/tasks` with the deployment's `CODEBATTLE_API_AUTH_KEY` in the
`x-auth-key` header and a JSON body:

```json
{
  "origin": "github",
  "visibility": "public",
  "payload": "BASE64_ENCODED_GZIPPED_JSON_ARRAY"
}
```

`origin` accepts `github` or `user`; `visibility` accepts `public` or `hidden`.
The payload is a UTF-8 JSON array of task objects, compressed with gzip and then
Base64 encoded. See [the working example](examples/task-upload.json).

Each task needs `name`, `description_en`, `level`, `examples`, `asserts`,
`input_signature`, and `output_signature`. Uploads mark tasks as `active` and
use the level's default timing unless explicit timing is provided.

Descriptions may also include `description_ru`, `description_es` (Spanish), and
`description_zh` (Simplified Chinese). Uploads update existing tasks by `name`.
Omitting Spanish or Chinese descriptions preserves those translations on an
existing task; providing a value updates it.

## Local development example

Apply migrations with `make db-migrate`, then run `make server` in another
terminal. Build the request inside the dev container:

```sh
./bin/dev node --input-type=module <<'JS'
import { readFileSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const tasks = JSON.parse(readFileSync('docs/examples/task-upload.json', 'utf8'));
writeFileSync('/tmp/codebattle-task-upload.json', JSON.stringify({
  origin: 'github',
  visibility: 'public',
  payload: gzipSync(JSON.stringify(tasks)).toString('base64'),
}));
JS

./bin/dev curl --fail-with-body \
  -H 'Content-Type: application/json' \
  -H 'x-auth-key: x-key' \
  --data-binary @/tmp/codebattle-task-upload.json \
  http://localhost:4000/ext_api/tasks
```

`x-key` is the default development key. Use the configured key and URL for other
deployments. Successful uploads return HTTP 201 and `{"success": 1}` for this
example. Repeating it updates the same task.

Malformed payloads return HTTP 400. Batches containing invalid task objects
return HTTP 400 with `success` and per-task `errors`; valid tasks in the same
batch are still saved. Missing or incorrect authentication returns HTTP 401.
