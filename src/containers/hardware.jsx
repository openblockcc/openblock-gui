import React from 'react';
import bindAll from 'lodash.bindall';

import {connect} from 'react-redux';
import {compose} from 'redux';
import {injectIntl} from 'react-intl';

import HardwareComponent from '../components/hardware/hardware.jsx';

class Hardware extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
        ]);
    }

    render () {
        const {
            ...props
        } = this.props;
        return (
            <HardwareComponent
                {...props}
            />
        );
    }
}

Hardware.propTypes = {
};

const mapStateToProps = state => ({
    stageSizeMode: state.scratchGui.stageSize.stageSize
});

const mapDispatchToProps = () => ({

});

export default compose(
    injectIntl,
    connect(
        mapStateToProps,
        mapDispatchToProps
    )
)(Hardware);
