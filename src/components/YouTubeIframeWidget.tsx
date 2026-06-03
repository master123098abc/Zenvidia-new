import React, { useState, useEffect, useRef, memo } from 'react';

interface Props {
  videoId?: string;         // Optional for regular YouTube channels vs Shorts
  channelUrl?: string;      // If regular YouTube channel
  idx: number;
  isActive: boolean;
  isMounted: boolean;
  thumbnail?: string;
}

let activeVideoId: string | null = null;
let currentIframe: HTMLIFrameElement | null = null;

export const YouTubeIframeWidget = memo(function YouTubeIframeWidget({ videoId, channelUrl, idx, isActive, isMounted, thumbnail }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  
  const hasStartedRef = useRef(false);
  const initialMountActive = useRef(isActive);

  const videoIdStr = videoId || channelUrl || 'unknown';

  useEffect(() => {
    if (!isActive) {
      console.log('NEXT_PRELOADED', videoIdStr);
    }
  }, [isActive, videoIdStr]);

  const startPlaying = () => {
    if (currentIframe && currentIframe !== iframeRef.current && currentIframe.contentWindow) {
      console.log('PAUSE_PREVIOUS');
      currentIframe.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
    }

    console.log('VIDEO_ACTIVATED');
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
      currentIframe = iframeRef.current;
      activeVideoId = videoIdStr;
      
      if (!hasStartedRef.current) {
        hasStartedRef.current = true;
        setHasStarted(true);
      }
    }
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // YouTube posts messages with event data
      if (typeof event.data === 'string' && event.data.includes('infoDelivery') && isActive && hasStartedRef.current) {
        try {
          const data = JSON.parse(event.data);
          if (data.event === 'infoDelivery' && data.info) {
            const { currentTime, duration } = data.info;
            if (currentTime && duration && duration > 0) {
              const pct = currentTime / duration;
              if (pct >= 0.2 && pct < 0.25) {
                // To avoid multiple triggers
                if (!window[`preloadTriggered_${videoIdStr}`]) {
                  window[`preloadTriggered_${videoIdStr}`] = true;
                  console.log('PRELOAD_TRIGGER_20');
                  const customEvt = new CustomEvent('yt-preload-next', { detail: { idx } });
                  window.dispatchEvent(customEvt);
                }
              }
            }
          }
        } catch (e) {}
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [isActive, idx, videoIdStr]);


  useEffect(() => {
    if (isActive) {
      if (initialMountActive.current && !hasStartedRef.current) {
         return;
      }
      if (!iframeLoaded) return;

      console.log('SWIPE_DETECTED');
      const t = setTimeout(() => {
        console.log('SWIPE_PLAY');
        startPlaying();
      }, 100);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, iframeLoaded]);

  if (!isMounted) return null;

  if (!videoId && !channelUrl) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-black">
        <p className="text-white">Video unavailable</p>
      </div>
    );
  }

  const srcParams = videoId
    ? `https://www.youtube.com/embed/${videoId}?playsinline=1&enablejsapi=1`
    : `https://www.youtube.com/embed?listType=user_uploads&list=${channelUrl}&playsinline=1&enablejsapi=1`;

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('VIDEO_ID', videoIdStr);
    console.log('USER_CLICKED_PLAY');
    console.log('IFRAME_CREATED'); 
    
    startPlaying();
  };

  const handleIframeLoad = () => {
    console.log('PRELOAD_READY', videoIdStr);
    console.log('NEXT_READY');
    setIframeLoaded(true);
  };

  return (
    <div className="absolute inset-0 w-full h-full bg-black">
      {(!hasStarted || !iframeLoaded) && (
        <div 
          className={`absolute inset-0 w-full h-full ${initialMountActive.current && !hasStarted ? 'cursor-pointer pointer-events-auto group' : 'pointer-events-none'} flex items-center justify-center z-20`}
          onClick={(initialMountActive.current && !hasStarted) ? handlePlayClick : undefined}
        >
          {thumbnail && (
            <img src={thumbnail} className="absolute inset-0 w-full h-full object-cover" alt="" />
          )}
          {initialMountActive.current && !hasStarted && (
            <>
              <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors" />
              <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </>
          )}
        </div>
      )}

      <iframe
        ref={iframeRef}
        src={srcParams}
        onLoad={handleIframeLoad}
        className={`absolute inset-0 w-full h-full border-none pointer-events-auto ${hasStarted && iframeLoaded ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
        allowFullScreen
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        title={videoId ? "YouTube Short" : "YouTube Channel"}
      />
    </div>
  );
});

