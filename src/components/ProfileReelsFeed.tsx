import { useState, useEffect } from 'react';
import ReelPlayer from './ReelPlayer';
import { Loader2 } from 'lucide-react';

interface ProfileReelsFeedProps {
  preference: 'BEHOLD' | 'CLOUDINARY';
  beholdFeedId: string | null;
  manualUrls: string[] | null;
}

export default function ProfileReelsFeed({ preference, beholdFeedId, manualUrls }: ProfileReelsFeedProps) {
  const [urls, setUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadReels() {
      setLoading(true);
      setError(null);
      
      try {
        if (preference === 'CLOUDINARY') {
          setUrls(manualUrls || []);
        } else if (preference === 'BEHOLD') {
          if (!beholdFeedId) {
            setUrls([]);
            return;
          }
          
          const res = await fetch(`https://feeds.behold.so/${beholdFeedId}`);
          if (!res.ok) throw new Error('Failed to fetch from Behold');
          const data = await res.json();
          
          // Behold returns array of Instagram media objects. 
          // We filter for VIDEO or CAROUSEL_ALBUM items that contain video.
          const videoUrls = data
            .filter((item: any) => item.mediaType === 'VIDEO' && item.mediaUrl)
            .map((item: any) => item.mediaUrl as string)
            .slice(0, 6); // Cap at 6 for consistency
          
          setUrls(videoUrls);
        }
      } catch (err) {
        console.warn('Error loading reels:', err);
        setError('Could not load reels');
      } finally {
        setLoading(false);
      }
    }

    loadReels();
  }, [preference, beholdFeedId, manualUrls]);

  if (loading) {
    return (
      <div className="w-full max-w-sm mx-auto aspect-[9/16] bg-neutral-100 dark:bg-neutral-900 rounded-3xl flex flex-col items-center justify-center border border-neutral-200 dark:border-neutral-800">
        <Loader2 className="w-8 h-8 text-cyan-500 animate-spin mb-4" />
        <p className="text-sm font-medium text-neutral-500">Loading reels...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-sm mx-auto aspect-[9/16] bg-neutral-100 dark:bg-neutral-900 rounded-3xl flex items-center justify-center border border-neutral-200 dark:border-neutral-800">
        <p className="text-sm font-medium text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="w-full flex justify-center pb-8">
      <ReelPlayer urls={urls} />
    </div>
  );
}
