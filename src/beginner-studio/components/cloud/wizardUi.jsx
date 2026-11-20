import React from 'react';

/** Shared looks for the Cloud wizard steps. */
const ui = K => ({
    title: {fontSize: 15, fontWeight: 800, color: K.text, margin: '0 0 4px'},
    lead: {fontSize: 13, color: K.sub, lineHeight: 1.5, margin: '0 0 12px'},
    label: {fontSize: 12, fontWeight: 700, color: K.sub, display: 'block', marginBottom: 4},
    input: {
        width: '100%',
        boxSizing: 'border-box',
        background: K.canvas,
        border: `1px solid ${K.border}`,
        borderRadius: 8,
        color: K.text,
        padding: '9px 10px',
        fontSize: 14
    },
    small: {fontSize: 12, color: K.dim, lineHeight: 1.5},
    link: {
        background: 'none',
        border: 'none',
        padding: 0,
        color: K.accent,
        fontSize: 12,
        fontWeight: 600,
        cursor: 'pointer',
        textDecoration: 'underline'
    }
});

const buttonStyle = (K, kind, disabled) => ({
    border: kind === 'primary' ? 'none' : `1px solid ${K.border}`,
    background: kind === 'primary' ? K.accent : K.surface,
    color: kind === 'primary' ? '#fff' : K.text,
    borderRadius: 9,
    padding: '9px 16px',
    fontSize: 13,
    fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.55 : 1,
    whiteSpace: 'nowrap'
});

const Button = ({K, kind = 'secondary', disabled, onClick, children, autoFocus, type = 'button'}) => (
    <button
        type={type}
        disabled={disabled}
        onClick={onClick}
        autoFocus={autoFocus}
        style={buttonStyle(K, kind, disabled)}
    >
        {children}
    </button>
);

/** Coloured box for a problem or a tip, with an optional row of actions. */
const Note = ({K, tone = 'orange', title, children, actions}) => {
    const color = {red: K.red, orange: K.orange, green: K.green, blue: K.accent}[tone] || K.orange;
    return (
        <div
            role={tone === 'red' ? 'alert' : undefined}
            style={{
                fontSize: 13,
                color: K.text,
                background: `${color}1a`,
                border: `1px solid ${color}`,
                borderRadius: 10,
                padding: '10px 12px',
                marginTop: 10,
                lineHeight: 1.5
            }}
        >
            {title ? <div style={{fontWeight: 700, marginBottom: children ? 2 : 0}}>{title}</div> : null}
            {children ? <div style={{color: K.sub}}>{children}</div> : null}
            {actions ? <div style={{display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8}}>{actions}</div> : null}
        </div>
    );
};

/** Click-to-open extra help or settings, closed by default so the step stays short. */
const Disclosure = ({K, label, children}) => (
    <details style={{marginTop: 10}}>
        <summary style={{cursor: 'pointer', fontSize: 12, fontWeight: 600, color: K.accent}}>{label}</summary>
        <div style={{marginTop: 8}}>{children}</div>
    </details>
);

/** Board · WiFi · Upload · Live, with the current step highlighted. */
const Footer = ({children}) => (
    <div style={{display: 'flex', alignItems: 'center', gap: 8, marginTop: 18, flexWrap: 'wrap'}}>{children}</div>
);

const Spacer = () => <div style={{flex: 1}} />;

export {Button, Disclosure, Footer, Note, Spacer, ui};
