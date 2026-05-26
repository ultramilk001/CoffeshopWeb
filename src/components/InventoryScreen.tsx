import React, { useState, useMemo, useEffect } from 'react';
import { getStoredProducts, saveStoredProducts } from '../data';
import { Product, ProductCategory } from '../types';
import { Plus, Edit2, Trash2, Search, Filter, AlertTriangle, Image, ClipboardList, CheckCircle2, ChevronRight, BarChart4, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function InventoryScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  
  // Filtering states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCat, setSelectedCat] = useState<'all' | ProductCategory>('all');
  const [stockLevelFilter, setStockLevelFilter] = useState<'all' | 'low' | 'empty'>('all');

  // Form states (Add / Edit)
  const [isEditing, setIsEditing] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  // Input states
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ProductCategory>('coffee');
  const [price, setPrice] = useState<number>(0);
  const [stock, setStock] = useState<number>(0);
  const [image, setImage] = useState('');
  const [sugarLevel, setSugarLevel] = useState(false);
  const [iceLevel, setIceLevel] = useState(false);

  // Notification feedback
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'danger'>('success');

  useEffect(() => {
    setProducts(getStoredProducts());
  }, []);

  const showToast = (message: string, type: 'success' | 'danger' = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setTimeout(() => {
      setToastMessage('');
    }, 2500);
  };

  // Safe checks for filtering
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            p.sku.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCat = selectedCat === 'all' || p.category === selectedCat;
      
      let matchesStock = true;
      if (stockLevelFilter === 'low') matchesStock = p.stock > 0 && p.stock <= 5;
      else if (stockLevelFilter === 'empty') matchesStock = p.stock === 0;

      return matchesSearch && matchesCat && matchesStock;
    });
  }, [products, searchQuery, selectedCat, stockLevelFilter]);

  // Inventory stats
  const inventoryStats = useMemo(() => {
    const totalItems = products.length;
    const totalStock = products.reduce((sum, p) => sum + p.stock, 0);
    const lowStockCount = products.filter(p => p.stock > 0 && p.stock <= 5).length;
    const emptyStockCount = products.filter(p => p.stock === 0).length;
    return {
      totalItems,
      totalStock,
      lowStockCount,
      emptyStockCount
    };
  }, [products]);

  // Handle open Form
  const triggerAddForm = () => {
    setEditingProductId(null);
    setIsEditing(true);
    
    // Auto generate logical SKU based on current products count
    const randNum = Math.floor(100 + Math.random() * 900);
    setSku(`CF-${products.length + randNum}`);
    setName('');
    setCategory('coffee');
    setPrice(25000);
    setStock(20);
    setImage('https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&q=80&w=400');
    setSugarLevel(true);
    setIceLevel(true);
  };

  const triggerEditForm = (p: Product) => {
    setEditingProductId(p.id);
    setIsEditing(true);
    setSku(p.sku);
    setName(p.name);
    setCategory(p.category);
    setPrice(p.price);
    setStock(p.stock);
    setImage(p.image);
    setSugarLevel(!!p.sugarLevel);
    setIceLevel(!!p.iceLevel);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();

    if (!sku || !name || price < 0 || stock < 0) {
      showToast('Mohon isi semua data formulir dengan valid', 'danger');
      return;
    }

    const currentList = getStoredProducts();

    if (editingProductId) {
      // EDIT product
      const updated = currentList.map(p => {
        if (p.id === editingProductId) {
          return {
            ...p,
            sku,
            name,
            category,
            price,
            stock,
            image: image || 'https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&q=80&w=400',
            sugarLevel: category === 'coffee' || category === 'non-coffee' ? sugarLevel : false,
            iceLevel: category === 'coffee' || category === 'non-coffee' ? iceLevel : false
          };
        }
        return p;
      });
      saveStoredProducts(updated);
      setProducts(updated);
      showToast('Berhasil mengubah rincian produk!');
    } else {
      // ADD new product
      // Avoid duplicate SKU
      if (currentList.some(p => p.sku.trim().toUpperCase() === sku.trim().toUpperCase())) {
        showToast('SKU barcode produk sudah terdaftar!', 'danger');
        return;
      }

      const newProduct: Product = {
        id: `p_${Date.now()}`,
        sku: sku.toUpperCase(),
        name,
        category,
        price,
        stock,
        image: image || 'https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&q=80&w=400',
        sugarLevel: category === 'coffee' || category === 'non-coffee' ? sugarLevel : false,
        iceLevel: category === 'coffee' || category === 'non-coffee' ? iceLevel : false
      };

      const updated = [...currentList, newProduct];
      saveStoredProducts(updated);
      setProducts(updated);
      showToast('Menu produk baru berhasil ditambahkan!');
    }

    setIsEditing(false);
  };

  const handleDeleteProduct = (productId: string, productName: string) => {
    const doubleCheck = window.confirm(`Apakah Anda yakin ingin menghapus "${productName}" secara permanen dari menu?`);
    if (!doubleCheck) return;

    const currentList = getStoredProducts();
    const updated = currentList.filter(p => p.id !== productId);
    saveStoredProducts(updated);
    setProducts(updated);
    showToast(`Berhasil menghapus produk ${productName}`, 'success');
  };

  // Seed image generator helpers based on Category selection to make styling look awesome
  const applyPresetImage = () => {
    if (category === 'coffee') {
      setImage('https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&q=80&w=400');
    } else if (category === 'non-coffee') {
      setImage('https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&q=80&w=400');
    } else if (category === 'food') {
      setImage('https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&q=80&w=400');
    } else if (category === 'pastry') {
      setImage('https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&q=80&w=400');
    }
  };

  // Reset to original seed database in emergency
  const handleResetToSeeds = () => {
    if (confirm('Anda yakin ingin mereset seluruh database produk ke rincian awal kedai kopi?')) {
      localStorage.removeItem('kk_products');
      setProducts(getStoredProducts());
      showToast('Mengatur ulang menu ke produk utama Klasik.');
    }
  };

  const formatIDR = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(num);
  };

  return (
    <div className="space-y-6">
      
      {/* TOAST NOTIFICATION CONTAINER */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 font-bold text-xs ${
              toastType === 'success' 
                ? 'bg-sage-600 text-white border border-sage-500' 
                : 'bg-red-650 text-white border border-red-500'
            }`}
          >
            {toastType === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* OVERVIEW STATS CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        <div className="bg-white p-4 rounded-2xl border border-coffee-200 flex items-center justify-between">
          <div>
            <span className="block text-[10px] text-coffee-600 font-bold uppercase">TOTAL MENU</span>
            <span className="block text-xl font-extrabold text-coffee-950 mt-0.5">{inventoryStats.totalItems} Varian</span>
          </div>
          <div className="p-2.5 bg-coffee-50 rounded-xl text-coffee-700">
            <ClipboardList className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-coffee-200 flex items-center justify-between">
          <div>
            <span className="block text-[10px] text-coffee-600 font-bold uppercase">AKUMULASI STOK</span>
            <span className="block text-xl font-extrabold text-coffee-950 mt-0.5">{inventoryStats.totalStock} Unit</span>
          </div>
          <div className="p-2.5 bg-coffee-50 rounded-xl text-coffee-700">
            <BarChart4 className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 flex items-center justify-between group cursor-pointer" onClick={() => setStockLevelFilter('low')}>
          <div>
            <span className="block text-[10px] text-amber-800 font-bold uppercase">STOK MENIPIS (≤5)</span>
            <span className="block text-xl font-extrabold text-amber-950 mt-0.5">{inventoryStats.lowStockCount} Item</span>
          </div>
          <div className="p-2.5 bg-amber-100 rounded-xl text-amber-700">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
        </div>

        <div className="bg-red-50 p-4 rounded-2xl border border-red-200 flex items-center justify-between group cursor-pointer" onClick={() => setStockLevelFilter('empty')}>
          <div>
            <span className="block text-[10px] text-red-800 font-bold uppercase">KOSONG / HABIS</span>
            <span className="block text-xl font-extrabold text-red-950 mt-0.5">{inventoryStats.emptyStockCount} Item</span>
          </div>
          <div className="p-2.5 bg-red-100 rounded-xl text-red-700">
            <AlertTriangle className="w-4 h-4 text-red-650" />
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: STOCK PRODUCTS LIST (8 grid cols) */}
        <div className="lg:col-span-8 space-y-4">
          
          <div className="bg-white p-4 rounded-2xl border border-coffee-200 flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="flex gap-2 w-full md:w-auto">
              <div className="relative flex-grow">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-coffee-400">
                  <Search className="w-4 h-4" />
                </span>
                <input
                  id="inventory-search"
                  type="text"
                  placeholder="Cari SKU atau nama produk..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs bg-coffee-50 border border-coffee-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-coffee-500"
                />
              </div>

              {/* Reset database button */}
              <button
                type="button"
                onClick={handleResetToSeeds}
                title="Atur ulang ke menu default demo"
                className="p-2 border border-coffee-200 text-coffee-600 hover:bg-coffee-50 rounded-xl flex items-center justify-center cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            {/* Quick dropdown filters */}
            <div className="flex gap-2 w-full md:w-auto">
              
              <select
                value={selectedCat}
                onChange={(e) => setSelectedCat(e.target.value as any)}
                className="px-3 py-2 text-xs bg-coffee-50 border border-coffee-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-coffee-500 cursor-pointer flex-1 md:flex-none appearance-none font-bold text-coffee-800"
              >
                <option value="all">📁 Semua Jenis</option>
                <option value="coffee">☕ Kopi</option>
                <option value="non-coffee">🍵 Non-Kopi</option>
                <option value="food">🍛 Makanan</option>
                <option value="pastry">🥐 Pastry</option>
              </select>

              <select
                value={stockLevelFilter}
                onChange={(e) => setStockLevelFilter(e.target.value as any)}
                className="px-3 py-2 text-xs bg-coffee-50 border border-coffee-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-coffee-500 cursor-pointer flex-1 md:flex-none appearance-none font-bold text-coffee-800"
              >
                <option value="all">📊 Semua Stok</option>
                <option value="low">⚠️ Menipis (≤5)</option>
                <option value="empty">🚫 Habis Total</option>
              </select>

              <button
                onClick={triggerAddForm}
                className="px-4 py-2 bg-coffee-800 hover:bg-coffee-900 text-cream-50 rounded-xl text-xs font-bold transition-transform cursor-pointer flex items-center gap-1 shrink-0"
              >
                <Plus className="w-4 h-4" /> Tambah Baru
              </button>

            </div>
          </div>

          {/* MOBILE LIST COMPONENT (hidden on md+) */}
          <div className="block md:hidden space-y-3">
            {filteredProducts.length > 0 ? (
              filteredProducts.map((p) => {
                const isLow = p.stock > 0 && p.stock <= 5;
                const isEmpty = p.stock === 0;

                return (
                  <div key={p.id} className="bg-white p-4 rounded-2xl border border-coffee-200 flex flex-col gap-3 shadow-xs">
                    <div className="flex items-center gap-3">
                      <img 
                        src={p.image} 
                        alt={p.name} 
                        className="w-12 h-12 object-cover rounded-xl border border-coffee-100 shrink-0"
                      />
                      <div className="flex-grow min-w-0">
                        <span className="block text-[9px] text-coffee-500 font-mono font-bold">
                          SKU: {p.sku} • {p.category.toUpperCase()}
                        </span>
                        <h5 className="text-xs font-bold text-coffee-950 truncate leading-snug">{p.name}</h5>
                        <p className="text-xs font-mono font-bold text-coffee-900 mt-1">{formatIDR(p.price)}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between border-t border-coffee-100/60 pt-2.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {p.sugarLevel && (
                          <span className="px-1.5 py-0.5 text-[8px] font-bold bg-coffee-100 text-coffee-900 rounded">Gula</span>
                        )}
                        {p.iceLevel && (
                          <span className="px-1.5 py-0.5 text-[8px] font-bold bg-sky-50 text-sky-800 rounded border border-sky-100">Es</span>
                        )}
                        {isEmpty ? (
                          <span className="px-2 py-0.5 text-[8px] font-bold bg-red-100 text-red-700 rounded-full border border-red-200">Habis</span>
                        ) : isLow ? (
                          <span className="px-2 py-0.5 text-[8px] font-bold bg-amber-100 text-amber-700 rounded-full border border-amber-200">Kritis ({p.stock})</span>
                        ) : (
                          <span className="px-2 py-0.5 text-[8px] font-mono font-semibold bg-sage-50 text-sage-800 rounded-full border border-sage-100">{p.stock} pcs</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => triggerEditForm(p)}
                          className="p-1.5 bg-coffee-50 hover:bg-coffee-100 text-coffee-700 rounded-lg transition-colors border border-coffee-200/50 cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteProduct(p.id, p.name)}
                          className="p-1.5 bg-red-50/50 hover:bg-red-55 text-red-650 rounded-lg transition-colors border border-red-100 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-coffee-500 py-6 text-center bg-white rounded-2xl border border-coffee-200">Tidak ada produk yang cocok dengan filter.</p>
            )}
          </div>

          {/* TABLE / LIST COMPONENT (desktop only, hidden on mobile screens) */}
          <div className="hidden md:block bg-white rounded-2xl border border-coffee-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                
                <thead>
                  <tr className="bg-coffee-50/70 border-b border-coffee-200 text-[10px] font-black tracking-wider text-coffee-800 uppercase">
                    <th className="py-3 px-4">Menu Produk Info</th>
                    <th className="py-3 px-4">Kategori</th>
                    <th className="py-3 px-4">Harga Menu</th>
                    <th className="py-3 px-4 text-center">Stok Sisa</th>
                    <th className="py-3 px-4 text-center">Kustomisasi</th>
                    <th className="py-3 px-4 text-center">Tindakan</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-coffee-100 text-xs">
                  {filteredProducts.length > 0 ? (
                    filteredProducts.map((p) => {
                      const isLow = p.stock > 0 && p.stock <= 5;
                      const isEmpty = p.stock === 0;

                      return (
                        <tr key={p.id} className="hover:bg-coffee-50/40 transition-colors">
                          
                          {/* Photo & Name */}
                          <td className="py-3.5 px-4 flex items-center gap-3 min-w-[200px]">
                            <img 
                              src={p.image} 
                              alt={p.name} 
                              className="w-10 h-10 object-cover rounded-xl border border-coffee-200 shrink-0"
                            />
                            <div>
                              <span className="block text-[10px] text-coffee-500 font-mono font-bold leading-none mb-1">
                                SKU: {p.sku}
                              </span>
                              <span className="text-xs font-bold text-coffee-950 block">
                                {p.name}
                              </span>
                            </div>
                          </td>

                          {/* Category */}
                          <td className="py-3.5 px-4 font-bold capitalize text-coffee-700">
                            {p.category === 'coffee' && '☕ Kopi'}
                            {p.category === 'non-coffee' && '🍵 Non Kopi'}
                            {p.category === 'food' && '🍛 Makanan'}
                            {p.category === 'pastry' && '🥐 Pastry'}
                          </td>

                          {/* Price */}
                          <td className="py-3.5 px-4 font-mono font-bold text-coffee-900">
                            {formatIDR(p.price)}
                          </td>

                          {/* Stock status */}
                          <td className="py-3.5 px-4 text-center">
                            {isEmpty ? (
                              <span className="inline-block px-2.5 py-0.5 text-[10px] font-bold bg-red-100 text-red-700 rounded-full border border-red-200">
                                Habis Total (0)
                              </span>
                            ) : isLow ? (
                              <span className="inline-block px-2.5 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-700 rounded-full border border-amber-200 animate-pulse">
                                Kritis ({p.stock})
                              </span>
                            ) : (
                              <span className="inline-block px-2.5 py-0.5 text-[10px] font-mono font-semibold bg-sage-50 text-sage-805 rounded-full border border-sage-200">
                                {p.stock} pcs
                              </span>
                            )}
                          </td>

                          {/* Modifier flags */}
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {p.sugarLevel ? (
                                <span className="px-1 text-[8px] font-bold bg-coffee-100 text-coffee-900 rounded border border-coffee-200">Gula</span>
                              ) : null}
                              {p.iceLevel ? (
                                <span className="px-1 text-[8px] font-bold bg-sky-50 text-sky-855 rounded border border-sky-100">Es</span>
                              ) : null}
                              {!p.sugarLevel && !p.iceLevel ? (
                                <span className="text-coffee-400 text-[10px]">-</span>
                              ) : null}
                            </div>
                          </td>

                          {/* Actions buttons */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => triggerEditForm(p)}
                                title="Edit produk"
                                className="p-1.5 hover:bg-coffee-100 text-coffee-700 rounded-lg transition-colors cursor-pointer border border-coffee-200/40"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(p.id, p.name)}
                                title="Hapus menu"
                                className="p-1.5 hover:bg-red-55 border border-coffee-200/40 text-red-650 hover:text-red-700 rounded-lg transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>

                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-coffee-500 font-sans">
                        Tidak ada barang menu yang sesuai filter inventaris.
                      </td>
                    </tr>
                  )}
                </tbody>

              </table>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: INTERACTIVE FORM CABINET DRAWER (4 grid cols) */}
        <div className="lg:col-span-4">
          <AnimatePresence mode="wait">
            {isEditing ? (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 15 }}
                className="bg-white p-5 rounded-3xl border border-coffee-200 shadow-md space-y-4"
              >
                
                {/* Form header banner */}
                <div className="flex items-center justify-between border-b border-coffee-100 pb-3">
                  <h4 className="font-extrabold text-xs tracking-wider uppercase text-coffee-900">
                    {editingProductId ? '📝 Edit Informasi Menu' : '📥 Tambah Menu Baru'}
                  </h4>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="p-1 bg-coffee-100 hover:bg-coffee-200 rounded-full transition-colors text-xs text-coffee-700 cursor-pointer"
                  >
                    Batal
                  </button>
                </div>

                <form onSubmit={handleSaveProduct} className="space-y-4">
                  
                  {/* SKU input */}
                  <div>
                    <label className="block text-[10px] font-bold text-coffee-750 mb-1">SKU KODE BARANG</label>
                    <input
                      type="text"
                      required
                      placeholder="CF-1001"
                      value={sku}
                      onChange={(e) => setSku(e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 text-xs bg-coffee-50 border border-coffee-200 rounded-xl font-mono focus:outline-none focus:ring-1 focus:ring-coffee-500"
                    />
                  </div>

                  {/* Name input */}
                  <div>
                    <label className="block text-[10px] font-bold text-coffee-750 mb-1">NAMA MENU MINUMAN / MAKANAN</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Kopi Pandan"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-coffee-50 border border-coffee-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-coffee-500 font-bold"
                    />
                  </div>

                  {/* Category select */}
                  <div>
                    <label className="block text-[10px] font-bold text-coffee-750 mb-1">KATEGORI BARANG</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as ProductCategory)}
                      className="w-full px-3 py-2 text-xs bg-coffee-50 border border-coffee-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-coffee-500 font-semibold"
                    >
                      <option value="coffee">☕ Kopi Espresso Blend</option>
                      <option value="non-coffee">🍵 Susu / Teh Non-Kopi</option>
                      <option value="food">🍛 Makanan Utama</option>
                      <option value="pastry">🥐 Pastry Cemilan</option>
                    </select>
                  </div>

                  {/* Price & Stock inline row */}
                  <div className="grid grid-cols-2 gap-35">
                    <div>
                      <label className="block text-[10px] font-bold text-coffee-750 mb-1">HARGA (RUPIAH)</label>
                      <input
                        type="number"
                        required
                        min="0"
                        step="500"
                        value={price || ''}
                        onChange={(e) => setPrice(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full px-3 py-2 text-xs bg-coffee-50 border border-coffee-200 rounded-xl font-mono font-bold focus:outline-none focus:ring-1 focus:ring-coffee-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-coffee-750 mb-1">STOK TERSISA</label>
                      <input
                        type="number"
                        required
                        min="0"
                        value={stock || ''}
                        onChange={(e) => setStock(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full px-3 py-2 text-xs bg-coffee-50 border border-coffee-200 rounded-xl font-mono focus:outline-none focus:ring-1 focus:ring-coffee-500"
                      />
                    </div>
                  </div>

                  {/* Image input */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-[10px] font-bold text-coffee-750">FOTO URL PRODUK</label>
                      <button
                        type="button"
                        onClick={applyPresetImage}
                        className="text-[9px] font-bold text-sage-700 hover:underline cursor-pointer"
                      >
                        Gunakan Foto Preset
                      </button>
                    </div>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-coffee-400">
                        <Image className="w-3.5 h-3.5" />
                      </span>
                      <input
                        type="text"
                        placeholder="Masukkan Unsplash URL..."
                        value={image}
                        onChange={(e) => setImage(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-xs bg-coffee-50 border border-coffee-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-coffee-500"
                      />
                    </div>
                    {image && (
                      <div className="mt-2 aspect-video overflow-hidden rounded-xl border border-coffee-100 bg-coffee-50">
                        <img src={image} className="w-full h-full object-cover" alt="Preview" />
                      </div>
                    )}
                  </div>

                  {/* Optional Modifier Options toggle checklist */}
                  {(category === 'coffee' || category === 'non-coffee') && (
                    <div className="space-y-1 bg-coffee-50 p-3 rounded-xl border border-coffee-200/55 text-[11px]">
                      <span className="block font-bold text-coffee-800 text-[9px] uppercase tracking-wider mb-1.5">Kustomisasi Pesanan</span>
                      <label className="flex items-center gap-1.5 font-semibold text-coffee-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={sugarLevel}
                          onChange={(e) => setSugarLevel(e.target.checked)}
                          className="rounded border-coffee-300 focus:ring-coffee-500"
                        />
                        <span>Aktifkan setting kadar gula (No/Less/Normal)</span>
                      </label>
                      <label className="flex items-center gap-1.5 font-semibold text-coffee-800 cursor-pointer mt-1 block">
                        <input
                          type="checkbox"
                          checked={iceLevel}
                          onChange={(e) => setIceLevel(e.target.checked)}
                          className="rounded border-coffee-300 focus:ring-coffee-500"
                        />
                        <span>Aktifkan setting jumlah batu es (No/Less/Normal)</span>
                      </label>
                    </div>
                  )}

                  {/* Action submit button inside form */}
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-sage-600 hover:bg-sage-700 text-white font-extrabold rounded-xl text-xs transition-colors shadow-sm cursor-pointer border border-sage-500/50 uppercase tracking-wider"
                  >
                    Simpan Informasi Data Menu
                  </button>

                </form>

              </motion.div>
            ) : (
              <div className="bg-coffee-50 border border-dashed border-coffee-305 p-6 rounded-3xl text-center text-coffee-500 space-y-3 flex flex-col items-center">
                <ClipboardList className="w-8 h-8 text-coffee-300" />
                <h5 className="font-bold text-xs text-coffee-850">Klipboard Informasi Menu</h5>
                <p className="text-[10px] text-coffee-600 leading-normal font-sans">
                  Pilih salah satu ikon <Edit2 className="w-3 h-3 inline mx-0.5" /> untuk mengedit harga, rincian, dan jumlah stok sisa, atau buat produk baru dengan tombol tambah di kiri.
                </p>
                <button
                  type="button"
                  onClick={triggerAddForm}
                  className="w-full py-2 border border-coffee-300 hover:bg-white text-coffee-805 font-bold text-xs rounded-xl cursor-pointer transition-colors"
                >
                  Buat Menu Baru Secepatnya
                </button>
              </div>
            )}
          </AnimatePresence>
        </div>

      </div>

    </div>
  );
}
