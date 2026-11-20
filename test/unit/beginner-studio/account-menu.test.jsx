import React from 'react';
import ReactDOM from 'react-dom';
import {act} from 'react-dom/test-utils';

import {logout} from '../../../src/lib/auth-client';
import AccountMenu from '../../../src/beginner-studio/components/layout/AccountMenu.jsx';
import {StudioProvider} from '../../../src/beginner-studio/context/StudioContext.jsx';

jest.mock('../../../src/lib/auth-client', () => ({logout: jest.fn()}));

const memoryStorage = () => {
    const data = {};
    return {
        get length () {
            return Object.keys(data).length;
        },
        key: i => Object.keys(data)[i] || null,
        getItem: k => (Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null),
        setItem: (k, v) => {
            data[k] = String(v);
        },
        removeItem: k => {
            delete data[k];
        }
    };
};

const EMAIL = 'kid@school.org';
const PROJECT_KEY = `tb_beginner_project:${EMAIL}`;
let root;

const render = user => {
    act(() => {
        ReactDOM.render(<StudioProvider user={user}><AccountMenu /></StudioProvider>, root);
    });
};
const button = label => [...document.querySelectorAll('button')].find(b => b.textContent === label);
const click = el => act(() => {
    el.dispatchEvent(new MouseEvent('click', {bubbles: true}));
});

beforeEach(() => {
    ['localStorage', 'sessionStorage'].forEach(name => {
        Object.defineProperty(window, name, {value: memoryStorage(), configurable: true});
    });
    window.localStorage.setItem(PROJECT_KEY, JSON.stringify({v: 1, projectName: 'Garden', connections: [], program: []}));
    window.localStorage.setItem(`tb_cloud:${EMAIL}:token:d1`, 'secret-token');
    window.sessionStorage.setItem(`tb_cloud:${EMAIL}:wifi`, '{"ssid":"Home","password":"pw"}');
    logout.mockClear();
    root = document.createElement('div');
    document.body.appendChild(root);
});

afterEach(() => {
    ReactDOM.unmountComponentAtNode(root);
    root.remove();
});

const openSignOut = () => {
    click(document.querySelector('button[aria-haspopup="menu"]'));
    click(button('Sign out'));
};

describe('Beginner account menu', () => {
    test('shows who is signed in, with an initial when there is no photo', () => {
        render({email: EMAIL, name: 'Kid Maker', picture: ''});
        const trigger = document.querySelector('button[aria-haspopup="menu"]');
        expect(trigger.getAttribute('aria-label')).toContain('Kid Maker');
        expect(trigger.textContent).toBe('K');
        click(trigger);
        expect(document.body.textContent).toContain(EMAIL);
        expect(button('Sign out')).toBeTruthy();
    });

    test('local dev without an account shows the plain menu and no Sign out', () => {
        render(null);
        click(document.querySelector('button[aria-label="More options"]'));
        expect(document.querySelector('a[href="/iot"]').textContent).toBe('IoT Dashboard (full page)');
        expect(button('Sign out')).toBeUndefined();
    });

    test('signing out keeps the project and board key but drops session WiFi', () => {
        render({email: EMAIL, name: 'Kid Maker'});
        openSignOut();
        click(button('Sign out'));
        expect(logout).toHaveBeenCalledTimes(1);
        expect(JSON.parse(window.localStorage.getItem(PROJECT_KEY)).projectName).toBe('Garden');
        expect(window.localStorage.getItem(`tb_cloud:${EMAIL}:token:d1`)).toBe('secret-token');
        expect(window.sessionStorage.getItem(`tb_cloud:${EMAIL}:wifi`)).toBeNull();
    });

    test('shared computer sign-out removes the project, WiFi and Cloud keys', () => {
        render({email: EMAIL, name: 'Kid Maker'});
        openSignOut();
        click(document.querySelector('input[type="checkbox"]'));
        click(button('Sign out'));
        expect(logout).toHaveBeenCalledTimes(1);
        expect(window.localStorage.getItem(PROJECT_KEY)).toBeNull();
        expect(window.localStorage.getItem(`tb_cloud:${EMAIL}:token:d1`)).toBeNull();
        expect(window.sessionStorage.getItem(`tb_cloud:${EMAIL}:wifi`)).toBeNull();
    });

    test('no Switch mode item while Advanced mode is locked', () => {
        const saved = process.env.ADVANCED_MODE;
        try {
            delete process.env.ADVANCED_MODE;
            render(null);
            click(document.querySelector('button[aria-label="More options"]'));
            expect(document.querySelector('a[href="/choose"]')).toBeNull();
            expect(document.body.textContent).not.toContain('Switch mode');
            ReactDOM.unmountComponentAtNode(root);

            process.env.ADVANCED_MODE = 'on';
            render(null);
            click(document.querySelector('button[aria-label="More options"]'));
            expect(document.querySelector('a[href="/choose"]').textContent).toBe('Switch mode (Beginner / Advanced)');
        } finally {
            if (typeof saved === 'undefined') {
                delete process.env.ADVANCED_MODE;
            } else {
                process.env.ADVANCED_MODE = saved;
            }
        }
    });

    test('cancel leaves everything in place', () => {
        render({email: EMAIL, name: 'Kid Maker'});
        openSignOut();
        click(button('Cancel'));
        expect(logout).not.toHaveBeenCalled();
        expect(document.querySelector('[role="dialog"]')).toBeNull();
        expect(window.sessionStorage.getItem(`tb_cloud:${EMAIL}:wifi`)).not.toBeNull();
    });
});
