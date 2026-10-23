// 업체 카드 안 '페이지 목록' — 예전 '제작 리포트' 탭의 사이트별 페이지 목록을 허브 카드로 옮겼다(2026-10-23).
// 데이터는 /api/report(사이트·페이지·처음 본 날). 응답이 느려서 허브를 먼저 그리고 뒤에서 받아 둔다.
// 점: 타이틀·H1 ↔ 타깃 키워드 일치 여부. 이번 주(월요일 이후) 처음 본 페이지는 🆕 로 위에 모은다.
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const mondayOf = (s) => { const d = new Date(`${s}T00:00:00`); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return ymd(d); };
const norm = (s) => String(s ?? '').replace(/\s+/g, '');
const normPath = (p) => '/' + String(p ?? '').replace(/^\/+|\/+$/g, '');
const key = (site, path) => `${String(site || '').toLowerCase()}|${normPath(path)}`;

// 콘텐츠가 아닌 페이지(상담·로그인·피드·에러 등)는 목록에서 뺀다
const BLOCK_PATH = /^(\/feed\/?|\/comments\/feed\/?|\/wp-(json|admin|login)|\/xmlrpc\.php|\/robots\.txt|\/sitemap[\w-]*\.xml)|\/(consult|consultation|contact|inquiry|login|signup|register|signin|sitemap[\w-]*|search|cart|checkout|404|privacy|terms)(\.php)?\/?$|\.(xml|txt)$|[?&](p|page_id|cat|paged|attachment_id|author|feed|tag)=/i;
const BLOCK_H1 = new Set(['상담하기', '상담문의', '문의하기', '문의', '무료상담', '로그인', '회원가입', '사이트맵', 'sitemap', '메뉴', '홈', 'home', '404', '검색', '이용약관', '개인정보처리방침', '블로그', '뉴스', '공지사항']);
const ERROR_H1 = /helloworld|^samplepage$|^샘플페이지$|페이지를찾을수없|internalservererror|serviceunavailable|badgateway|notfound|forbidden|^40\d|^50\d/;

