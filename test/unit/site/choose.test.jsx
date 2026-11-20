import React from 'react';
import ReactDOM from 'react-dom';
import {act} from 'react-dom/test-utils';

import {fetchAuthMe} from '../../../src/lib/auth-client';
import ChooseApp from '../../../src/site/choose/app.jsx';

jest.mock('../../../src/lib/auth-client', () => ({fetchAuthMe: jest.fn()}));
jest.mock('../../../src/lib/clarity', () => ({clarityEvent: jest.fn(), identifyClarityUser: jest.fn()}));

let root;
const saved = process.env.ADVANCED_MODE;

// Render, then let the signed-in check resolve.
const renderSignedIn = async () => {
    fetchAuthMe.mockReturnValue(Promise.resolve({authenticated: true, email: 'kid@school.org'}));
    act(() => {
        ReactDOM.render(<ChooseApp />, root);
    });
    await act(async () => {
        await Promise.resolve();
    });
};

beforeEach(() => {
    root = document.createElement('div');
    document.body.appendChild(root);
});

afterEach(() => {
    ReactDOM.unmountComponentAtNode(root);
    root.remove();
    if (typeof saved === 'undefined') {
        delete process.env.ADVANCED_MODE;
    } else {
        process.env.ADVANCED_MODE = saved;
    }
});

describe('Choose page', () => {
    test('Advanced is shown as paused, not as a link, while it is locked', async () => {
        delete process.env.ADVANCED_MODE;
        await renderSignedIn();
        expect(root.querySelector('a[href="/beginner"]').textContent).toContain('MicroPython');
        expect(root.querySelector('a[href="/ide"]')).toBeNull();
        const locked = root.querySelector('.mode-btn--locked');
        expect(locked.getAttribute('aria-disabled')).toBe('true');
        expect(locked.textContent).toContain('Paused');
    });

    test('Advanced is a link again once ADVANCED_MODE is on', async () => {
        process.env.ADVANCED_MODE = 'on';
        await renderSignedIn();
        expect(root.querySelector('a[href="/ide"]').textContent).toContain('Advanced');
        expect(root.querySelector('.mode-btn--locked')).toBeNull();
    });
});
