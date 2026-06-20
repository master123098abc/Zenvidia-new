import { useEffect, useState, useRef } from 'react';
import { supabase } from './lib/supabase';
import { User } from '@supabase/supabase-js';
import IntroSequence from './components/IntroSequence';
import Navbar from './components/Navbar';
import BottomNav from './components/BottomNav';
import Marketplace from './components/Marketplace';
import ReelsFeedViewer from './components/ReelsFeedViewer';
import ChatInterface from './components/ChatInterface';
import AuthModal from './components/AuthModal';
import Onboarding from './components/Onboarding';
import CreatorReelsManager from './components/CreatorReelsManager';
import CreatorSocialLinks from './components/CreatorSocialLinks';
import CreatorProfileHeader from './components/CreatorProfileHeader';
import CreatorVideoFeed from './components/CreatorVideoFeed';
import CreatorProfilePage from './components/CreatorProfilePage';
import Settings from './components/Settings';
import AdminDashboard from './components/AdminDashboard';
import { ToastContainer, toast } from './lib/toast';
import WelcomeTour from './components/WelcomeTour';

import { CameraRecorder } from './components/CameraRecorder';
import { DraftsGallery } from './components/DraftsGallery';
import { PublicStorePage } from './components/PublicStorePage';
import BrandDashboard from './components/BrandDashboard';
import { Plus } from 'lucide-react';
import { uploadToCloudinary } from './lib/cloudinary';

export type View =
  | 'HOME'
  | 'BRAND_DASHBOARD'
  | 'CREATOR_PORTAL'
  | 'CHAT'
  | 'DEAL_ROOM'
  | 'PAYOUT_DASHBOARD'
  | 'ONBOARDING'
  | 'ADMIN_DASHBOARD'
  | 'INBOX'
  | 'REELS'
  | 'SETTINGS'
  | 'CREATOR_PROFILE'
  | 'CAMERA'
  | 'DRAFTS'
  | 'STORE';

