import fetch from "node-fetch";

const response = fetch('https://xkcd.com/149/info.0.json').then((response) => response.json());

export default {
    context: {
        xkcd: response,
    },
};
