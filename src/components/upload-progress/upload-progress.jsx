import React from 'react';
import {FormattedMessage} from 'react-intl';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import keyMirror from 'keymirror';

import Ansi from 'ansi-to-react';
import ScrollableFeed from 'react-scrollable-feed';

import Box from '../box/box.jsx';
import Modal from '../../containers/modal.jsx';
import Dots from '../connection-modal/dots.jsx';

import styles from './upload-progress.css';

const PHASES = keyMirror({
    uploading: null,
    success: null,
    error: null,
    timeout: null
});

const UploadProgressComponent = props => (
    <Modal
        className={styles.modalContent}
        contentLabel={props.name}
        headerClassName={styles.header}
        headerImage={props.connectionSmallIconURL}
        id="connectionModal"
        onHelp={props.onHelp}
        shouldCloseOnOverlayClick={false}
        closeButtonVisible={false}
    >
        <Box className={styles.body}>
            <Box className={styles.terminalWarper}>
                <ScrollableFeed
                    className={styles.terminalText}
                    forceScroll
                >
                    <Ansi>
                        {props.text}
                    </Ansi>
                </ScrollableFeed>
            </Box>
            <Dots
                className={styles.bottomAreaItem}
                counter={0}
                total={3}
            />
            <Box className={styles.bottomArea}>
                <Box className={classNames(styles.bottomAreaItem, styles.instructions)}>
                    {props.phase === PHASES.uploading ? (
                        <FormattedMessage
                            defaultMessage="Uploading"
                            description="Prompt for upload in progress"
                            id="gui.uploadProgress.uploading"
                        />
                    ) : null}
                    {props.phase === PHASES.success ? (
                        <FormattedMessage
                            defaultMessage="Upload success"
                            description="Prompt for upload success"
                            id="gui.uploadProgress.uploadSuccess"
                        />
                    ) : null}
                    {props.phase === PHASES.error ? (
                        <FormattedMessage
                            defaultMessage="Upload error"
                            description="Prompt for upload error"
                            id="gui.uploadProgress.uploadError"
                        />
                    ) : null}
                    {props.phase === PHASES.timeout ? (
                        <FormattedMessage
                            defaultMessage="Upload timeout"
                            description="Prompt for upload timeout"
                            id="gui.uploadProgress.uploadTimeout"
                        />
                    ) : null}
                </Box>
                <button
                    className={classNames(styles.bottomAreaItem, styles.connectionButton)}
                    onClick={props.onCancel}
                    disabled={props.phase === PHASES.uploading}
                >
                    <FormattedMessage
                        defaultMessage="Close"
                        description="Button in bottom to close after upload"
                        id="gui.uploadProgress.close"
                    />
                </button>
            </Box>
        </Box>
    </Modal>
);

UploadProgressComponent.propTypes = {
    connectionSmallIconURL: PropTypes.string,
    name: PropTypes.node,
    onCancel: PropTypes.func.isRequired,
    onHelp: PropTypes.func.isRequired,
    text: PropTypes.string.isRequired,
    phase: PropTypes.oneOf(Object.keys(PHASES)).isRequired
};

UploadProgressComponent.defaultProps = {
};

export {
    UploadProgressComponent as default,
    PHASES
};
