import React, {useState} from 'react';

import {errorText, iotApi} from '../../lib/iot-api';
import {KNOWN_UNITS, formatValue, prettyKey, rssiBars, timeAgo} from '../format';
import {SignalBars, StatusDot, useTheme} from '../ui.jsx';

import Chart from './Chart.jsx';

const unitFor = widget => (widget.options && widget.options.unit) || KNOWN_UNITS[widget.key] || '';

const latestFor = (detail, key) => (detail.latest || []).find(r => r.key === key) || null;

/** A reading is stale once the board has missed three of its sends. */
const isStale = (reading, device) => !reading ||
    device.status !== 'online' ||
    Date.now() - reading.ts > Math.max(90e3, (device.intervalSec || 10) * 3000);

const Muted = ({children}) => {
    const K = useTheme();
    return <div style={{fontSize: 11, color: K.dim, marginTop: 4}}>{children}</div>;
};

const ValueWidget = ({widget, detail}) => {
    const K = useTheme();
    const reading = latestFor(detail, widget.key);
    const stale = isStale(reading, detail.device);
    return (
        <div>
            <div style={{fontSize: 34, fontWeight: 800, color: stale ? K.dim : K.text, lineHeight: 1.1}}>
                {formatValue(reading ? reading.value : null, unitFor(widget))}
            </div>
            <Muted>{reading ? `updated ${timeAgo(reading.ts)}` : 'no readings yet'}</Muted>
        </div>
    );
};

const GaugeWidget = ({widget, detail}) => {
    const K = useTheme();
    const reading = latestFor(detail, widget.key);
    const opts = widget.options || {};
    const min = Number.isFinite(opts.min) ? opts.min : 0;
    const max = Number.isFinite(opts.max) ? opts.max : 100;
    const value = reading ? reading.value : null;
    const f = value === null ? 0 : Math.min(1, Math.max(0, (value - min) / (max - min)));
    const angle = Math.PI * (1 - f);
    const r = 50;
    const cx = 60;
    const cy = 60;
    const end = [cx + (r * Math.cos(angle)), cy - (r * Math.sin(angle))];
    const stale = isStale(reading, detail.device);
    return (
        <div style={{textAlign: 'center', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center'}}>
            <svg
                viewBox="0 0 120 70"
                width="100%"
                style={{maxWidth: 220, minHeight: 0, alignSelf: 'center', flex: '0 1 auto'}}
                role="img"
                aria-label={`${widget.title}: ${formatValue(value, unitFor(widget))}`}
            >
                <path d={`M10,60 A50,50 0 0 1 110,60`} fill="none" stroke={K.surface} strokeWidth="10" strokeLinecap="round" />
                {value !== null && f > 0 ? (
                    <path
                        d={`M10,60 A50,50 0 0 1 ${end[0].toFixed(2)},${end[1].toFixed(2)}`}
                        fill="none"
                        stroke={stale ? K.dim : K.accent}
                        strokeWidth="10"
                        strokeLinecap="round"
                    />
                ) : null}
                <text x="60" y="56" textAnchor="middle" fontSize="16" fontWeight="800" fill={stale ? K.dim : K.text}>
                    {formatValue(value, unitFor(widget))}
                </text>
            </svg>
            <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 10, color: K.dim, width: '100%', maxWidth: 220, margin: '0 auto'}}>
                <span>{min}</span>
                <span>{max}</span>
            </div>
            <Muted>{reading ? `updated ${timeAgo(reading.ts)}` : 'no readings yet'}</Muted>
        </div>
    );
};

const controlNote = (control, device, sendError) => {
    if (sendError) {
        return {tone: 'error', text: sendError};
    }
    if (!control) {
        return {tone: 'dim', text: ''};
    }
    if ((control.ackedVersion || 0) >= control.version) {
        return {tone: 'ok', text: 'The board has it'};
    }
    if (device.status !== 'online') {
        return {tone: 'warn', text: 'The board is offline. It changes when it reconnects.'};
    }
    return {tone: 'warn', text: 'Sending to the board…'};
};

const useControlSender = (deviceId, control, onControl) => {
    const [busy, setBusy] = useState(false);
    const [sendError, setSendError] = useState('');
    const send = async value => {
        if (!control) {
            return;
        }
        setBusy(true);
        setSendError('');
        try {
            const res = await iotApi.setControl(deviceId, control.key, {value, expectedVersion: control.version});
            onControl(res.control);
        } catch (err) {
            if (err.code === 'version_conflict' && err.body.control) {
                onControl(err.body.control);
                setSendError('Changed on another screen — showing the latest. Try again if needed.');
            } else {
                setSendError(errorText(err));
            }
        } finally {
            setBusy(false);
        }
    };
    return {busy, sendError, send};
};

const NoteLine = ({note}) => {
    const K = useTheme();
    const color = {ok: K.green, warn: K.orange, error: K.red, dim: K.dim}[note.tone];
    return <div style={{fontSize: 11, color, marginTop: 6, minHeight: 14}}>{note.text}</div>;
};

