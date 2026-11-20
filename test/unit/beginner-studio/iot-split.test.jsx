import React from 'react';
import ReactDOM from 'react-dom';
import {act} from 'react-dom/test-utils';

import {useStudio} from '../../../src/beginner-studio/context/StudioContext.jsx';
import {writeLastDevice, writeToken} from '../../../src/beginner-studio/domain/cloudSecrets';
import useCloudSetup from '../../../src/beginner-studio/hooks/useCloudSetup';
import {CloudBoards} from '../../../src/beginner-studio/components/cloud/CloudView.jsx';
import DeviceDashboard from '../../../src/beginner-studio/components/cloud/DeviceDashboard.jsx';
import DeviceManager, {PROJECT} from '../../../src/beginner-studio/components/cloud/DeviceManager.jsx';
import {templateById} from '../../../src/beginner-studio/domain/templates';
import {iotApi} from '../../../src/lib/iot-api';
import {setNavigationBlocker} from '../../../src/iot/router';
import {useCloudStore} from '../../../src/iot/store';
import {ThemeContext} from '../../../src/iot/ui.jsx';

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
        createDevice: jest.fn(),
        deleteDevice: jest.fn(),
        regenerateToken: jest.fn(),
        updateDevice: jest.fn(),
        listDevices: jest.fn(),
        saveDashboard: jest.fn()
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
jest.mock('../../../src/beginner-studio/components/cloud/DeviceDashboardLazy', () => {
    const Fake = props => (
        <div data-dashboard={props.id} data-project={String(props.isProject)} data-board={props.projectBoard}>
            <button type="button" onClick={props.onUseForProject}>use</button>
            <button type="button" onClick={props.onBack}>back</button>
            <button type="button" onClick={() => props.onDeleted(props.id)}>deleted</button>
            <button type="button" onClick={() => props.onEditingChange(true)}>edit</button>
            <span>{props.titleFor ? `title:${props.titleFor('distance')}` : 'no titles'}</span>
        </div>
    );
    return {__esModule: true, default: Fake};
});

const K = new Proxy({}, {get: () => '#888888'});
const parking = templateById('cloud-parking');
const garden = {id: 'g', name: 'Garden', status: 'online', lastSeen: 1, rssi: -50};
const kitchen = {id: 'k', name: 'Kitchen', status: 'offline', lastSeen: Date.now() - (5 * 60000)};

let root;
const mount = el => act(() => {
    ReactDOM.render(<ThemeContext.Provider value={K}>{el}</ThemeContext.Provider>, root);
});
const click = el => act(() => {
    el.dispatchEvent(new MouseEvent('click', {bubbles: true}));
});
const button = label => [...root.querySelectorAll('button')].find(b => b.textContent === label || b.getAttribute('aria-label') === label);
const typeInto = (input, value) => act(() => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(input, value);
    input.dispatchEvent(new Event('input', {bubbles: true}));
});
const flush = () => act(async () => {
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
    setNavigationBlocker(null);
});

