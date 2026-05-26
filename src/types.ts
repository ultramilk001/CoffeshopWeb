export type UserRole = 'admin' | 'kasir' | 'manager';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  mfaEnabled?: boolean;
  quickPin?: string;
  autoLock?: string;
  sessionLogs?: { id: string; date: string; ip: string; device: string; location: string; status: string }[];
}

export type ProductCategory = 'coffee' | 'non-coffee' | 'food' | 'pastry';

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: ProductCategory;
  price: number;
  stock: number;
  image: string;
  sugarLevel?: boolean; // Does it support custom sugar level?
  iceLevel?: boolean;   // Does it support custom ice level?
}

export interface CartItem {
  id: string; // unique cart item id (product.id + modifiers key if any)
  product: Product;
  quantity: number;
  sugar: 'normal' | 'less' | 'no' | 'extra';
  size: 'regular' | 'large';
  ice: 'normal' | 'less' | 'no' | 'hot';
}

export type PaymentMethod = 'CASH' | 'BANK' | 'QRIS' | 'E-WALLET';

export interface Transaction {
  id: string;
  invoiceNumber: string;
  items: {
    productId: string;
    name: string;
    price: number;
    quantity: number;
    sugar: string;
    size: string;
    ice: string;
  }[];
  subtotal: number;
  tax: number; // calculated tax amount
  discount: number; // discount amount
  total: number;
  paymentMethod: PaymentMethod;
  amountPaid: number;
  amountChange: number;
  createdAt: string; // ISO string
  cashierId: string;
  cashierName: string;
}

export interface SalesSummary {
  dailySales: number;
  totalTransactions: number;
  totalRevenue: number;
  bestSellers: {
    productId: string;
    name: string;
    category: ProductCategory;
    quantitySold: number;
    revenue: number;
  }[];
}
