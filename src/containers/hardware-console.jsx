import PropTypes from 'prop-types';
import React from 'react';
import {defineMessages} from 'react-intl';
import bindAll from 'lodash.bindall';
import {connect} from 'react-redux';
import {compose} from 'redux';
import {intlShape, injectIntl} from 'react-intl';
import VM from 'openblock-vm';
import iconv from 'iconv-lite';

import HardwareConsoleComponent from '../components/hardware-console/hardware-console.jsx';

import {
    openSerialportMenu,
    closeSerialportMenu,
    serialportMenuOpen
} from '../reducers/menus';

import {showAlertWithTimeout} from '../reducers/alerts';
import {setBaudrate, setEol, switchHexForm, switchAutoScroll, switchPause} from '../reducers/hardware-console';

const messages = defineMessages({
    noLineTerminators: {
        defaultMessage: 'No line terminators',
        description: 'no line terminators in the end of serialsport messge to send',
        id: 'gui.hardwareConsole.noLineTerminators'
    },
    lineFeed: {
        defaultMessage: 'Line feed',
        description: 'Line feed in the end of serialsport messge to send',
        id: 'gui.hardwareConsole.lineFeed'
    },
    carriageReturn: {
        defaultMessage: 'Carriage return',
        description: 'Carriage return in the end of serialsport messge to send',
        id: 'gui.hardwareConsole.carriageReturn'
    },
    lfAndCr: {
        defaultMessage: 'LF & CR',
        description: 'LF & CR in the end of serialsport messge to send',
        id: 'gui.hardwareConsole.lfAndCr'
    }
});

const baudrateList = [
    {key: '1200', value: 1200},
    {key: '2400', value: 2400},
    {key: '4800', value: 4800},
    {key: '9600', value: 9600},
    {key: '14400', value: 14400},
    {key: '19200', value: 19200},
    {key: '38400', value: 38400},
    {key: '57600', value: 57600},
    {key: '76800', value: 76800},
    {key: '115200', value: 115200},
    {key: '256000', value: 256000}
];

const eolList = [
    {key: 'null', value: messages.noLineTerminators},
    {key: 'lf', value: messages.lineFeed},
    {key: 'cr', value: messages.carriageReturn},
    {key: 'lfAndCr', value: messages.lfAndCr}
];

const MAX_CONSOLE_LENGTH = 32768;

// eslint-disable-next-line react/prefer-stateless-function
class HardwareConsole extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleClickClean',
            'handleClickAutoScroll',
            'handleClickHexForm',
            'handleClickPause',
            'handleClickSend',
            'handleInputChange',
            'handleSelectBaudrate',
            'handleSelectEol',
            'onReciveData'
        ]);
        this.state = {
            consoleArray: new Uint8Array(0),
            dataToSend: ''
        };
        this._recivceBuffer = new Uint8Array(0);
    }

    componentDidMount () {
        this.props.vm.addListener('PERIPHERAL_RECIVE_DATA', this.onReciveData);
        if (this.props.peripheralName) {
            this.props.vm.setPeripheralBaudrate(this.props.deviceId, parseInt(this.props.baudrate, 10));
        }
    }

    componentWillUnmount () {
        this.props.vm.removeListener('PERIPHERAL_RECIVE_DATA', this.onReciveData);
    }

    appendBuffer (arr1, arr2) {
        const arr = new Uint8Array(arr1.byteLength + arr2.byteLength);
        arr.set(arr1, 0);
        arr.set(arr2, arr1.byteLength);
        return arr;
    }

    onReciveData (data) {
        if (this.props.isPause) {
            return;
        }

        // limit data length to MAX_CONSOLE_LENGTH
        if (this._recivceBuffer.byteLength + data.byteLength >= MAX_CONSOLE_LENGTH) {
            this._recivceBuffer = this._recivceBuffer.slice(
                this._recivceBuffer.byteLength + data.byteLength - MAX_CONSOLE_LENGTH);
        }

        this._recivceBuffer = this.appendBuffer(this._recivceBuffer, data);

        // update the display per 0.1s
        if (!this._updateTimeoutID) {
            this._updateTimeoutID = setTimeout(() => {
                this.setState({
                    consoleArray: this._recivceBuffer
                });
                this._updateTimeoutID = null;
            }, 50);
        }
    }

    handleClickClean () {
        this._recivceBuffer = new Uint8Array(0);
        this.setState({
            consoleArray: new Uint8Array(0)
        });
    }

    handleClickPause () {
        this.props.onSwitchPause();
    }

    handleInputChange (e) {
        this.setState({
            dataToSend: e.target.value
        });
    }

    handleClickSend () {
        if (this.props.peripheralName) {
            let data = this.state.dataToSend;
            if (this.props.eol === 'lf') {
                data = `${data}\n`;
            } else if (this.props.eol === 'cr'){

                data = `${data}\r`;
            } else if (this.props.eol === 'lfAndCr'){

                data = `${data}\r\n`;
            }

            let buffer = null;
            if (this.props.locale === 'zh-cn') {
                buffer = iconv.encode(data, 'gb2312');
            } else {
                buffer = iconv.encode(data, 'utf-8');
            }
            this.props.vm.writeToPeripheral(this.props.deviceId, buffer);
        } else {
            this.props.onNoPeripheralIsConnected();
        }
    }

    handleSelectBaudrate (e) {
        if (this.props.peripheralName) {
            const index = e.target.selectedIndex;
            this.props.onSetBaudrate(baudrateList[index].key);
            this.props.vm.setPeripheralBaudrate(this.props.deviceId, baudrateList[index].value);
        } else {
            this.props.onNoPeripheralIsConnected();
        }
    }

    handleSelectEol (e) {
        const index = e.target.selectedIndex;
        this.props.onSetEol(eolList[index].key);
    }

    handleClickHexForm () {
        this.props.onSwitchHexForm();
    }

    handleClickAutoScroll () {
        this.props.onSwitchAutoScroll();
    }

    render () {
        const {
            ...props
        } = this.props;
        return (
            <HardwareConsoleComponent
                baudrate={this.props.baudrate}
                baudrateList={baudrateList}
                consoleArray={this.state.consoleArray}
                eol={this.props.eol}
                eolList={eolList}
                isAutoScroll={this.props.isAutoScroll}
                isHexForm={this.props.isHexForm}
                isPause={this.props.isPause}
                isRtl={this.props.isRtl}
                locale={this.props.locale}
                onClickClean={this.handleClickClean}
                onClickPause={this.handleClickPause}
                onClickAutoScroll={this.handleClickAutoScroll}
                onClickHexForm={this.handleClickHexForm}
                onClickSend={this.handleClickSend}
                onClickSerialportMenu={this.props.handleClickSerialportMenu}
                onInputChange={this.handleInputChange}
                onRequestSerialportMenu={this.props.handleRequestSerialportMenu}
                onSelectBaudrate={this.handleSelectBaudrate}
                onSelectEol={this.handleSelectEol}
                serialportMenuOpen={serialportMenuOpen}
                {...props}
            />
        );
    }
}

