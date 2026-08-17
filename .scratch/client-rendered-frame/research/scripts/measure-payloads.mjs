// Measures the tree payload and entity payloads for ticket 01, parts 2-4.
//
// The tree field list is not invented: it is exactly what mandelbrot's
// views/macros/navigation.nunj reads when rendering the tree, plus what
// partials/navigation/*.nunj read for the doc and asset trees.
import zlib from 'node:zlib';
import fs from 'node:fs';

const app = (await import(process.argv[2])).default;
await app.load();

const size = (obj) => {
    const raw = Buffer.from(JSON.stringify(obj), 'utf8');
    return {
        raw: raw.length,
        gzip: zlib.gzipSync(raw, { level: 9 }).length,
        brotli: zlib.brotliCompressSync(raw).length,
    };
};
const kb = (n) => `${(n / 1024).toFixed(1)}K`;

// ---------------------------------------------------------------- status table
// status is a shared enum: {label, color, statuses?}. Only a handful of distinct
// values exist per project, so inlining it per item repeats the same object N times.
const statusTable = {};
const statusKey = (s) => {
    if (!s) return undefined;
    const k = s.handle ?? s.label;
    if (!statusTable[k]) statusTable[k] = { label: s.label, color: s.color };
    return k;
};

// ------------------------------------------------------------------ tree walks
let itemCount = 0;

// Shape A: naive — every field the nav reads, status inlined as an object.
function walkA(items) {
    const out = [];
    for (const item of items) {
        if (item.isHidden) continue;
        itemCount++;
        if (item.isCollection) {
            out.push({
                id: item.id,
                handle: item.handle,
                label: item.label,
                isCollection: true,
                isRoot: item.isRoot,
                children: walkA(item.items()),
            });
        } else if (item.isComponent && !item.isCollated && item.variants().filter('isHidden', false).size > 1) {
            out.push({
                id: item.id,
                handle: item.handle,
                label: item.label,
                isComponent: true,
                isCollated: item.isCollated,
                status: item.status ? { label: item.status.label, color: item.status.color } : null,
                tags: item.tags ?? [],
                url: `/components/detail/${item.handle}`,
                children: walkA(item.variants().filter('isHidden', false).items()),
            });
        } else {
            out.push({
                id: item.id,
                handle: item.handle,
                label: item.label,
                isComponent: !!item.isComponent,
                isCollated: !!item.isCollated,
                parentHandle: item.parent?.handle,
                parentId: item.parent?.id,
                status: item.status ? { label: item.status.label, color: item.status.color } : null,
                tags: item.tags ?? [],
                url: `/components/detail/${item.handle}`,
            });
        }
    }
    return out;
}

// Shape B: same fidelity, but status is a key into a table, empty tags dropped,
// booleans omitted when false, parentId dropped (derivable from nesting).
function walkB(items) {
    const out = [];
    for (const item of items) {
        if (item.isHidden) continue;
        const n = { i: item.id, h: item.handle, l: item.label };
        if (item.isCollection) {
            n.c = 1;
            if (item.isRoot) n.r = 1;
            n.k = walkB(item.items());
        } else {
            const st = statusKey(item.status);
            if (st) n.s = st;
            if (item.tags?.length) n.t = item.tags;
            if (item.isComponent && !item.isCollated && item.variants().filter('isHidden', false).size > 1) {
                n.k = walkB(item.variants().filter('isHidden', false).items());
            }
        }
        out.push(n);
    }
    return out;
}

// Shape C: minimum viable nav — no id (handle is already unique), no tags.
function walkC(items) {
    const out = [];
    for (const item of items) {
        if (item.isHidden) continue;
        const n = { h: item.handle, l: item.label };
        if (item.isCollection) {
            n.k = walkC(item.items());
        } else {
            const st = statusKey(item.status);
            if (st) n.s = st;
            if (item.isComponent && !item.isCollated && item.variants().filter('isHidden', false).size > 1) {
                n.k = walkC(item.variants().filter('isHidden', false).items());
            }
        }
        out.push(n);
    }
    return out;
}

