// 사이트 제작 현황 리포트 렌더러.
// 섹션 순서(고정): 카운트 카드 4종 → 유효키워드 목록 버튼/패널 → 저장·업로드 버튼 →
//                 새로운 1위 → 검색 1위 → 사이트별 페이지 목록(카드 그리드)
const DATA_URL = '/api/report';
const RANK_VALID = 30;

const $app = document.getElementById('app');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const addDays = (s, n) => { const d = new Date(`${s}T00:00:00`); d.setDate(d.getDate() + n); return ymd(d); };
const mondayOf = (s) => { const d = new Date(`${s}T00:00:00`); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return ymd(d); };
const norm = (s) => String(s ?? '').replace(/\s+/g, '');
const normPath = (p) => '/' + String(p ?? '').replace(/^\/+|\/+$/g, '');
const key = (site, path) => `${String(site || '').toLowerCase()}|${normPath(path)}`;

// 콘텐츠가 아닌 페이지(상담·로그인·피드·에러 등)는 집계에서 제외
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

function compute(data) {
  const dates = data.dates || [];
  const today = dates[0] || '';
  const keywords = data.keywords || [];
  const rMap = new Map();
  for (const r of data.ranks || []) {
    if (!rMap.has(r.tracking_id)) rMap.set(r.tracking_id, new Map());
    rMap.get(r.tracking_id).set(r.check_date, r.rank_position ? Number(r.rank_position) : null);
  }
  // 해당 날짜(포함) 이전 가장 최근 측정일의 순위. 순위 없음 = 탈락(null)
  const rankAsOf = (kw, cut) => {
    const m = rMap.get(kw.id);
    if (!m) return null;
    for (const d of dates) if (d <= cut && m.has(d)) return m.get(d);
    return null;
  };
  const rows = keywords.map((kw) => ({ kw, r: rankAsOf(kw, '9999-12-31') }));
  rows.sort((a, b) => (a.r || 999) - (b.r || 999) || a.kw.keyword.localeCompare(b.kw.keyword, 'ko'));

  const weekStart = mondayOf(today);
  const prevCut = addDays(weekStart, -1);
  const prevSun = addDays(prevCut, -7);
  const lastWeekStart = addDays(weekStart, -7);
  const hasPrev = dates.some((d) => d <= prevCut);

  const validAsOf = (cut) => {
    if (!dates.some((d) => d <= cut)) return null;
    return keywords.filter((kw) => { const r = rankAsOf(kw, cut); return r && r <= RANK_VALID; }).length;
  };
  const validNow = rows.filter((x) => x.r && x.r <= RANK_VALID);
  const vPrev = hasPrev ? validAsOf(prevCut) : null;
  const vPrevPrev = hasPrev ? validAsOf(prevSun) : null;
  const validGain = vPrev == null || vPrevPrev == null ? null : vPrev - vPrevPrev;

  const pagesAll = (data.pages || []).filter((p) => isContentPage(p) || p.pending);
  const pages = pagesAll.filter((p) => !p.pending);

  const kwOf = new Map(), kwsOfSite = new Map(), kwListOf = new Map();
  for (const k of keywords) {
    if (!k.site) continue;
    kwOf.set(key(k.site, k.page_path), k.keyword);
    const l = kwListOf.get(key(k.site, k.page_path)) || [];
    l.push(k.keyword); kwListOf.set(key(k.site, k.page_path), l);
    const s = String(k.site).toLowerCase();
    (kwsOfSite.get(s) || kwsOfSite.set(s, []).get(s)).push(norm(k.keyword));
  }

  // 사이트별 묶음 (수집 전 사이트도 포함)
  const sitesMap = new Map();
  for (const p of pagesAll) (sitesMap.get(p.site) || sitesMap.set(p.site, []).get(p.site)).push(p);
  const siteNames = [...sitesMap.keys()].sort();

  const createdBySite = new Map();
  const note = (s, d) => { if (s && d) { const v = String(d).slice(0, 10); if (!createdBySite.has(s) || v < createdBySite.get(s)) createdBySite.set(s, v); } };
  keywords.forEach((k) => note(k.site, k.created_at));
  (data.pages || []).forEach((p) => note(p.site, p.first_seen));

  const isNewPg = (p) => p.first_seen && String(p.first_seen).slice(0, 10) >= weekStart;
  const mainCount = siteNames.length, subCount = pages.length;
  const newSites = siteNames.filter((s) => (createdBySite.get(s) || '') >= weekStart).length;
  const newPages = pages.filter(isNewPg).length;
  const pwSites = siteNames.filter((s) => { const a = createdBySite.get(s) || ''; return a >= lastWeekStart && a < weekStart; }).length;
  const pwPages = pages.filter((p) => { const f = String(p.first_seen || '').slice(0, 10); return f >= lastWeekStart && f < weekStart; }).length;

  // 새로운 1위: 지난주 끝엔 1위가 아니었는데 지금 1위. 주초에 비면 지난주 신규로 대체
  const top = rows.filter((x) => x.r === 1);
  let newKw = hasPrev ? top.filter((x) => rankAsOf(x.kw, prevCut) !== 1) : [];
  let newLabel = '이번 주';
  if (!newKw.length && top.length) {
    newKw = keywords.map((kw) => ({ kw, r: rankAsOf(kw, prevCut) })).filter((x) => x.r === 1 && rankAsOf(x.kw, prevSun) !== 1)
      .sort((a, b) => a.kw.keyword.localeCompare(b.kw.keyword, 'ko'));
    newLabel = '지난 주';
  }
  const siteUrl = (s) => (data.site_meta && data.site_meta[s] && data.site_meta[s].url) || `https://${s}`;
  const tplName = (s) => { const id = data.site_meta && data.site_meta[s] && data.site_meta[s].template; const t = (data.templates || []).find((x) => x.id === id); return t ? t.name : ''; };
  return { siteUrl, tplName, dates, today, rows, validNow, validGain, vPrevPrev, weekStart, prevCut, mainCount, subCount, newSites, newPages, pwSites, pwPages,
    top, newKw, newLabel, sitesMap, siteNames, createdBySite, kwOf, kwsOfSite, kwListOf, isNewPg, pagesCount: pages.length };
}

