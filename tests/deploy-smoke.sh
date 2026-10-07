#!/usr/bin/env bash
set -euo pipefail
# Run after building alpc-api and alpc-ml; use a disposable MongoDB.
docker network create alpc-smoke
docker run -d --name alpc-mongo-smoke --network alpc-smoke mongo:7
docker run -d --name alpc-ml-smoke --network alpc-smoke -p 127.0.0.1:18000:10000 alpc-ml
docker run -d --name alpc-api-smoke --network alpc-smoke -p 127.0.0.1:15000:10000 \
  -e MONGODB_URI=mongodb://alpc-mongo-smoke:27017/smoke \
  -e JWT_SECRET=ci-only-not-a-production-secret-0123456789 \
  -e FRONTEND_URL=http://localhost:3000 \
  -e ML_SERVICE_URL=http://alpc-ml-smoke:10000 alpc-api
curl --fail --retry 30 --retry-delay 2 --retry-all-errors --retry-max-time 90 --max-time 5 http://127.0.0.1:18000/health
curl --fail --retry 30 --retry-delay 2 --retry-all-errors --retry-max-time 90 --max-time 5 http://127.0.0.1:15000/health
curl --fail -sS http://127.0.0.1:15000/api/alpc/compile \
  -H 'Content-Type: application/json' \
  -d '{"source":"OUTCOME core; SET state = 62; IF state >= 50 GOTO core;"}' > /tmp/alpc-compile.json
python3 - <<'CHECK'
import json
with open('/tmp/alpc-compile.json') as f:
    result = json.load(f)
assert result['success'], result
assert result['outcome'] == 'core', result
assert result['alignmentScore'] == 62, result
assert result.get('optimizedIr'), result
CHECK
curl --fail -sS http://127.0.0.1:18000/bkt/update \
  -H 'Content-Type: application/json' \
  -d '{"skill":"Arrays","correct":true,"currentMastery":0.3}' > /tmp/alpc-mastery.json
python3 - <<'CHECK'
import json
with open('/tmp/alpc-mastery.json') as f:
    result = json.load(f)
assert result['updatedMastery'] > 0.3, result
CHECK
