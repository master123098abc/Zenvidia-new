import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function DebugOverlay({ user }: { user: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const [stats, setStats] = useState({ creators: 0, brands: 0, supabase: 'Checking...', lastError: 'None' });

  useEffect(() => {
    const checkDB = async () => {
      try {
        const { count: cCount, error: cErr } = await supabase.from('creators').select('*', { count: 'exact', head: true });
        const { count: bCount, error: bErr } = await supabase.from('brands').select('*', { count: 'exact', head: true });
        
        setStats({
          creators: cCount || 0,
          brands: bCount || 0,
          supabase: (cErr || bErr) ? 'Error' : 'Connected',
          lastError: cErr?.message || bErr?.message || 'None'
        });
      } catch (err: any) {
        setStats(prev => ({ ...prev, supabase: 'Error', lastError: err.message }));
      }
    };
    checkDB();
    const interval = setInterval(checkDB, 10000);
    return () => clearInterval(interval);
  }, []);

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 left-4 z-50 bg-neutral-800 text-white text-xs px-2 py-1 rounded opacity-50 hover:opacity-100"
      >
        Debug
      </button>
    );
  }

  return (
    <div className="fixed bottom-20 left-4 z-50 bg-black/90 text-green-400 p-4 rounded-xl border border-green-500/30 text-xs w-64 shadow-2xl backdrop-blur font-mono">
      <div className="flex justify-between items-center mb-2 border-b border-green-500/30 pb-2">
        <h3 className="font-bold">DEBUG PANEL</h3>
        <button onClick={() => setIsOpen(false)} className="text-white hover:text-red-400">Close</button>
      </div>
      <div className="space-y-1">
        <p><span className="text-neutral-400">User:</span> {user?.email || 'Guest'}</p>
        <p><span className="text-neutral-400">Supabase:</span> {stats.supabase}</p>
        <p><span className="text-neutral-400">Creators:</span> {stats.creators}</p>
        <p><span className="text-neutral-400">Brands:</span> {stats.brands}</p>
        <p className="break-words"><span className="text-neutral-400">Last DB Err:</span> <span className={stats.lastError !== 'None' ? 'text-red-400' : ''}>{stats.lastError}</span></p>
      </div>
      <div className="mt-4 pt-2 border-t border-green-500/30">
        {user && (
          <button 
            onClick={async () => {
              const { data: creator } = await supabase.from('creators').select('*').eq('user_id', user.id).single();
              const { data: brand } = await supabase.from('brands').select('*').eq('user_id', user.id).single();
              alert(JSON.stringify(creator || brand || { message: 'No profile found' }, null, 2));
            }}
            className="w-full bg-green-500/20 hover:bg-green-500/40 text-green-400 py-1 rounded transition-colors mb-2"
          >
            Dump MY Profile JSON
          </button>
        )}
        <button 
          onClick={async () => {
            const id = prompt("Enter specific creator user_id to fetch:");
            if (!id) return;
            const { data, error } = await supabase.from('creators').select('*').eq('user_id', id).single();
            if (error) {
              alert("Error fetching: " + error.message);
              return;
            }
            alert(JSON.stringify(data, null, 2));
          }}
          className="w-full bg-blue-500/20 hover:bg-blue-500/40 text-blue-400 py-1 rounded transition-colors"
        >
          Fetch Specific Creator ID
        </button>
      </div>
    </div>
  );
}
