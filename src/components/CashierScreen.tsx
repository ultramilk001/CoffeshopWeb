import React, { useState, useMemo, useEffect } from 'react';
import { getStoredProducts, saveStoredProducts, getStoredTransactions, saveStoredTransactions } from '../data';
import { Product, CartItem, PaymentMethod, Transaction, User } from '../types';
import { Search, Plus, Minus, Trash2, Tag, Percent, CreditCard, Banknote, QrCode, Smartphone, Check, FileSpreadsheet, X, ShoppingCart, KeyRound, Printer, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CashierScreenProps {
  currentUser: User;
  onRefreshStats?: () => void;
}

export default function CashierScreen({ currentUser, onRefreshStats }: CashierScreenProps) {
  // Database states
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'coffee' | 'non-coffee' | 'food' | 'pastry'>('all');
  const [mobileActiveView, setMobileActiveView] = useState<'catalog' | 'cart'>('catalog');
  
  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customDiscount, setCustomDiscount] = useState<number>(0); // fixed nominal Rupiah
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('CASH');
  const [cashAmountPaid, setCashAmountPaid] = useState<string>('');
  
  // Modifiers selected for inline temp customization
  const [chosenSugar, setChosenSugar] = useState<'normal' | 'less' | 'no' | 'extra'>('normal');
  const [chosenSize, setChosenSize] = useState<'regular' | 'large'>('regular');
  const [chosenIce, setChosenIce] = useState<'normal' | 'less' | 'no' | 'hot'>('normal');

  // Checkout Receipt Modal
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [lastCompletedTransaction, setLastCompletedTransaction] = useState<Transaction | null>(null);

  // Quick preset coupons
  const PRESET_COUPONS = [
    { label: 'Disc Rp 5k', value: 5000 },
    { label: 'Disc Rp 10k', value: 10000 },
    { label: 'Disc Rp 20k', value: 20000 },
  ];

  // Refresh data initially
  useEffect(() => {
    setProducts(getStoredProducts());
    setTransactions(getStoredTransactions());
  }, []);

  // Filter products based on search & category
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.sku.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCat = selectedCategory === 'all' || p.category === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [products, searchQuery, selectedCategory]);

  // Cart Calculations
  const cartSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  }, [cart]);

  const discountAmount = useMemo(() => {
    return Math.min(customDiscount, cartSubtotal);
  }, [customDiscount, cartSubtotal]);

  const taxAmount = useMemo(() => {
    const taxableBase = Math.max(cartSubtotal - discountAmount, 0);
    return Math.round(taxableBase * 0.1); // PPn 10%
  }, [cartSubtotal, discountAmount]);

  const cartTotal = useMemo(() => {
    const taxableBase = Math.max(cartSubtotal - discountAmount, 0);
    return taxableBase + taxAmount;
  }, [cartSubtotal, discountAmount, taxAmount]);

  // Add Item to Cart
  const handleAddToCart = (product: Product) => {
    if (product.stock <= 0) {
      alert(`Stok ${product.name} telah habis.`);
      return;
    }

    // Creating a composite item key based on modifiers to allow having multiple variants in cart
    const sugarMod = product.sugarLevel ? chosenSugar : 'no';
    const iceMod = product.iceLevel ? chosenIce : 'no';
    const sizeMod = chosenSize;
    const cartItemId = `${product.id}_s_${sugarMod}_sz_${sizeMod}_i_${iceMod}`;

    const existingIdx = cart.findIndex(it => it.id === cartItemId);
    
    if (existingIdx !== -1) {
      const updatedCart = [...cart];
      const newQty = updatedCart[existingIdx].quantity + 1;
      
      // Stock check
      if (newQty > product.stock) {
        alert(`Jumlah pembelian melebih batas stok yang tersisa (${product.stock} pcs).`);
        return;
      }
      
      updatedCart[existingIdx].quantity = newQty;
      setCart(updatedCart);
    } else {
      const newItem: CartItem = {
        id: cartItemId,
        product,
        quantity: 1,
        sugar: sugarMod as any,
        size: sizeMod,
        ice: iceMod as any
      };
      setCart([...cart, newItem]);
    }

    // Reset temporary modifiers choice to normal
    setChosenSugar('normal');
    setChosenSize('regular');
    setChosenIce('normal');
  };

  // Adjust Cart Quantity
  const handleUpdateQty = (itemId: string, diff: number) => {
    const updatedCart = cart.map(item => {
      if (item.id === itemId) {
        const nextQty = item.quantity + diff;
        
        // stock guard
        if (nextQty > item.product.stock) {
          alert(`Jumlah pembelian melebih batas stok (${item.product.stock} pcs).`);
          return item;
        }

        if (nextQty <= 0) return null;
        return { ...item, quantity: nextQty };
      }
      return item;
    }).filter(Boolean) as CartItem[];

    setCart(updatedCart);
  };

  const handleRemoveItem = (itemId: string) => {
    setCart(cart.filter(item => item.id !== itemId));
  };

  // Process Quick Cash Presets
  const getCashPresets = () => {
    if (cartTotal <= 0) return [];
    const base = Math.ceil(cartTotal / 10000) * 10000;
    return [
      base,
      base + 5000,
      base + 10000,
      base + 20000,
      base + 50000,
    ].filter((v, i, self) => self.indexOf(v) === i && v >= cartTotal);
  };

  // Complete Order
  const handleCheckout = () => {
    if (cart.length === 0) {
      alert('Keranjang belanja masih kosong.');
      return;
    }

    const payAmount = selectedPaymentMethod === 'CASH' 
      ? parseFloat(cashAmountPaid || '0') 
      : cartTotal;

    if (selectedPaymentMethod === 'CASH' && payAmount < cartTotal) {
      alert('Jumlah pembayaran kasir tidak mencukupi tagihan.');
      return;
    }

    // Double check stock availability & subtract
    const latestProducts = getStoredProducts();
    let stockValid = true;
    const missingStockItems: string[] = [];

    cart.forEach(item => {
      const origProd = latestProducts.find(p => p.id === item.product.id);
      if (!origProd || origProd.stock < item.quantity) {
        stockValid = false;
        missingStockItems.push(item.product.name);
      }
    });

    if (!stockValid) {
      alert(`Opps! Stok barang berikut telah berkurang di sistem: ${missingStockItems.join(', ')}`);
      return;
    }

    // Subtract and Update stock in database
    const updatedProducts = latestProducts.map(p => {
      const itemsInCartForProd = cart.filter(item => item.product.id === p.id);
      if (itemsInCartForProd.length > 0) {
        const totalQty = itemsInCartForProd.reduce((sum, it) => sum + it.quantity, 0);
        return {
          ...p,
          stock: p.stock - totalQty
        };
      }
      return p;
    });

    // Save stock subtraction
    saveStoredProducts(updatedProducts);
    setProducts(updatedProducts);

    // Save receipt transaction
    const latestTransactions = getStoredTransactions();
    const cleanInvoiceCounter = latestTransactions.length + 1001;
    const nowLocalDate = new Date();
    
    const newTx: Transaction = {
      id: `tx_${Date.now()}`,
      invoiceNumber: `INV-KK-${nowLocalDate.getFullYear()}${String(nowLocalDate.getMonth() + 1).padStart(2, '0')}${String(nowLocalDate.getDate()).padStart(2, '0')}-${cleanInvoiceCounter}`,
      items: cart.map(item => ({
        productId: item.product.id,
        name: item.product.name,
        price: item.product.price,
        quantity: item.quantity,
        sugar: item.sugar,
        size: item.size,
        ice: item.ice
      })),
      subtotal: cartSubtotal,
      tax: taxAmount,
      discount: discountAmount,
      total: cartTotal,
      paymentMethod: selectedPaymentMethod,
      amountPaid: payAmount,
      amountChange: Math.max(payAmount - cartTotal, 0),
      createdAt: nowLocalDate.toISOString(),
      cashierId: currentUser.id,
      cashierName: currentUser.name
    };

    const savedTxs = [newTx, ...latestTransactions];
    saveStoredTransactions(savedTxs);
    setTransactions(savedTxs);

    // Auto post to Google Apps Script if URL is configured
    const appScriptUrl = localStorage.getItem('kk_appscript_url');
    if (appScriptUrl) {
      const itemsDesc = newTx.items.map(it => 
        `${it.name} (${it.quantity}x, Dimensi: ${it.size || 'Regular'}, Gula: ${it.sugar}, Es: ${it.ice})`
      ).join(', ');

      fetch(appScriptUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'addTransaction',
          transaction: {
            id: newTx.id,
            invoiceNumber: newTx.invoiceNumber,
            itemsDescription: itemsDesc,
            subtotal: newTx.subtotal,
            tax: newTx.tax,
            discount: newTx.discount,
            total: newTx.total,
            paymentMethod: newTx.paymentMethod,
            amountPaid: newTx.amountPaid,
            amountChange: newTx.amountChange,
            createdAt: newTx.createdAt,
            cashierId: newTx.cashierId,
            cashierName: newTx.cashierName
          }
        })
      }).then(() => {
        console.log('Real-time transaction uploaded to Google Apps Script cloud database.');
      }).catch(err => {
        console.warn('Real-time sync to Apps Script failed:', err);
      });

      // Update stock on Google Sheets in real-time
      newTx.items.forEach(item => {
        const localProd = products.find(p => p.id === item.productId);
        const productQueryValue = localProd?.sku || item.productId;
        
        fetch(appScriptUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'updateStock',
            id: productQueryValue,
            amount: -item.quantity // Deduct quantity on active transaction
          })
        }).then(() => {
          console.log(`Real-time stock deduction (-${item.quantity}) for product code ${productQueryValue} uploaded.`);
        }).catch(err => {
          console.warn('Real-time stock sync failed:', err);
        });
      });
    }

    // Prompt receipt modal
    setLastCompletedTransaction(newTx);
    setShowReceiptModal(true);

    // Reset cashier states
    setCart([]);
    setCustomDiscount(0);
    setCashAmountPaid('');
    setSelectedPaymentMethod('CASH');

    if (onRefreshStats) {
      onRefreshStats();
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
    <div className="space-y-4">
      
      {/* Mobile-only View Toggle (hidden on desktop) */}
      <div className="lg:hidden flex border-2 border-coffee-200 rounded-2xl bg-white p-1 gap-1 w-full shadow-sm">
        <button
          type="button"
          onClick={() => setMobileActiveView('catalog')}
          className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
            mobileActiveView === 'catalog'
              ? 'bg-coffee-800 text-cream-50 font-extrabold shadow-sm'
              : 'text-coffee-700 hover:bg-coffee-50/50'
          }`}
        >
          <span>🎯 Pilih Menu</span>
          <span className="text-[10px] bg-coffee-100 text-coffee-800 px-2 py-0.5 rounded-full font-bold">
            {filteredProducts.length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setMobileActiveView('cart')}
          className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
            mobileActiveView === 'cart'
              ? 'bg-coffee-800 text-cream-50 font-extrabold shadow-sm'
              : 'text-coffee-700 hover:bg-coffee-50/50'
          }`}
        >
          <span>🛒 Keranjang</span>
          {cart.length > 0 && (
            <span className="text-[10px] bg-sage-600 text-white px-2 py-0.5 rounded-full font-bold">
              {cart.reduce((s, c) => s + c.quantity, 0)}
            </span>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT PANEL: CATALOG SEARCH & PRODUCT TILES (8 grid cols) */}
        <div className={`lg:col-span-7 xl:col-span-8 space-y-4 ${mobileActiveView === 'catalog' ? 'block' : 'hidden lg:block'}`}>
        
        {/* TOP FILTER BAR */}
        <div className="bg-white p-4 rounded-2xl border border-coffee-200/80 flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-72">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-coffee-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              id="pos-product-search"
              type="text"
              placeholder="Cari kopi, minuman & pastry..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-coffee-50 border border-coffee-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-coffee-550 focus:bg-white"
            />
          </div>

          {/* Catalog Filter Categories */}
          <div className="flex gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {['all', 'coffee', 'non-coffee', 'food', 'pastry'].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  selectedCategory === cat 
                    ? 'bg-coffee-800 text-cream-100 scale-102 shadow-sm' 
                    : 'bg-coffee-50/70 text-coffee-700 hover:bg-coffee-100/70 border border-coffee-200/50'
                }`}
              >
                {cat === 'all' && '🌍 Semua Menu'}
                {cat === 'coffee' && '☕ Kopi Pekat'}
                {cat === 'non-coffee' && '🍵 Non Kopi'}
                {cat === 'food' && '🍛 Makanan'}
                {cat === 'pastry' && '🥐 Pastry'}
              </button>
            ))}
          </div>
        </div>

        {/* ICE / SUGAR SELECTION BAR FOR COFFEE ITEMS */}
        <div className="bg-cream-100/80 p-3 rounded-2xl border border-coffee-200/50 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-coffee-850 bg-coffee-200 px-2 py-0.5 rounded uppercase">
              Opsi Modifikasi
            </span>
            <span className="text-[10px] text-coffee-700">Setel varian di bawah sebelum klik tambah menu</span>
          </div>

          <div className="flex gap-4 items-center">
            {/* Sugar modifier */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold text-coffee-800">GULA:</span>
              <div className="flex bg-white/75 p-0.5 rounded-lg border border-coffee-200">
                {(['no', 'less', 'normal', 'extra'] as const).map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setChosenSugar(s)}
                    className={`px-1.5 py-0.5 text-[9px] font-bold rounded-md uppercase transition-all whitespace-nowrap cursor-pointer ${
                      chosenSugar === s ? 'bg-coffee-800 text-white' : 'text-coffee-600'
                    }`}
                  >
                    {s === 'no' ? 'Nol' : s === 'less' ? 'Less' : s === 'normal' ? 'Norm' : 'Xtra'}
                  </button>
                ))}
              </div>
            </div>

            {/* Size modifier */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold text-coffee-800">UKURAN:</span>
              <div className="flex bg-white/75 p-0.5 rounded-lg border border-coffee-200">
                {(['regular', 'large'] as const).map(sz => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => setChosenSize(sz)}
                    className={`px-2 py-0.5 text-[9px] font-bold rounded-md uppercase transition-all whitespace-nowrap cursor-pointer ${
                      chosenSize === sz ? 'bg-coffee-800 text-white' : 'text-coffee-600'
                    }`}
                  >
                    {sz === 'regular' ? 'Regular' : 'Large'}
                  </button>
                ))}
              </div>
            </div>

            {/* Ice modifier */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold text-coffee-800">ES:</span>
              <div className="flex bg-white/75 p-0.5 rounded-lg border border-coffee-200">
                {(['no', 'less', 'normal', 'hot'] as const).map(i => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setChosenIce(i)}
                    className={`px-1.5 py-0.5 text-[9px] font-bold rounded-md uppercase transition-all whitespace-nowrap cursor-pointer ${
                      chosenIce === i ? 'bg-coffee-800 text-white' : 'text-coffee-600'
                    }`}
                  >
                    {i === 'no' ? 'Tanpa' : i === 'less' ? 'Less' : i === 'normal' ? 'Norm' : 'Hot'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* PRODUCTS GRID */}
        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3.5">
            {filteredProducts.map((p) => {
              const itemsInCartForThis = cart.filter(item => item.product.id === p.id);
              const isLowStock = p.stock <= 5;
              const isOutOfStock = p.stock === 0;

              return (
                <div 
                  key={p.id}
                  onClick={() => !isOutOfStock && handleAddToCart(p)}
                  className={`bg-white rounded-2xl border transition-all overflow-hidden flex flex-col justify-between group cursor-pointer select-none border-coffee-200/80 hover:border-coffee-400 hover:shadow-md ${
                    isOutOfStock ? 'opacity-65 cursor-not-allowed' : ''
                  }`}
                  id={`pos-item-${p.sku}`}
                >
                  <div className="relative aspect-square overflow-hidden bg-coffee-50 shrink-0">
                    <img 
                      src={p.image} 
                      alt={p.name} 
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 duration-500"
                    />
                    
                    {/* Category pill indicator */}
                    <span className="absolute top-2 left-2 text-[9px] font-bold text-coffee-900 bg-cream-100 border border-coffee-300 px-2 py-0.5 rounded-full capitalize">
                      {p.category}
                    </span>

                    {/* Stock status overlay */}
                    {isOutOfStock ? (
                      <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center">
                        <span className="text-white text-[10px] font-bold bg-red-600 px-3 py-1 rounded-full uppercase tracking-wider">
                          HABIS
                        </span>
                      </div>
                    ) : isLowStock ? (
                      <span className="absolute bottom-2 right-2 text-[9px] font-bold text-white bg-amber-600 px-2 py-0.5 rounded shadow-sm">
                        Stok Menipis ({p.stock})
                      </span>
                    ) : (
                      <span className="absolute bottom-2 right-2 text-[9px] font-mono text-coffee-950 bg-white/80 backdrop-blur-sm px-2 py-0.5 rounded">
                        Stok {p.stock} pcs
                      </span>
                    )}

                    {/* Active Cart Qty Count */}
                    {itemsInCartForThis.length > 0 && (
                      <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-sage-600 text-[10px] font-bold text-white flex items-center justify-center border border-white">
                        {itemsInCartForThis.reduce((s, c) => s + c.quantity, 0)}
                      </span>
                    )}
                  </div>

                  <div className="p-3 space-y-2 flex-grow flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-mono text-coffee-500 font-bold block">{p.sku}</span>
                      <h5 className="text-xs font-bold text-coffee-950 tracking-tight leading-snug truncate-2-lines min-h-8">
                        {p.name}
                      </h5>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs font-black text-coffee-900 font-mono">
                        {formatIDR(p.price)}
                      </span>
                      
                      <button
                        type="button"
                        disabled={isOutOfStock}
                        className={`p-1.5 rounded-lg border flex items-center justify-center transition-colors cursor-pointer ${
                          isOutOfStock 
                            ? 'bg-coffee-100 border-coffee-200 text-coffee-300' 
                            : 'bg-coffee-50 border-coffee-200/70 hover:bg-coffee-800 hover:text-white text-coffee-700'
                        }`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white p-12 text-center rounded-2xl border border-coffee-200 text-coffee-500 flex flex-col items-center justify-center space-y-2">
            <ShoppingCart className="w-8 h-8 text-coffee-350" />
            <h5 className="font-bold text-xs text-coffee-900">Menu tidak ditemukan</h5>
            <p className="text-[10px] text-coffee-500">Gunakan kata kunci pencarian SKU atau kategori lain.</p>
          </div>
        )}

      </div>

      {/* RIGHT PANEL: ACTIVE CASHIER CART & CHECKOUT (5 grid cols) */}
      <div className={`lg:col-span-5 xl:col-span-4 bg-white rounded-3xl border border-coffee-200 shadow-sm overflow-hidden flex flex-col justify-between ${mobileActiveView === 'cart' ? 'flex' : 'hidden lg:flex'}`}>
        
        {/* Cart Title Banner */}
        <div className="bg-coffee-900 text-white p-4 flex items-center justify-between border-b border-coffee-950">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-cream-200" />
            <h4 className="font-extrabold text-xs tracking-wide uppercase text-cream-100">Keranjang Transaksi</h4>
          </div>
          <div className="text-right">
            <span className="text-[10px] bg-coffee-825 border border-coffee-700 px-2.5 py-0.5 rounded text-cream-300">
              Kasir: {currentUser.name}
            </span>
          </div>
        </div>

        {/* CART ORDER ITEMS */}
        <div className="p-4 flex-grow max-h-[340px] overflow-y-auto divide-y divide-coffee-100">
          {cart.length > 0 ? (
            cart.map((item) => (
              <div key={item.id} className="py-2.5 first:pt-0 last:pb-0 flex items-start justify-between gap-3">
                <div className="flex-grow">
                  <span className="text-[9px] font-mono font-bold text-coffee-500 block">
                    {item.product.sku}
                  </span>
                  <p className="text-xs font-bold text-coffee-950 leading-tight">
                    {item.product.name}
                  </p>
                  
                  {/* Modifiers quick pills visualizer */}
                  {(item.sugar !== 'no' || item.size || item.ice !== 'no') && (
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {item.size && (
                        <span className="text-[8px] bg-amber-50 text-amber-800 px-1.5 py-0.5 rounded uppercase font-bold border border-amber-200">
                          Size: {item.size}
                        </span>
                      )}
                      {item.sugar !== 'no' && (
                        <span className="text-[8px] bg-coffee-100 text-coffee-800 px-1.5 py-0.5 rounded uppercase font-bold block">
                          Sugar: {item.sugar}
                        </span>
                      )}
                      {item.ice !== 'no' && (
                        <span className="text-[8px] bg-sky-50 text-sky-800 px-1.5 py-0.5 rounded uppercase font-bold border border-sky-100 block">
                          Ice: {item.ice}
                        </span>
                      )}
                    </div>
                  )}

                  <span className="text-[11px] text-coffee-600 block mt-1 font-mono font-bold">
                    {formatIDR(item.product.price)} × {item.quantity}
                  </span>
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className="text-xs font-bold font-mono text-coffee-950">
                    {formatIDR(item.product.price * item.quantity)}
                  </span>
                  
                  {/* Cart Action Buttons */}
                  <div className="flex items-center gap-1.5 bg-coffee-50 border border-coffee-200/80 p-0.5 rounded-lg">
                    <button
                      type="button"
                      onClick={() => handleUpdateQty(item.id, -1)}
                      className="p-1 hover:bg-coffee-200 rounded text-coffee-700 hover:text-coffee-900 transition-colors cursor-pointer"
                    >
                      <Minus className="w-2.5 h-2.5" />
                    </button>
                    <span className="text-[11px] font-bold text-coffee-900 w-5 text-center font-mono">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleUpdateQty(item.id, 1)}
                      className="p-1 hover:bg-coffee-200 rounded text-coffee-700 hover:text-coffee-900 transition-colors cursor-pointer"
                    >
                      <Plus className="w-2.5 h-2.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id)}
                      className="p-1 text-red-650 hover:bg-red-50 rounded transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="py-12 text-center text-coffee-400 space-y-2.5 flex flex-col items-center">
              <ShoppingCart className="w-6 h-6 text-coffee-200 animate-bounce" />
              <p className="text-[10px] text-coffee-500 font-sans">Belum ada menu di dalam keranjang belanja kasir.</p>
            </div>
          )}
        </div>

        {/* EXTRA OPTIONS MODULE: DISCOUNTS COUPONS */}
        <div className="p-4 bg-coffee-50 border-t border-b border-coffee-200 space-y-3">
          
          {/* Discount input element */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-[10px] font-bold text-coffee-800">
              <span className="flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-coffee-700" /> KUPON DISKON POTONGAN
              </span>
              <span className="text-coffee-500">Maks. nominal harga</span>
            </div>
            
            <div className="flex gap-1.5">
              <input
                id="discount-input"
                type="number"
                min="0"
                step="1000"
                placeholder="Rupiah (ex: 5000)"
                value={customDiscount || ''}
                onChange={(e) => setCustomDiscount(Math.max(parseFloat(e.target.value) || 0, 0))}
                className="flex-grow px-3 py-1.5 text-xs bg-white border border-coffee-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-coffee-500"
              />
              <button
                type="button"
                onClick={() => setCustomDiscount(0)}
                className="px-2 py-1.5 text-[10px] font-semibold bg-coffee-200 text-coffee-750 hover:bg-coffee-300 rounded-xl transition-colors cursor-pointer"
              >
                Reset
              </button>
            </div>

            {/* Presets discount list */}
            <div className="grid grid-cols-3 gap-1.5 pt-0.5">
              {PRESET_COUPONS.map(p => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setCustomDiscount(p.value)}
                  className={`py-1 text-[9px] font-bold rounded-lg border transition-all cursor-pointer ${
                    customDiscount === p.value
                      ? 'bg-coffee-800 border-coffee-850 text-white shadow-sm'
                      : 'bg-white border-coffee-200/60 text-coffee-750 hover:bg-coffee-100'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* PAYMENT TYPE MATRIX */}
          <div className="space-y-1.5 pt-2 border-t border-coffee-200/50">
            <span className="block text-[10px] font-bold text-coffee-800">PILIH METODE PEMBAYARAN:</span>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { type: 'CASH', label: 'Cash', icon: Banknote },
                { type: 'QRIS', label: 'QRIS', icon: QrCode },
                { type: 'BANK', label: 'Transfer', icon: CreditCard },
                { type: 'E-WALLET', label: 'E-Wallet', icon: Smartphone }
              ].map(pm => {
                const Icon = pm.icon;
                const isSelected = selectedPaymentMethod === pm.type;
                return (
                  <button
                    key={pm.type}
                    type="button"
                    onClick={() => setSelectedPaymentMethod(pm.type as PaymentMethod)}
                    className={`py-2 px-1 rounded-xl flex flex-col items-center gap-1 transition-all border cursor-pointer ${
                      isSelected 
                        ? 'bg-sage-600 border-sage-700 text-white scale-102 shadow-sm'
                        : 'bg-white border-coffee-200/60 text-coffee-800 hover:bg-coffee-100'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold font-sans tracking-tight">{pm.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* CONDITIONAL PAYMENT INPUT FOR CASH OR TRANFERS */}
          {selectedPaymentMethod === 'CASH' && cartTotal > 0 && (
            <div className="space-y-1.5 pt-2 border-t border-coffee-200/50">
              <div className="flex justify-between items-center text-[10px] font-bold text-coffee-800">
                <span>NOMINAL UANG TUNAI DITERIMA:</span>
                {parseFloat(cashAmountPaid || '0') >= cartTotal && (
                  <span className="text-sage-700 font-bold">
                    Kembalian: {formatIDR(parseFloat(cashAmountPaid) - cartTotal)}
                  </span>
                )}
              </div>
              
              <div className="flex gap-1.5">
                <input
                  id="cash-amount"
                  type="number"
                  placeholder="Nilai cash (ex: 50000)"
                  value={cashAmountPaid}
                  onChange={(e) => setCashAmountPaid(e.target.value)}
                  className="flex-grow px-3 py-1.5 text-xs bg-white border border-coffee-200 rounded-xl font-mono font-bold focus:outline-none focus:ring-1 focus:ring-coffee-500"
                />
              </div>

              {/* Cash shortcut suggestions */}
              <div className="flex gap-1 overflow-x-auto pb-0.5 mt-1 scrollbar-none">
                {getCashPresets().map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setCashAmountPaid(String(v))}
                    className={`px-2 py-1 text-[9px] font-mono font-bold rounded-lg border shrink-0 transition-colors cursor-pointer ${
                      cashAmountPaid === String(v) 
                        ? 'bg-coffee-800 border-coffee-800 text-white' 
                        : 'bg-white border-coffee-200/70 text-coffee-700 hover:bg-cream-100'
                    }`}
                  >
                    {formatIDR(v)}
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* PRICING BREAKDOWN */}
        <div className="p-4 space-y-2">
          
          <div className="flex justify-between items-center text-xs text-coffee-700">
            <span>Subtotal Items</span>
            <span className="font-mono font-semibold">{formatIDR(cartSubtotal)}</span>
          </div>

          {discountAmount > 0 && (
            <div className="flex justify-between items-center text-xs text-red-650">
              <span>Diskon Kupon</span>
              <span className="font-mono font-semibold">- {formatIDR(discountAmount)}</span>
            </div>
          )}

          <div className="flex justify-between items-center text-xs text-coffee-700">
            <span>Pajak Restoran & Cafe (10%)</span>
            <span className="font-mono font-semibold">{formatIDR(taxAmount)}</span>
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-dashed border-coffee-200">
            <span className="text-xs font-black text-coffee-950 uppercase">TOTAL HARGA AKHIR</span>
            <span className="text-base font-extrabold text-coffee-950 font-mono tracking-wide">
              {formatIDR(cartTotal)}
            </span>
          </div>

          {/* CHECKOUT BUTTON ACTION */}
          <button
            id="pos-submit-checkout"
            onClick={handleCheckout}
            disabled={cart.length === 0}
            className={`w-full py-3.5 rounded-2xl text-xs font-extrabold tracking-widest uppercase transition-all shadow-md mt-2 cursor-pointer flex items-center justify-center gap-2 ${
              cart.length === 0
                ? 'bg-coffee-105 border border-coffee-200 text-coffee-405 opacity-55 cursor-not-allowed'
                : 'bg-sage-600 hover:bg-sage-700 text-cream-50 hover:scale-[1.01]'
            }`}
          >
            <Printer className="w-4 h-4" />
            BAYAR & CETAK STRUK SEKARANG
          </button>
        </div>

      </div>

      {/* Grid container closed */}
      </div>

      {/* RECEIPT thermal printer simulation modal */}
      <AnimatePresence>
        {showReceiptModal && lastCompletedTransaction && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl border border-coffee-300 w-full max-w-sm overflow-hidden shadow-2xl relative"
            >
              
              {/* Receipt close btn */}
              <button 
                onClick={() => setShowReceiptModal(false)}
                className="absolute top-4 right-4 p-1.5 bg-coffee-100 hover:bg-coffee-200 rounded-full transition-colors cursor-pointer text-coffee-800"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="p-6 overflow-y-auto">
                
                {/* Simulated thermal receipt paper content with dotted border style */}
                <div className="bg-amber-50/20 border-3 border-amber-900/10 p-5 rounded-2xl relative shadow-inner">
                  
                  {/* Thermal roll top design */}
                  <div className="w-3/4 mx-auto h-1.5 bg-coffee-300 rounded-full mb-4"></div>

                  <div className="text-center space-y-1">
                    <h3 className="font-extrabold text-base tracking-wider text-coffee-950">KOPI KLASIK</h3>
                    <p className="text-[9px] text-coffee-600">Jalan Sunset Road No. 45, Kuta, Bali</p>
                    <p className="text-[8px] text-coffee-550 font-mono">Telp: +62 821-4567-890</p>
                  </div>

                  {/* Receipt Meta details */}
                  <div className="border-t border-b border-dashed border-coffee-300 py-3 my-4 text-[9px] font-mono text-coffee-700 leading-relaxed">
                    <div className="flex justify-between">
                      <span>No Invoice:</span>
                      <span className="font-bold text-coffee-950">{lastCompletedTransaction.invoiceNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Kasir Staf:</span>
                      <span>{lastCompletedTransaction.cashierName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tanggal:</span>
                      <span>{new Date(lastCompletedTransaction.createdAt).toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Metode:</span>
                      <span className="font-bold">{lastCompletedTransaction.paymentMethod}</span>
                    </div>
                  </div>

                  {/* Items loop */}
                  <div className="space-y-3 py-2 text-[10px] font-mono">
                    {lastCompletedTransaction.items.map(it => (
                      <div key={it.productId} className="space-y-0.5">
                        <div className="flex justify-between gap-2">
                          <span className="font-bold text-coffee-900">{it.name}</span>
                          <span className="shrink-0 font-bold">{formatIDR(it.price * it.quantity)}</span>
                        </div>
                        <div className="flex justify-between text-[8px] text-coffee-550 border-b border-coffee-100/50 pb-1">
                          <span>
                            {it.quantity} Pcs × {formatIDR(it.price)} 
                            {` [Ukuran: ${it.size || 'Regular'}, Gula: ${it.sugar}, Es: ${it.ice}]`}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Calculations receipts summaries */}
                  <div className="border-t border-dashed border-coffee-300 pt-3 mt-4 space-y-1 text-[9px] font-mono text-coffee-700">
                    <div className="flex justify-between">
                      <span>Subtotal Harga</span>
                      <span>{formatIDR(lastCompletedTransaction.subtotal)}</span>
                    </div>
                    {lastCompletedTransaction.discount > 0 && (
                      <div className="flex justify-between text-red-650">
                        <span>Diskon Kupon</span>
                        <span>- {formatIDR(lastCompletedTransaction.discount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>PPn Resto (10%)</span>
                      <span>{formatIDR(lastCompletedTransaction.tax)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-coffee-950 font-black pt-1.5 border-t border-dashed border-coffee-200">
                      <span>TOTAL TAGIHAN</span>
                      <span>{formatIDR(lastCompletedTransaction.total)}</span>
                    </div>
                    <div className="flex justify-between pt-1 text-coffee-800">
                      <span>Jumlah Bayar</span>
                      <span>{formatIDR(lastCompletedTransaction.amountPaid)}</span>
                    </div>
                    <div className="flex justify-between text-sage-800 font-bold">
                      <span>Uang Kembali</span>
                      <span>{formatIDR(lastCompletedTransaction.amountChange)}</span>
                    </div>
                  </div>

                  <div className="text-center pt-6 mt-4 border-t border-dashed border-coffee-300">
                    <p className="text-[10px] font-extrabold text-coffee-900">TERIMA KASIH ATAS KUNJUNGANNYA</p>
                    <p className="text-[8px] text-coffee-500 mt-0.5">Seduh kenikmatan klasik setiap hari bersama kami.</p>
                  </div>

                </div>

                <div className="flex gap-2.5 mt-5">
                  <button
                    onClick={() => {
                      alert('Mengirim thermal layout cetak ke printer bluetooth...');
                      setShowReceiptModal(false);
                    }}
                    type="button"
                    className="flex-1 py-2.5 bg-coffee-800 hover:bg-coffee-900 text-cream-100 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Cetak Struk Fisik
                  </button>
                  <button
                    onClick={() => setShowReceiptModal(false)}
                    type="button"
                    className="flex-1 py-2.5 bg-coffee-100 hover:bg-coffee-200 text-coffee-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    Tutup
                  </button>
                </div>

              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
