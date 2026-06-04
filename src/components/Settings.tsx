import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { fetchAndSaveYouTubeShorts } from '../lib/youtube';
import { LogOut, Trash2, Camera, Moon, Sun, ChevronRight, CheckCircle2, Lock, Edit2, AlertCircle } from 'lucide-react';
import { User } from '@supabase/supabase-js';
import { View } from '../App';
import { uploadToCloudinary } from '../lib/cloudinary';
import TermsModal from './TermsModal';

import { toast } from '../lib/toast';

interface SettingsProps {
  user: User | null;
  setView: (v: View) => void;
}

export default function Settings({ user, setView }: SettingsProps) {
  const [role, setRole] = useState<'creator' | 'brand' | null>(null);
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
  const [isDataSaver, setIsDataSaver] = useState(() => localStorage.getItem('zenova_data_saver') === 'true');
  const [profileData, setProfileData] = useState<any>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  
  const [handleChanges, setHandleChanges] = useState<{date: string}[]>([]);
  const [isEditingIgHandle, setIsEditingIgHandle] = useState(false);
  const [hasUnsavedHandle, setHasUnsavedHandle] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user?.id) {
       const changes = JSON.parse(localStorage.getItem(`zenova_ig_changes_${user.id}`) || '[]');
       const validChanges = changes.filter((c: {date: string}) => {
         const past = new Date();
         past.setDate(past.getDate() - 30);
         return new Date(c.date) > past;
       });
       if (changes.length !== validChanges.length) {
         localStorage.setItem(`zenova_ig_changes_${user.id}`, JSON.stringify(validChanges));
       }
       setHandleChanges(validChanges);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    
    const cachedBrand = localStorage.getItem('zenova_brand');
    const cachedCreator = localStorage.getItem('zenova_creator');

    let currentRole: 'brand' | 'creator' | null = null;

    if (cachedBrand) {
      currentRole = 'brand';
      setRole('brand');
      try {
        setProfileData(JSON.parse(cachedBrand));
      } catch {}
    } else if (cachedCreator || localStorage.getItem('zenova_handle')) {
      currentRole = 'creator';
      setRole('creator');
      if (cachedCreator) {
        try {
          setProfileData(JSON.parse(cachedCreator));
        } catch {}
      }
    }

    const fetchProfile = async () => {
      if (!currentRole) return;
      const table = currentRole === 'brand' ? 'brands' : 'creators';
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) console.error('Fetch error:', error.message);
      if (data) {
        setProfileData(data);
        if (currentRole === 'brand') {
          localStorage.setItem('zenova_brand', JSON.stringify(data));
        } else {
          localStorage.setItem('zenova_creator', JSON.stringify(data));
          localStorage.setItem('zenova_handle', data.ig_handle || '');
        }
      }
    };
    
    fetchProfile();
  }, [user]);

  useEffect(() => {
    const handleThemeChange = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    window.addEventListener('themeChanged', handleThemeChange);
    return () => window.removeEventListener('themeChanged', handleThemeChange);
  }, []);

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

  const handleSaveProfile = async () => {
    if (!user || !role) return;
    setIsSaving(true);
    try {
      const table = role === 'brand' ? 'brands' : 'creators';
      
      let payload: any = {};

      if (role === 'creator') {
        payload.primary_niche = profileData.primary_niche;
        payload.primary_language = profileData.primary_language;
        payload.secondary_niche = profileData.secondary_niche;
        payload.secondary_language = profileData.secondary_language;
        payload.ig_url = profileData.ig_url;
        payload.yt_url = profileData.yt_url;
        payload.behold_feed_id = profileData.behold_feed_id;
        payload.ig_handle = profileData.ig_handle;
        if (profileData.niche) payload.niche = profileData.niche;
        console.log("Saving creator:", payload);
      } else {
        payload.city = profileData.city;
        payload.business_name = profileData.business_name;
        payload.business_type = profileData.business_type;
        payload.budget = profileData.budget;
        payload.phone = profileData.phone;
        payload.ig_handle = profileData.ig_handle;
      }

      const { error } = await supabase
        .from(table)
        .update(payload)
        .eq('user_id', user.id);

      if (error) throw error;
      
      if (role === 'creator') {
        if (hasUnsavedHandle) {
          const newChanges = [...handleChanges, { date: new Date().toISOString() }];
          setHandleChanges(newChanges);
          setHasUnsavedHandle(false);
          localStorage.setItem(`zenova_ig_changes_${user.id}`, JSON.stringify(newChanges));
          setIsEditingIgHandle(false);
        }

        const updated = { ...profileData };
        localStorage.setItem('zenova_creator', JSON.stringify(updated));
        localStorage.setItem('zenova_handle', updated.ig_handle || '');
        
        if (profileData.yt_url) {
          try {
            await fetchAndSaveYouTubeShorts(user.id, profileData.yt_url).catch(err => {
              console.warn('YT fetch failed:', err.message);
            });
            console.log('YouTube shorts fetched!');
          } catch (err: any) {
            console.warn('YT fetch failed:', err.message);
          }
        }
      } else {
        localStorage.setItem('zenova_brand', JSON.stringify(profileData));
      }

      toast('Profile saved successfully', 'success');
    } catch (err: any) {
      console.error('Error saving profile:', err);
      alert('Failed to save profile: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !role) return;
    
    setIsUploading(true);
    try {
      const url = await uploadToCloudinary(file, 'image');
      setProfileData({ ...profileData, profile_url: url });
      
      const updateData = { profile_url: url };
      if (role === 'creator') {
        await supabase.from('creators').update(updateData).eq('user_id', user.id);
      } else {
        await supabase.from('brands').update(updateData).eq('user_id', user.id);
      }
    } catch (err: any) {
      console.error('Upload error:', err);
      alert('Photo upload failed: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!currentPassword) return alert("Current password is required");
    if (newPassword !== confirmPassword) return alert("Passwords do not match");
    if (newPassword.length < 8) return alert("Password must be at least 8 characters");
    
    try {
      // 1. Verify current password by attempting sign in
      if (user?.email) {
        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email: user.email,
          password: currentPassword
        });
        if (signInErr) throw new Error("wrong password");
      }

      // 2. Update to new password
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordForm(false);
      console.log('PASSWORD_CHANGED');
      toast('Password updated successfully', 'success');
    } catch (err: any) {
      console.error('Update password error:', err);
      if (err.message.toLowerCase().includes("wrong password") || err.message.toLowerCase().includes("invalid login")) {
        alert("wrong password");
      } else {
        alert("weakh password or " + err.message);
      }
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    try {
      console.log('DELETE_STARTED');
      const userId = user.id;

      // Clean up related data
      await supabase.from('messages').delete().or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);
      await supabase.from('deals').delete().or(`creator_id.eq.${userId},brand_id.eq.${userId}`);
      await supabase.from('youtube_shorts').delete().eq('creator_id', userId);
      await supabase.from('creators').delete().eq('user_id', userId);
      await supabase.from('brands').delete().eq('user_id', userId);

      // Attempt to delete auth user (if RPC exists)
      await supabase.rpc('delete_user');

      // Clear cache, localstorage, session
      localStorage.clear();
      sessionStorage.clear();
      await supabase.auth.signOut();
      
      console.log('DELETE_DONE');
      setShowDeleteConfirm(false);
      toast('Account deleted successfully', 'success');
      setView('HOME');
    } catch (err: any) {
      console.error("Delete account error:", err);
      alert("Error: " + err.message);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('zenova_brand');
    localStorage.removeItem('zenova_handle');
    localStorage.removeItem('zenova_creator');
    localStorage.removeItem('zenova_admin');
    setView('HOME');
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-16rem)] p-4 text-center">
        <Lock className="w-16 h-16 text-neutral-400 mb-6" />
        <h2 className="text-2xl font-black font-display mb-4">Please login to access settings</h2>
        <button 
          onClick={() => { setView('HOME'); document.dispatchEvent(new Event('openAuthModal')); }}
          className="px-6 py-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-full font-bold shadow-lg"
        >
          Log In
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto pb-24 md:pb-8 p-4 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h1 className="text-3xl md:text-5xl font-display font-black mb-8 px-2">Settings</h1>

      {/* SECTION 1: PROFILE */}
      <section className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 mb-6 shadow-sm">
        <h2 className="text-xl font-bold mb-6">Profile</h2>
        
        <div className="flex justify-center mb-8">
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="w-24 h-24 rounded-full bg-neutral-100 dark:bg-neutral-800 border-2 border-dashed border-neutral-300 dark:border-neutral-700 flex items-center justify-center cursor-pointer relative overflow-hidden group hover:border-cyan-500 transition-colors"
          >
            {profileData.profile_url ? (
              <img src={profileData.profile_url} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <Camera className="w-8 h-8 text-neutral-400 group-hover:text-cyan-500" />
            )}
            {(isUploading) && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              </div>
            )}
            <input 
              type="file" accept="image/*" className="hidden" 
              ref={fileInputRef} onChange={handlePhotoUpload}
            />
          </div>
        </div>

        <div className="space-y-4">
          {role === 'creator' && (
            <>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-bold">Instagram Handle</label>
                  {handleChanges.length < 2 ? (
                    <button
                      type="button"
                      onClick={() => setIsEditingIgHandle(!isEditingIgHandle)}
                      className="text-xs font-bold text-cyan-600 dark:text-cyan-400 flex items-center gap-1"
                    >
                      <Edit2 className="w-3 h-3" />
                      {isEditingIgHandle ? 'Cancel' : 'Edit'}
                    </button>
                  ) : (
                    <span className="text-xs font-bold text-neutral-400 flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      Limit Reached (2/month)
                    </span>
                  )}
                </div>
                <input 
                  type="text" 
                  readOnly={!isEditingIgHandle} 
                  value={profileData.ig_handle || ''}
                  onChange={(e) => {
                    setProfileData({...profileData, ig_handle: e.target.value.replace(/^@/, '')});
                    setHasUnsavedHandle(true);
                  }}
                  className={`w-full px-4 py-3 rounded-xl border font-mono ${
                    isEditingIgHandle 
                      ? 'border-cyan-500 focus:ring-1 focus:ring-cyan-500 bg-transparent text-neutral-900 dark:text-white' 
                      : 'border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-950 text-neutral-500'
                  }`}
                />
                {isEditingIgHandle && (
                  <p className="text-xs text-neutral-500 mt-2">
                    You can change your handle {2 - handleChanges.length} more time(s) this month.
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-2">Primary Niche</label>
                  <select 
                    value={profileData.primary_niche || profileData.niche || ''} 
                    onChange={e => setProfileData({...profileData, primary_niche: e.target.value, niche: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 focus:ring-1 focus:ring-cyan-500 bg-transparent [&>option]:text-black"
                  >
                    <option value="Fashion">Fashion</option>
                    <option value="Food">Food</option>
                    <option value="Tech">Tech</option>
                    <option value="Travel">Travel</option>
                    <option value="Beauty">Beauty</option>
                    <option value="Fitness">Fitness</option>
                    <option value="Gaming">Gaming</option>
                    <option value="Lifestyle">Lifestyle</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">Primary Language</label>
                  <select 
                    value={profileData.primary_language || ''} 
                    onChange={e => setProfileData({...profileData, primary_language: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 focus:ring-1 focus:ring-cyan-500 bg-transparent [&>option]:text-black"
                  >
                    <option value="Assamese">Assamese</option>
                    <option value="Bengali">Bengali</option>
                    <option value="Hindi">Hindi</option>
                    <option value="English">English</option>
                    <option value="Bodo">Bodo</option>
                    <option value="Mising">Mising</option>
                    <option value="Manipuri">Manipuri</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">Instagram URL</label>
                <input 
                  type="url" value={profileData.ig_url || ''} 
                  onChange={e => setProfileData({...profileData, ig_url: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 focus:ring-1 focus:ring-cyan-500 bg-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">YouTube URL</label>
                <input 
                  type="url" value={profileData.yt_url || ''} 
                  onChange={e => setProfileData({...profileData, yt_url: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 focus:ring-1 focus:ring-cyan-500 bg-transparent"
                />
                <button
                  type="button"
                  onClick={async () => {
                    if (!profileData?.yt_url || !profileData?.id) {
                      alert('Save YouTube URL first');
                      return;
                    }
                    try {
                      setIsSaving(true);
                      await fetchAndSaveYouTubeShorts(
                        profileData.id, 
                        profileData.yt_url
                      );
                      alert('✅ YouTube Shorts fetched! Check Reels tab.');
                    } catch (err: any) {
                      alert('❌ Failed: ' + err.message);
                    } finally {
                      setIsSaving(false);
                    }
                  }}
                  className="mt-2 w-full py-2 bg-red-500/20 text-red-400 border border-red-500/40 rounded-xl text-sm font-medium"
                >
                  🔄 Fetch YouTube Shorts Now
                </button>
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">Behold Feed ID</label>
                <input 
                  type="text" value={profileData.behold_feed_id || ''} 
                  onChange={e => setProfileData({...profileData, behold_feed_id: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 focus:ring-1 focus:ring-cyan-500 bg-transparent font-mono"
                />
              </div>
            </>
          )}

          {role === 'brand' && (
            <>
              <div>
                <label className="block text-sm font-bold mb-2">Business Name</label>
                <input 
                  type="text" value={profileData.business_name || ''} 
                  onChange={e => setProfileData({...profileData, business_name: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 focus:ring-1 focus:ring-pink-500 bg-transparent"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-2">Business Type</label>
                  <select 
                    value={profileData.business_type || ''} 
                    onChange={e => setProfileData({...profileData, business_type: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 focus:ring-1 focus:ring-pink-500 bg-transparent [&>option]:text-black"
                  >
                    <option value="Restaurant/Food">Restaurant/Food</option>
                    <option value="Fashion/Clothing">Fashion/Clothing</option>
                    <option value="Beauty/Salon">Beauty/Salon</option>
                    <option value="Tech/App">Tech/App</option>
                    <option value="Education">Education</option>
                    <option value="Health/Fitness">Health/Fitness</option>
                    <option value="Entertainment">Entertainment</option>
                    <option value="Retail/Shop">Retail/Shop</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">Budget</label>
                  <select 
                    value={profileData.budget || ''} 
                    onChange={e => setProfileData({...profileData, budget: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 focus:ring-1 focus:ring-pink-500 bg-transparent [&>option]:text-black"
                  >
                    <option value="Under ₹5,000">Under ₹5,000</option>
                    <option value="₹5,000 – ₹20,000">₹5,000 – ₹20,000</option>
                    <option value="₹20,000 – ₹50,000">₹20,000 – ₹50,000</option>
                    <option value="₹50,000+">₹50,000+</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">Phone</label>
                <input 
                  type="tel" value={profileData.phone || ''} 
                  onChange={e => setProfileData({...profileData, phone: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 focus:ring-1 focus:ring-pink-500 bg-transparent"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-2">City</label>
                  <input 
                    type="text" value={profileData.city || ''} 
                    onChange={e => setProfileData({...profileData, city: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 focus:ring-1 focus:ring-pink-500 bg-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">Instagram Handle</label>
                  <input 
                    type="text" value={profileData.ig_handle || ''} 
                    onChange={e => setProfileData({...profileData, ig_handle: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 focus:ring-1 focus:ring-pink-500 bg-transparent text-neutral-500 font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">Email</label>
                <input 
                  type="email" value={profileData.email || ''} 
                  onChange={e => setProfileData({...profileData, email: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 focus:ring-1 focus:ring-pink-500 bg-transparent"
                />
              </div>
            </>
          )}

          <button 
            onClick={handleSaveProfile}
            disabled={isSaving}
            className={`w-full mt-4 py-4 rounded-xl text-white font-bold text-lg hover:shadow-lg transition-all ${role === 'brand' ? 'bg-gradient-to-r from-pink-500 to-orange-400' : 'bg-gradient-to-r from-cyan-500 to-blue-500'} ${isSaving ? 'opacity-50' : ''}`}
          >
            {isSaving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </section>

      {/* SECTION 2: APPEARANCE & PREFERENCES */}
      <section className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 mb-6 shadow-sm">
        <h2 className="text-xl font-bold mb-4">App Preferences</h2>
        <div className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3 font-medium">
            {isDark ? <Moon className="w-5 h-5 text-indigo-400" /> : <Sun className="w-5 h-5 text-amber-500" />}
            Dark Mode
          </div>
          <button 
            onClick={toggleDark}
            className={`w-12 h-6 rounded-full transition-colors flex items-center ${isDark ? 'bg-cyan-500' : 'bg-neutral-300 dark:bg-neutral-600'}`}
          >
            <div className={`w-5 h-5 bg-white rounded-full transition-transform shadow-sm ${isDark ? 'translate-x-6' : 'translate-x-[2px]'}`} />
          </button>
        </div>
        
        <div className="flex items-center justify-between py-4 border-t border-neutral-200 dark:border-neutral-800">
          <div className="flex flex-col gap-1">
            <div className="font-medium flex items-center gap-3">
              <svg className="w-5 h-5 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
              Data Saver Mode
            </div>
            <span className="text-xs text-neutral-500 dark:text-neutral-400 pl-8">Disable video auto-playback on home feed</span>
          </div>
          <button 
            onClick={() => {
              const current = isDataSaver;
              localStorage.setItem('zenova_data_saver', (!current).toString());
              setIsDataSaver(!current);
            }}
            className={`w-12 h-6 min-w-[3rem] rounded-full transition-colors flex items-center ${isDataSaver ? 'bg-cyan-500' : 'bg-neutral-300 dark:bg-neutral-600'}`}
          >
            <div className={`w-5 h-5 bg-white rounded-full transition-transform shadow-sm ${isDataSaver ? 'translate-x-6' : 'translate-x-[2px]'}`} />
          </button>
        </div>
      </section>

      {/* SECTION 3: ACCOUNT */}
      <section className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 mb-6 shadow-sm">
        <h2 className="text-xl font-bold mb-4">Account</h2>
        <div 
          onClick={() => setShowPasswordForm(!showPasswordForm)}
          className="flex items-center justify-between py-4 cursor-pointer hover:opacity-80 transition-opacity"
        >
          <div className="flex items-center gap-3 font-medium">
            <Lock className="w-5 h-5" /> Change Password
          </div>
          <ChevronRight className={`w-5 h-5 transition-transform ${showPasswordForm ? 'rotate-90' : ''}`} />
        </div>
        {showPasswordForm && (
          <div className="pt-2 pb-4 space-y-4 border-t border-neutral-100 dark:border-neutral-800">
            <input 
              type="password" placeholder="Current Password" 
              value={currentPassword} onChange={e => setCurrentPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 focus:ring-1 focus:ring-cyan-500 bg-transparent"
            />
            <input 
              type="password" placeholder="New Password" 
              value={newPassword} onChange={e => setNewPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 focus:ring-1 focus:ring-cyan-500 bg-transparent"
            />
            <input 
              type="password" placeholder="Confirm Password" 
              value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 focus:ring-1 focus:ring-cyan-500 bg-transparent"
            />
            <button 
              onClick={handleUpdatePassword}
              className="px-6 py-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-xl font-bold font-sm"
            >
              Update Password
            </button>
          </div>
        )}
      </section>

      {/* SECTION 4: SUPPORT */}
      <section className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 mb-6 shadow-sm">
        <h2 className="text-xl font-bold mb-4">Support</h2>
        <div className="space-y-1">
          <div className="flex items-center justify-between py-4 border-b border-neutral-100 dark:border-neutral-800 last:border-0 cursor-pointer hover:opacity-80" onClick={() => setActiveModal('TOS')}>
            <div className="flex items-center gap-3 font-medium">📋 Terms of Service</div>
            <ChevronRight className="w-5 h-5 text-neutral-400" />
          </div>
          <div className="flex items-center justify-between py-4 border-b border-neutral-100 dark:border-neutral-800 last:border-0 cursor-pointer hover:opacity-80" onClick={() => setActiveModal('PRIVACY')}>
            <div className="flex items-center gap-3 font-medium">🔒 Privacy Policy</div>
            <ChevronRight className="w-5 h-5 text-neutral-400" />
          </div>
          <div className="flex items-center justify-between py-4 border-b border-neutral-100 dark:border-neutral-800 last:border-0 cursor-pointer hover:opacity-80" onClick={() => setActiveModal('HELP')}>
            <div className="flex items-center gap-3 font-medium">❓ Help & Support</div>
            <ChevronRight className="w-5 h-5 text-neutral-400" />
          </div>
          <div className="flex items-center justify-between py-4 border-b border-neutral-100 dark:border-neutral-800 last:border-0 cursor-pointer hover:opacity-80" onClick={() => setActiveModal('ABOUT')}>
            <div className="flex items-center gap-3 font-medium">ℹ️ About Zenvidia</div>
            <ChevronRight className="w-5 h-5 text-neutral-400" />
          </div>
        </div>
      </section>

      {/* SECTION 5: DANGER ZONE */}
      <section className="bg-white dark:bg-neutral-900 border border-red-200 dark:border-red-900/50 rounded-3xl p-6 shadow-sm">
        <div className="space-y-1">
          <div 
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center justify-between py-4 border-b border-red-100 dark:border-red-900/30 last:border-0 cursor-pointer"
          >
            <div className="flex items-center gap-3 font-medium text-red-500">
              <Trash2 className="w-5 h-5" /> Delete Account
            </div>
          </div>
          <div 
            onClick={handleLogout}
            className="flex items-center justify-between py-4 border-b border-red-100 dark:border-red-900/30 last:border-0 cursor-pointer"
          >
            <div className="flex items-center gap-3 font-medium text-red-400">
              <LogOut className="w-5 h-5" /> Logout
            </div>
          </div>
        </div>
      </section>

      {/* FIXED MODALS */}
      {activeModal === 'TOS' && (
        <TermsModal isOpen={true} onClose={() => setActiveModal(null)} />
      )}
      
      {activeModal && activeModal !== 'TOS' && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 w-full max-w-md rounded-3xl p-6 relative">
            <button onClick={() => setActiveModal(null)} className="absolute top-6 right-6 text-neutral-500 hover:text-black dark:hover:text-white">✕</button>
            {activeModal === 'PRIVACY' && (
              <>
                <h3 className="text-xl font-bold mb-4">Privacy Policy</h3>
                <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed text-sm">
                  We collect only necessary data to operate the platform. Your data is never sold to third parties. Contact us to delete your account.
                </p>
              </>
            )}
            {activeModal === 'HELP' && (
              <>
                <h3 className="text-xl font-bold mb-4">Help & Support</h3>
                <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed text-sm">
                  For support, email us at:<br/>
                  <a href="mailto:support@zenvidia.com" className="text-cyan-500 font-bold block my-2">support@zenvidia.com</a>
                  We respond within 24 hours.
                </p>
              </>
            )}
            {activeModal === 'ABOUT' && (
              <>
                <h3 className="text-xl font-bold mb-4">About Zenvidia</h3>
                <p className="text-neutral-500 text-xs mb-4 font-mono">Version 1.0.0</p>
                <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed text-sm">
                  Zenvidia is Northeast India's first hyperlocal influencer marketplace. Built in Guwahati, Assam.<br/><br/>
                  🏔️ Made with love for the Northeast
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 w-full max-w-sm rounded-3xl p-6 text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold mb-2">Delete Account?</h3>
            <p className="text-neutral-500 mb-6 text-sm">Are you sure? This cannot be undone.</p>
            <div className="flex gap-4">
              <button 
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 font-bold"
              >
                Cancel
              </button>
              <button 
                onClick={handleDeleteAccount}
                className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold"
              >
                Delete Forever
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
