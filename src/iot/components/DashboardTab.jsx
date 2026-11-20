import React, {useEffect, useRef, useState} from 'react';

import {errorText, iotApi} from '../../lib/iot-api';
import {formatValue, isAutoTitle, labelFor, newWidgetId} from '../format';
import {colsForWidth, moveItem, normalizeWidget, sizeFromW, typeDefaultSpan} from '../grid';
import {useWidth, useWindowWidth} from '../hooks';
import {setNavigationBlocker} from '../router';
import {Banner, Button, Card, useTheme} from '../ui.jsx';
import {MAX_WIDGETS, layoutProblem, typeSpec} from '../widgetTypes';

import DashboardGrid from './DashboardGrid.jsx';
import {AddPanel, EditPanel} from './WidgetPanel.jsx';
import {WidgetBody} from './widgets.jsx';

const PANEL_SPACE = 336;

// On a phone the things you act on come first: controls, then numbers, then history.
const PHONE_ORDER = {switch: 0, slider: 0, value: 1, gauge: 1, chart: 2, status: 3, alerts: 4};
const rank = w => (Object.prototype.hasOwnProperty.call(PHONE_ORDER, w.type) ? PHONE_ORDER[w.type] : 5);
const phoneOrder = widgets => widgets
    .map((w, i) => ({w, i}))
    .sort((a, b) => (rank(a.w) - rank(b.w)) || (a.i - b.i))
    .map(x => x.w);

/**
 * The board's widgets, plus the editor: drag tiles to move them, drag the corner to resize, tap a
 * tile to open its settings (with a live preview), "Add widget" for new ones. Edits are a draft
 * until Save; the draft survives switching tabs because this component stays mounted.
 * titleFor (optional): reading or control key -> a friendlier title (Studio knows the part names);
 * it only replaces titles nobody typed. onEditingChange (optional) hears when editing starts and stops.
 */
