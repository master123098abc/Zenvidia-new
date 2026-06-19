import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { uploadToCloudinary } from '../lib/cloudinary';
import { X, Plus, Store } from 'lucide-react';

interface StoreManagerProps {
  brandId: string;
}

export const StoreManager: React.FC<StoreManagerProps> = ({ brandId }) => {
  const [storePhotos, setStorePhotos] = useState<string[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [brandHandle, setBrandHandle] = useState<string>('');

  const [showAddProduct, setShowAddProduct] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [newProductPrice, setNewProductPrice] = useState('');
  const [newProductCategory, setNewProductCategory] = useState('Food');
  const [newProductDesc, setNewProductDesc] = useState('');
  const [newProductPhotos, setNewProductPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchBrandData();
    fetchProducts();
    fetchOrders();
  }, [brandId]);

  const fetchBrandData = async () => {
    const { data } = await supabase.from('brands').select('store_photos, ig_handle').eq('id', brandId).single();
    if (data) {
      setStorePhotos(data.store_photos || []);
      setBrandHandle(data.ig_handle);
    }
  };

  const fetchProducts = async () => {
    const { data } = await supabase.from('products').select('*').eq('brand_id', brandId).order('created_at', { ascending: false });
    if (data) setProducts(data);
  };

  const fetchOrders = async () => {
    const { data } = await supabase.from('orders').select('*').eq('brand_id', brandId).order('created_at', { ascending: false });
    if (data) setOrders(data);
  };

  const removeStorePhoto = async (index: number) => {
    const updated = [...storePhotos];
    updated.splice(index, 1);
    await supabase.from('brands').update({ store_photos: updated }).eq('id', brandId);
    setStorePhotos(updated);
  };

  const triggerPhotoUpload = async (slot: number) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        setUploading(true);
        const url = await uploadToCloudinary(file, 'image');
        const updated = [...storePhotos];
        updated[slot] = url;
        await supabase.from('brands').update({ store_photos: updated.filter(Boolean) }).eq('id', brandId);
        setStorePhotos(updated.filter(Boolean));
      } catch (err) {
        alert('Upload failed');
      } finally {
        setUploading(false);
      }
    };
    input.click();
  };

  const addProductPhoto = async () => {
    if (newProductPhotos.length >= 3) {
      alert('Max 3 photos per product allowed.');
      return;
    }
    const totalMenuPhotos = products.reduce((sum, p) => sum + (p.photo_urls?.length || (p.photo_url ? 1 : 0)), 0);
    if (totalMenuPhotos + newProductPhotos.length >= 15) {
      alert('Photo limit reached (15 max). Delete a product photo first.');
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setUploading(true);
      try {
        const url = await uploadToCloudinary(file, 'image');
        setNewProductPhotos([...newProductPhotos, url]);
      } catch (err) {
        alert('Upload failed');
      } finally {
        setUploading(false);
      }
    };
    input.click();
  };

  const addProduct = async () => {
    if (!newProductName || !newProductPrice) return alert('Name and Price required.');
    const newProd = {
      brand_id: brandId,
      name: newProductName,
      price: parseFloat(newProductPrice),
      category: newProductCategory,
      description: newProductDesc,
      photo_urls: newProductPhotos,
      is_available: true
    };
    const { error } = await supabase.from('products').insert(newProd);
    if (!error) {
      fetchProducts();
      setShowAddProduct(false);
      setNewProductName('');
      setNewProductPrice('');
      setNewProductDesc('');
      setNewProductPhotos([]);
    } else {
      alert('Error adding product: ' + error.message);
    }
  };

  const toggleAvailability = async (id: string, currentStatus: boolean) => {
    await supabase.from('products').update({ is_available: !currentStatus }).eq('id', id);
    fetchProducts();
  };

  const deleteProduct = async (id: string) => {
    if (!confirm('Delete product?')) return;
    await supabase.from('products').delete().eq('id', id);
    fetchProducts();
  };

  const updateOrderStatus = async (id: string, status: string) => {
    await supabase.from('orders').update({ status }).eq('id', id);
    fetchOrders();
  };

  const copyStoreLink = () => {
    const url = `${window.location.origin}/store/${brandHandle}`;
    navigator.clipboard.writeText(url);
    alert('Copied link: ' + url);
  };

  const totalMenuPhotos = products.reduce((sum, p) => sum + (p.photo_urls?.length || (p.photo_url ? 1 : 0)), 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex justify-between items-center bg-neutral-900 p-4 rounded-2xl border border-neutral-800">
        <div>
          <h2 className="text-xl font-black text-white">My Store</h2>
          <p className="text-neutral-400 text-sm">zenvidia.com/store/{brandHandle}</p>
        </div>
        <button onClick={copyStoreLink} className="p-3 bg-cyan-500/20 text-cyan-400 rounded-xl hover:bg-cyan-500/30 transition-colors">
          Share Link
        </button>
      </div>

      <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-4">
        <h3 className="text-white font-bold mb-4">📸 Brand Showcase (Max 5 photos)</h3>
        <div className="grid grid-cols-5 gap-2">
          {[0, 1, 2, 3, 4].map(i => (
            <div key={i} className="aspect-square rounded-xl overflow-hidden bg-neutral-800 relative">
              {storePhotos[i] ? (
                <>
                  <img src={storePhotos[i]} className="w-full h-full object-cover" />
                  <button onClick={() => removeStorePhoto(i)} className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                    <X className="w-3 h-3 text-white" />
                  </button>
                </>
              ) : (
                <button onClick={() => triggerPhotoUpload(i)} disabled={uploading} className="w-full h-full flex items-center justify-center text-neutral-600 hover:text-white transition-colors">
                  <Plus className="w-6 h-6" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-white font-bold">📋 Menu / Products</h3>
          <span className={`text-xs font-bold px-2 py-1 rounded-full ${totalMenuPhotos >= 15 ? 'bg-red-500/20 text-red-500' : 'bg-cyan-500/20 text-cyan-400'}`}>
            {totalMenuPhotos}/15 photos used
          </span>
        </div>

        {showAddProduct ? (
          <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 mb-4 space-y-3">
            <h4 className="text-white font-bold mb-2">Add New Product</h4>
            <div className="flex gap-2 mb-2 overflow-x-auto">
              {newProductPhotos.map((url, i) => (
                <img key={i} src={url} className="w-16 h-16 rounded-xl object-cover" />
              ))}
              {newProductPhotos.length < 3 && (
                <button onClick={addProductPhoto} disabled={uploading} className="w-16 h-16 bg-neutral-800 rounded-xl flex items-center justify-center text-neutral-500">
                  <Plus className="w-5 h-5" />
                </button>
              )}
            </div>
            <input type="text" placeholder="Product Name *" value={newProductName} onChange={e => setNewProductName(e.target.value)} className="w-full bg-neutral-800 text-white rounded-xl p-3 outline-none" />
            <input type="number" placeholder="Price (₹) *" value={newProductPrice} onChange={e => setNewProductPrice(e.target.value)} className="w-full bg-neutral-800 text-white rounded-xl p-3 outline-none" />
            <select value={newProductCategory} onChange={e => setNewProductCategory(e.target.value)} className="w-full bg-neutral-800 text-white rounded-xl p-3 outline-none">
              <option>Food</option>
              <option>Service</option>
              <option>Fashion</option>
              <option>Beauty</option>
              <option>Other</option>
            </select>
            <textarea placeholder="Description (optional)" value={newProductDesc} onChange={e => setNewProductDesc(e.target.value)} className="w-full bg-neutral-800 text-white rounded-xl p-3 outline-none resize-none h-20" />
            <div className="flex gap-2">
              <button onClick={() => setShowAddProduct(false)} className="flex-1 py-3 rounded-xl bg-neutral-800 text-neutral-400 font-bold">Cancel</button>
              <button onClick={addProduct} className="flex-1 py-3 rounded-xl bg-cyan-500 text-black font-bold">Save Product</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowAddProduct(true)} className="w-full py-4 border-2 border-dashed border-neutral-700 rounded-xl text-neutral-500 font-bold hover:text-white hover:border-neutral-500 transition-colors mb-4 flex items-center justify-center gap-2">
            <Plus className="w-5 h-5" /> Add Product
          </button>
        )}

        <div className="space-y-3">
          {products.map(p => (
            <div key={p.id} className="flex gap-3 bg-neutral-950 p-3 rounded-xl border border-neutral-800 items-center">
              <img src={p.photo_urls?.[0] || p.photo_url || 'https://via.placeholder.com/100'} className="w-16 h-16 rounded-xl object-cover bg-neutral-800 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-white font-bold">{p.name}</p>
                <p className="text-cyan-400 font-bold text-sm">₹{p.price}</p>
              </div>
              <div className="flex flex-col gap-2 relative">
                <button onClick={() => toggleAvailability(p.id, p.is_available)} className={`px-3 py-1 rounded-full text-xs font-bold ${p.is_available ? 'bg-green-500/20 text-green-400' : 'bg-neutral-800 text-neutral-500'}`}>
                  {p.is_available ? 'Available' : 'Hidden'}
                </button>
                <button onClick={() => deleteProduct(p.id)} className="px-3 py-1 rounded-full bg-red-500/10 text-red-400 text-xs font-bold">Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-4">
        <h3 className="text-white font-bold mb-4">📦 Orders</h3>
        {orders.length === 0 ? (
          <p className="text-neutral-500 text-center py-6">No orders yet.</p>
        ) : (
          <div className="space-y-3">
            {orders.map(o => (
              <div key={o.id} className="bg-neutral-950 p-4 rounded-xl border border-neutral-800">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="text-white font-bold">{o.customer_name}</h4>
                    <a href={`tel:${o.customer_phone}`} className="text-neutral-400 text-sm hover:text-cyan-400">{o.customer_phone}</a>
                  </div>
                  <span className={`px-2 py-1 text-[10px] font-bold rounded-full uppercase ${o.status === 'pending' ? 'bg-orange-500/20 text-orange-400' : o.status === 'confirmed' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-green-500/20 text-green-400'}`}>
                    {o.status}
                  </span>
                </div>
                <div className="bg-neutral-900 p-2 rounded-lg mb-3">
                  <p className="text-white text-sm">Qty: {o.quantity || 1}</p>
                  {o.note && <p className="text-neutral-500 text-xs italic mt-1">Note: {o.note}</p>}
                </div>
                <div className="flex gap-2">
                  {o.status === 'pending' && (
                    <button onClick={() => updateOrderStatus(o.id, 'confirmed')} className="flex-1 py-2 bg-cyan-500/10 text-cyan-400 font-bold text-xs rounded-xl hover:bg-cyan-500/20 transition-colors">
                      Mark Confirmed
                    </button>
                  )}
                  {o.status === 'confirmed' && (
                    <button onClick={() => updateOrderStatus(o.id, 'completed')} className="flex-1 py-2 bg-green-500/10 text-green-400 font-bold text-xs rounded-xl hover:bg-green-500/20 transition-colors">
                      Mark Completed
                    </button>
                  )}
                  <a href={`https://wa.me/91${o.customer_phone?.replace(/\D/g, '')}`} target="_blank" className="py-2 px-4 bg-neutral-800 text-white font-bold text-xs rounded-xl hover:bg-neutral-700 transition-colors flex items-center justify-center">
                    WhatsApp
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
