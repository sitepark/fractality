'use strict';
import hljs from 'highlight.js';
import _ from 'lodash';

export default function highlighter(content, lang) {
    content = _.toString(content || '');
    lang = lang ? lang.toLowerCase() : lang;
    try {
        return lang ? hljs.highlight(content, { language: lang }).value : hljs.highlightAuto(content).value;
    } catch (e) {
        return hljs.highlightAuto(content).value;
    }
}
