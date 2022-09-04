import {makeDeviceLibrary} from '../lib/libraries/devices/index.jsx';

const SET_DEVICE_DATA = 'scratch-gui/device-list/setDeviceData';

const initialState = {
    deviceData: makeDeviceLibrary()
};

const reducer = function (state, action) {
    if (typeof state === 'undefined') state = initialState;
    switch (action.type) {
    case SET_DEVICE_DATA:
        return Object.assign({}, state, {
            deviceData: action.deviceData
        });
    default:
        return state;
    }
};

const setDeviceData = function (data) {
    return {
        type: SET_DEVICE_DATA,
        deviceData: data
    };
};

export {
    reducer as default,
    initialState as deviceDataInitialState,
    setDeviceData
};
