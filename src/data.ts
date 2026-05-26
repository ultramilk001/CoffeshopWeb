import { Product, User, Transaction, UserRole } from './types';

// Default Coffee Shop Products
const DEFAULT_PRODUCTS: Product[] = [
  {
    id: 'p1',
    sku: 'CF-001',
    name: 'Kopi Susu Gula Aren Klasik',
    category: 'coffee',
    price: 22000,
    stock: 50,
    image: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&q=80&w=400',
    sugarLevel: true,
    iceLevel: true,
  },
  {
    id: 'p2',
    sku: 'CF-002',
    name: 'Double Shot Espresso',
    category: 'coffee',
    price: 18000,
    stock: 100,
    image: 'https://images.unsplash.com/photo-1510707577719-5d6dd7913ec7?auto=format&fit=crop&q=80&w=400',
    sugarLevel: false,
    iceLevel: false,
  },
  {
    id: 'p3',
    sku: 'CF-003',
    name: 'Creamy Cafe Latte XL',
    category: 'coffee',
    price: 28000,
    stock: 45,
    image: 'https://images.unsplash.com/photo-1570968915860-54d5c301fc9f?auto=format&fit=crop&q=80&w=400',
    sugarLevel: true,
    iceLevel: true,
  },
  {
    id: 'p4',
    sku: 'CF-004',
    name: 'Foamy Cappuccino',
    category: 'coffee',
    price: 28000,
    stock: 40,
    image: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?auto=format&fit=crop&q=80&w=400',
    sugarLevel: true,
    iceLevel: true,
  },
  {
    id: 'p5',
    sku: 'CF-005',
    name: 'Caramel Macchiato Dream',
    category: 'coffee',
    price: 32000,
    stock: 35,
    image: 'https://images.unsplash.com/photo-1485808191679-5f86510681a2?auto=format&fit=crop&q=80&w=400',
    sugarLevel: true,
    iceLevel: true,
  },
  {
    id: 'p6',
    sku: 'NC-001',
    name: 'Uji Matcha Latte Premium',
    category: 'non-coffee',
    price: 28000,
    stock: 30,
    image: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&q=80&w=400',
    sugarLevel: true,
    iceLevel: true,
  },
  {
    id: 'p7',
    sku: 'NC-002',
    name: 'Signature Dark Chocolate',
    category: 'non-coffee',
    price: 26000,
    stock: 40,
    image: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&q=80&w=400',
    sugarLevel: true,
    iceLevel: true,
  },
  {
    id: 'p8',
    sku: 'NC-003',
    name: 'Lychee Yakult Oolong Tea',
    category: 'non-coffee',
    price: 24000,
    stock: 45,
    image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&q=80&w=400',
    sugarLevel: false,
    iceLevel: true,
  },
  {
    id: 'p9',
    sku: 'FD-001',
    name: 'Nasi Goreng Kampung Rempah',
    category: 'food',
    price: 34000,
    stock: 25,
    image: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&q=80&w=400',
    sugarLevel: false,
    iceLevel: false,
  },
  {
    id: 'p10',
    sku: 'FD-002',
    name: 'French Fries & Herbs Sosis',
    category: 'food',
    price: 25000,
    stock: 30,
    image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&q=80&w=400',
    sugarLevel: false,
    iceLevel: false,
  },
  {
    id: 'p11',
    sku: 'PS-001',
    name: 'Flaky Golden Butter Croissant',
    category: 'pastry',
    price: 20000,
    stock: 20,
    image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&q=80&w=400',
    sugarLevel: false,
    iceLevel: false,
  },
  {
    id: 'p12',
    sku: 'PS-002',
    name: 'Pain au Chocolat Melt',
    category: 'pastry',
    price: 22000,
    stock: 18,
    image: 'https://images.unsplash.com/photo-1549931319-a545dcf3bc73?auto=format&fit=crop&q=80&w=400',
    sugarLevel: false,
    iceLevel: false,
  }
];

// Seed Users with passwords hashed or clean for simplicity
const SEED_USERS = [
  { id: 'u1', email: 'admin@kopiklasik.com', password: 'admin', name: 'Amanda Putrina', role: 'admin' as UserRole, avatar: '👩‍💼' },
  { id: 'u2', email: 'kasir@kopiklasik.com', password: 'kasir', name: 'Budi Santoso', role: 'kasir' as UserRole, avatar: '☕' },
  { id: 'u3', email: 'manager@kopiklasik.com', password: 'manager', name: 'Rian Wijaya', role: 'manager' as UserRole, avatar: '👔' }
];

