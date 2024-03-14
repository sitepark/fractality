'use strict';

/*
 * Require the path module
 */
import path from 'path';
import mandelbrot from '@fractality/mandelbrot';
import create from '@fractality/fractality';
import { URL, fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

/*
 * Require the Fractality module
 */
const fractality = create();

/*
 * Give your project a title.
 */
fractality.set('project.title', 'Fractality Handlebars example');

/*
 * Tell Fractality where to look for components.
 */
fractality.components.set('path', path.join(__dirname, 'components'));

/*
 * Tell Fractality where to look for documentation pages.
 */
fractality.docs.set('path', path.join(__dirname, 'docs'));

/*
 * Tell the Fractality web preview plugin where to look for static assets.
 */
fractality.web.set('static.path', path.join(__dirname, 'public'));

/*
 * Tell the Fractality where to output the build files.
 */
fractality.web.set('builder.dest', path.join(__dirname, 'dist'));

/*
 * Customize Mandelbrot
 */
const customTheme = mandelbrot({
    // See https://fractal.build/guide/web/default-theme.html#configuration
});

fractality.web.theme(customTheme);

export default fractality;
