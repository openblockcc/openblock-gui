import assert from 'node:assert/strict';
import {test} from 'node:test';

import {evaluateRule, ruleMessage} from '../src/alerts.js';
import {createDeviceCommands, deviceAcls, isBenignError, kickCommands, removeCommands} from '../src/broker/dynsec.js';
import {loadConfig} from '../src/config.js';
import {lttb, pickTier} from '../src/downsample.js';
import {RateLimiter} from '../src/ratelimit.js';
import {DEVICE_ID_RE, TOKEN_RE, hashToken, newDeviceId, newDeviceToken} from '../src/tokens.js';
import {
    cleanText,
    parseAck,
    parseAlertText,
    parseStatus,
    parseTelemetry,
    validateControlValue,
    validateFailsafe,
    validateLayout,
    validateRule
} from '../src/validate.js';

const buf = v => Buffer.from(typeof v === 'string' ? v : JSON.stringify(v));

test('config: production refuses unsafe settings and lists every problem', () => {
    assert.throws(() => loadConfig({NODE_ENV: 'production', AUTH_DISABLED: '1', IOT_BROKER_MODE: 'none'}), err => {
        assert.match(err.message, /AUTH_DISABLED/);
        assert.match(err.message, /IOT_BROKER_MODE=none/);
        return true;
    });
    assert.throws(() => loadConfig({AUTH_SECRET: 'short', IOT_BROKER_MODE: 'none'}), /AUTH_SECRET/);
    assert.throws(() => loadConfig({AUTH_SECRET: 'x'.repeat(40), IOT_BROKER_MODE: 'mosquitto'}), /MQTT_INGEST_USER/);
    const prod = loadConfig({
        NODE_ENV: 'production',
        AUTH_SECRET: 'x'.repeat(40),
        MQTT_INGEST_USER: 'i',
        MQTT_INGEST_PASS: 'p'.repeat(30),
        MQTT_ADMIN_USER: 'a',
        MQTT_ADMIN_PASS: 'q'.repeat(30)
    });
    assert.equal(prod.allowAll, false, 'production allowlist fails closed when unset');
    assert.ok(!prod.allowedOrigins.includes('http://localhost:8601'));
});

test('tokens: formats, uniqueness and hashing', () => {
    const ids = new Set();
    for (let i = 0; i < 500; i++) {
        const id = newDeviceId();
        assert.match(id, DEVICE_ID_RE);
        ids.add(id);
    }
    assert.equal(ids.size, 500);
    const token = newDeviceToken();
    assert.match(token, TOKEN_RE);
    assert.equal(hashToken(token).length, 64);
    assert.notEqual(hashToken(token), hashToken(newDeviceToken()));
});

test('telemetry: accepts numbers/booleans, drops NaN/strings/bad keys, rejects junk', () => {
    const okMsg = parseTelemetry(buf({seq: 3, boot: 'AB12', v: {distance: 34, pressed: true, bad: 'x', 'no-dash': 1, temp: null}}));
    assert.ok(okMsg.ok);
    assert.deepEqual(okMsg.value.values, [['distance', 34], ['pressed', 1]]);
    assert.equal(okMsg.value.dropped, 3);
    assert.equal(okMsg.value.boot, 'ab12');

    assert.equal(parseTelemetry(buf('not json')).error, 'bad_json');
    assert.equal(parseTelemetry(buf([1, 2])).error, 'bad_json');
    assert.equal(parseTelemetry(buf({v: {a: 'x'}})).error, 'no_valid_values');
    assert.equal(parseTelemetry(buf({seq: -1, v: {a: 1}})).error, 'bad_seq');
    assert.equal(parseTelemetry(buf({seq: 1.5, v: {a: 1}})).error, 'bad_seq');
    assert.equal(parseTelemetry(Buffer.alloc(3000, 'a')).error, 'payload_too_large');
    const many = {};
    for (let i = 0; i < 30; i++) {
        many[`k${i}`] = i;
    }
    assert.equal(parseTelemetry(buf({v: many})).error, 'too_many_keys');
    assert.equal(parseTelemetry(buf({v: {switch1: 1}})).error, 'no_valid_values', 'control keys cannot be spoofed as readings');
    assert.equal(parseTelemetry(buf('{"v":{"__proto__":1}}')).error, 'no_valid_values');
    assert.equal(parseTelemetry(buf('{"v":{"a":1e400}}')).error, 'no_valid_values');
    const beat = parseTelemetry(buf({seq: 4, boot: 'ab12', v: {}}));
    assert.ok(beat.ok, 'empty v is a heartbeat');
    assert.deepEqual(beat.value.values, []);
    assert.equal(parseTelemetry(buf({seq: 4})).error, 'bad_values');
});

