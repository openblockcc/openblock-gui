/**
 * Every value that crosses a trust boundary (device payloads, browser JSON) is checked here.
 * Validators return {ok: true, value} or {ok: false, error}.
 */

export const READING_KEY_RE = /^[a-zA-Z][a-zA-Z0-9_]{0,31}$/;
export const MAX_READING_KEYS = 24;
export const MAX_PAYLOAD_BYTES = 2048;
export const ALERT_MAX_CHARS = 120;

export const CONTROL_KEYS = Object.freeze({
    switch1: {kind: 'switch', min: 0, max: 1},
    switch2: {kind: 'switch', min: 0, max: 1},
    switch3: {kind: 'switch', min: 0, max: 1},
    switch4: {kind: 'switch', min: 0, max: 1},
    slider1: {kind: 'slider', min: 0, max: 100},
    slider2: {kind: 'slider', min: 0, max: 100}
});

export const WIDGET_TYPES = ['value', 'gauge', 'chart', 'switch', 'slider', 'status', 'alerts'];
export const WIDGET_SIZES = ['S', 'M', 'L'];
export const RULE_OPS = ['<', '<=', '>', '>='];

const ok = value => ({ok: true, value});
const fail = error => ({ok: false, error});

// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u001f\u007f-\u009f\u2028\u2029]/g;

export function cleanText (value, maxChars) {
    if (typeof value !== 'string') {
        return '';
    }
    const text = value.replace(CONTROL_CHARS, ' ').replace(/\s+/g, ' ')
        .trim();
    return Array.from(text).slice(0, maxChars)
        .join('');
}

const parseJsonObject = payload => {
    if (!payload || payload.length === 0) {
        return null;
    }
    if (payload.length > MAX_PAYLOAD_BYTES) {
        return null;
    }
    try {
        const parsed = JSON.parse(payload.toString('utf8'));
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
    } catch (err) {
        return null;
    }
};

const toFiniteNumber = value => {
    if (typeof value === 'boolean') {
        return value ? 1 : 0;
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }
    return null;
};

/**
 * Device telemetry: {"seq":12,"v":{"distance":34,"heartRate":72}}
 * Non-finite or non-numeric values are dropped and counted, never stored.
 * An empty "v" is a heartbeat from a board with nothing to measure: valid, zero values.
 */
export function parseTelemetry (payload) {
    if (payload && payload.length > MAX_PAYLOAD_BYTES) {
        return fail('payload_too_large');
    }
    const body = parseJsonObject(payload);
    if (!body) {
        return fail('bad_json');
    }
    const seq = body.seq === undefined ? null : body.seq;
    if (seq !== null && (!Number.isInteger(seq) || seq < 0 || seq > 2147483647)) {
        return fail('bad_seq');
    }
    const boot = typeof body.boot === 'string' && /^[0-9a-f]{1,16}$/i.test(body.boot) ? body.boot.toLowerCase() : null;
    const v = body.v;
    if (!v || typeof v !== 'object' || Array.isArray(v)) {
        return fail('bad_values');
    }
    const keys = Object.keys(v);
    if (keys.length > MAX_READING_KEYS) {
        return fail('too_many_keys');
    }
    if (!keys.length) {
        return ok({seq, boot, values: [], dropped: 0});
    }
    const values = [];
    let dropped = 0;
    keys.forEach(key => {
        if (!READING_KEY_RE.test(key) || CONTROL_KEYS[key]) {
            dropped++;
            return;
        }
        const n = toFiniteNumber(v[key]);
        if (n === null || Math.abs(n) > 1e12) {
            dropped++;
            return;
        }
        values.push([key, n]);
    });
    if (!values.length) {
        return fail(dropped ? 'no_valid_values' : 'empty');
    }
    return ok({seq, boot, values, dropped});
}

