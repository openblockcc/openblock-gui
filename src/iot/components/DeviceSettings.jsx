import React, {useState} from 'react';

import {writeToken} from '../../beginner-studio/domain/cloudSecrets';
import {errorText, iotApi} from '../../lib/iot-api';
import {labelFor, timeAgo} from '../format';
import {navigate} from '../router';
import {Banner, Button, Card, Field, inputStyle, useTheme} from '../ui.jsx';

const INTERVALS = [5, 10, 15, 30, 60, 300, 900, 3600];
// 120 s is what new controls start with (the firmware's default), so it must be a choice here.
const FAILSAFE = [0, 10, 30, 60, 120, 300, 900, 3600];

const durationLabel = s => {
    if (s === 0) {
        return 'never';
    }
    if (s < 60) {
        return `${s} s`;
    }
    return s < 3600 ? `${s / 60} min` : `${s / 3600} h`;
};

/**
 * Name, send interval, failsafe values, key and delete for one board.
 * Inside Studio: `simple` folds the failsafe, key and delete cards under "Advanced", `onDeleted(id)`
 * replaces the jump back to the boards list, `onNewKey(id)` hears about a new key, `onChanged(device)`
 * hears about a new name or interval, and `deleteNote` / `intervalHint` adjust the wording.
 */
