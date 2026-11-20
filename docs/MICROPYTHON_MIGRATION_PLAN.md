# Full MicroPython migration: plan

Status: plan, started 2026-11-20. Advanced mode is locked (done, see Phase 0). The goal is a Beginner Studio where everything a student does runs on MicroPython: parts, Cloud (IoT) and Edge AI. No Arduino C++ is left in the student path, and the compile server can be switched off.

"All platforms" here means every Beginner feature, on desktop Chrome or Edge on Windows, macOS, ChromeOS and Linux, with both kit USB chips (CH340 and CP210x). Phones stay out: Web Serial does not exist there.

## Where we are

| Area | State today |
|---|---|
| Parts and control blocks | MicroPython, all ported (library 0.2.0, firmware API 2) |
| Cloud (IoT) | MicroPython (`cloud.py` + `tbcloud` C module, settings in `/config.json`). Not yet proven on hardware: memory and 24 h stability (check 1), the real broker, the WSS fallback |
| Edge AI | **Arduino only**: the recorder and the AI program are C++ sketches, so in MicroPython mode the page says "Coming soon" and AI templates are greyed out |
| `?board=arduino` | Hidden teacher switch; keeps the whole C++ path alive (codegen, Cloud firmware, AI firmware, compile + flash) |
| Advanced IDE | **Locked** (Phase 0) |
| Compile server | Still running, still open (no sign-in, no rate limit, raw compiler logs). Used only by Edge AI and `?board=arduino` now that Advanced is locked |
| Hardware checks | Only safe mode and upload speed measured, on one CH340 board from a Python host. Checks 1, 2, 4, CP210x and the Chrome page runs are open |

## Decisions (defaults I will follow unless you say otherwise)

1. **Advanced lock:** `/ide` and the IDE example pages redirect to `/beginner`; the Choose page shows Advanced as paused; unlock with `ADVANCED_MODE=on` and a redeploy. *Done.*
2. **Remove Arduino from Beginner completely** once Phase 2 signs MicroPython off on hardware: no `?board=arduino`, no C++ generators, no compile path in the Studio.
3. **Edge AI examples recorded with the Arduino recorder are recorded again.** The signature gets a MicroPython marker, so the page asks for new examples instead of mixing in data from a different capture loop. Very few projects have Arduino recordings yet, so the cost is small.
4. **Edge AI ships as a library file first** (`/lib/tbai.py`, written at Upload like `boot.py`), so it needs no firmware rebuild. It is frozen into the next firmware (API 3) in Phase 4, which saves RAM.
5. **The compile server is switched off at the end** (Phase 5). You run or approve that step: it changes the EC2 host and `vercel.json`.
6. **Sound is not added as an AI kind.** The Arduino version did not have it either.

## Phases

### Phase 0: Lock Advanced (done)
- One switch `ADVANCED_MODE` ([advanced-mode.js](../src/lib/advanced-mode.js), [middleware.js](../middleware.js)). Locked unless it is `on`.
- `/ide`, `/ide.html`, `blocks-only.html`, `compatibility-testing.html`, `player.html` → 302 to `/beginner`, before the sign-in check. The IDE page also sends itself to Beginner (covers local dev).
- The Choose page shows Advanced as "Paused for now"; the Beginner menu hides "Switch mode". Tests: `advanced-mode.test.js`, `choose.test.jsx`, `account-menu.test.jsx`.

### Phase 1: Edge AI on MicroPython (the main code work)
**Board side, new library module `tbai`** (`prototypes/micropython/lib/tinkerbit/tbai.py` or a top-level `tbai.py`):
- **Motion capture:** a direct port of `aiCaptureMotion` in [aiFirmware.js](../src/beginner-studio/domain/ai/aiFirmware.js). It reads `Motion._sample()` (already g and °/s, the same units as the Arduino driver) every 10 ms, keeps a 20-reading ring, starts a move when the jolt (`|g - 1| + spin/300`) passes 0.35, keeps 100 readings (200 ms before the start), and computes the 24 features (average, spread, lowest, highest of 6 axes). Buffers are `array('f')`, not lists, to avoid filling the heap with float objects.
- **Sensors capture:** 5 readings over about 1 s from the wired parts' existing read methods, averaged, in the fixed sorted order `aiKinds.js` uses.
- **Recorder:** prints the same `TBAI1` lines as the Arduino sketch (`H` hello every 2 s, `F` per example, `L` level, `E,no_sensor`). [aiLine.js](../src/beginner-studio/domain/ai/aiLine.js), [knn.js](../src/beginner-studio/domain/ai/knn.js) and the Edge AI page keep working unchanged.
- **Classifier:** the same steps as `aiClassify()`: standardise with the saved mean and scale, 3 nearest neighbours, most votes, ties to the nearest, Not sure (9) past the distance limit, Nothing (0) when no move came. The model is read once from `/ai_model.bin` (float32 means, scales and examples, loaded with `readinto` into `array('f')`, about 15 KB at most) plus a small `/ai_model.json` (names, k, limit, counts).

