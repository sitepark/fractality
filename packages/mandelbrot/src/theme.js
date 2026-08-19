'use strict';

import Path from 'path';
import _ from 'lodash';
import { Theme, CONTRACT_VERSION } from '@fractality/web';
import { URL, fileURLToPath } from 'url';
import fsExtra from 'fs-extra';
const { readJsonSync } = fsExtra;

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const packageJSON = readJsonSync(__dirname + '../package.json');

/**
 * The custom properties the stylesheet reads, and the `skin` keys that feed
 * them.
 *
 * Three, not an open set: these are the names `assets/scss` actually references
 * (`rgb(var(--skin-accent))` and friends), so a fourth key would be a stylesheet
 * change, not a config one.
 */
const SKIN_PROPERTIES = {
    accent: '--skin-accent',
    complement: '--skin-complement',
    links: '--skin-links',
};

const HEX_COLOUR = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

/**
 * Turns `#0089ff` into `0, 137, 255`.
 *
 * The triplet form is not decoration: the stylesheet interpolates these into
 * `rgba(var(--skin-links), 0.2)` to derive its own tints, which needs the
 * channels separately. That is also why a colour keyword or an `rgb()` value
 * cannot be passed through — it would produce `rgba(rgb(0 137 255), 0.2)`, which
 * is invalid, and CSS discards invalid custom-property substitutions silently.
 */
function toRgbChannels(key, value) {
    const match = HEX_COLOUR.exec(String(value).trim());
    if (!match) {
        throw new Error(
            `mandelbrot: skin.${key} must be a hex colour like "#0089ff", got ${JSON.stringify(value)}. ` +
                'The stylesheet interpolates it into rgb()/rgba(), so colour keywords and ' +
                'rgb()/hsl() values cannot be used.',
        );
    }

    const hex = match[1];
    const pairs =
        hex.length === 3 ? Array.from(hex, (char) => char + char) : [hex.slice(0, 2), hex.slice(2, 4), hex.slice(4, 6)];

    return pairs.map((pair) => parseInt(pair, 16)).join(', ');
}

/**
 * Resolves `skin` to the theming custom properties `@fractality/web` writes into
 * the Shell.
 *
 * Named skins used to do this work by compiling one stylesheet per palette; with
 * them gone, this is the whole of mandelbrot's colour configuration, so an
 * unrecognised key is an error rather than a no-op. A misspelled `link` for
 * `links` is otherwise indistinguishable from a theming system that does not
 * work — which is exactly how this went unnoticed once before.
 */
function themingFromSkin(skin) {
    const theming = {};

    for (const [key, value] of Object.entries(skin)) {
        // A leftover named skin. Dropped rather than rejected: `skin: 'blue'` is
        // already documented as ignored, and `{ name: 'blue' }` is the same
        // config in object form.
        if (key === 'name') continue;

        const property = SKIN_PROPERTIES[key];
        if (!property) {
            throw new Error(
                `mandelbrot: unknown skin option "${key}". Expected one of ` +
                    `${Object.keys(SKIN_PROPERTIES).join(', ')}.`,
            );
        }

        theming[property] = toRgbChannels(key, value);
    }

    return theming;
}

