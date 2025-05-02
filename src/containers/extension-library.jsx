import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';
import VM from 'openblock-vm';

import analytics from '../lib/analytics';

import {compose} from 'redux';
import {connect} from 'react-redux';
import {defineMessages, injectIntl, intlShape} from 'react-intl';

import extensionLibraryContent from '../lib/libraries/extensions/index.jsx';

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    },
    extensionUrl: {
        defaultMessage: 'Enter the URL of the extension',
        description: 'Prompt for unoffical extension url',
        id: 'gui.extensionLibrary.extensionUrl'
    },
    shieldTag: {
        id: 'gui.library.shieldTag',
        defaultMessage: 'Shield',
        description: 'Shield tag to filter all shield libraries.'
    },
    actuatorTag: {
        id: 'gui.library.actuatorTag',
        defaultMessage: 'Actuator',
        description: 'Actuator tag to filter all actuator libraries.'
    },
    sensorTag: {
        id: 'gui.library.sensorTag',
        defaultMessage: 'Sensor',
        description: 'Sensor tag to filter all sensor libraries.'
    },
    displayTag: {
        id: 'gui.library.displayTag',
        defaultMessage: 'Display',
        description: 'Display tag to filter all display libraries.'
    },
    communicationTag: {
        id: 'gui.library.communicationTag',
        defaultMessage: 'Communication',
        description: 'Communication tag to filter all communication libraries.'
    },
    otherTag: {
        id: 'gui.library.otherTag',
        defaultMessage: 'Other',
        description: 'Other tag to filter all other libraries.'
    }
});

const SHIELD_TAG = {tag: 'shield', intlLabel: messages.shieldTag};
const ACTUATOR_TAG = {tag: 'actuator', intlLabel: messages.actuatorTag};
const SENSOR_TAG = {tag: 'sensor', intlLabel: messages.sensorTag};
const DISPLAY_TAG = {tag: 'display', intlLabel: messages.displayTag};
const COMMUNICATION_TAG = {tag: 'communication', intlLabel: messages.communicationTag};
const OTHER_TAG = {tag: 'other', intlLabel: messages.otherTag};
const tagListPrefix = [SHIELD_TAG, ACTUATOR_TAG, SENSOR_TAG, DISPLAY_TAG, COMMUNICATION_TAG, OTHER_TAG];

class ExtensionLibrary extends React.PureComponent {
    constructor (props) {
        super(props);
        bindAll(this, [
            'updateScratchExtensions',
            'updateDeviceExtensions',
            'handleItemSelect'
        ]);
        this.state = {
            scratchExtensions: [],
            deviceExtensions: []
        };
    }

    componentDidMount () {
        if (this.props.isRealtimeMode) {
            this.updateScratchExtensions();
        } else {
            this.updateDeviceExtensions();
        }
    }

    updateScratchExtensions () {
        this.props.vm.extensionManager.getExtensionsList(Object.assign([], extensionLibraryContent))
            .then(data => {
                if (data) {
                    this.setState({scratchExtensions: data});
                }
            });
    }

    updateDeviceExtensions () {
        this.props.vm.extensionManager.getDeviceExtensionsList()
            .then(data => {
                if (data) {
                    this.setState({deviceExtensions: data});
                }
            });
    }

    handleItemSelect (item) {
        const id = item.extensionId;

        if (this.props.isRealtimeMode) {
            let url = item.extensionURL ? item.extensionURL : id;
            if (!item.disabled && !id) {
                // eslint-disable-next-line no-alert
                url = prompt(this.props.intl.formatMessage(messages.extensionUrl));
            }
            if (id && !item.disabled) {
                if (this.props.vm.extensionManager.isExtensionLoaded(url)) {
                    this.props.vm.extensionManager.unloadExtension(url);
                    this.updateScratchExtensions();
                } else {
                    this.props.vm.extensionManager.loadExtensionURL(url).then(() => {
                        this.updateScratchExtensions();
                        analytics.event({
                            category: 'extensions',
                            action: 'select extension',
                            label: id
                        });
                    });
                }
            }
        } else if (id && !item.disabled) {
            if (this.props.vm.extensionManager.isDeviceExtensionLoaded(id)) {
                this.props.vm.extensionManager.unloadDeviceExtension(id);
                this.updateDeviceExtensions();
            } else {
                this.props.vm.extensionManager.loadDeviceExtension(id).then(() => {
                    this.updateDeviceExtensions();
                    analytics.event({
                        category: 'extensions',
                        action: 'select device extension',
                        label: id
                    });
                })
                    .catch(err => {
                        // TODO add a alet device extension load failed. and change the state to bar to failed state
                        console.error(err); // eslint-disable-line no-console
                    });
            }
        }
    }
    render () {
        let extensionLibraryThumbnailData = [];
        const device = this.props.deviceData.find(dev => dev.deviceId === this.props.deviceId);
        const filterAndSort = extensions => extensions.filter(extension => {
            if (extension.supportDevice) {
                return extension.supportDevice.includes(this.props.deviceId) ||
                extension.supportDevice.includes(device.deviceExtensionsCompatible) ||
                extension.supportDevice.includes('*');
            }
            return true;
        })
            .map(extension => ({
                rawURL: extension.iconURL || extensionIcon,
                ...extension
            }))
            .sort((a, b) => {
                if ((b.isLoaded !== true) && (a.isLoaded === true)) return -1;
                return 1;
            });

        if (this.props.isRealtimeMode) {
            extensionLibraryThumbnailData = filterAndSort(this.state.scratchExtensions);
        } else {
            extensionLibraryThumbnailData = filterAndSort(this.state.deviceExtensions);
        }

        return (
            <LibraryComponent
                autoClose={false}
                data={extensionLibraryThumbnailData}
                filterable
                tags={this.props.isRealtimeMode ? [] : tagListPrefix}
                id="extensionLibrary"
                isUnloadble
                title={this.props.intl.formatMessage(messages.extensionTitle)}
                visible={this.props.visible}
                onItemSelected={this.handleItemSelect}
                onRequestClose={this.props.onRequestClose}
            />
        );
    }
}

ExtensionLibrary.propTypes = {
    deviceData: PropTypes.instanceOf(Array).isRequired,
    deviceId: PropTypes.string,
    intl: intlShape.isRequired,
    isRealtimeMode: PropTypes.bool,
    onRequestClose: PropTypes.func,
    visible: PropTypes.bool,
    vm: PropTypes.instanceOf(VM).isRequired // eslint-disable-line react/no-unused-prop-types
};

const mapStateToProps = state => ({
    deviceData: state.scratchGui.deviceData.deviceData,
    deviceId: state.scratchGui.device.deviceId,
    isRealtimeMode: state.scratchGui.programMode.isRealtimeMode
});

export default compose(
    injectIntl,
    connect(
        mapStateToProps
    )
)(ExtensionLibrary);
