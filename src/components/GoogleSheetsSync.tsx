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
  Sparkles,
  Users,
  ShoppingBag,
  Search
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
  const [spreadsheetId, setSpreadsheetId] = useState<string>(() => {
    const val = localStorage.getItem('kk_sheet_id');
    if (!val) localStorage.setItem('kk_sheet_id', '1wCI0BW5UDtuHPX2AvsTbbTeJMCyuTL8vO9T9jD3qQIg');
    return val || '1wCI0BW5UDtuHPX2AvsTbbTeJMCyuTL8vO9T9jD3qQIg';
  });
  const [spreadsheetUrl, setSpreadsheetUrl] = useState<string>(() => {
    const val = localStorage.getItem('kk_sheet_url');
    if (!val) localStorage.setItem('kk_sheet_url', 'https://docs.google.com/spreadsheets/d/1wCI0BW5UDtuHPX2AvsTbbTeJMCyuTL8vO9T9jD3qQIg/edit?gid=0#gid=0');
    return val || 'https://docs.google.com/spreadsheets/d/1wCI0BW5UDtuHPX2AvsTbbTeJMCyuTL8vO9T9jD3qQIg/edit?gid=0#gid=0';
  });
  const [appScriptUrl, setAppScriptUrl] = useState<string>(() => {
    const val = localStorage.getItem('kk_appscript_url');
    if (!val) localStorage.setItem('kk_appscript_url', 'https://script.google.com/macros/s/AKfycbwX3uJELaPGCIE55rCLxc1cuciEXxh3mzAhBf9GPi0qfCE5GT8v7CHRzFk2C0b3J6OwIQ/exec');
    return val || 'https://script.google.com/macros/s/AKfycbwX3uJELaPGCIE55rCLxc1cuciEXxh3mzAhBf9GPi0qfCE5GT8v7CHRzFk2C0b3J6OwIQ/exec';
  });

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
  const [setupStatus, setSetupStatus] = useState<'idle' | 'running' | 'success' | 'fail'>('idle');
  const [setupMessage, setSetupMessage] = useState<string>('');

  // Live Database Explorer States
  const [products, setProducts] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [dbExplorerTab, setDbExplorerTab] = useState<'products' | 'transactions' | 'users'>('products');
  const [dbSearchQuery, setDbSearchQuery] = useState<string>('');

  useEffect(() => {
    // Load local database tables
    setProducts(getStoredProducts());
    setTransactions(getStoredTransactions());
    setUsers(getStoredUsers());
  }, [syncStatus]);

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
    let finalId = id.trim();
    // Auto-extract ID if user pastes a full Google Sheets URL
    if (finalId.includes('/d/')) {
      const parts = finalId.split('/d/');
      if (parts.length > 1) {
        finalId = parts[1].split('/')[0].split('#')[0].split('?')[0];
      }
    } else if (finalId.includes('key=')) {
      const parts = finalId.split('key=');
      if (parts.length > 1) {
        finalId = parts[1].split('&')[0];
      }
    }

    setSpreadsheetId(finalId);
    if (finalId) {
      const constructedUrl = `https://docs.google.com/spreadsheets/d/${finalId}/edit`;
      setSpreadsheetUrl(constructedUrl);
      localStorage.setItem('kk_sheet_id', finalId);
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
      // Auto checking/creating missing sheets before writing data
      addLog('Memvalidasi tab Google Sheet Anda...');
      const metaRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      let existingSheets: string[] = [];
      if (metaRes.ok) {
        const metaData = await metaRes.json();
        existingSheets = metaData.sheets?.map((s: any) => s.properties.title) || [];
      } else {
        addLog('Peringatan: Gagal memvalidasi meta-data Google Sheet. Mencoba menulis data langsung...');
      }

      const requiredSheets = ['Daftar Produk', 'Daftar Transaksi', 'Daftar kasir', 'Laporan Penjualan'];
      const missingSheets = requiredSheets.filter(s => !existingSheets.includes(s));

      if (existingSheets.length > 0 && missingSheets.length > 0) {
        addLog(`Membuat tab database otomatis yang belum ada: ${missingSheets.join(', ')}...`);
        const addSheetsRes = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              requests: missingSheets.map(title => ({
                addSheet: { properties: { title } }
              }))
            })
          }
        );
        if (addSheetsRes.ok) {
          addLog('Sukses menginisialisasi tab database baru di Google Sheet Anda!');
        } else {
          addLog('Gagal menginisialisasi tab secara otomatis. Harap buat tab secara manual di spreadsheet Anda.');
        }
      }

      // 1. Sync Products to "Daftar Produk"
      addLog('Membaca produk lokal...');
      const localProducts = getStoredProducts();
      const productValues = [
        ['ID', 'Kode Produk', 'Nama Produk', 'ID Kategori', 'Harga Jual', 'Stok'],
        ...localProducts.map(p => [
          p.id,
          p.sku,
          p.name,
          p.category,
          p.price,
          p.stock
        ])
      ];

      addLog(`Sinkronisasi ${localProducts.length} produk ke Tab 'Daftar Produk'...`);
      const productRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Daftar%20Produk!A1:F1000?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ values: productValues })
        }
      );
      if (!productRes.ok) throw new Error('Gagal memperbarui Tab Daftar Produk. Pastikan nama tab sesuai.');

      // 2. Sync Transactions to "Daftar Transaksi"
      addLog('Membaca riwayat transaksi lokal...');
      const localTransactions = getStoredTransactions();
      const transactionValues = [
        [
          'Invoice ID', 
          'Waktu Transaksi', 
          'Nama Kasir', 
          'Metode Pembayaran', 
          'Subtotal', 
          'Diskon', 
          'Pajak PPN', 
          'Daftar Produk/QTY'
        ],
        ...localTransactions.map(tx => [
          tx.invoiceNumber || tx.id,
          tx.createdAt,
          tx.cashierName,
          tx.paymentMethod,
          tx.subtotal,
          tx.discount,
          tx.tax,
          tx.items.map(it => `${it.name} (${it.quantity}x)`).join(', ')
        ])
      ];

      addLog(`Sinkronisasi ${localTransactions.length} transaksi ke Tab 'Daftar Transaksi'...`);
      const txRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Daftar%20Transaksi!A1:H2000?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ values: transactionValues })
        }
      );
      if (!txRes.ok) throw new Error('Gagal memperbarui Tab Daftar Transaksi. Pastikan nama tab sesuai.');

      // 3. Sync Users to "Daftar kasir"
      addLog('Membaca database pengguna...');
      const localUsers = getStoredUsers();
      const userValues = [
        ['User ID', 'Username', 'Nama Kasir', 'Jabatan'],
        ...localUsers.map(u => [
          u.id,
          u.email ? u.email.split('@')[0] : u.name.toLowerCase().replace(/\s+/g, ''),
          u.name,
          u.role
        ])
      ];

      addLog(`Sinkronisasi ${localUsers.length} info karyawan ke Tab 'Daftar kasir'...`);
      const userRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Daftar%20kasir!A1:D200?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ values: userValues })
        }
      );
      if (!userRes.ok) throw new Error('Gagal memperbarui Tab Daftar kasir. Pastikan nama tab sesuai.');

      // 4. Aggregate & Sync Report to "Laporan Penjualan"
      addLog('Menghitung laporan penjualan teragregasi...');
      const dailySales: Record<string, { count: number, subtotal: number, discount: number, tax: number, profit: number }> = {};
      localTransactions.forEach(tx => {
        const dateStr = tx.createdAt ? tx.createdAt.split('T')[0] : new Date().toISOString().split('T')[0];
        if (!dailySales[dateStr]) {
          dailySales[dateStr] = { count: 0, subtotal: 0, discount: 0, tax: 0, profit: 0 };
        }
        dailySales[dateStr].count += 1;
        dailySales[dateStr].subtotal += tx.subtotal || 0;
        dailySales[dateStr].discount += tx.discount || 0;
        dailySales[dateStr].tax += tx.tax || 0;
        dailySales[dateStr].profit += Math.max(0, (tx.subtotal - tx.discount) * 0.4); // 40% estimated profit margin
      });

      const reportValues = [
        ['Tanggal', 'Jumlah Transaksi', 'Total Subtotal', 'Total Diskon', 'Total PPN', 'Total Keuntungan (Profit)'],
        ...Object.entries(dailySales).map(([date, d]) => [
          date,
          d.count,
          d.subtotal,
          d.discount,
          d.tax,
          Math.round(d.profit)
        ])
      ];

      addLog(`Sinkronisasi ${Object.keys(dailySales).length} baris ke Tab 'Laporan Penjualan'...`);
      const reportRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Laporan%20Penjualan!A1:F500?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ values: reportValues })
        }
      );
      if (!reportRes.ok) throw new Error('Gagal memperbarui Tab Laporan Penjualan. Pastikan nama tab sesuai.');

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
      addLog(`❌ Gagal: ${err.message || 'Terjadi kesalahan internet sewaktu push data.'}`);
    } finally {
      setLoading(false);
    }
  };

  // Apps Script code content
  const APPS_SCRIPT_CODE = `/**
 * Google Apps Script - POS Kopi Klasik REST API Bridge & Cloud Database
 * Taruh kode ini ke Extensions -> Apps Script di Google Sheets Anda.
 * Deploy sebagai "Web App", Atur Akses demi keamanan ke "Anyone" (Siapa saja).
 */

const SPREADSHEET_ID = "1wCI0BW5UDtuHPX2AvsTbbTeJMCyuTL8vO9T9jD3qQIg";

/**
 * [FUNGSI UTAMA] - Jalankan fungsi ini untuk membuat Tab database otomatis!
 * Klik tombol "Run" / "Jalankan" di bagian atas Editor Apps Script Anda.
 * Pastikan dropdown fungsi di samping tombol "Run" memilih "setupDatabase"!
 */
function setupDatabase() {
  const spreadsheet = getSpreadsheet();
  const sheetsInfo = [
    {
      name: "Daftar Produk",
      headers: ["ID", "Kode Produk", "Nama Produk", "ID Kategori", "Harga Jual", "Stok"]
    },
    {
      name: "Daftar Transaksi",
      headers: ["Invoice ID", "Waktu Transaksi", "Nama Kasir", "Metode Pembayaran", "Subtotal", "Diskon", "Pajak PPN", "Daftar Produk/QTY"]
    },
    {
      name: "Daftar kasir",
      headers: ["User ID", "Username", "Nama Kasir", "Jabatan"]
    },
    {
      name: "Laporan Penjualan",
      headers: ["Tanggal", "Jumlah Transaksi", "Total Subtotal", "Total Diskon", "Total PPN", "Total Keuntungan (Profit)"]
    }
  ];
  
  sheetsInfo.forEach(function(info) {
    var sheet = spreadsheet.getSheetByName(info.name);
    if (!sheet) {
      sheet = spreadsheet.insertSheet(info.name);
    }
    // Isi Baris Pertama (Header)
    sheet.getRange(1, 1, 1, info.headers.length).setValues([info.headers]);
    
    // Beri format visual (Bold, Background Hijau Sage Muda, border) agar rapi dan professional
    var range = sheet.getRange(1, 1, 1, info.headers.length);
    range.setFontWeight("bold");
    range.setBackground("#DDF7E3"); // Hijau fresh
    range.setFontColor("#1A5F7A");  // Biru tua kontras tinggi
    
    // Auto-fit ukuran kolom
    try {
      sheet.autoResizeColumns(1, info.headers.length);
    } catch (err) {}
  });
  
  // Hapus "Sheet1" kosong bawaan default jika ada
  var sheet1 = spreadsheet.getSheetByName("Sheet1");
  if (sheet1 && spreadsheet.getSheets().length > 1) {
    try {
      spreadsheet.deleteSheet(sheet1);
    } catch (e) {}
  }
  
  return "Inisialisasi Database POS Sukses!";
}

// Helper agar script tidak error jika ID Spreadsheet kosong atau salah
function getSpreadsheet() {
  var finalId = SPREADSHEET_ID;
  if (finalId && finalId.indexOf("https://") !== -1) {
    var parts = finalId.split("/d/");
    if (parts.length > 1) {
      finalId = parts[1].split("/")[0];
    }
  }
  if (finalId && finalId !== "ID_SPREADSHEET_ANDA" && finalId !== "") {
    try {
      return SpreadsheetApp.openById(finalId);
    } catch (e) {
      // Jika openById gagal, fallback ke active spreadsheet
    }
  }
  try {
    return SpreadsheetApp.getActiveSpreadsheet();
  } catch (e) {
    throw new Error("Gagal memuat Spreadsheet. Jika Anda menyalin script ini secara manual, pastikan SPREADSHEET_ID terisi dengan benar (1wCI0BW5UDtuHPX2AvsTbbTeJMCyuTL8vO9T9jD3qQIg).");
  }
}

/**
 * 2. READ OPERATION (doGet)
 * Mengambil seluruh data dari sheet tertentu
 */
function doGet(e) {
  try {
    const action = e.parameter.action;
    const sheet = getSpreadsheet();
    
    if (action === "ping") {
      return jsonResponse({ status: "ok", message: "Koneksi Apps Script Aktif & Terhubung ke Sheet!", timestamp: new Date() });
    }
    
    if (action === "setup") {
      var msg = setupDatabase();
      return jsonResponse({ status: "ok", message: msg, timestamp: new Date() });
    }

    // Aksi generic read untuk mengambil data dari sheet mana saja
    if (action === "read") {
      const sheetName = e.parameter.sheet;
      if (!sheetName) {
        return jsonResponse({ status: "error", message: "Parameter 'sheet' wajib diisi." });
      }
      const data = getSheetData(sheet, sheetName);
      return jsonResponse({ status: "success", data: data });
    }
    
    // Backward compatibility endpoints
    if (action === "getProducts") {
      const data = getSheetData(sheet, "Daftar Produk");
      return jsonResponse({ status: "success", data: data });
    }
    
    if (action === "getTransactions") {
      const data = getSheetData(sheet, "Daftar Transaksi");
      return jsonResponse({ status: "success", data: data });
    }
    
    if (action === "getUsers") {
      const data = getSheetData(sheet, "Daftar kasir");
      return jsonResponse({ status: "success", data: data });
    }
    
    return jsonResponse({ status: "error", message: "Aksi GET tidak dikenal." });
  } catch(err) {
    return jsonResponse({ status: "error", message: err.toString() });
  }
}

/**
 * 1. INSERT OPERATION & 3. UPDATE STOCK (doPost)
 * Menangani penambahan data baru atau modifikasi nilai stok produk secara dinamis
 */
function doPost(e) {
  try {
    const postData = JSON.parse(e.postData.contents);
    const action = postData.action;
    const sheet = getSpreadsheet();
    
    // POS Real-time transaction uploader compatibility
    if (action === "addTransaction") {
      const tx = postData.transaction;
      var targetSheet = sheet.getSheetByName("Daftar Transaksi");
      
      if (!targetSheet) {
        setupDatabase();
        targetSheet = sheet.getSheetByName("Daftar Transaksi");
      }
      
      targetSheet.appendRow([
        tx.invoiceNumber || tx.id,
        tx.createdAt || new Date().toISOString(),
        tx.cashierName,
        tx.paymentMethod,
        tx.subtotal,
        tx.discount,
        tx.tax,
        tx.itemsDescription
      ]);
      
      return jsonResponse({ status: "success", message: "Transaksi berhasil dicatat ke Daftar Transaksi!" });
    }

    // Dynamic Generic Insert Operation
    if (action === "insert") {
      const sheetName = postData.sheet;
      const dataPayload = postData.data; // object map or array values
      
      if (!sheetName || !dataPayload) {
        return jsonResponse({ status: "error", message: "Parameter 'sheet' dan 'data' wajib disediakan." });
      }
      
      var targetSheet = sheet.getSheetByName(sheetName);
      if (!targetSheet) {
        return jsonResponse({ status: "error", message: "Sheet '" + sheetName + "' tidak ditemukan." });
      }
      
      if (Array.isArray(dataPayload)) {
        targetSheet.appendRow(dataPayload);
      } else {
        // Map object keys to column headers
        const headers = targetSheet.getRange(1, 1, 1, targetSheet.getLastColumn()).getValues()[0];
        const newRowValues = headers.map(function(head) {
          const sanitizedKey = head.toString().toLowerCase().replace(/\\s+/g, "_");
          return dataPayload[sanitizedKey] !== undefined ? dataPayload[sanitizedKey] : (dataPayload[head] !== undefined ? dataPayload[head] : "");
        });
        targetSheet.appendRow(newRowValues);
      }
      return jsonResponse({ status: "success", message: "Baris baru sukses ditambahkan ke " + sheetName });
    }

    // Specific Update Stock Operation
    if (action === "update_stock" || action === "updateStock") {
      const query = postData.id || postData.kode_produk || postData.query;
      const amount = Number(postData.amount || postData.stok || 0); // e.g. -2 or +10
      
      if (query === undefined || amount === undefined) {
        return jsonResponse({ status: "error", message: "Parameter 'query' (id/kode) dan 'amount' (stok baru/jumlah perubahan) harus diisi." });
      }

      var targetSheet = sheet.getSheetByName("Daftar Produk");
      if (!targetSheet) {
        return jsonResponse({ status: "error", message: "Sheet 'Daftar Produk' tidak ditemukan." });
      }
      
      var lastRow = targetSheet.getLastRow();
      if (lastRow <= 1) {
        return jsonResponse({ status: "error", message: "Belum ada produk di dalam database sheet." });
      }
      
      var range = targetSheet.getRange(2, 1, lastRow - 1, 6); // Read 6 columns
      var values = range.getValues();
      var foundRowIndex = -1;
      
      for (var i = 0; i < values.length; i++) {
        var rId = values[i][0].toString();        // Kolom A: ID
        var rCode = values[i][1].toString();      // Kolom B: Kode Produk
        if (rId === query.toString() || rCode === query.toString()) {
          foundRowIndex = i + 2; // offset header
          break;
        }
      }
      
      if (foundRowIndex !== -1) {
        // Kolom F (kolom 6) adalah Stok produk
        var stockCell = targetSheet.getRange(foundRowIndex, 6);
        var curStock = Number(stockCell.getValue() || 0);
        var updatedStock = curStock + amount;
        stockCell.setValue(updatedStock);
        
        return jsonResponse({ 
          status: "success", 
          message: "Kolom stok berhasil diperbarui untuk " + query,
          old_stock: curStock,
          new_stock: updatedStock
        });
      } else {
        return jsonResponse({ status: "error", message: "Produk dengan ID / Kode '" + query + "' tidak dapat ditemukan." });
      }
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
      // Ubah header 'Waktu Transaksi' menjadi key 'waktu_transaksi' agar aman di JSON
      obj[header.toString().toLowerCase().replace(/\\s+/g, "_")] = row[index];
    });
    results.push(obj);
  }
  return results;
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
} /**************************************************************************/ `;

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
        if (data && data.message && data.message.includes('ID_SPREADSHEET_ANDA')) {
          setPingMessage('ID Spreadsheet di Google Apps Script Anda masih bertuliskan "ID_SPREADSHEET_ANDA" (nilai bawaan). Silakan masukkan ID Spreadsheet Anda yang benar di form kiri, lalu salin ulang kode script di bawah, paste ke Apps Script Anda, dan lakukan Deploy Ulang sebagai penerapan baru (New Deployment). Elakkan memakai teks default!');
        } else {
          setPingMessage(`Diterima respons janggal: ${data && data.message ? data.message : JSON.stringify(data)}`);
        }
      }
    } catch (err: any) {
      console.error(err);
      setPingStatus('fail');
      setPingMessage('Gagal menghubungi Apps Script. Cek kembali izin Web App: diatur "Anyone" & pastikan tab browser Anda tidak memblokir CORS.');
    }
  };

  const handleSetupDatabase = async () => {
    if (!appScriptUrl) {
      setSetupStatus('fail');
      setSetupMessage('Harap masukkan URL Web App Apps Script Anda terlebih dahulu.');
      return;
    }
    
    setSetupStatus('running');
    setSetupMessage('Sedang mengirim instruksi setup struktur database ke Apps Script...');

    try {
      const urlWithAction = appScriptUrl.includes('?') 
        ? `${appScriptUrl}&action=setup` 
        : `${appScriptUrl}?action=setup`;

      const response = await fetch(urlWithAction);
      const data = await response.json();

      if (data && (data.status === 'ok' || data.status === 'success')) {
        setSetupStatus('success');
        setSetupMessage(data.message || 'Sukses! Tab database [Daftar Produk, Daftar Transaksi, Daftar kasir, Laporan Penjualan] beserta header kolomnya telah dibuat dan distandarisasi otomatis di Google Sheets Anda.');
      } else {
        setSetupStatus('fail');
        setSetupMessage(`Gagal setup: ${data && data.message ? data.message : JSON.stringify(data)}`);
      }
    } catch (err: any) {
      console.error(err);
      setSetupStatus('fail');
      setSetupMessage('Gagal menghubungi Apps Script. Pastikan koneksi internet aktif, URL Web App benar, dan di-deploy dengan pengaturan akses "Anyone".');
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

      {/* ========================================================== */}
      {/* LIVE DATABASE EXPLORER (DI SINI LANGSUNG KE DATA YANG ADA) */}
      {/* ========================================================== */}
      <div className="bg-coffee-50/45 p-5 rounded-3xl border border-coffee-200/90 space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-coffee-800 text-cream-50 rounded-xl shadow-xs">
              <Database className="w-4 h-4" />
            </span>
            <div className="text-left">
              <h4 className="text-xs font-black text-coffee-950 uppercase tracking-widest">
                Database Explorer (Record POS Lokal)
              </h4>
              <p className="text-[10px] text-coffee-600 leading-relaxed font-sans">Tabel real-time yang tersimpan di memori local storage POS Kopi Klasik</p>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative shrink-0 w-full sm:w-64">
            <Search className="absolute left-3 top-3 w-3.5 h-3.5 text-coffee-450 pointer-events-none" />
            <input
              type="text"
              placeholder={`Cari ${dbExplorerTab === 'products' ? 'produk' : dbExplorerTab === 'transactions' ? 'transaksi' : 'massa user'}...`}
              value={dbSearchQuery}
              onChange={(e) => setDbSearchQuery(e.target.value)}
              className="w-full pl-8.5 pr-3 py-2 text-xs bg-white border border-coffee-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-coffee-500 font-sans shadow-inner"
            />
          </div>
        </div>

        {/* Tab switchers + record summary count */}
        <div className="flex items-center justify-between gap-4 flex-wrap border-b border-coffee-150 pb-2">
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
            <button
              onClick={() => { setDbExplorerTab('products'); setDbSearchQuery(''); }}
              className={`px-3 py-1.5 text-[10.5px] font-extrabold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer hover:bg-coffee-100 ${
                dbExplorerTab === 'products'
                  ? 'bg-coffee-800 text-white font-black shadow-xs'
                  : 'text-coffee-750 bg-white border border-coffee-150'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Tabel Produk ({products.length})</span>
            </button>

            <button
              onClick={() => { setDbExplorerTab('transactions'); setDbSearchQuery(''); }}
              className={`px-3 py-1.5 text-[10.5px] font-extrabold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer hover:bg-coffee-100 ${
                dbExplorerTab === 'transactions'
                  ? 'bg-coffee-800 text-white font-black shadow-xs'
                  : 'text-coffee-750 bg-white border border-coffee-150'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Tabel Transaksi ({transactions.length})</span>
            </button>

            <button
              onClick={() => { setDbExplorerTab('users'); setDbSearchQuery(''); }}
              className={`px-3 py-1.5 text-[10.5px] font-extrabold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer hover:bg-coffee-100 ${
                dbExplorerTab === 'users'
                  ? 'bg-coffee-800 text-white font-black shadow-xs'
                  : 'text-coffee-750 bg-white border border-coffee-150'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Tabel Karyawan ({users.length})</span>
            </button>
          </div>

          {/* Sync indicator reminder */}
          <span className="text-[9.5px] text-coffee-550 font-medium font-sans italic">
            *Semua data baris tabel dapat diunggah / sync ke Google Spreadsheet di bawah.
          </span>
        </div>

        {/* Tables Content Render */}
        <div className="bg-white rounded-2xl border border-coffee-155 overflow-hidden shadow-xs">
          <div className="overflow-x-auto max-h-[290px] overflow-y-auto">
            {dbExplorerTab === 'products' && (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-coffee-100/50 border-b border-coffee-155 text-coffee-805 font-black uppercase tracking-wider text-[9.5px]">
                    <th className="p-3 pl-4">SKU</th>
                    <th className="p-3">Nama Menu</th>
                    <th className="p-3">Kategori</th>
                    <th className="p-3 text-right">Harga Satuan</th>
                    <th className="p-3 text-right">Stok RAM</th>
                    <th className="p-3 text-center">Modifikasi Resep</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-coffee-50">
                  {products.filter(p => {
                    if (!dbSearchQuery) return true;
                    const q = dbSearchQuery.toLowerCase();
                    return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
                  }).length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center p-8 text-coffee-450 italic font-sans bg-coffee-50/10">
                        Tidak ada records produk yang sesuai pencarian.
                      </td>
                    </tr>
                  ) : (
                    products.filter(p => {
                      if (!dbSearchQuery) return true;
                      const q = dbSearchQuery.toLowerCase();
                      return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
                    }).map((p) => (
                      <tr key={p.id} className="hover:bg-amber-50/15 transition-colors font-sans text-coffee-900 border-b border-coffee-100/40">
                        <td className="p-3 pl-4 font-mono text-[10px] font-bold text-coffee-600">{p.sku}</td>
                        <td className="p-3 font-bold text-coffee-950">{p.name}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 text-[9.5px] font-black rounded-lg uppercase ${
                            p.category === 'coffee' ? 'bg-amber-50 text-amber-900 border border-amber-100' :
                            p.category === 'non-coffee' ? 'bg-blue-50/60 text-blue-900 border border-blue-100' :
                            p.category === 'food' ? 'bg-orange-50/60 text-orange-900 border border-orange-100' :
                            'bg-indigo-50/60 text-indigo-900 border border-indigo-100'
                          }`}>
                            {p.category}
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-coffee-900">
                          {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(p.price)}
                        </td>
                        <td className="p-3 text-right">
                          <span className={`px-2 py-0.5 rounded-lg text-[10.5px] font-mono font-black ${
                            p.stock <= 5 ? 'bg-red-55 text-red-700 border border-red-100' :
                            p.stock <= 15 ? 'bg-amber-50 text-amber-850 border border-amber-100' :
                            'bg-emerald-50 text-emerald-850 border border-emerald-100'
                          }`}>
                            {p.stock} pcs
                          </span>
                        </td>
                        <td className="p-3 text-center text-[10px] text-coffee-550">
                          {p.sugarLevel || p.iceLevel ? (
                            <span className="bg-coffee-50 text-coffee-750 px-2 py-0.5 rounded-md font-bold text-[9px] border border-coffee-100">
                              ✓ {p.sugarLevel ? 'Gula' : ''}{p.sugarLevel && p.iceLevel ? ' & ' : ''}{p.iceLevel ? 'Es' : ''} Supported
                            </span>
                          ) : (
                            <span className="text-gray-400 font-sans italic">-</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {dbExplorerTab === 'transactions' && (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-coffee-100/50 border-b border-coffee-155 text-coffee-805 font-black uppercase tracking-wider text-[9.5px]">
                    <th className="p-3 pl-4">Invoice</th>
                    <th className="p-3">Daftar Item Belanja</th>
                    <th className="p-3">Petugas Kasir</th>
                    <th className="p-3">Metode</th>
                    <th className="p-3 text-right">Total Transaksi</th>
                    <th className="p-3 text-right pr-4">Tanggal & Jam</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-coffee-50 font-sans">
                  {transactions.filter(tx => {
                    if (!dbSearchQuery) return true;
                    const q = dbSearchQuery.toLowerCase();
                    return (
                      tx.invoiceNumber.toLowerCase().includes(q) ||
                      tx.cashierName.toLowerCase().includes(q) ||
                      tx.paymentMethod.toLowerCase().includes(q)
                    );
                  }).length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center p-8 text-coffee-450 italic font-sans bg-coffee-50/10">
                        Tidak ada catatan transaksi penjualan POS yang cocok.
                      </td>
                    </tr>
                  ) : (
                    transactions.filter(tx => {
                      if (!dbSearchQuery) return true;
                      const q = dbSearchQuery.toLowerCase();
                      return (
                        tx.invoiceNumber.toLowerCase().includes(q) ||
                        tx.cashierName.toLowerCase().includes(q) ||
                        tx.paymentMethod.toLowerCase().includes(q)
                      );
                    }).map((tx) => (
                      <tr key={tx.id} className="hover:bg-amber-50/15 transition-colors text-coffee-900 border-b border-coffee-100/40">
                        <td className="p-3 pl-4 font-mono font-black text-coffee-850 text-[10.5px]">{tx.invoiceNumber}</td>
                        <td className="p-3 max-w-[210px] truncate" title={tx.items.map((it: any) => `${it.name} (${it.quantity}x)`).join(', ')}>
                          <span className="font-bold text-coffee-950 block text-[11px]">
                            {tx.items[0]?.name} {tx.items.length > 1 ? `+ ${tx.items.length - 1} item lain` : ''}
                          </span>
                          <span className="text-[9px] text-coffee-600 font-mono block max-w-[190px] truncate leading-tight">
                            {tx.items.map((it: any) => `${it.name} (${it.quantity}x)`).join(', ')}
                          </span>
                        </td>
                        <td className="p-3 font-semibold text-coffee-700">{tx.cashierName}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 text-[9px] font-black rounded-md ${
                            tx.paymentMethod === 'CASH' ? 'bg-amber-50 text-amber-850 border border-amber-200' :
                            tx.paymentMethod === 'QRIS' ? 'bg-pink-50 text-pink-900 border border-pink-100' :
                            'bg-violet-50 text-violet-900 border border-violet-100'
                          }`}>
                            {tx.paymentMethod}
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono font-black text-coffee-950">
                          {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(tx.total)}
                        </td>
                        <td className="p-3 text-right text-[10.5px] text-coffee-600 pr-4 font-mono">
                          {new Date(tx.createdAt).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {dbExplorerTab === 'users' && (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-coffee-100/50 border-b border-coffee-155 text-coffee-805 font-black uppercase tracking-wider text-[9.5px]">
                    <th className="p-3 pl-4">ID / Email</th>
                    <th className="p-3">Nama Karyawan</th>
                    <th className="p-3">Jabatan & Hak Akses</th>
                    <th className="p-3 text-center">Status MFA Secure</th>
                    <th className="p-3 text-center pr-4">PIN Login POS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-coffee-50 font-sans">
                  {users.filter(u => {
                    if (!dbSearchQuery) return true;
                    const q = dbSearchQuery.toLowerCase();
                    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.role.toLowerCase().includes(q);
                  }).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center p-8 text-coffee-450 italic font-sans bg-coffee-50/10">
                        Tidak ada records karyawan ditemukan.
                      </td>
                    </tr>
                  ) : (
                    users.filter(u => {
                      if (!dbSearchQuery) return true;
                      const q = dbSearchQuery.toLowerCase();
                      return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.role.toLowerCase().includes(q);
                    }).map((u) => (
                      <tr key={u.id} className="hover:bg-amber-50/15 transition-colors text-coffee-900 border-b border-coffee-100/40">
                        <td className="p-3 pl-4">
                          <span className="font-bold text-coffee-850 block">{u.email}</span>
                          <span className="text-[9.5px] text-coffee-500 font-mono">id: {u.id}</span>
                        </td>
                        <td className="p-3 font-black text-coffee-950">{u.name}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 text-[9.5px] font-black rounded-lg uppercase ${
                            u.role === 'admin' ? 'bg-red-50 text-red-750 border border-red-100' :
                            u.role === 'manager' ? 'bg-purple-50 text-purple-750 border border-purple-100' :
                            'bg-emerald-50 text-emerald-850 border border-emerald-100'
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black inline-flex items-center gap-1 leading-relaxed ${
                            u.mfaEnabled ? 'bg-emerald-50 text-emerald-850 border border-emerald-200' : 'bg-coffee-50 text-coffee-400'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${u.mfaEnabled ? 'bg-emerald-500 animate-ping' : 'bg-coffee-300'}`}></span>
                            {u.mfaEnabled ? 'MFA AKTIF' : 'NONAKTIF'}
                          </span>
                        </td>
                        <td className="p-3 text-center pr-4 font-mono font-extrabold text-coffee-700 tracking-widest bg-coffee-50/20">
                          {u.quickPin ? u.quickPin : <span className="text-gray-300 font-sans italic">-</span>}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
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

            {/* Automatic Sheet Setup Widget */}
            <div className="bg-white p-3.5 border border-coffee-150 rounded-2xl space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[10.5px] font-bold text-coffee-805 uppercase tracking-wide">Inisialisasi Tab & Kolom Database</span>
                
                {setupStatus === 'success' && (
                  <span className="text-[9px] bg-emerald-50 text-emerald-850 border border-emerald-200 font-extrabold px-2 py-0.5 rounded-full">
                    SELESAI OK
                  </span>
                )}
                {setupStatus === 'fail' && (
                  <span className="text-[9px] bg-red-55 text-red-650 border border-red-200 font-extrabold px-2 py-0.5 rounded-full">
                    GAGAL
                  </span>
                )}
                {setupStatus === 'running' && (
                  <span className="text-[9px] bg-amber-50 text-amber-805 border border-amber-200 font-extrabold px-2 py-0.5 rounded-full animate-pulse">
                    SINKRONISASI TAB...
                  </span>
                )}
              </div>

              {setupMessage && (
                <p className="text-[9.5px] font-sans leading-relaxed text-coffee-700 bg-coffee-50 p-2.5 rounded-xl border border-coffee-100">
                  {setupMessage}
                </p>
              )}

              <button
                type="button"
                onClick={handleSetupDatabase}
                disabled={setupStatus === 'running' || !appScriptUrl}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-705 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Database className="w-3.5 h-3.5" /> Inisialisasi Database Otomatis
              </button>
              
              <p className="text-[9px] text-coffee-550 leading-relaxed font-sans mt-1">
                Mengotomatiskan pembuatan tab <strong>Products</strong>, <strong>Transactions</strong>, dan <strong>Users</strong> beserta susunan kolom di dalam file Google Sheet Anda secara instan.
              </p>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
