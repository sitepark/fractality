'use strict';

/*
 * Deprecated, only used by the deprecated doc.toc(). Remove together with it in the next major version.
 */

export default function toc(tokens, maxDepth) {
    maxDepth = maxDepth || 6;

    return tokens
        .filter((token) => {
            return token.type === 'heading' && token.depth <= maxDepth;
        })
        .map((token) => {
            token.id = token.text.toLowerCase().replace(/[^\w]+/g, '-');
            return token;
        });
}
