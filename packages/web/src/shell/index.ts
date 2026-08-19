/**
 * The Shell: the static, contentless HTML document the Frame boots from.
 *
 * Its *content* is the theme's business — a theme builds it alongside its client
 * bundle. What lives here is what `@fractality/web` does with it at site build:
 * make its asset links resolvable, inject the global config, and copy it to
 * every path in the route table.
 *
 * Specified in docs/specs/client-rendered-frame.md §2.1, §5 and §6.
 */
export { prepareShell, writeShells } from './writer.js';
export type { PrepareShellOptions, WriteShellsOptions, WriteShellsResult } from './writer.js';
export { frctlConfigFor, serialiseFrctlConfig } from './config.js';
export type { FrctlConfig, ThemeConfigSource } from './config.js';
