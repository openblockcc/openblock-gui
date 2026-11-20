import React, {useEffect} from 'react';

import {useStudio} from '../../context/StudioContext.jsx';
import {hasCloud} from '../../domain/cloud';
import Modal from '../shared/Modal.jsx';

import PartStep from './PartStep.jsx';

/**
 * Every "open Cloud" request lands here: without the Cloud part it asks to add it (listing what
 * is in the way), with the part it switches to the Cloud tab.
 */
const CloudAddDialog = () => {
    const {showCloudSetup, setShowCloudSetup, connections, view, setView} = useStudio();
    const cloudPart = hasCloud(connections);

    useEffect(() => {
        if (showCloudSetup && cloudPart) {
            setShowCloudSetup(false);
            setView('cloud');
        }
    }, [showCloudSetup, cloudPart]);

    // The Cloud tab goes away with the Cloud part (removed, undone or another project opened).
    useEffect(() => {
        if (view === 'cloud' && !cloudPart) {
            setView('build');
        }
    }, [view, cloudPart]);

    if (!showCloudSetup || cloudPart) {
        return null;
    }
    const close = () => setShowCloudSetup(false);
    return (
        <Modal title="Cloud" onClose={close} width={480}>
            <PartStep onClose={close} />
        </Modal>
    );
};

export default CloudAddDialog;
