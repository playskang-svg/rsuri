// 두 가지 산출물을 만든다.
//  dist/        관리자 리포트(admin.suriwiki.com)
//  dist-sites/  키워드 사이트(<키워드slug>.suriwiki.com/<지역slug>) — worker/sites.mjs 가 호스트명으로 /s/<키워드slug>/ 에 매핑
//  wrangler.sites.generated.jsonc  키워드마다 개별 커스텀 도메인(와일드카드 라우트·DNS는 쓰지 않는다)
import { cpSync, rmSync, mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolveProfile } from './site-defaults.mjs';
import { homePage, regionPage, sangdamPage, setImages } from './page-template.mjs';
import { readdirSync } from 'node:fs';

for (const d of ['dist', 'dist-sites']) { rmSync(d, { recursive: true, force: true }); mkdirSync(d, { recursive: true }); }
cpSync('src', 'dist', { recursive: true });
if (existsSync('public')) cpSync('public', 'dist', { recursive: true });

const data = JSON.parse(readFileSync('registry/sites.json', 'utf8'));
// 관리자 워커가 슬러그를 검증하고 카테고리(=서브키워드)를 알 수 있게 메타를 넘긴다.
const meta = {};
for (const [site, m] of Object.entries(data.site_meta || {})) meta[site.split('.')[0]] = { keyword: m.main_keyword, subs: m.sub_keywords };
writeFileSync('worker/sites-meta.json', JSON.stringify(meta));

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
  setImages(imgNames);
  const profile = resolveProfile(profiles[sub] || {});
  if (imgNames.length) cpSync(imgDir, `dist-sites/s/${sub}/img`, { recursive: true });
  const pages = data.pages.filter((p) => p.site === site && !p.pending && p.region).sort((a, b) => a.page_path.localeCompare(b.page_path));
  const put = (rel, html) => { const dir = `dist-sites/s/${sub}${rel}`.replace(/\/$/, ''); mkdirSync(dir, { recursive: true }); writeFileSync(`${dir}/index.html`, html); n++; };
  put('/', homePage({ site, meta: m, pages, data, profile }));
  put('/sangdam', sangdamPage({ site, meta: m, data, profile }));
  for (const page of pages) put(page.page_path, regionPage({ site, meta: m, page, pages, data, profile }));
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
