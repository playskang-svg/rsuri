import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  Wrench, 
  MapPin, 
  Layers, 
  DollarSign, 
  Check, 
  Plus 
} from 'lucide-react';
import { RepairCategory, RegionItem } from '../types';
import { MAIN_REPAIR_SERVICES } from '../data/mockWikiData';

interface NewKeywordModalProps {
  isOpen: boolean;
  onClose: () => void;
  regions: RegionItem[];
  onSubmit: (data: {
    repairName: string;
    category: RepairCategory;
    region: RegionItem;
    customMinCost?: number;
    customMaxCost?: number;
  }) => void;
}

export const NewKeywordModal: React.FC<NewKeywordModalProps> = ({
  isOpen,
  onClose,
  regions,
  onSubmit,
}) => {
  const [isCustomRepair, setIsCustomRepair] = useState(false);
  const [selectedPresetRepair, setSelectedPresetRepair] = useState(MAIN_REPAIR_SERVICES[0].mainName);
  const [customRepairInput, setCustomRepairInput] = useState('');
  const [category, setCategory] = useState<RepairCategory>(MAIN_REPAIR_SERVICES[0].category);
  const [selectedRegionId, setSelectedRegionId] = useState(regions[0]?.id || '');
  const [minCost, setMinCost] = useState('80000');
  const [maxCost, setMaxCost] = useState('180000');

  if (!isOpen) return null;

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

  const handlePresetSelect = (serviceName: string) => {
    setSelectedPresetRepair(serviceName);
    const found = MAIN_REPAIR_SERVICES.find(s => s.mainName === serviceName);
    if (found) {
      setCategory(found.category);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const repairName = isCustomRepair ? customRepairInput.trim() : selectedPresetRepair;
    if (!repairName) return;

    const targetRegion = regions.find(r => r.id === selectedRegionId) || regions[0];

    onSubmit({
      repairName,
      category,
      region: targetRegion,
      customMinCost: Number(minCost) || 80000,
      customMaxCost: Number(maxCost) || 200000,
    });

    onClose();
  };

  const currentRegion = regions.find(r => r.id === selectedRegionId) || regions[0];
  const previewRepair = isCustomRepair ? (customRepairInput || '공사명') : selectedPresetRepair;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-5 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center border border-amber-400/30">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">
                신규 [공사명 + 지역] 키워드 위키 발행
              </h2>
              <p className="text-[11px] text-slate-300">
                SEO 구조화 스키마와 GEO 위치 좌표가 결합된 전용 위키 페이지를 생성합니다.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 text-xs">
          
          {/* 1. Repair Category & Main Name */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-900 flex items-center gap-1.5">
                <Wrench className="w-4 h-4 text-indigo-600" />
                <span>1. 집수리 공사명 (메인 키워드)</span>
              </label>
              <button
                type="button"
                onClick={() => setIsCustomRepair(!isCustomRepair)}
                className="text-indigo-600 hover:text-indigo-700 font-semibold underline text-[11px]"
              >
                {isCustomRepair ? '표준 공종 목록에서 선택' : '직접 공사명 입력하기'}
              </button>
            </div>

            {isCustomRepair ? (
              <div className="space-y-2">
                <input
                  type="text"
                  required
                  placeholder="예: 싱크대 수전 교체 및 배수관 수리, 옥상 우레탄 방수"
                  value={customRepairInput}
                  onChange={(e) => setCustomRepairInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <div>
                  <label className="block text-slate-500 text-[11px] mb-1">카테고리 선택:</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as RepairCategory)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900"
                  >
                    {categories.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <select
                  value={selectedPresetRepair}
                  onChange={(e) => handlePresetSelect(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {MAIN_REPAIR_SERVICES.map((s, idx) => (
                    <option key={idx} value={s.mainName}>
                      [{s.category}] {s.mainName}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* 2. Target Region */}
          <div className="space-y-2">
            <label className="font-bold text-slate-900 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-indigo-600" />
              <span>2. 서비스 대상 지역 (지역 키워드)</span>
            </label>
            <select
              value={selectedRegionId}
              onChange={(e) => setSelectedRegionId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {regions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.cityDistrict} {r.neighborhood} ({r.province}) - {r.housingCharacteristics.slice(0, 20)}...
                </option>
              ))}
            </select>
          </div>

          {/* 3. Estimated Cost Range */}
          <div className="space-y-2">
            <label className="font-bold text-slate-900 flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <span>3. 동네 예상 견적 시세 범위 (원)</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[11px] text-slate-500 block mb-1">최저 시세 (원)</span>
                <input
                  type="number"
                  step="10000"
                  value={minCost}
                  onChange={(e) => setMinCost(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900"
                />
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block mb-1">최고 시세 (원)</span>
                <input
                  type="number"
                  step="10000"
                  value={maxCost}
                  onChange={(e) => setMaxCost(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900"
                />
              </div>
            </div>
          </div>

          {/* Live Preview Box */}
          <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-4 space-y-1.5">
            <div className="flex items-center gap-1.5 text-amber-800 font-bold text-[11px]">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>생성될 키워드 및 SEO 타이틀 미리보기</span>
            </div>
            <p className="text-slate-900 font-extrabold text-xs">
              [{currentRegion?.neighborhood || '역삼동'}] {previewRepair}
            </p>
            <p className="text-slate-500 text-[11px]">
              타이틀: [{currentRegion?.neighborhood}] {previewRepair} 수리 비용 시세 & 표준 공정 가이드 | 수리위키
            </p>
          </div>

          {/* Buttons */}
          <div className="pt-2 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
            >
              취소
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold shadow-md shadow-indigo-500/20 flex items-center space-x-1.5"
            >
              <Sparkles className="w-4 h-4" />
              <span>위키 페이지 즉시 발행하기</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
