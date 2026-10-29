// 키워드 사이트 템플릿 — 네이버 1페이지 노출 구조(참고: doorcare-kr.com)의 섹션 구성을 따른다. 문구·색·이미지는 우리 것이다.
//  홈(/)         : 헤더 → 히어로(+전/후 썸네일) → 신뢰 배지 → 작업 항목 → 증상 → 전후 비교 슬라이더 → 진행 절차 → 서비스 지역 → FAQ → 체크하고 문자 보내기 → CTA → 푸터 → 하단 고정 바
//  지역(/<지역>)  : 같은 틀 + 지역 소개 · 가까운 지역 · 지역 전용 사진/문구(업로드 시)
//  /sangdam      : 체크하고 문자 보내기만 있는 상담 페이지
// 데이터: meta.content = { headline, lead, symptoms[], guide{서브키워드→{target,time,point}} }  (그룹 정의에 들어 있다)
// 확인되지 않은 사실(가격·A/S·결제 조건·영업 방식)은 쓰지 않는다. 문의 번호·사업자 정보는 업로드 페이지 입력값(없으면 기본값).

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const jsonLd = (o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, "\\u003c")}</script>`;
const eunNeun = (w) => { const ch = String(w).trim().slice(-1).charCodeAt(0); return ch >= 0xac00 && ch <= 0xd7a3 && (ch - 0xac00) % 28 !== 0 ? "은" : "는"; };
const digits = (v) => String(v || "").replace(/[^0-9]/g, "");
const telHref = (p) => `tel:${digits(p)}`;
const extUrl = (v) => { const s = String(v || "").trim(); return /^https?:\/\//i.test(s) ? s : ""; };
const regnoFmt = (v) => { const d = digits(v); return d.length === 10 ? `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}` : String(v || "").trim(); };
const intlTel = (v) => { const d = digits(v); return d.length === 11 ? `+82-${d.slice(1, 3)}-${d.slice(3, 7)}-${d.slice(7)}` : d ? `+82${d.replace(/^0/, "")}` : ""; };

// ── 이미지 슬롯: 사진이 있으면 <img>, 없으면 빈 자리(회색 박스). src 는 build 가 정한 경로 지도(SRC)를 따른다.
let IMGS = new Set();
let SRC = {};
export const setImages = (names, src = {}) => { IMGS = new Set(names); SRC = src; };
const hasImg = (name) => IMGS.has(name);
const imgSrc = (name) => SRC[name] || `/img/${name}.webp`;
// 첫 화면(LCP) 사진만 eager + fetchpriority=high, 나머지는 lazy
const imgTag = (name, alt, extra = "", eager = false) => (hasImg(name) ? `<img ${extra} src="${esc(imgSrc(name))}" alt="${esc(alt)}" ${eager ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"'} decoding="async">` : "");

// ── 푸터 채널 아이콘
const ICONS = {
  instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>',
  youtube: '<rect x="2.5" y="5.5" width="19" height="13" rx="4"/><path d="M10 9.5l5 2.5-5 2.5z" fill="currentColor" stroke="none"/>',
  naver: '<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M8.5 16.5v-9l7 9v-9"/>',
  facebook: '<path d="M14 8h2.2V5H13.5C11.5 5 10 6.5 10 8.5V11H8v3h2v6h3v-6h2.2l.5-3H13V8.8c0-.5.3-.8 1-.8z"/>',
  threads: '<circle cx="12" cy="12" r="9"/><text x="12" y="16.5" text-anchor="middle" font-size="12" font-weight="700" stroke="none" fill="currentColor">@</text>',
  tiktok: '<path d="M14 4v10.5a3.5 3.5 0 1 1-3.5-3.5M14 4c.5 2.5 2 4 4.5 4.2"/>',
  x: '<path d="M5 5l14 14M19 5L5 19"/>',
  kakao: '<path d="M12 4C7 4 3.5 7 3.5 10.8c0 2.4 1.6 4.5 4 5.7L6.7 20l4-2.5c.4.1.8.1 1.3.1 5 0 8.5-3 8.5-6.8S17 4 12 4z"/>',
  web: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
};
const platformOf = (url) => {
  let h = ""; try { h = new URL(url).hostname.toLowerCase(); } catch (_) { return "web"; }
  const is = (...d) => d.some((x) => h === x || h.endsWith("." + x));
  if (is("instagram.com")) return "instagram"; if (is("youtube.com", "youtu.be")) return "youtube"; if (is("naver.com")) return "naver";
  if (is("facebook.com", "fb.com", "fb.me")) return "facebook"; if (is("threads.net", "threads.com")) return "threads"; if (is("tiktok.com")) return "tiktok";
  if (is("x.com", "twitter.com")) return "x"; if (is("kakao.com")) return "kakao"; return "web";
};
const linkList = (p) => {
  const all = [{ name: "카카오톡", url: p.kakao }, { name: "인스타그램", url: p.instagram }, { name: "블로그", url: p.blog }, { name: "유튜브", url: p.youtube }, { name: "스레드", url: p.threads }, { name: "웹사이트", url: p.website }, ...(Array.isArray(p.services) ? p.services : [])];
  const seen = new Set();
  return all.filter((x) => x && extUrl(x.url) && (x.name || "").trim()).filter((x) => { const k = extUrl(x.url).replace(/\/+$/, "").toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
};

// ── 컨텍스트
function ctx(site, meta, data, extra = {}) {
  const p = extra.profile || {};
  const content = meta.content || {};
  return {
    site, host: site, kw: meta.main_keyword, en: meta.en || "", subs: meta.sub_keywords || [], content, profile: p, noindex: !!data.noindex,
    phone: digits(p.phone), phoneShow: p.phone || "", updated: data.updated || "", pages: extra.pages || [], media: extra.media || {},
    tpl: extra.tpl || { id: "consult", hero: "image", heroSlot: 3, photoSlots: 4, compareCols: 2, themeCss: "", home: [], region: [] },
  };
}
const guideOf = (c, sub) => (c.content.guide || {})[sub] || null;
const timeLine = (c, n = 3) => c.subs.map((x) => [x, guideOf(c, x)]).filter(([, g]) => g).slice(0, n).map(([x, g]) => `${x}${eunNeun(x)} ${g.time}`).join(", ");
const areaNames = (c) => c.pages.map((p) => p.region);

// ── CSS (인라인, 외부 의존 없음 — 웹폰트를 내려받지 않고 기기 기본 한글 폰트를 쓴다)
const CSS = `
:root{--ink:#0f1a2b;--sub:#5b697b;--line:#e2e7ef;--bg:#fff;--navy:#12294d;--navy-l:#1d3f73;--hot:#c2410c;--hot-d:#b94709;--cream:#f4f6fa;--shadow:0 12px 34px rgba(18,41,77,.14)}
*{margin:0;padding:0;box-sizing:border-box}
html{scroll-behavior:smooth}
body{font-family:Pretendard,-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo','Noto Sans KR','Malgun Gothic','Segoe UI',Roboto,sans-serif;color:var(--ink);background:var(--bg);font-size:17px;line-height:1.8;letter-spacing:-.015em;word-break:keep-all;overflow-wrap:break-word;-webkit-text-size-adjust:100%}
a{color:inherit;text-decoration:none}
.wrap{max-width:900px;margin:0 auto;padding:0 22px}
header{background:var(--navy);position:sticky;top:0;z-index:30}
.hd{display:flex;justify-content:space-between;align-items:center;height:64px}
.logo{font-weight:800;font-size:21px;color:#fff;letter-spacing:-.02em}
.hd-call{color:#fff;font-weight:700;font-size:14.5px;border:1.5px solid rgba(255,255,255,.55);padding:8px 15px;border-radius:99px}
.hero{position:relative;background:var(--navy);overflow:hidden;min-height:400px;display:flex;align-items:flex-end}
.hero-bg{position:absolute;inset:0}.hero-bg img{width:100%;height:100%;object-fit:cover;opacity:.38;display:block}
.hero-in{position:relative;z-index:2;width:100%;padding:44px 22px 42px;max-width:900px;margin:0 auto}
.crumb{font-size:13px;color:#b5c6e0;margin-bottom:12px;letter-spacing:.04em}.crumb a{color:#d5e0f2}
h1{font-weight:800;font-size:38px;line-height:1.2;letter-spacing:-.03em;color:#fff}
.hl{margin:12px 0 0;font-size:24px;font-weight:700;line-height:1.4;color:#ffd9bf}
.lead{margin:14px 0 0;max-width:560px;font-size:17.5px;color:#dfe8f5;line-height:1.75}
.cta-row{display:flex;gap:10px;margin-top:26px;flex-wrap:wrap}
.btn{display:inline-flex;align-items:center;gap:8px;padding:16px 26px;border-radius:12px;font-weight:800;font-size:16.5px;cursor:pointer;border:0;font-family:inherit}
.btn-sms{background:var(--hot);color:#fff;box-shadow:0 10px 26px rgba(217,86,15,.38)}
.btn-tel{background:rgba(255,255,255,.14);color:#fff;border:1.5px solid rgba(255,255,255,.5)}
.cta-note{margin:14px 0 0;font-size:14.5px;color:#cfdcf0;font-weight:600}
.hero-ev{display:flex;gap:8px;flex-wrap:wrap;margin-top:24px}
.hero-ev-box{position:relative;flex:1 1 0;min-width:120px;max-width:200px;aspect-ratio:3/4;border-radius:12px;overflow:hidden;border:1px solid rgba(255,255,255,.3);background:rgba(255,255,255,.08)}
.hero-ev-box img{width:100%;height:100%;object-fit:cover;display:block}
.hero-ev-box span{position:absolute;top:8px;left:8px;font-size:11px;font-weight:700;color:#fff;background:rgba(18,41,77,.82);padding:2px 8px;border-radius:99px}
.hero-ev-cap{flex-basis:100%;font-size:13px;color:#cfdcf0;font-weight:600;margin-top:2px}
.badges{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:1px;background:var(--line);border-bottom:1px solid var(--line)}
.badges>div{background:#fff;padding:22px 14px;text-align:center;font-size:14.5px;font-weight:600;color:var(--navy);line-height:1.6}
section{padding:50px 0 0}
h2{font-weight:800;font-size:29px;letter-spacing:-.025em;line-height:1.35;color:var(--navy)}
.sec-sub{color:var(--sub);margin:9px 0 20px;font-size:16px}
.sec-badge{font-size:13px;font-weight:700;color:var(--hot-d);background:#fdeee3;padding:4px 11px;border-radius:99px;vertical-align:middle;margin-left:6px;white-space:nowrap}
.prose{background:var(--cream);border:1px solid var(--line);border-radius:16px;padding:22px 24px;font-size:16.5px;line-height:1.85;margin-top:16px}
.prose p+p{margin-top:12px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:20px}
.card{display:block;background:#fff;border:1px solid var(--line);border-radius:14px;padding:22px 22px 22px 26px;position:relative;overflow:hidden;transition:.12s}
.card:before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--hot)}
.card:hover{border-color:var(--hot);box-shadow:0 8px 22px rgba(18,41,77,.1)}
.card h3{font-size:18px;color:var(--navy);margin-bottom:6px;font-weight:800}
.card p{font-size:15.5px;color:var(--sub);line-height:1.65}
.chips-links{display:flex;flex-wrap:wrap;gap:8px;margin-top:18px}
.chips-links a{display:inline-block;background:#fff;border:1px solid var(--line);border-radius:99px;padding:9px 17px;font-size:14.5px;color:var(--ink)}
.chips-links a:hover{border-color:var(--hot);color:var(--hot)}
.grid.cols-1{grid-template-columns:1fr}.grid.cols-3{grid-template-columns:repeat(3,1fr)}
.tbl-wrap{overflow-x:auto;margin-top:16px}.tbl{width:100%;border-collapse:collapse;font-size:15px}.tbl th,.tbl td{text-align:left;padding:12px 12px;border-bottom:1px solid var(--line);vertical-align:top}.tbl th{font-size:13px;color:var(--sub);font-weight:700;border-bottom:2px solid var(--navy)}.tbl td:first-child{white-space:nowrap}
.hero-card{display:none}
.ba{background:#fff;border:1px solid var(--line);border-radius:14px;overflow:hidden}
.ba-slider{position:relative;aspect-ratio:4/3;overflow:hidden;background:#e9edf3;touch-action:pan-y;user-select:none;-webkit-user-select:none;cursor:ew-resize}
.ba-slider img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;pointer-events:none}
.ba-before{clip-path:inset(0 50% 0 0)}
.ba-handle{position:absolute;top:0;bottom:0;left:50%;width:2px;background:#fff;transform:translateX(-1px);pointer-events:none;box-shadow:0 0 0 1px rgba(0,0,0,.18)}
.ba-handle::after{content:"↔";position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:36px;height:36px;border-radius:50%;background:#fff;color:var(--hot);display:flex;align-items:center;justify-content:center;font-size:17px;font-weight:900;box-shadow:0 2px 9px rgba(0,0,0,.28)}
.ba-tag{position:absolute;top:10px;font-size:12px;font-weight:700;color:#fff;background:rgba(18,41,77,.8);padding:3px 10px;border-radius:99px;pointer-events:none}
.ba-tag-b{left:10px}.ba-tag-a{right:10px}
.ba-empty{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#8a95a5;font-size:13px}
.ba-cap{padding:13px 16px;font-size:15px;font-weight:700;color:var(--navy)}
.steps{counter-reset:s;margin-top:20px}
.step{display:flex;gap:16px;background:#fff;border:1px solid var(--line);border-radius:14px;padding:18px 20px;margin-bottom:10px}
.step:before{counter-increment:s;content:counter(s,decimal-leading-zero);font-weight:800;color:var(--hot);font-size:19px}
.step h3{font-size:17px;color:var(--navy);font-weight:800}.step p{font-size:15.5px;color:var(--sub)}
details{background:#fff;border:1px solid var(--line);border-radius:14px;padding:14px 22px;margin-bottom:10px}
summary{font-weight:800;cursor:pointer;font-size:16.5px;list-style:none;position:relative;padding:6px 26px 6px 0;color:var(--navy)}
summary::-webkit-details-marker{display:none}
summary::after{content:"+";position:absolute;right:0;top:6px;font-size:20px;color:var(--hot)}
details[open] summary::after{content:"-"}
details p{margin-top:10px;color:var(--sub);font-size:16px;line-height:1.8}
.whyp{margin:0 0 18px;padding:20px 18px;border-left:5px solid var(--hot);background:var(--cream);border-radius:10px;font-size:17px;line-height:1.65}
.whyp p{margin:0 0 10px}.whyp .w1{font-size:21px;font-weight:800;line-height:1.45}.whyp .w2{margin:14px 0 0;font-size:18px;font-weight:800;color:var(--hot)}
.picker-card{background:#fff;border:2px solid var(--navy);border-radius:20px;padding:28px 24px;box-shadow:var(--shadow)}
.pick-group{margin-top:22px}.pick-group h3{font-size:15.5px;margin-bottom:10px;font-weight:800}
.chips{display:flex;flex-wrap:wrap;gap:8px}
.chip{display:inline-flex;align-items:center;gap:7px;background:var(--cream);border:1px solid var(--line);border-radius:99px;padding:10px 16px;font-size:15px;cursor:pointer;user-select:none;transition:all .12s}
.chip input{width:16px;height:16px;accent-color:var(--hot)}
.chip.active{background:var(--hot);color:#fff;border-color:var(--hot)}
.sms-preview{margin-top:20px;background:var(--cream);border-radius:12px;padding:16px 18px;font-size:14px;color:var(--sub);white-space:pre-line}
.sms-hint{margin-top:14px;font-size:15px;line-height:1.6;font-weight:600}
.picker-card .btn-sms{margin-top:16px;width:100%;justify-content:center}
.cta-band{background:var(--navy);color:#fff;padding:42px 32px;border-radius:20px;margin:56px 0 0;box-shadow:var(--shadow)}
.cta-band h2{color:#fff}.cta-band p{color:#c3d3ea;margin:10px 0 22px;font-size:16px}
.cta-band .btn-tel{background:rgba(255,255,255,.12)}
footer{background:var(--navy);color:#c3d3ea;padding:40px 0 116px;font-size:14px;margin-top:64px;line-height:1.9}
footer strong{color:#fff}
.f-links{display:flex;flex-wrap:wrap;gap:14px 12px;margin:18px 0 6px}
.f-links a{display:inline-flex;flex-direction:column;align-items:center;gap:5px;width:62px;text-align:center;font-size:11px;opacity:.85}
.f-links a:hover{opacity:1}
.f-ico{width:42px;height:42px;border-radius:50%;border:1px solid rgba(255,255,255,.3);display:flex;align-items:center;justify-content:center;color:#fff}
.fixbar{position:fixed;left:0;right:0;bottom:0;display:flex;z-index:40;box-shadow:0 -6px 20px rgba(0,0,0,.16)}
.fixbar a{text-align:center;padding:17px 10px;font-weight:800;font-size:16px}
.fixbar .f-sms{flex:1;background:var(--hot);color:#fff;font-size:18px}.fixbar .f-call{flex:0 0 124px;background:var(--navy);color:#fff;font-weight:700}
@media(max-width:640px){
 .grid.cols-3{grid-template-columns:1fr 1fr}
 body{font-size:17.5px;line-height:1.7}h1{font-size:30px}.hl{font-size:21px}h2{font-size:24px}
 .grid{grid-template-columns:1fr}.badges{grid-template-columns:1fr}.badges>div{padding:16px 14px}
 .hero{min-height:330px}.hero-in{padding:34px 20px}.cta-band{padding:34px 22px}
 .card h3,.step h3{font-size:19px}.card p,.step p{font-size:16.5px}summary{font-size:18px}details p{font-size:17px}.chip{font-size:16.5px}.btn{font-size:17.5px}
}`;

// 검색엔진 확인 태그: 서치어드바이저(네이버)·서치콘솔(구글)에서 받은 값을 환경변수로 넣으면 모든 페이지 head 에 들어간다
const ENV = typeof process !== "undefined" && process.env ? process.env : {}; // 워커(실시간 렌더)에는 process 가 없을 수 있다
const verifyTags = () => [
  ENV.SEO_NAVER_VERIFY ? `<meta name="naver-site-verification" content="${esc(ENV.SEO_NAVER_VERIFY)}">` : "",
  ENV.SEO_GOOGLE_VERIFY ? `<meta name="google-site-verification" content="${esc(ENV.SEO_GOOGLE_VERIFY)}">` : "",
].join("");
// 큰 이미지 미리보기·전체 스니펫을 허용(구글), 네이버는 robots 를 그대로 따른다
// 네이버만 먼저 공개(2026-10-30): 지역명만 바뀐 지역 페이지가 많아 구글 복제 판정을 피하려고 구글봇만 막는다(교본 4-3 두 층 색인). 네이버 Yeti는 이 태그를 보지 않는다.
const GOOGLE_HOLD = '<meta name="googlebot" content="noindex">';
const robotsContent = (noindex, follow = true) => (noindex ? "noindex, nofollow" : `${follow ? "index, follow" : "noindex, follow"}, max-image-preview:large, max-snippet:-1, max-video-preview:-1`);

const head = (c, { title, desc, keywords, canonical, ogImage, noindex = false }) => `<!DOCTYPE html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(desc)}"><meta name="keywords" content="${esc(keywords)}">
<meta name="robots" content="${robotsContent(c.noindex, !noindex)}">${c.noindex ? "" : GOOGLE_HOLD}<link rel="canonical" href="${esc(canonical)}">${verifyTags()}
<meta property="og:type" content="website"><meta property="og:site_name" content="${esc(c.kw)}"><meta property="og:locale" content="ko_KR"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${esc(canonical)}">${ogImage ? `<meta property="og:image" content="${esc(ogImage)}"><meta property="og:image:alt" content="${esc(c.kw)}"><meta name="twitter:image" content="${esc(ogImage)}">` : ""}
<meta name="twitter:card" content="${ogImage ? "summary_large_image" : "summary"}"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(desc)}">
<link rel="icon" href="/favicon.svg"><meta name="theme-color" content="#12294d"><style>${CSS}${c.tpl.themeCss || ""}</style>`;

const header = (c) => `<header><div class="wrap hd"><a class="logo" href="/">${esc(c.kw)}</a>${c.phone ? `<a class="hd-call" href="${esc(telHref(c.phone))}">${esc(c.phoneShow)}</a>` : ""}</div></header>`;

const footer = (c) => {
  const p = c.profile;
  const biz = [p.company && `<strong>${esc(p.company)}</strong>`, p.ceo && `대표 ${esc(p.ceo)}`, p.regno && `사업자등록번호 ${esc(regnoFmt(p.regno))}`].filter(Boolean).join(" · ");
  const contact = [c.phoneShow && `전화 ${esc(c.phoneShow)}`, p.hours && `영업시간 ${esc(p.hours)}`].filter(Boolean).join(" · ");
  const links = linkList(p);
  return `<footer><div class="wrap">${biz ? `${biz}<br>` : ""}${contact ? `${contact}<br>` : ""}${p.address ? `사업장 ${esc(p.address)}<br>` : ""}서비스 지역: ${esc(areaNames(c).slice(0, 12).join("·"))}${areaNames(c).length > 12 ? ` 외 ${areaNames(c).length - 12}곳` : ""}<br>
${links.length ? `<div class="f-links">${links.map((x) => `<a href="${esc(extUrl(x.url))}" target="_blank" rel="noopener" title="${esc(x.name)}" aria-label="${esc(x.name)}"><span class="f-ico"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[platformOf(extUrl(x.url))]}</svg></span>${esc(x.name)}</a>`).join("")}</div>` : ""}
수리 방법 안내: <a href="https://suriwiki.com/" target="_blank" rel="noopener" style="color:#fff">수리위키 suriwiki.com</a><br>
© 2026 ${esc(p.company || c.kw)}. All rights reserved.</div></footer>
<div class="fixbar"><a class="f-sms" href="#picker">📷 사진 보내고 문자 문의</a>${c.phone ? `<a class="f-call" href="${esc(telHref(c.phone))}">📞 전화</a>` : ""}</div>`;
};

// ── 섹션 조각
const heroSlotName = (c, suffix) => (c.tpl.heroSlot ? `ba-${c.tpl.heroSlot}-${suffix}` : "");
const heroBlock = (c, { h1, headline, lead, crumb }) => {
  const hs = c.tpl.heroSlot;
  const afterName = hs ? heroSlotName(c, "after") : "", beforeName = hs ? heroSlotName(c, "before") : "";
  const bgName = c.tpl.hero === "image" ? (hs && hasImg(afterName) ? afterName : hasImg("hero-1") ? "hero-1" : "") : "";
  const ev = hs && hasImg(beforeName) && hasImg(afterName) && c.tpl.hero !== "plain"
    ? `<div class="hero-ev"><div class="hero-ev-box">${imgTag(beforeName, `${c.kw} 작업 전`)}<span>작업 전</span></div><div class="hero-ev-box">${imgTag(afterName, `${c.kw} 작업 후`)}<span>작업 후</span></div><div class="hero-ev-cap">${esc(captionOf(c, hs))}</div></div>` : "";
  const actions = `<div class="cta-row"><a class="btn btn-sms" href="#picker">📷 사진 보내고 문자 문의 ↓</a>${c.phone ? `<a class="btn btn-tel" href="${esc(telHref(c.phone))}">📞 전화</a>` : ""}</div>`;
  const card = c.tpl.hero === "split" ? `<div class="hero-card"><b>${c.phoneShow ? esc(c.phoneShow) : "사진으로 문의"}</b><span>사진 한 장이면 가능 여부를 먼저 안내합니다</span>${c.phone ? `<a class="btn btn-sms" href="${esc(telHref(c.phone))}">📞 바로 전화</a>` : ""}<a class="btn btn-tel" href="#picker">📷 문자로 사진 보내기</a></div>` : "";
  return `<div class="hero hero-${c.tpl.hero}">${bgName ? `<div class="hero-bg">${imgTag(bgName, "", "", true)}</div>` : ""}<div class="hero-in"><div class="hero-main">${crumb ? `<div class="crumb">${crumb}</div>` : ""}<h1>${esc(h1)}</h1>
<p class="hl">${esc(headline)}</p><p class="lead">${esc(lead)}</p>${c.tpl.hero === "split" ? "" : actions}
${c.tpl.hero === "split" ? "" : `<p class="cta-note">📷 사진 한 장이면 가능 여부를 먼저 안내합니다.</p>`}${ev}</div>${card}</div></div>`;
};
const captionOf = (c, slot) => (c.media.captions && c.media.captions[slot]) || (c.subs[slot - 1] ? `${c.subs[slot - 1]} 사례` : `${c.kw} 사례`);

const badgesBlock = (c) => `<div class="badges"><div>사진 보고 가능 여부 안내</div><div>${c.pages.length}개 지역 상담</div><div>문자 · 전화 상담</div><div>비용은 현장 확인 후 안내</div></div>`;

const itemsBlock = (c, title, sub) => `<section><h2>${esc(title)}</h2><p class="sec-sub">${esc(sub)}</p><div class="grid">${c.subs.map((s) => { const g = guideOf(c, s); return `<a class="card" href="#picker" data-pick="작업:${esc(s)}"><h3>${esc(s)}</h3><p>${esc(g ? `${g.target}. ${g.point}.` : `${s} 관련 작업을 상담합니다.`)}</p></a>`; }).join("")}</div></section>`;

const symptomsBlock = (c) => ((c.content.symptoms || []).length ? `<section><h2>이런 증상도 접수합니다</h2><p class="sec-sub">해당하는 증상을 눌러 문의에 담아 보세요.</p><div class="chips-links">${c.content.symptoms.map((s) => `<a href="#picker" data-pick="증상:${esc(s)}">${esc(s)}</a>`).join("")}</div></section>` : "");

const compareBlock = (c, title) => {
  // 전·후 사진이 둘 다 있는 사례만 보여 준다(없는 칸은 만들지 않는다). 하나도 없으면 섹션 전체를 생략한다.
  const slots = Array.from({ length: c.tpl.photoSlots || 4 }, (_, i) => i + 1).filter((n) => hasImg(`ba-${n}-before`) && hasImg(`ba-${n}-after`));
  const cells = slots.map((n) =>
    `<div class="ba"><div class="ba-slider" data-slider>${imgTag(`ba-${n}-after`, `${captionOf(c, n)} 작업 후`, 'class="ba-after"')}${imgTag(`ba-${n}-before`, `${captionOf(c, n)} 작업 전`, 'class="ba-before"')}<div class="ba-handle"></div><span class="ba-tag ba-tag-b">작업 전</span><span class="ba-tag ba-tag-a">작업 후</span></div><div class="ba-cap">${esc(captionOf(c, n))}</div></div>`).join("");
  return cells ? `<section id="cases"><h2>${esc(title)} <span class="sec-badge">작업 사진</span></h2><p class="sec-sub">손잡이를 좌우로 움직이면 같은 자리의 작업 전과 후가 바뀝니다.</p><div class="grid cols-${c.tpl.compareCols || 2}">${cells}</div></section>` : "";
};

// 유형별 안내 표(대상·소요 시간·특징): 그룹 content.guide 가 있는 서브 키워드만
const guideTableBlock = (c, title) => {
  const rows = c.subs.map((x) => [x, guideOf(c, x)]).filter(([, g]) => g && (g.target || g.time || g.point));
  if (!rows.length) return "";
  return `<section id="guide"><h2>${esc(title)}</h2><p class="sec-sub">작업 유형별로 어떤 경우에 해당하는지, 얼마나 걸리는지 정리했습니다.</p><div class="tbl-wrap"><table class="tbl"><thead><tr><th>항목</th><th>대상</th><th>소요 시간</th><th>특징</th></tr></thead><tbody>${rows.map(([x, g]) => `<tr><td><b>${esc(x)}</b></td><td>${esc(g.target)}</td><td>${esc(g.time)}</td><td>${esc(g.point)}</td></tr>`).join("")}</tbody></table></div><p class="sec-sub" style="margin-top:12px;font-size:13px">소요 시간은 일반적인 작업 기준이며 면적과 현장 상태에 따라 달라집니다. 비용은 현장 확인 후 안내합니다.</p></section>`;
};

const stepsBlock = () => `<section><h2>진행 절차</h2><div class="steps">
<div class="step"><div><h3>사진·증상 접수</h3><p>문제 부위 사진과 지역, 원하는 작업을 문자로 보내 주세요.</p></div></div>
<div class="step"><div><h3>상담</h3><p>사진을 보고 가능한 방법과 일정을 안내합니다. 비용은 현장 확인 후 안내합니다.</p></div></div>
<div class="step"><div><h3>시공</h3><p>협의한 일정에 맞춰 작업합니다.</p></div></div>
<div class="step"><div><h3>완료 확인</h3><p>작업 결과를 함께 확인합니다.</p></div></div></div></section>`;

const areaBlock = (c, current) => `<section><h2>${current ? `${esc(current)} 가까운 지역` : "서비스 지역"}</h2><p class="sec-sub">${current ? "다른 지역 안내도 확인해 보세요." : `${c.pages.length}개 지역에서 상담을 받고 있습니다. 지역을 눌러 안내를 확인하세요.`}</p>
<div class="chips-links">${c.pages.filter((p) => p.region !== current).slice(0, current ? 12 : 99).map((p) => `<a href="${esc(p.page_path)}">${esc(p.region)} ${esc(c.kw)}</a>`).join("")}</div></section>`;

const faqItems = (c, region) => {
  const R = region ? `${region} ` : "";
  const out = [];
  out.push([`${R}${c.kw}${eunNeun(c.kw)} 어떤 경우에 필요한가요?`, `${c.subs.slice(0, 3).map((s) => { const g = guideOf(c, s); return g ? `${s}(${g.target})` : s; }).join(", ")} 같은 경우에 상담하실 수 있습니다. 사진을 보내 주시면 가능 여부부터 안내합니다.`]);
  for (const s of c.subs.slice(0, 3)) { const g = guideOf(c, s); if (g) out.push([`${s}${eunNeun(s)} 어떤 작업인가요?`, `${g.target}에 해당합니다. ${g.point}.`]); }
  out.push([`진행 기간은 얼마나 걸리나요?`, `${timeLine(c) ? `대표 작업 기준으로 ${timeLine(c)}입니다. ` : ""}면적과 현장 상태에 따라 달라지며 정확한 일정은 상담 시 안내합니다.`]);
  out.push([`비용은 어떻게 정해지나요?`, `현장 상태와 작업 범위에 따라 달라지므로 확인 후 안내합니다. 이 페이지는 금액을 단정하지 않습니다.`]);
  out.push([`상담은 어떻게 하나요?`, `아래 '체크하고 문자 보내기'에서 해당 항목을 체크하고 사진을 첨부해 문자를 보내 주세요.${c.phoneShow ? ` 전화(${c.phoneShow})로도 문의할 수 있습니다.` : ""}`]);
  return out.slice(0, 7);
};
const faqBlock = (items) => `<section><h2>자주 묻는 질문</h2>${items.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join("")}</section>`;
const faqLd = (items) => jsonLd({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: items.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) });

const chipGroup = (cat, title, values, pre = []) => `<div class="pick-group"><h3>${esc(title)}</h3><div class="chips">${values.map((v) => `<label class="chip${pre.includes(v) ? " active" : ""}"><input type="checkbox" data-cat="${esc(cat)}" value="${esc(v)}"${pre.includes(v) ? " checked" : ""}>${esc(v)}</label>`).join("")}</div></div>`;
const pickerBlock = (c, { pageName, region }) => `<section id="picker"><div class="whyp"><p>말로 설명하기 어려운 부분이 많습니다.</p><p class="w1">사진 한 장이 가장 정확한 설명입니다.</p><p>사진을 먼저 확인하고 연락드리기 때문에 같은 설명을 반복하실 필요가 없고, 가능한지와 어떤 방법이 맞는지부터 말씀드릴 수 있습니다.</p><p class="w2">📷 멀리서 1장, 가까이 1~2장이면 충분합니다.</p></div>
<div class="picker-card"><h2>체크하고 문자 보내기</h2><p class="sec-sub" style="margin-bottom:0">해당 항목을 체크하면 문자 내용이 자동으로 채워집니다. 사진만 첨부해 보내 주세요.</p>
${chipGroup("작업", "작업", [...c.subs, "잘 모르겠음"])}${(c.content.symptoms || []).length ? chipGroup("증상", "증상", [...c.content.symptoms, "기타", "잘 모르겠음"]) : ""}
${chipGroup("지역", "지역", [...areaNames(c), "그 외 지역"], region ? [region] : [])}
<div class="sms-preview" id="smsPreview"></div><p class="sms-hint">📷 문자 창이 열리면 <b>＋</b> 또는 📎 를 눌러 사진을 붙여 주세요.</p>
<a id="sms-final" class="btn btn-sms" href="${c.phone ? `sms:${esc(c.phone)}` : "#picker"}">💬 이 내용으로 문자 보내기</a></div></section>`;

const ctaBand = (c, title) => `<div class="cta-band"><h2>${esc(title)}</h2><p>문제 부위 사진과 지역을 보내 주시면 가능 여부를 먼저 안내합니다.</p><div class="cta-row" style="margin-top:0"><a class="btn btn-sms" href="#picker">📷 사진 보내고 문자 문의 ↑</a>${c.phone ? `<a class="btn btn-tel" href="${esc(telHref(c.phone))}">📞 전화 상담</a>` : ""}</div></div>`;

const SCRIPT = (c, pageName, region) => `<script>(function(){
var phone=${JSON.stringify(c.phone)},KW=${JSON.stringify(c.kw)},PAGE=${JSON.stringify(pageName)},REGION=${JSON.stringify(region || "")};
var btn=document.getElementById('sms-final'),pv=document.getElementById('smsPreview');
function pick(cat){return Array.prototype.slice.call(document.querySelectorAll('input[data-cat="'+cat+'"]:checked')).map(function(e){return e.value})}
function build(){var L=['['+KW+'] '+PAGE],a=pick('작업'),b=pick('증상'),d=pick('지역');
if(a.length)L.push('작업: '+a.join('\\u00b7'));if(b.length)L.push('증상: '+b.join('\\u00b7'));
L.push('지역: '+(d.length?d.join('\\u00b7'):REGION));L.push('\\u203b 사진은 이 문자에 첨부해 주세요');
var body=L.join('\\n');if(phone)btn.href='sms:'+phone+'?body='+encodeURIComponent(body);
pv.textContent='문자 미리보기\\n\\u2014\\u2014\\u2014\\u2014\\u2014\\u2014\\u2014\\n'+body;}
document.querySelectorAll('#picker input[type=checkbox]').forEach(function(el){el.addEventListener('change',function(){var l=el.closest('label');if(l)l.classList.toggle('active',el.checked);build();});});
document.querySelectorAll('[data-pick]').forEach(function(a){a.addEventListener('click',function(){var p=a.getAttribute('data-pick').split(':'),cat=p[0],val=p.slice(1).join(':');
document.querySelectorAll('#picker input[data-cat="'+cat+'"]').forEach(function(el){if(el.value===val){el.checked=true;var l=el.closest('label');if(l)l.classList.add('active');}});build();});});
build();
document.querySelectorAll('[data-slider]').forEach(function(s){var before=s.querySelector('.ba-before'),handle=s.querySelector('.ba-handle'),drag=false;
function set(x){var r=s.getBoundingClientRect(),p=Math.max(0,Math.min(1,(x-r.left)/r.width));before.style.clipPath='inset(0 '+((1-p)*100)+'% 0 0)';handle.style.left=(p*100)+'%';}
s.addEventListener('pointerdown',function(e){drag=true;try{s.setPointerCapture(e.pointerId);}catch(_){}set(e.clientX);});
s.addEventListener('pointermove',function(e){if(drag)set(e.clientX);});
s.addEventListener('pointerup',function(){drag=false;});s.addEventListener('pointercancel',function(){drag=false;});});
})();</script>`;

const businessLd = (c, extra = {}) => jsonLd({
  "@context": "https://schema.org", "@type": "HomeAndConstructionBusiness", name: c.profile.company || c.kw, url: `https://${c.host}/`,
  ...(c.phone ? { telephone: intlTel(c.phone) } : {}), description: `${c.kw} — ${c.subs.slice(0, 4).join(", ")} 상담`,
  areaServed: areaNames(c).map((n) => ({ "@type": "City", name: n })), ...(linkList(c.profile).length ? { sameAs: linkList(c.profile).map((x) => extUrl(x.url)) } : {}), ...extra,
});

const websiteLd = (c) => jsonLd({ "@context": "https://schema.org", "@type": "WebSite", name: c.kw, url: `https://${c.host}/`, inLanguage: "ko-KR" });
const breadcrumbLd = (c, region, path) => jsonLd({ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
  { "@type": "ListItem", position: 1, name: c.kw, item: `https://${c.host}/` },
  { "@type": "ListItem", position: 2, name: `${region} ${c.kw}`, item: `https://${c.host}${path}` },
] });

const ogImageOf = (c) => { const a = heroSlotName(c, "after"); const n = a && hasImg(a) ? a : hasImg("hero-1") ? "hero-1" : ""; return n ? `https://${c.host}${imgSrc(n)}` : ""; };

// ── 페이지: 템플릿(tpl)이 섹션 순서와 변형을 정한다. 섹션 이름은 아래 SEC 에 있다.
const SEC = {
  badges: (c) => badgesBlock(c),
  items: (c, o) => itemsBlock(c, o.region ? `${o.region} ${c.kw} 작업 항목` : `${c.kw} 작업 항목`, o.region ? `${o.region}에서 많이 문의하시는 작업입니다.` : "비슷한 상황을 골라 문의에 담을 수 있습니다."),
  guide: (c, o) => guideTableBlock(c, o.region ? `${o.region} ${c.kw} 유형별 안내` : `${c.kw} 유형별 안내`),
  symptoms: (c) => symptomsBlock(c),
  compare: (c, o) => compareBlock(c, o.region ? `${o.region} 작업 전후` : "작업 전후 비교"),
  steps: () => stepsBlock(),
  area: (c, o) => areaBlock(c, o.region || ""),
  faq: (c, o) => faqBlock(faqItems(c, o.region || "")),
  picker: (c, o) => pickerBlock(c, { pageName: o.region ? `${o.region} ${c.kw}` : c.kw, region: o.region || "" }),
  cta: (c, o) => ctaBand(c, o.region ? `${o.region} 상담` : "사진 한 장이면 충분합니다"),
  intro: (c, o) => (o.region ? regionIntro(c, o.region) : ""),
};
function regionIntro(c, region) {
  const intro = (c.media && c.media.intro) || "";
  const items = c.subs.slice(0, 3).map((s) => `${s}${eunNeun(s)} ${guideOf(c, s) && guideOf(c, s).time ? guideOf(c, s).time : "현장에 따라 다릅니다"}`).join(", ");
  return `<section><h2>${esc(region)} ${esc(c.kw)} 안내</h2><div class="prose">${intro ? intro.split(/\n+/).filter(Boolean).map((t) => `<p>${esc(t)}</p>`).join("") : ""}<p>${esc(region)} 지역 ${esc(c.kw)} 상담을 받고 있습니다. 대표 작업 기준으로 ${esc(items)}입니다. 면적과 현장 상태에 따라 달라지므로 ${esc(region)} 현장 사진을 보내 주시면 가능 여부와 일정을 먼저 안내합니다. 비용은 현장 확인 후 안내합니다.</p></div></section>`;
}
const renderSections = (c, names, o) => {
  const pre = names.includes("badges") ? SEC.badges(c) : "";
  return `${pre}<div class="wrap">${names.filter((n) => n !== "badges").map((n) => SEC[n](c, o)).join("")}</div>`;
};

export function homePage({ site, meta, pages, data, profile, media, tpl }) {
  const c = ctx(site, meta, data, { profile, pages, media, tpl });
  const ct = c.content, faq = faqItems(c);
  const desc = `${c.kw} 상담. ${c.subs.slice(0, 4).join("·")} 등 ${c.pages.length}개 지역에서 사진을 보내 주시면 가능 여부부터 안내합니다.`;
  return `${head(c, { title: `${c.kw} | ${c.subs.slice(0, 4).join("·")}`, desc, keywords: [c.kw, ...c.subs].join(", "), canonical: `https://${c.host}/`, ogImage: ogImageOf(c) })}
${websiteLd(c)}${businessLd(c)}${c.tpl.home.includes("faq") ? faqLd(faq) : ""}</head><body data-tpl="${esc(c.tpl.id || "")}">${header(c)}
${heroBlock(c, { h1: c.kw, headline: ct.headline || `${c.kw}, 어떻게 해야 할지 고민이신가요?`, lead: ct.lead || desc })}
${renderSections(c, c.tpl.home, {})}
${footer(c)}${SCRIPT(c, c.kw, "")}</body></html>`;
}

export function regionPage({ site, meta, page, pages, data, profile, media, tpl }) {
  const region = page.region;
  const c = ctx(site, meta, data, { profile, pages, media, tpl });
  const ct = c.content, faq = faqItems(c, region);
  const desc = `${region} ${c.kw} 상담. ${c.subs.slice(0, 3).join("·")} 등을 사진으로 먼저 확인하고 안내합니다.`;
  return `${head(c, { title: `${region} ${c.kw} | ${c.kw}`, desc, keywords: [page.h1_title, ...c.subs.slice(0, 3).map((s) => `${region} ${s}`)].join(", "), canonical: `https://${c.host}${page.page_path}`, ogImage: ogImageOf(c) })}
${breadcrumbLd(c, region, page.page_path)}${businessLd(c, { areaServed: [{ "@type": "City", name: region }] })}${c.tpl.region.includes("faq") ? faqLd(faq) : ""}</head><body data-tpl="${esc(c.tpl.id || "")}">${header(c)}
${heroBlock(c, { h1: page.h1_title, headline: `${region}에서 ${ct.headline || `${c.kw}, 어떻게 해야 할지 고민이신가요?`}`, lead: ct.lead || desc, crumb: `<a href="/">${esc(c.kw)}</a> › ${esc(region)}` })}
${renderSections(c, c.tpl.region, { region })}
${footer(c)}${SCRIPT(c, `${region} ${c.kw}`, region)}</body></html>`;
}

export function sangdamPage({ site, meta, data, profile, pages, media, tpl }) {
  const c = ctx(site, meta, data, { profile, pages, media, tpl });
  return `${head(c, { title: `상담 안내 | ${c.kw}`, desc: `${c.kw} 상담 안내. 작업 항목과 지역을 체크하고 현장 사진을 첨부해 문자로 보내 주시면 확인 후 안내해 드립니다.`, keywords: `${c.kw}, 상담`, canonical: `https://${c.host}/sangdam`, ogImage: "", noindex: true })}</head><body data-tpl="${esc(c.tpl.id || "")}">${header(c)}
<div class="wrap" style="padding-top:36px"><h1 style="color:var(--navy);font-size:32px">${esc(c.kw)} 상담</h1><p class="sec-sub">현장 사진과 지역을 보내 주시면 확인 후 안내합니다.</p></div>
<div class="wrap">${pickerBlock(c, { pageName: `${c.kw} 상담`, region: "" })}</div>${footer(c)}${SCRIPT(c, `${c.kw} 상담`, "")}</body></html>`;
}
