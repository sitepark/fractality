import fs from "fs";

export default {
    /**
     * Change the current working directory.
     *
     * @param {string} [directory=''] The directory to navigate into.
     */
    cd(directory = '') {
        return process.chdir(directory);
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
