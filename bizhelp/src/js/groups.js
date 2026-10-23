// 대시보드의 메인 키워드 그룹 관리: 새로 만들기 · 수정 · 일괄 등록. 저장만 한다(사이트 반영은 매일 05:00 KST 정기 배포).
// 그룹을 저장하면 사이트(<주소>.suriwiki.com), 업로드 페이지(/upload/<주소>), 지역 페이지(/<지역>)가 같은 규칙으로 함께 생긴다.
const $ = (sel, root = document) => root.querySelector(sel);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let CATALOG = null;

async function api(path, opt) { const r = await fetch(path, opt); if (r.status === 401) { location.reload(); return { ok: false, error: '로그인이 필요합니다' }; } return r.json().catch(() => ({ ok: false, error: `오류 ${r.status}` })); }

function modal(html) {
  closeModal();
  const m = document.createElement('div'); m.className = 'gm-back'; m.id = 'gm';
  m.innerHTML = `<div class="gm" role="dialog" aria-modal="true">${html}</div>`;
  m.addEventListener('click', (e) => { if (e.target === m) closeModal(); });
  document.body.appendChild(m); return m;
}
const closeModal = () => { const m = $('#gm'); if (m) m.remove(); };
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

function guideRows(subs, guide) {
  return subs.map((s) => { const g = (guide || {})[s] || {}; return `<div class="gm-guide" data-sub="${esc(s)}"><b>${esc(s)}</b>
    <input class="g-target" maxlength="120" placeholder="대상 (예: 노후된 욕실을 전체 교체하려는 경우)" value="${esc(g.target || '')}">
    <input class="g-time" maxlength="120" placeholder="소요 시간 (예: 3~5일 안팎)" value="${esc(g.time || '')}">
    <input class="g-point" maxlength="160" placeholder="특징 (예: 타일 전에 방수가 먼저 진행됩니다)" value="${esc(g.point || '')}"></div>`; }).join('');
}

