/**
 * Ambient types for `@fractality/core`, which is JavaScript and ships no
 * declarations.
 *
 * This is the same seam as `payload/source-types.ts`: it describes what
 * `@fractality/web` *uses*, not what core guarantees, and nothing checks that
 * the two still agree. Kept deliberately narrow — the `mixwith` class-factory
 * layer underneath does not type without heavy generics, which is exactly why
 * ADR 0006 stops the type boundary before it.
 */
declare module '@fractality/core' {
    export const Log: {
        debug(message: string): void;
        error(message: string, error?: unknown): void;
        info(message: string): void;
        warn(message: string): void;
        success(message: string): void;
    };

    export const utils: {
        defaultsDeep<T>(...sources: unknown[]): T;
    };

    /**
     * `mix(A, B)` returns a class to extend. It is typed as a constructor of
     * `any` on purpose: the real signature is a class factory chain that cannot
     * be expressed without generics deep enough to obscure the call sites.
     */
    export const mixins: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mix(...behaviours: unknown[]): new (...args: any[]) => any;
        configurable: unknown;
        emitter: unknown;
    };
}
