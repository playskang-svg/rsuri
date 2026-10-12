// 대시보드의 메인 키워드 그룹 관리: 새로 만들기 · 수정 · 지금 반영(배포).
// 그룹을 저장하면 사이트(<주소>.suriwiki.com), 업로드 페이지(/upload/<주소>), 지역 페이지(/<지역>)가 같은 규칙으로 함께 생긴다.
const $ = (sel, root = document) => root.querySelector(sel);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let CATALOG = null;

async function api(path, opt) { const r = await fetch(path, opt); return r.json().catch(() => ({ ok: false, error: `오류 ${r.status}` })); }

function modal(html) {
  closeModal();
  const m = document.createElement('div'); m.className = 'gm-back'; m.id = 'gm';
  m.innerHTML = `<div class="gm" role="dialog" aria-modal="true">${html}</div>`;
  m.addEventListener('click', (e) => { if (e.target === m) closeModal(); });
  document.body.appendChild(m); return m;
}
const closeModal = () => { const m = $('#gm'); if (m) m.remove(); };
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

async function deploy(btn, out) {
  const orig = btn.textContent; btn.disabled = true; btn.textContent = '⏳ 요청 중...';
  const j = await api('/api/deploy', { method: 'POST' });
  out.textContent = j.message || (j.ok ? '배포를 시작했습니다.' : j.error || '실패'); out.style.color = j.ok ? '#15803d' : '#b45309';
  btn.textContent = orig; btn.disabled = false;
}

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
  const m = modal(`<div class="gm-hd"><h3>${slug ? '메인 키워드 그룹 수정' : '새 메인 키워드 그룹'}</h3><button type="button" class="gm-x" data-x aria-label="닫기">✕</button></div>
  <p class="gm-note">그룹 하나 = 사이트 하나(분양 단위)입니다. 저장하면 <b>사이트 · 업로드 페이지 · 지역 페이지</b>가 같은 방식으로 함께 만들어집니다.</p>
  <div class="gm-body">
    <label>주소 이름 (영문 소문자·숫자·하이픈)<input id="gf-slug" maxlength="40" placeholder="예: baegwan-nusu" value="${esc(g.slug)}"${slug ? ' readonly' : ''}></label>
    <div class="gm-hint" id="gf-host">${slug ? `https://${esc(g.slug)}.suriwiki.com` : '주소: https://<주소 이름>.suriwiki.com'}</div>
    <label>메인 키워드<input id="gf-kw" maxlength="20" placeholder="예: 배관누수" value="${esc(g.main_keyword)}"></label>
    <label>영문 라벨 (선택)<input id="gf-en" maxlength="40" placeholder="예: PIPE LEAK REPAIR" value="${esc(g.en)}"></label>
    <label>서브 키워드 (3~8개, 한 줄에 하나)<textarea id="gf-subs" rows="6" placeholder="누수 탐지&#10;급수관 교체&#10;배수관 막힘">${esc(g.subs.join('\n'))}</textarea></label>
    <div class="gm-lbl">지역 (선택한 지역마다 지역 페이지가 만들어집니다) <button type="button" class="gm-mini" data-all>전체 선택</button> <button type="button" class="gm-mini" data-none>전체 해제</button></div>
    <div class="gm-chips" id="gf-regions">${regionBoxes}</div>
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
    if (e.target.closest('[data-none]')) m.querySelectorAll('#gf-regions input').forEach((i) => { i.checked = false; });
    if (e.target.closest('[data-refresh]')) {
      const keep = collectGuide(m), subs = $('#gf-subs', m).value.split('\n').map((x) => x.trim()).filter(Boolean);
      $('#gf-guide', m).innerHTML = guideRows(subs, keep);
    }
  });
  $('#gf-save', m).addEventListener('click', () => save(m, !!slug));
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
  const canDeploy = CATALOG && CATALOG.deploy && CATALOG.deploy.enabled;
  const m = modal(`<div class="gm-hd"><h3>${isEdit ? '저장했습니다' : '그룹을 만들었습니다'}</h3><button type="button" class="gm-x" data-x aria-label="닫기">✕</button></div>
  <div class="gm-body"><p class="gm-note">${esc(j.group.main_keyword)} 그룹이 저장되었습니다. 아래가 함께 만들어집니다.</p>
    <ul class="gm-list"><li>사이트: <b>https://${esc(j.host)}/</b> <small>(지역 페이지 ${j.group.regions.length}개)</small></li>
    <li>업로드 페이지: <a href="${esc(j.upload)}" target="_blank" rel="noopener">${esc(j.upload)}</a></li></ul>
    <p class="gm-hint">사이트와 지역 페이지는 <b>배포 때</b> 만들어집니다. 새 주소는 첫 배포 때 도메인이 연결되며 몇 분 걸릴 수 있습니다. ${canDeploy ? '' : '자동 배포는 매일 05:00(KST)입니다.'}</p>
    <div class="gm-deploy"><button type="button" class="gm-btn" id="gd-btn"${canDeploy ? '' : ' disabled'}>🚀 지금 반영</button><span id="gd-out" class="gm-hint"></span></div>
    ${canDeploy ? '' : '<p class="gm-hint">‘지금 반영’은 GitHub 토큰(GH_DISPATCH_TOKEN)을 등록하면 켜집니다.</p>'}</div>
  <div class="gm-ft"><button type="button" class="gm-btn ghost" id="gd-close">닫고 새로고침</button></div>`);
  m.addEventListener('click', (e) => { if (e.target.closest('[data-x]') || e.target.closest('#gd-close')) { closeModal(); location.reload(); } });
  $('#gd-btn', m).addEventListener('click', (e) => deploy(e.currentTarget, $('#gd-out', m)));
}

export function initGroups() {
  document.addEventListener('click', async (e) => {
    const t = e.target.closest('[data-grp]'); if (!t) return;
    e.preventDefault();
    if (t.dataset.grp === 'new') openForm(null);
    if (t.dataset.grp === 'edit') openForm(t.dataset.slug);
    if (t.dataset.grp === 'deploy') {
      if (!CATALOG) { const j = await api('/api/groups'); CATALOG = { regions: j.regions || [], deploy: j.deploy || {} }; }
      const box = modal(`<div class="gm-hd"><h3>지금 반영</h3><button type="button" class="gm-x" data-x aria-label="닫기">✕</button></div><div class="gm-body"><p class="gm-note">저장된 그룹·사진·정보를 키워드 사이트에 바로 반영합니다(배포).</p><div class="gm-deploy"><button type="button" class="gm-btn" id="gd-btn">🚀 배포 시작</button><span id="gd-out" class="gm-hint"></span></div></div>`);
      box.addEventListener('click', (ev) => { if (ev.target.closest('[data-x]')) closeModal(); });
      $('#gd-btn', box).addEventListener('click', (ev) => deploy(ev.currentTarget, $('#gd-out', box)));
    }
  });
}
