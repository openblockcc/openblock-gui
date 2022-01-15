import React from 'react';
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

    containerRef (el) {
        if (el){
            this.containerElement = el;
            this.setState({
                clientHeight: this.containerElement.getBoundingClientRect().height
            });
        }
    }

    render () {
        const {
            ...props
        } = this.props;
        return (
            <CodeEditorComponent
                height={this.state.clientHeight}
                containerRef={this.containerRef}
                {...props}
            />
        );
    }
}

export default CodeEditor;
