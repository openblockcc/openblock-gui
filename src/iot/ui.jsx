import React, {createContext, useContext} from 'react';

import {fontFamily} from '../beginner-studio/domain/tokens';

const ThemeContext = createContext(null);
const useTheme = () => useContext(ThemeContext);

// Brand keys (theme.js) with fallbacks to Beginner Studio's tokens, which still render some of
// these components inside Studio.
const ink = K => K.ink || K.border;
const bodyFont = K => K.fontBody || fontFamily;
const displayFont = K => K.fontDisplay || fontFamily;

/**
 * kind: plain (thin lilac outline), bold (ink outline and offset shadow, for things you act on),
 * dashed (offline or empty).
 */
const Card = ({children, style, kind = 'plain', ...rest}) => {
    const K = useTheme();
    const look = {
        plain: {border: `1.5px solid ${K.border}`},
        bold: {border: `2px solid ${ink(K)}`, boxShadow: K.shadow || 'none'},
        dashed: {border: `2px dashed ${K.border}`}
    }[kind] || {};
    return (
        <div
            {...rest}
            style={Object.assign({
                background: K.panel,
                borderRadius: 18,
                padding: 16,
                minWidth: 0
            }, look, style)}
        >
            {children}
        </div>
    );
};

const Button = ({kind = 'default', disabled, style, children, ...rest}) => {
    const K = useTheme();
    const palette = {
        primary: {
            background: K.accent,
            color: K.onAccent || '#fff',
            border: `2px solid ${ink(K)}`,
            boxShadow: disabled ? 'none' : (K.shadowSmall || 'none')
        },
        danger: {background: K.red, color: '#fff', border: `2px solid ${K.red}`},
        ghost: {background: 'transparent', color: K.accent, border: '2px solid transparent'},
        default: {background: K.panel, color: K.text, border: `2px solid ${ink(K)}`}
    }[kind];
    return (
        <button
            type="button"
            disabled={disabled}
            {...rest}
            style={Object.assign({
                borderRadius: 12,
                padding: '9px 16px',
                minHeight: 44,
                fontSize: 14,
                fontWeight: 700,
                fontFamily: bodyFont(K),
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.55 : 1
            }, palette, style)}
        >
            {children}
        </button>
    );
};

const Banner = ({tone = 'info', children, action}) => {
    const K = useTheme();
    const look = {
        info: {background: K.lilac || `${K.accent}1f`, border: K.border},
        warn: {background: K.orangeSoft || `${K.orange}1f`, border: K.orange},
        error: {background: K.redSoft || `${K.red}1f`, border: K.red},
        ok: {background: K.greenSoft || `${K.green}1f`, border: K.green}
    }[tone];
    return (
        <div
            role={tone === 'error' ? 'alert' : 'status'}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                flexWrap: 'wrap',
                background: look.background,
                border: `1.5px solid ${look.border}`,
                color: K.text,
                borderRadius: 14,
                padding: '12px 14px',
                fontSize: 14,
                lineHeight: 1.5,
                marginBottom: 14
            }}
        >
            <div style={{flex: 1, minWidth: 180}}>{children}</div>
            {action}
        </div>
    );
};

const inputStyle = K => ({
    background: K.canvas,
    border: `1.5px solid ${K.border}`,
    borderRadius: 10,
    color: K.text,
    padding: '9px 12px',
    fontSize: 16,
    fontFamily: bodyFont(K),
    minHeight: 44,
    boxSizing: 'border-box',
    maxWidth: '100%'
});

const Field = ({label, children, hint}) => {
    const K = useTheme();
    return (
        <label style={{display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: K.sub, fontWeight: 700}}>
            {label}
            {children}
            {hint ? <span style={{fontWeight: 400, color: K.dim}}>{hint}</span> : null}
        </label>
    );
};

/** Upper-case section label in brand purple ("Control it", "What it senses"). */
const SectionTitle = ({children, action}) => {
    const K = useTheme();
    return (
        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, margin: '6px 0 10px'}}>
            <h2
                style={{
                    margin: 0,
                    fontFamily: displayFont(K),
                    fontSize: 14,
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    color: K.accent
                }}
            >
                {children}
            </h2>
            {action}
        </div>
    );
};

const StatusDot = ({status, size = 10}) => {
    const K = useTheme();
    const color = status === 'online' ? K.green : (status === 'disabled' ? K.red : K.muted);
    return (
        <span
            aria-hidden="true"
            style={{
                display: 'inline-block',
                width: size,
                height: size,
                borderRadius: size,
                background: color,
                flexShrink: 0
            }}
        />
    );
};

/** "Online", "Offline · 2 h ago" or "Paused", as a coloured pill. */
const StatusPill = ({status, text}) => {
    const K = useTheme();
    const look = {
        online: {background: K.greenSoft || `${K.green}22`, color: K.greenText || K.green},
        disabled: {background: K.redSoft || `${K.red}22`, color: K.red}
    }[status] || {background: K.offSoft || K.surface, color: K.sub};
    return (
        <span
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 11px',
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 700,
                whiteSpace: 'nowrap',
                background: look.background,
                color: look.color
            }}
        >
            <StatusDot status={status} size={8} />
            {text}
        </span>
    );
};

const SignalBars = ({bars}) => {
    const K = useTheme();
    return (
        <svg width="18" height="14" viewBox="0 0 18 14" role="img" aria-label={`WiFi ${bars} of 4`}>
            {[0, 1, 2, 3].map(i => (
                <rect
                    key={i}
                    x={i * 4.5}
                    y={10 - (i * 3)}
                    width="3"
                    height={4 + (i * 3)}
                    rx="1"
                    fill={i < bars ? K.text : K.border}
                />
            ))}
        </svg>
    );
};

export {
    Banner,
    Button,
    Card,
    Field,
    SectionTitle,
    SignalBars,
    StatusDot,
    StatusPill,
    ThemeContext,
    bodyFont,
    displayFont,
    inputStyle,
    useTheme
};