test('status, ack and alert payloads', () => {
    assert.equal(parseStatus(buf('offline')).value.state, 'offline');
    assert.equal(parseStatus(Buffer.alloc(0)).value.state, 'cleared');
    const online = parseStatus(buf({s: 'online', fw: 'tb-1.0', rssi: -61, boot: 'A1B2', tr: 'wss'})).value;
    assert.deepEqual(online, {state: 'online', fw: 'tb-1.0', rssi: -61, boot: 'a1b2', transport: 'wss'});
    const junk = parseStatus(buf({s: 'online', fw: '<script>', rssi: 50, boot: 'zz', tr: 'tcp'})).value;
    assert.deepEqual(junk, {state: 'online', fw: null, rssi: null, boot: null, transport: null});
    assert.equal(parseStatus(buf({s: 'weird'})).ok, false);

    assert.deepEqual(parseAck(buf({key: 'switch1', ver: 4})).value, {key: 'switch1', ver: 4});
    assert.equal(parseAck(buf({key: 'other', ver: 4})).ok, false);
    assert.equal(parseAck(buf({key: 'switch1', ver: 0})).ok, false);

    assert.equal(parseAlertText(buf('  Water\nlow!\u0007 ')).value, 'Water low!');
    assert.equal(parseAlertText(buf('\n\t')).ok, false);
    assert.equal(Array.from(parseAlertText(buf('🌱'.repeat(200))).value).length, 120);
    assert.equal(cleanText(42, 10), '');
});

test('controls, failsafe, layout and rule validation', () => {
    assert.equal(validateControlValue('switch1', true).value, 1);
    assert.equal(validateControlValue('switch1', 2).ok, false);
    assert.equal(validateControlValue('slider1', 49.6).value, 50);
    assert.equal(validateControlValue('slider1', 101).ok, false);
    assert.equal(validateControlValue('slider1', '5').ok, false);
    assert.equal(validateControlValue('led', 1).ok, false);

    assert.ok(validateFailsafe('switch1', 0, 0).ok, '0 = hold last value');
    assert.equal(validateFailsafe('switch1', 5, 0).ok, false);
    assert.equal(validateFailsafe('switch1', 120, 3).ok, false);

    const layout = validateLayout([
        {id: 'a', type: 'chart', key: 'distance', title: 'D', size: 'L', options: {min: 0, max: 400, unit: 'cm'}},
        {id: 'b', type: 'switch', key: 'switch1'},
        {id: 'c', type: 'status'}
    ], 24);
    assert.ok(layout.ok);
    assert.equal(layout.value[1].size, 'M');
    // Older dashboards (S/M/L only) get a grid span derived from size and type.
    assert.deepEqual([layout.value[0].w, layout.value[0].h], [4, 4], 'wide chart');
    assert.deepEqual([layout.value[1].w, layout.value[1].h], [2, 2]);
    // New dashboards carry w/h, which are clamped and win over size.
    const spanned = validateLayout([
        {id: 'a', type: 'gauge', key: 'x', size: 'L', w: 1, h: 3},
        {id: 'b', type: 'chart', key: 'x', w: 99, h: -4},
        {id: 'c', type: 'value', key: 'x', w: 2.5, h: 2, size: 'M'}
    ], 24);
    assert.ok(spanned.ok);
    assert.deepEqual([spanned.value[0].w, spanned.value[0].h, spanned.value[0].size], [1, 3, 'S']);
    assert.deepEqual([spanned.value[1].w, spanned.value[1].h], [4, 1], 'out-of-range spans are clamped');
    assert.deepEqual([spanned.value[2].w, spanned.value[2].h], [2, 2], 'non-integer span falls back to size');
    assert.equal(validateLayout([{id: 'a', type: 'switch', key: 'slider1'}], 24).error, 'invalid_widget_key');
    assert.equal(validateLayout([{id: 'a', type: 'value', key: 'x'}, {id: 'a', type: 'value', key: 'y'}], 24).error,
        'invalid_widget_id');
    assert.equal(validateLayout([{id: 'a', type: 'gauge', key: 'x', options: {min: 5, max: 5}}], 24).error,
        'invalid_widget_range');
    assert.equal(validateLayout(new Array(25).fill(0)
        .map((_, i) => ({id: `w${i}`, type: 'status'})), 24).error, 'too_many_widgets');
    assert.equal(validateLayout({}, 24).ok, false);

    assert.ok(validateRule({key: 'distance', op: '<', threshold: 10}).ok);
    assert.equal(validateRule({key: 'distance', op: '==', threshold: 10}).error, 'invalid_rule_op');
    assert.equal(validateRule({key: 'distance', op: '<', threshold: NaN}).error, 'invalid_rule_threshold');
    assert.equal(validateRule({key: 'distance', op: '<', threshold: 1, hysteresis: -1}).error, 'invalid_rule_hysteresis');
});

