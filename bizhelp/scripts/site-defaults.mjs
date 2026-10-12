// 키워드 사이트 푸터·상담 페이지의 기본 사업자 정보와 연락처.
// 페이지가 분양되어 업로드 페이지에 값이 입력되면 입력값이 우선하고, 비어 있는 항목만 여기 기본값으로 채운다.
export const DEFAULT_PROFILE = {
  company: '수리위키',
  phone: '010-4684-8838',
  kakao: 'https://pf.kakao.com/_bcVPX',
  ceo: '',
  regno: '',
  address: '',
  instagram: '',
  blog: '',
  youtube: '',
  threads: '',
  website: '',
};

const filled = (v) => (Array.isArray(v) ? v.length > 0 : String(v ?? '').trim() !== '');
export function resolveProfile(p = {}) {
  const out = { ...DEFAULT_PROFILE };
  for (const k of Object.keys(DEFAULT_PROFILE)) if (filled(p[k])) out[k] = p[k];
  return out;
}
