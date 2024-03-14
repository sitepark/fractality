'use strict';

import create from '@fractality/fractality';
import mandelbrot from '@fractality/mandelbrot';
import path from 'path';
import { URL, fileURLToPath } from 'url';
import createReactAdapter from '@fractality/react';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const fractal = create();
const reactAdapter = createReactAdapter({
    wrapperElements: [
        {
            component: '@wrapper-provider',
            props: {
                getValue: (value) => `wrapped ${value}`,
            },
        },
    ],
});

/*
 * Give your project a title.
 */
fractal.set('project.title', 'Fractality React example');

/*
 * Tell Fractality where to look for components.
 */
fractal.components.set('path', path.join(__dirname, 'components'));
fractal.components.set('ext', '.jsx');
fractal.components.engine(reactAdapter);
fractal.components.set('default.context.foo', 'bar');

/*
 * Tell the Fractality web preview plugin where to look for static assets.
 */
fractal.web.set('static.path', path.join(__dirname, 'public'));

/*
 * Tell the Fractality where to output the build files.
 */
fractal.web.set('builder.dest', path.join(__dirname, 'dist'));

/*
 * Customize Mandelbrot
 */
const customTheme = mandelbrot({
    // See https://fractal.build/guide/web/default-theme.html#configuration
});

fractal.web.theme(customTheme);

export default fractal;
