// 소프트웨어 공식 다운로드 안내 사이트 빌더.
// 입력: 키워드 다발 JSON(bundles/*.json, 또는 --bundle <경로|URL>). 다발 1개 = 사이트(서브도메인) 1개.
// 출력: dist/<id>/ 정적 페이지, wrangler.<id>.generated.jsonc(워커 1개 = 사이트 1개), hosts.txt.
// 파일은 직접 배포하지 않는다. 다운로드 버튼은 모두 개발사 공식 페이지로 연결한다.
//   node scripts/build.mjs                       bundles/ 의 다발 전부
//   node scripts/build.mjs --bundle a.json       다발 하나만(경로나 https URL)
//   node scripts/build.mjs --check               검증만(파일을 쓰지 않음)
import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const CHECK = args.includes('--check');
const bundleArg = args.includes('--bundle') ? args[args.indexOf('--bundle') + 1] : process.env.SOFT_BUNDLE || '';

export const OS = {
  windows: { name: 'Windows', short: '윈도우' },
  macos: { name: 'macOS', short: '맥' },
  linux: { name: 'Linux', short: '리눅스' },
  android: { name: 'Android', short: '안드로이드' },
  ios: { name: 'iOS', short: '아이폰' },
};
const MAX_KEYWORDS = 9;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const RESERVED = ['p', 'os', 'about', 'page', 'assets', 'sitemap', 'robots', '404'];

// ── 입력 ──────────────────────────────────────────────
async function loadBundles() {
  if (bundleArg) {
    const text = /^https:\/\//.test(bundleArg) ? await (await fetch(bundleArg)).text() : readFileSync(bundleArg, 'utf8');
    return [JSON.parse(text)];
  }
  const dir = join(ROOT, 'bundles');
  return readdirSync(dir).filter((f) => f.endsWith('.json')).sort().map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')));
}

// 다발 검증. 문제가 하나라도 있으면 빌드를 멈춘다.
export function validate(b) {
  const e = [];
  const where = b.id || '(id 없음)';
  if (!SLUG.test(b.id || '')) e.push('id 는 영문 소문자·숫자·하이픈');
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(b.host || '')) e.push('host 가 올바른 도메인이 아님');
  for (const k of ['name', 'title', 'checked']) if (!b[k]) e.push(`${k} 가 비어 있음`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(b.checked || '')) e.push('checked 는 YYYY-MM-DD');
  const kws = b.keywords || [];
  if (kws.length < 1 || kws.length > MAX_KEYWORDS) e.push(`메인 키워드는 1~${MAX_KEYWORDS}개 (지금 ${kws.length}개)`);
  const progs = b.programs || {};
  const seen = new Set();
  for (const k of kws) {
    if (!SLUG.test(k.slug || '') || RESERVED.includes(k.slug) || OS[k.slug]) e.push(`키워드 slug '${k.slug}' 사용 불가`);
    if (seen.has(k.slug)) e.push(`키워드 slug 중복: ${k.slug}`); seen.add(k.slug);
    if (!k.keyword || !k.title || !k.intro) e.push(`[${k.slug}] keyword·title·intro 필수`);
    if (!(k.programs || []).length) e.push(`[${k.slug}] programs 가 비어 있음`);
    for (const p of k.programs || []) if (!progs[p]) e.push(`[${k.slug}] 없는 프로그램 참조: ${p}`);
  }
  for (const [slug, p] of Object.entries(progs)) {
    if (!SLUG.test(slug)) e.push(`프로그램 slug '${slug}' 형식 오류`);
    for (const f of ['name', 'vendor', 'license', 'summary', 'official']) if (!p[f]) e.push(`[${slug}] ${f} 필수`);
    if (!/^https:\/\//.test(p.official || '')) e.push(`[${slug}] official 은 https 주소`);
    const oss = Object.entries(p.os || {});
    if (!oss.length) e.push(`[${slug}] os 가 비어 있음`);
    for (const [os, url] of oss) {
      if (!OS[os]) e.push(`[${slug}] 알 수 없는 운영체제 ${os}`);
      if (!/^https:\/\//.test(url)) e.push(`[${slug}] ${os} 주소는 https`);
    }
    if (!kws.some((k) => (k.programs || []).includes(slug))) e.push(`[${slug}] 어느 키워드에도 속하지 않음`);
  }
  return e.map((x) => `${where}: ${x}`);
}

// ── 공통 ──────────────────────────────────────────────
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const chunk = (arr, n) => { const out = []; for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n)); return out.length ? out : [[]]; };
const pagePath = (base, i) => (i === 0 ? base : `${base}page/${i + 1}/`);
const osOf = (p) => Object.keys(OS).filter((o) => p.os && p.os[o]);