async function openForm(slug) {
  if (!CATALOG) { const j = await api('/api/groups'); CATALOG = { regions: j.regions || [], deploy: j.deploy || {} }; }
  let g = { slug: '', main_keyword: '', en: '', subs: [], regions: [], content: { headline: '', lead: '', symptoms: [], guide: {} } };
  if (slug) { const j = await api(`/api/groups/${slug}`); if (!j.ok) { alert(j.error || '불러오지 못했습니다'); return; } g = j.group; }
  const c = g.content || {};
  const regionBoxes = CATALOG.regions.map((r) => `<label class="gm-chip"><input type="checkbox" value="${esc(r.slug)}"${g.regions.includes(r.slug) ? ' checked' : ''}>${esc(r.name)}</label>`).join('');
  const m = modal(`<div class="gm-hd"><h3>${slug ? '메인 키워드 그룹 편집' : '새 메인 키워드 그룹'}</h3><button type="button" class="gm-x" data-x aria-label="닫기">✕</button></div>
  <p class="gm-note">그룹 하나 = 사이트 하나(분양 단위)입니다. 저장하면 <b>사이트 · 업로드 페이지 · 지역 페이지</b>가 같은 방식으로 함께 만들어집니다.</p>
  <div class="gm-body">
    <label>주소 이름 (영문 소문자·숫자·하이픈)<input id="gf-slug" maxlength="40" placeholder="예: baegwan-nusu" value="${esc(g.slug)}"${slug ? ' readonly' : ''}></label>
    <div class="gm-hint" id="gf-host">${slug ? `https://${esc(g.slug)}.suriwiki.com` : '주소: https://<주소 이름>.suriwiki.com'}</div>
    <label>메인 키워드<input id="gf-kw" maxlength="20" placeholder="예: 배관누수" value="${esc(g.main_keyword)}"></label>
    <label>영문 라벨 (선택)<input id="gf-en" maxlength="40" placeholder="예: PIPE LEAK REPAIR" value="${esc(g.en)}"></label>
    <label>서브 키워드 (3~8개, 한 줄에 하나)<textarea id="gf-subs" rows="6" placeholder="누수 탐지&#10;급수관 교체&#10;배수관 막힘">${esc(g.subs.join('\n'))}</textarea></label>
    <div class="gm-lbl">지역 (선택한 지역마다 지역 페이지가 만들어집니다) <button type="button" class="gm-mini" data-all>전체 선택</button> <button type="button" class="gm-mini" data-none>전체 해제</button></div>
    <div class="gm-chips" id="gf-regions">${regionBoxes}</div>
    <div class="gm-add"><input id="gf-newregion" maxlength="12" placeholder="목록에 없는 지역 이름 (예: 광주)"><button type="button" class="gm-mini" data-addregion>＋ 지역 추가</button></div>
    <details class="gm-det"${(c.headline || c.symptoms?.length || Object.keys(c.guide || {}).length) ? ' open' : ''}><summary>페이지 내용 (선택 — 비워 두면 키워드로 자동 생성)</summary>
      <label>대표 문구 (질문형 한 줄)<input id="gf-headline" maxlength="60" placeholder="예: 집 어딘가에서 물이 새고 있나요?" value="${esc(c.headline || '')}"></label>
      <label>소개 문장<textarea id="gf-lead" rows="2" maxlength="220" placeholder="예: 누수 탐지부터 급수관·배수관까지 — 원인 위치를 먼저 확인합니다.">${esc(c.lead || '')}</textarea></label>
      <label>증상 (최대 8개, 한 줄에 하나)<textarea id="gf-symptoms" rows="4" placeholder="천장 물 얼룩&#10;수도 계량기 회전">${esc((c.symptoms || []).join('\n'))}</textarea></label>
      <div class="gm-lbl">서브 키워드별 안내 (대상 · 소요 시간 · 특징) <button type="button" class="gm-mini" data-refresh>서브 키워드 반영</button></div>
      <div id="gf-guide">${guideRows(g.subs, c.guide)}</div>
      <p class="gm-hint">소요 시간은 일반적인 작업 기준으로 적고, 금액은 적지 않는 것을 권합니다.</p></details>
    <div class="gm-err" id="gf-err"></div>
  </div>
  <div class="gm-ft"><button type="button" class="gm-btn ghost" data-x>취소</button><button type="button" class="gm-btn" id="gf-save">${slug ? '저장' : '그룹 만들기'}</button></div>`);
  const slugIn = $('#gf-slug', m);
  slugIn.addEventListener('input', () => { $('#gf-host', m).textContent = `https://${slugIn.value || '<주소 이름>'}.suriwiki.com`; });
  m.addEventListener('click', (e) => {
    if (e.target.closest('[data-x]')) closeModal();
    if (e.target.closest('[data-all]')) m.querySelectorAll('#gf-regions input').forEach((i) => { i.checked = true; });
    if (e.target.closest('[data-addregion]')) addRegionFromForm(m);
    if (e.target.closest('[data-none]')) m.querySelectorAll('#gf-regions input').forEach((i) => { i.checked = false; });
    if (e.target.closest('[data-refresh]')) {
      const keep = collectGuide(m), subs = $('#gf-subs', m).value.split('\n').map((x) => x.trim()).filter(Boolean);
      $('#gf-guide', m).innerHTML = guideRows(subs, keep);
    }
  });
  $('#gf-save', m).addEventListener('click', () => save(m, !!slug));
}
async function addRegionFromForm(m) {
  const inp = $('#gf-newregion', m), name = inp.value.trim(), err = $('#gf-err', m); err.textContent = '';
  if (!name) return;
  const j = await api('/api/regions', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name }) });
  if (!j.ok) { err.textContent = j.error || '추가하지 못했습니다'; return; }
  CATALOG.regions = j.regions;
  const box = $('#gf-regions', m);
  let el = box.querySelector(`input[value="${j.region.slug}"]`);
  if (!el) { const l = document.createElement('label'); l.className = 'gm-chip'; l.innerHTML = `<input type="checkbox" value="${esc(j.region.slug)}">${esc(j.region.name)}`; box.appendChild(l); el = l.querySelector('input'); }
  el.checked = true; inp.value = '';
}
const collectGuide = (m) => Object.fromEntries([...m.querySelectorAll('.gm-guide')].map((d) => [d.dataset.sub, { target: $('.g-target', d).value, time: $('.g-time', d).value, point: $('.g-point', d).value }]));

