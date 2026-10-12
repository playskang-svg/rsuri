// 사이트 템플릿 4종. 같은 데이터(그룹 내용·업로드 입력)를 서로 다른 구성·디자인으로 그린다.
// 각 템플릿 = 섹션 순서(home/region) + 히어로 변형 + 사진 칸 수 + 테마 CSS. 새 템플릿은 여기에 항목 하나를 추가하면 된다.
//  업로드 페이지는 선택한 템플릿의 photoSlots 만큼 '공사 전/후' 칸을 보여 준다(공통 입력은 모든 템플릿이 같다).
import { homePage as H, regionPage as R, sangdamPage as S, setImages } from './page-template.mjs';
export { setImages };

export const DEFAULT_TEMPLATE = 'consult';

export const TEMPLATES = {
  consult: {
    name: '기본 상담형', swatch: ['#12294d', '#c2410c'],
    desc: '대표 사진 + 작업 항목 + 전후 비교 4개 + 문자 상담. 가장 균형 잡힌 기본형입니다.',
    hero: 'image', heroSlot: 3, photoSlots: 4, compareCols: 2, photoNote: '사례 3번이 맨 위 대표 사진이 됩니다.',
    home: ['badges', 'items', 'symptoms', 'compare', 'steps', 'area', 'faq', 'picker', 'cta'],
    region: ['badges', 'intro', 'items', 'symptoms', 'compare', 'area', 'faq', 'picker', 'cta'],
    themeCss: '',
  },
  gallery: {
    name: '사진 중심형', swatch: ['#1f2933', '#0f9d8a'],
    desc: '작업 전후 사진을 맨 앞에 크게 보여 줍니다. 사례를 최대 8개까지 올릴 수 있어 시공 사진이 많은 업종에 맞습니다.',
    hero: 'image', heroSlot: 1, photoSlots: 8, compareCols: 2, photoNote: '사례 1번이 맨 위 대표 사진이 됩니다. 사진이 많을수록 좋습니다.',
    home: ['compare', 'items', 'steps', 'faq', 'area', 'picker', 'cta'],
    region: ['intro', 'compare', 'items', 'symptoms', 'area', 'faq', 'picker', 'cta'],
    themeCss: `:root{--navy:#1f2933;--navy-l:#2f3e4a;--hot:#0f9d8a;--hot-d:#0b7d6e;--cream:#f1f5f6;--line:#dfe6e8}
.wrap{max-width:1040px}.hero{min-height:300px}.hero-bg img{opacity:.5}h1{font-size:34px}.hl{color:#9ef0e2}.btn-sms{box-shadow:0 10px 26px rgba(15,157,138,.38)}
.ba{border-radius:18px}.ba-slider{aspect-ratio:1/1}.card:before{width:5px}.sec-badge{background:#e3f6f3;color:#0b7d6e}`,
  },
  guide: {
    name: '정보 안내형', swatch: ['#14532d', '#ca8a04'],
    desc: '유형별 안내 표와 진행 절차 중심으로, 사진이 없어도 완성도 있게 보입니다. 사진은 사례 2개까지(선택)입니다.',
    hero: 'plain', heroSlot: 0, photoSlots: 2, compareCols: 2, photoNote: '사진은 선택 사항입니다. 올리면 아래쪽에 전후 비교로 들어갑니다.',
    home: ['badges', 'guide', 'items', 'symptoms', 'steps', 'compare', 'faq', 'area', 'picker', 'cta'],
    region: ['badges', 'intro', 'guide', 'symptoms', 'compare', 'area', 'faq', 'picker', 'cta'],
    themeCss: `:root{--navy:#14532d;--navy-l:#166534;--hot:#ca8a04;--hot-d:#a16207;--cream:#f3f8f3;--line:#dde7de}
.hero-plain{background:#f3f8f3;min-height:0;border-bottom:1px solid var(--line)}.hero-plain .hero-in{padding:44px 22px 40px}
.hero-plain h1{color:#14532d}.hero-plain .hl{color:#a16207}.hero-plain .lead{color:#3d4d43}.hero-plain .crumb,.hero-plain .crumb a{color:#5c6d62}.hero-plain .cta-note{color:#4b5b51}
.hero-plain .btn-tel{background:#fff;color:#14532d;border:1.5px solid #14532d}.btn-sms{color:#fff;box-shadow:0 10px 26px rgba(202,138,4,.34)}.sec-badge{background:#fbf3d9;color:#a16207}`,
  },
  simple: {
    name: '간편 원페이지형', swatch: ['#111827', '#f59e0b'],
    desc: '전화·문자 버튼을 크게 두고 구성을 짧게 줄였습니다. 빠르게 연락을 받고 싶은 업종에 맞습니다. 사진은 사례 2개까지입니다.',
    hero: 'split', heroSlot: 1, photoSlots: 2, compareCols: 2, photoNote: '사례 1번이 첫 화면의 작은 사진으로 들어갑니다.',
    home: ['items', 'compare', 'picker', 'area', 'faq', 'cta'],
    region: ['intro', 'items', 'compare', 'picker', 'area', 'faq', 'cta'],
    themeCss: `:root{--navy:#111827;--navy-l:#1f2937;--hot:#f59e0b;--hot-d:#d97706;--cream:#f7f8fa;--line:#e5e7eb}
.hero-split{min-height:0}.hero-split .hero-in{display:grid;grid-template-columns:1.25fr 1fr;gap:26px;align-items:center;padding:46px 22px}
.hero-card{display:flex;flex-direction:column;gap:10px;background:#fff;color:#111827;border-radius:18px;padding:22px;box-shadow:0 18px 40px rgba(0,0,0,.3)}
.hero-card b{font-size:27px;letter-spacing:-.02em}.hero-card span{font-size:14px;color:#6b7280;line-height:1.5}.hero-card .btn{justify-content:center}
.hero-card .btn-tel{background:#111827;color:#fff;border:0}.btn-sms{color:#111827;box-shadow:0 10px 26px rgba(245,158,11,.4)}.sec-badge{background:#fef3c7;color:#b45309}
@media(max-width:700px){.hero-split .hero-in{grid-template-columns:1fr}}`,
  },
};

export const templateOf = (id) => { const t = TEMPLATES[id] || TEMPLATES[DEFAULT_TEMPLATE]; return { id: TEMPLATES[id] ? id : DEFAULT_TEMPLATE, ...t }; };
// 업로드 페이지·미리보기가 쓰는 요약(코드 없는 부분만)
export const templateList = () => Object.entries(TEMPLATES).map(([id, t]) => ({ id, name: t.name, desc: t.desc, swatch: t.swatch, photoSlots: t.photoSlots, heroSlot: t.heroSlot, photoNote: t.photoNote }));

export const homePage = (a) => H({ ...a, tpl: templateOf(a.meta && a.meta.template) });
export const regionPage = (a) => R({ ...a, tpl: templateOf(a.meta && a.meta.template) });
export const sangdamPage = (a) => S({ ...a, tpl: templateOf(a.meta && a.meta.template) });