const DashboardTab = ({detail, state, actions, onControl, titleFor, onEditingChange}) => {
    const K = useTheme();
    const id = detail.device.id;
    const [draft, setDraft] = useState(null);
    const [selectedId, setSelectedId] = useState(null);
    const [adding, setAdding] = useState(false);
    const [saving, setSaving] = useState(false);
    const [notice, setNotice] = useState(null);
    const rowRef = useRef(null);
    const rowWidth = useWidth(rowRef);
    const windowWidth = useWindowWidth();
    const sheet = windowWidth < 800;

    // Studio's part names (titleFor), else the names Studio stored on the board, else the key made readable.
    const keyTitle = key => (titleFor && key && titleFor(key)) || labelFor(detail.device, key);
    const named = w => (w.key && isAutoTitle(w) ? Object.assign({}, w, {title: keyTitle(w.key)}) : w);
    const saved = detail.dashboard.layout.map(normalizeWidget).map(named);
    const editing = draft !== null;
    const changed = editing && JSON.stringify(draft) !== JSON.stringify(saved);
    const selected = editing && selectedId ? draft.find(w => w.id === selectedId) : null;
    const panelOpen = editing && (adding || Boolean(selected));
    const cols = colsForWidth(rowWidth - (panelOpen && !sheet ? PANEL_SPACE : 0));
    const readingKeys = (detail.latest || []).map(r => r.key);
    const widgets = draft || (cols <= 2 ? phoneOrder(saved) : saved);

    useEffect(() => {
        setNavigationBlocker(() => (changed ? 'Leave without saving your dashboard changes?' : null));
        const onBeforeUnload = e => {
            if (changed) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', onBeforeUnload);
        return () => {
            setNavigationBlocker(null);
            window.removeEventListener('beforeunload', onBeforeUnload);
        };
    }, [changed]);

    useEffect(() => {
        if (!onEditingChange) {
            return undefined;
        }
        onEditingChange(editing);
        return () => {
            if (editing) {
                onEditingChange(false);
            }
        };
    }, [editing]);

    useEffect(() => {
        if (!editing) {
            return undefined;
        }
        const onKey = e => {
            if (e.key === 'Escape' && (selectedId || adding)) {
                setSelectedId(null);
                setAdding(false);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [editing, selectedId, adding]);

    const startEdit = () => {
        setDraft(saved);
        setSelectedId(null);
        setAdding(false);
        setNotice(null);
    };
    const stopEdit = () => {
        setDraft(null);
        setSelectedId(null);
        setAdding(false);
    };
    const cancel = () => {
        // eslint-disable-next-line no-alert
        if (changed && !window.confirm('Discard your dashboard changes?')) {
            return;
        }
        stopEdit();
        setNotice(null);
    };

    const save = async () => {
        const problem = layoutProblem(draft);
        if (problem) {
            setNotice({tone: 'error', text: problem});
            return;
        }
        setSaving(true);
        setNotice(null);
        try {
            const res = await iotApi.saveDashboard(id, draft, detail.dashboard.version);
            actions.dispatch({type: 'dashboard/update', id, dashboard: res.dashboard});
            stopEdit();
            setNotice({tone: 'ok', text: 'Dashboard saved.'});
        } catch (err) {
            if (err.code === 'version_conflict' && err.body.dashboard) {
                actions.dispatch({type: 'dashboard/update', id, dashboard: err.body.dashboard});
                setNotice({tone: 'warn', text: 'This dashboard was changed on another screen. Your edits are kept — Save again to replace it.'});
            } else {
                setNotice({tone: 'error', text: errorText(err)});
            }
        } finally {
            setSaving(false);
        }
    };

    // Functional updates: several edits can land between renders (typing, live data, drags).
    const updateWidget = (wid, patch) => setDraft(prev => prev.map(w => (w.id === wid ? Object.assign({}, w, patch) : w)));
    const removeWidget = wid => {
        setDraft(prev => prev.filter(w => w.id !== wid));
        setSelectedId(null);
    };
    const moveWidget = (wid, dir) => {
        setDraft(prev => {
            const i = prev.findIndex(w => w.id === wid);
            return moveItem(prev, i, i + dir);
        });
    };
    const addWidget = (type, key) => {
        const span = typeDefaultSpan(type);
        const widget = {
            id: newWidgetId(draft.map(w => w.id)),
            type,
            key: key || null,
            title: key ? keyTitle(key) : typeSpec(type).label,
            size: sizeFromW(span.w),
            w: span.w,
            h: span.h,
            options: {min: null, max: null, unit: ''}
        };
        setDraft(prev => prev.concat([widget]));
        setAdding(false);
        setSelectedId(widget.id);
    };

    const renderBody = (w, readOnly) => (
        <WidgetBody
            widget={w}
            detail={detail}
            recent={state.recent[id] || {}}
            alerts={state.alerts.items}
            onControl={onControl}
            readOnly={readOnly}
        />
    );

    let panel = null;
    if (editing && adding) {
        panel = (
            <AddPanel
                readingKeys={readingKeys}
                usedKeys={draft.map(w => `${w.type}:${w.key}`)}
                full={draft.length >= MAX_WIDGETS}
                sheet={sheet}
                keyTitle={keyTitle}
                onAdd={addWidget}
                onClose={() => setAdding(false)}
            />
        );
    } else if (selected) {
        panel = (
            <EditPanel
                widget={selected}
                index={draft.indexOf(selected)}
                count={draft.length}
                readingKeys={readingKeys}
                cols={cols}
                sheet={sheet}
                keyTitle={keyTitle}
                renderBody={w => renderBody(w, true)}
                onChange={patch => updateWidget(selected.id, patch)}
                onRemove={() => removeWidget(selected.id)}
                onMove={dir => moveWidget(selected.id, dir)}
                onClose={() => setSelectedId(null)}
            />
        );
    }

    return (
        <div>
            {notice ? <Banner tone={notice.tone}>{notice.text}</Banner> : null}
            <div style={{display: 'flex', gap: 8, marginBottom: 10, alignItems: 'center', flexWrap: 'wrap'}}>
                {editing ? (
                    <div style={{flex: 1, minWidth: 200, fontSize: 12, color: K.dim, lineHeight: 1.5}}>
                        {sheet ?
                            'Drag the grip to move a tile, drag the corner to resize, tap a tile to edit it.' :
                            'Drag a tile to move it, drag its corner to resize, click it to change its settings.'}
                    </div>
                ) : <div style={{flex: 1}} />}
                {editing ? (
                    <React.Fragment>
                        <Button onClick={() => {
                            setSelectedId(null);
                            setAdding(true);
                        }}
                        >
                            + Add a tile
                        </Button>
                        <Button onClick={cancel}>Cancel</Button>
                        <Button kind="primary" disabled={saving || !changed} onClick={save}>{saving ? 'Saving…' : 'Save'}</Button>
                    </React.Fragment>
                ) : (
                    <Button onClick={startEdit}>Arrange tiles</Button>
                )}
            </div>

            <div ref={rowRef} style={{display: 'flex', gap: 16, alignItems: 'flex-start'}}>
                <div style={{flex: 1, minWidth: 0}}>
                    {widgets.length ? (
                        <DashboardGrid
                            widgets={widgets}
                            cols={cols}
                            editing={editing}
                            selectedId={selectedId}
                            onSelect={wid => {
                                setAdding(false);
                                setSelectedId(wid);
                            }}
                            onChange={setDraft}
                            renderBody={w => renderBody(w, editing)}
                        />
                    ) : (
                        <Card>
                            <div style={{color: K.sub, fontSize: 14}}>
                                {editing ?
                                    'This dashboard is empty. Press “Add a tile” to put something on it.' :
                                    'The dashboard fills in by itself when the board sends its first readings.'}
                                {!editing && detail.latest.length ?
                                    ` Latest: ${detail.latest.map(r => `${keyTitle(r.key)} ${formatValue(r.value)}`).join(', ')}.` : ''}
                            </div>
                        </Card>
                    )}
                </div>
                {panel && !sheet ? panel : null}
            </div>
            {panel && sheet ? (
                <React.Fragment>
                    <div aria-hidden="true" style={{height: '55vh'}} />
                    {panel}
                </React.Fragment>
            ) : null}
        </div>
    );
};

export default DashboardTab;
