// @vitest-environment jsdom
//
// jsdom rather than happy-dom: the Frame renders a Preview iframe, and happy-dom
// attempts to load its src — either over the network, or loudly refusing to —
// which buries real failures in stack traces. jsdom leaves subresources alone.
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import type { EntityPayload, TreePayload } from '@fractality/web/contract';

const tree: TreePayload = {
    contractVersion: 1,
    status: { 'components:ready': { label: 'Ready', color: '#29CC29' } },
    components: [
        {
            handle: 'forms',
            label: 'Forms',
            isCollection: true,
            children: [{ handle: 'button', label: 'Button', status: 'components:ready' }],
        },
    ],
    docs: [],
    assets: [],
};

const entity: EntityPayload = {
    contractVersion: 1,
    handle: 'button',
    label: 'Button',
    title: 'Button',
    status: 'components:ready',
    viewPath: 'forms/button/button.hbs',
    references: [],
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
    '/components/detail/button.notes.json': {
        contractVersion: 1,
        handle: 'button',
        notes: 'Some notes.',
        variants: [],
    },
};

beforeEach(() => {
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
    return render(<App />);
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
