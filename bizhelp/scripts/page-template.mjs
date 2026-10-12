// 키워드 사이트 템플릿 — 기준 사이트(wrapping.koreajipsurimaster.com)의 홈/지역 페이지 구조를 그대로 따른다.
//  홈(/)      : 헤더 → 히어로(슬라이더+문구) + 정보바 → 작업 사진 → 안내 표 → 서비스 6종 → 진행 과정 → 본문 SEO → 지역 카드 6개 → FAQ 6 → 상담 CTA → 푸터
//  지역(/<지역>): 헤더 → 히어로 → 작업 사진 → 한눈에 보기 → 서비스(서브키워드) 6종 → 지역 안내 → 허브(대표+지역 5) → FAQ 5 → 상담 CTA → 푸터
//  /sangdam   : 상담 안내
// 본문은 샘플 문구다. 가격·소요시간·연락처·사업자정보 등 확인되지 않은 사실은 넣지 않는다. 사진은 자리표시자.
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const json = (o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, "\\u003c")}</script>`;

const CSS = `:root{--bg:#FFFFFF;--sub:#F2F4F7;--ink:#1B1F24;--mute:#6B7280;--primary:#1A3159;--accent:#4472B8;--line:#E5E7EB;}
html,body{background:var(--bg);color:var(--ink);}
body{font-family:'Pretendard','Noto Sans KR',system-ui,sans-serif;font-weight:400;word-break:keep-all;overflow-wrap:break-word;-webkit-font-smoothing:antialiased;}
h1,h2,h3{font-weight:400;letter-spacing:-0.01em;}
img{max-width:100%;height:auto;}
.max-w-prose-fix{max-width:68ch;}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:.55rem;padding:.85rem 1.7rem;border-radius:.2rem;font-weight:600;font-size:.9rem;letter-spacing:.02em;transition:all .2s;}
.btn-primary{background:var(--primary);color:#fff;}
.btn-primary:hover{background:var(--accent);}
.btn-outline{background:transparent;color:#fff;border:1px solid rgba(255,255,255,.7);}
.btn-outline:hover{background:rgba(255,255,255,.1);}
.btn-ghost{background:transparent;color:var(--ink);border-bottom:1px solid var(--ink);border-radius:0;padding-left:0;padding-right:0;}
.card{background:#fff;border:1px solid var(--line);border-radius:.2rem;overflow:hidden;transition:transform .3s ease;}
.card:hover{transform:translateY(-2px);}
.fade-up{opacity:0;transform:translateY(20px);transition:opacity .6s ease,transform .6s ease;}
.fade-up.is-visible{opacity:1;transform:translateY(0);}
.hero-shadow{text-shadow:0 2px 10px rgba(0,0,0,.55), 0 1px 2px rgba(0,0,0,.4);}
.hero-overlay-thin{background:linear-gradient(180deg,rgba(0,0,0,0) 45%,rgba(0,0,0,.38) 100%);}
.float-btn{position:fixed;right:18px;bottom:18px;z-index:60;}
.pulse-ring{position:absolute;inset:0;border-radius:9999px;border:1.5px solid var(--primary);opacity:.6;animation:pulseRing 3s ease-out infinite;}
@keyframes pulseRing{0%{transform:scale(.95);opacity:.6}70%{transform:scale(1.4);opacity:0}100%{transform:scale(1.55);opacity:0}}
.faq summary{cursor:pointer;list-style:none;}
.faq summary::-webkit-details-marker{display:none;}
.faq[open] summary .chev{transform:rotate(180deg);}
.chev{transition:transform .3s ease;}
.scroll-mt{scroll-margin-top:5rem;}
.eyebrow{display:inline-flex;align-items:center;gap:.7rem;font-size:.72rem;font-weight:600;letter-spacing:.22em;text-transform:uppercase;color:var(--primary);}
.num-label{font-size:.75rem;font-weight:600;letter-spacing:.1em;color:var(--accent);}
.muted{color:var(--mute);}
.photo-fig{position:relative;border-radius:.2rem;overflow:hidden;background:var(--sub);}
.ba-tag{position:absolute;top:.6rem;left:.6rem;z-index:1;background:rgba(255,255,255,.95);color:var(--ink);font-size:.65rem;font-weight:700;letter-spacing:.05em;padding:.2rem .6rem;border-radius:.15rem;}
.ba-tag.after{background:var(--primary);color:#fff;}
.ph{display:flex;align-items:center;justify-content:center;width:100%;height:100%;color:rgba(255,255,255,.75);font-size:.7rem;font-weight:600;letter-spacing:.12em;}
@media (max-width: 768px){ h1{font-size:1.95rem!important;line-height:1.22!important;} h2{font-size:1.4rem!important;line-height:1.32!important;} }
@media (max-width: 480px){ h1{font-size:1.7rem!important;line-height:1.24!important;} h2{font-size:1.22rem!important;} }`;

const LOGO = `<svg viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect x="4" y="4" width="28" height="28" rx="2" fill="#1A3159"/><rect x="9" y="9" width="14" height="18" fill="white" fill-opacity="0.92"/><path d="M23 9 L28 9 L28 14 Z" fill="#4472B8"/><path d="M23 9 L28 14 L23 14 Z" fill="white" fill-opacity="0.55"/></svg>`;
const CHEV = `<svg class="chev shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6 9l6 6 6-6"/></svg>`;
const PHONE = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z"/></svg>`;
const UP = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 15l6-6 6 6"/></svg>`;
const GRAD = ["#3b5b8c,#1a3159", "#5a7bb0,#2c4a7a", "#7d92b5,#3f5a86", "#4a6a9c,#1f3a66", "#6f87ad,#34507d", "#2f4d7c,#16294a"];
// 이미지 슬롯: site-images/<slug>/<name>.webp 가 있으면 사진, 없으면 자리표시자
let IMGS = new Set();
export const setImages = (names) => { IMGS = new Set(names); };
const img = (name, alt, i = 0, extra = "") => IMGS.has(name)
  ? `<img src="/img/${name}.webp" alt="${esc(alt)}" class="w-full h-full object-cover ${extra}" loading="lazy" decoding="async">`
  : ph(i, "");
const ph = (i, label = "") => `<div class="ph" style="background:linear-gradient(135deg,${GRAD[i % GRAD.length]})">${esc(label)}</div>`;

const TW = `<script>tailwind.config={theme:{extend:{colors:{brand:{bg:'#FFFFFF',sub:'#F2F4F7',ink:'#1B1F24',mute:'#6B7280',primary:'#1A3159',accent:'#4472B8',line:'#E5E7EB'}},fontFamily:{sans:['Pretendard','Noto Sans KR','system-ui','sans-serif']}}}};</script>`;

function head({ title, desc, keywords, canonical, brandName, sample, ogLabel, ogImage }) {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="keywords" content="${esc(keywords)}">
<meta name="author" content="${esc(brandName)}">
<meta name="robots" content="${sample ? "noindex, nofollow" : "index, follow"}">
<link rel="canonical" href="${esc(canonical)}">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:site_name" content="${esc(ogLabel)}">${ogImage ? `
<meta property="og:image" content="${esc(ogImage)}">
<meta name="twitter:image" content="${esc(ogImage)}">` : ""}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://cdn.tailwindcss.com">
<script src="https://cdn.tailwindcss.com"></script>
${TW}
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css">
<style>${CSS}</style>
</head>`;
}

const header = (c) => `<header class="fixed top-0 inset-x-0 z-50 backdrop-blur bg-white/90 border-b border-brand-line">
  <div class="max-w-7xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
    <a href="/" class="flex items-center gap-2.5"><span class="shrink-0">${LOGO}</span>
      <span class="flex flex-col leading-tight"><span class="text-[15px] font-semibold text-brand-ink">${esc(c.brand)} ${esc(c.kw)}</span><span class="text-[10px] muted tracking-widest uppercase">${esc(c.en)}</span></span></a>
    <a href="/sangdam" class="btn btn-primary text-sm py-2.5 px-5">상담 문의</a>
  </div>
</header>
<div class="h-16"></div>`;

// 업로드 페이지에서 입력된 사이트 정보(전화·블로그·유튜브). 값이 없으면 아무것도 그리지 않는다.
const telHref = (p) => `tel:${String(p).replace(/[^0-9+]/g, "")}`;
const extUrl = (v) => { const s = String(v || "").trim(); return /^https?:\/\//i.test(s) ? s : ""; };
const contactItems = (c) => {
  const p = c.profile || {};
  return (p.phone ? `<li class="opacity-80 leading-relaxed pt-2"><span class="block text-[11px] uppercase tracking-widest opacity-60">CONTACT</span><a class="inline-block mt-1 font-semibold text-white" href="${esc(telHref(p.phone))}">${esc(p.phone)}</a></li>` : "")
    + (extUrl(p.blog) ? `<li><a href="${esc(extUrl(p.blog))}" target="_blank" rel="noopener" class="opacity-80 hover:opacity-100 transition">블로그</a></li>` : "")
    + (extUrl(p.youtube) ? `<li><a href="${esc(extUrl(p.youtube))}" target="_blank" rel="noopener" class="opacity-80 hover:opacity-100 transition">유튜브</a></li>` : "");
};
const footer = (c) => `<footer class="bg-brand-ink text-white/90">
  <div class="max-w-7xl mx-auto px-5 sm:px-8 py-14 grid gap-10 sm:grid-cols-2 md:grid-cols-3">
    <div class="sm:col-span-2 md:col-span-2">
      <a href="/" class="inline-flex items-center gap-2.5"><span class="shrink-0">${LOGO}</span>
        <span class="flex flex-col leading-tight"><span class="text-base font-semibold text-white">${esc(c.brand)} ${esc(c.kw)}</span><span class="text-[10px] tracking-widest uppercase opacity-60">${esc(c.en)}</span></span></a>
      <p class="mt-5 text-sm leading-relaxed opacity-75 max-w-md">${esc(c.subs.slice(0, 3).join("·"))} 등 ${esc(c.kw)}를 안내합니다. 지역별 페이지에서 가까운 지역을 확인하세요.</p>
    </div>
    <div>
      <p class="text-xs font-semibold tracking-widest uppercase opacity-70 mb-4">바로가기</p>
      <ul class="space-y-2.5 text-sm">
        <li><a href="/sangdam" class="opacity-80 hover:opacity-100 transition">상담 안내</a></li>${contactItems(c)}
      </ul>
    </div>
  </div>
  <div class="border-t border-white/10"><div class="max-w-7xl mx-auto px-5 sm:px-8 py-5 text-[12px] opacity-60 flex flex-wrap items-center justify-between gap-3">
    <span>© 2026 ${esc(c.brand)} ${esc(c.kw)}.</span></div></div>
</footer>`;

const tail = (itemList) => `${itemList}
<div class="float-btn"><a href="/sangdam" class="relative inline-flex items-center gap-2 bg-brand-primary text-white font-semibold px-5 py-3.5 rounded-full shadow-xl"><span class="pulse-ring"></span>${PHONE}<span>상담 문의</span></a></div>
<button id="topBtn" aria-label="맨 위로" class="fixed left-4 bottom-4 z-50 hidden w-11 h-11 rounded-full bg-white border border-brand-line text-brand-ink shadow-lg items-center justify-center">${UP}</button>
<script defer>
var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('is-visible');io.unobserve(e.target);}});},{threshold:.1});
document.querySelectorAll('.fade-up').forEach(function(el){io.observe(el);});
var topBtn=document.getElementById('topBtn');
window.addEventListener('scroll',function(){if(window.scrollY>400)topBtn.classList.add('!flex');else topBtn.classList.remove('!flex');},{passive:true});
topBtn&&topBtn.addEventListener('click',function(){window.scrollTo({top:0,behavior:'smooth'});});
</script>
</body>
</html>`;

const works = (c, n, id = "works") => `<section class="py-16 sm:py-20 scroll-mt" id="${id}"><div class="max-w-7xl mx-auto px-5 sm:px-8">
  <div class="flex flex-wrap items-end justify-between gap-4 mb-9 fade-up"><div><span class="eyebrow">시공 사례</span>
    <h2 class="mt-3 text-3xl sm:text-4xl font-normal tracking-tight">${esc(c.title)} 작업 사진</h2>
    <p class="mt-3 text-sm muted max-w-xl">작업 전후 사진입니다.</p></div>
    <a href="/sangdam" class="btn btn-ghost text-sm">사진 보내고 상담하기</a></div>
  <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">${Array.from({ length: n }, (_, i) => `<article class="fade-up"><div class="grid grid-cols-2 gap-2 sm:gap-3">
    <figure class="photo-fig aspect-[4/5]"><span class="ba-tag">BEFORE</span>${img(`ba-${i + 1}-before`, `${c.title} 작업 전`, i * 2)}</figure>
    <figure class="photo-fig aspect-[4/5]"><span class="ba-tag after">AFTER</span>${img(`ba-${i + 1}-after`, `${c.title} 작업 후`, i * 2 + 1)}</figure></div></article>`).join("")}</div></div></section>`;

const services = (c, eyebrow, h2, lead, id = "service") => `<section class="py-16 sm:py-20" id="${id}"><div class="max-w-7xl mx-auto px-5 sm:px-8">
  <div class="max-w-2xl fade-up"><span class="eyebrow">${esc(eyebrow)}</span><h2 class="mt-3 text-3xl sm:text-4xl font-normal tracking-tight">${esc(h2)}</h2>${lead ? `<p class="mt-4 text-sm muted leading-relaxed">${esc(lead)}</p>` : ""}</div>
  <div class="mt-10 grid grid-cols-2 md:grid-cols-3 gap-3.5 sm:gap-5">${c.subs.map((s, i) => `<div class="card p-5 sm:p-6 fade-up"><span class="num-label">${String(i + 1).padStart(2, "0")}</span>
    <h3 class="mt-3 text-[15px] font-semibold text-brand-ink">${esc(s)}</h3><p class="mt-2 text-[13px] muted leading-relaxed">${esc(c.region ? c.region + " 지역 " : "")}${esc(s)} 문의를 받습니다. 현장 사진을 보내 주시면 확인 후 안내합니다.</p></div>`).join("")}</div></div></section>`;

const faqBlock = (items) => `<section class="py-16 sm:py-20 scroll-mt" id="faq"><div class="max-w-4xl mx-auto px-5 sm:px-8">
  <div class="fade-up"><span class="eyebrow">자주 묻는 질문</span><h2 class="mt-3 text-3xl sm:text-4xl font-normal tracking-tight">FAQ</h2><p class="mt-3 text-sm muted">의뢰 전에 가장 많이 확인하시는 항목을 모았습니다.</p></div>
  <div class="mt-9 divide-y divide-brand-line border-t border-b border-brand-line">${items.map(([q, a], i) => `<details class="faq"${i === 0 ? " open" : ""}><summary class="flex items-center justify-between gap-4 py-5"><span class="text-[15px] sm:text-base font-semibold text-brand-ink">${esc(q)}</span>${CHEV}</summary>
    <div class="pb-6 -mt-1 text-[14px] leading-relaxed text-brand-mute max-w-prose-fix">${esc(a)}</div></details>`).join("")}</div></div></section>
${json({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: items.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) })}`;

const cta = (c, title) => `<section class="py-20 sm:py-28 bg-brand-ink text-white relative overflow-hidden" id="cta"><div class="max-w-5xl mx-auto px-5 sm:px-8 relative"><div class="text-center fade-up">
  <span class="eyebrow !text-white/70">상담 안내</span>
  <h2 class="mt-4 text-3xl sm:text-4xl md:text-5xl font-normal tracking-tight">${esc(title)}</h2>
  <p class="mt-5 text-white/75 max-w-2xl mx-auto leading-relaxed">${esc(c.kw)}는 현장 상태에 따라 방식이 달라 사진이 있어야 정확한 안내가 가능합니다. 사진과 지역을 보내 주시면 확인 후 회신합니다.</p>
  <div class="mt-9 flex flex-wrap items-center justify-center gap-3"><a href="/sangdam" class="btn !bg-white !text-brand-ink hover:!bg-brand-accent hover:!text-white">상담 페이지로 이동</a></div>
  <div class="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 max-w-xl mx-auto text-center text-[11px] sm:text-[12px] uppercase tracking-widest text-white/60">
    <div class="border-t border-white/15 pt-4">사진·지역만 전송</div><div class="border-t border-white/15 pt-4">현장 확인 후 안내</div><div class="border-t border-white/15 pt-4">지역별 안내</div></div></div></div></section>`;

const regionCard = (c, p, i, labelText) => `<a href="${esc(p.page_path)}" class="card group block"><div class="aspect-[16/11] bg-brand-sub overflow-hidden"><div class="w-full h-full transition-transform duration-700 group-hover:scale-105">${img(`card-${(i % 4) + 1}`, `${p.h1_title} 시공 사례`, i + 2)}</div></div>
  <div class="p-3.5 sm:p-5"><span class="num-label">${labelText}</span><h3 class="mt-1 text-sm sm:text-base font-semibold text-brand-ink line-clamp-1">${esc(p.h1_title)}</h3>
  <p class="mt-0.5 text-[12px] sm:text-[13px] muted line-clamp-2 leading-relaxed">${esc(p.region)} ${esc(c.kw)} 안내. ${esc(c.subs[0])} 등 상담.</p></div></a>`;

function ctx(site, meta, data, extra = {}) {
  return { profile: extra.profile || {}, site, brand: data.business_name || "수리위키", kw: meta.main_keyword, en: meta.en || "", subs: meta.sub_keywords, sample: !!data.sample, host: site, ...extra };
}
const businessLd = (c) => {
  const p = c.profile || {};
  const same = [extUrl(p.blog), extUrl(p.youtube)].filter(Boolean);
  return json({ "@context": "https://schema.org", "@type": "HomeAndConstructionBusiness", name: `${c.brand} ${c.kw}`, url: `https://${c.host}/`, ...(p.phone ? { telephone: p.phone } : {}), ...(same.length ? { sameAs: same } : {}) });
};
const itemListLd = (c, pages) => json({ "@context": "https://schema.org", "@type": "ItemList", name: `${c.brand} ${c.kw} 페이지 목록`,
  itemListElement: [{ "@type": "ListItem", position: 1, url: `https://${c.host}/`, name: c.kw }, ...pages.map((p, i) => ({ "@type": "ListItem", position: i + 2, url: `https://${c.host}${p.page_path}`, name: p.h1_title }))] });

export function homePage({ site, meta, pages, data, profile }) {
  const c = ctx(site, meta, data, { title: meta.main_keyword, profile });
  const desc = `${c.kw} 안내 페이지입니다. ${c.subs.slice(0, 3).join("·")} 등 ${c.kw}를 지역별로 확인하세요. 사진과 지역을 보내 주시면 확인 후 안내합니다.`;
  const kwMeta = [c.kw, ...c.subs.slice(0, 4), c.brand].join(", ");
  const faq = [
    [`${c.kw}는 어떤 경우에 필요한가요?`, `${c.subs.slice(0, 3).join(", ")} 등 ${c.kw} 관련 상담이 필요한 경우입니다. 현장 사진을 보내 주시면 가능 여부를 확인해 드립니다.`],
    [`진행 기간은 얼마나 걸리나요?`, `작업 범위와 현장 상태에 따라 다릅니다. 정확한 일정은 상담 시 안내합니다.`],
    [`비용은 어떻게 정해지나요?`, `현장 상태와 작업 범위에 따라 달라지므로 확인 후 안내합니다. 이 페이지는 금액을 단정하지 않습니다.`],
    [`일부만 진행할 수도 있나요?`, `${c.subs[c.subs.length - 1]}처럼 필요한 부분만 진행하는 것도 상담할 수 있습니다.`],
    [`어느 지역까지 가능한가요?`, `아래 지역별 ${c.kw} 안내에서 확인하시고, 없는 지역은 문의해 주세요.`],
    [`상담은 어떻게 신청하나요?`, `상담 페이지에서 현장 사진과 지역을 남겨 주시면 순서대로 확인 후 연락드립니다.`],
  ];
  const six = pages.slice(0, 6);
  return `${head({ title: c.kw, desc, keywords: kwMeta, canonical: `https://${c.host}/`, brandName: c.brand, sample: c.sample, ogLabel: `${c.brand} ${c.kw}`, ogImage: IMGS.has("hero-1") ? `https://${c.host}/img/hero-1.webp` : "" })}
<body class="bg-brand-bg text-brand-ink">
${header(c)}
${json({ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "홈", item: `https://${c.host}/` }] })}
<section class="relative" id="top"><div class="grid grid-cols-1 md:grid-cols-2">
  <div class="relative h-[46vh] md:h-[74vh] min-h-[360px] max-h-[800px] overflow-hidden order-1">
    ${[0, 1, 2].map((i) => `<div class="hero-slide absolute inset-0" data-index="${i}" style="opacity:${i === 0 ? 1 : 0};transition:opacity .8s ease;z-index:${i === 0 ? 1 : 0};">${img(`hero-${i + 1}`, `${c.kw} 시공 사례`, i)}</div>`).join("")}
    <div class="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">${[0, 1, 2].map((i) => `<button class="hero-dot" data-target="${i}" aria-label="슬라이드 ${i + 1}" style="width:${i === 0 ? 22 : 7}px;height:7px;border-radius:9999px;border:none;cursor:pointer;background:${i === 0 ? "#fff" : "rgba(255,255,255,.5)"};transition:width .3s,background .3s;padding:0;"></button>`).join("")}</div>
  </div>
  <div class="order-2 flex items-center bg-brand-ink text-white px-6 sm:px-10 md:px-14 py-14 md:py-0 md:h-[74vh]"><div>
    <span class="eyebrow !text-white/70">${esc(c.en)}</span>
    <h1 class="mt-4 text-4xl sm:text-5xl md:text-6xl font-normal tracking-tight">${esc(c.kw)}</h1>
    <p class="mt-4 max-w-md text-base sm:text-lg text-white/80 leading-relaxed">${esc(c.subs.slice(0, 3).join("·"))} ${esc(c.kw)}<br>지역별 페이지에서 가까운 지역을 확인하세요</p>
    <div class="mt-7 flex flex-wrap gap-3"><a href="/sangdam" class="btn btn-primary">상담 문의</a><a href="#works" class="btn btn-outline">시공사례 보기</a></div></div></div></div>
  <div class="bg-brand-ink text-white/85"><div class="max-w-7xl mx-auto px-5 sm:px-8 py-5 grid grid-cols-2 md:grid-cols-4 gap-4 text-center text-[12.5px] sm:text-sm">
    ${[["대응 시간", "상담 시 안내"], ["대상 지역", `${pages.length}개 지역 안내`], ["진행 방식", "현장 확인 후 안내"], ["문의 방법", "사진 · 지역 전송"]].map(([a, b]) => `<div><span class="block text-[11px] uppercase tracking-widest opacity-60">${a}</span><span class="mt-1 inline-block font-semibold text-white">${b}</span></div>`).join("")}</div></div>
</section>
${works(c, 4)}
<section class="py-16 sm:py-20 bg-brand-sub"><div class="max-w-7xl mx-auto px-5 sm:px-8">
  <div class="max-w-2xl fade-up"><span class="eyebrow">진행 전 확인 사항</span><h2 class="mt-3 text-3xl sm:text-4xl font-normal tracking-tight">${esc(c.kw)} 유형별 안내</h2>
  <p class="mt-4 text-sm muted leading-relaxed">현장 상태와 범위에 따라 방식과 일정이 달라집니다. 대표 유형을 정리했습니다.</p></div>
  <div class="mt-10 overflow-x-auto fade-up"><table class="w-full text-sm border-collapse"><thead><tr class="border-b border-brand-line text-left">
    <th class="py-3 pr-4 font-semibold text-brand-ink">항목</th><th class="py-3 pr-4 font-semibold text-brand-ink">대상</th><th class="py-3 pr-4 font-semibold text-brand-ink">소요 시간</th><th class="py-3 font-semibold text-brand-ink">특징</th></tr></thead>
  <tbody class="divide-y divide-brand-line muted">${c.subs.slice(0, 4).map((s) => `<tr><td class="py-3 pr-4">${esc(s)}</td><td class="py-3 pr-4">현장 확인 후 안내</td><td class="py-3 pr-4">상담 시 안내</td><td class="py-3">사진 확인 후 안내</td></tr>`).join("")}</tbody></table></div></div></section>
${services(c, "서비스", `${c.kw} 종류`, `${c.subs.slice(0, 3).join(", ")} 등 ${c.kw}를 한 곳에서 안내합니다.`)}
<section class="py-16 sm:py-20 bg-brand-sub" id="process"><div class="max-w-7xl mx-auto px-5 sm:px-8">
  <div class="max-w-2xl fade-up"><span class="eyebrow">진행 과정</span><h2 class="mt-3 text-3xl sm:text-4xl font-normal tracking-tight">사진 한 장이 상담의 시작입니다</h2><p class="mt-3 text-sm muted">현장 사진과 지역을 받으면, 다음과 같은 흐름으로 진행됩니다.</p></div>
  <div class="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">${[["사진·지역 전송", "현장 사진 1~3장과 지역을 보내 주세요."], ["확인·안내", "사진을 보고 가능 여부와 진행 방식을 회신합니다."], ["방문·진행", "협의한 일정에 방문해 작업을 진행합니다."], ["정리·확인", "마무리 후 상태를 함께 확인합니다."]].map(([t, d], i) => `<div class="card p-6 fade-up"><span class="text-3xl font-normal text-brand-accent leading-none">${String(i + 1).padStart(2, "0")}</span><h3 class="mt-3 text-base font-semibold text-brand-ink">${t}</h3><p class="mt-2 text-[13.5px] muted leading-relaxed">${d}</p></div>`).join("")}</div></div></section>
<section class="py-14 sm:py-16"><div class="max-w-4xl mx-auto px-5 sm:px-8 fade-up"><span class="eyebrow">${esc(c.kw)} 안내</span>
  <h2 class="mt-3 text-3xl sm:text-4xl font-normal tracking-tight">${esc(c.kw)}, 먼저 확인할 것</h2>
  <div class="mt-6 space-y-5 text-[15px] leading-relaxed text-brand-ink/90 max-w-prose-fix">
    <p>${esc(c.kw)}는 ${esc(c.subs.slice(0, 3).join(", "))} 등 여러 작업을 포함합니다. 현장 상태에 따라 필요한 범위가 다르므로, 사진으로 상태를 먼저 확인하는 것이 정확합니다.</p>
    <h3 class="text-xl font-semibold text-brand-ink mt-8">상담 전에 준비하면 좋은 것</h3>
    <ul class="list-disc pl-5 space-y-1.5 marker:text-brand-accent"><li>문제가 있는 부분의 사진 1~3장</li><li>위치(지역)와 건물 유형</li><li>원하는 작업 범위</li><li>가능한 일정</li></ul>
    <h3 class="text-xl font-semibold text-brand-ink mt-8">작업 종류별 차이</h3>
    <p>${esc(c.subs.slice(0, 3).join(", "))}은 작업 방식과 일정이 서로 다릅니다. 같은 이름의 작업이라도 현장 조건에 따라 달라질 수 있어 확인 후 안내합니다.</p>
    <h3 class="text-xl font-semibold text-brand-ink mt-8">지역별 안내</h3>
    <p>아래 지역별 페이지에서 가까운 지역의 ${esc(c.kw)} 안내를 확인할 수 있습니다. 없는 지역은 문의해 주세요.</p>
  </div><p class="mt-8 text-[12px] muted">최종수정일 ${esc(data.dates?.[0] || "")}</p></div></section>
<section class="py-16 sm:py-20 scroll-mt bg-brand-sub" id="area"><div class="max-w-7xl mx-auto px-5 sm:px-8">
  <div class="flex items-end justify-between flex-wrap gap-3 mb-9 fade-up"><div><span class="eyebrow">연관 페이지</span><h2 class="mt-3 text-3xl sm:text-4xl font-normal tracking-tight">지역별 ${esc(c.kw)} 보기</h2>
  <p class="mt-3 text-sm muted max-w-xl">가까운 지역 페이지에서 안내를 확인하세요.</p></div></div>
  <div class="grid grid-cols-2 md:grid-cols-3 gap-3.5 sm:gap-6">${six.map((p, i) => regionCard(c, p, i, "지역 페이지")).join("")}</div></div></section>
${faqBlock(faq)}
${cta(c, "사진과 지역만 보내주세요")}
<script defer>(function(){var s=document.querySelectorAll('.hero-slide'),d=document.querySelectorAll('.hero-dot');if(!s.length)return;var cur=0,t;
function go(n){s[cur].style.opacity='0';s[cur].style.zIndex='0';d[cur].style.width='7px';d[cur].style.background='rgba(255,255,255,.45)';cur=(n+s.length)%s.length;s[cur].style.opacity='1';s[cur].style.zIndex='1';d[cur].style.width='22px';d[cur].style.background='#4472B8';}
function auto(){t=setInterval(function(){go(cur+1);},5000);}d.forEach(function(x){x.addEventListener('click',function(){go(parseInt(x.dataset.target));clearInterval(t);auto();});});auto();})();</script>
${footer(c)}
${tail(businessLd(c) + itemListLd(c, pages))}`;
}

export function regionPage({ site, meta, page, pages, data, profile }) {
  const region = page.region, c = ctx(site, meta, data, { region, title: page.h1_title, profile });
  const hub = pages.filter((p) => p.page_path !== page.page_path).slice(0, 5);
  const desc = `${region} 전 지역 ${c.kw} 안내입니다. ${c.subs.slice(0, 3).join("·")} 등을 상담합니다. 사진과 지역을 보내 주시면 확인 후 안내합니다.`;
  const kwMeta = [page.h1_title, ...c.subs.slice(0, 3).map((s) => `${region} ${s}`), c.brand].join(", ");
  const faq = [
    [`${region} ${c.kw}는 어떤 경우에 필요한가요?`, `${c.subs.slice(0, 3).join(", ")} 등이 필요한 경우입니다. ${region} 현장 사진을 보내 주시면 확인해 드립니다.`],
    [`진행 기간은 얼마나 걸리나요?`, `작업 범위와 현장 상태에 따라 다릅니다. 상담 시 안내합니다.`],
    [`비용은 어떻게 정해지나요?`, `현장 확인 후 안내합니다. 이 페이지는 금액을 단정하지 않습니다.`],
    [`${region} 어느 곳까지 가능한가요?`, `${region} 지역 안에서 가능 여부를 사진과 위치로 확인합니다.`],
    [`상담은 어떻게 신청하나요?`, `상담 페이지에서 현장 사진과 ${region} 내 위치를 남겨 주세요.`],
  ];
  return `${head({ title: page.h1_title, desc, keywords: kwMeta, canonical: `https://${c.host}${page.page_path}`, brandName: c.brand, sample: c.sample, ogLabel: `${c.brand} ${c.kw}` })}
<body class="bg-brand-bg text-brand-ink">
${header(c)}
${json({ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "홈", item: `https://${c.host}/` }, { "@type": "ListItem", position: 2, name: page.h1_title, item: `https://${c.host}${page.page_path}` }] })}
<section class="relative"><div class="relative h-[46vh] sm:h-[58vh] min-h-[320px] sm:min-h-[460px] max-h-[680px] overflow-hidden">
  <div class="absolute inset-0">${img("wide", `${page.h1_title} 시공 사례`, 0)}</div><div class="absolute inset-0 hero-overlay-thin"></div>
  <div class="absolute inset-0 flex items-end pb-14 sm:pb-20"><div class="max-w-7xl mx-auto px-5 sm:px-8 w-full text-white">
    <span class="eyebrow !text-white">${esc(page.region_slug.toUpperCase())}</span>
    <h1 class="mt-3 sm:mt-4 text-4xl sm:text-6xl md:text-7xl font-normal tracking-tight hero-shadow">${esc(page.h1_title)}</h1>
    <p class="mt-2 sm:mt-3 max-w-xl text-sm sm:text-base lg:text-lg text-white/90 leading-relaxed hero-shadow">${esc(region)} 전 지역 — ${esc(c.subs.slice(0, 3).join("·"))} ${esc(c.kw)}</p>
    <div class="mt-7 flex flex-wrap gap-3"><a href="/sangdam" class="btn btn-primary">상담 문의</a><a href="/" class="btn btn-outline">메인페이지</a></div></div></div></div></section>
${works(c, 2)}
<section class="py-14 sm:py-16 bg-brand-sub"><div class="max-w-4xl mx-auto px-5 sm:px-8 fade-up"><span class="eyebrow">${esc(region)} 정보</span>
  <h2 class="mt-3 text-2xl sm:text-3xl font-normal tracking-tight">한눈에 보는 ${esc(c.kw)} 정보</h2>
  <div class="mt-6 overflow-x-auto"><table class="w-full text-sm border-collapse"><tbody class="divide-y divide-brand-line">
    <tr><td class="py-3 pr-4 font-semibold text-brand-ink w-36">대상 지역</td><td class="py-3 muted">${esc(region)} 전 지역</td></tr>
    <tr><td class="py-3 pr-4 font-semibold text-brand-ink">대표 서비스</td><td class="py-3 muted">${esc(c.subs.slice(0, 3).join(", "))} 외</td></tr>
    <tr><td class="py-3 pr-4 font-semibold text-brand-ink">소요 시간·비용</td><td class="py-3 muted">현장 확인 후 안내</td></tr>
    <tr><td class="py-3 pr-4 font-semibold text-brand-ink">문의 방법</td><td class="py-3 muted">사진 · 지역 전송</td></tr></tbody></table></div>
  <p class="mt-8 text-[12px] muted">최종수정일 ${esc(data.dates?.[0] || "")}</p></div></section>
${services(c, "대표 서비스", `${region}에서 자주 받는 의뢰`, "")}
<section class="py-14 sm:py-16"><div class="max-w-4xl mx-auto px-5 sm:px-8 fade-up"><span class="eyebrow">${esc(region)} 안내</span>
  <h2 class="mt-3 text-2xl sm:text-3xl font-normal tracking-tight">${esc(page.h1_title)}, 어떻게 진행되나요</h2>
  <div class="mt-5 space-y-4 text-[15px] leading-relaxed text-brand-ink/90 max-w-prose-fix">
    <p>${esc(region)} 지역의 ${esc(c.kw)} 문의는 ${esc(c.subs.slice(0, 2).join(", "))} 등이 많습니다. 현장 상태에 따라 범위가 달라 사진으로 먼저 확인합니다.</p>
    <h3 class="text-xl font-semibold mt-8">${esc(region)}에서 자주 나오는 요청</h3>
    <ul class="list-disc pl-5 space-y-1.5 marker:text-brand-accent">${c.subs.slice(0, 4).map((s) => `<li>${esc(s)}</li>`).join("")}</ul>
    <h3 class="text-xl font-semibold mt-8">문의 안내</h3>
    <p>의뢰는 <a href="/sangdam" class="underline font-semibold">상담 안내</a> 페이지에서 현장 사진과 ${esc(region)} 내 위치를 함께 보내 주시면 회신이 빠릅니다.</p></div></div></section>
<section class="py-16 sm:py-20 scroll-mt bg-brand-sub" id="area"><div class="max-w-7xl mx-auto px-5 sm:px-8">
  <div class="flex items-end justify-between flex-wrap gap-3 mb-9 fade-up"><div><span class="eyebrow">${esc(c.kw)} 안내</span><h2 class="mt-3 text-3xl sm:text-4xl font-normal tracking-tight">다른 지역 ${esc(c.kw)} 보기</h2>
  <p class="mt-3 text-sm muted max-w-xl">대표 페이지와 다른 지역 안내에서 더 확인할 수 있습니다.</p></div></div>
  <div class="grid grid-cols-2 md:grid-cols-3 gap-3.5 sm:gap-6">
    <a href="/" class="card group block"><div class="aspect-[16/11] bg-brand-sub overflow-hidden"><div class="w-full h-full transition-transform duration-700 group-hover:scale-105">${img("hero-1", `${c.kw} 시공 사례`, 0)}</div></div>
    <div class="p-3.5 sm:p-5"><span class="num-label">대표 페이지</span><h3 class="mt-1 text-sm sm:text-base font-semibold text-brand-ink line-clamp-1">${esc(c.kw)}</h3><p class="mt-0.5 text-[12px] sm:text-[13px] muted line-clamp-2 leading-relaxed">${esc(c.subs.slice(0, 3).join("·"))} 지역별 안내 모음.</p></div></a>
    ${hub.map((p, i) => regionCard(c, p, i, "지역 페이지")).join("")}</div></div></section>
${faqBlock(faq)}
${cta(c, `${region} ${c.kw}, 사진과 지역만 보내주세요`)}
${footer(c)}
${tail(itemListLd(c, [page, ...hub]))}`;
}

export function sangdamPage({ site, meta, data, profile }) {
  const c = ctx(site, meta, data, { title: "상담 안내", profile });
  return `${head({ title: `상담 안내 | ${c.kw}`, desc: `${c.kw} 상담 안내 페이지입니다. 사진과 지역을 보내 주세요.`, keywords: `${c.kw}, 상담`, canonical: `https://${c.host}/sangdam`, brandName: c.brand, sample: c.sample, ogLabel: `${c.brand} ${c.kw}` })}
<body class="bg-brand-bg text-brand-ink">${header(c)}
<section class="py-20 sm:py-28"><div class="max-w-3xl mx-auto px-5 sm:px-8"><span class="eyebrow">상담 안내</span>
  <h1 class="mt-3 text-3xl sm:text-5xl font-normal tracking-tight">${esc(c.kw)} 상담</h1>
  <p class="mt-5 text-brand-ink/80 leading-relaxed">현장 사진과 지역을 보내 주시면 확인 후 회신합니다. 현장 사진과 지역을 남겨 주세요.</p>
  <div class="mt-9 flex flex-wrap gap-3">${c.profile.phone ? `<a href="${esc(telHref(c.profile.phone))}" class="btn btn-primary">전화 ${esc(c.profile.phone)}</a>` : ""}<a href="/" class="btn ${c.profile.phone ? "btn-ghost" : "btn-primary"}">메인페이지</a></div></div></section>
${footer(c)}
${tail("")}`;
}
