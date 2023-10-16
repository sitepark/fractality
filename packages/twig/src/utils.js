'use strict';

export default {
    isHandle(str, handlePrefix) {
        return str && str.startsWith(handlePrefix);
    },
    replaceHandlePrefix(handle, handlePrefix) {
        let prefixMatcher = new RegExp(`^\\${handlePrefix}`);

        return handle.replace(prefixMatcher, '@');
    },
};
