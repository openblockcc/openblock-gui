import React, {useState} from 'react';

import {errorText, iotApi} from '../../lib/iot-api';
import {KNOWN_UNITS, READING_KEY_RE, formatValue, labelFor, timeAgo} from '../format';
import {Banner, Button, Card, inputStyle, useTheme} from '../ui.jsx';

const OPS = [
    {id: '<', label: 'drops below'},
    {id: '>', label: 'goes above'},
    {id: '<=', label: 'is at most'},
    {id: '>=', label: 'reaches'}
];
const COOLDOWNS = [0, 60, 300, 900, 3600];
const cooldownLabel = s => {
    if (s === 0) {
        return 'every time';
    }
    return s < 3600 ? `${s / 60} minute${s === 60 ? '' : 's'}` : 'hour';
};

// Readings that are usually a worry when they fall (dry soil, low water, something close).
const WORRY_LOW = {soilMoisture: true, moisture: true, humidity: true, waterLevel: true, distance: true};

const opLabel = op => (OPS.find(o => o.id === op) || OPS[0]).label;

const sentence = (device, rule) => {
    const unit = KNOWN_UNITS[rule.key];
    return `${labelFor(device, rule.key)} ${opLabel(rule.op)} ${formatValue(rule.threshold, unit)}`;
};

const emptyForm = (key, op, threshold) => ({
    key: key || '',
    op: op || '<',
    threshold: threshold === undefined ? '' : String(threshold),
    hysteresis: '',
    cooldownSec: 300,
    message: ''
});

/** Ready-made starting points, one per reading: "Soil moisture drops", "Temperature gets high". */
const presetsFor = detail => (detail.latest || []).slice(0, 4).map(r => {
    const low = Boolean(WORRY_LOW[r.key]);
    const value = Number(r.value);
    const near = Number.isFinite(value) ? Math.round(low ? value * 0.75 : value * 1.25) : '';
    return {
        key: r.key,
        op: low ? '<' : '>',
        threshold: near,
        label: `${labelFor(detail.device, r.key)} ${low ? 'drops' : 'gets high'}`
    };
});

/**
 * A board's alert rules as sentences, and "Tell me when…" to make one. Alerts are checked on the
 * server, so they work while the phone is asleep. onRules gets the new list after each change.
 */
