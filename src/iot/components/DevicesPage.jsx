import React, {useState} from 'react';

import {writeToken} from '../../beginner-studio/domain/cloudSecrets';
import {errorText, iotApi} from '../../lib/iot-api';
import {KNOWN_UNITS, formatValue, labelFor, statusText} from '../format';
import {linkTo, navigate} from '../router';
import {Banner, Button, Card, StatusPill, inputStyle, useTheme} from '../ui.jsx';

/** Readings shown on a board's card. */
const CARD_READINGS = 3;

const BoardCard = ({device}) => {
    const K = useTheme();
    const offline = device.status !== 'online';
    const readings = (device.latest || []).slice(0, CARD_READINGS);
    return (
        <a
            href={`/iot/d/${device.id}`}
            onClick={linkTo(`/iot/d/${device.id}`)}
            style={{textDecoration: 'none', color: 'inherit', display: 'block'}}
        >
            <Card kind={offline ? 'dashed' : 'bold'} style={{height: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 12}}>
                <div style={{display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between'}}>
                    <span
                        style={{
                            fontFamily: K.fontDisplay,
                            fontWeight: 700,
                            fontSize: 19,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        {device.name}
                    </span>
                    <StatusPill status={device.status} text={statusText(device)} />
                </div>
                {readings.length ? (
                    <div style={{display: 'grid', gridTemplateColumns: `repeat(${readings.length}, minmax(0, 1fr))`, gap: 8, opacity: offline ? 0.75 : 1}}>
                        {readings.map(r => (
                            <div key={r.key} style={{minWidth: 0}}>
                                <div style={{fontSize: 13, color: K.dim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
                                    {labelFor(device, r.key)}
                                </div>
                                <div style={{fontSize: 20, fontWeight: 700}}>{formatValue(r.value, KNOWN_UNITS[r.key])}</div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div style={{fontSize: 14, color: K.dim}}>
                        {device.lastSeen ? 'No readings yet.' : 'Upload a Cloud project from Beginner Studio to connect it.'}
                    </div>
                )}
                {offline && readings.length && device.status !== 'disabled' ? (
                    <div style={{fontSize: 13, color: K.dim}}>These are its last readings. Check its power and WiFi.</div>
                ) : null}
                {device.warning ? (
                    <div style={{fontSize: 13, color: K.orange, fontWeight: 700}}>Needs attention: open it for details</div>
                ) : null}
            </Card>
        </a>
    );
};

/** For people without Studio at hand: a board made here, uploaded later. */
const AddByHand = ({state, actions}) => {
    const K = useTheme();
    const [name, setName] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const devices = state.devices;
    const limit = state.config.limits.maxDevices;
    const email = state.config.user ? state.config.user.email : null;

    const create = async e => {
        e.preventDefault();
        const trimmed = name.trim();
        if (!trimmed) {
            setError('Give the board a name.');
            return;
        }
        setBusy(true);
        setError('');
        try {
            const res = await iotApi.createDevice(trimmed);
            // Same origin as Beginner Studio, so Studio can upload with this key straight away.
            writeToken(email, res.device.id, res.token);
            actions.dispatch({type: 'device/upsert', device: Object.assign({latest: []}, res.device)});
            setName('');
            navigate(`/iot/d/${res.device.id}`);
        } catch (err) {
            setError(errorText(err));
        } finally {
            setBusy(false);
        }
    };

    return (
        <details style={{marginTop: 20, fontSize: 14, color: K.sub}}>
            <summary style={{cursor: 'pointer', minHeight: 44, display: 'flex', alignItems: 'center', color: K.accent, fontWeight: 700}}>
                Add a board without Beginner Studio
            </summary>
            <form onSubmit={create} style={{display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginTop: 8}}>
                <input
                    value={name}
                    maxLength={40}
                    onChange={e => setName(e.target.value)}
                    placeholder="Board name"
                    aria-label="Board name"
                    style={Object.assign(inputStyle(K), {flex: 1, minWidth: 180})}
                />
                <Button kind="primary" type="submit" disabled={busy || devices.length >= limit}>
                    {busy ? 'Adding…' : 'Add board'}
                </Button>
            </form>
            {devices.length >= limit ? (
                <div style={{fontSize: 13, color: K.dim, marginTop: 6}}>You have {limit} boards, the most there can be. Delete one to add another.</div>
            ) : null}
            {error ? <div role="alert" style={{fontSize: 13, color: K.red, marginTop: 6}}>{error}</div> : null}
        </details>
    );
};

const DevicesPage = ({state, actions}) => {
    const K = useTheme();
    const devices = state.devices;
    const limit = state.config.limits.maxDevices;

    if (!devices) {
        return state.devicesError ? (
            <Banner tone="error" action={<Button onClick={actions.refreshDevices}>Retry</Button>}>
                {errorText(state.devicesError)}
            </Banner>
        ) : <div style={{color: K.dim}}>Loading your boards…</div>;
    }

    return (
        <div>
            <div style={{display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 16}}>
                <h1 style={{fontFamily: K.fontDisplay, fontSize: 28, margin: 0, flex: 1}}>Your boards</h1>
                <span style={{fontSize: 13, color: K.dim}}>{devices.length} of {limit}</span>
            </div>

            {devices.length ? (
                <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))', gap: 16}}>
                    {devices.map(d => <BoardCard key={d.id} device={d} />)}
                </div>
            ) : (
                <Card kind="bold" style={{maxWidth: 560}}>
                    <h2 style={{fontFamily: K.fontDisplay, fontSize: 20, margin: '0 0 10px'}}>Connect your first board</h2>
                    <ol style={{margin: 0, paddingLeft: 20, color: K.sub, fontSize: 15, lineHeight: 1.7}}>
                        <li>Open <a href="/beginner" style={{color: K.accent, fontWeight: 700}}>Beginner Studio</a> and add the <b>TinkerBit Cloud</b> part.</li>
                        <li>Type your WiFi, then press <b>Upload</b>.</li>
                        <li>Your board shows up here, online, with its readings.</li>
                    </ol>
                </Card>
            )}

            {devices.length ? (
                <div style={{marginTop: 20, background: K.lilac, borderRadius: 14, padding: '14px 16px', fontSize: 15, lineHeight: 1.5}}>
                    A new board starts in <a href="/beginner" style={{color: K.accent, fontWeight: 700}}>Beginner Studio</a>:
                    add the <b>TinkerBit Cloud</b> part to a project, then Upload.
                </div>
            ) : null}

            <AddByHand state={state} actions={actions} />
        </div>
    );
};

export default DevicesPage;
