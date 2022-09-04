import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';
import {injectIntl} from 'react-intl';

import LibraryItemComponent from '../components/library-item/library-item.jsx';

class LibraryItem extends React.PureComponent {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleBlur',
            'handleClick',
            'handleClickLearnMore',
            'handleFocus',
            'handleKeyPress',
            'handleMouseEnter',
            'handleMouseLeave',
            'handlePlay',
            'handleStop',
            'rotateIcon',
            'startRotatingIcons',
            'stopRotatingIcons'
        ]);
        this.state = {
            iconIndex: 0,
            isRotatingIcon: false,
            isProcessing: false
        };
    }
    componentWillUpdate (newProps) {
        if (this.props.isLoaded !== newProps.isLoaded) {
            this.setState({
                isProcessing: false
            });
        }
    }
    componentWillUnmount () {
        clearInterval(this.intervalId);
    }
    handleBlur (id) {
        this.handleMouseLeave(id);
    }
    handleClick (e) {
        if (!this.props.disabled) {
            if (!this.state.isProcessing) {
                if (this.props.isUnloadble) {
                    this.setState({
                        isProcessing: true
                    });
                }
                this.props.onSelect(this.props.id);
            }
        }
        e.preventDefault();
    }
    handleClickLearnMore (e) {
        e.stopPropagation();
    }
    handleFocus (id) {
        if (!this.props.showPlayButton) {
            this.handleMouseEnter(id);
        }
    }
    handleKeyPress (e) {
        if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            this.props.onSelect(this.props.id);
        }
    }
    handleMouseEnter () {
        // only show hover effects on the item if not showing a play button
        if (!this.props.showPlayButton) {
            this.props.onMouseEnter(this.props.id);
            if (this.props.icons && this.props.icons.length) {
                this.stopRotatingIcons();
                this.setState({
                    isRotatingIcon: true
                }, this.startRotatingIcons);
            }
        }
    }
    handleMouseLeave () {
        // only show hover effects on the item if not showing a play button
        if (!this.props.showPlayButton) {
            this.props.onMouseLeave(this.props.id);
            if (this.props.icons && this.props.icons.length) {
                this.setState({
                    isRotatingIcon: false
                }, this.stopRotatingIcons);
            }
        }
    }
    handlePlay () {
        this.props.onMouseEnter(this.props.id);
    }
    handleStop () {
        this.props.onMouseLeave(this.props.id);
    }
    startRotatingIcons () {
        this.rotateIcon();
        this.intervalId = setInterval(this.rotateIcon, 300);
    }
    stopRotatingIcons () {
        if (this.intervalId) {
            this.intervalId = clearInterval(this.intervalId);
        }
    }
    rotateIcon () {
        const nextIconIndex = (this.state.iconIndex + 1) % this.props.icons.length;
        this.setState({iconIndex: nextIconIndex});
    }
    curIconMd5 () {
        const iconMd5Prop = this.props.iconMd5;
        if (this.props.icons &&
            this.state.isRotatingIcon &&
            this.state.iconIndex < this.props.icons.length) {
            const icon = this.props.icons[this.state.iconIndex] || {};
            return icon.md5ext || // 3.0 library format
                icon.baseLayerMD5 || // 2.0 library format, TODO GH-5084
                iconMd5Prop;
        }
        return iconMd5Prop;
    }
    render () {
        const iconMd5 = this.curIconMd5();
        const iconURL = iconMd5 ?
            `https://openblockcc.github.io/openblock-assets/assets/${iconMd5}` :
            this.props.iconRawURL;
        return (
            <LibraryItemComponent
                author={this.props.author}
                bluetoothRequired={this.props.bluetoothRequired}
                serialportRequired={this.props.serialportRequired}
                collaborator={this.props.collaborator}
                description={this.props.description}
                deviceId={this.props.deviceId}
                disabled={this.props.disabled}
                extensionId={this.props.extensionId}
                featured={this.props.featured}
                helpLink={this.props.helpLink}
                hidden={this.props.hidden}
                iconURL={iconURL}
                icons={this.props.icons}
                id={this.props.id}
                insetIconURL={this.props.insetIconURL}
                internetConnectionRequired={this.props.internetConnectionRequired}
                isLoaded={this.props.isLoaded}
                isUnloadble={this.props.isUnloadble}
                isPlaying={this.props.isPlaying}
                isProcessing={this.state.isProcessing}
                learnMore={this.props.learnMore}
                manufactor={this.props.manufactor}
                name={this.props.name}
                showPlayButton={this.props.showPlayButton}
                onBlur={this.handleBlur}
                onClick={this.handleClick}
                onClickLearnMore={this.handleClickLearnMore}
                onFocus={this.handleFocus}
                onKeyPress={this.handleKeyPress}
                onMouseEnter={this.handleMouseEnter}
                onMouseLeave={this.handleMouseLeave}
                onPlay={this.handlePlay}
                onStop={this.handleStop}
                programMode={this.props.programMode}
                programLanguage={this.props.programLanguage}
                version={this.props.version}
            />
        );
    }
}

LibraryItem.propTypes = {
    author: PropTypes.string,
    bluetoothRequired: PropTypes.bool,
    serialportRequired: PropTypes.bool,
    collaborator: PropTypes.string,
    description: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.node
    ]),
    deviceId: PropTypes.string,
    disabled: PropTypes.bool,
    extensionId: PropTypes.string,
    featured: PropTypes.bool,
    helpLink: PropTypes.string,
    hidden: PropTypes.bool,
    iconMd5: PropTypes.string,
    iconRawURL: PropTypes.string,
    icons: PropTypes.arrayOf(
        PropTypes.shape({
            baseLayerMD5: PropTypes.string, // 2.0 library format, TODO GH-5084
            md5ext: PropTypes.string // 3.0 library format
        })
    ),
    id: PropTypes.number.isRequired,
    insetIconURL: PropTypes.string,
    internetConnectionRequired: PropTypes.bool,
    isLoaded: PropTypes.bool,
    isUnloadble: PropTypes.bool,
    isPlaying: PropTypes.bool,
    learnMore: PropTypes.string,
    manufactor: PropTypes.string,
    name: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.node
    ]),
    onMouseEnter: PropTypes.func.isRequired,
    onMouseLeave: PropTypes.func.isRequired,
    onSelect: PropTypes.func.isRequired,
    programLanguage: PropTypes.arrayOf(PropTypes.string),
    programMode: PropTypes.arrayOf(PropTypes.string),
    showPlayButton: PropTypes.bool,
    version: PropTypes.string
};

LibraryItem.defaultProps = {
    isLoaded: false
};

export default injectIntl(LibraryItem);
