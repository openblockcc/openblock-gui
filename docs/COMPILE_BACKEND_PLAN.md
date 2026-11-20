# Compile backend: migration plan

Status: plan, not started. It replaces the current `services/compile-api` setup (one Node process running `arduino-cli` on the shared EC2 host `13.127.144.30`) with a pinned, sandboxed, queued compile service on its own host. The browser upload flow does not change.

## Why
| Problem today | Where | Risk |
|---|---|---|
| No sign-in, rate limit or concurrency cap on `POST /api/compile` | `services/compile-api/server.js` | Anyone can run gcc on our box at will. CORS only limits browsers |
| Full compiler output is returned to the caller | `server.js` error path (`log: err.stderr`) | `#include "/etc/..."` can echo server file contents into the log |
| Every request builds from scratch in a fresh temp folder | `compileSketch()` | 30 students uploading the same template means 30 identical slow builds |
| Core and library versions are unpinned (`core install esp32:esp32`, `lib install Blynk`) | `install-on-ec2.sh` | A rebuilt server can quietly compile differently from the old one |
| Runs as a plain user on the same box as Mosquitto + iot-api + SQLite | EC2 host | A compile burst slows Cloud, and a compromise reaches Cloud data |
| `/devices/*` and `/extensions/*` (JS the IDE runs) are fetched over plain HTTP | `vercel.json` rewrites to `http://13.127.144.30` | Code can be injected into every IDE session |

## Decisions
- **Keep `arduino-cli`.** It's the right compiler for Uno/ESP32/ESP32-S3. We don't switch to PlatformIO or rewrite in Go or Rust: the slow part is the compiler, not the Node wrapper.
- **No serverless and no in-browser (WASM) compile.** The ESP32 toolchain is over 1 GB, so cold starts would be slow and the build cache would be lost. And there is no practical WASM build of the ESP32 compiler.
- **Keep the API contract.** `POST {source, fqbn}` returns `{hex, log}` (Uno) or `{format:'esptool', images:[{address, data}], log}` (ESP32), so `src/lib/web-serial/compile-client.js` keeps working through the whole migration. A job API is added next to it, not instead of it.
- **Supported boards stay** `arduino:avr:uno`, `esp32:esp32:esp32`, `esp32:esp32:esp32s3`. The limits stay at 128 KB of source and 180 s for a compile.

## Target architecture
```
Browser ──/api/compile──► Vercel rewrite ──HTTPS──► nginx (compile.tinkerbit.io)
                                                     ▼
                                            compile-gateway (Node 22)
                                            · checks tb_session (jose, AUTH_SECRET)
                                            · per-user + global limits
                                            · result cache  (sha256 of source+fqbn+IMAGE_TAG)
                                            · job queue, N workers = CPU cores
                                                     ▼
                                      docker run --rm compile-worker:<IMAGE_TAG>
                                      pinned arduino-cli + cores + libraries
                                      --network none · read-only root · non-root
                                      --cpus 1 · --memory 1.5g · --pids-limit 256 · timeout
                                      warm build cache volume (core archives only)
```

## Phases
Each phase ships and is tested on its own. Phases 0–1 change the current server in place; phases 2–5 run alongside it until the switch.

### Phase 0: Quick safety fixes on the current server (about a day)
- [ ] Require the `tb_session` cookie. Copy `verifySession` from `services/iot-api/src/auth.js` (jose + `AUTH_SECRET`). Vercel forwards the cookie on rewrites, as `/api/iot` already relies on.
  - `/ide` and `/beginner` call it same-origin, so no frontend change is needed.
  - Localhost dev keeps working via `AUTH_DISABLED=1`.
- [ ] Concurrency cap: at most `max(1, cores-1)` compiles at once. Requests over the cap wait up to 60 s, then get `503 {error:'Compile server busy, try again in a minute'}` with `Retry-After`.
- [ ] Per-user limit: 6 compiles per minute and 60 per hour, with a `429` and a friendly message.
- [ ] Clean the log before returning it:
  - replace absolute paths (`/tmp/compile-xxx/sketch/` → `sketch:`, toolchain paths → `<core>`);
  - keep only the lines with `error:` / `warning:` plus 2 lines of context;
  - cap at 8 KB.
  - Refuse sketches that `#include` an absolute path or `..` (`400 'Only kit libraries can be included'`).