const wk = (pv) => `<span class="cc-wow-badge" title="지난주(월~일) +${pv}개 제작" style="color:${pv > 0 ? '#2563eb' : '#94a3b8'}">▲ +${pv}<span class="cc-wow-lbl">전주 제작</span></span>`;
const gainBadge = (g) => g == null ? '<span class="cc-wow-nd">전주 데이터없음</span>'
  : g < 0 ? '' : `<span class="cc-wow-badge" style="color:${g > 0 ? '#2563eb' : '#64748b'}">${g > 0 ? '▲' : '—'} +${g}<span class="cc-wow-lbl">전주 증가</span></span>`;

function card(cls, icon, value, label, wow) {
  return `<div class="count-card ${cls}"><div class="cc-top"><div class="count-icon">${icon}</div>
    <div><span class="count-value">${value}</span><span class="count-unit">개</span></div>
    <div class="count-label">${label}</div></div><div class="cc-wow">${wow}</div></div>`;
}
const naverUrl = (q) => `https://search.naver.com/search.naver?query=${encodeURIComponent(q)}`;

function renderCounts(c) {
  const total = c.mainCount + c.subCount;
  let h = '<div id="count-capture"><div class="count-grid">';
  h += card('main', '🌐', c.mainCount, '메인사이트', wk(c.pwSites));
  h += card('sub', '📄', c.subCount, '세부사이트', wk(c.pwPages));
  h += card('total', '📊', total, '총 제작 항목', wk(c.pwSites + c.pwPages));
  h += card('naver', 'N', c.validNow.length, '네이버 유효키워드', gainBadge(c.validGain));
  return h + '</div></div>';
}

function renderValidList(c) {
  if (!c.validNow.length) return '';
  const items = c.validNow.map((x, i) => {
    const col = x.r <= 3 ? '#dc2626' : x.r <= 10 ? '#ea580c' : '#2563eb';
    return `<div class="nv-row"><span class="nv-idx">${i + 1}</span><span class="nv-kw">${esc(x.kw.keyword)}</span><span class="nv-site">${esc(x.kw.site)}</span><span class="nv-rank" style="color:${col}">${x.r}위</span></div>`;
  }).join('');
  return `<div class="btn-list-wrap"><button type="button" class="btn green" data-act="toggle-list">📋 유효키워드 ${c.validNow.length}개 목록 보기 ▼</button></div>
    <div class="nv-box" id="nvListBox"><div class="nv-hd">🟢 네이버 순위 ${RANK_VALID}위 안에 든 키워드 ${c.validNow.length}개 (순위순)</div><div class="nv-scroll">${items}</div></div>`;
}

