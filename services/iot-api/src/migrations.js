/**
 * Append-only list. Never edit a shipped migration; add a new version instead.
 * All timestamps are server UTC epoch milliseconds.
 */
export const MIGRATIONS = [
    {
        version: 1,
        sql: `
CREATE TABLE meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
) WITHOUT ROWID;

CREATE TABLE users (
    sub TEXT PRIMARY KEY,
    email TEXT NOT NULL DEFAULT '',
    created_at INTEGER NOT NULL,
    last_seen INTEGER NOT NULL
);

CREATE TABLE devices (
    id TEXT PRIMARY KEY,
    owner_sub TEXT NOT NULL REFERENCES users(sub) ON DELETE CASCADE,
    name TEXT NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    token_prefix TEXT NOT NULL,
    interval_sec INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'never',
    last_seen INTEGER,
    online_since INTEGER,
    offline_since INTEGER,
    offline_alerted INTEGER NOT NULL DEFAULT 0,
    fw TEXT,
    rssi INTEGER,
    transport TEXT,
    boot_id TEXT,
    last_seq INTEGER,
    restart_count INTEGER NOT NULL DEFAULT 0,
    restart_window_start INTEGER,
    warning TEXT,
    disabled_reason TEXT,
    broker_pending TEXT,
    created_at INTEGER NOT NULL,
    deleted_at INTEGER
);
CREATE INDEX devices_owner ON devices(owner_sub);
CREATE INDEX devices_deleted ON devices(deleted_at);

CREATE TABLE latest (
    device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    ts INTEGER NOT NULL,
    value REAL NOT NULL,
    PRIMARY KEY (device_id, key)
) WITHOUT ROWID;

CREATE TABLE readings_raw (
    device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    ts INTEGER NOT NULL,
    value REAL NOT NULL
);
CREATE INDEX readings_raw_lookup ON readings_raw(device_id, key, ts);
CREATE INDEX readings_raw_ts ON readings_raw(ts);

CREATE TABLE readings_1m (
    device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    ts INTEGER NOT NULL,
    min REAL NOT NULL,
    max REAL NOT NULL,
    avg REAL NOT NULL,
    count INTEGER NOT NULL,
    PRIMARY KEY (device_id, key, ts)
) WITHOUT ROWID;
CREATE INDEX readings_1m_ts ON readings_1m(ts);

CREATE TABLE readings_1h (
    device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    ts INTEGER NOT NULL,
    min REAL NOT NULL,
    max REAL NOT NULL,
    avg REAL NOT NULL,
    count INTEGER NOT NULL,
    PRIMARY KEY (device_id, key, ts)
) WITHOUT ROWID;
CREATE INDEX readings_1h_ts ON readings_1h(ts);

CREATE TABLE controls (
    device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    value REAL NOT NULL DEFAULT 0,
    version INTEGER NOT NULL DEFAULT 1,
    acked_version INTEGER NOT NULL DEFAULT 0,
    failsafe_sec INTEGER NOT NULL DEFAULT 120,
    failsafe_value REAL NOT NULL DEFAULT 0,
    updated_by TEXT,
    updated_at INTEGER,
    PRIMARY KEY (device_id, key)
) WITHOUT ROWID;

CREATE TABLE dashboards (
    device_id TEXT PRIMARY KEY REFERENCES devices(id) ON DELETE CASCADE,
    layout_json TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    is_default INTEGER NOT NULL DEFAULT 1,
    updated_at INTEGER NOT NULL
);

CREATE TABLE rules (
    id TEXT PRIMARY KEY,
    device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    op TEXT NOT NULL,
    threshold REAL NOT NULL,
    hysteresis REAL NOT NULL DEFAULT 0,
    cooldown_sec INTEGER NOT NULL DEFAULT 300,
    message TEXT NOT NULL DEFAULT '',
    enabled INTEGER NOT NULL DEFAULT 1,
    active INTEGER NOT NULL DEFAULT 0,
    last_fired INTEGER,
    created_at INTEGER NOT NULL
);
CREATE INDEX rules_device ON rules(device_id);

CREATE TABLE alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    rule_id TEXT,
    kind TEXT NOT NULL,
    message TEXT NOT NULL,
    ts INTEGER NOT NULL,
    read_at INTEGER
);
CREATE INDEX alerts_device ON alerts(device_id, id);

CREATE TABLE audit (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sub TEXT NOT NULL,
    action TEXT NOT NULL,
    target TEXT,
    ts INTEGER NOT NULL
);
CREATE INDEX audit_sub_action ON audit(sub, action, ts);
`
    },
    {
        // Names Studio gives readings and dashboard controls ("Pump" for switch1), as a JSON object.
        version: 2,
        sql: `ALTER TABLE devices ADD COLUMN labels_json TEXT NOT NULL DEFAULT '{}';`
    }
];
