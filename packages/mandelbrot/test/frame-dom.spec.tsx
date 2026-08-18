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

const tabsEntity: EntityPayload = {
    contractVersion: 1,
    handle: 'tabs',
    label: 'Tabs',
    title: 'Tabs',
    viewPath: 'nav/tabs/tabs.hbs',
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
        },
        {
            handle: 'tabs--pill',
            label: 'Pill',
            name: 'pill',
            isDefault: false,
            previewUrl: '/components/preview/tabs--pill',
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
