import React, { useState } from 'react';
import { 
  X, 
  Send, 
  CheckCircle2, 
  Calendar, 
  Clock, 
  ShieldCheck, 
  MapPin, 
  Wrench, 
  Phone, 
  User, 
  Sparkles 
} from 'lucide-react';
import { WikiKeywordPage } from '../types';

interface EstimateRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  page: WikiKeywordPage | null;
}

export const EstimateRequestModal: React.FC<EstimateRequestModalProps> = ({
  isOpen,
  onClose,
  page,
}) => {
  const [userName, setUserName] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [userAddress, setUserAddress] = useState(page?.region.fullAddress || '');
  const [preferredDate, setPreferredDate] = useState('가장 빠른 일정 (당일/익일)');
  const [symptomDetails, setSymptomDetails] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (!isOpen || !page) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);
  };

  const handleResetAndClose = () => {
    setIsSubmitted(false);
    setUserName('');
    setUserPhone('');
    setSymptomDetails('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-5 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center border border-amber-400/30">
              <Wrench className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">
                우리동네 검증 마스터 무료 견적 신청
              </h2>
              <p className="text-[11px] text-slate-300">
                [{page.region.neighborhood}] 전담 기술자가 직접 1:1 상담을 도와드립니다.
              </p>
            </div>
          </div>
          <button
            onClick={handleResetAndClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isSubmitted ? (
          <div className="p-8 text-center space-y-4 my-auto">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto animate-in zoom-in">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-extrabold text-slate-900">
                견적 상담 접수가 완료되었습니다!
              </h3>
              <p className="text-xs text-slate-600 max-w-xs mx-auto leading-relaxed">
                [{page.region.neighborhood}] 전담 마스터 <strong>{page.localPros[0]?.name || '수리 마스터'}</strong> 님에게 요청서가 전송되었습니다. 15분 내로 안심번호로 연락드립니다.
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs text-left space-y-2">
              <div className="flex justify-between text-slate-600">
                <span>신청 공사:</span>
                <span className="font-bold text-slate-900">{page.combinedKeyword}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>예상 시세:</span>
                <span className="font-bold text-indigo-600">{page.estimatedCost.min.toLocaleString()} ~ {page.estimatedCost.max.toLocaleString()}원</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>품질 보증:</span>
                <span className="font-bold text-emerald-600">수리위키 1년 안심 A/S 보증서 발급</span>
              </div>
            </div>

            <button
              onClick={handleResetAndClose}
              className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs"
            >
              확인 및 창 닫기
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
            
            {/* Target Service Info Badge */}
            <div className="bg-indigo-50/70 border border-indigo-200/70 rounded-2xl p-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-indigo-600 block">선택된 수리 공사</span>
                <p className="text-xs font-bold text-slate-900">{page.combinedKeyword}</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-500 block">표준 기준 견적</span>
                <span className="text-xs font-extrabold text-indigo-600">
                  {Math.round(page.estimatedCost.avg / 10000)}만원 선
                </span>
              </div>
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">고객 성함 *</label>
                <input
                  type="text"
                  required
                  placeholder="예: 홍길동"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">연락처 *</label>
                <input
                  type="tel"
                  required
                  placeholder="010-0000-0000"
                  value={userPhone}
                  onChange={(e) => setUserPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">시공 장소 주소 *</label>
              <input
                type="text"
                required
                placeholder="예: 서울 강남구 역삼동 00아파트 101동"
                value={userAddress}
                onChange={(e) => setUserAddress(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">희망 방문 일정</label>
              <select
                value={preferredDate}
                onChange={(e) => setPreferredDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900"
              >
                <option value="가장 빠른 일정 (당일/익일)">가장 빠른 일정 (당일/익일)</option>
                <option value="이번 주 주말 희망">이번 주 주말 희망</option>
                <option value="평일 저녁 시간대 (18시 이후)">평일 저녁 시간대 (18시 이후)</option>
                <option value="일정 조율 후 결정">일정 조율 후 결정</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">고장 증상 및 요청사항</label>
              <textarea
                rows={3}
                placeholder="예: 싱크대 하부 호스에서 물이 조금씩 새고 수전 레버가 뻑뻑합니다."
                value={symptomDetails}
                onChange={(e) => setSymptomDetails(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Guarantees */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center space-x-2 text-[11px] text-slate-600">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>수리위키 인증 마스터 시공 시 1년 무상 품질보증서가 자동 발급됩니다.</span>
            </div>

            {/* Buttons */}
            <div className="pt-2 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={handleResetAndClose}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
              >
                취소
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold shadow-md shadow-amber-500/20 flex items-center space-x-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>무료 상담/견적 신청</span>
              </button>
            </div>

          </form>
        )}

      </div>
    </div>
  );
};
