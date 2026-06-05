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
  | 'CREATOR_PROFILE';

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
  const isHandlingSession = useRef(false);

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
      const roleIntent = localStorage.getItem('zenvidia_role_intent');
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
      toast('Could not load profile. Please refresh.', 'error');
      setUser(authUser);
      
      // Final safety check before onboarding
      const stillCachedBrand = localStorage.getItem('zenova_brand');
      const stillCachedCreator = localStorage.getItem('zenova_creator');
      if (!stillCachedBrand && !stillCachedCreator) {
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
        if (!localStorage.getItem('zenova_db_cleared_v2')) {
          await supabase.auth.signOut();
          localStorage.clear();
          sessionStorage.clear();
          localStorage.setItem('zenova_db_cleared_v2', 'true');
          setLoading(false);
          return;
        }

        const timeoutPromise = new Promise((resolve) =>
          setTimeout(() => resolve({ data: { session: null } }), 3000)
        );
        const sessionPromise = supabase.auth.getSession();
        
        const { data: { session } } = await Promise.race([
          sessionPromise,
          timeoutPromise
        ]) as any;

        if (session?.user) {
          console.log('AUTH session found');
          // Removed setUser(session.user) here to only mark as logged in after profile load
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
              onOpenAuth={() => setShowAuthModal(true)} 
              onDealCreated={handleDealCreated}
              onCreatorClick={(creator) => {
                setSelectedCreatorForProfile(creator);
                setProfileReturnView('HOME');
                setView('CREATOR_PROFILE');
              }}
            />
          )}
            
          {view === 'ONBOARDING' && <Onboarding user={user} setView={handleSetView} />}
          {view === 'BRAND_DASHBOARD' && <div className="p-8 text-center text-2xl">Brand Dashboard</div>}
          {view === 'CREATOR_PORTAL' && (
            <div className="p-6 md:p-8 space-y-8">
              {/* Creator dashboard top header / links / video feed will be here */}
              {localStorage.getItem('zenova_creator') && (() => {
                const creatorData = JSON.parse(localStorage.getItem('zenova_creator') || '{}');
                return (
                  <>
                    <CreatorProfileHeader creator={creatorData} />
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
