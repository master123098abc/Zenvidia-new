import React, { useState, useEffect } from 'react';
import { getNearbyCreators, startContinuousTracking, stopContinuousTracking } from '../lib/locationService';
import { supabase } from '../lib/supabase';
import { Radar, MapPin, Navigation, UserPlus, AlertCircle, X } from 'lucide-react';

interface NearbyCreator {
  id: string;
  user_id: string;
  full_name: string;
  ig_handle: string;
  profile_url: string;
  distance_km: number;
}

interface CrossPathProps {
  onClose?: () => void;
}

export const CrossPath: React.FC<CrossPathProps> = ({ onClose }) => {
  const [creators, setCreators] = useState<NearbyCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(true);
  const [pulseActive, setPulseActive] = useState(false);
  const [myCoords, setMyCoords] = useState<{lat: number, lon: number} | null>(null);

  // Request Notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Track proximity and trigger notifications
  useEffect(() => {
    const nearby100m = creators.filter(c => c.distance_km <= 0.1);
    if (nearby100m.length > 0) {
      setPulseActive(true);
      if ('Notification' in window && Notification.permission === 'granted') {
        const names = nearby100m.map(c => c.full_name || 'A creator').join(', ');
        new Notification('Creator Nearby!', {
          body: `${names} is within 100m of you.`
        });
      }
    } else {
      setPulseActive(false);
    }
  }, [creators]);

  // Start continuous geolocation tracking and Realtime subscription
  useEffect(() => {
    let userId = '';

    const init = async () => {
       const { data: { session } } = await supabase.auth.getSession();
       if (!session?.user?.id) {
         setError("Not authenticated");
         setLoading(false);
         setScanning(false);
         return;
       }
       userId = session.user.id;

       startContinuousTracking(
         userId,
         (coords, nearby) => {
           setMyCoords({ lat: coords.latitude, lon: coords.longitude });
           setCreators(nearby || []);
           setError(null);
           setLoading(false);
         },
         (err) => {
           setError(err.message);
           setLoading(false);
           setScanning(false);
         }
       );
    };

    init();

    // Setup Supabase Realtime for instant updates when other creators move
    const channel = supabase.channel('public:creators')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'creators' }, async () => {
         // Re-fetch nearby creators if we have coordinates
         if (userId && myCoords) {
           try {
             const nearby = await getNearbyCreators(userId, myCoords.lat, myCoords.lon, 10);
             setCreators(nearby || []);
           } catch {
             // Silently fail if we can't fetch on realtime update
           }
         }
      })
      .subscribe();

    return () => {
      stopContinuousTracking();
      channel.unsubscribe();
    };
  }, [myCoords?.lat, myCoords?.lon]);

  const handleConnect = (creatorName: string) => {
    console.log(`Connection request sent to ${creatorName}`);
    alert(`Connection request sent to ${creatorName}!`);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black text-white px-4 pb-24 pt-safe relative overflow-y-auto flex flex-col min-h-screen">
      {/* Dynamic Background */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-900/20 via-black to-black z-0 pointer-events-none" />
      
      <div className="relative z-10 flex-1 flex flex-col">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-cyan-500/10 flex items-center justify-center border border-cyan-500/30">
                 <Radar className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h1 className="text-2xl font-black bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                  Cross-Path
                </h1>
                <p className="text-neutral-400 text-xs font-medium tracking-wide">
                  DISCOVER NEARBY CREATORS
                </p>
              </div>
            </div>
            {onClose && (
              <button onClick={onClose} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
                <X className="w-5 h-5 text-white" />
              </button>
            )}
          </div>

          {/* Radar UI */}
          <div className="flex justify-center my-8">
            <div className={`relative w-48 h-48 rounded-full border border-cyan-500/30 flex items-center justify-center ${scanning ? 'animate-[spin_4s_linear_infinite]' : ''}`}>
               
               {/* Radar Pulse Animation (<100m) */}
               {pulseActive && (
                 <div className="absolute -inset-4 rounded-full bg-red-500/20 animate-ping z-0" />
               )}

               {/* Radar grids */}
               <div className="absolute inset-4 rounded-full border border-cyan-500/20" />
               <div className="absolute inset-10 rounded-full border border-cyan-500/10" />
               
               {/* Sweep gradient */}
               {scanning && (
                 <div className="absolute inset-0 rounded-full" 
                      style={{ background: 'conic-gradient(from 0deg, transparent 0deg, transparent 270deg, rgba(6, 182, 212, 0.4) 360deg)' }} />
               )}
               
               {/* Center point */}
               <div className={`w-4 h-4 rounded-full shadow-[0_0_15px_rgba(6,182,212,0.8)] z-10 animate-pulse ${pulseActive ? 'bg-red-500 shadow-[0_0_25px_rgba(239,68,68,1)]' : 'bg-cyan-500'}`} />
            </div>
          </div>

          <div className="flex-1 mt-4">
            {error ? (
               <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-center flex flex-col items-center">
                  <AlertCircle className="w-10 h-10 text-red-500 mb-3" />
                  <p className="text-red-200 text-sm">{error}</p>
               </div>
            ) : loading ? (
               <div className="text-center text-cyan-500 animate-pulse mt-10 font-mono text-sm">
                  CALIBRATING SENSORS...
               </div>
            ) : creators.length === 0 ? (
               <div className="text-center text-neutral-500 mt-10 flex flex-col items-center gap-2">
                 <Navigation className="w-8 h-8 opacity-50" />
                 <p className="text-sm">No creators detected in your sector.</p>
               </div>
            ) : (
               <div className="space-y-3 pb-8">
                 <div className="text-xs font-bold text-cyan-500 mb-4 tracking-widest pl-1">
                    {creators.length} CREATOR{creators.length > 1 ? 'S' : ''} DETECTED
                 </div>
                 {creators.map((c, i) => (
                    <div key={c.id || i} 
                         className={`bg-neutral-900 border rounded-2xl p-4 flex gap-4 items-center shadow-lg animate-in slide-in-from-bottom-4 fade-in duration-500 ${c.distance_km <= 0.1 ? 'border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'border-white/5'}`}
                         style={{ animationDelay: `${i * 100}ms` }}
                    >
                       <img 
                         src={c.profile_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'} 
                         className="w-14 h-14 rounded-full object-cover border-2 border-neutral-800"
                         alt={c.full_name}
                       />
                       <div className="flex-1">
                          <h3 className="font-bold text-white text-base leading-none mb-1">
                            {c.full_name || 'Creator'}
                          </h3>
                          <p className="text-cyan-400 text-xs font-medium">@{c.ig_handle || 'unknown'}</p>
                          <div className={`flex items-center gap-1 mt-2 text-[10px] font-bold tracking-wide ${c.distance_km <= 0.1 ? 'text-red-400' : 'text-neutral-500'}`}>
                            <MapPin className="w-3 h-3" />
                            {c.distance_km.toFixed(2)} KM AWAY
                          </div>
                       </div>
                       <button 
                         onClick={() => handleConnect(c.full_name || 'Creator')}
                         className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors border ${c.distance_km <= 0.1 ? 'bg-red-500/10 hover:bg-red-500/20 text-red-500 border-red-500/30' : 'bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border-cyan-500/30'}`}
                       >
                         <UserPlus className="w-4 h-4" />
                       </button>
                    </div>
                 ))}
               </div>
            )}
          </div>
      </div>
    </div>
  );
};
