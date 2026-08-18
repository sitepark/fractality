import { marked } from 'marked';

/**
 * Renders Markdown in the browser.
 *
 * The payload carries source rather than rendered HTML, so this is the Frame's
 * job. Doing it here also keeps a single highlighting path: `@fractality/core`'s
 * markdown() highlights fenced code as it renders, so rendering at build time
 * would have highlighted doc code blocks server-side while the View panel
 * highlighted client-side.
 *
 * Configured `async: false` so it returns a string rather than a promise — the
 * content is already in memory and there is nothing to await.
 */
marked.use({ async: false, gfm: true, breaks: false });

export const renderMarkdown = (source: string): string => marked.parse(source) as string;