// Help prefill mock transactions for rich analytics dashboard
const generateMockTransactions = (): Transaction[] => {
  const transactions: Transaction[] = [];
  const startDay = new Date();
  startDay.setDate(startDay.getDate() - 3); // Seed 3 days of data

  const paymentMethods: Transaction['paymentMethod'][] = ['QRIS', 'CASH', 'E-WALLET', 'BANK'];
  const itemsPool = DEFAULT_PRODUCTS;

  let invoiceCounter = 1001;

  for (let i = 0; i < 24; i++) {
    const timeOffset = Math.random() * 3 * 24 * 60 * 60 * 1000; // random offset within 3 days
    const txDate = new Date(Date.now() - timeOffset);

    // Pick 1 to 3 items
    const itemCount = Math.floor(Math.random() * 3) + 1;
    const txItems: Transaction['items'] = [];
    let subtotal = 0;

    for (let j = 0; j < itemCount; j++) {
      const p = itemsPool[Math.floor(Math.random() * itemsPool.length)];
      if (txItems.some(item => item.productId === p.id)) continue;

      const qty = Math.floor(Math.random() * 2) + 1;
      txItems.push({
        productId: p.id,
        name: p.name,
        price: p.price,
        quantity: qty,
        sugar: p.sugarLevel ? ['less', 'normal', 'extra'][Math.floor(Math.random() * 3)] : 'no',
        size: 'regular',
        ice: p.iceLevel ? ['less', 'normal'][Math.floor(Math.random() * 2)] : 'no'
      });
      subtotal += p.price * qty;
    }

    const discount = Math.random() > 0.7 ? (Math.random() > 0.5 ? 5000 : 10000) : 0;
    const cleanSubtotal = Math.max(subtotal - discount, 0);
    const tax = Math.round(cleanSubtotal * 0.1); // 10% tax
    const total = cleanSubtotal + tax;

    const pm = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
    const cashier = SEED_USERS[1]; // Cashier Budi Santoso

    const roundedTotal = Math.ceil(total / 100) * 100;
    const amtPaid = pm === 'CASH' ? roundedTotal + 10000 : roundedTotal;

    transactions.push({
      id: `tx_${Date.now() - Math.floor(Math.random() * 1000000)}_${invoiceCounter}`,
      invoiceNumber: `INV-KK-${txDate.getFullYear()}${String(txDate.getMonth() + 1).padStart(2, '0')}${String(txDate.getDate()).padStart(2, '0')}-${invoiceCounter}`,
      items: txItems,
      subtotal,
      tax,
      discount,
      total,
      paymentMethod: pm,
      amountPaid: amtPaid,
      amountChange: amtPaid - total,
      createdAt: txDate.toISOString(),
      cashierId: cashier.id,
      cashierName: cashier.name
    });

    invoiceCounter++;
  }

  // Sort by date newest first
  return transactions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

// Initial setup helper
export const initStorage = () => {
  if (!localStorage.getItem('kk_products')) {
    localStorage.setItem('kk_products', JSON.stringify(DEFAULT_PRODUCTS));
  }
  if (!localStorage.getItem('kk_users')) {
    localStorage.setItem('kk_users', JSON.stringify(SEED_USERS));
  }
  if (!localStorage.getItem('kk_transactions')) {
    localStorage.setItem('kk_transactions', JSON.stringify(generateMockTransactions()));
  }
};

// Read Helpers
export const getStoredProducts = (): Product[] => {
  initStorage();
  return JSON.parse(localStorage.getItem('kk_products') || '[]');
};

export const saveStoredProducts = (products: Product[]) => {
  localStorage.setItem('kk_products', JSON.stringify(products));
};

export const getStoredTransactions = (): Transaction[] => {
  initStorage();
  return JSON.parse(localStorage.getItem('kk_transactions') || '[]');
};

export const saveStoredTransactions = (transactions: Transaction[]) => {
  localStorage.setItem('kk_transactions', JSON.stringify(transactions));
};

export const getStoredUsers = () => {
  initStorage();
  return JSON.parse(localStorage.getItem('kk_users') || '[]');
};

export const saveStoredUsers = (users: any[]) => {
  localStorage.setItem('kk_users', JSON.stringify(users));
};

export const getActiveUserSession = (): User | null => {
  const active = localStorage.getItem('kk_active_user');
  return active ? JSON.parse(active) : null;
};

export const saveActiveUserSession = (user: User | null) => {
  if (user) {
    localStorage.setItem('kk_active_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('kk_active_user');
  }
};
