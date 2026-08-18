import type { HLJSApi } from 'highlight.js';

/**
 * Languages the Frame can highlight.
 *
 * Deliberately a curated list rather than highlight.js's full build. Highlighting
 * used to happen server-side in `@fractality/core`, where the library's size cost
 * nothing; doing it in the browser puts it on every user who opens a code panel,
 * and the full build is ~307 KB gzipped — larger than the rest of the Frame
 * several times over.
 *
 * These cover the template languages Fractality ships adapters for, plus what
 * component source and configuration are actually written in. Anything else
 * renders as escaped plain text, which is a legible panel rather than a failure.
 */
const LANGUAGES = {
    xml: () => import('highlight.js/lib/languages/xml'),
    handlebars: () => import('highlight.js/lib/languages/handlebars'),
    twig: () => import('highlight.js/lib/languages/twig'),
    django: () => import('highlight.js/lib/languages/django'),
    javascript: () => import('highlight.js/lib/languages/javascript'),
    typescript: () => import('highlight.js/lib/languages/typescript'),
    json: () => import('highlight.js/lib/languages/json'),
    yaml: () => import('highlight.js/lib/languages/yaml'),
    css: () => import('highlight.js/lib/languages/css'),
    scss: () => import('highlight.js/lib/languages/scss'),
    less: () => import('highlight.js/lib/languages/less'),
    markdown: () => import('highlight.js/lib/languages/markdown'),
    php: () => import('highlight.js/lib/languages/php'),
} as const;

/** What a component's `lang` may be called versus what highlight.js calls it. */
const ALIASES: Record<string, keyof typeof LANGUAGES> = {
    html: 'xml',
    htm: 'xml',
    vue: 'xml',
    svg: 'xml',
    hbs: 'handlebars',
    mustache: 'handlebars',
    nunjucks: 'django',
    nunj: 'django',
    jinja: 'django',
    njk: 'django',
    js: 'javascript',
    jsx: 'javascript',
    mjs: 'javascript',
    cjs: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    yml: 'yaml',
    md: 'markdown',
};

let loading: Promise<HLJSApi> | null = null;

/**
 * Loads highlight.js and its languages on first use.
 *
 * A dynamic import, so none of this is in the initial chunk: highlighting is
 * only ever needed once a code panel is opened.
 */
const hljs = async (): Promise<HLJSApi> => {
    loading ??= (async () => {
        const { default: core } = await import('highlight.js/lib/core');
        await Promise.all(
            Object.entries(LANGUAGES).map(async ([name, load]) => {
                const { default: language } = await load();
                core.registerLanguage(name, language);
            }),
        );
        return core;
    })();
    return loading;
};

const escapeHtml = (value: string): string => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Highlights source, then turns `@handle` references into links.
 *
 * Order matters and is not incidental: `linkRefs` consumed `highlight`'s output
 * in the template layer too. Running it first would mean the highlighter saw
 * anchor tags as source and escaped them.
 *
 * Carries the same limitation the template version had — a reference split
 * across two highlight spans is not matched. It is a link that fails to appear,
 * never broken markup.
 */
export async function highlight(source: string, language: string, references: string[] = []): Promise<string> {
    const api = await hljs();
    const name = ALIASES[language?.toLowerCase()] ?? language?.toLowerCase();

    const marked = name && api.getLanguage(name) ? api.highlight(source, { language: name }).value : escapeHtml(source);

    if (!references.length) return marked;

    const pattern = new RegExp(
        `(${references.map((handle) => `@${handle}`.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`,
        'g',
    );

    return marked.replace(pattern, (handle) => `<a href="/components/detail/${handle.slice(1)}">${handle}</a>`);
}