HardwareConsole.propTypes = {
    baudrate: PropTypes.string.isRequired,
    deviceId: PropTypes.string.isRequired,
    eol: PropTypes.string.isRequired,
    handleClickSerialportMenu: PropTypes.func.isRequired,
    handleRequestSerialportMenu: PropTypes.func.isRequired,
    isAutoScroll: PropTypes.bool.isRequired,
    isHexForm: PropTypes.bool.isRequired,
    isPause: PropTypes.bool.isRequired,
    intl: intlShape.isRequired,
    isRtl: PropTypes.bool,
    locale: PropTypes.string.isRequired,
    onNoPeripheralIsConnected: PropTypes.func.isRequired,
    onSetBaudrate: PropTypes.func.isRequired,
    onSetEol: PropTypes.func.isRequired,
    onSwitchAutoScroll: PropTypes.func.isRequired,
    onSwitchHexForm: PropTypes.func.isRequired,
    onSwitchPause: PropTypes.func.isRequired,
    peripheralName: PropTypes.string,
    vm: PropTypes.instanceOf(VM).isRequired
};

const mapStateToProps = state => ({
    baudrate: state.scratchGui.hardwareConsole.baudrate,
    deviceId: state.scratchGui.device.deviceId,
    eol: state.scratchGui.hardwareConsole.eol,
    isAutoScroll: state.scratchGui.hardwareConsole.isAutoScroll,
    isHexForm: state.scratchGui.hardwareConsole.isHexForm,
    isPause: state.scratchGui.hardwareConsole.isPause,
    isRtl: state.locales.isRtl,
    locale: state.locales.locale,
    peripheralName: state.scratchGui.connectionModal.peripheralName,
    serialportMenuOpen: serialportMenuOpen(state)
});

const mapDispatchToProps = dispatch => ({
    handleClickSerialportMenu: () => dispatch(openSerialportMenu()),
    handleRequestSerialportMenu: () => dispatch(closeSerialportMenu()),
    onNoPeripheralIsConnected: () => showAlertWithTimeout(dispatch, 'connectAPeripheralFirst'),
    onSetBaudrate: baudrate => dispatch(setBaudrate(baudrate)),
    onSetEol: eol => dispatch(setEol(eol)),
    onSwitchAutoScroll: () => dispatch(switchAutoScroll()),
    onSwitchHexForm: () => dispatch(switchHexForm()),
    onSwitchPause: () => dispatch(switchPause())
});

export default compose(
    injectIntl,
    connect(
        mapStateToProps,
        mapDispatchToProps
    )
)(HardwareConsole);
