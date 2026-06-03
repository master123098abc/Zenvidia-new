import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Send, ArrowLeft, Loader2, CheckCircle2, XCircle, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { sounds } from '../lib/sounds';
import { toast } from '../lib/toast';

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
