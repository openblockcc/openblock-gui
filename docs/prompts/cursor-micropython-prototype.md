# Cursor prompt: TinkerBit MicroPython prototype on the Maker ESP32

Paste everything below the line into Cursor (Agent mode) at the root of the `blockcode-gui` repo.

---

## Role and goal
You are working in the TinkerBit repo (`blockcode-gui`). TinkerBit is a browser studio for the **Maker ESP32 RJ11 kit**. Today Beginner Studio generates Arduino C++ and compiles it on a server (`services/compile-api`), then flashes it over Web Serial.

We are **evaluating** a MicroPython path for Beginner Studio: no compile server, uploads in about a second, and it works offline. Your job is a **prototype that proves or disproves five risks on real hardware**. It is not a product rewrite.

**Do not change** Beginner Studio (`src/beginner-studio/`), the Advanced IDE, `services/`, `vercel.json` or the existing tests. All new work goes in `prototypes/micropython/`. Read `ARCHITECTURE.md` first. It is the source of truth for the kit, jacks and rules.

## The hardware is fixed (do not propose board changes)
- MCU: **classic ESP32, WROOM-32, assume no PSRAM**, 4 MB flash.
- USB-serial: **CP210x (10c4:ea60) or CH340/CH9102 (1a86)**, with the standard DTR/RTS auto-reset circuit. CP210x corrupts data above **115200**, so stay at 115200.
- Jacks: these GPIO numbers may appear **only in `board.py`**.

| Jack | GPIO | Notes |
|---|---|---|
| ST | 12, 13, 14, 27 | Stepper. GPIO 12 is a strapping pin (flash voltage): never pull it HIGH at boot |
| D13 | 33 | Digital. Conflicts with 3D (shared GPIO 33) |
| 3D | SS 32, RST 33, MISO 34; SCK 16, MOSI 23 | RFID RC522 only |
| D5 | Trig 26, Echo 25 | HC-SR04 only. Echo is always INPUT |
| MD | 17, 5, 18, 19 | L293D or 4-ch relay (active-low: drive HIGH at boot) |
| I2C, I2C1 | SDA 21, SCL 22 | Shared bus at **100 kHz** (OLED 0x3C, MAX30102 0x57, MPU6050 0x68/0x69) |
| A1 | 4 | ADC2 |
| A2 | 15 | ADC2, strapping |
| A3 | 2 | ADC2, strapping |
| A4 | 0 | ADC2, **BOOT pin**: never hold LOW at reset |
| UART | RX 3, TX 1 | HC-05. **Same UART0 as USB serial and the REPL** |
| ESP | — | Onboard BLE / WiFi |

- **ADC2 (all A jacks) stops working while WiFi is on.** Cloud locks A1–A4. Cloud and BLE never run together.
- The ADC1-only and S3/C3 pin rules from generic guides **do not apply**. We can't move pins.

## Architecture to prototype
- **Browser:** one HTML file, no framework, libraries pinned to exact versions (esptool-js is fine). It handles the Web Serial transport and the MicroPython raw REPL.
- **Board:** MicroPython plus a `tinkerbit` library. `board.py` is the only file that knows GPIO numbers.
- **Two modes:** Upload (write `main.py`, then soft reset) and Live (one-line commands).
- **Two firmware stages:**
  1. **Stage A, stock MicroPython** (latest stable ESP32_GENERIC) with the library copied to `/lib`. Use it for checks 3, 4 and 5.
  2. **Stage B, custom firmware:** the library frozen in through a manifest, plus a C module for fast ADC sampling and serial safe mode in frozen `_boot.py`. Use it for checks 1 and 2. Build it in Docker (`espressif/idf` image, pinned tag) with a script, `prototypes/micropython/firmware/build.sh`.

