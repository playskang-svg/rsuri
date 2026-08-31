import { RepairCategory, RegionItem, WikiKeywordPage } from '../types';

export const INITIAL_REGIONS: RegionItem[] = [
  {
    id: 'reg-1',
    province: '서울특별시',
    cityDistrict: '강남구',
    neighborhood: '역삼동',
    fullAddress: '서울특별시 강남구 역삼동',
    lat: 37.5006,
    lng: 127.0365,
    housingCharacteristics: '10~25년 차 고층 아파트 및 오피스텔 밀집. 싱크대 수전/배수구 노후화 및 직수/온수 배관 점검 수요 다수.',
    repairDemandScore: 98,
  },
  {
    id: 'reg-2',
    province: '서울특별시',
    cityDistrict: '서초구',
    neighborhood: '반포동',
    fullAddress: '서울특별시 서초구 반포동',
    lat: 37.5038,
    lng: 127.0048,
    housingCharacteristics: '대단지 아파트 밀집 지역. 욕실 고급 도기 리모델링 및 샷시 창호 단열/차음 롤러 교체 수요 최고치.',
    repairDemandScore: 95,
  },
  {
    id: 'reg-3',
    province: '서울특별시',
    cityDistrict: '송파구',
    neighborhood: '잠실동',
    fullAddress: '서울특별시 송파구 잠실동',
    lat: 37.5133,
    lng: 127.0844,
    housingCharacteristics: '초대형 아파트 단지(엘스/리센츠/트리지움). 마루 바닥 흠집 보수 및 친환경 도배/누수 탐지 정기 점검 수요.',
    repairDemandScore: 94,
  },
  {
    id: 'reg-4',
    province: '서울특별시',
    cityDistrict: '마포구',
    neighborhood: '공덕동',
    fullAddress: '서울특별시 마포구 공덕동',
    lat: 37.5445,
    lng: 126.9515,
    housingCharacteristics: '주상복합 및 다세대 빌라 혼합. 보일러 배관 에어빼기 및 결로 방수/타일 들뜸 보수 의뢰 집중.',
    repairDemandScore: 91,
  },
  {
    id: 'reg-5',
    province: '서울특별시',
    cityDistrict: '영등포구',
    neighborhood: '여의도동',
    fullAddress: '서울특별시 영등포구 여의도동',
    lat: 37.5218,
    lng: 126.9242,
    housingCharacteristics: '30~45년 차 노후 아파트 다수. 중앙난방/개별난방 배관 녹물 제거 및 전기 누전 차단기 긴급 수리 다수.',
    repairDemandScore: 96,
  },
  {
    id: 'reg-6',
    province: '경기도',
    cityDistrict: '성남시 분당구',
    neighborhood: '정자동',
    fullAddress: '경기도 성남시 분당구 정자동',
    lat: 37.3662,
    lng: 127.1085,
    housingCharacteristics: '1기 신도시 30년 차 아파트. 지역난방 열교환기 및 온수 분배기 누수/욕실 타일 들뜸 빈번.',
    repairDemandScore: 97,
  },
  {
    id: 'reg-7',
    province: '경기도',
    cityDistrict: '수원시 영통구',
    neighborhood: '이의동(광교)',
    fullAddress: '경기도 수원시 영통구 이의동',
    lat: 37.2965,
    lng: 127.0483,
    housingCharacteristics: '신축 5~10년 차 아파트 단지. 샷시 모헤어 교체, 음식물 분쇄기 탈거/원복, 스마트 LED 조명 교체 수요.',
    repairDemandScore: 89,
  },
  {
    id: 'reg-8',
    province: '부산광역시',
    cityDistrict: '해운대구',
    neighborhood: '우동(마린시티)',
    fullAddress: '부산광역시 해운대구 우동',
    lat: 37.1593,
    lng: 129.1415,
    housingCharacteristics: '해안가 고층 주상복합. 해풍/태풍 대비 창호 실리콘 코킹, 염분 부식 하드웨어 교체, 베란다 우레탄 방수 특화.',
    repairDemandScore: 92,
  },
  {
    id: 'reg-9',
    province: '서울특별시',
    cityDistrict: '양천구',
    neighborhood: '목동',
    fullAddress: '서울특별시 양천구 목동',
    lat: 37.5370,
    lng: 126.8732,
    housingCharacteristics: '목동 1~14단지 구축 대단지. 노후 동배관 누수 탐지, 욕실 방수, 창호 단열 샷시 수리 집중.',
    repairDemandScore: 96,
  },
  {
    id: 'reg-10',
    province: '경기도',
    cityDistrict: '안양시 동안구',
    neighborhood: '평촌동',
    fullAddress: '경기도 안양시 동안구 평촌동',
    lat: 37.3912,
    lng: 126.9634,
    housingCharacteristics: '평촌 신도시 아파트. 난방 분배기 녹물 청소, 변기/세면대 교체, 타일 들뜸 보수 요청 다수.',
    repairDemandScore: 93,
  },
];

