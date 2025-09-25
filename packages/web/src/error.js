'use strict';

export default class WebError extends Error {
    constructor(statusCode, message) {
        statusCode = statusCode || 500;
        message = message || `${statusCode} error`;
        super(message);
        this.name = 'Web Error';
        this.status = statusCode;
        this.code = statusCode;
        this.message = message;
        if (typeof Error.captureStackTrace === 'function') {
            Error.captureStackTrace(this, this.constructor);
        } else {
            this.stack = new Error(message).stack;
        }
    }
}
