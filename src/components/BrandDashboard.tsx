import React, { useState, useEffect } from 'react';
import { StoreManager } from './StoreManager';
import { Settings } from 'lucide-react';

interface BrandDashboardProps {
  user: any;
  brandData: any;
  onLogout?: () => void;
  onSettingsClick?: () => void;
}

export default function BrandDashboard({ user, brandData, onLogout, onSettingsClick }: BrandDashboardProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'store'>('store');

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
          <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-800">
            <h2 className="text-xl font-black text-white mb-4">Brand Profile</h2>
            <p className="text-neutral-400">Settings and information configuration coming soon.</p>
          </div>
        )}
        {activeTab === 'store' && brandData?.id && (
          <StoreManager brandId={brandData.id} />
        )}
      </div>
    </div>
  );
}