- [ ] Map the new `401` / `429` / `503` responses in `compile-client.js` and `friendlyUpload.js` to short student messages ("Sign in again", "Too many uploads, wait a minute", "Server busy").
- [ ] nginx: `limit_req` on `/api/compile` keyed on the real client IP. `set_real_ip_from` with Vercel's ranges + `real_ip_header X-Forwarded-For` fixes the same gap for `/api/iot`.
- [ ] Serve `/devices/*` and `/extensions/*` over HTTPS through the `api.tinkerbit.io` nginx, and update the two `vercel.json` rewrites.

### Phase 1: Pinned worker image
- [ ] `services/compile-worker/Dockerfile` (Debian slim):
  - arduino-cli at a fixed version;
  - `arduino:avr@<ver>` and `esp32:esp32@<ver>` — use the versions on the current server (`arduino-cli core list` there) so output matches;
  - libraries at fixed versions: ESP32Servo, Adafruit SSD1306 + GFX, MFRC522, SparkFun MAX3010x, Blynk;
  - a non-root `builder` user.
- [ ] `lock.json` lists every version, and its SHA forms the image tag (`IMAGE_TAG`). Changing a version means a new tag, which also clears the result cache.
- [ ] Worker entry `compile.sh <fqbn>`:
  - reads the sketch from `/in/sketch.ino` and writes `/out/result.json` (the same shape as today);
  - moves the ESP32 image collection and `boot_app0` handling from `server.js` into `worker/collect.js` so the logic isn't duplicated.
- [ ] Build-time warm-up: compile one sketch per board inside the image, so the core archives are cached in the image (the first real compile skips building the core).
- [ ] Golden tests (`services/compile-worker/test/`):
  - every Beginner template (`scripts/check-templates.js` can emit them) plus a Blynk and an Uno sketch compiles;
  - flash sizes stay within ±2% of the old server;
  - the `0x1000/0x8000/0xe000/0x10000` image set is present for ESP32.
- [ ] CI builds the image and runs the golden tests on every change to `services/compile-worker` or `lock.json`.

### Phase 2: Gateway, queue and cache
- [ ] `services/compile-gateway/` (Node 22, no framework, same style as iot-api):
  - `POST /api/compile`: the old synchronous contract. It waits for the job and holds the request for at most 170 s.
  - `POST /api/compile/jobs` returns `{jobId, position}`; `GET /api/compile/jobs/:id` returns `{state: queued|running|done|failed, position, result?}`. This avoids long-held requests through Vercel and lets the UI show "3 ahead of you".
  - `GET /api/compile/health` (liveness) and `/readyz` (Docker reachable, disk > 15%, queue below the limit).