describe('IoT page: board list and dashboard side by side', () => {
    let w;
    let actions;
    let state;
    let live;
    const render = () => mount(<CloudBoards K={K} w={w} step={w.step} error="" cloudLive={live} />);
    const dashboard = () => root.querySelector('[data-dashboard]');

    beforeEach(() => {
        useStudio.mockReturnValue({connections: parking.connections});
        actions = {dispatch: jest.fn(), refreshDevices: jest.fn(), refreshDetail: jest.fn()};
        state = {config: {user: {email: 'kid@school.org'}, limits: {maxDevices: 5}}, devices: [garden, kitchen], devicesError: null, details: {}, detailErrors: {}};
        useCloudStore.mockImplementation(() => [state, actions]);
        live = {stage: 'idle'};
        w = {
            step: 'live',
            cloud: {deviceId: 'g', deviceName: 'Garden'},
            devices: [garden, kitchen],
            switchBoard: jest.fn(),
            close: jest.fn(),
            unlink: jest.fn(),
            refreshDevices: jest.fn(),
            tokenChanged: jest.fn(),
            goUpload: jest.fn(),
            fixWifi: jest.fn(),
            goBoard: jest.fn()
        };
        iotApi.createDevice.mockReset();
        writeToken.mockClear();
    });

    test('opens on the project\'s board with part-name titles; other boards are listed under it', async () => {
        render();
        await flush();
        expect(dashboard().getAttribute('data-dashboard')).toBe('g');
        expect(dashboard().getAttribute('data-project')).toBe('true');
        expect(root.textContent).toContain('title:HC-SR04');
        expect(button('This project: Garden, Online').getAttribute('aria-pressed')).toBe('true');
        expect(root.textContent).toContain('Other boards');
        expect(button(`Kitchen, Seen 5 min ago`)).toBeTruthy();
        expect(useCloudStore).toHaveBeenLastCalledWith({page: 'device', id: 'g'});
    });

    test('clicking another board only shows it; the project keeps its board', async () => {
        render();
        click(button('Kitchen, Seen 5 min ago'));
        await flush();
        expect(dashboard().getAttribute('data-dashboard')).toBe('k');
        expect(dashboard().getAttribute('data-project')).toBe('false');
        expect(dashboard().getAttribute('data-board')).toBe('Garden');
        expect(root.textContent).toContain('no titles');
        expect(useCloudStore).toHaveBeenLastCalledWith({page: 'device', id: 'k'});
        expect(w.switchBoard).not.toHaveBeenCalled();
        expect(root.querySelector('a[href="/iot/d/k"]')).toBeTruthy();
        click(button('back'));
        expect(dashboard().getAttribute('data-dashboard')).toBe('g');
    });

    test('using another board asks first, then starts the setup for it', async () => {
        render();
        click(button('Kitchen, Seen 5 min ago'));
        window.confirm.mockReturnValueOnce(false);
        click(button('use'));
        expect(window.confirm.mock.calls[0][0]).toContain('Your next Upload goes to “Kitchen”');
        expect(window.confirm.mock.calls[0][0]).toContain('“Garden” keeps running its old program');
        expect(w.switchBoard).not.toHaveBeenCalled();
        click(button('use'));
        expect(w.switchBoard).toHaveBeenCalledWith('k');
        expect(dashboard().getAttribute('data-dashboard')).toBe('g');
    });

    test('a switch to a board whose project board was deleted needs no confirm', () => {
        state.devices = [kitchen];
        render();
        click(button('Kitchen, Seen 5 min ago'));
        click(button('use'));
        expect(window.confirm).not.toHaveBeenCalled();
        expect(w.switchBoard).toHaveBeenCalledWith('k');
        expect(w.refreshDevices).toHaveBeenCalled();
    });

    test('while WiFi is typed for a newly picked board, that board is pinned as being set up', () => {
        w.step = 'wifi';
        w.selected = kitchen;
        render();
        expect(root.textContent).toContain('WIFI STEP');
        expect(button('This project: Kitchen, Being set up').getAttribute('aria-pressed')).toBe('true');
        click(button('Garden, Online'));
        expect(dashboard().getAttribute('data-dashboard')).toBe('g');
        expect(dashboard().getAttribute('data-board')).toBe('Kitchen');
        click(button('use'));
        expect(w.close).toHaveBeenCalled();
        expect(window.confirm).not.toHaveBeenCalled();
        expect(w.switchBoard).not.toHaveBeenCalled();
    });

    test('an unsaved dashboard edit can stop the switch', () => {
        render();
        setNavigationBlocker(() => 'Leave without saving your dashboard changes?');
        window.confirm.mockReturnValueOnce(false);
        click(button('Kitchen, Seen 5 min ago'));
        expect(dashboard().getAttribute('data-dashboard')).toBe('g');
    });

    test('a project without a board shows the setup steps and a placeholder row', () => {
        w.cloud = null;
        w.step = 'board';
        render();
        expect(root.textContent).toContain('BOARD STEP');
        expect(button('This project: No board yet, Set up a board for this project')).toBeTruthy();
        expect(useCloudStore).toHaveBeenLastCalledWith({page: 'devices'});
    });

    test('the going-live checklist wins over the dashboard while a board connects', () => {
        live = {stage: 'waiting'};
        render();
        expect(root.textContent).toContain('LIVE STEP');
        expect(dashboard()).toBeNull();
    });

    test('an upload brings the project\'s board back on screen', () => {
        render();
        click(button('Kitchen, Seen 5 min ago'));
        live = {stage: 'uploading'};
        render();
        expect(dashboard().getAttribute('data-dashboard')).toBe('g');
        live = {stage: 'waiting'};
        render();
        expect(root.textContent).toContain('LIVE STEP');
    });

    test('an upload leaves an unsaved dashboard edit alone if the student says stay', () => {
        render();
        click(button('Kitchen, Seen 5 min ago'));
        setNavigationBlocker(() => 'Leave without saving your dashboard changes?');
        window.confirm.mockReturnValueOnce(false);
        live = {stage: 'uploading'};
        render();
        expect(dashboard().getAttribute('data-dashboard')).toBe('k');
    });

    test('one board: a compact column; editing: a rail of dots', async () => {
        state.devices = [garden];
        w.devices = [garden];
        render();
        await flush();
        const grid = root.firstChild;
        expect(grid.style.gridTemplateColumns).toContain('230px');
        click(button('edit'));
        expect(root.firstChild.style.gridTemplateColumns).toContain('52px');
        expect(button('This project: Garden').getAttribute('aria-pressed')).toBe('true');
    });

    test('two or more boards: the full 30% list', () => {
        render();
        expect(root.firstChild.style.gridTemplateColumns).toContain('30%');
    });

    test('a board deleted on another screen falls back to the project\'s board', async () => {
        render();
        click(button('Kitchen, Seen 5 min ago'));
        state = Object.assign({}, state, {devices: [garden]});
        render();
        await flush();
        expect(dashboard().getAttribute('data-dashboard')).toBe('g');
    });

    test('deleting the project\'s board unlinks the project', () => {
        render();
        click(button('deleted'));
        expect(w.unlink).toHaveBeenCalledTimes(1);
        expect(w.refreshDevices).toHaveBeenCalled();
    });

    test('adding a board saves its key and opens it', async () => {
        iotApi.createDevice.mockReturnValue(Promise.resolve({device: {id: 'n', name: 'Shed', status: 'never'}, token: 'tok'}));
        render();
        click(button('+ Add another board'));
        typeInto(root.querySelector('#tb-new-board'), 'Shed');
        await act(async () => {
            root.querySelector('form').dispatchEvent(new Event('submit', {bubbles: true, cancelable: true}));
            await Promise.resolve();
        });
        await flush();
        expect(iotApi.createDevice).toHaveBeenCalledWith('Shed');
        expect(writeToken).toHaveBeenCalledWith('kid@school.org', 'n', 'tok');
        expect(actions.dispatch).toHaveBeenCalledWith({type: 'device/upsert', device: expect.objectContaining({id: 'n'})});
        expect(w.refreshDevices).toHaveBeenCalled();
        expect(w.tokenChanged).toHaveBeenCalled();
    });
});

