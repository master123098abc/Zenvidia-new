import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, Mail, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import TermsModal from './TermsModal';
import { toast } from '../lib/toast';
import { sounds } from '../lib/sounds';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [activeTab, setActiveTab] = useState<'brand' | 'creator'>('creator');
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [showTerms, setShowTerms] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setError('');
      setPassword('');
      // Keep email and tab
    }
  }, [isOpen]);

  const handleGoogleAuth = async () => {
    try {
      console.log('AUTH_START');
      localStorage.setItem('zenvidia_role_intent', activeTab);
      localStorage.setItem('zenova_remember_me', rememberMe ? 'true' : 'false');
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        }
      });
    } catch (e: any) {
      console.log('AUTH_FAILED');
      console.error("Google Auth Error", e);
      sounds.playPop();
      toast('Google Auth Failed', 'error');
    }
  };

  const handleEmailAuth = async (e: any) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      console.log('AUTH_START');
      localStorage.setItem('zenvidia_role_intent', activeTab);
      
      if (isLogin) {
        localStorage.setItem('zenova_remember_me', rememberMe ? 'true' : 'false');
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (signInError) throw signInError;
        
        console.log('AUTH_SUCCESS');
        sounds.playSuccess();
        toast('Logged in successfully', 'success');
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password
        });
        if (signUpError) throw signUpError;

        console.log('AUTH_SUCCESS');

        sounds.playSuccess();
        toast('Account created', 'success');
      }
      onClose();
    } catch (err: any) {
      console.log('AUTH_FAILED');
      sounds.playPop();
      setError(err.message || 'Authentication failed');
      toast(err.message || 'Authentication failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl overflow-hidden shadow-2xl border border-neutral-200 dark:border-neutral-800"
        >
          <div className="flex items-center justify-between p-6 border-b border-neutral-100 dark:border-neutral-800">
            <h2 className="text-2xl font-black font-display font-bold">Welcome</h2>
            <button 
              onClick={onClose}
              className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <X className="w-5 h-5 text-neutral-500" />
            </button>
          </div>

          <div className="p-6">
            {/* Role Tabs */}
            <div className="flex p-1 bg-neutral-100 dark:bg-neutral-800 rounded-2xl mb-8">
              <button
                onClick={() => setActiveTab('brand')}
                className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${
                  activeTab === 'brand' 
                    ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-sm' 
                    : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                }`}
              >
                🏢 I'm a Brand
              </button>
              <button
                onClick={() => setActiveTab('creator')}
                className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${
                  activeTab === 'creator' 
                    ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-sm' 
                    : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                }`}
              >
                🎨 I'm a Creator
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <button
                onClick={handleGoogleAuth}
                className="w-full flex items-center justify-center gap-3 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white p-4 rounded-2xl font-bold transition-all"
              >
                <div className="w-5 h-5 shrink-0 bg-white rounded-full flex items-center justify-center p-0.5 shadow-sm">
                  <svg viewBox="0 0 24 24" className="w-full h-full">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.58c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                </div>
                Continue with Google
              </button>
            </div>

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutral-200 dark:border-neutral-800"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white dark:bg-neutral-900 text-neutral-500 font-medium tracking-wide" style={{ textTransform: 'lowercase' }}>or email</span>
              </div>
            </div>

            <form onSubmit={handleEmailAuth} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm font-medium rounded-xl">
                  {error}
                </div>
              )}
              
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                <input
                  type="email"
                  placeholder="name@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:outline-none transition-all dark:text-white"
                  required
                  autoComplete="off"
                  data-1p-ignore
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:outline-none transition-all dark:text-white"
                  required
                  autoComplete="off"
                  data-1p-ignore
                />
              </div>

              <div className="flex items-center gap-2 px-1">
                <input
                  type="checkbox"
                  id="rememberMe"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-neutral-300 text-cyan-500 focus:ring-cyan-500 bg-transparent"
                />
                <label htmlFor="rememberMe" className="text-sm text-neutral-600 dark:text-neutral-400 font-medium">
                  I agree to the <button type="button" onClick={() => setShowTerms(true)} className="text-cyan-500 hover:underline">Terms & Conditions</button>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading || !rememberMe}
                className="w-full py-4 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-xl font-bold mt-2 disabled:opacity-50 transition-transform active:scale-95"
              >
                {loading ? 'Processing...' : (isLogin ? 'Log In' : 'Sign Up')}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button 
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm text-neutral-500 hover:text-cyan-500 font-medium transition-colors"
              >
                {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Log in'}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
      <TermsModal isOpen={showTerms} onClose={() => setShowTerms(false)} />
    </AnimatePresence>
  );
}
