export default {
    isHandle(str, handlePrefix) {
        return str?.startsWith(handlePrefix);
    },
    replaceHandlePrefix(handle, handlePrefix) {
        const prefixMatcher = new RegExp(`^\\${handlePrefix}`);

        return handle.replace(prefixMatcher, '@');
    },
};
