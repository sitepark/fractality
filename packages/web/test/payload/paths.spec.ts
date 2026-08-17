import { extPanel, payloadPathFor } from '../../src/payload/paths.js';

describe('payloadPathFor', () => {
    it('derives the same payload path from both modes of a route', () => {
        // The whole point of the rule: dev serves the extensionless form, the
        // static build emits .html, and neither the client nor the server has to
        // know which one it is looking at.
        expect(payloadPathFor('/components/detail/button')).toBe('/components/detail/button.json');
        expect(payloadPathFor('/components/detail/button.html')).toBe('/components/detail/button.json');
    });

    it('appends the panel segment', () => {
        expect(payloadPathFor('/components/detail/button.html', 'notes')).toBe('/components/detail/button.notes.json');
        expect(payloadPathFor('/components/detail/button', 'view')).toBe('/components/detail/button.view.json');
    });

    it('namespaces theme panels through the ext slot', () => {
        expect(payloadPathFor('/components/detail/button', extPanel('mandelbrot', 'coverage'))).toBe(
            '/components/detail/button.ext.mandelbrot.coverage.json',
        );
    });

    it('does not carry a query or fragment into the payload path', () => {
        expect(payloadPathFor('/components/detail/button.html?x=1')).toBe('/components/detail/button.json');
        expect(payloadPathFor('/components/detail/button#notes')).toBe('/components/detail/button.json');
    });

    it('ignores a trailing slash but leaves the root alone', () => {
        expect(payloadPathFor('/components/detail/button/')).toBe('/components/detail/button.json');
        expect(payloadPathFor('/')).toBe('/.json');
    });

    it('only strips .html, not other extensions', () => {
        expect(payloadPathFor('/assets/thing.css')).toBe('/assets/thing.css.json');
    });
});
