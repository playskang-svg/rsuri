// 샘플 데이터 생성기 — 실제 데이터 연결 전 화면 확인용. 같은 스키마의 JSON만 만들면 리포트와 키워드 페이지가 그대로 만들어진다.
// 구조: 사이트 1개 = 메인 키워드 1개 = 서브도메인 <키워드slug>.suriwiki.com. 페이지 1개 = "{지역} {메인키워드}" = /<지역slug>. 서브 키워드는 키워드 페이지가 품는다.
// 사용: node scripts/make-sample.mjs  → src/data/report.json
import fs from "node:fs";
import path from "node:path";
import { REGIONS, KEYWORDS } from "./catalog.mjs";

const BASE = "2026-10-12";
let seed = 20261012;
const rnd = () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const iso = (d) => d.toISOString().slice(0, 10);
const addDays = (s, n) => iso(new Date(Date.parse(s + "T00:00:00Z") + n * 864e5));
const dates = Array.from({ length: 16 }, (_, i) => addDays(BASE, -i)); // 최신순

const keywords = [], ranks = [], pages = [], site_meta = {};
let kid = 1;
KEYWORDS.forEach((k, si) => {
  const site = k.site;
  site_meta[site] = { main_keyword: k.main, slug: k.slug, en: k.en, sub_keywords: k.subs, url: `https://${site}/` };
  const n = 8 + Math.floor(rnd() * 27);
  const regions = REGIONS.slice().sort(() => rnd() - 0.5).slice(0, n);
  regions.forEach((rg) => {
    const kw = `${rg.name} ${k.main}`;
    const slug = rg.slug;
    pages.push({
      site, page_path: `/${slug}`, page_url: `https://${site}/${slug}`,
      region: rg.name, region_slug: rg.slug,
      h1_title: kw, page_title: kw, // 키워드·H1·타이틀 모두 같은 형식
      first_seen: addDays(BASE, -Math.floor(rnd() * 28)),
    });
    const id = kid++;
    keywords.push({ id, keyword: kw, site, page_path: `/${slug}`, created_at: addDays(BASE, -20) });
    let r = 1 + Math.floor(rnd() * 40); const out = rnd() < 0.2;
    dates.slice().reverse().forEach((d) => {
      r = Math.max(1, Math.min(60, r + Math.round((rnd() - 0.55) * 4)));
      if (out && rnd() < 0.7) return;
      ranks.push({ tracking_id: id, check_date: d, rank_position: r });
    });
  });
});
const data = { success: true, sample: true, brand: "샘플업체", business_name: "샘플 업체 (데이터 연결 전)", generated_at: BASE, dates, site_meta, keywords, ranks, pages };
const out = path.join(import.meta.dirname, "../src/data/report.json");
fs.writeFileSync(out, JSON.stringify(data));
console.log(`sample: ${KEYWORDS.length} sites, ${pages.length} pages, ${keywords.length} keywords, ${ranks.length} ranks`);
