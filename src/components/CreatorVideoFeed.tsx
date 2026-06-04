import React, { useEffect, useState } from 'react';
import { Instagram, Youtube, Loader2, ArrowDownToLine, PlaySquare } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { fetchAndSaveYouTubeShorts } from '../lib/youtube';
import { SafeBeholdWidget } from './SafeBeholdWidget';

interface CreatorVideoFeedProps {
  creatorId?: string;
  behold_feed_id?: string;
  yt_url?: string;
  isOwner?: boolean;
}

let _shortsCache: Record<string, any[]> = {};

export default function CreatorVideoFeed({ creatorId, behold_feed_id, yt_url, isOwner }: CreatorVideoFeedProps) {
  const [activeTab, setActiveTab] = useState<'instagram' | 'youtube'>(
    behold_feed_id ? 'instagram' : 'youtube'
  );
  
  const [beholdHidden, setBeholdHidden] = useState(false);

  const [shorts, setShorts] = useState<any[]>(_shortsCache[creatorId || ''] || []);
  const [isImporting, setIsImporting] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [importStatus, setImportStatus] = useState<'Importing...' | 'Success!' | 'No Shorts Found' | 'Retry' | ''>('');

  useEffect(() => {
    if (!behold_feed_id) return;
    if (typeof document === 'undefined') return;
    if (document.querySelector('script[src*="behold"]')) return;
    const s = document.createElement('script');
    s.src = 'https://w.behold.so/widget.js';
    s.type = 'module';
    document.head.appendChild(s);
  }, [behold_feed_id]);

  const loadShorts = async (force = false) => {
    if (!creatorId) return;
    if (!force && _shortsCache[creatorId]) {
      setShorts(_shortsCache[creatorId]);
      return;
    }
    
    console.log(`SHORTS FETCH: fetching for ${creatorId}`);
    const { data, error } = await supabase
      .from('youtube_shorts')
      .select('*')
      .eq('creator_id', creatorId)
      .order('views', { ascending: false });
    
    if (error) {
      console.error('ERROR SHORTS: Error fetching shorts:', error);
      return;
    }
    
    if (data) {
      _shortsCache[creatorId] = data;
      setShorts(data);
    }
  };

  useEffect(() => {
    loadShorts();
  }, [creatorId, activeTab]);

  const handleImport = async () => {
    if (!importUrl || !creatorId) return;
    setIsImporting(true);
    setImportStatus('Importing...');
    try {
      console.log('Channel detected');
      await fetchAndSaveYouTubeShorts(creatorId, importUrl);
      
      // Save original URL to creators table
      console.log('SAVE INFO: updating creators with yt_url');
      await supabase.from('creators').update({ yt_url: importUrl }).eq('user_id', creatorId);
      
      setImportStatus('Success!');
      await loadShorts(true);
    } catch (e: any) {
      console.error('ERROR SHORTS: import error:', e);
      if (e.message.includes('No shorts found')) {
        setImportStatus('No Shorts Found');
      } else {
        setImportStatus('Retry');
      }
    } finally {
      setIsImporting(false);
      setTimeout(() => {
        setImportStatus(prev => prev === 'Retry' ? 'Retry' : '');
      }, 3000);
    }
  };

  if ((!behold_feed_id || beholdHidden) && !yt_url && !isOwner && shorts.length === 0) {
    return (
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-8 max-w-2xl w-full mx-auto text-center shadow-sm">
        <h3 className="text-xl font-bold mb-2">No portfolio yet</h3>
      </div>
    );
  }

  const getYoutubeEmbedUrl = (url: string) => {
    try {
      const urlObj = new URL(url);
      if (urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be')) {
        let videoId = '';
        if (urlObj.hostname.includes('youtu.be')) {
          videoId = urlObj.pathname.slice(1);
        } else {
          videoId = urlObj.searchParams.get('v') || '';
        }
        if (videoId) {
          return `https://www.youtube.com/embed/${videoId}`;
        }
      }
      return null;
    } catch {
      return null;
    }
  };

  const ytEmbedUrl = yt_url ? getYoutubeEmbedUrl(yt_url) : null;
  const showYoutubeTab = yt_url || isOwner || shorts.length > 0;
  const showInstagramTab = behold_feed_id && !beholdHidden;

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl overflow-hidden max-w-2xl w-full mx-auto shadow-sm">
      {(showInstagramTab && showYoutubeTab) && (
        <div className="flex border-b border-neutral-200 dark:border-neutral-800">
          <button
            onClick={() => setActiveTab('instagram')}
            className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${
              activeTab === 'instagram'
                ? 'text-pink-500 border-b-2 border-pink-500 bg-pink-50/50 dark:bg-pink-900/10'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
            }`}
          >
            <Instagram className="w-4 h-4" /> Instagram Reels
          </button>
          <button
            onClick={() => setActiveTab('youtube')}
            className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${
              activeTab === 'youtube'
                ? 'text-red-500 border-b-2 border-red-500 bg-red-50/50 dark:bg-red-900/10'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
            }`}
          >
            <Youtube className="w-4 h-4" /> YouTube Video
          </button>
        </div>
      )}

      <div className="p-4 md:p-6 bg-neutral-950">
        {(activeTab === 'instagram' || (!showYoutubeTab && showInstagramTab)) && showInstagramTab && (
          <div className="w-full rounded-2xl overflow-hidden bg-black border border-neutral-800 flex justify-center">
            <SafeBeholdWidget feedId={behold_feed_id} onFail={() => {
              setBeholdHidden(true);
              setActiveTab('youtube');
            }} />
          </div>
        )}

        {(activeTab === 'youtube' || !showInstagramTab) && showYoutubeTab && (
          <div className="flex flex-col gap-6">
            {isOwner && (
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 md:p-6">
                <h4 className="text-white font-bold mb-4 flex items-center gap-2">
                  <PlaySquare className="w-5 h-5 text-red-500" />
                  Import Top YouTube Shorts
                </h4>
                <div className="flex flex-col md:flex-row gap-3">
                  <input
                    type="url"
                    placeholder="Paste YouTube Channel URL (e.g. youtube.com/@handle)"
                    value={importUrl}
                    onChange={e => setImportUrl(e.target.value)}
                    className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-red-500 font-mono text-sm"
                  />
                  <button
                    onClick={handleImport}
                    disabled={isImporting || !importUrl}
                    className="whitespace-nowrap px-6 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
                  >
                    {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowDownToLine className="w-4 h-4" />}
                    {importStatus || 'Import Top 10 Shorts'}
                  </button>
                </div>
              </div>
            )}

            {shorts.length > 0 ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {shorts.map((short, i) => {
                    console.log('Embed rendered');
                    return (
                      <div key={`${short.video_id || ''}-${i}`} className="aspect-[9/16] rounded-2xl overflow-hidden bg-black border border-neutral-800 relative group cursor-pointer" onClick={() => {
                        const el = document.getElementById(`yt-iframe-${short.video_id}`);
                        if (el) {
                          el.className = "w-full h-full object-cover z-10 relative";
                          el.setAttribute('src', `${short.embed_url}?autoplay=1&playsinline=1`);
                          const btn = document.getElementById(`yt-play-btn-${short.video_id}`);
                          if (btn) btn.style.display = 'none';
                        }
                      }}>
                        <img 
                          src={short.thumbnail || `https://i.ytimg.com/vi/${short.video_id}/hqdefault.jpg`} 
                          className="absolute inset-0 w-full h-full object-cover z-0 opacity-80 group-hover:opacity-100 transition-opacity"
                        />
                        <div id={`yt-play-btn-${short.video_id}`} className="absolute inset-0 flex items-center justify-center z-0">
                           <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                             <PlaySquare className="w-6 h-6 text-white ml-1" />
                           </div>
                        </div>
                        <iframe
                          id={`yt-iframe-${short.video_id}`}
                          title={short.title}
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          className="hidden"
                        />
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 pointer-events-none z-20">
                          <p className="text-white text-xs font-bold line-clamp-2">{short.title}</p>
                          <p className="text-neutral-300 text-[10px] mt-1">{short.views.toLocaleString()} views</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {yt_url && (
                  <div className="mt-6 flex justify-center">
                    <button
                      onClick={() => window.open(yt_url, '_blank')}
                      className="px-6 py-3 bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-white font-bold rounded-xl flex items-center gap-2 transition-colors"
                    >
                      <Youtube className="w-5 h-5 text-red-500" /> Visit YouTube Channel
                    </button>
                  </div>
                )}
              </>
            ) : (
              yt_url && (
                <div className="w-full rounded-2xl border border-neutral-800 bg-neutral-900 p-8 flex flex-col items-center justify-center text-center">
                  <Youtube className="w-12 h-12 text-red-500 mb-4" />
                  <h3 className="text-xl font-bold text-white mb-2">Check out YouTube content</h3>
                  <button
                    onClick={() => window.open(yt_url, '_blank')}
                    className="mt-4 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl flex items-center gap-2 transition-colors"
                  >
                    Open in YouTube
                  </button>
                </div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}
