// 두 가지 산출물을 만든다.
//  dist/        관리자 리포트(admin.suriwiki.com)
//  dist-sites/  키워드 사이트(<키워드slug>.suriwiki.com/<지역slug>) — worker/sites.mjs 가 호스트명으로 /s/<키워드slug>/ 에 매핑
//  wrangler.sites.generated.jsonc  키워드마다 개별 커스텀 도메인(와일드카드 라우트·DNS는 쓰지 않는다)
import { cpSync, rmSync, mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolveProfile } from './site-defaults.mjs';
import { groupsToRegistry, setExtraRegions } from './group-model.mjs';
import { homePage, regionPage, sangdamPage, setImages } from './templates.mjs';
import { readdirSync } from 'node:fs';

for (const d of ['dist', 'dist-sites']) { rmSync(d, { recursive: true, force: true }); mkdirSync(d, { recursive: true }); }
cpSync('src', 'dist', { recursive: true });
// 업로드 페이지 템플릿 미리보기가 쓰는 기본 사진: 관리자 사이트에도 복사하고, 어떤 사진이 있는지 색인을 워커에 넘긴다
if (existsSync('site-images')) {
  cpSync('site-images', 'dist/site-images', { recursive: true });
  const idx = {};
  for (const d of readdirSync('site-images')) idx[d] = readdirSync(`site-images/${d}`).filter((f) => f.endsWith('.webp')).map((f) => f.replace('.webp', ''));
  writeFileSync('worker/site-images-index.json', JSON.stringify(idx));
} else writeFileSync('worker/site-images-index.json', '{}');
if (existsSync('public')) cpSync('public', 'dist', { recursive: true });

// 사이트·페이지 정의: 대시보드에서 만든 그룹(D1)이 원본이다. 불러오지 못하면 저장소의 registry/sites.json(시드)로 만든다.
let data = JSON.parse(readFileSync('registry/sites.json', 'utf8'));
if (process.env.BIZHELP_GROUPS_URL) {
  try {
    const r = await fetch(process.env.BIZHELP_GROUPS_URL, { signal: AbortSignal.timeout(15000) });
    const j = r.ok ? await r.json() : null;
    if (j && Array.isArray(j.groups) && j.groups.length) { setExtraRegions(j.regions || []); data = groupsToRegistry(j.groups, data); console.log(`그룹: ${j.groups.length}개 (대시보드)`); }
    else console.log('그룹 조회 결과가 비어 있어 registry/sites.json 을 씁니다');
  } catch (e) { console.log('그룹 조회 실패, registry/sites.json 사용:', e.message); }
}

// 업로드 페이지에서 올린 공사 전/후 사진(작업 사례 1~4). 전·후가 둘 다 있는 사례만 쓴다(없으면 건너뜀).
const baBySub = {}, capBySub = {}, introBySub = {};
if (process.env.BIZHELP_BA_URL) {
  try {
    const r = await fetch(process.env.BIZHELP_BA_URL, { signal: AbortSignal.timeout(15000) });
    if (r.ok) {
      const j = await r.json();
      for (const it of j.items || []) (((baBySub[it.slug] ||= {})[it.region || ''] ||= {})[it.slot] ||= {})[it.phase] = it;
      for (const it of j.captions || []) if (it.caption) ((capBySub[it.slug] ||= {})[it.region || ''] ||= {})[it.slot] = it.caption;
      for (const it of j.intros || []) if (it.intro) (introBySub[it.slug] ||= {})[it.region || ''] = it.intro;
    }
    console.log(`전후 사진: ${Object.keys(baBySub).length}개 사이트`);
  } catch (e) { console.log('전후 사진 조회 실패(무시):', e.message); }
}
const EXT_OF = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

// 업로드 페이지에서 입력된 전화번호·블로그·유튜브를 키워드 사이트에 반영한다(없으면 건너뜀).
let profiles = {};
if (process.env.BIZHELP_PROFILES_URL) {
  try {
    const r = await fetch(process.env.BIZHELP_PROFILES_URL, { signal: AbortSignal.timeout(15000) });
    if (r.ok) for (const p of (await r.json()).profiles || []) profiles[p.slug] = p;
    console.log(`profiles: ${Object.keys(profiles).length}개`);
  } catch (e) { console.log('profiles 조회 실패(무시):', e.message); }
}
const sample = !!data.noindex; // 실제 공개 전에는 검색 노출을 막는다
cpSync('public/favicon.svg', 'dist-sites/favicon.svg');
if (sample) writeFileSync('dist-sites/_headers', '/*\n  X-Robots-Tag: noindex, nofollow\n'); // 샘플 단계 — 실제 공개 시 data.sample=false

