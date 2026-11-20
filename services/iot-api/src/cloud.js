import {evaluateRule, ruleMessage} from './alerts.js';
import {log} from './log.js';
import {effectiveStatus, parseLabels, serializeAlert, serializeControl, serializeDevice} from './repo.js';
import {DEVICE_ID_RE, hashToken, newDeviceId, newDeviceToken, tokenPrefix} from './tokens.js';
import {
    CONTROL_KEYS,
    parseAck,
    parseAlertText,
    parseStatus,
    parseTelemetry,
    validateControlValue,
    validateFailsafe
} from './validate.js';

const TOPIC_RE = /^tb\/(d_[a-z2-9]{10})\/(telemetry|status|ack|alert)$/;
const DAY = 24 * 3600 * 1000;
const FLOOD_WINDOW_MS = 10 * 60 * 1000;
const FLOOD_DROP_LIMIT = 120;
const DEVICE_ALERTS_PER_HOUR = 20;
const DEVICE_ALERT_DEDUPE_MS = 5 * 60 * 1000;
const WARNING_CLEAR_MS = 60 * 60 * 1000;

export class HttpError extends Error {
    constructor (status, code, extra) {
        super(code);
        this.status = status;
        this.code = code;
        this.extra = extra || {};
    }
}

export const stateTopic = (id, key) => `tb/${id}/state/${key}`;
export const statusTopic = id => `tb/${id}/status`;

export function statePayload (control) {
    return JSON.stringify({
        v: control.value,
        ver: control.version,
        fs: control.failsafe_sec,
        fv: control.failsafe_value
    });
}

/**
 * Business logic shared by the HTTP API, the MQTT ingest and the background jobs.
 * broker: {isConnected(), publish(topic, payload, {retain, qos}), admin: {...}} (see broker/*.js)
 * live:   {publish(sub, event)}
 */
export class Cloud {
    constructor ({config, repo, broker, live, now}) {
        this.config = config;
        this.repo = repo;
        this.broker = broker;
        this.live = live;
        this.now = now || Date.now;
        this.throttle = new Map();
        this.stats = {accepted: 0, dropped: 0, rejected: 0, duplicates: 0};
    }

    // ---- device management (HTTP) --------------------------------------------

    async createDevice (user, name) {
        const now = this.now();
        const {limits} = this.config;
        if (this.repo.countActiveDevices(user.sub) >= limits.maxDevicesPerUser) {
            throw new HttpError(409, 'device_limit', {limit: limits.maxDevicesPerUser});
        }
        if (this.repo.countAudit(user.sub, 'device.create', now - DAY) >= limits.maxCreatesPerDay) {
            throw new HttpError(429, 'create_limit', {limit: limits.maxCreatesPerDay});
        }
        let id = newDeviceId();
        while (this.repo.getDevice(id)) {
            id = newDeviceId();
        }
        const token = newDeviceToken();
        try {
            await this.broker.admin.createDevice(id, token, name);
        } catch (err) {
            log.error('device.create.broker_failed', {deviceId: id, err});
            throw new HttpError(503, 'broker_unavailable');
        }
        try {
            this.repo.insertDevice({
                id,
                ownerSub: user.sub,
                name,
                tokenHash: hashToken(token),
                tokenPrefix: tokenPrefix(token),
                intervalSec: limits.defaultIntervalSec,
                now
            });
        } catch (err) {
            await this.broker.admin.remove(id).catch(e => log.error('device.create.rollback_failed', {deviceId: id, err: e}));
            throw err;
        }
        this.repo.audit(user.sub, 'device.create', id, now);
        this.repo.listControls(id).forEach(c => this.publishControl(id, c));
        log.info('device.created', {deviceId: id, sub: user.sub});
        return {device: serializeDevice(this.repo.getDevice(id), now), token};
    }

    async regenerateToken (user, device) {
        const token = newDeviceToken();
        try {
            await this.broker.admin.setPassword(device.id, token);
        } catch (err) {
            log.error('device.token.broker_failed', {deviceId: device.id, err});
            throw new HttpError(503, 'broker_unavailable');
        }
        this.repo.setToken(device.id, hashToken(token), tokenPrefix(token));
        this.repo.audit(user.sub, 'device.token', device.id, this.now());
        try {
            await this.broker.admin.kick(device.id);
        } catch (err) {
            // Password already changed: the old board fails at its next reconnect.
            log.warn('device.token.kick_failed', {deviceId: device.id});
        }
        return {token, tokenPrefix: tokenPrefix(token)};
    }