// Comprehensive 0815 Home Repair Keyword Matrix (공사명 메인 키워드 30종 이상)
export const MAIN_REPAIR_SERVICES: {
  mainName: string;
  category: RepairCategory;
  description: string;
  avgCost: string;
  difficulty: 'EASY (자가수리 가능)' | 'MEDIUM (준전문가급/도구필요)' | 'HARD (전문가 출장 필수)';
  keywords: string[];
}[] = [
  // 1. 주방/싱크대 (Kitchen/Sink)
  {
    mainName: '싱크대 수리 및 배수구 세트 교체',
    category: '주방/싱크대',
    description: '악취 차단 트랩 및 스텐 배수구 교체, 싱크대 원홀 수전 누수 수리, 상판 크랙 보수',
    avgCost: '8만 ~ 18만원',
    difficulty: 'EASY (자가수리 가능)',
    keywords: ['싱크대수리', '싱크대배수구교체', '원홀수전교체', '싱크대악취차단', '주방누수'],
  },
  {
    mainName: '싱크대 거위목 원홀 수전 교체 및 누수 수리',
    category: '주방/싱크대',
    description: '헤드 인출식 고급 거위목 수전 교체, 하부장 온수/직수 연결 호스 누수 차단',
    avgCost: '7만 ~ 15만원',
    difficulty: 'EASY (자가수리 가능)',
    keywords: ['싱크대수전교체', '주방수전누수', '거위목수전설치', '원홀수전', '수전호스물샘'],
  },
  {
    mainName: '주방 렌지후드 교체 및 자동식 소화기 이전',
    category: '주방/싱크대',
    description: '기름때 찌든 후드 탈거, 고풍량 저소음 하츠/파세코 슬림 후드 및 소화기 안전 이전',
    avgCost: '12만 ~ 26만원',
    difficulty: 'MEDIUM (준전문가급/도구필요)',
    keywords: ['렌지후드교체', '주방환풍기', '슬림후드설치', '후드자동소화기', '주방배기모터'],
  },
  {
    mainName: '싱크대 인조대리석 상판 크랙 보수 및 연마 광택',
    category: '주방/싱크대',
    description: '갈라진 상판 V커팅 후 전용 에폭시 본드 주입, 순차 샌딩으로 완벽 평탄화 복원',
    avgCost: '15만 ~ 35만원',
    difficulty: 'MEDIUM (준전문가급/도구필요)',
    keywords: ['싱크대상판크랙', '인조대리석보수', '상판연마광택', '주방상판갈라짐', '대리석접합'],
  },
  {
    mainName: '음식물 분쇄기 철거 및 직수 배관 원복',
    category: '주방/싱크대',
    description: '고장난 디스포저 안전 철거 후 환경부 인증 올스텐 S트랩 및 직수 배관 원복 시공',
    avgCost: '7만 ~ 14만원',
    difficulty: 'EASY (자가수리 가능)',
    keywords: ['음식물분쇄기철거', '디스포저탈거', '싱크대원복', '스텐배수통교체', '음식물처리기철거'],
  },

  // 2. 누수/방수 (Leak/Waterproof)
  {
    mainName: '정밀 누수 탐지 및 배관 긴급 공사',
    category: '누수/방수',
    description: '공압/가스/청음/열화상 카메라를 통한 아랫집 천장 누수 원인 100% 규명 및 당일 배관 보수',
    avgCost: '25만 ~ 60만원',
    difficulty: 'HARD (전문가 출장 필수)',
    keywords: ['누수탐지', '아랫집누수', '수도배관누수', '열화상누수검사', '천장물샘'],
  },
  {
    mainName: '아랫집 천장 누수 책임 규명 및 일배책 보험 대행',
    category: '누수/방수',
    description: '손해방지비용 적용 일상생활배상책임보험 기술소견서 및 피해 복구 견적서 무료 대행',
    avgCost: '30만 ~ 70만원',
    difficulty: 'HARD (전문가 출장 필수)',
    keywords: ['일배책보험누수', '일상생활배상책임', '천장도배복구', '누수피해보상', '보험청구서류'],
  },
  {
    mainName: '화장실 바닥 비파괴 침투 방수 공사',
    category: '누수/방수',
    description: '타일을 깨지 않고 특수 고분자 침투 방수재를 주입하여 줄눈 및 유가 하부 누수 완벽 차단',
    avgCost: '35만 ~ 75만원',
    difficulty: 'HARD (전문가 출장 필수)',
    keywords: ['비파괴방수', '화장실바닥누수', '침투방수공사', '타일안깨고방수', '욕실누수차단'],
  },
  {
    mainName: '베란다 창틀 빗물 누수 외부 실리콘 코킹',
    category: '누수/방수',
    description: '비 올 때 창틀 틈새 빗물 유입 방지, 노후 실리콘 제거 후 고탄성 변성 우레탄 코킹',
    avgCost: '20만 ~ 55만원',
    difficulty: 'HARD (전문가 출장 필수)',
    keywords: ['창틀코킹', '베란다빗물누수', '외부실리콘시공', '창호누수보수', '로프코킹'],
  },
  {
    mainName: '옥상 및 발코니 우레탄 방수 공사',
    category: '누수/방수',
    description: '바닥 면갈이, 우레탄 하도 프라이머, 중도 3mm 도포, 자외선 차단 상도 마감',
    avgCost: '50만 ~ 150만원',
    difficulty: 'HARD (전문가 출장 필수)',
    keywords: ['옥상방수', '우레탄방수', '발코니방수', '옥상크랙보수', '건물외벽방수'],
  },

  // 3. 욕실/화장실 (Bathroom/Toilet)
  {
    mainName: '욕실/화장실 부분 리모델링 및 도기 교체',
    category: '욕실/화장실',
    description: '치마형 양변기 교체, 세면기 팝업/트랩 교체, 샤워 수전 및 슬라이드바 설치',
    avgCost: '15만 ~ 45만원',
    difficulty: 'MEDIUM (준전문가급/도구필요)',
    keywords: ['화장실변기교체', '세면대수리', '욕실샤워수전', '화장실부분수리', '욕실도기설치'],
  },
  {
    mainName: '치마형 양변기 교체 및 악취 플랜지 밀착',
    category: '욕실/화장실',
    description: '물때가 끼지 않는 민자 치마형 변기, 정심 플랜지 고무링 결합으로 암모니아 냄새 차단',
    avgCost: '18만 ~ 32만원',
    difficulty: 'MEDIUM (준전문가급/도구필요)',
    keywords: ['치마형변기교체', '양변기설치', '변기냄새차단', '대림바스변기', '화장실도기교체'],
  },
  {
    mainName: '변기 물탱크 부속 세트 교체 및 누수 차단',
    category: '욕실/화장실',
    description: '필밸브, 사이펀 마개, 부구 고장으로 인한 물 넘침 및 삐- 소음 부속품 전면 교체',
    avgCost: '5만 ~ 9만원',
    difficulty: 'EASY (자가수리 가능)',
    keywords: ['변기부속교체', '변기물통소음', '변기물샘', '필밸브교체', '변기부품수리'],
  },
  {
    mainName: '세면대 교체 및 원터치 팝업 트랩 수리',
    category: '욕실/화장실',
    description: '벽걸이 평면붙임 세면대 설치, 머리카락 청소가 쉬운 분리형 자동 팝업 및 P트랩 신설',
    avgCost: '10만 ~ 22만원',
    difficulty: 'MEDIUM (준전문가급/도구필요)',
    keywords: ['세면대교체', '세면대팝업수리', '세면기배수관', '화장실세면대', '자동폽업교체'],
  },
  {
    mainName: '욕실 힘펠 역풍방지 댐퍼 환풍기 교체',
    category: '욕실/화장실',
    description: '아랫집 담배 냄새 역류 완벽 차단 스마트 전동 댐퍼 및 고효율 저소음 팬 시공',
    avgCost: '9만 ~ 18만원',
    difficulty: 'EASY (자가수리 가능)',
    keywords: ['힘펠환풍기', '욕실담배냄새차단', '전동댐퍼설치', '화장실환풍기교체', '욕실역풍방지'],
  },

  // 4. 문/샷시/창호 (Door/Window/Sash)
  {
    mainName: '하이샷시 창호 롤러 및 모헤어 교체',
    category: '문/샷시/창호',
    description: '뻑뻑한 베란다 창문 롤러 교체, 삭아서 날리는 모헤어 털갈이, 외풍/소음 차단',
    avgCost: '12만 ~ 35만원',
    difficulty: 'MEDIUM (준전문가급/도구필요)',
    keywords: ['샷시수리', '창호롤러교체', '샷시모헤어', '창문외풍차단', '베란다샷시보수'],
  },
  {
    mainName: '샷시 깨진 레일 스테인리스 보강 씌우기',
    category: '문/샷시/창호',
    description: '플라스틱 레일 파손 부위에 고강도 스텐 레일을 덧씌워 롤러 이탈 없이 부드러운 구동 복원',
    avgCost: '10만 ~ 22만원',
    difficulty: 'MEDIUM (준전문가급/도구필요)',
    keywords: ['샷시레일파손', '스텐레일보강', '창문레일수리', '샷시바퀴교체', '창문틀보수'],
  },
  {
    mainName: '현관문 도어클로저 및 안전고리/말굽 설치',
    category: '문/샷시/창호',
    description: '쾅 닫히는 방화문 유압 도어체크 속도 조절 및 신형 교체, 페달식 고급 말굽 시공',
    avgCost: '6만 ~ 13만원',
    difficulty: 'EASY (자가수리 가능)',
    keywords: ['도어클로저교체', '도어체크수리', '현관문쾅닫힘', '현관말굽설치', '방화문안전고리'],
  },
  {
    mainName: '방문/욕실문 ABS 도어 교체 및 이지경첩 수리',
    category: '문/샷시/창호',
    description: '물에 썩지 않는 영림/예림 ABS 도어 교체, 처진 문짝 대패질 및 소음 방지 경첩 조절',
    avgCost: '16만 ~ 32만원',
    difficulty: 'MEDIUM (준전문가급/도구필요)',
    keywords: ['ABS도어교체', '방문경첩수리', '욕실문썩음', '문짝처짐보수', '방문손잡이교체'],
  },

  // 5. 도배/장판/바닥 (Flooring/Wallpaper)
  {
    mainName: '친환경 실크 도배 및 방 단열벽지 시공',
    category: '도배/장판/바닥',
    description: '결로 곰팡이 방지 억제 시공, 훼손된 벽지 1면 부분 도배 및 친환경 합지/실크 시공',
    avgCost: '20만 ~ 65만원',
    difficulty: 'MEDIUM (준전문가급/도구필요)',
    keywords: ['부분도배', '실크벽지시공', '결로곰팡이도배', '방한칸도배', '친환경벽지'],
  },
  {
    mainName: '누수 피해 천장 석고보드 복구 및 부분 도배',
    category: '도배/장판/바닥',
    description: '누수로 주저앉은 천장 석고보드 목공 보강, 곰팡이 항균 코팅 후 동일 톤 부분 도배',
    avgCost: '25만 ~ 55만원',
    difficulty: 'MEDIUM (준전문가급/도구필요)',
    keywords: ['누수천장도배', '석고보드교체', '천장물샘복구', '천장부분도배', '곰팡이제거도배'],
  },
  {
    mainName: '강마루/강화마루 찍힘·스크래치 인두 메꿈 보수',
    category: '도배/장판/바닥',
    description: '가구/물건 낙하로 파인 마루 바닥을 전용 하드왁스 조색 및 인두로 무늬결 완벽 복원',
    avgCost: '9만 ~ 18만원',
    difficulty: 'EASY (자가수리 가능)',
    keywords: ['마루찍힘보수', '강마루스크래치', '바닥보수', '마루메꿈제', '강화마루수리'],
  },

  // 6. 전기/조명/설비 (Electrical/Lighting)
  {
    mainName: 'LED 조명 교체 및 누전 차단기 점검 수리',
    category: '전기/조명/설비',
    description: '두꺼비집 차단기 떨어짐 긴급 복구, 거실/방 플리커프리 LED 엣지 조명 설치',
    avgCost: '7만 ~ 20만원',
    difficulty: 'HARD (전문가 출장 필수)',
    keywords: ['누전수리', '두꺼비집차단기', 'LED조명설치', '콘센트교체', '전기출장수리'],
  },
  {
    mainName: '두꺼비집 분전반 메인/분기 차단기 교체',
    category: '전기/조명/설비',
    description: '노후 누전 차단기(ELB/MCCB) 오작동 교체, 부하 분산 및 메거 절연저항 정밀 검측',
    avgCost: '8만 ~ 16만원',
    difficulty: 'HARD (전문가 출장 필수)',
    keywords: ['누전차단기교체', '두꺼비집수리', '전기차단기내려감', '분전반교체', '전기출장기사'],
  },
  {
    mainName: '인덕션·하이라이트 단독 4sq 직결 전기 배선',
    category: '전기/조명/설비',
    description: '수입 고용량 인덕션 차단기 떨어짐 방지 전용 4.0sq 배선 및 직결 누전차단기 설치',
    avgCost: '14만 ~ 28만원',
    difficulty: 'HARD (전문가 출장 필수)',
    keywords: ['인덕션단독배선', '인덕션전기공사', '인덕션차단기설치', '주방전기증설', '직결배선공사'],
  },

  // 7. 배관/난방/보일러 (Piping/Heating/Boiler)
  {
    mainName: '보일러 배관 청소 및 온수 분배기 교체',
    category: '배관/난방/보일러',
    description: '편난방 방 한곳 안 따뜻함 해결, 난방수 녹물 고압 순환 세척, 밸브 누수 분배기 교체',
    avgCost: '18만 ~ 45만원',
    difficulty: 'HARD (전문가 출장 필수)',
    keywords: ['보일러배관청소', '난방분배기교체', '편난방해결', '방이안따뜻할때', '난방밸브누수'],
  },
  {
    mainName: '싱크대·하수구 역류 전동 스프링 및 석션 통수',
    category: '배관/난방/보일러',
    description: '기름 슬러지로 꽉 막힌 주방 배관 전동 샤프트 및 석션 장비로 관통 스케일링',
    avgCost: '10만 ~ 25만원',
    difficulty: 'MEDIUM (준전문가급/도구필요)',
    keywords: ['하수구막힘', '싱크대역류', '배관스케일링', '하수구뚫음', '플렉스샤프트'],
  },
  {
    mainName: '겨울철 언 수도 배관 스팀 해빙 긴급 출동',
    category: '배관/난방/보일러',
    description: '영하 한파로 얼어붙은 계량기 및 직수/온수 배관 고온 고압 스팀기로 배관 손상 없이 녹임',
    avgCost: '15만 ~ 35만원',
    difficulty: 'HARD (전문가 출장 필수)',
    keywords: ['수도동파녹임', '언수도해빙', '스팀해빙기', '겨울철물안나올때', '계량기해빙'],
  },

  // 8. 타일/대리석 (Tile/Marble)
  {
    mainName: '욕실 타일 들뜸 보수 및 줄눈 코팅',
    category: '타일/대리석',
    description: '깨지고 솟아오른 벽타일 압착 재부착 및 오염 없는 친환경 에폭시 줄눈 시공',
    avgCost: '18만 ~ 40만원',
    difficulty: 'MEDIUM (준전문가급/도구필요)',
    keywords: ['타일들뜸수리', '화장실타일보수', '줄눈시공', '타일깨짐수리', '아트월보수'],
  },
  {
    mainName: '화장실 오염 방지 친환경 폴리우레아 에폭시 줄눈',
    category: '타일/대리석',
    description: '변색되고 곰팡이 피는 백시멘트 제거 후 은나노 펄 에폭시 방수 줄눈 주입 코팅',
    avgCost: '16만 ~ 35만원',
    difficulty: 'MEDIUM (준전문가급/도구필요)',
    keywords: ['에폭시줄눈', '화장실줄눈시공', '줄눈코팅', '곰팡이방지줄눈', '욕실바닥줄눈'],
  },

  // 9. 방충망/환풍기/기타 (Screen/Vent/Misc)
  {
    mainName: '미세 촘촘 방충망 교체 및 틈새 차단',
    category: '방충망/환풍기/기타',
    description: '찢어지지 않는 고강도 블랙 모노필라멘트 미세망 시공, 날벌레/초파리 완벽 차단',
    avgCost: '6만 ~ 15만원',
    difficulty: 'EASY (자가수리 가능)',
    keywords: ['미세방충망', '방충망교체', '날벌레차단', '창문방충망틀', '베란다방충망'],
  },
  {
    mainName: '현관 롤 방충망 (원터치 자동 감김) 시공',
    category: '방충망/환풍기/기타',
    description: '복도식 아파트 및 빌라 현관문 통풍용 고급 감속기 내장 롤 방충망 맞춤 제작 시공',
    avgCost: '14만 ~ 25만원',
    difficulty: 'MEDIUM (준전문가급/도구필요)',
    keywords: ['현관롤방충망', '자동방충망', '현관문방충망', '원터치방충망', '접이식방충망'],
  },
];

