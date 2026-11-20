const defaultsDeep = require('lodash.defaultsdeep');
var path = require('path');
var webpack = require('webpack');

// Plugins
var CopyWebpackPlugin = require('copy-webpack-plugin');
var HtmlWebpackPlugin = require('html-webpack-plugin');
var UglifyJsPlugin = require('uglifyjs-webpack-plugin');
var TerserPlugin = require('terser-webpack-plugin');
const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');

// PostCss
var autoprefixer = require('autoprefixer');
var postcssVars = require('postcss-simple-vars');
var postcssImport = require('postcss-import');

const STATIC_PATH = process.env.STATIC_PATH || '/static';
const MONACO_DIR = path.resolve(__dirname, './node_modules/monaco-editor');
const LINK_PROXY_TARGET = process.env.COMPILE_PROXY_TARGET || 'http://13.127.144.30';
const linkProxy = {
    target: LINK_PROXY_TARGET,
    changeOrigin: true,
    secure: false
};

const SITE_DIR = path.resolve(__dirname, 'src/site');
// Apex tinkerbit.io 308-redirects here, so every canonical/share URL uses www.
const SITE_ORIGIN = 'https://www.tinkerbit.io';
const OG_IMAGE_ALT = 'TinkerBit: block coding with snap-in electronics modules';
const SITE_DESCRIPTION = 'TinkerBit: click-in modules, block coding in the browser, and room to grow into IoT ' +
    'and edge AI. First kits ship December 2026.';
// Matches --tb-purple in src/site/tokens.css; meta tags can't read CSS variables.
const SITE_THEME_COLOR = '#5B2BD1';
// Local iot-api live socket (services/iot-api runs on 20114); never in production CSP.
const IOT_DEV_WS = process.env.NODE_ENV === 'production' ? '' : ' ws://127.0.0.1:20114 ws://localhost:20114';
const SITE_FONTS_HREF = 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700' +
    '&family=JetBrains+Mono:wght@400;600&family=DM+Sans:wght@400;500;700&display=swap';

const postCssPlugins = function () {
    return [
        postcssImport,
        postcssVars,
        autoprefixer
    ];
};

