export default {
    get: vi.fn((key) => {
        if (key === 'foo') {
            return {
                statuses: {
                    wip: 'wip',
                    ready: 'ready',
                },
                default: {
                    status: 'wip',
                },
                path: './fooPath',
                engine: {
                    register: () => {
                        return {
                            foo: 'bar',
                            load: vi.fn(),
                        };
                    },
                },
            };
        }
    }),
};
