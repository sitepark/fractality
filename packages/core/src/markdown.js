'use strict';

import { marked } from "marked";
import { markedSmartypants } from "marked-smartypants";
import _ from "lodash";
import highlighter from "./highlighter.js";

marked.use(markedSmartypants());
const renderer = new marked.Renderer();

renderer.code = function (code, lang) {
    const output = highlighter(code, lang);
    if (output != null) {
        code = output;
    }
    if (!lang) {
        return `<pre><code class="hljs">${code}</code></pre>`;
    }
    return `<pre><code class="hljs ${this.options.langPrefix}${escape(lang, true)}">${code}</code></pre>`;
};

/*
 * Export the markdown parser.
 */

const markdown = function markdown(content, mdConfig) {
    mdConfig = _.cloneDeep(mdConfig && _.isObject(mdConfig) ? mdConfig : {});
    mdConfig.renderer = renderer;

    return marked(_.toString(content), mdConfig);
};

// TODO: remove if noone understands what this is for
markdown.toc = function (content, maxDepth, mdConfig) {
    maxDepth = maxDepth || 6;
    mdConfig = mdConfig && _.isObject(mdConfig) ? mdConfig : {};
    mdConfig.renderer = renderer;

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
