'use strict';

import { Marked, Renderer } from 'marked';
import { markedSmartypants } from 'marked-smartypants';
import _ from 'lodash';
import markedHighlight from './highlight.js';
import toc from './toc.js';

// A dedicated instance keeps our extensions out of the global `marked` used by other code in the process.
const marked = new Marked(markedSmartypants(), markedHighlight());

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
    const renderer = new Renderer();
    const slugger = new Slugger();

    renderer.heading = function ({ tokens, depth }) {
        const id = slugger.slug(unescape(this.parser.parseInline(tokens, this.parser.textRenderer)));
        return `<h${depth} id="${id}">${this.parser.parseInline(tokens)}</h${depth}>\n`;
    };
    renderer.code = markedHighlight().renderer.code;

    return renderer;
}

/*
 * Export the markdown parser.
 */

const markdown = function markdown(content, mdConfig) {
    mdConfig = mdConfig && _.isObject(mdConfig) ? mdConfig : {};

    return marked.parse(_.toString(content), { ...mdConfig, renderer: createRenderer() });
};

// Deprecated, see ./toc.js
markdown.toc = function (content, maxDepth) {
    return toc(marked.lexer(_.toString(content)), maxDepth);
};

export default markdown;
