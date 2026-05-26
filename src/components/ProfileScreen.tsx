import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { getStoredUsers, saveStoredUsers, saveActiveUserSession } from '../data';
import { 
  Shield, 
  Key, 
  Sparkles, 
  UserCheck, 
  Smartphone, 
  Check, 
  Lock, 
  RefreshCcw, 
  Eye, 
  EyeOff,
  LogOut, 
  Globe, 
  Activity, 
  Clock, 
  Trash2, 
  AlertTriangle, 
  Copy,
  Laptop,
  Tablet
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ProfileScreenProps {
  currentUser: User;
  onUpdateCurrentUser: (user: User) => void;
  onLogout: () => void;
}

export default function ProfileScreen({ currentUser, onUpdateCurrentUser, onLogout }: ProfileScreenProps) {
  const [name, setName] = useState(currentUser.name);
  const [avatar, setAvatar] = useState(currentUser.avatar || '☕');
  
  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
  // Advanced security states loaded dynamically from actual user entry
  const [mfaEnabled, setMfaEnabled] = useState(currentUser.mfaEnabled || false);
  const [quickPin, setQuickPin] = useState(currentUser.quickPin || '');
  const [autoLock, setAutoLock] = useState(currentUser.autoLock || 'never');
  const [sessionLogs, setSessionLogs] = useState<any[]>(
    currentUser.sessionLogs || [
      { id: '1', date: 'Hari ini', ip: '180.244.135.20', device: 'Chrome Client - Windows PC', location: 'Jakarta, Indonesia', status: 'Sesi Aktif' },
      { id: '2', date: 'Kemarin, 14:22', ip: '114.124.200.54', device: 'Safari - iPad Cashier Node', location: 'Bandung, Indonesia', status: 'Tersimpan (Otomatis)' },
      { id: '3', date: '25 Mei 2026, 09:12', ip: '223.255.228.12', device: 'Android POS Tablet v4', location: 'Surabaya, Indonesia', status: 'Sesi Berakhir' }
    ]
  );

  // UI state
  const [showPin, setShowPin] = useState(false);
  const [mfaSetupOpen, setMfaSetupOpen] = useState(false);
  const [mfaCodeTyped, setMfaCodeTyped] = useState('');
  const [mfaSuccessMsg, setMfaSuccessMsg] = useState('');
  const [mfaErrorMsg, setMfaErrorMsg] = useState('');
  
  // Feedback alerts
  const [sucMessage, setSucMessage] = useState('');
  const [errMessage, setErrMessage] = useState('');

  // Avatars options array
  const AVATAR_OPTIONS = ['☕', '👩‍💼', '👔', '🍵', '🍪', '🥐', ' barista', '🍩', '🥑', '💼'];

  // Update profile handler
  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setSucMessage('');
    setErrMessage('');

    if (!name.trim()) {
      setErrMessage('Mohon isi nama lengkap Anda dengan benar.');
      return;
    }

    const users = getStoredUsers();
    const updatedUsers = users.map((u: any) => {
      if (u.id === currentUser.id) {
        return {
          ...u,
          name,
          avatar
        };
      }
      return u;
    });

    saveStoredUsers(updatedUsers);

    const updatedSession: User = {
      ...currentUser,
      name,
      avatar
    };

    saveActiveUserSession(updatedSession);
    onUpdateCurrentUser(updatedSession);
    
    setSucMessage('Berhasil memperbarui rincian profil karyawan!');
    setTimeout(() => setSucMessage(''), 2500);
  };

  // Change password handler
  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setSucMessage('');
    setErrMessage('');

    if (!currentPassword || !newPassword) {
      setErrMessage('Mohon isi kolom kata sandi lama dan baru.');
      return;
    }

    const users = getStoredUsers();
    const userIdx = users.findIndex((u: any) => u.id === currentUser.id);

    if (userIdx === -1) {
      setErrMessage('Gagal mencocokkan pengguna.');
      return;
    }

    const dbUser = users[userIdx];
    if (dbUser.password !== currentPassword) {
      setErrMessage('Kata sandi saat ini yang Anda ketik salah.');
      return;
    }

    if (newPassword.length < 4) {
      setErrMessage('Password baru harus minimal 4 karakter.');
      return;
    }

    // save changes
    const updatedUsers = [...users];
    updatedUsers[userIdx] = {
      ...dbUser,
      password: newPassword
    };

    saveStoredUsers(updatedUsers);
    
    const updatedSession = { ...currentUser };
    onUpdateCurrentUser(updatedSession);

    setCurrentPassword('');
    setNewPassword('');
    setSucMessage('Kata sandi keamanan berhasil diganti! Sesi aman.');
    setTimeout(() => setSucMessage(''), 3000);
  };

  // Save advanced security configs
  const handleSaveSecurityConfigs = (configs: Partial<User>) => {
    const users = getStoredUsers();
    const updatedUsers = users.map((u: any) => {
      if (u.id === currentUser.id) {
        return {
          ...u,
          ...configs
        };
      }
      return u;
    });
    saveStoredUsers(updatedUsers);

    const updatedSession = {
      ...currentUser,
      ...configs
    };
    saveActiveUserSession(updatedSession);
    onUpdateCurrentUser(updatedSession);
  };

  // Handle auto lock preference
  const handleSelectAutoLock = (val: string) => {
    setAutoLock(val);
    handleSaveSecurityConfigs({ autoLock: val });
    setSucMessage(`Sesi otomatis terkunci diatur ke: ${val === 'never' ? 'Selalu Aktif' : val + ' Menit'}`);
    setTimeout(() => setSucMessage(''), 2000);
  };

  // Set quick PIN
  const handleUpdateQuickPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickPin && !/^\d{4}$/.test(quickPin)) {
      setErrMessage('PIN Kasir harus berupa 4 angka numerik.');
      return;
    }

    handleSaveSecurityConfigs({ quickPin });
    setSucMessage('PIN Kasir cepat berhasil disimpan untuk validasi laci kasir.');
    setTimeout(() => setSucMessage(''), 2500);
  };

  // Turn off or configure 2FA
  const handleToggleMfa = () => {
    if (mfaEnabled) {
      // Promptly Switch off
      setMfaEnabled(false);
      handleSaveSecurityConfigs({ mfaEnabled: false });
      setSucMessage('Otentikasi Dua Faktor (2FA) dinonaktifkan.');
      setTimeout(() => setSucMessage(''), 2500);
    } else {
      // Opening simulation setup form
      setMfaSetupOpen(true);
      setMfaCodeTyped('');
      setMfaErrorMsg('');
      setMfaSuccessMsg('');
    }
  };

  // Verify simulated code for 2FA
  const handleVerifyMfaSetup = (e: React.FormEvent) => {
    e.preventDefault();
    if (mfaCodeTyped.trim() === '482910') {
      setMfaSuccessMsg('Kode valid! Otentikasi 2FA berhasil didaftarkan.');
      setTimeout(() => {
        setMfaEnabled(true);
        handleSaveSecurityConfigs({ mfaEnabled: true });
        setMfaSetupOpen(false);
        setSucMessage('Otentikasi Dua Faktor (2FA) berhasil diaktifkan untuk akun Anda!');
        setTimeout(() => setSucMessage(''), 3000);
      }, 1500);
    } else {
      setMfaErrorMsg('Kode TOTP salah! Silakan ketik kode demo "482910".');
    }
  };

  // Revoke device session
  const handleRevokeSession = (sessionId: string) => {
    const updatedLogs = sessionLogs.filter(s => s.id !== sessionId);
    setSessionLogs(updatedLogs);
    handleSaveSecurityConfigs({ sessionLogs: updatedLogs });
    setSucMessage('Sesi perangkat lain berhasil dide-otorisasi dan dicabut aksesnya.');
    setTimeout(() => setSucMessage(''), 2000);
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER SECTION */}
      <div className="bg-white p-6 rounded-2xl border border-coffee-200">
        <div>
          <h2 className="text-xl font-bold text-coffee-950 flex items-center gap-2">
            ⚙️ Pengaturan Profil & Keamanan Akun
          </h2>
          <p className="text-xs text-coffee-600 mt-0.5">Kelola identitas karyawan, kata sandi, 2FA, PIN Kasir, dan review perangkat aktif.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* PRIVILEGES & METADATA OVERVIEW SIDEBAR */}
        <div className="lg:col-span-4 bg-white p-5 rounded-3xl border border-coffee-200 text-center space-y-4 relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-coffee-600 to-sage-500"></div>

          <div className="pt-4">
            <span className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-cream-100 text-4xl border border-coffee-200 shadow-sm relative group">
              {avatar}
            </span>
            <div className="py-2.5">
              <h3 className="font-extrabold text-base text-coffee-950">{currentUser.name}</h3>
              <p className="text-xs text-coffee-550 font-semibold">{currentUser.email}</p>
            </div>
          </div>

          {/* PRIVILEGE BADGE BASED ON RBAC ROLE */}
          <div className="bg-coffee-50 p-4 rounded-2xl text-left border border-coffee-200/60">
            <span className="text-[9px] font-bold text-coffee-500 block uppercase tracking-wide">Privilege Hak Akses</span>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="p-1 px-2.5 bg-coffee-800 text-cream-100 font-extrabold text-[10px] rounded-md uppercase tracking-wider">
                👑 {currentUser.role}
              </span>
              <span className="text-[10px] text-coffee-700 font-bold">
                {currentUser.role === 'admin' && 'Akses Penuh Pengaturan'}
                {currentUser.role === 'kasir' && 'Hanya Menu Transaksi & POS'}
                {currentUser.role === 'manager' && 'Akses Laporan & Inventaris'}
              </span>
            </div>

            <div className="pt-4 border-t border-coffee-250 mt-4 space-y-2 text-[10px] text-coffee-700 font-sans">
              <div className="flex justify-between items-center">
                <span>Status Staf:</span>
                <span className="font-bold text-sage-700 flex items-center gap-1">
                  ● AKTIF
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>2FA Otentikasi:</span>
                <span className={`font-bold text-[9px] px-2 py-0.5 rounded ${mfaEnabled ? 'bg-sage-600 text-white' : 'bg-amber-100 text-amber-800'}`}>
                  {mfaEnabled ? 'AKTIF (MFA)' : 'LINDUNGI AKUN'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>PIN Transaksi POS:</span>
                <span className="font-semibold text-coffee-900">{quickPin ? '✓ Terpasang' : 'Belum diisi'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Tingkat Keamanan:</span>
                <span className="text-sage-600 font-extrabold">{mfaEnabled ? 'MFA HIGH SECURED' : 'STANDARD LOCAL'}</span>
              </div>
            </div>
          </div>

          <button
            onClick={onLogout}
            type="button"
            className="w-full py-2.5 border border-red-200 text-red-650 hover:bg-red-50 hover:text-red-700 transition-all rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-4 h-4" /> Keluar dari Sistem (Logout)
          </button>
        </div>

        {/* PROFILE EDIT DETAILS FORM */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* FEEDBACK LABELS */}
          {sucMessage && (
            <div className="bg-sage-50 border border-sage-200 p-3.5 rounded-xl text-xs text-sage-800 font-bold flex items-center gap-2 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-sage-600 animate-ping"></span>
              <span>{sucMessage}</span>
            </div>
          )}
          {errMessage && (
            <div className="bg-red-50 border border-red-200 p-3.5 rounded-xl text-xs text-red-700 font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-650"></span>
              <span>{errMessage}</span>
            </div>
          )}

          {/* EDIT PROFILE DETAILS */}
          <div className="bg-white p-6 rounded-3xl border border-coffee-200">
            <h4 className="font-bold text-sm text-coffee-950 mb-4 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-coffee-600" /> Perbarui Detail Profil Anda
            </h4>

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-coffee-805 mb-1.5">NAMA LENGKAP</label>
                  <input
                    id="profile-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs bg-coffee-50 border border-coffee-200 rounded-xl font-bold focus:outline-none focus:ring-1 focus:ring-coffee-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-coffee-805 mb-1.5">AKSES AVATAR SYMBOL</label>
                  <select
                    id="profile-avatar-select"
                    value={avatar}
                    onChange={(e) => setAvatar(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs bg-coffee-50 border border-coffee-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-coffee-500"
                  >
                    {AVATAR_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt} Pilihan Avatar</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Fast Inline Emoji Avatar selector */}
              <div className="space-y-1.5">
                <span className="block text-[10px] text-coffee-600 font-bold">PRESET BARISTA & ANGGOTA STAF QUICK LOGO:</span>
                <div className="flex gap-2 flex-wrap">
                  {AVATAR_OPTIONS.map(emoji => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setAvatar(emoji)}
                      className={`w-9 h-9 rounded-xl border flex items-center justify-center text-lg transition-all cursor-pointer ${
                        avatar === emoji 
                          ? 'bg-coffee-850 border-coffee-900 shadow-sm scale-110 text-cream-50' 
                          : 'bg-white border-coffee-200 hover:bg-coffee-50'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-coffee-100 flex justify-end">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-coffee-800 hover:bg-coffee-900 text-cream-100 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Simpan Perubahan Identitas
                </button>
              </div>
            </form>
          </div>

          {/* SECURITY LEVEL SETTINGS PANEL */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* MFA TWO-FACTOR AUTH CARD */}
            <div className="bg-white p-6 rounded-3xl border border-coffee-200 flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-sm text-coffee-950 mb-1 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-coffee-600" /> Otentikasi 2-Faktor (2FA)
                </h4>
                <p className="text-[11px] text-coffee-600 mb-4 font-sans leading-relaxed">
                  Amankan sesi kasir dengan verifikasi ganda saat berpindah perangkat atau login ulang.
                </p>

                <div className="bg-coffee-50 p-3 rounded-xl border border-coffee-100 flex items-center justify-between mb-4">
                  <span className="text-[11px] font-bold text-coffee-805">Status Proteksi:</span>
                  <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${mfaEnabled ? 'bg-sage-600 text-white animate-pulse' : 'bg-red-55 text-red-650'}`}>
                    {mfaEnabled ? '🔐 AKTIF' : '⚠️ NONAKTIF'}
                  </span>
                </div>
              </div>

              <div>
                {/* 2FA SETUP MODAL SIMULATION IF OPEN */}
                <AnimatePresence>
                  {mfaSetupOpen && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mb-4 bg-coffee-50/70 p-4 rounded-2xl border border-coffee-200/80 text-left space-y-3.5 overflow-hidden"
                    >
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-sage-600 shrink-0" />
                        <span className="text-[11px] font-bold text-coffee-900 uppercase">Aktivasi Keamanan 2FA</span>
                      </div>
                      
                      <div className="flex gap-3 bg-white p-2.5 rounded-xl border border-coffee-100">
                        {/* Simulated QR Code */}
                        <div className="w-16 h-16 bg-ash border-4 border-white flex flex-col p-1 shrink-0 relative">
                          <div className="grid grid-cols-4 gap-1 h-full w-full">
                            {[...Array(16)].map((_, i) => (
                              <div key={i} className={`rounded-xs ${i % 3 === 0 || i % 5 === 2 ? 'bg-coffee-950' : 'bg-white'}`} />
                            ))}
                          </div>
                          <span className="absolute bottom-0 inset-x-0 text-[6px] text-center bg-coffee-900 text-cream-50 font-bold scale-90">QR-SEC</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[9px] text-coffee-600 font-sans leading-relaxed">
                            Pindai QR ini di Google Authenticator / Microsoft Auth, atau salin key:
                          </p>
                          <code className="block text-[8px] font-mono text-coffee-900 bg-coffee-50 p-1 rounded mt-1 overflow-x-auto truncate font-bold">
                            KK-POS-MFA-AMANDA-SECRETKEY-2026
                          </code>
                        </div>
                      </div>

                      <div className="bg-sage-50 border border-sage-100 p-2.5 rounded-xl text-[10px] text-sage-800 font-medium">
                        📱 Verifikasi Simulator: Masukkan kode OTP demo berikut untuk mengaktifkan: <strong className="font-mono text-xs text-sage-900 bg-white px-1.5 py-0.5 rounded shadow-xs ml-1">482910</strong>
                      </div>

                      {mfaErrorMsg && (
                        <p className="text-[10px] text-red-650 font-bold">{mfaErrorMsg}</p>
                      )}
                      {mfaSuccessMsg && (
                        <p className="text-[10px] text-sage-600 font-bold flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> {mfaSuccessMsg}
                        </p>
                      )}

                      <form onSubmit={handleVerifyMfaSetup} className="flex gap-2 pt-1">
                        <input
                          type="text"
                          maxLength={6}
                          required
                          placeholder="Ketik 482910"
                          value={mfaCodeTyped}
                          onChange={(e) => {
                            setMfaCodeTyped(e.target.value.replace(/\D/g, ''));
                            setMfaErrorMsg('');
                          }}
                          className="w-full px-3 py-1.5 text-xs bg-white border border-coffee-200 rounded-lg text-center font-mono font-bold focus:outline-none focus:ring-1 focus:ring-coffee-500"
                        />
                        <button
                          type="submit"
                          className="px-4 py-1.5 bg-sage-600 text-white rounded-lg text-xs font-bold hover:bg-sage-700 transition-colors shrink-0 cursor-pointer"
                        >
                          Aktifkan
                        </button>
                      </form>

                      <button
                        type="button"
                        onClick={() => setMfaSetupOpen(false)}
                        className="text-[10px] text-coffee-500 hover:text-coffee-750 underline block text-center"
                      >
                        Batalkan Aktivasi
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  type="button"
                  onClick={handleToggleMfa}
                  className={`w-full py-2 px-4 rounded-xl text-xs font-bold transition-all text-center border cursor-pointer ${
                    mfaEnabled
                      ? 'bg-red-50 text-red-650 border-red-200 hover:bg-red-100 hover:text-red-750'
                      : 'bg-coffee-900 text-white border-transparent hover:bg-coffee-950'
                  }`}
                >
                  {mfaEnabled ? '⚙️ Matikan Otentikasi 2FA' : '🔐 Hubungkan & Aktifkan 2FA'}
                </button>
              </div>
            </div>

            {/* QUICK TRANSACTION PIN & TIMEOUT ACCESS CARD */}
            <div className="bg-white p-6 rounded-3xl border border-coffee-200 flex flex-col justify-between space-y-4">
              
              <div>
                <h4 className="font-bold text-sm text-coffee-950 mb-1 flex items-center gap-1.5">
                  <Key className="w-4 h-4 text-coffee-600" /> PIN Transaksi Instan
                </h4>
                <p className="text-[11px] text-coffee-600 font-sans leading-relaxed">
                  Gunakan PIN 4-angka sebagai verifikasi kilat saat checkout void, ubah kas, atau laci kas kasir.
                </p>

                <form onSubmit={handleUpdateQuickPin} className="mt-3.5 space-y-3">
                  <div className="relative">
                    <input
                      type={showPin ? 'text' : 'password'}
                      maxLength={4}
                      placeholder="Masukkan 4 angka PIN"
                      value={quickPin}
                      onChange={(e) => setQuickPin(e.target.value.replace(/\D/g, ''))}
                      className="w-full px-3 py-2 text-xs bg-coffee-50 border border-coffee-200 rounded-xl font-mono font-bold tracking-widest text-center"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-coffee-450 hover:text-coffee-650"
                    >
                      {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-1.5 bg-coffee-50 hover:bg-coffee-100 text-coffee-805 font-bold text-[10px] rounded-lg border border-coffee-200 transition-colors cursor-pointer text-center"
                  >
                    Simpan PIN Transaksi
                  </button>
                </form>
              </div>

              {/* SCREEN SLEEP / AUTO-LOCK SESSION */}
              <div className="border-t border-coffee-100 pt-3">
                <h4 className="font-bold text-xs text-coffee-950 mb-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-coffee-550" /> Kunci Sesi Otomatis (Auto-Lock)
                </h4>
                <p className="text-[10px] text-coffee-550 mb-2 font-sans">
                  Sistem akan mengunci layar POS saat terdeteksi diam (idle window).
                </p>

                <select
                  value={autoLock}
                  onChange={(e) => handleSelectAutoLock(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-coffee-50 border border-coffee-200 rounded-xl text-coffee-900 font-medium"
                >
                  <option value="never">Selalu Aktif (Tidak Pernah)</option>
                  <option value="1">Kunci Otomatis (1 Menit)</option>
                  <option value="5">Kunci Otomatis (5 Menit)</option>
                  <option value="15">Kunci Otomatis (15 Menit)</option>
                </select>
              </div>

            </div>

          </div>

          {/* PASSWORD SECURITY FORM PANEL */}
          <div className="bg-white p-6 rounded-3xl border border-coffee-200">
            <h4 className="font-bold text-sm text-coffee-950 mb-4 flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-coffee-600" /> Keamanan Kata Sandi Akun
            </h4>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-coffee-805 mb-1.5">KATA SANDI SEKARANG / LAMA</label>
                  <input
                    id="curr-pass-input"
                    type="password"
                    placeholder="Keras sandi aktif saat ini"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs bg-coffee-50 border border-coffee-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-coffee-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-coffee-805 mb-1.5">KATA SANDI BARU</label>
                  <input
                    id="new-pass-input"
                    type="password"
                    placeholder="Minimal 4 karakter"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs bg-coffee-50 border border-coffee-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-coffee-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-coffee-100 flex justify-between items-center text-[11px] text-coffee-605 flex-wrap gap-2">
                <span className="font-sans">ℹ️ Untuk demo: sandi awal Admin adalah 'admin', Kasir adalah 'kasir', Manager adalah 'manager'.</span>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-sage-600 hover:bg-sage-700 text-white font-bold text-xs rounded-xl transition-colors shrink-0 cursor-pointer"
                >
                  Ganti Kata Sandi Keamanan
                </button>
              </div>
            </form>
          </div>

          {/* ACTIVE DEVICE SESSION & AUDIT AUDIENCE LOGS table */}
          <div className="bg-white p-6 rounded-3xl border border-coffee-200 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h4 className="font-bold text-sm text-coffee-950 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-coffee-600" /> Riwayat Keamanan Sesi & Perangkat Aktif
                </h4>
                <p className="text-xs text-coffee-550">Review daftar perangkat komputer atau smartphone yang sedang mengakses akun Anda hari ini.</p>
              </div>
              <span className="text-[10px] bg-coffee-50 border border-coffee-200 text-coffee-750 font-bold px-2 py-1 rounded">
                IP Lokal Anda: 180.244.135.20
              </span>
            </div>

            <div className="overflow-hidden border border-coffee-200/60 rounded-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-coffee-50 border-b border-coffee-200">
                      <th className="p-3 text-[10px] font-bold text-coffee-805 uppercase">Akses Perangkat</th>
                      <th className="p-3 text-[10px] font-bold text-coffee-805 uppercase">Alamat IP / Lokasi</th>
                      <th className="p-3 text-[10px] font-bold text-coffee-805 uppercase">Waktu Aktivitas</th>
                      <th className="p-3 text-[10px] font-bold text-coffee-805 uppercase">Status Keamanan</th>
                      <th className="p-3 text-[10px] font-bold text-coffee-805 uppercase text-right">Opsi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-coffee-100 text-[11px]">
                    {sessionLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-coffee-50/50">
                        <td className="p-3 flex items-center gap-2">
                          {log.device.includes('PC') ? (
                            <Laptop className="w-3.5 h-3.5 text-coffee-500" />
                          ) : (
                            <Tablet className="w-3.5 h-3.5 text-coffee-500" />
                          )}
                          <span className="font-bold text-coffee-900">{log.device}</span>
                        </td>
                        <td className="p-3 font-mono font-medium text-coffee-750">
                          {log.ip} <span className="text-coffee-500 text-[10px]">({log.location})</span>
                        </td>
                        <td className="p-3 text-coffee-600 font-sans">{log.date}</td>
                        <td className="p-3">
                          <span className={`inline-block text-[9 px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                            log.status.includes('Sesi Aktif')
                              ? 'bg-sage-50 text-sage-800 border border-sage-100'
                              : 'bg-coffee-105 text-coffee-750'
                          }`}>
                            ● {log.status}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          {log.status.includes('Sesi Aktif') ? (
                            <span className="text-[10px] text-sage-600 font-extrabold mr-1">Device Ini</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleRevokeSession(log.id)}
                              className="p-1 px-1.5 bg-red-50 text-red-650 hover:bg-red-50 hover:text-red-700 rounded border border-red-100 transition-all font-bold text-[9px] cursor-pointer"
                            >
                              Cabut Sesi
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-amber-50/50 border border-amber-200/50 p-3 rounded-2xl flex items-start gap-2 text-[10px] text-amber-800">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="leading-normal font-sans">
                Apabila Anda menemukan perangkat asing yang tidak dikenal, segera klik <strong>Cabut Sesi</strong> dan ganti kata sandi utama akun kasir Anda untuk menolak akses token liar.
              </p>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}