const base = {
    mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
    devtool: 'cheap-module-source-map',
    devServer: {
        contentBase: [
            path.resolve(__dirname, 'build'),
            path.resolve(__dirname, 'test')
        ],
        host: '0.0.0.0',
        port: process.env.PORT || 8601,
        // Embedded browsers (e.g. Cursor Simple Browser) often hang on the HMR client.
        hot: false,
        injectClient: false,
        injectHot: false,
        historyApiFallback: {
            rewrites: [
                {from: /^\/ide\/?$/, to: '/ide.html'},
                {from: /^\/login\/?$/, to: '/login.html'},
                {from: /^\/choose\/?$/, to: '/choose.html'},
                {from: /^\/beginner\/?$/, to: '/beginner.html'},
                {from: /^\/privacy\/?$/, to: '/privacy.html'},
                {from: /^\/iot(\/.*)?$/, to: '/iot.html'}
            ]
        },
        proxy: {
            // TinkerBit Cloud API (services/iot-api: npm run dev). Same path shape as the Vercel rewrite.
            '/api/iot': {
                target: process.env.IOT_PROXY_TARGET || 'http://127.0.0.1:20114',
                pathRewrite: {'^/api/iot': '/iot/v1'},
                changeOrigin: true,
                secure: false
            },
            '/api/auth': {
                target: process.env.AUTH_PROXY_TARGET || 'http://127.0.0.1:3000',
                changeOrigin: true,
                secure: false
            },
            '/api/compile': Object.assign({}, linkProxy, {
                timeout: 180000,
                proxyTimeout: 180000
            }),
            '/devices': linkProxy,
            '/extensions': linkProxy
        }
    },
    output: {
        library: 'GUI',
        filename: '[name].js',
        chunkFilename: 'chunks/[name].js'
    },
    resolve: {
        symlinks: false
    },
    module: {
        rules: [{
            test: /\.jsx?$/,
            loader: 'babel-loader',
            include: [
                path.resolve(__dirname, 'src'),
                // The 3D kit the studio's build views share (vendor/ stays out; the studio uses node_modules/three)
                path.resolve(__dirname, 'module-test/lib'),
                path.resolve(__dirname, 'module-test/components'),
                /node_modules[\\/]scratch-[^\\/]+[\\/]src/,
                /node_modules[\\/]pify/,
                /node_modules[\\/]@vernier[\\/]godirect/
            ],
            options: {
                // Explicitly disable babelrc so we don't catch various config
                // in much lower dependencies.
                babelrc: false,
                plugins: [
                    '@babel/plugin-syntax-dynamic-import',
                    '@babel/plugin-transform-async-to-generator',
                    '@babel/plugin-proposal-object-rest-spread',
                    ['react-intl', {
                        messagesDir: './translations/messages/'
                    }]],
                presets: ['@babel/preset-env', '@babel/preset-react']
            }
        },
        {
            // three.js ships ES2022 (static blocks, ?.); webpack 4's parser stops at ES2019.
            test: /\.js$/,
            include: /node_modules[\\/]three[\\/]/,
            loader: 'babel-loader',
            options: {
                babelrc: false,
                configFile: false,
                compact: true,
                cacheDirectory: true,
                plugins: [
                    '@babel/plugin-proposal-class-static-block',
                    '@babel/plugin-proposal-class-properties',
                    '@babel/plugin-proposal-private-methods',
                    '@babel/plugin-proposal-private-property-in-object',
                    '@babel/plugin-proposal-optional-chaining',
                    '@babel/plugin-proposal-nullish-coalescing-operator',
                    '@babel/plugin-proposal-logical-assignment-operators',
                    '@babel/plugin-proposal-numeric-separator'
                ]
            }
        },
        {
            test: /\.css$/,
            exclude: [MONACO_DIR, SITE_DIR],
            use: [{
                loader: 'style-loader'
            }, {
                loader: 'css-loader',
                options: {
                    modules: true,
                    importLoaders: 1,
                    localIdentName: '[name]_[local]_[hash:base64:5]',
                    camelCase: true
                }
            }, {
                loader: 'postcss-loader',
                options: {
                    ident: 'postcss',
                    plugins: postCssPlugins
                }
            }]
        },
        {
            // Marketing / login pages use global class names (not CSS modules).
            test: /\.css$/,
            include: SITE_DIR,
            use: [{
                loader: 'style-loader'
            }, {
                loader: 'css-loader',
                options: {
                    modules: false,
                    importLoaders: 1
                }
            }, {
                loader: 'postcss-loader',
                options: {
                    ident: 'postcss-site',
                    plugins: postCssPlugins
                }
            }]
        },
        {
            test: /\.css$/,
            include: MONACO_DIR,
            use: ['style-loader', 'css-loader']
        }]
    },
    optimization: {
        minimizer: [
            new UglifyJsPlugin({
                include: /\.min\.js$/
            })
        ]
    },
    plugins: [
        new MonacoWebpackPlugin({
            languages: ['c', 'cpp', 'python', 'lua', 'javascript'],
            features: ['!gotoSymbol']
        })
    ]
};

if (!process.env.CI) {
    base.plugins.push(new webpack.ProgressPlugin());
}

