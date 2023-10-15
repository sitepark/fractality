'use strict';

import HighlightJs from "highlight.js";
import _ from "lodash";

export default function highlighter(content, lang) {
    content = _.toString(content || '');
    lang = lang ? lang.toLowerCase() : lang;
    try {
        return lang
            ? HighlightJs.highlight(content, { language: lang }).value
            : HighlightJs.highlightAuto(content).value;
    } catch (e) {
        return HighlightJs.highlightAuto(content).value;
    }
};
