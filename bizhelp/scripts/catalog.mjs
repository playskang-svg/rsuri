// 샘플용 지역·키워드 카탈로그. 실제 데이터에서는 report.json의 site_meta / pages[].region 이 같은 역할을 한다.
export const REGIONS = [
  ["안산", "ansan"], ["안양", "anyang"], ["부천", "bucheon"], ["분당", "bundang"], ["부평", "bupyeong"], ["청라", "cheongna"],
  ["동탄", "dongtan"], ["은평", "eunpyeong"], ["강남", "gangnam"], ["강서", "gangseo"], ["검단", "geomdan"], ["건대", "geondae"],
  ["김포", "gimpo"], ["광명", "gwangmyeong"], ["일산", "ilsan"], ["인천", "incheon"], ["마포", "mapo"], ["파주", "paju"],
  ["서초", "seocho"], ["성동", "seongdong"], ["송파", "songpa"], ["수원", "suwon"], ["시흥", "siheung"], ["용산", "yongsan"],
  ["화성", "hwaseong"], ["평택", "pyeongtaek"], ["하남", "hanam"], ["구리", "guri"], ["남양주", "namyangju"], ["의정부", "uijeongbu"],
  ["고양", "goyang"], ["성남", "seongnam"], ["과천", "gwacheon"], ["군포", "gunpo"], ["의왕", "uiwang"], ["오산", "osan"], ["용인", "yongin"],
].map(([name, slug]) => ({ name, slug }));

// main: 메인 키워드(페이지 제목에 붙는 말), slug: URL 꼬리, subs: 키워드 페이지가 품는 서브 키워드
export const KEYWORDS = [
  { site: "demo-door-film", main: "문짝필름시공", slug: "munjjak-film", subs: ["방문 필름시공", "문틀 필름시공", "샤시 필름시공", "욕실문 필름시공", "현관 문짝 필름시공", "부분 필름시공"] },
  { site: "demo-sash", main: "샷시교체", slug: "syasi-gyoche", subs: ["이중창 교체", "베란다 샷시 교체", "방충망 교체", "창호 단열 보강", "욕실 창 교체", "부분 샷시 수리"] },
  { site: "demo-wallpaper", main: "도배장판", slug: "dobae-jangpan", subs: ["실크 도배", "합지 도배", "장판 시공", "강화마루 시공", "부분 도배", "입주 전 도배"] },
  { site: "demo-pipe", main: "배관누수", slug: "baegwan-nusu", subs: ["누수 탐지", "급수관 교체", "배수관 막힘", "욕실 누수", "싱크대 하부 누수", "보일러 배관 점검"] },
  { site: "demo-bath", main: "욕실방수", slug: "yokshil-bangsu", subs: ["바닥 방수", "벽면 방수", "줄눈 보수", "타일 크랙 보수", "배수구 방수", "부분 방수"] },
  { site: "demo-entrance", main: "현관문교체", slug: "hyeongwanmun-gyoche", subs: ["방화문 교체", "도어락 교체", "현관문 필름", "문틀 보수", "중문 설치", "경첩 조정"] },
  { site: "demo-sink", main: "싱크대리폼", slug: "singkdae-reform", subs: ["상판 교체", "문짝 리폼", "수전 교체", "하부장 보수", "상부장 도장", "부분 리폼"] },
  { site: "demo-tile", main: "타일시공", slug: "tail-sigong", subs: ["욕실 타일", "주방 타일", "현관 타일", "바닥 타일", "타일 덧방", "부분 타일 보수"] },
].map((k) => ({ ...k, site: `${k.slug}.suriwiki.com` }));
