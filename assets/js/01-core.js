// 01-core.js — Konfigurasi API, state global, utilitas WITA/HTML/validasi, dan lazy-loader xlsx/docx

const API_URL = "https://api.siplpmpp.my.id";
let TARGET_LAT = -3.29687, TARGET_LNG = 114.58823, RADIUS_MAX = 50;
const session = { token: "", username: "", nama: "", gelar_depan: "", gelar_belakang: "", role: "", fakultas: "", pelatihan: "", hari: "", sesi: "", lat: 0, lng: 0, targetLat: -3.29687, targetLng: 114.58823, targetRadius: 50, mode: "Offline" };
function formatNamaDenganGelar(nama, gelarDepan, gelarBelakang) {
    const gd = (gelarDepan || "").trim();
    const nm = (nama || "").trim();
    const gb = (gelarBelakang || "").trim();
    return `${gd ? gd + " " : ""}${nm}${gb ? ", " + gb : ""}`.trim();
}
let streamKamera = null, dataGaleriGlobal = [], listPelatihanPublik = [], listRiwayatGlobal = [];
let cachedRewardsList = [], cachedPengajuanOperator = [];
let unauthorizedAlertShown = false;

const namaBulan = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const namaBulanLengkap = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const namaHariIndo = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

function escapeHtml(val) {
    return String(val ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function safeUrl(url) {
    const s = String(url || '').trim();
    if (!s) return '#';
    try {
        const parsed = new URL(s, window.location.href);
        if (parsed.protocol === 'https:' || parsed.protocol === 'http:') return parsed.href;
    } catch (_) {}
    return '#';
}

function extractDriveId(link) {
    const s = String(link || '');
    const strict = s.match(/\/d\/([-\w]{25,})|\/folders\/([-\w]{25,})|[?&]id=([-\w]{25,})/);
    if (strict) return strict[1] || strict[2] || strict[3];
    const fallback = s.match(/[-\w]{25,}/);
    return fallback ? fallback[0] : '';
}

function getWitaNow() {
    const now = new Date();
    try {
        const fmt = new Intl.DateTimeFormat('en-US', {
            timeZone: 'Asia/Makassar',
            year: 'numeric', month: '2-digit', day: '2-digit',
            weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
        });
        const parts = {};
        fmt.formatToParts(now).forEach(p => { parts[p.type] = p.value; });
        const wdMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
        const year = parseInt(parts.year, 10);
        const month = parseInt(parts.month, 10) - 1;
        const day = parseInt(parts.day, 10);
        const hours = parseInt(parts.hour, 10) % 24;
        const minutes = parseInt(parts.minute, 10);
        return {
            year, month, day,
            dayOfWeek: wdMap[parts.weekday] ?? now.getDay(),
            hours, minutes,
            currentMins: hours * 60 + minutes,
            todayStr: `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        };
    } catch (_) {
        const y = now.getFullYear(), m = now.getMonth(), d = now.getDate();
        const h = now.getHours(), min = now.getMinutes();
        return {
            year: y, month: m, day: d, dayOfWeek: now.getDay(),
            hours: h, minutes: min, currentMins: h * 60 + min,
            todayStr: `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
        };
    }
}

function formatWitaDateTime(val, timeOnly = false) {
    if (!val) return '-';
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val);
    try {
        const fmt = new Intl.DateTimeFormat('en-US', {
            timeZone: 'Asia/Makassar',
            year: 'numeric', month: 'numeric', day: 'numeric',
            hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
        });
        const p = {};
        fmt.formatToParts(d).forEach(x => { p[x.type] = x.value; });
        const hh = String(parseInt(p.hour, 10) % 24).padStart(2, '0');
        const mm = String(p.minute || '00').padStart(2, '0');
        if (timeOnly) return `${hh}:${mm}`;
        return `${p.day}/${p.month}/${p.year} ${hh}:${mm}`;
    } catch (_) {
        const hh = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        if (timeOnly) return `${hh}:${mm}`;
        return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()} ${hh}:${mm}`;
    }
}

function parseJamMenit(jamStr) {
    if (!jamStr || jamStr === '-') return null;
    const cleaned = String(jamStr).replace(/\./g, ':').replace(/[^0-9:]/g, '');
    const parts = cleaned.split(':');
    if (parts.length < 2) return null;
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (isNaN(h) || isNaN(m)) return null;
    return h * 60 + m;
}

function statusWaktuSesi(j, todayStr, currentMins) {
    if (j.sudah_hadir) return 'hadir';
    if (j.lupa_pending) return 'pending';
    const startMins = parseJamMenit(j.jam_mulai);
    let endMins = parseJamMenit(j.jam_selesai);
    if (endMins === 0) endMins = 1440;
    const tgl = (j.tanggal || '').trim();
    if (tgl && tgl !== '-') {
        if (tgl > todayStr) return 'mendatang';
        if (tgl < todayStr) return 'terlewat';
        if (startMins !== null && currentMins < startMins) return 'mendatang';
        if (endMins !== null && currentMins > endMins) return 'terlewat';
        return 'berlangsung';
    }
    if (startMins !== null && currentMins < startMins) return 'mendatang';
    if (endMins !== null && currentMins > endMins) return 'terlewat';
    return 'berlangsung';
}

function compressImageFile(file, maxDim = 1280, quality = 0.75) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Gagal membaca file gambar.'));
        reader.onload = () => {
            const dataUrl = reader.result;
            const img = new Image();
            img.onload = () => {
                try {
                    const scale = Math.min(1, maxDim / Math.max(img.width || 1, img.height || 1));
                    const w = Math.max(1, Math.round((img.width || 800) * scale));
                    const h = Math.max(1, Math.round((img.height || 600) * scale));
                    const cvs = document.createElement('canvas');
                    cvs.width = w;
                    cvs.height = h;
                    const ctx = cvs.getContext('2d');
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, w, h);
                    ctx.drawImage(img, 0, 0, w, h);
                    const outUrl = cvs.toDataURL('image/jpeg', quality);
                    resolve({ base64: outUrl.split(',')[1], mimeType: 'image/jpeg' });
                } catch (_) {
                    resolve({ base64: String(dataUrl).split(',')[1], mimeType: file.type || 'image/jpeg' });
                }
            };
            img.onerror = () => {
                resolve({ base64: String(dataUrl).split(',')[1], mimeType: file.type || 'image/jpeg' });
            };
            img.src = dataUrl;
        };
        reader.readAsDataURL(file);
    });
}

function hentikanKameraAktif() {
    if (streamKamera) {
        try { streamKamera.getTracks().forEach(t => t.stop()); } catch (_) {}
        streamKamera = null;
    }
    const video = document.getElementById('video');
    if (video) video.srcObject = null;
}

// Anti-Clickjacking Frame-Buster
if (window.top !== window.self) {
    try { window.top.location = window.self.location; } catch (_) {
        document.documentElement.style.display = 'none';
    }
}

function validasiKataSandiKuat(pwd) {
    const s = String(pwd || '');
    if (s.length < 8) return "Kata sandi minimal 8 karakter dan wajib mengandung huruf serta angka.";
    if (s.length > 128) return "Kata sandi maksimal 128 karakter.";
    if (!/[A-Za-z]/.test(s) || !/[0-9]/.test(s)) {
        return "Kata sandi wajib merupakan kombinasi huruf dan angka (minimal 8 karakter).";
    }
    return "";
}

function safeExcelCell(val) {
    const s = (val === null || val === undefined) ? "" : String(val);
    return /^[=+\-@\t\r]/.test(s) ? "'" + s : s;
}

function bersihkanSesiLokal() {
    session.token = "";
    session.username = "";
    session.nama = "";
    session.gelar_depan = "";
    session.gelar_belakang = "";
    session.role = "";
    session.fakultas = "";
    session.expiresAt = 0;
    try { localStorage.removeItem(SESSION_STORAGE_KEY); } catch (_) {}
}

// =========================================================================
// LAZY LOADER LIBRARY BERAT (SHEETJS & DOCX) — TIDAK MEMBLOKIR RENDER AWAL
// =========================================================================
const _lazyScriptPromises = {};
function loadExternalScript(src, globalCheck) {
    if (typeof globalCheck === 'function' && globalCheck()) return Promise.resolve();
    if (_lazyScriptPromises[src]) return _lazyScriptPromises[src];
    _lazyScriptPromises[src] = new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = src;
        s.async = true;
        s.crossOrigin = 'anonymous';
        s.onload = () => {
            if (typeof globalCheck !== 'function' || globalCheck()) resolve();
            else {
                delete _lazyScriptPromises[src];
                reject(new Error('Library tidak siap setelah dimuat.'));
            }
        };
        s.onerror = () => {
            delete _lazyScriptPromises[src];
            reject(new Error('Gagal mengunduh library dari CDN. Periksa koneksi internet Anda.'));
        };
        document.head.appendChild(s);
    });
    return _lazyScriptPromises[src];
}

async function ensureXlsxLoaded() {
    if (typeof window.XLSX !== 'undefined') return true;
    showToast('Memuat modul ekspor Excel...', 'info', 2500);
    try {
        await loadExternalScript('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js', () => typeof window.XLSX !== 'undefined');
        return true;
    } catch (e) {
        showToast('Gagal memuat modul Excel (SheetJS). Pastikan koneksi internet stabil lalu coba lagi.', 'error');
        return false;
    }
}

async function ensureDocxLoaded() {
    if (typeof window.docx !== 'undefined') return true;
    showToast('Memuat modul pembuat dokumen Word (.docx)...', 'info', 2500);
    try {
        await loadExternalScript('https://cdn.jsdelivr.net/npm/docx@8.5.0/build/index.umd.js', () => typeof window.docx !== 'undefined');
        return true;
    } catch (e) {
        showToast('Gagal memuat modul dokumen Word. Pastikan koneksi internet stabil lalu coba lagi.', 'error');
        return false;
    }
}

// =========================================================================
// NOTIFIKASI TOAST & CUSTOM DIALOG (PENGGANTI ALERT / CONFIRM / PROMPT)
