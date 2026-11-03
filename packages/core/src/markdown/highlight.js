'use strict';

import highlighter from '../highlighter.js';

/*
 * Highlight fenced code blocks with highlight.js
 */

export default function markedHighlight() {
    return {
        renderer: {
            code(ctx) {
                const lang = ctx.lang;
                const output = highlighter(ctx.text, lang) ?? ctx.text;
                if (!lang) {
                    return `<pre><code class="hljs">${output}</code></pre>`;
                }
                return `<pre><code class="hljs language-${escape(lang, true)}">${output}</code></pre>`;
            },
        },
    };
}
