import {HttpError} from './cloud.js';
import {lttb, pickTier} from './downsample.js';
import {serializeAlert, serializeControl, serializeDevice, serializeRule} from './repo.js';
import {DEVICE_ID_RE, newRuleId} from './tokens.js';
import {
    CONTROL_KEYS,
    READING_KEY_RE,
    cleanText,
    defaultSpan,
    validateDeviceName,
    validateInterval,
    validateLayout,
    validateRule
} from './validate.js';

const DAY = 24 * 3600 * 1000;
const MAX_HISTORY_SPAN = 366 * DAY;

const intParam = (value, fallback) => {
    if (value === null || value === undefined || value === '') {
        return fallback;
    }
    const n = Number(value);
    return Number.isFinite(n) ? Math.trunc(n) : NaN;
};

const ownedDevice = ctx => {
    const id = ctx.params.id;
    if (!DEVICE_ID_RE.test(id)) {
        throw new HttpError(404, 'not_found');
    }
    const device = ctx.repo.getOwnedDevice(id, ctx.user.sub);
    if (!device) {
        throw new HttpError(404, 'not_found');
    }
    return device;
};

/**
 * A first dashboard built from what the device actually reports.
 * titles: optional {key: title} from Studio (part names); anything else falls back to the key.
 */
export function suggestLayout (readingKeys, controlKeys, titles = {}) {
    const widget = (id, type, key, title, size) => Object.assign(
        {id, type, key, title, size, options: {}},
        defaultSpan(type, size)
    );
    // "soilMoisture" -> "Soil moisture", "switch1" -> "Switch 1" when Studio sent no name.
    const readable = key => {
        const spaced = key.replace(/([a-z])([A-Z0-9])/g, '$1 $2');
        return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
    };
    const titleFor = key => {
        const given = Object.prototype.hasOwnProperty.call(titles, key) ? cleanText(titles[key], 40) : '';
        return given || readable(key);
    };
    // Things you act on first, then numbers, then history. The page itself shows the board's
    // status and its alerts, so neither gets a tile.
    const layout = [];
    controlKeys.filter(k => CONTROL_KEYS[k]).forEach(key => {
        layout.push(widget(`c_${key}`, CONTROL_KEYS[key].kind, key, titleFor(key), 'S'));
    });
    readingKeys.slice(0, 6).forEach((key, i) => {
        layout.push(widget(`v_${i}`, 'value', key, titleFor(key), 'S'));
    });
    if (readingKeys.length) {
        layout.push(widget('chart_0', 'chart', readingKeys[0], titleFor(readingKeys[0]), 'L'));
    }
    return layout;
}

const deviceDetail = (ctx, device) => {
    const now = ctx.now();
    const latest = ctx.repo.latestFor(device.id);
    const dashboard = ctx.repo.getDashboard(device.id);
    if (dashboard.isDefault && dashboard.layout.length === 0 && latest.length) {
        dashboard.layout = suggestLayout(latest.map(r => r.key), ['switch1']);
    }
    return {
        device: serializeDevice(device, now),
        latest: latest.map(r => ({key: r.key, ts: r.ts, value: r.value})),
        controls: ctx.repo.listControls(device.id).map(serializeControl),
        dashboard,
        rules: ctx.repo.listRules(device.id).map(serializeRule)
    };
};