export default function (options) {
    const config = _.defaultsDeep(_.clone(options || {}), {
        skin: {},
        navigation: 'default',
        rtl: false,
        lang: 'en',
        styles: 'default',
        highlightStyles: 'default',
        scripts: 'default',
        format: 'json',
        static: {
            mount: 'themes/mandelbrot',
        },
        version: packageJSON.version,
        favicon: null,
        labels: {
            info: 'Information',
            builtOn: 'Built on',
            search: {
                label: 'Search',
                placeholder: 'Search…',
                clear: 'Clear search',
            },
            navigation: {
                back: 'Back',
            },
            tree: {
                collapse: 'Collapse tree',
            },
            components: {
                handle: 'Handle',
                tags: 'Tags',
                variants: 'Variants',
                context: {
                    empty: 'No context defined.',
                },
                notes: {
                    empty: 'No notes defined.',
                },
                preview: {
                    label: 'Preview',
                    withLayout: 'With layout',
                    componentOnly: 'Component only',
                },
                path: 'Filesystem Path',
                references: 'References',
                referenced: 'Referenced by',
                resources: {
                    file: 'File',
                    content: 'Content',
                    previewUnavailable: 'Previews are currently not available for this file type.',
                    url: 'URL',
                    path: 'Filesystem Path',
                    size: 'Size',
                },
            },
            panels: {
                html: 'HTML',
                view: 'View',
                context: 'Context',
                resources: 'Resources',
                info: 'Info',
                notes: 'Notes',
            },
        },
    });
    // Named skins are gone. `skin` is now purely a set of custom-property
    // overrides ({ accent, complement, links }) written into the Shell — the
    // form this config has always also accepted. A leftover string is ignored
    // rather than silently resolving to a stylesheet that no longer exists.
    config.skin = typeof config.skin === 'object' && config.skin !== null ? config.skin : {};
    config.theming = themingFromSkin(config.skin);
    const uiStyles = []
        .concat(config.styles)
        .concat(config.stylesheet)
        .filter((url) => url)
        .map((url) => (url === 'default' ? `/${config.static.mount}/css/default.css` : url));
    const highlightStyles = []
        .concat(config.highlightStyles)
        .filter((url) => url)
        .map((url) => (url === 'default' ? `/${config.static.mount}/css/highlight.css` : url));

    config.information = (
        config.information || [
            {
                label: config.labels.builtOn,
                value: new Date(),
                type: 'time',
                format: (value) => {
                    return value.toLocaleDateString(config.lang);
                },
            },
        ]
    ).map((item) => ({
        format: (value) => {
            return value;
        },
        type: 'string',
        ...item,
    }));
    config.panels = config.panels || ['html', 'view', 'context', 'resources', 'info', 'notes'];
    config.nav = config.nav || ['search', 'components', 'docs', 'assets', 'information'];
    config.styles = [].concat(uiStyles).concat(highlightStyles);
    // 'default' no longer resolves to anything: the Frame is loaded by the Shell
    // as a module, not linked as a theme script. A consumer's own script URLs
    // still pass through.
    config.scripts = [].concat(config.scripts).filter((url) => url && url !== 'default');
    config.favicon = config.favicon || `/${config.static.mount}/favicon.ico`;

    const theme = new Theme(config);

    theme.setContractVersion(CONTRACT_VERSION);

    theme.addStatic(Path.join(__dirname, '..', 'dist'), `/${config.static.mount}`);

    // The Shell the Frame boots from. This replaces every view-rendering entry
    // point the theme used to have: @fractality/web copies this across the route
    // table and injects the global config, and the Frame renders from the data
    // contract.
    theme.setShell(Path.join(__dirname, '..', 'dist', 'frame', 'index.html'));

    theme.addRoute('/', {
        handle: 'overview',
    });

    theme.addRoute('/docs', {
        redirect: '/',
    });

    theme.addRoute('/components', {
        redirect: '/',
    });

    theme.addRoute('/assets', {
        redirect: '/',
    });

    theme.addRoute(
        '/assets/:name',
        {
            handle: 'asset-source',
        },
        function (app) {
            return app.assets.visible().map((asset) => ({ name: asset.name }));
        },
    );

    theme.addRoute(
        '/components/preview/:handle',
        {
            handle: 'preview',
        },
        getHandles,
    );

    theme.addRoute(
        '/components/render/:handle',
        {
            handle: 'render',
        },
        getHandles,
    );

    theme.addRoute(
        '/components/detail/:handle',
        {
            handle: 'component',
        },
        getHandles,
    );

    theme.addRoute(
        '/components/raw/:handle/:asset',
        {
            handle: 'component-resource',
            static: function (params, app) {
                const component = app.components.find(`@${params.handle}`);
                if (component) {
                    return Path.join(component.viewDir, params.asset);
                }
                throw new Error('Component not found');
            },
        },
        getResources,
    );

    theme.addRoute(
        '/docs{/*path}',
        {
            handle: 'page',
        },
        function (app) {
            return app.docs
                .filter((d) => !d.isHidden && d.path !== '')
                .flatten()
                .map((page) => ({ path: page.path }));
        },
    );

    let handles = null;

    function getHandles(app) {
        app.components.on('updated', () => (handles = null));
        if (handles) {
            return handles;
        }
        handles = [];
        app.components.flatten().each((comp) => {
            handles.push(comp.handle);
            if (comp.variants().size > 1) {
                comp.variants().each((variant) => handles.push(variant.handle));
            }
        });
        handles = handles.map((h) => ({ handle: h }));
        return handles;
    }

    function getResources(app) {
        let params = [];
        app.components.flatten().each((comp) => {
            params = params.concat(
                comp
                    .resources()
                    .flatten()
                    .toArray()
                    .map((res) => {
                        return {
                            handle: comp.handle,
                            asset: res.base,
                        };
                    }),
            );
        });
        return params;
    }

    return theme;
}
