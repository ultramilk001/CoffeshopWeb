import React, { useState, useEffect } from 'react';
import { User, UserRole } from './types';
import { getActiveUserSession, saveActiveUserSession, initStorage, getStoredUsers } from './data';
import LoginScreen from './components/LoginScreen';
import DashboardScreen from './components/DashboardScreen';
import CashierScreen from './components/CashierScreen';
import InventoryScreen from './components/InventoryScreen';
import ProfileScreen from './components/ProfileScreen';
import { 
  Coffee, 
  LayoutDashboard, 
  ShoppingCart, 
  ClipboardList, 
  User as UserIcon, 
  LogOut, 
  ShieldCheck, 
  Lock, 
  Clock,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'kasir' | 'inventaris' | 'profile'>('profile');
  const [currentLocalTime, setCurrentLocalTime] = useState<string>('');

  // Screen AutoLock states
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [unlockInput, setUnlockInput] = useState<string>('');
  const [unlockError, setUnlockError] = useState<string>('');

  // Initial trigger to boot local statistics
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  // Inactivity tracking for Auto-Lock
  useEffect(() => {
    if (!currentUser || isLocked) return;
    
    // Default config
    const timeoutSetting = currentUser.autoLock || 'never';
    if (timeoutSetting === 'never') return;

    const timeoutMs = parseInt(timeoutSetting) * 60 * 1000;
    let timer: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        setIsLocked(true);
      }, timeoutMs);
    };

    // Listen to user interaction events
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    const resetHandler = () => resetTimer();

    events.forEach(event => {
      window.addEventListener(event, resetHandler);
    });

    // Initial trigger
    resetTimer();

    return () => {
      clearTimeout(timer);
      events.forEach(event => {
        window.removeEventListener(event, resetHandler);
      });
    };
  }, [currentUser, isLocked]);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    setUnlockError('');

    if (!currentUser) return;

    // Fetch matching user from stored users to check modern credentials
    const users = getStoredUsers();
    const dbUser = users.find((u: any) => u.id === currentUser.id);

    if (!dbUser) {
      setUnlockError('Kesalahan sistem: pengguna gagal diverifikasi.');
      return;
    }

    // Match password or PIN
    const isPasswordMatch = unlockInput === dbUser.password;
    const isPinMatch = dbUser.quickPin && unlockInput === dbUser.quickPin;

    if (isPasswordMatch || isPinMatch) {
      setIsLocked(false);
      setUnlockInput('');
      setUnlockError('');
    } else {
      setUnlockError('PIN Transaksi atau sandi salah!');
    }
  };

  // Initialize DB and Authenticate layout on mount
  useEffect(() => {
    initStorage();
    const session = getActiveUserSession();
    setCurrentUser(session);
    
    if (session) {
      // Set default tab based on user's authorized role configuration
      if (session.role === 'kasir') {
        setActiveTab('kasir');
      } else if (session.role === 'manager' || session.role === 'admin') {
        setActiveTab('dashboard');
      }
    }
  }, []);

  // Sync real-time clock to page margins
  useEffect(() => {
    const updateTime = () => {
      const date = new Date();
      setCurrentLocalTime(
        date.toLocaleTimeString('id-id', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }) + ' WIB'
      );
    };
    updateTime();
    const timerId = setInterval(updateTime, 1000);
    return () => clearInterval(timerId);
  }, []);

  // Handle Login success callback
  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    // Role based target tab
    if (user.role === 'kasir') {
      setActiveTab('kasir');
    } else {
      setActiveTab('dashboard');
    }
  };

  // Perform logout security
  const handleLogout = () => {
    saveActiveUserSession(null);
    setCurrentUser(null);
  };

  // Safe tab switcher enforcing RBAC authority
  const isTabAllowed = (tab: typeof activeTab, role?: UserRole): boolean => {
    if (!role) return false;
    if (role === 'admin') return true; // admin has absolute full access
    
    if (tab === 'dashboard') return role === 'manager';
    if (tab === 'kasir') return role === 'kasir';
    if (tab === 'inventaris') return role === 'manager';
    if (tab === 'profile') return true; // all users can access profile
    
    return false;
  };

  const getRoleDisplayName = (role: UserRole) => {
    if (role === 'admin') return 'Admin Penuh';
    if (role === 'kasir') return 'Kasir Staf';
    if (role === 'manager') return 'Manager Operational';
    return role;
  };

  const currentTabRender = () => {
    if (!currentUser) return null;

    // Enforce tab checks
    if (!isTabAllowed(activeTab, currentUser.role)) {
      return (
        <div className="bg-white p-8 rounded-3xl border border-coffee-200 text-center space-y-4 max-w-md mx-auto my-12 shadow-sm">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-red-50 text-red-650 rounded-full border border-red-100">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-coffee-950 uppercase tracking-wider">Akses Terbatas Keamanan</h3>
          <p className="text-xs text-coffee-600 leading-normal font-sans">
            Maaf, akun Anda dengan peran <strong>{getRoleDisplayName(currentUser.role)}</strong> tidak diizinkan mengakses panel ini. Hubungi Admin Kopi Klasik untuk mengubah hak prerogatif.
          </p>
          <button
            onClick={() => setActiveTab('profile')}
            className="px-4 py-2 bg-coffee-800 text-cream-50 rounded-xl text-xs font-bold hover:bg-coffee-900 transition-colors"
          >
            Kembali ke Profil Saya
          </button>
        </div>
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return <DashboardScreen key={refreshTrigger} />;
      case 'kasir':
        return (
          <CashierScreen 
            currentUser={currentUser} 
            onRefreshStats={() => setRefreshTrigger(p => p + 1)} 
          />
        );
      case 'inventaris':
        return <InventoryScreen />;
      case 'profile':
        return (
          <ProfileScreen 
            currentUser={currentUser} 
            onUpdateCurrentUser={setCurrentUser} 
            onLogout={handleLogout} 
          />
        );
      default:
        return <ProfileScreen currentUser={currentUser} onUpdateCurrentUser={setCurrentUser} onLogout={handleLogout} />;
    }
  };

  // Unauthenticated viewport: LoginScreen
  if (!currentUser) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  // If session is locked, render the gorgeous security lock screen overlay!
  if (isLocked) {
    return (
      <div className="min-h-screen bg-coffee-950 flex items-center justify-center p-4 relative overflow-hidden font-sans select-none">
        {/* Background blobs */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-coffee-900 rounded-full blur-3xl opacity-35"></div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-sage-900 rounded-full blur-3xl opacity-25"></div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm bg-white rounded-3xl border border-coffee-200 p-6 md:p-8 text-center shadow-2xl relative z-10 space-y-5"
        >
          {/* Lock Icon */}
          <div className="mx-auto w-14 h-14 bg-coffee-50 border border-coffee-200 rounded-full flex items-center justify-center text-coffee-800 shadow-inner relative">
            <Lock className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500 items-center justify-center text-[8px] text-white font-bold font-mono">IDL</span>
            </span>
          </div>

          <div>
            <h2 className="text-base font-extrabold text-coffee-950 uppercase tracking-wider">Aplikasi POS Terkunci</h2>
            <p className="text-[11px] text-coffee-600 font-semibold animate-pulse">Sesi Anda terkunci otomatis karena terdeteksi diam.</p>
          </div>

          {/* User profile preview */}
          <div className="bg-coffee-50 p-3.5 rounded-2xl border border-coffee-100 flex items-center gap-3 text-left">
            <span className="w-11 h-11 bg-cream-100 border border-coffee-205 rounded-full flex items-center justify-center text-2xl shadow-sm">
              {currentUser.avatar || '☕'}
            </span>
            <div>
              <h3 className="font-bold text-xs text-coffee-950">{currentUser.name}</h3>
              <p className="text-[10px] text-coffee-550 font-bold uppercase tracking-wider">{getRoleDisplayName(currentUser.role)}</p>
            </div>
          </div>

          {/* Input unlock credentials */}
          <form onSubmit={handleUnlock} className="space-y-3 text-left">
            <div>
              <label className="block text-[10px] font-bold text-coffee-805 mb-1.5 uppercase tracking-wider text-center">
                Verifikasi Kata Sandi atau PIN Kasir
              </label>
              <input
                id="unlock-credentials-input"
                type="password"
                required
                placeholder="Masukkan password / PIN 4-angka"
                value={unlockInput}
                onChange={(e) => {
                  setUnlockInput(e.target.value);
                  setUnlockError('');
                }}
                className="w-full px-3 py-2.5 text-xs text-center font-bold tracking-widest bg-coffee-50 border border-coffee-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-coffee-500"
              />
            </div>

            {unlockError && (
              <p className="text-[10px] text-red-650 font-bold text-center">
                ⚠️ {unlockError}
              </p>
            )}

            <button
              type="submit"
              className="w-full py-2.5 bg-coffee-800 hover:bg-coffee-950 text-cream-50 font-extrabold rounded-xl text-xs uppercase tracking-wider shadow-md transition-colors cursor-pointer"
            >
              Buka Layar Kasir
            </button>
          </form>

          <div className="pt-3 border-t border-coffee-105 flex items-center justify-between text-[11.5px] font-medium">
            <button
              type="button"
              onClick={() => {
                setIsLocked(false);
                handleLogout();
              }}
              className="text-red-650 hover:underline hover:text-red-755 font-bold flex items-center gap-1 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" /> Ganti Akun Staf
            </button>
            <span className="text-coffee-450 font-mono text-[9px]">Server POS v1.2</span>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-coffee-50 text-coffee-950 flex flex-col font-sans selection:bg-coffee-200">
      
      {/* COZY HEADER NAVIGATION BAR with Brown, Cream, and Green style details */}
      <header className="bg-white border-b border-coffee-200/80 sticky top-0 z-40 shadow-sm px-4 md:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between h-18">
          
          {/* Brand Logo design */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-sage-600 text-white rounded-xl flex items-center justify-center border border-sage-700 shadow-inner">
              <Coffee className="w-5 h-5" />
            </div>
            <div>
              <span className="text-sm font-black text-coffee-950 uppercase tracking-widest block leading-tight font-sans">
                Kopi Klasik
              </span>
              <span className="text-[10px] text-sage-600 font-bold block leading-none font-sans">
                Aplikasi Kasir POS Modern
              </span>
            </div>
          </div>

          {/* REALTIME SYSTEM CLOCK WIDGET */}
          <div className="hidden md:flex items-center gap-2 bg-coffee-50 border border-coffee-200 px-3 py-1.5 rounded-full text-xs font-mono font-bold text-coffee-805">
            <Clock className="w-3.5 h-3.5 text-coffee-600" />
            <span>{currentLocalTime}</span>
          </div>

          {/* Nav pills links based on role checks */}
          <nav className="flex items-center gap-1">
            
            {/* Nav Pill 1: Dashboard (Only manager or admin) */}
            {isTabAllowed('dashboard', currentUser.role) && (
              <button
                id="tab-btn-dashboard"
                onClick={() => setActiveTab('dashboard')}
                className={`px-3 py-2 text-xs font-extrabold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'dashboard'
                    ? 'bg-sage-600 text-white scale-102 shadow-sm font-black'
                    : 'text-coffee-750 hover:bg-coffee-100/60'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span className="hidden sm:inline">Laporan</span>
              </button>
            )}

            {/* Nav Pill 2: Cashier checkout (Only cashier or admin) */}
            {isTabAllowed('kasir', currentUser.role) && (
              <button
                id="tab-btn-kasir"
                onClick={() => setActiveTab('kasir')}
                className={`px-3 py-2 text-xs font-extrabold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'kasir'
                    ? 'bg-sage-600 text-white scale-102 shadow-sm font-black'
                    : 'text-coffee-750 hover:bg-coffee-100/60'
                }`}
              >
                <ShoppingCart className="w-4 h-4" />
                <span className="hidden sm:inline">Kasir POS</span>
              </button>
            )}

            {/* Nav Pill 3: Inventory Stock management (Only manager or admin) */}
            {isTabAllowed('inventaris', currentUser.role) && (
              <button
                id="tab-btn-inventaris"
                onClick={() => setActiveTab('inventaris')}
                className={`px-3 py-2 text-xs font-extrabold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'inventaris'
                    ? 'bg-sage-600 text-white scale-102 shadow-sm font-black'
                    : 'text-coffee-750 hover:bg-coffee-100/60'
                }`}
              >
                <ClipboardList className="w-4 h-4" />
                <span className="hidden sm:inline">Stok</span>
              </button>
            )}

            {/* Nav Pill 4: Users / Profile settings (All roles) */}
            <button
              id="tab-btn-profile"
              onClick={() => setActiveTab('profile')}
              className={`px-3 py-2 text-xs font-extrabold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'profile'
                  ? 'bg-sage-600 text-white scale-102 shadow-sm font-black'
                  : 'text-coffee-750 hover:bg-coffee-100/60'
              }`}
            >
              <UserIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Staf</span>
            </button>

            {/* Log Out button */}
            <button
              id="tab-btn-logout"
              onClick={handleLogout}
              title="Logout akun"
              className="p-2 ml-1 cursor-pointer text-red-650 hover:bg-red-50 hover:text-red-700 transition-colors rounded-xl"
            >
              <LogOut className="w-4 h-4" />
            </button>

          </nav>

        </div>
      </header>

      {/* SUB-NOTIFICATION BANNER ON RESTRICTED ROLES CHECK */}
      <div className="bg-gradient-to-r from-coffee-800 to-coffee-950 text-white text-[11px] font-medium py-2 px-4 md:px-8 border-b border-coffee-900 shadow-inner">
        <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold bg-white/15 px-2 py-0.5 rounded text-[10px] uppercase">
              {currentUser.role}
            </span>
            <span className="font-semibold text-cream-100 font-sans">
              Hai, {currentUser.name}! Anda dapat menguji berbagai peran dengan klik 'Logout' dan memilih akun demo instan.
            </span>
          </div>
          
          <div className="flex items-center gap-1 font-mono text-[10px] text-cream-205">
            <ShieldCheck className="w-3.5 h-3.5 text-sage-300" />
            <span>Koneksi Sesi Aman</span>
          </div>
        </div>
      </div>

      {/* CORE DISPLAY WINDOW SECTION */}
      <main className="flex-grow max-w-7xl w-full mx-auto p-4 md:p-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            {currentTabRender()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* PERSISTENT STEADY FOOTER DESIGN */}
      <footer className="bg-white border-t border-coffee-205/60 py-4.5 px-4 md:px-8 text-center text-[10px] text-coffee-600 mt-12">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <p className="font-sans font-medium text-coffee-505">
            © 2026 <strong>Kopi Klasik POS</strong>. Versi Standalone Premium. Dioperasikan secara lokal degan keamanan cache browser.
          </p>
          <div className="flex items-center gap-3">
            <span className="font-mono text-[9px] font-bold text-coffee-500 bg-coffee-50 px-2.5 py-1 rounded">
              SESS_KEY: POS_SESSION_SECURE
            </span>
            <span className="text-sage-700 font-black">
              ● Server Lokal Online
            </span>
          </div>
        </div>
      </footer>

    </div>
  );
}