export const routes = [
    {
        method: 'GET',
        path: '/config',
        pilot: false,
        handler: ctx => ({
            enabled: ctx.config.enabled,
            allowed: ctx.allowed,
            broker: {
                host: ctx.config.publicBroker.host,
                mqttsPort: ctx.config.publicBroker.mqttsPort,
                wssPath: ctx.config.publicBroker.wssPath
            },
            limits: {
                minIntervalSec: ctx.config.limits.minIntervalSec,
                defaultIntervalSec: ctx.config.limits.defaultIntervalSec,
                maxDevices: ctx.config.limits.maxDevicesPerUser
            },
            user: {email: ctx.user.email, name: ctx.user.name}
        })
    },
    {
        method: 'GET',
        path: '/devices',
        handler: ctx => {
            const now = ctx.now();
            return {
                devices: ctx.repo.listDevices(ctx.user.sub).map(row => Object.assign(serializeDevice(row, now), {
                    latest: ctx.repo.latestFor(row.id).map(r => ({key: r.key, ts: r.ts, value: r.value}))
                })),
                unreadAlerts: ctx.repo.countUnread(ctx.user.sub)
            };
        }
    },
    {
        method: 'POST',
        path: '/devices',
        handler: async ctx => {
            const name = validateDeviceName(ctx.body.name);
            if (!name.ok) {
                throw new HttpError(400, name.error);
            }
            const created = await ctx.cloud.createDevice(ctx.user, name.value);
            return {status: 201, body: created};
        }
    },
    {
        method: 'GET',
        path: '/devices/:id',
        handler: ctx => deviceDetail(ctx, ownedDevice(ctx))
    },
    {
        method: 'PATCH',
        path: '/devices/:id',
        handler: ctx => {
            const device = ownedDevice(ctx);
            if (ctx.body.name !== undefined) {
                const name = validateDeviceName(ctx.body.name);
                if (!name.ok) {
                    throw new HttpError(400, name.error);
                }
                ctx.repo.renameDevice(device.id, name.value);
            }
            if (ctx.body.intervalSec !== undefined) {
                const interval = validateInterval(ctx.body.intervalSec, ctx.config.limits);
                if (!interval.ok) {
                    throw new HttpError(400, interval.error);
                }
                ctx.repo.setInterval(device.id, interval.value);
            }
            if (ctx.body.clearWarning === true) {
                ctx.repo.clearWarning(device.id);
            }
            return {device: serializeDevice(ctx.repo.getDevice(device.id), ctx.now())};
        }
    },
    {
        method: 'DELETE',
        path: '/devices/:id',
        handler: async ctx => {
            await ctx.cloud.deleteDevice(ctx.user, ownedDevice(ctx));
            return {ok: true};
        }
    },
    {
        method: 'POST',
        path: '/devices/:id/token',
        handler: ctx => ctx.cloud.regenerateToken(ctx.user, ownedDevice(ctx))
    },
    {
        method: 'POST',
        path: '/devices/:id/enable',
        handler: async ctx => {
            const device = ownedDevice(ctx);
            await ctx.cloud.enableDevice(ctx.user, device);
            return {device: serializeDevice(ctx.repo.getDevice(device.id), ctx.now())};
        }
    },
    {
        method: 'PUT',
        path: '/devices/:id/controls/:key',
        rate: 'control',
        handler: ctx => ctx.cloud.setControl(ctx.user, ownedDevice(ctx), ctx.params.key, ctx.body)
    },
    {
        method: 'GET',
        path: '/devices/:id/history',
        handler: ctx => {
            const device = ownedDevice(ctx);
            const key = ctx.query.get('key') || '';
            if (!READING_KEY_RE.test(key)) {
                throw new HttpError(400, 'invalid_key');
            }
            const now = ctx.now();
            const to = intParam(ctx.query.get('to'), now);
            const from = intParam(ctx.query.get('from'), to - 3600 * 1000);
            const points = intParam(ctx.query.get('points'), 300);
            if (!Number.isFinite(from) || !Number.isFinite(to) || from >= to || to - from > MAX_HISTORY_SPAN) {
                throw new HttpError(400, 'invalid_range');
            }
            if (!Number.isFinite(points) || points < 10 || points > 500) {
                throw new HttpError(400, 'invalid_points');
            }
            const tier = pickTier(from, to, now);
            let rows = ctx.repo.history(device.id, key, tier, from, to);
            if (tier === '1m') {
                const watermark = Number(ctx.repo.getMeta('rollup_1m_until') || 0);
                rows = rows.filter(r => r[0] < watermark)
                    .concat(ctx.repo.minuteBucketsFromRaw(device.id, key, Math.max(from, watermark), to));
            }
            return {key, tier, intervalSec: device.interval_sec, points: lttb(rows, points)};
        }
    },
    {
        method: 'PUT',
        path: '/devices/:id/dashboard',
        handler: ctx => {
            const device = ownedDevice(ctx);
            const layout = validateLayout(ctx.body.layout, ctx.config.limits.maxWidgets);
            if (!layout.ok) {
                throw new HttpError(400, layout.error);
            }
            if (!Number.isInteger(ctx.body.expectedVersion)) {
                throw new HttpError(400, 'expected_version_required');
            }
            const result = ctx.repo.saveDashboard(device.id, layout.value, ctx.body.expectedVersion, ctx.now());
            if (result.conflict) {
                throw new HttpError(409, 'version_conflict', {dashboard: result.dashboard});
            }
            return {dashboard: result.dashboard};
        }
    },
    {
        method: 'POST',
        path: '/devices/:id/dashboard/suggest',
        handler: ctx => {
            const device = ownedDevice(ctx);
            const keys = Array.isArray(ctx.body.keys) ? ctx.body.keys.filter(k => typeof k === 'string' && READING_KEY_RE.test(k)) : [];
            const controls = Array.isArray(ctx.body.controls) ? ctx.body.controls.filter(k => CONTROL_KEYS[k]) : [];
            const current = ctx.repo.getDashboard(device.id);
            if (!current.isDefault) {
                return {applied: false, dashboard: current};
            }
            const given = ctx.body.titles;
            const titles = {};
            if (given && typeof given === 'object' && !Array.isArray(given)) {
                keys.concat(controls).forEach(k => {
                    if (Object.prototype.hasOwnProperty.call(given, k) && typeof given[k] === 'string') {
                        titles[k] = given[k];
                    }
                });
            }
            const layout = validateLayout(suggestLayout(Array.from(new Set(keys)), Array.from(new Set(controls)), titles),
                ctx.config.limits.maxWidgets);
            if (!layout.ok) {
                throw new HttpError(400, layout.error);
            }
            const result = ctx.repo.saveDashboard(device.id, layout.value, current.version, ctx.now(), true);
            return {applied: !result.conflict, dashboard: result.dashboard};
        }
    },
    {
        method: 'POST',
        path: '/devices/:id/rules',
        handler: ctx => {
            const device = ownedDevice(ctx);
            if (ctx.repo.listRules(device.id).length >= ctx.config.limits.maxRulesPerDevice) {
                throw new HttpError(409, 'rule_limit');
            }
            const rule = validateRule(ctx.body);
            if (!rule.ok) {
                throw new HttpError(400, rule.error);
            }
            return {status: 201, body: {rule: serializeRule(ctx.repo.insertRule(device.id, newRuleId(), rule.value, ctx.now()))}};
        }
    },
    {
        method: 'PATCH',
        path: '/devices/:id/rules/:ruleId',
        handler: ctx => {
            const device = ownedDevice(ctx);
            const existing = ctx.repo.getRule(device.id, ctx.params.ruleId);
            if (!existing) {
                throw new HttpError(404, 'not_found');
            }
            const rule = validateRule(Object.assign({
                key: existing.key,
                op: existing.op,
                threshold: existing.threshold,
                hysteresis: existing.hysteresis,
                cooldownSec: existing.cooldown_sec,
                message: existing.message,
                enabled: Boolean(existing.enabled)
            }, ctx.body));
            if (!rule.ok) {
                throw new HttpError(400, rule.error);
            }
            return {rule: serializeRule(ctx.repo.updateRule(device.id, existing.id, rule.value))};
        }
    },
    {
        method: 'DELETE',
        path: '/devices/:id/rules/:ruleId',
        handler: ctx => {
            const device = ownedDevice(ctx);
            if (!ctx.repo.deleteRule(device.id, ctx.params.ruleId)) {
                throw new HttpError(404, 'not_found');
            }
            return {ok: true};
        }
    },
    {
        method: 'GET',
        path: '/alerts',
        handler: ctx => {
            const deviceId = ctx.query.get('device');
            if (deviceId && !ctx.repo.getOwnedDevice(deviceId, ctx.user.sub)) {
                throw new HttpError(404, 'not_found');
            }
            const limit = intParam(ctx.query.get('limit'), 50);
            const beforeId = intParam(ctx.query.get('before'), null);
            if (!Number.isFinite(limit) || limit < 1 || limit > 100 || Number.isNaN(beforeId)) {
                throw new HttpError(400, 'invalid_query');
            }
            const rows = ctx.repo.listAlerts(ctx.user.sub, {deviceId, beforeId, limit});
            return {
                alerts: rows.map(serializeAlert),
                nextBefore: rows.length === limit ? rows[rows.length - 1].id : null,
                unread: ctx.repo.countUnread(ctx.user.sub)
            };
        }
    },
    {
        method: 'POST',
        path: '/alerts/read',
        handler: ctx => {
            const upToId = ctx.body.upToId;
            if (!Number.isInteger(upToId) || upToId < 1) {
                throw new HttpError(400, 'invalid_up_to');
            }
            const deviceId = typeof ctx.body.deviceId === 'string' ? ctx.body.deviceId : null;
            return {updated: ctx.repo.markAlertsRead(ctx.user.sub, upToId, deviceId, ctx.now())};
        }
    },
    {
        method: 'POST',
        path: '/live/ticket',
        handler: ctx => {
            const ticket = ctx.live.issueTicket(ctx.user.sub);
            if (!ticket) {
                throw new HttpError(429, 'too_many_tickets');
            }
            return {ticket, url: ctx.config.liveUrl, expiresInSec: 60};
        }
    },
    {
        method: 'GET',
        path: '/me/export',
        handler: ctx => {
            const now = ctx.now();
            const devices = ctx.repo.listDevices(ctx.user.sub).map(row => {
                const history = {};
                ctx.repo.latestFor(row.id).forEach(r => {
                    history[r.key] = ctx.repo.history(row.id, r.key, '1h', 0, now);
                });
                return Object.assign(deviceDetail(ctx, row), {hourlyHistory: history});
            });
            ctx.repo.audit(ctx.user.sub, 'me.export', null, now);
            return {exportedAt: new Date(now).toISOString(), user: {email: ctx.user.email}, devices};
        }
    },
    {
        method: 'DELETE',
        path: '/me/data',
        handler: async ctx => {
            if (ctx.body.confirm !== 'DELETE') {
                throw new HttpError(400, 'confirmation_required');
            }
            await ctx.cloud.deleteUserData(ctx.user);
            return {ok: true};
        }
    }
];

/** Compile "/devices/:id" style paths into matchers. */
export function compileRoutes (list) {
    return list.map(r => {
        const names = [];
        const pattern = r.path.replace(/:([a-zA-Z]+)/g, (m, name) => {
            names.push(name);
            return '([^/]+)';
        });
        return Object.assign({}, r, {regex: new RegExp(`^${pattern}$`), names});
    });
}