export const INITIAL_WIKI_PAGES: WikiKeywordPage[] = [
  {
    id: 'wiki-1',
    slug: 'seoul-gangnam-yeoksam-sink-repair',
    repairMainName: '싱크대 수리 및 배수구 세트 교체',
    category: '주방/싱크대',
    region: INITIAL_REGIONS[0], // 서울 강남구 역삼동
    combinedKeyword: '강남구 역삼동 싱크대 수리',
    pageTitle: '강남구 역삼동 싱크대 수리 및 배수구 교체 비용 시세 & 표준 공정 가이드 | 수리위키',
    metaDescription: '서울 강남구 역삼동 싱크대 수리, 배수구 악취 차단 트랩 및 원홀 수전 교체 견적 시세표(8만~18만원). 역삼동 20분 내 출장 검증 마스터 및 실제 아파트 시공사례.',
    views: 3420,
    rating: 4.95,
    reviewCount: 48,
    diyDifficulty: 'EASY (자가수리 가능)',
    estimatedCost: {
      min: 80000,
      avg: 135000,
      max: 220000,
      partsCost: '올스텐 배수구 4~6만원 / KS인증 원홀 수전 5~8만원',
      laborCost: '역삼동 출장 및 표준 탈부착 공임 6~9만원',
      additionalCostFactors: [
        '음식물 탈수기/분쇄기 철거 및 직결 배관 연결 시 +2~3만원',
        '하부장 목재 바닥 썩음 보강판 덧댐 시 +3~5만원',
        '싱크대 상판 타공 규격 확장 필요 시 +2만원'
      ]
    },
    wikiGuide: {
      summary: '싱크대 하부 누수 및 악취의 90%는 노후된 S트랩 오버플로우 호스 경화 및 패킹 마모에서 발생합니다. 역삼동 일대 15년 차 이상 아파트는 올스텐 클린 배수구 교체만으로 위생과 악취를 완벽히 해결할 수 있습니다.',
      commonSymptoms: [
        '싱크대 하부장 문을 열었을 때 역한 하수구 냄새 및 곰팡이 냄새',
        '설거지 중 싱크대 수전 연결 호스 부위에서 물이 한 방울씩 떨어짐',
        '물이 시원하게 내려가지 않고 배수구 주위에 음식물 슬러지 흡착',
        '하부장 바닥에 물기가 흥건하게 고여 목재가 불어오르는 현상'
      ],
      steps: [
        {
          stepNum: 1,
          title: '원수 앵글밸브 차단 및 하부장 보양',
          desc: '싱크대 하부장 안쪽 냉/온수 앵글밸브를 시계방향으로 꽉 잠그고 잔수받이용 대야와 방수포를 깝니다.',
          tip: '밸브가 헛돌거나 부식된 경우 계량기 메인 밸브를 잠그고 작업해야 안전합니다.'
        },
        {
          stepNum: 2,
          title: '기존 배수구 및 주름관 호스 탈거',
          desc: '배수통 고정 링 너트를 전용 렌치나 손으로 반시계 방향으로 풀어 싱크볼과 분리합니다.',
          tip: '오랜 시간 찌든 때는 기름때 제거제를 분무 후 3분 뒤 분리하면 파손 없이 풀립니다.'
        },
        {
          stepNum: 3,
          title: '싱크볼 접촉면 샌딩 및 에탄올 살균',
          desc: '새 고무 패킹이 들뜨지 않도록 오래된 실리콘 찌꺼기와 유분기를 스크래퍼로 완벽히 청소합니다.'
        },
        {
          stepNum: 4,
          title: '올스텐 배수구 장착 및 V트랩 결합',
          desc: '물고임이 없는 신형 배수구를 상하단 패킹과 함께 체결하고 악취 역류 방지 캡을 바닥 하수관에 밀착 고정합니다.'
        },
        {
          stepNum: 5,
          title: '만수 누수 테스트 및 통수 검사',
          desc: '싱크볼에 물을 가득 채운 후 일시에 방류하여 연결 부위 휴지 테스트로 미세 누수를 검측합니다.'
        }
      ],
      diyVsProGuide: '일반 배수구 세트 교체는 첼라/몽키스패너만 있으면 1시간 내 DIY 가능합니다. 단, 싱크대 하부 온수분배기와 간섭되거나 앵글밸브 고장 시에는 수리 마스터를 호출하는 것이 안전합니다.',
      preventionTips: [
        '기름진 프라이팬 설거지 시 휴지로 기름기를 1차 제거 후 세척하세요.',
        '월 1회 베이킹소다 1컵 + 식초 1컵 후 80도 온수를 부어주면 슬러지가 예방됩니다.',
        '하부 주름관 호스가 U자로 쳐지지 않도록 구배(기울기)를 유지하세요.'
      ],
      warrantyPeriod: '수리위키 검증 마스터 시공 시 1년 무상 A/S 보증서 발급'
    },
    localPros: [
      {
        id: 'pro-101',
        name: '정우진 마스터',
        shopName: '역삼 스마트홈 수리 설비',
        rating: 4.98,
        reviewCount: 142,
        distance: '역삼역 4번 출구 반경 800m (출장 15분)',
        completedJobs: 1280,
        badges: ['배관기능장', '영업배상책임보험 2억원', '동네인증 7년'],
        phone: '0507-1340-9821',
        profileImg: '',
        intro: '역삼동 아파트/오피스텔 전문. 깔끔한 스텐 배수구와 KS 국산 수전만 취급합니다.',
        masterGrade: '설비기능장',
        safetyCertified: true
      },
      {
        id: 'pro-102',
        name: '김태호 기사',
        shopName: '강남 스피드 집수리',
        rating: 4.92,
        reviewCount: 89,
        distance: '선릉역 반경 1.5km (출장 20분)',
        completedJobs: 640,
        badges: ['설비기사 자격증', '야간/주말 출동 가능'],
        phone: '0507-1355-1102',
        profileImg: '',
        intro: '정직한 정찰제 가격과 꼼꼼한 마감 누수 테스트를 원칙으로 합니다.',
        masterGrade: '1급 시공기사',
        safetyCertified: true
      }
    ],
    caseStudies: [
      {
        id: 'case-1',
        title: '역삼 래미안 34평형 싱크대 하부 누수 및 올스텐 배수구 교체',
        buildingType: '역삼 래미안 아파트 104동',
        completedDate: '2026-08-18',
        costPaid: 140000,
        duration: '45분 소요',
        beforeImg: '',
        afterImg: '',
        diagramCategory: '주방/싱크대',
        beforeTechnicalData: {
          defectType: '하부 주름관 경화 파손 및 S트랩 역류',
          measuredValue: '미세 누수 12방울/분, 악취 수치 85ppb',
          diagnosticNote: '12년 경과 플라스틱 배수통 균열'
        },
        afterTechnicalData: {
          inspectionResult: '올스텐 304 클린 배수구 + 악취방지 V트랩 신설',
          certifiedValue: '수압 4.8bar 완벽 통수 (0 누수)',
          warrantyCode: 'SW-2026-0815-K01'
        },
        workDetails: [
          '노후 플라스틱 배수통 분리 후 기름때 침착부위 알코올 소독',
          '304 올스텐 클린 배수구 + 악취방지 V트랩 신설',
          'KS 인증 거위목 원홀 주방 수전 교체 및 누수 검측'
        ],
        reviewText: '역삼동 집수리 기사님이 약속시간 15분 만에 오셔서 뚝딱 교체해주셨습니다. 냄새가 싹 사라져서 너무 만족해요!',
        author: '박*현 고객님 (역삼동 주민)'
      }
    ],
    faqs: [
      {
        question: '역삼동 아파트 싱크대 수리 출장 시간과 당일 방문이 가능한가요?',
        answer: '네, 수리위키 역삼동 전담 마스터는 역삼 1,2동 인근에 상주하여 요청 후 평균 20~30분 이내에 현장 도착이 가능합니다.'
      },
      {
        question: '기존에 설치된 음식물 탈수기를 일반 스텐 배수구로 바꿀 수 있나요?',
        answer: '가능합니다. 고장난 탈수기를 깔끔하게 철거하고 냄새와 곰팡이가 생기지 않는 일체형 스텐 배수구로 교체해 드립니다.'
      },
      {
        question: '수리 후 다시 누수가 발생하면 어떻게 보장받나요?',
        answer: '수리위키 표준 보증 규정에 따라 시공일로부터 1년간 시공 결함으로 인한 누수는 100% 무상 A/S가 제공됩니다.'
      }
    ],
    geoMeta: {
      areaServed: '서울특별시 강남구 역삼동, 대치동, 도곡동, 삼성동 일원',
      geoRadius: '3000m',
      keywords: ['강남구 싱크대 수리', '역삼동 싱크대 배수구 교체', '역삼동 주방 수전 누수', '강남 집수리', '역삼동 배수통 교체 비용'],
      lsiKeywords: ['싱크대 하부장 냄새 제거', '올스텐 배수구 규격', '주방 수전 호스 교체', '역삼역 집수리 기사'],
      canonicalUrl: 'https://suriwiki.kr/wiki/seoul-gangnam-yeoksam-sink-repair'
    },
    createdAt: '2026-08-01',
    updatedAt: '2026-08-30'
  },
  {
    id: 'wiki-2',
    slug: 'gyeonggi-seongnam-bundang-jeongja-leak-detection',
    repairMainName: '정밀 누수 탐지 및 배관 긴급 공사',
    category: '누수/방수',
    region: INITIAL_REGIONS[5], // 경기 성남시 분당구 정자동
    combinedKeyword: '분당구 정자동 누수 탐지',
    pageTitle: '성남시 분당구 정자동 누수 탐지 및 배관 수리 비용 시세 & 표준 공정 가이드 | 수리위키',
    metaDescription: '분당 정자동 1기 신도시 아파트 누수 탐지, 청음/가스식 첨단 장비 검사 비용(25만~55만원). 아랫집 천장 물샘 책임 규명 및 일상생활배상책임보험 서류 무료 지원.',
    views: 4180,
    rating: 4.97,
    reviewCount: 62,
    diyDifficulty: 'HARD (전문가 출장 필수)',
    estimatedCost: {
      min: 250000,
      avg: 380000,
      max: 650000,
      partsCost: 'PB/에이콘 배관 및 압착 부속 5~10만원',
      laborCost: '정밀 청음/가스 탐지 및 배관 굴착 보수 25~45만원',
      additionalCostFactors: [
        '타일 바닥 철거 후 타일 복구 마감 시 +10~15만원',
        '온수/난방/직수 복합 누수 구간 발생 시 +10만원',
        '아랫집 천장 도배 복구 견적 별도 (보험 청구 가능)'
      ]
    },
    wikiGuide: {
      summary: '분당 정자동 30년 차 아파트는 동배관(동파이프) 핀홀(미세 구멍) 및 온수 분배기 연결 부속 노후화로 인한 누수가 잦습니다. 파괴 없이 가스식 탐지기로 1시간 내 위치를 정밀 특정합니다.',
      commonSymptoms: [
        '아랫집 거실이나 화장실 입구 천장에 벽지가 젖고 곰팡이가 번짐',
        '수도를 전혀 안 쓰는데도 수도 계량기 별표 바늘이 미세하게 회전함',
        '보일러에서 에러코드(난방수 부족)가 반복적으로 점등됨',
        '바닥 장판을 들추었을 때 시멘트가 축축하고 젖어있음'
      ],
      steps: [
        {
          stepNum: 1,
          title: '계량기 정밀 간이 압력 검사',
          desc: '온수/직수/난방 배관의 잔수를 비우고 공압 5~6bar를 주입하여 압력 게이지 강하 여부를 확인합니다.'
        },
        {
          stepNum: 2,
          title: '혼합가스 주입 및 추적식 가스 탐지',
          desc: '무해한 질소/수소 혼합가스를 배관에 주입하고 감도 높은 가스검출기로 누수 예상 지점을 1차 좁힙니다.'
        },
        {
          stepNum: 3,
          title: '정밀 청음식 탐지기로 핀포인트 확정',
          desc: '바닥 내부에서 가스가 새어 나오는 미세한 파열음을 청음봉으로 확인하여 5cm 오차 범위 내 위치를 찍습니다.'
        },
        {
          stepNum: 4,
          title: '최소 부위 바닥 굴착 및 배관 부속 교체',
          desc: '해당 지점 타일 1~2장만 최소 절단 후 부식된 배관을 잘라내고 무독성 PB 에이콘 배관으로 영구 연결합니다.'
        },
        {
          stepNum: 5,
          title: '재가압 누수 테스트 및 미장/타일 원복',
          desc: '30분간 압력 변화 제로를 확인한 후 방수 몰탈 미장 및 동일 계열 타일로 마감합니다.'
        }
      ],
      diyVsProGuide: '누수 탐지는 고가의 청음/가스 탐지 장비와 배관 공압 테스트 기술이 필수이므로 무조건 전문 누수 엔지니어의 시공이 필요합니다. 일상생활배상책임보험(일배책)으로 전액 보상 가능합니다.',
      preventionTips: [
        '겨울철 외출 시 보일러를 끄지 말고 외출 모드(15도 이상)를 유지하세요.',
        '분당 1기 신도시 지역난방 아파트는 5년에 1회 분배기 밸브 점검을 권장합니다.'
      ],
      warrantyPeriod: '누수 미해결 시 출장비 0원 / 수리 구간 2년 무상 보증'
    },
    localPros: [
      {
        id: 'pro-201',
        name: '최민수 소장',
        shopName: '분당 1등 정밀누수탐지공사',
        rating: 4.99,
        reviewCount: 215,
        distance: '정자역 카페거리 반경 1km (출장 15분)',
        completedJobs: 2400,
        badges: ['누수탐지 18년 경력', '보험청구 서류 100% 대행', '미해결시 0원'],
        phone: '0507-1400-3321',
        profileImg: '',
        intro: '못 찾으면 비용 안 받습니다. 분당 아파트 배관 구조 20년 노하우로 당일 해결합니다.',
        masterGrade: '수리위키 인증명장',
        safetyCertified: true
      }
    ],
    caseStudies: [
      {
        id: 'case-2',
        title: '정자동 한솔마을 4단지 온수관 핀홀 누수 당일 탐지 및 수리',
        buildingType: '분당 정자동 한솔마을 402동',
        completedDate: '2026-08-25',
        costPaid: 380000,
        duration: '1시간 40분 소요',
        beforeImg: '',
        afterImg: '',
        diagramCategory: '누수/방수',
        beforeTechnicalData: {
          defectType: '동파이프 온수관 엘보 부위 미세 핀홀 누수',
          measuredValue: '가스 탐지 수치 980ppm 감지',
          diagnosticNote: '아랫집 안방 천장 벽지 젖음'
        },
        afterTechnicalData: {
          inspectionResult: 'PB 15A 에이콘 배관 원터치 융착 연결 완료',
          certifiedValue: '공압 5.5bar 30분 무감압 PASS',
          warrantyCode: 'SW-2026-0815-L02'
        },
        workDetails: [
          '가스 탐지기로 싱크대 밑 동배관 핀홀 지점 10분 만에 탐색',
          '타일 1장만 최소 파쇄 후 PB 배관 연결 부속 신설',
          '보험 청구용 기술소견서 및 견적서 즉시 발급'
        ],
        reviewText: '아랫집 천장에 물이 떨어져서 너무 당황했는데 소장님이 오셔서 타일 1장만 깨고 바로 잡아주셨어요!',
        author: '이*정 고객님 (정자동 주민)'
      }
    ],
    faqs: [
      {
        question: '누수 원인을 못 찾으면 탐지 비용을 내야 하나요?',
        answer: '아닙니다. 수리위키 분당 누수 마스터는 [원인 미규명 시 탐지비 0원] 안심 보장제를 적용하고 있습니다.'
      },
      {
        question: '아랫집 도배 및 피해 보상도 보험 처리가 되나요?',
        answer: '네. 가입하신 실손보험이나 운전자보험의 [가족 일상생활배상책임 특약]으로 우리 집 수리비(손해방지비용)와 아랫집 도배비까지 혜택을 받으실 수 있도록 증빙 서류를 무료 발급해 드립니다.'
      }
    ],
    geoMeta: {
      areaServed: '경기도 성남시 분당구 정자동, 수내동, 서현동, 야탑동, 판교동 일원',
      geoRadius: '5000m',
      keywords: ['분당구 누수 탐지', '정자동 아파트 누수', '분당 누수 배관 공사', '정자동 아랫집 천장 물샘', '분당 일상생활배상책임보험 누수'],
      lsiKeywords: ['온수 파이프 핀홀 수리', '정자역 집수리 누수', '열화상 카메라 누수 검사', '아파트 난방 배관 누수'],
      canonicalUrl: 'https://suriwiki.kr/wiki/gyeonggi-seongnam-bundang-jeongja-leak-detection'
    },
    createdAt: '2026-08-05',
    updatedAt: '2026-08-29'
  },
  {
    id: 'wiki-3',
    slug: 'seoul-seocho-banpo-bathroom-remodel',
    repairMainName: '욕실/화장실 부분 리모델링 및 도기 교체',
    category: '욕실/화장실',
    region: INITIAL_REGIONS[1], // 서울 서초구 반포동
    combinedKeyword: '서초구 반포동 화장실 리모델링',
    pageTitle: '서초구 반포동 화장실 욕실 부분 리모델링 & 변기/세면대 교체 시세표 | 수리위키',
    metaDescription: '서울 서초구 반포동 아파트 욕실 부분 수리, 아메리칸스탠다드 치마형 양변기/세면기 교체 및 샤워 수전 시공 견적(18만~45만원). 반포동 당일 시공 검증 기사.',
    views: 2890,
    rating: 4.93,
    reviewCount: 39,
    diyDifficulty: 'MEDIUM (준전문가급/도구필요)',
    estimatedCost: {
      min: 160000,
      avg: 320000,
      max: 650000,
      partsCost: '치마형 고급 양변기 18~28만원 / 평면붙임 세면기 12~18만원',
      laborCost: '기존 도기 철거 폐기 및 설치 공임 10~15만원',
      additionalCostFactors: [
        '정심/편심 배관 위치 조정 필요 시 +3만원',
        '욕실 환풍기 힘펠 저소음 댐퍼 모델 교체 시 +5~8만원',
        '기존 욕조 철거 및 방수 마감 시 +35~50만원'
      ]
    },
    wikiGuide: {
      summary: '반포동 아파트의 경우 배관 간격(정심 300mm) 규격이 표준화되어 있어 하루 만에 소음과 분진을 최소화하고 양변기, 세면기, 슬라이드 수납장을 원데이 부분 교체할 수 있습니다.',
      commonSymptoms: [
        '양변기 하부 백시멘트 줄눈이 깨져서 악취가 올라오고 흔들림',
        '물탱크 내부 부속 노후화로 삐- 소리가 나거나 물이 멈추지 않음',
        '세면기 폽업(물마개)이 끼어서 올라오지 않거나 하부 배수관 누수',
        '오래된 수전의 도금이 벗겨지고 샤워기 수압이 약해짐'
      ],
      steps: [
        {
          stepNum: 1,
          title: '욕실 바닥 타일 보양 및 기존 도기 철거',
          desc: '급수 밸브 차단 후 기존 변기와 세면대를 타일 손상 없이 안전하게 분리 및 반출 폐기합니다.'
        },
        {
          stepNum: 2,
          title: '오수관 정심 플랜지 결합 및 수평 측정',
          desc: '악취 100% 차단을 위해 고무 패킹이 내장된 VG2 정심 플랜지를 오수관에 꽉 맞물립니다.'
        },
        {
          stepNum: 3,
          title: '신형 치마형 양변기 거치 및 바이오 실리콘 고정',
          desc: '수평계로 좌우/전후 완벽 수평을 맞춘 뒤 곰팡이가 생기지 않는 아덱스 바이오 실리콘으로 마감합니다.'
        },
        {
          stepNum: 4,
          title: '세면기 벽타공 및 자동 팝업/트랩 설치',
          desc: '머리카락 청소가 간편한 원터치 분리형 스텐 팝업과 P트랩을 연결합니다.'
        }
      ],
      diyVsProGuide: '도기류는 30kg 이상의 무거운 도자기 재질로 떨어뜨릴 경우 타일 파손 및 신체 부상 위험이 높으므로 2인 1조 또는 전문 기사 시공을 권장합니다.',
      preventionTips: [
        '변기 세정제(파란물)를 수조에 장기 방치하면 고무 패킹이 삭아 누수가 발생할 수 있습니다.',
        '청소 시 락스 원액보다는 중성세제를 부드러운 스펀지에 묻혀 닦아주세요.'
      ],
      warrantyPeriod: '시공 하자 1년 무상 보증 및 정품 도기 A/S 제공'
    },
    localPros: [
      {
        id: 'pro-301',
        name: '한상우 대표',
        shopName: '반포 바스 디자인 & 리페어',
        rating: 4.96,
        reviewCount: 168,
        distance: '고속터미널역 반경 1km (출장 15분)',
        completedJobs: 1850,
        badges: ['욕실시공 15년', '대림바스 공식 인증점', '폐기물 수거 무료'],
        phone: '0507-1388-7741',
        profileImg: '',
        intro: '반포 자이/래미안퍼스티지/아크로리버파크 시공 경험 500건 이상. 꼼꼼한 마감 약속드립니다.',
        masterGrade: '대한민국 숙련기능인',
        safetyCertified: true
      }
    ],
    caseStudies: [
      {
        id: 'case-3',
        title: '반포 래미안퍼스티지 양변기 및 세면기 반나절 교체',
        buildingType: '반포 래미안퍼스티지 112동',
        completedDate: '2026-08-22',
        costPaid: 450000,
        duration: '2시간 30분 소요',
        beforeImg: '',
        afterImg: '',
        diagramCategory: '욕실/화장실',
        beforeTechnicalData: {
          defectType: '기존 변기 백시멘트 탈락 및 오수관 정심 패킹 삭음',
          measuredValue: '변기 흔들림 유격 6.5mm, 악취 역류',
          diagnosticNote: '15년 경과 구형 변기 내부 크랙'
        },
        afterTechnicalData: {
          inspectionResult: '대림바스 투피스 치마형 + VG2 정심 밀착 결합',
          certifiedValue: '아덱스 바이오 실리콘 방수 마감 합격',
          warrantyCode: 'SW-2026-0815-B03'
        },
        workDetails: [
          '대림바스 투피스 치마형 변기 + 아메리칸스탠다드 세면기 설치',
          '기존 백시멘트 오염 제거 후 은색 펄 바이오 실리콘 라인 시공',
          '폐도기 무료 수거 및 잔해물 청소 완료'
        ],
        reviewText: '먼지도 안 날리게 보양하고 반나절 만에 새 화장실처럼 바꿔주셨네요. 만족도 최고입니다.',
        author: '조*진 고객님 (반포동 주민)'
      }
    ],
    faqs: [
      {
        question: '시공 후 변기는 바로 사용할 수 있나요?',
        answer: '바이오 실리콘 양생을 위해 시공 후 24시간 동안은 변기에 앉지 마시고 물청소는 피해 주셔야 합니다.'
      }
    ],
    geoMeta: {
      areaServed: '서울특별시 서초구 반포동, 잠원동, 서초동, 방배동 일원',
      geoRadius: '4000m',
      keywords: ['서초구 화장실 리모델링', '반포동 변기 교체', '반포동 세면대 수리', '서초동 욕실 부분 인테리어', '반포 아파트 욕실 수리'],
      lsiKeywords: ['치마형 변기 설치비용', '욕실 실리콘 재시공', '반포동 집수리 전문가', '욕실 냄새 차단'],
      canonicalUrl: 'https://suriwiki.kr/wiki/seoul-seocho-banpo-bathroom-remodel'
    },
    createdAt: '2026-08-08',
    updatedAt: '2026-08-30'
  },
  {
    id: 'wiki-4',
    slug: 'seoul-mapo-gongdeok-sash-window-repair',
    repairMainName: '하이샷시 창호 롤러 및 모헤어 교체',
    category: '문/샷시/창호',
    region: INITIAL_REGIONS[3], // 서울 마포구 공덕동
    combinedKeyword: '마포구 공덕동 샷시 창호 수리',
    pageTitle: '마포구 공덕동 샷시 롤러/모헤어 교체 및 외풍 차단 비용 시세 | 수리위키',
    metaDescription: '마포구 공덕동 샷시 창문 뻑뻑함 해결, 롤러 교체 및 삭은 모헤어 털갈이 시세표(12만~35만원). 베란다 찬바람 소음 완벽 차단 및 당일 시공.',
    views: 2150,
    rating: 4.91,
    reviewCount: 29,
    diyDifficulty: 'MEDIUM (준전문가급/도구필요)',
    estimatedCost: {
      min: 120000,
      avg: 210000,
      max: 380000,
      partsCost: '트윈 롤러 2~4만원 / 고밀도 4중 모헤어 3~6만원',
      laborCost: '대형 창문 탈거 및 레일 수리 공임 9~16만원',
      additionalCostFactors: [
        '깨진 하부 레일 스테인리스 레일 보강 씌우기 시 +4~7만원',
        '풍지판 및 창문 잠금 크리센트 교체 시 +1~2만원'
      ]
    },
    wikiGuide: {
      summary: '10년 이상 된 하이샷시 창문이 무겁게 열리고 털가루가 날린다면 롤러 베어링 마모와 모헤어 삭음 현상 때문입니다. 창문 전체를 교체할 필요 없이 롤러와 모헤어만 바꾸면 새 창문처럼 부드럽고 따뜻해집니다.',
      commonSymptoms: [
        '베란다 문을 열고 닫을 때 끼익거리는 소음과 함께 바닥이 긁힘',
        '창문 틈새에서 검은색 미세 플라스틱 털가루가 날림',
        '겨울철 창문을 닫아도 틈새로 황소바람과 외부 도로 소음이 유입됨',
        '창문 레일 바닥 플라스틱이 깨져서 롤러가 헛도는 현상'
      ],
      steps: [
        {
          stepNum: 1,
          title: '안전 흡착기를 이용한 창문 탈거',
          desc: '2인 1조로 전용 유리 흡착기를 이용해 무거운 이중창을 안전하게 프레임에서 탈거합니다.'
        },
        {
          stepNum: 2,
          title: '노후 롤러 분리 및 하부 레일 클리닝',
          desc: '녹슬고 깨진 단일 롤러를 제거하고 먼지가 쌓인 레일을 청소합니다.'
        },
        {
          stepNum: 3,
          title: '고하중 트윈 베어링 롤러 장착 및 수평 세팅',
          desc: '부드러운 구동을 위해 80kg 하중을 견디는 트윈 볼베어링 롤러로 교체하고 창문 높낮이를 수평 조절합니다.'
        },
        {
          stepNum: 4,
          title: '4중 방풍 모헤어(털) 전면 교체 및 풍지판 부착',
          desc: '삭아서 부서지는 구형 털을 긁어내고 방수 코팅된 9mm 고밀도 핀모헤어를 레일에 압착 삽입합니다.'
        }
      ],
      diyVsProGuide: '대형 발코니 창문은 무게가 60~80kg에 달해 낙하 파손 및 유리 파손 위험이 크므로 샷시 전문 기술자 2인 출장 시공을 강력 권장합니다.',
      preventionTips: [
        '레일에 모래나 이물질이 끼면 롤러 수명이 단축되므로 정기적으로 진공청소기로 청소해 주세요.',
        '롤러에 WD-40을 과도하게 뿌리면 먼지가 흡착되어 굳을 수 있으니 실리콘 윤활제를 사용하세요.'
      ],
      warrantyPeriod: '롤러 파손 및 구동 불량 1년 무상 보증'
    },
    localPros: [
      {
        id: 'pro-401',
        name: '박성철 샷시명장',
        shopName: '공덕 샷시창호 테크',
        rating: 4.95,
        reviewCount: 94,
        distance: '공덕역 6번 출구 반경 600m (출장 10분)',
        completedJobs: 1100,
        badges: ['창호시공 20년', 'KCC/LG하우시스 전문', '스텐레일 특허보유'],
        phone: '0507-1390-4421',
        profileImg: '',
        intro: '샷시 비싼 돈 들여 바꾸지 마세요. 롤러와 모헤어 교체로 10년 더 새것처럼 만들어 드립니다.',
        masterGrade: '수리위키 인증명장',
        safetyCertified: true
      }
    ],
    caseStudies: [
      {
        id: 'case-4',
        title: '공덕 래미안 3차 거실 분합창 롤러 교체 및 모헤어 털갈이',
        buildingType: '공덕 래미안 3차 305동',
        completedDate: '2026-08-20',
        costPaid: 220000,
        duration: '1시간 소요',
        beforeImg: '',
        afterImg: '',
        diagramCategory: '문/샷시/창호',
        beforeTechnicalData: {
          defectType: '베어링 파손 단일 롤러 & 삭은 모헤어 가루 날림',
          measuredValue: '창문 개폐 마찰 저항 16.5kgf',
          diagnosticNote: '14년 경과 레일 긁힘 현상'
        },
        afterTechnicalData: {
          inspectionResult: '고하중 트윈 베어링 롤러 + 4중 방풍 모헤어 시공',
          certifiedValue: '개폐 구동력 2.1kgf로 경량화 합격',
          warrantyCode: 'SW-2026-0815-S04'
        },
        workDetails: [
          '거실 2중 창호 탈거 후 손상된 단일 롤러 분리',
          '80kg 하중 지지 트윈 베어링 롤러 교체 및 좌우 수평 레벨링',
          '4중 고밀도 핀모헤어 교체 및 상하부 풍지판 시공'
        ],
        reviewText: '새끼손가락으로 밀어도 스르륵 열릴 정도로 부드러워졌어요. 찬바람도 싹 막혔습니다.',
        author: '정*수 고객님 (공덕동 주민)'
      }
    ],
    faqs: [
      {
        question: '비가 오는 날에도 샷시 롤러/모헤어 수리가 가능한가요?',
        answer: '네, 실내에서 창문을 탈거하여 작업하므로 우천 시에도 일정 변동 없이 시공이 가능합니다.'
      }
    ],
    geoMeta: {
      areaServed: '서울특별시 마포구 공덕동, 아현동, 도화동, 염리동 일원',
      geoRadius: '3500m',
      keywords: ['마포구 샷시 수리', '공덕동 창문 롤러 교체', '공덕동 샷시 모헤어', '마포 창문 외풍 차단', '샷시 레일 파손 보강'],
      lsiKeywords: ['베란다 창문 뻑뻑함', '창문 털가루 제거', '공덕역 집수리', '샷시 로라 교체 비용'],
      canonicalUrl: 'https://suriwiki.kr/wiki/seoul-mapo-gongdeok-sash-window-repair'
    },
    createdAt: '2026-08-10',
    updatedAt: '2026-08-28'
  },
  {
    id: 'wiki-5',
    slug: 'seoul-songpa-jamsil-wallpaper-flooring',
    repairMainName: '친환경 실크 도배 및 방 단열벽지 시공',
    category: '도배/장판/바닥',
    region: INITIAL_REGIONS[2], // 서울 송파구 잠실동
    combinedKeyword: '송파구 잠실동 부분 도배',
    pageTitle: '송파구 잠실동 친환경 실크 부분 도배 & 방 곰팡이 단열벽지 시세표 | 수리위키',
    metaDescription: '송파구 잠실 엘스/리센츠/트리지움 친환경 실크 도배, 누수 천장 1면 부분 도배 견적(20만~60만원). 먼지 없는 보양 및 당일 원데이 시공.',
    views: 1980,
    rating: 4.94,
    reviewCount: 33,
    diyDifficulty: 'MEDIUM (준전문가급/도구필요)',
    estimatedCost: {
      min: 180000,
      avg: 320000,
      max: 650000,
      partsCost: 'LX Z:IN 친환경 실크벽지 8~15만원 / 곰팡이 억제 부자재 3~5만원',
      laborCost: '기존 벽지 뜯김 제거 및 숙련 도배사 시공 공임 14~25만원',
      additionalCostFactors: [
        '누수 천장 석고보드 목공 보강 필요 시 +8~12만원',
        '짐(가구/침대) 이동 보양 필요 시 +5만원'
      ]
    },
    wikiGuide: {
      summary: '잠실 대단지 아파트의 경우 전체 도배 비용이 부담스러울 때 오염되거나 누수 피해를 입은 방 1면 또는 천장만 부분 도배하면 기존 벽지와 이색감 없이 70% 비용을 절감할 수 있습니다.',
      commonSymptoms: [
        '아이 방 벽면에 낙서나 가구 긁힘 자국으로 찢어짐',
        '외벽 쪽 모서리에 겨울철 결로로 인한 검은 곰팡이 번식',
        '윗집 누수로 천장 벽지가 누렇게 변색되고 처짐',
        '반려동물 발톱 긁힘으로 하단 걸레받이 위 벽지 훼손'
      ],
      steps: [
        {
          stepNum: 1,
          title: '정밀 현장 실측 및 가구 비닐 보양',
          desc: '먼지가 묻지 않도록 커버링 테이프로 가구와 마루 바닥을 완벽 보양합니다.'
        },
        {
          stepNum: 2,
          title: '기존 벽지 철거 및 곰팡이 항균 코팅',
          desc: '겉지만 뜯는 것이 아니라 속지까지 제거 후 결로 억제 친환경 프라이머를 도포합니다.'
        },
        {
          stepNum: 3,
          title: '초배지(아이텍스) 띄움 시공',
          desc: '벽면 굴곡이 드러나지 않도록 고급 띄움 초배 작업을 진행합니다.'
        },
        {
          stepNum: 4,
          title: 'LX 친환경 실크벽지 정밀 밀착 도배',
          desc: '친환경 밀풀을 자동 풀기계로 배합하여 이음새가 보이지 않게 정밀 마감합니다.'
        }
      ],
      diyVsProGuide: '실크벽지는 합지와 달리 맞댐 시공 및 초배 작업이 정교해야 하므로 숙련된 도배 기능사 시공을 추천합니다.',
      preventionTips: [
        '도배 직후 창문을 활짝 열어 급격히 말리면 벽지가 터질 수 있으니 3일간 자연 건조하세요.'
      ],
      warrantyPeriod: '벽지 들뜸 및 이음새 벌어짐 1년 무상 A/S'
    },
    localPros: [
      {
        id: 'pro-501',
        name: '이진혁 도배기능사',
        shopName: '잠실 에코 도배 바닥재',
        rating: 4.97,
        reviewCount: 110,
        distance: '잠실새내역 반경 500m (출장 10분)',
        completedJobs: 1450,
        badges: ['도배기능사 자격증', 'LX Z:IN 공식 협력점', '먼지없는 보양'],
        phone: '0507-1360-5512',
        profileImg: '',
        intro: '잠실 엘스, 리센츠, 트리지움 부분 도배 300회 이상. 티 안 나게 맞춰드립니다.',
        masterGrade: '1급 시공기사',
        safetyCertified: true
      }
    ],
    caseStudies: [
      {
        id: 'case-5',
        title: '잠실 트리지움 34평형 안방 결로 곰팡이 제거 및 친환경 실크 1면 도배',
        buildingType: '잠실 트리지움 312동',
        completedDate: '2026-08-27',
        costPaid: 280000,
        duration: '2시간 소요',
        beforeImg: '',
        afterImg: '',
        diagramCategory: '도배/장판/바닥',
        beforeTechnicalData: {
          defectType: '외벽 모서리 결로 곰팡이 포자 번식',
          measuredValue: '벽체 수분율 42% (습윤 상태)',
          diagnosticNote: '단열 불량으로 인한 벽지 부풀림'
        },
        afterTechnicalData: {
          inspectionResult: '이보드 단열재 23T + 아이텍스 띄움 초배 + 실크벽지',
          certifiedValue: '표면 평탄도 오차 0.3mm 이내 PASS',
          warrantyCode: 'SW-2026-0815-F05'
        },
        workDetails: [
          '곰팡이 오염 벽지 전면 철거 및 항균 열풍 건조',
          '친환경 이보드 단열재 결로 차단 시공',
          'LX 하우시스 베스티 친환경 실크벽지 무결점 마감'
        ],
        reviewText: '곰팡이 냄새 때문에 머리 아팠는데 완벽하게 없애주시고 방이 너무 환해졌어요.',
        author: '강*우 고객님 (잠실동 주민)'
      }
    ],
    faqs: [
      {
        question: '도배할 때 방 안에 있는 침대나 옷장은 다 빼두어야 하나요?',
        answer: '아닙니다. 도배 마스터가 방 중앙으로 살짝 이동시키고 비닐 보양 후 작업하므로 짐을 미리 빼두실 필요가 없습니다.'
      }
    ],
    geoMeta: {
      areaServed: '서울특별시 송파구 잠실동, 신천동, 삼전동, 방이동 일원',
      geoRadius: '3500m',
      keywords: ['송파구 부분 도배', '잠실동 실크벽지', '잠실 방한칸도배', '잠실 아파트 도배', '곰팡이 단열벽지 시공'],
      lsiKeywords: ['잠실 엘스 도배', '누수 천장 도배 비용', '친환경 벽지 추천', '잠실새내 집수리'],
      canonicalUrl: 'https://suriwiki.kr/wiki/seoul-songpa-jamsil-wallpaper-flooring'
    },
    createdAt: '2026-08-12',
    updatedAt: '2026-08-29'
  },
  {
    id: 'wiki-6',
    slug: 'seoul-yeongdeungpo-yeouido-electrical-breaker',
    repairMainName: 'LED 조명 교체 및 누전 차단기 점검 수리',
    category: '전기/조명/설비',
    region: INITIAL_REGIONS[4], // 서울 영등포구 여의도동
    combinedKeyword: '영등포구 여의도동 전기 누전 수리',
    pageTitle: '영등포구 여의도동 두꺼비집 누전 차단기 교체 & LED 조명 출장 수리 시세표 | 수리위키',
    metaDescription: '여의도 구축 아파트 두꺼비집 차단기 떨어짐 원인 메거 검측 및 교체(7만~18만원). 24시간 긴급 전기 출동 및 플리커프리 LED 조명 시공.',
    views: 2430,
    rating: 4.96,
    reviewCount: 41,
    diyDifficulty: 'HARD (전문가 출장 필수)',
    estimatedCost: {
      min: 70000,
      avg: 140000,
      max: 260000,
      partsCost: '상비 누전차단기(ELB 30A/20A) 2~4만원 / KS 콘센트 1~2만원',
      laborCost: '전기 안전 메거 검측 및 긴급 교체 공임 6~12만원',
      additionalCostFactors: [
        '벽체 콘크리트 매립 배선 절연 불량 입선 교체 시 +8~15만원',
        '야간/심야 긴급 출동 시 +3만원'
      ]
    },
    wikiGuide: {
      summary: '여의도 35년 이상 노후 아파트는 콘센트 습기, 오래된 가전제품 누전 또는 차단기 자체 트립 스프링 노후화로 차단기가 내려갑니다. 메거(절연저항계)로 누전 라인을 분리 측정하여 30분 내 원인을 해결합니다.',
      commonSymptoms: [
        '두꺼비집 스위치를 올려도 펑 소리와 함께 즉시 툭 떨어짐',
        '에어컨이나 전자레인지, 인덕션만 켜면 차단기가 내려감',
        '콘센트 주변에서 타는 냄새가 나거나 지직거리는 소음 발생',
        '조명 스위치를 껐는데도 미세하게 불이 껌뻑거리는 잔광 현상'
      ],
      steps: [
        {
          stepNum: 1,
          title: '메인 전원 차단 및 정밀 메거 절연저항 검측',
          desc: '500V 고전압 메거 테스터기로 각 분기 회로별 대지 절연저항(기준치 0.2MΩ 이상)을 정밀 스캔합니다.'
        },
        {
          stepNum: 2,
          title: '누전 구간 단선 및 습기 유입 부위 특정',
          desc: '주방, 욕실, 베란다 등 습기 유입 콘센트 및 등기구 안정기 불량을 분리 검사합니다.'
        },
        {
          stepNum: 3,
          title: '신형 KS 인증 고감도 누전 차단기 교체',
          desc: '정격 감도 전류 30mA, 동작시간 0.03초 이내의 고성능 최신 규격 차단기로 체결합니다.'
        },
        {
          stepNum: 4,
          title: '부하 전류 밸런싱 및 전열 기구 안전 테스트',
          desc: '클램프 메타로 가전제품 동시 가동 시 과부하 여부를 점검 후 정상 통전을 확인합니다.'
        }
      ],
      diyVsProGuide: '220V 교류 전기는 감전 및 화재 위험이 매우 높으므로 무조건 공인 전기기사 자격증 보유자에게 의뢰하셔야 합니다.',
      preventionTips: [
        '월 1회 차단기 녹색/황색 시험 버튼을 눌러 정상 트립 작동 여부를 테스트하세요.',
        '고전력 가전(에어컨, 에어프라이어, 온열기)은 멀티탭 대신 벽면 단독 콘센트에 꽂으세요.'
      ],
      warrantyPeriod: '차단기 부품 1년 무상 교체 및 전기 안전 보증'
    },
    localPros: [
      {
        id: 'pro-601',
        name: '강성민 전기기사',
        shopName: '여의도 긴급 파워 전기',
        rating: 4.98,
        reviewCount: 155,
        distance: '여의도역 반경 700m (출장 15분)',
        completedJobs: 2100,
        badges: ['전기기사 1급', '24시간 긴급출동', '전기안전공사 등록업체'],
        phone: '0507-1370-8822',
        profileImg: '',
        intro: '여의도 시범/삼익/한양 아파트 전기 배선 15년 전담. 안전을 최우선으로 시공합니다.',
        masterGrade: '1급 시공기사',
        safetyCertified: true
      }
    ],
    caseStudies: [
      {
        id: 'case-6',
        title: '여의도 시범아파트 주방 분기 차단기 트립 및 전면 교체',
        buildingType: '여의도 시범아파트 8동',
        completedDate: '2026-08-26',
        costPaid: 150000,
        duration: '40분 소요',
        beforeImg: '',
        afterImg: '',
        diagramCategory: '전기/조명/설비',
        beforeTechnicalData: {
          defectType: '주방 분기 차단기 노후 내부 스프링 고착 트립',
          measuredValue: '절연저항 0.04MΩ (누전 한계선 미달)',
          diagnosticNote: '식기세척기 라인 과부하 감지'
        },
        afterTechnicalData: {
          inspectionResult: '신형 LS산전 메인 30A / 분기 20A ELB 전면 교체',
          certifiedValue: '절연저항 100MΩ 이상 안전 PASS',
          warrantyCode: 'SW-2026-0815-E06'
        },
        workDetails: [
          '노후 분전반 메거 측정으로 주방 전열 라인 누전 원인 식별',
          '식기세척기 콘센트 접지 불량 보수',
          'LS 정품 고감도 누전 차단기 교체 및 부하 분산'
        ],
        reviewText: '갑자기 집 전체 전기가 나가서 깜깜했는데 20분 만에 오셔서 원인 딱 짚고 고쳐주셨어요.',
        author: '윤*숙 고객님 (여의도 주민)'
      }
    ],
    faqs: [
      {
        question: '차단기가 떨어졌을 때 냉장고 음식물이 상할까 봐 걱정인데 주말이나 야간에도 오시나요?',
        answer: '네, 수리위키 여의도 긴급 전기 기사는 야간 및 주말 공휴일에도 상시 긴급 출동을 운영하고 있습니다.'
      }
    ],
    geoMeta: {
      areaServed: '서울특별시 영등포구 여의도동, 당산동, 문래동, 신길동 일원',
      geoRadius: '4000m',
      keywords: ['영등포구 전기 수리', '여의도 두꺼비집 수리', '여의도 누전 차단기 교체', '여의도 전기 긴급 출동', '여의도 LED 조명 교체'],
      lsiKeywords: ['차단기 안내려감', '콘센트 타는 냄새', '여의도 집수리 전기', '두꺼비집 교체 비용'],
      canonicalUrl: 'https://suriwiki.kr/wiki/seoul-yeongdeungpo-yeouido-electrical-breaker'
    },
    createdAt: '2026-08-14',
    updatedAt: '2026-08-30'
  }
];