describe('board list', () => {
    const base = {
        K,
        mode: 'full',
        devices: [garden, kitchen],
        devicesError: null,
        onRetry: jest.fn(),
        limit: 5,
        project: {id: 'g', name: 'Garden'},
        selected: PROJECT,
        onSelect: jest.fn(),
        onAdd: jest.fn(() => Promise.resolve('')),
        phone: {id: 'g', name: 'Garden'},
        now: Date.now()
    };
    const submit = () => act(async () => {
        root.querySelector('form').dispatchEvent(new Event('submit', {bubbles: true, cancelable: true}));
        await Promise.resolve();
    });

    test('a board name is needed, and must not repeat an existing one', async () => {
        const onAdd = jest.fn(() => Promise.resolve(''));
        mount(<DeviceManager {...base} onAdd={onAdd} />);
        click(button('+ Add another board'));
        await submit();
        expect(root.textContent).toContain('Give the board a name.');
        typeInto(root.querySelector('#tb-new-board'), '  kitchen ');
        await submit();
        expect(root.textContent).toContain('You already have a board called “kitchen”');
        expect(onAdd).not.toHaveBeenCalled();
    });

    test('a failed add keeps the form open with the reason', async () => {
        const onAdd = jest.fn(() => Promise.resolve('failed: limit_reached'));
        mount(<DeviceManager {...base} onAdd={onAdd} />);
        click(button('+ Add another board'));
        typeInto(root.querySelector('#tb-new-board'), 'Shed');
        await submit();
        await flush();
        expect(onAdd).toHaveBeenCalledWith('Shed');
        expect(root.textContent).toContain('failed: limit_reached');
        expect(root.querySelector('#tb-new-board')).toBeTruthy();
    });

    test('at the board limit there is no add form', () => {
        mount(<DeviceManager {...base} limit={2} />);
        expect(button('+ Add another board')).toBeUndefined();
        expect(root.textContent).toContain('You have 2 boards, the most you can have');
    });

    test('the project\'s board deleted elsewhere says so, in every layout', () => {
        mount(<DeviceManager {...base} devices={[kitchen]} />);
        expect(root.textContent).toContain('This board was deleted');
        mount(<DeviceManager {...base} devices={[kitchen]} mode="narrow" />);
        expect(root.querySelector('option').textContent).toBe('This project: Garden (this board was deleted)');
        mount(<DeviceManager {...base} devices={[kitchen]} mode="rail" />);
        expect(button('This project: Garden (this board was deleted)')).toBeTruthy();
        mount(<DeviceManager {...base} project={{id: null, name: ''}} mode="narrow" />);
        expect(root.querySelector('option').textContent).toBe('This project: No board yet');
    });

    test('loading and errors', () => {
        mount(<DeviceManager {...base} devices={null} />);
        expect(root.textContent).toContain('Loading your boards');
        const onRetry = jest.fn();
        mount(<DeviceManager {...base} devices={null} devicesError="unavailable" onRetry={onRetry} />);
        click(button('Try again'));
        expect(onRetry).toHaveBeenCalled();
    });

    test('narrow windows get a dropdown', () => {
        const onSelect = jest.fn();
        mount(<DeviceManager {...base} mode="narrow" onSelect={onSelect} />);
        const select = root.querySelector('select');
        expect([...select.options].map(o => o.textContent)).toEqual(['This project: Garden', 'Kitchen (Seen 5 min ago)']);
        act(() => {
            select.value = 'k';
            select.dispatchEvent(new Event('change', {bubbles: true}));
        });
        expect(onSelect).toHaveBeenCalledWith('k');
    });
});

