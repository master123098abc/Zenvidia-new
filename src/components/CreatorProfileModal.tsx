import { motion, AnimatePresence } from 'motion/react';
import { X, MapPin, ShieldCheck, Instagram } from 'lucide-react';

interface CreatorProfileModalProps {
  creator: any;
  onClose: () => void;
  onOffer: () => void;
  collabType: 'hire_creator' | 'brand_collab' | 'creator_collab';
}

export default function CreatorProfileModal({ creator, onClose, onOffer, collabType }: CreatorProfileModalProps) {
  
  const handleInstagramClick = () => {
    const url = creator?.ig_url || 
      (creator?.ig_handle 
        ? `https://instagram.com/${creator.ig_handle}` 
        : null);
    if (url) window.open(url, '_blank');
  };

  const handleYouTubeClick = () => {
    if (creator?.yt_url) window.open(creator.yt_url, '_blank');
  };

  const isBrand = collabType === 'brand_collab';
  const displayName = isBrand ? creator.business_name : `@${creator.ig_handle}`;
  const displayNiche = isBrand ? creator.business_type : creator.primary_niche;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />
        
        <motion.div 
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="relative w-full md:max-w-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl rounded-t-3xl md:rounded-3xl overflow-hidden flex flex-col md:max-h-[85vh]"
          style={{ maxHeight: '90vh' }}
        >
          {/* Header Image Area */}
          <div className="relative h-48 bg-gradient-to-r from-cyan-500/20 to-orange-500/20">
            <button 
              onClick={onClose} 
              className="absolute top-4 right-4 p-2 rounded-full bg-black/40 backdrop-blur-md text-white hover:bg-black/60 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Profile Info */}
          <div className="px-6 pb-6 relative flex flex-col flex-grow overflow-y-auto hide-scrollbar">
            <div className="flex justify-between items-start -mt-16 mb-4">
              <div className="w-32 h-32 rounded-full border-4 border-white dark:border-neutral-900 bg-neutral-200 dark:bg-neutral-800 overflow-hidden shadow-lg">
                {creator?.profile_url ? (
                  <img src={creator.profile_url} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl font-black text-neutral-400 font-display">
                    {displayName?.[0]?.toUpperCase()}
                  </div>
                )}
              </div>
              
              {!isBrand && creator?.follower_count != null && (
                 <div className="mt-20 bg-neutral-100 dark:bg-neutral-800 px-4 py-2 rounded-full text-sm font-bold shadow-sm">
                   {creator.follower_count.toLocaleString()} Followers
                 </div>
              )}
            </div>

            <div className="mb-6">
              <h2 className="text-3xl font-bold font-display tracking-tight mb-1">{displayName}</h2>
              <div className="flex flex-wrap gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                <span className="flex items-center gap-1 font-medium bg-neutral-100 dark:bg-neutral-800 px-3 py-1 rounded-full">
                  {displayNiche}
                </span>
                {!isBrand && creator?.secondary_niche && (
                  <span className="flex items-center gap-1 font-medium bg-neutral-100 dark:bg-neutral-800 px-3 py-1 rounded-full">
                    {creator.secondary_niche}
                  </span>
                )}
                {isBrand && creator?.city && (
                  <span className="flex items-center gap-1 font-medium bg-neutral-100 dark:bg-neutral-800 px-3 py-1 rounded-full">
                    <MapPin className="w-4 h-4" /> {creator.city}
                  </span>
                )}
              </div>
            </div>

            {!isBrand && (creator?.primary_language || creator?.secondary_language) && (
              <div className="mb-6">
                <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-wider mb-2">Languages</h3>
                <div className="flex gap-2">
                  {creator.primary_language && (
                     <span className="px-3 py-1 bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400 rounded-lg text-sm font-medium">
                       {creator.primary_language}
                     </span>
                  )}
                  {creator.secondary_language && (
                     <span className="px-3 py-1 bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-300 rounded-lg text-sm font-medium">
                       {creator.secondary_language}
                     </span>
                  )}
                </div>
              </div>
            )}
            
            <div className="mb-8">
               <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-wider mb-2">About</h3>
               <p className="text-neutral-700 dark:text-neutral-300">
                 {isBrand 
                   ? `Partner with ${creator.business_name} for exciting brand collaborations. We are looking for creators in the ${creator.business_type} space.` 
                   : `Ready to create amazing content for your brand. Specialized in ${creator.primary_niche} with a highly engaged audience.`}
               </p>
            </div>

            <div className="mt-auto space-y-3 pb-8">
              <button 
                onClick={() => {
                  onClose();
                  onOffer();
                }}
                className="w-full shimmer-btn py-4 rounded-xl font-bold bg-gradient-to-r from-cyan-500 to-orange-500 text-white shadow-lg hover:shadow-cyan-500/25 transition-all text-center flex items-center justify-center gap-2"
              >
                {isBrand ? 'Partner Up' : 'Send Offer'}
              </button>
              
              {!isBrand && (
                <div className="flex gap-2 w-full">
                  {/* Instagram button */}
                  <button
                    onClick={handleInstagramClick}
                    disabled={!creator?.ig_url && !creator?.ig_handle}
                    className={`flex-1 flex justify-center items-center gap-2 px-4 py-3 rounded-xl 
                                text-sm font-medium transition-all
                                ${creator?.ig_url || creator?.ig_handle
                                  ? 'bg-pink-500/20 text-pink-400 border border-pink-500/40 hover:bg-pink-500/30'
                                  : 'opacity-30 cursor-not-allowed bg-neutral-800 text-neutral-500'}`}
                  >
                    <Instagram className="w-4 h-4" />
                    Instagram
                  </button>

                  {/* YouTube button */}
                  <button
                    onClick={handleYouTubeClick}
                    disabled={!creator?.yt_url}
                    className={`flex-1 flex justify-center items-center gap-2 px-4 py-3 rounded-xl 
                                text-sm font-medium transition-all
                                ${creator?.yt_url
                                  ? 'bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30'
                                  : 'opacity-30 cursor-not-allowed bg-neutral-800 text-neutral-500'}`}
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                    </svg>
                    YouTube
                  </button>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
