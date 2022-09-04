import React from 'react';
import ReactDOM from 'react-dom';
import {compose} from 'redux';
import {FormattedMessage} from 'react-intl';

import AppStateHOC from '../lib/app-state-hoc.jsx';
import GUI from '../containers/gui.jsx';
import HashParserHOC from '../lib/hash-parser-hoc.jsx';
import log from '../lib/log.js';
import MessageBoxType from '../lib/message-box.js';

const onClickLogo = () => {
    window.location = 'https://openblockcc.github.io/wiki/';
};

const onClickCheckUpdate = () => {
    log('User click check update');
};

const onClickUpdate = () => {
    log('User click update');
};

const onAbortUpdate = () => {
    log('User click abort update');
};

const onClickClearCache = () => {
    log('User click clear cahce');
};

const onClickInstallDriver = () => {
    log('User click install driver');
};

const handleTelemetryModalCancel = () => {
    log('User canceled telemetry modal');
};

const handleTelemetryModalOptIn = () => {
    log('User opted into telemetry');
};

const handleTelemetryModalOptOut = () => {
    log('User opted out of telemetry');
};

const onClickAbout = [
    {
        title: (<FormattedMessage
            defaultMessage="About"
            description="Menu bar item for about"
            id="gui.desktopMenuBar.about"
        />),
        onClick: () => log('About')
    },
    {
        title: (<FormattedMessage
            defaultMessage="License"
            description="Menu bar item for license"
            id="gui.desktopMenuBar.license"
        />),
        onClick: () => log('License')
    },
    {
        title: (<FormattedMessage
            defaultMessage="Privacy policy"
            description="Menu bar item for privacy policy"
            id="gui.menuBar.privacyPolicy"
        />),
        onClick: () => log('Privacy Policy')
    },
    {
        title: (<FormattedMessage
            defaultMessage="Data settings"
            description="Menu bar item for data settings"
            id="gui.menuBar.dataSettings"
        />),
        onClick: () => log('Data Settings')
    }
];

const handleShowMessageBox = (type, message) => {
    if (type === MessageBoxType.confirm) {
        return confirm(message); // eslint-disable-line no-alert
    } else if (type === MessageBoxType.alert) {
        return alert(message); // eslint-disable-line no-alert
    }
};

/*
 * Render the GUI playground. This is a separate function because importing anything
 * that instantiates the VM causes unsupported browsers to crash
 * {object} appTarget - the DOM element to render to
 */
export default appTarget => {
    GUI.setAppElement(appTarget);

    // note that redux's 'compose' function is just being used as a general utility to make
    // the hierarchy of HOC constructor calls clearer here; it has nothing to do with redux's
    // ability to compose reducers.
    const WrappedGui = compose(
        AppStateHOC,
        HashParserHOC
    )(GUI);

    // TODO a hack for testing the backpack, allow backpack host to be set by url param
    const backpackHostMatches = window.location.href.match(/[?&]backpack_host=([^&]*)&?/);
    const backpackHost = backpackHostMatches ? backpackHostMatches[1] : null;

    const scratchDesktopMatches = window.location.href.match(/[?&]isScratchDesktop=([^&]+)/);
    let simulateScratchDesktop;
    if (scratchDesktopMatches) {
        try {
            // parse 'true' into `true`, 'false' into `false`, etc.
            simulateScratchDesktop = JSON.parse(scratchDesktopMatches[1]);
        } catch {
            // it's not JSON so just use the string
            // note that a typo like "falsy" will be treated as true
            simulateScratchDesktop = scratchDesktopMatches[1];
        }
    }

    if (process.env.NODE_ENV === 'production' && typeof window === 'object') {
        // Warn before navigating away
        window.onbeforeunload = () => true;
    }

    ReactDOM.render(
        // important: this is checking whether `simulateScratchDesktop` is truthy, not just defined!
        simulateScratchDesktop ?
            <WrappedGui
                canEditTitle
                isScratchDesktop
                onClickAbout={onClickAbout}
                showTelemetryModal
                canSave={false}
                onTelemetryModalCancel={handleTelemetryModalCancel}
                onTelemetryModalOptIn={handleTelemetryModalOptIn}
                onTelemetryModalOptOut={handleTelemetryModalOptOut}
                onAbortUpdate={onAbortUpdate}
                onClickCheckUpdate={onClickCheckUpdate}
                onClickUpdate={onClickUpdate}
                onClickClearCache={onClickClearCache}
                onClickInstallDriver={onClickInstallDriver}
                onShowMessageBox={handleShowMessageBox}
            /> :
            <WrappedGui
                canEditTitle
                backpackVisible
                showComingSoon
                backpackHost={backpackHost}
                canSave={false}
                onClickLogo={onClickLogo}
                onShowMessageBox={handleShowMessageBox}
            />,
        appTarget);
};
