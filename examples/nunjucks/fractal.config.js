'use strict';

import create from '@fractality/fractality';
import mandelbrot from '@fractality/mandelbrot';
import nunjucks from '@fractality/nunjucks';
import path from 'path';
import { URL, fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

/*
 * Require the Fractality module
 */
const fractality = create();

/*
 * Give your project a title.
 */
fractality.set('project.title', 'Fractality Nunjucks example');

/*
 * Tell Fractality where to look for components.
 */
fractality.components.set('path', path.join(__dirname, 'components'));
fractality.components.set('ext', '.njk');
fractality.components.engine(nunjucks);

/*
 * Tell Fractality where to look for documentation pages.
 */
fractality.docs.set('path', path.join(__dirname, 'docs'));
fractality.docs.engine(nunjucks);

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
