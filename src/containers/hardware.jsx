import PropTypes from 'prop-types';
import React from 'react';
import bindAll from 'lodash.bindall';

import {connect} from 'react-redux';
import {compose} from 'redux';
import {injectIntl} from 'react-intl';

import {showAlertWithTimeout} from '../reducers/alerts';
import {setCodeEditorValue, toggleLock} from '../reducers/code';

import {getLanguageFromDeviceType} from '../lib/device';

import HardwareComponent from '../components/hardware/hardware.jsx';

class Hardware extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleCodeEditorDidMount',
            'handleCodeEditorChange',
            'handleClickCodeEditorLock'
        ]);
    }

    handleCodeEditorWillMount (monaco) {
        monaco.editor.defineTheme('readOnlyTheme', {
            base: 'vs',
            inherit: true,
            rules: [{background: 'F9F9F9'}],
            colors: {
                'editor.background': '#F9F9F9'
            }
        });
    }

    handleCodeEditorDidMount (editor) {
        // Close the alert message from editor
        const messageContribution = editor.getContribution(
            'editor.contrib.messageController'
        );
        if (messageContribution) {
            messageContribution.dispose();
        }

        editor.onDidAttemptReadOnlyEdit(() => {
            this.props.onCodeEditorIsLocked();
        });
    }

    handleCodeEditorChange (newValue) {
        this.props.onSetCodeEditorValue(newValue);
    }

    handleClickCodeEditorLock () {
        this.props.onToggleCodeEditorLock();
    }

    render () {
        const codeEditorLanguage = getLanguageFromDeviceType(this.props.deviceType);
        const {
            ...props
        } = this.props;
        return (
            <HardwareComponent
                codeEditorLanguage={codeEditorLanguage}
                codeEditorOptions={this.props.isCodeEditorLocked ? {readOnly: true} : {readOnly: false}}
                codeEditorTheme={this.props.isCodeEditorLocked ? 'readOnlyTheme' : 'vs'}
                codeEditorValue={this.props.codeEditorValue}
                isCodeEditorLocked={this.props.isCodeEditorLocked}
                onCodeEditorWillMount={this.handleCodeEditorWillMount}
                onCodeEditorDidMount={this.handleCodeEditorDidMount}
                onCodeEditorChange={this.handleCodeEditorChange}
                onClickCodeEditorLock={this.handleClickCodeEditorLock}
                {...props}
            />
        );
    }
}

Hardware.propTypes = {
    codeEditorValue: PropTypes.string,
    deviceType: PropTypes.string,
    isCodeEditorLocked: PropTypes.bool.isRequired,
    onCodeEditorIsLocked: PropTypes.func.isRequired,
    onSetCodeEditorValue: PropTypes.func.isRequired,
    onToggleCodeEditorLock: PropTypes.func.isRequired
};

const mapStateToProps = state => ({
    codeEditorValue: state.scratchGui.code.codeEditorValue,
    deviceType: state.scratchGui.device.deviceType,
    isCodeEditorLocked: state.scratchGui.code.isCodeEditorLocked,
    stageSizeMode: state.scratchGui.stageSize.stageSize
});

const mapDispatchToProps = dispatch => ({
    onCodeEditorIsLocked: () => showAlertWithTimeout(dispatch, 'codeEditorIsLocked'),
    onSetCodeEditorValue: value => {
        dispatch(setCodeEditorValue(value));
    },
    onToggleCodeEditorLock: () => dispatch(toggleLock())
});

export default compose(
    injectIntl,
    connect(
        mapStateToProps,
        mapDispatchToProps
    )
)(Hardware);
