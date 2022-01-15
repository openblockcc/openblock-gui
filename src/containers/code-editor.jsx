import PropTypes from 'prop-types';
import React from 'react';
import {connect} from 'react-redux';
import {compose} from 'redux';
import {injectIntl} from 'react-intl';
import bindAll from 'lodash.bindall';

import CodeEditorComponent from '../components/code-editor/code-editor.jsx';

// eslint-disable-next-line react/prefer-stateless-function
class CodeEditor extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleSize',
            'containerRef'
        ]);
        this.state = {
            clientHeight: null
        };
    }

    componentDidMount () {
        window.addEventListener('resize', this.handleSize);
    }

    componentWillUnmount () {
        window.removeEventListener('resize', this.handleSize);
    }

    handleSize () {
        this.setState({
            clientHeight: this.containerElement.getBoundingClientRect().height
        });
    }

    getLanguage (type) {
        if (type === 'arduino') {
            return 'cpp';
        } else if (type === 'microbit') {
            return 'python';
        }
        return 'null';
    }

    containerRef (el) {
        if (el){
            this.containerElement = el;
            this.setState({
                clientHeight: this.containerElement.getBoundingClientRect().height
            });
        }
    }

    render () {
        const language = this.getLanguage(this.props.deviceType);
        const {
            ...props
        } = this.props;
        return (
            <CodeEditorComponent
                value={this.props.codeEditorValue}
                language={language}
                height={this.state.clientHeight}
                containerRef={this.containerRef}
                {...props}
            />
        );
    }
}

CodeEditor.propTypes = {
    codeEditorValue: PropTypes.string,
    deviceType: PropTypes.string
};

const mapStateToProps = state => ({
    codeEditorValue: state.scratchGui.code.codeEditorValue,
    deviceType: state.scratchGui.device.deviceType
});

export default compose(
    injectIntl,
    connect(
        mapStateToProps
    )
)(CodeEditor);