test('alert rules: hysteresis prevents flapping, cooldown prevents spam', () => {
    let rule = {op: '<', threshold: 30, hysteresis: 5, cooldown_sec: 300, active: 0, last_fired: null};
    const step = (value, now) => {
        const r = evaluateRule(rule, value, now);
        rule = Object.assign({}, rule, {active: r.active ? 1 : 0, last_fired: r.lastFired});
        return r;
    };
    assert.equal(step(31, 0).fire, false);
    assert.equal(step(29, 1000).fire, true);
    assert.equal(step(28, 2000).fire, false, 'still active, no repeat');
    assert.equal(step(32, 3000).changed, false, 'inside hysteresis band stays active');
    assert.equal(step(35, 4000).active, false, 'clears at threshold + hysteresis');
    const again = step(20, 5000);
    assert.equal(again.active, true);
    assert.equal(again.fire, false, 'cooldown blocks re-fire');
    step(40, 6000);
    assert.equal(step(10, 400000).fire, true, 'fires again after cooldown');

    const gt = evaluateRule({op: '>=', threshold: 100, hysteresis: 0, cooldown_sec: 0, active: 0, last_fired: null}, 100, 0);
    assert.equal(gt.fire, true);
});

test('downsampling and tier choice', () => {
    const rows = Array.from({length: 2000}, (_, i) => [i * 1000, Math.sin(i / 50) * 10 + (i === 777 ? 500 : 0)]);
    const out = lttb(rows, 200);
    assert.equal(out.length, 200);
    assert.deepEqual(out[0], rows[0]);
    assert.deepEqual(out[199], rows[1999]);
    assert.ok(out.some(r => r[1] > 400), 'spikes survive downsampling');
    assert.equal(lttb(rows.slice(0, 50), 200).length, 50);

    const now = Date.UTC(2026, 0, 10);
    const H = 3600 * 1000;
    assert.equal(pickTier(now - H, now, now), 'raw');
    assert.equal(pickTier(now - (24 * H), now, now), '1m');
    assert.equal(pickTier(now - (60 * 24 * H), now, now), '1h');
});

test('dynsec: device role only covers its own topics; retries are idempotent', () => {
    const id = 'd_abcdefghjk';
    const acls = deviceAcls(id);
    assert.ok(acls.every(a => a.topic.startsWith(`tb/${id}/`)));
    assert.ok(!acls.some(a => a.topic.includes('+') || a.topic === '#'));
    assert.ok(!acls.some(a => a.acltype === 'publishClientSend' && a.topic.includes('/state/')),
        'devices cannot forge dashboard state');
    const [role, clientCmd] = createDeviceCommands(id, 'tbd_secret', 'x'.repeat(80));
    assert.equal(role.command, 'createRole');
    assert.equal(clientCmd.clientid, id, 'client id is pinned');
    assert.equal(clientCmd.textname.length, 40);
    assert.deepEqual(kickCommands(id).map(c => c.command), ['disableClient', 'enableClient']);
    assert.deepEqual(removeCommands(id).map(c => c.command), ['deleteClient', 'deleteRole']);
    assert.ok(isBenignError('createClient', 'Client already exists'));
    assert.ok(isBenignError('deleteRole', 'Role not found'));
    assert.ok(!isBenignError('setClientPassword', 'Client not found'));
});

test('rate limiter refills over time', () => {
    const rl = new RateLimiter(2, 1);
    assert.ok(rl.take('a', 0).allowed);
    assert.ok(rl.take('a', 0).allowed);
    const blocked = rl.take('a', 0);
    assert.equal(blocked.allowed, false);
    assert.equal(blocked.retryAfterSec, 1);
    assert.ok(rl.take('a', 1000).allowed);
    assert.ok(rl.take('b', 0).allowed, 'keys are independent');
});

test('alerts: the default message uses the name Studio gave the reading', () => {
    const rule = {key: 'distance', op: '<', threshold: 10, message: ''};
    assert.equal(ruleMessage(rule, 7, 'Tank', 'Water level'), 'Tank: Water level is 7 (< 10)');
    assert.equal(ruleMessage(rule, 7.123, 'Tank'), 'Tank: distance is 7.12 (< 10)');
    assert.equal(ruleMessage(Object.assign({}, rule, {message: 'Refill!'}), 7, 'Tank', 'Water level'), 'Refill!');
});