const DeviceSettings = ({detail, config, actions, simple, onDeleted, onNewKey, onChanged, deleteNote, intervalHint}) => {
    const K = useTheme();
    const device = detail.device;
    const [name, setName] = useState(device.name);
    const [busy, setBusy] = useState('');
    const [error, setError] = useState('');
    const [done, setDone] = useState('');
    const [confirmName, setConfirmName] = useState('');
    const [allControls, setAllControls] = useState(false);
    const email = config.user ? config.user.email : null;
    const minInterval = config.limits.minIntervalSec;
    // Controls this board uses: on its dashboard, ever changed, or named by Studio.
    const onDashboard = {};
    ((detail.dashboard && detail.dashboard.layout) || []).forEach(w => {
        if (w.key) {
            onDashboard[w.key] = true;
        }
    });
    // A control starts at version 1; a later version, a board's ack or a person's change means it is in use.
    const used = c => onDashboard[c.key] || (c.version || 0) > 1 || (c.ackedVersion || 0) > 0 || Boolean(c.updatedBy) ||
        Boolean(device.labels && device.labels[c.key]);
    const shownControls = allControls ? detail.controls : detail.controls.filter(used);
    const hiddenControls = detail.controls.length - detail.controls.filter(used).length;

    const run = async (label, fn) => {
        setBusy(label);
        setError('');
        setDone('');
        try {
            await fn();
        } catch (err) {
            setError(errorText(err));
        } finally {
            setBusy('');
        }
    };

    const patchDevice = (label, body, message) => run(label, async () => {
        const res = await iotApi.updateDevice(device.id, body);
        actions.dispatch({type: 'device/upsert', device: res.device});
        setDone(message);
        if (onChanged) {
            onChanged(res.device);
        }
    });

    const regenerate = () => {
        if (!window.confirm('Make a new key? The board stops connecting until you upload from Beginner Studio again.')) {
            return;
        }
        run('token', async () => {
            const res = await iotApi.regenerateToken(device.id);
            writeToken(email, device.id, res.token);
            await actions.refreshDetail(device.id);
            setDone(onNewKey ?
                'New key saved on this computer. Upload again so the board uses it.' :
                'New key saved on this computer. Upload from Beginner Studio to update the board.');
            if (onNewKey) {
                onNewKey(device.id);
            }
        });
    };

    const enable = () => run('enable', async () => {
        const res = await iotApi.enableDevice(device.id);
        actions.dispatch({type: 'device/upsert', device: res.device});
        setDone('Board turned back on.');
    });

    const setFailsafe = (control, patch) => run(control.key, async () => {
        try {
            const res = await iotApi.setControl(device.id, control.key, Object.assign({expectedVersion: control.version}, patch));
            actions.dispatch({type: 'control/update', id: device.id, control: res.control});
        } catch (err) {
            if (err.code === 'version_conflict' && err.body.control) {
                actions.dispatch({type: 'control/update', id: device.id, control: err.body.control});
            }
            throw err;
        }
    });

    const remove = () => run('delete', async () => {
        await iotApi.deleteDevice(device.id);
        writeToken(email, device.id, null);
        actions.dispatch({type: 'device/removed', id: device.id});
        if (onDeleted) {
            onDeleted(device.id);
        } else {
            navigate('/iot', {replace: true});
        }
    });

    const fold = (title, cards) => (
        <details style={{border: `1.5px solid ${K.border}`, borderRadius: 18, padding: '12px 16px', background: K.panel}}>
            <summary style={{cursor: 'pointer', fontWeight: 700, fontSize: 15, color: K.sub, minHeight: 28}}>{title}</summary>
            <div style={{display: 'grid', gap: 12, marginTop: 12}}>{cards}</div>
        </details>
    );
    const cardTitle = text => <div style={{fontFamily: K.fontDisplay, fontWeight: 700, fontSize: 17, marginBottom: 6}}>{text}</div>;

    const failsafeCard = (
        <Card>
            {cardTitle('If the WiFi drops')}
            <div style={{fontSize: 14, color: K.dim, marginBottom: 12, lineHeight: 1.5}}>
                After this long offline, the board sets a control to a safe value by itself (for example, pump off).
            </div>
            {shownControls.length ? null : (
                <div style={{fontSize: 14, color: K.sub, marginBottom: 8}}>This board’s program does not use any dashboard controls yet.</div>
            )}
            <div style={{display: 'grid', gap: 10}}>
                {shownControls.map(c => (
                    <div key={c.key} style={{display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap'}}>
                        <span style={{width: 120, fontWeight: 700, fontSize: 15}}>{labelFor(device, c.key)}</span>
                        <select
                            aria-label={`${labelFor(device, c.key)}: when to change it`}
                            value={c.failsafeSec}
                            disabled={busy === c.key}
                            onChange={e => setFailsafe(c, {failsafeSec: Number(e.target.value)})}
                            style={inputStyle(K)}
                        >
                            {FAILSAFE.map(s => <option key={s} value={s}>{s === 0 ? 'keep its last value' : `after ${durationLabel(s)}`}</option>)}
                        </select>
                        {c.failsafeSec > 0 && c.kind === 'switch' ? (
                            <select
                                aria-label={`${labelFor(device, c.key)}: safe value`}
                                value={c.failsafeValue}
                                disabled={busy === c.key}
                                onChange={e => setFailsafe(c, {failsafeValue: Number(e.target.value)})}
                                style={inputStyle(K)}
                            >
                                <option value={0}>turn off</option>
                                <option value={1}>turn on</option>
                            </select>
                        ) : null}
                        {c.failsafeSec > 0 && c.kind !== 'switch' ? (
                            <input
                                type="number"
                                min="0"
                                max="100"
                                aria-label={`${labelFor(device, c.key)}: safe value`}
                                defaultValue={c.failsafeValue}
                                disabled={busy === c.key}
                                onBlur={e => {
                                    const v = Math.round(Number(e.target.value));
                                    if (Number.isFinite(v) && v !== c.failsafeValue && v >= 0 && v <= 100) {
                                        setFailsafe(c, {failsafeValue: v});
                                    }
                                }}
                                style={Object.assign(inputStyle(K), {width: 90})}
                            />
                        ) : null}
                    </div>
                ))}
            </div>
            {hiddenControls > 0 ? (
                <Button kind="ghost" style={{marginTop: 8, paddingLeft: 0}} onClick={() => setAllControls(!allControls)}>
                    {allControls ? 'Only the controls this board uses' : `Show all ${detail.controls.length} controls`}
                </Button>
            ) : null}
        </Card>
    );

    return (
        <div style={{display: 'grid', gap: 12}}>
            {error ? <Banner tone="error">{error}</Banner> : null}
            {done ? <Banner tone="ok">{done}</Banner> : null}

            {device.status === 'disabled' ? (
                <Banner
                    tone="error"
                    action={<Button kind="primary" disabled={busy === 'enable'} onClick={enable}>Turn back on</Button>}
                >
                    This board is paused{device.disabledReason === 'flooding' ? ' because it sent data too fast. Fix the program (use a Wait block), upload, then turn it back on.' : '.'}
                </Banner>
            ) : null}
            {device.warning ? (
                <Banner
                    tone="warn"
                    action={<Button onClick={() => patchDevice('warn', {clearWarning: true}, 'Warning cleared.')}>Dismiss</Button>}
                >
                    {device.warning === 'restarting' ?
                        'This board keeps reconnecting. Check its power and USB cable, or make sure no other board uses the same key.' :
                        device.warning}
                </Banner>
            ) : null}

            <Card>
                {cardTitle('Name')}
                <div style={{display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center'}}>
                    <input
                        aria-label="Board name"
                        value={name}
                        maxLength={40}
                        onChange={e => setName(e.target.value)}
                        style={Object.assign(inputStyle(K), {width: 260})}
                    />
                    <Button
                        disabled={busy === 'name' || !name.trim() || name.trim() === device.name}
                        onClick={() => patchDevice('name', {name: name.trim()}, 'Name saved.')}
                    >
                        Save name
                    </Button>
                </div>
            </Card>

            {detail.controls.length && simple ? fold('If the WiFi drops', failsafeCard) : null}
            {detail.controls.length && !simple ? failsafeCard : null}

            {fold('Advanced: readings interval, board key, delete', (
                <React.Fragment>
                    <Card>
                        {cardTitle('How often it sends readings')}
                        <Field label="The board sends readings" hint={intervalHint || 'Beginner Studio sets this when you upload; change it there too.'}>
                            <select
                                value={device.intervalSec}
                                onChange={e => patchDevice('interval', {intervalSec: Number(e.target.value)}, 'Interval saved.')}
                                style={Object.assign(inputStyle(K), {width: 200})}
                            >
                                {INTERVALS.filter(s => s >= minInterval || s === device.intervalSec).map(s => (
                                    <option key={s} value={s}>every {durationLabel(s)}</option>
                                ))}
                            </select>
                        </Field>
                    </Card>

                    <Card>
                        {cardTitle('Board key')}
                        <div style={{fontSize: 14, color: K.dim, marginBottom: 12, lineHeight: 1.5}}>
                            Key starting <code>{device.tokenPrefix}…</code> · board made {timeAgo(device.createdAt)}.
                            Make a new key if this one leaked (for example, the code was shared with the key in it).
                        </div>
                        <Button disabled={busy === 'token'} onClick={regenerate}>Make a new key</Button>
                    </Card>

                    <Card style={{border: `1.5px solid ${K.red}`}}>
                        <div style={{fontFamily: K.fontDisplay, fontWeight: 700, fontSize: 17, marginBottom: 6, color: K.red}}>Delete board</div>
                        <div style={{fontSize: 14, color: K.dim, marginBottom: 12, lineHeight: 1.5}}>
                            The board stops connecting at once; its readings, dashboard and alerts are erased within 7 days.
                            {deleteNote ? ` ${deleteNote}` : ''} Type its name to confirm.
                        </div>
                        <div style={{display: 'flex', gap: 10, flexWrap: 'wrap'}}>
                            <input
                                value={confirmName}
                                onChange={e => setConfirmName(e.target.value)}
                                placeholder={device.name}
                                aria-label="Type the board name to confirm"
                                style={Object.assign(inputStyle(K), {width: 240})}
                            />
                            <Button kind="danger" disabled={busy === 'delete' || confirmName.trim() !== device.name} onClick={remove}>
                                Delete forever
                            </Button>
                        </div>
                    </Card>
                </React.Fragment>
            ))}
        </div>
    );
};

export default DeviceSettings;
