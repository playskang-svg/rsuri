import React, { useState } from 'react';
import { 
  Wrench, 
  MapPin, 
  Sparkles, 
  TrendingUp, 
  Star, 
  Eye, 
  Search, 
  ArrowRight, 
  Layers, 
  ShieldCheck, 
  Zap, 
  Filter, 
  Compass, 
  Plus, 
  CheckCircle2, 
  Clock, 
  DollarSign, 
  Share2, 
  FileText,
  AlertCircle
} from 'lucide-react';
import { WikiKeywordPage, RepairCategory, RegionItem } from '../types';
import { MAIN_REPAIR_SERVICES, INITIAL_REGIONS } from '../data/mockWikiData';

interface DashboardViewProps {
  wikiPages: WikiKeywordPage[];
  regions: RegionItem[];
  onSelectKeywordPage: (page: WikiKeywordPage) => void;
  onGenerateKeywordPage: (repairName: string, category: RepairCategory, region: RegionItem) => void;
  onOpenNewKeywordModal: () => void;
  onDeleteKeywordPage?: (id: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  wikiPages,
  regions,
  onSelectKeywordPage,
  onGenerateKeywordPage,
  onOpenNewKeywordModal,
  onDeleteKeywordPage,
  searchQuery,
  onSearchChange,
}) => {
  // Filter States
  const [selectedCategory, setSelectedCategory] = useState<RepairCategory | 'ALL'>('ALL');
  const [selectedRegionFilter, setSelectedRegionFilter] = useState<string>('ALL');

  // Fast Generator States
  const [genSelectedRepair, setGenSelectedRepair] = useState<string>(MAIN_REPAIR_SERVICES[0].mainName);
  const [genSelectedCategory, setGenSelectedCategory] = useState<RepairCategory>(MAIN_REPAIR_SERVICES[0].category);
  const [genSelectedRegionId, setGenSelectedRegionId] = useState<string>(regions[0]?.id || '');
  const [isCustomRepairMode, setIsCustomRepairMode] = useState(false);
  const [customRepairInput, setCustomRepairInput] = useState('');

  // Handle category change in fast generator
  const handleRepairServiceChange = (serviceName: string) => {
    const found = MAIN_REPAIR_SERVICES.find(s => s.mainName === serviceName);
    if (found) {
      setGenSelectedRepair(found.mainName);
      setGenSelectedCategory(found.category);
    }
  };

  // Fast Generator Submit
  const handleFastGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    const repairName = isCustomRepairMode ? customRepairInput.trim() : genSelectedRepair;
    if (!repairName) return;

    const targetRegion = regions.find(r => r.id === genSelectedRegionId) || regions[0];
    if (!targetRegion) return;

    onGenerateKeywordPage(repairName, genSelectedCategory, targetRegion);
  };

  // Filtered Wiki Pages
  const filteredPages = wikiPages.filter(page => {
    const matchesSearch = 
      searchQuery === '' ||
      page.combinedKeyword.toLowerCase().includes(searchQuery.toLowerCase()) ||
      page.repairMainName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      page.region.fullAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
      page.region.neighborhood.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = selectedCategory === 'ALL' || page.category === selectedCategory;
    const matchesRegion = selectedRegionFilter === 'ALL' || page.region.cityDistrict.includes(selectedRegionFilter) || page.region.province.includes(selectedRegionFilter);

    return matchesSearch && matchesCategory && matchesRegion;
  });

  const categories: RepairCategory[] = [
    '주방/싱크대',
    '누수/방수',
    '욕실/화장실',
    '문/샷시/창호',
    '도배/장판/바닥',
    '전기/조명/설비',
    '배관/난방/보일러',
    '타일/대리석',
    '방충망/환풍기/기타',
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-12">
      
      {/* 1. Hero & Realtime Keyword Combination Generator */}
      <section className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-indigo-950/20 border border-slate-800 relative overflow-hidden">
        {/* Background ambient accents */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-violet-500/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="relative z-10 max-w-4xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>SEO & GEO 키워드 엔진 탑재 수리위키</span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight">
            우리 동네 맞춤 집수리 표준 가이드 <br />
            <span className="bg-gradient-to-r from-amber-300 via-indigo-200 to-white bg-clip-text text-transparent">
              대한민국 1등 집수리 백과사전, 수리위키
            </span>
          </h1>

          <p className="mt-3 text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
            원하는 집수리 공사와 지역(동네)을 결합하여 실시간으로 표준 시공 가이드, 투명한 시세표, 검증 마스터 및 완벽한 SEO/GEO 최적화 페이지를 생성합니다.
          </p>

          {/* Interactive Fast Combination Generator Box */}
          <div className="mt-6 bg-white/10 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-white/15 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <Zap className="w-4 h-4 fill-amber-400 text-amber-400" />
                실시간 [공사명 메인 + 지역 키워드] 조합 페이지 생성기
              </span>
              <button
                type="button"
                onClick={() => setIsCustomRepairMode(!isCustomRepairMode)}
                className="text-[11px] text-indigo-200 hover:text-white underline"
              >
                {isCustomRepairMode ? '목록에서 선택하기' : '직접 공사명 입력하기'}
              </button>
            </div>

            <form onSubmit={handleFastGenerate} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
              {/* Repair Main Input */}
              <div className="sm:col-span-5">
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  1. 집수리 공사명 (메인 키워드)
                </label>
                {isCustomRepairMode ? (
                  <input
                    type="text"
                    required
                    placeholder="예: 싱크대 수전 교체, 화장실 타일 수리"
                    value={customRepairInput}
                    onChange={(e) => setCustomRepairInput(e.target.value)}
                    className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
                  />
                ) : (
                  <select
                    value={genSelectedRepair}
                    onChange={(e) => handleRepairServiceChange(e.target.value)}
                    className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-400"
                  >
                    {MAIN_REPAIR_SERVICES.map((s, idx) => (
                      <option key={idx} value={s.mainName}>
                        [{s.category}] {s.mainName}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Region Selection */}
              <div className="sm:col-span-4">
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  2. 대상 지역 (지역 키워드)
                </label>
                <select
                  value={genSelectedRegionId}
                  onChange={(e) => setGenSelectedRegionId(e.target.value)}
                  className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-400"
                >
                  {regions.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.cityDistrict} {r.neighborhood} ({r.province})
                    </option>
                  ))}
                </select>
              </div>

              {/* Action Button */}
              <div className="sm:col-span-3">
                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center justify-center space-x-1.5 shadow-lg shadow-amber-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Sparkles className="w-4 h-4 text-slate-950" />
                  <span>페이지 생성 & 이동</span>
                </button>
              </div>
            </form>

            <div className="mt-2.5 flex items-center space-x-2 text-[11px] text-slate-300">
              <span className="text-slate-400">조합 예시:</span>
              <span className="font-semibold text-amber-200">
                [{regions.find(r => r.id === genSelectedRegionId)?.neighborhood || '역삼동'}] {isCustomRepairMode ? (customRepairInput || '싱크대 수리') : genSelectedRepair.split(' ')[0]}
              </span>
              <span className="text-slate-400">→ 클릭 즉시 SEO/GEO 스키마가 세팅된 위키 페이지가 생성됩니다.</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Key Stats & SEO Overview Bar */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-3.5">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] text-slate-500 font-medium">등록된 키워드 페이지</p>
            <p className="text-xl font-extrabold text-slate-900">{wikiPages.length} <span className="text-xs font-normal text-slate-500">개</span></p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-3.5">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] text-slate-500 font-medium">서비스 지원 지역</p>
            <p className="text-xl font-extrabold text-slate-900">{regions.length} <span className="text-xs font-normal text-slate-500">개 행정동</span></p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-3.5">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] text-slate-500 font-medium">검증 수리 마스터</p>
            <p className="text-xl font-extrabold text-slate-900">42 <span className="text-xs font-normal text-slate-500">명 상주</span></p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-3.5">
          <div className="p-3 bg-violet-50 text-violet-600 rounded-xl">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] text-slate-500 font-medium">SEO & GEO 적합도</p>
            <p className="text-xl font-extrabold text-indigo-600">99.4 <span className="text-xs font-normal text-slate-500">/ 100점</span></p>
          </div>
        </div>
      </section>

      {/* 3. Category Filter Tabs */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Wrench className="w-4 h-4 text-indigo-600" />
            수리 공종별 탐색
          </h2>
          <span className="text-xs text-slate-500">전국 {wikiPages.length}개 키워드 위키 등록됨</span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCategory === 'ALL'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            전체 분야 ({wikiPages.length})
          </button>
          {categories.map((cat) => {
            const count = wikiPages.filter(p => p.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  selectedCategory === cat
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <span>{cat}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${selectedCategory === cat ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-100 text-slate-500'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 4. Region Quick Filter Bar */}
      <section className="bg-slate-100/70 p-3 rounded-2xl border border-slate-200/80 flex items-center gap-2 overflow-x-auto text-xs">
        <span className="font-semibold text-slate-700 flex items-center gap-1 pl-1 whitespace-nowrap">
          <MapPin className="w-3.5 h-3.5 text-indigo-600" />
          지역별 필터:
        </span>
        <button
          onClick={() => setSelectedRegionFilter('ALL')}
          className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
            selectedRegionFilter === 'ALL' ? 'bg-white text-indigo-600 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          전국 전체
        </button>
        {['강남구', '서초구', '송파구', '마포구', '영등포구', '분당구', '수원시', '해운대구'].map(dist => (
          <button
            key={dist}
            onClick={() => setSelectedRegionFilter(dist)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              selectedRegionFilter === dist ? 'bg-white text-indigo-600 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {dist}
          </button>
        ))}
      </section>

      {/* 5. Main Wiki Keyword Pages Grid */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <span>[공사명 메인 + 지역 키워드] 위키 페이지 목록</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-200">
                {filteredPages.length}개
              </span>
            </h2>
            <p className="text-xs text-slate-500">클릭 시 해당 키워드 전용 SEO/GEO 최적화 백과사전 페이지로 즉시 이동합니다.</p>
          </div>

          <button
            onClick={onOpenNewKeywordModal}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-200 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>신규 키워드 등록</span>
          </button>
        </div>

        {filteredPages.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">일치하는 수리위키 페이지가 없습니다</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              상단 조합 생성기를 사용해 새로운 [공사명 + 지역] 위키 페이지를 즉시 발행해보세요!
            </p>
            <button
              onClick={onOpenNewKeywordModal}
              className="mt-2 inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-500 shadow-md shadow-indigo-600/20"
            >
              <Plus className="w-4 h-4" />
              <span>새로운 키워드 페이지 직접 생성하기</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredPages.map((page) => (
              <div
                key={page.id}
                onClick={() => onSelectKeywordPage(page)}
                className="group bg-white rounded-2xl border border-slate-200/90 hover:border-indigo-400 hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-200 p-5 cursor-pointer flex flex-col justify-between relative overflow-hidden"
              >
                {/* Accent Top Bar */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-violet-500 opacity-0 group-hover:opacity-100 transition-opacity" />

                <div>
                  {/* Category & Region Tag */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                      {page.category}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                      <MapPin className="w-3 h-3 text-indigo-500" />
                      {page.region.cityDistrict} {page.region.neighborhood}
                    </span>
                  </div>

                  {/* Main Service Title */}
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors leading-snug line-clamp-2 mb-2">
                    {page.repairMainName}
                  </h3>

                  {/* Meta Description preview */}
                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-4">
                    {page.metaDescription}
                  </p>
                </div>

                {/* Bottom Card Footer */}
                <div className="pt-3.5 border-t border-slate-100 space-y-2.5">
                  {/* Price & Rating */}
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">예상 견적 범위</span>
                      <span className="font-extrabold text-slate-900 text-sm">
                        {Math.round(page.estimatedCost.min / 10000)}만 ~ {Math.round(page.estimatedCost.max / 10000)}만원
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block font-medium">평점 / 리뷰</span>
                      <div className="flex items-center gap-1 text-slate-700 font-bold">
                        <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                        <span>{page.rating}</span>
                        <span className="text-[10px] text-slate-400">({page.reviewCount})</span>
                      </div>
                    </div>
                  </div>

                  {/* Local Pro Info & Link Action */}
                  <div className="flex items-center justify-between bg-slate-50 rounded-xl p-2 text-[11px] text-slate-600">
                    <div className="flex items-center space-x-1.5 truncate">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      <span className="font-medium truncate">{page.localPros[0]?.shopName || '동네 전담 마스터'}</span>
                    </div>
                    <span className="text-indigo-600 font-bold flex items-center group-hover:translate-x-0.5 transition-transform">
                      위키 보기 <ArrowRight className="w-3 h-3 ml-0.5" />
                    </span>
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}
      </section>

      {/* 6. Realtime SEO/GEO Feature Highlights Banner */}
      <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-2">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <FileText className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900">100% SEO 구조화 마크업</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Schema.org `HomeAndConstructionBusiness`, `Service`, `FAQPage`, `BreadcrumbList`를 자동 생성하여 네이버와 구글 검색 결과 1페이지 상위 노출을 지원합니다.
          </p>
        </div>

        <div className="space-y-2">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <MapPin className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900">GEO (동네/로컬 AI 검색) 최적화</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            정밀 GPS 좌표, 행정동 주거 특성(구축 아파트/신축/빌라 배관 이슈), 동네별 실시간 시세 및 실제 Before/After 시공 사례를 결합합니다.
          </p>
        </div>

        <div className="space-y-2">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900">1년 품질 보증 & 안심 정찰제</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            바가지 없는 투명한 자재비/공임비 분리 단가표와 수리위키 인증 마스터의 1년 무상 A/S 보증서 발급으로 안심하고 의뢰할 수 있습니다.
          </p>
        </div>
      </section>

    </div>
  );
};
