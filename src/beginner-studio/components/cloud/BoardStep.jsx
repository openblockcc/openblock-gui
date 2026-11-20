import React, {useState} from 'react';

import {useStudio} from '../../context/StudioContext.jsx';
import {NEW} from '../../hooks/useCloudSetup';

import {Button, Disclosure, Footer, Note, Spacer, ui} from './wizardUi.jsx';

const INTERVALS = [5, 10, 15, 30, 60, 300];

const intervalLabel = sec => (sec < 60 ? `every ${sec} seconds` : `every ${sec / 60} minute${sec === 60 ? '' : 's'}`);

const STATUS_WORDS = {online: 'online', offline: 'offline', never: 'never connected', disabled: 'turned off'};

const statusColor = (K, status) => ({online: K.green, disabled: K.red}[status] || K.dim);

const madeOn = iso => {
    const date = new Date(iso);
    return isNaN(date) ? '' : `made ${date.toLocaleDateString(undefined, {day: 'numeric', month: 'short'})} ${date.toLocaleTimeString(undefined, {hour: 'numeric', minute: '2-digit'})}`;
};

/**
 * The project's Cloud board. By default the project gets a board of its own, named after the
 * project; an existing board is one click away ("Use a board I already have"). The new board is
 * only made when the student presses Next, so a change of mind leaves no empty boards behind.
 * @param {object} props.w setup state and actions from useCloudSetup
 */
const BoardStep = ({w}) => {
    const {K} = useStudio();
    const s = ui(K);
    const {devices, choice, setChoice, newName, setNewName, selected, hasToken, busy, atLimit, maxDevices} = w;
    const making = choice === NEW || !devices.length;
    const [showList, setShowList] = useState(!making);
    const nameCount = {};
    devices.forEach(d => {
        const key = (d.name || '').toLowerCase();
        nameCount[key] = (nameCount[key] || 0) + 1;
    });

    const row = (id, children) => (
        <label
            key={id}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 10px',
                borderRadius: 9,
                cursor: 'pointer',
                border: `1px solid ${choice === id ? K.accent : K.border}`,
                background: choice === id ? `${K.accent}18` : K.surface
            }}
        >
            <input
                type="radio"
                name="tb-cloud-board"
                checked={choice === id}
                onChange={() => setChoice(id)}
            />
            {children}
        </label>
    );

    const nameField = (
        <div style={{marginTop: showList && devices.length ? 8 : 0}}>
            <label style={s.label} htmlFor="tb-cloud-new-name">It shows up on your phone as</label>
            <input
                id="tb-cloud-new-name"
                value={newName}
                maxLength={40}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => {
                    if (e.key === 'Enter') {
                        w.next();
                    }
                }}
                style={s.input}
            />
        </div>
    );

    return (
        <div>
            <p style={Object.assign({}, s.lead, {marginTop: 0})}>
                {making ?
                    'This project gets its own Cloud board. You can rename it later.' :
                    'This project will use a board you already have.'}
            </p>

            {making && !atLimit ? nameField : null}
            {making && atLimit ? (
                <div style={s.small}>
                    You have {devices.length} of {maxDevices} boards. Use one below, or delete one in TinkerBit Cloud to make another.
                </div>
            ) : null}

            {devices.length && !showList ? (
                <button
                    type="button"
                    onClick={() => setShowList(true)}
                    style={{border: 'none', background: 'transparent', color: K.accent, fontWeight: 700, fontSize: 13, padding: '8px 0', cursor: 'pointer'}}
                >
                    Use a board I already have ({devices.length})
                </button>
            ) : null}

            {devices.length && (showList || atLimit) ? (
                <div role="radiogroup" aria-label="Your Cloud boards" style={{display: 'grid', gap: 6, marginTop: 10}}>
                    {atLimit ? null : row(NEW, <span style={{fontSize: 14, color: K.text}}>A new board for this project</span>)}
                    {devices.map(d => row(d.id, (
                        <React.Fragment>
                            <span
                                aria-hidden="true"
                                style={{width: 8, height: 8, borderRadius: 4, background: statusColor(K, d.status), flexShrink: 0}}
                            />
                            <span style={{flex: 1, minWidth: 0, fontSize: 14, color: K.text, overflow: 'hidden', textOverflow: 'ellipsis'}}>
                                {d.name}
                                {nameCount[(d.name || '').toLowerCase()] > 1 && madeOn(d.createdAt) ? (
                                    <span style={{display: 'block', fontSize: 11, color: K.dim}}>{madeOn(d.createdAt)}</span>
                                ) : null}
                            </span>
                            <span style={{fontSize: 12, color: K.dim}}>{STATUS_WORDS[d.status] || d.status}</span>
                        </React.Fragment>
                    )))}
                </div>
            ) : null}

            {!making && selected && selected.status === 'disabled' ? (
                <Note
                    K={K}
                    tone="red"
                    title="This board was turned off"
                    actions={<Button K={K} disabled={Boolean(busy)} onClick={w.enable}>Turn it back on</Button>}
                >
                    {selected.disabledReason || 'It was sending messages too fast.'}
                    {' '}If your program repeats quickly, add a Wait block, then turn the board back on.
                </Note>
            ) : null}

            {!making && selected && !hasToken ? (
                <Note
                    K={K}
                    title="This computer does not have this board's key"
                    actions={(
                        <Button K={K} kind="primary" disabled={Boolean(busy)} onClick={w.regenerate}>
                            {busy === 'token' ? 'Making a key…' : 'Make a new key'}
                        </Button>
                    )}
                >
                    The key was made on another computer. A new key works straight away, but if this board is
                    already running somewhere it goes offline until you upload from here.
                </Note>
            ) : null}

            <Disclosure K={K} label="How often it sends readings">
                <label style={s.label} htmlFor="tb-cloud-interval">Send readings</label>
                <select
                    id="tb-cloud-interval"
                    value={w.intervalSec}
                    onChange={e => w.setIntervalSec(Number(e.target.value))}
                    style={Object.assign({}, s.input, {width: 'auto'})}
                >
                    {INTERVALS.filter(sec => sec >= w.minInterval).map(sec => (
                        <option key={sec} value={sec}>{intervalLabel(sec)}</option>
                    ))}
                </select>
                <div style={Object.assign({}, s.small, {marginTop: 4})}>
                    Switches and sliders on your phone reach the board straight away, whatever you pick.
                </div>
            </Disclosure>

            <Footer>
                <Button K={K} onClick={w.close}>Not now</Button>
                <Spacer />
                <Button
                    K={K}
                    kind="primary"
                    disabled={Boolean(busy) || (making && (atLimit || !newName.trim()))}
                    onClick={w.next}
                >
                    {busy === 'create' ? 'Making your board…' : 'Next'}
                </Button>
            </Footer>
        </div>
    );
};

export default BoardStep;
