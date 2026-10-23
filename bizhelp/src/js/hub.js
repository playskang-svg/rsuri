// 업체·업로드 허브 + 탭 전환.
// 허브: 업체(=키워드 사이트)마다 업로드 현황·전후 사례·사이트 완성도를 카드로 보여 주고, 분류별로 묶고, 검색·정렬한다.
// 수리위키 본사이트 연동 상태도 허브 상단 한 줄 + 카드 배지 + '연결 대기' 거르기로 보여 준다(예전 '수리위키 연동' 탭을 합쳤다).
// 데이터는 /api/hub 한 번으로 받는다. 그룹 만들기·수정·일괄 등록 버튼은 groups.js 의 [data-grp] 위임 핸들러가 처리한다.
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = (n) => Number(n || 0).toLocaleString('ko-KR');
const bytes = (b) => { b = Number(b || 0); if (b < 1024) return `${b} B`; const u = ['KB', 'MB', 'GB', 'TB']; let i = -1; do { b /= 1024; i++; } while (b >= 1024 && i < u.length - 1); return `${b.toFixed(b >= 100 ? 0 : b >= 10 ? 1 : 2)} ${u[i]}`; };
const ago = (t) => { if (!t) return '활동 없음'; const m = Math.round((Date.now() - t) / 60000); if (m < 1) return '방금'; if (m < 60) return `${m}분 전`; const h = Math.round(m / 60); if (h < 24) return `${h}시간 전`; const d = Math.round(h / 24); return d < 30 ? `${d}일 전` : new Date(t).toLocaleDateString('ko-KR'); };
const UNSEG = '미분류';
const COLORS = ['#2563eb', '#0f766e', '#7c3aed', '#c2410c', '#be185d', '#0369a1', '#4d7c0f', '#b45309'];
const colorOf = (s) => COLORS[[...String(s)].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length];
const toast = (msg) => { let t = $('hub-toast'); if (!t) { t = document.createElement('div'); t.id = 'hub-toast'; t.className = 'hub-toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); } t.textContent = msg; t.classList.add('on'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('on'), 2200); };
const copy = (text, msg) => navigator.clipboard.writeText(text).then(() => toast(msg || '복사했습니다'), () => prompt('복사해서 쓰세요', text));
const uploadUrl = (slug) => `${location.origin}/upload/${slug}/`;

const S = { data: null, q: '', seg: '', sort: 'activity', need: '', closed: new Set() };
try { S.closed = new Set(JSON.parse(localStorage.getItem('hub-closed') || '[]')); S.sort = localStorage.getItem('hub-sort') || S.sort; } catch (_) { /* 저장소 없음 */ }
const saveUi = () => { try { localStorage.setItem('hub-closed', JSON.stringify([...S.closed])); localStorage.setItem('hub-sort', S.sort); } catch (_) { /* 저장소 없음 */ } };

// ── 탭: #hub(기본) · #report. 예전 #link 주소는 허브로 연다.
function showTab(tab) {
  if (!['hub', 'report'].includes(tab)) tab = 'hub';
  document.querySelectorAll('.tb-tab').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
  document.querySelectorAll('.pane').forEach((p) => { p.hidden = p.dataset.pane !== tab; });
  window.dispatchEvent(new CustomEvent('sw:tab', { detail: tab }));
}
document.querySelector('.tb-tabs').addEventListener('click', (e) => { const b = e.target.closest('.tb-tab'); if (!b) return; history.replaceState(null, '', b.dataset.tab === 'hub' ? location.pathname : `#${b.dataset.tab}`); showTab(b.dataset.tab); });
window.addEventListener('hashchange', () => showTab(location.hash.slice(1)));

// ── 상단 통계
function renderStats(t) {
  const st = (v, l, sub) => `<div class="hh-stat"><b>${v}</b><span>${l}</span>${sub ? `<small>${sub}</small>` : ''}</div>`;
  $('hub-stats').innerHTML = st(num(t.sites), '등록 업체', `지역 페이지 ${num(t.regions)}개`) + st(num(t.files), '업로드 파일') + st(num(t.photos), '사진') + st(num(t.videos), '동영상')
    + st(bytes(t.bytes), '사용 용량') + st(num(t.cases), '전후 사례', `완성도 70%+ 사이트 ${t.ready}곳`);
}

// ── 다음 할 일: 체크리스트에서 비어 있는 항목을 사이트 수로 모아 보여 준다. 누르면 그 항목이 빠진 사이트만 거른다.
// suriwiki.com 에 아직 연결되지 않은 사이트도 같은 방식으로 한 칩(SW_NEED)으로 보여 준다.
const SW_NEED = 'suriwiki';
const swPending = (s) => s.suriwiki === null;
function renderTodo(sites) {
  const m = new Map();
  for (const s of sites) for (const c of s.checks) if (!c.ok) { const e = m.get(c.id) || { label: c.label, n: 0 }; e.n++; m.set(c.id, e); }
  const sw = sites.filter(swPending).length;
  if (sw) m.set(SW_NEED, { label: '수리위키 연결', n: sw });
  const items = [...m.entries()].sort((a, b) => b[1].n - a[1].n);
  if (!items.length) return '<div class="todo done">🎉 모든 사이트의 기본 항목이 채워졌습니다.</div>';
  return `<div class="todo"><b class="todo-hd">📌 다음 할 일</b>${items.map(([id, e]) => `<button type="button" class="todo-chip${S.need === id ? ' on' : ''}" data-need="${id}">${esc(e.label)} 없음 <em>${e.n}곳</em></button>`).join('')}${S.need ? '<button type="button" class="todo-chip clear" data-need="">✕ 거르기 해제</button>' : ''}</div>`;
}

function ring(score) {
  const c = score >= 70 ? '#16a34a' : score >= 40 ? '#d97706' : '#dc2626';
  return `<div class="ring" style="--p:${score};--c:${c}" title="사이트 완성도 ${score}%"><span>${score}<small>%</small></span></div>`;
}

function card(s) {
  const missing = s.checks.filter((c) => !c.ok);
  const sw = s.suriwiki === undefined ? '' : s.suriwiki
    ? `<a class="sw-badge on" href="https://suriwiki.com${esc(s.suriwiki.path)}" target="_blank" rel="noopener" title="suriwiki.com '${esc(s.suriwiki.name)}' 페이지에 파트너로 노출 중">🔗 수리위키 · ${esc(s.suriwiki.name)}</a>`
    : '<span class="sw-badge" title="다음 suriwiki.com 빌드 때 연결됩니다">🔗 수리위키 연결 대기</span>';
  return `<article class="hcard" data-slug="${esc(s.slug)}">
    <div class="hc-top">
      <div class="hc-av" style="background:${colorOf(s.main_keyword)}">${esc(s.main_keyword.slice(0, 2))}</div>
      <div class="hc-id"><h3><a href="/upload/${esc(s.slug)}/" target="_blank" rel="noopener">${esc(s.main_keyword)}</a></h3>
        <p>${esc(s.company || '상호 미입력')} · <span class="mono">${esc(s.host)}</span></p></div>
      ${ring(s.score)}
    </div>
    <div class="hc-tags"><button type="button" class="seg-badge" data-seg-edit="${esc(s.slug)}" title="분류 바꾸기">🏷 ${esc(s.segment || UNSEG)}</button><span class="tpl-badge">🎨 ${esc(s.template)}</span>${sw}</div>
    <dl class="hc-stats">
      <div><dt>파일</dt><dd>${num(s.files)}</dd></div><div><dt>사진</dt><dd>${num(s.photos)}</dd></div><div><dt>영상</dt><dd>${num(s.videos)}</dd></div>
      <div><dt>전후 사례</dt><dd>${num(s.cases)}</dd></div><div><dt>지역</dt><dd>${num(s.regions)}</dd></div><div><dt>용량</dt><dd>${bytes(s.bytes)}</dd></div>
    </dl>
    ${missing.length ? `<p class="hc-miss" title="${esc(missing.map((c) => c.label).join(', '))}">채울 것: ${missing.slice(0, 3).map((c) => esc(c.label)).join(' · ')}${missing.length > 3 ? ` 외 ${missing.length - 3}` : ''}</p>` : '<p class="hc-miss ok">✅ 기본 항목 모두 완료</p>'}
    <div class="hc-foot"><span class="hc-ago">🕒 ${esc(ago(s.last_activity))}</span>
      <div class="hc-act">
        <a class="hb hb-p" href="/upload/${esc(s.slug)}/" target="_blank" rel="noopener">업로드 관리</a>
        <button type="button" class="hb" data-copy="${esc(s.slug)}" title="업체에 보낼 업로드 주소 복사">URL 복사</button>
        <a class="hb" href="https://${esc(s.host)}/" target="_blank" rel="noopener" title="키워드 사이트 열기">사이트 ↗</a>
        <button type="button" class="hb" data-grp="edit" data-slug="${esc(s.slug)}" title="키워드·지역·내용 수정">수정</button>
      </div></div>
  </article>`;
}

function filtered() {
  const q = S.q.trim().toLowerCase();
  let list = S.data.sites.filter((s) => (!q || `${s.main_keyword} ${s.company} ${s.host} ${s.segment}`.toLowerCase().includes(q))
    && (!S.seg || (s.segment || UNSEG) === S.seg)
    && (!S.need || (S.need === SW_NEED ? swPending(s) : s.checks.some((c) => c.id === S.need && !c.ok))));
  const by = { activity: (a, b) => (b.last_activity || 0) - (a.last_activity || 0), score: (a, b) => a.score - b.score, files: (a, b) => b.files - a.files, name: (a, b) => a.main_keyword.localeCompare(b.main_keyword, 'ko') }[S.sort];
  return list.sort(by);
}

function renderGroups() {
  const list = filtered();
  const segs = [...new Set(list.map((s) => s.segment || UNSEG))].sort((a, b) => (a === UNSEG) - (b === UNSEG) || a.localeCompare(b, 'ko'));
  const box = $('hub-groups');
  if (!list.length) { box.innerHTML = '<div class="empty">조건에 맞는 업체가 없습니다.</div>'; return; }
  box.innerHTML = segs.map((seg) => {
    const items = list.filter((s) => (s.segment || UNSEG) === seg), open = !S.closed.has(seg);
    const files = items.reduce((a, s) => a + s.files, 0), avg = Math.round(items.reduce((a, s) => a + s.score, 0) / items.length);
    return `<section class="hgroup${open ? ' open' : ''}"><button type="button" class="hg-hd" data-toggle="${esc(seg)}" aria-expanded="${open}">
      <span class="hg-name">${esc(seg)}</span><span class="hg-info">${items.length}곳 · 파일 ${num(files)} · 평균 완성도 ${avg}%</span><span class="hg-arrow" aria-hidden="true">▾</span></button>
      <div class="hg-grid">${items.map(card).join('')}</div></section>`;
  }).join('');
}

function renderRecent(rec) {
  if (!rec.length) return '';
  return `<section class="recent"><div class="sec-hd"><h2>최근 업로드</h2><span>업체가 올린 사진이 실시간으로 쌓입니다</span></div><div class="rc-row">${rec.map((r) => {
    const src = `/api/s/${encodeURIComponent(r.slug)}/file/${r.id}`;
    const media = r.type.startsWith('image/') ? `<img src="${src}" alt="${esc(r.name)}" loading="lazy">` : `<div class="rc-vid">▶</div>`;
    return `<a class="rc" href="/upload/${esc(r.slug)}/" target="_blank" rel="noopener" title="${esc(r.name)}">${media}<span class="rc-cap"><b>${esc(r.keyword)}</b>${esc(r.category_name || '')} · ${esc(ago(r.created_at))}</span></a>`;
  }).join('')}</div></section>`;
}

// ── 수리위키 본사이트 연동 한 줄: 관리센터 → suriwiki.com 빌드(매일 05:00 KST) → 키워드 사이트 푸터 링크
function renderLinkBar(d) {
  const sw = d.suriwiki || {};
  const linked = d.sites.filter((s) => s.suriwiki).length;
  const msg = sw.ok
    ? `✅ suriwiki.com 연동 중 · 파트너 카드 ${linked}/${d.sites.length}곳 노출 · 마지막 본사이트 빌드 ${esc(sw.built_at ? new Date(sw.built_at).toLocaleString('ko-KR') : '시각 미상')}`
    : '⏳ suriwiki.com 에 아직 partners.json 이 없습니다. 다음 본사이트 빌드(매일 05:00) 때 자동으로 연결됩니다.';
  return `<div class="swbar"><p>${msg}</p><div class="swbar-act">
    <a class="hb" href="https://suriwiki.com/#partners" target="_blank" rel="noopener">파트너 섹션 ↗</a>
    <a class="hb" href="/api/export/partners" target="_blank" rel="noopener">내보내기 데이터</a>
    <a class="hb" href="https://github.com/playskang-svg/rsuri/actions" target="_blank" rel="noopener">배포 현황 ↗</a></div></div>`;
}

function renderHub() {
  const d = S.data, segs = d.segments;
  const segChips = ['', ...segs, ...(d.sites.some((s) => !s.segment) ? [UNSEG] : [])].map((s) => `<button type="button" class="chip${S.seg === s ? ' on' : ''}" data-seg="${esc(s)}">${esc(s || '전체')}<em>${s ? d.sites.filter((x) => (x.segment || UNSEG) === s).length : d.sites.length}</em></button>`).join('');
  $('hub').innerHTML = `
    <div class="quick">
      <div><h2>업로드 관리 바로가기</h2><p>업체마다 전용 업로드 주소가 있습니다. 주소를 보내면 업체가 휴대폰으로 사진·정보를 직접 올립니다.</p></div>
      <div class="quick-act"><button type="button" class="qb qb-p" data-grp="new">＋ 새 업체 사이트</button><button type="button" class="qb qb-o" data-grp="import">📥 키워드 일괄 등록</button><button type="button" class="qb qb-g" id="copy-all-urls">🔗 업로드 주소 전체 복사</button></div>
    </div>
    ${d.noindex ? '<div class="rank-note">ℹ️ 키워드 사이트는 아직 검색 노출 차단(noindex) 상태입니다. 공개 전환은 registry/sites.json 의 noindex 값으로 결정합니다.</div>' : ''}
    ${renderLinkBar(d)}
    <div id="hub-todo">${renderTodo(d.sites)}</div>
    <div class="toolbar">
      <input type="search" id="hub-q" placeholder="업체·키워드·주소 검색" value="${esc(S.q)}" aria-label="업체 검색">
      <select id="hub-sort" aria-label="정렬">
        <option value="activity"${S.sort === 'activity' ? ' selected' : ''}>최근 활동순</option>
        <option value="score"${S.sort === 'score' ? ' selected' : ''}>완성도 낮은순</option>
        <option value="files"${S.sort === 'files' ? ' selected' : ''}>파일 많은순</option>
        <option value="name"${S.sort === 'name' ? ' selected' : ''}>이름순</option>
      </select>
    </div>
    <div class="chips" id="hub-segs">${segChips}</div>
    <div id="hub-groups"></div>
    ${renderRecent(d.recent)}`;
  renderGroups();
}

async function editSegment(slug) {
  const s = S.data.sites.find((x) => x.slug === slug); if (!s) return;
  const opts = [...new Set(['내부팀', '외부업체', '파트너', '수익쉐어', '테스트', ...S.data.segments])];
  const back = document.createElement('div'); back.className = 'sg-back';
  back.innerHTML = `<form class="sg" role="dialog" aria-modal="true" aria-label="분류 바꾸기"><h3>${esc(s.main_keyword)} 분류</h3><p>허브에서 묶어 보는 단위입니다. 사이트 내용에는 영향이 없습니다.</p>
    <input id="sg-in" list="sg-list" maxlength="20" value="${esc(s.segment)}" placeholder="예: 외부업체" autocomplete="off"><datalist id="sg-list">${opts.map((o) => `<option value="${esc(o)}">`).join('')}</datalist>
    <div class="sg-quick">${opts.map((o) => `<button type="button" data-v="${esc(o)}">${esc(o)}</button>`).join('')}<button type="button" data-v="">${UNSEG}</button></div>
    <div class="sg-ft"><button type="button" class="hb" data-cancel>취소</button><button type="submit" class="hb hb-p">저장</button></div></form>`;
  document.body.appendChild(back);
  const inp = back.querySelector('#sg-in'); inp.focus(); inp.select();
  const close = () => back.remove();
  back.addEventListener('click', (e) => { if (e.target === back || e.target.closest('[data-cancel]')) close(); const q = e.target.closest('[data-v]'); if (q) inp.value = q.dataset.v; });
  back.querySelector('form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const r = await fetch(`/api/groups/${slug}/segment`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ segment: inp.value.trim() }) }).then((x) => x.json()).catch(() => ({ ok: false }));
    if (!r.ok) { alert(r.error || '저장하지 못했습니다'); return; }
    s.segment = r.segment; S.data.segments = [...new Set(S.data.sites.map((x) => x.segment).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ko'));
    close(); renderHub(); toast(`'${s.main_keyword}' → ${r.segment || UNSEG}`);
  });
}

// ── 이벤트(한 번만 건다: 허브는 innerHTML 로 다시 그린다)
$('hub').addEventListener('input', (e) => { if (e.target.id === 'hub-q') { S.q = e.target.value; renderGroups(); } });
$('hub').addEventListener('change', (e) => { if (e.target.id === 'hub-sort') { S.sort = e.target.value; saveUi(); renderGroups(); } });
$('hub').addEventListener('click', (e) => {
  const t = e.target;
  const seg = t.closest('[data-seg]'); if (seg) { S.seg = seg.dataset.seg; renderHub(); return; }
  const need = t.closest('[data-need]'); if (need) { S.need = S.need === need.dataset.need ? '' : need.dataset.need; renderHub(); return; }
  const tg = t.closest('[data-toggle]'); if (tg) { const k = tg.dataset.toggle; S.closed.has(k) ? S.closed.delete(k) : S.closed.add(k); saveUi(); tg.parentElement.classList.toggle('open'); tg.setAttribute('aria-expanded', String(!S.closed.has(k))); return; }
  const cp = t.closest('[data-copy]'); if (cp) { copy(uploadUrl(cp.dataset.copy), `${uploadUrl(cp.dataset.copy)} 복사됨`); return; }
  const se = t.closest('[data-seg-edit]'); if (se) { editSegment(se.dataset.segEdit); return; }
  if (t.closest('#copy-all-urls')) { const l = filtered(); copy(l.map((s) => `${s.main_keyword}${s.company ? ` (${s.company})` : ''}: ${uploadUrl(s.slug)}`).join('\n'), `업로드 주소 ${l.length}개 복사됨`); }
});

async function load() {
  let d;
  try { d = await fetch('/api/hub', { cache: 'no-store' }).then((r) => r.json()); } catch (_) { d = null; }
  if (!d || !d.ok) { $('hub').innerHTML = '<div class="empty">업체 현황을 불러올 수 없습니다. 잠시 후 새로고침해 주세요.</div>'; return; }
  S.data = d; renderStats(d.totals); renderHub();
}
showTab(location.hash.slice(1));
load();
