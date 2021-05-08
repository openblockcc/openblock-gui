import React from 'react';
import {FormattedMessage} from 'react-intl';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import ProgressBar from '@ramonak/react-progress-bar';

import Box from '../box/box.jsx';
import Modal from '../../containers/modal.jsx';

import styles from './update-modal.css';

const UpdateModalComponent = props => (
    <Modal
        className={styles.modalContent}
        headerClassName={styles.header}
        id="updateModal"
        onRequestClose={props.onCancel}
        shouldCloseOnOverlayClick={false}
        closeButtonVisible={false}
    >
        <Box className={styles.body}>
            {(props.updateState.phase === 'idle') ? (
                <div>
                    <div className={styles.updateTitle}>
                        <div>
                            <FormattedMessage
                                defaultMessage="New external resource version detected"
                                description="Tile of update modal in new external resource version detected"
                                id="gui.updateModel.tileUpdate"
                            />
                            {`: ${props.updateState.version}`}
                        </div>
                    </div>
                    <div className={styles.updateInfo}>
                        {props.updateState.version ? (
                            <div>
                                {`${props.updateState.describe}\n\n`}
                            </div>
                        ) : null}
                    </div>
                    <div className={styles.bottomArea}>
                        <div className={styles.updateButtonWrapper}>
                            <button
                                className={classNames(styles.bottomAreaItem,
                                    styles.upgradeButton, styles.primary)}
                                onClick={props.onCancel}
                            >
                                <FormattedMessage
                                    defaultMessage="Upgrade later"
                                    description="Button in bottom to upgrade later"
                                    id="gui.upgradeModal.upgradeLater"
                                />
                            </button>
                            <button
                                className={classNames(styles.bottomAreaItem, styles.upgradeButton)}
                                onClick={props.onClickUpgrade}
                            >
                                <FormattedMessage
                                    defaultMessage="Upgrade and restart"
                                    description="Button in bottom to confirm upgrade and restart"
                                    id="gui.upgradeModal.upgradeAndRestart"
                                />
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
            {(props.updateState.phase === 'checking') ? (
                <div>
                    <div className={styles.updateTitle}>
                        <div>
                            <FormattedMessage
                                defaultMessage="Checking"
                                description="Tile of update modal in checking for update"
                                id="gui.updateModel.tileChecking"
                            />
                        </div>
                    </div>
                    <div className={styles.updateInfo}>
                        <div>
                            <FormattedMessage
                                defaultMessage="This step will take a few seconds, please wait."
                                description="Prompt for in checking update process"
                                id="gui.updateModel.checkingTips"
                            />
                        </div>
                    </div>
                    <div className={styles.bottomArea}>
                        <button
                            className={classNames(styles.bottomAreaItem, styles.upgradeButton)}
                            onClick={props.onCancel}
                        >
                            <FormattedMessage
                                defaultMessage="Close"
                                description="Button in bottom to close update modal"
                                id="gui.upgradeModal.closeChecking"
                            />
                        </button>
                    </div>
                </div>
            ) : null}
            {(props.updateState.phase === 'latest') ? (
                <div>
                    <div className={styles.updateTitle}>
                        <div>
                            <FormattedMessage
                                defaultMessage="Already latest"
                                description="Tile of update modal in already latest"
                                id="gui.updateModel.tileAlreadyLatest"
                            />
                        </div>
                    </div>
                    <div className={styles.updateInfo}>
                        <div>
                            <FormattedMessage
                                defaultMessage="External source is already latest."
                                description="Prompt for external source is already latest"
                                id="gui.updateModel.alreadyLatestTips"
                            />
                        </div>
                    </div>
                    <div className={styles.bottomArea}>
                        <button
                            className={classNames(styles.bottomAreaItem, styles.upgradeButton)}
                            onClick={props.onCancel}
                        >
                            <FormattedMessage
                                defaultMessage="Close"
                                description="Button in bottom to close update modal"
                                id="gui.upgradeModal.closeChecking"
                            />
                        </button>
                    </div>
                </div>
            ) : null}
            {(props.updateState.phase === 'downloading') || (props.updateState.phase === 'covering') ? (
                <div>
                    <div className={styles.updateTitle}>
                        <div>
                            <FormattedMessage
                                defaultMessage="Upgrading"
                                description="Tile of update modal in upgrading"
                                id="gui.updateModel.upgrading"
                            />
                        </div>
                    </div>
                    <div className={styles.bottomArea}>
                        <div className={classNames(styles.progressWrapper)}>
                            <ProgressBar
                                completed={props.progressBarCompleted}
                                bgColor="#4C97FF"
                                height="15px"
                            />
                            <div className={classNames(styles.upgradeInfoWrapper)}>
                                <div >
                                    {props.updateState.phase === 'downloading' ?
                                        (<FormattedMessage
                                            defaultMessage="Downloading"
                                            description="Prompt for in downloading porgress"
                                            id="gui.upgradeModal.downloading"
                                        />) : null}
                                    {props.updateState.phase === 'covering' ?
                                        (<FormattedMessage
                                            defaultMessage="Covering"
                                            description="Prompt for in covering porgress"
                                            id="gui.upgradeModal.covering"
                                        />) : null}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}
            {(props.updateState.phase === 'error') ? (
                <div>
                    <div className={styles.updateTitle}>
                        <div>
                            <FormattedMessage
                                defaultMessage="Operation failed"
                                description="Tile of update modal in error"
                                id="gui.updateModel.tileError"
                            />
                        </div>
                    </div>
                    <div className={styles.updateInfo}>
                        {props.updateState.message}
                    </div>
                    <div className={styles.bottomArea}>
                        <button
                            className={classNames(styles.bottomAreaItem, styles.upgradeButton)}
                            onClick={props.onCancel}
                        >
                            <FormattedMessage
                                defaultMessage="Close"
                                description="Button in bottom to close update modal"
                                id="gui.upgradeModal.closeChecking"
                            />
                        </button>
                    </div>
                </div>
            ) : null}
        </Box>
    </Modal>
);

UpdateModalComponent.propTypes = {
    onClickUpgrade: PropTypes.func.isRequired,
    onCancel: PropTypes.func.isRequired,
    updateState: PropTypes.shape({
        phase: PropTypes.oneOf(['idle', 'downloading', 'covering', 'checking', 'error', 'latest']),
        version: PropTypes.string,
        describe: PropTypes.string,
        message: PropTypes.string
    }),
    progressBarCompleted: PropTypes.number
};

export {
    UpdateModalComponent as default
};
