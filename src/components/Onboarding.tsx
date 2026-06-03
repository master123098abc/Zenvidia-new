import { useState, useEffect, useRef, ChangeEvent } from 'react';
import { supabase } from '../lib/supabase';
import { fetchAndSaveYouTubeShorts } from '../lib/youtube';
import { Loader2, User as UserIcon, Building2, CheckCircle2, Camera } from 'lucide-react';
import { View } from '../App';

interface OnboardingProps {
  user: any;
  setView: (v: View) => void;
}

const NICHE_OPTIONS = [
  'Fashion', 'Food', 'Tech', 'Travel', 'Beauty', 
  'Fitness', 'Gaming', 'Lifestyle', 'Other'
];

const LANGUAGE_OPTIONS = [
  'Assamese', 'Bengali', 'Hindi', 'English', 
  'Bodo', 'Mising', 'Manipuri', 'Other'
];

const BUSINESS_TYPE_OPTIONS = [
  'Restaurant/Food', 'Fashion/Clothing', 
  'Beauty/Salon', 'Tech/App', 'Education',
  'Health/Fitness', 'Entertainment',
  'Retail/Shop', 'Other'
];

const BUDGET_OPTIONS = [
  'Under ₹5,000',
  '₹5,000 – ₹20,000',
  '₹20,000 – ₹50,000',
  '₹50,000+'
];

