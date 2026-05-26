import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  Cpu, 
  Database, 
  RefreshCw, 
  CloudLightning, 
  Link2, 
  Settings, 
  CheckCircle2, 
  Copy, 
  Code, 
  Globe, 
  ArrowRight, 
  AlertCircle,
  HelpCircle,
  Lock,
  LogOut,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { initAuth, googleSignIn, googleLogout, getAccessToken } from '../googleAuth';
import { getStoredProducts, getStoredTransactions, getStoredUsers } from '../data';

export default function GoogleSheetsSync() {
  // Sync States
  const [googleUser, setGoogleUser] = useState<any | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [authChecking, setAuthChecking] = useState<boolean>(true);
  
  // Sheet configurations
  const [spreadsheetId, setSpreadsheetId] = useState<string>(
    localStorage.getItem('kk_sheet_id') || ''
  );
  const [spreadsheetUrl, setSpreadsheetUrl] = useState<string>(
    localStorage.getItem('kk_sheet_url') || ''
  );
  const [appScriptUrl, setAppScriptUrl] = useState<string>(
    localStorage.getItem('kk_appscript_url') || ''
  );

  // Status logs
  const [syncLogs, setSyncLogs] = useState<string[]>([]);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'linking' | 'syncing' | 'success' | 'error'>('idle');
  const [syncError, setSyncError] = useState<string>('');
  const [lastSyncedTime, setLastSyncedTime] = useState<string>(
    localStorage.getItem('kk_last_sync') || ''
  );

  // Script copying status
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [pingStatus, setPingStatus] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle');
  const [pingMessage, setPingMessage] = useState<string>('');

  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setGoogleUser(user);
        setAccessToken(token);
        setAuthChecking(false);
      },
      () => {
        setGoogleUser(null);
        setAccessToken(null);
        setAuthChecking(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const addLog = (message: string) => {
    setSyncLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const handleSignIn = async () => {
    setLoading(true);
    setSyncError('');
    try {
      const res = await googleSignIn();
      if (res) {
        setGoogleUser(res.user);
        setAccessToken(res.accessToken);
        addLog('Berhasil terhubung dengan Akun Google Google Cloud.');
      }
    } catch (err: any) {
      console.error(err);
      setSyncError('Koneksi OAuth dibatalkan atau Firebase bermasalah.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await googleLogout();
      setGoogleUser(null);
      setAccessToken(null);
      addLog('Sesi Google ditiadakan.');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Google Sheet creation
  const handleCreateNewSpreadsheet = async () => {
    if (!accessToken) return;
    setLoading(true);
    setSyncStatus('linking');
    setSyncError('');
    setSyncLogs([]);
    addLog('Mulai membuat Google Spreadsheet baru...');

    try {
      const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          properties: {
            title: `Kopi Klasik - POS Database Cloud (${new Date().toLocaleDateString('id-ID')})`
          },
          sheets: [
            { properties: { title: 'Products' } },
            { properties: { title: 'Transactions' } },
            { properties: { title: 'Users' } }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`Gagal membuat Sheet: ${response.statusText}`);
      }

      const data = await response.json();
      const id = data.spreadsheetId;
      const url = data.spreadsheetUrl;

      setSpreadsheetId(id);
      setSpreadsheetUrl(url);
      localStorage.setItem('kk_sheet_id', id);
      localStorage.setItem('kk_sheet_url', url);

      addLog(`Sukses membuat Spreadsheet dengan ID: ${id}`);
      addLog('Varian Tab [Products, Transactions, Users] berhasil diinisialisasi.');
      setSyncStatus('idle');
    } catch (error: any) {
      console.error(error);
      setSyncError(error.message || 'Gagal tersambung ke Google Drive API.');
      setSyncStatus('error');
    } finally {
      setLoading(false);
    }
  };

  // Manual save for Spreadsheet ID
  const handleSaveSpreadsheetSettings = (id: string) => {
    const trimmedId = id.trim();
    setSpreadsheetId(trimmedId);
    if (trimmedId) {
      const constructedUrl = `https://docs.google.com/spreadsheets/d/${trimmedId}/edit`;
      setSpreadsheetUrl(constructedUrl);
      localStorage.setItem('kk_sheet_id', trimmedId);
      localStorage.setItem('kk_sheet_url', constructedUrl);
    } else {
      setSpreadsheetUrl('');
      localStorage.removeItem('kk_sheet_id');
      localStorage.removeItem('kk_sheet_url');
    }
  };

  const handleSaveAppScriptUrl = (url: string) => {
    const trimmedUrl = url.trim();
    setAppScriptUrl(trimmedUrl);
    if (trimmedUrl) {
      localStorage.setItem('kk_appscript_url', trimmedUrl);
    } else {
      localStorage.removeItem('kk_appscript_url');
    }
  };

  // Synchronize All Data to Google Sheet
  const handleSyncToSheets = async () => {
    const token = accessToken || await getAccessToken();
    if (!token) {
      setSyncError('Kunci token kedaluwarsa. Mohon hubungkan kembali akun Google Anda.');
      return;
    }
    if (!spreadsheetId) {
      setSyncError('Pilih atau buat Google Spreadsheet terlebih dahulu.');
      return;
    }

    setLoading(true);
    setSyncStatus('syncing');
    setSyncError('');
    setSyncLogs([]);
    addLog('Memulai sinkronisasi data POS Kopi Klasik...');

    try {
      // 1. Sync Products
      addLog('Membaca produk lokal...');
      const localProducts = getStoredProducts();
      const productValues = [
        ['ID', 'SKU', 'Nama Produk', 'Kategori', 'Harga', 'Stok', 'Varian Gula', 'Varian Es'],
        ...localProducts.map(p => [
          p.id,
          p.sku,
          p.name,
          p.category,
          p.price,
          p.stock,
          p.sugarLevel ? 'Ya' : 'Tidak',
          p.iceLevel ? 'Ya' : 'Tidak'
        ])
      ];

      addLog(`Sinkronisasi ${localProducts.length} produk ke Tab 'Products'...`);
      const productRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Products!A1:H1000?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ values: productValues })
        }
      );
      if (!productRes.ok) throw new Error('Gagal memperbarui Tab Products. Pastikan nama tab sesuai.');

      // 2. Sync Transactions
      addLog('Membaca riwayat transaksi lokal...');
      const localTransactions = getStoredTransactions();
      const transactionValues = [
        [
          'ID Transaksi', 
          'Nomor Invoice', 
          'Daftar Belanja', 
          'Subtotal', 
          'Pajak (10%)', 
          'Diskon', 
          'Total Bayar', 
          'Metode Bayar', 
          'Uang Diterima', 
          'Kembalian', 
          'Tanggal Dibuat', 
          'Kasir ID', 
          'Nama Kasir'
        ],
        ...localTransactions.map(tx => [
          tx.id,
          tx.invoiceNumber,
          tx.items.map(it => `${it.name} (${it.quantity}x)`).join(', '),
          tx.subtotal,
          tx.tax,
          tx.discount,
          tx.total,
          tx.paymentMethod,
          tx.amountPaid,
          tx.amountChange,
          tx.createdAt,
          tx.cashierId,
          tx.cashierName
        ])
      ];

      addLog(`Sinkronisasi ${localTransactions.length} transaksi ke Tab 'Transactions'...`);
      const txRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Transactions!A1:M2000?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ values: transactionValues })
        }
      );
      if (!txRes.ok) throw new Error('Gagal memperbarui Tab Transactions. Pastikan nama tab sesuai.');

      // 3. Sync Users
      addLog('Membaca database pengguna...');
      const localUsers = getStoredUsers();
      const userValues = [
        ['ID', 'Email', 'Nama Karyawan', 'Peran/Role', 'Status MFA 2FA', 'PIN Transaksi'],
        ...localUsers.map(u => [
          u.id,
          u.email,
          u.name,
          u.role,
          u.mfaEnabled ? 'Aktif' : 'Nonaktif',
          u.quickPin || ''
        ])
      ];

      addLog(`Sinkronisasi ${localUsers.length} info karyawan ke Tab 'Users'...`);
      const userRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Users!A1:F200?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ values: userValues })
        }
      );
      if (!userRes.ok) throw new Error('Gagal memperbarui Tab Users. Pastikan nama tab sesuai.');

      // Complete!
      const timeString = new Date().toLocaleString('id-ID');
      setLastSyncedTime(timeString);
      localStorage.setItem('kk_last_sync', timeString);
      setSyncStatus('success');
      addLog('🎉 Sinkronisasi cloud Google Sheets sukses penuh!');
    } catch (err: any) {
      console.error(err);
      setSyncError(err.message || 'Terjadi kesalahan internet sewaktu push data.');
      setSyncStatus('error');
    } finally {
      setLoading(false);
    }
  };

  // Apps Script code content
  const APPS_SCRIPT_CODE = `/**
 * Google Apps Script - POS Kopi Klasik REST API Bridge
 * Taruh kode ini ke Extensions -> Apps Script di Google Sheets Anda.
 * Deploy sebagai "Web App", Atur Akses demi keamanan ke "Anyone" (Siapa saja).
 */

const SPREADSHEET_ID = "${spreadsheetId || 'ID_SPREADSHEET_ANDA'}";

function doGet(e) {
  try {
    const action = e.parameter.action;
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    if (action === "ping") {
      return jsonResponse({ status: "ok", message: "Koneksi Apps Script Aktif!", timestamp: new Date() });
    }
    
    if (action === "getProducts") {
      const data = getSheetData(sheet, "Products");
      return jsonResponse({ status: "success", data: data });
    }
    
    if (action === "getTransactions") {
      const data = getSheetData(sheet, "Transactions");
      return jsonResponse({ status: "success", data: data });
    }
    
    if (action === "getUsers") {
      const data = getSheetData(sheet, "Users");
      return jsonResponse({ status: "success", data: data });
    }
    
    return jsonResponse({ status: "error", message: "Aksi tidak dikenal." });
  } catch(err) {
    return jsonResponse({ status: "error", message: err.toString() });
  }
}

function doPost(e) {
  try {
    const postData = JSON.parse(e.postData.contents);
    const action = postData.action;
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    if (action === "addTransaction") {
      const tx = postData.transaction;
      const targetSheet = sheet.getSheetByName("Transactions");
      
      // Tambahkan baris baru
      targetSheet.appendRow([
        tx.id,
        tx.invoiceNumber,
        tx.itemsDescription, // flattened items list
        tx.subtotal,
        tx.tax,
        tx.discount,
        tx.total,
        tx.paymentMethod,
        tx.amountPaid,
        tx.amountChange,
        tx.createdAt || new Date().toISOString(),
        tx.cashierId,
        tx.cashierName
      ]);
      
      return jsonResponse({ status: "success", message: "Transaksi berhasil diinput ke Sheet Cloud!" });
    }
    
    return jsonResponse({ status: "error", message: "Aksi POST tidak valid." });
  } catch(err) {
    return jsonResponse({ status: "error", message: err.toString() });
  }
}

// Helper membaca data Sheet ke format object array JSON
function getSheetData(spreadsheet, sheetName) {
  const targetSheet = spreadsheet.getSheetByName(sheetName);
  if (!targetSheet) return [];
  
  const values = targetSheet.getDataRange().getValues();
  if (values.length <= 1) return [];
  
  const headers = values[0];
  const results = [];
  
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const obj = {};
    headers.forEach((header, index) => {
      obj[header.toString().toLowerCase().replace(/\\s+/g, "_")] = row[index];
    });
    results.push(obj);
  }
  return results;
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_CODE);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handlePingAppScript = async () => {
    if (!appScriptUrl) {
      setPingStatus('fail');
      setPingMessage('Harap masukkan URL Web App Apps Script Anda.');
      return;
    }
    
    setPingStatus('testing');
    setPingMessage('Melakukan ping API handshaking...');

    try {
      // Add action=ping query
      const urlWithAction = appScriptUrl.includes('?') 
        ? `${appScriptUrl}&action=ping` 
        : `${appScriptUrl}?action=ping`;

      const response = await fetch(urlWithAction);
      const data = await response.json();

      if (data && (data.status === 'ok' || data.status === 'success')) {
        setPingStatus('ok');
        setPingMessage(data.message || 'Handshake valid! Apps Script siap menerima instruksi query database.');
      } else {
        setPingStatus('fail');
        setPingMessage(`Diterima respons janggal: ${JSON.stringify(data)}`);
      }
    } catch (err: any) {
      console.error(err);
      setPingStatus('fail');
      setPingMessage('Gagal menghubungi Apps Script. Cek kembali izin Web App: diatur "Anyone" & pastikan tab browser Anda tidak memblokir CORS.');
    }
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-coffee-200 space-y-6">
      
      {/* Visual Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap border-b border-coffee-100 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-xl shadow-md">
              <FileSpreadsheet className="w-5 h-5" />
            </span>
            <h3 className="text-base font-extrabold text-coffee-950 uppercase tracking-wider">Integrasi Cloud Database Google</h3>
          </div>
          <p className="text-xs text-coffee-600 leading-relaxed font-sans">
            Menghubungkan laci kasir lokal langsung dengan <strong>Google Sheets</strong> dan **Google Apps Script** untuk pelaporan data terpusat real-time.
          </p>
        </div>

        {/* Connection Widget */}
        <div className="flex items-center gap-2">
          {googleUser ? (
            <div className="flex items-center gap-2.5 bg-sage-50/80 p-2 pl-3 pr-4 rounded-2xl border border-sage-200">
              {googleUser.photoURL ? (
                <img referrerPolicy="no-referrer" src={googleUser.photoURL} alt={googleUser.displayName} className="w-7 h-7 rounded-full border border-sage-200 shadow-sm" />
              ) : (
                <span className="w-7 h-7 rounded-full bg-sage-500 text-white flex items-center justify-center font-bold text-xs">G</span>
              )}
              <div className="text-left">
                <p className="text-[10px] font-bold text-sage-900 leading-tight truncate max-w-[120px]">{googleUser.displayName || 'Google Account'}</p>
                <span className="text-[8px] text-sage-600 font-mono">Linked & OAuth verified</span>
              </div>
              <button 
                onClick={handleSignOut}
                title="Disconnect Google Account"
                className="ml-1 p-1 hover:bg-red-100 rounded-md text-red-650 transition-colors pointer cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleSignIn}
              disabled={loading}
              className="px-4 py-2 bg-white text-coffee-805 hover:bg-coffee-50 font-bold text-xs border border-coffee-205 rounded-xl flex items-center gap-2 shadow-xs transition-all pointer cursor-pointer"
            >
              <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-4 h-4">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
              </svg>
              <span>Hubungkan Akun Google</span>
            </button>
          )}
        </div>
      </div>

      {/* Quick Setup Panel (Spreadsheet ID & Apps Script URL) */}
      <div className="bg-gradient-to-br from-coffee-50 to-amber-50/20 p-4.5 rounded-3xl border border-coffee-205 space-y-4 shadow-xs">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-[11px] font-black text-coffee-900 uppercase tracking-widest flex items-center gap-1.5">
            <CloudLightning className="w-4 h-4 text-amber-600 animate-pulse" />
            Konektor Instan Cloud Database
          </h4>
          <span className="text-[9px] text-coffee-600 font-medium">Tersimpan otomatis ke LocalStorage</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Column 1: SpreadSheet ID */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-[10px] font-black text-coffee-805 tracking-wider uppercase">
                📂 GOOGLE SPREADSHEET ID
              </label>
              {!googleUser && (
                <span className="text-[9px] text-amber-800 font-bold bg-amber-50 px-1 rounded">Hubungkan Akun Google Dahulu</span>
              )}
            </div>
            <div className="flex gap-2">
              <input
                id="quick-spreadsheet-id-input"
                type="text"
                placeholder="Masukkan Spreadsheet ID atau Klik Buat Baru"
                value={spreadsheetId}
                onChange={(e) => handleSaveSpreadsheetSettings(e.target.value)}
                className="flex-1 px-3 py-2 text-xs bg-white border border-coffee-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-coffee-500 font-mono font-medium text-coffee-950 shadow-inner"
              />
              <button
                type="button"
                onClick={handleCreateNewSpreadsheet}
                disabled={!googleUser || loading}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl disabled:bg-coffee-100 disabled:text-coffee-400 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-xs shrink-0"
                title={googleUser ? "Buat file Spreadsheet baru di Google Drive Anda secara instan" : "Silakan login Google Cloud di atas"}
              >
                Buat Baru
              </button>
            </div>
            {spreadsheetUrl ? (
              <div className="flex items-center justify-between text-[10.5px] bg-emerald-50/50 p-1.5 px-2.5 rounded-lg border border-emerald-100 mt-1">
                <span className="text-emerald-800 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Terkoneksi
                </span>
                <a 
                  href={spreadsheetUrl} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="text-emerald-700 hover:text-emerald-905 font-black flex items-center gap-0.5 underline cursor-pointer"
                >
                  Buka Google Sheets <Link2 className="w-3 h-3" />
                </a>
              </div>
            ) : (
              <p className="text-[9px] text-coffee-550 leading-tight">Belum ada file spreadsheet terkoneksi. Masukkan ID Spreadsheet atau klik tombol <strong>Buat Baru</strong>.</p>
            )}
          </div>

          {/* Column 2: Web App URL */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-black text-coffee-805 tracking-wider uppercase">
              ⚡ GOOGLE APPS SCRIPT WEB APP URL
            </label>
            <div className="flex gap-2">
              <input
                id="quick-apps-script-url-input"
                type="text"
                placeholder="https://script.google.com/macros/s/.../exec"
                value={appScriptUrl}
                onChange={(e) => handleSaveAppScriptUrl(e.target.value)}
                className="flex-1 px-3 py-2 text-xs bg-white border border-coffee-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-coffee-500 font-mono text-coffee-900 shadow-inner"
              />
              <button
                type="button"
                onClick={handlePingAppScript}
                disabled={pingStatus === 'testing' || !appScriptUrl}
                className="px-3.5 py-2 bg-coffee-800 hover:bg-coffee-950 text-cream-50 font-bold text-xs rounded-xl disabled:opacity-50 hover:shadow-xs transition-colors cursor-pointer shrink-0"
              >
                {pingStatus === 'testing' ? 'Testing...' : 'Tes Ping API'}
              </button>
            </div>
            {pingStatus === 'ok' && (
              <div className="text-[10px] bg-sage-50 text-sage-800 border border-sage-200 p-1.5 px-2.5 rounded-lg font-bold flex items-center gap-1 mt-1">
                <span className="inline-block w-2 h-2 rounded-full bg-sage-500 animate-ping"></span>
                <span>{pingMessage || "Koneksi Web App Apps Script Aktif & Siap Menerima Data!"}</span>
              </div>
            )}
            {pingStatus === 'fail' && (
              <div className="text-[10px] bg-red-50 text-red-700 border border-red-200 p-1.5 px-2.5 rounded-lg font-bold flex items-center gap-1 mt-1">
                <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                <span className="truncate max-w-[250px]">{pingMessage || "Ping Gagal. Periksa Deployment Web App Anda."}</span>
              </div>
            )}
            {pingStatus === 'idle' && !appScriptUrl && (
              <p className="text-[9px] text-coffee-550 leading-tight">Salin kode Apps Script di bawah, deploy pada menu Ekstensi Sheet Anda, lalu masukkan URL web app.</p>
            )}
            {pingStatus === 'idle' && appScriptUrl && (
              <p className="text-[9px] text-coffee-550 leading-tight">URL terisi. Klik tombol <strong>Tes Ping API</strong> untuk memverifikasi handshake endpoint database.</p>
            )}
          </div>
        </div>
      </div>

      {syncError && (
        <div className="bg-red-50 border border-red-200 p-3.5 rounded-2xl flex items-start gap-2.5 text-xs text-red-700 font-semibold">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">Gagal Sinkronisasi Cloud</p>
            <p className="text-[11px] font-medium leading-relaxed font-sans">{syncError}</p>
          </div>
        </div>
      )}

      {/* Grid Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Google Sheet Config Pane */}
        <div className="space-y-4">
          <div className="flex items-center gap-1.5 text-coffee-805">
            <Settings className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wide">1. Konfigurasi Spreadsheet</span>
          </div>

          <div className="space-y-3.5 bg-coffee-50/55 p-4 rounded-2xl border border-coffee-105">
            <div>
              <label className="block text-[10px] font-bold text-coffee-805 mb-1 tracking-wider uppercase">GOOGLE SPREADSHEET ID</label>
              <div className="flex gap-2">
                <input
                  id="spreadsheet-id-input"
                  type="text"
                  placeholder="Masukkan Spreadsheet ID"
                  value={spreadsheetId}
                  onChange={(e) => handleSaveSpreadsheetSettings(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs bg-white border border-coffee-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-coffee-500 font-mono"
                />
                
                <button
                  type="button"
                  onClick={handleCreateNewSpreadsheet}
                  disabled={!googleUser || loading}
                  className="px-3.5 py-2 bg-coffee-800 hover:bg-coffee-950 text-cream-50 font-bold text-xs rounded-xl disabled:bg-coffee-200 disabled:text-coffee-400 disabled:cursor-not-allowed cursor-pointer transition-colors shrink-0 flex items-center gap-1"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Buat Baru
                </button>
              </div>
              <p className="text-[9px] text-coffee-550 mt-1 font-sans">
                Hubungkan Google akun di kanan atas dahulu, lalu click <strong>Buat Baru</strong> untuk membuat otomatis, atau paste ID unik spreadsheet excel Anda yang sudah ada.
              </p>
            </div>

            {spreadsheetUrl && (
              <div className="bg-white p-2.5 rounded-xl border border-coffee-150 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5 text-coffee-750">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span className="font-semibold text-[10.5px] max-w-[170px] truncate">File Cloud Aktif</span>
                </div>
                <a 
                  href={spreadsheetUrl} 
                  target="_blank" 
                  rel="noreferrer"
                  className="text-xs text-emerald-600 hover:text-emerald-750 font-extrabold flex items-center gap-0.5 underline cursor-pointer"
                >
                  Buka Sheets <Link2 className="w-3.5 h-3.5" />
                </a>
              </div>
            )}

            <div className="pt-2">
              <button
                type="button"
                onClick={handleSyncToSheets}
                disabled={loading || !spreadsheetId}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                {syncStatus === 'syncing' ? 'Mengekspor data...' : 'Unggah / Sinkronkan Data POS Sekarang'}
              </button>
              
              {lastSyncedTime && (
                <div className="text-center mt-2">
                  <span className="text-[9.5px] font-bold text-sage-700 bg-sage-50 border border-sage-100 px-2 py-0.5 rounded-md">
                    ✓ Terakhir Disinkronkan: {lastSyncedTime}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Integration Live Log */}
        <div className="space-y-3 flex flex-col">
          <div className="flex items-center gap-1.5 text-coffee-805">
            <Database className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wide">Status Ekspedisi sinkronisasi</span>
          </div>

          <div className="flex-1 bg-coffee-950 text-cream-50 font-mono text-[9px] p-3.5 rounded-2xl border border-coffee-900 overflow-y-auto space-y-1.5 min-h-[140px] max-h-[190px] shadow-inner">
            {syncLogs.length === 0 ? (
              <span className="text-coffee-500 leading-relaxed block italic">Menunggu trigger sinkronisasi. Hasil log terminal POS akan muncul di sini...</span>
            ) : (
              syncLogs.map((log, idx) => (
                <div key={idx} className="leading-relaxed border-l-2 border-emerald-500 pl-2">
                  {log}
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Section 2: Apps Script Database Server Integration */}
      <div className="border-t border-coffee-100 pt-6 space-y-4">
        
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 text-coffee-805">
            <Cpu className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wide">2. REST API Engine Google Apps Script</span>
          </div>
          <span className="text-[10px] text-amber-800 bg-amber-50/70 border border-amber-100 px-2 py-0.5 rounded font-bold">
            Full-Stack API Database
          </span>
        </div>

        <p className="text-xs text-coffee-600 leading-relaxed font-sans mt-1">
          Dapatkan database server Anda sendiri secara gratis! Dengan menaruh kode **Google Apps Script** di bawah pada spreadsheet Anda, spreadsheet Anda akan berubah menjadi HTTP REST API untuk query produk, transaksi, dan cash management external.
        </p>

        {/* Action Panel Apps Script */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Script Copy Block */}
          <div className="lg:col-span-7 space-y-2">
            <div className="bg-coffee-50 rounded-2xl border border-coffee-200 overflow-hidden">
              <div className="bg-coffee-100/70 p-2.5 px-4 flex items-center justify-between border-b border-coffee-155">
                <span className="text-[10px] font-mono font-bold text-coffee-805 flex items-center gap-1">
                  <Code className="w-3.5 h-3.5" /> code.gs (Google Apps Script)
                </span>
                
                <button
                  onClick={handleCopyCode}
                  className="px-2.5 py-1 bg-white hover:bg-coffee-55 hover:text-coffee-900 border border-coffee-205 text-coffee-750 font-bold text-[10px] rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                >
                  {copiedCode ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-sage-600 animate-bounce" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin Kode</span>
                    </>
                  )}
                </button>
              </div>

              {/* Code Pre container */}
              <div className="p-3.5 pr-2 bg-coffee-950">
                <pre className="text-[9.5px] font-mono text-cream-100 bg-transparent overflow-x-auto p-1 leading-relaxed max-h-[190px] whitespace-pre font-medium overflow-y-auto custom-scrollbar">
                  {APPS_SCRIPT_CODE}
                </pre>
              </div>
            </div>

            <p className="text-[10px] text-coffee-550 leading-relaxed font-sans">
              💡 **Cara Memasang**: Buka Google Sheet Anda &rarr; Klik Menu **Ekstensi (Extensions)** &rarr; **Apps Script** &rarr; Hapus semua baris kode default &rarr; Paste kode di atas &rarr; Klik **Terapkan (Deploy)** &rarr; Pilih **Penerapan Baru (New Deployment)** &rarr; Di bagian 'Akses', pastikan diset **Who has access: Anyone** &rarr; klik Deploy lalu salin URL Web App yang dihasilkan.
            </p>
          </div>

          {/* Web App Access Panel */}
          <div className="lg:col-span-5 bg-coffee-50/40 p-4 border border-coffee-200 rounded-3xl space-y-4">
            
            <div>
              <label className="block text-[10px] font-bold text-coffee-805 mb-1.5 tracking-wider uppercase">GOOGLE APPS SCRIPT WEB APP URL</label>
              <input
                id="apps-script-url-input"
                type="text"
                placeholder="https://script.google.com/macros/s/.../exec"
                value={appScriptUrl}
                onChange={(e) => handleSaveAppScriptUrl(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-coffee-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-coffee-500 font-mono text-coffee-900"
              />
              <p className="text-[9px] text-coffee-550 mt-1 font-sans">
                Paste URL Deployment Web App Apps Script Anda di atas untuk menghubungkan endpoint pengujian.
              </p>
            </div>

            {/* Handshake Ping Verification widget */}
            <div className="bg-white p-3.5 border border-coffee-150 rounded-2xl space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[10.5px] font-bold text-coffee-805 uppercase tracking-wide">Tes Koneksi (Diagnostic Ping)</span>
                
                {pingStatus === 'ok' && (
                  <span className="text-[9px] bg-sage-50 text-sage-800 border border-sage-200 font-extrabold px-2 py-0.5 rounded-full">
                    KONEKSI OK
                  </span>
                )}
                {pingStatus === 'fail' && (
                  <span className="text-[9px] bg-red-50 text-red-650 border border-red-200 font-extrabold px-2 py-0.5 rounded-full animate-bounce">
                    TERTUNDA/GAGAL
                  </span>
                )}
                {pingStatus === 'testing' && (
                  <span className="text-[9px] bg-amber-50 text-amber-800 border border-amber-200 font-extrabold px-2 py-0.5 rounded-full animate-pulse">
                    MENGHUBUNGI...
                  </span>
                )}
              </div>

              {pingMessage && (
                <p className="text-[9.5px] font-sans leading-relaxed text-coffee-700 bg-coffee-50 p-2.5 rounded-xl border border-coffee-100">
                  {pingMessage}
                </p>
              )}

              <button
                type="button"
                onClick={handlePingAppScript}
                disabled={pingStatus === 'testing'}
                className="w-full py-2 bg-coffee-800 hover:bg-coffee-950 text-cream-50 font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <CloudLightning className="w-3.5 h-3.5" /> Verifikasi Ping Endpoint Apps Script
              </button>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