const SwitchWidget = ({widget, detail, onControl, readOnly}) => {
    const K = useTheme();
    const control = detail.controls.find(c => c.key === widget.key);
    const {busy, sendError, send} = useControlSender(detail.device.id, control, onControl);
    const on = Boolean(control && control.value);
    const disabled = readOnly || !control || busy || detail.device.status === 'disabled';
    return (
        <div>
            <button
                type="button"
                role="switch"
                aria-checked={on}
                aria-label={widget.title || prettyKey(widget.key)}
                disabled={disabled}
                onClick={() => send(on ? 0 : 1)}
                style={{
                    width: 76,
                    height: 42,
                    borderRadius: 21,
                    border: 'none',
                    padding: 4,
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    background: on ? K.green : K.surface,
                    opacity: disabled ? 0.6 : 1,
                    transition: 'background 0.15s',
                    display: 'flex',
                    justifyContent: on ? 'flex-end' : 'flex-start'
                }}
            >
                <span style={{width: 34, height: 34, borderRadius: 17, background: '#fff', display: 'block'}} />
            </button>
            <NoteLine note={controlNote(control, detail.device, sendError)} />
        </div>
    );
};

const SliderWidget = ({widget, detail, onControl, readOnly}) => {
    const K = useTheme();
    const control = detail.controls.find(c => c.key === widget.key);
    const {busy, sendError, send} = useControlSender(detail.device.id, control, onControl);
    const serverValue = control ? control.value : 0;
    const [draft, setDraft] = useState(null);
    const value = draft === null ? serverValue : draft;
    // Sends once on release; while dragging only the local value moves.
    const commit = () => {
        if (busy) {
            return;
        }
        if (draft !== null && draft !== serverValue) {
            send(draft).then(() => setDraft(null));
        } else {
            setDraft(null);
        }
    };
    const disabled = readOnly || !control || busy || detail.device.status === 'disabled';
    return (
        <div>
            <div style={{fontSize: 28, fontWeight: 800, color: K.text}}>{value}</div>
            <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={value}
                disabled={disabled}
                aria-label={widget.title || prettyKey(widget.key)}
                onChange={e => setDraft(Number(e.target.value))}
                onMouseUp={commit}
                onTouchEnd={commit}
                onKeyUp={commit}
                onBlur={commit}
                style={{width: '100%', height: 32, accentColor: K.accent}}
            />
            <NoteLine note={controlNote(control, detail.device, sendError)} />
        </div>
    );
};

const StatusWidget = ({detail}) => {
    const K = useTheme();
    const d = detail.device;
    const label = d.status === 'online' ? 'Online' : (d.status === 'disabled' ? 'Paused' : 'Offline');
    return (
        <div style={{display: 'grid', gap: 6, fontSize: 13, color: K.sub}}>
            <div style={{display: 'flex', alignItems: 'center', gap: 8, fontSize: 18, fontWeight: 800, color: K.text}}>
                <StatusDot status={d.status} size={12} />
                {label}
            </div>
            <div>{d.status === 'online' ? `Since ${timeAgo(d.onlineSince)}` : `Last seen ${timeAgo(d.lastSeen)}`}</div>
            {d.rssi !== null && d.rssi !== undefined ? (
                <div style={{display: 'flex', alignItems: 'center', gap: 6}}>
                    <SignalBars bars={rssiBars(d.rssi)} />
                    <span>{d.rssi} dBm{d.transport === 'wss' ? ' · via port 443' : ''}</span>
                </div>
            ) : null}
        </div>
    );
};

const AlertsWidget = ({detail, alerts}) => {
    const K = useTheme();
    const mine = alerts.filter(a => a.deviceId === detail.device.id).slice(0, 5);
    if (!mine.length) {
        return <div style={{fontSize: 12, color: K.dim}}>No alerts yet.</div>;
    }
    return (
        <ul style={{listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 6}}>
            {mine.map(a => (
                <li key={a.id} style={{fontSize: 13, color: a.read ? K.sub : K.text, fontWeight: a.read ? 400 : 700}}>
                    {a.message}
                    <span style={{display: 'block', fontSize: 11, color: K.dim, fontWeight: 400}}>{timeAgo(a.ts)}</span>
                </li>
            ))}
        </ul>
    );
};

const ChartWidget = ({widget, detail, recent}) => (
    <Chart
        deviceId={detail.device.id}
        readingKey={widget.key}
        unit={unitFor(widget)}
        recent={(recent || {})[widget.key]}
        intervalSec={detail.device.intervalSec}
    />
);

const RENDERERS = {
    value: ValueWidget,
    gauge: GaugeWidget,
    chart: ChartWidget,
    switch: SwitchWidget,
    slider: SliderWidget,
    status: StatusWidget,
    alerts: AlertsWidget
};

const WidgetBody = props => {
    const Renderer = RENDERERS[props.widget.type];
    return Renderer ? <Renderer {...props} /> : null;
};

export {WidgetBody, unitFor};
