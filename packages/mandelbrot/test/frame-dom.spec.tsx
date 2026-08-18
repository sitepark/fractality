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
            ],
        },
    ],
    docs: [{ handle: 'index', label: 'Overview' }],
    assets: [],
};

const entity: EntityPayload = {
    contractVersion: 1,
    handle: 'button',
    label: 'Button',
    title: 'Button',
    status: 'components:ready',
    viewPath: 'forms/button/button.hbs',
    references: ['icon'],
    referencedBy: [],
    resources: [],
    variants: [
        {
            handle: 'button--default',
            label: 'Default',
            name: 'default',
            isDefault: true,
            previewUrl: '/components/preview/button--default',
        },
        {
            handle: 'button--primary',
            label: 'Primary',
            name: 'primary',
            isDefault: false,
            previewUrl: '/components/preview/button--primary',
        },
    ],
};

const payloads: Record<string, unknown> = {
    '/tree.json': tree,
    '/components/detail/button.json': entity,
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
            },
        ],
    },
    '/components/detail/field.notes.json': {
        contractVersion: 1,
        handle: 'field',
        notes: null,
        variants: [],
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

beforeEach(() => {
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
        labels: { panels: { notes: 'Notes', context: 'Context' } },
    };
    window.history.pushState(null, '', '/components/detail/button');

    vi.stubGlobal(
        'fetch',
        vi.fn((url: string) => {
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
        await mount();
        await waitFor(() => expect(screen.getByText('Primary')).toBeTruthy());
        expect(screen.getByText('Default')).toBeTruthy();
    });

    it('labels browser tabs from theme config', async () => {
        const { container } = await mount();
        await waitFor(() => expect(container.querySelector('.Browser-tabs')).not.toBeNull());
        expect(container.querySelector('.Browser-tab--notes.is-active')).not.toBeNull();
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
        expect(tree.querySelectorAll('.Tree-collection.is-closed')).toHaveLength(0);

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
