import React, { useEffect, useState } from 'react';
import { Draft, getDrafts, deleteDraft, getTotalStorageUsed } from '../lib/draftsManager';
import { Trash2, UploadCloud, Video, X, Play, Eye } from 'lucide-react';
import { uploadToCloudinary } from '../lib/cloudinary';
import { supabase } from '../lib/supabase';

interface DraftsGalleryProps {
  onClose?: () => void;
}

export const DraftsGallery: React.FC<DraftsGalleryProps> = ({ onClose }) => {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [storageUsed, setStorageUsed] = useState(0);
  const [previewDraft, setPreviewDraft] = useState<Draft | null>(null);

  useEffect(() => {
    loadDrafts();
  }, []);

  const loadDrafts = async () => {
    try {
      const data = await getDrafts();
      const storage = await getTotalStorageUsed();
      setDrafts(data);
      setStorageUsed(storage);
    } catch (err) {
      console.error('Failed to load drafts', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this draft?')) {
      try {
        await deleteDraft(id);
        setDrafts(drafts.filter(d => d.id !== id));
        const storage = await getTotalStorageUsed();
        setStorageUsed(storage);
      } catch (err) {
        console.error('Failed to delete draft', err);
      }
    }
  };

  const handleUpload = async (draft: Draft) => {
    setUploadingId(draft.id);
    try {
      const file = new File([draft.blob], `draft-${draft.id}.webm`, { type: 'video/webm' });
      const url = await uploadToCloudinary(file, 'video');
      
      const creatorDataStr = localStorage.getItem('zenova_creator');
      if (creatorDataStr) {
        const creator = JSON.parse(creatorDataStr);
        if (creator?.id) {
          const slots = ['reel_url_1', 'reel_url_2', 'reel_url_3', 'reel_url_4', 'reel_url_5', 'reel_url_6', 'reel_url_7', 'reel_url_8', 'reel_url_9', 'reel_url_10'];
          const emptySlot = slots.find(s => !creator[s]);
          
          if (emptySlot) {
            const { error } = await supabase.from('creators').update({ [emptySlot]: url }).eq('id', creator.id);
            if (error) throw error;
            
            creator[emptySlot] = url;
            localStorage.setItem('zenova_creator', JSON.stringify(creator));
          } else {
             alert('All 10 reel slots are full! Please remove one on your profile to upload more.');
             return;
          }
        }
      }
      
      await deleteDraft(draft.id);
      setDrafts(d => d.filter(x => x.id !== draft.id));
      alert('✅ Uploaded to your profile!');
    } catch (err: any) {
      console.error('Upload error', err);
      alert('Upload failed: ' + (err.message || 'Unknown error'));
    } finally {
      setUploadingId(null);
    }
  };

  const formatTimeAgo = (timestamp: number) => {
    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
    const daysDifference = Math.round((timestamp - Date.now()) / (1000 * 60 * 60 * 24));
    const hoursDifference = Math.round((timestamp - Date.now()) / (1000 * 60 * 60));
    
    if (Math.abs(hoursDifference) < 24) {
      if (hoursDifference === 0) return 'Just now';
      return rtf.format(hoursDifference, 'hour');
    }
    return rtf.format(daysDifference, 'day');
  };

  const formatSize = (bytes: number) => {
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black text-white">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black min-h-screen flex flex-col pt-safe text-white overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-black/80 backdrop-blur-md z-40 px-4 py-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onClose && (
            <button onClick={onClose} className="p-2 -ml-2 rounded-full hover:bg-white/10 transition">
              <X className="w-6 h-6" />
            </button>
          )}
          <div>
            <h2 className="text-white font-black text-xl">My Drafts ({drafts.length})</h2>
            <span className="text-neutral-400 text-xs font-medium">
              {(storageUsed / 1024 / 1024).toFixed(1)} MB used
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 pb-24">
        {drafts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[60vh] text-center">
            <div className="w-20 h-20 bg-neutral-900 rounded-full flex flex-col items-center justify-center mb-6 border border-neutral-800">
              <Video className="w-10 h-10 text-neutral-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">No Drafts yet</h2>
            <p className="text-neutral-500 max-w-xs mx-auto">
              Videos you record using the Camera will appear here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {drafts.map((draft) => (
              <div key={draft.id} className="bg-neutral-900 rounded-2xl overflow-hidden flex flex-col shadow-xl border border-white/5 relative group">
                {/* Video preview thumbnail */}
                <div 
                  className="aspect-[9/16] bg-neutral-950 relative w-full overflow-hidden cursor-pointer"
                  onClick={() => setPreviewDraft(draft)}
                >
                  <video 
                    src={URL.createObjectURL(draft.blob)} 
                    className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-500"
                    controls={false}
                    preload="metadata"
                    muted
                  />
                  
                  {/* Overlays */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />
                  
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
                       <Play className="w-6 h-6 ml-1" />
                    </div>
                  </div>

                  <div className="absolute top-2 left-2 flex gap-1">
                    {draft.filter && draft.filter !== 'none' && (
                      <span className="bg-cyan-500/80 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
                        {draft.filter}
                      </span>
                    )}
                  </div>
                  
                  <div className="absolute bottom-2 left-2 right-2 flex justify-between items-end">
                    <div className="flex flex-col drop-shadow-md">
                      <span className="text-white text-sm font-semibold leading-tight flex items-center gap-1">
                         {draft.duration ? `${draft.duration}s` : 'Video'}
                      </span>
                      <span className="text-neutral-300 text-xs">
                        {formatTimeAgo(draft.timestamp)}
                      </span>
                    </div>
                    <span className="text-neutral-400 text-xs bg-black/50 px-1.5 py-0.5 rounded backdrop-blur border border-white/10">
                      {formatSize(draft.blob.size)}
                    </span>
                  </div>
                </div>
                
                {/* Actions */}
                <div className="p-3 flex items-center gap-2 bg-neutral-900">
                  <button
                    onClick={() => setPreviewDraft(draft)}
                    className="p-3 text-neutral-400 hover:text-white transition-colors rounded-xl bg-neutral-800/50 hover:bg-neutral-800"
                    title="Preview"
                  >
                    <Eye className="w-5 h-5" />
                  </button>

                  <button
                    onClick={() => handleUpload(draft)}
                    disabled={uploadingId === draft.id}
                    className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white py-3 px-3 rounded-xl font-bold hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-cyan-500/20"
                  >
                    {uploadingId === draft.id ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span className="text-sm">Uploading...</span>
                      </div>
                    ) : (
                      <>
                        <UploadCloud className="w-5 h-5" />
                        <span className="text-sm">Post to Profile</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => handleDelete(draft.id)}
                    disabled={uploadingId === draft.id}
                    className="p-3 text-neutral-500 hover:text-red-400 hover:bg-red-500/10 transition-colors rounded-xl disabled:opacity-50"
                    title="Delete draft"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Video Preview Modal */}
      {previewDraft && (
        <div className="fixed inset-0 z-[110] bg-black">
          <div className="absolute top-safe top-4 right-4 z-50">
            <button 
              onClick={() => setPreviewDraft(null)}
              className="w-12 h-12 bg-black/50 backdrop-blur-xl rounded-full flex items-center justify-center shadow-lg border border-white/10"
            >
              <X className="w-6 h-6 text-white" />
            </button>
          </div>
          <video 
             src={URL.createObjectURL(previewDraft.blob)} 
             controls 
             autoPlay 
             className="w-full h-full object-contain" 
          />
        </div>
      )}
    </div>
  );
};
