import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Instagram, Link as LinkIcon, Trash2, Loader2, CheckCircle2, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { SafeBeholdWidget } from './SafeBeholdWidget';

const CreatorReelsFeed = ({ feedId }: { feedId: string }) => {
  return (
    <SafeBeholdWidget feedId={feedId} />
  );
};

interface CreatorReelsManagerProps {
  creatorId: string;
  initialBeholdId: string | null;
}

export default function CreatorReelsManager({
  creatorId,
  initialBeholdId,
}: CreatorReelsManagerProps) {
  const [beholdId, setBeholdId] = useState(initialBeholdId || '');
  const [savedBeholdId, setSavedBeholdId] = useState(initialBeholdId || '');
  
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSave = async () => {
    if (!beholdId.trim()) return;
    setIsSaving(true);
    setSaveStatus('idle');
    try {
      const { error } = await supabase
        .from('creators')
        .update({
          behold_feed_id: beholdId.trim(),
        })
        .eq('id', creatorId);

      if (error) throw error;
      setSavedBeholdId(beholdId.trim());
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err) {
      console.error('Error saving reel preferences:', err);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('creators')
        .update({
          behold_feed_id: null,
        })
        .eq('id', creatorId);

      if (error) throw error;
      setBeholdId('');
      setSavedBeholdId('');
    } catch (err) {
      console.error('Error removing feed:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 md:p-8 max-w-2xl w-full mx-auto shadow-sm">
      <h2 className="text-2xl font-bold mb-6 font-display flex items-center gap-3">
        Instagram Reels
      </h2>
      
      {savedBeholdId ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-900/30 rounded-2xl">
            <div className="flex items-center gap-3 text-green-700 dark:text-green-500 font-bold">
              <CheckCircle2 className="w-5 h-5" />
              Instagram Connected
            </div>
            <button 
              onClick={handleRemove}
              disabled={isSaving}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-bold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/20 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/40 transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              Remove
            </button>
          </div>
          
          <div className="w-full rounded-2xl overflow-hidden bg-black border border-neutral-200 dark:border-neutral-800">
             <CreatorReelsFeed feedId={savedBeholdId} />
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-pink-50 to-purple-50 dark:from-pink-900/10 dark:to-purple-900/10 border border-pink-100 dark:border-pink-900/20 rounded-2xl p-6">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-neutral-900 dark:text-white">
              <Instagram className="w-5 h-5 text-pink-500" />
              Connect Your Instagram Reels
            </h3>
            
            <ol className="space-y-3 text-sm text-neutral-600 dark:text-neutral-300 font-medium counter-reset-list ml-2">
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-white dark:bg-neutral-800 flex items-center justify-center shrink-0 shadow-sm text-neutral-900 dark:text-white font-bold border border-neutral-200 dark:border-neutral-700">1</span>
                <span>Visit <a href="https://behold.so" target="_blank" rel="noopener noreferrer" className="text-cyan-600 dark:text-cyan-400 font-bold hover:underline">behold.so</a> and sign up for a free account.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-white dark:bg-neutral-800 flex items-center justify-center shrink-0 shadow-sm text-neutral-900 dark:text-white font-bold border border-neutral-200 dark:border-neutral-700">2</span>
                <span>Click "Add Instagram Account", log in to Instagram, and authorize Behold.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-white dark:bg-neutral-800 flex items-center justify-center shrink-0 shadow-sm text-neutral-900 dark:text-white font-bold border border-neutral-200 dark:border-neutral-700">3</span>
                <span>Create a new feed widget and copy its unique <strong className="text-neutral-900 dark:text-white">Feed ID</strong>.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-white dark:bg-neutral-800 flex items-center justify-center shrink-0 shadow-sm text-neutral-900 dark:text-white font-bold border border-neutral-200 dark:border-neutral-700">4</span>
                <span>Paste the Feed ID below to display your recent reels on Zenvidia.</span>
              </li>
            </ol>
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300">
              Behold.so Feed ID
            </label>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 w-5 h-5" />
                <input 
                  type="text" 
                  value={beholdId}
                  onChange={(e) => setBeholdId(e.target.value)}
                  placeholder="e.g. ABC123XYZ"
                  className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-mono"
                />
              </div>
              <button 
                onClick={handleSave}
                disabled={isSaving || !beholdId.trim()}
                className="bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 px-6 py-3 rounded-xl font-bold hover:opacity-90 disabled:opacity-50 transition-all active:scale-95 flex items-center gap-2 whitespace-nowrap"
              >
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Connect'}
              </button>
            </div>
            {saveStatus === 'error' && (
              <p className="text-sm text-red-500 font-medium">Failed to save Feed ID. Please try again.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

