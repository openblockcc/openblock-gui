import {useEffect, useState} from 'react';

const BASE = '/iot';

const parseRoute = pathname => {
    const path = (pathname || '').replace(/\/+$/, '');
    const device = /^\/iot\/d\/([A-Za-z0-9_-]{1,32})(\/settings)?$/.exec(path);
    if (device) {
        // A board's settings are its own screen, but the same board for loading and live data.
        return device[2] ? {page: 'device', id: device[1], view: 'settings'} : {page: 'device', id: device[1]};
    }
    if (path === `${BASE}/alerts`) {
        return {page: 'alerts'};
    }
    if (path === `${BASE}/account`) {
        return {page: 'account'};
    }
    return {page: 'devices'};
};

const listeners = new Set();
let blocker = null;

/** Register a function that returns a confirm message while there are unsaved edits. */
const setNavigationBlocker = fn => {
    blocker = fn;
};

const canLeave = () => {
    const message = blocker ? blocker() : null;
    return !message || window.confirm(message);
};

const navigate = (path, {replace = false} = {}) => {
    if (path === window.location.pathname) {
        return;
    }
    if (!canLeave()) {
        return;
    }
    if (replace) {
        window.history.replaceState(null, '', path);
    } else {
        window.history.pushState(null, '', path);
    }
    listeners.forEach(fn => fn(parseRoute(path)));
    window.scrollTo(0, 0);
};

const useRoute = () => {
    const [route, setRoute] = useState(() => parseRoute(window.location.pathname));
    useEffect(() => {
        listeners.add(setRoute);
        const onPop = () => setRoute(parseRoute(window.location.pathname));
        window.addEventListener('popstate', onPop);
        return () => {
            listeners.delete(setRoute);
            window.removeEventListener('popstate', onPop);
        };
    }, []);
    return route;
};

/** Click handler for <a href> links that keeps navigation inside the app. */
const linkTo = path => e => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return;
    }
    e.preventDefault();
    navigate(path);
};

export {canLeave, linkTo, navigate, parseRoute, setNavigationBlocker, useRoute};
