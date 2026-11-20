import React from 'react';
import ReactDOM from 'react-dom';
import {act} from 'react-dom/test-utils';

import {useStudio} from '../../../src/beginner-studio/context/StudioContext.jsx';
import {readLastDevice, writeLastDevice} from '../../../src/beginner-studio/domain/cloudSecrets';
import useCloudSetup, {NEW} from '../../../src/beginner-studio/hooks/useCloudSetup';
import {CloudPanel} from '../../../src/beginner-studio/components/cloud/CloudView.jsx';
import {templateById} from '../../../src/beginner-studio/domain/templates';
import {iotApi} from '../../../src/lib/iot-api';
import {useCloudStore} from '../../../src/iot/store';

jest.mock('../../../src/beginner-studio/context/StudioContext.jsx', () => ({useStudio: jest.fn()}));
jest.mock('../../../src/beginner-studio/context/UploadContext.jsx', () => ({useUpload: jest.fn()}));
jest.mock('../../../src/iot/store', () => ({useCloudStore: jest.fn()}));
jest.mock('../../../src/beginner-studio/domain/cloudSecrets', () => ({
    writeToken: jest.fn(() => true),
    readToken: jest.fn(() => null),
    readWifi: jest.fn(() => ({ssid: '', password: '', remember: false})),
    readLastDevice: jest.fn(() => null),
    writeLastDevice: jest.fn(),
    writeWifi: jest.fn(),
    forgetAll: jest.fn()
}));
jest.mock('../../../src/lib/iot-api', () => ({
    iotApi: {
        config: jest.fn(),
        listDevices: jest.fn(),
        createDevice: jest.fn(),
        updateDevice: jest.fn(),
        regenerateToken: jest.fn()
    },
    errorText: err => `failed: ${err.code}`,
    isTransient: () => false
}));
jest.mock('../../../src/beginner-studio/components/cloud/BoardStep.jsx', () => () => <div>BOARD STEP</div>);
jest.mock('../../../src/beginner-studio/components/cloud/WifiStep.jsx', () => () => <div>WIFI STEP</div>);
jest.mock('../../../src/beginner-studio/components/cloud/UploadStep.jsx', () => () => <div>UPLOAD STEP</div>);
jest.mock('../../../src/beginner-studio/components/cloud/LiveStep.jsx', () => ({
    __esModule: true,
    default: () => <div>LIVE STEP</div>,
    PhoneLink: ({id, name}) => <a href={`/iot/d/${id}`}>{`${name} QR`}</a>
}));

const K = new Proxy({}, {get: () => '#888888'});
const parking = templateById('cloud-parking');

let root;
const mount = el => act(() => {
    ReactDOM.render(el, root);
});
const click = el => act(() => {
    el.dispatchEvent(new MouseEvent('click', {bubbles: true}));
});
const button = label => [...root.querySelectorAll('button')].find(b => b.textContent === label);
const items = () => [...root.querySelectorAll('ol[aria-label="Cloud setup"] > li')];
const flush = () => act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
});

beforeEach(() => {
    root = document.createElement('div');
    document.body.appendChild(root);
    window.confirm = jest.fn(() => true);
});

afterEach(() => {
    ReactDOM.unmountComponentAtNode(root);
    root.remove();
});

