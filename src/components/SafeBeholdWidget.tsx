import React, { useState, useEffect, useRef } from 'react';

interface SafeBeholdWidgetProps {
  feedId?: string | null;
  className?: string;
  onFail?: () => void;
}

export const SafeBeholdWidget: React.FC<SafeBeholdWidgetProps> = ({ feedId, className, onFail }) => {
  const [hasError, setHasError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!feedId || feedId.trim() === '') {
      setHasError(true);
      onFail?.();
      return;
    }
    
    // Inject the behold script if not present
    if (typeof document !== 'undefined' && !document.querySelector('script[src*="behold"]')) {
      const s = document.createElement('script');
      s.src = 'https://w.behold.so/widget.js';
      s.type = 'module';
      document.head.appendChild(s);
    }
  }, [feedId, onFail]);

  useEffect(() => {
    if (hasError || !feedId) return;

    const observer = new MutationObserver(() => {
      if (containerRef.current) {
         const host = containerRef.current.querySelector('behold-widget');
         if (host && host.shadowRoot) {
           const shadowHtml = host.shadowRoot.innerHTML.toLowerCase();
           if ((shadowHtml.includes('error') && shadowHtml.includes('not found')) || shadowHtml.includes('failed to load')) {
               setHasError(true);
               onFail?.();
           }
         }
         
         const html = containerRef.current.innerHTML.toLowerCase();
         if ((html.includes('error') && html.includes('not found')) || html.includes('failed to load')) {
           setHasError(true);
           onFail?.();
         }
      }
    });

    if (containerRef.current) {
      observer.observe(containerRef.current, { childList: true, subtree: true, characterData: true });
      setTimeout(() => {
         const host = containerRef.current?.querySelector('behold-widget');
         if (host && host.shadowRoot) {
           observer.observe(host.shadowRoot, { childList: true, subtree: true, characterData: true });
         }
      }, 1000);
    }

    return () => observer.disconnect();
  }, [hasError, feedId, onFail]);

  if (hasError || !feedId || feedId.trim() === '') {
    return null;
  }

  return (
    <div ref={containerRef} className={className}>
      {/* @ts-expect-error custom element */}
      <behold-widget feed-id={feedId.trim()} onError={() => { setHasError(true); onFail?.(); }}></behold-widget>
    </div>
  );
};