    async deleteDevice (user, device) {
        const now = this.now();
        let pending = null;
        try {
            await this.broker.admin.disable(device.id);
            await this.clearRetained(device.id);
        } catch (err) {
            pending = 'disable';
            log.warn('device.delete.broker_pending', {deviceId: device.id});
        }
        this.repo.softDeleteDevice(device.id, now, pending);
        this.throttle.delete(device.id);
        this.repo.audit(user.sub, 'device.delete', device.id, now);
        this.live.publish(user.sub, {type: 'device', deviceId: device.id, change: 'deleted'});
    }

    async enableDevice (user, device) {
        if (device.status !== 'disabled') {
            return;
        }
        try {
            await this.broker.admin.enable(device.id);
        } catch (err) {
            throw new HttpError(503, 'broker_unavailable');
        }
        this.repo.enableDevice(device.id);
        this.throttle.delete(device.id);
        this.repo.audit(user.sub, 'device.enable', device.id, this.now());
    }

    async setControl (user, device, key, input) {
        if (!CONTROL_KEYS[key]) {
            throw new HttpError(404, 'unknown_control');
        }
        const current = this.repo.getControl(device.id, key);
        if (!current) {
            throw new HttpError(404, 'unknown_control');
        }
        const value = input.value === undefined ? {ok: true, value: current.value} : validateControlValue(key, input.value);
        if (!value.ok) {
            throw new HttpError(400, value.error);
        }
        const fs = validateFailsafe(
            key,
            input.failsafeSec === undefined ? current.failsafe_sec : input.failsafeSec,
            input.failsafeValue === undefined ? current.failsafe_value : input.failsafeValue
        );
        if (!fs.ok) {
            throw new HttpError(400, fs.error);
        }
        if (!Number.isInteger(input.expectedVersion)) {
            throw new HttpError(400, 'expected_version_required');
        }
        const result = this.repo.updateControl(device.id, key, {
            value: value.value,
            failsafeSec: fs.value.sec,
            failsafeValue: fs.value.value,
            by: user.email || user.sub,
            now: this.now()
        }, input.expectedVersion);
        if (result.conflict) {
            throw new HttpError(409, 'version_conflict', {control: serializeControl(result.control)});
        }
        const delivered = await this.publishControl(device.id, result.control);
        const control = serializeControl(result.control);
        this.live.publish(device.owner_sub, {type: 'control', deviceId: device.id, control});
        return {control, delivered};
    }

    /** Retained QoS 1, so an offline board receives the latest value when it reconnects. */
    async publishControl (deviceId, control) {
        if (!this.broker.isConnected()) {
            return false;
        }
        try {
            await this.broker.publish(stateTopic(deviceId, control.key), statePayload(control), {retain: true, qos: 1});
            return true;
        } catch (err) {
            log.warn('control.publish_failed', {deviceId, key: control.key});
            return false;
        }
    }

    async clearRetained (deviceId) {
        const topics = Object.keys(CONTROL_KEYS).map(k => stateTopic(deviceId, k))
            .concat([statusTopic(deviceId)]);
        for (const topic of topics) {
            await this.broker.publish(topic, '', {retain: true, qos: 1});
        }
    }

    /**
     * After every (re)connect to the broker, re-assert retained state from the database.
     * Covers a broker restored from an old backup or one that lost its persistence file.
     */
    async republishAll () {
        const controls = this.repo.allLiveControls();
        for (const c of controls) {
            await this.publishControl(c.device_id, c);
        }
        log.info('controls.republished', {count: controls.length});
    }

    // ---- ingest (MQTT) --------------------------------------------------------

    handleMessage (topic, payload, retained) {
        const m = TOPIC_RE.exec(topic);
        if (!m) {
            return;
        }
        const [, deviceId, kind] = m;
        if (!DEVICE_ID_RE.test(deviceId)) {
            return;
        }
        try {
            const device = this.repo.getDevice(deviceId);
            if (!device || device.deleted_at || device.status === 'disabled') {
                this.stats.rejected++;
                return;
            }
            if (kind === 'telemetry') {
                this.onTelemetry(device, payload);
            } else if (kind === 'status') {
                this.onStatus(device, payload, retained);
            } else if (kind === 'ack') {
                this.onAck(device, payload);
            } else if (kind === 'alert') {
                this.onDeviceAlert(device, payload);
            }
        } catch (err) {
            log.error('ingest.failed', {deviceId, kind, err});
        }
    }