describe('Studio Cloud page: one checklist', () => {
    let w;
    let live;
    let state;
    const render = step => mount(<CloudPanel K={K} w={w} step={step} error="" cloudLive={live} />);

    beforeEach(() => {
        useStudio.mockReturnValue({connections: parking.connections, ai: null});
        live = {stage: 'idle'};
        state = {
            devices: [{id: 'g', name: 'Garden', status: 'online', lastSeen: 1}],
            details: {
                g: {
                    device: {id: 'g', name: 'Garden', status: 'online', lastSeen: 1},
                    latest: [{key: 'distance', value: 42, ts: 1}],
                    controls: [
                        {key: 'switch1', kind: 'switch', value: 1, version: 3, ackedVersion: 3},
                        {key: 'switch2', kind: 'switch', value: 0, version: 1, ackedVersion: 0}
                    ]
                }
            }
        };
        useCloudStore.mockImplementation(() => [state, {}]);
        w = {
            cloud: null,
            boardName: 'Parking Sensor',
            wifi: {ssid: '', password: '', remember: false},
            busy: '',
            goBoard: jest.fn(),
            fixWifi: jest.fn(),
            goUpload: jest.fn(),
            newKeyAndUpload: jest.fn(),
            unlink: jest.fn(),
            forget: jest.fn()
        };
    });

    test('a new project starts at its board; WiFi and upload wait; nothing live yet', () => {
        render('board');
        const [board, wifi, go] = items();
        expect(board.getAttribute('aria-current')).toBe('step');
        expect(board.textContent).toContain('BOARD STEP');
        expect(wifi.textContent).toContain('WiFi for the board');
        expect(wifi.textContent).not.toContain('WIFI STEP');
        expect(go.textContent).toContain('Upload and go live');
        expect(root.querySelector('aside')).toBeNull();
        expect(root.textContent).not.toContain('Board key and other settings');
    });

    test('the WiFi step: the board is ticked with its name and can be changed', () => {
        render('wifi');
        const [board, wifi] = items();
        expect(board.textContent).toContain('Cloud board “Parking Sensor”');
        expect(wifi.textContent).toContain('WIFI STEP');
        click([...board.querySelectorAll('button')].find(b => b.textContent === 'Change'));
        expect(w.goBoard).toHaveBeenCalled();
    });

    test('uploading, then going live, open the third step', () => {
        render('upload');
        expect(items()[2].textContent).toContain('UPLOAD STEP');
        w.cloud = {deviceId: 'g', deviceName: 'Garden', ssid: 'HomeNet'};
        live = {stage: 'waiting'};
        render('live');
        expect(items()[2].textContent).toContain('LIVE STEP');
    });

    test('set up: every step ticked, the board live beside it, a QR code and Upload again', () => {
        w.cloud = {deviceId: 'g', deviceName: 'Garden', ssid: 'HomeNet'};
        w.boardName = 'Garden';
        w.wifi = {ssid: 'HomeNet', password: '', remember: false};
        render('live');
        const [board, wifi, go] = items();
        expect(board.textContent).toContain('Cloud board “Garden”');
        expect(wifi.textContent).toContain('WiFi “HomeNet”');
        expect(go.textContent).toContain('On your board and live');
        expect(items().some(li => li.getAttribute('aria-current') === 'step')).toBe(false);
        click(button('Upload again'));
        expect(w.goUpload).toHaveBeenCalled();
        click([...wifi.querySelectorAll('button')].find(b => b.textContent === 'Change'));
        expect(w.fixWifi).toHaveBeenCalled();

        const aside = root.querySelector('aside');
        expect(aside.textContent).toContain('Online');
        expect(aside.textContent).toContain('HC-SR04 Ultrasonic');
        expect(aside.textContent).toContain('42 cm');
        // A control the program uses shows; one never touched does not.
        expect(aside.textContent).toContain('On');
        expect(aside.textContent.match(/Switch 2|switch2/)).toBeNull();
        expect(aside.querySelector('a[href="/iot/d/g"]').textContent).toBe('Garden QR');
        expect(root.textContent).toContain('Board key and other settings');
        expect(root.textContent).not.toContain('Edit dashboard');
    });

    test('a board that has not sent anything yet says so', () => {
        w.cloud = {deviceId: 'g', deviceName: 'Garden', ssid: 'HomeNet'};
        state.details.g = Object.assign({}, state.details.g, {latest: [], controls: [], device: {id: 'g', name: 'Garden', status: 'never', lastSeen: null}});
        render('live');
        expect(root.querySelector('aside').textContent).toContain('Readings show up here once the board is online.');
    });
});

describe('setup state', () => {
    let w;
    let setCloud;
    const Probe = ({cloud, active}) => {
        const studio = {cloud, setCloud, connections: [], program: [], projectName: 'Garden', setView: jest.fn()};
        w = useCloudSetup({studio, cloudLive: {stage: 'idle'}, active: Boolean(active)}).w;
        return null;
    };

    beforeEach(() => {
        setCloud = jest.fn();
        writeLastDevice.mockClear();
        readLastDevice.mockReturnValue(null);
        iotApi.config.mockReturnValue(Promise.resolve({
            allowed: true,
            enabled: true,
            user: {email: 'kid@school.org'},
            limits: {maxDevices: 10, minIntervalSec: 5, defaultIntervalSec: 10},
            broker: {host: 'h', mqttsPort: 8883, wssPath: '/mqtt'}
        }));
    });

    test('a project without a board gets one of its own, even when another board exists', async () => {
        iotApi.listDevices.mockReturnValue(Promise.resolve({devices: [{id: 'k', name: 'Kitchen', status: 'offline', intervalSec: 10}]}));
        mount(<Probe cloud={null} active />);
        await flush();
        expect(w.choice).toBe(NEW);
        expect(w.newName).toBe('Garden');
    });

    test('a project keeps the board it used', async () => {
        readLastDevice.mockReturnValue({deviceId: 'k', deviceName: 'Kitchen'});
        iotApi.listDevices.mockReturnValue(Promise.resolve({devices: [{id: 'k', name: 'Kitchen', status: 'offline', intervalSec: 10}]}));
        mount(<Probe cloud={null} active />);
        await flush();
        expect(w.choice).toBe('k');
    });

    test('renaming or retiming the project\'s board updates the project link', () => {
        const cloud = {deviceId: 'g', deviceName: 'Garden', intervalSec: 10, email: 'kid@school.org'};
        mount(<Probe cloud={cloud} />);
        act(() => w.deviceChanged({id: 'g', name: 'Veg patch', intervalSec: 30}));
        const link = Object.assign({}, cloud, {deviceName: 'Veg patch', intervalSec: 30});
        expect(setCloud).toHaveBeenCalledWith(link);
        expect(writeLastDevice).toHaveBeenCalledWith(null, link);
    });

    test('other boards, or no real change, leave the link alone', () => {
        const cloud = {deviceId: 'g', deviceName: 'Garden', intervalSec: 10};
        mount(<Probe cloud={cloud} />);
        act(() => w.deviceChanged({id: 'k', name: 'Kitchen', intervalSec: 30}));
        act(() => w.deviceChanged({id: 'g', name: 'Garden', intervalSec: 10}));
        expect(setCloud).not.toHaveBeenCalled();
        expect(writeLastDevice).not.toHaveBeenCalled();
    });
});