export default function App() {
  const [view, setView] = useState<View>('HOME');
  const [prevView, setPrevView] = useState<View>('HOME');
  const [user, setUser] = useState<User | null>(null);

  const handleSetView = (newView: View) => {
    setPrevView(view);
    setView(newView);
  };

  const [loading, setLoading] = useState(true);
  const [showIntro, setShowIntro] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [initialChatDealId, setInitialChatDealId] = useState<string | null>(null);
  const [selectedCreatorForProfile, setSelectedCreatorForProfile] = useState<any>(null);
  const [profileReturnView, setProfileReturnView] = useState<'HOME' | 'REELS'>('HOME');
  const [showWelcomeTour, setShowWelcomeTour] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showUploadMenu, setShowUploadMenu] = useState(false);
  const [viewingStoreHandle, setViewingStoreHandle] = useState<string | null>(null);
  const isHandlingSession = useRef(false);

  useEffect(() => {
    const path = window.location.pathname;
    const match = path.match(/^\/store\/(.+)$/);
    if (match) {
      setViewingStoreHandle(match[1]);
      setView('STORE');
    }
  }, []);

  useEffect(() => {
    // PWA Install Prompt handling
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      console.log('INSTALL_AVAILABLE');
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  useEffect(() => {
    if (user && (view === 'BRAND_DASHBOARD' || view === 'CREATOR_PORTAL')) {
      const hasSeenTour = localStorage.getItem('zenvidia_seen_onboarding');
      // If we haven't seen it, show it.
      if (!hasSeenTour) {
        // slight delay looks nice
        const timer = setTimeout(() => setShowWelcomeTour(true), 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [user, view]);

  const handleDealCreated = (dealId: string) => {
    setInitialChatDealId(dealId);
    setView('CHAT');
  };

  useEffect(() => {
    // Check dark mode preference on mount
    const isDark = localStorage.getItem('zenova_dark_mode') !== 'false';
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // Listen for global auth modal event
    const openAuthListener = () => setShowAuthModal(true);
    document.addEventListener('openAuthModal', openAuthListener);

    return () => {
      document.removeEventListener('openAuthModal', openAuthListener);
    };
  }, []);

  useEffect(() => {
    if (!showUploadMenu) return;
    const close = () => setShowUploadMenu(false);
    setTimeout(() => document.addEventListener('click', close), 100);
    return () => document.removeEventListener('click', close);
  }, [showUploadMenu]);

  const handleSessionUser = async (authUser: User | null | undefined, isInitialLoad: boolean) => {
    console.log('1. handleSessionUser called', authUser?.email, isInitialLoad);
    if (!authUser?.id) { setLoading(false); return; }
    
    if (isHandlingSession.current) { 
      console.log('2. Already handling session, skip');
      return; 
    }
    isHandlingSession.current = true;
    
    // Use cached data immediately — don't wait for Supabase
    const cachedBrand = localStorage.getItem('zenova_brand');
    const cachedCreator = localStorage.getItem('zenova_creator');

    if (cachedBrand) {
      try {
        setUser(authUser);
        if (isInitialLoad) {
          setView('BRAND_DASHBOARD');
        }
        setLoading(false);
        isHandlingSession.current = false;
        return; // EXIT — don't fetch from Supabase again
      } catch {}
    }

    if (cachedCreator) {
      try {
        setUser(authUser);
        if (isInitialLoad) {
          setView('CREATOR_PORTAL');
        }
        setLoading(false);
        isHandlingSession.current = false;
        return; // EXIT
      } catch {}
    }

    const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number = 10000): Promise<T> => {
      return Promise.race([
        promise,
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Request timed out')), timeoutMs))
      ]);
    };

    try {
      if (authUser.email === 'admin@zenvidia.com') {
        localStorage.setItem('zenova_admin', 'true');
        setUser(authUser);
        setView('ADMIN_DASHBOARD');
        setLoading(false);
        isHandlingSession.current = false;
        return;
      }

      console.log('2. Checking role intent...');
      let roleIntent = localStorage.getItem('zenvidia_role_intent');
      
      // If we have no local cache info, we need to carefully determine their role
      // by checking if they already exist in either table.
      if (!roleIntent && !cachedBrand && !cachedCreator) {
        const { data: existingBrand } = await withTimeout<any>(
          supabase.from('brands').select('*').eq('user_id', authUser.id).maybeSingle() as any
        );
        if (existingBrand) {
          roleIntent = 'brand';
        } else {
          const { data: existingCreator } = await withTimeout<any>(
            supabase.from('creators').select('*').eq('user_id', authUser.id).maybeSingle() as any
          );
          if (existingCreator) {
            roleIntent = 'creator';
          }
        }
      }

      const isBrand = roleIntent === 'brand' || cachedBrand;

      if (isBrand) {
        console.log('3. Checking brand...');
        const { data: brand, error: brandError } = await withTimeout<any>(
          supabase.from('brands').select('*').eq('user_id', authUser.id).maybeSingle() as any
        );
          
        console.log('4. Brand result:', brand, brandError);

        let brandData = brand;

        if (!brandData) {
           console.log('PROFILE_CREATED (Brand)');
           const { data: newRow, error } = await supabase.from('brands').insert({
              user_id: authUser.id,
              email: authUser.email || '',
              status: "pending"
           }).select().single();
           
           if (!error && newRow) {
              brandData = newRow;
           }
        }

        if (brandData) {
          localStorage.setItem('zenova_brand', JSON.stringify(brandData));
          setUser(authUser);
          
          if (!brandData.business_name || !brandData.business_type || !brandData.phone) {
             console.log('ONBOARDING_OPENED');
             setView('ONBOARDING');
          } else {
             console.log('REDIRECT_DONE');
             setView('BRAND_DASHBOARD');
          }
        }
      } else {
        console.log('6. Checking creator...');
        const { data: creator, error: creatorError } = await withTimeout<any>(
          supabase.from('creators').select('*').eq('user_id', authUser.id).maybeSingle() as any
        );

        console.log('7. Creator result:', creator, creatorError);

        let creatorData = creator;

        if (!creatorData) {
           console.log('PROFILE_CREATED (Creator)');
           const { data: newRow, error } = await supabase.from('creators').insert({
              user_id: authUser.id,
              status: "pending"
           }).select().single();
           
           if (!error && newRow) {
              creatorData = newRow;
           }
        }

        if (creatorData) {
          localStorage.setItem('zenova_handle', creatorData.ig_handle || '');
          localStorage.setItem('zenova_creator', JSON.stringify(creatorData));
          setUser(authUser);
          
          if (!creatorData.ig_handle || !creatorData.niche || !creatorData.primary_language) {
             console.log('ONBOARDING_OPENED');
             setView('ONBOARDING');
          } else {
             console.log('REDIRECT_DONE');
             setView('CREATOR_PORTAL');
          }
        }
      }
    } catch (err: any) {
      console.warn('10. ERROR:', err.message || err);
      toast('Could not load profile, but keeping you logged in.', 'error');
      setUser(authUser);
      
      // Load offline from cache
      const stillCachedBrand = localStorage.getItem('zenova_brand');
      const stillCachedCreator = localStorage.getItem('zenova_creator');
      const stillCachedAdmin = localStorage.getItem('zenova_admin');

      if (stillCachedAdmin) {
        setView('ADMIN_DASHBOARD');
      } else if (stillCachedBrand) {
        setView('BRAND_DASHBOARD');
      } else if (stillCachedCreator) {
        setView('CREATOR_PORTAL');
      } else {
        setView('ONBOARDING');
      }
    } finally {
      isHandlingSession.current = false;
      setLoading(false);
      console.log('11. Done, loading false');
    }
  };

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Auth session check error:", error.message);
        }

        if (session?.user) {
          console.log('AUTH session found');
          setUser(session.user);
          await handleSessionUser(session.user, true);
        } else {
          console.log('AUTH no session');
        }
      } catch (err: any) {
        console.warn('Session fetch failed:', err.message);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        localStorage.removeItem('zenova_handle');
        localStorage.removeItem('zenova_brand');
        localStorage.removeItem('zenova_admin');
        localStorage.removeItem('zenova_creator');
        setView('HOME');
      } else if (event === 'SIGNED_IN') {
        if (session?.user) {
          await handleSessionUser(session.user, false);
        }
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-[#1CA6A6]/10 via-white to-[#F18237]/10 dark:from-neutral-950 dark:via-neutral-950 dark:to-neutral-950 min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#1CA6A6]"></div>
      </div>
    );
  }

  const userRole = localStorage.getItem('zenova_brand') ? 'BRAND' : localStorage.getItem('zenova_creator') ? 'CREATOR' : null;

  return (
    <div className="bg-gradient-to-br from-[#1CA6A6]/10 via-white to-[#F18237]/10 dark:from-neutral-950 dark:via-neutral-950 dark:to-neutral-950 min-h-screen dark:bg-neutral-950 text-neutral-900 dark:text-neutral-50 transition-colors duration-300">
      {showIntro && <IntroSequence onComplete={() => setShowIntro(false)} />}
      <div style={{ visibility: showIntro ? 'hidden' : 'visible' }}>
        <Navbar 
          view={view} 
          setView={handleSetView} 
          user={user} 
          onBack={view === 'SETTINGS' ? () => setView(prevView) : undefined}
        />
        
        <ToastContainer />
          
        <main className="w-full h-full pb-16 md:pb-0">
          {view === 'HOME' && (
            <Marketplace 
              user={user} 
              userRole={localStorage.getItem('zenova_brand') ? 'BRAND' : localStorage.getItem('zenova_creator') ? 'CREATOR' : null}
              onOpenAuth={() => setShowAuthModal(true)} 
              onDealCreated={handleDealCreated}
              onCreatorClick={(creator) => {
                setSelectedCreatorForProfile(creator);
                setProfileReturnView('HOME');
                setView('CREATOR_PROFILE');
              }}
              onCreatorPortal={() => setView('CREATOR_PORTAL')}
              onSettings={() => setView('SETTINGS')}
            />
          )}
            
          {view === 'ONBOARDING' && <Onboarding user={user} setView={handleSetView} />}
          {view === 'BRAND_DASHBOARD' && (
            <BrandDashboard 
              user={user} 
              brandData={localStorage.getItem('zenova_brand') ? JSON.parse(localStorage.getItem('zenova_brand') || '{}') : null} 
            />
          )}
          {view === 'STORE' && viewingStoreHandle && (
            <PublicStorePage brandHandle={viewingStoreHandle} />
          )}
          {view === 'CREATOR_PORTAL' && (
            <div className="p-6 md:p-8 space-y-8">
              {/* Creator dashboard top header / links / video feed will be here */}
              {localStorage.getItem('zenova_creator') && (() => {
                const creatorData = JSON.parse(localStorage.getItem('zenova_creator') || '{}');
                return (
                  <>
                    <CreatorProfileHeader creator={creatorData} />

                    <div className="flex gap-4 mb-4">
                      <button 
                        onClick={() => setView('CAMERA')}
                        className="flex-1 bg-gradient-to-r from-red-500 to-orange-500 text-white py-3 rounded-xl font-bold hover:scale-105 transition-transform"
                      >
                        📹 Record Reel
                      </button>
                      <button 
                        onClick={() => setView('DRAFTS')}
                        className="flex-1 bg-neutral-900 border border-white/10 text-white py-3 rounded-xl font-bold hover:bg-neutral-800 transition-colors"
                      >
                        📁 My Drafts
                      </button>
                    </div>

                    <CreatorVideoFeed 
                      creatorId={user?.id || ''}
                      behold_feed_id={creatorData?.behold_feed_id}
                      yt_url={creatorData?.yt_url}
                      isOwner={true}
                    />
                    <CreatorReelsManager
                      creatorId={user?.id || ''}
                      initialBeholdId={creatorData.behold_feed_id || null}
                    />
                    <CreatorSocialLinks
                      creatorId={creatorData?.id}
                      igUrl={creatorData?.ig_url}
                      ytUrl={creatorData?.yt_url}
                    />
                  </>
                );
              })()}
            </div>
          )}
          {view === 'CAMERA' && <CameraRecorder onClose={() => setView('CREATOR_PORTAL')} />}
          {view === 'DRAFTS' && <DraftsGallery onClose={() => setView('CREATOR_PORTAL')} />}
          {view === 'ADMIN_DASHBOARD' && <AdminDashboard />}
          {(view === 'INBOX' || view === 'CHAT') && (
            <ChatInterface
              currentUserId={user?.id || ''}
              currentUserRole={localStorage.getItem('zenova_brand') ? 'BRAND' : (localStorage.getItem('zenova_handle') ? 'CREATOR' : 'ADMIN')}
              currentBrandData={localStorage.getItem('zenova_brand') ? JSON.parse(localStorage.getItem('zenova_brand') || '{}') : null}
              currentCreatorData={localStorage.getItem('zenova_creator') ? JSON.parse(localStorage.getItem('zenova_creator') || '{}') : null}
              initialDealId={initialChatDealId}
              onClose={() => setView('HOME')}
            />
          )}
          {view === 'REELS' && (
            <ReelsFeedViewer 
              onClose={() => setView('HOME')} 
              onCreatorClick={(creator) => {
                setSelectedCreatorForProfile(creator);
                setProfileReturnView('REELS');
                setView('CREATOR_PROFILE');
              }}
            />
          )}
          {view === 'CREATOR_PROFILE' && selectedCreatorForProfile && (
            <CreatorProfilePage 
              creator={selectedCreatorForProfile} 
              onClose={() => setView(profileReturnView)}
              currentUser={user}
            />
          )}
          {view === 'SETTINGS' && <Settings user={user} setView={handleSetView} />}
        </main>

        {user && 
         view !== 'CAMERA' && 
         view !== 'REELS' && (
          <div className="fixed bottom-20 left-1/2 
                          -translate-x-1/2 z-40">
            <button
              onClick={() => setShowUploadMenu(!showUploadMenu)}
              className="w-14 h-14 bg-gradient-to-r 
                         from-cyan-500 to-orange-500
                         rounded-full shadow-2xl shadow-cyan-500/30
                         flex items-center justify-center
                         active:scale-95 transition-transform">
              <Plus className="w-7 h-7 text-white font-black" />
            </button>

            {/* Upload menu popup */}
            {showUploadMenu && (
              <div className="absolute bottom-16 left-1/2 
                              -translate-x-1/2 
                              bg-neutral-900 border border-neutral-800 
                              rounded-2xl overflow-hidden
                              shadow-2xl w-48">
                
                <button
                  onClick={() => {
                    setShowUploadMenu(false);
                    setView('CAMERA');
                  }}
                  className="w-full flex items-center gap-3 
                             px-4 py-3 hover:bg-neutral-800 
                             transition-colors">
                  <div className="w-8 h-8 bg-red-500/20 rounded-full 
                                  flex items-center justify-center">
                    <span className="text-lg">📹</span>
                  </div>
                  <span className="text-white text-sm font-medium">
                    Record Reel
                  </span>
                </button>

                <div className="border-t border-neutral-800" />

                <button
                  onClick={() => {
                    setShowUploadMenu(false);
                    // Open file picker for existing video
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'video/*';
                    input.onchange = async (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (!file) return;
                      try {
                        const url = await uploadToCloudinary(file, 'video');
                        // Save to creator profile
                        const creator = JSON.parse(
                          localStorage.getItem('zenova_creator') || '{}'
                        );
                        const slots = Array.from({length: 10}, 
                          (_, i) => `reel_url_${i+1}`);
                        const emptySlot = slots.find(s => !creator[s]);
                        if (emptySlot && creator.id) {
                          await supabase.from('creators')
                            .update({ [emptySlot]: url })
                            .eq('id', creator.id);
                          creator[emptySlot] = url;
                          localStorage.setItem('zenova_creator', 
                            JSON.stringify(creator));
                          alert('✅ Reel uploaded!');
                        } else {
                          alert('All 10 reel slots full!');
                        }
                      } catch (err: any) {
                        alert('Upload failed: ' + err.message);
                      }
                    };
                    input.click();
                  }}
                  className="w-full flex items-center gap-3 
                             px-4 py-3 hover:bg-neutral-800 
                             transition-colors">
                  <div className="w-8 h-8 bg-cyan-500/20 rounded-full 
                                  flex items-center justify-center">
                    <span className="text-lg">📁</span>
                  </div>
                  <span className="text-white text-sm font-medium">
                    Upload Video
                  </span>
                </button>

                <div className="border-t border-neutral-800" />

                <button
                  onClick={() => {
                    setShowUploadMenu(false);
                    setView('DRAFTS');
                  }}
                  className="w-full flex items-center gap-3 
                             px-4 py-3 hover:bg-neutral-800 
                             transition-colors">
                  <div className="w-8 h-8 bg-orange-500/20 rounded-full 
                                  flex items-center justify-center">
                    <span className="text-lg">🎬</span>
                  </div>
                  <span className="text-white text-sm font-medium">
                    My Drafts
                  </span>
                </button>
              </div>
            )}
          </div>
        )}

        <BottomNav 
          view={view} 
          setView={handleSetView} 
          user={user} 
          onOpenAuth={() => setShowAuthModal(true)} 
        />

        <AuthModal 
          isOpen={showAuthModal} 
          onClose={() => setShowAuthModal(false)} 
        />

        {deferredPrompt && (
          <button 
            onClick={async () => {
              deferredPrompt.prompt();
              const { outcome } = await deferredPrompt.userChoice;
              if (outcome === 'accepted') {
                setDeferredPrompt(null);
                console.log('PWA installed');
              }
            }}
            className="fixed bottom-24 right-4 bg-gradient-to-r from-orange-500 to-pink-500 text-white px-5 py-3 rounded-full font-bold shadow-lg z-50 flex items-center gap-2"
          >
            📱 Install App
          </button>
        )}

        {showWelcomeTour && user && (
          <WelcomeTour
            userRole={localStorage.getItem('zenova_brand') ? 'BRAND' : 'CREATOR'}
            onClose={() => setShowWelcomeTour(false)}
          />
        )}
      </div>
    </div>
  );
}