export default function Onboarding({ user, setView }: OnboardingProps) {
  const [role, setRole] = useState<'creator' | 'brand' | null>(null);
  
  // Common
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profileUrl, setProfileUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [success, setSuccess] = useState(false);

  // Creator fields
  const [fullName, setFullName] = useState('');
  const [igHandle, setIgHandle] = useState('');
  const [followerCount, setFollowerCount] = useState('');
  const [primaryNiche, setPrimaryNiche] = useState('');
  const [secondaryNiche, setSecondaryNiche] = useState('');
  const [primaryLanguage, setPrimaryLanguage] = useState('');
  const [secondaryLanguage, setSecondaryLanguage] = useState('');
  const [city, setCity] = useState('');
  const [dealType, setDealType] = useState('paid');
  const [beholdFeedId, setBeholdFeedId] = useState('');
  const [igUrl, setIgUrl] = useState('');
  const [ytUrl, setYtUrl] = useState('');

  // Brand fields
  const [phone, setPhone] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [budget, setBudget] = useState('');
  const [email, setEmail] = useState(user?.email || '');

  useEffect(() => {
    const intendedRole = localStorage.getItem('zenvidia_role_intent') as 'creator' | 'brand';
    if (intendedRole) setRole(intendedRole);
  }, []);

  const handlePhotoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      console.log("SENDING TO CLOUD:", import.meta.env.VITE_CLOUDINARY_CLOUD_NAME);
      console.log("USING PRESET:", import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);

      const response = await fetch(`https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      console.log("CLOUDINARY RESPONSE:", data);

      if (!response.ok) {
        throw new Error(data.error?.message || "Upload failed");
      }
      
      setProfileUrl(data.secure_url);
    } catch (err: any) {
      console.error("Detailed Error:", err);
      alert("Photo upload failed: " + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const isCreatorValid = fullName && igHandle && igUrl && followerCount && primaryNiche && primaryLanguage;
  const isBrandValid = phone.length === 10 && businessName && businessType;

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmitting(true);

    try {
      if (role === 'creator') {
        const payload: any = {
          user_id: user.id,
          ig_handle: igHandle,
          follower_count: parseInt(followerCount) || 0,
          profile_url: profileUrl,
          niche: primaryNiche,
          primary_niche: primaryNiche || null,
          secondary_niche: secondaryNiche || null,
          primary_language: primaryLanguage || null,
          secondary_language: secondaryLanguage || null,
          ig_url: igUrl || null,
          yt_url: ytUrl || null,
          behold_feed_id: beholdFeedId || null,
          status: 'pending'
        };

        console.log("Saving creator:", payload);

        const { data: existingCreator } = await supabase
          .from('creators')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        let error;
        if (existingCreator) {
          const { error: updateError } = await supabase
            .from('creators')
            .update(payload)
            .eq('user_id', user.id);
          error = updateError;
        } else {
          const { error: insertError } = await supabase
            .from('creators')
            .insert(payload);
          error = insertError;
        }
        
        if (error) throw error;
        localStorage.setItem('zenova_handle', igHandle);
        localStorage.setItem('zenova_creator', JSON.stringify({ ig_handle: igHandle, user_id: user.id }));
        
        const { data: newCreator } = await supabase
          .from('creators')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (newCreator?.id && ytUrl) {
          try {
            await fetchAndSaveYouTubeShorts(newCreator.id, ytUrl).catch(err => {
              console.warn('YT fetch failed:', err.message);
            });
          } catch (err: any) {
            console.warn('YT fetch failed:', err.message);
          }
        }
        
        setSuccess(true);
        setTimeout(() => setView('CREATOR_PORTAL'), 2000);
      } else {
        const brandPayload = {
          user_id: user.id,
          business_name: businessName,
          business_type: businessType,
          budget: budget || null,
          phone: phone,
          city: city,
          ig_handle: igHandle,
          profile_url: profileUrl,
          email: email || user.email,
          status: 'active'
        };

        const { data: existingBrand } = await supabase
          .from('brands')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        let error;
        if (existingBrand) {
          const { error: updateError } = await supabase
            .from('brands')
            .update(brandPayload)
            .eq('user_id', user.id);
          error = updateError;
        } else {
          const { error: insertError } = await supabase
            .from('brands')
            .insert(brandPayload);
          error = insertError;
        }
        
        if (error) throw error;
        console.log('PROFILE_SAVED');
        localStorage.setItem('zenova_brand', JSON.stringify({ business_name: businessName, user_id: user.id }));
        setView('BRAND_DASHBOARD');
      }
    } catch (err: any) {
      console.error("Detailed Error:", err);
      alert('Failed to save profile. ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success && role === 'creator') {
    return (
      <div className="max-w-md mx-auto mt-20 p-8 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-xl text-center">
        <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h2 className="text-2xl font-black font-display mb-2">Profile Submitted!</h2>
        <p className="text-neutral-600 dark:text-neutral-400">
          Our team will review and approve within 24 hours. You'll be notified once approved.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto mt-10 mb-20 p-6 md:p-8 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-xl">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-black font-display">
          {!role ? 'Complete Your Profile' : (role === 'creator' ? '🎨 Create Your Profile' : '🏢 Set Up Your Brand')}
        </h2>
        {role && (
          <span className="text-sm font-bold text-neutral-400">Step 1 of 1</span>
        )}
      </div>

      {!role ? (
        <div className="space-y-4">
          <p className="text-neutral-500 mb-4 font-medium">How do you want to use Zenvidia?</p>
          <button 
            onClick={() => setRole('creator')}
            className="w-full flex items-center justify-center gap-3 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:border-cyan-500 hover:bg-cyan-50 dark:hover:bg-cyan-900/10 transition-colors font-bold group"
          >
            <UserIcon className="w-5 h-5 text-cyan-500 group-hover:scale-110 transition-transform" />
            I'm a Creator
          </button>
          <button 
            onClick={() => setRole('brand')}
            className="w-full flex items-center justify-center gap-3 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:border-pink-500 hover:bg-pink-50 dark:hover:bg-pink-900/10 transition-colors font-bold group"
          >
            <Building2 className="w-5 h-5 text-pink-500 group-hover:scale-110 transition-transform" />
            I'm a Brand
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Common Photo Upload */}
          <div className="flex flex-col items-center justify-center mb-8">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="w-20 h-20 rounded-full bg-neutral-100 dark:bg-neutral-800 border-2 border-dashed border-neutral-300 dark:border-neutral-700 flex items-center justify-center cursor-pointer relative overflow-hidden group hover:border-cyan-500 transition-colors mx-auto"
            >
              {profileUrl ? (
                <img src={profileUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : isUploading ? (
                <div className="flex flex-col items-center justify-center">
                  <Loader2 className="w-6 h-6 text-cyan-500 animate-spin mb-1" />
                  <span className="text-[8px] font-bold text-cyan-600 dark:text-cyan-400">UPLOADING</span>
                </div>
              ) : (
                <Camera className="w-8 h-8 text-neutral-400 group-hover:text-cyan-500 transition-colors" />
              )}
              {profileUrl && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="w-8 h-8 text-white" />
                </div>
              )}
            </div>
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handlePhotoUpload}
            />
            <p className="mt-3 text-sm font-bold text-neutral-600 dark:text-neutral-400">
              {role === 'creator' ? 'Profile Photo' : 'Brand Logo / Photo'} <span className="text-red-500">*</span>
            </p>
          </div>

          {role === 'creator' ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold mb-2">
                    Instagram Handle <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400">@</span>
                    <input 
                      type="text" required
                      value={igHandle} onChange={e => setIgHandle(e.target.value.replace('@',''))}
                      placeholder="yourhandle"
                      className="w-full pl-8 pr-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 focus:ring-1 focus:ring-cyan-500 bg-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2">
                    Instagram Profile URL <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="url" required
                    value={igUrl} onChange={e => setIgUrl(e.target.value)}
                    placeholder="https://instagram.com/yourhandle"
                    className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 focus:ring-1 focus:ring-cyan-500 bg-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2">
                    YouTube Channel URL <span className="text-neutral-400 text-sm ml-1">(Optional)</span>
                  </label>
                  <input
                    type="url"
                    value={ytUrl} onChange={e => setYtUrl(e.target.value)}
                    placeholder="https://youtube.com/@yourchannel"
                    className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 focus:ring-1 focus:ring-cyan-500 bg-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2">
                    Follower Count <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="number" required min="0"
                    value={followerCount} onChange={e => setFollowerCount(e.target.value)}
                    placeholder="e.g. 10000"
                    className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 focus:ring-1 focus:ring-cyan-500 bg-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold mb-2">
                    Primary Niche <span className="text-red-500">*</span>
                  </label>
                  <select required value={primaryNiche} onChange={e => setPrimaryNiche(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 focus:ring-1 focus:ring-cyan-500 bg-transparent [&>option]:text-black dark:[&>option]:text-black">
                    <option value="" disabled>Select niche...</option>
                    {NICHE_OPTIONS.map(n => <option key={`primary-niche-${n}`} value={n}>{n}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">
                    Secondary Niche <span className="text-neutral-400 font-normal ml-1">(Optional)</span>
                  </label>
                  <select value={secondaryNiche} onChange={e => setSecondaryNiche(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 focus:ring-1 focus:ring-cyan-500 bg-transparent [&>option]:text-black dark:[&>option]:text-black">
                    <option value="">None</option>
                    {NICHE_OPTIONS.map(n => <option key={`secondary-niche-${n}`} value={n}>{n}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">
                    Primary Language <span className="text-red-500">*</span>
                  </label>
                  <select required value={primaryLanguage} onChange={e => setPrimaryLanguage(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 focus:ring-1 focus:ring-cyan-500 bg-transparent [&>option]:text-black dark:[&>option]:text-black">
                    <option value="" disabled>Select language...</option>
                    {LANGUAGE_OPTIONS.map(l => <option key={`primary-language-${l}`} value={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">
                    Secondary Language <span className="text-neutral-400 font-normal ml-1">(Optional)</span>
                  </label>
                  <select value={secondaryLanguage} onChange={e => setSecondaryLanguage(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 focus:ring-1 focus:ring-cyan-500 bg-transparent [&>option]:text-black dark:[&>option]:text-black">
                    <option value="">None</option>
                    {LANGUAGE_OPTIONS.map(l => <option key={`secondary-language-${l}`} value={l}>{l}</option>)}
                  </select>
                </div>
              </div>

              <div className="pt-6 border-t border-neutral-100 dark:border-neutral-800">
                <h3 className="block text-lg font-bold mb-1">📸 Connect Instagram Reels <span className="text-neutral-400 font-normal text-sm ml-1">(Optional)</span></h3>
                <p className="text-sm text-neutral-500 mb-3">Get your Feed ID from behold.so to show your reels on your profile.</p>
                <input 
                  type="text"
                  value={beholdFeedId} onChange={e => setBeholdFeedId(e.target.value)}
                  placeholder="Paste Feed ID e.g. ABC123"
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 focus:ring-1 focus:ring-cyan-500 bg-transparent font-mono"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold mb-2">
                    Business Name <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="text" required
                    value={businessName} onChange={e => setBusinessName(e.target.value)}
                    placeholder="e.g. Priya's Kitchen"
                    className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 focus:ring-1 focus:ring-pink-500 bg-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 font-medium">+91</span>
                    <input 
                      type="tel" required pattern="[0-9]{10}" maxLength={10}
                      value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                      placeholder="9876543210"
                      className="w-full pl-12 pr-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 focus:ring-1 focus:ring-pink-500 bg-transparent"
                    />
                  </div>
                  {phone.length > 0 && phone.length !== 10 && (
                     <p className="text-xs text-red-500 mt-1">Valid 10-digit phone number is required</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">
                    Business Type <span className="text-red-500">*</span>
                  </label>
                  <select required value={businessType} onChange={e => setBusinessType(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 focus:ring-1 focus:ring-pink-500 bg-transparent [&>option]:text-black dark:[&>option]:text-black">
                    <option value="" disabled>Select business type...</option>
                    {BUSINESS_TYPE_OPTIONS.map(b => <option key={`business-type-${b}`} value={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">
                    Email <span className="text-neutral-400 font-normal ml-1">(Optional)</span>
                  </label>
                  <input 
                    type="email"
                    value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="contact@brand.com"
                    className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 focus:ring-1 focus:ring-pink-500 bg-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-neutral-100 dark:border-neutral-800 pt-6">
                <div>
                  <label className="block text-sm font-bold mb-2">
                    Instagram Handle <span className="text-neutral-400 font-normal ml-1">(Optional)</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400">@</span>
                    <input 
                      type="text"
                      value={igHandle} onChange={e => setIgHandle(e.target.value.replace('@',''))}
                      placeholder="yourbrand"
                      className="w-full pl-8 pr-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 focus:ring-1 focus:ring-pink-500 bg-transparent"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">
                    City <span className="text-neutral-400 font-normal ml-1">(Optional)</span>
                  </label>
                  <input 
                    type="text"
                    value={city} onChange={e => setCity(e.target.value)}
                    placeholder="e.g. Guwahati"
                    className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 focus:ring-1 focus:ring-pink-500 bg-transparent"
                  />
                </div>
                 <div>
                  <label className="block text-sm font-bold mb-2">
                    Budget Range <span className="text-neutral-400 font-normal ml-1">(Optional)</span>
                  </label>
                  <select value={budget} onChange={e => setBudget(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 focus:ring-1 focus:ring-pink-500 bg-transparent [&>option]:text-black dark:[&>option]:text-black">
                    <option value="">Select budget...</option>
                    {BUDGET_OPTIONS.map(b => <option key={`budget-${b}`} value={b}>{b}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          <div className="pt-6">
            <button 
              type="submit"
              disabled={isSubmitting || isUploading || !profileUrl || (role === 'creator' ? !isCreatorValid : !isBrandValid)}
              className="w-full flex items-center justify-center py-4 rounded-xl bg-gradient-to-r from-neutral-900 to-neutral-800 dark:from-white dark:to-neutral-200 text-white dark:text-neutral-900 font-bold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:from-neutral-200 disabled:to-neutral-200 dark:disabled:from-neutral-800 dark:disabled:to-neutral-800 disabled:text-neutral-400 shadow-lg text-lg"
            >
              {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Complete Profile →'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
