/**
 * Advanced mode (the OpenBlock IDE at /ide) is locked while TinkerBit focuses on Beginner Studio.
 *
 * One switch unlocks it again: set ADVANCED_MODE=on in the build environment (Vercel project
 * settings, or `ADVANCED_MODE=on npm start` locally) and redeploy. webpack bakes the value into
 * the pages; middleware.js reads the same variable on the server and redirects /ide while locked.
 */
const ADVANCED_MODE_ON = 'on';

// Where a locked Advanced page sends people.
const LOCKED_REDIRECT = '/beginner';

/**
 * @param {string} [value] the ADVANCED_MODE setting (default: the build's)
 * @returns {boolean} true only when Advanced mode has been switched on
 */
const isAdvancedModeOn = value => {
    const setting = typeof value === 'string' ? value : process.env.ADVANCED_MODE;
    return String(setting || '')
        .trim()
        .toLowerCase() === ADVANCED_MODE_ON;
};

export {LOCKED_REDIRECT, isAdvancedModeOn};
