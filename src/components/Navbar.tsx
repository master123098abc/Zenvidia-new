import React, { useState, useEffect } from 'react';
import { Menu, Moon, Sun, ArrowLeft, Search, LogOut } from 'lucide-react';
import { View } from '../App';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface NavbarProps {
  view: View;
  setView: (v: View) => void;
  user: User | null;
  onBack?: () => void;
}

export default function Navbar({ view, setView, user, onBack }: NavbarProps) {
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
  
  useEffect(() => {
    const handleThemeChange = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    window.addEventListener('themeChanged', handleThemeChange);
    return () => window.removeEventListener('themeChanged', handleThemeChange);
  }, []);

  const handleName = localStorage.getItem('zenova_handle');
  const brandData = localStorage.getItem('zenova_brand');
  const brandObj = brandData ? JSON.parse(brandData) : null;
  const isAdmin = localStorage.getItem('zenova_admin') === 'true';

  let displayName = '';
  let icon = '';

  if (isAdmin) {
    displayName = 'Admin';
    icon = '⚡';
  } else if (brandObj) {
    displayName = brandObj.business_name;
    icon = '🏢';
  } else if (handleName) {
    displayName = '@' + handleName;
    icon = '📸';
  }

  const toggleDark = () => {
    const nextDark = !isDark;
    if (nextDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('zenova_dark_mode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('zenova_dark_mode', 'false');
    }
    window.dispatchEvent(new Event('themeChanged'));
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("SignOut error:", err);
    }
    if (brandObj) {
      localStorage.removeItem('zenova_brand');
      localStorage.removeItem('zenova_admin');
    }
    if (handleName) {
      localStorage.removeItem('zenova_handle');
      localStorage.removeItem('zenova_creator');
    }
    if (isAdmin) {
      localStorage.removeItem('zenova_admin');
    }
    setView('HOME');
  };

  return (
    <nav className="sticky top-0 z-40 w-full bg-white/80 dark:bg-neutral-950/80 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800">
      <div className="max-w-7xl mx-auto px-4 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {view !== 'HOME' && (
            <button 
              onClick={() => onBack ? onBack() : setView('HOME')} 
              className="p-2 -ml-2 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-neutral-900 dark:text-white" />
            </button>
          )}
          <div className="flex items-center gap-2">
            <button onClick={() => setView('HOME')} className="font-display font-black uppercase text-xl bg-gradient-to-r from-cyan-500 to-orange-500 text-transparent bg-clip-text tracking-wider">
              ZENVIDIA
            </button>
            {view === 'HOME' && (
              <button onClick={() => window.dispatchEvent(new Event('toggleSearch'))} className="p-2 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors text-neutral-900 dark:text-white">
                <Search className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 md:gap-6">
          {user ? (
            <div className="hidden md:flex items-center gap-4">
              <span className="inline-flex items-center gap-1.5 font-bold text-sm text-neutral-900 dark:text-white bg-neutral-100 dark:bg-neutral-800 px-3 py-1.5 rounded-full">
                {icon} {displayName}
              </span>
              <button 
                onClick={handleLogout}
                className="flex items-center gap-1.5 text-sm font-medium text-neutral-500 hover:text-rose-500 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          ) : (
            <button 
              onClick={() => document.dispatchEvent(new Event('openAuthModal'))}
              className="hidden md:inline-flex items-center justify-center px-4 py-1.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-bold rounded-full transition-transform active:scale-95"
            >
              Log In
            </button>
          )}
          
          <button 
            onClick={toggleDark} 
            className="p-2 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors text-neutral-900 dark:text-white"
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          <button className="md:hidden p-2 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors text-neutral-900 dark:text-white">
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>
    </nav>
  );
}