let n = 0;
const hosts = [];
for (const [site, m] of Object.entries(data.site_meta || {})) {
  const sub = site.split('.')[0];
  hosts.push(site);
  const imgDir = `site-images/${sub}`;
  const imgNames = existsSync(imgDir) ? readdirSync(imgDir).filter((f) => f.endsWith('.webp')).map((f) => f.replace('.webp', '')) : [];
  const profile = resolveProfile(profiles[sub] || {});
  if (imgNames.length) cpSync(imgDir, `dist-sites/s/${sub}/img`, { recursive: true });
  // 올라온 전/후 쌍은 같은 칸의 기본 사진을 대신한다. 범위: 공통('') → 지역별. 지역에 없는 사례는 공통 → 기본 사진.
  const baseUrl = (process.env.BIZHELP_BA_URL || '').replace(/\/api\/export\/ba$/, '');
  const fetched = {}; // 'region/slot' → { before: src, after: src }  (src = 사이트 안 경로)
  for (const [region, slots] of Object.entries(baBySub[sub] || {})) {
    for (const [slot, ph] of Object.entries(slots)) {
      if (!ph.before || !ph.after) continue;
      const pair = {};
      for (const phase of ['before', 'after']) {
        const res = await fetch(`${baseUrl}/api/s/${sub}/ba/${region ? region + '/' : ''}${slot}/${phase}`, { signal: AbortSignal.timeout(20000) });
        if (!res.ok) continue;
        const ext = EXT_OF[ph[phase].type] || 'jpg', rel = `${region ? `r/${region}/` : ''}ba-${slot}-${phase}.${ext}`;
        mkdirSync(`dist-sites/s/${sub}/img/${region ? `r/${region}` : ''}`, { recursive: true });
        writeFileSync(`dist-sites/s/${sub}/img/${rel}`, Buffer.from(await res.arrayBuffer()));
        pair[phase] = `/img/${rel}`;
      }
      if (pair.before && pair.after) fetched[`${region}/${slot}`] = pair;
    }
  }
  // 페이지(공통/지역)별 사진 경로 지도: 지역 쌍 > 공통 쌍 > 기본 사진
  const apply = (region) => {
    const names = new Set(imgNames), src = {};
    for (const slot of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const pair = (region && fetched[`${region}/${slot}`]) || fetched[`/${slot}`];
      if (pair) { src[`ba-${slot}-before`] = pair.before; src[`ba-${slot}-after`] = pair.after; names.add(`ba-${slot}-before`); names.add(`ba-${slot}-after`); }
    }
    setImages([...names], src);
  };
  const pages = data.pages.filter((p) => p.site === site && !p.pending && p.region).sort((a, b) => a.page_path.localeCompare(b.page_path));
  const put = (rel, html) => { const dir = `dist-sites/s/${sub}${rel}`.replace(/\/$/, ''); mkdirSync(dir, { recursive: true }); writeFileSync(`${dir}/index.html`, html); n++; };
  apply('');
  // 사진 설명(캡션)·지역 소개 문구: 지역에 입력한 값이 있으면 그것, 없으면 공통
  const mediaFor = (region) => ({ captions: { ...(capBySub[sub]?.[''] || {}), ...(region ? capBySub[sub]?.[region] || {} : {}) }, intro: region ? introBySub[sub]?.[region] || '' : '' });
  put('/', homePage({ site, meta: m, pages, data, profile, media: mediaFor('') }));
  put('/sangdam', sangdamPage({ site, meta: m, data, profile, pages, media: mediaFor('') }));
  for (const page of pages) { apply(page.region_slug); put(page.page_path, regionPage({ site, meta: m, page, pages, data, profile, media: mediaFor(page.region_slug) })); }
  const urls = ['/', ...pages.map((p) => p.page_path)];
  writeFileSync(`dist-sites/s/${sub}/robots.txt`, sample ? 'User-agent: *\nDisallow: /\n' : `User-agent: *\nAllow: /\nSitemap: https://${site}/sitemap.xml\n`);
  writeFileSync(`dist-sites/s/${sub}/sitemap.xml`, `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `<url><loc>https://${site}${u}</loc></url>`).join('\n')}\n</urlset>\n`);
}

writeFileSync('wrangler.sites.generated.jsonc', JSON.stringify({
  name: 'suriwiki-keyword-sites',
  main: 'worker/sites.mjs',
  compatibility_date: '2026-10-01',
  assets: { directory: './dist-sites', binding: 'ASSETS', run_worker_first: true, html_handling: 'auto-trailing-slash', not_found_handling: '404-page' },
  routes: hosts.map((h) => ({ pattern: h, custom_domain: true })),
}, null, 2) + '\n');
writeFileSync('sites-hosts.txt', hosts.join('\n') + '\n');
console.log(`built → dist/ (관리자), dist-sites/ (페이지 ${n}개, 호스트 ${hosts.length}개)`);
