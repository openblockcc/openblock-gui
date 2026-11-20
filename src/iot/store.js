import {useCallback, useEffect, useMemo, useReducer, useRef} from 'react';

import {iotApi, isTransient} from '../lib/iot-api';

import LiveClient from './live';

const RECENT_CAP = 600;
const POLL_MS = 10000;
const BOOT_RETRY_MS = 30000;
const PAUSED_RETRY_MS = 60000;

const initialState = {
    config: null,
    configError: null,
    devices: null,
    devicesError: null,
    details: {},
    detailErrors: {},
    unread: 0,
    live: 'idle',
    recent: {},
    alerts: {items: [], nextBefore: null, loaded: false},
    toast: null
};

const mergeDevice = (list, device) => {
    if (!list) {
        return list;
    }
    let found = false;
    const next = list.map(d => {
        if (d.id !== device.id) {
            return d;
        }
        found = true;
        return Object.assign({}, d, device);
    });
    return found ? next : next.concat([Object.assign({latest: []}, device)]);
};

const mergeLatest = (latest, ts, v) => {
    const byKey = {};
    (latest || []).forEach(r => {
        byKey[r.key] = r;
    });
    Object.keys(v).forEach(key => {
        byKey[key] = {key, ts, value: v[key]};
    });
    return Object.keys(byKey).sort()
        .map(k => byKey[k]);
};

const newerControl = (current, next) => !current ||
    next.version > current.version ||
    (next.version === current.version && (next.ackedVersion || 0) >= (current.ackedVersion || 0));

const patchDetail = (state, id, fn) => {
    const detail = state.details[id];
    if (!detail) {
        return state;
    }
    return Object.assign({}, state, {details: Object.assign({}, state.details, {[id]: fn(detail)})});
};

