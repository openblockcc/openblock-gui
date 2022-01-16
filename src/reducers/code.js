const UPDATE_CODE = 'scratch-gui/code/UPDATE_CODE';

const initialState = {
    codeEditorValue: '// Monaco editor'
};

const reducer = function (state, action) {
    if (typeof state === 'undefined') state = initialState;
    switch (action.type) {
    case UPDATE_CODE:
        return Object.assign({}, state, {
            codeEditorValue: action.value
        });
    default:
        return state;
    }
};

const setCodeEditorValue = value => ({
    type: UPDATE_CODE,
    value: value
});

export {
    reducer as default,
    initialState as codeInitialState,
    setCodeEditorValue
};