const CSS = `:root{--ink:#14171f;--sub:#5b6270;--line:#e4e7ec;--bg:#f6f7f9;--card:#fff;--pri:#2457e6;--pri-d:#1a43b8;--ok:#0f8a5f;--warn:#a15c00}
*{box-sizing:border-box;margin:0}body{font-family:Pretendard,"Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR",system-ui,sans-serif;color:var(--ink);background:var(--bg);line-height:1.65;-webkit-font-smoothing:antialiased;word-break:keep-all}
a{color:inherit;text-decoration:none}.wrap{max-width:1040px;margin:0 auto;padding:0 18px}
header.top{background:#fff;border-bottom:1px solid var(--line);position:sticky;top:0;z-index:9}.top .wrap{display:flex;align-items:center;gap:18px;height:58px}
.logo{font-weight:800;font-size:18px;letter-spacing:-.02em;white-space:nowrap;flex-shrink:0}.logo b{color:var(--pri)}.nav{display:flex;gap:14px;font-size:14px;color:var(--sub);overflow-x:auto;white-space:nowrap}.nav a:hover{color:var(--pri)}
.hero{background:linear-gradient(135deg,#0f1f4d,#2457e6);color:#fff;padding:46px 0 40px}.hero h1{font-size:32px;line-height:1.3;letter-spacing:-.03em}.hero p{margin-top:10px;opacity:.88;font-size:16px}
.crumb{font-size:13px;color:var(--sub);margin:18px 0 6px}.crumb a{color:var(--pri)}.crumb span{margin:0 6px;opacity:.5}
h1.pt{font-size:28px;letter-spacing:-.03em;line-height:1.3}h2{font-size:21px;letter-spacing:-.02em;margin:34px 0 14px}.lead{color:var(--sub);margin-top:8px;font-size:15.5px}
.grid{display:grid;gap:14px;grid-template-columns:repeat(auto-fill,minmax(230px,1fr))}
.kcard,.pcard{display:block;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:18px;transition:.15s}.kcard:hover,.pcard:hover{border-color:var(--pri);box-shadow:0 8px 24px rgba(36,87,230,.12);transform:translateY(-2px)}
.kcard b{font-size:17px;display:block}.kcard small{display:block;color:var(--sub);font-size:13px;margin-top:6px}.kcard em{font-style:normal;color:var(--pri);font-size:13px;font-weight:700;display:block;margin-top:10px}
.pcard h3{font-size:17px}.pcard .v{font-size:12.5px;color:var(--sub)}.pcard p{font-size:14px;color:#363c48;margin:8px 0 10px}
.chips{display:flex;flex-wrap:wrap;gap:6px}.chip{font-size:12px;padding:3px 9px;border-radius:999px;background:#eef2fd;color:var(--pri-d);font-weight:600}.chip.lic{background:#e9f6f0;color:var(--ok)}.chip.bi{background:#fff4e2;color:var(--warn)}
.tabs{display:flex;gap:8px;flex-wrap:wrap;margin:18px 0 8px}.tab{font-size:14px;padding:7px 14px;border-radius:999px;border:1px solid var(--line);background:#fff;color:var(--sub);font-weight:600}.tab.on{background:var(--ink);border-color:var(--ink);color:#fff}
.box{background:#fff;border:1px solid var(--line);border-radius:14px;padding:20px}.box ul{padding-left:18px}.box li{margin:4px 0}
.faq details{background:#fff;border:1px solid var(--line);border-radius:12px;padding:14px 16px;margin-bottom:8px}.faq summary{font-weight:700;cursor:pointer}.faq p{margin-top:8px;color:#363c48}
.pager{display:flex;gap:6px;justify-content:center;margin:24px 0}.pager a,.pager span{min-width:38px;text-align:center;padding:7px 12px;border-radius:10px;border:1px solid var(--line);background:#fff;font-size:14px}.pager .on{background:var(--pri);border-color:var(--pri);color:#fff}
.dl{display:grid;gap:10px;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));margin-top:6px}.btn{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:14px 16px;border-radius:12px;background:var(--pri);color:#fff;font-weight:700}.btn:hover{background:var(--pri-d)}.btn small{font-weight:500;opacity:.85;font-size:12px}
.btn.alt{background:#fff;color:var(--ink);border:1px solid var(--line)}
.meta{display:grid;grid-template-columns:110px 1fr;gap:8px 14px;font-size:14.5px}.meta dt{color:var(--sub)}
.warn{background:#fffaf0;border:1px solid #f3dfb5;border-radius:12px;padding:14px 16px;font-size:14px;color:#6b4a00;margin-top:14px}
footer{margin-top:56px;background:#11151d;color:#aab1bd;font-size:13.5px;padding:30px 0 40px}footer b{color:#fff}footer a{color:#dfe5ee;text-decoration:underline}footer p{margin-top:6px}
@media(max-width:640px){.hero h1{font-size:25px}h1.pt{font-size:23px}.meta{grid-template-columns:90px 1fr}}`;

