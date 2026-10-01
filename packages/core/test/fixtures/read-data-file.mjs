// Runs data.readFile() in a real Node process. Vitest rewrites dynamic import()
// in source files to its own module runner, which normalises specifiers before
// resolving them. That hides the path-versus-URL bugs these tests look for.
//
// The only argument is a JSON plan, a list of { read } and { write } steps. They
// run in order, so one process can observe how a read affects the next one.

import fs from 'node:fs/promises';

import data from '../../src/data.js';
import Log from '../../src/log.js';

const logged = [];
Log.on('error', (msg) => logged.push(msg));

const results = [];

for (const step of JSON.parse(process.argv[2])) {
    if (step.write) {
        await fs.writeFile(step.write.path, step.write.contents);
        // Bump the mtime by hand. A rewrite inside the same clock tick can leave
        // it untouched, and the mtime is what tells the two reads apart.
        const future = new Date(Date.now() + 2000);
        await fs.utimes(step.write.path, future, future);
    } else {
        try {
            results.push({ value: await data.readFile(step.read) });
        } catch (err) {
            results.push({ error: err.message });
        }
    }
}

process.stdout.write(`__RESULT__${JSON.stringify({ results, logged })}`);