module.exports = [
    // to run editor examples
    defaultsDeep({}, base, {
        entry: {
            'lib.min': ['react', 'react-dom'],
            'gui': './src/playground/index.jsx',
            'blocksonly': './src/playground/blocks-only.jsx',
            'compatibilitytesting': './src/playground/compatibility-testing.jsx',
            'player': './src/playground/player.jsx'
        },
        output: {
            path: path.resolve(__dirname, 'build'),
            filename: '[name].js'
        },
        module: {
            rules: base.module.rules.concat([
                {
                    test: /\.(svg|png|wav|gif|jpg|ttf)$/,
                    loader: 'file-loader',
                    options: {
                        outputPath: 'static/assets/'
                    }
                }
            ])
        },
        optimization: {
            // Keep shared app code in lib.min so HtmlWebpackPlugin script tags stay complete.
            // A separate auto-named shared chunk was missing from index.html and left the
            // page stuck on the HTML "Loading..." splash (React never mounted).
            splitChunks: {
                chunks: 'all',
                name: 'lib.min',
                cacheGroups: {
                    esptool: {
                        test: /[\\/]node_modules[\\/](esptool-js|pako|atob-lite|tslib)[\\/]/,
                        name: 'esptool',
                        chunks: 'all',
                        enforce: true,
                        priority: 30
                    }
                }
            },
            runtimeChunk: {
                name: 'lib.min'
            }
        },
        plugins: base.plugins.concat([
            new webpack.DefinePlugin({
                'process.env.NODE_ENV': '"' + process.env.NODE_ENV + '"',
                'process.env.DEBUG': Boolean(process.env.DEBUG),
                'process.env.GA_ID': '"' + (process.env.GA_ID || 'UA-000000-01') + '"',
                'process.env.CLARITY_ID': JSON.stringify(process.env.CLARITY_ID || ''),
                'process.env.COMPILE_API_URL': JSON.stringify(process.env.COMPILE_API_URL || '/api/compile'),
                // Advanced mode stays locked unless this is "on" (src/lib/advanced-mode.js).
                'process.env.ADVANCED_MODE': JSON.stringify(process.env.ADVANCED_MODE || '')
            }),
            // Block IDE at /ide → ide.html
            new HtmlWebpackPlugin({
                chunks: ['lib.min', 'esptool', 'gui'],
                template: 'src/playground/index.ejs',
                filename: 'ide.html',
                title: 'TinkerBit IDE',
                sentryConfig: process.env.SENTRY_CONFIG ? '"' + process.env.SENTRY_CONFIG + '"' : null
            }),
            new HtmlWebpackPlugin({
                chunks: ['lib.min', 'esptool', 'blocksonly'],
                template: 'src/playground/index.ejs',
                filename: 'blocks-only.html',
                title: 'TinkerBit IDE: Blocks Only Example'
            }),
            new HtmlWebpackPlugin({
                chunks: ['lib.min', 'esptool', 'compatibilitytesting'],
                template: 'src/playground/index.ejs',
                filename: 'compatibility-testing.html',
                title: 'TinkerBit IDE: Compatibility Testing'
            }),
            new HtmlWebpackPlugin({
                chunks: ['lib.min', 'esptool', 'player'],
                template: 'src/playground/index.ejs',
                filename: 'player.html',
                title: 'TinkerBit IDE: Player Example'
            }),
            new CopyWebpackPlugin([{
                from: 'static',
                to: 'static',
                // TinkerBit favicon is generated by scripts/build-site-assets.js (site build).
                ignore: ['favicon.ico']
            }]),
            new CopyWebpackPlugin([{
                from: 'node_modules/openblock-blocks/media',
                to: 'static/blocks-media'
            }]),
            new CopyWebpackPlugin([{
                from: 'extensions/**',
                to: 'static',
                context: 'src/examples'
            }]),
            new CopyWebpackPlugin([{
                from: 'extension-worker.{js,js.map}',
                context: 'node_modules/openblock-vm/dist/web'
            }])
        ])
    }),
    // Marketing site + login as lightweight React bundles (not IDE lib.min/esptool)
    (() => {
        const site = defaultsDeep({}, base, {
            name: 'tinkerbit-site',
            entry: {
                landing: './src/site/landing/index.jsx',
                privacy: './src/site/privacy/index.jsx',
                login: './src/site/login/index.jsx',
                choose: './src/site/choose/index.jsx',
                beginnerStudio: './src/beginner-studio/index.jsx',
                iot: './src/iot/index.jsx'
            },
            output: {
                path: path.resolve(__dirname, 'build'),
                filename: '[name].js',
                chunkFilename: 'chunks/[name].js',
                publicPath: '/'
            },
            node: {
                fs: 'empty',
                net: 'empty',
                tls: 'empty'
            }
        });
        delete site.output.library;
        site.module = {
            rules: base.module.rules.concat([{
                // Beginner Studio board and module artwork (module-test/tools/export-studio-art.mjs)
                test: /\.svg$/,
                include: path.resolve(__dirname, 'src/beginner-studio/assets'),
                loader: 'file-loader',
                options: {
                    outputPath: 'static/beginner/',
                    name: '[name].[hash:8].[ext]'
                }
            }])
        };
        // Assign after defaultsDeep so IDE splitChunks/runtimeChunk never leak in.
        // Lazy upload/esptool must stay out of the initial site-vendor chunk.
        site.optimization = {
            minimizer: ((base.optimization && base.optimization.minimizer) || []).concat([
                // The lazy three.js chunk is ~2 MB unminified; Uglify can't parse its ES2015+ output
                new TerserPlugin({include: /board3d-gl/, parallel: true, sourceMap: true})
            ]),
            runtimeChunk: false,
            splitChunks: {
                chunks: 'initial',
                cacheGroups: {
                    default: false,
                    vendors: false,
                    siteVendor: {
                        test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
                        name: 'site-vendor',
                        chunks: 'initial',
                        enforce: true
                    }
                }
            }
        };
        site.plugins = [
            new webpack.DefinePlugin({
                'process.env.NODE_ENV': '"' + process.env.NODE_ENV + '"',
                'process.env.CLARITY_ID': JSON.stringify(process.env.CLARITY_ID || ''),
                'process.env.COMPILE_API_URL': JSON.stringify(process.env.COMPILE_API_URL || ''),
                // Advanced mode stays locked unless this is "on" (src/lib/advanced-mode.js).
                'process.env.ADVANCED_MODE': JSON.stringify(process.env.ADVANCED_MODE || '')
            }),
            // Generated images/icons (scripts/build-site-assets.js) + root files (robots, sitemap, 404, manifest)
            new CopyWebpackPlugin([
                {from: '.generated/site-assets', to: ''},
                {from: 'src/site/public', to: ''}
            ]),
            new HtmlWebpackPlugin({
                chunks: ['site-vendor', 'landing'],
                template: 'src/site/site.ejs',
                filename: 'index.html',
                title: 'TinkerBit: Block Coding Meets Real Circuits | Fun STEM Kits',
                description: SITE_DESCRIPTION,
                canonical: `${SITE_ORIGIN}/`,
                colorScheme: 'only light',
                themeColor: SITE_THEME_COLOR,
                fontsHref: SITE_FONTS_HREF,
                extraHead: [
                    '<meta property="og:type" content="website">',
                    '<meta property="og:site_name" content="TinkerBit">',
                    '<meta property="og:title" content="TinkerBit: Block Coding Meets Real Circuits">',
                    `<meta property="og:description" content="${SITE_DESCRIPTION}">`,
                    `<meta property="og:url" content="${SITE_ORIGIN}/">`,
                    `<meta property="og:image" content="${SITE_ORIGIN}/static/landing/og-image.png">`,
                    '<meta property="og:image:type" content="image/png">',
                    '<meta property="og:image:width" content="1200">',
                    '<meta property="og:image:height" content="630">',
                    `<meta property="og:image:alt" content="${OG_IMAGE_ALT}">`,
                    '<meta name="twitter:card" content="summary_large_image">',
                    '<meta name="twitter:title" content="TinkerBit: Block Coding Meets Real Circuits">',
                    `<meta name="twitter:description" content="${SITE_DESCRIPTION}">`,
                    `<meta name="twitter:image" content="${SITE_ORIGIN}/static/landing/og-image.png">`,
                    `<meta name="twitter:image:alt" content="${OG_IMAGE_ALT}">`,
                    `<script type="application/ld+json">${JSON.stringify({
                        '@context': 'https://schema.org',
                        '@type': 'Organization',
                        'name': 'TinkerBit',
                        'url': `${SITE_ORIGIN}/`,
                        'logo': `${SITE_ORIGIN}/static/brand/logo-512.png`,
                        'email': 'hello@tinkerbit.io',
                        'sameAs': [
                            'https://www.linkedin.com/company/tinker-bit/',
                            'https://www.facebook.com/profile.php?id=61595876941022'
                        ]
                    })}</script>`
                ].join('\n    ')
            }),
            new HtmlWebpackPlugin({
                chunks: ['site-vendor', 'privacy'],
                template: 'src/site/site.ejs',
                filename: 'privacy.html',
                title: 'Privacy | TinkerBit',
                description: 'What TinkerBit collects on tinkerbit.io, why, and how to ask for deletion.',
                canonical: `${SITE_ORIGIN}/privacy`,
                colorScheme: 'only light',
                themeColor: SITE_THEME_COLOR,
                fontsHref: SITE_FONTS_HREF
            }),
            new HtmlWebpackPlugin({
                chunks: ['site-vendor', 'login'],
                template: 'src/site/site.ejs',
                filename: 'login.html',
                title: 'Sign in — TinkerBit',
                description: 'Sign in with Google to open the TinkerBit IDE.',
                robots: 'noindex',
                canonical: `${SITE_ORIGIN}/login`,
                extraHead: [
                    // Allow Clarity CDN + Google fonts; keep frame-ancestors locked down.
                    '<meta http-equiv="Content-Security-Policy" content="default-src \'self\'; style-src \'self\' \'unsafe-inline\' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src \'self\' data: https:; script-src \'self\' https://*.clarity.ms https://c.bing.com; connect-src \'self\' https://*.clarity.ms https://c.bing.com; frame-ancestors \'none\'; base-uri \'self\'; form-action \'self\'">',
                    '<meta http-equiv="X-Frame-Options" content="DENY">'
                ].join('\n    ')
            }),
            new HtmlWebpackPlugin({
                chunks: ['site-vendor', 'choose'],
                template: 'src/site/site.ejs',
                filename: 'choose.html',
                title: 'Choose your mode — TinkerBit',
                description: 'Pick Beginner or Advanced after signing in to TinkerBit.',
                robots: 'noindex',
                canonical: `${SITE_ORIGIN}/choose`,
                extraHead: [
                    '<meta http-equiv="Content-Security-Policy" content="default-src \'self\'; style-src \'self\' \'unsafe-inline\' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src \'self\' data: https:; script-src \'self\' https://*.clarity.ms https://c.bing.com; connect-src \'self\' https://*.clarity.ms https://c.bing.com; frame-ancestors \'none\'; base-uri \'self\'; form-action \'self\'">',
                    '<meta http-equiv="X-Frame-Options" content="DENY">'
                ].join('\n    ')
            }),
            new HtmlWebpackPlugin({
                chunks: ['site-vendor', 'beginnerStudio'],
                template: 'src/site/site.ejs',
                filename: 'beginner.html',
                title: 'TinkerBit Beginner Studio',
                description: 'Wire RJ11 modules and program them with blocks — live Arduino C++ for beginners.',
                robots: 'noindex',
                canonical: `${SITE_ORIGIN}/beginner`,
                extraHead: [
                    // The IoT tab's live dashboards connect straight to the API host, like /iot.
                    `<meta http-equiv="Content-Security-Policy" content="default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: https:; script-src 'self' 'unsafe-eval' https://*.clarity.ms https://c.bing.com; connect-src 'self' https://*.clarity.ms https://c.bing.com wss://api.tinkerbit.io${IOT_DEV_WS}; worker-src 'self' blob:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'">`,
                    '<meta http-equiv="X-Frame-Options" content="DENY">',
                    '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">'
                ].join('\n    ')
            }),
            new HtmlWebpackPlugin({
                chunks: ['site-vendor', 'iot'],
                template: 'src/site/site.ejs',
                filename: 'iot.html',
                title: 'IoT Dashboard · TinkerBit',
                description: 'Live readings, switches and alerts for your TinkerBit boards.',
                robots: 'noindex',
                canonical: `${SITE_ORIGIN}/iot`,
                themeColor: '#111827',
                manifestHref: '/iot.webmanifest',
                fontsHref: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap',
                extraHead: [
                    // Live updates connect straight to the API host (Vercel rewrites cannot carry WebSockets).
                    `<meta http-equiv="Content-Security-Policy" content="default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; script-src 'self'; connect-src 'self' wss://api.tinkerbit.io${IOT_DEV_WS}; frame-ancestors 'none'; base-uri 'self'; form-action 'self'">`,
                    '<meta http-equiv="X-Frame-Options" content="DENY">',
                    '<meta name="apple-mobile-web-app-capable" content="yes">',
                    '<meta name="mobile-web-app-capable" content="yes">'
                ].join('\n    ')
            })
        ];
        return site;
    })()
].concat(
    process.env.NODE_ENV === 'production' || process.env.BUILD_MODE === 'dist' ? (
        // export as library
        defaultsDeep({}, base, {
            target: 'web',
            entry: {
                'openblock-gui': './src/index.js'
            },
            output: {
                libraryTarget: 'umd',
                path: path.resolve('dist'),
                publicPath: `${STATIC_PATH}/`
            },
            externals: {
                'react': 'react',
                'react-dom': 'react-dom'
            },
            module: {
                rules: base.module.rules.concat([
                    {
                        test: /\.(svg|png|wav|gif|jpg|ttf)$/,
                        loader: 'file-loader',
                        options: {
                            outputPath: 'static/assets/',
                            publicPath: `${STATIC_PATH}/assets/`
                        }
                    }
                ])
            },
            plugins: base.plugins.concat([
                new CopyWebpackPlugin([{
                    from: 'node_modules/openblock-blocks/media',
                    to: 'static/blocks-media'
                }]),
                new CopyWebpackPlugin([{
                    from: 'extension-worker.{js,js.map}',
                    context: 'node_modules/openblock-vm/dist/web'
                }]),
                // Include library JSON files for scratch-desktop to use for downloading
                new CopyWebpackPlugin([{
                    from: 'src/lib/libraries/*.json',
                    to: 'libraries',
                    flatten: true
                }])
            ])
        })) : []
);