const RulesPanel = ({detail, onRules, openAtStart}) => {
    const K = useTheme();
    const device = detail.device;
    const readingKeys = (detail.latest || []).map(r => r.key);
    const presets = presetsFor(detail);
    const rules = detail.rules || [];
    const [open, setOpen] = useState(Boolean(openAtStart));
    const [form, setForm] = useState(emptyForm(readingKeys[0]));
    const [busy, setBusy] = useState('');
    const [error, setError] = useState('');
    const id = device.id;
    const set = patch => setForm(Object.assign({}, form, patch));

    const run = async (label, fn) => {
        setBusy(label);
        setError('');
        try {
            await fn();
        } catch (err) {
            setError(errorText(err));
        } finally {
            setBusy('');
        }
    };

    const threshold = Number(form.threshold);
    const ready = READING_KEY_RE.test(form.key) && form.threshold !== '' && Number.isFinite(threshold);
    const autoMessage = ready ? `${device.name}: ${sentence(device, {key: form.key, op: form.op, threshold})}` : '';
    const note = form.message.trim();

    const save = e => {
        e.preventDefault();
        const hysteresis = form.hysteresis === '' ? 0 : Number(form.hysteresis);
        if (!READING_KEY_RE.test(form.key)) {
            setError('Pick which reading to watch.');
            return;
        }
        if (!ready) {
            setError('Type the number to compare with.');
            return;
        }
        if (!Number.isFinite(hysteresis) || hysteresis < 0) {
            setError('Small wobbles must be zero or more.');
            return;
        }
        run('add', async () => {
            const res = await iotApi.createRule(id, {
                key: form.key,
                op: form.op,
                threshold,
                hysteresis,
                cooldownSec: Number(form.cooldownSec),
                message: (note ? `${autoMessage}. ${note}` : autoMessage).slice(0, 120)
            });
            onRules(rules.concat([res.rule]));
            setForm(emptyForm(form.key));
            setOpen(false);
        });
    };

    const toggle = rule => run(rule.id, async () => {
        const res = await iotApi.updateRule(id, rule.id, {enabled: !rule.enabled});
        onRules(rules.map(r => (r.id === rule.id ? res.rule : r)));
    });

    const remove = rule => run(rule.id, async () => {
        try {
            await iotApi.deleteRule(id, rule.id);
        } catch (err) {
            if (err.code !== 'not_found') {
                throw err;
            }
        }
        onRules(rules.filter(r => r.id !== rule.id));
    });

    const select = Object.assign(inputStyle(K), {
        background: K.lilac || K.canvas,
        fontWeight: 700
    });

    return (
        <div style={{display: 'grid', gap: 12}}>
            {error ? <Banner tone="error">{error}</Banner> : null}

            {rules.length ? (
                <Card style={{padding: 0, overflow: 'hidden'}}>
                    {rules.map((rule, i) => (
                        <div
                            key={rule.id}
                            style={{
                                display: 'flex',
                                gap: 10,
                                alignItems: 'center',
                                flexWrap: 'wrap',
                                padding: '12px 16px',
                                borderTop: i ? `1px solid ${K.line || K.border}` : 'none',
                                opacity: rule.enabled ? 1 : 0.6
                            }}
                        >
                            <div style={{flex: 1, minWidth: 200}}>
                                <div style={{fontWeight: 700, fontSize: 15}}>When {sentence(device, rule)}</div>
                                <div style={{fontSize: 13, color: K.dim, marginTop: 2}}>
                                    {rule.enabled ? `At most every ${cooldownLabel(rule.cooldownSec)}` : 'Paused'}
                                    {rule.active ? ' · happening now' : ''}
                                    {rule.lastFired ? ` · last ${timeAgo(rule.lastFired)}` : ''}
                                </div>
                            </div>
                            <Button disabled={busy === rule.id} onClick={() => toggle(rule)}>{rule.enabled ? 'Pause' : 'Turn on'}</Button>
                            <Button kind="ghost" style={{color: K.red}} disabled={busy === rule.id} onClick={() => remove(rule)}>Delete</Button>
                        </div>
                    ))}
                </Card>
            ) : null}

            {!readingKeys.length ? (
                <div style={{fontSize: 14, color: K.dim}}>Alerts can watch a reading once the board has sent one.</div>
            ) : null}

            {readingKeys.length && !open ? (
                <div>
                    <Button kind="primary" onClick={() => setOpen(true)}>+ Tell me when…</Button>
                </div>
            ) : null}

            {readingKeys.length && open ? (
                <Card kind="bold">
                    <form onSubmit={save} style={{display: 'grid', gap: 14}}>
                        <h3 style={{margin: 0, fontFamily: K.fontDisplay, fontSize: 22}}>Tell me when…</h3>
                        {presets.length ? (
                            <div style={{display: 'flex', flexWrap: 'wrap', gap: 8}}>
                                {presets.map(p => {
                                    const on = form.key === p.key && form.op === p.op;
                                    return (
                                        <button
                                            key={`${p.key}${p.op}`}
                                            type="button"
                                            aria-pressed={on}
                                            onClick={() => set({key: p.key, op: p.op, threshold: String(p.threshold)})}
                                            style={{
                                                minHeight: 40,
                                                padding: '0 14px',
                                                borderRadius: 999,
                                                border: on ? `2px solid ${K.ink || K.border}` : `1.5px solid ${K.border}`,
                                                background: on ? (K.gold || K.accent) : K.panel,
                                                color: on ? (K.onGold || '#fff') : K.text,
                                                fontFamily: K.fontBody,
                                                fontSize: 14,
                                                fontWeight: on ? 700 : 500,
                                                cursor: 'pointer'
                                            }}
                                        >
                                            {p.label}
                                        </button>
                                    );
                                })}
                            </div>
                        ) : null}
                        <div style={{display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, fontSize: 17}}>
                            <span>When</span>
                            <select aria-label="Reading" value={form.key} onChange={e => set({key: e.target.value})} style={select}>
                                {readingKeys.map(k => <option key={k} value={k}>{labelFor(device, k)}</option>)}
                            </select>
                            <select aria-label="Comparison" value={form.op} onChange={e => set({op: e.target.value})} style={select}>
                                {OPS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                            </select>
                            <input
                                aria-label="Number"
                                type="number"
                                inputMode="decimal"
                                value={form.threshold}
                                onChange={e => set({threshold: e.target.value})}
                                style={Object.assign({}, select, {width: 96})}
                            />
                            {KNOWN_UNITS[form.key] ? <span>{KNOWN_UNITS[form.key]}</span> : null}
                        </div>
                        <label style={{display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, fontSize: 15, color: K.sub}}>
                            Tell me at most every
                            <select value={form.cooldownSec} onChange={e => set({cooldownSec: Number(e.target.value)})} style={inputStyle(K)}>
                                {COOLDOWNS.map(s => <option key={s} value={s}>{cooldownLabel(s)}</option>)}
                            </select>
                        </label>
                        <details style={{fontSize: 14, color: K.sub}}>
                            <summary style={{cursor: 'pointer', minHeight: 32}}>More: ignore small wobbles</summary>
                            <label style={{display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 8}}>
                                After an alert, wait until it moves back by
                                <input
                                    type="number"
                                    min="0"
                                    inputMode="decimal"
                                    value={form.hysteresis}
                                    placeholder="0"
                                    onChange={e => set({hysteresis: e.target.value})}
                                    style={Object.assign(inputStyle(K), {width: 90})}
                                />
                                {KNOWN_UNITS[form.key] || ''} before it can alert again.
                            </label>
                        </details>
                        <label style={{display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14, color: K.sub}}>
                            Add a note (optional)
                            <input value={form.message} maxLength={80} onChange={e => set({message: e.target.value})} style={inputStyle(K)} />
                        </label>
                        {ready ? (
                            <div style={{background: K.lilac || K.surface, borderRadius: 14, padding: '12px 14px', fontSize: 14, lineHeight: 1.45}}>
                                <b>You will get:</b> “{note ? `${autoMessage}. ${note}` : autoMessage}”
                            </div>
                        ) : null}
                        <div style={{display: 'flex', gap: 10, flexWrap: 'wrap'}}>
                            <Button kind="primary" type="submit" disabled={busy === 'add' || !ready}>{busy === 'add' ? 'Saving…' : 'Save alert'}</Button>
                            <Button onClick={() => setOpen(false)}>Cancel</Button>
                        </div>
                    </form>
                </Card>
            ) : null}
        </div>
    );
};

export default RulesPanel;