const renderButtons = () => `<div class="btn-row">
  <button type="button" class="btn indigo" id="capture-btn" data-act="capture">📋 클립보드로 저장</button>
  <button type="button" class="btn sky" id="share-url-btn" data-act="share">🔗 이미지업로드URL</button></div>
  <div class="share-result" id="share-result"></div><div id="upload-url-box"></div>`;

function renderTop1(c) {
  if (!c.top.length) return '';
  const chip = (x, isNew) => `<a class="top1-chip${isNew ? ' is-new' : ''}" href="${naverUrl(x.kw.keyword)}" target="_blank" rel="noopener">${esc(x.kw.keyword)}${isNew ? '<span class="kw-new">NEW</span>' : ''}</a>`;
  const ids = new Set(c.newKw.map((x) => x.kw.id));
  const old = c.top.filter((x) => !ids.has(x.kw.id));
  let h = '';
  if (c.newKw.length) {
    h += `<div id="new1-capture"><div class="section-title">🆕 ${c.newLabel} 새로운 1위 키워드 <span class="top1-newcnt">${c.newKw.length} NEW</span></div>
      <div class="top1-card new-card"><div class="top1-kws">${c.newKw.map((x) => chip(x, true)).join('')}</div></div></div>`;
  }
  if (old.length) {
    h += `<div class="section-title">🥇 검색 1위 키워드</div><div class="top1-card"><div class="top1-head">🥇 <b>${c.top.length}</b><span>개 · 네이버 검색 1위</span></div>
      <div class="top1-kws">${old.map((x) => chip(x, false)).join('')}</div></div>`;
  }
  return h;
}

// 라벨: 페이지 H1(문장형이면 앞 핵심부), 없으면 타깃 키워드
const core = (s) => { const k = String(s ?? '').trim(); const m = k.split(/\s+[—–|]\s+|\s*,\s+|\s+-\s+/)[0].trim(); return m.length >= 2 ? m : k; };
const label = (p) => p.pending ? String(p.h1_title) : core(p.h1_title);