describe('board dashboard', () => {
    const detailFor = (device, extra) => Object.assign({
        device,
        latest: [{key: 'distance', value: 42, ts: Date.now()}],
        controls: [],
        rules: [],
        dashboard: {
            version: 1,
            isDefault: true,
            layout: [
                {id: 'v_0', type: 'value', key: 'distance', title: 'distance', size: 'S', w: 1, h: 1, options: {}},
                {id: 'v_1', type: 'value', key: 'distance', title: 'Car park', size: 'S', w: 1, h: 1, options: {}}
            ]
        }
    }, extra);
    const handlers = () => ({
        onUpload: jest.fn(),
        onChangeWifi: jest.fn(),
        onChangeBoard: jest.fn(),
        onBack: jest.fn(),
        onUseForProject: jest.fn(),
        onUnlinkDeleted: jest.fn(),
        onDeleted: jest.fn(),
        onNewKey: jest.fn(),
        onChanged: jest.fn(),
        onEditingChange: jest.fn()
    });
    const show = (props, details, detailErrors = {}) => {
        const state = {
            config: {user: {email: 'kid@school.org'}, limits: {minIntervalSec: 5}},
            details,
            detailErrors,
            recent: {},
            alerts: {items: []}
        };
        const actions = {dispatch: jest.fn(), refreshDetail: jest.fn(() => Promise.resolve())};
        mount(<DeviceDashboard K={K} state={state} actions={actions} now={Date.now()} {...props} />);
        return actions;
    };

    test('the project\'s board: Upload again, and part names only where nobody typed a title', () => {
        const h = handlers();
        show(Object.assign({id: 'g', isProject: true, projectBoard: 'Garden', titleFor: k => (k === 'distance' ? 'HC-SR04 Ultrasonic' : null)}, h),
            {g: detailFor(Object.assign({}, garden, {lastSeen: Date.now()}))});
        expect(root.textContent).toContain('HC-SR04 Ultrasonic');
        expect(root.textContent).toContain('Car park');
        expect(root.textContent).not.toContain('You\'re looking at');
        click(button('Upload again'));
        expect(h.onUpload).toHaveBeenCalled();
        click(button('Change WiFi'));
        expect(h.onChangeWifi).toHaveBeenCalled();
    });

    test('another board: says where uploads go, with a way back and a way to switch', () => {
        const h = handlers();
        show(Object.assign({id: 'k', isProject: false, projectBoard: 'Garden'}, h), {k: detailFor(kitchen)});
        expect(root.textContent).toContain('You\'re looking at “Kitchen”. This project uploads to “Garden”.');
        expect(button('Upload again')).toBeUndefined();
        click(button('Back to Garden'));
        expect(h.onBack).toHaveBeenCalled();
        click(button('Use “Kitchen” for this project'));
        expect(h.onUseForProject).toHaveBeenCalled();
    });

    test('another board while the project\'s board is deleted: the strip says so', () => {
        const h = handlers();
        show(Object.assign({id: 'k', isProject: false, projectBoard: 'Garden', projectGone: true}, h), {k: detailFor(kitchen)});
        expect(root.textContent).toContain('You\'re looking at “Kitchen”. This project\'s board “Garden” was deleted.');
        click(button('Back to this project'));
        expect(h.onBack).toHaveBeenCalled();
    });

    test('a board that never connected gets a next step instead of an empty page', () => {
        show(Object.assign({id: 'k', isProject: false, projectBoard: ''}, handlers()), {k: detailFor(Object.assign({}, kitchen, {lastSeen: null, status: 'never'}))});
        expect(root.textContent).toContain('This board has no program yet');
        expect(root.textContent).toContain('This project is not linked to a board yet.');
        show(Object.assign({id: 'g', isProject: true, projectBoard: 'Garden'}, handlers()), {g: detailFor(Object.assign({}, garden, {lastSeen: null, status: 'never'}))});
        expect(root.textContent).toContain('Waiting for “Garden” to connect');
        expect(button('Upload to the board')).toBeTruthy();
    });

    test('the project\'s board deleted on another screen offers to pick another', () => {
        const h = handlers();
        show(Object.assign({id: 'g', isProject: true, projectBoard: 'Garden'}, h), {}, {g: 'not_found'});
        click(button('Pick another board'));
        expect(h.onUnlinkDeleted).toHaveBeenCalled();
    });

    test('Alerts explains itself; Settings keeps the risky parts folded away', async () => {
        const h = handlers();
        iotApi.deleteDevice.mockReturnValue(Promise.resolve({}));
        show(Object.assign({id: 'g', isProject: true, projectBoard: 'Garden'}, h), {g: detailFor(garden)});
        click(button('Alerts'));
        expect(root.textContent).toContain('Get a message on your phone when a reading goes above or below a number.');
        click(button('Settings'));
        const fold = [...root.querySelectorAll('details')].find(d => d.querySelector('summary').textContent.indexOf('Advanced') === 0);
        expect(fold.hasAttribute('open')).toBe(false);
        expect(fold.querySelector('summary').textContent).toContain('board key, delete');
        expect(fold.textContent).toContain('Make a new key');
        expect(fold.textContent).toContain('This project will need a new board after this.');
        typeInto(fold.querySelector('input[aria-label="Type the board name to confirm"]'), 'Garden');
        click(button('Delete forever'));
        await flush();
        expect(iotApi.deleteDevice).toHaveBeenCalledWith('g');
        expect(h.onDeleted).toHaveBeenCalledWith('g');
        expect(window.location.pathname).not.toBe('/iot');
    });

    test('a new interval on the project\'s board is passed on so the next upload matches', async () => {
        const h = handlers();
        iotApi.updateDevice.mockReturnValue(Promise.resolve({device: Object.assign({}, garden, {intervalSec: 30})}));
        show(Object.assign({id: 'g', isProject: true, projectBoard: 'Garden'}, h), {g: detailFor(Object.assign({}, garden, {intervalSec: 10}))});
        click(button('Settings'));
        expect(root.textContent).toContain('Upload again after changing it.');
        const select = [...root.querySelectorAll('select')].find(el => el.value === '10');
        act(() => {
            select.value = '30';
            select.dispatchEvent(new Event('change', {bubbles: true}));
        });
        await flush();
        expect(iotApi.updateDevice).toHaveBeenCalledWith('g', {intervalSec: 30});
        expect(h.onChanged).toHaveBeenCalledWith(expect.objectContaining({id: 'g', intervalSec: 30}));
        show(Object.assign({id: 'k', isProject: false, projectBoard: 'Garden'}, handlers()), {k: detailFor(kitchen)});
        click(button('Settings'));
        expect(root.textContent).toContain('Change it in that board\'s project too, then upload.');
    });

    test('a new key is saved for Studio and asks for another upload', async () => {
        const h = handlers();
        iotApi.regenerateToken.mockReturnValue(Promise.resolve({token: 'new'}));
        show(Object.assign({id: 'g', isProject: true, projectBoard: 'Garden'}, h), {g: detailFor(garden)});
        click(button('Settings'));
        click(button('Make a new key'));
        await flush();
        expect(writeToken).toHaveBeenCalledWith('kid@school.org', 'g', 'new');
        expect(h.onNewKey).toHaveBeenCalledWith('g');
        expect(root.textContent).toContain('Upload again so the board uses it.');
    });
});

describe('setup state after a Settings change', () => {
    let w;
    let setCloud;
    const Probe = ({cloud}) => {
        const studio = {cloud, setCloud, connections: [], program: {}, projectName: 'Garden', setView: jest.fn()};
        w = useCloudSetup({studio, cloudLive: {stage: 'idle'}, active: false}).w;
        return null;
    };

    beforeEach(() => {
        setCloud = jest.fn();
        writeLastDevice.mockClear();
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
