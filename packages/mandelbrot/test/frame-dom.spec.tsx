// @vitest-environment jsdom
//
// jsdom rather than happy-dom: the Frame renders a Preview iframe, and happy-dom
// attempts to load its src — either over the network, or loudly refusing to —
// which buries real failures in stack traces. jsdom leaves subresources alone.
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { EntityPayload, TreePayload } from '@fractality/web/contract';

const tree: TreePayload = {
    contractVersion: 1,
    status: { 'components:ready': { label: 'Ready', color: '#29CC29' } },
    components: [
        {
            handle: 'forms',
            label: 'Forms',
            isCollection: true,
            children: [
                { handle: 'button', label: 'Button', status: 'components:ready' },
                { handle: 'field', label: 'Field', tags: ['form-control'] },
                {
                    // Multi-variant components render as collections in the real
                    // tree, with one child per variant.
                    handle: 'tabs',
                    label: 'Tabs',
                    children: [
                        { handle: 'tabs--default', label: 'Default' },
                        { handle: 'tabs--pill', label: 'Pill' },
                    ],
                },
            ],
        },
        {
            handle: 'media',
            label: 'Media',
            isCollection: true,
            children: [{ handle: 'image', label: 'Image' }],
        },
    ],
    docs: [
        { handle: 'index', label: 'Overview', path: 'index' },
        {
            handle: 'guide',
            label: 'Guide',
            isCollection: true,
            // A page one directory down. Its handle is the file's own name, so
            // the path is the only thing that addresses it.
            children: [{ handle: 'getting-started', label: 'Getting Started', path: 'guide/getting-started' }],
        },
    ],
    assets: [],
};

const entity: EntityPayload = {
    contractVersion: 1,
    handle: 'button',
    label: 'Button',
    title: 'Button',
    status: 'components:ready',
    viewPath: 'forms/button/button.hbs',
    previewUrl: '/components/preview/button',
    renderUrl: '/components/render/button',
    references: ['icon'],
    referencedBy: [],
    resources: [{ name: 'button.css', path: 'forms/button/button.css', ext: '.css', size: 812 }],
    variants: [
        {
            handle: 'button--default',
            label: 'Default',
            name: 'default',
            isDefault: true,
            previewUrl: '/components/preview/button--default',
            renderUrl: '/components/render/button--default',
        },
        {
            handle: 'button--primary',
            label: 'Primary',
            name: 'primary',
            isDefault: false,
            previewUrl: '/components/preview/button--primary',
            renderUrl: '/components/render/button--primary',
        },
    ],
};

const tabsEntity: EntityPayload = {
    contractVersion: 1,
    handle: 'tabs',
    label: 'Tabs',
    title: 'Tabs',
    viewPath: 'nav/tabs/tabs.hbs',
    previewUrl: '/components/preview/tabs',
    renderUrl: '/components/render/tabs',
    references: [],
    referencedBy: [],
    resources: [],
    variants: [
        {
            handle: 'tabs--default',
            label: 'Default',
            name: 'default',
            isDefault: true,
            previewUrl: '/components/preview/tabs--default',
            renderUrl: '/components/render/tabs--default',
        },
        {
            handle: 'tabs--pill',
            label: 'Pill',
            name: 'pill',
            isDefault: false,
            previewUrl: '/components/preview/tabs--pill',
            renderUrl: '/components/render/tabs--pill',
        },
    ],
};

/**
 * A component whose variants render into one document — `collated: true` in its
 * own config. It is presented as that document, not as variants to choose
 * between.
 */
const collatedEntity: EntityPayload = {
    contractVersion: 1,
    handle: 'grid',
    label: 'Grid',
    title: 'Grid',
    viewPath: 'layout/grid/grid.hbs',
    isCollated: true,
    previewUrl: '/components/preview/grid',
    renderUrl: '/components/render/grid',
    references: [],
    referencedBy: [],
    resources: [],
    variants: [
        {
            handle: 'grid--default',
            label: 'Default',
            name: 'default',
            isDefault: true,
            previewUrl: '/components/preview/grid--default',
            renderUrl: '/components/render/grid--default',
        },
        {
            handle: 'grid--wide',
            label: 'Wide',
            name: 'wide',
            isDefault: false,
            previewUrl: '/components/preview/grid--wide',
            renderUrl: '/components/render/grid--wide',
        },
    ],
};

const payloads: Record<string, unknown> = {
    '/tree.json': tree,
    '/components/detail/button.json': entity,
    // A variant route resolves to its component's payload: that is the design,
    // and the reason the URL is the only thing that identifies the variant.
    '/components/detail/tabs.json': tabsEntity,
    // Both variant routes resolve to the component's payload: that is the
    // design, and why the URL is the only thing identifying the variant.
    '/components/detail/tabs--default.json': tabsEntity,
    '/components/detail/tabs--pill.json': tabsEntity,
    '/components/detail/tabs.notes.json': {
        contractVersion: 1,
        handle: 'tabs',
        notes: null,
        variants: [],
    },
    '/docs/index.json': {
        contractVersion: 1,
        handle: 'index',
        label: 'Overview',
        title: 'Project Overview',
        path: '',
        content: '# Hello\n\nSome **documentation**.',
    },
    '/components/detail/field.json': {
        contractVersion: 1,
        handle: 'field',
        label: 'Field',
        title: 'Field',
        viewPath: 'forms/field/field.hbs',
        references: [],
        referencedBy: [],
        resources: [],
        variants: [
            {
                handle: 'field--default',
                label: 'Default',
                name: 'default',
                isDefault: true,
                previewUrl: '/components/preview/field',
                renderUrl: '/components/render/field',
            },
        ],
    },
    '/components/detail/field.notes.json': {
        contractVersion: 1,
        handle: 'field',
        notes: null,
        variants: [],
    },
    '/docs/guide/getting-started.json': {
        contractVersion: 1,
        handle: 'getting-started',
        label: 'Getting Started',
        title: 'Getting Started',
        path: 'guide/getting-started',
        content: '# Start here',
    },
    '/components/detail/grid.json': collatedEntity,
    '/components/detail/grid--wide.json': collatedEntity,
    '/components/detail/grid.context.json': {
        contractVersion: 1,
        handle: 'grid',
        context: { columns: 12 },
        variants: [
            { handle: 'grid--default', context: { columns: 12 } },
            { handle: 'grid--wide', context: { columns: 16 } },
        ],
    },
    '/components/detail/grid.view.json': {
        contractVersion: 1,
        handle: 'grid',
        variants: [
            { handle: 'grid--default', content: '<div class="Grid">{{ columns }}</div>', lang: 'html' },
            { handle: 'grid--wide', content: '<div class="Grid Grid--wide">{{ columns }}</div>', lang: 'html' },
        ],
    },
    '/components/detail/button.resources.json': {
        contractVersion: 1,
        handle: 'button',
        collections: [
            {
                name: 'assets',
                label: 'Assets',
                files: [
                    {
                        name: 'button.css',
                        path: 'forms/button/button.css',
                        ext: '.css',
                        size: 812,
                        url: '/components/raw/button/button.css',
                        lang: 'css',
                        content: '.Button { color: red }',
                    },
                    {
                        name: 'icon.svg',
                        path: 'forms/button/icon.svg',
                        ext: '.svg',
                        size: 240,
                        url: '/components/raw/button/icon.svg',
                        lang: 'xml',
                        content: null,
                        isImage: true,
                    },
                ],
            },
        ],
    },
    '/components/detail/button.view.json': {
        contractVersion: 1,
        handle: 'button',
        variants: [
            {
                handle: 'button--default',
                content: '<button class="Button">{{ text }}</button>\n{{> @icon }}',
                lang: 'html',
            },
        ],
    },
    '/components/detail/button.context.json': {
        contractVersion: 1,
        handle: 'button',
        context: { text: 'Click me' },
        variants: [],
    },
    '/components/detail/button.notes.json': {
        contractVersion: 1,
        handle: 'button',
        notes: 'Some notes.',
        variants: [],
    },
};

/**
 * The payload map as declared, so a test can replace an entry to describe a
 * different library and the next test still gets the fixture it expects.
 */
const declaredPayloads = { ...payloads };