function renderSites(c) {
  if (!c.siteNames.length) return '<div class="empty">아직 등록된 사이트가 없습니다.<br><button type="button" class="btn indigo" style="margin-top:14px" data-grp="new">＋ 새 메인키워드 그룹</button></div>';
  let h = `<div class="section-title">사이트별 페이지 목록 <span class="section-sub">${c.mainCount}개 사이트 / ${c.subCount}개 페이지</span>
    <span class="top-new-badge${c.newPages ? '' : ' zero'}" title="이번 주(${c.weekStart} 월요일 이후) 새로 생긴 페이지 합계">🆕 이번주 신규 <b>${c.newPages}</b>개</span>
    <span class="badge-legend"><span><i style="background:#22c55e"></i>타이틀·H1 정상</span><span><i style="background:#3b82f6"></i>1개 불일치</span><span><i style="background:#ef4444"></i>둘다 불일치</span></span></div>
    <div class="grp-bar"><button type="button" class="btn indigo" data-grp="new">＋ 새 메인키워드 그룹</button><button type="button" class="btn indigo" style="background:#0f766e" data-grp="import">📥 키워드 일괄 등록</button><button type="button" class="btn sky" data-grp="deploy">🚀 지금 반영</button></div>
    <div class="site-grid">`;
  c.siteNames.forEach((site, si) => {
    const list = c.sitesMap.get(site).slice().sort((a, b) => (a.page_path || '').localeCompare(b.page_path || ''));
    const dup = new Map();
    list.forEach((p) => dup.set(label(p), (dup.get(label(p)) || 0) + 1));
    const fresh = list.filter(c.isNewPg), rest = list.filter((p) => !c.isNewPg(p));
    let n = 0;
    const item = (p, isNew) => {
      n += 1;
      const url = p.page_url || `https://${p.site}${p.page_path}`;
      const dot = p.pending ? { c: 'n', t: '크롤 대기 (생성됨 · 수집 전)' } : matchDot(p, c.kwOf, c.kwsOfSite);
      const lb = label(p);
      const txt = dup.get(lb) > 1
        ? `<span class="page-h1w"><span class="page-h1" title="${esc(p.h1_title)}">${esc(lb)}</span><span class="page-sub">${esc(p.page_path)}</span></span>`
        : `<span class="page-h1" title="${esc(p.h1_title)}">${esc(lb)}</span>`;
      return `<a class="page-item${isNew ? ' pg-new' : ''}" href="${esc(url)}" target="_blank" rel="noopener"><span class="page-num">${String(n).padStart(2, '0')}</span>
        <span class="page-badge bg-${dot.c}" title="${esc(dot.t)}"></span>${txt}${isNew ? '<span class="pg-new-tag" title="이번 주 신규">🆕 NEW</span>' : ''}<span class="page-arrow">❯</span></a>`;
    };
    const nw = fresh.length;
    h += `<div class="site-card c${si % 8}"><div class="site-head"><div class="site-head-left"><div class="site-icon">${si + 1}</div>
      <div class="site-info"><div class="site-domain">${esc(site)}</div><div class="site-title">메인사이트 ${si + 1}/${c.mainCount}${c.createdBySite.get(site) ? ` · 📅 생성 ${c.createdBySite.get(site)}` : ''}${c.tplName(site) ? ` · 🎨 ${esc(c.tplName(site))}` : ''}</div></div></div>
      <div class="site-meta"><button type="button" class="site-link-btn" style="background:#0f766e;border:0;cursor:pointer" data-grp="edit" data-slug="${esc(site.split('.')[0])}" title="키워드·지역·내용 수정">수정</button><a class="site-link-btn" style="background:#475569" href="/upload/${esc(site.split('.')[0])}" target="_blank" rel="noopener" title="사진·정보 업로드">업로드</a><a class="site-link-btn" href="${esc(c.siteUrl(site))}" target="_blank" rel="noopener">방문 ↗</a></div></div>
      <div class="site-badges"><span class="site-cnt-badge" title="총 페이지 수">📄 <b>${list.length}</b>개</span>
      <span class="site-wow-badge ${nw ? 'up' : 'zero'}" title="이번 주 신규 ${nw}개 (${c.weekStart} 월요일 이후)">📈 <b>${nw ? '+' + nw : '±0'}</b></span></div>
      <div class="page-list">`;
    if (fresh.length) {
      h += `<div class="page-sec-label new">🆕 이번 주 신규 ${fresh.length}개</div>${fresh.map((p) => item(p, true)).join('')}`;
      if (rest.length) h += '<div class="page-sec-label">📄 전체 페이지</div>';
    }
    h += rest.map((p) => item(p, false)).join('') + '</div>';
    if (list.length > 14) h += `<div class="page-list-foot">아래로 스크롤 · 총 ${list.length}개 페이지</div>`;
    h += '</div>';
  });
  return h + '</div>';
}

function loadScript(src) {
  return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
}

// 리포트 상단(제목·건수·새 1위)을 한 장의 이미지로 만든다.
async function snapshot() {
  if (!window.html2canvas) await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
  const targets = ['count-capture', 'new1-capture'].map((id) => document.getElementById(id)).filter(Boolean);
  const wrap = document.createElement('div');
  wrap.style.cssText = 'position:fixed;left:-9999px;top:0;width:720px;padding:16px;background:#f5f6fa';
  wrap.innerHTML = `<div class="hero" style="border-radius:14px;margin-bottom:12px">${document.querySelector('.hero').innerHTML}</div>` + targets.map((t) => t.outerHTML).join('');
  document.body.appendChild(wrap);
  try { return await window.html2canvas(wrap, { scale: 2, backgroundColor: '#f5f6fa' }); } finally { wrap.remove(); }
}