function isContentPage(p) {
  if (!p.site || !p.page_path || !String(p.h1_title || '').trim()) return false;
  if (BLOCK_PATH.test(p.page_path) || /^https?:\/\/|\$\{/.test(p.page_path)) return false;
  const h = norm(p.h1_title).toLowerCase();
  return !BLOCK_H1.has(h) && !ERROR_H1.test(h);
}

// 타이틀·H1 ↔ 타깃 키워드 일치 점: g 둘 다 / b 하나 / r 둘 다 불일치 / n 판정 보류
function matchDot(p, kwOf, kwsOfSite) {
  let kw = norm(kwOf.get(key(p.site, p.page_path)));
  const h1 = norm(p.h1_title), ti = norm(p.page_title);
  if (!kw) kw = (kwsOfSite.get(String(p.site).toLowerCase()) || []).find((k) => k && (h1.includes(k) || ti.includes(k))) || '';
  if (!kw) return { c: 'n', t: '키워드 미등록(판정 보류)' };
  const a = h1.includes(kw), b = ti.includes(kw);
  if (a && b) return { c: 'g', t: '타이틀·H1 모두 키워드 일치' };
  if (a || b) return { c: 'b', t: `${b ? 'H1' : '타이틀'}가 키워드와 불일치` };
  return { c: 'r', t: '타이틀·H1 모두 키워드 불일치' };
}

// 라벨: 페이지 H1(문장형이면 앞 핵심부), 없으면 타깃 키워드
const core = (s) => { const k = String(s ?? '').trim(); const m = k.split(/\s+[—–|]\s+|\s*,\s+|\s+-\s+/)[0].trim(); return m.length >= 2 ? m : k; };
const label = (p) => p.pending ? String(p.h1_title) : core(p.h1_title);

let P = null; // { bySite: Map<host, page[]>, kwOf, kwsOfSite, weekStart }
let loading = null;

export function loadPages() {
  if (!loading) loading = fetch('/api/report', { cache: 'no-store' }).then((r) => r.json()).then((data) => {
    if (!data || !data.success) throw new Error('report');
    const weekStart = mondayOf((data.dates || [])[0] || ymd(new Date()));
    const kwOf = new Map(), kwsOfSite = new Map();
    for (const k of data.keywords || []) {
      if (!k.site) continue;
      kwOf.set(key(k.site, k.page_path), k.keyword);
      const s = String(k.site).toLowerCase();
      (kwsOfSite.get(s) || kwsOfSite.set(s, []).get(s)).push(norm(k.keyword));
    }
    const bySite = new Map();
    for (const p of (data.pages || []).filter((x) => isContentPage(x) || x.pending)) {
      const s = String(p.site).toLowerCase();
      (bySite.get(s) || bySite.set(s, []).get(s)).push(p);
    }
    P = { bySite, kwOf, kwsOfSite, weekStart };
    return P;
  }).catch(() => { loading = null; return null; });
  return loading;
}

const isNew = (p) => p.first_seen && String(p.first_seen).slice(0, 10) >= P.weekStart;

// 카드 아래 접힘 버튼의 요약 문구(데이터가 오기 전에는 null)
export function pageSummary(host) {
  if (!P) return null;
  const list = P.bySite.get(String(host).toLowerCase()) || [];
  return { total: list.filter((p) => !p.pending).length, fresh: list.filter(isNew).length };
}

export function pageListHtml(host) {
  if (!P) return '<div class="pl-msg">페이지 목록을 불러오는 중…</div>';
  const list = (P.bySite.get(String(host).toLowerCase()) || []).slice().sort((a, b) => (a.page_path || '').localeCompare(b.page_path || ''));
  if (!list.length) return '<div class="pl-msg">아직 만들어진 페이지가 없습니다.</div>';
  const dup = new Map();
  list.forEach((p) => dup.set(label(p), (dup.get(label(p)) || 0) + 1));
  const fresh = list.filter(isNew), rest = list.filter((p) => !isNew(p));
  let n = 0;
  const item = (p, nw) => {
    n += 1;
    const url = p.page_url || `https://${p.site}${p.page_path}`;
    const dot = p.pending ? { c: 'n', t: '크롤 대기 (생성됨 · 수집 전)' } : matchDot(p, P.kwOf, P.kwsOfSite);
    const lb = label(p);
    const txt = dup.get(lb) > 1
      ? `<span class="page-h1w"><span class="page-h1" title="${esc(p.h1_title)}">${esc(lb)}</span><span class="page-sub">${esc(p.page_path)}</span></span>`
      : `<span class="page-h1" title="${esc(p.h1_title)}">${esc(lb)}</span>`;
    return `<a class="page-item${nw ? ' pg-new' : ''}" href="${esc(url)}" target="_blank" rel="noopener"><span class="page-num">${String(n).padStart(2, '0')}</span>
      <span class="page-badge bg-${dot.c}" title="${esc(dot.t)}"></span>${txt}${nw ? '<span class="pg-new-tag" title="이번 주 신규">NEW</span>' : ''}<span class="page-arrow">❯</span></a>`;
  };
  let h = '<div class="pl-legend"><span><i class="bg-g"></i>타이틀·H1 정상</span><span><i class="bg-b"></i>1개 불일치</span><span><i class="bg-r"></i>둘 다 불일치</span></div><div class="page-list">';
  if (fresh.length) {
    h += `<div class="page-sec-label new">🆕 이번 주 신규 ${fresh.length}개</div>${fresh.map((p) => item(p, true)).join('')}`;
    if (rest.length) h += '<div class="page-sec-label">📄 전체 페이지</div>';
  }
  return h + rest.map((p) => item(p, false)).join('') + '</div>';
}
