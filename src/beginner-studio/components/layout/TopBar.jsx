import React from 'react';

import {useStudio} from '../../context/StudioContext.jsx';
import {useUpload} from '../../context/UploadContext.jsx';
import {aiProblem} from '../../domain/ai/aiKinds';
import {hasCloud} from '../../domain/cloud';
import {moduleById} from '../../domain/modules';
import {canLeave} from '../../../iot/router';

import AccountMenu from './AccountMenu.jsx';
import UndoButtons from './UndoButtons.jsx';
import UploadButton from './UploadButton.jsx';

/** Status dot on the Cloud button: set up, connecting after an upload, needs help, online or offline. */
const cloudLook = (K, cloud, live) => {
    if (!cloud) {
        return {dot: K.orange, title: 'Finish setting up Cloud'};
    }
    const name = cloud.deviceName;
    if (live.stage === 'waiting') {
        return live.progress.problem && live.progress.problem !== 'timeout' ?
            {dot: K.red, title: `${name} cannot go online. Open to see why.`} :
            {dot: K.orange, blink: true, title: `${name} is going online`};
    }
    const status = live.device && live.device.id === cloud.deviceId ? live.device.status : null;
    if (status === 'online') {
        return {dot: K.green, title: `${name} is online`};
    }
    if (status === 'disabled') {
        return {dot: K.red, title: `${name} was turned off`};
    }
    return {dot: K.dim, title: status ? `${name} is offline` : name};
};

/** Status dot on the Edge AI button: none until it is used, orange while it still needs teaching, green when ready. */
const aiLook = (K, ai, connections) => {
    if (!ai || !ai.kind) {
        return {dot: null, title: 'Teach your board to recognise moves and moments'};
    }
    const problem = aiProblem(ai, connections);
    return problem ? {dot: K.orange, title: problem} : {dot: K.green, title: 'The AI is ready to use in your program'};
};

const TopBar = () => {
    const {
        view,
        setView,
        projectName,
        setProjectName,
        selectedModule,
        connections,
        setShowProjectLibrary,
        clearSelection,
        K,
        cloud,
        ai,
        setShowCloudSetup
    } = useStudio();
    const cloudPart = hasCloud(connections);
    const {cloudLive} = useUpload();
    const look = cloudLook(K, cloud, cloudLive);
    const smart = aiLook(K, ai, connections);

    const selectedDef = selectedModule ? moduleById(selectedModule) : null;
    // The IoT page may hold an unsaved dashboard edit.
    const leaveCloud = then => () => {
        if (view === 'cloud' && !canLeave()) {
            return;
        }
        then();
    };

    const tabStyle = active => ({
        border: 'none',
        background: active ? K.accent : 'transparent',
        color: active ? '#fff' : K.sub,
        borderRadius: 8,
        padding: '6px 12px',
        fontSize: 12,
        fontWeight: 600,
        cursor: 'pointer'
    });

    return (
        <header
            style={{
                height: 48,
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '0 12px',
                background: K.panel,
                borderBottom: `1px solid ${K.border}`
            }}
        >
            <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                <div
                    aria-hidden="true"
                    style={{
                        width: 26,
                        height: 26,
                        borderRadius: 7,
                        background: `linear-gradient(135deg, ${K.accent}, ${K.cyan})`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 11,
                        fontWeight: 800,
                        color: '#fff'
                    }}
                >
                    TB
                </div>
                <span style={{fontWeight: 700, fontSize: 14, color: K.text}}>TinkerBit</span>
            </div>

            <button
                type="button"
                onClick={leaveCloud(() => setShowProjectLibrary(true))}
                style={{
                    background: K.surface,
                    border: 'none',
                    color: K.text,
                    borderRadius: 8,
                    padding: '6px 10px',
                    fontSize: 12,
                    cursor: 'pointer'
                }}
            >
                Projects
            </button>

            <input
                value={projectName}
                onChange={e => setProjectName(e.target.value)}
                aria-label="Project name"
                style={{
                    width: 160,
                    minWidth: 90,
                    flexShrink: 10,
                    background: K.canvas,
                    border: `1px solid ${K.border}`,
                    borderRadius: 8,
                    color: K.text,
                    padding: '6px 10px',
                    fontSize: 12
                }}
            />

            <div
                style={{
                    display: 'flex',
                    background: K.canvas,
                    borderRadius: 10,
                    padding: 3,
                    gap: 2
                }}
            >
                <button type="button" style={tabStyle(view === 'build')} onClick={leaveCloud(() => setView('build'))}>
                    Build
                </button>
                <button type="button" style={tabStyle(view === 'code')} onClick={leaveCloud(() => setView('code'))}>
                    Code
                </button>
            </div>

            <button
                type="button"
                title={cloudPart ? look.title : 'Send readings to your phone and control your board from it'}
                aria-label={cloudPart ? `Cloud: ${look.title}` : 'Cloud: add it to this project'}
                aria-pressed={view === 'cloud'}
                onClick={() => (cloudPart ? setView('cloud') : setShowCloudSetup(true))}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    border: `1px solid ${view === 'cloud' ? K.accent : K.border}`,
                    background: view === 'cloud' ? K.accent : K.surface,
                    color: view === 'cloud' ? '#fff' : K.text,
                    borderRadius: 10,
                    padding: '6px 12px',
                    fontSize: 12,
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    cursor: 'pointer'
                }}
            >
                {cloudPart ? (
                    <span
                        aria-hidden="true"
                        style={{
                            width: 8,
                            height: 8,
                            borderRadius: 4,
                            flexShrink: 0,
                            background: look.dot,
                            boxShadow: view === 'cloud' ? '0 0 0 2px #fff' : 'none',
                            animation: look.blink ? 'tbDotBlink 1.2s ease-in-out infinite' : 'none'
                        }}
                    />
                ) : null}
                Cloud
            </button>

            <button
                type="button"
                title={smart.title}
                aria-label={`Edge AI: ${smart.title}`}
                aria-pressed={view === 'ai'}
                onClick={leaveCloud(() => setView('ai'))}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    border: `1px solid ${view === 'ai' ? K.accent : K.border}`,
                    background: view === 'ai' ? K.accent : K.surface,
                    color: view === 'ai' ? '#fff' : K.text,
                    borderRadius: 10,
                    padding: '6px 12px',
                    fontSize: 12,
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    cursor: 'pointer'
                }}
            >
                {smart.dot ? (
                    <span
                        aria-hidden="true"
                        style={{
                            width: 8,
                            height: 8,
                            borderRadius: 4,
                            flexShrink: 0,
                            background: smart.dot,
                            boxShadow: view === 'ai' ? '0 0 0 2px #fff' : 'none'
                        }}
                    />
                ) : null}
                Edge AI
            </button>

            <UndoButtons />

            <div style={{flex: 1}} />

            {selectedModule && selectedDef ? (
                <div
                    role="status"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        background: `${K.accent}22`,
                        border: `1px solid ${K.accent}`,
                        borderRadius: 999,
                        padding: '4px 10px',
                        fontSize: 11,
                        color: K.text
                    }}
                >
                    {`Click a glowing port to plug in the ${selectedDef.name}`}
                    <button
                        type="button"
                        onClick={clearSelection}
                        style={{
                            border: 'none',
                            background: K.surface,
                            color: K.text,
                            borderRadius: 999,
                            padding: '2px 8px',
                            cursor: 'pointer',
                            fontSize: 11
                        }}
                    >
                        Cancel
                    </button>
                </div>
            ) : null}

            <UploadButton />

            <AccountMenu />
        </header>
    );
};

export default TopBar;
