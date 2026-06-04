import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Send, ArrowLeft, Loader2, CheckCircle2, XCircle, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { sounds } from '../lib/sounds';
import { toast } from '../lib/toast';
import { generateDealCertificate } from '../lib/generateDealCertificate';

interface ChatInterfaceProps {
  currentUserId: string;
  currentUserRole: 'BRAND' | 'CREATOR' | 'ADMIN';
  currentBrandData: any;
  currentCreatorData: any;
  initialDealId: string | null;
  onClose: () => void;
}

export default function ChatInterface({
  currentUserId,
  currentUserRole,
  currentBrandData,
  currentCreatorData,
  initialDealId,
  onClose
}: ChatInterfaceProps) {
  const [contacts, setContacts] = useState<any[]>([]);
  const [activeChat, setActiveChat] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileListVisible, setIsMobileListVisible] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [showDealPanel, setShowDealPanel] = useState(true);
  const [basePay, setBasePay] = useState(1500);
  const [bonusPer100, setBonusPer100] = useState(50);
  const [dealLocked, setDealLocked] = useState(false);
  const dealUpdateTimer = useRef<any>(null);

  useEffect(() => {
    if (activeChat) {
      setBasePay(activeChat.base_pay || 1500);
      setBonusPer100(activeChat.view_bonus_per_500 || 50);
      setDealLocked(activeChat.status === 'accepted' || activeChat.status === 'completed');
    }
  }, [activeChat?.id, activeChat?.base_pay, activeChat?.view_bonus_per_500, activeChat?.status]);

  useEffect(() => {
    const fetchContacts = async () => {
      setIsLoading(true);
      try {
        let deals: any[] = [];
        if (currentUserRole === 'BRAND' && currentBrandData?.id) {
          const { data } = await supabase.from('deals').select('*')
            .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId},brand_id.eq.${currentBrandData.id}`)
            .order('updated_at', { ascending: false });
          deals = data || [];
        } else if (currentUserRole === 'CREATOR' && currentCreatorData?.id) {
          const { data } = await supabase.from('deals').select('*')
            .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId},creator_id.eq.${currentCreatorData.id}`)
            .order('updated_at', { ascending: false });
          deals = data || [];
        }

        setContacts(deals);

        if (initialDealId) {
          const deal = deals.find(d => d.id === initialDealId);
          if (deal) {
            setActiveChat(deal);
            setIsMobileListVisible(false);
          }
        } else if (deals.length > 0 && window.innerWidth >= 768) {
          setActiveChat(deals[0]);
        }
      } catch (err) {
        console.error('Error fetching contacts:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchContacts();
  }, [currentBrandData, currentCreatorData, initialDealId, currentUserRole]);

  useEffect(() => {
    if (!activeChat?.id) return;
    const dealId = activeChat.id;

    const fetchMessages = async () => {
      // Fetch new messages table history
      const { data } = await supabase.from('messages')
        .select('*')
        .eq('deal_id', dealId)
        .order('created_at', { ascending: true });
        
      let parsedLegacy: any[] = [];
      try {
        parsedLegacy = activeChat.last_message ? JSON.parse(activeChat.last_message) : [];
      } catch { }

      if (data && data.length > 0) {
        // Only include legacy messages that appear to be placed *before* our row's created timestamp (using timestamp key)
        // or just append. Simple approach: legacy + new
        const isLegacyArray = Array.isArray(parsedLegacy) && parsedLegacy.length > 0;
        if (isLegacyArray) {
           // Provide safe backward compatibility
           setMessages([...parsedLegacy, ...data]);
        } else {
           setMessages(data);
        }
      } else {
        setMessages(parsedLegacy);
      }
    };
    
    fetchMessages();

    // REALTIME MAGIC
    const channel = supabase.channel('custom-all-channel')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages', 
        filter: `deal_id=eq.${dealId}` 
      }, (payload) => { 
        setMessages(prev => [...prev, payload.new]);
        if (payload.new.sender_id !== currentUserId) {
          sounds.playPop();
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeChat?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!inputText.trim() || !activeChat) return;
    
    const newMsg = {
      deal_id: activeChat.id,
      sender_id: currentUserId,
      content: inputText.trim()
    };
    
    setInputText('');
    sounds.playSend();

    const { error } = await supabase.from('messages').insert(newMsg);
    if (error) {
      console.error("Error sending message:", error);
      toast('Failed to send message', 'error');
    }
  };

  const updateDealStatus = async (newStatus: string) => {
    if (!activeChat) return;

    const updates: any = { status: newStatus, updated_at: new Date().toISOString() };

    const { error } = await supabase.from('deals').update(updates).eq('id', activeChat.id);
    if (error) {
      toast('Failed to update status', 'error');
    } else {
      if (newStatus === 'accepted') {
        sounds.playSuccess();
        toast('Offer Accepted!', 'success');
      } else if (newStatus === 'rejected') {
        sounds.playPop();
        toast('Offer Declined', 'info');
      } else if (newStatus === 'completed') {
        sounds.playSuccess();
        toast('Deal Completed!', 'success');
      }
    }
  };

  const handleUpdateDealTerms = async (newBasePay: number, newBonus: number) => {
    if (!activeChat?.id || dealLocked) return;
    
    clearTimeout(dealUpdateTimer.current);
    dealUpdateTimer.current = setTimeout(async () => {
      await supabase
        .from('deals')
        .update({ 
          base_pay: newBasePay,
          view_bonus_per_500: newBonus,
          updated_at: new Date().toISOString()
        })
        .eq('id', activeChat.id);
  
      const senderName = currentUserRole === 'BRAND'
        ? currentBrandData?.business_name
        : currentCreatorData?.ig_handle;
      
      const autoMsg = {
        deal_id: activeChat.id,
        sender_id: currentUserId,
        content: `Updated offer terms — Advance: ₹${newBasePay.toLocaleString()}, Bonus: ₹${newBonus} per 100 views`
      };
      
      await supabase.from('messages').insert(autoMsg);
    }, 800);
  };
  
  const handleLockDeal = async () => {
    if (!activeChat?.id) return;
    
    const confirmed = window.confirm(
      `Lock deal?\n\nAdvance: ₹${basePay.toLocaleString()}\nBonus: ₹${bonusPer100} per 100 views\n\nThis cannot be changed after locking.`
    );
    if (!confirmed) return;
  
    await supabase
      .from('deals')
      .update({ 
        status: 'accepted',
        base_pay: basePay,
        view_bonus_per_500: bonusPer100,
        updated_at: new Date().toISOString()
      })
      .eq('id', activeChat.id);
  
    const lockMsg = {
      deal_id: activeChat.id,
      sender_id: currentUserId,
      content: `🔒 Deal locked! ₹${basePay.toLocaleString()} advance + ₹${bonusPer100} per 100 views`
    };
    await supabase.from('messages').insert(lockMsg);
  
    setDealLocked(true);
    toast('Deal Locked!', 'success');
  
    // Generate and download PDF
    generateDealCertificate({
      id: activeChat.id,
      brand_name: activeChat.brand_name || currentBrandData?.business_name || 'Brand',
      creator_handle: activeChat.creator_handle || currentCreatorData?.ig_handle || 'Creator',
      base_pay: basePay,
      view_bonus_per_500: bonusPer100,
      created_at: activeChat.created_at,
      locked_at: new Date().toISOString(),
    });
  
    alert('🔒 Deal Locked!\n✅ Certificate downloaded automatically.');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'offered': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/20';
      case 'accepted': return 'bg-green-500/20 text-green-400 border-green-500/20';
      case 'rejected': return 'bg-red-500/20 text-red-400 border-red-500/20';
      case 'completed': return 'bg-blue-500/20 text-blue-400 border-blue-500/20';
      default: return 'bg-neutral-500/20 text-neutral-400 border-neutral-500/20';
    }
  };

  return (
    <div className="flex h-[calc(100vh-64px)] w-full overflow-hidden bg-neutral-50 dark:bg-black text-neutral-900 dark:text-white">
      {/* Left Panel */}
      <div 
        className={`w-full md:w-80 lg:w-96 flex flex-col border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 transition-transform ${
          !isMobileListVisible ? 'hidden md:flex' : 'flex'
        }`}
      >
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 shrink-0">
          <h2 className="text-xl font-bold font-display tracking-tight">Messages</h2>
        </div>
        
        <div className="flex-1 overflow-y-auto hide-scrollbar">
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
            </div>
          ) : contacts.length === 0 ? (
            <div className="p-8 text-center text-neutral-500 font-medium">
              No conversations yet.
              <p className="text-sm mt-2 font-normal">
                {currentUserRole === 'BRAND' ? 'Send an offer to start chatting' : 'Wait for brands to contact you'}
              </p>
            </div>
          ) : (
            contacts?.map((contact, idx) => {
              const isActive = activeChat?.id === contact.id;
              
              let otherPartyName = '';
              if (contact.sender_id === currentUserId) {
                otherPartyName = contact.creator_handle;
              } else if (contact.receiver_id === currentUserId) {
                otherPartyName = contact.brand_name;
              } else {
                otherPartyName = currentUserRole === 'BRAND' ? contact.creator_handle : contact.brand_name;
              }

              let lastMsgText = '';
              try {
                const msgs = typeof contact.last_message === 'string' ? JSON.parse(contact.last_message) : contact.last_message;
                if (msgs && msgs.length > 0) {
                  lastMsgText = msgs[msgs.length - 1].content || msgs[msgs.length - 1].text;
                }
              } catch (e) {}

              // Avatar logic (first letter)
              const firstLetter = (otherPartyName || '?').charAt(0).toUpperCase();
              
              return (
                <div 
                  key={`deal-${contact.id || ''}-${idx}`}
                  onClick={() => {
                     setActiveChat(contact);
                     setIsMobileListVisible(false);
                  }}
                  className={`p-4 border-b border-neutral-100 dark:border-neutral-800/50 cursor-pointer transition-colors flex items-center gap-3 ${
                    isActive ? 'bg-cyan-50 dark:bg-cyan-950/20 border-l-4 border-l-cyan-500' : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center font-bold font-display text-neutral-500 dark:text-neutral-400 shrink-0">
                    {firstLetter}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-0.5">
                      <span className="font-bold truncate pr-2 text-sm">{otherPartyName || 'Unknown'}</span>
                      <span className="text-[10px] text-neutral-400 whitespace-nowrap">
                        {new Date(contact.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center gap-2">
                       <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate flex-1">
                         {lastMsgText}
                       </p>
                       <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-sm border ${getStatusColor(contact.status)} shrink-0`}>
                         {contact.status || 'pending'}
                       </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Panel */}
      <div 
        className={`flex-1 flex flex-col h-full bg-neutral-50 dark:bg-neutral-950 transition-transform ${
          isMobileListVisible ? 'hidden md:flex' : 'flex'
        }`}
      >
        {activeChat ? (
          <>
            {/* Header */}
            <div className="p-4 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 shrink-0 flex items-center justify-between z-10 shadow-sm">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setIsMobileListVisible(true)}
                  className="md:hidden p-2 -ml-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-lg leading-tight">
                      {activeChat.sender_id === currentUserId ? activeChat.creator_handle : (activeChat.receiver_id === currentUserId ? activeChat.brand_name : (currentUserRole === 'BRAND' ? activeChat.creator_handle : activeChat.brand_name))}
                    </h3>
                    <span className={`hidden md:inline-block text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${getStatusColor(activeChat.status)}`}>
                      {activeChat.status || 'pending'}
                    </span>
                    {(activeChat.status === 'offered' || activeChat.status === 'negotiating') && (
                      <button
                        onClick={() => setShowDealPanel(!showDealPanel)}
                        className="text-xs text-cyan-400 px-3 py-1 bg-cyan-500/20 rounded-full ml-2">
                        💰 {showDealPanel ? 'Hide' : 'Show'} Terms
                      </button>
                    )}
                  </div>
                  <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mt-0.5">
                    {activeChat.deal_value || 'Collaboration Offer'}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 relative z-20">
                {/* Actions */}
                {currentUserRole === 'CREATOR' && activeChat.status === 'offered' && (
                  <div className="flex gap-2">
                    <button 
                      onClick={() => updateDealStatus('accepted')}
                      className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Accept
                    </button>
                    <button 
                      onClick={() => updateDealStatus('rejected')}
                      className="flex items-center gap-1 px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Reject
                    </button>
                  </div>
                )}
                {currentUserRole === 'BRAND' && activeChat.status === 'accepted' && (
                  <button 
                    onClick={() => updateDealStatus('completed')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Mark Complete
                  </button>
                )}
              </div>
            </div>

            {dealLocked && activeChat && (
              <div className="px-4 md:px-6 pt-4 pb-0">
                <button
                  onClick={() => generateDealCertificate({
                    id: activeChat.id,
                    brand_name: activeChat.brand_name || currentBrandData?.business_name || 'Brand',
                    creator_handle: activeChat.creator_handle || currentCreatorData?.ig_handle || 'Creator',
                    base_pay: activeChat.base_pay || basePay,
                    view_bonus_per_500: activeChat.view_bonus_per_500 || bonusPer100,
                    created_at: activeChat.created_at,
                    locked_at: activeChat.updated_at || new Date().toISOString(),
                  })}
                  className="w-full py-2 border border-cyan-500/40 text-cyan-500 dark:text-cyan-400 text-sm font-medium rounded-xl flex items-center justify-center gap-2 mt-2"
                >
                  📄 Download Deal Certificate
                </button>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
              {messages?.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-neutral-400">
                  <p>No messages yet.</p>
                </div>
              ) : (
                messages?.map((msg, idx) => {
                  // Legacy support for JSON stored messages versus new messages table
                  const isMe = msg.sender_id 
                    ? msg.sender_id === currentUserId 
                    : msg.sender === (currentUserRole === 'BRAND' ? currentBrandData?.business_name : currentCreatorData?.ig_handle);
                  
                  return (
                    <motion.div 
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={`msg-${msg.id || ''}-${idx}`} 
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                    >
                      <div className={`max-w-[85%] md:max-w-[70%] rounded-2xl px-4 py-2.5 shadow-sm ${
                        isMe 
                          ? 'bg-cyan-600 text-white rounded-br-none' 
                          : 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-700/50 rounded-bl-none'
                      }`}>
                        <p className="text-[14px] leading-relaxed whitespace-pre-wrap break-words">{msg.content || msg.text}</p>
                      </div>
                      <span className="text-[10px] text-neutral-400 mt-1 font-medium px-1">
                        {new Date(msg.created_at || msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </motion.div>
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Deal Negotiation Panel */}
            {showDealPanel && (activeChat.status === 'offered' || activeChat.status === 'negotiating') && (
              <div className="bg-neutral-900 border-t border-neutral-800 px-4 py-4">
                
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-bold text-sm">
                    💰 Deal Terms
                  </h3>
                  {dealLocked ? (
                    <span className="text-green-400 text-xs font-bold 
                                     bg-green-500/20 px-3 py-1 rounded-full">
                      🔒 Locked
                    </span>
                  ) : (
                    <span className="text-yellow-400 text-xs 
                                     bg-yellow-500/20 px-3 py-1 rounded-full">
                      Negotiating
                    </span>
                  )}
                </div>
              
                {/* SLIDER 1 — Base/Advance Pay */}
                <div className="mb-4">
                  <div className="flex justify-between mb-1">
                    <label className="text-neutral-400 text-xs">
                      Advance Pay
                    </label>
                    <span className="text-cyan-400 font-bold text-sm">
                      ₹{basePay.toLocaleString()}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={500} max={50000} step={500}
                    value={basePay}
                    disabled={dealLocked}
                    onChange={e => {
                      setBasePay(Number(e.target.value));
                      handleUpdateDealTerms(Number(e.target.value), bonusPer100);
                    }}
                    className="w-full h-2 bg-neutral-700 rounded-full 
                               appearance-none cursor-pointer
                               accent-cyan-500 disabled:opacity-50"
                  />
                  <div className="flex justify-between mt-1">
                    <span className="text-neutral-600 text-xs">₹500</span>
                    <span className="text-neutral-600 text-xs">₹50,000</span>
                  </div>
                </div>
              
                {/* SLIDER 2 — Bonus per 100 views */}
                <div className="mb-4">
                  <div className="flex justify-between mb-1">
                    <label className="text-neutral-400 text-xs">
                      Bonus per 100 views
                    </label>
                    <span className="text-orange-400 font-bold text-sm">
                      ₹{bonusPer100}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0} max={500} step={10}
                    value={bonusPer100}
                    disabled={dealLocked}
                    onChange={e => {
                      setBonusPer100(Number(e.target.value));
                      handleUpdateDealTerms(basePay, Number(e.target.value));
                    }}
                    className="w-full h-2 bg-neutral-700 rounded-full 
                               appearance-none cursor-pointer
                               accent-orange-500 disabled:opacity-50"
                  />
                  <div className="flex justify-between mt-1">
                    <span className="text-neutral-600 text-xs">₹0</span>
                    <span className="text-neutral-600 text-xs">₹500</span>
                  </div>
                </div>
              
                {/* CALCULATOR */}
                <div className="bg-neutral-800 rounded-2xl p-3 mb-4">
                  <p className="text-neutral-400 text-xs mb-2">
                    📊 Earnings Calculator
                  </p>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    {[10000, 50000, 100000].map(views => (
                      <div key={views} 
                           className="bg-neutral-900 rounded-xl p-2">
                        <p className="text-neutral-500 text-xs">
                          {views >= 100000 
                            ? (views/100000) + 'L' 
                            : (views/1000) + 'K'} views
                        </p>
                        <p className="text-white font-bold text-sm mt-1">
                          ₹{(basePay + 
                            Math.floor(views / 100) * bonusPer100
                          ).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                  <p className="text-neutral-600 text-xs text-center mt-2">
                    Advance ₹{basePay.toLocaleString()} + 
                    ₹{bonusPer100}/100 views
                  </p>
                </div>
              
                {/* LOCK DEAL BUTTON */}
                {!dealLocked ? (
                  <button
                    onClick={handleLockDeal}
                    className="w-full py-3 bg-gradient-to-r 
                               from-green-500 to-emerald-500
                               text-white font-bold rounded-2xl
                               flex items-center justify-center gap-2">
                    🔒 Lock Deal
                  </button>
                ) : (
                  <div className="w-full py-3 bg-green-500/20 
                                  border border-green-500/40
                                  text-green-400 font-bold rounded-2xl
                                  flex items-center justify-center gap-2">
                    ✅ Deal Locked — ₹{basePay.toLocaleString()} advance
                  </div>
                )}
              </div>
            )}

            {/* Input */}
            <div className="p-3 md:p-4 bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 shrink-0">
              <div className="flex items-center gap-2 max-w-4xl mx-auto">
                <input 
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 bg-transparent px-4 py-3 bg-neutral-100 dark:bg-neutral-800/50 rounded-full border border-neutral-200 dark:border-neutral-800 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 shadow-sm text-sm"
                />
                <button 
                  onClick={sendMessage}
                  disabled={!inputText.trim()}
                  className="p-3 bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 disabled:hover:bg-cyan-500 text-white rounded-full transition-colors shadow-sm focus:outline-none"
                >
                  <Send className="w-5 h-5 -ml-0.5 mt-0.5" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-neutral-400 gap-4 hidden md:flex">
            <div className="w-16 h-16 rounded-full bg-neutral-100 dark:bg-neutral-800/50 flex items-center justify-center">
              <MessageCircle className="w-8 h-8 opacity-50" />
            </div>
            <p className="font-medium font-display text-lg">Select a conversation</p>
          </div>
        )}
      </div>
    </div>
  );
}
