import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, Minus, Plus, ShoppingBag } from 'lucide-react';

interface PublicStorePageProps {
  brandHandle: string;
}

export const PublicStorePage: React.FC<PublicStorePageProps> = ({ brandHandle }) => {
  const [brand, setBrand] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Order Modal state
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState('');

  useEffect(() => {
    fetchStore();
  }, [brandHandle]);

  const fetchStore = async () => {
    const { data: b } = await supabase.from('brands').select('*').eq('ig_handle', brandHandle).maybeSingle();
    if (b) {
      setBrand(b);
      const { data: p } = await supabase.from('products').select('*').eq('brand_id', b.id).eq('is_available', true).order('created_at', { ascending: false });
      if (p) setProducts(p);
    }
    setLoading(false);
  };

  const openOrderModal = (product: any) => {
    setSelectedProduct(product);
    setQty(1);
    setNote('');
  };

  const placeOrder = async () => {
    if (!customerName || !customerPhone) {
      alert('Name and Phone are required!');
      return;
    }
    const { data: order, error } = await supabase.from('orders').insert({
      product_id: selectedProduct.id,
      brand_id: brand.id,
      customer_name: customerName,
      customer_phone: customerPhone,
      quantity: qty,
      note: note,
      status: 'pending',
    }).select().single();

    if (error) {
      alert('Failed to place order: ' + error.message);
      return;
    }

    const message = encodeURIComponent(
      `🛍️ New Order from Zenvidia!\n\n` +
      `Customer: ${customerName}\n` +
      `Phone: ${customerPhone}\n` +
      `Item: ${selectedProduct.name} (x${qty})\n` +
      (note ? `Note: ${note}\n` : '') +
      `\nOrder ID: ${order.id.slice(0,8).toUpperCase()}`
    );

    const brandPhone = brand.phone?.replace(/\D/g, '');
    window.open(`https://wa.me/91${brandPhone}?text=${message}`, '_blank');
    alert('✅ Order placed! Opening WhatsApp...');
    setSelectedProduct(null);
  };

  if (loading) {
    return <div className="min-h-screen bg-black flex items-center justify-center text-cyan-500 animate-pulse">Loading Store...</div>;
  }

  if (!brand) {
    return <div className="min-h-screen bg-black flex items-center justify-center text-white">Store not found.</div>;
  }

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* 1. HERO BANNER */}
      <div className="relative h-48 overflow-hidden">
        <img src={brand.store_photos?.[0] || brand.profile_url} className="w-full h-full object-cover" alt="Store Cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        <div className="absolute bottom-0 left-4 translate-y-1/2">
          <img src={brand.profile_url} className="w-20 h-20 rounded-2xl object-cover border-4 border-black shadow-xl" alt="Brand Logo" />
        </div>
      </div>

      {/* 2. BRAND INFO */}
      <div className="px-4 pt-12 pb-4">
        <h1 className="text-2xl font-black text-white">{brand.business_name}</h1>
        <p className="text-neutral-400 text-sm">{brand.business_type} • {brand.city}</p>
      </div>

      {/* 3. PHOTO GALLERY */}
      {brand.store_photos?.length > 1 && (
        <div className="px-4 mb-6">
          <p className="text-neutral-500 text-xs mb-2 font-bold uppercase tracking-wider">Gallery</p>
          <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2">
            {brand.store_photos.slice(1).map((url: string, i: number) => (
              <img key={i} src={url} className="w-24 h-24 rounded-xl object-cover flex-shrink-0 border border-neutral-800" alt={`Gallery ${i}`} />
            ))}
          </div>
        </div>
      )}

      {/* 4. MENU */}
      <div className="px-4">
        <h2 className="text-white font-black text-lg mb-4 flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-cyan-400" /> Menu
        </h2>
        {products.length === 0 ? (
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8 text-center text-neutral-500">
            This store hasn't added products yet.
          </div>
        ) : (
          <div className="space-y-4">
            {products.map(product => (
              <div key={product.id} className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden flex shadow-lg">
                <img src={product.photo_urls?.[0] || product.photo_url || 'https://via.placeholder.com/100'} className="w-28 h-28 object-cover flex-shrink-0" alt={product.name} />
                <div className="flex-1 p-3 flex flex-col justify-between">
                  <div>
                    <p className="text-white font-bold text-base leading-tight mb-1">{product.name}</p>
                    <p className="text-neutral-500 text-xs line-clamp-2">{product.description}</p>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-cyan-400 font-bold">₹{product.price}</span>
                    <button onClick={() => openOrderModal(product)} className="px-4 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-xs font-bold rounded-full shadow-lg shadow-cyan-500/20 active:scale-95 transition-transform">
                      Order
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5. ORDER MODAL */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center animate-in fade-in">
          <div className="bg-neutral-900 w-full sm:w-96 max-h-[90vh] overflow-y-auto sm:rounded-3xl rounded-t-3xl border border-neutral-800 p-6 animate-in slide-in-from-bottom-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-white">Place Order</h3>
              <button onClick={() => setSelectedProduct(null)} className="p-2 bg-neutral-800 rounded-full hover:bg-neutral-700 transition">
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            <div className="flex gap-4 mb-6 bg-black/50 p-3 rounded-2xl border border-neutral-800">
              <img src={selectedProduct.photo_urls?.[0] || selectedProduct.photo_url || 'https://via.placeholder.com/100'} className="w-20 h-20 rounded-xl object-cover" alt="Product" />
              <div>
                <p className="text-white font-bold">{selectedProduct.name}</p>
                <p className="text-cyan-400 font-bold mb-2">₹{selectedProduct.price}</p>
                <div className="flex items-center gap-3 bg-neutral-800 rounded-full w-fit px-1 py-1">
                  <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-6 h-6 bg-neutral-700 rounded-full flex items-center justify-center text-white"><Minus className="w-3 h-3" /></button>
                  <span className="text-white font-bold text-sm w-4 text-center">{qty}</span>
                  <button onClick={() => setQty(qty + 1)} className="w-6 h-6 bg-neutral-700 rounded-full flex items-center justify-center text-white"><Plus className="w-3 h-3" /></button>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-neutral-400 mb-1 ml-1 block">Your Name *</label>
                <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} className="w-full bg-neutral-800 text-white rounded-xl p-3 outline-none focus:ring-2 focus:ring-cyan-500/50" placeholder="Full Name" />
              </div>
              <div>
                <label className="text-xs font-bold text-neutral-400 mb-1 ml-1 block">Phone Number *</label>
                <input type="tel" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className="w-full bg-neutral-800 text-white rounded-xl p-3 outline-none focus:ring-2 focus:ring-cyan-500/50" placeholder="WhatsApp Number" />
              </div>
              <div>
                <label className="text-xs font-bold text-neutral-400 mb-1 ml-1 block">Note (Optional)</label>
                <textarea value={note} onChange={e => setNote(e.target.value)} className="w-full bg-neutral-800 text-white rounded-xl p-3 outline-none h-20 resize-none focus:ring-2 focus:ring-cyan-500/50" placeholder="Any special requests?" />
              </div>
            </div>

            <button onClick={placeOrder} className="w-full mt-6 py-4 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-black rounded-xl shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2">
              Confirm 
            </button>
          </div>
        </div>
      )}

      {/* 6. STICKY BOTTOM CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-neutral-900 border-t border-neutral-800 p-3 flex gap-3 z-40">
        <a href={`tel:${brand.phone}`} className="flex-1 py-3.5 bg-neutral-800 hover:bg-neutral-700 transition text-white text-center rounded-xl text-sm font-bold flex items-center justify-center gap-2">
          📞 Call
        </a>
        <a href={`https://wa.me/91${brand.phone?.replace(/\D/g, '')}`} target="_blank" className="flex-1 py-3.5 bg-green-500 hover:bg-green-600 transition text-white text-center rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-green-500/20">
          💬 WhatsApp
        </a>
      </div>
    </div>
  );
};
