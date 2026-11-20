import React, {useCallback, useEffect, useRef, useState} from 'react';

import {isAdvancedModeOn} from '../../../lib/advanced-mode';
import {useStudio} from '../../context/StudioContext.jsx';

import SignOutDialog from './SignOutDialog.jsx';
import UpdateBoardDialog from './UpdateBoardDialog.jsx';

const itemStyle = (K, color) => ({
    display: 'block',
    width: '100%',
    textAlign: 'left',
    border: 'none',
    background: 'transparent',
    color: color || K.text,
    borderRadius: 6,
    padding: '9px 10px',
    fontSize: 13,
    cursor: 'pointer',
    textDecoration: 'none',
    boxSizing: 'border-box',
    fontFamily: 'inherit'
});

const ellipsis = {overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'};

const displayName = user => (user.name || user.email || '').trim();

/** Profile photo, or the first letter when there is none or it fails to load. */
const Avatar = ({user, size, K}) => {
    const [broken, setBroken] = useState(false);
    if (user.picture && !broken) {
        return (
            <img
                alt=""
                src={user.picture}
                referrerPolicy="no-referrer"
                onError={() => setBroken(true)}
                style={{width: size, height: size, borderRadius: '50%', objectFit: 'cover', display: 'block'}}
            />
        );
    }
    return (
        <span
            aria-hidden="true"
            style={{
                width: size,
                height: size,
                borderRadius: '50%',
                background: K.accent,
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: Math.round(size * 0.45),
                fontWeight: 800
            }}
        >
            {(displayName(user).charAt(0) || '?').toUpperCase()}
        </span>
    );
};

const Divider = ({K}) => <div style={{height: 1, background: K.border, margin: '4px 2px'}} />;

/**
 * Who is signed in plus the rarely used settings, behind one button: the avatar when signed in,
 * a "⋯" button in local dev where there is no account.
 */
const AccountMenu = () => {
    const {K, theme, setTheme, user} = useStudio();
    const [open, setOpen] = useState(false);
    const [signingOut, setSigningOut] = useState(false);
    const [updatingBoard, setUpdatingBoard] = useState(false);
    const closeUpdateBoard = useCallback(() => setUpdatingBoard(false), []);
    const rootRef = useRef(null);
    const menuRef = useRef(null);
    const name = user ? displayName(user) : '';

    useEffect(() => {
        if (!open) {
            return;
        }
        const items = () => (menuRef.current ? [...menuRef.current.querySelectorAll('[role="menuitem"]')] : []);
        const first = items()[0];
        if (first) {
            first.focus();
        }
        const onDown = e => {
            if (rootRef.current && !rootRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        const onKey = e => {
            if (e.key === 'Escape') {
                setOpen(false);
                return;
            }
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                const list = items();
                if (!list.length) {
                    return;
                }
                e.preventDefault();
                const at = list.indexOf(document.activeElement);
                const step = e.key === 'ArrowDown' ? 1 : -1;
                list[(at + step + list.length) % list.length].focus();
            }
        };
        document.addEventListener('pointerdown', onDown);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('pointerdown', onDown);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

    const close = () => setOpen(false);

    return (
        <div ref={rootRef} style={{position: 'relative'}}>
            <button
                type="button"
                aria-label={user ? `Account and settings (${name})` : 'More options'}
                title={user ? name : 'More options'}
                aria-haspopup="menu"
                aria-expanded={open}
                onClick={() => setOpen(!open)}
                style={{
                    width: user ? 34 : 32,
                    height: user ? 34 : 32,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: !user && open ? K.surface : 'transparent',
                    border: user ? `2px solid ${open ? K.accent : 'transparent'}` : `1px solid ${open ? K.border : 'transparent'}`,
                    color: K.sub,
                    borderRadius: user ? '50%' : 8,
                    padding: 0,
                    cursor: 'pointer'
                }}
            >
                {user ? (
                    <Avatar user={user} size={28} K={K} />
                ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                        <circle cx="5" cy="12" r="1.8" fill="currentColor" />
                        <circle cx="12" cy="12" r="1.8" fill="currentColor" />
                        <circle cx="19" cy="12" r="1.8" fill="currentColor" />
                    </svg>
                )}
            </button>
            {open ? (
                <div
                    ref={menuRef}
                    role="menu"
                    style={{
                        position: 'absolute',
                        top: 'calc(100% + 6px)',
                        right: 0,
                        width: 260,
                        maxWidth: 'calc(100vw - 16px)',
                        zIndex: 50,
                        background: K.panel,
                        border: `1px solid ${K.border}`,
                        borderRadius: 12,
                        padding: 4,
                        boxShadow: '0 8px 24px rgba(0,0,0,0.25)'
                    }}
                >
                    {user ? (
                        <React.Fragment>
                            <div style={{display: 'flex', alignItems: 'center', gap: 10, padding: '10px 10px 8px'}}>
                                <Avatar user={user} size={36} K={K} />
                                <div style={{minWidth: 0, flex: 1}}>
                                    <div title={name} style={Object.assign({fontSize: 13, fontWeight: 700, color: K.text}, ellipsis)}>
                                        {name}
                                    </div>
                                    {user.email && user.email !== name ? (
                                        <div title={user.email} style={Object.assign({fontSize: 12, color: K.dim}, ellipsis)}>
                                            {user.email}
                                        </div>
                                    ) : null}
                                </div>
                            </div>
                            <Divider K={K} />
                        </React.Fragment>
                    ) : null}
                    <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                            setTheme(theme === 'dark' ? 'light' : 'dark');
                            close();
                        }}
                        style={itemStyle(K)}
                    >
                        {theme === 'dark' ? 'Light mode' : 'Dark mode'}
                    </button>
                    <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                            close();
                            setUpdatingBoard(true);
                        }}
                        style={itemStyle(K)}
                    >
                        {'Update board'}
                    </button>
                    {isAdvancedModeOn() ? (
                        <a role="menuitem" href="/choose" style={itemStyle(K)}>
                            {'Switch mode (Beginner / Advanced)'}
                        </a>
                    ) : null}
                    <a role="menuitem" href="/iot" style={itemStyle(K)}>
                        {'IoT Dashboard (full page)'}
                    </a>
                    {user ? (
                        <React.Fragment>
                            <Divider K={K} />
                            <button
                                type="button"
                                role="menuitem"
                                onClick={() => {
                                    close();
                                    setSigningOut(true);
                                }}
                                style={itemStyle(K, K.red)}
                            >
                                {'Sign out'}
                            </button>
                        </React.Fragment>
                    ) : null}
                </div>
            ) : null}
            {signingOut ? <SignOutDialog onCancel={() => setSigningOut(false)} /> : null}
            {updatingBoard ? <UpdateBoardDialog onClose={closeUpdateBoard} /> : null}
        </div>
    );
};

export default AccountMenu;
