import React, { useState } from 'react';
import { 
  Wrench, 
  MapPin, 
  Sparkles, 
  DollarSign, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  ChevronRight, 
  ArrowLeft, 
  Share2, 
  Copy, 
  Code, 
  ExternalLink, 
  Star, 
  Phone, 
  Image as ImageIcon, 
  HelpCircle, 
  Layers, 
  Check, 
  Plus, 
  Trash2, 
  Eye, 
  Send,
  Building2,
  FileCode,
  Globe
} from 'lucide-react';
import { WikiKeywordPage, RegionItem, RepairCategory } from '../types';
import { KoreanMasterAvatar } from './KoreanMasterAvatar';
import { TechnicalSchematicPattern } from './TechnicalSchematicPattern';

interface KeywordWikiDetailViewProps {
  page: WikiKeywordPage;
  allPages: WikiKeywordPage[];
  regions: RegionItem[];
  onBack: () => void;
  onSelectKeywordPage: (page: WikiKeywordPage) => void;
  onGenerateKeywordPage: (repairName: string, category: RepairCategory, region: RegionItem) => void;
  onOpenEstimateModal: (page: WikiKeywordPage) => void;
  onDeletePage?: (id: string) => void;
  onAddCaseStudy: (pageId: string, newCase: any) => void;
}

