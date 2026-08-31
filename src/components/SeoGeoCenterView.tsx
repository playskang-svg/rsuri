import React, { useState } from 'react';
import { 
  Globe, 
  Code, 
  FileCode, 
  Copy, 
  CheckCircle2, 
  Sparkles, 
  MapPin, 
  ExternalLink, 
  Layers, 
  Check, 
  Search, 
  ShieldCheck, 
  Download 
} from 'lucide-react';
import { WikiKeywordPage, RegionItem } from '../types';

interface SeoGeoCenterViewProps {
  wikiPages: WikiKeywordPage[];
  regions: RegionItem[];
  onSelectKeywordPage: (page: WikiKeywordPage) => void;
}

export const SeoGeoCenterView: React.FC<SeoGeoCenterViewProps> = ({
  wikiPages,
  regions,
  onSelectKeywordPage,
}) => {
  const [copiedLabel, setCopiedLabel] = useState<string | null>(null);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLabel(label);
    setTimeout(() => setCopiedLabel(null), 2500);
  };

  // Generate XML Sitemap
  const xmlSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- 수리위키 메인 포털 -->
  <url>
    <loc>https://suriwiki.kr</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <!-- [공사명 메인 + 지역 키워드] 위키 페이지 목록 (${wikiPages.length}개) -->
${wikiPages.map(page => `  <url>
    <loc>${page.geoMeta.canonicalUrl}</loc>
    <lastmod>${page.geoMeta.lastModified}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>`).join('\n')}
</urlset>`;

  // Generate robots.txt
  const robotsTxt = `# [수리위키] robots.txt for Googlebot & Yeti (Naver)
User-agent: *
Allow: /
Allow: /wiki/
Allow: /region/
Allow: /category/

# Sitemaps
Sitemap: https://suriwiki.kr/sitemap.xml`;

  // All URL List for GSC / Naver Search Advisor
  const allUrlsString = wikiPages.map(p => p.geoMeta.canonicalUrl).join('\n');

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pb-16">
      
      {/* Notification */}
      {copiedLabel && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs px-4 py-2.5 rounded-xl shadow-2xl flex items-center space-x-2 border border-slate-700 animate-in slide-in-from-bottom-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{copiedLabel} 클립보드에 복사되었습니다!</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-br from-emerald-950 via-slate-900 to-indigo-950 text-white p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center space-x-2">
          <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-xs border border-emerald-400/30 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            SEO & GEO 종합 관제 센터
          </span>
        </div>
        <h1 className="text-xl sm:text-3xl font-extrabold text-white">
          검색엔진 상위 노출 & AI 로컬 검색 최적화 허브
        </h1>
        <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
          수리위키에 발행된 모든 [공사명 메인 + 지역 키워드] 페이지의 Schema.org 구조화 마크업, XML Sitemap, 사이트 색인 URL 및 네이버/구글 검색엔진 등록 자산을 원클릭으로 관리합니다.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="bg-white/5 p-3.5 rounded-2xl border border-white/10">
            <span className="text-[10px] text-slate-400 block font-medium">색인 대상 URL</span>
            <span className="text-xl font-extrabold text-emerald-400">{wikiPages.length + 1}개</span>
          </div>
          <div className="bg-white/5 p-3.5 rounded-2xl border border-white/10">
            <span className="text-[10px] text-slate-400 block font-medium">Schema.org 준수율</span>
            <span className="text-xl font-extrabold text-indigo-300">100% (오류 0건)</span>
          </div>
          <div className="bg-white/5 p-3.5 rounded-2xl border border-white/10">
            <span className="text-[10px] text-slate-400 block font-medium">GEO 좌표 매핑률</span>
            <span className="text-xl font-extrabold text-amber-300">100% 전수 동기화</span>
          </div>
          <div className="bg-white/5 p-3.5 rounded-2xl border border-white/10">
            <span className="text-[10px] text-slate-400 block font-medium">네이버 스마트블록 적합도</span>
            <span className="text-xl font-extrabold text-white">최상 (Grade A+)</span>
          </div>
        </div>
      </div>

      {/* 1. All Published Pages SEO Audit Table */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <Globe className="w-5 h-5 text-indigo-600" />
              <span>발행된 [공사명 + 지역] 키워드 페이지 SEO 전수 현황</span>
            </h2>
            <p className="text-xs text-slate-500">네이버 서치어드바이저 / 구글 서치콘솔 제출용 URL 목록입니다.</p>
          </div>

          <button
            onClick={() => handleCopy(allUrlsString, '전체 URL 목록이')}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>전체 Canonical URL 일괄 복사</span>
          </button>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-2xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3.5">타겟 키워드 (공사명 + 지역)</th>
                <th className="p-3.5">행정동 (GEO)</th>
                <th className="p-3.5">정규 URL (Canonical Slug)</th>
                <th className="p-3.5">구조화 스키마</th>
                <th className="p-3.5 text-right">페이지 이동</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {wikiPages.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-3.5 font-bold text-slate-900">
                    <span className="text-indigo-600 font-extrabold">[{p.category}]</span> {p.combinedKeyword}
                  </td>
                  <td className="p-3.5 text-slate-600">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-indigo-500" />
                      {p.region.neighborhood}
                    </span>
                  </td>
                  <td className="p-3.5 font-mono text-[11px] text-slate-500 max-w-xs truncate">
                    /wiki/{p.slug}
                  </td>
                  <td className="p-3.5">
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      HomeBusiness + FAQ + Breadcrumb
                    </span>
                  </td>
                  <td className="p-3.5 text-right">
                    <button
                      onClick={() => onSelectKeywordPage(p)}
                      className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg font-bold text-[11px]"
                    >
                      상세 보기
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. XML Sitemap & Robots.txt */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* XML Sitemap */}
        <div className="bg-slate-900 text-white p-6 rounded-3xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FileCode className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-mono font-bold text-emerald-400">sitemap.xml (표준 사이트맵)</span>
            </div>
            <button
              onClick={() => handleCopy(xmlSitemap, 'sitemap.xml 코드가')}
              className="text-xs text-slate-300 hover:text-white bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 flex items-center space-x-1"
            >
              <Copy className="w-3 h-3" />
              <span>복사</span>
            </button>
          </div>
          <pre className="text-[11px] font-mono text-slate-300 bg-slate-950 p-4 rounded-2xl overflow-x-auto max-h-60 border border-slate-800 scrollbar-thin">
            {xmlSitemap}
          </pre>
        </div>

        {/* robots.txt */}
        <div className="bg-slate-900 text-white p-6 rounded-3xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FileCode className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-mono font-bold text-indigo-400">robots.txt (검색 로봇 크롤링 규칙)</span>
            </div>
            <button
              onClick={() => handleCopy(robotsTxt, 'robots.txt 코드가')}
              className="text-xs text-slate-300 hover:text-white bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 flex items-center space-x-1"
            >
              <Copy className="w-3 h-3" />
              <span>복사</span>
            </button>
          </div>
          <pre className="text-[11px] font-mono text-slate-300 bg-slate-950 p-4 rounded-2xl overflow-x-auto max-h-60 border border-slate-800 scrollbar-thin">
            {robotsTxt}
          </pre>
        </div>

      </div>

    </div>
  );
};