const reducer = (state, action) => {
    switch (action.type) {
    case 'config/ok':
        return Object.assign({}, state, {config: action.config, configError: null});
    case 'config/error':
        return Object.assign({}, state, {configError: action.code});
    case 'devices/loaded':
        return Object.assign({}, state, {devices: action.devices, devicesError: null, unread: action.unread});
    case 'devices/error':
        return Object.assign({}, state, {devicesError: action.code});
    case 'device/upsert': {
        const next = Object.assign({}, state, {devices: mergeDevice(state.devices, action.device)});
        return patchDetail(next, action.device.id, d => Object.assign({}, d, {device: Object.assign({}, d.device, action.device)}));
    }
    case 'device/removed': {
        const details = Object.assign({}, state.details);
        delete details[action.id];
        return Object.assign({}, state, {
            devices: state.devices ? state.devices.filter(d => d.id !== action.id) : state.devices,
            details
        });
    }
    case 'detail/loaded': {
        const detailErrors = Object.assign({}, state.detailErrors);
        delete detailErrors[action.id];
        return Object.assign({}, state, {
            details: Object.assign({}, state.details, {[action.id]: action.detail}),
            detailErrors,
            devices: mergeDevice(state.devices, Object.assign({}, action.detail.device, {latest: action.detail.latest}))
        });
    }
    case 'detail/error':
        return Object.assign({}, state, {detailErrors: Object.assign({}, state.detailErrors, {[action.id]: action.code})});
    case 'control/update':
        return patchDetail(state, action.id, d => {
            const current = d.controls.find(c => c.key === action.control.key);
            if (!newerControl(current, action.control)) {
                return d;
            }
            return Object.assign({}, d, {
                controls: current ?
                    d.controls.map(c => (c.key === action.control.key ? action.control : c)) :
                    d.controls.concat([action.control])
            });
        });
    case 'dashboard/update':
        return patchDetail(state, action.id, d => Object.assign({}, d, {dashboard: action.dashboard}));
    case 'rules/set':
        return patchDetail(state, action.id, d => Object.assign({}, d, {rules: action.rules}));
    case 'live/state':
        return Object.assign({}, state, {live: action.state});
    case 'event/reading': {
        const {deviceId, ts, v} = action.event;
        if (!v || typeof v !== 'object') {
            return state;
        }
        const series = Object.assign({}, state.recent[deviceId] || {});
        Object.keys(v).forEach(key => {
            const list = (series[key] || []).concat([[ts, v[key]]]);
            series[key] = list.length > RECENT_CAP ? list.slice(list.length - RECENT_CAP) : list;
        });
        const devices = state.devices ? state.devices.map(d => (d.id === deviceId ? Object.assign({}, d, {
            latest: mergeLatest(d.latest, ts, v),
            lastSeen: ts,
            status: d.status === 'disabled' ? d.status : 'online'
        }) : d)) : state.devices;
        const next = Object.assign({}, state, {devices, recent: Object.assign({}, state.recent, {[deviceId]: series})});
        return patchDetail(next, deviceId, d => Object.assign({}, d, {
            latest: mergeLatest(d.latest, ts, v),
            device: Object.assign({}, d.device, {
                lastSeen: ts,
                status: d.device.status === 'disabled' ? d.device.status : 'online'
            })
        }));
    }
    case 'event/status': {
        const e = action.event;
        const patch = {status: e.status};
        if (e.status === 'online') {
            if (e.rssi !== undefined) {
                patch.rssi = e.rssi;
            }
            if (e.transport !== undefined) {
                patch.transport = e.transport;
            }
            patch.lastSeen = Date.now();
        } else {
            patch.offlineSince = Date.now();
        }
        return reducer(state, {type: 'device/upsert', device: Object.assign({id: e.deviceId}, patch)});
    }
    case 'alerts/loaded': {
        const items = action.append ? state.alerts.items.concat(action.alerts) : action.alerts;
        return Object.assign({}, state, {
            alerts: {items, nextBefore: action.nextBefore, loaded: true},
            unread: action.unread
        });
    }
    case 'alerts/new': {
        if (state.alerts.items.some(a => a.id === action.alert.id)) {
            return state;
        }
        return Object.assign({}, state, {
            alerts: Object.assign({}, state.alerts, {items: [action.alert].concat(state.alerts.items).slice(0, 200)}),
            unread: state.unread + 1,
            toast: action.alert
        });
    }
    case 'alerts/read':
        return Object.assign({}, state, {
            alerts: Object.assign({}, state.alerts, {
                items: state.alerts.items.map(a => (
                    a.id <= action.upToId && (!action.deviceId || a.deviceId === action.deviceId) ?
                        Object.assign({}, a, {read: true}) : a
                ))
            }),
            unread: Math.max(0, state.unread - action.updated)
        });
    case 'toast/clear':
        return Object.assign({}, state, {toast: null});
    default:
        return state;
    }
};

const notify = alert => {
    try {
        if (typeof Notification === 'undefined' || Notification.permission !== 'granted' || !document.hidden) {
            return;
        }
        const n = new Notification(alert.deviceName || 'TinkerBit Cloud', {
            body: alert.message,
            tag: `tb-alert-${alert.id}`,
            icon: '/static/brand/logo-512.png'
        });
        n.onclick = () => {
            window.focus();
            n.close();
        };
    } catch (err) {
        // Some mobile browsers only allow notifications from a service worker.
    }
};

