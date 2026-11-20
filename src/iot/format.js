const READING_KEY_RE = /^[a-zA-Z][a-zA-Z0-9_]{0,31}$/;

const CONTROL_KEYS = {
    switch1: 'switch',
    switch2: 'switch',
    switch3: 'switch',
    switch4: 'switch',
    slider1: 'slider',
    slider2: 'slider'
};

const KNOWN_UNITS = {
    temperature: '°C',
    humidity: '%',
    distance: 'cm',
    heartRate: 'bpm',
    moisture: '%',
    soilMoisture: '%'
};

const formatValue = (value, unit) => {
    if (value === null || value === undefined || !Number.isFinite(Number(value))) {
        return '—';
    }
    const n = Number(value);
    const abs = Math.abs(n);
    let text;
    if (Number.isInteger(n)) {
        text = String(n);
    } else if (abs >= 100) {
        text = n.toFixed(0);
    } else if (abs >= 10) {
        text = n.toFixed(1);
    } else {
        text = n.toFixed(2);
    }
    return unit ? `${text} ${unit}` : text;
};

const timeAgo = (ts, now = Date.now()) => {
    if (!ts) {
        return 'never';
    }
    const s = Math.max(0, Math.round((now - ts) / 1000));
    if (s < 10) {
        return 'just now';
    }
    if (s < 60) {
        return `${s} s ago`;
    }
    const m = Math.round(s / 60);
    if (m < 60) {
        return `${m} min ago`;
    }
    const h = Math.round(m / 60);
    if (h < 48) {
        return `${h} h ago`;
    }
    return new Date(ts).toLocaleDateString();
};

const clockTime = ts => new Date(ts).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});

/** WiFi strength in 0–4 bars from RSSI dBm. */
const rssiBars = rssi => {
    if (rssi === null || rssi === undefined) {
        return 0;
    }
    if (rssi >= -55) {
        return 4;
    }
    if (rssi >= -67) {
        return 3;
    }
    if (rssi >= -75) {
        return 2;
    }
    return rssi >= -85 ? 1 : 0;
};

const prettyKey = key => {
    if (!key) {
        return '';
    }
    return key.replace(/([a-z])([A-Z0-9])/g, '$1 $2').replace(/^./, c => c.toUpperCase());
};

/** True when a widget still has the title it was made with (nobody typed one), so it may be renamed. */
const isAutoTitle = widget => {
    const title = (widget.title || '').trim();
    const key = widget.key || '';
    const same = (a, b) => a.toLowerCase() === b.toLowerCase();
    // Older Studio dashboards titled controls after the block ("Dashboard switch 1").
    const spaced = key.replace(/(\d)$/, ' $1');
    const blockTitle = /^(switch|slider)\d$/.test(key) &&
        same(title.replace(/\s*\(.*\)$/, ''), `Dashboard ${spaced}`);
    return !title || blockTitle || same(title, key) || same(title, prettyKey(key)) || same(title, spaced);
};

/**
 * What a reading or control is called on screen: the name Studio sent for it (device.labels,
 * e.g. "Soil moisture", "Pump"), else the key made readable ("soilMoisture" -> "Soil moisture").
 * @param {object} device the board (may carry labels)
 * @param {string} key reading or control key
 * @returns {string} the name
 */
const labelFor = (device, key) => {
    const labels = device && device.labels && typeof device.labels === 'object' ? device.labels : null;
    const given = labels && typeof labels[key] === 'string' ? labels[key].trim() : '';
    if (given) {
        return given;
    }
    const pretty = prettyKey(key);
    return pretty.charAt(0) + pretty.slice(1).toLowerCase();
};

/**
 * A widget's title: what someone typed, or the reading's name when nobody did.
 * @param {object} widget dashboard widget
 * @param {object} device the board
 * @returns {string} the title
 */
const widgetTitle = (widget, device) => {
    if (widget.key && isAutoTitle(widget)) {
        return labelFor(device, widget.key);
    }
    return widget.title || (widget.key ? labelFor(device, widget.key) : '');
};

/**
 * @param {object} device the board
 * @param {number} [now] the time now
 * @returns {string} "Online", "Paused", "Offline · 2 h ago" or "Waiting for first connection"
 */
const statusText = (device, now) => {
    if (device.status === 'disabled') {
        return 'Paused';
    }
    if (device.status === 'online') {
        return 'Online';
    }
    return device.lastSeen ? `Offline · ${timeAgo(device.lastSeen, now)}` : 'Not connected yet';
};

const newWidgetId = existing => {
    let id;
    do {
        id = `w_${Math.random().toString(36)
            .slice(2, 10)}`;
    } while (existing.indexOf(id) >= 0);
    return id;
};

export {
    CONTROL_KEYS,
    KNOWN_UNITS,
    READING_KEY_RE,
    clockTime,
    formatValue,
    isAutoTitle,
    labelFor,
    newWidgetId,
    prettyKey,
    rssiBars,
    statusText,
    timeAgo,
    widgetTitle
};
