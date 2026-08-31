import React, { useState } from 'react';
import { 
  Wrench, 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  Layers, 
  ShieldCheck, 
  Maximize2, 
  Compass, 
  Zap, 
  Droplets,
  Wind,
  Cpu
} from 'lucide-react';
import { RepairCategory } from '../types';

interface TechnicalSchematicPatternProps {
  category: RepairCategory;
  mode?: 'BEFORE' | 'AFTER' | 'BLUEPRINT' | 'BANNER';
  title?: string;
  subtitle?: string;
  defectNote?: string;
  passedNote?: string;
  heightClass?: string;
  interactive?: boolean;
}

export const TechnicalSchematicPattern: React.FC<TechnicalSchematicPatternProps> = ({
  category,
  mode = 'BLUEPRINT',
  title,
  subtitle,
  defectNote,
  passedNote,
  heightClass = 'h-52',
  interactive = true,
}) => {
  const [activeLayer, setActiveLayer] = useState<'CAD' | 'SENSOR' | 'REPORT'>('CAD');

  // Blueprint and Schematic Themes based on Mode & Category
  const isBefore = mode === 'BEFORE';
  const isAfter = mode === 'AFTER';
  const isBanner = mode === 'BANNER';

  // Category specific technical icons & labels
  const getCategorySchematicConfig = () => {
    switch (category) {
      case '주방/싱크대':
        return {
          code: 'DWG-KITCHEN-SINK-0815',
          standard: 'KS B 1538 올스텐 배수구 & 수전 규격',
          primaryMetric: isBefore ? '오염 트랩 슬러지 84% 누적' : '올스텐 V트랩 통수속도 1.8L/s (PASS)',
          secondaryMetric: isBefore ? '하부 연결부 미세 누수 12滴/분' : '수압 4.8 bar 안정화 (0 누수)',
          color: isBefore ? 'text-amber-400' : 'text-emerald-400',
          gridBg: isBefore ? 'from-amber-950/40 to-slate-950' : 'from-indigo-950/50 to-slate-950',
          accent: isBefore ? '#f59e0b' : '#10b981',
          diagramType: '배수관 역류방지 V트랩 및 앵글밸브 정밀 단면도',
        };
      case '누수/방수':
        return {
          code: 'DWG-LEAK-SCAN-0815',
          standard: 'KS F 4917 고압/가스식 비파괴 누수탐지',
          primaryMetric: isBefore ? '가스 탐지 반응치 980ppm (누수)' : '기압 5.0 bar 30분 유지 감압 0% (PASS)',
          secondaryMetric: isBefore ? '열화상 온도차 ΔT=4.8°C (수분집중)' : '비파괴 침투방수 도막 100% 양생',
          color: isBefore ? 'text-rose-400' : 'text-emerald-400',
          gridBg: isBefore ? 'from-rose-950/40 to-slate-950' : 'from-cyan-950/40 to-slate-950',
          accent: isBefore ? '#f43f5e' : '#06b6d4',
          diagramType: '초음파 청음 탐지 파형 및 배관 단면도',
        };
      case '욕실/화장실':
        return {
          code: 'DWG-BATH-FLANGE-0815',
          standard: 'KS L 1551 위생도기 정심 플랜지 300mm 규격',
          primaryMetric: isBefore ? '변기 하부 백시멘트 파손 흔들림 6mm' : 'VG2 정심 패킹 100% 밀착 악취 0%',
          secondaryMetric: isBefore ? '물탱크 사이펀 마모 누수 누적' : '아덱스 바이오 항균 실리콘 라인 완벽',
          color: isBefore ? 'text-amber-400' : 'text-emerald-400',
          gridBg: isBefore ? 'from-amber-950/40 to-slate-950' : 'from-blue-950/40 to-slate-950',
          accent: isBefore ? '#f59e0b' : '#3b82f6',
          diagramType: '오수관 밀착 플랜지 및 세면기 P트랩 구조도',
        };
      case '문/샷시/창호':
        return {
          code: 'DWG-SASH-ROLLER-0815',
          standard: 'KS F 3117 창호 기밀성 1등급 & 트윈롤러 규격',
          primaryMetric: isBefore ? '롤러 베어링 파손 마찰저항 18kgf' : '트윈 볼베어링 구동력 2.1kgf (경량화)',
          secondaryMetric: isBefore ? '모헤어 털 삭음 외풍 유입율 42%' : '4중 고밀도 핀모헤어 기밀 99.8%',
          color: isBefore ? 'text-amber-400' : 'text-emerald-400',
          gridBg: isBefore ? 'from-slate-900 to-indigo-950' : 'from-slate-900 to-emerald-950',
          accent: isBefore ? '#f59e0b' : '#10b981',
          diagramType: '하이샷시 레일 궤도 및 4중 모헤어 기밀 단면도',
        };
      case '도배/장판/바닥':
        return {
          code: 'DWG-FLOOR-WALL-0815',
          standard: 'KS L 5514 석고보드 및 친환경 바닥재 규격',
          primaryMetric: isBefore ? '석고보드 수분흡착 곰팡이 포자 발생' : '이보드 단열재 23T + 친환경 실크 도배',
          secondaryMetric: isBefore ? '마루 표면 찍힘 깊이 1.5mm' : '우레탄 레진 정밀 조색 인두 보수 PASS',
          color: isBefore ? 'text-amber-400' : 'text-emerald-400',
          gridBg: isBefore ? 'from-amber-950/40 to-slate-950' : 'from-emerald-950/40 to-slate-950',
          accent: isBefore ? '#f59e0b' : '#10b981',
          diagramType: '벽체 3중 단열 적층도 및 마루 맞물림 단면도',
        };
      case '전기/조명/설비':
        return {
          code: 'DWG-ELEC-BREAKER-0815',
          standard: 'KEC 한국전기설비규정 2.5sq/4.0sq 배선',
          primaryMetric: isBefore ? '누전 차단기 정격 초과 31.4A 트립' : '메인/분기 20A 차단기 분리 정상',
          secondaryMetric: isBefore ? '절연저항 0.08 MΩ (누전 위험)' : '절연저항 100 MΩ 이상 (안전 PASS)',
          color: isBefore ? 'text-rose-400' : 'text-emerald-400',
          gridBg: isBefore ? 'from-rose-950/40 to-slate-950' : 'from-indigo-950/40 to-slate-950',
          accent: isBefore ? '#f43f5e' : '#6366f1',
          diagramType: '분전반 누전 차단기 결선도 및 전력 부하 배선도',
        };
      case '배관/난방/보일러':
        return {
          code: 'DWG-HEATING-VALVE-0815',
          standard: 'KS B 6607 온수 분배기 및 버블 배관 세척',
          primaryMetric: isBefore ? '난방수 녹물 슬러지 유속 65% 저하' : '버블 고압 세척 후 유속 100% 정상화',
          secondaryMetric: isBefore ? '분배기 미세 밸브 누수 0.3L/일' : '황동 정밀 밸브 교체 균등 난방 실현',
          color: isBefore ? 'text-rose-400' : 'text-emerald-400',
          gridBg: isBefore ? 'from-rose-950/40 to-slate-950' : 'from-cyan-950/40 to-slate-950',
          accent: isBefore ? '#f43f5e' : '#06b6d4',
          diagramType: '5구 온수 분배기 유로도 및 배관 순환 압력선도',
        };
      case '타일/대리석':
        return {
          code: 'DWG-TILE-GROUT-0815',
          standard: 'KS L 1001 도자기질 타일 접착 인장강도 1.0N/mm²',
          primaryMetric: isBefore ? '벽타일 들뜸 박리 위험도 CRITICAL' : '에폭시 주입 및 압착 재부착 완료',
          secondaryMetric: isBefore ? '백시멘트 줄눈 탈락 및 곰팡이 오염' : '폴리우레아 방수 줄눈 코팅 경화 완료',
          color: isBefore ? 'text-amber-400' : 'text-emerald-400',
          gridBg: isBefore ? 'from-amber-950/40 to-slate-950' : 'from-teal-950/40 to-slate-950',
          accent: isBefore ? '#f59e0b' : '#14b8a6',
          diagramType: '타일 하지면 압착 단면도 및 에폭시 줄눈 구조',
        };
      case '방충망/환풍기/기타':
      default:
        return {
          code: 'DWG-SCREEN-VENT-0815',
          standard: 'KS F 4536 30메시 미세모노필라멘트 규격',
          primaryMetric: isBefore ? '알루미늄망 삭음 찢어짐 구멍 4개' : '고강도 블랙 미세망 초파리 100% 차단',
          secondaryMetric: isBefore ? '환풍기 역풍 냄새 유입 담배연기' : '힘펠 스마트 전동 댐퍼 기밀 차단',
          color: isBefore ? 'text-amber-400' : 'text-emerald-400',
          gridBg: isBefore ? 'from-slate-900 to-indigo-950' : 'from-slate-900 to-teal-950',
          accent: isBefore ? '#f59e0b' : '#10b981',
          diagramType: '30메시 미세망 격자 구조 및 역풍 방지 댐퍼 단면',
        };
    }
  };

  const config = getCategorySchematicConfig();

  return (
    <div className={`relative w-full ${heightClass} rounded-2xl overflow-hidden bg-gradient-to-br ${config.gridBg} border border-slate-700/80 shadow-inner flex flex-col justify-between p-4 text-white font-mono select-none`}>
      
      {/* 1. CAD Technical Grid Pattern Background */}
      <div 
        className="absolute inset-0 opacity-25 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(99, 102, 241, 0.25) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(99, 102, 241, 0.25) 1px, transparent 1px)
          `,
          backgroundSize: '24px 24px'
        }}
      />

      {/* 2. Sub-grid minor coordinate dots */}
      <div 
        className="absolute inset-0 opacity-15 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.8) 1px, transparent 0)`,
          backgroundSize: '8px 8px'
        }}
      />

      {/* 3. Dynamic Vector CAD Technical Diagram overlay */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
        <svg className="w-full h-full p-6" viewBox="0 0 400 200" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Engineering measurement lines & axes */}
          <line x1="20" y1="20" x2="380" y2="20" stroke={config.accent} strokeWidth="0.75" strokeDasharray="3 3" />
          <line x1="20" y1="180" x2="380" y2="180" stroke={config.accent} strokeWidth="0.75" strokeDasharray="3 3" />
          <line x1="20" y1="20" x2="20" y2="180" stroke={config.accent} strokeWidth="0.75" strokeDasharray="3 3" />
          <line x1="380" y1="20" x2="380" y2="180" stroke={config.accent} strokeWidth="0.75" strokeDasharray="3 3" />

          {/* Central Structural Sectional Schematic Graphic */}
          <rect x="70" y="50" width="260" height="100" rx="8" stroke={config.accent} strokeWidth="1.5" strokeOpacity="0.8" />
          <path d="M 70 100 L 330 100" stroke={config.accent} strokeWidth="1" strokeDasharray="5 5" />
          
          {/* Pipe or Flow arrows */}
          <circle cx="120" cy="100" r="28" stroke={config.accent} strokeWidth="1.5" />
          <circle cx="280" cy="100" r="28" stroke={config.accent} strokeWidth="1.5" />
          <path d="M 120 72 L 280 72" stroke={config.accent} strokeWidth="2" />
          <path d="M 120 128 L 280 128" stroke={config.accent} strokeWidth="2" />
          
          {/* Sensor measurement nodes */}
          <circle cx="200" cy="100" r="6" fill={config.accent} />
          <line x1="200" y1="60" x2="200" y2="140" stroke={config.accent} strokeWidth="1" />
          
          {/* Crosshair target & dimension annotations */}
          <path d="M 190 100 L 210 100 M 200 90 L 200 110" stroke="#ffffff" strokeWidth="1.5" />
          <text x="75" y="44" fill={config.accent} fontSize="9" fontFamily="monospace">DIM 300mm ± 0.5</text>
          <text x="240" y="44" fill={config.accent} fontSize="9" fontFamily="monospace">SPEC KS-STANDARD</text>
        </svg>
      </div>

      {/* 4. Top Header Information Bar */}
      <div className="relative z-10 flex items-center justify-between border-b border-white/10 pb-2">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full animate-ping" style={{ backgroundColor: config.accent }} />
          <span className="text-[10px] font-bold tracking-widest text-slate-300 uppercase">
            {config.code}
          </span>
          <span className="text-[9px] bg-white/10 text-slate-300 px-1.5 py-0.5 rounded border border-white/10">
            {category}
          </span>
        </div>

        {/* State Tag */}
        <div className="flex items-center space-x-1.5">
          {isBefore && (
            <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-amber-400" />
              [시공 전 결함 상태]
            </span>
          )}
          {isAfter && (
            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              [정석 시공 완료 검측필]
            </span>
          )}
          {isBanner && (
            <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-indigo-400" />
              [표준 공정 설계도]
            </span>
          )}
        </div>
      </div>

      {/* 5. Center Diagram Title & Key Inspection Metric */}
      <div className="relative z-10 my-auto py-2 space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-white tracking-tight">
            {title || config.diagramType}
          </span>
          <span className="text-[9px] text-slate-400 font-sans">
            {config.standard}
          </span>
        </div>

        {/* Diagnostic / Verification Metric Tag */}
        <div className="bg-black/50 backdrop-blur-md rounded-xl p-2.5 border border-white/10 space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 text-[10px]">1차 주요 지표:</span>
            <span className={`font-bold ${config.color}`}>
              {defectNote || passedNote || config.primaryMetric}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs border-t border-white/5 pt-1">
            <span className="text-slate-400 text-[10px]">2차 정밀 검측:</span>
            <span className="text-slate-200 text-[11px] font-medium">
              {config.secondaryMetric}
            </span>
          </div>
        </div>
      </div>

      {/* 6. Bottom Technical Certification & Stamp */}
      <div className="relative z-10 flex items-center justify-between pt-2 border-t border-white/10 text-[9px] text-slate-400">
        <div className="flex items-center space-x-1.5">
          <Activity className="w-3 h-3 text-indigo-400" />
          <span>실시간 계측 오차: ±0.02%</span>
        </div>

        {/* Certified On-site Stamp */}
        <div className="flex items-center space-x-1 font-bold text-amber-300/90 tracking-wider">
          <span>수리위키 공인 검측필</span>
          <span className="text-[8px] bg-amber-400/20 px-1 py-0.2 rounded border border-amber-400/40">KS 1급</span>
        </div>
      </div>

    </div>
  );
};
