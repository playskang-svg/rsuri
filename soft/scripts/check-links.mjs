// 다발에 적힌 공식 주소가 아직 살아 있는지 확인한다(네트워크 필요, 빌드 게이트는 아님).
//   node scripts/check-links.mjs [bundles/x.json]
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const files = process.argv[2] ? [process.argv[2]] : readdirSync(join(ROOT, 'bundles')).filter((f) => f.endsWith('.json')).map((f) => join(ROOT, 'bundles', f));
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130 Safari/537.36';
let bad = 0;
for (const f of files) {
  const b = JSON.parse(readFileSync(f, 'utf8'));
  const urls = new Map();
  for (const [slug, p] of Object.entries(b.programs)) for (const u of [p.official, ...Object.values(p.os || {})]) urls.set(u, slug);
  for (const [u, slug] of urls) {
    let s;
    try { const r = await fetch(u, { redirect: 'follow', headers: { 'user-agent': UA }, signal: AbortSignal.timeout(20000) }); s = r.status; } catch (e) { s = 'ERR'; }
    // 403 은 봇 차단(Cloudflare 등)일 수 있어 경고로만 둔다
    const mark = s === 200 ? 'ok ' : s === 403 ? '403' : 'BAD';
    if (mark === 'BAD') bad++;
    if (mark !== 'ok ') console.log(`${mark} ${b.id}/${slug}  ${u}  (${s})`);
  }
  console.log(`${b.id}: 주소 ${urls.size}개 확인`);
}
process.exit(bad ? 1 : 0);
