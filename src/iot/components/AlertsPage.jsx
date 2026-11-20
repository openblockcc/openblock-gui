import React, {useEffect, useState} from 'react';

import {errorText, iotApi} from '../../lib/iot-api';
import {timeAgo} from '../format';
import {linkTo} from '../router';
import {Banner, Button, Card, useTheme} from '../ui.jsx';

const KIND_COLOR = {rule: 'orange', device: 'accent', warning: 'orange', disabled: 'red'};

const AlertsPage = ({state, actions}) => {
    const K = useTheme();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const {items, nextBefore, loaded} = state.alerts;

    useEffect(() => {
        actions.loadAlerts();
    }, [actions]);

    const markAll = async () => {
        if (!items.length) {
            return;
        }
        const upToId = items.reduce((m, a) => Math.max(m, a.id), 0);
        setBusy(true);
        setError('');
        try {
            const res = await iotApi.markAlertsRead(upToId);
            actions.dispatch({type: 'alerts/read', upToId, updated: res.updated});
        } catch (err) {
            setError(errorText(err));
        } finally {
            setBusy(false);
        }
    };

    return (
        <div>
            <div style={{display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16}}>
                <h1 style={{fontFamily: K.fontDisplay, fontSize: 28, margin: 0, flex: 1}}>Alerts</h1>
                <Button disabled={busy || !state.unread} onClick={markAll}>Mark all read</Button>
            </div>
            {error ? <Banner tone="error">{error}</Banner> : null}
            {!loaded ? <div style={{color: K.dim}}>Loading…</div> : null}
            {loaded && !items.length ? (
                <Card>
                    <div style={{color: K.sub, fontSize: 14}}>
                        No alerts yet. Open a board and use “Tell me when…”, or the “Send alert” block in Beginner Studio.
                    </div>
                </Card>
            ) : null}
            <div style={{display: 'grid', gap: 8}}>
                {items.map(a => (
                    <Card key={a.id} style={{display: 'flex', gap: 12, alignItems: 'flex-start', padding: '14px 16px'}}>
                        <span
                            aria-hidden="true"
                            style={{width: 8, height: 8, borderRadius: 4, marginTop: 6, flexShrink: 0, background: a.read ? K.surface : K[KIND_COLOR[a.kind] || 'accent']}}
                        />
                        <div style={{flex: 1, minWidth: 0}}>
                            <div style={{fontSize: 14, fontWeight: a.read ? 400 : 700, wordBreak: 'break-word'}}>{a.message}</div>
                            <div style={{fontSize: 12, color: K.dim, marginTop: 2}}>
                                {a.deviceName ? (
                                    <a href={`/iot/d/${a.deviceId}`} onClick={linkTo(`/iot/d/${a.deviceId}`)} style={{color: K.accent}}>
                                        {a.deviceName}
                                    </a>
                                ) : null}
                                {a.deviceName ? ' · ' : ''}
                                <span title={new Date(a.ts).toLocaleString()}>{timeAgo(a.ts)}</span>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
            {nextBefore ? (
                <div style={{textAlign: 'center', marginTop: 12}}>
                    <Button onClick={() => actions.loadAlerts({before: nextBefore})}>Show older</Button>
                </div>
            ) : null}
        </div>
    );
};

export default AlertsPage;
