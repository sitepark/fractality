import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { create } from '../../fractality/src/fractal.js';
import { builderRenderEnv, serverRenderEnv } from '../src/render-env.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const example = path.join(__dirname, '..', '..', '..', 'examples', 'handlebars');

describe('serverRenderEnv', () => {
    it('says server, not builder', () => {
        const env = serverRenderEnv({ path: '/components/preview/button' });
        expect(env.server).toBe(true);
        expect(env.builder).toBe(false);
    });

    it('describes the document being rendered', () => {
        const env = serverRenderEnv({
            path: '/components/preview/button',
            url: '/components/preview/button?x=1',
            params: { handle: 'button' },
        });

        expect(env.request).toEqual({
            path: '/components/preview/button',
            url: '/components/preview/button?x=1',
            segments: ['components', 'preview', 'button'],
            params: { handle: 'button' },
            query: {},
            headers: {},
        });
    });
});

describe('builderRenderEnv', () => {
    it('says builder, not server', () => {
        const env = builderRenderEnv('/components/preview/button');
        expect(env.builder).toBe(true);
        expect(env.server).toBe(false);
    });

    it('answers everything a request would, with nothing invented', () => {
        // There is no request in a build. The fields that still mean something
        // describe the document; the rest are empty rather than missing, so a
        // template reading them behaves the same in both modes.
        const env = builderRenderEnv('/components/render/button', { handle: 'button' });

        expect(env.request).toEqual({
            path: '/components/render/button',
            url: '/components/render/button',
            segments: ['components', 'render', 'button'],
            params: { handle: 'button' },
            query: {},
            headers: {},
        });
    });
});

describe('_env, as a pattern sees it', () => {
    // Rendered through the real adapter rather than asserted on the object: the
    // env only matters because `{{#if _env.server}}` and the `path` helper read
    // it out of the render context, and nothing between here and there is typed.
    let source: { renderString(str: string, context: unknown, env: unknown): Promise<string> };

    beforeAll(async () => {
        const app = create() as unknown as {
            components: { set(key: string, value: unknown): void } & typeof source;
            load(): Promise<unknown>;
        };
        app.components.set('path', path.join(example, 'components'));
        await app.load();
        source = app.components;
    }, 30000);

    const template = '{{#if _env.server}}server{{/if}}{{#if _env.builder}}builder{{/if}}';

    it('is visible to a pattern in the dev server', async () => {
        expect(await source.renderString(template, {}, serverRenderEnv({ path: '/components/preview/x' }))).toBe(
            'server',
        );
    });

    it('is visible to a pattern in a build', async () => {
        expect(await source.renderString(template, {}, builderRenderEnv('/components/preview/x'))).toBe('builder');
    });
});
