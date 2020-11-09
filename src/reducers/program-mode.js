const SET_UPLOAD_MODE = 'scratch-gui/progran-mode/SET_UPLOAD_MODE';
const SET_REALTIME_MODE = 'scratch-gui/progran-mode/SET_REALTIME_MODE';
const SET_SUPPORT_SWITCH_MODE = 'scratch-gui/progran-mode/SET_SUPPORT_SWITCH_MODE';

const initialState = {
    isUplodeMode: false,
    isRealtimeMode: true,
    isSupportSwitchMode: true
};

const reducer = function (state, action) {
    if (typeof state === 'undefined') state = initialState;
    switch (action.type) {
    case SET_UPLOAD_MODE:
        return Object.assign({}, state, {
            isUplodeMode: true,
            isRealtimeMode: false
        });
    case SET_REALTIME_MODE:
        return Object.assign({}, state, {
            isUplodeMode: false,
            isRealtimeMode: true
        });
    case SET_SUPPORT_SWITCH_MODE:
        return Object.assign({}, state, {
            isSupportSwitchMode: action.state
        });
    default:
        return state;
    }
};

const setUploadMode = () => ({
    type: SET_UPLOAD_MODE
});

const setRealtimeMode = () => ({
    type: SET_REALTIME_MODE
});

const setSupportSwitchMode = (state) => ({
    type: SET_SUPPORT_SWITCH_MODE,
    state: state
});

export {
    reducer as default,
    initialState as programModeInitialState,
    setUploadMode,
    setRealtimeMode,
    setSupportSwitchMode,
};
