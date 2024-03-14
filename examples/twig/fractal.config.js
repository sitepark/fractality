'use strict';

/*
 * Require the path module
 */
import path from 'path';
import mandelbrot from '@fractality/mandelbrot';
import { create } from '@fractality/fractality';
import twigEngine from '@fractality/twig';
import { URL, fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

/*
 * Require the Fractality module
 */
const fractal = create();

/*
 * Give your project a title.
 */
fractal.set('project.title', 'Fractality Twig example');

/*
 * Tell Fractality where to look for components.
 */
fractal.components.set('path', path.join(__dirname, 'components'));
fractal.components.set('ext', '.twig');
fractal.components.engine(twigEngine);

/*
 * Tell Fractality where to look for documentation pages.
 */
fractal.docs.set('path', path.join(__dirname, 'docs'));
fractal.docs.engine(twigEngine);

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
