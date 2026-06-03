import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Search } from 'lucide-react';
import SmartPitchModal from './SmartPitchModal';
import CreatorProfileModal from './CreatorProfileModal';
import { PullToRefresh } from './PullToRefresh';


// Shared card component for marketplace feed
function CreatorCard({ item, onClick, onOfferClick, activeTab, isDataSaver }: any) {
  const [showVideo, setShowVideo] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const reels = [];
  for (let i = 1; i <= 10; i++) {
    if (item[`reel_url_${i}`]) {
      reels.push(item[`reel_url_${i}`]);
    }
  }

  useEffect(() => {
    if (isDataSaver || reels.length === 0) return;
    
    let timer: NodeJS.Timeout;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        timer = setTimeout(() => {
          setShowVideo(true);
        }, 2000);
      } else {
        clearTimeout(timer);
        setShowVideo(false);
        setCurrentSlide(0);
      }
    }, { threshold: 0.5 });
    
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    
    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, [isDataSaver, reels.length]);

  const handleScroll = (e: any) => {
    const el = e.currentTarget;
    const index = Math.round(el.scrollLeft / el.clientWidth);
    setCurrentSlide(index);
  };

  return (
    <div ref={containerRef} className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden cursor-pointer shadow-lg hover:border-neutral-700 transition relative group" onClick={onClick}>
      
      {/* Photo / Video auto-play after 2s */}
      <div className="aspect-square bg-neutral-800 relative overflow-hidden">
        {showVideo && reels.length > 0 ? (
          <>
            <div 
              className="w-full h-full flex overflow-x-auto snap-x snap-mandatory hide-scrollbar"
              onScroll={handleScroll}
            >
              {reels.map((url, idx) => (
                <div key={`reel-item-${idx}`} className="w-full h-full flex-shrink-0 snap-center relative">
                  <video 
                    src={url} 
                    className="w-full h-full object-cover animate-in fade-in duration-500" 
                    autoPlay 
                    muted 
                    loop 
                    playsInline
                  />
                </div>
              ))}
            </div>
            {/* Pagination dots if more than one reel */}
            {reels.length > 1 && (
              <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5 z-10 pointer-events-none">
                {reels.map((url, idx) => (
                  <div 
                    key={`dot-${idx}`} 
                    className={`h-1.5 rounded-full transition-all ${idx === currentSlide ? 'w-4 bg-white shadow-md' : 'w-1.5 bg-white/50'}`}
                  />
                ))}
              </div>
            )}
          </>
        ) : item.profile_url ? (
          <img src={item.profile_url} className="w-full h-full object-cover" alt="Profile" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl font-black text-neutral-600 uppercase">
            {(item.ig_handle || item.business_name || '?')[0]}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="font-bold text-white text-sm truncate">
          @{item.ig_handle || item.business_name}
        </p>
        <p className="text-neutral-500 text-xs mt-0.5 truncate">
          {item.primary_niche || item.business_type || 'Creator'}
        </p>
        {item.follower_count && (
          <p className="text-neutral-400 text-xs mt-0.5 font-medium">
            {Number(item.follower_count).toLocaleString()} followers
          </p>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOfferClick(item, e);
          }}
          className="w-full mt-3 py-2 bg-gradient-to-r from-cyan-500 to-orange-500 text-white text-xs font-bold rounded-xl shadow-md active:scale-95 transition-transform"
        >
          {activeTab === 'brand_collab' ? 'Partner Up' : activeTab === 'creator_collab' ? 'Propose Collab' : 'Send Offer'}
        </button>
      </div>
    </div>
  );
}

type CollabTab = 'hire_creator' | 'brand_collab' | 'creator_collab';

interface MarketplaceProps {
  user: any;
  onOpenAuth: () => void;
  onDealCreated?: (deal: any) => void;
  onSendOffer?: (item: any) => void;
  onCreatorClick?: (creator: any) => void;
}

let _creatorsCache: any[] | null = null;
let _brandsCache: any[] | null = null;

export default function Marketplace({ user, onOpenAuth, onDealCreated, onSendOffer, onCreatorClick }: MarketplaceProps) {
  const [activeTab, setActiveTab] = useState<CollabTab>('hire_creator');
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  
  const [selectedUserForPitch, setSelectedUserForPitch] = useState<any | null>(null);
  const [selectedUserForProfile, setSelectedUserForProfile] = useState<any | null>(null);
  const [pendingTarget, setPendingTarget] = useState<any | null>(null);

  const filters = ['All', 'Fashion', 'Food', 'Tech', 'Travel', 'Beauty', 'Fitness', 'Gaming', 'Lifestyle'];

  useEffect(() => {
    if (user && pendingTarget) {
      handlePitchRequest(pendingTarget.item, null, pendingTarget.collabType);
      setPendingTarget(null);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'brand_collab' && _brandsCache) {
        setData(_brandsCache);
        setIsLoading(false);
        return;
      }
      if (activeTab !== 'brand_collab' && _creatorsCache) {
        setData(_creatorsCache);
        setIsLoading(false);
        return;
      }

      console.log(`PROFILE FETCH: fetching ${activeTab} data`);
      const table = activeTab === 'brand_collab' ? 'brands' : 'creators';
      const { data: fetchedData, error } = await supabase
        .from(table)
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      
      const res = fetchedData || [];
      if (activeTab === 'brand_collab') _brandsCache = res;
      else _creatorsCache = res;
      
      setData(res);
    } catch (err: any) {
      console.error('ERROR PROFILE: Fetch error:', err.message);
      setData([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filtered = data.filter((item) => {
    const search = !searchQuery ||
      item.ig_handle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.business_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.primary_niche?.toLowerCase().includes(searchQuery.toLowerCase());
    const niche = activeFilter === 'All' ||
      item.primary_niche?.toLowerCase() === activeFilter.toLowerCase();
    return search && niche;
  });

  const handlePitchRequest = (item: any, e?: any, passedCollabType?: string) => {
    if (e) e.stopPropagation();
    
    const collabType = passedCollabType || (activeTab === 'hire_creator' ? 'brand_to_creator' : (activeTab === 'creator_collab' ? 'creator_to_creator' : 'brand_to_brand'));

    if (!user) {
      setPendingTarget({ item, collabType });
      onOpenAuth();
      return;
    }

    const userRole = localStorage.getItem('zenova_brand') ? 'BRAND' : (localStorage.getItem('zenova_handle') ? 'CREATOR' : 'ADMIN');

    if (collabType === 'brand_to_brand' && userRole !== 'BRAND') {
      alert('Only brands can use Brand Collab');
      return;
    }
    if (collabType === 'creator_to_creator' && userRole !== 'CREATOR') {
      alert('Only creators can use Creator Collab');
      return;
    }

    setSelectedUserForPitch(item);
  };

  const handleCardClick = (item: any) => {
    if (activeTab !== 'brand_collab' && onCreatorClick) {
      onCreatorClick(item);
    } else {
      setSelectedUserForProfile(item);
    }
  };

  return (
    <div className="w-full bg-black min-h-screen">
      <PullToRefresh onRefresh={fetchData}>
        {/* Tabs */}
        <div className="flex gap-2 p-4 pb-0 max-w-4xl mx-auto">
          <button 
            onClick={() => setActiveTab('hire_creator')}
            className={`flex-1 py-2 text-sm font-bold rounded-xl transition-all ${activeTab === 'hire_creator' ? 'bg-cyan-500 text-white' : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white'}`}>
            Hire Creator
          </button>
          <button 
            onClick={() => setActiveTab('brand_collab')}
            className={`flex-1 py-2 text-sm font-bold rounded-xl transition-all ${activeTab === 'brand_collab' ? 'bg-cyan-500 text-white' : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white'}`}>
            Brand Collab
          </button>
          <button 
            onClick={() => setActiveTab('creator_collab')}
            className={`flex-1 py-2 text-sm font-bold rounded-xl transition-all ${activeTab === 'creator_collab' ? 'bg-cyan-500 text-white' : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white'}`}>
            Creator Collab
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="p-4 max-w-4xl mx-auto">
          <div className="relative w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
            <input 
              type="text" 
              placeholder={activeTab === 'brand_collab' ? 'Search brands...' : 'Search handle or niche...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-2 text-sm rounded-full bg-neutral-900 border border-neutral-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:outline-none transition-all text-white"
            />
          </div>
          {activeTab !== 'brand_collab' && (
            <div className="flex gap-2 overflow-x-auto hide-scrollbar mt-3 pb-1">
              {filters.map((f, i) => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors outline-none focus:outline-none ${activeFilter === f ? 'bg-cyan-500 text-white' : 'bg-neutral-900 text-neutral-400 border border-neutral-800'}`}
                >
                  {f}
                </button>
              ))}
            </div>
          )}
        </div>

        {isLoading && (
          <div className="flex justify-center py-20 max-w-4xl mx-auto">
            <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-20 max-w-4xl mx-auto">
            <p className="text-4xl mb-3">🎨</p>
            <p className="text-neutral-400">
              {searchQuery || activeFilter !== 'All'
                ? 'No results found'
                : 'No creators yet'}
            </p>
            {(searchQuery || activeFilter !== 'All') && (
              <button onClick={() => {
                setSearchQuery('');
                setActiveFilter('All');
              }} className="mt-3 text-cyan-400 text-sm font-bold">
                Clear filters
              </button>
            )}
          </div>
        )}

        {/* Grid */}
        {!isLoading && filtered.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 p-4 max-w-4xl mx-auto pb-6">
            {filtered.map((item, i) => (
              <CreatorCard 
                key={`${item.id || item.user_id || ''}-${i}`}
                item={item} 
                onClick={() => handleCardClick(item)}
                activeTab={activeTab}
                isDataSaver={localStorage.getItem('zenova_data_saver') === 'true'}
                onOfferClick={(clickItem: any, event: any) => {
                  if (onSendOffer) {
                    onSendOffer(clickItem);
                  } else {
                    handlePitchRequest(clickItem, event);
                  }
                }}
              />
            ))}
          </div>
        )}
      </PullToRefresh>

      {selectedUserForPitch && (
        <SmartPitchModal
          targetUser={selectedUserForPitch}
          collabType={activeTab === 'hire_creator' ? 'brand_to_creator' : (activeTab === 'creator_collab' ? 'creator_to_creator' : 'brand_to_brand')}
          currentUser={user}
          onClose={() => setSelectedUserForPitch(null)}
          onDealCreated={(dealId) => {
            if (onDealCreated) onDealCreated(dealId);
          }}
        />
      )}

      {selectedUserForProfile && (
        <CreatorProfileModal
          creator={selectedUserForProfile}
          collabType={activeTab}
          onClose={() => setSelectedUserForProfile(null)}
          onOffer={() => handlePitchRequest(selectedUserForProfile, null, activeTab === 'hire_creator' ? 'brand_to_creator' : (activeTab === 'creator_collab' ? 'creator_to_creator' : 'brand_to_brand'))}
        />
      )}
    </div>
  );
}