beforeEach(() => {
    for (const key of Object.keys(payloads)) delete payloads[key];
    Object.assign(payloads, declaredPayloads);

    // The Frame persists panel layout and the open Browser tab, so state leaks
    // between tests otherwise — one test clicking "view" would open the next
    // one on it.
    localStorage.clear();
    sessionStorage.clear();

    window.frctl = {
        env: 'server',
        themeMount: '/themes/mandelbrot/frame',
        siteRoot: '',
        treeFile: '/tree.json',
        projectTitle: 'Acme Patterns',
        labels: { panels: { notes: 'Notes', context: 'Context' } },
    };
    window.history.pushState(null, '', '/components/detail/button');

    vi.stubGlobal(
        'fetch',
        vi.fn((url: string) => {
            // Render documents are served as text, not JSON — the HTML panel
            // reads the same artefact the build writes for each component.
            if (url.startsWith('/components/render/')) {
                // Named after the url, so a panel assertion can tell which
                // document it is looking at.
                return Promise.resolve({
                    ok: true,
                    status: 200,
                    text: () => Promise.resolve(`<button class="Button">Click me</button><!-- ${url} -->`),
                });
            }

            const body = payloads[url];
            return Promise.resolve({
                ok: body !== undefined,
                status: body === undefined ? 404 : 200,
                json: () => Promise.resolve(body),
            });
        }),
    );
});

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.resetModules();
});

const mount = async () => {
    const { App } = await import('../frame/src/App.js');
    // Rendered into a real `#frame.Frame` root, because that element is the
    // mount point in production and some styling hangs off classes toggled on
    // it rather than on anything the App renders.
    // Cleared first: testing-library only removes containers it created itself,
    // so a container passed in accumulates. A stale #frame left in the document
    // is what `document.getElementById('frame')` would find, making assertions
    // about the mount point meaningless.
    document.body.innerHTML = '';
    const container = document.createElement('div');
    container.id = 'frame';
    container.className = 'Frame';
    document.body.appendChild(container);
    return render(<App />, { container });
};

/**
 * Asserts the Frame renders the markup mandelbrot's stylesheet targets.
 *
 * The rewrite inherits ~32 KB of CSS written for the templates it replaces, and
 * that CSS keys entirely off class names and structure. A component that renders
 * the right data with the wrong element names produces a page that works and
 * looks broken — which no data-level test would catch.
 */
describe('the Frame renders the markup the stylesheet expects', () => {
    it('lays out header, main panel and sidebar', async () => {
        const { container } = await mount();
        await waitFor(() => expect(container.querySelector('.Navigation')).not.toBeNull());

        expect(container.querySelector('.Frame-header .Header')).not.toBeNull();
        expect(container.querySelector('.Frame-body')).not.toBeNull();
        expect(container.querySelector('.Frame-panel--main .Frame-inner')).not.toBeNull();
        expect(container.querySelector('.Frame-panel--sidebar .Navigation')).not.toBeNull();
    });

    it('renders collections as collapsible tree items', async () => {
        const { container } = await mount();
        await waitFor(() => expect(container.querySelector('.Tree-collection')).not.toBeNull());

        const toggle = container.querySelector('.Tree-collectionLabel');
        expect(toggle?.getAttribute('aria-expanded')).toBe('true');
        expect(container.querySelector('.Tree-collectionItems')).not.toBeNull();
        expect(container.querySelector('.Tree-item.Tree-entity .Tree-entityLink')).not.toBeNull();
    });

    it('marks the current entity, which is how the sidebar shows position', async () => {
        const { container } = await mount();
        await waitFor(() => expect(container.querySelector('.Tree-entity.is-current')).not.toBeNull());
        expect(container.querySelector('.Tree-entity.is-current')?.getAttribute('data-state')).toBe('current');
    });

    it('renders a status dot carrying its configured colour', async () => {
        const { container } = await mount();
        await waitFor(() => expect(container.querySelector('.Status-dot')).not.toBeNull());
        const dot = container.querySelector('.Status-dot') as HTMLElement;
        expect(dot.style.borderColor).toBeTruthy();
        expect(dot.getAttribute('title')).toBe('Ready');
    });

    it('renders the Pen with its preview iframe and browser', async () => {
        const { container } = await mount();
        await waitFor(() => expect(container.querySelector('.Pen')).not.toBeNull());

        expect(container.querySelector('.Pen-header .Pen-title')).not.toBeNull();
        expect(container.querySelector('.Pen-preview.Preview .Preview-iframe')).not.toBeNull();
        expect(container.querySelector('.Pen-info .Browser .Browser-tabs')).not.toBeNull();
    });

    it('points the preview iframe at the variant it is showing', async () => {
        const { container } = await mount();
        await waitFor(() => expect(container.querySelector('.Preview-iframe')).not.toBeNull());
        expect(container.querySelector('.Preview-iframe')?.getAttribute('src')).toBe(
            '/components/preview/button--default',
        );
    });

    it('offers a variant switcher when there is more than one variant', async () => {
        // Scoped to the Pen: variant labels also appear in the tree, where a
        // multi-variant component lists its variants as children.
        const { container } = await mount();
        await waitFor(() => expect(container.querySelector('.Pen-variants')).not.toBeNull());
        const labels = [...container.querySelectorAll('.Pen-variant')].map((b) => b.textContent);
        expect(labels).toEqual(['Default', 'Primary']);
    });

    it('labels browser tabs from theme config', async () => {
        const { container } = await mount();
        await waitFor(() => expect(container.querySelector('.Browser-tabs')).not.toBeNull());
        // The first panel opens by default, as it did when the template layer
        // rendered the tabs.
        expect(container.querySelector('.Browser-tab--html.is-active')).not.toBeNull();
        expect(screen.getByText('Notes')).toBeTruthy();
    });
});

describe('documentation pages', () => {
    it('links docs to /docs, not to the components route', async () => {
        const { container } = await mount();
        await waitFor(() => expect(container.querySelector('.Navigation')).not.toBeNull());

        const links = [...container.querySelectorAll('.Tree-entityLink')].map((a) => a.getAttribute('href'));
        // Routing a doc to /components/detail yields a URL with no payload
        // behind it — a link that only fails when someone clicks it.
        expect(links).toContain('/docs/index');
        expect(links).not.toContain('/components/detail/index');
    });

    it('links a page below the docs root by its path, not by its handle', async () => {
        const { container } = await mount();
        await waitFor(() => expect(screen.getByText('Guide')).not.toBeNull());
        // Collections start closed unless they are on the way to the current
        // page, so the nested link has to be revealed before it can be read.
        fireEvent.click(screen.getByText('Guide'));

        const links = await waitFor(() => {
            const found = [...container.querySelectorAll('.Tree-entityLink')].map((a) => a.getAttribute('href'));
            expect(found.length).toBeGreaterThan(3);
            return found;
        });
        expect(links).toContain('/docs/guide/getting-started');
        // The handle-shaped url has no page and no payload behind it: nothing is
        // served there in either mode.
        expect(links).not.toContain('/docs/getting-started');
    });

    it('opens a page below the docs root from a deep link', async () => {
        window.history.pushState(null, '', '/docs/guide/getting-started');
        const { container } = await mount();
        await waitFor(() => expect(container.querySelector('.Document-title')).not.toBeNull());

        expect(container.querySelector('.Document-title')?.textContent).toBe('Getting Started');
        expect(container.querySelector('.Prose')?.querySelector('h1')?.textContent).toBe('Start here');
    });

    it('renders a doc page as prose, from Markdown', async () => {
        window.history.pushState(null, '', '/docs/index');
        const { container } = await mount();
        await waitFor(() => expect(container.querySelector('.Document')).not.toBeNull());

        expect(container.querySelector('.Document-title')?.textContent).toBe('Project Overview');
        const prose = container.querySelector('.Prose');
        // Rendered client-side: the payload carries Markdown, not HTML.
        expect(prose?.querySelector('h1')?.textContent).toBe('Hello');
        expect(prose?.querySelector('strong')?.textContent).toBe('documentation');
    });
});