- [ ] Queue: in-memory FIFO with N workers; fair per user (round-robin across users, so one class can't starve another); limit of 50 queued jobs.
  - Jobs are lost on restart; clients get `503` and retry.
  - Redis/SQS only if we ever run more than one gateway.
- [ ] Result cache:
  - key `sha256(IMAGE_TAG + fqbn + source)`;
  - on disk, capped at 2 GB with LRU eviction, holding only the output files (hex or ESP images + cleaned log);
  - never cache failures or sketches with Cloud secrets: skip the cache when the source contains `CLOUD_WIFI_PASS`/`CLOUD_DEVICE_KEY` defines.
  - Templates and lessons will mostly hit the cache.
- [ ] Each job:
  - writes the sketch to a fresh temp folder and runs `docker run --rm --network none --read-only --tmpfs /tmp:size=512m --cpus 1 --memory 1.5g --pids-limit 256 --security-opt no-new-privileges --user builder`, with `/in` mounted read-only and `/out` writable;
  - is killed after 180 s;
  - deletes the temp folder in `finally`.
- [ ] Logs: JSON lines with job id, user hash (not the email), fqbn, cache hit, queue ms, compile ms, result. The sketch source is never logged (Cloud sketches carry the WiFi password).
- [ ] Metrics: `/metrics` (text), showing queue length, p50/p95 compile time and cache hit rate, for the pilot dashboard.

### Phase 3: Its own host
- [ ] A new EC2 instance for compiles only (start with c7i.xlarge, 4 vCPU; ESP32 compiles are CPU-bound):
  - Elastic IP, DNS `compile.tinkerbit.io`, certbot, nginx;
  - only 443 open (22 restricted).
- [ ] Deploy with the same tools as iot-api: `deploy.sh` with release folders, pre-deploy health check, and automatic rollback if `/readyz` fails.
- [ ] Optional later: ECS/Fargate instead of EC2. Containers per job would then be Fargate tasks, which cost more per compile but need no server care. Decide after a month of metrics.

### Phase 4: Frontend (small)
- [ ] `compile-client.js`: use the job API when the gateway advertises it (`health` returns `{ok, jobs: true}`), else fall back to the synchronous call.
- [ ] `useBoardUpload` / `friendlyUpload.js`: show "Waiting for the compile server (2 ahead)" and "Compiling…" separately. Retry once automatically on `503`.

### Phase 5: Switch and clean up
- [ ] Load test: `tools/load-compile.mjs` with 30 users uploading the same template + 10 different sketches at once. Targets:
  - p95 under 20 s on a cache hit;
  - p95 under 90 s on a miss;
  - no `5xx` other than planned `503`s.
- [ ] Switch the `vercel.json` rewrite `/api/compile*` → `https://compile.tinkerbit.io/api/compile*`, and keep the old server for one week as a rollback path.
- [ ] Then remove `compile-api` from the shared host: stop the service, remove its nginx upstream and delete `services/compile-api`. Update `ARCHITECTURE.md` sections 4.5 and 5.2.

## Edge cases
| Case | Handling |
|---|---|
| Session expired mid-lesson | `401` → "Sign in again" with a link back to the same page; the project is already autosaved |
| Localhost dev without sign-in | `AUTH_DISABLED=1` on a local gateway, or keep proxying to the old dev target |
| Whole class presses Upload at once | Fair queue + cache; position shown; `503` with `Retry-After` beyond 50 queued |
| Identical template sketches | Cache hit, instant |
| Cloud sketch (contains secrets) | Never cached, never logged; log cleaner also masks the defines |
| `#include "/etc/passwd"` or `../` | Refused before compile; the container also has no host files mounted |
| Infinite macro expansion / huge output | 180 s kill, 8 KB log cap, `--pids-limit`, memory limit |
| Sketch tries network (library download) | `--network none`; libraries are only what's in the image |
| New library needed (e.g. Edge AI needs none) | Edit `lock.json` → new image tag → golden tests → deploy |
| Core upgrade changes flash layout | Golden tests compare the image set and sizes before deploy |
| Gateway restarts mid-job | Job lost; client sees `503`, auto-retries once |
| Disk fills with cache | LRU cap 2 GB; `/readyz` fails below 15% free |
| Docker daemon down | `/readyz` fails; nginx returns `503`; deploy rolls back |
| Vercel holds long requests | Job API (poll every 2 s) instead of a single 3-minute request |
| Advanced IDE (`/ide`) Blynk sketches | Blynk is in the image; `detectCompileLibraries` logic moves into the worker |

## Cost (rough, ap-south-1)
- Compile host c7i.xlarge on demand: about $130/month. Use a 1-year Savings Plan (about 35% off) once the pilot is confirmed.
- The shared host can then shrink, because it only runs Mosquitto + iot-api + nginx.

## Files
- New:
  - `services/compile-worker/` (`Dockerfile`, `lock.json`, `compile.sh`, `collect.js`, `test/`)
  - `services/compile-gateway/` (`src/`, `deploy/`, `test/`, `readme.md`)
  - `tools/load-compile.mjs`
- Changed:
  - `src/lib/web-serial/compile-client.js`, `src/beginner-studio/domain/friendlyUpload.js`, `src/beginner-studio/hooks/useBoardUpload.js`
  - `vercel.json`, `services/iot-api/deploy/nginx-iot.conf`
  - `ARCHITECTURE.md`
- Removed after the switch: `services/compile-api/`.
