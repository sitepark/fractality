'use strict';

import { Marked } from 'marked';
import { markedSmartypants } from 'marked-smartypants';
import _ from 'lodash';
import markedHighlight from './highlight.js';
import toc from './toc.js';

// A dedicated instance keeps our extensions out of the global `marked` used by other code in the process.
const marked = new Marked(markedSmartypants(), markedHighlight());

/*
 * Export the markdown parser.
 */

const markdown = function markdown(content, mdConfig) {
    mdConfig = mdConfig && _.isObject(mdConfig) ? mdConfig : {};

    return marked.parse(_.toString(content), mdConfig);
};

// Deprecated, see ./toc.js
markdown.toc = function (content, maxDepth) {
    return toc(marked.lexer(_.toString(content)), maxDepth);
};

export default markdown;