export const KeywordWikiDetailView: React.FC<KeywordWikiDetailViewProps> = ({
  page,
  allPages,
  regions,
  onBack,
  onSelectKeywordPage,
  onGenerateKeywordPage,
  onOpenEstimateModal,
  onDeletePage,
  onAddCaseStudy,
}) => {
  const [activeTab, setActiveTab] = useState<'WIKI' | 'PRICE' | 'PROS' | 'CASES' | 'FAQ' | 'SEO_INSPECTOR'>('WIKI');
  const [copiedNotification, setCopiedNotification] = useState<string | null>(null);

  // New Case Study Modal / Form
  const [isAddingCase, setIsAddingCase] = useState(false);
  const [caseTitle, setCaseTitle] = useState('');
  const [caseBuilding, setCaseBuilding] = useState(`${page.region.neighborhood} 아파트`);
  const [caseCost, setCaseCost] = useState(page.estimatedCost.avg);
  const [caseDuration, setCaseDuration] = useState('1시간 소요');
  const [caseBeforeImg, setCaseBeforeImg] = useState('https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=600&auto=format&fit=crop&q=80');
  const [caseAfterImg, setCaseAfterImg] = useState('https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=600&auto=format&fit=crop&q=80');
  const [caseReview, setCaseReview] = useState('빠르고 깔끔하게 시공해 주셔서 대만족입니다.');

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedNotification(label);
    setTimeout(() => setCopiedNotification(null), 2500);
  };

  const handleCreateCaseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseTitle.trim()) return;

    const newCase = {
      id: `case-${Date.now()}`,
      title: caseTitle,
      buildingType: caseBuilding,
      completedDate: new Date().toISOString().split('T')[0],
      costPaid: Number(caseCost),
      duration: caseDuration,
      beforeImg: caseBeforeImg,
      afterImg: caseAfterImg,
      workDetails: ['현장 안전 점검 및 노후 부품 해체', 'KS 표준 규격 부속 결합', '작동 검사 및 청소 완료'],
      reviewText: caseReview,
      author: `${page.region.neighborhood} 주민`
    };

    onAddCaseStudy(page.id, newCase);
    setIsAddingCase(false);
    setCaseTitle('');
  };

  // Generate Schema.org JSON-LD
  const schemaJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "HomeAndConstructionBusiness",
        "@id": page.geoMeta.canonicalUrl + "#business",
        "name": `수리위키 ${page.region.neighborhood} ${page.repairMainName} 전문센터`,
        "url": page.geoMeta.canonicalUrl,
        "telephone": page.localPros[0]?.phone || "010-4684-8838",
        "priceRange": `₩${page.estimatedCost.min.toLocaleString()} ~ ₩${page.estimatedCost.max.toLocaleString()}`,
        "address": {
          "@type": "PostalAddress",
          "streetAddress": page.region.neighborhood,
          "addressLocality": page.region.cityDistrict,
          "addressRegion": page.region.province,
          "addressCountry": "KR"
        },
        "geo": {
          "@type": "GeoCoordinates",
          "latitude": page.region.lat,
          "longitude": page.region.lng
        },
        "areaServed": page.geoMeta.areaServed,
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": page.rating,
          "reviewCount": page.reviewCount,
          "bestRating": "5",
          "worstRating": "1"
        }
      },
      {
        "@type": "Service",
        "name": page.repairMainName,
        "serviceType": page.category,
        "provider": {
          "@id": page.geoMeta.canonicalUrl + "#business"
        },
        "areaServed": {
          "@type": "AdministrativeArea",
          "name": page.region.fullAddress
        },
        "offers": {
          "@type": "AggregateOffer",
          "priceCurrency": "KRW",
          "lowPrice": page.estimatedCost.min,
          "highPrice": page.estimatedCost.max
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "수리위키", "item": "https://suriwiki.kr" },
          { "@type": "ListItem", "position": 2, "name": page.region.province, "item": "https://suriwiki.kr/region" },
          { "@type": "ListItem", "position": 3, "name": page.region.cityDistrict, "item": `https://suriwiki.kr/region/${encodeURIComponent(page.region.cityDistrict)}` },
          { "@type": "ListItem", "position": 4, "name": page.region.neighborhood, "item": `https://suriwiki.kr/region/${encodeURIComponent(page.region.neighborhood)}` },
          { "@type": "ListItem", "position": 5, "name": page.combinedKeyword, "item": page.geoMeta.canonicalUrl }
        ]
      },
      {
        "@type": "FAQPage",
        "mainEntity": page.faqs.map(faq => ({
          "@type": "Question",
          "name": faq.question,
          "acceptedAnswer": {
            "@type": "Answer",
            "text": faq.answer
          }
        }))
      }
    ]
  };

  const schemaString = JSON.stringify(schemaJsonLd, null, 2);

  const htmlMetaCode = `<!-- [수리위키] SEO & GEO Optimized Meta Tags for ${page.combinedKeyword} -->
<title>${page.pageTitle}</title>
<meta name="description" content="${page.metaDescription}" />
<meta name="keywords" content="${page.geoMeta.keywords.join(', ')}, ${page.geoMeta.lsiKeywords.join(', ')}" />
<link rel="canonical" href="${page.geoMeta.canonicalUrl}" />

<!-- OpenGraph (Facebook / KakaoTalk) -->
<meta property="og:type" content="article" />
<meta property="og:title" content="${page.pageTitle}" />
<meta property="og:description" content="${page.metaDescription}" />
<meta property="og:url" content="${page.geoMeta.canonicalUrl}" />
<meta property="og:site_name" content="수리위키 (SuriWiki)" />
<meta property="og:locale" content="ko_KR" />

<!-- GEO / Local Search Tags -->
<meta name="geo.region" content="KR" />
<meta name="geo.placename" content="${page.region.fullAddress}" />
<meta name="geo.position" content="${page.region.lat};${page.region.lng}" />
<meta name="ICBM" content="${page.region.lat}, ${page.region.lng}" />

<!-- Structured Data JSON-LD -->
<script type="application/ld+json">
${schemaString}
</script>`;

  // Related Region Keywords (Neighbouring or popular regions)
  const relatedRegionPages = allPages.filter(p => p.id !== page.id && p.category === page.category).slice(0, 4);
  const sameRegionOtherPages = allPages.filter(p => p.id !== page.id && p.region.cityDistrict === page.region.cityDistrict).slice(0, 4);

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pb-16">
      
      {/* Toast Notification */}
      {copiedNotification && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs px-4 py-2.5 rounded-xl shadow-2xl flex items-center space-x-2 border border-slate-700 animate-in slide-in-from-bottom-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{copiedNotification} 클립보드에 복사되었습니다!</span>
        </div>
      )}

      {/* Top Navigation & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 sm:px-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center space-x-2 text-xs text-slate-500 overflow-x-auto whitespace-nowrap">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-slate-600 hover:text-indigo-600 font-semibold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>대시보드로</span>
          </button>
          <span>/</span>
          <span>{page.region.province}</span>
          <span>/</span>
          <span>{page.region.cityDistrict}</span>
          <span>/</span>
          <span className="font-semibold text-slate-800">{page.region.neighborhood}</span>
          <span>/</span>
          <span className="text-indigo-600 font-bold">{page.category}</span>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <button
            onClick={() => handleCopy(window.location.href, '위키 페이지 URL이')}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>공유</span>
          </button>
          <button
            onClick={() => setActiveTab('SEO_INSPECTOR')}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold border border-emerald-200 transition-colors"
          >
            <Code className="w-3.5 h-3.5" />
            <span>SEO/GEO 코드</span>
          </button>
          {onDeletePage && (
            <button
              onClick={() => {
                if (window.confirm(`[${page.combinedKeyword}] 위키 페이지를 삭제하시겠습니까?`)) {
                  onDeletePage(page.id);
                }
              }}
              className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
              title="페이지 삭제"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Keyword Page Header Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
          
          <div className="space-y-3 flex-1">
            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-600 text-white shadow-xs">
                {page.category}
              </span>
              <span className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                {page.combinedKeyword}
              </span>
              <span className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                {page.region.fullAddress}
              </span>
              <span className="text-[11px] font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                GEO: {page.region.lat.toFixed(4)}, {page.region.lng.toFixed(4)}
              </span>
            </div>

            {/* H1 Title */}
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight leading-snug">
              {page.pageTitle}
            </h1>

            {/* Meta Description / Context */}
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-3xl">
              {page.metaDescription}
            </p>

            {/* Neighborhood Context Note */}
            <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-3 text-xs text-indigo-950 flex items-start space-x-2.5">
              <Building2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-indigo-900">[{page.region.neighborhood} 지역 주거 및 시공 특성]: </span>
                <span className="text-indigo-800">{page.region.housingCharacteristics}</span>
              </div>
            </div>
          </div>

          {/* Right Quick Price & CTA Card */}
          <div className="w-full lg:w-72 bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-2xl p-5 shadow-xl space-y-4 shrink-0">
            <div>
              <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">
                {page.region.neighborhood} 실시간 시세
              </span>
              <div className="text-2xl font-black mt-0.5 text-white">
                {Math.round(page.estimatedCost.min / 10000)}만 ~ {Math.round(page.estimatedCost.max / 10000)}만원
              </div>
              <p className="text-[11px] text-slate-300 mt-1">
                평균 {Math.round(page.estimatedCost.avg / 10000)}만원 (자재비+출장공임 포함)
              </p>
            </div>

            <div className="pt-3 border-t border-white/10 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-300">
                <span>DIY 난이도:</span>
                <span className="font-bold text-amber-300">{page.diyDifficulty.split(' ')[0]}</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span>동네 마스터 출장:</span>
                <span className="font-bold text-emerald-400">{page.localPros[0]?.distance.split('(')[1]?.replace(')', '') || '20분 내'}</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span>품질 보증:</span>
                <span className="font-bold text-white">1년 무상 A/S</span>
              </div>
            </div>

            <button
              onClick={() => onOpenEstimateModal(page)}
              className="w-full py-3 rounded-xl text-xs font-extrabold bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 shadow-lg shadow-amber-500/20 flex items-center justify-center space-x-1.5 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Send className="w-3.5 h-3.5 text-slate-950" />
              <span>동네 마스터 무료 견적 신청</span>
            </button>
          </div>

        </div>

        {/* Tab Navigation */}
        <div className="mt-8 border-b border-slate-200 flex items-center space-x-1 sm:space-x-2 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('WIKI')}
            className={`pb-3 px-3 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'WIKI'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Wrench className="w-4 h-4" />
            <span>표준 수리 백과</span>
          </button>

          <button
            onClick={() => setActiveTab('PRICE')}
            className={`pb-3 px-3 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'PRICE'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>동네별 투명 시세표</span>
          </button>

          <button
            onClick={() => setActiveTab('PROS')}
            className={`pb-3 px-3 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'PROS'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>검증 수리 마스터 ({page.localPros.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('CASES')}
            className={`pb-3 px-3 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'CASES'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>Before/After 사례 ({page.caseStudies.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('FAQ')}
            className={`pb-3 px-3 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'FAQ'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>지역 FAQ ({page.faqs.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('SEO_INSPECTOR')}
            className={`pb-3 px-3 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'SEO_INSPECTOR'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-lg'
                : 'border-transparent text-emerald-700 hover:bg-emerald-50/40 rounded-t-lg'
            }`}
          >
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span className="font-extrabold">SEO / GEO 인스펙터</span>
          </button>
        </div>
      </div>

      {/* Tab 1: WIKI GUIDE */}
      {activeTab === 'WIKI' && (
        <div className="space-y-6">
          
          {/* Technical Blueprint Schematic Banner */}
          <TechnicalSchematicPattern
            category={page.category}
            mode="BANNER"
            title={`[${page.repairMainName}] 표준 설계 도면 & 시공 단면도`}
            heightClass="h-44"
          />

          {/* Summary & Common Symptoms */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Wiki Summary */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Wrench className="w-4 h-4 text-indigo-600" />
                <span>공사 개요 및 전문가 가이드라인</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {page.wikiGuide.summary}
              </p>
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">품질 보증 정책:</span>
                <span className="font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                  {page.wikiGuide.warrantyPeriod}
                </span>
              </div>
            </div>

            {/* Common Symptoms */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span>주요 고장 증상 및 자가진단 체크리스트</span>
              </h2>
              <ul className="space-y-2">
                {page.wikiGuide.commonSymptoms.map((symptom, idx) => (
                  <li key={idx} className="flex items-start space-x-2 text-xs text-slate-700">
                    <span className="w-4 h-4 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center shrink-0 text-[10px] mt-0.5">
                      {idx + 1}
                    </span>
                    <span>{symptom}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* 5-Step Standard Wiki Process */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6">
            <div>
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                Standard Repair Workflow
              </span>
              <h2 className="text-lg font-extrabold text-slate-900 mt-1">
                {page.repairMainName} 5단계 표준 시공 프로세스
              </h2>
              <p className="text-xs text-slate-500">수리위키 검증 마스터가 준수하는 정석 시공 표준 절차입니다.</p>
            </div>

            <div className="space-y-4">
              {page.wikiGuide.steps.map((step) => (
                <div 
                  key={step.stepNum} 
                  className="bg-slate-50 hover:bg-indigo-50/40 p-4 sm:p-5 rounded-2xl border border-slate-200/80 transition-colors space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="w-7 h-7 rounded-xl bg-indigo-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                        {step.stepNum}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900">
                        {step.title}
                      </h3>
                    </div>
                    <span className="text-[11px] font-semibold text-indigo-600 bg-white px-2.5 py-0.5 rounded-full border border-indigo-100 shadow-2xs">
                      STEP 0{step.stepNum}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 pl-10 leading-relaxed">
                    {step.desc}
                  </p>

                  {step.tip && (
                    <div className="ml-10 mt-2 bg-amber-50/80 border border-amber-200/70 text-amber-900 text-[11px] p-2.5 rounded-xl font-medium flex items-start gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                      <span><strong>마스터 TIP:</strong> {step.tip}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* DIY vs PRO Guide */}
            <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-5 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-400 text-xs">
                <ShieldCheck className="w-4 h-4" />
                <span>자가수리(DIY) vs 전문가 출장 판단 기준</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {page.wikiGuide.diyVsProGuide}
              </p>
            </div>
          </div>

          {/* Maintenance & Prevention Tips */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>시공 후 고장 방지 및 유지관리 요령</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {page.wikiGuide.preventionTips.map((tip, idx) => (
                <div key={idx} className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs text-slate-700 flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                  <span>{tip}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* Tab 2: PRICE GUIDE */}
      {activeTab === 'PRICE' && (
        <div className="space-y-6">
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6">
            <div>
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                GEO Local Price Index
              </span>
              <h2 className="text-lg font-extrabold text-slate-900 mt-1">
                [{page.region.fullAddress}] 투명 수리 시세표
              </h2>
              <p className="text-xs text-slate-500">
                수리위키는 바가지 없는 투명한 집수리 문화를 위해 동네별 부품 자재비와 표준 출장 공임비를 투명하게 공개합니다.
              </p>
            </div>

            {/* Interactive Price Barometer */}
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
              <div className="flex justify-between items-end">
                <div>
                  <span className="text-[11px] text-slate-400 block font-medium">최저 견적</span>
                  <span className="text-base font-bold text-slate-700">
                    {page.estimatedCost.min.toLocaleString()}원
                  </span>
                </div>
                <div className="text-center">
                  <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200">
                    {page.region.neighborhood} 표준 시공 기준
                  </span>
                  <span className="text-2xl font-black text-indigo-900 block mt-1">
                    {page.estimatedCost.avg.toLocaleString()}원
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-slate-400 block font-medium">최고 견적 (난공사)</span>
                  <span className="text-base font-bold text-slate-700">
                    {page.estimatedCost.max.toLocaleString()}원
                  </span>
                </div>
              </div>

              {/* Graphical Range Bar */}
              <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden relative">
                <div className="bg-gradient-to-r from-emerald-400 via-indigo-500 to-amber-500 h-full w-full rounded-full"></div>
              </div>
            </div>

            {/* Parts vs Labor Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-1.5">
                <span className="text-[11px] font-bold text-indigo-600 block">정품 자재 및 부속 비용</span>
                <p className="text-sm font-extrabold text-slate-900">{page.estimatedCost.partsCost}</p>
                <p className="text-[11px] text-slate-500">KS 규격 인증 부속품 사용 기준</p>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100 space-y-1.5">
                <span className="text-[11px] font-bold text-emerald-700 block">{page.region.neighborhood} 전담 기술자 공임</span>
                <p className="text-sm font-extrabold text-slate-900">{page.estimatedCost.laborCost}</p>
                <p className="text-[11px] text-slate-500">철거, 폐기물 수거 및 1년 A/S 포함</p>
              </div>
            </div>

            {/* Additional Cost Factors */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span>현장 상황별 추가 비용 발생 요인</span>
              </h3>
              <div className="space-y-2">
                {page.estimatedCost.additionalCostFactors.map((factor, idx) => (
                  <div key={idx} className="flex items-center space-x-2 text-xs text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                    <span>{factor}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Tab 3: LOCAL PROS */}
      {activeTab === 'PROS' && (
        <div className="space-y-6">
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                  Verified Local Masters
                </span>
                <h2 className="text-lg font-extrabold text-slate-900 mt-1">
                  [{page.region.neighborhood}] 검증 수리 마스터
                </h2>
                <p className="text-xs text-slate-500">자격증, 배상책임보험, 동네 평점 검증을 통과한 전문 기술자입니다.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {page.localPros.map((pro) => (
                <div 
                  key={pro.id}
                  className="bg-slate-50 rounded-2xl p-5 border border-slate-200 flex flex-col justify-between space-y-4 hover:border-indigo-400 transition-colors"
                >
                  <div className="flex items-start space-x-4">
                    <KoreanMasterAvatar pro={pro} size="md" />
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-sm font-extrabold text-slate-900">{pro.name}</h3>
                        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                          {pro.shopName}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2 text-xs">
                        <div className="flex items-center text-amber-500 font-bold">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 mr-1" />
                          <span>{pro.rating}</span>
                        </div>
                        <span className="text-slate-400">·</span>
                        <span className="text-slate-600">누적 시공 {pro.completedJobs}건</span>
                      </div>

                      <p className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-indigo-600" />
                        <span>{pro.distance}</span>
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 bg-white p-3 rounded-xl border border-slate-100 leading-relaxed">
                    "{pro.intro}"
                  </p>

                  <div className="flex flex-wrap gap-1.5">
                    {pro.badges.map((badge, bIdx) => (
                      <span key={bIdx} className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md border border-emerald-200">
                        ✓ {badge}
                      </span>
                    ))}
                  </div>

                  <div className="pt-3 border-t border-slate-200 flex items-center gap-2">
                    <button
                      onClick={() => onOpenEstimateModal(page)}
                      className="flex-1 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs flex items-center justify-center space-x-1"
                    >
                      <Send className="w-3 h-3" />
                      <span>견적 문의</span>
                    </button>
                    <a
                      href={`tel:${pro.phone}`}
                      className="px-3 py-2 rounded-xl text-xs font-bold bg-white text-slate-800 hover:bg-slate-100 border border-slate-300 flex items-center space-x-1"
                    >
                      <Phone className="w-3 h-3 text-indigo-600" />
                      <span>전화 상담</span>
                    </a>
                  </div>

                </div>
              ))}
            </div>

          </div>
        </div>
      )}

      {/* Tab 4: BEFORE & AFTER CASES */}
      {activeTab === 'CASES' && (
        <div className="space-y-6">
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                  Real Construction Logs
                </span>
                <h2 className="text-lg font-extrabold text-slate-900 mt-1">
                  [{page.region.neighborhood}] 실제 시공 전/후 포토 리포트
                </h2>
                <p className="text-xs text-slate-500">실제 현장에서 촬영된 고해상도 HTML 핫링크 지원 시공 사례입니다.</p>
              </div>

              <button
                onClick={() => setIsAddingCase(true)}
                className="flex items-center space-x-1 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20"
              >
                <Plus className="w-4 h-4" />
                <span>+ 신규 시공사례 등록</span>
              </button>
            </div>

            {/* Case Study Creation Modal / Box */}
            {isAddingCase && (
              <form onSubmit={handleCreateCaseSubmit} className="bg-indigo-50/60 p-5 rounded-2xl border border-indigo-200 space-y-4 text-xs animate-in fade-in">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-sm">신규 시공사례 및 Before/After 사진 등록</h3>
                  <button
                    type="button"
                    onClick={() => setIsAddingCase(false)}
                    className="text-slate-400 hover:text-slate-700 text-xs font-bold"
                  >
                    닫기
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">시공 제목 *</label>
                    <input
                      type="text"
                      required
                      placeholder="예: 34평형 싱크대 원홀 수전 및 스텐 배수구 교체"
                      value={caseTitle}
                      onChange={(e) => setCaseTitle(e.target.value)}
                      className="w-full bg-white px-3 py-2 rounded-xl border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">단지명/건물 유형</label>
                    <input
                      type="text"
                      value={caseBuilding}
                      onChange={(e) => setCaseBuilding(e.target.value)}
                      className="w-full bg-white px-3 py-2 rounded-xl border border-slate-300 text-slate-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">시공 전 (Before) 이미지 URL (핫링크)</label>
                    <input
                      type="url"
                      value={caseBeforeImg}
                      onChange={(e) => setCaseBeforeImg(e.target.value)}
                      className="w-full bg-white px-3 py-2 rounded-xl border border-slate-300 text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">시공 후 (After) 이미지 URL (핫링크)</label>
                    <input
                      type="url"
                      value={caseAfterImg}
                      onChange={(e) => setCaseAfterImg(e.target.value)}
                      className="w-full bg-white px-3 py-2 rounded-xl border border-slate-300 text-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">고객 솔직 후기</label>
                  <textarea
                    rows={2}
                    value={caseReview}
                    onChange={(e) => setCaseReview(e.target.value)}
                    className="w-full bg-white px-3 py-2 rounded-xl border border-slate-300 text-slate-900"
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingCase(false)}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-200 text-slate-700 font-bold"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
                  >
                    저장하기
                  </button>
                </div>
              </form>
            )}

            {/* Case Studies List */}
            <div className="space-y-6">
              {page.caseStudies.map((c) => (
                <div key={c.id} className="bg-slate-50 rounded-2xl p-6 border border-slate-200 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900">{c.title}</h3>
                      <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                        <span>{c.buildingType}</span>
                        <span>·</span>
                        <span>{c.completedDate}</span>
                        <span>·</span>
                        <span className="font-bold text-indigo-600">{c.costPaid.toLocaleString()}원 ({c.duration})</span>
                      </p>
                    </div>
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 self-start sm:self-auto">
                      시공 완료
                    </span>
                  </div>

                  {/* Before & After Technical Schematic / Field Pattern Comparison */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                        <span>[Before 현장 진단] 시공 전 결함 실측 단면도</span>
                      </span>
                      <TechnicalSchematicPattern
                        category={c.diagramCategory || page.category}
                        mode="BEFORE"
                        title={c.beforeTechnicalData?.defectType || `${c.title} 시공 전 결함 상태`}
                        defectNote={c.beforeTechnicalData?.measuredValue || '노후 부품 파손 및 누수/유격 발생'}
                        heightClass="h-56"
                      />
                      {c.beforeTechnicalData?.diagnosticNote && (
                        <p className="text-[11px] text-slate-500 bg-white p-2 rounded-xl border border-slate-200">
                          <strong className="text-rose-600 font-bold">진단 소견:</strong> {c.beforeTechnicalData.diagnosticNote}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>[After 시공 완료] 표준 정밀 복구 및 통수 검측도</span>
                      </span>
                      <TechnicalSchematicPattern
                        category={c.diagramCategory || page.category}
                        mode="AFTER"
                        title={c.afterTechnicalData?.inspectionResult || `${c.title} 규격 부품 교체 완료`}
                        passedNote={c.afterTechnicalData?.certifiedValue || '규격 시공 합격 및 누수 0% 인증'}
                        heightClass="h-56"
                      />
                      {c.afterTechnicalData?.warrantyCode && (
                        <div className="flex items-center justify-between text-[11px] text-slate-500 bg-white p-2 rounded-xl border border-slate-200">
                          <span><strong className="text-emerald-600 font-bold">품질 보증코드:</strong> {c.afterTechnicalData.warrantyCode}</span>
                          <span className="font-bold text-indigo-600">1년 무상 A/S</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Review Text */}
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-xs text-slate-700 flex items-start space-x-2">
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-slate-900 mr-2">{c.author}:</span>
                      <span>"{c.reviewText}"</span>
                    </div>
                  </div>

                </div>
              ))}
            </div>

          </div>
        </div>
      )}

      {/* Tab 5: FAQ */}
      {activeTab === 'FAQ' && (
        <div className="space-y-6">
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6">
            <div>
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                Schema.org FAQPage Compatible
              </span>
              <h2 className="text-lg font-extrabold text-slate-900 mt-1">
                [{page.region.neighborhood}] {page.repairMainName} 자주 묻는 질문
              </h2>
              <p className="text-xs text-slate-500">포털 검색엔진(Google/Naver) FAQ 리치 스니펫으로 자동 등록되는 질의응답입니다.</p>
            </div>

            <div className="space-y-3">
              {page.faqs.map((faq, idx) => (
                <div key={idx} className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200/80 space-y-2">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 flex items-start space-x-2">
                    <span className="text-indigo-600 font-black">Q.</span>
                    <span>{faq.question}</span>
                  </h3>
                  <div className="text-xs text-slate-600 pl-4 leading-relaxed flex items-start space-x-2">
                    <span className="text-emerald-600 font-black">A.</span>
                    <span>{faq.answer}</span>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>
      )}

      {/* Tab 6: SEO & GEO INSPECTOR */}
      {activeTab === 'SEO_INSPECTOR' && (
        <div className="space-y-6">
          
          {/* SEO/GEO Score Summary */}
          <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-xs border border-emerald-400/30">
                    SEO & GEO Grade A+
                  </span>
                  <span className="text-xs text-slate-400">네이버 스마트블록 & 구글 AI Overview 완벽 적합</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-white mt-1">
                  검색엔진 최적화(SEO) 및 로컬(GEO) 분석 지표
                </h2>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={() => handleCopy(schemaString, 'Schema.org JSON-LD 코드가')}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center space-x-1.5 shadow-md shadow-indigo-600/30"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>JSON-LD 복사</span>
                </button>
                <button
                  onClick={() => handleCopy(htmlMetaCode, '전체 SEO HTML 메타태그가')}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center space-x-1.5 shadow-md shadow-emerald-600/30"
                >
                  <FileCode className="w-3.5 h-3.5" />
                  <span>HTML Meta 복사</span>
                </button>
              </div>
            </div>

            {/* Score Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="bg-white/5 p-3.5 rounded-xl border border-white/10">
                <span className="text-[10px] text-slate-400 block">메인 키워드 밀도</span>
                <span className="text-base font-bold text-amber-300">1.4% (최적 범위)</span>
              </div>
              <div className="bg-white/5 p-3.5 rounded-xl border border-white/10">
                <span className="text-[10px] text-slate-400 block">Schema.org 구조화</span>
                <span className="text-base font-bold text-emerald-400">4개 스키마 연동</span>
              </div>
              <div className="bg-white/5 p-3.5 rounded-xl border border-white/10">
                <span className="text-[10px] text-slate-400 block">GEO GPS 좌표 동기화</span>
                <span className="text-base font-bold text-indigo-300">위경도 100% 매핑</span>
              </div>
              <div className="bg-white/5 p-3.5 rounded-xl border border-white/10">
                <span className="text-[10px] text-slate-400 block">내부 링킹 네트워크</span>
                <span className="text-base font-bold text-violet-300">8개 연관 링크</span>
              </div>
            </div>
          </div>

          {/* Google SERP Snippet Preview Simulator */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-600" />
                <span>Google Search SERP 스니펫 미리보기</span>
              </h3>
              <span className="text-[11px] text-slate-400">데스크톱 / 모바일 공통</span>
            </div>

            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-1.5 font-sans">
              <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[9px] font-bold flex items-center justify-center">S</span>
                <span>suriwiki.kr &gt; wiki &gt; {page.slug}</span>
              </div>
              <h4 className="text-base font-medium text-blue-800 hover:underline cursor-pointer">
                {page.pageTitle}
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                {page.metaDescription}
              </p>
              <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-500">
                <span className="flex items-center text-amber-500 font-bold">
                  ★★★★★ <span className="text-slate-700 ml-1">{page.rating}</span> ({page.reviewCount})
                </span>
                <span>·</span>
                <span className="font-semibold text-slate-700">₩{page.estimatedCost.min.toLocaleString()} ~ ₩{page.estimatedCost.max.toLocaleString()}</span>
                <span>·</span>
                <span>{page.region.neighborhood} 출장 가능</span>
              </div>
            </div>
          </div>

          {/* JSON-LD Schema Code Inspector */}
          <div className="bg-slate-900 rounded-3xl p-6 text-white space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Code className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-mono font-bold text-emerald-400">Structured Data (Schema.org JSON-LD)</span>
              </div>
              <button
                onClick={() => handleCopy(schemaString, 'JSON-LD 코드가')}
                className="text-xs text-slate-300 hover:text-white bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 flex items-center space-x-1"
              >
                <Copy className="w-3 h-3" />
                <span>코드 복사</span>
              </button>
            </div>

            <pre className="text-[11px] font-mono text-slate-300 bg-slate-950 p-4 rounded-2xl overflow-x-auto max-h-72 border border-slate-800 scrollbar-thin">
              {schemaString}
            </pre>
          </div>

          {/* Full HTML Meta Tags Inspector */}
          <div className="bg-slate-900 rounded-3xl p-6 text-white space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileCode className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-mono font-bold text-indigo-400">HTML Head Meta Tags & OpenGraph</span>
              </div>
              <button
                onClick={() => handleCopy(htmlMetaCode, 'HTML 메타 코드가')}
                className="text-xs text-slate-300 hover:text-white bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 flex items-center space-x-1"
              >
                <Copy className="w-3 h-3" />
                <span>코드 복사</span>
              </button>
            </div>

            <pre className="text-[11px] font-mono text-slate-300 bg-slate-950 p-4 rounded-2xl overflow-x-auto max-h-72 border border-slate-800 scrollbar-thin">
              {htmlMetaCode}
            </pre>
          </div>

        </div>
      )}

      {/* Bottom: Related Region & Service Internal Links Matrix (SEO Power Matrix) */}
      <section className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Internal Link Network</span>
          </div>
          <h2 className="text-base sm:text-lg font-extrabold text-slate-900 mt-1">
            수리위키 연관 지역 및 공종 추천 키워드 링크망
          </h2>
          <p className="text-xs text-slate-500">검색엔진 크롤러 봇과 사용자가 유기적으로 이동할 수 있는 고밀도 내부 링크 구조입니다.</p>
        </div>

        {/* Same Service, Other Regions */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-indigo-600" />
            <span>타 지역 [{page.category}] {page.repairMainName.split(' ')[0]} 추천 페이지:</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {relatedRegionPages.map((rPage) => (
              <button
                key={rPage.id}
                onClick={() => onSelectKeywordPage(rPage)}
                className="text-left bg-slate-50 hover:bg-indigo-50/50 p-3.5 rounded-2xl border border-slate-200 hover:border-indigo-300 transition-all space-y-1 group"
              >
                <span className="text-[10px] font-bold text-indigo-600 group-hover:underline">
                  {rPage.region.cityDistrict} {rPage.region.neighborhood}
                </span>
                <p className="text-xs font-bold text-slate-900 truncate">
                  {rPage.combinedKeyword}
                </p>
                <p className="text-[10px] text-slate-500">
                  시세 {Math.round(rPage.estimatedCost.min/10000)}만~{Math.round(rPage.estimatedCost.max/10000)}만원
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Same Region, Other Services */}
        <div className="space-y-3 pt-3 border-t border-slate-100">
          <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Wrench className="w-3.5 h-3.5 text-indigo-600" />
            <span>[{page.region.neighborhood}] 지역 다른 집수리 공사 위키:</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {sameRegionOtherPages.map((sPage) => (
              <button
                key={sPage.id}
                onClick={() => onSelectKeywordPage(sPage)}
                className="text-left bg-slate-50 hover:bg-indigo-50/50 p-3.5 rounded-2xl border border-slate-200 hover:border-indigo-300 transition-all space-y-1 group"
              >
                <span className="text-[10px] font-bold text-amber-700 group-hover:underline">
                  {sPage.category}
                </span>
                <p className="text-xs font-bold text-slate-900 truncate">
                  {sPage.combinedKeyword}
                </p>
                <p className="text-[10px] text-slate-500">
                  {sPage.repairMainName.slice(0, 18)}...
                </p>
              </button>
            ))}
          </div>
        </div>

      </section>

    </div>
  );
};
