'use strict';

import { marked } from 'marked';
import { markedSmartypants } from 'marked-smartypants';
import _ from 'lodash';
import highlighter from './highlighter.js';

marked.use(markedSmartypants());

/*
 * Slugify headings and add slug as id
 */

// Slugger and unescape are adapted from marked 2.1.3 (MIT, Copyright (c) 2011-2018 Christopher Jeffrey,
// 2018+ MarkedJS): https://github.com/markedjs/marked/blob/v2.1.3/LICENSE.md

class Slugger {
    constructor() {
        this.seen = {};
    }

    slug(value) {
        const originalSlug = value
            .toLowerCase()
            .trim()
            .replace(/<[!/a-z].*?>/gi, '')
            .replace(/[\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,./:;<=>?@[\]^`{|}~]/g, '')
            .replace(/\s/g, '-');
        let slug = originalSlug;
        let count = 0;
        if (Object.hasOwn(this.seen, originalSlug)) {
            count = this.seen[originalSlug];
            do {
                count++;
                slug = `${originalSlug}-${count}`;
            } while (Object.hasOwn(this.seen, slug));
        }
        this.seen[originalSlug] = count;
        this.seen[slug] = 0;
        return slug;
    }
}

function unescape(html) {
    return html.replace(/&(#(?:\d+)|(?:#x[0-9A-Fa-f]+)|(?:\w+));?/gi, (_, n) => {
        n = n.toLowerCase();
        if (n === 'colon') {
            return ':';
        }
        if (n.charAt(0) === '#') {
            return n.charAt(1) === 'x'
                ? String.fromCharCode(parseInt(n.substring(2), 16))
                : String.fromCharCode(+n.substring(1));
        }
        return '';
    });
}

// A fresh renderer per render keeps duplicate-id tracking isolated when renders overlap (e.g. async: true).
function createRenderer() {
    const renderer = new marked.Renderer();
    const slugger = new Slugger();

    renderer.heading = function ({ tokens, depth }) {
        const id = slugger.slug(unescape(this.parser.parseInline(tokens, this.parser.textRenderer)));
        return `<h${depth} id="${id}">${this.parser.parseInline(tokens)}</h${depth}>\n`;
    };

    renderer.code = function (ctx) {
        const lang = ctx.lang;
        const output = highlighter(ctx.text, lang) ?? ctx.text;
        if (!lang) {
            return `<pre><code class="hljs">${output}</code></pre>`;
        }
        return `<pre><code class="hljs language-${escape(lang, true)}">${output}</code></pre>`;
    };

    return renderer;
}

/*
 * Export the markdown parser.
 */

const markdown = function markdown(content, mdConfig) {
    mdConfig = _.cloneDeep(mdConfig && _.isObject(mdConfig) ? mdConfig : {});
    mdConfig.renderer = createRenderer();

    return marked(_.toString(content), mdConfig);
};

// TODO: remove if noone understands what this is for
markdown.toc = function (content, maxDepth, mdConfig) {
    maxDepth = maxDepth || 6;
    mdConfig = mdConfig && _.isObject(mdConfig) ? mdConfig : {};
    mdConfig.renderer = createRenderer();

    const tokens = marked.lexer(_.toString(content));

    return tokens
        .filter((token) => {
            return token.type === 'heading' && token.depth <= maxDepth;
        })
        .map((token) => {
            token.id = token.text.toLowerCase().replace(/[^\w]+/g, '-');
            return token;
        });
};

export default markdown;
