export default function () {
    return {
        name: 'async',
        async: true,
        filter(...args) {
            const cb = args.pop();
            if (!args[1]) {
                Promise.resolve(args[0])
                    .then((result) => cb(null, result))
                    .catch(cb);
            } else {
                Promise.resolve(args[0])
                    .then((result) => cb(null, result))
                    .catch((e) => {
                        cb(null, e);
                        return e;
                    });
            }
        },
    };
}
