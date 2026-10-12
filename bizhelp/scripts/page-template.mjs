// 키워드 페이지 / 사이트 메인 페이지 템플릿. 구조 = 헤더 → 히어로 → 작업 사진 → 한눈에 보기 → 서브키워드 카드(대표 서비스)
// → 지역 안내 → 허브(메인 + 다른 지역 5개) → FAQ → 마감 CTA → 푸터.
// 본문은 모두 샘플 문구다. 가격·전화번호·사업자 정보 등 확인되지 않은 사실은 넣지 않는다.
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const head = (title, desc) => `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>${esc(title)}</title><meta name="description" content="${esc(desc)}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/css/keyword-page.css"></head>`;

const header = (site, meta, base) => `<header class="kp-header"><div class="kp-wrap kp-bar">
  <a class="kp-brand" href="${base}"><span class="kp-logo"></span><span><b>${esc(meta.main_keyword)}</b><small>${esc(site)}</small></span></a>
  <a class="kp-btn" href="#cta">상담 문의</a></div></header><div class="kp-note">샘플 페이지입니다 — 내용은 예시이며 실제 업체 정보가 아닙니다</div>`;

const footer = (site, meta, base, today) => `<footer class="kp-footer"><div class="kp-wrap"><b>${esc(meta.main_keyword)}</b>
  <p>사업자 정보 · 연락처는 실제 데이터 연결 후 표시됩니다 (샘플).</p><p><a href="${base}">${esc(site)}</a> · 최종수정일 ${today}</p></div></footer>
<a class="kp-float" href="#cta">상담 문의</a></body></html>`;

export function keywordPage({ site, meta, page, siblings, base, today }) {
  const region = page.region, kw = page.h1_title;
  const subs = meta.sub_keywords;
  const hub = siblings.filter((p) => p.page_path !== page.page_path).slice(0, 5);
  const faq = [
    [`${region} ${meta.main_keyword}는 어디까지 가능한가요?`, `${region} 지역 안에서 ${subs.slice(0, 3).join("·")} 등을 상담합니다. 정확한 범위는 사진과 위치를 보내 주시면 안내합니다.`],
    [`상담은 어떻게 시작하나요?`, `현장 사진과 지역을 보내 주시면 확인 후 회신합니다.`],
    [`비용은 어떻게 정해지나요?`, `현장 상태와 작업 범위에 따라 달라지므로 확인 후 안내합니다. 이 페이지는 금액을 단정하지 않습니다.`],
    [`일정은 얼마나 걸리나요?`, `작업 범위에 따라 다릅니다. 상담 시 예상 일정을 함께 안내합니다.`],
    [`다른 지역도 가능한가요?`, `아래 '다른 지역 ${meta.main_keyword} 보기'에서 안내 중인 지역을 확인하세요.`],
  ];
  return `${head(kw, `${region} ${meta.main_keyword} 안내 (샘플)`)}<body>${header(site, meta, base)}
<section class="kp-hero"><div class="kp-wrap"><span class="kp-eyebrow">${esc(page.region_slug.toUpperCase())}</span>
  <h1>${esc(kw)}</h1><p>${esc(region)} 전 지역 — ${esc(subs.slice(0, 3).join(" · "))}</p>
  <div class="kp-actions"><a class="kp-btn" href="#cta">상담 문의</a><a class="kp-btn ghost" href="${base}">메인페이지</a></div></div></section>

<section class="kp-sec"><div class="kp-wrap"><span class="kp-eyebrow dark">시공 사례</span><h2>${esc(kw)} 작업 사진</h2>
  <p class="kp-muted">시공 전후 사진이 들어가는 영역입니다 (샘플).</p>
  <div class="kp-grid2">${[1, 2].map((n) => `<article class="kp-ba"><figure><span>BEFORE</span></figure><figure class="after"><span>AFTER</span></figure></article>`).join("")}</div></div></section>

<section class="kp-sec alt"><div class="kp-wrap narrow"><span class="kp-eyebrow dark">${esc(region)} 정보</span><h2>한눈에 보는 정보</h2>
  <table class="kp-table"><tbody>
  <tr><th>대상 지역</th><td>${esc(region)} 전 지역</td></tr><tr><th>대표 서비스</th><td>${esc(subs.slice(0, 3).join(", "))} 외</td></tr>
  <tr><th>문의 방법</th><td>사진 · 지역 전송</td></tr><tr><th>소요 시간·비용</th><td>현장 확인 후 안내</td></tr></tbody></table>
  <p class="kp-small">최종수정일 ${today} · 샘플 데이터</p></div></section>

<section class="kp-sec"><div class="kp-wrap"><span class="kp-eyebrow dark">대표 서비스</span><h2>${esc(region)}에서 자주 받는 의뢰</h2>
  <div class="kp-cards">${subs.map((s, i) => `<div class="kp-card"><span class="kp-num">${String(i + 1).padStart(2, "0")}</span><h3>${esc(s)}</h3><p>${esc(region)} 지역 ${esc(s)} 문의를 받습니다.</p></div>`).join("")}</div></div></section>

<section class="kp-sec"><div class="kp-wrap narrow"><span class="kp-eyebrow dark">${esc(region)} 안내</span><h2>${esc(kw)}, 어떻게 진행되나요</h2>
  <div class="kp-prose"><h3>1. 사진과 지역 전달</h3><p>현장 사진과 ${esc(region)} 내 위치를 보내 주세요.</p>
  <h3>2. 범위 확인</h3><p>${esc(subs.slice(0, 2).join(", "))} 등 필요한 작업 범위를 확인합니다.</p>
  <h3>3. 일정 협의</h3><p>가능한 일정과 방법을 안내해 드립니다.</p></div></div></section>

<section class="kp-sec alt" id="area"><div class="kp-wrap"><span class="kp-eyebrow dark">${esc(meta.main_keyword)} 안내</span><h2>다른 지역 ${esc(meta.main_keyword)} 보기</h2>
  <div class="kp-hub"><a class="kp-hubcard main" href="${base}"><b>메인페이지</b><small>${esc(meta.main_keyword)} 전체 지역</small></a>
  ${hub.map((p) => `<a class="kp-hubcard" href="${esc(p.page_path)}"><b>${esc(p.h1_title)}</b><small>${esc(p.region)} 안내 보기</small></a>`).join("")}</div></div></section>

<section class="kp-sec"><div class="kp-wrap narrow"><span class="kp-eyebrow dark">FAQ</span><h2>자주 묻는 질문</h2>
  ${faq.map(([q, a]) => `<details class="kp-faq"><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join("")}</div></section>

