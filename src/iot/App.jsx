import React, {useEffect, useRef, useState} from 'react';

import {errorText, isTransient} from '../lib/iot-api';

import AccountPage from './components/AccountPage.jsx';
import AlertsPage from './components/AlertsPage.jsx';
import DevicePage from './components/DevicePage.jsx';
import DevicesPage from './components/DevicesPage.jsx';
import {useWindowWidth} from './hooks';
import {linkTo, useRoute} from './router';
import {useCloudStore} from './store';
import {iotTokens, persistIotTheme, readIotTheme} from './theme';
import {Banner, Button, ThemeContext} from './ui.jsx';

/** Below this width the menu moves to a bar at the bottom of the screen. */
const PHONE = 700;

const useOnline = () => {
    const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine !== false);
    useEffect(() => {
        const up = () => setOnline(true);
        const down = () => setOnline(false);
        window.addEventListener('online', up);
        window.addEventListener('offline', down);
        return () => {
            window.removeEventListener('online', up);
            window.removeEventListener('offline', down);
        };
    }, []);
    return online;
};

const loginUrl = () => `/login?next=${encodeURIComponent(window.location.pathname)}`;

const BoardsIcon = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
);

const BellIcon = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
);

const Badge = ({K, count}) => (count ? (
    <span
        aria-label={`${count} unread`}
        style={{
            minWidth: 18,
            height: 18,
            padding: '0 5px',
            boxSizing: 'border-box',
            borderRadius: 9,
            background: K.red,
            color: '#fff',
            fontSize: 11,
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center'
        }}
    >
        {count > 99 ? '99+' : count}
    </span>
) : null);

/** The avatar menu: who is signed in, data and privacy, light or dark, back to Studio. */
const AccountMenu = ({K, user, theme, setTheme}) => {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    useEffect(() => {
        if (!open) {
            return undefined;
        }
        const close = e => {
            if (ref.current && !ref.current.contains(e.target)) {
                setOpen(false);
            }
        };
        const onKey = e => {
            if (e.key === 'Escape') {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', close);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', close);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);
    const name = (user && (user.name || user.email)) || 'You';
    const item = {
        display: 'block',
        width: '100%',
        boxSizing: 'border-box',
        textAlign: 'left',
        padding: '11px 12px',
        minHeight: 44,
        borderRadius: 10,
        border: 'none',
        background: 'transparent',
        color: K.text,
        fontFamily: K.fontBody,
        fontSize: 15,
        textDecoration: 'none',
        cursor: 'pointer'
    };
    return (
        <div ref={ref} style={{position: 'relative'}}>
            <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={open}
                aria-label={`Account: ${name}`}
                onClick={() => setOpen(!open)}
                style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    border: `2px solid ${K.ink}`,
                    background: K.gold,
                    color: K.onGold,
                    fontFamily: K.fontDisplay,
                    fontWeight: 700,
                    fontSize: 16,
                    cursor: 'pointer'
                }}
            >
                {name.charAt(0).toUpperCase()}
            </button>
            {open ? (
                <div
                    role="menu"
                    style={{
                        position: 'absolute',
                        right: 0,
                        top: 48,
                        width: 260,
                        background: K.panel,
                        border: `2px solid ${K.ink}`,
                        boxShadow: K.shadow,
                        borderRadius: 14,
                        padding: 6,
                        zIndex: 30
                    }}
                >
                    {user && user.email ? (
                        <div style={{padding: '10px 12px', fontSize: 13, color: K.dim, borderBottom: `1px solid ${K.line}`, marginBottom: 4}}>
                            Signed in as<br /><b style={{color: K.text}}>{user.email}</b>
                        </div>
                    ) : null}
                    <a role="menuitem" href="/iot/account" onClick={e => {
                        setOpen(false);
                        linkTo('/iot/account')(e);
                    }} style={item}
                    >
                        Data and privacy
                    </a>
                    <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                            setTheme(theme === 'dark' ? 'light' : 'dark');
                            setOpen(false);
                        }}
                        style={item}
                    >
                        {theme === 'dark' ? 'Light mode' : 'Dark mode'}
                    </button>
                    <a role="menuitem" href="/beginner" style={item}>Open Beginner Studio</a>
                </div>
            ) : null}
        </div>
    );
};