const rootItems = app.components.items();
const docItems = app.docs.items();

const treeA = { components: walkA(rootItems), docs: walkA(docItems) };
const treeB = { status: statusTable, components: walkB(rootItems), docs: walkB(docItems) };
const treeC = { status: statusTable, components: walkC(rootItems), docs: walkC(docItems) };

// -------------------------------------------------------------- entity payload
// What the Pen and Browser need for one component: notes, context, resources,
// references, preview URL, and raw source per view.
async function entityPayload(comp) {
    const variants = comp.variants().filter('isHidden', false).toArray();
    const out = {
        id: comp.id,
        handle: comp.handle,
        label: comp.label,
        title: comp.title,
        status: statusKey(comp.status),
        tags: comp.tags ?? [],
        notes: comp.notes ?? null,
        context: comp.context ?? {},
        viewPath: comp.relViewPath,
        references: (comp.references ?? []).map((r) => r.handle),
        referencedBy: (comp.referencedBy ?? []).map((r) => r.handle),
        variants: variants.map((v) => ({
            handle: v.handle,
            label: v.label,
            name: v.name,
            status: statusKey(v.status),
            isDefault: !!v.isDefault,
            context: v.context ?? {},
            notes: v.notes ?? null,
            previewUrl: `/components/preview/${v.handle}`,
            content: v.content ?? null,
        })),
        resources: [],
    };
    try {
        for (const rc of comp.resources().toArray()) {
            for (const r of rc.items?.() ?? rc.toArray?.() ?? []) {
                out.resources.push({ name: r.name, path: r.path, ext: r.ext });
            }
        }
    } catch {
        /* resource collections vary by source; not load-bearing for size */
    }
    return out;
}

const comps = app.components.flatten().toArray();
const withSize = await Promise.all(comps.map(async (c) => ({ handle: c.handle, payload: await entityPayload(c) })));
const sized = withSize
    .map((e) => ({ ...e, bytes: Buffer.byteLength(JSON.stringify(e.payload)) }))
    .sort((a, b) => a.bytes - b.bytes);

const total = sized.reduce((a, e) => a + e.bytes, 0);
const gzipTotal = sized.reduce(
    (a, e) => a + zlib.gzipSync(Buffer.from(JSON.stringify(e.payload)), { level: 9 }).length,
    0,
);
const at = (p) => sized[Math.min(sized.length - 1, Math.floor(sized.length * p))];

const report = {
    library: {
        components: comps.length,
        navItemsWalked: itemCount,
        distinctStatuses: Object.keys(statusTable).length,
    },
    tree: {
        A_naive_status_inlined: size(treeA),
        B_status_keyed_short_fields: size(treeB),
        C_minimal_no_id_no_tags: size(treeC),
    },
    entity: {
        count: sized.length,
        totalRaw: total,
        totalGzipIndividually: gzipTotal,
        smallest: { handle: sized[0].handle, ...size(sized[0].payload) },
        p50: { handle: at(0.5).handle, ...size(at(0.5).payload) },
        p90: { handle: at(0.9).handle, ...size(at(0.9).payload) },
        largest: { handle: sized.at(-1).handle, ...size(sized.at(-1).payload) },
    },
};

console.log(JSON.stringify(report, null, 2));
console.log('\n--- human ---');
for (const [k, v] of Object.entries(report.tree)) {
    console.log(
        `tree ${k.padEnd(30)} raw ${kb(v.raw).padStart(9)}  gzip ${kb(v.gzip).padStart(9)}  br ${kb(v.brotli).padStart(9)}`,
    );
}
console.log(`entity total raw ${kb(total)}  (gzipped individually ${kb(gzipTotal)})`);
console.log(
    `entity smallest ${kb(report.entity.smallest.raw)} / p50 ${kb(report.entity.p50.raw)} / p90 ${kb(report.entity.p90.raw)} / largest ${kb(report.entity.largest.raw)}`,
);
fs.writeFileSync(process.argv[3], JSON.stringify(report, null, 2));
process.exit(0);
