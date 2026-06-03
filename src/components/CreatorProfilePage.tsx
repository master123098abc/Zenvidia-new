import React, { useState, useEffect } from 'react';
import SmartPitchModal from './SmartPitchModal';
import { supabase } from '../lib/supabase';

interface CreatorProfilePageProps {
  creator: any;
  onClose: () => void;
  currentUser: any;
}

export default function CreatorProfilePage({ creator, onClose, currentUser }: CreatorProfilePageProps) {
  const [smartPitchOpen, setSmartPitchOpen] = useState(false);
  const [pitchTarget, setPitchTarget] = useState<any>(null);
  const [showIntro, setShowIntro] = useState(true);
  const [ytShorts, setYtShorts] = useState<any[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowIntro(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!creator?.id) return;
    const fetchYT = async () => {
      const { data } = await supabase
        .from('youtube_shorts')
        .select('embed_url, video_id, thumbnail, title')
        .eq('creator_id', creator.id);
      setYtShorts(data || []);
    };
    fetchYT();
  }, [creator?.id]);

  const onSendOffer = (c: any) => {
    setPitchTarget(c);
    setSmartPitchOpen(true);
  };

  if (showIntro) {
    return (
      <div className="fixed inset-0 bg-black z-50 
                      flex flex-col items-center 
                      justify-center gap-4">
        <img 
          src={creator.profile_url}
          className="w-32 h-32 rounded-full object-cover 
                     border-4 border-cyan-500 shadow-2xl"
          alt={creator.ig_handle}
        />
        <h2 className="text-white text-2xl font-black">
          @{creator.ig_handle}
        </h2>
        <p className="text-neutral-400">
          {Number(creator.follower_count || 0)
            .toLocaleString()} followers
        </p>
        {/* Progress bar */}
        <div className="w-48 h-1 bg-neutral-800 
                        rounded-full overflow-hidden mt-4">
          <div className="h-full bg-cyan-500 rounded-full"
               style={{
                 animation: 'progress 2.5s linear forwards'
               }} />
        </div>
        <style>{`
          @keyframes progress {
            from { width: 0% }
            to { width: 100% }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black overflow-y-auto">
      {/* Back button */}
      <button onClick={onClose}
        className="fixed top-4 left-4 z-50 px-4 py-2 
                   bg-black/50 backdrop-blur-md rounded-full text-white font-bold">
        ← Back
      </button>

      {/* Cover - blurred profile pic */}
      <div className="relative h-64 overflow-hidden">
        <img src={creator.profile_url || '/placeholder.png'} 
             className="w-full h-full object-cover blur-sm scale-110 opacity-60" 
             alt="Cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black" />
        
        {/* Profile pic centered */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2">
          <img src={creator.profile_url || '/placeholder.png'}
               className="w-24 h-24 rounded-full object-cover 
                          border-4 border-white shadow-2xl" 
               alt={creator.ig_handle} />
        </div>
      </div>

      {/* Info section */}
      <div className="mt-16 px-4 text-center">
        <h1 className="text-2xl font-black text-white">
          @{creator.ig_handle}
        </h1>
        <p className="text-neutral-400 mt-1 font-medium">
          {Number(creator.follower_count || 0).toLocaleString()} followers
        </p>
        <div className="flex justify-center flex-wrap gap-2 mt-3">
          {(creator.primary_niche || creator.niche) && (
            <span className="px-3 py-1 bg-cyan-500/20 text-cyan-400 
                             rounded-full text-xs font-bold">
              {creator.primary_niche || creator.niche}
            </span>
          )}
          {creator.city && (
            <span className="px-3 py-1 bg-neutral-800 text-neutral-400 
                             rounded-full text-xs font-bold">
              📍 {creator.city}
            </span>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="px-4 mt-8 flex flex-col gap-3">
        <button onClick={() => onSendOffer(creator)}
          className="w-full py-3.5 bg-gradient-to-r from-cyan-500 
                     to-orange-500 text-white font-bold rounded-2xl shadow-lg active:scale-95 transition-transform">
          Send Offer
        </button>
      </div>

      {/* Social links */}
      <div className="px-4 mt-3 flex gap-3">
        {creator.ig_url && (
          <a href={creator.ig_url} target="_blank" rel="noopener noreferrer"
             className="flex-1 py-3 bg-pink-500/20 text-pink-400 
                        border border-pink-500/40 rounded-xl 
                        text-center text-sm font-bold active:bg-pink-500/30 transition-colors">
            📸 Instagram
          </a>
        )}
        {creator.yt_url && (
          <a href={creator.yt_url} target="_blank" rel="noopener noreferrer"
             className="flex-1 py-3 bg-red-500/20 text-red-400 
                        border border-red-500/40 rounded-xl 
                        text-center text-sm font-bold active:bg-red-500/30 transition-colors">
            ▶️ YouTube
          </a>
        )}
      </div>

      {/* Videos section */}
      <div className="px-4 mt-10 pb-24 border-t border-neutral-900 pt-8">
        <h2 className="text-white font-bold text-xl mb-6">
          🎬 Content
        </h2>
        
        {/* Cloudinary reels grid */}
        {[1,2,3,4,5,6,7,8,9,10].some(i => creator[`reel_url_${i}`]) && (
          <div className="grid grid-cols-3 gap-1 mb-8">
            {[1,2,3,4,5,6,7,8,9,10].map(i => {
              const url = creator[`reel_url_${i}`];
              if (!url) return null;
              return (
                <video key={`reel-${i}`}
                  src={url}
                  className="w-full aspect-square object-cover rounded-lg bg-neutral-900"
                  onClick={e => {
                    const v = e.currentTarget;
                    if (v.paused) {
                      v.play();
                      if (document.fullscreenElement !== v) {
                        v.requestFullscreen?.().catch(() => {});
                      }
                    } else {
                      v.pause();
                    }
                  }}
                  muted
                  loop
                  playsInline
                />
              );
            })}
          </div>
        )}

        {/* YouTube Shorts grid */}
        {ytShorts.length > 0 && (
          <div className="mt-4 mb-8">
            <p className="text-neutral-400 text-sm mb-2">
              ▶️ YouTube Shorts
            </p>
            <div className="grid grid-cols-3 gap-1">
              {ytShorts.map((s, i) => (
                <div key={`${s.video_id || s.id || ''}-${i}`} 
                     className="aspect-square bg-neutral-900 
                                rounded-lg overflow-hidden relative
                                cursor-pointer"
                     onClick={() => window.open(
                       `https://youtube.com/shorts/${s.video_id}`,
                       '_blank'
                     )}>
                  {s.thumbnail ? (
                    <img src={s.thumbnail} 
                         className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center 
                                    justify-center">
                      <svg className="w-8 h-8 text-red-500" 
                           viewBox="0 0 24 24" fill="currentColor">
                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                      </svg>
                    </div>
                  )}
                  {/* Play overlay */}
                  <div className="absolute inset-0 flex items-center 
                                  justify-center bg-black/20">
                    <div className="w-8 h-8 bg-white/20 rounded-full 
                                    flex items-center justify-center">
                      ▶
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Behold widget */}
        {creator.behold_feed_id && (
          <div className="bg-neutral-950 rounded-2xl overflow-hidden mb-8 border border-neutral-900">
            <behold-widget feed-id={creator.behold_feed_id} />
          </div>
        )}

        {/* Empty state */}
        {!creator.behold_feed_id && ytShorts.length === 0 && 
         ![1,2,3,4,5,6,7,8,9,10].some(i => creator[`reel_url_${i}`]) && (
          <div className="text-center py-16 bg-neutral-900/30 rounded-3xl border border-neutral-800 border-dashed">
            <p className="text-5xl mb-4">🎬</p>
            <p className="text-neutral-500 font-medium">No content uploaded yet</p>
          </div>
        )}
      </div>

      {smartPitchOpen && pitchTarget && (
        <SmartPitchModal
          targetUser={pitchTarget}
          collabType="brand_to_creator"
          currentUser={currentUser}
          onClose={() => setSmartPitchOpen(false)}
          onDealCreated={() => {
            setSmartPitchOpen(false);
          }}
        />
      )}
    </div>
  );
}