**Studio side:**
- **Recorder upload:** "Put the recorder on the board" sends the recorder through the existing MicroPython upload (no compile). The Edge AI monitor listens at 115200 instead of 9600 in MicroPython mode.
- **Codegen:** [pycodegen.js](../src/beginner-studio/domain/pycodegen.js) emits `ai = tbai.Ai(...)`, one `ai.ask()` per loop pass and `if ai.answer == <n>:` for "If the AI thinks it is …". An If about a removed thing becomes `if False:` and blocks Upload, as in C++. Remove `ai_ask` from `NOT_YET_BLOCKS`.
- **Upload:** writes `/ai_model.bin` and `/ai_model.json` when the program uses AI and removes them otherwise, like `/config.json`. The model no longer lives inside the program, so the code panel needs no "stand-in" and shows the real program.
- **Page:** [AiView.jsx](../src/beginner-studio/components/ai/AiView.jsx) shows the real page in MicroPython mode. The Magic Wand, Room Mood and Phone AI Alert templates open again.
- **Cloud:** one 0/1 reading per thing (`ai_<name>`) through `cloud.set`, as in C++.
- **Signature:** add a MicroPython marker (decision 3).

**Tests:**
- pytest: capture, features and classify against the board simulator; a recorder line test.
- A shared fixture of fixed vectors with the answers from `knn.js`, checked by both jest and pytest, so the browser and the board can never disagree.
- jest: Python codegen for the AI blocks, model file contents, the recorder upload path, the templates.

### Phase 2: Prove it on hardware (needs you, with real boards)
I prepare the scripts and checklists; the runs need boards.
- [RESULTS.md](../prototypes/micropython/RESULTS.md) checks 1–5 through the Chrome page, on a CH340 board **and** a CP210x board.
- Check 1 against the real broker (`api.tinkerbit.io`) with a test device: memory after connecting, 24 h, the WSS fallback. Repeat with Phone AI Alert (Cloud + Edge AI together, the tightest memory case).
- Every template on a real board. Edge AI Motion and Sensors end to end: record, train, upload, recognise.
- The new parts (RFID, HC-05, BLE, heartbeat) on hardware.
- OS matrix: Windows, macOS, ChromeOS, Linux (driver install, Connect, Upload, Update board).
- Automated in the meantime: every template's `main.py` runs in the board simulator without errors and prints its ready lines (a CI test, no board needed).

### Phase 3: Remove Arduino from Beginner (after Phase 2 signs off)
- Delete the `?board=arduino` switch ([boardLanguage.js](../src/beginner-studio/domain/boardLanguage.js)) and the C++ path:
  - C++ generators: `codegen.js`, `cloudFirmware.js`, `cloudCerts.js`, the C++ half of `aiFirmware.js`, `motionSensor.js` and `cText.js` (where nothing else needs them);
  - the compile-and-flash branch of `useBoardUpload.js` and `UploadContext.jsx`;
  - the C++ colouring in `LiveCodePanel.jsx`.
- Rewrite the tests that assert C++ output to assert the Python output instead. Keep each behaviour, not each line.
- A board that still runs an Arduino program keeps getting "Choose Update board" (that path already exists).
- Update ARCHITECTURE.md: Beginner becomes MicroPython-only; section 4.5 then only describes the locked IDE.

### Phase 4: Make it a product, not a prototype
- Move the library and firmware sources out of `prototypes/micropython/` (for example to `firmware/micropython/`), updating the imports in `libraryFiles.js`, `build.sh` and the tests.
- Freeze `tbai` into the firmware, bump to API 3, rebuild, and bundle the new `.bin` with its SHA-256.
- CI: build the firmware in Docker, run pytest and the Playwright page tests, and publish the `.bin` and its hash as a build artifact.
- Small fixes:
  - drop "(MicroPython preview)" from the generated header;
  - handle HC-05 modules set to 38400;
  - fix the phone layout or show a "use a computer" screen.
- Optional: cache the Beginner page, library and firmware with a service worker, so a classroom can reload without internet. Sign-in still needs the internet once.

### Phase 5: Switch off the compile server (needs your go-ahead)
With Advanced locked and no C++ left in Beginner, nothing calls `/api/compile`:
- stop the `compile-api` service on EC2 and remove its nginx location;
- remove the `/api/compile`, `/devices/*` and `/extensions/*` rewrites from `vercel.json`.

This also closes all three security findings: the open compile endpoint, the plain-HTTP IDE scripts and the raw compiler logs. If Advanced comes back later, the compile plan's Phase 0 fixes ([COMPILE_BACKEND_PLAN.md](COMPILE_BACKEND_PLAN.md)) must land before it reopens.

## Risks
| Risk | What we do |
|---|---|
| Cloud + Edge AI do not fit in memory on a board without PSRAM | Model as `array('f')` from a binary file (about 15 KB); measure in Phase 2; freeze `tbai` in Phase 4; cap examples at 40 per thing |
| MicroPython timing makes motion features differ from what was recorded | Recording and recognising both run the same Python capture, and old Arduino recordings are re-recorded (decision 3) |
| kNN too slow in Python | Up to 160 × 24 multiply-adds per answer, a few tens of ms; `@micropython.native` if needed |
| A hardware check fails after the switch | Phase 3 (removing Arduino) waits for Phase 2; until then `?board=arduino` stays as the escape hatch |
| Removing C++ loses tested behaviour | Tests are rewritten per behaviour before the C++ code is deleted |