    /**
     * Throttle: messages faster than the minimum interval (20% jitter allowed) are dropped.
     * Sustained flooding disables the broker account and raises an alert.
     */
    allowTelemetry (device, now) {
        let t = this.throttle.get(device.id);
        if (!t) {
            t = {last: 0, drops: 0, windowStart: now};
            this.throttle.set(device.id, t);
        }
        if (now - t.windowStart > FLOOD_WINDOW_MS) {
            t.windowStart = now;
            t.drops = 0;
        }
        const minGap = this.config.limits.minIntervalSec * 1000 * 0.8;
        if (now - t.last >= minGap) {
            t.last = now;
            return 'ok';
        }
        t.drops++;
        this.stats.dropped++;
        return t.drops >= FLOOD_DROP_LIMIT ? 'flood' : 'drop';
    }

    onTelemetry (device, payload) {
        const now = this.now();
        const parsed = parseTelemetry(payload);
        if (!parsed.ok) {
            this.stats.rejected++;
            return;
        }
        const verdict = this.allowTelemetry(device, now);
        if (verdict === 'flood') {
            this.disableForFlooding(device).catch(err => log.error('flood.disable_failed', {deviceId: device.id, err}));
            return;
        }
        if (verdict === 'drop') {
            return;
        }
        const {seq, boot, values} = parsed.value;
        const stored = this.repo.insertReadings(device.id, values, {seq, boot, now});
        if (!stored) {
            this.stats.duplicates++;
            return;
        }
        this.stats.accepted++;
        if (device.status !== 'online') {
            this.live.publish(device.owner_sub, {type: 'status', deviceId: device.id, status: 'online'});
        }
        if (!values.length) {
            return;
        }
        const v = {};
        values.forEach(([key, value]) => {
            v[key] = value;
        });
        this.live.publish(device.owner_sub, {type: 'reading', deviceId: device.id, ts: now, v});
        values.forEach(([key, value]) => this.evaluateRules(device, key, value, now));
    }

    async disableForFlooding (device) {
        const now = this.now();
        this.repo.disableDevice(device.id, 'flooding', now);
        this.throttle.delete(device.id);
        try {
            await this.broker.admin.disable(device.id);
        } catch (err) {
            this.repo.setBrokerPending(device.id, 'disable');
        }
        this.raiseAlert(device, {
            kind: 'disabled',
            message: `${device.name} was paused: it sent data too fast. Fix the code, then press Enable.`
        });
        log.warn('device.flooding_disabled', {deviceId: device.id});
    }

    onStatus (device, payload, retained) {
        const parsed = parseStatus(payload);
        if (!parsed.ok || parsed.value.state === 'cleared') {
            return;
        }
        const now = this.now();
        const info = parsed.value;
        if (info.state === 'online') {
            if (retained && device.status === 'online') {
                return;
            }
            const {warning} = this.repo.markOnline(device.id, {
                fw: info.fw,
                rssi: info.rssi,
                boot: retained ? null : info.boot,
                transport: info.transport
            }, now);
            this.live.publish(device.owner_sub, {
                type: 'status',
                deviceId: device.id,
                status: 'online',
                rssi: info.rssi,
                transport: info.transport
            });
            if (warning === 'restarting') {
                this.raiseAlert(device, {
                    kind: 'warning',
                    message: `${device.name} keeps reconnecting. It may be restarting (check power and cables), ` +
                        'or two boards are using the same device token.'
                });
            }
            return;
        }
        if (device.status === 'online') {
            this.repo.markOffline(device.id, now);
            this.live.publish(device.owner_sub, {type: 'status', deviceId: device.id, status: 'offline'});
        }
    }

    markSeen (device) {
        if (device.status === 'disabled') {
            return;
        }
        if (this.repo.touch(device.id, this.now())) {
            this.live.publish(device.owner_sub, {type: 'status', deviceId: device.id, status: 'online'});
        }
    }

