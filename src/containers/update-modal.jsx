import PropTypes from 'prop-types';
import React from 'react';
import bindAll from 'lodash.bindall';

import {connect} from 'react-redux';
import {compose} from 'redux';
import {injectIntl, intlShape, defineMessages} from 'react-intl';

import {closeUpdateModal} from '../reducers/modals';
import {setUpdate, clearUpdate} from '../reducers/update';

import UpdateModalComponent from '../components/update-modal/update-modal.jsx';

const messages = defineMessages({
    upgradeWarning: {
        id: 'gui.updateModal.upgradeWarning',
        defaultMessage: 'Currently unsaved projects will be lost, continue upgrade and restart?',
        description: 'Confirmation that user wants upgrade'
    }
});

const progressBarPhase = {
    idle: 0,
    downloading: 10,
    extracting: 80,
    covering: 90
};

class UpdateModal extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleCancel',
            'handleClickUpgrade'
        ]);
        this.state = {
            progressBarCompleted: progressBarPhase.idle
        };
    }

    componentWillUpdate (newProps) {
        if (this.props.updateState.phase !== newProps.updateState.phase) {
            if (newProps.updateState.phase === 'downloading') {
                this.setState({
                    progressBarCompleted: progressBarPhase.downloading
                });
                this.downloadInterval = setInterval(() => {
                    if (this.state.progressBarCompleted < (progressBarPhase.extracting - 1)) {
                        this.setState({
                            progressBarCompleted: this.state.progressBarCompleted + 1
                        });
                    }
                }, 2000);
            } else {
                clearInterval(this.downloadInterval);

                if (newProps.updateState.phase === 'extracting') {
                    this.setState({
                        progressBarCompleted: progressBarPhase.extracting
                    });
                } else if (newProps.updateState.phase === 'covering') {
                    this.setState({
                        progressBarCompleted: progressBarPhase.covering
                    });
                }
            }
        }
    }
    componentWillUnmount () {
        clearInterval(this.downloadInterval);
    }

    handleCancel () {
        this.props.onClearUpdate();
    }

    handleClickUpgrade () {
        const confirmUpgrade = this.props.confirmWithMessage(this.props.intl.formatMessage(messages.upgradeWarning));
        if (confirmUpgrade) {
            this.props.onSetUpdate({phase: 'downloading', speed: 0, transferred: 0});
            if (typeof this.props.onClickUpgrade !== 'undefined') {
                this.props.onClickUpgrade();
            }
        }
    }

    render () {
        return (
            <UpdateModalComponent
                onClickUpgrade={this.handleClickUpgrade}
                onCancel={this.handleCancel}
                updateState={this.props.updateState}
                progressBarCompleted={this.state.progressBarCompleted}
            />
        );
    }
}

UpdateModal.propTypes = {
    confirmWithMessage: PropTypes.func,
    intl: intlShape,
    onClickUpgrade: PropTypes.func.isRequired,
    onClearUpdate: PropTypes.func.isRequired,
    onSetUpdate: PropTypes.func.isRequired,
    updateState: PropTypes.shape({
        phase: PropTypes.oneOf(['idle', 'downloading', 'covering', 'checking', 'error', 'latest']),
        version: PropTypes.string,
        describe: PropTypes.string,
        message: PropTypes.string
    })
};

UpdateModal.defaultProps = {
    // default to using standard js confirm
    confirmWithMessage: message => (confirm(message)) // eslint-disable-line no-alert
};

const mapStateToProps = state => ({
    updateMessage: state.scratchGui.update.updateMessage,
    updateState: state.scratchGui.update.updateState
});

const mapDispatchToProps = dispatch => ({
    onClearUpdate: () => {
        dispatch(closeUpdateModal());
        dispatch(clearUpdate());
    },
    onSetUpdate: message => dispatch(setUpdate(message))
});

export default compose(
    injectIntl,
    connect(
        mapStateToProps,
        mapDispatchToProps
    )
)(UpdateModal);
