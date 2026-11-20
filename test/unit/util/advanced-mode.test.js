import {LOCKED_REDIRECT, isAdvancedModeOn} from '../../../src/lib/advanced-mode';

describe('Advanced mode switch', () => {
    const saved = process.env.ADVANCED_MODE;

    afterEach(() => {
        if (typeof saved === 'undefined') {
            delete process.env.ADVANCED_MODE;
        } else {
            process.env.ADVANCED_MODE = saved;
        }
    });

    test('is locked when nothing is set', () => {
        delete process.env.ADVANCED_MODE;
        expect(isAdvancedModeOn()).toBe(false);
    });

    test('opens only for "on"', () => {
        expect(isAdvancedModeOn('on')).toBe(true);
        expect(isAdvancedModeOn(' ON ')).toBe(true);
        ['', 'off', 'true', '1', 'yes', 'onn'].forEach(value => {
            expect(isAdvancedModeOn(value)).toBe(false);
        });
    });

    test('reads the build setting', () => {
        process.env.ADVANCED_MODE = 'on';
        expect(isAdvancedModeOn()).toBe(true);
        process.env.ADVANCED_MODE = 'off';
        expect(isAdvancedModeOn()).toBe(false);
    });

    test('a locked page goes to Beginner Studio', () => {
        expect(LOCKED_REDIRECT).toBe('/beginner');
    });
});
