import React, { useState } from 'react';
import { getStoredUsers, saveStoredUsers, saveActiveUserSession } from '../data';
import { User, UserRole } from '../types';
import { Coffee, Key, Mail, User as UserIcon, Shield, ArrowLeft, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LoginScreenProps {
  onLoginSuccess: (user: User) => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [view, setView] = useState<'login' | 'register' | 'forgot' | 'reset' | 'mfa-challenge'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('kasir');
  const [securityAnswer, setSecurityAnswer] = useState('');
  
  // Pending user with 2FA active
  const [pendingMfaUser, setPendingMfaUser] = useState<any | null>(null);
  const [mfaCodeTyped, setMfaCodeTyped] = useState('');

  // Reset flow
  const [resetEmail, setResetEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetCode, setResetCode] = useState('');
  
  // Feedback states
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Universal helper to perform active session establishment
  const performUserSessionLogin = (foundUser: any) => {
    if (foundUser.mfaEnabled === true) {
      setPendingMfaUser(foundUser);
      setView('mfa-challenge');
      setMfaCodeTyped('');
      setError('');
      setSuccess('');
      return;
    }

    const activeUser: User = {
      id: foundUser.id,
      name: foundUser.name,
      email: foundUser.email,
      role: foundUser.role,
      avatar: foundUser.avatar || '☕',
      mfaEnabled: foundUser.mfaEnabled || false,
      quickPin: foundUser.quickPin || '',
      autoLock: foundUser.autoLock || 'never'
    };
    saveActiveUserSession(activeUser);
    setSuccess(`Selamat datang kembali, ${activeUser.name}!`);
    setTimeout(() => {
      onLoginSuccess(activeUser);
    }, 700);
  };

  const handleVerifyMfaLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (mfaCodeTyped.trim() === '482910') {
      const activeUser: User = {
        id: pendingMfaUser.id,
        name: pendingMfaUser.name,
        email: pendingMfaUser.email,
        role: pendingMfaUser.role,
        avatar: pendingMfaUser.avatar || '☕',
        mfaEnabled: true,
        quickPin: pendingMfaUser.quickPin || '',
        autoLock: pendingMfaUser.autoLock || 'never'
      };
      saveActiveUserSession(activeUser);
      setSuccess(`Verifikasi berhasil! Selamat datang, ${activeUser.name}!`);
      setTimeout(() => {
        onLoginSuccess(activeUser);
      }, 750);
    } else {
      setError('Kode verifikasi 2FA salah! Ketik kode simulator "482910".');
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email || !password) {
      setError('Silakan isi seluruh kolom email dan password.');
      return;
    }

    const users = getStoredUsers();
    const foundUser = users.find((u: any) => u.email.toLowerCase() === email.toLowerCase() && u.password === password);

    if (foundUser) {
      performUserSessionLogin(foundUser);
    } else {
      setError('Kredensial salah. Silakan coba lagi atau gunakan akun demo di bawah.');
    }
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email || !password || !name) {
      setError('Silakan lengkapi seluruh kolom pendaftaran.');
      return;
    }

    const users = getStoredUsers();
    if (users.some((u: any) => u.email.toLowerCase() === email.toLowerCase())) {
      setError('Email ini sudah terdaftar.');
      return;
    }

    const newUser = {
      id: `u_${Date.now()}`,
      email: email.toLowerCase(),
      password,
      name,
      role,
      avatar: role === 'admin' ? '👩‍💼' : role === 'manager' ? '👔' : '☕',
      securityQuestion: 'Nama hewan peliharaan pertama?',
      securityAnswer: securityAnswer || 'kucing'
    };

    users.push(newUser);
    saveStoredUsers(users);

    setSuccess('Registrasi sukses! Silakan login dengan akun baru Anda.');
    setTimeout(() => {
      setView('login');
      setPassword('');
      setError('');
      setSuccess('');
    }, 1500);
  };

  const handleForgot = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!resetEmail) {
      setError('Silakan isi email untuk pemulihan.');
      return;
    }

    const users = getStoredUsers();
    const found = users.find((u: any) => u.email.toLowerCase() === resetEmail.toLowerCase());

    if (found) {
      setSuccess('Kode verifikasi telah dikirim ke email Anda (Demo: masukkan kode "1234")');
      setTimeout(() => {
        setView('reset');
      }, 1500);
    } else {
      setError('Email tidak terdaftar di sistem kami.');
    }
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!newPassword || resetCode !== '1234') {
      setError('Kode verifikasi salah (Gunakan demo kode "1234").');
      return;
    }

    const users = getStoredUsers();
    const updated = users.map((u: any) => {
      if (u.email.toLowerCase() === resetEmail.toLowerCase()) {
        return { ...u, password: newPassword };
      }
      return u;
    });

    saveStoredUsers(updated);
    setSuccess('Password berhasil diperbarui! Silakan login dengan password baru.');
    setTimeout(() => {
      setView('login');
      setEmail(resetEmail);
      setPassword('');
    }, 1500);
  };

  const loginAsDemo = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError('');
    setSuccess('');
    setTimeout(() => {
      const users = getStoredUsers();
      const foundUser = users.find((u: any) => u.email.toLowerCase() === demoEmail.toLowerCase() && u.password === demoPass);
      if (foundUser) {
        performUserSessionLogin(foundUser);
      }
    }, 100);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-coffee-50 p-4 md:p-8 relative overflow-hidden">
      {/* Decorative Ornaments to match Coffee vibe */}
      <div className="absolute -top-12 -left-12 w-64 h-64 bg-cream-100 rounded-full blur-3xl opacity-60"></div>
      <div className="absolute -bottom-12 -right-12 w-80 h-80 bg-sage-100 rounded-full blur-3xl opacity-60"></div>

      <div className="w-full max-w-md bg-white rounded-3xl border border-coffee-200 shadow-xl overflow-hidden relative z-10">
        
        {/* Banner Logo */}
        <div className="bg-gradient-to-br from-coffee-800 to-coffee-900 p-8 text-center text-white relative">
          <div className="absolute top-4 right-4 text-xs font-mono font-medium text-cream-200 bg-coffee-700/60 px-2 py-1 rounded">
            v1.2 POS Secured
          </div>
          <div className="inline-flex items-center justify-center w-16 h-16 bg-cream-100/10 rounded-2xl mb-3 backdrop-blur-md">
            <Coffee className="w-8 h-8 text-cream-100 animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-cream-50 font-sans">Kopi Klasik</h2>
          <p className="text-xs text-cream-200 mt-1">Sistem POS Pintar & Manajemen Inventaris Kedai Kopi</p>
        </div>

        <div className="p-6 md:p-8">
          <AnimatePresence mode="wait">
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-4 bg-red-50 border border-red-200 p-3 rounded-xl flex items-start gap-2.5 text-xs text-red-700 font-sans"
              >
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </motion.div>
            )}

            {success && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-4 bg-sage-50 border border-sage-200 p-3 rounded-xl flex items-start gap-2.5 text-xs text-sage-800 font-sans animate-bounce"
              >
                <CheckCircle2 className="w-4 h-4 text-sage-600 shrink-0 mt-0.5" />
                <span>{success}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* VIEW: 2FA MFA CHALLENGE */}
          {view === 'mfa-challenge' && pendingMfaUser && (
            <motion.div
              key="mfa-challenge"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
            >
              <div className="flex items-center gap-2 mb-4">
                <button
                  onClick={() => { setView('login'); setPendingMfaUser(null); setError(''); setSuccess(''); }}
                  className="p-1 hover:bg-coffee-50 rounded-lg transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4 text-coffee-800" />
                </button>
                <h3 className="text-lg font-bold text-coffee-950">Proteksi Keamanan 2FA</h3>
              </div>
              <p className="text-xs text-coffee-600 mb-6 leading-relaxed">
                Akun <strong>{pendingMfaUser.name}</strong> diamankan dengan Proteksi Ganda (2FA). Silakan masukkan kode verifikasi 6-digit dari aplikasi authenticator Anda.
              </p>

              <form onSubmit={handleVerifyMfaLogin} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-coffee-805 mb-1.5 text-center uppercase tracking-wider">KODE OTENTIKASI 6-DIGIT</label>
                  <input
                    id="mfa-login-code"
                    type="text"
                    maxLength={6}
                    required
                    placeholder="Ketik 482910"
                    value={mfaCodeTyped}
                    onChange={(e) => setMfaCodeTyped(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-4 py-3 text-lg font-mono font-bold tracking-widest text-center bg-coffee-50 border border-coffee-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-coffee-500"
                  />
                </div>

                <div className="bg-sage-50 border border-sage-100 p-2.5 rounded-xl text-[10px] text-sage-800 font-medium">
                  📱 Verifikasi Simulator: Masukkan kode simulasi 2FA yang terpasang pada profile Anda: <strong className="font-mono text-xs text-sage-900 bg-white px-2 py-0.5 rounded shadow-xs ml-1">482910</strong>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-coffee-850 hover:bg-coffee-950 text-cream-100 font-bold rounded-xl text-xs uppercase tracking-wider transition-colors shadow-md mt-2 flex items-center justify-center gap-2 cursor-pointer"
                >
                  Verifikasi & Masuk Sesi
                </button>
              </form>

              <div className="mt-5 text-center">
                <button
                  type="button"
                  onClick={() => { setView('login'); setPendingMfaUser(null); setError(''); setSuccess(''); }}
                  className="text-xs font-semibold text-coffee-700 hover:underline cursor-pointer"
                >
                  Batal, Kembali ke Login Utama
                </button>
              </div>
            </motion.div>
          )}

          {/* VIEW: LOGIN */}
          {view === 'login' && (
            <motion.div
              key="login"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
            >
              <h3 className="text-lg font-semibold text-coffee-950 mb-1">Masuk Akun</h3>
              <p className="text-xs text-coffee-600 mb-6">Gunakan email yang terdaftar untuk mengatur transaksi</p>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-coffee-800 mb-1.5" id="lbl-email">EMAIL KARYAWAN</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-coffee-400">
                      <Mail className="w-4 h-4" />
                    </span>
                    <input
                      id="input-login-email"
                      type="email"
                      required
                      placeholder="contoh: kasir@kopiklasik.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 text-sm bg-coffee-50 border border-coffee-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-coffee-500 focus:border-coffee-500"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-xs font-semibold text-coffee-800" id="lbl-pass">PASSWORD</label>
                    <button
                      type="button"
                      onClick={() => { setView('forgot'); setError(''); setSuccess(''); }}
                      className="text-xs font-medium text-coffee-600 hover:text-coffee-800 transition-colors"
                    >
                      Lupa password?
                    </button>
                  </div>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-coffee-400">
                      <Key className="w-4 h-4" />
                    </span>
                    <input
                      id="input-login-password"
                      type="password"
                      required
                      placeholder="Masukkan kata sandi"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 text-sm bg-coffee-50 border border-coffee-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-coffee-500 focus:border-coffee-500"
                    />
                  </div>
                </div>

                <button
                  id="btn-submit-login"
                  type="submit"
                  className="w-full py-3 bg-coffee-800 hover:bg-coffee-900 text-cream-100 font-semibold rounded-xl text-sm transition-colors shadow-md mt-2 flex items-center justify-center gap-2 cursor-pointer"
                >
                  Masuk ke Aplikasi
                </button>
              </form>

              <div className="mt-5 text-center">
                <p className="text-xs text-coffee-600">
                  Belum punya akun?{' '}
                  <button
                    onClick={() => { setView('register'); setError(''); setSuccess(''); }}
                    className="font-semibold text-coffee-800 hover:underline transition-all cursor-pointer"
                  >
                    Daftar di Sini
                  </button>
                </p>
              </div>

              {/* DEMO ACCOUNTS DRAWER */}
              <div className="mt-8 pt-6 border-t border-coffee-100">
                <span className="block text-center text-[11px] font-bold text-sage-600 bg-sage-50 py-1 rounded-md mb-3 tracking-wider">
                  CEPAT LOG IN AKUN DEMO
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => loginAsDemo('admin@kopiklasik.com', 'admin')}
                    className="p-2 text-center border border-coffee-200 hover:bg-coffee-100 rounded-xl transition-all cursor-pointer"
                  >
                    <span className="block text-[10px] font-bold text-coffee-800">Admin</span>
                    <span className="text-[9px] text-coffee-500">Aman & Penuh</span>
                  </button>
                  <button
                    onClick={() => loginAsDemo('kasir@kopiklasik.com', 'kasir')}
                    className="p-2 text-center border border-coffee-200 hover:bg-coffee-100 rounded-xl transition-all cursor-pointer"
                  >
                    <span className="block text-[10px] font-bold text-coffee-800">Kasir</span>
                    <span className="text-[9px] text-coffee-500">POS Kasir</span>
                  </button>
                  <button
                    onClick={() => loginAsDemo('manager@kopiklasik.com', 'manager')}
                    className="p-2 text-center border border-coffee-200 hover:bg-coffee-100 rounded-xl transition-all cursor-pointer"
                  >
                    <span className="block text-[10px] font-bold text-coffee-800">Manager</span>
                    <span className="text-[9px] text-coffee-500">Laporan & Stok</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* VIEW: REGISTER */}
          {view === 'register' && (
            <motion.div
              key="register"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
            >
              <div className="flex items-center gap-2 mb-4">
                <button
                  onClick={() => { setView('login'); setError(''); setSuccess(''); }}
                  className="p-1 hover:bg-coffee-50 rounded-lg transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4 text-coffee-800" />
                </button>
                <h3 className="text-lg font-semibold text-coffee-950">Daftar Karyawan</h3>
              </div>
              <p className="text-xs text-coffee-600 mb-5">Daftarkan akun kasir atau staf baru ke dalam sistem lokal</p>

              <form onSubmit={handleRegister} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-coffee-800 mb-1" id="lbl-name">NAMA LENGKAP</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-coffee-400">
                      <UserIcon className="w-4 h-4" />
                    </span>
                    <input
                      id="input-reg-name"
                      type="text"
                      required
                      placeholder="contoh: Genta Buana"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 text-sm bg-coffee-50 border border-coffee-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-coffee-500 focus:border-coffee-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-coffee-800 mb-1" id="lbl-reg-email">ALAMAT EMAIL</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-coffee-400">
                      <Mail className="w-4 h-4" />
                    </span>
                    <input
                      id="input-reg-email"
                      type="email"
                      required
                      placeholder="contoh: genta@kopiklasik.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 text-sm bg-coffee-50 border border-coffee-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-coffee-500 focus:border-coffee-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-coffee-800 mb-1" id="lbl-reg-pass">PASSWORD</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-coffee-400">
                      <Key className="w-4 h-4" />
                    </span>
                    <input
                      id="input-reg-pass"
                      type="password"
                      required
                      placeholder="Buat sandi minimal 4 karakter"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 text-sm bg-coffee-50 border border-coffee-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-coffee-500 focus:border-coffee-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-coffee-800 mb-1" id="lbl-role">PERAN / JABATAN (ROLE)</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-coffee-400">
                      <Shield className="w-4 h-4" />
                    </span>
                    <select
                      id="select-reg-role"
                      value={role}
                      onChange={(e) => setRole(e.target.value as UserRole)}
                      className="w-full pl-10 pr-4 py-2 text-sm bg-coffee-50 border border-coffee-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-coffee-500 focus:border-coffee-500 appearance-none"
                    >
                      <option value="kasir">Kasir (Transaksi & Invoice)</option>
                      <option value="admin">Admin (Akses Penuh)</option>
                      <option value="manager">Manager (Laporan & Stok)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-coffee-800 mb-1">PERTANYAAN KEAMANAN (RESET PASS)</label>
                  <input
                    type="text"
                    placeholder="Nama peliharaan pertama?"
                    disabled
                    className="w-full px-4 py-1.5 text-xs bg-coffee-50/50 border border-coffee-100 rounded-xl text-coffee-600 outline-none"
                  />
                  <input
                    id="input-security"
                    type="text"
                    required
                    placeholder="Contoh: Kiko (Huruf kecil)"
                    value={securityAnswer}
                    onChange={(e) => setSecurityAnswer(e.target.value)}
                    className="w-full px-4 py-2 mt-1.5 text-sm bg-coffee-50 border border-coffee-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-coffee-500 focus:border-coffee-500"
                  />
                </div>

                <button
                  id="btn-submit-register"
                  type="submit"
                  className="w-full py-2.5 bg-sage-600 hover:bg-sage-700 text-white font-semibold rounded-xl text-sm transition-colors shadow-md mt-2 cursor-pointer"
                >
                  Daftarkan Pengguna Baru
                </button>
              </form>

              <div className="mt-4 text-center">
                <button
                  onClick={() => { setView('login'); setError(''); setSuccess(''); }}
                  className="text-xs font-semibold text-coffee-800 hover:underline cursor-pointer"
                >
                  Kembali ke halaman Login
                </button>
              </div>
            </motion.div>
          )}

          {/* VIEW: FORGOT PASSWORD */}
          {view === 'forgot' && (
            <motion.div
              key="forgot"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <div className="flex items-center gap-2 mb-4">
                <button
                  onClick={() => { setView('login'); setError(''); setSuccess(''); }}
                  className="p-1 hover:bg-coffee-50 rounded-lg transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4 text-coffee-800" />
                </button>
                <h3 className="text-lg font-semibold text-coffee-950">Lupa Password</h3>
              </div>
              <p className="text-xs text-coffee-600 mb-6">Demo: Sistem akan memproses jika email cocok dengan daftar lokal</p>

              <form onSubmit={handleForgot} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-coffee-800 mb-1.5">MASUKKAN EMAIL ANDA</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-coffee-400">
                      <Mail className="w-4 h-4" />
                    </span>
                    <input
                      id="input-forgot-email"
                      type="email"
                      required
                      placeholder="kasir@kopiklasik.com"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 text-sm bg-coffee-50 border border-coffee-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-coffee-500 focus:border-coffee-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-coffee-850 hover:bg-coffee-900 text-cream-100 font-semibold rounded-xl text-sm transition-colors shadow-sm cursor-pointer"
                >
                  Kirim Kode Verifikasi Pembatalan
                </button>
              </form>
            </motion.div>
          )}

          {/* VIEW: RESET PASSWORD INPUT */}
          {view === 'reset' && (
            <motion.div
              key="reset"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <h3 className="text-lg font-semibold text-coffee-950 mb-1">Setel Ulang Kata Sandi</h3>
              <p className="text-xs text-coffee-600 mb-6">Masukkan kode otentikasi demo untuk mengubah sandi</p>

              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-coffee-800 mb-1">KODE VERIFIKASI DEMO</label>
                  <input
                    id="input-reset-code"
                    type="text"
                    required
                    placeholder="Ketik angka '1234'"
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value)}
                    className="w-full px-4 py-2 text-sm bg-coffee-50 border border-coffee-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-coffee-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-coffee-800 mb-1">PASSWORD BARU</label>
                  <input
                    id="input-reset-newpass"
                    type="password"
                    required
                    placeholder="Buat sandi baru Anda"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-2 text-sm bg-coffee-50 border border-coffee-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-coffee-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-sage-600 hover:bg-sage-700 text-white font-semibold rounded-xl text-sm transition-colors shadow-sm cursor-pointer"
                >
                  Simpan Password Baru
                </button>
              </form>
            </motion.div>
          )}

        </div>
      </div>
    </div>
  );
}