describe("the project's own name", () => {
    // It comes from the library's `project.title`. The Frame used to read it from
    // `labels.projectTitle`, which nothing sets, so every site called itself
    // "Component Library" and every tab said "Fractality".
    it('names the library in the header', async () => {
        const { container } = await mount();
        await waitFor(() => expect(container.querySelector('.Header-title')).not.toBeNull());
        expect(container.querySelector('.Header-title')?.textContent).toBe('Acme Patterns');
    });

    it('ends the document title, after the page', async () => {
        await mount();
        await waitFor(() => expect(document.title).toBe('Button | Acme Patterns'));
    });

    it('is the whole document title when no page is open', async () => {
        window.history.pushState(null, '', '/nowhere');
        await mount();
        await waitFor(() => expect(document.title).toBe('Acme Patterns'));
    });

    it('falls back to a generic name when the library supplies none', async () => {
        window.frctl = { ...window.frctl!, projectTitle: undefined };
        const { container } = await mount();
        await waitFor(() => expect(container.querySelector('.Header-title')).not.toBeNull());
        expect(container.querySelector('.Header-title')?.textContent).toBe('Component Library');
    });

    it('greets a project that has named nothing, rather than heading its page "Component Library"', async () => {
        window.frctl = { ...window.frctl!, projectTitle: undefined };
        vi.stubGlobal(
            'fetch',
            vi.fn((url: string) =>
                url === '/tree.json'
                    ? Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(tree) })
                    : Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) }),
            ),
        );
        window.history.pushState(null, '', '/');

        const { container } = await mount();
        await waitFor(() => expect(container.querySelector('.Document-title')).not.toBeNull());
        expect(container.querySelector('.Document-title')?.textContent).toBe('Welcome to your component library');
    });

    it('heads the welcome page, since that page has no document of its own', async () => {
        // 0.x's title chain for a page with nothing behind it: the project's name,
        // then the greeting.
        vi.stubGlobal(
            'fetch',
            vi.fn((url: string) =>
                url === '/tree.json'
                    ? Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(tree) })
                    : Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) }),
            ),
        );
        window.history.pushState(null, '', '/');

        const { container } = await mount();
        await waitFor(() => expect(container.querySelector('.Document-title')).not.toBeNull());
        expect(container.querySelector('.Document-title')?.textContent).toBe('Acme Patterns');
    });
});

describe('the home page', () => {
    // `/` is the project's index page, as it was in 0.x. It is the url
    // `fractality start` prints and the one a bare domain resolves to, and it
    // rendered an empty panel saying "Select a component".
    it('renders the index page at the site root', async () => {
        window.history.pushState(null, '', '/');
        const { container } = await mount();
        await waitFor(() => expect(container.querySelector('.Document-title')).not.toBeNull());

        expect(container.querySelector('.Document-title')?.textContent).toBe('Project Overview');
        expect(container.querySelector('.Prose')?.querySelector('h1')?.textContent).toBe('Hello');
    });

    it('renders it at /index.html too, which is the file a static host serves', async () => {
        window.history.pushState(null, '', '/index.html');
        const { container } = await mount();
        await waitFor(() => expect(container.querySelector('.Document-title')).not.toBeNull());
        expect(container.querySelector('.Document-title')?.textContent).toBe('Project Overview');
    });

    it('marks the index page as current in the navigation', async () => {
        window.history.pushState(null, '', '/');
        const { container } = await mount();
        await waitFor(() => expect(container.querySelector('.Navigation')).not.toBeNull());

        const current = container.querySelector('.Tree-item.is-current .Tree-entityLink');
        expect(current?.getAttribute('href')).toBe('/docs/index');
    });

    it('welcomes a project that has no index page, rather than reporting an error', async () => {
        // Every new library starts here: an empty documentation directory. A 404
        // on the payload is an ordinary state, and the home page has to say
        // something — an error panel reads as a broken install.
        vi.stubGlobal(
            'fetch',
            vi.fn((url: string) => {
                if (url === '/tree.json') {
                    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(tree) });
                }
                return Promise.resolve({
                    ok: false,
                    status: 404,
                    json: () => Promise.resolve({ error: 'No payload is served at ' + url }),
                });
            }),
        );

        window.history.pushState(null, '', '/');
        const { container } = await mount();
        await waitFor(() => expect(container.querySelector('.Document-title')).not.toBeNull());

        // Identified by what it tells the reader to do, not by its heading: the
        // heading is the project's own name when it has one.
        expect(container.querySelector('.Prose')?.textContent).toContain('index.md');
        expect(container.querySelector('.Prose')?.textContent).toContain('using the navigation');
        expect(container.querySelector('.Error')).toBeNull();
        // The navigation is still there: the library is browsable with no
        // documentation at all.
        expect(container.querySelector('.Navigation')).not.toBeNull();
    });

    it('still reports a real failure on the home page', async () => {
        // Only a 404 means "no index page". Anything else is a fault, and
        // swallowing it would leave the welcome text standing in for a broken
        // server.
        vi.stubGlobal(
            'fetch',
            vi.fn((url: string) => {
                if (url === '/tree.json') {
                    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(tree) });
                }
                return Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({}) });
            }),
        );

        window.history.pushState(null, '', '/');
        const { container } = await mount();
        await waitFor(() => expect(container.querySelector('.Error')).not.toBeNull());
        expect(container.querySelector('.Error-message')?.textContent).toContain('500');
    });
});

describe('panel visibility', () => {
    const PANELS = ['notes', 'context', 'view', 'resources', 'info'];

    it('marks the rendered panel is-active, which is what makes it visible', async () => {
        // .Browser-panel is display:none unless it carries is-active. A panel
        // rendered without it is in the DOM and invisible — every tab looked
        // empty even though its content was there.
        const { container } = await mount();
        await waitFor(() => expect(container.querySelector('.Browser-panel')).not.toBeNull());
        expect(container.querySelector('.Browser-panel.is-active')).not.toBeNull();
    });

    it('shows content for every tab', async () => {
        const { container } = await mount();
        await waitFor(() => expect(container.querySelector('.Browser-tabs')).not.toBeNull());

        for (const name of PANELS) {
            const tab = [...container.querySelectorAll('.Browser-tab a')].find(
                (a) => a.textContent?.toLowerCase() === name,
            ) as HTMLElement;
            expect(tab, `tab ${name} exists`).toBeTruthy();
            tab.click();

            await waitFor(() => {
                const panel = container.querySelector('.Browser-panel.is-active');
                expect(panel, `panel ${name} is active`).not.toBeNull();
                expect(panel?.textContent?.trim().length, `panel ${name} has content`).toBeGreaterThan(0);
            });
        }
    });
});

describe('code panels', () => {
    const openPanel = async (container: HTMLElement, name: string) => {
        await waitFor(() => expect(container.querySelector('.Browser-tabs')).not.toBeNull());
        const tab = [...container.querySelectorAll('.Browser-tab a')].find(
            (a) => a.textContent?.toLowerCase() === name,
        ) as HTMLElement;
        tab.click();
    };

    it('highlights view source, lazily', async () => {
        const { container } = await mount();
        await openPanel(container, 'view');

        await waitFor(() => {
            const pre = container.querySelector('.Browser-code pre');
            expect(pre?.innerHTML).toContain('hljs-');
        });
    });

    it('turns @references into links, after highlighting', async () => {
        // linkRefs consumed highlight's output in the template layer too.
        // Running it first would have the highlighter escape the anchors.
        const { container } = await mount();
        await openPanel(container, 'view');

        await waitFor(() => {
            const link = container.querySelector('.Browser-code a');
            expect(link?.getAttribute('href')).toBe('/components/detail/icon');
            expect(link?.textContent).toBe('@icon');
        });
    });

    it('escapes source rather than letting a template become markup', async () => {
        const { container } = await mount();
        await openPanel(container, 'view');

        await waitFor(() => {
            const pre = container.querySelector('.Browser-code pre') as HTMLElement;
            // The template contains a <button> tag; it must render as text.
            expect(pre.querySelector('button')).toBeNull();
            expect(pre.textContent).toContain('<button');
        });
    });

    it('highlights context as json', async () => {
        const { container } = await mount();
        await openPanel(container, 'context');

        await waitFor(() => {
            const pre = container.querySelector('.Browser-code pre');
            expect(pre?.textContent).toContain('Click me');
            expect(pre?.innerHTML).toContain('hljs-');
        });
    });

    it('renders notes as Markdown rather than as source', async () => {
        const { container } = await mount();
        await waitFor(() => expect(container.querySelector('.Browser-tabs')).not.toBeNull());
        (
            [...container.querySelectorAll('.Browser-tab a')].find((a) => a.textContent === 'Notes') as HTMLElement
        ).click();
        await waitFor(() => expect(container.querySelector('.Browser-notes')).not.toBeNull());
        await waitFor(() => expect(container.querySelector('.Browser-notes p')?.textContent).toContain('Some notes.'));
    });
});