async function save(m, isEdit) {
  const err = $('#gf-err', m), btn = $('#gf-save', m); err.textContent = '';
  const subs = $('#gf-subs', m).value.split('\n').map((x) => x.trim()).filter(Boolean);
  // 서브 키워드 줄이 바뀌었으면 안내 입력칸도 맞춘다
  const guide = collectGuide(m);
  const body = {
    main_keyword: $('#gf-kw', m).value, en: $('#gf-en', m).value, subs, regions: [...m.querySelectorAll('#gf-regions input:checked')].map((i) => i.value),
    content: { headline: $('#gf-headline', m).value, lead: $('#gf-lead', m).value, symptoms: $('#gf-symptoms', m).value.split('\n'), guide },
  };
  btn.disabled = true; const orig = btn.textContent; btn.textContent = '저장 중...';
  const j = await api(`/api/groups/${encodeURIComponent($('#gf-slug', m).value.trim().toLowerCase())}`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  btn.disabled = false; btn.textContent = orig;
  if (!j.ok) { err.textContent = j.error || '저장하지 못했습니다'; return; }
  done(j, isEdit);
}

function done(j, isEdit) {
  const m = modal(`<div class="gm-hd"><h3>${isEdit ? '저장했습니다' : '그룹을 만들었습니다'}</h3><button type="button" class="gm-x" data-x aria-label="닫기">✕</button></div>
  <div class="gm-body"><p class="gm-note">${esc(j.group.main_keyword)} 그룹이 저장되었습니다. 아래가 함께 만들어집니다.</p>
    <ul class="gm-list"><li>사이트: <b>https://${esc(j.host)}/</b> <small>(지역 페이지 ${j.group.regions.length}개)</small></li>
    <li>업로드 페이지: <a href="${esc(j.upload)}" target="_blank" rel="noopener">${esc(j.upload)}</a></li></ul>
    <p class="gm-hint">사이트와 지역 페이지는 다음 정기 배포(매일 05:00 KST) 때 만들어집니다. 새 주소는 첫 배포 때 도메인이 연결되며 몇 분 걸릴 수 있습니다.</p></div>
  <div class="gm-ft"><button type="button" class="gm-btn ghost" id="gd-close">닫고 새로고침</button></div>`);
  m.addEventListener('click', (e) => { if (e.target.closest('[data-x]') || e.target.closest('#gd-close')) { closeModal(); location.reload(); } });
}


// ── 키워드 일괄 등록: 한 줄 = 그룹 하나.  메인키워드 | 서브키워드(쉼표) | 지역(쉼표) | 주소이름(선택)
const SAMPLE = '천장도색 | 천장 도색, 곰팡이 도색, 누수 자국 도색 | 안산, 고양, 수원\n벽면방수 | 벽면 방수, 외벽 방수, 옥상 방수 | 인천, 부천 | wall-waterproof';
function parseLines(text) {
  return text.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#')).map((l) => {
    const p = l.split(/\t|\|/).map((x) => x.trim());
    return { main_keyword: p[0] || '', subs: (p[1] || '').split(/[,，、]/).map((x) => x.trim()).filter(Boolean), regions: (p[2] || '').split(/[,，、]/).map((x) => x.trim()).filter(Boolean), slug: p[3] || '' };
  });
}
function openImport() {
  const m = modal(`<div class="gm-hd"><h3>키워드 일괄 등록</h3><button type="button" class="gm-x" data-x aria-label="닫기">✕</button></div>
  <div class="gm-body"><p class="gm-note">한 줄에 그룹 하나를 적습니다: <b>메인키워드 | 서브키워드(쉼표로 3~8개) | 지역(쉼표) | 주소 이름(선택)</b><br>엑셀에서 복사해 붙여 넣어도 됩니다(탭 구분). 주소 이름을 비우면 한글 키워드에서 자동으로 만들고, 같은 키워드가 이미 있으면 그 그룹을 갱신합니다.</p>
    <textarea id="gi-text" rows="9" placeholder="${esc(SAMPLE)}"></textarea>
    <label class="gm-chip" style="margin-top:10px"><input type="checkbox" id="gi-auto" checked>목록에 없는 지역은 자동으로 추가</label>
    <div id="gi-result" class="gm-resbox"></div><div class="gm-err" id="gi-err"></div></div>
  <div class="gm-ft"><button type="button" class="gm-btn ghost" data-x>닫기</button><button type="button" class="gm-btn ghost" id="gi-check">검증</button><button type="button" class="gm-btn" id="gi-apply" disabled>등록</button></div>`);
  const run = async (apply) => {
    const rows = parseLines($('#gi-text', m).value), err = $('#gi-err', m); err.textContent = '';
    if (!rows.length) { err.textContent = '등록할 줄을 입력하세요'; return null; }
    const j = await api('/api/groups/import', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ rows, apply, auto_regions: $('#gi-auto', m).checked }) });
    if (!j.ok) { err.textContent = j.error || '요청에 실패했습니다'; return null; }
    return j;
  };
  const show = (j) => {
    const sm = j.summary;
    $('#gi-result', m).innerHTML = `<div class="gm-sum">${j.applied ? '등록 완료' : '검증 결과'}: 전체 ${sm.total}줄 · 성공 ${sm.ok}(새로 ${sm.created} · 갱신 ${sm.updated}) · 실패 ${sm.failed}${sm.new_regions ? ` · 새 지역 ${sm.new_regions}곳` : ''}</div>
      <table class="gm-tbl"><tbody>${j.results.map((r) => `<tr class="${r.ok ? 'ok' : 'bad'}"><td>${r.line}</td><td>${esc(r.main_keyword)}</td><td>${r.ok ? `${r.action === 'update' ? '갱신' : '새로 만듦'} · ${esc(r.host)} · 지역 ${r.region_count}개${r.new_regions && r.new_regions.length ? ` (새 지역: ${esc(r.new_regions.join(', '))})` : ''}` : `✕ ${esc(r.error || '')}`}</td></tr>`).join('')}</tbody></table>`;
  };
  $('#gi-check', m).addEventListener('click', async () => { const j = await run(false); if (j) { show(j); $('#gi-apply', m).disabled = !j.summary.ok; } });
  $('#gi-apply', m).addEventListener('click', async () => {
    const btn = $('#gi-apply', m); btn.disabled = true; const j = await run(true); if (!j) { btn.disabled = false; return; }
    show(j); btn.style.display = 'none'; $('#gi-check', m).style.display = 'none';
    $('#gi-err', m).style.color = '#475569'; $('#gi-err', m).textContent = '저장되었습니다. 사이트는 다음 정기 배포(매일 05:00 KST) 때 반영됩니다.';
    const ft = m.querySelector('.gm-ft'); ft.insertAdjacentHTML('afterbegin', '<button type="button" class="gm-btn ghost" id="gi-reload">닫고 새로고침</button>');
    $('#gi-reload', m).addEventListener('click', () => { closeModal(); location.reload(); });
  });
  m.addEventListener('click', (e) => { if (e.target.closest('[data-x]')) closeModal(); });
}

export function initGroups() {
  document.addEventListener('click', async (e) => {
    const t = e.target.closest('[data-grp]'); if (!t) return;
    e.preventDefault();
    if (t.dataset.grp === 'new') openForm(null);
    if (t.dataset.grp === 'import') openImport();
    if (t.dataset.grp === 'edit') openForm(t.dataset.slug);
  });
}
