import React from 'react';
import PropTypes from 'prop-types';

import MonacoEditor from 'react-monaco-editor';

import Box from '../box/box.jsx';

import styles from './code-editor.css';

const CodeEditorComponent = props => {
    const {
        containerRef,
        language,
        value,
        options,
        width,
        height,
        onChange,
        editorWillMount,
        editorDidMount,
        theme,
        ...componentProps
    } = props;
    return (
        <Box
            className={styles.codeEditor}
            componentRef={containerRef}
        >
            <MonacoEditor
                language={language}
                value={value}
                options={Object.assign({}, CodeEditorComponent.defaultProps.options, options)}
                width={width}
                height={height}
                onChange={onChange}
                editorWillMount={editorWillMount}
                editorDidMount={editorDidMount}
                theme={theme}
                {...componentProps}
            />
        </Box>
    );
};

CodeEditorComponent.propTypes = {
    containerRef: PropTypes.func,
    language: PropTypes.string,
    value: PropTypes.string,
    options: PropTypes.shape({
        highlightActiveIndentGuide: PropTypes.bool,
        cursorSmoothCaretAnimation: PropTypes.bool,
        readOnly: PropTypes.bool,
        contextmenu: PropTypes.bool,
        minimap: PropTypes.shape({
            enabled: PropTypes.bool
        })
    }),
    height: PropTypes.number,
    width: PropTypes.number.isRequired,
    onChange: PropTypes.func,
    editorWillMount: PropTypes.func,
    editorDidMount: PropTypes.func,
    theme: PropTypes.string
};

CodeEditorComponent.defaultProps = {
    language: 'cpp',
    theme: 'vs',
    options: {
        highlightActiveIndentGuide: false,
        cursorSmoothCaretAnimation: true,
        readOnly: true,
        contextmenu: false,
        minimap: {
            enabled: false
        }
    }
};

export default CodeEditorComponent;
