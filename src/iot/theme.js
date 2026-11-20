/**
 * TinkerBit Cloud (the IoT dashboard) in the TinkerBit brand: purple, ink and gold, Space Grotesk
 * headings over DM Sans (src/site/tokens.css). Light by default, dark as an option.
 *
 * The keys match Beginner Studio's tokens (bg, panel, text, accent, …) so shared components keep
 * working, plus brand keys: ink (outlines and offset shadows), gold, lilac, line, fonts.
 * Every text colour passes 4.5:1 on its background.
 */
const FONT_BODY = '\'DM Sans\', system-ui, -apple-system, \'Segoe UI\', sans-serif';
const FONT_DISPLAY = '\'Space Grotesk\', system-ui, sans-serif';
const FONT_MONO = '\'JetBrains Mono\', ui-monospace, monospace';

const shared = {
    gold: '#F2B33D',
    onGold: '#1D1140',
    fontBody: FONT_BODY,
    fontDisplay: FONT_DISPLAY,
    fontMono: FONT_MONO
};

const light = Object.assign({}, shared, {
    mode: 'light',
    bg: '#FBF9FF',
    canvas: '#FFFFFF',
    panel: '#FFFFFF',
    surface: '#F4F0FF',
    border: '#D9CFFA',
    line: '#ECE5FF',
    text: '#1D1140',
    sub: '#4A4560',
    dim: '#5C5675',
    muted: '#6B6585',
    accent: '#5B2BD1',
    onAccent: '#FFFFFF',
    ink: '#1D1140',
    lilac: '#F4F0FF',
    green: '#15803D',
    greenSoft: '#DCFCE7',
    greenText: '#14532D',
    orange: '#B45309',
    orangeSoft: '#FEF3C7',
    red: '#B42318',
    redSoft: '#FEE4E2',
    cyan: '#0E7490',
    offSoft: '#EEEAF7',
    shadow: '4px 4px 0 #1D1140',
    shadowSmall: '3px 3px 0 #1D1140'
});

const dark = Object.assign({}, shared, {
    mode: 'dark',
    bg: '#140C2E',
    canvas: '#0E0822',
    panel: '#1F1640',
    surface: '#2B2054',
    border: '#43377A',
    line: '#2B2054',
    text: '#F4F0FF',
    sub: '#D6CDF5',
    dim: '#BCB1E3',
    muted: '#A196CC',
    accent: '#B9A6F5',
    onAccent: '#1D1140',
    ink: '#8F7BEA',
    lilac: '#2B2054',
    green: '#4ADE80',
    greenSoft: '#123D27',
    greenText: '#BBF7D0',
    orange: '#FBBF24',
    orangeSoft: '#43300A',
    red: '#F87171',
    redSoft: '#4A1717',
    cyan: '#67E8F9',
    offSoft: '#2B2054',
    shadow: '4px 4px 0 #0A0618',
    shadowSmall: '3px 3px 0 #0A0618'
});

const THEME_KEY = 'tb_cloud_theme';

const readIotTheme = () => {
    try {
        return window.localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light';
    } catch (err) {
        return 'light';
    }
};

const persistIotTheme = mode => {
    try {
        window.localStorage.setItem(THEME_KEY, mode === 'dark' ? 'dark' : 'light');
    } catch (err) {
        // Private window: the choice lasts until the tab closes.
    }
};

const iotTokens = mode => (mode === 'dark' ? dark : light);

export {FONT_BODY, FONT_DISPLAY, FONT_MONO, THEME_KEY, dark, iotTokens, light, persistIotTheme, readIotTheme};