const navLink = (K, path, label, active, badge) => (
    <a
        href={path}
        onClick={linkTo(path)}
        aria-current={active ? 'page' : undefined}
        style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 14px',
            minHeight: 40,
            boxSizing: 'border-box',
            borderRadius: 10,
            background: active ? K.lilac : 'transparent',
            color: active ? K.accent : K.sub,
            fontWeight: active ? 700 : 500,
            fontSize: 15,
            textDecoration: 'none'
        }}
    >
        {label}
        <Badge K={K} count={badge} />
    </a>
);

const Header = ({K, state, route, theme, setTheme, phone}) => {
    const boards = route.page === 'devices' || route.page === 'device';
    const liveLabel = {live: 'Live', connecting: 'Connecting…', polling: 'Reconnecting…', idle: ''}[state.live];
    return (
        <header
            style={{
                position: 'sticky',
                top: 0,
                zIndex: 10,
                background: K.panel,
                borderBottom: `1px solid ${K.line}`,
                padding: '0 16px'
            }}
        >
            <div style={{maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 20, minHeight: 64}}>
                <a href="/iot" onClick={linkTo('/iot')} style={{display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: K.text}}>
                    <span
                        aria-hidden="true"
                        style={{
                            width: 32,
                            height: 32,
                            borderRadius: 9,
                            background: K.mode === 'dark' ? K.accent : '#5B2BD1',
                            color: K.mode === 'dark' ? K.onAccent : '#FFFFFF',
                            fontFamily: K.fontDisplay,
                            fontSize: 13,
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        TB
                    </span>
                    <span style={{fontFamily: K.fontDisplay, fontWeight: 700, fontSize: 18}}>TinkerBit Cloud</span>
                </a>
                {phone ? <span style={{flex: 1}} /> : (
                    <nav aria-label="Main" style={{display: 'flex', gap: 4, flex: 1}}>
                        {navLink(K, '/iot', 'Boards', boards)}
                        {navLink(K, '/iot/alerts', 'Alerts', route.page === 'alerts', state.unread)}
                    </nav>
                )}
                {liveLabel ? (
                    <span
                        role="img"
                        aria-label={liveLabel}
                        title={liveLabel}
                        style={{width: 10, height: 10, borderRadius: 5, background: state.live === 'live' ? K.green : K.orange}}
                    />
                ) : null}
                <AccountMenu K={K} user={state.config && state.config.user} theme={theme} setTheme={setTheme} />
            </div>
        </header>
    );
};

const BottomNav = ({K, state, route}) => {
    const tab = (path, label, icon, active, badge) => (
        <a
            href={path}
            onClick={linkTo(path)}
            aria-current={active ? 'page' : undefined}
            style={{
                height: 64,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
                textDecoration: 'none',
                color: active ? K.accent : K.sub,
                fontWeight: active ? 700 : 500,
                fontSize: 13,
                position: 'relative'
            }}
        >
            {icon}
            <span style={{display: 'inline-flex', alignItems: 'center', gap: 4}}>{label}<Badge K={K} count={badge} /></span>
        </a>
    );
    return (
        <nav
            aria-label="Main"
            style={{
                position: 'fixed',
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 10,
                display: 'grid',
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                background: K.panel,
                borderTop: `1px solid ${K.line}`,
                paddingBottom: 'env(safe-area-inset-bottom)'
            }}
        >
            {tab('/iot', 'Boards', <BoardsIcon />, route.page === 'devices' || route.page === 'device')}
            {tab('/iot/alerts', 'Alerts', <BellIcon />, route.page === 'alerts', state.unread)}
        </nav>
    );
};

const App = () => {
    const [theme, setThemeState] = useState(readIotTheme);
    const K = iotTokens(theme);
    const route = useRoute();
    const [state, actions] = useCloudStore(route);
    const online = useOnline();
    const phone = useWindowWidth() < PHONE;

    const setTheme = next => {
        persistIotTheme(next);
        setThemeState(next);
    };

    useEffect(() => {
        document.title = `${state.unread ? `(${state.unread}) ` : ''}TinkerBit Cloud`;
    }, [state.unread]);

    useEffect(() => {
        document.body.style.margin = '0';
        document.body.style.background = K.bg;
        document.documentElement.style.colorScheme = theme;
    }, [K, theme]);

    useEffect(() => {
        if (!state.toast) {
            return undefined;
        }
        const t = setTimeout(() => actions.dispatch({type: 'toast/clear'}), 6000);
        return () => clearTimeout(t);
    }, [state.toast, actions]);

    useEffect(() => {
        if (state.configError === 'unauthenticated') {
            window.location.replace(loginUrl());
        }
    }, [state.configError]);

    let body;
    if (state.configError === 'unauthenticated') {
        body = <div style={{color: K.dim}}>Taking you to sign in…</div>;
    } else if (state.configError) {
        body = (
            <Banner tone="error" action={<Button onClick={() => window.location.reload()}>Try again</Button>}>
                {errorText(state.configError)}
                {isTransient({code: state.configError}) ? ' This page keeps trying by itself.' : ''}
            </Banner>
        );
    } else if (!state.config) {
        body = <div style={{color: K.dim}}>Loading…</div>;
    } else if (!state.config.allowed) {
        body = (
            <Banner tone="warn">
                TinkerBit Cloud is in a private pilot and {state.config.user && state.config.user.email ?
                    <b>{state.config.user.email}</b> : 'your account'} is not on the list yet. Ask your teacher to add it.
            </Banner>
        );
    } else if (!state.config.enabled) {
        body = <Banner tone="warn">TinkerBit Cloud is paused for maintenance. Your boards keep running and reconnect by themselves.</Banner>;
    } else if (route.page === 'device') {
        body = <DevicePage id={route.id} view={route.view} state={state} actions={actions} phone={phone} />;
    } else if (route.page === 'alerts') {
        body = <AlertsPage state={state} actions={actions} />;
    } else if (route.page === 'account') {
        body = <AccountPage state={state} actions={actions} />;
    } else {
        body = <DevicesPage state={state} actions={actions} />;
    }

    return (
        <ThemeContext.Provider value={K}>
            <div style={{fontFamily: K.fontBody, background: K.bg, color: K.text, minHeight: '100vh'}}>
                <Header K={K} state={state} route={route} theme={theme} setTheme={setTheme} phone={phone} />
                <main style={{maxWidth: 1200, margin: '0 auto', padding: phone ? '16px 16px 96px' : '24px 24px 48px', boxSizing: 'border-box'}}>
                    {!online ? (
                        <Banner tone="warn">You are offline. Values on this page may be old; it refreshes when you reconnect.</Banner>
                    ) : null}
                    {body}
                </main>
                {phone ? <BottomNav K={K} state={state} route={route} /> : null}
                {state.toast ? (
                    <div
                        role="status"
                        aria-live="polite"
                        onClick={() => actions.dispatch({type: 'toast/clear'})}
                        style={{
                            position: 'fixed',
                            left: 16,
                            right: 16,
                            bottom: phone ? 'calc(80px + env(safe-area-inset-bottom))' : 'calc(16px + env(safe-area-inset-bottom))',
                            maxWidth: 440,
                            margin: '0 auto',
                            background: K.panel,
                            border: `2px solid ${K.ink}`,
                            borderRadius: 14,
                            padding: '12px 16px',
                            boxShadow: K.shadow,
                            fontSize: 15,
                            zIndex: 20,
                            cursor: 'pointer'
                        }}
                    >
                        <b>{state.toast.deviceName || 'Alert'}</b>: {state.toast.message}
                    </div>
                ) : null}
            </div>
        </ThemeContext.Provider>
    );
};

export default App;
