const UNITS = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

/**
 * A file size, as the `fileSize` filter rendered it.
 *
 * Decimal units, not binary — 1000 bytes to the KB, which is what the filter
 * used and what a file manager shows. One decimal place, so a 1.5 KB stylesheet
 * does not read as "2 KB".
 */
export function formatBytes(bytes: number): string {
    if (!bytes) return '0 Bytes';

    const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1000)), UNITS.length - 1);
    const value = bytes / Math.pow(1000, exponent);

    return `${parseFloat(value.toFixed(1))} ${UNITS[exponent]}`;
}
