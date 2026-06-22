import { Home, Clapperboard, MessageSquare, User as UserIcon, Plus } from 'lucide-react';
import { View } from '../App';
import { User } from '@supabase/supabase-js';

interface BottomNavProps {
  view: View;
  setView: (v: View) => void;
  user: User | null;
  userRole?: string | null;
  onOpenAuth: () => void;
}

export default function BottomNav({ view, setView, user, userRole, onOpenAuth }: BottomNavProps) {
  const hiddenViews: View[] = ['ONBOARDING', 'ADMIN_DASHBOARD', 'CHAT', 'REELS'];
  
  if (hiddenViews.includes(view)) return null;

  const handleAccountClick = () => {
    if (!user) {
      onOpenAuth();
      return;
    }
    if (userRole === 'BRAND') {
      setView('BRAND_DASHBOARD');
    } else if (userRole === 'CREATOR') {
      setView('CREATOR_PORTAL');
    } else {
      setView('SETTINGS');
    }
  };

  const handleReelsClick = () => {
    setView('REELS');
  };

  const isProfileActive = view === 'SETTINGS' || view === 'BRAND_DASHBOARD' || view === 'CREATOR_PORTAL';

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 pb-[env(safe-area-inset-bottom)] bg-black/90 backdrop-blur-md border-t border-neutral-800 z-40 flex items-center justify-around px-2 text-xs font-medium">
      <button 
        onClick={() => setView('HOME')}
        className={`flex flex-col items-center gap-1 p-2 ${view === 'HOME' ? 'text-white' : 'text-neutral-500 hover:text-white transition-colors'}`}
      >
        <Home className="w-6 h-6" />
        <span className="sr-only">Home</span>
      </button>

      <button 
        onClick={handleReelsClick}
        className="flex flex-col items-center gap-1 p-2 text-neutral-500 hover:text-white transition-colors"
      >
        <Clapperboard className="w-6 h-6" />
        <span className="sr-only">Reels</span>
      </button>

      {userRole === 'BRAND' && (
        <button 
          onClick={() => setView('CREATE_WEBSITE')}
          className={`flex flex-col items-center gap-1 p-2 ${view === 'CREATE_WEBSITE' ? 'text-white' : 'text-neutral-500 hover:text-white transition-colors'}`}
        >
          <Plus className="w-6 h-6" />
          <span className="sr-only">Create Website</span>
        </button>
      )}

      <button 
        onClick={() => setView('INBOX')}
        className={`relative flex flex-col items-center gap-1 p-2 ${view === 'INBOX' ? 'text-white' : 'text-neutral-500 hover:text-white transition-colors'}`}
      >
        <MessageSquare className="w-6 h-6" />
        <span className="sr-only">Messages</span>
        {/* Placeholder for Realtime badge */}
        {/* <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-orange-500 rounded-full border border-black/90"></span> */}
      </button>

      <button 
        onClick={handleAccountClick}
        className={`flex flex-col items-center gap-1 p-2 ${isProfileActive ? 'text-white' : 'text-neutral-500 hover:text-white transition-colors'}`}
      >
        <UserIcon className="w-6 h-6" />
        <span className="sr-only">Account</span>
      </button>
    </div>
  );
}
