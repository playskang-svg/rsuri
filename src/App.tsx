import React, { useState, useEffect } from 'react';
import { 
  WikiKeywordPage, 
  RegionItem, 
  RepairCategory 
} from './types';
import { 
  INITIAL_WIKI_PAGES, 
  INITIAL_REGIONS, 
  generateWikiKeywordPage 
} from './data/mockWikiData';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { KeywordWikiDetailView } from './components/KeywordWikiDetailView';
import { CategoryBrowseView } from './components/CategoryBrowseView';
import { RegionBrowseView } from './components/RegionBrowseView';
import { SeoGeoCenterView } from './components/SeoGeoCenterView';
import { NewKeywordModal } from './components/NewKeywordModal';
import { EstimateRequestModal } from './components/EstimateRequestModal';

export default function App() {
  // Core Wiki Database State
  const [wikiPages, setWikiPages] = useState<WikiKeywordPage[]>(INITIAL_WIKI_PAGES);
  const [regions, setRegions] = useState<RegionItem[]>(INITIAL_REGIONS);

  // Navigation State
  const [currentView, setCurrentView] = useState<'DASHBOARD' | 'CATEGORY_BROWSE' | 'REGION_BROWSE' | 'WIKI_DETAIL' | 'SEO_GEO_CENTER'>('DASHBOARD');
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<RepairCategory | null>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isNewKeywordModalOpen, setIsNewKeywordModalOpen] = useState(false);
  const [estimateModalPage, setEstimateModalPage] = useState<WikiKeywordPage | null>(null);

  // Current Active Page
  const currentPage = wikiPages.find(p => p.id === selectedPageId) || null;

  // SEO: Dynamically update HTML document title and meta description
  useEffect(() => {
    if (currentView === 'WIKI_DETAIL' && currentPage) {
      document.title = `${currentPage.pageTitle}`;
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) {
        metaDesc.setAttribute('content', currentPage.metaDescription);
      }
    } else if (currentView === 'SEO_GEO_CENTER') {
      document.title = 'SEO & GEO 종합 관제 센터 | 수리위키';
    } else if (currentView === 'CATEGORY_BROWSE') {
      document.title = '수리 공종별 전국 백과사전 | 수리위키';
    } else if (currentView === 'REGION_BROWSE') {
      document.title = '전국 동네별 집수리 시세 및 마스터 포털 | 수리위키';
    } else {
      document.title = '수리위키 - 대한민국 1등 집수리 백과사전 & 시세 포털';
    }
  }, [currentView, currentPage]);

  // Navigation Handlers
  const handleSelectKeywordPage = (page: WikiKeywordPage) => {
    setSelectedPageId(page.id);
    setCurrentView('WIKI_DETAIL');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleGenerateKeywordPage = (
    repairName: string, 
    category: RepairCategory, 
    region: RegionItem,
    customMinCost?: number,
    customMaxCost?: number
  ) => {
    // Check if matching page already exists
    const existing = wikiPages.find(
      p => p.repairMainName.toLowerCase() === repairName.toLowerCase() && p.region.id === region.id
    );

    if (existing) {
      handleSelectKeywordPage(existing);
      return;
    }

    // Generate new page
    const newPage = generateWikiKeywordPage(repairName, category, region);
    if (customMinCost && customMaxCost) {
      newPage.estimatedCost.min = customMinCost;
      newPage.estimatedCost.max = customMaxCost;
      newPage.estimatedCost.avg = Math.round((customMinCost + customMaxCost) / 2);
    }

    setWikiPages(prev => [newPage, ...prev]);
    handleSelectKeywordPage(newPage);
  };

  const handleDeletePage = (pageId: string) => {
    setWikiPages(prev => prev.filter(p => p.id !== pageId));
    if (selectedPageId === pageId) {
      setSelectedPageId(null);
      setCurrentView('DASHBOARD');
    }
  };

  const handleAddCaseStudy = (pageId: string, newCase: any) => {
    setWikiPages(prev => prev.map(p => {
      if (p.id === pageId) {
        return {
          ...p,
          caseStudies: [newCase, ...p.caseStudies]
        };
      }
      return p;
    }));
  };

  const handleAddNewRegion = (newRegion: RegionItem) => {
    setRegions(prev => [...prev, newRegion]);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col selection:bg-indigo-500 selection:text-white">
      
      {/* Global Header */}
      <Header
        currentView={currentView}
        onNavigate={(view) => {
          setSelectedPageId(null);
          setCurrentView(view);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        wikiPages={wikiPages}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenNewKeywordModal={() => setIsNewKeywordModalOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-6">
        
        {/* VIEW 1: Dashboard / Main Wiki Hub */}
        {currentView === 'DASHBOARD' && (
          <DashboardView
            wikiPages={wikiPages}
            regions={regions}
            onSelectKeywordPage={handleSelectKeywordPage}
            onGenerateKeywordPage={(name, cat, reg) => handleGenerateKeywordPage(name, cat, reg)}
            onOpenNewKeywordModal={() => setIsNewKeywordModalOpen(true)}
            onDeleteKeywordPage={handleDeletePage}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        )}

        {/* VIEW 2: Keyword Wiki Detail Page */}
        {currentView === 'WIKI_DETAIL' && currentPage && (
          <KeywordWikiDetailView
            page={currentPage}
            allPages={wikiPages}
            regions={regions}
            onBack={() => {
              setSelectedPageId(null);
              setCurrentView('DASHBOARD');
            }}
            onSelectKeywordPage={handleSelectKeywordPage}
            onGenerateKeywordPage={(name, cat, reg) => handleGenerateKeywordPage(name, cat, reg)}
            onOpenEstimateModal={(page) => setEstimateModalPage(page)}
            onDeletePage={handleDeletePage}
            onAddCaseStudy={handleAddCaseStudy}
          />
        )}

        {/* VIEW 3: Category Browse Matrix */}
        {currentView === 'CATEGORY_BROWSE' && (
          <CategoryBrowseView
            wikiPages={wikiPages}
            regions={regions}
            onSelectKeywordPage={handleSelectKeywordPage}
            onGenerateKeywordPage={(name, cat, reg) => handleGenerateKeywordPage(name, cat, reg)}
            onOpenNewKeywordModal={() => setIsNewKeywordModalOpen(true)}
          />
        )}

        {/* VIEW 4: Region Browse Matrix */}
        {currentView === 'REGION_BROWSE' && (
          <RegionBrowseView
            wikiPages={wikiPages}
            regions={regions}
            onSelectKeywordPage={handleSelectKeywordPage}
            onGenerateKeywordPage={(name, cat, reg) => handleGenerateKeywordPage(name, cat, reg)}
            onOpenNewKeywordModal={() => setIsNewKeywordModalOpen(true)}
            onAddNewRegion={handleAddNewRegion}
          />
        )}

        {/* VIEW 5: SEO / GEO Command Center */}
        {currentView === 'SEO_GEO_CENTER' && (
          <SeoGeoCenterView
            wikiPages={wikiPages}
            regions={regions}
            onSelectKeywordPage={handleSelectKeywordPage}
          />
        )}

      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-8 mt-auto text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <p className="font-bold text-slate-800">수리위키 (SuriWiki) · 대한민국 표준 집수리 정보 포털</p>
            <p>공사명 메인 + 지역 키워드 결합형 위키 | Schema.org 100% SEO & GEO 최적화</p>
          </div>
          <div className="flex items-center space-x-4 text-slate-600 font-medium">
            <button onClick={() => setCurrentView('DASHBOARD')} className="hover:text-indigo-600">홈</button>
            <button onClick={() => setCurrentView('CATEGORY_BROWSE')} className="hover:text-indigo-600">분야별 백과</button>
            <button onClick={() => setCurrentView('REGION_BROWSE')} className="hover:text-indigo-600">전국 지역별</button>
            <button onClick={() => setCurrentView('SEO_GEO_CENTER')} className="hover:text-emerald-600 font-bold">SEO/GEO 센터</button>
          </div>
        </div>
      </footer>

      {/* Modal 1: New Keyword Wiki Creation */}
      <NewKeywordModal
        isOpen={isNewKeywordModalOpen}
        onClose={() => setIsNewKeywordModalOpen(false)}
        regions={regions}
        onSubmit={(data) => {
          handleGenerateKeywordPage(
            data.repairName, 
            data.category, 
            data.region, 
            data.customMinCost, 
            data.customMaxCost
          );
        }}
      />

      {/* Modal 2: Estimate Request */}
      <EstimateRequestModal
        isOpen={!!estimateModalPage}
        onClose={() => setEstimateModalPage(null)}
        page={estimateModalPage}
      />

    </div>
  );
}