function layout(b, { path, title, desc, body, hero = '', ld = [], crumbs = [] }) {
  const url = `https://${b.host}${path}`;
  const robots = b.noindex ? 'noindex,follow' : 'index,follow';
  const crumbLd = crumbs.length ? [{ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ name: '홈', path: '/' }, ...crumbs].map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: `https://${b.host}${c.path}` })) }] : [];
  const lds = [...ld, ...crumbLd].map((x) => `<script type="application/ld+json">${JSON.stringify(x).replace(/</g, '\\u003c')}</script>`).join('');
  const crumbHtml = crumbs.length ? `<nav class="crumb"><a href="/">홈</a>${crumbs.map((c, i) => `<span>›</span>${i === crumbs.length - 1 ? esc(c.name) : `<a href="${c.path}">${esc(c.name)}</a>`}`).join('')}</nav>` : '';
  const nav = b.keywords.map((k) => `<a href="/${k.slug}/">${esc(k.keyword)}</a>`).join('');
  const verify = [process.env.SEO_NAVER_VERIFY && `<meta name="naver-site-verification" content="${esc(process.env.SEO_NAVER_VERIFY)}">`, process.env.SEO_GOOGLE_VERIFY && `<meta name="google-site-verification" content="${esc(process.env.SEO_GOOGLE_VERIFY)}">`].filter(Boolean).join('');
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(desc)}"><meta name="robots" content="${robots}"><link rel="canonical" href="${url}">
<meta property="og:type" content="website"><meta property="og:site_name" content="${esc(b.name)}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${url}"><meta property="og:locale" content="ko_KR"><meta name="twitter:card" content="summary">${verify}
<style>${CSS}</style>${lds}</head><body>
<header class="top"><div class="wrap"><a class="logo" href="/">${esc(b.name).replace(/^(\S+)/, '<b>$1</b>')}</a><nav class="nav">${nav}</nav></div></header>
${hero}<main class="wrap">${crumbHtml}${body}</main>
<footer><div class="wrap"><b>${esc(b.name)}</b><p>이 사이트는 설치 파일을 직접 배포하지 않습니다. 모든 다운로드 버튼은 각 개발사의 공식 페이지로 연결됩니다.</p><p>프로그램 이름과 상표는 각 권리자에게 있습니다. 라이선스·지원 운영체제는 ${esc(b.checked)} 기준으로 공식 페이지에서 확인했으며 바뀔 수 있습니다.</p><p><a href="/about/">운영 원칙</a> · 문의 <a href="mailto:${esc(b.contact)}">${esc(b.contact)}</a> · © 애드블스 adbles</p></div></footer>
</body></html>`;
}

const progCard = (slug, p) => `<a class="pcard" href="/p/${slug}/"><h3>${esc(p.name)}</h3><div class="v">${esc(p.vendor)}</div><p>${esc(p.summary)}</p><div class="chips"><span class="chip ${p.builtin ? 'bi' : 'lic'}">${esc(p.license)}</span>${osOf(p).map((o) => `<span class="chip">${OS[o].name}</span>`).join('')}</div></a>`;

const pager = (base, i, n) => (n < 2 ? '' : `<nav class="pager">${i > 0 ? `<a href="${pagePath(base, i - 1)}">‹ 이전</a>` : ''}${Array.from({ length: n }, (_, j) => (j === i ? `<span class="on">${j + 1}</span>` : `<a href="${pagePath(base, j)}">${j + 1}</a>`)).join('')}${i < n - 1 ? `<a href="${pagePath(base, i + 1)}">다음 ›</a>` : ''}</nav>`);

const itemListLd = (b, items) => ({ '@context': 'https://schema.org', '@type': 'ItemList', itemListElement: items.map(([slug, p], i) => ({ '@type': 'ListItem', position: i + 1, name: p.name, url: `https://${b.host}/p/${slug}/` })) });

