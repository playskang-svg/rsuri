import React, { useState } from 'react';
import { 
  MapPin, 
  Building2, 
  Sparkles, 
  Wrench, 
  Star, 
  Plus, 
  ArrowRight, 
  Compass, 
  CheckCircle2, 
  TrendingUp 
} from 'lucide-react';
import { WikiKeywordPage, RegionItem, RepairCategory } from '../types';
import { MAIN_REPAIR_SERVICES } from '../data/mockWikiData';

interface RegionBrowseViewProps {
  wikiPages: WikiKeywordPage[];
  regions: RegionItem[];
  onSelectKeywordPage: (page: WikiKeywordPage) => void;
  onGenerateKeywordPage: (repairName: string, category: RepairCategory, region: RegionItem) => void;
  onOpenNewKeywordModal: () => void;
  onAddNewRegion: (newReg: RegionItem) => void;
}

export const RegionBrowseView: React.FC<RegionBrowseViewProps> = ({
  wikiPages,
  regions,
  onSelectKeywordPage,
  onGenerateKeywordPage,
  onOpenNewKeywordModal,
  onAddNewRegion,
}) => {
  const [selectedRegionId, setSelectedRegionId] = useState<string>(regions[0]?.id || '');
  
  // New Region Modal / Form State
  const [isAddingRegion, setIsAddingRegion] = useState(false);
  const [province, setProvince] = useState('서울특별시');
  const [cityDistrict, setCityDistrict] = useState('용산구');
  const [neighborhood, setNeighborhood] = useState('한남동');
  const [housingDesc, setHousingDesc] = useState('고급 빌라 및 단독주택 밀집, 맞춤형 인테리어 및 옥상 방수 수요');

  const selectedRegion = regions.find(r => r.id === selectedRegionId) || regions[0];
  const regionPages = wikiPages.filter(p => p.region.id === selectedRegion?.id);

  const handleCreateRegionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cityDistrict.trim() || !neighborhood.trim()) return;

    const newRegion: RegionItem = {
      id: `reg-${Date.now()}`,
      province,
      cityDistrict: cityDistrict.trim(),
      neighborhood: neighborhood.trim(),
      fullAddress: `${province} ${cityDistrict.trim()} ${neighborhood.trim()}`,
      lat: 37.5340 + (Math.random() * 0.05 - 0.025),
      lng: 126.9940 + (Math.random() * 0.05 - 0.025),
      housingCharacteristics: housingDesc,
      repairDemandScore: 90
    };

    onAddNewRegion(newRegion);
    setSelectedRegionId(newRegion.id);
    setIsAddingRegion(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pb-16">
      
      {/* Header */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-2">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold border border-indigo-200">
          <MapPin className="w-3.5 h-3.5" />
          <span>전국 동네별 집수리 포털</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
              전국 시·군·구·동 로컬 집수리 위키 센터
            </h1>
            <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
              각 동네의 고유한 건축 연한 및 주거 배관 특성을 반영한 맞춤형 수리 위키와 동네 검증 마스터 정보를 확인하세요.
            </p>
          </div>

          <button
            onClick={() => setIsAddingRegion(true)}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>+ 신규 지역 등록</span>
          </button>
        </div>
      </div>

      {/* New Region Form */}
      {isAddingRegion && (
        <form onSubmit={handleCreateRegionSubmit} className="bg-indigo-50/70 p-6 rounded-3xl border border-indigo-200 space-y-4 text-xs animate-in fade-in">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <MapPin className="w-4 h-4 text-indigo-600" />
              <span>신규 서비스 지역 등록</span>
            </h3>
            <button
              type="button"
              onClick={() => setIsAddingRegion(false)}
              className="text-slate-400 hover:text-slate-700 text-xs font-bold"
            >
              닫기
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-600 font-semibold mb-1">시/도 *</label>
              <select
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                className="w-full bg-white px-3 py-2 rounded-xl border border-slate-300 text-slate-900"
              >
                <option value="서울특별시">서울특별시</option>
                <option value="경기도">경기도</option>
                <option value="인천광역시">인천광역시</option>
                <option value="부산광역시">부산광역시</option>
                <option value="대구광역시">대구광역시</option>
                <option value="대전광역시">대전광역시</option>
                <option value="세종특별자치시">세종특별자치시</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">시/군/구 *</label>
              <input
                type="text"
                required
                placeholder="예: 용산구, 하남시"
                value={cityDistrict}
                onChange={(e) => setCityDistrict(e.target.value)}
                className="w-full bg-white px-3 py-2 rounded-xl border border-slate-300 text-slate-900"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">읍/면/동 *</label>
              <input
                type="text"
                required
                placeholder="예: 한남동, 미사동"
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                className="w-full bg-white px-3 py-2 rounded-xl border border-slate-300 text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-600 font-semibold mb-1">지역 주거 환경 및 배관/건축 특성 설명</label>
            <input
              type="text"
              placeholder="예: 20년 이상 노후 구축 아파트 및 주택 혼합 지역"
              value={housingDesc}
              onChange={(e) => setHousingDesc(e.target.value)}
              className="w-full bg-white px-3 py-2 rounded-xl border border-slate-300 text-slate-900"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAddingRegion(false)}
              className="px-3.5 py-1.5 rounded-xl bg-slate-200 text-slate-700 font-bold"
            >
              취소
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
            >
              지역 추가 및 등록
            </button>
          </div>
        </form>
      )}

      {/* Region Selector Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
        {regions.map((reg) => {
          const isSelected = selectedRegion?.id === reg.id;
          const pageCount = wikiPages.filter(p => p.region.id === reg.id).length;
          return (
            <button
              key={reg.id}
              onClick={() => setSelectedRegionId(reg.id)}
              className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all flex items-center space-x-2 border ${
                isSelected
                  ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
              }`}
            >
              <MapPin className={`w-3.5 h-3.5 ${isSelected ? 'text-amber-400' : 'text-indigo-600'}`} />
              <span>{reg.cityDistrict} {reg.neighborhood}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                {pageCount}개
              </span>
            </button>
          );
        })}
      </div>

      {/* Selected Region Detailed Dashboard */}
      {selectedRegion && (
        <div className="space-y-6">
          
          {/* Region Overview Card */}
          <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 text-white p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-xl space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-bold text-xs border border-amber-400/30">
                    지역 서비스 허브
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    GPS: {selectedRegion.lat.toFixed(4)}, {selectedRegion.lng.toFixed(4)}
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-white">
                  {selectedRegion.fullAddress}
                </h2>
                <p className="text-xs sm:text-sm text-indigo-200 max-w-2xl leading-relaxed">
                  {selectedRegion.housingCharacteristics}
                </p>
              </div>

              <div className="flex items-center space-x-4 bg-white/10 p-4 rounded-2xl border border-white/10 backdrop-blur-md">
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">개설된 위키</span>
                  <span className="text-xl font-black text-amber-400">{regionPages.length}개</span>
                </div>
                <div className="w-px h-8 bg-white/20" />
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">수리 수요 지수</span>
                  <span className="text-xl font-black text-emerald-400">{selectedRegion.repairDemandScore}점</span>
                </div>
              </div>
            </div>
          </div>

          {/* Existing Pages in This Region */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Wrench className="w-4 h-4 text-indigo-600" />
                <span>[{selectedRegion.neighborhood}]에서 개설된 집수리 키워드 위키 ({regionPages.length}개)</span>
              </h3>
            </div>

            {regionPages.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center space-y-3">
                <p className="text-xs text-slate-500">이 지역에 아직 생성된 키워드 페이지가 없습니다.</p>
                <button
                  onClick={onOpenNewKeywordModal}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white"
                >
                  지금 첫 수리위키 페이지 생성하기
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {regionPages.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => onSelectKeywordPage(p)}
                    className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-md">
                        {p.category}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600">
                        {p.combinedKeyword}
                      </h4>
                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {p.metaDescription}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block">시세</span>
                        <span className="font-bold text-slate-900">
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

          {/* Quick-Generate Other Repair Services for This Region */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900">
              ⚡ [{selectedRegion.neighborhood}]에 다른 공사명 키워드 페이지 원클릭 생성
            </h3>
            <p className="text-xs text-slate-500">
              아래 버튼을 누르면 해당 공사의 시세표와 시공 가이드가 결합된 위키 페이지가 즉시 개설됩니다.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
              {MAIN_REPAIR_SERVICES.map((srv, idx) => {
                const isAlreadyCreated = regionPages.some(p => p.repairMainName === srv.mainName);
                return (
                  <button
                    key={idx}
                    disabled={isAlreadyCreated}
                    onClick={() => onGenerateKeywordPage(srv.mainName, srv.category, selectedRegion)}
                    className={`p-3.5 rounded-2xl text-left border text-xs transition-all flex items-center justify-between ${
                      isAlreadyCreated
                        ? 'bg-slate-50 text-slate-400 border-slate-200 cursor-default'
                        : 'bg-white hover:bg-indigo-50 text-slate-800 hover:border-indigo-300 border-slate-200'
                    }`}
                  >
                    <div>
                      <span className="text-[10px] font-bold text-indigo-600 block">[{srv.category}]</span>
                      <span className="font-bold">{srv.mainName}</span>
                    </div>
                    {isAlreadyCreated ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : (
                      <Plus className="w-4 h-4 text-indigo-600 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
