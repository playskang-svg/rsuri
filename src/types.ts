export type RepairCategory = 
  | '주방/싱크대' 
  | '누수/방수' 
  | '욕실/화장실' 
  | '문/샷시/창호' 
  | '도배/장판/바닥' 
  | '전기/조명/설비' 
  | '배관/난방/보일러' 
  | '타일/대리석' 
  | '방충망/환풍기/기타';

export interface RegionItem {
  id: string;
  province: string; // e.g. '서울특별시', '경기도'
  cityDistrict: string; // e.g. '강남구', '성남시 분당구'
  neighborhood: string; // e.g. '역삼동', '정자동'
  fullAddress: string; // e.g. '서울특별시 강남구 역삼동'
  lat: number;
  lng: number;
  housingCharacteristics: string;
  repairDemandScore: number;
}

export interface LocalMasterPro {
  id: string;
  name: string;
  shopName: string;
  rating: number;
  reviewCount: number;
  distance: string;
  completedJobs: number;
  badges: string[];
  phone: string;
  profileImg: string;
  intro: string;
  masterGrade?: '대한민국 숙련기능인' | '설비기능장' | '1급 시공기사' | '수리위키 인증명장';
  safetyCertified?: boolean;
}

export interface RepairCaseStudy {
  id: string;
  title: string;
  buildingType: string;
  completedDate: string;
  costPaid: number;
  duration: string;
  beforeImg: string;
  afterImg: string;
  workDetails: string[];
  reviewText: string;
  author: string;
  diagramCategory?: RepairCategory;
  beforeTechnicalData?: {
    defectType: string;
    measuredValue: string;
    diagnosticNote: string;
  };
  afterTechnicalData?: {
    inspectionResult: string;
    certifiedValue: string;
    warrantyCode: string;
  };
}

export interface WikiFAQ {
  question: string;
  answer: string;
}

export interface WikiStep {
  stepNum: number;
  title: string;
  desc: string;
  tip?: string;
}

export interface WikiPriceInfo {
  min: number;
  avg: number;
  max: number;
  partsCost: string;
  laborCost: string;
  additionalCostFactors: string[];
}

export interface WikiKeywordPage {
  id: string;
  slug: string;
  repairMainName: string; // 공사명 메인 (예: "싱크대 수리 및 배수구 교체")
  category: RepairCategory;
  region: RegionItem;
  combinedKeyword: string; // 공사명 메인 + 지역 키워드 (예: "강남구 역삼동 싱크대 수리")
  pageTitle: string;
  metaDescription: string;
  views: number;
  rating: number;
  reviewCount: number;
  diyDifficulty: 'EASY (자가수리 가능)' | 'MEDIUM (준전문가급/도구필요)' | 'HARD (전문가 출장 필수)';
  estimatedCost: WikiPriceInfo;
  wikiGuide: {
    summary: string;
    commonSymptoms: string[];
    steps: WikiStep[];
    diyVsProGuide: string;
    preventionTips: string[];
    warrantyPeriod: string;
  };
  localPros: LocalMasterPro[];
  caseStudies: RepairCaseStudy[];
  faqs: WikiFAQ[];
  geoMeta: {
    areaServed: string;
    geoRadius: string;
    keywords: string[];
    lsiKeywords: string[];
    canonicalUrl: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface RepairEstimateRequest {
  keywordPageId: string;
  combinedKeyword: string;
  customerName: string;
  phone: string;
  addressDetail: string;
  preferredDate: string;
  symptomDetail: string;
  photoUrls?: string[];
}