/** All Cloud data for the signed-in user, kept fresh by the live socket or by polling. */
const useCloudStore = route => {
    const [state, dispatch] = useReducer(reducer, initialState);
    const routeRef = useRef(route);
    routeRef.current = route;

    const configErrorRef = useRef(null);
    const loadConfig = useCallback(async () => {
        try {
            const config = await iotApi.config();
            configErrorRef.current = null;
            dispatch({type: 'config/ok', config});
            return config;
        } catch (err) {
            configErrorRef.current = err;
            dispatch({type: 'config/error', code: err.status === 401 ? 'unauthenticated' : err.code});
            return null;
        }
    }, []);

    const refreshDevices = useCallback(async () => {
        try {
            const res = await iotApi.listDevices();
            dispatch({type: 'devices/loaded', devices: res.devices || [], unread: res.unreadAlerts || 0});
        } catch (err) {
            dispatch({type: 'devices/error', code: err.code});
        }
    }, []);

    const refreshDetail = useCallback(async id => {
        try {
            const detail = await iotApi.getDevice(id);
            dispatch({type: 'detail/loaded', id, detail});
            return detail;
        } catch (err) {
            dispatch({type: 'detail/error', id, code: err.code});
            return null;
        }
    }, []);

    const loadAlerts = useCallback(async ({before} = {}) => {
        try {
            const res = await iotApi.alerts({before, limit: 50});
            dispatch({type: 'alerts/loaded', alerts: res.alerts, nextBefore: res.nextBefore, unread: res.unread, append: Boolean(before)});
        } catch (err) {
            // The alerts list is secondary; the page shows what it already has.
        }
    }, []);

    const refreshAll = useCallback(() => {
        refreshDevices();
        loadAlerts();
        const r = routeRef.current;
        if (r.page === 'device') {
            refreshDetail(r.id);
        }
    }, [refreshDevices, refreshDetail, loadAlerts]);

    const onEvent = useCallback(event => {
        switch (event.type) {
        case 'reading':
            dispatch({type: 'event/reading', event});
            break;
        case 'status':
            dispatch({type: 'event/status', event});
            break;
        case 'control':
            dispatch({type: 'control/update', id: event.deviceId, control: event.control});
            break;
        case 'device':
            if (event.change === 'deleted') {
                dispatch({type: 'device/removed', id: event.deviceId});
            }
            break;
        case 'alert':
            if (event.alert) {
                dispatch({type: 'alerts/new', alert: event.alert});
                notify(event.alert);
            }
            break;
        default:
            break;
        }
    }, []);

    const live = useMemo(() => new LiveClient({
        onEvent,
        onState: s => dispatch({type: 'live/state', state: s}),
        onReconnect: refreshAll
    }), [onEvent, refreshAll]);

    useEffect(() => {
        // Keep trying while the service is unreachable or paused, so an open tab recovers by
        // itself once it is back (and at once when the browser comes back online).
        let cancelled = false;
        let timer = null;
        const later = ms => {
            timer = setTimeout(boot, ms);
        };
        function boot () {
            timer = null;
            loadConfig().then(config => {
                if (cancelled) {
                    return;
                }
                if (!config) {
                    if (isTransient(configErrorRef.current)) {
                        later(BOOT_RETRY_MS);
                    }
                    return;
                }
                if (config.allowed && !config.enabled) {
                    later(PAUSED_RETRY_MS);
                    return;
                }
                if (!config.allowed) {
                    return;
                }
                refreshDevices();
                loadAlerts();
                live.start();
            });
        }
        const onOnline = () => {
            if (timer) {
                clearTimeout(timer);
                boot();
            }
        };
        window.addEventListener('online', onOnline);
        boot();
        return () => {
            cancelled = true;
            clearTimeout(timer);
            window.removeEventListener('online', onOnline);
            live.stop();
        };
    }, [live, loadConfig, refreshDevices, loadAlerts]);

    const ready = Boolean(state.config && state.config.allowed && state.config.enabled);
    useEffect(() => {
        if (!ready || state.live === 'live') {
            return undefined;
        }
        const timer = setInterval(() => {
            if (!document.hidden) {
                refreshAll();
            }
        }, POLL_MS);
        return () => clearInterval(timer);
    }, [ready, state.live, refreshAll]);

    useEffect(() => {
        if (ready && route.page === 'device') {
            refreshDetail(route.id);
        }
    }, [ready, route.page, route.id, refreshDetail]);

    const actions = useMemo(() => ({
        dispatch,
        loadConfig,
        refreshDevices,
        refreshDetail,
        refreshAll,
        loadAlerts,
        retryLive: () => {
            live.stop();
            live.start();
        }
    }), [loadConfig, refreshDevices, refreshDetail, refreshAll, loadAlerts, live]);

    return [state, actions];
};

export {reducer, initialState, useCloudStore};
