import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { uploadToCloudinary } from '../lib/cloudinary';
import { Camera, ArrowLeft } from 'lucide-react';
import { toast } from '../lib/toast';

interface CreateWebsiteProps {
  onClose: () => void;
  onSuccess: () => void;
  brandId: string;
}

export default function CreateWebsite({ onClose, onSuccess, brandId }: CreateWebsiteProps) {
  const [formData, setFormData] = useState({
    website_name: '',
    brand_name: '',
    description: '',
    website_url: '',
    category: '',
    contact: ''
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!formData.website_name || !formData.website_url) {
      toast('Please fill out required fields', 'error');
      return;
    }
    
    setSaving(true);
    try {
      let logoUrl = '';
      let bannerUrl = '';
      
      if (logoFile) {
        logoUrl = await uploadToCloudinary(logoFile, 'image');
      }
      if (bannerFile) {
        bannerUrl = await uploadToCloudinary(bannerFile, 'image');
      }

      const { data, error } = await supabase.from('brand_websites').insert([{
        brand_id: brandId,
        website_name: formData.website_name,
        brand_name: formData.brand_name,
        description: formData.description,
        website_url: formData.website_url,
        category: formData.category,
        contact: formData.contact,
        logo_url: logoUrl,
        banner_url: bannerUrl
      }]);

      if (error) throw error;
      toast('Website created successfully!', 'success');
      onSuccess();
    } catch (err: any) {
      toast('Error saving website: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'banner') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    if (type === 'logo') {
      setLogoFile(file);
      setLogoPreview(url);
    } else {
      setBannerFile(file);
      setBannerPreview(url);
    }
  };

  return (
    <div className="absolute inset-0 bg-neutral-950 z-50 overflow-y-auto">
      <div className="sticky top-0 z-10 bg-neutral-900/80 backdrop-blur-md border-b border-neutral-800 px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-2 text-neutral-400 hover:text-white rounded-full bg-neutral-800">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-bold text-white">Create Website</h2>
        </div>
        <button 
          onClick={handleSave} 
          disabled={saving}
          className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-orange-500 text-white rounded-xl font-bold disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      <div className="p-4 space-y-6 max-w-2xl mx-auto">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-neutral-400 mb-2">Banner Image</label>
            <div className="relative h-40 bg-neutral-800 rounded-2xl overflow-hidden border border-neutral-700 flex items-center justify-center">
              {bannerPreview ? (
                <img src={bannerPreview} className="w-full h-full object-cover" alt="Banner" />
              ) : (
                <Camera className="w-8 h-8 text-neutral-600" />
              )}
              <input type="file" accept="image/*" onChange={(e) => handleImageChange(e, 'banner')} className="absolute inset-0 opacity-0 cursor-pointer" />
            </div>
          </div>
          
          <div className="-mt-16 ml-4 relative z-10">
            <label className="block text-sm font-bold text-neutral-400 mb-2">Logo</label>
            <div className="relative w-24 h-24 bg-neutral-800 rounded-full overflow-hidden border-4 border-neutral-950 flex items-center justify-center shadow-xl">
              {logoPreview ? (
                <img src={logoPreview} className="w-full h-full object-cover" alt="Logo" />
              ) : (
                <Camera className="w-6 h-6 text-neutral-600" />
              )}
              <input type="file" accept="image/*" onChange={(e) => handleImageChange(e, 'logo')} className="absolute inset-0 opacity-0 cursor-pointer" />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-neutral-400 mb-1">Website Name *</label>
            <input 
              type="text" 
              value={formData.website_name}
              onChange={(e) => setFormData({...formData, website_name: e.target.value})}
              className="w-full px-4 py-3 bg-neutral-900 border border-neutral-800 rounded-xl text-white focus:outline-none focus:border-cyan-500" 
              placeholder="e.g. My Awesome Shop"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-neutral-400 mb-1">Brand Name</label>
            <input 
              type="text" 
              value={formData.brand_name}
              onChange={(e) => setFormData({...formData, brand_name: e.target.value})}
              className="w-full px-4 py-3 bg-neutral-900 border border-neutral-800 rounded-xl text-white focus:outline-none focus:border-cyan-500" 
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-neutral-400 mb-1">Website URL *</label>
            <input 
              type="url" 
              value={formData.website_url}
              onChange={(e) => setFormData({...formData, website_url: e.target.value})}
              className="w-full px-4 py-3 bg-neutral-900 border border-neutral-800 rounded-xl text-white focus:outline-none focus:border-cyan-500" 
              placeholder="https://..."
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-neutral-400 mb-1">Category</label>
            <input 
              type="text" 
              value={formData.category}
              onChange={(e) => setFormData({...formData, category: e.target.value})}
              className="w-full px-4 py-3 bg-neutral-900 border border-neutral-800 rounded-xl text-white focus:outline-none focus:border-cyan-500" 
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-neutral-400 mb-1">Contact (Email/Phone)</label>
            <input 
              type="text" 
              value={formData.contact}
              onChange={(e) => setFormData({...formData, contact: e.target.value})}
              className="w-full px-4 py-3 bg-neutral-900 border border-neutral-800 rounded-xl text-white focus:outline-none focus:border-cyan-500" 
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-neutral-400 mb-1">Description</label>
            <textarea 
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full px-4 py-3 bg-neutral-900 border border-neutral-800 rounded-xl text-white focus:outline-none focus:border-cyan-500 min-h-[100px]" 
            />
          </div>
        </div>
      </div>
    </div>
  );
}
