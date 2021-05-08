import PropTypes from 'prop-types';
import React from 'react';
import bindAll from 'lodash.bindall';
import ConnectionModalComponent, {PHASES} from '../components/connection-modal/connection-modal.jsx';
import VM from 'openblock-vm';
import analytics from '../lib/analytics';
import extensionData from '../lib/libraries/extensions/index.jsx';
import {connect} from 'react-redux';
import {closeConnectionModal} from '../reducers/modals';
import {setConnectionModalPeripheralName} from '../reducers/connection-modal';

class ConnectionModal extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleScanning',
            'handleCancel',
            'handleConnected',
            'handleConnecting',
            'handleDisconnect',
            'handleError',
            'handleHelp'
        ]);
        this.state = {
            extension: extensionData.find(ext => ext.extensionId === props.deviceId) ||
                this.props.deviceData.find(ext => ext.deviceId === props.deviceId),
            phase: props.vm.getPeripheralIsConnected(props.deviceId) ?
                PHASES.connected : PHASES.scanning,
            peripheralName: null
        };
    }
    componentDidMount () {
        this.props.vm.on('PERIPHERAL_CONNECTED', this.handleConnected);
        this.props.vm.on('PERIPHERAL_REQUEST_ERROR', this.handleError);
    }
    componentWillUnmount () {
        this.props.vm.removeListener('PERIPHERAL_CONNECTED', this.handleConnected);
        this.props.vm.removeListener('PERIPHERAL_REQUEST_ERROR', this.handleError);
    }
    handleScanning () {
        this.setState({
            phase: PHASES.scanning
        });
    }
    handleConnecting (peripheralId, peripheralName) {
        if (this.props.isRealtimeMode) {
            this.props.vm.connectPeripheral(this.props.deviceId, peripheralId);
        } else {
            this.props.vm.connectPeripheral(this.props.deviceId, peripheralId, parseInt(this.props.baudrate, 10));
        }
        this.setState({
            phase: PHASES.connecting,
            peripheralName: peripheralName
        });
        analytics.event({
            category: 'devices',
            action: 'connecting',
            label: this.props.deviceId
        });
    }
    handleDisconnect () {
        try {
            this.props.vm.disconnectPeripheral(this.props.deviceId);
        } finally {
            this.props.onCancel();
        }
    }
    handleCancel () {
        try {
            // If we're not connected to a peripheral, close the websocket so we stop scanning.
            if (!this.props.vm.getPeripheralIsConnected(this.props.deviceId)) {
                this.props.vm.disconnectPeripheral(this.props.deviceId);
            }
        } finally {
            // Close the modal.
            this.props.onCancel();
        }
    }
    handleError () {
        // Assume errors that come in during scanning phase are the result of not
        // having scratch-link installed.
        if (this.state.phase === PHASES.scanning || this.state.phase === PHASES.unavailable) {
            this.setState({
                phase: PHASES.unavailable
            });
        } else {
            this.setState({
                phase: PHASES.error
            });
            analytics.event({
                category: 'devices',
                action: 'connecting error',
                label: this.props.deviceId
            });
        }
    }
    handleConnected () {
        this.setState({
            phase: PHASES.connected
        });
        analytics.event({
            category: 'devices',
            action: 'connected',
            label: this.props.deviceId
        });
        this.props.onConnected(this.state.peripheralName);
    }
    handleHelp () {
        window.open(this.state.extension.helpLink, '_blank');
        analytics.event({
            category: 'devices',
            action: 'device help',
            label: this.props.deviceId
        });
    }
    render () {
        return (
            <ConnectionModalComponent
                connectingMessage={this.state.extension && this.state.extension.connectingMessage}
                connectionIconURL={this.state.extension && this.state.extension.connectionIconURL}
                connectionSmallIconURL={this.state.extension && this.state.extension.connectionSmallIconURL}
                isSerialport={this.state.extension && this.state.extension.serialportRequired}
                connectionTipIconURL={this.state.extension && this.state.extension.connectionTipIconURL}
                extensionId={this.props.deviceId}
                name={this.state.extension && this.state.extension.name}
                phase={this.state.phase}
                title={this.props.deviceId}
                useAutoScan={this.state.extension && this.state.extension.useAutoScan}
                vm={this.props.vm}
                onCancel={this.handleCancel}
                onConnected={this.handleConnected}
                onConnecting={this.handleConnecting}
                onDisconnect={this.handleDisconnect}
                onHelp={this.handleHelp}
                onScanning={this.handleScanning}
            />
        );
    }
}

ConnectionModal.propTypes = {
    baudrate: PropTypes.string.isRequired,
    deviceId: PropTypes.string.isRequired,
    deviceData: PropTypes.instanceOf(Array).isRequired,
    isRealtimeMode: PropTypes.bool,
    onCancel: PropTypes.func.isRequired,
    onConnected: PropTypes.func.isRequired,
    vm: PropTypes.instanceOf(VM).isRequired
};

const mapStateToProps = state => ({
    baudrate: state.scratchGui.hardwareConsole.baudrate,
    deviceData: state.scratchGui.deviceData.deviceData,
    deviceId: state.scratchGui.device.deviceId,
    isRealtimeMode: state.scratchGui.programMode.isRealtimeMode
});

const mapDispatchToProps = dispatch => ({
    onCancel: () => {
        dispatch(closeConnectionModal());
    },
    onConnected: peripheralName => {
        dispatch(setConnectionModalPeripheralName(peripheralName));
    }
});

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(ConnectionModal);
