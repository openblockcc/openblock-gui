// Polyfills
import 'regenerator-runtime/runtime';
import 'es6-object-assign/auto';
import 'core-js/fn/array/includes';
import 'core-js/fn/promise/finally';
import 'intl'; // For Safari 9

import React from 'react';
import ReactDOM from 'react-dom';

import analytics, {initialAnalytics} from '../lib/analytics';
import {initialClarity, identifyClarityUser} from '../lib/clarity';
import AppStateHOC from '../lib/app-state-hoc.jsx';
import BrowserModalComponent from '../components/browser-modal/browser-modal.jsx';
import supportedBrowser from '../lib/supported-browser';
import {ensureIdeAuth} from '../lib/auth-client';
import {LOCKED_REDIRECT, isAdvancedModeOn} from '../lib/advanced-mode';

import styles from './index.css';

const setBootMessage = message => {
    window.__openblockAppStarted = true;
    if (window.__openblockSetBootMessage) {
        window.__openblockSetBootMessage(message);
    }
};

const hidePreloader = () => {
    window.__openblockAppReady = true;
    if (window.__openblockHidePreloader) {
        window.__openblockHidePreloader();
    }
};

const showBootError = message => {
    if (window.__openblockShowBootError) {
        window.__openblockShowBootError(message);
    }
};

const bootEditor = appTarget => {
    if (supportedBrowser()) {
        setBootMessage('Loading editor…');
        // require needed here to avoid importing unsupported browser-crashing code
        // at the top level
        require('./render-gui.jsx').default(appTarget);
    } else {
        BrowserModalComponent.setAppElement(appTarget);
        const WrappedBrowserModalComponent = AppStateHOC(BrowserModalComponent, true /* localesOnly */);
        const handleBack = () => {};
        // eslint-disable-next-line react/jsx-no-bind
        ReactDOM.render(<WrappedBrowserModalComponent onBack={handleBack} />, appTarget);
    }
    hidePreloader();
};

const startEditor = () => {
    setBootMessage('Starting…');

    try {
        initialAnalytics();
        initialClarity('ide');
        analytics.send({hitType: 'pageview', page: '/community/web'});
    } catch (analyticsError) {
        // Analytics must never block the editor from loading.
        console.warn('Analytics init failed', analyticsError); // eslint-disable-line no-console
    }

    const appTarget = document.createElement('div');
    appTarget.className = styles.app;
    document.body.appendChild(appTarget);

    setBootMessage('Checking sign-in…');
    ensureIdeAuth().then(session => {
        if (session === null) {
            // Redirecting to /login
            return;
        }
        try {
            identifyClarityUser(session);
        } catch (clarityError) {
            console.warn('Clarity identify failed', clarityError); // eslint-disable-line no-console
        }
        bootEditor(appTarget);
    }).catch(bootError => {
        showBootError(`Failed to start: ${bootError.message || bootError}`);
        throw bootError;
    });
};

try {
    if (isAdvancedModeOn()) {
        startEditor();
    } else {
        // Advanced mode is locked (src/lib/advanced-mode.js); the server redirects too.
        setBootMessage('Advanced mode is paused. Opening Beginner Studio…');
        window.location.replace(LOCKED_REDIRECT);
    }
} catch (bootError) {
    showBootError(`Failed to start: ${bootError.message || bootError}`);
    throw bootError;
}