<section class="kp-cta" id="cta"><div class="kp-wrap"><h2>사진과 지역만 보내주세요</h2><p>${esc(kw)} 상담은 사진과 지역을 함께 보내 주시면 빠릅니다. (샘플 — 연결 전)</p></div></section>
${footer(site, meta, base, today)}`;
}

export function sitePage({ site, meta, pages, base, today }) {
  return `${head(`${meta.main_keyword} · ${site}`, `${meta.main_keyword} 지역별 안내 (샘플)`)}<body>${header(site, meta, base)}
<section class="kp-hero"><div class="kp-wrap"><span class="kp-eyebrow">MAIN</span><h1>${esc(meta.main_keyword)}</h1>
  <p>${esc(meta.sub_keywords.slice(0, 3).join(" · "))} 등 · ${pages.length}개 지역</p></div></section>
<section class="kp-sec"><div class="kp-wrap"><span class="kp-eyebrow dark">지역별 안내</span><h2>${esc(meta.main_keyword)} 지역 선택</h2>
  <div class="kp-hub">${pages.map((p) => `<a class="kp-hubcard" href="${esc(p.page_path)}"><b>${esc(p.h1_title)}</b><small>${esc(p.region)} 안내 보기</small></a>`).join("")}</div></div></section>
<section class="kp-sec alt"><div class="kp-wrap narrow"><span class="kp-eyebrow dark">서비스</span><h2>${esc(meta.main_keyword)} 서비스 종류</h2>
  <div class="kp-cards">${meta.sub_keywords.map((s, i) => `<div class="kp-card"><span class="kp-num">${String(i + 1).padStart(2, "0")}</span><h3>${esc(s)}</h3></div>`).join("")}</div></div></section>
<section class="kp-cta" id="cta"><div class="kp-wrap"><h2>사진과 지역만 보내주세요</h2><p>(샘플 — 연결 전)</p></div></section>
${footer(site, meta, base, today)}`;
}
