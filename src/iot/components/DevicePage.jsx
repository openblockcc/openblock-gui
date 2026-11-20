import React, {useEffect, useState} from 'react';

import {errorText} from '../../lib/iot-api';
import {KNOWN_UNITS, formatValue, labelFor, rssiBars, statusText, timeAgo} from '../format';
import {useWindowWidth} from '../hooks';
import {linkTo, navigate} from '../router';
import {Banner, Button, Card, SectionTitle, StatusDot, StatusPill, useTheme} from '../ui.jsx';

import DashboardTab from './DashboardTab.jsx';
import DeviceSettings from './DeviceSettings.jsx';
import RulesPanel from './RulesPanel.jsx';

/** From this width the list of boards stays on the left. */
const RAIL = 1000;
const SIGNAL_WORDS = ['no', 'weak', 'fair', 'good', 'strong'];

const NotificationButton = () => {
    const supported = typeof Notification !== 'undefined';
    const [permission, setPermission] = useState(supported ? Notification.permission : 'unsupported');
    if (!supported) {
        return <span>This browser cannot show notifications; alerts still appear in Alerts.</span>;
    }
    if (permission === 'granted') {
        return <span>Notifications are on while TinkerBit Cloud is open in a tab.</span>;
    }
    if (permission === 'denied') {
        return <span>Notifications are blocked for this site in your browser settings.</span>;
    }
    return <Button onClick={() => Notification.requestPermission().then(setPermission)}>Turn on notifications</Button>;
};

const Onboarding = ({device}) => {
    const K = useTheme();
    return (
        <Card kind="bold" style={{marginBottom: 16}}>
            <h2 style={{fontFamily: K.fontDisplay, fontSize: 20, margin: '0 0 8px'}}>Waiting for “{device.name}” to connect</h2>
            <ol style={{margin: 0, paddingLeft: 20, color: K.sub, fontSize: 15, lineHeight: 1.7}}>
                <li>In <a href="/beginner" style={{color: K.accent, fontWeight: 700}}>Beginner Studio</a>, open the project with the TinkerBit Cloud part.</li>
                <li>Type the WiFi name and password in its Cloud panel, then press Upload.</li>
                <li>This page fills in by itself when the board comes online.</li>
            </ol>
            <div style={{fontSize: 14, color: K.dim, marginTop: 10, lineHeight: 1.5}}>
                The board needs 2.4 GHz WiFi without a login page. A phone hotspot is the quickest fix.
            </div>
        </Card>
    );
};

