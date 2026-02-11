'use client';
import { useState, useEffect, useRef } from 'react';

// 광고 제공자 타입
type AdProvider = 'adsense' | 'kakao-adfit' | 'coupang-partners';

// 환경변수로 광고 설정 관리
// NEXT_PUBLIC_AD_PROVIDER: 'adsense' | 'kakao-adfit' | 'coupang-partners'
// NEXT_PUBLIC_ADSENSE_CLIENT: Google AdSense 클라이언트 ID (예: ca-pub-XXXXXXXXXXXXXXXX)
// NEXT_PUBLIC_ADSENSE_SLOT: Google AdSense 슬롯 ID
// NEXT_PUBLIC_KAKAO_ADFIT_UNIT: Kakao AdFit 광고 단위 ID
// NEXT_PUBLIC_COUPANG_PARTNERS_ID: 쿠팡 파트너스 배너 ID
// NEXT_PUBLIC_COUPANG_PARTNERS_SUBID: 쿠팡 파트너스 서브 ID

const AD_PROVIDER: AdProvider = (process.env.NEXT_PUBLIC_AD_PROVIDER as AdProvider) || 'adsense';

function GoogleAdSense() {
  const adRef = useRef<HTMLModElement>(null);
  const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT || '';
  const slotId = process.env.NEXT_PUBLIC_ADSENSE_SLOT || '';

  useEffect(() => {
    if (!clientId || !slotId) return;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
    } catch {
      // AdSense script not loaded
    }
  }, [clientId, slotId]);

  if (!clientId || !slotId) {
    return <PlaceholderAd provider="Google AdSense" configKey="NEXT_PUBLIC_ADSENSE_CLIENT, NEXT_PUBLIC_ADSENSE_SLOT" />;
  }

  return (
    <ins
      ref={adRef}
      className="adsbygoogle"
      style={{ display: 'inline-block', width: '728px', height: '90px' }}
      data-ad-client={clientId}
      data-ad-slot={slotId}
      data-ad-format="horizontal"
      data-full-width-responsive="false"
    />
  );
}

function KakaoAdFit() {
  const containerRef = useRef<HTMLDivElement>(null);
  const unitId = process.env.NEXT_PUBLIC_KAKAO_ADFIT_UNIT || '';

  useEffect(() => {
    if (!unitId || !containerRef.current) return;

    const ins = document.createElement('ins');
    ins.className = 'kakao_ad_area';
    ins.style.display = 'none';
    ins.setAttribute('data-ad-unit', unitId);
    ins.setAttribute('data-ad-width', '728');
    ins.setAttribute('data-ad-height', '90');

    const script = document.createElement('script');
    script.async = true;
    script.type = 'text/javascript';
    script.src = '//t1.daumcdn.net/kas/static/ba.min.js';

    containerRef.current.appendChild(ins);
    containerRef.current.appendChild(script);

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [unitId]);

  if (!unitId) {
    return <PlaceholderAd provider="Kakao AdFit" configKey="NEXT_PUBLIC_KAKAO_ADFIT_UNIT" />;
  }

  return <div ref={containerRef} className="flex items-center justify-center" />;
}

function CoupangPartners() {
  const partnersId = process.env.NEXT_PUBLIC_COUPANG_PARTNERS_ID || '';
  const subId = process.env.NEXT_PUBLIC_COUPANG_PARTNERS_SUBID || 'prettyjson';

  if (!partnersId) {
    return <PlaceholderAd provider="Coupang Partners" configKey="NEXT_PUBLIC_COUPANG_PARTNERS_ID" />;
  }

  const src = `https://ads-partners.coupang.com/widgets.html?id=${partnersId}&template=carousel&trackingCode=${subId}&subId=&width=680&height=70`;

  return (
    <iframe
      src={src}
      width="680"
      height="70"
      frameBorder="0"
      scrolling="no"
      referrerPolicy="unsafe-url"
      className="max-w-full"
      title="Coupang Partners Ad"
    />
  );
}

function PlaceholderAd({ provider, configKey }: { provider: string; configKey: string }) {
  return (
    <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
      <span className="border border-dashed border-gray-300 dark:border-gray-600 rounded px-3 py-2">
        {provider} 광고 영역 - 환경변수 설정 필요: {configKey}
      </span>
    </div>
  );
}

export default function AdBanner() {
  const [dismissed, setDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const wasDismissed = sessionStorage.getItem('ad-dismissed');
    if (wasDismissed) {
      setDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('ad-dismissed', '1');
  };

  if (!mounted || dismissed) return null;

  return (
    <div className="shrink-0 border-t border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/80">
      <div className="flex items-center gap-3 px-4 py-2">
        <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider shrink-0 border border-gray-300 dark:border-gray-600 rounded px-1.5 py-0.5">
          AD
        </span>
        <div className="flex-1 flex items-center justify-center min-w-0 overflow-hidden">
          {AD_PROVIDER === 'adsense' && <GoogleAdSense />}
          {AD_PROVIDER === 'kakao-adfit' && <KakaoAdFit />}
          {AD_PROVIDER === 'coupang-partners' && <CoupangPartners />}
        </div>
        <button
          onClick={handleDismiss}
          className="shrink-0 w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          title="광고 닫기"
          aria-label="광고 닫기"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
