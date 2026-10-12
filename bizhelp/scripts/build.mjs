// 두 가지 산출물을 만든다.
//  dist/        관리자 리포트(admin.bizhelp.kr)
//  dist-sites/  열릴 페이지(<키워드slug>.suriwiki.com/<지역slug>) — worker/sites.mjs 가 호스트명으로 /s/<키워드slug>/ 에 매핑
import { cpSync, rmSync, mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { keywordPage, sitePage } from './page-template.mjs';

for (const d of ['dist', 'dist-sites']) { rmSync(d, { recursive: true, force: true }); mkdirSync(d, { recursive: true }); }
cpSync('src', 'dist', { recursive: true });
if (existsSync('public')) cpSync('public', 'dist', { recursive: true });

const data = JSON.parse(readFileSync('src/data/report.json', 'utf8'));
const today = data.dates?.[0] || '';
mkdirSync('dist-sites/css', { recursive: true });
cpSync('src/css/keyword-page.css', 'dist-sites/css/keyword-page.css');
cpSync('public/favicon.svg', 'dist-sites/favicon.svg');
writeFileSync('dist-sites/robots.txt', 'User-agent: *\nDisallow: /\n'); // 샘플 단계 — 실제 공개 시 제거
writeFileSync('dist-sites/_headers', '/*\n  X-Robots-Tag: noindex, nofollow\n'); // 샘플 단계 — 실제 공개 시 제거

let n = 0;
for (const [site, m] of Object.entries(data.site_meta || {})) {
  const sub = site.split('.')[0];
  const pages = data.pages.filter((p) => p.site === site && !p.pending && p.region);
  const put = (rel, html) => { const dir = `dist-sites/s/${sub}${rel}`.replace(/\/$/, ''); mkdirSync(dir, { recursive: true }); writeFileSync(`${dir}/index.html`, html); n++; };
  put('/', sitePage({ site, meta: m, pages, base: '/', today }));
  for (const page of pages) put(page.page_path, keywordPage({ site, meta: m, page, siblings: pages, base: '/', today }));
}
console.log(`built → dist/ (관리자), dist-sites/ (페이지 ${n}개)`);
