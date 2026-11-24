export default function () {
    return {
        name: 'dump',
        value(obj, preformat) {
            preformat = preformat !== false;
            const output = JSON.stringify(obj, null, 4);
            return preformat ? `<pre>${output}</pre>` : output;
        },
    };
}
