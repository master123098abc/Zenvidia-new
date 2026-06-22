import React, { useState, useEffect } from 'react';
import { StoreManager } from './StoreManager';
import { Settings, ExternalLink } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface BrandDashboardProps {
  user: any;
  brandData: any;
  onLogout?: () => void;
  onSettingsClick?: () => void;
}

export default function BrandDashboard({ user, brandData, onLogout, onSettingsClick }: BrandDashboardProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'store'>('store');
  const [websites, setWebsites] = useState<any[]>([]);

  useEffect(() => {
    if (brandData?.id) {
      loadWebsites();
    }
  }, [brandData?.id]);

  const loadWebsites = async () => {
    const { data } = await supabase.from('brand_websites').select('*').eq('brand_id', brandData.id);
    if (data) {
      setWebsites(data);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-8 flex flex-col md:flex-row gap-6">
      <div className="w-full md:w-64 bg-neutral-900 rounded-2xl p-4 border border-neutral-800">
        <div className="flex items-center justify-between mb-6 p-2">
          <div className="flex items-center gap-3">
            {brandData?.profile_url && (
              <img src={brandData.profile_url} className="w-10 h-10 rounded-full object-cover" />
            )}
            <div>
              <h2 className="text-white font-bold">{brandData?.business_name || 'Brand'}</h2>
              <p className="text-neutral-500 text-xs">Dashboard</p>
            </div>
          </div>
          <button 
            onClick={onSettingsClick}
            className="p-2 text-neutral-400 hover:text-white transition-colors"
            title="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>

        <nav className="space-y-2">
          <button 
            onClick={() => setActiveTab('profile')}
            className={`w-full text-left px-4 py-3 rounded-xl font-bold transition-colors ${
              activeTab === 'profile' ? 'bg-cyan-500/20 text-cyan-400' : 'text-neutral-400 hover:bg-neutral-800'
            }`}
          >
            👤 Profile
          </button>
          <button 
            onClick={() => setActiveTab('store')}
            className={`w-full text-left px-4 py-3 rounded-xl font-bold transition-colors ${
              activeTab === 'store' ? 'bg-cyan-500/20 text-cyan-400' : 'text-neutral-400 hover:bg-neutral-800'
            }`}
          >
            🛍️ My Store
          </button>
        </nav>
      </div>

      <div className="flex-1">
        {activeTab === 'profile' && (
          <div className="space-y-6">
            <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-800">
              <h2 className="text-xl font-black text-white mb-4">Brand Profile</h2>
              <p className="text-neutral-400">Settings and information configuration coming soon.</p>
            </div>
            
            {websites.length > 0 && (
              <div>
                <h2 className="text-xl font-black text-white mb-4">My Websites</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {websites.map(website => (
                    <div key={website.id} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 overflow-hidden relative group hover:border-cyan-500/50 transition-colors cursor-pointer">
                      {website.banner_url && (
                        <div className="h-24 w-full bg-neutral-800 rounded-xl mb-4 overflow-hidden">
                          <img src={website.banner_url} className="w-full h-full object-cover" alt="Banner" />
                        </div>
                      )}
                      <div className="flex items-start gap-4">
                        {website.logo_url ? (
                          <img src={website.logo_url} className="w-12 h-12 rounded-full object-cover border border-neutral-800" alt="Logo" />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-neutral-800 flex items-center justify-center text-xl">🌐</div>
                        )}
                        <div className="flex-1">
                          <h3 className="font-bold text-white text-lg leading-tight">{website.website_name}</h3>
                          {website.description && (
                            <p className="text-neutral-500 text-sm mt-1 line-clamp-2">{website.description}</p>
                          )}
                          <a 
                            href={website.website_url.startsWith('http') ? website.website_url : `https://${website.website_url}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 mt-3 text-cyan-500 hover:text-cyan-400 text-sm font-medium"
                          >
                            Visit Website <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        {activeTab === 'store' && brandData?.id && (
          <StoreManager brandId={brandData.id} />
        )}
      </div>
    </div>
  );
}