/** Status: the retained LWT "offline", or {"s":"online","fw":"..","rssi":-61,"boot":"a1b2","tr":"mqtts"}. */
export function parseStatus (payload) {
    if (!payload || payload.length === 0) {
        return ok({state: 'cleared'});
    }
    const text = payload.toString('utf8').trim();
    if (text === 'offline') {
        return ok({state: 'offline'});
    }
    if (text === 'online') {
        return ok({state: 'online', fw: null, rssi: null, boot: null, transport: null});
    }
    const body = parseJsonObject(payload);
    if (!body || (body.s !== 'online' && body.s !== 'offline')) {
        return fail('bad_status');
    }
    if (body.s === 'offline') {
        return ok({state: 'offline'});
    }
    const fw = typeof body.fw === 'string' && /^[\w.\-+]{1,24}$/.test(body.fw) ? body.fw : null;
    const rssi = Number.isInteger(body.rssi) && body.rssi >= -127 && body.rssi <= 0 ? body.rssi : null;
    const boot = typeof body.boot === 'string' && /^[0-9a-f]{1,16}$/i.test(body.boot) ? body.boot.toLowerCase() : null;
    const transport = body.tr === 'mqtts' || body.tr === 'wss' ? body.tr : null;
    return ok({state: 'online', fw, rssi, boot, transport});
}

/** Ack: {"key":"switch1","ver":17} */
export function parseAck (payload) {
    const body = parseJsonObject(payload);
    if (!body || !CONTROL_KEYS[body.key] || !Number.isInteger(body.ver) || body.ver < 1) {
        return fail('bad_ack');
    }
    return ok({key: body.key, ver: body.ver});
}

export function parseAlertText (payload) {
    if (!payload || payload.length === 0 || payload.length > 1024) {
        return fail('bad_alert');
    }
    const text = cleanText(payload.toString('utf8'), ALERT_MAX_CHARS);
    return text ? ok(text) : fail('bad_alert');
}

export const MAX_LABELS = 32;
export const LABEL_MAX_CHARS = 40;

/**
 * Names for readings and controls, e.g. {switch1: 'Pump', distance: 'Water level'}.
 * Blank names are dropped; the whole set replaces the old one.
 */
export function validateLabels (value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return fail('invalid_labels');
    }
    const keys = Object.keys(value);
    if (keys.length > MAX_LABELS) {
        return fail('too_many_labels');
    }
    const labels = {};
    for (const key of keys) {
        if (!READING_KEY_RE.test(key)) {
            return fail('invalid_labels');
        }
        const label = cleanText(value[key], LABEL_MAX_CHARS);
        if (label) {
            labels[key] = label;
        }
    }
    return ok(labels);
}

export function validateDeviceName (value) {
    const name = cleanText(value, 40);
    return name ? ok(name) : fail('invalid_name');
}

export function validateInterval (value, limits) {
    if (!Number.isInteger(value) || value < limits.minIntervalSec || value > limits.maxIntervalSec) {
        return fail('invalid_interval');
    }
    return ok(value);
}

/** Dashboard control write: switches take 0/1 (or booleans), sliders integers 0-100. */
export function validateControlValue (key, value) {
    const spec = CONTROL_KEYS[key];
    if (!spec) {
        return fail('unknown_control');
    }
    let n = typeof value === 'boolean' ? (value ? 1 : 0) : value;
    if (typeof n !== 'number' || !Number.isFinite(n)) {
        return fail('invalid_value');
    }
    n = Math.round(n);
    if (n < spec.min || n > spec.max) {
        return fail('invalid_value');
    }
    return ok(n);
}

export function validateFailsafe (key, sec, value) {
    const spec = CONTROL_KEYS[key];
    if (!spec) {
        return fail('unknown_control');
    }
    if (!Number.isInteger(sec) || (sec !== 0 && (sec < 10 || sec > 3600))) {
        return fail('invalid_failsafe_sec');
    }
    const v = validateControlValue(key, value);
    if (!v.ok) {
        return fail('invalid_failsafe_value');
    }
    return ok({sec, value: v.value});
}

const validWidgetKey = (type, key) => {
    if (type === 'alerts' || type === 'status') {
        return key === null || key === undefined || key === '';
    }
    if (type === 'switch') {
        return Boolean(CONTROL_KEYS[key]) && CONTROL_KEYS[key].kind === 'switch';
    }
    if (type === 'slider') {
        return Boolean(CONTROL_KEYS[key]) && CONTROL_KEYS[key].kind === 'slider';
    }
    return typeof key === 'string' && READING_KEY_RE.test(key);
};

