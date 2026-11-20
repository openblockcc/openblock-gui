import {transaction} from './db.js';
import {CONTROL_KEYS} from './validate.js';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const RESTART_WINDOW_MS = 10 * MINUTE;
const RESTART_WARN_COUNT = 6;

/**
 * Data access layer. Every SQL statement in the service lives here so ownership
 * checks and a future move to Postgres stay in one file.
 */
export class Repo {
    constructor (db) {
        this.db = db;
        this.cache = new Map();
    }

    stmt (sql) {
        let s = this.cache.get(sql);
        if (!s) {
            s = this.db.prepare(sql);
            this.cache.set(sql, s);
        }
        return s;
    }

    tx (fn) {
        return transaction(this.db, fn);
    }

    // ---- meta / audit -------------------------------------------------------

    getMeta (key) {
        const row = this.stmt('SELECT value FROM meta WHERE key = ?').get(key);
        return row ? row.value : null;
    }

    setMeta (key, value) {
        this.stmt('INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
            .run(key, String(value));
    }

    audit (sub, action, target, now = Date.now()) {
        this.stmt('INSERT INTO audit (sub, action, target, ts) VALUES (?, ?, ?, ?)').run(sub, action, target || null, now);
    }

    countAudit (sub, action, since) {
        return this.stmt('SELECT COUNT(*) AS n FROM audit WHERE sub = ? AND action = ? AND ts >= ?')
            .get(sub, action, since).n;
    }

    // ---- users ----------------------------------------------------------------

    touchUser (sub, email, now = Date.now()) {
        this.stmt(`INSERT INTO users (sub, email, created_at, last_seen) VALUES (?, ?, ?, ?)
            ON CONFLICT(sub) DO UPDATE SET email = excluded.email, last_seen = excluded.last_seen
            WHERE users.last_seen < ? OR users.email != excluded.email`)
            .run(sub, email || '', now, now, now - HOUR);
    }

    deleteUser (sub) {
        this.stmt('DELETE FROM audit WHERE sub = ?').run(sub);
        this.stmt('DELETE FROM users WHERE sub = ?').run(sub);
    }

    // ---- devices --------------------------------------------------------------

    countActiveDevices (sub) {
        return this.stmt('SELECT COUNT(*) AS n FROM devices WHERE owner_sub = ? AND deleted_at IS NULL').get(sub).n;
    }

    insertDevice ({id, ownerSub, name, tokenHash, tokenPrefix, intervalSec, now}) {
        this.tx(() => {
            this.stmt(`INSERT INTO devices (id, owner_sub, name, token_hash, token_prefix, interval_sec, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)`).run(id, ownerSub, name, tokenHash, tokenPrefix, intervalSec, now);
            Object.keys(CONTROL_KEYS).forEach(key => {
                this.stmt(`INSERT INTO controls (device_id, key, value, version, failsafe_sec, failsafe_value, updated_at)
                    VALUES (?, ?, 0, 1, 120, 0, ?)`).run(id, key, now);
            });
            this.stmt('INSERT INTO dashboards (device_id, layout_json, version, is_default, updated_at) VALUES (?, ?, 1, 1, ?)')
                .run(id, '[]', now);
        });
    }

    getDevice (id) {
        return this.stmt('SELECT * FROM devices WHERE id = ?').get(id) || null;
    }

    /** Ownership check: returns null for missing, deleted or someone else's device. */
    getOwnedDevice (id, sub) {
        return this.stmt('SELECT * FROM devices WHERE id = ? AND owner_sub = ? AND deleted_at IS NULL').get(id, sub) || null;
    }

    listDevices (sub) {
        return this.stmt('SELECT * FROM devices WHERE owner_sub = ? AND deleted_at IS NULL ORDER BY created_at').all(sub);
    }

    listAllDevices (sub) {
        return this.stmt('SELECT * FROM devices WHERE owner_sub = ?').all(sub);
    }

    renameDevice (id, name) {
        this.stmt('UPDATE devices SET name = ? WHERE id = ?').run(name, id);
    }

    setLabels (id, labels) {
        this.stmt('UPDATE devices SET labels_json = ? WHERE id = ?').run(JSON.stringify(labels), id);
    }

    setInterval (id, sec) {
        this.stmt('UPDATE devices SET interval_sec = ? WHERE id = ?').run(sec, id);
    }

    setToken (id, tokenHash, prefix) {
        this.stmt('UPDATE devices SET token_hash = ?, token_prefix = ? WHERE id = ?').run(tokenHash, prefix, id);
    }

    softDeleteDevice (id, now, brokerPending) {
        this.stmt('UPDATE devices SET deleted_at = ?, broker_pending = ? WHERE id = ?').run(now, brokerPending || null, id);
    }

    setBrokerPending (id, action) {
        this.stmt('UPDATE devices SET broker_pending = ? WHERE id = ?').run(action || null, id);
    }

    devicesWithBrokerPending () {
        return this.stmt('SELECT * FROM devices WHERE broker_pending IS NOT NULL').all();
    }

    devicesToPurge (before) {
        return this.stmt('SELECT * FROM devices WHERE deleted_at IS NOT NULL AND deleted_at < ?').all(before);
    }

    hardDeleteDevice (id) {
        this.stmt('DELETE FROM devices WHERE id = ?').run(id);
    }

    disableDevice (id, reason, now) {
        this.stmt(`UPDATE devices SET status = 'disabled', disabled_reason = ?, offline_since = ? WHERE id = ?`)
            .run(reason, now, id);
    }

    enableDevice (id) {
        this.stmt(`UPDATE devices SET status = 'offline', disabled_reason = NULL, offline_alerted = 1 WHERE id = ?`).run(id);
    }

    clearWarning (id) {
        this.stmt('UPDATE devices SET warning = NULL, restart_count = 0, restart_window_start = NULL WHERE id = ?').run(id);
    }

    /**
     * Record an "online" status. Frequent new boot ids mean a boot loop or two boards
     * sharing one token (the broker keeps kicking one off); both get the same warning.
     * @returns {{warning: string|null, wasOnline: boolean}}
     */
    markOnline (id, info, now) {
        const row = this.getDevice(id);
        if (!row) {
            return {warning: null, wasOnline: false};
        }
        let count = row.restart_count;
        let windowStart = row.restart_window_start;
        const newBoot = info.boot && row.boot_id && info.boot !== row.boot_id;
        if (!windowStart || now - windowStart > RESTART_WINDOW_MS) {
            windowStart = now;
            count = 0;
        }
        if (newBoot || (row.status === 'online' && info.boot === null)) {
            count += 1;
        }
        let warning = row.warning;
        if (count >= RESTART_WARN_COUNT) {
            warning = 'restarting';
        }
        this.stmt(`UPDATE devices SET status = CASE WHEN status = 'disabled' THEN status ELSE 'online' END,
                online_since = ?, last_seen = ?, offline_alerted = 0,
                fw = COALESCE(?, fw), rssi = COALESCE(?, rssi), transport = COALESCE(?, transport),
                boot_id = COALESCE(?, boot_id), last_seq = CASE WHEN ? IS NOT NULL AND ? != COALESCE(boot_id, '') THEN NULL ELSE last_seq END,
                restart_count = ?, restart_window_start = ?, warning = ?
            WHERE id = ?`)
            .run(now, now, info.fw, info.rssi, info.transport, info.boot, info.boot, info.boot,
                count, windowStart, warning, id);
        return {warning: warning !== row.warning ? warning : null, wasOnline: row.status === 'online'};
    }

    markOffline (id, now) {
        this.stmt(`UPDATE devices SET status = CASE WHEN status = 'disabled' THEN status ELSE 'offline' END,
                offline_since = ? WHERE id = ? AND status != 'never'`).run(now, id);
    }

    /**
     * Any message from the board proves it is connected. Brings a stale-swept row back online.
     * @returns {boolean} true when the row was offline and is now online
     */
    touch (id, now) {
        const row = this.stmt('SELECT status FROM devices WHERE id = ?').get(id);
        if (!row) {
            return false;
        }
        this.stmt(`UPDATE devices SET last_seen = ?, offline_alerted = 0,
                online_since = CASE WHEN status IN ('never', 'offline') THEN ? ELSE online_since END,
                status = CASE WHEN status IN ('never', 'offline') THEN 'online' ELSE status END
            WHERE id = ?`).run(now, now, id);
        return row.status === 'never' || row.status === 'offline';
    }

    offlineAwaitingAlert (before) {
        return this.stmt(`SELECT * FROM devices WHERE status = 'offline' AND offline_alerted = 0
            AND offline_since IS NOT NULL AND offline_since <= ? AND deleted_at IS NULL`).all(before);
    }

    setOfflineAlerted (id) {
        this.stmt('UPDATE devices SET offline_alerted = 1 WHERE id = ?').run(id);
    }

    // ---- readings -------------------------------------------------------------

    /**
     * Store one telemetry message. Returns false when (boot, seq) was already seen,
     * which makes QoS duplicates and replays harmless.
     */
    insertReadings (id, values, {seq, boot, now}) {
        return this.tx(() => {
            const row = this.stmt('SELECT last_seq, boot_id FROM devices WHERE id = ?').get(id);
            const newBoot = Boolean(boot) && boot !== row.boot_id;
            if (newBoot) {
                this.stmt('UPDATE devices SET boot_id = ?, last_seq = NULL WHERE id = ?').run(boot, id);
            } else if (seq !== null && row && row.last_seq !== null && seq <= row.last_seq) {
                return false;
            }
            const insert = this.stmt('INSERT INTO readings_raw (device_id, key, ts, value) VALUES (?, ?, ?, ?)');
            const upsert = this.stmt(`INSERT INTO latest (device_id, key, ts, value) VALUES (?, ?, ?, ?)
                ON CONFLICT(device_id, key) DO UPDATE SET ts = excluded.ts, value = excluded.value`);
            values.forEach(([key, value]) => {
                insert.run(id, key, now, value);
                upsert.run(id, key, now, value);
            });
            this.stmt(`UPDATE devices SET last_seen = ?, last_seq = COALESCE(?, last_seq),
                    status = CASE WHEN status IN ('never', 'offline') THEN 'online' ELSE status END,
                    online_since = CASE WHEN status IN ('never', 'offline') THEN ? ELSE online_since END,
                    offline_alerted = 0
                WHERE id = ?`).run(now, seq, now, id);
            return true;
        });
    }

    latestFor (id) {
        return this.stmt('SELECT key, ts, value FROM latest WHERE device_id = ? ORDER BY key').all(id);
    }

    history (id, key, tier, from, to) {
        if (tier === 'raw') {
            return this.stmt(`SELECT ts, value FROM readings_raw WHERE device_id = ? AND key = ? AND ts >= ? AND ts <= ?
                ORDER BY ts`).all(id, key, from, to)
                .map(r => [r.ts, r.value]);
        }
        const table = tier === '1m' ? 'readings_1m' : 'readings_1h';
        return this.stmt(`SELECT ts, avg, min, max FROM ${table} WHERE device_id = ? AND key = ? AND ts >= ? AND ts <= ?
            ORDER BY ts`).all(id, key, from, to)
            .map(r => [r.ts, r.avg, r.min, r.max]);
    }

    /** Minute buckets computed on the fly from raw rows not yet rolled up. */
    minuteBucketsFromRaw (id, key, from, to) {
        return this.stmt(`SELECT (ts / 60000) * 60000 AS bucket, AVG(value) AS avg, MIN(value) AS min, MAX(value) AS max
            FROM readings_raw WHERE device_id = ? AND key = ? AND ts >= ? AND ts <= ?
            GROUP BY bucket ORDER BY bucket`).all(id, key, from, to)
            .map(r => [r.bucket, r.avg, r.min, r.max]);
    }

    /** Aggregate complete minutes [from, to) of raw data into readings_1m. */
    rollupMinutes (from, to) {
        return this.stmt(`INSERT INTO readings_1m (device_id, key, ts, min, max, avg, count)
            SELECT device_id, key, (ts / 60000) * 60000 AS bucket, MIN(value), MAX(value), AVG(value), COUNT(*)
            FROM readings_raw WHERE ts >= ? AND ts < ?
            GROUP BY device_id, key, bucket
            ON CONFLICT(device_id, key, ts) DO UPDATE SET
                min = MIN(readings_1m.min, excluded.min), max = MAX(readings_1m.max, excluded.max),
                avg = (readings_1m.avg * readings_1m.count + excluded.avg * excluded.count) / (readings_1m.count + excluded.count),
                count = readings_1m.count + excluded.count`).run(from, to).changes;
    }

    rollupHours (from, to) {
        return this.stmt(`INSERT INTO readings_1h (device_id, key, ts, min, max, avg, count)
            SELECT device_id, key, (ts / 3600000) * 3600000 AS bucket, MIN(min), MAX(max),
                SUM(avg * count) / SUM(count), SUM(count)
            FROM readings_1m WHERE ts >= ? AND ts < ?
            GROUP BY device_id, key, bucket
            ON CONFLICT(device_id, key, ts) DO UPDATE SET
                min = MIN(readings_1h.min, excluded.min), max = MAX(readings_1h.max, excluded.max),
                avg = (readings_1h.avg * readings_1h.count + excluded.avg * excluded.count) / (readings_1h.count + excluded.count),
                count = readings_1h.count + excluded.count`).run(from, to).changes;
    }

    purgeReadings ({rawBefore, minuteBefore, hourBefore}) {
        return {
            raw: this.stmt('DELETE FROM readings_raw WHERE ts < ?').run(rawBefore).changes,
            minute: this.stmt('DELETE FROM readings_1m WHERE ts < ?').run(minuteBefore).changes,
            hour: this.stmt('DELETE FROM readings_1h WHERE ts < ?').run(hourBefore).changes
        };
    }

    // ---- controls -------------------------------------------------------------

    listControls (id) {
        return this.stmt('SELECT * FROM controls WHERE device_id = ? ORDER BY key').all(id);
    }

    getControl (id, key) {
        return this.stmt('SELECT * FROM controls WHERE device_id = ? AND key = ?').get(id, key) || null;
    }

    /**
     * Optimistic write. A stale expectedVersion returns {conflict: true} with the current row,
     * so two people toggling the same switch never silently overwrite each other.
     */
    updateControl (id, key, {value, failsafeSec, failsafeValue, by, now}, expectedVersion) {
        return this.tx(() => {
            const current = this.getControl(id, key);
            if (!current) {
                return {conflict: false, control: null};
            }
            if (expectedVersion !== current.version) {
                return {conflict: true, control: current};
            }
            this.stmt(`UPDATE controls SET value = ?, failsafe_sec = ?, failsafe_value = ?, version = version + 1,
                    updated_by = ?, updated_at = ? WHERE device_id = ? AND key = ?`)
                .run(value, failsafeSec, failsafeValue, by, now, id, key);
            return {conflict: false, control: this.getControl(id, key)};
        });
    }

    /** Only versions we actually issued can be acknowledged. */
    ackControl (id, key, ver) {
        return this.stmt(`UPDATE controls SET acked_version = ? WHERE device_id = ? AND key = ?
            AND ? <= version AND ? > acked_version`).run(ver, id, key, ver, ver).changes > 0;
    }

    allLiveControls () {
        return this.stmt(`SELECT c.* FROM controls c JOIN devices d ON d.id = c.device_id
            WHERE d.deleted_at IS NULL AND d.status != 'disabled'`).all();
    }

    // ---- dashboards -----------------------------------------------------------

    getDashboard (id) {
        const row = this.stmt('SELECT * FROM dashboards WHERE device_id = ?').get(id);
        if (!row) {
            return {layout: [], version: 0, isDefault: true};
        }
        let layout = [];
        try {
            layout = JSON.parse(row.layout_json);
        } catch (err) {
            layout = [];
        }
        return {layout, version: row.version, isDefault: Boolean(row.is_default)};
    }

    saveDashboard (id, layout, expectedVersion, now, isDefault = false) {
        return this.tx(() => {
            const current = this.getDashboard(id);
            if (expectedVersion !== current.version) {
                return {conflict: true, dashboard: current};
            }
            this.stmt(`INSERT INTO dashboards (device_id, layout_json, version, is_default, updated_at) VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(device_id) DO UPDATE SET layout_json = excluded.layout_json, version = excluded.version,
                is_default = excluded.is_default, updated_at = excluded.updated_at`)
                .run(id, JSON.stringify(layout), current.version + 1, isDefault ? 1 : 0, now);
            return {conflict: false, dashboard: this.getDashboard(id)};
        });
    }

    // ---- rules ----------------------------------------------------------------

    listRules (id) {
        return this.stmt('SELECT * FROM rules WHERE device_id = ? ORDER BY created_at').all(id);
    }

    enabledRulesFor (id, key) {
        return this.stmt('SELECT * FROM rules WHERE device_id = ? AND key = ? AND enabled = 1').all(id, key);
    }

    getRule (deviceId, ruleId) {
        return this.stmt('SELECT * FROM rules WHERE id = ? AND device_id = ?').get(ruleId, deviceId) || null;
    }

    insertRule (deviceId, ruleId, r, now) {
        this.stmt(`INSERT INTO rules (id, device_id, key, op, threshold, hysteresis, cooldown_sec, message, enabled, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
            .run(ruleId, deviceId, r.key, r.op, r.threshold, r.hysteresis, r.cooldownSec, r.message, r.enabled ? 1 : 0, now);
        return this.getRule(deviceId, ruleId);
    }

    updateRule (deviceId, ruleId, r) {
        this.stmt(`UPDATE rules SET key = ?, op = ?, threshold = ?, hysteresis = ?, cooldown_sec = ?, message = ?,
                enabled = ?, active = 0 WHERE id = ? AND device_id = ?`)
            .run(r.key, r.op, r.threshold, r.hysteresis, r.cooldownSec, r.message, r.enabled ? 1 : 0, ruleId, deviceId);
        return this.getRule(deviceId, ruleId);
    }

    deleteRule (deviceId, ruleId) {
        return this.stmt('DELETE FROM rules WHERE id = ? AND device_id = ?').run(ruleId, deviceId).changes > 0;
    }

    setRuleState (ruleId, active, lastFired) {
        this.stmt('UPDATE rules SET active = ?, last_fired = ? WHERE id = ?').run(active ? 1 : 0, lastFired, ruleId);
    }

    // ---- alerts ---------------------------------------------------------------

    insertAlert ({deviceId, ruleId, kind, message, ts}) {
        const info = this.stmt('INSERT INTO alerts (device_id, rule_id, kind, message, ts) VALUES (?, ?, ?, ?, ?)')
            .run(deviceId, ruleId || null, kind, message, ts);
        return this.stmt('SELECT * FROM alerts WHERE id = ?').get(Number(info.lastInsertRowid));
    }

    hasRecentAlert (deviceId, kind, message, since) {
        return Boolean(this.stmt('SELECT 1 FROM alerts WHERE device_id = ? AND kind = ? AND message = ? AND ts >= ? LIMIT 1')
            .get(deviceId, kind, message, since));
    }

    countAlertsSince (deviceId, kind, since) {
        return this.stmt('SELECT COUNT(*) AS n FROM alerts WHERE device_id = ? AND kind = ? AND ts >= ?')
            .get(deviceId, kind, since).n;
    }

    listAlerts (sub, {deviceId, beforeId, limit}) {
        const params = [sub];
        let sql = `SELECT a.*, d.name AS device_name FROM alerts a JOIN devices d ON d.id = a.device_id
            WHERE d.owner_sub = ? AND d.deleted_at IS NULL`;
        if (deviceId) {
            sql += ' AND a.device_id = ?';
            params.push(deviceId);
        }
        if (beforeId) {
            sql += ' AND a.id < ?';
            params.push(beforeId);
        }
        sql += ' ORDER BY a.id DESC LIMIT ?';
        params.push(limit);
        return this.stmt(sql).all(...params);
    }

    countUnread (sub) {
        return this.stmt(`SELECT COUNT(*) AS n FROM alerts a JOIN devices d ON d.id = a.device_id
            WHERE d.owner_sub = ? AND d.deleted_at IS NULL AND a.read_at IS NULL`).get(sub).n;
    }

    markAlertsRead (sub, upToId, deviceId, now) {
        const params = [now, upToId, sub];
        let sql = `UPDATE alerts SET read_at = ? WHERE read_at IS NULL AND id <= ?
            AND device_id IN (SELECT id FROM devices WHERE owner_sub = ?`;
        if (deviceId) {
            sql += ' AND id = ?';
            params.push(deviceId);
        }
        sql += ')';
        return this.stmt(sql).run(...params).changes;
    }

    trimAlerts (keepPerDevice) {
        return this.stmt(`DELETE FROM alerts WHERE id IN (
            SELECT id FROM (SELECT id, ROW_NUMBER() OVER (PARTITION BY device_id ORDER BY id DESC) AS rn FROM alerts)
            WHERE rn > ?)`).run(keepPerDevice).changes;
    }

    purgeAudit (before) {
        return this.stmt('DELETE FROM audit WHERE ts < ?').run(before).changes;
    }
}

/** Firmware that only sends telemetry when it has readings; quiet boards rely on the broker's LWT. */
const NO_HEARTBEAT_FW = new Set(['studio-1']);

/** Status shown to users. "online" with no traffic for 3 intervals (min 90 s) is stale. */
export function effectiveStatus (row, now = Date.now()) {
    if (row.status !== 'online') {
        return row.status;
    }
    if (NO_HEARTBEAT_FW.has(row.fw)) {
        return 'online';
    }
    const staleAfter = Math.max(row.interval_sec * 3 * 1000, 90 * 1000);
    if (row.last_seen && now - row.last_seen > staleAfter) {
        return 'offline';
    }
    return 'online';
}

export const parseLabels = json => {
    try {
        const labels = JSON.parse(json || '{}');
        return labels && typeof labels === 'object' && !Array.isArray(labels) ? labels : {};
    } catch (err) {
        return {};
    }
};

export function serializeDevice (row, now = Date.now()) {
    return {
        id: row.id,
        name: row.name,
        status: effectiveStatus(row, now),
        intervalSec: row.interval_sec,
        lastSeen: row.last_seen,
        onlineSince: row.online_since,
        offlineSince: row.offline_since,
        fw: row.fw,
        rssi: row.rssi,
        transport: row.transport,
        warning: row.warning,
        disabledReason: row.disabled_reason,
        tokenPrefix: row.token_prefix,
        labels: parseLabels(row.labels_json),
        createdAt: row.created_at
    };
}

export function serializeControl (row) {
    return {
        key: row.key,
        kind: CONTROL_KEYS[row.key] ? CONTROL_KEYS[row.key].kind : 'switch',
        value: row.value,
        version: row.version,
        ackedVersion: row.acked_version,
        failsafeSec: row.failsafe_sec,
        failsafeValue: row.failsafe_value,
        updatedBy: row.updated_by,
        updatedAt: row.updated_at
    };
}

export function serializeRule (row) {
    return {
        id: row.id,
        key: row.key,
        op: row.op,
        threshold: row.threshold,
        hysteresis: row.hysteresis,
        cooldownSec: row.cooldown_sec,
        message: row.message,
        enabled: Boolean(row.enabled),
        active: Boolean(row.active),
        lastFired: row.last_fired
    };
}

export function serializeAlert (row) {
    return {
        id: row.id,
        deviceId: row.device_id,
        deviceName: row.device_name || undefined,
        ruleId: row.rule_id,
        kind: row.kind,
        message: row.message,
        ts: row.ts,
        read: Boolean(row.read_at)
    };
}