// ── 페이지 ────────────────────────────────────────────
function buildPages(b) {
  const out = []; // { path, html }
  const per = Math.max(1, Number(b.perPage) || 6);
  const P = b.programs;
  const kwOf = (slug) => b.keywords.find((k) => k.programs.includes(slug));

  // 홈
  const osCounts = Object.keys(OS).map((o) => [o, Object.values(P).filter((p) => p.os[o]).length]).filter(([, n]) => n);
  out.push({ path: '/', html: layout(b, {
    path: '/', title: `${b.title} | ${b.name}`, desc: b.tagline,
    ld: [{ '@context': 'https://schema.org', '@type': 'WebSite', name: b.name, url: `https://${b.host}/`, inLanguage: 'ko-KR' }],
    hero: `<section class="hero"><div class="wrap"><h1>${esc(b.title)}</h1><p>${esc(b.tagline)}</p></div></section>`,
    body: `<h2>항목별로 찾기</h2><div class="grid">${b.keywords.map((k) => `<a class="kcard" href="/${k.slug}/"><b>${esc(k.title)}</b><small>${k.programs.map((s) => esc(P[s].name)).join(' · ')}</small><em>${k.programs.length}개 보기 →</em></a>`).join('')}</div>
<h2>운영체제별로 찾기</h2><div class="tabs">${osCounts.map(([o, n]) => `<a class="tab" href="/os/${o}/">${OS[o].name} <small>${n}</small></a>`).join('')}</div>
<div class="warn">검색 광고에는 공식 사이트를 흉내 낸 다운로드 페이지가 섞여 있습니다. 이 사이트는 파일을 직접 올리지 않고, 확인한 공식 배포처로만 연결합니다.</div>`,
  }) });

  // 키워드 × (전체 + 운영체제) 목록, 페이지 나눔
  for (const k of b.keywords) {
    const all = k.programs.map((s) => [s, P[s]]);
    const views = [['', '전체', all], ...Object.keys(OS).map((o) => [o, OS[o].name, all.filter(([, p]) => p.os[o])]).filter(([, , l]) => l.length && l.length < all.length)]; // 전체와 같은 목록이면 중복 페이지라 만들지 않는다
    for (const [os, label, list] of views) {
      const base = os ? `/${k.slug}/${os}/` : `/${k.slug}/`;
      const pages = chunk(list, per);
      pages.forEach((items, i) => {
        const h1 = os ? `${OS[os].short}용 ${k.title}` : k.title;
        const suffix = i ? ` (${i + 1}페이지)` : '';
        const tabs = `<div class="tabs">${views.map(([o, l]) => `<a class="tab${o === os ? ' on' : ''}" href="/${k.slug}/${o ? o + '/' : ''}">${l}</a>`).join('')}</div>`;
        const extra = !os && i === 0 ? `${k.pick && k.pick.length ? `<h2>고를 때 볼 것</h2><div class="box"><ul>${k.pick.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}${k.faq && k.faq.length ? `<h2>자주 묻는 질문</h2><div class="faq">${k.faq.map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('')}</div>` : ''}` : '';
        const others = `<h2>다른 항목</h2><div class="tabs">${b.keywords.filter((x) => x !== k).map((x) => `<a class="tab" href="/${x.slug}/">${esc(x.keyword)}</a>`).join('')}</div>`;
        const ld = [itemListLd(b, items)];
        if (!os && i === 0 && k.faq && k.faq.length) ld.push({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: k.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) });
        const crumbs = os ? [{ name: k.title, path: `/${k.slug}/` }, { name: OS[os].name, path: base }] : [{ name: k.title, path: base }];
        out.push({ path: pagePath(base, i), html: layout(b, {
          path: pagePath(base, i), title: `${h1} 공식 다운로드${suffix} | ${b.name}`,
          desc: `${h1} ${list.length}개 — ${list.slice(0, 4).map(([, p]) => p.name).join('·')}. 라이선스·지원 운영체제를 비교하고 공식 사이트에서 받으세요.`,
          ld, crumbs,
          body: `<h1 class="pt">${esc(h1)}${esc(suffix)}</h1><p class="lead">${esc(k.intro)}</p>${tabs}<div class="grid">${items.map(([s, p]) => progCard(s, p)).join('')}</div>${pager(base, i, pages.length)}${extra}${others}`,
        }) });
      });
    }
  }

  // 운영체제 전체 목록
  for (const [o] of osCounts) {
    const list = Object.entries(P).filter(([, p]) => p.os[o]);
    const base = `/os/${o}/`;
    const pages = chunk(list, per);
    pages.forEach((items, i) => {
      const suffix = i ? ` (${i + 1}페이지)` : '';
      out.push({ path: pagePath(base, i), html: layout(b, {
        path: pagePath(base, i), title: `${OS[o].name} 필수프로그램 공식 다운로드${suffix} | ${b.name}`,
        desc: `${OS[o].name}에서 쓸 수 있는 프로그램 ${list.length}개를 항목별로 모았습니다. 모두 공식 배포처로 연결됩니다.`,
        ld: [itemListLd(b, items)], crumbs: [{ name: `${OS[o].name} 프로그램`, path: base }],
        body: `<h1 class="pt">${esc(OS[o].name)} 필수프로그램${esc(suffix)}</h1><p class="lead">${esc(OS[o].name)}을 지원하는 프로그램 ${list.length}개입니다.</p><div class="tabs">${osCounts.map(([x]) => `<a class="tab${x === o ? ' on' : ''}" href="/os/${x}/">${OS[x].name}</a>`).join('')}</div><div class="grid">${items.map(([s, p]) => progCard(s, p)).join('')}</div>${pager(base, i, pages.length)}`,
      }) });
    });
  }

  // 프로그램 상세 — 운영체제별 공식 다운로드
  for (const [slug, p] of Object.entries(P)) {
    const k = kwOf(slug);
    const oss = osOf(p);
    const path = `/p/${slug}/`;
    const btns = oss.map((o) => `<a class="btn" href="${esc(p.os[o])}" target="_blank" rel="noopener">${p.builtin ? `${OS[o].name} — 사용법 보기` : `${OS[o].name}용 받기`} <small>공식 사이트 ↗</small></a>`).join('');
    const sameKw = k.programs.filter((s) => s !== slug).map((s) => [s, P[s]]);
    out.push({ path, html: layout(b, {
      path, title: `${p.name} 공식 다운로드 — ${oss.map((o) => OS[o].name).join('·')} | ${b.name}`,
      desc: `${p.summary} ${p.license}. ${oss.map((o) => OS[o].name).join('·')} 지원. 개발사 공식 페이지로 연결합니다.`,
      crumbs: [{ name: k.title, path: `/${k.slug}/` }, { name: p.name, path }],
      ld: [{ '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: p.name, alternateName: p.en || undefined, operatingSystem: oss.map((o) => OS[o].name).join(', '), applicationCategory: 'UtilitiesApplication', publisher: { '@type': 'Organization', name: p.vendor }, sameAs: p.official, description: p.summary }],
      body: `<h1 class="pt">${esc(p.name)}${p.en && p.en !== p.name ? ` <small style="font-size:.6em;color:var(--sub)">${esc(p.en)}</small>` : ''}</h1><p class="lead">${esc(p.summary)}</p>
<h2>${p.builtin ? '기본 포함 — 설치 없이 사용' : '운영체제별 공식 다운로드'}</h2><div class="dl">${btns}</div>
${p.note ? `<div class="warn">${esc(p.note)}</div>` : ''}
<h2>정보</h2><div class="box"><dl class="meta"><dt>개발사</dt><dd>${esc(p.vendor)}</dd><dt>라이선스</dt><dd>${esc(p.license)}</dd><dt>운영체제</dt><dd>${oss.map((o) => OS[o].name).join(', ')}</dd><dt>공식 페이지</dt><dd><a href="${esc(p.official)}" target="_blank" rel="noopener" style="color:var(--pri);word-break:break-all">${esc(p.official)}</a></dd><dt>확인일</dt><dd>${esc(p.checked || b.checked)}</dd></dl></div>
${p.features && p.features.length ? `<h2>주요 기능</h2><div class="chips">${p.features.map((f) => `<span class="chip">${esc(f)}</span>`).join('')}</div>` : ''}
<h2>설치할 때 확인</h2><div class="box"><ul><li>주소창의 도메인이 위 공식 페이지와 같은지 확인하고 받으세요.</li><li>설치 화면에 함께 설치할 다른 프로그램이 체크돼 있으면 해제하고 진행하세요.</li><li>회사·기관 PC는 라이선스 조건(개인 무료 여부)을 먼저 확인하세요.</li></ul></div>
${sameKw.length ? `<h2>같은 항목의 다른 프로그램</h2><div class="grid">${sameKw.map(([s, x]) => progCard(s, x)).join('')}</div>` : ''}`,
    }) });
  }

  // 운영 원칙
  out.push({ path: '/about/', html: layout(b, {
    path: '/about/', title: `운영 원칙 | ${b.name}`, desc: `${b.name}의 운영 원칙 — 파일을 직접 배포하지 않고 공식 배포처로만 연결합니다.`,
    crumbs: [{ name: '운영 원칙', path: '/about/' }],
    body: `<h1 class="pt">운영 원칙</h1><div class="box" style="margin-top:18px"><ul><li>설치 파일을 이 사이트에 올리거나 다시 배포하지 않습니다. 다운로드는 모두 개발사 공식 페이지로 연결합니다.</li><li>라이선스·지원 운영체제는 확인일(${esc(b.checked)}) 기준 공식 페이지 내용을 옮겼습니다. 바뀐 내용을 발견하면 알려 주세요.</li><li>공식 배포 경로를 확인할 수 없는 프로그램은 싣지 않습니다.</li><li>개발사로부터 대가를 받고 순위를 정하지 않습니다.</li></ul><p style="margin-top:12px">문의: <a href="mailto:${esc(b.contact)}" style="color:var(--pri)">${esc(b.contact)}</a></p></div>`,
  }) });

  return out;
}

// ── 쓰기 ──────────────────────────────────────────────
function writeSite(b, pages) {
  const dir = join(ROOT, 'dist', b.id);
  rmSync(dir, { recursive: true, force: true });
  for (const { path, html } of pages) {
    const f = join(dir, path, 'index.html');
    mkdirSync(dirname(f), { recursive: true });
    writeFileSync(f, html);
  }
  writeFileSync(join(dir, '404.html'), layout(b, { path: '/404', title: `페이지를 찾을 수 없습니다 | ${b.name}`, desc: '', body: `<h1 class="pt" style="margin-top:40px">페이지를 찾을 수 없습니다</h1><p class="lead"><a href="/" style="color:var(--pri)">홈으로 가기</a></p>` }).replace('content="index,follow"', 'content="noindex,follow"'));
  const today = new Date().toISOString().slice(0, 10);
  writeFileSync(join(dir, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map((p) => `<url><loc>https://${b.host}${p.path}</loc><lastmod>${today}</lastmod></url>`).join('\n')}\n</urlset>\n`);
  writeFileSync(join(dir, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: https://${b.host}/sitemap.xml\n`);
  writeFileSync(join(dir, '_headers'), `/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  Cache-Control: public, max-age=600\n`);
  writeFileSync(join(ROOT, `wrangler.${b.id}.generated.jsonc`), JSON.stringify({
    name: `adbles-soft-${b.id}`, compatibility_date: '2026-09-01',
    assets: { directory: `./dist/${b.id}`, not_found_handling: '404-page', html_handling: 'auto-trailing-slash' },
    routes: [{ pattern: b.host, custom_domain: true }],
  }, null, 2) + '\n');
}

const bundles = await loadBundles();
const errors = bundles.flatMap(validate);
const hosts = bundles.map((b) => b.host);
const dupHost = hosts.filter((h, i) => hosts.indexOf(h) !== i);
if (dupHost.length) errors.push(`host 중복: ${dupHost.join(', ')}`);
if (errors.length) { console.error(`다발 검증 실패 ${errors.length}건\n- ${errors.join('\n- ')}`); process.exit(1); }

const lines = [];
for (const b of bundles) {
  const pages = buildPages(b);
  if (!CHECK) writeSite(b, pages);
  lines.push(`${b.host}  키워드 ${b.keywords.length}개 · 프로그램 ${Object.keys(b.programs).length}개 · 페이지 ${pages.length}개${b.noindex ? ' · noindex' : ''}`);
}
if (!CHECK) writeFileSync(join(ROOT, 'hosts.txt'), hosts.join('\n') + '\n');
console.log(`${CHECK ? '검증 통과' : 'built → dist/'}\n  ${lines.join('\n  ')}`);
