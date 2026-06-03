import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Instagram, Youtube, CheckCircle2, Loader2 } from 'lucide-react';

interface CreatorSocialLinksProps {
  creatorId?: number;
  igUrl?: string;
  ytUrl?: string;
}

export default function CreatorSocialLinks({ creatorId, igUrl = '', ytUrl = '' }: CreatorSocialLinksProps) {
  const [localIg, setLocalIg] = useState(igUrl);
  const [localYt, setLocalYt] = useState(ytUrl);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  if (!creatorId) return null;

  const handleSave = async () => {
    setIsSaving(true);
    setIsSaved(false);
    try {
      const { error } = await supabase
        .from('creators')
        .update({ ig_url: localIg, yt_url: localYt })
        .eq('id', creatorId);

      if (error) throw error;
      
      const sessionData = localStorage.getItem('zenova_creator');
      if (sessionData) {
        const parsed = JSON.parse(sessionData);
        parsed.ig_url = localIg;
        parsed.yt_url = localYt;
        localStorage.setItem('zenova_creator', JSON.stringify(parsed));
      }

      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (err) {
      console.error('Failed to save links:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 md:p-8 max-w-2xl w-full mx-auto shadow-sm">
      <h2 className="text-xl font-bold mb-6 font-display flex items-center gap-3">
        Social Links
      </h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">
            Instagram URL
          </label>
          <div className="relative">
            <Instagram className="absolute left-4 top-1/2 -translate-y-1/2 text-pink-500 w-5 h-5" />
            <input 
              type="url"
              value={localIg || ''}
              onChange={(e) => setLocalIg(e.target.value)}
              placeholder="https://instagram.com/yourhandle"
              className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-all font-mono text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">
            YouTube URL
          </label>
          <div className="relative">
            <Youtube className="absolute left-4 top-1/2 -translate-y-1/2 text-red-500 w-5 h-5" />
            <input 
              type="url"
              value={localYt || ''}
              onChange={(e) => setLocalYt(e.target.value)}
              placeholder="https://youtube.com/@yourchannel"
              className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all font-mono text-sm"
            />
          </div>
        </div>

        <div className="pt-4 flex items-center justify-between">
          <span className="text-sm font-medium">
             {isSaved && (
               <span className="text-emerald-500 flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> Links saved successfully</span>
             )}
          </span>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 px-6 py-3 rounded-xl font-bold hover:opacity-90 disabled:opacity-50 transition-all active:scale-95 flex items-center gap-2 whitespace-nowrap"
          >
            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Links'}
          </button>
        </div>
      </div>
    </div>
  );
}
