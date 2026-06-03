import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { uploadToCloudinary } from '../lib/cloudinary';
import { Loader2, UploadCloud, CheckCircle, Video } from 'lucide-react';

export default function AdminDashboard() {
  const [creators, setCreators] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCreatorId, setSelectedCreatorId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);

  useEffect(() => {
    fetchCreators();
  }, []);

  const fetchCreators = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('creators')
        .select('id, ig_handle, reel_url_1, reel_url_2, reel_url_3, reel_url_4, reel_url_5, reel_url_6, reel_url_7, reel_url_8, reel_url_9, reel_url_10')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCreators(data || []);
    } catch (err: any) {
      console.error('Error fetching creators:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedCreatorId || !file) return;

    const creator = creators.find(c => c.id === selectedCreatorId);
    if (!creator) return;

    // Find first empty reel slot
    let emptySlot = '';
    for (let i = 1; i <= 10; i++) {
      if (!creator[`reel_url_${i}`]) {
        emptySlot = `reel_url_${i}`;
        break;
      }
    }

    if (!emptySlot) {
      setErrorStatus('This creator already has 10 reels. No empty slots available.');
      return;
    }

    setIsUploading(true);
    setUploadStatus(null);
    setErrorStatus(null);

    try {
      // 1. Upload to Cloudinary
      const secureUrl = await uploadToCloudinary(file, 'video');

      // 2. Update Supabase with the first empty slot
      const { error } = await supabase
        .from('creators')
        .update({ [emptySlot]: secureUrl })
        .eq('id', selectedCreatorId);

      if (error) throw error;

      setUploadStatus(`Successfully uploaded to ${emptySlot} for @${creator.ig_handle}`);
      setFile(null); // Clear file input
      await fetchCreators(); // Refresh state to see new slot filled
    } catch (err: any) {
      console.error('Upload error:', err);
      setErrorStatus(`Upload failed: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 md:p-10">
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-8">
          <UploadCloud className="w-8 h-8 text-cyan-500" />
          <h2 className="text-3xl font-bold font-display">Admin Panel</h2>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-neutral-500 mb-2">Select Creator</label>
            {isLoading ? (
              <div className="flex items-center gap-2 text-neutral-400">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading creators...
              </div>
            ) : (
              <select
                value={selectedCreatorId}
                onChange={e => setSelectedCreatorId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-transparent focus:ring-1 focus:ring-cyan-500 [&>option]:text-black dark:[&>option]:text-black"
              >
                <option value="" disabled>-- Select a Creator --</option>
                {creators.map((c, i) => {
                  let filledSlots = 0;
                  for (let j = 1; j <= 10; j++) {
                    if (c[`reel_url_${j}`]) filledSlots++;
                  }
                  return (
                    <option key={`${c.id || ''}-${i}`} value={c.id}>
                      @{c.ig_handle} ({filledSlots}/10 slots filled)
                    </option>
                  );
                })}
              </select>
            )}
          </div>

          {selectedCreatorId && (
            <div>
              <label className="block text-sm font-bold text-neutral-500 mb-2">Upload Reel (.mp4)</label>
              <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 flex items-center justify-between">
                 <input 
                   type="file" 
                   accept="video/*" 
                   onChange={handleFileChange}
                   className="text-sm"
                 />
              </div>
            </div>
          )}

          {errorStatus && (
            <div className="p-4 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 font-bold rounded-xl text-sm border border-red-200 dark:border-red-900/30">
              {errorStatus}
            </div>
          )}

          {uploadStatus && (
            <div className="p-4 bg-green-50 dark:bg-green-900/10 text-green-700 dark:text-green-400 font-bold rounded-xl text-sm border border-green-200 dark:border-green-900/30 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              {uploadStatus}
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={!selectedCreatorId || !file || isUploading}
            className="w-full bg-cyan-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-cyan-600 transition-colors disabled:opacity-50"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" /> Uploading to Cloudinary...
              </>
            ) : (
              <>
                <Video className="w-5 h-5" /> Upload Reel to First Empty Slot
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