## Library (`prototypes/micropython/lib/tinkerbit/`)
- `__init__.py` (public API) and `board.py` (jack → GPIO, ADC2 flag, strapping flag, conflicts).
- `info()` prints exactly one line: `TB_INFO {json}`. The JSON holds board, rev, mcu, lib `VERSION`, `API`, jack count, unique id (`machine.unique_id` hex), MicroPython version, free flash, free heap, reset cause.
- `begin()` is safe to call twice.
- `stop_all()` turns off motors, the buzzer, LEDs and pumps, drives the MD relays HIGH (off), and stops PWM.
- **One cached object per jack**, so `Led('D13')` returns the same instance each time (code inside loops would otherwise leak PWM channels).
- Track which part owns each jack. Raise friendly errors: D13 + 3D together, a digital part on D5, an A jack while WiFi is on ("A ports are off while Cloud/WiFi is on").
- Return friendly units: analog 0–4095 averaged over 12 samples, distance in cm (−1 when invalid), soil 0–100 %.
- Minimum parts for the prototype: LED (on/off/brightness), button, pot (A1), HC-SR04 (D5), DHT11 (built-in `dht`, on A1), OLED text (`ssd1306`), MPU6050 raw `Wire` reads (tilt and shake), HC-05 send/read.
- No bare `except:`. Use `except Exception`.
- Default `main.py`: a short LED blink, `info()`, then exit within 1 s.

