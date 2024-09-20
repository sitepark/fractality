import { render } from '@fractality/adapter-tests';

import fractality from '../../fractal.config.js';
import fractalityReact from '@fractality/react';

describe('render', () => {
    beforeEach(async () => {
        await fractality.load();
    });

    render(fractality);

    it('renders empty string if ssr is turned off', async () => {
        fractality.components.engine(fractalityReact({ ssr: false }));
        const render = await fractality.components.find('@render').render();
        expect(render).toEqual('');
    });

    it('renders component if ssr is turned off but enabled in component meta', async () => {
        fractality.components.engine(fractalityReact({ ssr: false }));
        const render = await fractality.components.find('@render').render(undefined, { ssr: true });
        expect(render).toMatchSnapshot();
    });

    it('renders component with renderToStaticMarkup method', async () => {
        fractality.components.engine(fractalityReact({ renderMethod: 'renderToStaticMarkuo' }));
        const render = await fractality.components.find('@render').render();
        expect(render).toMatchSnapshot();
    });

    it('renders component using ES6 import/export syntax', async () => {
        const render = await fractality.components.find('@render--es6-import-export').render();
        expect(render).toMatchSnapshot();
    });

    it('renders with preview layout', async () => {
        const render = await fractality.components.find('@render').render(undefined, undefined, { preview: true });
        expect(render).toMatch(new RegExp('^<!DOCTYPE html>?'));
        expect(render).toMatchSnapshot();
    });
});