    onAck (device, payload) {
        const parsed = parseAck(payload);
        if (!parsed.ok) {
            this.stats.rejected++;
            return;
        }
        this.markSeen(device);
        if (this.repo.ackControl(device.id, parsed.value.key, parsed.value.ver)) {
            const control = serializeControl(this.repo.getControl(device.id, parsed.value.key));
            this.live.publish(device.owner_sub, {type: 'control', deviceId: device.id, control});
        }
    }

    onDeviceAlert (device, payload) {
        const parsed = parseAlertText(payload);
        if (!parsed.ok) {
            this.stats.rejected++;
            return;
        }
        this.markSeen(device);
        const now = this.now();
        if (this.repo.hasRecentAlert(device.id, 'device', parsed.value, now - DEVICE_ALERT_DEDUPE_MS)) {
            return;
        }
        if (this.repo.countAlertsSince(device.id, 'device', now - 3600 * 1000) >= DEVICE_ALERTS_PER_HOUR) {
            return;
        }
        this.raiseAlert(device, {kind: 'device', message: parsed.value});
    }

    evaluateRules (device, key, value, now) {
        this.repo.enabledRulesFor(device.id, key).forEach(rule => {
            const result = evaluateRule(rule, value, now);
            if (result.changed) {
                this.repo.setRuleState(rule.id, result.active, result.lastFired);
            }
            if (result.fire) {
                this.raiseAlert(device, {kind: 'rule', ruleId: rule.id, message: ruleMessage(rule, value, device.name, parseLabels(device.labels_json)[rule.key])});
            }
        });
    }

    raiseAlert (device, {kind, ruleId, message}) {
        const row = this.repo.insertAlert({deviceId: device.id, ruleId, kind, message, ts: this.now()});
        this.live.publish(device.owner_sub, {type: 'alert', alert: serializeAlert(Object.assign({device_name: device.name}, row))});
        return row;
    }

    // ---- jobs -----------------------------------------------------------------

    /** Offline alerts after a grace period, and stale "online" rows when no LWT ever arrived. */
    sweepStatus () {
        const now = this.now();
        this.repo.db.prepare(`SELECT * FROM devices WHERE status = 'online' AND deleted_at IS NULL`).all()
            .forEach(row => {
                if (effectiveStatus(row, now) === 'offline') {
                    this.repo.markOffline(row.id, row.last_seen || now);
                    this.live.publish(row.owner_sub, {type: 'status', deviceId: row.id, status: 'offline'});
                }
                if (row.warning && row.restart_window_start && now - row.restart_window_start > WARNING_CLEAR_MS) {
                    this.repo.clearWarning(row.id);
                }
            });
        const grace = this.config.limits.offlineGraceSec * 1000;
        this.repo.offlineAwaitingAlert(now - grace).forEach(row => {
            this.repo.setOfflineAlerted(row.id);
            this.raiseAlert(row, {kind: 'offline', message: `${row.name} went offline`});
        });
    }

    async retryBrokerPending () {
        if (!this.broker.isConnected()) {
            return;
        }
        for (const row of this.repo.devicesWithBrokerPending()) {
            try {
                if (row.broker_pending === 'disable') {
                    await this.broker.admin.disable(row.id);
                    if (row.deleted_at) {
                        await this.clearRetained(row.id);
                    }
                }
                this.repo.setBrokerPending(row.id, null);
            } catch (err) {
                log.warn('broker.pending_retry_failed', {deviceId: row.id});
            }
        }
    }

    async purgeDeleted () {
        const before = this.now() - (this.config.limits.purgeAfterDays * DAY);
        for (const row of this.repo.devicesToPurge(before)) {
            try {
                await this.broker.admin.remove(row.id);
                this.repo.hardDeleteDevice(row.id);
                log.info('device.purged', {deviceId: row.id});
            } catch (err) {
                log.warn('device.purge_failed', {deviceId: row.id});
            }
        }
    }

    /** Account deletion: remove broker accounts and every row the user owns. */
    async deleteUserData (user) {
        for (const row of this.repo.listAllDevices(user.sub)) {
            try {
                await this.broker.admin.remove(row.id);
                if (!row.deleted_at) {
                    await this.clearRetained(row.id);
                }
            } catch (err) {
                throw new HttpError(503, 'broker_unavailable');
            }
        }
        this.repo.tx(() => {
            this.repo.listAllDevices(user.sub).forEach(row => this.repo.hardDeleteDevice(row.id));
            this.repo.deleteUser(user.sub);
        });
        log.info('user.data_deleted', {sub: user.sub});
    }
}
