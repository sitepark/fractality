'use strict';

import { Marked } from 'marked';
import { markedSmartypants } from 'marked-smartypants';
import _ from 'lodash';
import markedHighlight from './highlight.js';

// A dedicated instance keeps our extensions out of the global `marked` used by other code in the process.
const marked = new Marked(markedSmartypants(), markedHighlight());

/*
 * Export the markdown parser.
 */

const markdown = function markdown(content, mdConfig) {
    mdConfig = mdConfig && _.isObject(mdConfig) ? mdConfig : {};

    return marked.parse(_.toString(content), mdConfig);
};

// TODO: remove if noone understands what this is for
markdown.toc = function (content, maxDepth) {
    maxDepth = maxDepth || 6;

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