## Serial transport (in the test page)
- `requestPort` filtered to the two USB vendor ids, 115200 baud. Use `getPorts()` + the `connect` event to reconnect after a reset without a second picker.
- **Board reset control:** reuse the DTR/RTS sequences in `src/lib/web-serial/web-serial-port.js` and `esptool-flash.js` (read them; copy, don't import).
  - Opening the port must **not** reset the board when that can be avoided. Measure and record whether it does on each USB chip.
  - Hard reset = an EN pulse through RTS.
- Raw REPL:
  - Ctrl-C ×3 (with a timeout) → Ctrl-A → wait for `raw REPL; CTRL-B to exit` → send → Ctrl-D → parse `OK…\x04…\x04>`.
  - Prefer raw-paste mode (Ctrl-E, flow-controlled); fall back to 256-byte chunks with delays.
- Safe file writes: create the folders → `<path>.tmp` → write hex chunks with `bytes.fromhex` → remove the old file → rename. Clean up `.tmp` files on connect.
- **Stop:** Ctrl-C; if that fails within 1 s, hard reset through RTS.
- **Serial safe mode (instead of the BOOT button, because A4 = GPIO 0 may have a part on it):**
  - Frozen `_boot.py` in Stage B (`boot.py` in Stage A) listens for `TB_SAFE\n` for 300 ms after reset. If it arrives, it skips `main.py` and prints `TB_SAFE_OK`.
  - The page's "Recover" button does: hard reset → send `TB_SAFE` repeatedly for 500 ms → wait for `TB_SAFE_OK`.
- Errors: show the last traceback line plus a hint. The "port busy" message names Arduino IDE, Thonny, PuTTY and other TinkerBit tabs. Next to Connect, show "No board listed? Try a data cable". With no Web Serial, show "Use desktop Chrome or Edge".
- **HC-05 mode** (both share UART0):
  - The page shows "Unplug HC-05 before Connect or Upload".
  - Programs that use HC-05 are **Upload-only**. They call `micropython.kbd_intr(-1)` and switch UART0 to 9600.
  - The page monitor switches to 9600 for them.
  - Stop = hard reset, then serial safe mode, then back to 115200.
- Firmware install / recovery with esptool-js at 115200 (reuse the four reset strategies from `esptool-flash.js`). If `TB_INFO` never arrives, offer "Install TinkerBit firmware".

## Cloud check (Stage B only)
- Build a minimal C module around ESP-IDF **esp-mqtt** (TLS with the ISRG Root X1 and X2 roots, a WSS fallback on 443) with the Python API `cloud.begin(ssid, pw, host, device_id, key)`, `cloud.send(dict)`, `cloud.connected()`. Port the reconnect logic from `src/beginner-studio/domain/cloudFirmware.js` (WiFi restart after 3 min, fresh MQTT after 2 min stuck).
- **Credentials:** read from `/config.json` on the board; never put them in `main.py` or in logs.
- Point it at a **test broker** (`test.mosquitto.org:8883`, or a local Mosquitto with TLS), not production `api.tinkerbit.io`, unless I give you a test device.

## The five checks (the deliverable)
Record each result in `prototypes/micropython/RESULTS.md` as **pass/fail with numbers**, saying which board (CP210x or CH340) and which firmware stage.

1. **Memory with Cloud on a WROOM without PSRAM (Stage B):**
   - Free heap (`gc.mem_free()` + `esp.idf_heap_info`) after boot, after WiFi connects, and after the TLS MQTT connection.
   - The connection stays up for 24 h with one send every 5 s, counting reconnects. Pass = at least 30 KB free after connecting and 0 crashes.
2. **Mic sampling rate on GPIO 4 / ADC2 (Stage B C module):**
   - The sustained rate for a 0.5 s capture into an `array('h')`, WiFi off.
   - Pass = at least 8 kHz with jitter under 10%. Also record the rate from pure Python for comparison.
3. **Connecting without a reset, and serial safe mode, on both USB chips:**
   - Does opening the port reset the board? Does safe mode recover a `main.py` running `while True: pass` 10 times out of 10?
4. **HC-05 upload-only mode:**
   - A program sends and reads lines at 9600 through HC-05. Stop recovers 10 times out of 10, and the page returns to 115200.
5. **Upload speed:** times for a 3 KB `main.py` and a 25 KB file (raw-paste vs chunked). Pass = 3 KB in under 1.5 s and 25 KB in under 5 s.

## Testing (required)
- **Simulated board** (`prototypes/micropython/sim/board_sim.py`): CPython speaking the raw REPL protocol.
  - It supports Ctrl-A/B/C/D, raw-paste with flow control, and `OK`/`\x04` framing.
  - Soft reboot runs `boot.py` then `main.py`. It honours `TB_SAFE`.
  - It uses a temp folder as flash and mocks `machine` (Pin, PWM, ADC with an ADC2-locked-by-WiFi flag, I2C, UART, `unique_id`, `reset_cause`), `dht`, `network` and `neopixel`.
  - Ctrl-C interrupts a running loop.
- **Playwright** (headless Chrome) drives the test page with a mocked `navigator.serial` wired to the simulator through a WebSocket bridge. Cover:
  - probe with the library missing → install → `TB_INFO` OK;
  - Run streams output;
  - Upload writes `main.py`, and it runs after reset;
  - Stop breaks an infinite loop;
  - safe mode recovers a stuck `main.py`;
  - jack-conflict and ADC2+WiFi errors show friendly text;
  - Live commands;
  - no `.tmp` files left;
  - no console errors.
- Use `npx playwright` from inside `prototypes/micropython/` with its own `package.json`. Don't add dependencies to the root `package.json`.
- Then I run the hardware checks. Write a step-by-step checklist in `RESULTS.md` for me, and **report clearly what you verified in simulation and what still needs real hardware.**

## Build order
1. `board.py` + library + simulator + unit tests in CPython (pytest).
2. Single-file test page `prototypes/micropython/index.html`: Connect, Install library, Run, Upload, Stop, Recover, console, Live input.
3. Playwright suite against the simulator.
4. Stage B firmware build script + C ADC sampler + frozen library + `_boot.py`.
5. The esp-mqtt Cloud module.
6. `RESULTS.md` with the hardware checklist and empty result tables.

## Don'ts
- No edits outside `prototypes/micropython/` (except adding that path to `.eslintignore` if lint complains).
- No GPIO numbers outside `board.py`.
- No hardware watchdog, eFuse locking, Secure Boot or flash encryption.
- No real WiFi passwords, device keys or production endpoints in code or commits.
- No frameworks in the test page, and no unpinned CDN versions.
- No commits until I review. Show me the diff summary at the end.

## Deliverables
- `prototypes/micropython/` containing: `lib/tinkerbit/`, `boot.py`, `main.py`, `firmware/` (Docker build script, manifest, C modules), `sim/`, `index.html`, Playwright tests, pytest tests, `README.md` (flashing, installing the library, safe mode, recovery) and `RESULTS.md`.
- A final message listing: the test results (simulation), what is still unverified on hardware, and any risk you think already fails on paper.
