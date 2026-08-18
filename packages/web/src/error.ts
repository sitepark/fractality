/**
 * An error carrying an HTTP status, so a route can fail with a meaningful
 * response rather than a bare 500.
 */
export default class WebError extends Error {
    readonly status: number;

    constructor(message: string, status = 500) {
        super(message);
        this.name = 'WebError';
        this.status = status;
    }
}