describe('search', () => {
    const type = async (container: HTMLElement, value: string) => {
        const input = container.querySelector('.Search-input') as HTMLInputElement;
        fireEvent.change(input, { target: { value } });
    };

    it('filters the tree rather than marking the rendered DOM', async () => {
        const { container } = await mount();
        await waitFor(() => expect(container.querySelector('.Search-input')).not.toBeNull());

        await type(container, 'field');
        await waitFor(() => {
            const labels = [...container.querySelectorAll('.Tree-entityLink span')].map((el) => el.textContent);
            expect(labels).toContain('Field');
            expect(labels).not.toContain('Button');
        });
    });

    it('matches on tags as well as labels', async () => {
        const { container } = await mount();
        await waitFor(() => expect(container.querySelector('.Search-input')).not.toBeNull());

        await type(container, 'form-control');
        await waitFor(() => {
            const labels = [...container.querySelectorAll('.Tree-entityLink span')].map((el) => el.textContent);
            expect(labels).toEqual(['Field']);
        });
    });

    it('drops a collection whose children all filter out', async () => {
        // Keeping it would show an empty branch, which reads as a broken filter.
        const { container } = await mount();
        await waitFor(() => expect(container.querySelector('.Search-input')).not.toBeNull());

        await type(container, 'nothing-matches-this');
        await waitFor(() => expect(container.querySelectorAll('.Tree-collection')).toHaveLength(0));
    });

    it('restores the full tree when the query is cleared', async () => {
        const { container } = await mount();
        await waitFor(() => expect(container.querySelector('.Search-input')).not.toBeNull());

        await type(container, 'field');
        await waitFor(() => expect(container.querySelectorAll('.Tree-entityLink')).toHaveLength(1));

        const clear = container.querySelector('.Search-clearButton') as HTMLElement;
        clear.click();
        await waitFor(() => expect(container.querySelectorAll('.Tree-entityLink').length).toBeGreaterThan(1));
    });
});

describe('navigating between components', () => {
    it('updates the preview iframe, not just the url', async () => {
        // The Pen initialises its selected variant with useState, and React
        // reuses a component instance in the same position — so the iframe kept
        // pointing at the previous component while the URL and the payload had
        // already moved on.
        const { container } = await mount();
        await waitFor(() =>
            expect(container.querySelector('.Preview-iframe')?.getAttribute('src')).toBe(
                '/components/preview/button--default',
            ),
        );

        const link = [...container.querySelectorAll('.Tree-entityLink')].find(
            (a) => a.getAttribute('href') === '/components/detail/field',
        ) as HTMLElement;
        link.click();

        await waitFor(() =>
            expect(container.querySelector('.Preview-iframe')?.getAttribute('src')).toBe('/components/preview/field'),
        );
        expect(window.location.pathname).toBe('/components/detail/field');
    });

    it('shows the newly selected component in the Pen title', async () => {
        const { container } = await mount();
        await waitFor(() => expect(container.querySelector('.Pen-title')).not.toBeNull());

        const link = [...container.querySelectorAll('.Tree-entityLink')].find(
            (a) => a.getAttribute('href') === '/components/detail/field',
        ) as HTMLElement;
        link.click();

        await waitFor(() => expect(container.querySelector('.Pen-title')?.textContent).toContain('Field'));
    });
});

