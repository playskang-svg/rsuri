import React from 'react';
import { 
  Wrench, 
  Search, 
  Plus, 
  MapPin, 
  Compass, 
  Layers, 
  Globe, 
  Sparkles,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { WikiKeywordPage, RepairCategory } from '../types';

interface HeaderProps {
  currentView: 'DASHBOARD' | 'CATEGORY_BROWSE' | 'REGION_BROWSE' | 'WIKI_DETAIL' | 'SEO_GEO_CENTER';
  onNavigate: (view: 'DASHBOARD' | 'CATEGORY_BROWSE' | 'REGION_BROWSE' | 'SEO_GEO_CENTER') => void;
  wikiPages: WikiKeywordPage[];
  selectedCategory: RepairCategory | null;
  onSelectCategory: (cat: RepairCategory | null) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenNewKeywordModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onNavigate,
  wikiPages,
  selectedCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  onOpenNewKeywordModal,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      {/* Top Banner Notice */}
      <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white text-[11px] px-4 py-1.5 flex items-center justify-between font-medium">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="bg-indigo-500/30 text-indigo-300 px-1.5 py-0.5 rounded text-[10px] font-bold border border-indigo-400/30">
              SEO & GEO
            </span>
            <span>공사명 메인 + 지역 키워드 기반 대한민국 1등 집수리 백과사전 포털</span>
          </div>
          <div className="hidden md:flex items-center space-x-4 text-slate-300">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              동네 인증 마스터 100% 실명제
            </span>
            <span className="flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Schema.org 100% 최적화
            </span>
          </div>
        </div>
      </div>

      {/* Main Header Nav */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3 cursor-pointer select-none" onClick={() => onNavigate('DASHBOARD')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-700 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 ring-2 ring-indigo-100">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xl font-extrabold tracking-tight text-slate-900">
                수리위키
              </span>
            </div>
          </div>

          {/* Search Box */}
          <div className="flex-1 max-w-md hidden sm:block">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="공사명 또는 동네 검색 (예: 싱크대 수리, 역삼동, 누수, 분당...)"
                className="w-full pl-9 pr-4 py-2 text-xs bg-slate-100/80 hover:bg-slate-100 focus:bg-white text-slate-800 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:outline-none transition-all placeholder:text-slate-400"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 bg-slate-200/60 rounded-full w-4 h-4 flex items-center justify-center"
                >
                  ×
                </button>
              )}
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex items-center space-x-1">
            <button
              onClick={() => onNavigate('DASHBOARD')}
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                currentView === 'DASHBOARD'
                  ? 'bg-indigo-50 text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Compass className="w-4 h-4" />
              <span>대시보드</span>
            </button>

            <button
              onClick={() => onNavigate('CATEGORY_BROWSE')}
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                currentView === 'CATEGORY_BROWSE'
                  ? 'bg-indigo-50 text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>수리 분야별</span>
            </button>

            <button
              onClick={() => onNavigate('REGION_BROWSE')}
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                currentView === 'REGION_BROWSE'
                  ? 'bg-indigo-50 text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <MapPin className="w-4 h-4" />
              <span>전국 지역별</span>
            </button>

            <button
              onClick={() => onNavigate('SEO_GEO_CENTER')}
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                currentView === 'SEO_GEO_CENTER'
                  ? 'bg-emerald-50 text-emerald-700 shadow-xs border border-emerald-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Globe className="w-4 h-4" />
              <span className="flex items-center gap-1">
                SEO/GEO 센터
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              </span>
            </button>
          </nav>

          {/* CTA: Create New Keyword Wiki Page */}
          <div className="flex items-center space-x-2">
            <button
              onClick={onOpenNewKeywordModal}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-md shadow-indigo-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">+ 신규 키워드 페이지 생성</span>
              <span className="sm:hidden">+ 생성</span>
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};
