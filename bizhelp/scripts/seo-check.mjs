// 빌드 결과(dist-sites)의 SEO 필수 항목 점검: 제목·설명 길이, canonical, h1 1개, JSON-LD 파싱, 사이트맵 포함 여부
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
const root = 'dist-sites/s', problems = [];
const walk = (d) => readdirSync(d).flatMap((f) => { const p = `${d}/${f}`; return statSync(p).isDirectory() ? walk(p) : [p]; });
let pages = 0;
for (const sub of readdirSync(root)) {
  const dir = `${root}/${sub}`;
  if (!statSync(dir).isDirectory()) continue;
  const map = existsSync(`${dir}/sitemap.xml`) ? readFileSync(`${dir}/sitemap.xml`, 'utf8') : '';
  if (!map) problems.push(`${sub}: sitemap.xml 없음`);
  for (const f of walk(dir).filter((x) => x.endsWith('/index.html'))) {
    pages++;
    const h = readFileSync(f, 'utf8'), path = f.slice(dir.length, -'index.html'.length), tag = `${sub}${path}`;
    const title = (h.match(/<title>([^<]*)<\/title>/) || [])[1] || '';
    const desc = (h.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '';
    const canon = (h.match(/<link rel="canonical" href="([^"]*)"/) || [])[1] || '';
    const robots = (h.match(/<meta name="robots" content="([^"]*)"/) || [])[1] || '';
    if (!title || title.length > 70) problems.push(`${tag}: 제목 ${title.length}자`);
    if (desc.length < 40 || desc.length > 170) problems.push(`${tag}: 설명 ${desc.length}자`);
    if (!canon) problems.push(`${tag}: canonical 없음`);
    if (!robots) problems.push(`${tag}: robots 메타 없음`);
    if ((h.match(/<h1[\s>]/g) || []).length !== 1) problems.push(`${tag}: h1 ${(h.match(/<h1[\s>]/g) || []).length}개`);
    if (!/property="og:title"/.test(h)) problems.push(`${tag}: og:title 없음`);
    for (const m of h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) { try { JSON.parse(m[1]); } catch { problems.push(`${tag}: JSON-LD 파싱 실패`); } }
    const indexable = !/noindex/.test(robots) && canon;
    if (indexable && map && !map.includes(`<loc>${canon}</loc>`)) problems.push(`${tag}: 색인 대상인데 사이트맵에 없음`);
  }
}
console.log(`SEO 점검: 페이지 ${pages}개, 문제 ${problems.length}건`);
problems.slice(0, 40).forEach((p) => console.log(' -', p));
if (process.argv.includes('--strict') && problems.length) process.exit(1);