export const generateWikiKeywordPage = (
  repairName: string,
  category: RepairCategory,
  region: RegionItem
): WikiKeywordPage => {
  const cleanRepair = repairName.trim();
  const combinedKeyword = `${region.cityDistrict} ${region.neighborhood} ${cleanRepair.split(' ')[0]}`;
  const slug = `geo-${encodeURIComponent(region.cityDistrict)}-${encodeURIComponent(region.neighborhood)}-${encodeURIComponent(cleanRepair)}`
    .toLowerCase()
    .replace(/%/g, '');

  const id = `wiki-gen-${Date.now()}`;

  // Average cost generation by category
  let minCost = 80000;
  let avgCost = 150000;
  let maxCost = 250000;
  let partsText = 'KS 규격 정품 부속 4~8만원';
  let laborText = `${region.neighborhood} 출장 및 표준 탈부착 공임 6~10만원`;

  if (category === '누수/방수') {
    minCost = 250000;
    avgCost = 380000;
    maxCost = 650000;
    partsText = 'PB 배관 및 고압 수밀 부속 5~10만원';
    laborText = '정밀 청음/가스 탐지 및 배관 수리 공임 25~45만원';
  } else if (category === '욕실/화장실') {
    minCost = 150000;
    avgCost = 300000;
    maxCost = 550000;
    partsText = '대림/아메스 정품 도기 및 수전 12~28만원';
    laborText = '기존 도기 철거 폐기 및 결합 공임 8~14만원';
  } else if (category === '문/샷시/창호') {
    minCost = 120000;
    avgCost = 220000;
    maxCost = 380000;
    partsText = '고하중 트윈 베어링 롤러 및 4중 모헤어 3~6만원';
    laborText = '대형 창문 탈거 및 레일 수평 교정 공임 9~16만원';
  } else if (category === '도배/장판/바닥') {
    minCost = 180000;
    avgCost = 320000;
    maxCost = 600000;
    partsText = '친환경 실크벽지 및 이보드 단열재 8~15만원';
    laborText = '숙련 도배기능사 띄움 초배 및 정밀 도배 12~22만원';
  } else if (category === '전기/조명/설비') {
    minCost = 70000;
    avgCost = 140000;
    maxCost = 260000;
    partsText = 'KS 인증 누전 차단기 및 콘센트 2~4만원';
    laborText = '메거 절연저항 안전 검측 및 교체 공임 6~11만원';
  }

  // Korean Master Pros based on Region
  const koreanMasterNames: {
    name: string;
    shop: string;
    exp: string;
    phone: string;
    grade: '대한민국 숙련기능인' | '설비기능장' | '1급 시공기사' | '수리위키 인증명장';
  }[] = [
    { name: '정우진 마스터', shop: `${region.neighborhood} 스마트홈 집수리`, exp: '설비기능장 (16년 경력)', phone: '0507-1340-9821', grade: '설비기능장' },
    { name: '김태호 주임기사', shop: `${region.cityDistrict} 스피드 홈닥터`, exp: '1급 시공기사 (11년 경력)', phone: '0507-1355-1102', grade: '1급 시공기사' },
    { name: '최민수 기술소장', shop: `${region.neighborhood} 정밀누수설비`, exp: '누수탐지명장 (19년 경력)', phone: '0507-1400-3321', grade: '수리위키 인증명장' },
  ];
  const selectedMaster = koreanMasterNames[Math.floor(Math.random() * koreanMasterNames.length)];

  return {
    id,
    slug,
    repairMainName: cleanRepair,
    category,
    region,
    combinedKeyword,
    pageTitle: `${region.cityDistrict} ${region.neighborhood} ${cleanRepair} 비용 시세 & 표준 공정 가이드 | 수리위키`,
    metaDescription: `${region.fullAddress} ${cleanRepair} 견적 시세표(평균 ${Math.round(avgCost / 10000)}만원). ${region.neighborhood} 20분 내 긴급 출장 검증 마스터, Before/After 실측도 및 완벽 품질 보증.`,
    views: Math.floor(Math.random() * 800) + 120,
    rating: 4.95,
    reviewCount: Math.floor(Math.random() * 25) + 8,
    diyDifficulty: 'MEDIUM (준전문가급/도구필요)',
    estimatedCost: {
      min: minCost,
      avg: avgCost,
      max: maxCost,
      partsCost: partsText,
      laborCost: laborText,
      additionalCostFactors: [
        `${region.neighborhood} 현장 여건(배관 부식, 타공 확장)에 따른 맞춤 견적 적용`,
        '야간/주말 긴급 출동 요청 시 표준 출장비 규정 적용',
      ],
    },
    wikiGuide: {
      summary: `${region.fullAddress} 지역의 주거 특성을 고려한 [${cleanRepair}] 표준 공정 가이드입니다. 정확한 규격 부품 사용과 5단계 정밀 시공으로 하자 없는 수리를 보장합니다.`,
      commonSymptoms: [
        `${cleanRepair} 부위의 노후화 및 이음새 미세 누수/유격 발생`,
        '정상 작동하지 않고 덜컹거림 및 이물질 끼임 현상',
        '외관 파손 또는 사용 연한(10년 이상) 경과로 인한 기능 저하',
        '자가 수리 시도 중 규격 불일치로 인한 조립 난항',
      ],
      steps: [
        {
          stepNum: 1,
          title: '현장 실측 및 위험 요소 사전 차단',
          desc: '작업 전 원수 밸브 또는 차단기를 안전하게 차단하고 주변 가구 바닥을 비닐 보양합니다.',
        },
        {
          stepNum: 2,
          title: '노후 불량 부품 안전 탈거 및 이물질 세척',
          desc: '주변 마감재 손상 없이 고장난 부품을 탈거하고 부식 부위를 깨끗이 소독 청소합니다.',
        },
        {
          stepNum: 3,
          title: 'KS 인증 규격 정품 부품 결합',
          desc: '유격 없이 수평계와 토크 렌치를 사용하여 정확한 압력으로 새 부품을 체결합니다.',
        },
        {
          stepNum: 4,
          title: '가압 통수 검사 및 수밀 테스트',
          desc: '정상 작동 압력을 가하여 미세 누수 0% 및 정상 구동 여부를 정밀 확인합니다.',
        },
        {
          stepNum: 5,
          title: '현장 정리 및 1년 무상 품질보증서 발급',
          desc: '작업 폐기물을 전량 수거하고 수리위키 1년 하자 보증서를 고객님께 전달합니다.',
        },
      ],
      diyVsProGuide: '간단한 소모품 교체는 DIY가 가능하나, 배관 압력 제어나 전기 안전이 결부된 작업은 검증된 동네 마스터 시공을 권장합니다.',
      preventionTips: [
        '정기적으로 연결 부위의 수밀 상태를 육안 점검하세요.',
        '무리한 힘을 가하지 마시고 이물질이 끼지 않도록 관리하세요.',
      ],
      warrantyPeriod: '수리위키 검증 마스터 시공 시 1년 무상 A/S 보증',
    },
    localPros: [
      {
        id: `pro-${id}-1`,
        name: selectedMaster.name,
        shopName: selectedMaster.shop,
        rating: 4.97,
        reviewCount: Math.floor(Math.random() * 80) + 40,
        distance: `${region.neighborhood} 반경 1.2km (출장 15분)`,
        completedJobs: Math.floor(Math.random() * 500) + 300,
        badges: [selectedMaster.exp, '배상책임보험 2억원 가입', '정찰제 안심시공'],
        phone: selectedMaster.phone,
        profileImg: '',
        intro: `${region.neighborhood} 주민 여러분의 집수리 불편을 내 집처럼 신속하고 깔끔하게 해결해 드립니다.`,
        masterGrade: selectedMaster.grade,
        safetyCertified: true,
      },
    ],
    caseStudies: [
      {
        id: `case-${id}-1`,
        title: `${region.neighborhood} 아파트 ${cleanRepair} 표준 시공 완료`,
        buildingType: `${region.neighborhood} 아파트`,
        completedDate: '2026-08-28',
        costPaid: avgCost,
        duration: '1시간 소요',
        beforeImg: '',
        afterImg: '',
        diagramCategory: category,
        beforeTechnicalData: {
          defectType: `${cleanRepair} 노후 마모 및 결함 발생`,
          measuredValue: '표준 허용 오차 초과 및 기능 불량',
          diagnosticNote: `${region.neighborhood} 노후 배관/자재 피로 파손`,
        },
        afterTechnicalData: {
          inspectionResult: 'KS 정품 부품 전면 교체 및 정밀 세팅',
          certifiedValue: '기밀/통수 100% 정상 합격',
          warrantyCode: `SW-2026-${Date.now().toString().slice(-4)}`,
        },
        workDetails: [
          '현장 보양 및 노후 부품 안전 분리',
          'KS 규격 인증 신형 부품 교체 및 정밀 결합',
          '완전 작동 테스트 및 1년 무상 보증서 전달',
        ],
        reviewText: `${region.neighborhood}에 이런 친절하고 실력 좋은 기사님이 계셔서 든든합니다. 마감까지 깔끔하네요!`,
        author: `${region.neighborhood} 입주민 고객님`,
      },
    ],
    faqs: [
      {
        question: `${region.neighborhood} 지역은 당일 방문 및 견적 상담이 가능한가요?`,
        answer: `네, 수리위키 ${region.neighborhood} 전담 마스터는 인근에 상주하고 있어 요청 후 20~30분 내 신속한 현장 출동 및 무료 견적 상담이 가능합니다.`,
      },
      {
        question: '시공 비용은 정찰제로 운영되나요?',
        answer: '네, 수리위키는 현장 바가지 요금을 근절하기 위해 투명한 표준 자재비와 공임비 분리 단가표를 사전에 고지하고 동의 후 작업합니다.',
      },
    ],
    geoMeta: {
      areaServed: `${region.fullAddress} 및 인근 생활권 일원`,
      geoRadius: '3500m',
      keywords: [
        `${region.cityDistrict} ${cleanRepair}`,
        `${region.neighborhood} ${cleanRepair}`,
        `${region.neighborhood} 집수리`,
        `${region.cityDistrict} ${region.neighborhood} 수리비용`,
      ],
      lsiKeywords: [
        `${cleanRepair} 잘하는 곳`,
        `${region.neighborhood} 집수리 기사`,
        `${cleanRepair} 시세표`,
      ],
      canonicalUrl: `https://suriwiki.kr/wiki/${slug}`,
    },
    createdAt: new Date().toISOString().split('T')[0],
    updatedAt: new Date().toISOString().split('T')[0],
  };
};
