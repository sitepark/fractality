'use strict';

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

export default function markedHeadingIds() {
    // marked creates a new Parser per document and renders synchronously even with async: true,
    // so the parser identifies the current render.
    const sluggers = new WeakMap();

    return {
        renderer: {
            heading({ tokens, depth }) {
                let slugger = sluggers.get(this.parser);
                if (!slugger) {
                    slugger = new Slugger();
                    sluggers.set(this.parser, slugger);
                }
                const id = slugger.slug(unescape(this.parser.parseInline(tokens, this.parser.textRenderer)));
                return `<h${depth} id="${id}">${this.parser.parseInline(tokens)}</h${depth}>\n`;
            },
        },
    };
}
