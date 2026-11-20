import assert from 'node:assert/strict';
import {after, before, test} from 'node:test';

import WebSocket from 'ws';

import {ORIGIN, client, sessionCookie, startTestApp, telemetry, testConfig} from './helpers.mjs';

let app;
let alice;
let bob;
let carol;
let anon;

before(async () => {
    const config = testConfig();
    config.limits.maxDevicesPerUser = 3;
    app = await startTestApp({config});
    alice = client(app.base, await sessionCookie('google-alice', 'alice@example.com'));
    bob = client(app.base, await sessionCookie('google-bob', 'bob@example.com'));
    carol = client(app.base, await sessionCookie('google-carol', 'carol@example.com'));
    anon = client(app.base, null);
});

after(async () => {
    await app.stop();
});

test('health endpoints', async () => {
    const res = await fetch(`${app.base}/iot/v1/healthz`);
    assert.equal(res.status, 200);
    const ready = await (await fetch(`${app.base}/readyz`)).json();
    assert.equal(ready.ok, true);
});

test('auth: missing or forged session is 401', async () => {
    assert.equal((await anon.get('/devices')).status, 401);
    const forged = client(app.base, 'tb_session=eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ4In0.bad');
    assert.equal((await forged.get('/devices')).status, 401);
});

test('pilot allowlist: outsiders can read /config but nothing else', async () => {
    const cfg = await carol.get('/config');
    assert.equal(cfg.status, 200);
    assert.equal(cfg.body.allowed, false);
    assert.equal((await carol.get('/devices')).status, 403);
    assert.equal((await carol.get('/devices')).body.error, 'not_in_pilot');
    const ok = await alice.get('/config');
    assert.equal(ok.body.allowed, true);
    assert.equal(ok.body.broker.mqttsPort, 8883);
});

test('CSRF: mutating requests need an allowed Origin and JSON', async () => {
    assert.equal((await alice.post('/devices', {name: 'x'}, {origin: 'https://evil.example'})).status, 403);
    assert.equal((await alice.post('/devices', {name: 'x'}, {origin: ''})).status, 403);
    assert.equal((await alice.raw('POST', '/devices', 'name=x', {'content-type': 'application/x-www-form-urlencoded'})).status, 415);
    assert.equal((await alice.raw('POST', '/devices', '{bad json', {})).status, 400);
    assert.equal((await alice.raw('POST', '/devices', JSON.stringify({name: 'x'.repeat(70000)}), {})).status, 413);
});

let deviceId;

test('create device returns the token once and enforces limits', async () => {
    assert.equal((await alice.post('/devices', {name: '   '})).body.error, 'invalid_name');
    const res = await alice.post('/devices', {name: '  Garden\u0000 Lamp  '});
    assert.equal(res.status, 201);
    assert.match(res.body.token, /^tbd_/);
    assert.equal(res.body.device.name, 'Garden Lamp');
    assert.equal(res.body.device.status, 'never');
    deviceId = res.body.device.id;
    const list = await alice.get('/devices');
    assert.equal(list.body.devices.length, 1);
    assert.equal(JSON.stringify(list.body).includes(res.body.token), false, 'token never listed');
    assert.equal(JSON.stringify(list.body).includes('token_hash'), false);
    await alice.post('/devices', {name: 'b'});
    await alice.post('/devices', {name: 'c'});
    const limited = await alice.post('/devices', {name: 'd'});
    assert.equal(limited.status, 409);
    assert.equal(limited.body.error, 'device_limit');
});

test('IDOR: another user gets 404 for every device route', async () => {
    const paths = [
        ['get', `/devices/${deviceId}`],
        ['patch', `/devices/${deviceId}`, {name: 'pwn'}],
        ['del', `/devices/${deviceId}`, {}],
        ['post', `/devices/${deviceId}/token`, {}],
        ['put', `/devices/${deviceId}/controls/switch1`, {value: 1, expectedVersion: 1}],
        ['get', `/devices/${deviceId}/history?key=distance`],
        ['put', `/devices/${deviceId}/dashboard`, {layout: [], expectedVersion: 1}],
        ['post', `/devices/${deviceId}/rules`, {key: 'a', op: '<', threshold: 1}]
    ];
    for (const [method, path, body] of paths) {
        const res = await bob[method](path, body);
        assert.equal(res.status, 404, `${method} ${path}`);
    }
    assert.equal((await bob.get(`/alerts?device=${deviceId}`)).status, 404);
    assert.equal((await alice.get('/devices/not-an-id')).status, 404);
});

