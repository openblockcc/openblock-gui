import {useCallback, useEffect, useMemo, useRef, useState} from 'react';

import {CLOUD_DEFAULTS, DEVICE_TOKEN_RE, clampInterval, validateWifi} from '../domain/cloud';
import {telemetryReadings, usedCloudControls} from '../domain/cloudFirmware';
import {keyTitles} from '../domain/cloudPanel';
import {uniqueBoardName} from '../domain/cloudProgress';
import {
    forgetAll,
    readLastDevice,
    readToken,
    readWifi,
    writeLastDevice,
    writeToken,
    writeWifi
} from '../domain/cloudSecrets';
import {errorText, iotApi} from '../../lib/iot-api';

const NEW = '__new__';

/** Steps the student is part-way through; coming back to the Cloud tab keeps them there. */
const MID_FLOW = ['wifi', 'upload'];

/**
 * Board, WiFi and upload setup for the Cloud tab.
 * step: board | wifi | upload | live ("live" is the board's home once it is set up)
 * phase: loading | signed_out | offline | unreachable | disabled | not_in_pilot | ready
 * @param {object} options.studio values from useStudio
 * @param {object} options.cloudLive live session from UploadContext
 * @param {boolean} options.active the Cloud tab is showing
 * @returns {object} phase, step and the `w` bag of state and actions for the step components
 */