describe('the sidebar toggle', () => {
    it('toggles is-closed on the Frame root, which is what the stylesheet keys off', async () => {
        // Three stylesheets match `.Frame.is-closed` — the header icon swap, the
        // file browser and the meta layout. A class on any other element, or
        // under any other name, silently does nothing.
        const { container } = await mount();
        await waitFor(() => expect(container.querySelector('.Header-navToggle')).not.toBeNull());

        const frame = document.getElementById('frame')!;
        expect(frame.classList.contains('is-closed')).toBe(false);

        (container.querySelector('.Header-navToggle') as HTMLElement).click();
        await waitFor(() => expect(frame.classList.contains('is-closed')).toBe(true));

        (container.querySelector('.Header-navToggle') as HTMLElement).click();
        await waitFor(() => expect(frame.classList.contains('is-closed')).toBe(false));
    });

    it('actually moves the sidebar, not just the icon', async () => {
        // The stylesheet has no rule that hides the sidebar. The previous theme
        // moved it with inline styles on .Frame-body and used .Frame.is-closed
        // only to swap the toggle icon — so setting the class alone changes the
        // icon and leaves the sidebar exactly where it was.
        const { container } = await mount();
        await waitFor(() => expect(container.querySelector('.Header-navToggle')).not.toBeNull());

        const body = container.querySelector('.Frame-body') as HTMLElement;
        expect(body.style.transform).toBe('translate3d(0, 0, 0)');

        (container.querySelector('.Header-navToggle') as HTMLElement).click();
        await waitFor(() => {
            expect(body.style.transform).toMatch(/translate3d\(-\d+px/);
            expect(body.style.marginRight).toMatch(/^-\d+px$/);
        });

        (container.querySelector('.Header-navToggle') as HTMLElement).click();
        await waitFor(() => expect(body.style.transform).toBe('translate3d(0, 0, 0)'));
    });

    it('remembers the sidebar state across a reload', async () => {
        const first = await mount();
        await waitFor(() => expect(first.container.querySelector('.Header-navToggle')).not.toBeNull());
        (first.container.querySelector('.Header-navToggle') as HTMLElement).click();
        await waitFor(() => expect(document.getElementById('frame')?.classList.contains('is-closed')).toBe(true));
        cleanup();

        const second = await mount();
        await waitFor(() => {
            const body = second.container.querySelector('.Frame-body') as HTMLElement;
            expect(body.style.transform).toMatch(/translate3d\(-\d+px/);
        });
    });

    it('renders both toggle icons, since the stylesheet swaps between them', async () => {
        const { container } = await mount();
        await waitFor(() => expect(container.querySelector('.Header-navToggle')).not.toBeNull());
        expect(container.querySelector('.Header-navToggleIcon--open')).not.toBeNull();
        expect(container.querySelector('.Header-navToggleIcon--closed')).not.toBeNull();
    });
});

describe('collapsing a collection', () => {
    it('hides its children and marks it is-closed', async () => {
        const { container } = await mount();
        await waitFor(() => expect(container.querySelector('.Tree-collection')).not.toBeNull());

        const collection = container.querySelector('.Tree-collection') as HTMLElement;
        const toggle = collection.querySelector('.Tree-collectionLabel') as HTMLElement;

        expect(collection.querySelector('.Tree-collectionItems')).not.toBeNull();
        expect(toggle.getAttribute('aria-expanded')).toBe('true');

        toggle.click();

        await waitFor(() => {
            expect(collection.classList.contains('is-closed')).toBe(true);
            expect(collection.querySelector('.Tree-collectionItems')).toBeNull();
            expect(toggle.getAttribute('aria-expanded')).toBe('false');
        });
    });

    it('expands again on a second click', async () => {
        const { container } = await mount();
        await waitFor(() => expect(container.querySelector('.Tree-collection')).not.toBeNull());

        const collection = container.querySelector('.Tree-collection') as HTMLElement;
        const toggle = collection.querySelector('.Tree-collectionLabel') as HTMLElement;

        toggle.click();
        await waitFor(() => expect(collection.classList.contains('is-closed')).toBe(true));

        toggle.click();
        await waitFor(() => {
            expect(collection.classList.contains('is-closed')).toBe(false);
            expect(collection.querySelector('.Tree-collectionItems')).not.toBeNull();
        });
    });
});

describe('the tree collapse control', () => {
    const treeOf = (container: HTMLElement) => container.querySelector('.Tree') as HTMLElement;

    it('collapses every collection in the tree at once', async () => {
        // The old theme had this in the Tree header and it was never rebuilt.
        // It cannot work with each collection owning its own open flag — nothing
        // outside a collection can close it — which is why the state is lifted.
        const { container } = await mount();
        await waitFor(() => expect(container.querySelector('.Tree-collection')).not.toBeNull());

        const tree = treeOf(container);
        // Something is open — the current item's branch — so the button offers
        // "collapse" and one click should close every collection.
        (tree.querySelector('.Tree-collapse') as HTMLElement).click();

        await waitFor(() => {
            const all = tree.querySelectorAll('.Tree-collection');
            const shut = tree.querySelectorAll('.Tree-collection.is-closed');
            expect(all.length).toBeGreaterThan(0);
            expect(shut).toHaveLength(all.length);
        });
    });

    it('expands them all again', async () => {
        const { container } = await mount();
        await waitFor(() => expect(container.querySelector('.Tree-collapse')).not.toBeNull());

        const tree = treeOf(container);
        (tree.querySelector('.Tree-collapse') as HTMLElement).click();
        await waitFor(() => expect(tree.querySelectorAll('.Tree-collection.is-closed').length).toBeGreaterThan(0));

        (tree.querySelector('.Tree-collapse') as HTMLElement).click();
        await waitFor(() => expect(tree.querySelectorAll('.Tree-collection.is-closed')).toHaveLength(0));
    });

    it('remembers collapsed collections across a reload', async () => {
        // sessionStorage, under the key the previous theme used, so tree
        // expansion survives a refresh as it did before.
        const first = await mount();
        await waitFor(() => expect(first.container.querySelector('.Tree-collectionLabel')).not.toBeNull());
        (first.container.querySelector('.Tree-collectionLabel') as HTMLElement).click();
        await waitFor(() => expect(first.container.querySelector('.Tree-collection.is-closed')).not.toBeNull());
        cleanup();

        const second = await mount();
        await waitFor(() => expect(second.container.querySelector('.Tree-collection.is-closed')).not.toBeNull());
    });
});

describe('icon buttons', () => {
    it('renders real svg icons, not text glyphs', async () => {
        // .Tree-collapse and .Search-clearButton set line-height: 0 and size an
        // svg child explicitly — they were written around inline SVG. A text
        // character in either gets a zero-height line box and renders
        // invisibly: the control is present, focusable and clickable, and looks
        // like it was never built.
        const { container } = await mount();
        await waitFor(() => expect(container.querySelector('.Tree-collapse')).not.toBeNull());

        for (const selector of ['.Tree-collapse', '.Header-navToggle', '.Search-clearButton']) {
            const button = container.querySelector(selector);
            if (!button) throw new Error(`${selector} is not rendered`);
            if (!button.querySelector('svg')) {
                throw new Error(`${selector} renders no svg — it would be invisible`);
            }
        }
    });
});

describe('opening a variant directly', () => {
    it('previews the variant the url names, not the default', async () => {
        // Both routes resolve to the same payload, so a Pen that picks the
        // default variant renders the same thing for every variant of a
        // component — which looks like the preview failing to update at all.
        window.history.pushState(null, '', '/components/detail/tabs--pill');
        const { container } = await mount();

        await waitFor(() =>
            expect(container.querySelector('.Preview-iframe')?.getAttribute('src')).toBe(
                '/components/preview/tabs--pill',
            ),
        );
    });

    it('updates when moving between two variants of the same component', async () => {
        window.history.pushState(null, '', '/components/detail/tabs--pill');
        const { container } = await mount();
        await waitFor(() =>
            expect(container.querySelector('.Preview-iframe')?.getAttribute('src')).toBe(
                '/components/preview/tabs--pill',
            ),
        );

        const link = [...container.querySelectorAll('.Tree-entityLink')].find(
            (a) => a.getAttribute('href') === '/components/detail/tabs--default',
        ) as HTMLElement;
        link.click();

        await waitFor(() =>
            expect(container.querySelector('.Preview-iframe')?.getAttribute('src')).toBe(
                '/components/preview/tabs--default',
            ),
        );
    });
});

describe('a collated component', () => {
    // `collated: true` means the component renders as one document with every
    // variant inside it. The build writes exactly that at the component's own
    // url — the Frame was previewing `<handle>--default` instead, so a collated
    // component showed one variant and offered a switcher for the rest.
    const openPanel = async (container: HTMLElement, name: string) => {
        await waitFor(() => expect(container.querySelector('.Browser-tabs')).not.toBeNull());
        (
            [...container.querySelectorAll('.Browser-tab a')].find(
                (a) => a.textContent?.toLowerCase() === name,
            ) as HTMLElement
        ).click();
    };

    beforeEach(() => {
        window.history.pushState(null, '', '/components/detail/grid');
    });

    it('previews the collated document, not one of its variants', async () => {
        const { container } = await mount();
        await waitFor(() => expect(container.querySelector('.Preview-iframe')).not.toBeNull());
        expect(container.querySelector('.Preview-iframe')?.getAttribute('src')).toBe('/components/preview/grid');
    });

    it('offers no variant switcher, since there is nothing to switch between', async () => {
        const { container } = await mount();
        await waitFor(() => expect(container.querySelector('.Pen-preview')).not.toBeNull());
        expect(container.querySelector('.Pen-variants')).toBeNull();
    });

    it('shows the collated markup in the HTML panel', async () => {
        const { container } = await mount();
        await openPanel(container, 'html');
        await waitFor(() =>
            expect(container.querySelector('.Browser-code pre')?.textContent).toContain('/components/render/grid'),
        );
        expect(container.querySelector('.Browser-code pre')?.textContent).not.toContain('grid--default');
    });

    it('shows every variant in the context panel, labelled', async () => {
        // One document containing all of them, so one variant's data would
        // describe half of what is rendered.
        const { container } = await mount();
        await openPanel(container, 'context');

        await waitFor(() => {
            const text = container.querySelector('.Browser-code pre')?.textContent ?? '';
            expect(text).toContain('/* Default */');
            expect(text).toContain('/* Wide */');
            expect(text).toContain('12');
            expect(text).toContain('16');
        });
    });

    it('concatenates the view panel when the variants do not share a view', async () => {
        const { container } = await mount();
        await openPanel(container, 'view');

        await waitFor(() => {
            const text = container.querySelector('.Browser-code pre')?.textContent ?? '';
            expect(text).toContain('<!-- Default -->');
            expect(text).toContain('<!-- Wide -->');
            expect(text).toContain('Grid--wide');
        });
    });

    it('shows a shared view once rather than repeating it per variant', async () => {
        // Variants usually differ by context alone, and four identical copies of
        // one template is not a listing of anything.
        const shared = '<div class="Grid">{{ columns }}</div>';
        payloads['/components/detail/grid.view.json'] = {
            contractVersion: 1,
            handle: 'grid',
            variants: [
                { handle: 'grid--default', content: shared, lang: 'html' },
                { handle: 'grid--wide', content: shared, lang: 'html' },
            ],
        };

        const { container } = await mount();
        await openPanel(container, 'view');

        await waitFor(() => {
            const text = container.querySelector('.Browser-code pre')?.textContent ?? '';
            expect(text).toContain('class="Grid"');
            expect(text).not.toContain('<!-- Default -->');
        });
    });

    it('still shows a single variant when the url names one', async () => {
        // How a variant of a collated component stays reachable: the component
        // route renders the collation, a variant route renders that variant —
        // the rule the template layer applied.
        window.history.pushState(null, '', '/components/detail/grid--wide');
        const { container } = await mount();
        await waitFor(() => expect(container.querySelector('.Preview-iframe')).not.toBeNull());
        expect(container.querySelector('.Preview-iframe')?.getAttribute('src')).toBe('/components/preview/grid--wide');

        await openPanel(container, 'context');
        await waitFor(() => {
            const text = container.querySelector('.Browser-code pre')?.textContent ?? '';
            expect(text).toContain('16');
            expect(text).not.toContain('/* Wide */');
        });
    });
});

describe('the panels follow the variant on screen', () => {
    // Not collation: an ordinary multi-variant component, where the switcher
    // changes what the Preview shows. The panels used to describe the first
    // variant whatever the switcher said.
    it('shows the selected variant in the context panel', async () => {
        payloads['/components/detail/button.context.json'] = {
            contractVersion: 1,
            handle: 'button',
            context: { text: 'Click me' },
            variants: [
                { handle: 'button--default', context: { text: 'Click me' } },
                { handle: 'button--primary', context: { text: 'Buy now' } },
            ],
        };

        const { container } = await mount();
        await waitFor(() => expect(screen.getByRole('button', { name: 'Primary' })).not.toBeNull());
        fireEvent.click(screen.getByRole('button', { name: 'Primary' }));

        await waitFor(() => expect(container.querySelector('.Browser-tabs')).not.toBeNull());
        (
            [...container.querySelectorAll('.Browser-tab a')].find(
                (a) => a.textContent?.toLowerCase() === 'context',
            ) as HTMLElement
        ).click();

        await waitFor(() => expect(container.querySelector('.Browser-code pre')?.textContent).toContain('Buy now'));
    });
});

describe('the resources panel', () => {
    const openResources = async (container: HTMLElement) => {
        await waitFor(() => expect(container.querySelector('.Browser-tabs')).not.toBeNull());
        (
            [...container.querySelectorAll('.Browser-tab a')].find(
                (a) => a.textContent?.toLowerCase() === 'resources',
            ) as HTMLElement
        ).click();
    };

    it("lists a component's files in a chooser, one file at a time", async () => {
        // The markup the inherited stylesheet expects: .FileBrowser with a select
        // and a single .FileBrowser-item.is-active.
        const { container } = await mount();
        await openResources(container);

        await waitFor(() => expect(container.querySelector('.FileBrowser-select')).not.toBeNull());
        const options = [...container.querySelectorAll('.FileBrowser-select option')].map((o) => o.textContent);
        expect(options).toEqual(['button.css', 'icon.svg']);
        expect(container.querySelectorAll('.FileBrowser-item.is-active')).toHaveLength(1);
    });

    it('shows a text file as highlighted source', async () => {
        const { container } = await mount();
        await openResources(container);

        await waitFor(() => {
            const code = container.querySelector('.FileBrowser-code pre');
            expect(code?.textContent).toContain('.Button');
            expect(code?.innerHTML).toContain('hljs-');
        });
    });

    it('reports the url, path and a readable size', async () => {
        const { container } = await mount();
        await openResources(container);

        await waitFor(() => expect(container.querySelector('.Meta-value')).not.toBeNull());
        const text = container.querySelector('.Browser-resources')?.textContent ?? '';
        expect(text).toContain('/components/raw/button/button.css');
        expect(text).toContain('forms/button/button.css');
        // Formatted, not a raw byte count — this was "812 bytes".
        expect(text).toContain('812 Bytes');

        const link = container.querySelector('.Browser-resources a');
        expect(link?.getAttribute('href')).toBe('/components/raw/button/button.css');
    });

    it('shows an image inline rather than as source', async () => {
        const { container } = await mount();
        await openResources(container);
        await waitFor(() => expect(container.querySelector('.FileBrowser-select')).not.toBeNull());

        fireEvent.change(container.querySelector('.FileBrowser-select') as HTMLSelectElement, {
            target: { value: '/components/raw/button/icon.svg' },
        });

        await waitFor(() => {
            const image = container.querySelector('.FileBrowser-itemPreview img');
            expect(image?.getAttribute('src')).toBe('/components/raw/button/icon.svg');
        });
    });

    it('says so when a file cannot be previewed', async () => {
        payloads['/components/detail/button.resources.json'] = {
            contractVersion: 1,
            handle: 'button',
            collections: [
                {
                    name: 'assets',
                    label: 'Assets',
                    files: [
                        {
                            name: 'button.woff2',
                            path: 'forms/button/button.woff2',
                            ext: '.woff2',
                            size: 12000,
                            url: '/components/raw/button/button.woff2',
                            lang: '',
                            content: null,
                        },
                    ],
                },
            ],
        };

        const { container } = await mount();
        await openResources(container);

        await waitFor(() =>
            expect(container.querySelector('.Browser-resources')?.textContent).toContain(
                'Previews are currently not available',
            ),
        );
        // Still linked and described, since the file is there to download.
        expect(container.querySelector('.Browser-resources')?.textContent).toContain('12 KB');
    });

    it('groups the chooser when a project configures more than one group', async () => {
        payloads['/components/detail/button.resources.json'] = {
            contractVersion: 1,
            handle: 'button',
            collections: [
                {
                    name: 'styles',
                    label: 'Styles',
                    files: [
                        {
                            name: 'button.css',
                            path: 'forms/button/button.css',
                            ext: '.css',
                            size: 10,
                            url: '/components/raw/button/button.css',
                            lang: 'css',
                            content: '.Button {}',
                        },
                    ],
                },
                {
                    name: 'scripts',
                    label: 'Scripts',
                    files: [
                        {
                            name: 'button.js',
                            path: 'forms/button/button.js',
                            ext: '.js',
                            size: 20,
                            url: '/components/raw/button/button.js',
                            lang: 'javascript',
                            content: 'export {}',
                        },
                    ],
                },
            ],
        };

        const { container } = await mount();
        await openResources(container);

        await waitFor(() =>
            expect(
                [...container.querySelectorAll('.FileBrowser-select optgroup')].map((g) => g.getAttribute('label')),
            ).toEqual(['Styles', 'Scripts']),
        );
    });

    it('offers no tab at all for a component with no files of its own', async () => {
        // As the template layer did: it emitted a tab per non-empty group, so a
        // component with none got none. An empty panel is worse than an absent one.
        window.history.pushState(null, '', '/components/detail/tabs');
        const { container } = await mount();
        await waitFor(() => expect(container.querySelector('.Browser-tabs')).not.toBeNull());

        const names = [...container.querySelectorAll('.Browser-tab a')].map((a) => a.textContent?.toLowerCase());
        expect(names).not.toContain('resources');
        // And the panel that opens is a real one, not a body with no tab.
        expect(container.querySelector('.Browser-panel.is-active')).not.toBeNull();
    });
});

describe('the preview loading bar', () => {
    // jsdom never loads an iframe's src, so a Preview here stays pending until a
    // load event is fired at it by hand — which is exactly the state the bar
    // exists for.
    const iframeOf = (container: HTMLElement) => container.querySelector('.Preview-iframe') as HTMLIFrameElement;

    it('appears on the iframe while it is still loading', async () => {
        const { container } = await mount();
        await waitFor(() => expect(iframeOf(container)).not.toBeNull());

        const bar = await waitFor(() => {
            const found = container.querySelector('.Preview-progress');
            expect(found).not.toBeNull();
            return found!;
        });

        // Inside the element the iframe is in, so it lands on the document's own
        // top edge rather than spanning the drag handle too.
        expect(bar.closest('.Preview-resizer')).not.toBeNull();
        expect(bar.getAttribute('role')).toBe('progressbar');
        // Indeterminate: a cross-document load reports no progress, and a
        // progressbar carrying a value would be claiming otherwise.
        expect(bar.getAttribute('aria-valuenow')).toBeNull();
        expect(container.querySelector('.Preview-resizer')?.getAttribute('aria-busy')).toBe('true');
    });

    it('goes away when the preview has loaded', async () => {
        const { container } = await mount();
        await waitFor(() => expect(container.querySelector('.Preview-progress')).not.toBeNull());

        fireEvent.load(iframeOf(container));

        await waitFor(() => expect(container.querySelector('.Preview-progress')).toBeNull());
        expect(container.querySelector('.Preview-resizer')?.getAttribute('aria-busy')).toBeNull();
    });

    it('stays away for a load fast enough not to need it', async () => {
        // Anything a local server answers in a few tens of milliseconds shows
        // nothing at all: a bar that appears and vanishes within one frame reads
        // as a glitch, not as progress.
        const { container } = await mount();
        await waitFor(() => expect(iframeOf(container)).not.toBeNull());

        fireEvent.load(iframeOf(container));

        await new Promise((resolve) => setTimeout(resolve, 300));
        expect(container.querySelector('.Preview-progress')).toBeNull();
    });

    it('comes back when a variant switch loads a different document', async () => {
        // The iframe's src changes without anything remounting, so a loading flag
        // that only reset on mount would report the first document forever.
        const { container } = await mount();
        await waitFor(() => expect(iframeOf(container)).not.toBeNull());
        fireEvent.load(iframeOf(container));
        await waitFor(() => expect(container.querySelector('.Preview-progress')).toBeNull());

        fireEvent.click(screen.getByRole('button', { name: 'Primary' }));

        await waitFor(() =>
            expect(iframeOf(container).getAttribute('src')).toBe('/components/preview/button--primary'),
        );
        await waitFor(() => expect(container.querySelector('.Preview-progress')).not.toBeNull());
    });
});

describe('resizing the preview', () => {
    // Awaited between steps: the window move/up listeners are attached by an
    // effect that runs after the pointerdown commits, so firing all three
    // synchronously misses the move entirely — the drag looks inert.
    const drag = async (handle: Element, from: number, to: number) => {
        fireEvent.pointerDown(handle, { clientX: from, pointerId: 1 });
        await waitFor(() => expect(document.querySelector('.Preview')?.className).toContain('is-resizing'));
        fireEvent.pointerMove(window, { clientX: to, pointerId: 1 });
        fireEvent.pointerUp(window, { clientX: to, pointerId: 1 });
    };

    it('renders the handle and overlay the stylesheet resizes with', async () => {
        const { container } = await mount();
        await waitFor(() => expect(container.querySelector('.Preview')).not.toBeNull());
        expect(container.querySelector('.Preview-handle')).not.toBeNull();
        expect(container.querySelector('.Preview-overlay')).not.toBeNull();
    });

    it('narrows the surface the handle is positioned against', async () => {
        // The wrapper, not the inner resizer. The handle sits at the wrapper's
        // inline end and the resizer is a percentage of it, so a width on the
        // inner element moves neither the handle nor the visible surface.
        const { container } = await mount();
        await waitFor(() => expect(container.querySelector('.Preview-handle')).not.toBeNull());

        const wrapper = container.querySelector('.Preview-wrapper') as HTMLElement;
        expect(wrapper.style.width).toBe('');

        await drag(container.querySelector('.Preview-handle')!, 800, 500);

        await waitFor(() => expect(wrapper.style.width).toMatch(/^\d+px$/));
        expect(container.querySelector('.Preview-resizer')?.getAttribute('style')).toBeNull();
    });

    it('cannot be dragged wider than the panel it sits in', async () => {
        // An inline width beats a stylesheet max-width, so the cap has to be
        // enforced during the drag — otherwise the preview runs off its panel.
        const { container } = await mount();
        await waitFor(() => expect(container.querySelector('.Preview-handle')).not.toBeNull());

        const wrapper = container.querySelector('.Preview-wrapper') as HTMLElement;
        const panel = wrapper.parentElement as HTMLElement;
        Object.defineProperty(panel, 'offsetWidth', { value: 600, configurable: true });

        await drag(container.querySelector('.Preview-handle')!, 100, 5000);

        await waitFor(() => {
            const width = parseInt(wrapper.style.width, 10);
            expect(width).toBeLessThanOrEqual(600 + 12);
        });
        expect(wrapper.style.maxWidth).toBe('');
    });

    it('cannot be dragged narrower than its minimum', async () => {
        const { container } = await mount();
        await waitFor(() => expect(container.querySelector('.Preview-handle')).not.toBeNull());

        const wrapper = container.querySelector('.Preview-wrapper') as HTMLElement;
        await drag(container.querySelector('.Preview-handle')!, 900, -5000);

        await waitFor(() => expect(parseInt(wrapper.style.width, 10)).toBeGreaterThanOrEqual(180));
    });

    it('masks the iframe while dragging, which otherwise swallows the pointer', async () => {
        const { container } = await mount();
        await waitFor(() => expect(container.querySelector('.Preview-handle')).not.toBeNull());

        const frame = container.querySelector('.Preview-iframe') as HTMLElement;
        fireEvent.pointerDown(container.querySelector('.Preview-handle')!, {
            clientX: 800,
            pointerId: 1,
        });

        await waitFor(() => expect(frame.style.pointerEvents).toBe('none'));
        expect(container.querySelector('.Preview')?.className).toContain('is-resizing');

        fireEvent.pointerUp(window, { clientX: 800, pointerId: 1 });
        await waitFor(() => expect(frame.style.pointerEvents).toBe(''));
    });

    it('restores full width on a double click, as before', async () => {
        const { container } = await mount();
        await waitFor(() => expect(container.querySelector('.Preview-handle')).not.toBeNull());

        const wrapper = container.querySelector('.Preview-wrapper') as HTMLElement;
        await drag(container.querySelector('.Preview-handle')!, 800, 400);
        await waitFor(() => expect(wrapper.style.width).toMatch(/^\d+px$/));

        fireEvent.doubleClick(container.querySelector('.Preview-handle')!);
        // No inline width at all, so the stylesheet's own sizing applies again.
        await waitFor(() => expect(wrapper.style.width).toBe(''));
    });

    it('reports the preview viewport size', async () => {
        const { container } = await mount();
        await waitFor(() => expect(container.querySelector('.Pen-preview-size')).not.toBeNull());

        const readout = container.querySelector('.Pen-preview-size') as HTMLElement;
        fireEvent.load(container.querySelector('.Preview-iframe')!);

        // jsdom gives an iframe a real contentWindow, so this exercises the same
        // path a browser does rather than the element fallback.
        await waitFor(() => expect(readout.textContent).toMatch(/^\d+ × \d+$/));
    });
});

describe('what the tree starts expanded', () => {
    const collectionNamed = (container: HTMLElement, label: string) =>
        [...container.querySelectorAll('.Tree-collection')].find(
            (li) => li.querySelector('.Tree-collectionLabel')?.textContent === label,
        ) as HTMLElement;

    it('collapses collections that do not contain the current item', async () => {
        // Current is `button`, inside Forms. Tabs is elsewhere in the tree.
        const { container } = await mount();
        await waitFor(() => expect(container.querySelector('.Tree-collection')).not.toBeNull());

        expect(collectionNamed(container, 'Tabs').classList.contains('is-closed')).toBe(true);
        expect(collectionNamed(container, 'Media').classList.contains('is-closed')).toBe(true);
    });

    it('opens the path to the current item, so a deep link shows where it is', async () => {
        const { container } = await mount();
        await waitFor(() => expect(container.querySelector('.Tree-collection')).not.toBeNull());

        const forms = collectionNamed(container, 'Forms');
        expect(forms.classList.contains('is-closed')).toBe(false);
        expect(forms.querySelector('.Tree-entity.is-current')).not.toBeNull();
    });

    it('reveals the new path when navigating elsewhere', async () => {
        window.history.pushState(null, '', '/components/detail/tabs--pill');
        const { container } = await mount();
        await waitFor(() => expect(container.querySelector('.Tree-collection')).not.toBeNull());

        // Tabs sits inside Forms, so both are on the path and both open. Media
        // is a sibling of Forms and stays closed.
        expect(collectionNamed(container, 'Tabs').classList.contains('is-closed')).toBe(false);
        expect(collectionNamed(container, 'Forms').classList.contains('is-closed')).toBe(false);
        expect(collectionNamed(container, 'Media').classList.contains('is-closed')).toBe(true);
    });

    it('lets an explicit choice override the default, in both directions', async () => {
        const { container } = await mount();
        await waitFor(() => expect(container.querySelector('.Tree-collection')).not.toBeNull());

        // Open one the default would have closed.
        const tabs = collectionNamed(container, 'Tabs');
        (tabs.querySelector('.Tree-collectionLabel') as HTMLElement).click();
        await waitFor(() => expect(tabs.classList.contains('is-closed')).toBe(false));

        // Close the one containing the current item.
        const forms = collectionNamed(container, 'Forms');
        (forms.querySelector('.Tree-collectionLabel') as HTMLElement).click();
        await waitFor(() => expect(forms.classList.contains('is-closed')).toBe(true));
    });

    it('still expands everything while searching', async () => {
        const { container } = await mount();
        await waitFor(() => expect(container.querySelector('.Search-input')).not.toBeNull());

        fireEvent.change(container.querySelector('.Search-input') as HTMLInputElement, {
            target: { value: 'pill' },
        });

        await waitFor(() => {
            const shown = container.querySelectorAll('.Tree-collection.is-closed');
            expect(shown).toHaveLength(0);
        });
    });
});

describe('opening the preview in its own window', () => {
    it('links the Pen title to the preview, targeted at a new window', async () => {
        const { container } = await mount();
        await waitFor(() => expect(container.querySelector('.Pen-previewLink')).not.toBeNull());

        const link = container.querySelector('.Pen-previewLink') as HTMLAnchorElement;
        expect(link.getAttribute('href')).toBe('/components/preview/button--default');
        expect(link.getAttribute('target')).toBe('_blank');
        // Without noopener the opened window can reach back through window.opener.
        expect(link.getAttribute('rel')).toContain('noopener');
        expect(link.querySelector('svg')).not.toBeNull();
    });

    it('points at the variant currently shown, not the default', async () => {
        window.history.pushState(null, '', '/components/detail/tabs--pill');
        const { container } = await mount();
        await waitFor(() => expect(container.querySelector('.Pen-previewLink')).not.toBeNull());

        expect(container.querySelector('.Pen-previewLink')?.getAttribute('href')).toBe(
            '/components/preview/tabs--pill',
        );
    });
});

describe('the search box', () => {
    it('sits inside the scrolling panel, ahead of the trees', async () => {
        // Structural precondition for the sticky rule: sticky positions against
        // the nearest scrolling ancestor, so the search has to live inside
        // .Navigation-panel rather than beside it. jsdom computes no layout, so
        // this asserts the containment the CSS depends on, not the stickiness.
        const { container } = await mount();
        await waitFor(() => expect(container.querySelector('.Search-input')).not.toBeNull());

        const panel = container.querySelector('.Navigation-panel--main') as HTMLElement;
        const search = panel.querySelector('.Navigation-search');
        expect(search).not.toBeNull();
        expect(panel.firstElementChild).toBe(search);
    });

    it('gains a shadow only once the panel has scrolled', async () => {
        // There is no `:stuck` selector, so the class is driven from the panel's
        // scroll position. Asserting the class rather than the shadow: jsdom
        // computes no layout, and the shadow itself lives in the stylesheet.
        const { container } = await mount();
        await waitFor(() => expect(container.querySelector('.Navigation-search')).not.toBeNull());

        const panel = container.querySelector('.Navigation-panel--main') as HTMLElement;
        const search = container.querySelector('.Navigation-search') as HTMLElement;
        expect(search.classList.contains('is-stuck')).toBe(false);

        panel.scrollTop = 120;
        fireEvent.scroll(panel);
        await waitFor(() => expect(search.classList.contains('is-stuck')).toBe(true));

        panel.scrollTop = 0;
        fireEvent.scroll(panel);
        await waitFor(() => expect(search.classList.contains('is-stuck')).toBe(false));
    });
});

describe('the HTML panel', () => {
    const openPanel = async (container: HTMLElement, name: string) => {
        await waitFor(() => expect(container.querySelector('.Browser-tabs')).not.toBeNull());
        const tab = [...container.querySelectorAll('.Browser-tab a')].find(
            (a) => a.textContent?.toLowerCase() === name,
        ) as HTMLElement;
        tab.click();
    };

    it('shows the component markup, highlighted and escaped', async () => {
        const { container } = await mount();
        await openPanel(container, 'html');

        await waitFor(() => {
            const pre = container.querySelector('.Browser-code pre') as HTMLElement;
            expect(pre.innerHTML).toContain('hljs-');
            // Rendered markup shown as source: the button must be text, not a
            // live element inside the panel.
            expect(pre.querySelector('button')).toBeNull();
            expect(pre.textContent).toContain('<button');
        });
    });

    it('follows the variant being previewed', async () => {
        window.history.pushState(null, '', '/components/detail/tabs--pill');
        const { container } = await mount();
        await openPanel(container, 'html');

        await waitFor(() => expect(container.querySelector('.Browser-code')).not.toBeNull());
        const calls = (globalThis.fetch as unknown as { mock: { calls: string[][] } }).mock.calls;
        expect(calls.some(([url]) => url === '/components/render/tabs--pill')).toBe(true);
    });
});

describe('the panels config', () => {
    const tabs = (container: HTMLElement) =>
        [...container.querySelectorAll('.Browser-tab a')].map((a) => a.textContent);

    it('shows the configured panels, in the configured order', async () => {
        window.frctl = { ...window.frctl!, panels: ['view', 'notes'] };
        const { container } = await mount();
        await waitFor(() => expect(container.querySelector('.Browser-tabs')).not.toBeNull());

        expect(tabs(container)).toEqual(['View', 'Notes']);
        // The first configured panel opens, not the first implemented one.
        expect(container.querySelector('.Browser-tab--view.is-active')).not.toBeNull();
    });

    it('drops names it has no panel for rather than rendering empty tabs', async () => {
        window.frctl = { ...window.frctl!, panels: ['notes', 'третий', 'info'] };
        const { container } = await mount();
        await waitFor(() => expect(container.querySelector('.Browser-tabs')).not.toBeNull());

        expect(tabs(container)).toEqual(['Notes', 'Info']);
    });

    it('falls back to every panel when the config names none of them', async () => {
        // A typo should not leave the Browser with no tabs at all.
        window.frctl = { ...window.frctl!, panels: ['nonsense'] };
        const { container } = await mount();
        await waitFor(() => expect(container.querySelector('.Browser-tabs')).not.toBeNull());

        expect(tabs(container)).toHaveLength(6);
    });

    it('ignores a remembered panel the config no longer lists', async () => {
        localStorage.setItem('browser.panel', JSON.stringify('context'));
        window.frctl = { ...window.frctl!, panels: ['notes', 'info'] };
        const { container } = await mount();
        await waitFor(() => expect(container.querySelector('.Browser-tabs')).not.toBeNull());

        expect(container.querySelector('.Browser-tab--notes.is-active')).not.toBeNull();
    });
});

describe('the urls a static build is browsed by', () => {
    // A static build writes `<route>.html` and nothing at the extensionless
    // path. The Frame resolves either spelling, so navigation looked fine and
    // then 404'd on the first reload or shared link.
    const staticMode = () => {
        window.frctl = { ...window.frctl!, env: 'static' };
    };

    it('links to the documents the build actually wrote', async () => {
        staticMode();
        // Opened at the nested page, which expands the collection holding it.
        window.history.pushState(null, '', '/docs/guide/getting-started.html');
        const { container } = await mount();
        await waitFor(() => expect(container.querySelector('.Navigation')).not.toBeNull());

        const links = await waitFor(() => {
            const found = [...container.querySelectorAll('.Tree-entityLink')].map((a) => a.getAttribute('href'));
            expect(found).toContain('/docs/guide/getting-started.html');
            return found;
        });
        expect(links).toContain('/docs/index.html');
        expect(links).not.toContain('/docs/guide/getting-started');
    });

    it('puts a reloadable url in the address bar when one is clicked', async () => {
        staticMode();
        const { container } = await mount();
        await waitFor(() => expect(screen.getByText('Field')).not.toBeNull());

        expect([...container.querySelectorAll('.Tree-entityLink')].map((a) => a.getAttribute('href'))).toContain(
            '/components/detail/button.html',
        );

        fireEvent.click(screen.getByText('Field'));

        await waitFor(() => expect(window.location.pathname).toBe('/components/detail/field.html'));
        // And the Frame still resolves it: the payload url is derived by
        // stripping the extension, not by knowing which mode this is.
        expect(container.querySelector('.Preview-iframe')?.getAttribute('src')).toBe('/components/preview/field.html');
    });

    it('leaves the urls extensionless for the dev server', async () => {
        const { container } = await mount();
        await waitFor(() => expect(container.querySelector('.Navigation')).not.toBeNull());

        const links = [...container.querySelectorAll('.Tree-entityLink')].map((a) => a.getAttribute('href'));
        expect(links).toContain('/components/detail/button');
        expect(links.some((href) => href?.endsWith('.html'))).toBe(false);
    });
});
