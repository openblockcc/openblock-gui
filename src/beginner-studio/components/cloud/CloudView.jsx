import React, {useEffect, useMemo} from 'react';

import {useStudio} from '../../context/StudioContext.jsx';
import {useUpload} from '../../context/UploadContext.jsx';
import {keyTitles} from '../../domain/cloudPanel';
import useCloudSetup from '../../hooks/useCloudSetup';
import {KNOWN_UNITS, formatValue, labelFor, statusText} from '../../../iot/format';
import {useCloudStore} from '../../../iot/store';

import BoardStep from './BoardStep.jsx';
import LiveStep, {PhoneLink} from './LiveStep.jsx';
import UploadStep from './UploadStep.jsx';
import WifiStep from './WifiStep.jsx';
import {Button, Note, ui} from './wizardUi.jsx';

const isLocalHost = () => {
    const host = window.location.hostname;
    return host === 'localhost' || host === '127.0.0.1';
};

const Card = ({K, children, style}) => (
    <div
        style={Object.assign({
            background: K.panel,
            border: `1px solid ${K.border}`,
            borderRadius: 14,
            padding: 18
        }, style)}
    >
        {children}
    </div>
);

/** A numbered checklist item: a tick when done, open while it is the step being worked on. */
const Item = ({K, n, state, title, summary, onChange, changeLabel, children}) => {
    const done = state === 'done';
    const open = state === 'active';
    return (
        <li
            aria-current={open ? 'step' : undefined}
            style={{
                background: K.panel,
                border: `1px solid ${open ? K.accent : K.border}`,
                borderRadius: 14,
                padding: '14px 16px',
                display: 'flex',
                gap: 12,
                alignItems: 'flex-start'
            }}
        >
            <span
                aria-hidden="true"
                style={{
                    flex: 'none',
                    width: 26,
                    height: 26,
                    borderRadius: 13,
                    marginTop: 1,
                    background: done ? K.green : (open ? K.accent : K.surface),
                    color: done || open ? '#fff' : K.dim,
                    fontSize: 13,
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
            >
                {done ? '✓' : n}
            </span>
            <div style={{flex: 1, minWidth: 0}}>
                <div style={{display: 'flex', alignItems: 'baseline', gap: 10, justifyContent: 'space-between', flexWrap: 'wrap'}}>
                    <span style={{fontWeight: 700, fontSize: 15, color: state === 'waiting' ? K.dim : K.text}}>
                        {done && summary ? summary : title}
                        <span style={{position: 'absolute', width: 1, height: 1, overflow: 'hidden'}}>{done ? ' (done)' : ''}</span>
                    </span>
                    {done && onChange ? (
                        <button
                            type="button"
                            onClick={onChange}
                            style={{border: 'none', background: 'transparent', color: K.accent, fontWeight: 700, fontSize: 13, cursor: 'pointer', padding: 4}}
                        >
                            {changeLabel || 'Change'}
                        </button>
                    ) : null}
                </div>
                {open ? <div style={{marginTop: 10}}>{children}</div> : null}
            </div>
        </li>
    );
};

/** Readings and controls of the project's board, live, plus the way to open it on a phone. */
const LiveCard = ({K, w, titleFor}) => {
    const deviceId = w.cloud.deviceId;
    const route = useMemo(() => ({page: 'device', id: deviceId}), [deviceId]);
    const [state] = useCloudStore(route);
    const detail = state.details[deviceId];
    const device = (detail && detail.device) || (state.devices || []).find(d => d.id === deviceId) || null;
    const name = (device && device.name) || w.cloud.deviceName;
    const readings = detail ? (detail.latest || []).slice(0, 4) : [];
    const controls = detail ? (detail.controls || []).filter(c => (c.version || 0) > 1 || (c.ackedVersion || 0) > 0) : [];
    const nameOf = key => (titleFor && titleFor(key)) || labelFor(device, key);
    const online = device && device.status === 'online';

    return (
        <div style={{display: 'grid', gap: 14}}>
            <Card K={K}>
                <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12}}>
                    <span style={{fontSize: 12, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: K.dim}}>Live now</span>
                    {device ? (
                        <span
                            style={{
                                fontSize: 12,
                                fontWeight: 700,
                                padding: '3px 10px',
                                borderRadius: 999,
                                background: online ? `${K.green}26` : K.surface,
                                color: online ? K.green : K.sub
                            }}
                        >
                            {statusText(device)}
                        </span>
                    ) : null}
                </div>
                {readings.length || controls.length ? (
                    <div style={{display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8}}>
                        {readings.map(r => (
                            <div key={r.key} style={{background: K.surface, borderRadius: 10, padding: '10px 12px', minWidth: 0}}>
                                <div style={{fontSize: 12, color: K.sub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>{nameOf(r.key)}</div>
                                <div style={{fontSize: 20, fontWeight: 700, color: K.text}}>{formatValue(r.value, KNOWN_UNITS[r.key])}</div>
                            </div>
                        ))}
                        {controls.map(c => (
                            <div key={c.key} style={{background: K.surface, borderRadius: 10, padding: '10px 12px', minWidth: 0}}>
                                <div style={{fontSize: 12, color: K.sub}}>{nameOf(c.key)}</div>
                                <div style={{fontSize: 16, fontWeight: 700, color: K.text}}>
                                    {c.kind === 'switch' ? (c.value ? 'On' : 'Off') : c.value}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div style={{fontSize: 13, color: K.sub, lineHeight: 1.5}}>
                        {device && device.lastSeen ? 'No readings yet.' : 'Readings show up here once the board is online.'}
                    </div>
                )}
            </Card>
            <Card K={K}>
                <div style={{fontWeight: 700, fontSize: 15, color: K.text, marginBottom: 10}}>Open it on your phone</div>
                <PhoneLink K={K} id={deviceId} name={name} />
            </Card>
        </div>
    );
};

/**
 * The Cloud page in Studio: one checklist (board, WiFi, upload and going live) and, once the
 * project has a board, its live values and a QR code. The dashboard itself lives in TinkerBit
 * Cloud (/iot), never inside Studio.
 */
const CloudPanel = ({K, w, step, error, cloudLive}) => {
    const {connections, ai} = useStudio();
    const titleFor = useMemo(() => keyTitles(connections, ai), [connections, ai]);
    const waiting = cloudLive.stage === 'uploading' || cloudLive.stage === 'waiting';
    const setUp = Boolean(w.cloud);
    // "live" without a board means the link was removed: start again at the board.
    const at = step === 'live' && !setUp ? 'board' : step;
    const home = at === 'live' && setUp && !waiting;
    const ssid = (w.wifi && w.wifi.ssid) || (w.cloud && w.cloud.ssid) || '';

    const stateOf = item => {
        const order = ['board', 'wifi', 'go'];
        const current = at === 'board' ? 'board' : (at === 'wifi' ? 'wifi' : 'go');
        if (item === 'go' && home) {
            return 'done';
        }
        if (item === current) {
            return 'active';
        }
        return order.indexOf(item) < order.indexOf(current) ? 'done' : 'waiting';
    };

    let goBody = null;
    if (at === 'upload') {
        goBody = <UploadStep w={w} />;
    } else if (at === 'live' && waiting) {
        goBody = <LiveStep w={w} />;
    }

    return (
        <div style={{display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-start', maxWidth: 1040, margin: '0 auto'}}>
            <div style={{flex: '1 1 460px', maxWidth: 640, minWidth: 0, display: 'grid', gap: 14}}>
                <div>
                    <h2 style={{margin: 0, fontSize: 22, color: K.text}}>Cloud</h2>
                    <div style={{fontSize: 14, color: K.sub, marginTop: 4}}>
                        Your phone can see this board’s readings and control it, over WiFi.
                    </div>
                </div>
                {error ? <Note K={K} tone="red" title={error} /> : null}
                <ol aria-label="Cloud setup" style={{listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10}}>
                    <Item
                        K={K}
                        n={1}
                        state={stateOf('board')}
                        title="Your Cloud board"
                        summary={`Cloud board “${w.boardName}”`}
                        onChange={w.goBoard}
                        changeLabel="Change"
                    >
                        <BoardStep w={w} />
                    </Item>
                    <Item
                        K={K}
                        n={2}
                        state={stateOf('wifi')}
                        title="WiFi for the board"
                        summary={ssid ? `WiFi “${ssid}”` : 'WiFi'}
                        onChange={w.fixWifi}
                    >
                        <WifiStep w={w} />
                    </Item>
                    <Item
                        K={K}
                        n={3}
                        state={stateOf('go')}
                        title="Upload and go live"
                        summary="On your board and live"
                        onChange={w.goUpload}
                        changeLabel="Upload again"
                    >
                        {goBody}
                    </Item>
                </ol>
                {setUp ? (
                    <details style={{fontSize: 13, color: K.sub}}>
                        <summary style={{cursor: 'pointer', minHeight: 28}}>Board key and other settings</summary>
                        <div style={{display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10}}>
                            <Button K={K} disabled={Boolean(w.busy)} onClick={w.newKeyAndUpload}>Make a new key</Button>
                            <Button K={K} onClick={w.unlink}>Unlink this project</Button>
                            <Button K={K} onClick={w.forget}>Forget WiFi and keys on this computer</Button>
                        </div>
                        <div style={{marginTop: 8, lineHeight: 1.5}}>
                            Dashboards, alerts and board settings are in TinkerBit Cloud: <a href="/iot" target="_blank" rel="noopener noreferrer" style={{color: K.accent, fontWeight: 700}}>open it</a>.
                        </div>
                    </details>
                ) : null}
            </div>
            {setUp ? (
                <aside aria-label="Your board, live" style={{flex: '1 1 300px', maxWidth: 380, minWidth: 0}}>
                    <LiveCard K={K} w={w} titleFor={titleFor} />
                </aside>
            ) : null}
        </div>
    );
};

const SetupCard = ({K, children}) => (
    <Card K={K} style={{maxWidth: 560, margin: '0 auto'}}>{children}</Card>
);

/**
 * The Cloud page: the setup checklist and, once linked, the board live.
 * Stays mounted (but draws nothing) on the other tabs so a half-typed WiFi password survives.
 */
const CloudView = () => {
    const studio = useStudio();
    const {K, view, setView} = studio;
    const {cloudLive} = useUpload();
    const active = view === 'cloud';
    const {phase, phaseNote, step, error, email, load, w} = useCloudSetup({studio, cloudLive, active});

    // First upload of a never-seen board from the top bar: show the student the checklist.
    useEffect(() => {
        if (!active && cloudLive.stage === 'waiting' && cloudLive.device && cloudLive.device.status === 'never') {
            setView('cloud');
        }
    }, [cloudLive.stage]);

    if (!active) {
        return null;
    }

    const s = ui(K);
    const message = (title, body, action) => (
        <SetupCard K={K}>
            <h3 style={s.title}>{title}</h3>
            <div style={s.lead}>{body}</div>
            {action}
        </SetupCard>
    );

    let content;
    if (phase === 'loading' || !step) {
        content = <div style={{fontSize: 13, color: K.sub, textAlign: 'center'}}>Opening Cloud…</div>;
    } else if (phase === 'signed_out') {
        content = message(
            'Sign in to use Cloud',
            isLocalHost() ?
                'You are running Studio locally without the sign-in service, so Cloud is off. Everything else works.' :
                'Cloud keeps your boards under your account, so you need to be signed in.',
            isLocalHost() ? null : (
                <a href={`/login?next=${encodeURIComponent('/beginner')}`} style={{color: K.accent, fontWeight: 700}}>
                    Sign in
                </a>
            )
        );
    } else if (phase === 'offline') {
        content = message(
            'You are offline',
            'Reconnect to the internet. This tries again by itself as soon as you are back online.',
            <Button K={K} kind="primary" onClick={() => load()}>Try again</Button>
        );
    } else if (phase === 'unreachable') {
        content = message(
            'Cloud cannot connect right now',
            isLocalHost() ?
                'The Cloud service is not running. Start it with “npm start” in services/iot-api, then retry.' :
                `${phaseNote || 'TinkerBit Cloud is not available right now.'} Everything else in Studio still works.`,
            <Button K={K} kind="primary" onClick={() => load()}>Try again</Button>
        );
    } else if (phase === 'disabled') {
        content = message(
            'Cloud is paused',
            'TinkerBit Cloud is down for maintenance. Your boards keep running their programs and reconnect by themselves.',
            <Button K={K} onClick={() => load()}>Check again</Button>
        );
    } else if (phase === 'not_in_pilot') {
        content = message(
            'Cloud is in a private pilot',
            `Your account${email ? ` (${email})` : ''} is not on the pilot list yet. Ask your teacher to add it.`
        );
    }

    return (
        <main
            aria-label="Cloud"
            style={{flex: 1, minHeight: 0, overflow: 'auto', background: K.canvas}}
        >
            {content ? (
                <div style={{maxWidth: 820, margin: '0 auto', padding: '20px 16px 40px'}}>
                    {content}
                    {error ? (
                        <div style={{maxWidth: 560, margin: '0 auto'}}>
                            <Note K={K} tone="red" title={error} />
                        </div>
                    ) : null}
                </div>
            ) : (
                <div style={{padding: '24px 16px 48px'}}>
                    <CloudPanel K={K} w={w} step={step} error={error} cloudLive={cloudLive} />
                </div>
            )}
        </main>
    );
};

export {CloudPanel};
export default CloudView;
