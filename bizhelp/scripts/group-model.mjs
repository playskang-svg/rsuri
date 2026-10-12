// 메인 키워드 그룹(= 사이트 1개 = 분양 단위)의 데이터 모델. 워커(대시보드 저장·검증)와 빌드(사이트 생성)가 같은 규칙을 쓴다.
//  그룹 → 사이트 호스트 <slug>.suriwiki.com, 업로드 페이지 /upload/<slug>, 지역 페이지 /<지역slug> (그룹이 고른 지역마다 1개)
//  새 그룹을 만들면 같은 규칙으로 세 가지가 함께 생긴다 — 코드를 따로 만들지 않는다.

export const BASE_DOMAIN = 'suriwiki.com';
export const RESERVED_SLUGS = ['admin', 'www', 'api', 'mail', 'in', 'upload', 'share', 'battery', 'ftp', 'smtp', 'dev', 'test'];

// 지역 카탈로그: [이름, 영문 slug]. 지역 페이지 주소는 /<slug> 이다.
export const REGIONS = [
  ['안산', 'ansan'], ['안양', 'anyang'], ['부천', 'bucheon'], ['분당', 'bundang'], ['부평', 'bupyeong'], ['청라', 'cheongna'],
  ['동탄', 'dongtan'], ['은평', 'eunpyeong'], ['강남', 'gangnam'], ['강서', 'gangseo'], ['검단', 'geomdan'], ['건대', 'geondae'],
  ['김포', 'gimpo'], ['광명', 'gwangmyeong'], ['일산', 'ilsan'], ['인천', 'incheon'], ['마포', 'mapo'], ['파주', 'paju'],
  ['서초', 'seocho'], ['성동', 'seongdong'], ['송파', 'songpa'], ['수원', 'suwon'], ['시흥', 'siheung'], ['용산', 'yongsan'],
  ['화성', 'hwaseong'], ['평택', 'pyeongtaek'], ['하남', 'hanam'], ['구리', 'guri'], ['남양주', 'namyangju'], ['의정부', 'uijeongbu'],
  ['고양', 'goyang'], ['성남', 'seongnam'], ['과천', 'gwacheon'], ['군포', 'gunpo'], ['의왕', 'uiwang'], ['오산', 'osan'], ['용인', 'yongin'],
].map(([name, slug]) => ({ name, slug }));
export const regionBySlug = Object.fromEntries(REGIONS.map((r) => [r.slug, r]));

export const groupHost = (slug) => `${slug}.${BASE_DOMAIN}`;
const trim = (v, max) => String(v ?? '').trim().slice(0, max);
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// 입력을 검증·정리한다. 성공하면 { value }, 실패하면 { error }.
export function normalizeGroup(input, { slug } = {}) {
  const g = input || {};
  const s = trim(slug ?? g.slug, 40).toLowerCase();
  if (!SLUG_RE.test(s) || s.length < 3) return { error: '주소 이름은 영문 소문자·숫자·하이픈 3자 이상이어야 합니다 (예: baegwan-nusu)' };
  if (RESERVED_SLUGS.includes(s)) return { error: `'${s}'는 사용할 수 없는 주소 이름입니다` };
  const kw = trim(g.main_keyword, 20);
  if (kw.length < 2) return { error: '메인 키워드를 입력하세요' };
  const subs = [...new Set((Array.isArray(g.subs) ? g.subs : String(g.subs || '').split('\n')).map((x) => trim(x, 20)).filter(Boolean))];
  if (subs.length < 3 || subs.length > 8) return { error: '서브 키워드는 3~8개를 입력하세요 (한 줄에 하나)' };
  const regions = [...new Set((Array.isArray(g.regions) ? g.regions : []).map((x) => trim(x, 40)))].filter((x) => regionBySlug[x]);
  if (!regions.length) return { error: '지역을 1개 이상 선택하세요' };
  const c = g.content || {};
  const guide = {};
  for (const sub of subs) {
    const x = (c.guide || {})[sub] || {};
    const t = trim(x.target, 120), tm = trim(x.time, 120), pt = trim(x.point, 160);
    if (t || tm || pt) guide[sub] = { target: t, time: tm, point: pt };
  }
  const symptoms = [...new Set((Array.isArray(c.symptoms) ? c.symptoms : String(c.symptoms || '').split('\n')).map((x) => trim(x, 24)).filter(Boolean))].slice(0, 8);
  return {
    value: {
      slug: s, main_keyword: kw, en: trim(g.en, 40).toUpperCase(), subs, regions,
      content: { headline: trim(c.headline, 60), lead: trim(c.lead, 220), symptoms, guide },
    },
  };
}

// 그룹의 페이지 목록(지역 × 키워드). 제목·H1 = "{지역} {메인키워드}"
export function groupPages(g) {
  const site = groupHost(g.slug);
  return g.regions.filter((r) => regionBySlug[r]).map((r) => {
    const name = regionBySlug[r].name, h1 = `${name} ${g.main_keyword}`;
    return { site, page_path: `/${r}`, page_url: `https://${site}/${r}`, region: name, region_slug: r, h1_title: h1, page_title: h1 };
  });
}

// 사이트 메타(빌드·리포트가 쓰는 모양). 내용이 비어 있는 항목은 템플릿이 알아서 건너뛴다.
export function groupMeta(g) {
  const c = g.content || {};
  const content = {
    headline: c.headline || `${g.main_keyword}, 어떻게 해야 할지 고민이신가요?`,
    lead: c.lead || `${g.subs.slice(0, 4).join('·')} 등 ${g.main_keyword} — 사진으로 먼저 확인하고 가능한 방법을 안내합니다.`,
    symptoms: c.symptoms || [], guide: c.guide || {},
  };
  return { main_keyword: g.main_keyword, slug: g.slug, en: g.en || '', sub_keywords: g.subs, url: `https://${groupHost(g.slug)}/`, content };
}

// 그룹 목록 → 빌드가 쓰는 registry 모양
export function groupsToRegistry(groups, base = {}) {
  const site_meta = {}, pages = [];
  for (const g of groups) { site_meta[groupHost(g.slug)] = groupMeta(g); pages.push(...groupPages(g)); }
  pages.sort((a, b) => (a.site + a.page_path).localeCompare(b.site + b.page_path));
  return { business_name: base.business_name || '수리위키', noindex: base.noindex !== false, updated: base.updated || '', site_meta, pages };
}

// 정적 registry(시드) → 그룹 목록. 처음 D1에 넣을 때와 빌드 대체 경로에서 쓴다.
export function registryToGroups(reg) {
  return Object.entries(reg.site_meta || {}).map(([site, m]) => {
    const regions = (reg.pages || []).filter((p) => p.site === site).map((p) => p.region_slug);
    return { slug: m.slug, main_keyword: m.main_keyword, en: m.en || '', subs: m.sub_keywords || [], regions, content: m.content || {} };
  });
}