/** The other boards, beside this one on a wide screen. */
const BoardRail = ({devices, currentId}) => {
    const K = useTheme();
    return (
        <aside aria-label="Your boards" style={{width: 240, flex: 'none', display: 'flex', flexDirection: 'column', gap: 6}}>
            <span style={{fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: K.dim, padding: '0 10px 4px'}}>
                Your boards
            </span>
            {devices.map(d => {
                const on = d.id === currentId;
                const first = (d.latest || [])[0];
                return (
                    <a
                        key={d.id}
                        href={`/iot/d/${d.id}`}
                        onClick={linkTo(`/iot/d/${d.id}`)}
                        aria-current={on ? 'page' : undefined}
                        style={{
                            textDecoration: 'none',
                            color: K.text,
                            padding: '10px 12px',
                            borderRadius: 12,
                            background: on ? K.panel : 'transparent',
                            border: on ? `2px solid ${K.ink}` : '2px solid transparent',
                            boxShadow: on ? K.shadowSmall : 'none'
                        }}
                    >
                        <div style={{display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700}}>
                            <StatusDot status={d.status} size={8} />
                            <span style={{overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>{d.name}</span>
                        </div>
                        <div style={{fontSize: 12, color: K.dim, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
                            {d.status === 'online' && first ?
                                `${labelFor(d, first.key)} ${formatValue(first.value, KNOWN_UNITS[first.key])}` :
                                statusText(d)}
                        </div>
                    </a>
                );
            })}
        </aside>
    );
};

const AlertsSection = ({detail, state, actions}) => {
    const K = useTheme();
    const id = detail.device.id;
    const recent = (state.alerts.items || []).filter(a => a.deviceId === id).slice(0, 5);

    useEffect(() => {
        if (!state.alerts.loaded) {
            actions.loadAlerts();
        }
    }, [state.alerts.loaded, actions]);

    return (
        <section aria-label="Alerts" style={{marginTop: 28}}>
            <SectionTitle>Alerts</SectionTitle>
            {recent.length ? (
                <Card style={{padding: 0, overflow: 'hidden', marginBottom: 12}}>
                    {recent.map((a, i) => (
                        <div key={a.id} style={{padding: '12px 16px', borderTop: i ? `1px solid ${K.line}` : 'none'}}>
                            <div style={{fontSize: 15, fontWeight: a.read ? 500 : 700, wordBreak: 'break-word'}}>{a.message}</div>
                            <div style={{fontSize: 13, color: K.dim, marginTop: 2}} title={new Date(a.ts).toLocaleString()}>{timeAgo(a.ts)}</div>
                        </div>
                    ))}
                </Card>
            ) : null}
            <RulesPanel detail={detail} onRules={rules => actions.dispatch({type: 'rules/set', id, rules})} />
            <div style={{display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginTop: 14, fontSize: 14, color: K.dim}}>
                <span style={{flex: 1, minWidth: 220}}>You also get an alert whenever a board goes offline.</span>
                <NotificationButton />
            </div>
        </section>
    );
};

const DevicePage = ({id, view, state, actions, phone}) => {
    const K = useTheme();
    const wide = useWindowWidth() >= RAIL;
    const detail = state.details[id];
    const loadError = state.detailErrors[id];
    const devices = state.devices || [];

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [id]);

    let body;
    if (!detail) {
        if (loadError === 'not_found') {
            body = (
                <Banner tone="warn" action={<a href="/iot" onClick={linkTo('/iot')} style={{color: K.accent, fontWeight: 700}}>All boards</a>}>
                    This board does not exist anymore (it may have been deleted on another screen).
                </Banner>
            );
        } else if (loadError) {
            body = (
                <Banner tone="error" action={<Button onClick={() => actions.refreshDetail(id)}>Retry</Button>}>
                    {errorText(loadError)}
                </Banner>
            );
        } else {
            body = <div style={{color: K.dim}}>Loading…</div>;
        }
    } else {
        const device = detail.device;
        const onControl = control => actions.dispatch({type: 'control/update', id, control});
        const updated = (detail.latest || []).reduce((m, r) => Math.max(m, r.ts || 0), 0);
        const signal = device.status === 'online' && device.rssi !== null && device.rssi !== undefined ?
            `${SIGNAL_WORDS[rssiBars(device.rssi)]} WiFi signal` : null;
        const settingsPath = `/iot/d/${id}/settings`;

        if (view === 'settings') {
            body = (
                <div style={{maxWidth: 760}}>
                    <a
                        href={`/iot/d/${id}`}
                        onClick={linkTo(`/iot/d/${id}`)}
                        style={{display: 'inline-flex', alignItems: 'center', minHeight: 44, color: K.accent, fontWeight: 700, textDecoration: 'none'}}
                    >
                        ← {device.name}
                    </a>
                    <h1 style={{fontFamily: K.fontDisplay, fontSize: 28, margin: '4px 0 16px'}}>Board settings</h1>
                    <DeviceSettings detail={detail} config={state.config} actions={actions} />
                </div>
            );
        } else {
            body = (
                <div>
                    {phone ? (
                        <a href="/iot" onClick={linkTo('/iot')} style={{display: 'inline-flex', alignItems: 'center', minHeight: 44, color: K.accent, fontWeight: 600, textDecoration: 'none'}}>
                            ← Your boards
                        </a>
                    ) : null}
                    <div style={{display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 18}}>
                        <div style={{minWidth: 0}}>
                            <div style={{display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap'}}>
                                <h1 style={{fontFamily: K.fontDisplay, fontSize: phone ? 26 : 32, margin: 0, overflowWrap: 'anywhere'}}>{device.name}</h1>
                                <StatusPill status={device.status} text={statusText(device)} />
                            </div>
                            <div style={{fontSize: 14, color: K.dim, marginTop: 6}}>
                                {[updated ? `Updated ${timeAgo(updated)}` : null, signal].filter(Boolean).join(' · ') || 'No readings yet'}
                            </div>
                        </div>
                        {phone ? null : <Button onClick={() => navigate(settingsPath)}>Board settings</Button>}
                    </div>

                    {device.status === 'disabled' ? (
                        <Banner tone="error" action={<Button onClick={() => navigate(settingsPath)}>Fix it</Button>}>
                            This board is paused and cannot connect.
                        </Banner>
                    ) : null}

                    {!device.lastSeen ? <Onboarding device={device} /> : null}

                    <DashboardTab key={id} detail={detail} state={state} actions={actions} onControl={onControl} />

                    <AlertsSection detail={detail} state={state} actions={actions} />

                    {phone ? (
                        <div style={{marginTop: 24}}>
                            <Button style={{width: '100%'}} onClick={() => navigate(settingsPath)}>Board settings</Button>
                        </div>
                    ) : null}
                </div>
            );
        }
    }

    return (
        <div style={{display: 'flex', gap: 32, alignItems: 'flex-start'}}>
            {wide && devices.length > 1 ? <BoardRail devices={devices} currentId={id} /> : null}
            <div style={{flex: 1, minWidth: 0}}>{body}</div>
        </div>
    );
};

export default DevicePage;