test('controls: publish retained, 409 on stale version, validation', async () => {
    app.broker.published = [];
    const res = await alice.put(`/devices/${deviceId}/controls/switch1`, {value: true, expectedVersion: 1});
    assert.equal(res.status, 200);
    assert.equal(res.body.control.value, 1);
    assert.equal(res.body.delivered, true);
    const pub = app.broker.published.find(p => p.topic === `tb/${deviceId}/state/switch1`);
    assert.equal(pub.retain, true);
    const stale = await alice.put(`/devices/${deviceId}/controls/switch1`, {value: 0, expectedVersion: 1});
    assert.equal(stale.status, 409);
    assert.equal(stale.body.control.version, 2);
    assert.equal((await alice.put(`/devices/${deviceId}/controls/switch1`, {value: 5, expectedVersion: 2})).status, 400);
    assert.equal((await alice.put(`/devices/${deviceId}/controls/relay`, {value: 1, expectedVersion: 1})).status, 404);
    assert.equal((await alice.put(`/devices/${deviceId}/controls/switch1`, {value: 1})).body.error, 'expected_version_required');
    const fs = await alice.put(`/devices/${deviceId}/controls/switch1`, {failsafeSec: 0, expectedVersion: 2});
    assert.equal(fs.body.control.failsafeSec, 0);
});

test('history picks a tier, validates ranges and downsamples', async () => {
    const t0 = Date.now() - 30 * 60 * 1000;
    const insert = app.repo.db.prepare('INSERT INTO readings_raw (device_id, key, ts, value) VALUES (?, ?, ?, ?)');
    for (let i = 0; i < 900; i++) {
        insert.run(deviceId, 'distance', t0 + (i * 2000), i % 50);
    }
    const res = await alice.get(`/devices/${deviceId}/history?key=distance&from=${t0}&points=100`);
    assert.equal(res.status, 200);
    assert.equal(res.body.tier, 'raw');
    assert.equal(res.body.points.length, 100);
    const day = await alice.get(`/devices/${deviceId}/history?key=distance&from=${Date.now() - 86400000}`);
    assert.equal(day.body.tier, '1m');
    assert.ok(day.body.points.length > 0, 'un-rolled minutes are included');
    assert.equal((await alice.get(`/devices/${deviceId}/history?key=bad-key`)).status, 400);
    assert.equal((await alice.get(`/devices/${deviceId}/history?key=a&from=10&to=5`)).status, 400);
    assert.equal((await alice.get(`/devices/${deviceId}/history?key=a&points=5000`)).status, 400);
});

test('dashboard: suggestion uses titles given for its own keys only', async () => {
    const sug = await alice.post(`/devices/${deviceId}/dashboard/suggest`, {
        keys: ['distance', 'magnetNear'],
        controls: ['switch1'],
        titles: {distance: '  HC-SR04 Ultrasonic ', switch1: 'Dashboard switch 1', other: 'Ignored', magnetNear: 42}
    });
    const byId = Object.fromEntries(sug.body.dashboard.layout.map(w => [w.id, w.title]));
    assert.equal(byId.v_0, 'HC-SR04 Ultrasonic');
    assert.equal(byId.chart_0, 'HC-SR04 Ultrasonic');
    assert.equal(byId.v_1, 'Magnet near', 'a non-text title falls back to the key, made readable');
    assert.equal(byId.c_switch1, 'Dashboard switch 1');
    const odd = await alice.post(`/devices/${deviceId}/dashboard/suggest`, {keys: ['distance'], controls: [], titles: ['x']});
    assert.equal(odd.status, 200);
    assert.equal(odd.body.dashboard.layout.find(w => w.id === 'v_0').title, 'Distance', 'a list is not a titles map');
});

test('dashboard: suggestion only replaces the default; edits are versioned', async () => {
    const sug = await alice.post(`/devices/${deviceId}/dashboard/suggest`, {keys: ['distance', 'bad key'], controls: ['switch1', 'x']});
    assert.equal(sug.body.applied, true);
    assert.ok(sug.body.dashboard.layout.some(w => w.type === 'chart' && w.key === 'distance'));
    assert.ok(sug.body.dashboard.layout.some(w => w.type === 'switch' && w.key === 'switch1'));
    const v = sug.body.dashboard.version;
    const saved = await alice.put(`/devices/${deviceId}/dashboard`, {
        layout: [{id: 'a', type: 'gauge', key: 'distance', options: {min: 0, max: 100}}],
        expectedVersion: v
    });
    assert.equal(saved.status, 200);
    const conflict = await alice.put(`/devices/${deviceId}/dashboard`, {layout: [], expectedVersion: v});
    assert.equal(conflict.status, 409);
    const again = await alice.post(`/devices/${deviceId}/dashboard/suggest`, {keys: ['x'], controls: []});
    assert.equal(again.body.applied, false, 'never overwrite a hand-made dashboard');
    assert.equal((await alice.put(`/devices/${deviceId}/dashboard`, {layout: [{id: 'a', type: 'nope'}], expectedVersion: v + 1})).status, 400);
});

