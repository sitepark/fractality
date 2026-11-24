import config from './config.js';

export default {
    debounce(func, wait, immediate) {
        var timeout;
        return function (...args) {
            var later = () => {
                timeout = null;
                if (!immediate) func.apply(this, args);
            };
            var callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func.apply(this, args);
        };
    },

    isSmallScreen() {
        return $(document).width() < config.breakpoints.navCollapse;
    },
};