const useCloudSetup = ({studio, cloudLive, active}) => {
    const {cloud, setCloud, connections, program, ai, projectName, setView} = studio;

    const [phase, setPhase] = useState('loading');
    const [phaseNote, setPhaseNote] = useState('');
    const loadSeq = useRef(0);
    const [step, setStep] = useState('');
    const [config, setConfig] = useState(null);
    const [devices, setDevices] = useState([]);
    const [choice, setChoice] = useState('');
    const [newName, setNewName] = useState('');
    const [busy, setBusy] = useState('');
    const [error, setError] = useState('');
    const [tokenVersion, setTokenVersion] = useState(0);
    const [wifi, setWifi] = useState({ssid: '', password: '', remember: false});
    const [touched, setTouched] = useState(false);
    const [intervalSec, setIntervalSec] = useState(CLOUD_DEFAULTS.intervalSec);

    const email = config && config.user ? config.user.email : null;
    const minInterval = config && config.limits ? config.limits.minIntervalSec : CLOUD_DEFAULTS.minIntervalSec;

    const failPhase = err => {
        if (err.status === 401 || err.code === 'unauthenticated') {
            setPhase('signed_out');
        } else if (err.code === 'disabled') {
            setPhase('disabled');
        } else if (err.code === 'not_in_pilot') {
            setPhase('not_in_pilot');
        } else if (err.code === 'offline') {
            setPhase('offline');
        } else {
            setPhase('unreachable');
            setPhaseNote(errorText(err));
        }
    };

    const load = useCallback(async ({quiet} = {}) => {
        // A slow earlier attempt must not overwrite the result of a newer one.
        const seq = ++loadSeq.current;
        const stale = () => seq !== loadSeq.current;
        if (!quiet) {
            setPhase('loading');
        }
        setError('');
        setPhaseNote('');
        let cfg;
        try {
            cfg = await iotApi.config();
        } catch (err) {
            if (!stale()) {
                failPhase(err);
            }
            return;
        }
        if (stale()) {
            return;
        }
        setConfig(cfg);
        if (!cfg.allowed) {
            setPhase('not_in_pilot');
            return;
        }
        if (!cfg.enabled) {
            setPhase('disabled');
            return;
        }
        let list = [];
        try {
            const res = await iotApi.listDevices();
            list = res.devices || [];
        } catch (err) {
            if (!stale()) {
                failPhase(err);
            }
            return;
        }
        if (stale()) {
            return;
        }
        const userEmail = cfg.user ? cfg.user.email : null;
        const sameUser = cloud && cloud.email === userEmail;
        const last = sameUser ? cloud : readLastDevice(userEmail);
        const lastFound = last && list.some(d => d.id === last.deviceId);
        // A project keeps the board it used; otherwise it gets a board of its own (named after
        // the project), and using an existing board is the student's choice.
        const pick = lastFound ? last.deviceId : NEW;
        const picked = list.find(d => d.id === pick);
        setDevices(list);
        setChoice(pick);
        setNewName(uniqueBoardName(projectName || 'My board', list.map(d => d.name)));
        if (last && last.deviceId && !lastFound) {
            setError('The board this project used was deleted. Pick another one or make a new one.');
            if (sameUser) {
                setStep('board');
            }
        }
        setWifi(readWifi(userEmail));
        const fallback = (cfg.limits && cfg.limits.defaultIntervalSec) || CLOUD_DEFAULTS.intervalSec;
        setIntervalSec(clampInterval(
            (sameUser && cloud.intervalSec) || (picked && picked.intervalSec) || fallback,
            (cfg.limits && cfg.limits.minIntervalSec) || CLOUD_DEFAULTS.minIntervalSec
        ));
        setPhase('ready');
    }, [cloud, projectName]);

    // Each time the tab opens: pick where to start, unless the student is part-way through.
    const deviceId = cloud ? cloud.deviceId : '';
    const shownFor = useRef(null);
    useEffect(() => {
        if (!active) {
            return;
        }
        const sameBoard = shownFor.current === deviceId;
        shownFor.current = deviceId;
        if (sameBoard && phase === 'ready' && MID_FLOW.indexOf(step) >= 0) {
            return;
        }
        setTouched(false);
        if (cloud && cloudLive.stage === 'uploading') {
            setStep('upload');
        } else {
            setStep(cloud ? 'live' : 'board');
        }
        load({quiet: sameBoard && phase === 'ready'});
        // Only when the tab opens or the project's board changes, not on every Studio change.
    }, [active, deviceId]);

    useEffect(() => {
        if (cloudLive.stage === 'waiting' || cloudLive.stage === 'live') {
            setStep('live');
        }
    }, [cloudLive.stage]);

    useEffect(() => {
        if (!active || (phase !== 'offline' && phase !== 'unreachable')) {
            return undefined;
        }
        const retry = () => load();
        window.addEventListener('online', retry);
        return () => window.removeEventListener('online', retry);
    }, [active, phase, load]);

    const selected = devices.find(d => d.id === choice) || null;
    const hasToken = useMemo(
        () => Boolean(selected && DEVICE_TOKEN_RE.test(readToken(email, selected.id) || '')),
        // tokenVersion forces a re-read after create/regenerate writes to storage.
        [selected, email, tokenVersion]
    );
    const wifiCheck = validateWifi(wifi);
    const maxDevices = config && config.limits ? config.limits.maxDevices : 0;
    const atLimit = maxDevices > 0 && devices.length >= maxDevices;
    const making = choice === NEW || !devices.length;

    const run = async (label, fn) => {
        setBusy(label);
        setError('');
        try {
            await fn();
        } catch (err) {
            if (err.status === 401 || err.code === 'unauthenticated') {
                setPhase('signed_out');
            } else if (err.code === 'disabled') {
                setPhase('disabled');
            } else if (err.code === 'not_found' && label !== 'create') {
                // Deleted from the dashboard (or another tab) while setting up.
                setDevices(prev => prev.filter(d => d.id !== choice));
                setChoice(devices.length > 1 ? '' : NEW);
                setStep('board');
                setError('That board was deleted. Pick another one or make a new one.');
            } else {
                setError(errorText(err));
            }
        } finally {
            setBusy('');
        }
    };

    const next = () => run(making ? 'create' : 'next', async () => {
        let board = selected;
        if (making) {
            const name = newName.trim();
            if (!name) {
                setError('Give the board a name first.');
                return;
            }
            const res = await iotApi.createDevice(name);
            board = Object.assign({latest: []}, res.device);
            setDevices(prev => prev.concat([board]));
            setChoice(board.id);
            if (!writeToken(email, board.id, res.token)) {
                setError('This browser would not save the board key (private window?). Upload from a normal window.');
            }
            setTokenVersion(v => v + 1);
        } else {
            if (!board) {
                setError('Pick a board, or make a new one.');
                return;
            }
            if (board.status === 'disabled') {
                setError('Turn this board back on first.');
                return;
            }
            if (!hasToken) {
                setError('Make a new key for this board first.');
                return;
            }
        }
        if (board.intervalSec !== intervalSec) {
            // The server uses the interval to decide when a quiet board counts as offline.
            const res = await iotApi.updateDevice(board.id, {intervalSec});
            setDevices(prev => prev.map(d => (d.id === res.device.id ? Object.assign({}, d, res.device) : d)));
        }
        setStep('wifi');
    });

    const saveWifi = () => run('save', async () => {
        setTouched(true);
        if (!selected) {
            setStep('board');
            return;
        }
        if (!wifiCheck.ok) {
            return;
        }
        writeWifi(email, wifi, wifi.remember);
        const link = {
            deviceId: selected.id,
            deviceName: selected.name,
            intervalSec,
            ssid: wifi.ssid,
            email,
            host: config.broker.host,
            mqttsPort: config.broker.mqttsPort,
            wssPath: config.broker.wssPath,
            minIntervalSec: minInterval
        };
        writeLastDevice(email, link);
        setCloud(link);
        // The tab would otherwise treat the new link as "a different board" and start over.
        shownFor.current = selected.id;
        const keys = telemetryReadings(connections, program, ai).map(r => r.key);
        const controls = usedCloudControls(program);
        const titleOf = keyTitles(connections, ai);
        const titles = {};
        keys.concat(controls).forEach(k => {
            if (titleOf(k)) {
                titles[k] = titleOf(k);
            }
        });
        iotApi.suggestDashboard(selected.id, keys, controls, titles).catch(() => {});
        setStep('upload');
    });

    const regenerate = () => run('token', async () => {
        const res = await iotApi.regenerateToken(selected.id);
        writeToken(email, selected.id, res.token);
        setTokenVersion(v => v + 1);
    });

    const enable = () => run('enable', async () => {
        const res = await iotApi.enableDevice(selected.id);
        setDevices(prev => prev.map(d => (d.id === res.device.id ? Object.assign({}, d, res.device) : d)));
        cloudLive.refresh();
    });

    const forget = () => {
        if (!window.confirm('Forget the WiFi password and all board keys saved on this computer?')) {
            return;
        }
        forgetAll(email);
        setWifi({ssid: '', password: '', remember: false});
        setTokenVersion(v => v + 1);
        writeLastDevice(email, null);
        setCloud(null);
        setStep('board');
    };

    const w = {
        cloud,
        devices,
        choice,
        setChoice: id => {
            setChoice(id);
            setError('');
        },
        newName,
        setNewName,
        selected,
        hasToken,
        busy,
        atLimit,
        maxDevices,
        intervalSec,
        setIntervalSec,
        minInterval,
        wifi,
        setWifi,
        wifiCheck,
        touched,
        setTouched,
        deviceId: cloud ? cloud.deviceId : (selected && selected.id),
        boardName: (selected && selected.name) || (cloud && cloud.deviceName) || newName,
        next,
        saveWifi,
        regenerate,
        enable,
        forget,
        unlink: () => {
            setCloud(null);
            setStep('board');
        },
        close: () => {
            setError('');
            if (cloud) {
                // A board switch that was started but not finished must not stick.
                if (devices.some(d => d.id === cloud.deviceId)) {
                    setChoice(cloud.deviceId);
                }
                setStep('live');
            } else {
                setView('build');
            }
        },
        back: () => setStep({wifi: 'board', upload: 'wifi', live: 'upload'}[step] || 'board'),
        // Straight to Upload when this computer has the key and WiFi, else to the step that is missing.
        goUpload: () => {
            setError('');
            if (!hasToken) {
                setStep('board');
            } else {
                setStep(wifiCheck.ok ? 'upload' : 'wifi');
            }
        },
        goBoard: () => setStep('board'),
        /** Start linking this project to another board: Board step with that board picked. */
        switchBoard: id => {
            setChoice(id);
            setError('');
            setStep('board');
        },
        /** A key was made elsewhere on this computer (the Settings tab); read it again. */
        tokenChanged: () => setTokenVersion(v => v + 1),
        /** A board was renamed or its interval changed (the Settings tab); the next upload must match. */
        deviceChanged: device => {
            setDevices(prev => prev.map(d => (d.id === device.id ? Object.assign({}, d, device) : d)));
            if (!cloud || cloud.deviceId !== device.id ||
                (cloud.deviceName === device.name && cloud.intervalSec === device.intervalSec)) {
                return;
            }
            const link = Object.assign({}, cloud, {deviceName: device.name, intervalSec: device.intervalSec});
            writeLastDevice(email, link);
            setCloud(link);
            setIntervalSec(device.intervalSec);
        },
        /** Boards were added or deleted elsewhere on the page; keeps typed WiFi and the current step. */
        refreshDevices: async () => {
            try {
                const res = await iotApi.listDevices();
                const list = res.devices || [];
                setDevices(list);
                setChoice(c => {
                    if (c === NEW || list.some(d => d.id === c)) {
                        return c;
                    }
                    return list.length ? '' : NEW;
                });
            } catch (err) {
                // The next time the page opens, load() tries again.
            }
        },
        fixWifi: () => {
            setTouched(true);
            setStep('wifi');
        },
        newKeyAndUpload: () => run('token', async () => {
            const res = await iotApi.regenerateToken(w.deviceId);
            writeToken(email, w.deviceId, res.token);
            setTokenVersion(v => v + 1);
            setStep('upload');
        })
    };

    return {phase, phaseNote, step, error, email, load, w};
};

export {NEW};
export default useCloudSetup;
