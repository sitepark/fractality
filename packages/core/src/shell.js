import fs from 'fs';

export default {
    /**
     * Change the current working directory.
     *
     * Without a directory, the working directory stays unchanged.
     *
     * @param {string} [directory] The directory to navigate into.
     */
    cd(directory) {
        if (directory) {
            process.chdir(directory);
        }
    },

    /**
     * Create a file.
     *
     * @param {string} filename The filename of the file to create.
     */
    touch(filename) {
        fs.closeSync(fs.openSync(filename, 'w'));
    },
};