async function capture(btn) {
  const orig = btn.textContent;
  btn.disabled = true; btn.textContent = '⏳ 캡처 중...';
  try {
    const canvas = await snapshot();
    const blob = await new Promise((r) => canvas.toBlob(r, 'image/png'));
    if (navigator.clipboard && window.ClipboardItem) {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      btn.textContent = '✅ 복사됨';
    } else {
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `report-${Date.now()}.png`; a.click();
      btn.textContent = '✅ 다운로드됨';
    }
  } catch (e) {
    btn.textContent = '⚠️ 실패';
  }
  setTimeout(() => { btn.textContent = orig; btn.disabled = false; }, 2000);
}

// 캡처한 이미지를 서버에 올리고 공유 주소(URL)를 돌려받는다. 서버 저장 한도(1.2MB)에 맞춰 JPEG 품질을 낮춰 가며 줄인다.
async function shareImage(btn) {
  const orig = btn.textContent, out = document.getElementById('share-result'), box = document.getElementById('upload-url-box');
  btn.disabled = true; btn.textContent = '⏳ 업로드 중...'; out.textContent = ''; box.innerHTML = '';
  try {
    const canvas = await snapshot();
    let blob = null;
    for (const q of [0.9, 0.8, 0.7, 0.6, 0.5]) { blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', q)); if (blob && blob.size <= 1_200_000) break; }
    if (!blob || blob.size > 1_200_000) throw new Error('이미지가 너무 큽니다');
    const j = await fetch('/api/share', { method: 'PUT', headers: { 'content-type': 'image/jpeg' }, body: blob }).then((r) => r.json());
    if (!j.ok) throw new Error(j.error || '업로드 실패');
    box.innerHTML = `<div class="upload-url"><input type="text" readonly value="${esc(j.url)}" onclick="this.select()"><a href="${esc(j.url)}" target="_blank" rel="noopener">열기</a></div>`;
    try { await navigator.clipboard.writeText(j.url); out.textContent = '업로드 완료 · 주소를 복사했습니다'; } catch { out.textContent = '업로드 완료 · 아래 주소를 복사하세요'; }
    btn.textContent = '✅ 완료';
  } catch (e) {
    out.textContent = `업로드하지 못했습니다: ${e.message}`; btn.textContent = '⚠️ 실패';
  }
  setTimeout(() => { btn.textContent = orig; btn.disabled = false; }, 2000);
}

function wire() {
  $app.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    if (b.dataset.act === 'toggle-list') document.getElementById('nvListBox')?.classList.toggle('open');
    if (b.dataset.act === 'capture') capture(b);
    if (b.dataset.act === 'share') shareImage(b);
  });
}

// 순위 수집 상태 안내(실제 상태만 보여 준다)
function renderNotice(st) {
  if (!st) return '';
  const msg = !st.configured ? '네이버 순위 수집이 아직 설정되지 않았습니다(API 키 등록 필요). 키를 등록하기 전까지 순위·유효키워드는 0으로 표시됩니다.'
    : st.noindex ? `네이버 순위를 매일 수집합니다(마지막 측정 ${st.last_check || '아직 없음'}, 오늘 ${st.checked_today}/${st.total}). 키워드 사이트가 검색 노출 차단 상태라 공개 전환 후에 순위가 잡힙니다.`
    : `네이버 순위를 매일 수집합니다(마지막 측정 ${st.last_check || '아직 없음'}, 오늘 ${st.checked_today}/${st.total}).`;
  return `<div class="rank-note">ℹ️ ${esc(msg)}</div>`;
}

async function start() {
  let data;
  try {
    data = await fetch(DATA_URL, { cache: 'no-store' }).then((r) => { if (r.status === 401) { location.reload(); return null; } return r.json(); });
  } catch { data = null; }
  if (!data || !data.success) { $app.innerHTML = '<div class="empty">데이터를 불러올 수 없습니다.</div>'; return; }
  document.getElementById('hero-biz').textContent = data.business_name || '';
  document.title = `${data.business_name || ''} · 사이트 제작 현황 리포트`;
  const c = compute(data);
  $app.innerHTML = renderNotice(data.rank_status) + renderCounts(c) + renderValidList(c) + renderButtons() + renderTop1(c) + renderSites(c);
  wire();
  window.__report = c; // 점검용
}
import { initGroups } from './groups.js';
initGroups();
start();
