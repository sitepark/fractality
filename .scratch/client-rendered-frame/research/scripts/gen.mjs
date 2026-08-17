// Generates a synthetic Fractality component library of a target handle count.
// A "handle" is what mandelbrot's getHandles() enumerates: every component, plus
// every variant of a component that has more than one. That is the count #419
// reports as "items", and it is what drives the route table.
import fs from 'node:fs';
import path from 'node:path';

const TARGET = Number(process.argv[2] ?? 3797);
const ROOT = process.argv[3];
const COMPONENTS = path.join(ROOT, 'components');

fs.rmSync(COMPONENTS, { recursive: true, force: true });
fs.mkdirSync(COMPONENTS, { recursive: true });

// Deterministic PRNG so the library is reproducible across runs.
let seed = 20260817;
const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
const pick = (a) => a[Math.floor(rnd() * a.length)];

const COLLECTIONS = [
    'actions',
    'forms',
    'layout',
    'navigation',
    'feedback',
    'data-display',
    'typography',
    'media',
    'overlays',
    'utilities',
    'commerce',
    'charts',
];
const NOUNS = [
    'button',
    'field',
    'card',
    'panel',
    'list',
    'table',
    'badge',
    'chip',
    'menu',
    'dialog',
    'toast',
    'banner',
    'avatar',
    'tooltip',
    'tabs',
    'accordion',
    'stepper',
    'slider',
    'toggle',
    'picker',
    'grid',
    'stack',
    'divider',
    'spinner',
    'progress',
];
const STATUSES = ['ready', 'wip', 'prototype'];

const LOREM = 'The quick brown fox jumps over the lazy dog while the parser walks the tree. ';

let handles = 0;
let componentCount = 0;
const manifest = [];
let i = 0;

while (handles < TARGET) {
    const collection = COLLECTIONS[i % COLLECTIONS.length];
    const noun = pick(NOUNS);
    const name = `${noun}-${String(i).padStart(4, '0')}`;
    const dir = path.join(COMPONENTS, collection, name);
    fs.mkdirSync(dir, { recursive: true });

    // Shape distribution, roughly matching a real design system: most components
    // carry only a default variant; a minority carry several.
    const r = rnd();
    const variantCount = r < 0.6 ? 0 : r < 0.9 ? 3 : 6;
    // comp.variants() includes the implicit default variant, so a component
    // declaring N extra variants has variants().size === N + 1 and contributes
    // 1 (itself) + N + 1 handles. Verified against the emitted detail-page count.
    const contributed = variantCount === 0 ? 1 : variantCount + 2;

    // Weight class: most components are typical, a few are heavy.
    const weight = rnd() < 0.06 ? 'heavy' : rnd() < 0.25 ? 'trivial' : 'typical';
    const notesParas = weight === 'heavy' ? 40 : weight === 'typical' ? 3 : 0;
    const contextRows = weight === 'heavy' ? 60 : weight === 'typical' ? 6 : 1;
    const templateLines = weight === 'heavy' ? 120 : weight === 'typical' ? 18 : 3;

    const tpl = [
        `<div class="${noun} ${noun}--{{ modifier }}" data-handle="${name}">`,
        ...Array.from(
            { length: templateLines },
            (_, n) => `    <span class="${noun}__row ${noun}__row--${n}">{{ label }} ${n}</span>`,
        ),
        `</div>`,
    ].join('\n');
    fs.writeFileSync(path.join(dir, `${name}.hbs`), tpl + '\n');

    const cfg = [];
    cfg.push(`title: ${noun.charAt(0).toUpperCase() + noun.slice(1)} ${i}`);
    cfg.push(`status: ${pick(STATUSES)}`);
    cfg.push(`context:`);
    cfg.push(`    label: "Example label ${i}"`);
    cfg.push(`    modifier: default`);
    for (let n = 0; n < contextRows; n++) {
        cfg.push(`    field_${n}: "${LOREM.repeat(1).trim()}"`);
    }
    if (variantCount > 0) {
        cfg.push(`variants:`);
        for (let v = 0; v < variantCount; v++) {
            cfg.push(`    - name: variant-${v}`);
            cfg.push(`      status: ${pick(STATUSES)}`);
            cfg.push(`      context:`);
            cfg.push(`          modifier: variant-${v}`);
        }
    }
    if (notesParas > 0) {
        cfg.push(`notes: |`);
        for (let n = 0; n < notesParas; n++) {
            cfg.push(`    ## Section ${n}`);
            cfg.push(`    ${LOREM.repeat(4).trim()}`);
            cfg.push(``);
        }
    }
    fs.writeFileSync(path.join(dir, `${name}.config.yml`), cfg.join('\n') + '\n');

    manifest.push({ name, collection, weight, variantCount, contributed });
    handles += contributed;
    componentCount++;
    i++;
}

fs.writeFileSync(
    path.join(ROOT, 'manifest.json'),
    JSON.stringify({ target: TARGET, handles, componentCount, manifest }, null, 2),
);
console.log(
    JSON.stringify({
        components: componentCount,
        handles,
        collections: COLLECTIONS.length,
        byWeight: manifest.reduce((a, m) => ((a[m.weight] = (a[m.weight] ?? 0) + 1), a), {}),
    }),
);
