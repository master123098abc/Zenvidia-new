import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShieldCheck, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from '../lib/toast';

interface SmartPitchModalProps {
  targetUser: any;
  collabType: 'brand_to_creator' | 'brand_to_brand' | 'creator_to_creator';
  currentUser: any;
  onClose: () => void;
  onDealCreated?: (dealId: string) => void;
}

export default function SmartPitchModal({ targetUser, collabType, currentUser, onClose, onDealCreated }: SmartPitchModalProps) {
  const [basePay, setBasePay] = useState(1500);
  const [bonusRate, setBonusRate] = useState(50);
  const [introMessage, setIntroMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isFreeCollab = collabType === 'creator_to_creator' || collabType === 'brand_to_brand';

  const estimatedBonus = (10000 / 100) * bonusRate;
  const totalEstimate = basePay + estimatedBonus;

  const targetName = collabType === 'brand_to_brand' ? targetUser.business_name : targetUser.ig_handle;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      let brand_id = null;
      let creator_id = null;
      let brand_name = '';
      let creator_handle = targetName;
      
      const localBrandStr = localStorage.getItem('zenova_brand');
      const localHandle = localStorage.getItem('zenova_handle');
      
      if (collabType === 'brand_to_creator' || collabType === 'brand_to_brand') {
        const localBrand = localBrandStr ? JSON.parse(localBrandStr) : null;
        if (!localBrand) throw new Error('You must be logged in as a brand to do this');
        brand_id = localBrand.id;
        brand_name = localBrand.business_name;
        // if brand_to_creator, set creator_id referencing creators table
        if (collabType === 'brand_to_creator') creator_id = targetUser.id;
      } else {
        if (!localHandle) throw new Error('You must be logged in as a creator to do this');
        creator_id = targetUser.id;
        brand_name = `@${localHandle}`; // Use handle directly as sender name
      }

      const initialMessageText = isFreeCollab 
        ? introMessage || "Hi! I'd like to propose a free networking collaboration."
        : `New offer: ₹${basePay} advance + ₹${bonusRate} per 500 views`;

      const dealData: any = {
        sender_id: currentUser?.id,
        receiver_id: targetUser?.user_id,
        brand_id,
        creator_id,
        brand_name,
        creator_handle,
        deal_title: isFreeCollab ? 'Networking Request' : 'Collaboration Offer',
        deal_value: isFreeCollab ? 'Free Collab' : `₹${basePay} advance + ₹${bonusRate}/500 views`,
        status: isFreeCollab ? 'pending' : 'offered',
        collab_type: collabType,
        base_pay: isFreeCollab ? 0 : basePay,
        view_bonus_per_500: isFreeCollab ? 0 : bonusRate,
        last_message: JSON.stringify([{
          sender: brand_name,
          text: initialMessageText,
          timestamp: Date.now()
        }]),
        updated_at: new Date().toISOString()
      };

      const { data: newDeal, error: insertError } = await supabase
        .from('deals')
        .insert(dealData)
        .select()
        .single();

      if (insertError) throw insertError;
      
      if (newDeal && currentUser?.id) {
        await supabase.from('messages').insert({
          deal_id: newDeal.id,
          sender_id: currentUser.id,
          content: initialMessageText
        });
      }

      onClose();
      toast('Offer sent successfully!', 'success');
      if (onDealCreated && newDeal) {
        onDealCreated(newDeal.id);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to create deal');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />
        <motion.div 
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.95 }}
          className="relative w-full max-w-lg overflow-hidden bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl rounded-3xl"
        >
          {/* Header */}
          <div className="p-6 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold">{isFreeCollab ? 'Connect with' : 'Offer for'} {targetName}</h2>
              {!isFreeCollab && (
                <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 mt-1">
                  <ShieldCheck className="w-4 h-4" /> Escrow Protection
                </div>
              )}
            </div>
            <button onClick={onClose} className="p-2 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-8">
            {error && (
              <div className="p-3 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-xl text-sm font-medium">
                {error}
              </div>
            )}

            {isFreeCollab ? (
              <div className="space-y-4">
                <label className="font-bold">Introductory Message</label>
                <textarea 
                  value={introMessage} 
                  onChange={e => setIntroMessage(e.target.value)}
                  placeholder="Hi! I'd love to connect and see if we can collaborate..."
                  className="w-full h-32 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 focus:ring-1 focus:ring-cyan-500 resize-none font-medium"
                />
              </div>
            ) : (
              <>
                {/* Advance Pay Slider */}
                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <div className="space-y-1">
                      <label className="font-bold">Advance Payment</label>
                      <p className="text-xs text-neutral-500">Paid upfront before work begins</p>
                    </div>
                    <div className="text-xl font-display font-black text-cyan-600 dark:text-cyan-400">
                      ₹{basePay.toLocaleString()}
                    </div>
                  </div>
                  <input 
                    type="range" 
                    min={500} 
                    max={50000} 
                    step={500} 
                    value={basePay} 
                    onChange={(e) => setBasePay(Number(e.target.value))}
                    className="w-full accent-cyan-500"
                  />
                </div>

                {/* Performance Bonus Slider */}
                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <div className="space-y-1">
                      <label className="font-bold">Bonus per 100 Views</label>
                      <p className="text-xs text-neutral-500">Auto-calculated after 3 days</p>
                    </div>
                    <div className="text-xl font-display font-black text-orange-500">
                      ₹{bonusRate}
                    </div>
                  </div>
                  <input 
                    type="range" 
                    min={0} 
                    max={500} 
                    step={10} 
                    value={bonusRate} 
                    onChange={(e) => setBonusRate(Number(e.target.value))}
                    className="w-full accent-orange-500"
                  />
                  <div className="p-3 bg-orange-50 dark:bg-orange-500/10 rounded-xl text-xs text-orange-800 dark:text-orange-300 font-medium border border-orange-200 dark:border-orange-500/20">
                    Live Preview: If reel gets 10,000 views in 3 days → ₹{estimatedBonus.toLocaleString()} bonus
                  </div>
                </div>

                {/* Total Estimate */}
                <div className="p-5 bg-neutral-50 dark:bg-neutral-950 rounded-2xl border border-neutral-200 dark:border-neutral-800">
                  <div className="space-y-2 text-sm font-medium">
                    <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                      <span>Advance:</span>
                      <span>₹{basePay.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                      <span>Est. Bonus (10k views):</span>
                      <span>₹{estimatedBonus.toLocaleString()}</span>
                    </div>
                    <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800 flex justify-between text-lg font-black font-display mt-2">
                      <span>Total Est.:</span>
                      <span className="bg-gradient-to-r from-cyan-500 to-orange-500 text-transparent bg-clip-text">
                        ₹{totalEstimate.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}

            <button 
              onClick={handleSubmit} 
              disabled={isSubmitting}
              className="w-full shimmer-btn py-4 rounded-xl font-bold bg-gradient-to-r from-cyan-500 to-orange-500 text-white shadow-lg hover:shadow-cyan-500/25 transition-all flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</>
              ) : (
                isFreeCollab ? <>Send Request</> : <>Fund Escrow & Send</>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
