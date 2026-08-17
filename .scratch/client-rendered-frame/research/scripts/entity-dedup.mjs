import zlib from 'node:zlib';
const app = (await import(process.argv[2])).default;
await app.load();
let dupTotal = 0,
    dedupTotal = 0,
    dupGz = 0,
    dedupGz = 0;
for (const comp of app.components.flatten().toArray()) {
    const vs = comp.variants().filter('isHidden', false).toArray();
    const base = {
        handle: comp.handle,
        label: comp.label,
        notes: comp.notes ?? null,
        context: comp.context ?? {},
    };
    // (a) content repeated on every variant, as first measured
    const dup = { ...base, variants: vs.map((v) => ({ handle: v.handle, context: v.context, content: v.content })) };
    // (b) content hoisted to the component; variants carry only their own context
    const uniq = [...new Set(vs.map((v) => v.content))];
    const dedup = {
        ...base,
        views: uniq,
        variants: vs.map((v) => ({ handle: v.handle, context: v.context, view: uniq.indexOf(v.content) })),
    };
    const a = Buffer.from(JSON.stringify(dup)),
        b = Buffer.from(JSON.stringify(dedup));
    dupTotal += a.length;
    dedupTotal += b.length;
    dupGz += zlib.gzipSync(a, { level: 9 }).length;
    dedupGz += zlib.gzipSync(b, { level: 9 }).length;
}
const mb = (n) => (n / 1024 ** 2).toFixed(2) + ' MB';
console.log('content duplicated per variant :', mb(dupTotal), ' gzip', mb(dupGz));
console.log('content hoisted + referenced   :', mb(dedupTotal), ' gzip', mb(dedupGz));
console.log(
    'raw saving %.1f%%  gzip saving %.1f%%'
        .replace('%.1f%%', ((1 - dedupTotal / dupTotal) * 100).toFixed(1) + '%')
        .replace('%.1f%%', ((1 - dedupGz / dupGz) * 100).toFixed(1) + '%'),
);
process.exit(0);
