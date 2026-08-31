import React from 'react';
import { ShieldCheck, Award, HardHat, Wrench, CheckCircle2 } from 'lucide-react';
import { LocalMasterPro } from '../types';

interface KoreanMasterAvatarProps {
  pro: LocalMasterPro;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showBadge?: boolean;
}

export const KoreanMasterAvatar: React.FC<KoreanMasterAvatarProps> = ({
  pro,
  size = 'md',
  showBadge = true,
}) => {
  // Generate consistent Korean color themes and avatar icons based on name/id
  const nameInitial = pro.name.charAt(0) || '김';
  const roleName = pro.name.slice(1) || '기사';

  // Palette based on master grade/role
  const colorThemes = [
    { bg: 'from-blue-600 via-indigo-700 to-slate-900', border: 'border-blue-300', accent: 'bg-blue-500', vest: '#1e3a8a', hat: '#f59e0b' },
    { bg: 'from-amber-600 via-orange-700 to-slate-900', border: 'border-amber-300', accent: 'bg-amber-500', vest: '#78350f', hat: '#ffffff' },
    { bg: 'from-emerald-600 via-teal-800 to-slate-900', border: 'border-emerald-300', accent: 'bg-emerald-500', vest: '#064e3b', hat: '#f59e0b' },
    { bg: 'from-slate-700 via-slate-800 to-slate-950', border: 'border-slate-300', accent: 'bg-indigo-500', vest: '#334155', hat: '#e2e8f0' },
  ];

  const charCode = pro.name.charCodeAt(0) || 0;
  const theme = colorThemes[charCode % colorThemes.length];

  const sizeClasses = {
    sm: 'w-10 h-10 text-xs',
    md: 'w-14 h-14 text-sm',
    lg: 'w-16 h-16 text-base',
    xl: 'w-20 h-20 text-lg',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
    xl: 'w-6 h-6',
  };

  return (
    <div className="relative inline-block shrink-0">
      {/* Technician Badge Container */}
      <div 
        className={`${sizeClasses[size]} rounded-2xl bg-gradient-to-br ${theme.bg} p-0.5 shadow-md border-2 ${theme.border} flex items-center justify-center relative overflow-hidden group`}
      >
        {/* Architectural grid background texture */}
        <div 
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, rgba(255,255,255,0.7) 1px, transparent 0)`,
            backgroundSize: '6px 6px'
          }}
        />

        {/* Korean Master Stylized Vector Silhouette & Identity */}
        <div className="w-full h-full rounded-[14px] flex flex-col items-center justify-center text-white relative z-10 select-none">
          {/* Technician Safety Helmet & Insignia Icon */}
          <div className="flex items-center gap-0.5">
            <HardHat className={`${iconSizes[size]} text-amber-300 drop-shadow-sm`} />
            <span className="font-black text-[10px] tracking-tight text-white/90">수리</span>
          </div>

          {/* Master Name Inscription */}
          <div className="flex items-center justify-center font-extrabold tracking-tighter text-white">
            <span className="text-amber-200">{nameInitial}</span>
            <span className="text-white text-[11px] font-bold ml-0.5">{roleName.slice(0, 2)}</span>
          </div>

          {/* Certification Bar */}
          <div className="absolute bottom-0 inset-x-0 bg-black/40 backdrop-blur-[1px] py-[1px] flex items-center justify-center">
            <span className="text-[7px] font-bold text-amber-300 tracking-wider">
              {pro.masterGrade ? '국가공인' : '검증마스터'}
            </span>
          </div>
        </div>
      </div>

      {/* Verified Shield Ribbon */}
      {showBadge && (
        <div 
          className="absolute -bottom-1.5 -right-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-full p-1 shadow-md border border-white flex items-center justify-center"
          title="수리위키 100% 신원/자격/보험 검증 완료"
        >
          <ShieldCheck className="w-3 h-3 text-white fill-white/20" />
        </div>
      )}
    </div>
  );
};
