/* global Response */
import {
    SESSION_COOKIE,
    isAuthDisabled,
    parseCookies,
    sanitizeNextPath,
    verifySessionToken
} from './lib/auth/session.mjs';

// The OpenBlock IDE and its example pages. Locked while TinkerBit focuses on Beginner Studio:
// set ADVANCED_MODE=on (and redeploy) to open them again. src/lib/advanced-mode.js holds the
// same switch for the pages themselves.
const ADVANCED_PATHS = [
    '/ide',
    '/ide/',
    '/ide.html',
    '/blocks-only.html',
    '/compatibility-testing.html',
    '/player.html'
];

const advancedModeOn = () => String(process.env.ADVANCED_MODE || '')
    .trim()
    .toLowerCase() === 'on';

export const config = {
    matcher: [
        '/ide',
        '/ide/',
        '/ide.html',
        '/blocks-only.html',
        '/compatibility-testing.html',
        '/player.html',
        '/choose',
        '/choose/',
        '/choose.html',
        '/beginner',
        '/beginner/',
        '/beginner.html',
        '/iot',
        '/iot/:path*',
        '/iot.html'
    ]
};

export default async function middleware (request) {
    const {pathname} = new URL(request.url);
    if (ADVANCED_PATHS.includes(pathname)) {
        if (!advancedModeOn()) {
            // 302, not 301: browsers must not remember this once Advanced comes back.
            return Response.redirect(new URL('/beginner', request.url), 302);
        }
        // The IDE example pages were never behind sign-in; only /ide itself is.
        if (!pathname.startsWith('/ide')) {
            return;
        }
    }

    if (isAuthDisabled()) {
        return;
    }

    // If auth is not configured yet, send users to login (fail closed)
    if (!process.env.AUTH_SECRET || !process.env.GOOGLE_CLIENT_ID) {
        const url = new URL('/login', request.url);
        url.searchParams.set('error', 'config');
        return Response.redirect(url, 302);
    }

    const cookies = parseCookies(request.headers.get('cookie') || '');
    const user = await verifySessionToken(cookies[SESSION_COOKIE]);
    if (user) {
        return;
    }

    const requestUrl = new URL(request.url);
    const nextPath = sanitizeNextPath(`${requestUrl.pathname}${requestUrl.search}`);
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', nextPath);
    return Response.redirect(loginUrl, 302);
}
