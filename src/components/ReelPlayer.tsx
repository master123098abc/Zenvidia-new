import { useRef, useEffect, useState } from 'react';
import { Volume2, VolumeX, Play } from 'lucide-react';
import { motion } from 'motion/react';

interface ReelPlayerProps {
  urls: string[];
}

export default function ReelPlayer({ urls }: ReelPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [muted, setMuted] = useState(true);
  
  useEffect(() => {
    console.log('ReelPlayer mounted. URLs:', urls);
  }, [urls]);

  if (!urls || urls.length === 0) {
    return (
      <div className="w-full max-w-sm mx-auto aspect-[9/16] bg-neutral-100 dark:bg-neutral-900 rounded-3xl flex items-center justify-center border border-neutral-200 dark:border-neutral-800">
        <p className="text-neutral-500 font-medium">No reels available</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm mx-auto h-[600px] bg-black rounded-3xl overflow-hidden relative shadow-xl border border-neutral-800">
      <div 
        ref={containerRef}
        className="w-full h-full overflow-y-scroll snap-y snap-mandatory hide-scrollbar"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {urls.map((url, i) => (
          <ReelItem key={`${url || ''}-${i}`} url={url} isMuted={muted} onToggleMute={() => setMuted(!muted)} />
        ))}
      </div>
      
      {/* Global Mute Toggle */}
      <button 
        onClick={() => setMuted(!muted)}
        className="absolute top-4 right-4 z-20 p-3 bg-black/40 backdrop-blur-md rounded-full text-white hover:bg-black/60 transition-colors"
      >
        {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
      </button>
    </div>
  );
}

function ReelItem({ url, isMuted, onToggleMute }: { key?: string | number, url: string, isMuted: boolean, onToggleMute: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          videoRef.current?.play().catch(() => setIsPlaying(false));
          setIsPlaying(true);
        } else {
          videoRef.current?.pause();
          if (videoRef.current) videoRef.current.currentTime = 0;
          setIsPlaying(false);
        }
      },
      { threshold: 0.6 }
    );

    const currentRef = containerRef.current;
    if (currentRef) observer.observe(currentRef);
    
    return () => {
      if (currentRef) observer.unobserve(currentRef);
      observer.disconnect();
    };
  }, []);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch(console.error);
      setIsPlaying(true);
    }
  };

  return (
    <div ref={containerRef} className="w-full h-full snap-start relative bg-black flex items-center justify-center">
      <video
        ref={videoRef}
        src={url}
        muted={isMuted}
        loop
        playsInline
        className="w-full h-full object-cover"
        onClick={togglePlay}
      />
      
      {!isPlaying && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute inset-0 pointer-events-none flex items-center justify-center bg-black/20"
        >
          <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center">
            <Play className="w-8 h-8 text-white ml-1" />
          </div>
        </motion.div>
      )}
    </div>
  );
}
