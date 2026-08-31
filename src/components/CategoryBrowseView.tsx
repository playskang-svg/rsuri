import React, { useState } from 'react';
import { 
  Wrench, 
  Layers, 
  MapPin, 
  Sparkles, 
  ArrowRight, 
  ChevronRight, 
  Star, 
  DollarSign, 
  ShieldCheck,
  Plus
} from 'lucide-react';
import { WikiKeywordPage, RepairCategory, RegionItem } from '../types';
import { MAIN_REPAIR_SERVICES } from '../data/mockWikiData';

interface CategoryBrowseViewProps {
  wikiPages: WikiKeywordPage[];
  regions: RegionItem[];
  onSelectKeywordPage: (page: WikiKeywordPage) => void;
  onGenerateKeywordPage: (repairName: string, category: RepairCategory, region: RegionItem) => void;
  onOpenNewKeywordModal: () => void;
}

export const CategoryBrowseView: React.FC<CategoryBrowseViewProps> = ({
  wikiPages,
  regions,
  onSelectKeywordPage,
  onGenerateKeywordPage,
  onOpenNewKeywordModal,
}) => {
  const [selectedCat, setSelectedCat] = useState<RepairCategory>('주방/싱크대');

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

  const currentCategoryPages = wikiPages.filter(p => p.category === selectedCat);
  const currentCategoryServices = MAIN_REPAIR_SERVICES.filter(s => s.category === selectedCat);

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pb-16">
      
      {/* Header */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-2">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold border border-indigo-200">
          <Layers className="w-3.5 h-3.5" />
          <span>수리 분야별 통합 백과</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
          집수리 공종별 전국 지역 키워드 매트릭스
        </h1>
        <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
          수리하고자 하는 분야를 선택하면 전국 주요 동네별 시세, 표준 시공 가이드 및 검증 마스터가 연결된 키워드 페이지를 확인할 수 있습니다.
        </p>
      </div>

      {/* Category Selection Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-9 gap-2">
        {categories.map((cat) => {
          const count = wikiPages.filter(p => p.category === cat).length;
          const isSelected = selectedCat === cat;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCat(cat)}
              className={`p-3 rounded-2xl text-left transition-all border flex flex-col justify-between ${
                isSelected
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
              }`}
            >
              <span className={`text-[11px] font-bold ${isSelected ? 'text-indigo-100' : 'text-slate-500'}`}>
                {count}개 지역
              </span>
              <span className="text-xs font-extrabold mt-1 truncate">{cat}</span>
            </button>
          );
        })}
      </div>

      {/* Main Content: Current Category Detail */}
      <div className="space-y-6">
        
        {/* Category Description & Standard Services */}
        <div className="bg-slate-900 text-white p-6 rounded-3xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Wrench className="w-4 h-4 text-amber-400" />
              <span>[{selectedCat}] 주요 공사 항목 & 표준 시세 가이드</span>
            </h2>
            <button
              onClick={onOpenNewKeywordModal}
              className="text-xs font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 px-3.5 py-1.5 rounded-xl shadow-xs"
            >
              + 이 분야 신규 키워드 생성
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {currentCategoryServices.map((srv, idx) => (
              <div key={idx} className="bg-white/10 p-4 rounded-2xl border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white">{srv.mainName}</h3>
                  <span className="text-[11px] font-bold text-amber-300 bg-white/10 px-2 py-0.5 rounded">
                    {srv.avgCost}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{srv.description}</p>
                <div className="flex flex-wrap gap-1 pt-1">
                  {srv.keywords.map((k, kIdx) => (
                    <span key={kIdx} className="text-[10px] text-slate-300 bg-white/5 px-2 py-0.5 rounded">
                      #{k}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Existing Keyword Pages for This Category */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-indigo-600" />
              <span>[{selectedCat}] 전국 지역별 생성된 수리위키 페이지 ({currentCategoryPages.length}개)</span>
            </h3>
          </div>

          {currentCategoryPages.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center space-y-3">
              <p className="text-xs text-slate-500">아직 등록된 지역 키워드 페이지가 없습니다.</p>
              <button
                onClick={onOpenNewKeywordModal}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white"
              >
                첫 번째 지역 키워드 페이지 생성하기
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {currentCategoryPages.map((p) => (
                <div
                  key={p.id}
                  onClick={() => onSelectKeywordPage(p)}
                  className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-md">
                        {p.region.cityDistrict} {p.region.neighborhood}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {p.views} views
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600">
                      {p.combinedKeyword}
                    </h4>

                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {p.metaDescription}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block">시세 범위</span>
                      <span className="font-bold text-slate-800">
                        {Math.round(p.estimatedCost.min/10000)}만~{Math.round(p.estimatedCost.max/10000)}만원
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-slate-700 font-bold">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span>{p.rating}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Generate for Missing Regions */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-3">
          <h3 className="text-sm font-bold text-slate-900">
            💡 다른 지역에 [{selectedCat}] 위키 페이지 추가 발행하기
          </h3>
          <p className="text-xs text-slate-500">
            아래 지역을 클릭하면 즉시 해당 동네의 [{selectedCat}] 맞춤형 SEO/GEO 페이지가 자동 생성됩니다.
          </p>

          <div className="flex flex-wrap gap-2 pt-2">
            {regions.map((reg) => {
              const alreadyExists = currentCategoryPages.some(p => p.region.id === reg.id);
              if (alreadyExists) return null;
              return (
                <button
                  key={reg.id}
                  onClick={() => {
                    const sampleService = currentCategoryServices[0]?.mainName || `${selectedCat} 수리`;
                    onGenerateKeywordPage(sampleService, selectedCat, reg);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-300 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors flex items-center gap-1"
                >
                  <Plus className="w-3 h-3 text-indigo-500" />
                  <span>[{reg.cityDistrict} {reg.neighborhood}] 페이지 즉시 생성</span>
                </button>
              );
            })}
          </div>
        </div>

      </div>

    </div>
  );
};
