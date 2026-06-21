import { Instagram, Youtube, MapPin, Users, Settings } from 'lucide-react';

interface CreatorProfileHeaderProps {
  creator: any;
  onSettingsClick?: () => void;
}

export default function CreatorProfileHeader({ creator, onSettingsClick }: CreatorProfileHeaderProps) {
  if (!creator) return null;

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 md:p-8 max-w-2xl w-full mx-auto shadow-sm flex flex-col md:flex-row items-center gap-6 md:gap-8 relative">
      <div className="absolute top-4 right-4">
        {onSettingsClick && (
          <button 
            onClick={onSettingsClick}
            className="p-2 bg-neutral-100 dark:bg-neutral-800 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-700 transition-colors"
            title="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="w-24 h-24 md:w-32 md:h-32 shrink-0 rounded-full overflow-hidden border-2 border-neutral-100 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-800">
        {creator.profile_url ? (
          <img src={creator.profile_url} alt={creator.full_name || creator.ig_handle} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-neutral-400">
            {creator.full_name?.[0]?.toUpperCase() || creator.ig_handle?.[0]?.toUpperCase()}
          </div>
        )}
      </div>

      <div className="flex-1 space-y-4">
        <div>
          <h2 className="text-2xl font-black font-display text-neutral-900 dark:text-white mb-1">
            {creator.full_name || creator.ig_handle}
          </h2>
          <p className="text-neutral-500 font-medium">@{creator.ig_handle}</p>
        </div>

        <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
          <div className="flex items-center gap-1.5 bg-neutral-100 dark:bg-neutral-800 px-3 py-1.5 rounded-lg text-sm font-bold">
            <Users className="w-4 h-4 text-cyan-500" />
            {creator.follower_count?.toLocaleString() || 0}
          </div>
          <div className="bg-neutral-100 dark:bg-neutral-800 px-3 py-1.5 rounded-lg text-sm font-bold capitalize">
            {creator.primary_niche}
          </div>
          {creator.city && (
            <div className="flex items-center gap-1.5 bg-neutral-100 dark:bg-neutral-800 px-3 py-1.5 rounded-lg text-sm font-bold">
              <MapPin className="w-4 h-4 text-neutral-500" />
              {creator.city}
            </div>
          )}
        </div>

        <div className="flex items-center justify-center md:justify-start gap-3 pt-2">
          <button
            onClick={() => creator.ig_url && window.open(creator.ig_url, '_blank')}
            disabled={!creator.ig_url}
            className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
              creator.ig_url 
                ? 'bg-pink-50 dark:bg-pink-900/20 text-pink-500 hover:scale-105 active:scale-95 cursor-pointer' 
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 opacity-50 cursor-not-allowed'
            }`}
          >
            <Instagram className="w-6 h-6" />
          </button>
          
          <button
            onClick={() => creator.yt_url && window.open(creator.yt_url, '_blank')}
            disabled={!creator.yt_url}
            className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
              creator.yt_url 
                ? 'bg-red-50 dark:bg-red-900/20 text-red-500 hover:scale-105 active:scale-95 cursor-pointer' 
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 opacity-50 cursor-not-allowed'
            }`}
          >
            <Youtube className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
}