export const GRID_MAX_COLS = 4;
export const GRID_MAX_ROWS = 6;
const SIZE_COLS = {S: 1, M: 2, L: 4};
const DEFAULT_ROWS = {value: 2, gauge: 3, chart: 4, switch: 2, slider: 2, status: 2, alerts: 3};

/** Grid span for a widget that only has the old S/M/L size. Mirrors src/iot/grid.js. */
export const defaultSpan = (type, size) => ({w: SIZE_COLS[size] || 2, h: DEFAULT_ROWS[type] || 2});

const sizeFromCols = cols => (cols <= 1 ? 'S' : (cols === 2 ? 'M' : 'L'));
const clampInt = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

export function validateLayout (layout, maxWidgets) {
    if (!Array.isArray(layout)) {
        return fail('invalid_layout');
    }
    if (layout.length > maxWidgets) {
        return fail('too_many_widgets');
    }
    if (JSON.stringify(layout).length > 16 * 1024) {
        return fail('layout_too_large');
    }
    const ids = new Set();
    const out = [];
    for (const w of layout) {
        if (!w || typeof w !== 'object') {
            return fail('invalid_widget');
        }
        if (typeof w.id !== 'string' || !/^[a-zA-Z0-9_-]{1,16}$/.test(w.id) || ids.has(w.id)) {
            return fail('invalid_widget_id');
        }
        ids.add(w.id);
        if (!WIDGET_TYPES.includes(w.type)) {
            return fail('invalid_widget_type');
        }
        if (!validWidgetKey(w.type, w.key)) {
            return fail('invalid_widget_key');
        }
        // w/h are the grid span (columns x rows). Older dashboards only have S/M/L; derive the span.
        const legacySize = WIDGET_SIZES.includes(w.size) ? w.size : 'M';
        const hasSpan = Number.isInteger(w.w) && Number.isInteger(w.h);
        const span = hasSpan ?
            {w: clampInt(w.w, 1, GRID_MAX_COLS), h: clampInt(w.h, 1, GRID_MAX_ROWS)} :
            defaultSpan(w.type, legacySize);
        const size = hasSpan ? sizeFromCols(span.w) : legacySize;
        const opts = w.options && typeof w.options === 'object' ? w.options : {};
        const num = v => (typeof v === 'number' && Number.isFinite(v) ? v : null);
        const min = num(opts.min);
        const max = num(opts.max);
        if (min !== null && max !== null && min >= max) {
            return fail('invalid_widget_range');
        }
        out.push({
            id: w.id,
            type: w.type,
            key: w.key || null,
            title: cleanText(w.title || '', 40),
            size,
            w: span.w,
            h: span.h,
            options: {min, max, unit: cleanText(opts.unit || '', 8)}
        });
    }
    return ok(out);
}

export function validateRule (input) {
    if (!input || typeof input !== 'object') {
        return fail('invalid_rule');
    }
    if (typeof input.key !== 'string' || !READING_KEY_RE.test(input.key)) {
        return fail('invalid_rule_key');
    }
    if (!RULE_OPS.includes(input.op)) {
        return fail('invalid_rule_op');
    }
    if (typeof input.threshold !== 'number' || !Number.isFinite(input.threshold)) {
        return fail('invalid_rule_threshold');
    }
    const hysteresis = input.hysteresis === undefined ? 0 : input.hysteresis;
    if (typeof hysteresis !== 'number' || !Number.isFinite(hysteresis) || hysteresis < 0 || hysteresis > 1e6) {
        return fail('invalid_rule_hysteresis');
    }
    const cooldown = input.cooldownSec === undefined ? 300 : input.cooldownSec;
    if (!Number.isInteger(cooldown) || cooldown < 0 || cooldown > 86400) {
        return fail('invalid_rule_cooldown');
    }
    return ok({
        key: input.key,
        op: input.op,
        threshold: input.threshold,
        hysteresis,
        cooldownSec: cooldown,
        message: cleanText(input.message || '', ALERT_MAX_CHARS),
        enabled: input.enabled !== false
    });
}
