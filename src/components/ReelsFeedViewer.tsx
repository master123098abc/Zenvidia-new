import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, X, ExternalLink, Heart, MessageCircle, Volume2, VolumeX } from 'lucide-react';
import SmartPitchModal from './SmartPitchModal';

interface ReelsFeedViewerProps {
  onClose: () => void;
  onCreatorClick?: (creator: any) => void;
}

import { YouTubeIframeWidget } from './YouTubeIframeWidget';

const getYTHandle = (url: string): string => {
  try {
    const u = new URL(url);
    const parts = u.pathname.split('/').filter(Boolean);
    if (parts[0]?.startsWith('@')) return parts[0].slice(1);
    if (parts[0] === 'c' || parts[0] === 'user') return parts[1];
    if (parts[0] === 'channel') return parts[1];
    return parts[0] || '';
  } catch { return ''; }
};

export default function ReelsFeedViewer({ onClose, onCreatorClick }: ReelsFeedViewerProps) {
  const [cards, setCards] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const iframeRefs = useRef<(HTMLIFrameElement | null)[]>([]);
  
  const [selectedCreator, setSelectedCreator] = useState<any>(null);
  const [smartPitchOpen, setSmartPitchOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [mountedIndices, setMountedIndices] = useState<Set<number>>(new Set([0]));
  
  const [audioEnabled, setAudioEnabled] = useState(() => {
    return localStorage.getItem('yt_audio_enabled') === 'true';
  });
  
  const audioEnabledRef = useRef(audioEnabled);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    audioEnabledRef.current = audioEnabled;
    if (audioEnabled) {
      localStorage.setItem('yt_audio_enabled', 'true');
    }
  }, [audioEnabled]);

  useEffect(() => {
    // Basic mount: just mount the current index (if swipe happens early, it'll mount)
    // We do NOT aggressively preload next here anymore.
    setMountedIndices(prev => {
      const nextSet = new Set<number>();
      nextSet.add(currentIndex);
      // Keep next index mounted if it was already preloaded
      if (prev.has(currentIndex)) {
         // Keep it.
      }
      console.log(`Current index: ${currentIndex}. Mounted count: ${nextSet.size}`);
      return nextSet;
    });
  }, [currentIndex]);

  useEffect(() => {
    const handlePreload = (e: any) => {
      const idx = e.detail?.idx;
      if (typeof idx === 'number' && idx === currentIndex) {
        setMountedIndices(prev => {
          if (prev.has(idx + 1)) return prev;
          const nextSet = new Set<number>(prev);
          if (idx + 1 < cards.length) nextSet.add(idx + 1); // Preload next at 20%
          console.log(`Preloading idx ${idx + 1}. Mounted count: ${nextSet.size}`);
          return nextSet;
        });
      }
    };
    
    window.addEventListener('yt-preload-next', handlePreload);
    return () => window.removeEventListener('yt-preload-next', handlePreload);
  }, [currentIndex, cards.length]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const index = Math.round(el.scrollTop / el.clientHeight);
    if (index !== currentIndex) {
      console.log(`Instant switch: index changed to ${index}`);
      setCurrentIndex(index);
    }
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUser(data.user));
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (document.querySelector('script[src*="behold"]')) return;
    const s = document.createElement('script');
    s.src = 'https://w.behold.so/widget.js';
    s.type = 'module';
    document.head.appendChild(s);
  }, []);

  useEffect(() => {
    const fetchReels = async () => {
      setIsLoading(true);

      try {
        const { data: creators, error } = await supabase
          .from('creators')
          .select('id, ig_handle, follower_count, niche, profile_url, status, ig_url, yt_url, behold_feed_id, reel_url_1, reel_url_2, reel_url_3, reel_url_4, reel_url_5, reel_url_6, reel_url_7, reel_url_8, reel_url_9, reel_url_10')
          .order('created_at', { ascending: false });

        if (error) {
          console.warn("Supabase Error fetching reels:", error);
          throw error;
        }

        // Fetch YouTube shorts with creator info
        const { data: ytShorts } = await supabase
          .from('youtube_shorts')
          .select(`
            embed_url, video_id, title, thumbnail,
            creators!creator_id(
              ig_handle, profile_url, ig_url, yt_url
            )
          `);

        const allCards: any[] = [];
        
        creators?.forEach(c => {
          // Add Behold card if exists
          if (c.behold_feed_id) {
            allCards.push({ type: 'behold', creator: c });
          }
          
          // Add Cloudinary reel cards
          for (let i = 1; i <= 10; i++) {
            if (c[`reel_url_${i}`]) {
              allCards.push({ 
                type: 'video', 
                url: c[`reel_url_${i}`], 
                creator: c 
              });
            }
          }
        });

        // Add YouTube Shorts from the new table
        (ytShorts || []).forEach(s => {
          if (s.embed_url) {
            allCards.push({
              type: 'youtube_short',
              embedUrl: s.embed_url,
              videoId: s.video_id,
              title: s.title,
              thumbnail: s.thumbnail,
              creator: s.creators
            });
          }
        });

        // Fisher-Yates shuffle — randomize order
        for (let i = allCards.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [allCards[i], allCards[j]] = [allCards[j], allCards[i]];
        }

        setCards(allCards);
      } catch (err: any) {
        if (err?.message?.includes('API key') || err?.code === 'PGRST301') {
          console.info('ReelsFeed empty state: Waiting for valid Supabase credentials.');
        } else {
          console.warn("Detailed Error in ReelsFeedViewer:", err);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchReels();
  }, []);

  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    const visibilityTimeouts: Record<number, NodeJS.Timeout> = {};

    cards.forEach((card, idx) => {
      const cardEl = cardRefs.current[idx];
      if (!cardEl) return;

      const obs = new IntersectionObserver(([entry]) => {
        const ratio = entry.intersectionRatio;
        
        clearTimeout(visibilityTimeouts[idx]);
        visibilityTimeouts[idx] = setTimeout(() => {
          console.log(`VISIBILITY idx ${idx} ratio: ${ratio.toFixed(2)}`);
          
          if (ratio >= 0.8) {
            console.log(`PLAY idx ${idx}`);
            if (!audioEnabledRef.current) console.log('AUDIO_BLOCKED');
            
            // Videos (Cloudinary)
            if (card.type === 'video') {
              const video = videoRefs.current[idx];
              if (video) {
                video.muted = !audioEnabledRef.current;
                video.play().catch(() => {});
              }
            }
            // Iframes handled by YouTubeIframeWidget internally based on isActive
          } else if (ratio < 0.3) {
            console.log(`PAUSE idx ${idx}`);
            // Videos (Cloudinary)
            if (card.type === 'video') {
              const video = videoRefs.current[idx];
              if (video) video.pause();
            }
            // Iframes handled by YouTubeIframeWidget internally
          }
        }, 300);
      }, { threshold: [0.25, 0.3, 0.75, 0.8, 0.85] });

      obs.observe(cardEl);
      observers.push(obs);
    });

    return () => {
      observers.forEach(o => o.disconnect());
      Object.values(visibilityTimeouts).forEach(clearTimeout);
    };
  }, [cards]);

  useEffect(() => {
    // Unmute immediately when user toggles
    if (audioEnabled) {
      const video = videoRefs.current[currentIndex];
      if (video) {
        video.muted = false;
        video.play().catch(() => {});
      }
      
      // Iframes handle unmute via YouTube API within the widget if needed
    }
  }, [audioEnabled, currentIndex]);

  return (
    <div onScroll={handleScroll} className="fixed inset-0 z-50 bg-black overflow-y-scroll hide-scrollbar snap-y snap-mandatory" style={{ scrollSnapType: 'y mandatory' }}>
      <link rel="preconnect" href="https://www.youtube.com" />
      <link rel="preconnect" href="https://i.ytimg.com" />
      
      <div className="fixed top-0 left-0 right-0 z-50 p-4 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between pointer-events-none">
        <h2 className="text-xl font-bold text-white shadow-black drop-shadow-md">Feed</h2>
        <button onClick={onClose} className="p-2 rounded-full bg-black/40 text-white hover:bg-black/60 transition shadow-sm backdrop-blur-md pointer-events-auto">
          <X className="w-6 h-6" />
        </button>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center h-screen w-full">
          <Loader2 className="w-10 h-10 text-white animate-spin mb-4" />
          <p className="text-neutral-400">Loading feed...</p>
        </div>
      ) : (!isLoading && cards.length === 0) ? (
        <div className="flex flex-col items-center justify-center h-screen w-full">
          <p className="text-5xl mb-4">🎬</p>
          <p className="text-neutral-400 text-lg">No content yet</p>
          <p className="text-neutral-600 text-sm mt-2">
            Creators will upload reels soon!
          </p>
          <button onClick={onClose}
            className="mt-6 px-6 py-3 bg-cyan-500/20 text-cyan-400 rounded-2xl text-sm font-bold">
            Back to Home
          </button>
        </div>
      ) : (
        cards.map((card, idx) => (
          <div 
            key={`item-${card.type}-${card.creator?.id || card.creator?.ig_handle}-${idx}`} 
            ref={el => cardRefs.current[idx] = el}
            className="w-full h-screen flex-shrink-0 relative snap-start snap-always bg-black" 
            style={{ scrollSnapAlign: 'start', height: '100vh' }}
          >
            
            {/* BEHOLD card */}
            {card.type === 'behold' && (
              <div className="w-full h-full flex items-center justify-center pointer-events-none">
                <behold-widget feed-id={card.creator.behold_feed_id} />
              </div>
            )}

            {/* YOUTUBE card */}
            {card.type === 'youtube' && (
              <div className="absolute inset-0 w-full h-full bg-neutral-900 flex items-center justify-center">
                 <YouTubeIframeWidget
                   channelUrl={getYTHandle(card.creator.yt_url)}
                   idx={idx}
                   isActive={idx === currentIndex}
                   isMounted={mountedIndices.has(idx)}
                 />
              </div>
            )}

            {/* NEW YOUTUBE SHORTS card form the table */}
            {card.type === 'youtube_short' && (
              <div className="absolute inset-0 w-full h-full bg-neutral-900 flex items-center justify-center">
                 <YouTubeIframeWidget
                   videoId={card.videoId}
                   thumbnail={card.thumbnail}
                   idx={idx}
                   isActive={idx === currentIndex}
                   isMounted={mountedIndices.has(idx)}
                 />
              </div>
            )}

            {/* CLOUDINARY VIDEO card */}
            {card.type === 'video' && (
              <video
                ref={el => videoRefs.current[idx] = el}
                src={card.url}
                className="absolute inset-0 w-full h-full object-cover"
                loop
                muted
                playsInline
                onTimeUpdate={(e) => {
                  const target = e.target as HTMLVideoElement;
                  if (target.duration) {
                    const pct = target.currentTime / target.duration;
                    if (pct >= 0.2 && pct < 0.25) {
                      if (!(window as any)[`preloadTriggered_cloud_${idx}`]) {
                        (window as any)[`preloadTriggered_cloud_${idx}`] = true;
                        console.log('PRELOAD_TRIGGER_20');
                        const customEvt = new CustomEvent('yt-preload-next', { detail: { idx } });
                        window.dispatchEvent(customEvt);
                      }
                    }
                  }
                }}
              />
            )}

            {/* Sound Enable button if blocked */}
            {!audioEnabled && idx === currentIndex && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setAudioEnabled(true);
                }}
                className="absolute top-20 right-4 flex items-center justify-center gap-2 px-4 py-2 bg-black/60 hover:bg-black/80 rounded-full transition backdrop-blur-md z-50 text-white font-bold pointer-events-auto border border-white/10"
              >
                <Volume2 className="w-5 h-5" /> Enable sound
              </button>
            )}

            {/* Hire / Collab Button */}
            <button
              onClick={() => {
                setSelectedCreator(card.creator);
                setSmartPitchOpen(true);
              }}
              className="absolute bottom-20 right-4 z-30 bg-gradient-to-r from-cyan-500 to-orange-500 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg pointer-events-auto hover:opacity-90 transition-opacity"
            >
              🤝 Hire / Collab
            </button>

            {/* Overlay for creator info */}
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none z-10">
              <div className="flex items-end justify-between">
                <div>
                  <button 
                    onClick={() => onCreatorClick && onCreatorClick(card.creator)}
                    className="flex items-center gap-3 pointer-events-auto group text-left"
                  >
                    <img 
                      src={card.creator.profile_url || '/placeholder.png'} 
                      className="w-12 h-12 rounded-full object-cover border-2 border-white/20 group-hover:border-white transition-colors shadow-lg"
                      alt={card.creator.ig_handle}
                    />
                    <div>
                      <span className="font-bold text-white text-lg drop-shadow-md group-hover:underline">
                        @{card.creator.ig_handle}
                      </span>
                      <p className="text-white/80 text-sm font-medium drop-shadow-md">
                        {card.type === 'behold' ? '📸 Instagram Reel' : 
                         (card.type === 'youtube' || card.type === 'youtube_short') ? 'YouTube Shorts' : 
                         '🎬 Featured Reel'}
                      </p>
                    </div>
                  </button>
                </div>
                
                <div className="flex flex-col items-center gap-6 pb-2 pointer-events-auto">
                  <button className="flex flex-col items-center gap-1 group">
                    <div className="p-3 bg-black/40 rounded-full group-hover:bg-black/60 transition backdrop-blur-md">
                      <Heart className="w-7 h-7 text-white group-hover:text-red-500 group-hover:scale-110 transition" fill="transparent" strokeWidth={1.5} />
                    </div>
                  </button>
                  <button className="flex flex-col items-center gap-1 group">
                    <div className="p-3 bg-black/40 rounded-full group-hover:bg-black/60 transition backdrop-blur-md">
                      <MessageCircle className="w-7 h-7 text-white group-hover:scale-110 transition" strokeWidth={1.5} />
                    </div>
                  </button>
                  <a 
                    href={(card.type === 'youtube' || card.type === 'youtube_short') ? card.creator.yt_url : card.creator.ig_url}
                    target="_blank"
                    className="p-3 bg-black/40 rounded-full hover:bg-black/60 transition backdrop-blur-md group"
                  >
                    <ExternalLink className="w-7 h-7 text-white group-hover:scale-110 transition" strokeWidth={1.5} />
                  </a>
                </div>
              </div>
            </div>
          </div>
        ))
      )}

      {smartPitchOpen && selectedCreator && (
        <SmartPitchModal
          targetUser={selectedCreator}
          collabType="brand_to_creator"
          currentUser={currentUser}
          onClose={() => setSmartPitchOpen(false)}
          onDealCreated={(dealId) => {
            setSmartPitchOpen(false);
            onClose(); // Optional: or we just close the pitch modal
          }}
        />
      )}

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes progress {
          from { width: 0% }
          to { width: 100% }
        }
      `}} />
    </div>
  );
}