test('rules CRUD with limits', async () => {
    const created = await alice.post(`/devices/${deviceId}/rules`, {key: 'distance', op: '<', threshold: 10, message: 'Too close'});
    assert.equal(created.status, 201);
    const id = created.body.rule.id;
    const patched = await alice.patch(`/devices/${deviceId}/rules/${id}`, {threshold: 20, enabled: false});
    assert.equal(patched.body.rule.threshold, 20);
    assert.equal(patched.body.rule.enabled, false);
    assert.equal((await alice.patch(`/devices/${deviceId}/rules/${id}`, {op: '!'})).status, 400);
    assert.equal((await alice.del(`/devices/${deviceId}/rules/${id}`, {})).status, 200);
    assert.equal((await alice.del(`/devices/${deviceId}/rules/${id}`, {})).status, 404);
    for (let i = 0; i < 10; i++) {
        await alice.post(`/devices/${deviceId}/rules`, {key: 'distance', op: '>', threshold: i});
    }
    assert.equal((await alice.post(`/devices/${deviceId}/rules`, {key: 'distance', op: '>', threshold: 99})).body.error, 'rule_limit');
});

test('alerts list, pagination and mark-read are owner scoped', async () => {
    const device = app.repo.getDevice(deviceId);
    for (let i = 0; i < 5; i++) {
        app.cloud.raiseAlert(device, {kind: 'device', message: `a${i}`});
    }
    const page = await alice.get('/alerts?limit=3');
    assert.equal(page.body.alerts.length, 3);
    assert.ok(page.body.nextBefore);
    const next = await alice.get(`/alerts?limit=3&before=${page.body.nextBefore}`);
    assert.equal(next.body.alerts.length, 2);
    assert.equal(page.body.unread, 5);
    await bob.post('/alerts/read', {upToId: 1000000});
    assert.equal((await alice.get('/alerts')).body.unread, 5, "bob cannot mark alice's alerts");
    await alice.post('/alerts/read', {upToId: page.body.alerts[0].id});
    assert.equal((await alice.get('/alerts')).body.unread, 0);
});

test('live: single-use ticket, origin check, owner-only events', async () => {
    const ticketRes = await alice.post('/live/ticket', {});
    const {ticket} = ticketRes.body;
    const url = `ws://127.0.0.1:${app.port}/iot/v1/live?ticket=${ticket}`;
    const ws = new WebSocket(url, {headers: {origin: ORIGIN}});
    const messages = [];
    await new Promise((resolve, reject) => {
        ws.on('message', m => {
            messages.push(JSON.parse(String(m)));
            if (messages.length === 1) {
                resolve();
            }
        });
        ws.on('error', reject);
    });
    app.cloud.handleMessage(`tb/${deviceId}/telemetry`, telemetry({distance: 42}, 7), false);
    await new Promise(r => setTimeout(r, 50));
    assert.ok(messages.some(m => m.type === 'reading' && m.v.distance === 42));

    const reuse = new WebSocket(url, {headers: {origin: ORIGIN}});
    const code = await new Promise(resolve => reuse.on('unexpected-response', (req, res) => resolve(res.statusCode)));
    assert.equal(code, 401, 'tickets are single-use');

    const t2 = (await alice.post('/live/ticket', {})).body.ticket;
    const evil = new WebSocket(`ws://127.0.0.1:${app.port}/iot/v1/live?ticket=${t2}`, {headers: {origin: 'https://evil.example'}});
    const code2 = await new Promise(resolve => evil.on('unexpected-response', (req, res) => resolve(res.statusCode)));
    assert.equal(code2, 403);
    ws.close();
});

test('token regeneration changes the broker password and kicks the old session', async () => {
    const before = app.repo.getDevice(deviceId).token_hash;
    const res = await alice.post(`/devices/${deviceId}/token`, {});
    assert.match(res.body.token, /^tbd_/);
    assert.notEqual(app.repo.getDevice(deviceId).token_hash, before);
    assert.ok(app.broker.callsOf('setPassword').length >= 1);
    assert.ok(app.broker.callsOf('kick').length >= 1);
    app.broker.fail = true;
    assert.equal((await alice.post(`/devices/${deviceId}/token`, {})).status, 503);
    app.broker.fail = false;
});

test('rate limiting returns 429 with Retry-After', async () => {
    let last;
    for (let i = 0; i < 25; i++) {
        last = await alice.put(`/devices/${deviceId}/controls/slider2`, {value: 1, expectedVersion: 999});
        if (last.status === 429) {
            break;
        }
    }
    assert.equal(last.status, 429);
    assert.ok(Number(last.headers.get('retry-after')) >= 1);
});

test('export and delete-my-data remove everything the user owns', async () => {
    const exported = await bob.get('/me/export');
    assert.equal(exported.status, 200);
    await bob.post('/devices', {name: 'Bob board'});
    assert.equal((await bob.del('/me/data', {})).body.error, 'confirmation_required');
    const del = await bob.del('/me/data', {confirm: 'DELETE'});
    assert.equal(del.status, 200);
    assert.equal(app.repo.listAllDevices('google-bob').length, 0);
    assert.ok(app.broker.callsOf('remove').length >= 1);
    assert.equal((await alice.get(`/devices/${deviceId}`)).status, 200, "alice's data untouched");
});

test('unknown routes and methods', async () => {
    assert.equal((await alice.get('/nope')).status, 404);
    assert.equal((await alice.raw('PUT', '/devices', {})).status, 405);
    assert.equal((await fetch(`${app.base}/other`)).status, 404);
});
