// 02-ui-router.js — Toast, Modal Konfirmasi/Prompt kustom, Skeleton Loader, apiPost, Admin Shell & Hash Routing

// =========================================================================
function _stripLeadingEmoji(raw) {
    return String(raw ?? '').replace(/^[\s✅❌⚠️ℹ️📍📋🔑⚡✓✕•]+/u, '').trim();
}

function _inferToastType(raw) {
    const s = String(raw ?? '');
    if (/^[\s]*✅/u.test(s) || /berhasil|tersimpan|disetujui|diperbarui|disalin|ditambahkan|selesai/i.test(s)) return 'success';
    if (/^[\s]*❌/u.test(s) || /gagal|ditolak|kesalahan|tidak valid|error|tidak ditemukan|habis|diblokir/i.test(s)) return 'error';
    if (/^[\s]*⚠️/u.test(s) || /peringatan|wajib|mohon|pilih|belum|kosong|minimal|maksimal|berakhir|sudah ada/i.test(s)) return 'warning';
    return 'info';
}

function showToast(message, type, durationMs) {
    const container = document.getElementById('toastContainer');
    const rawText = String(message ?? '').trim();
    if (!container || !rawText) return;
    const kind = type || _inferToastType(rawText);
    const cleanText = _stripLeadingEmoji(rawText) || rawText;

    const palette = {
        success: {
            box: 'bg-white border-emerald-300 text-slate-900',
            bar: 'bg-emerald-600',
            iconBg: 'bg-emerald-100 text-emerald-700',
            icon: '<svg class="w-4 h-4" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>'
        },
        error: {
            box: 'bg-white border-rose-300 text-slate-900',
            bar: 'bg-rose-600',
            iconBg: 'bg-rose-100 text-rose-700',
            icon: '<svg class="w-4 h-4" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>'
        },
        warning: {
            box: 'bg-white border-amber-300 text-slate-900',
            bar: 'bg-amber-600',
            iconBg: 'bg-amber-100 text-amber-800',
            icon: '<svg class="w-4 h-4" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>'
        },
        info: {
            box: 'bg-white border-sky-300 text-slate-900',
            bar: 'bg-oceanDark',
            iconBg: 'bg-sky-100 text-oceanDark',
            icon: '<svg class="w-4 h-4" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>'
        }
    }[kind] || {};

    while (container.children.length >= 4) container.firstElementChild.remove();

    const toastEl = document.createElement('div');
    toastEl.setAttribute('role', kind === 'error' ? 'alert' : 'status');
    toastEl.className = `pointer-events-auto animate-toast-in relative overflow-hidden rounded-2xl border shadow-lg ${palette.box} flex items-start gap-3 p-3.5 pl-4`;
    toastEl.innerHTML = `
        <span class="absolute inset-y-0 left-0 w-1 ${palette.bar}" aria-hidden="true"></span>
        <div class="w-7 h-7 rounded-xl ${palette.iconBg} flex items-center justify-center shrink-0 mt-0.5">${palette.icon}</div>
        <p class="text-xs font-semibold leading-relaxed flex-1 whitespace-pre-line break-words">${escapeHtml(cleanText)}</p>
        <button type="button" aria-label="Tutup notifikasi" class="w-8 h-8 -mr-1.5 -mt-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center shrink-0">
            <svg class="w-4 h-4" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>`;

    const dismiss = () => {
        if (!toastEl.parentNode) return;
        toastEl.style.opacity = '0';
        toastEl.style.transform = 'translateY(-6px)';
        toastEl.style.transition = 'opacity 0.16s ease, transform 0.16s ease';
        setTimeout(() => toastEl.remove(), 170);
    };
    toastEl.querySelector('button').onclick = dismiss;
    container.appendChild(toastEl);

    const ms = durationMs || (kind === 'error' ? 6000 : 4500);
    setTimeout(dismiss, ms);
}

let _activeAppDialogRejectOrCancel = null;
function _openAppDialog({ mode = 'confirm', title = 'Konfirmasi', message = '', okText = 'Ya, Lanjutkan', cancelText = 'Batal', danger = false, placeholder = '', defaultValue = '', inputLabel = 'Keterangan' }) {
    return new Promise((resolve) => {
        const modal = document.getElementById('modalAppDialog');
        const hdr = document.getElementById('appDialogHeader');
        const titleEl = document.getElementById('appDialogTitle');
        const msgEl = document.getElementById('appDialogMessage');
        const wrap = document.getElementById('appDialogInputWrap');
        const lbl = document.getElementById('appDialogInputLabel');
        const inp = document.getElementById('appDialogInput');
        const btnOk = document.getElementById('appDialogBtnOk');
        const btnCancel = document.getElementById('appDialogBtnCancel');
        const btnClose = document.getElementById('appDialogBtnClose');

        titleEl.innerText = title;
        msgEl.innerText = message;
        btnOk.innerText = okText;
        btnCancel.innerText = cancelText;

        hdr.className = danger
            ? 'bg-gradient-to-r from-rose-700 to-red-700 px-6 py-4 text-white flex items-center justify-between gap-2'
            : 'bg-gradient-to-r from-[#0C4A6E] to-[#0369A1] px-6 py-4 text-white flex items-center justify-between gap-2';
        btnOk.className = danger
            ? 'flex-1 min-h-[44px] bg-gradient-to-r from-rose-700 to-red-700 hover:from-rose-800 hover:to-red-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm transition-all'
            : 'flex-1 min-h-[44px] bg-gradient-to-r from-[#0C4A6E] to-[#0369A1] hover:from-[#0369A1] hover:to-[#0284C7] text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm transition-all';

        const isPrompt = mode === 'prompt';
        wrap.classList.toggle('hidden', !isPrompt);
        if (isPrompt) {
            lbl.innerText = inputLabel;
            inp.placeholder = placeholder;
            inp.value = defaultValue || '';
        }

        const finish = (val) => {
            _activeAppDialogRejectOrCancel = null;
            modal.classList.add('hidden');
            btnOk.onclick = null;
            btnCancel.onclick = null;
            btnClose.onclick = null;
            inp.onkeydown = null;
            resolve(val);
        };

        const onCancel = () => finish(isPrompt ? null : false);
        const onOk = () => finish(isPrompt ? inp.value : true);

        _activeAppDialogRejectOrCancel = onCancel;
        btnOk.onclick = onOk;
        btnCancel.onclick = onCancel;
        btnClose.onclick = onCancel;
        inp.onkeydown = (e) => {
            if (e.key === 'Enter') { e.preventDefault(); onOk(); }
        };

        modal.classList.remove('hidden');
        setTimeout(() => {
            if (isPrompt) { inp.focus(); inp.select(); }
            else btnOk.focus();
        }, 40);
    });
}

function appConfirm(message, opts = {}) {
    const isDanger = opts.danger ?? /hapus|batalkan|matikan|darurat|keluar dari semua|kosongkan|reset/i.test(String(message || ''));
    return _openAppDialog({
        mode: 'confirm',
        title: opts.title || (isDanger ? 'Konfirmasi Tindakan' : 'Konfirmasi'),
        message: String(message || ''),
        okText: opts.okText || (isDanger ? 'Ya, Lanjutkan' : 'Ya, Setuju'),
        cancelText: opts.cancelText || 'Batal',
        danger: isDanger
    });
}

function appPrompt(message, defaultValue = '', opts = {}) {
    return _openAppDialog({
        mode: 'prompt',
        title: opts.title || 'Masukkan Informasi',
        message: String(message || ''),
        okText: opts.okText || 'Simpan',
        cancelText: opts.cancelText || 'Batal',
        danger: Boolean(opts.danger),
        defaultValue: String(defaultValue || ''),
        placeholder: opts.placeholder || 'Ketik di sini...',
        inputLabel: opts.inputLabel || 'Keterangan'
    });
}

function renderSkeletonList(count = 3) {
    return `<div role="status" aria-label="Memuat data" class="space-y-3 py-1">${Array.from({ length: count }).map(() => `
        <div class="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 animate-pulse space-y-2.5">
            <div class="h-3 bg-slate-200 rounded-full w-1/3"></div>
            <div class="h-4 bg-slate-200 rounded-full w-2/3"></div>
            <div class="h-3 bg-slate-200 rounded-full w-1/2"></div>
        </div>`).join('')}</div>`;
}

// Global keyboard handler (Escape menutup dialog, modal, dropdown, atau drawer mobile)
document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const appDlg = document.getElementById('modalAppDialog');
    if (appDlg && !appDlg.classList.contains('hidden')) {
        if (typeof _activeAppDialogRejectOrCancel === 'function') _activeAppDialogRejectOrCancel();
        return;
    }
    const mReset = document.getElementById('modalResetSandiAdmin');
    if (mReset && !mReset.classList.contains('hidden')) { tutupModalResetSandiAdmin(); return; }
    const mLupa = document.getElementById('modalLupaPassword');
    if (mLupa && !mLupa.classList.contains('hidden')) { tutupModalLupaPassword(); return; }
    const mGelar = document.getElementById('modalPeringatanGelar');
    if (mGelar && !mGelar.classList.contains('hidden')) { tutupModalPeringatanGelar(); return; }
    const mIzin = document.getElementById('modalIzinPresensi');
    if (mIzin && !mIzin.classList.contains('hidden')) { tutupModalIzinPresensi(); return; }
    const notifDd = document.getElementById('notifDropdown');
    if (notifDd && !notifDd.classList.contains('hidden')) { tutupNotifikasiDropdown(); return; }
    const backdrop = document.getElementById('adminDrawerBackdrop');
    if (backdrop && !backdrop.classList.contains('hidden')) { toggleAdminDrawer(false); }
});

async function apiPost(payload, opts = {}) {
    const bodyObj = { ...payload };
    if (session.token && !bodyObj.auth_token) {
        bodyObj.auth_token = session.token;
    }
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutMs = opts.timeoutMs || 25000;
    const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
    let resp;
    try {
        resp = await fetch(API_URL, {
            method: "POST",
            body: JSON.stringify(bodyObj),
            signal: controller ? controller.signal : undefined
        });
    } catch (err) {
        if (err && err.name === 'AbortError') {
            throw new Error('Permintaan ke server melebihi batas waktu (25 detik). Periksa koneksi internet Anda.');
        }
        throw err;
    } finally {
        if (timer) clearTimeout(timer);
    }
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const res = await resp.json();
    if (res && res.code === 'UNAUTHORIZED' && !opts.skipAuthRedirect) {
        bersihkanSesiLokal();
        tampilLayar('loginScreen');
        if (!unauthorizedAlertShown) {
            unauthorizedAlertShown = true;
            showToast(res.message || "Sesi login Anda telah berakhir. Silakan login kembali.", 'warning');
            setTimeout(() => { unauthorizedAlertShown = false; }, 1500);
        }
    }
    return res;
}

let cachedJadwalPeserta = [];
let cachedEnrolledInfo = [];
let calMonth = new Date().getMonth();
let calYear = new Date().getFullYear();

const ALL_SCREENS = [
    'loginScreen', 'registerScreen', 'userProfileScreen', 'presensiScreen', 'notifikasiScreen',
    'kalenderScreen', 'myAttendanceScreen', 'lupaPresensiFormScreen', 'myGroupScreen',
    'userEnrollScreen', 'myRewardScreen', 'kameraScreen', 'suksesScreen', 'suksesDaftarScreen',
    'adminScreen', 'adminLupaPresensiScreen', 'adminJadwalScreen', 'adminPesertaScreen',
    'adminValidasiScreen', 'adminPengaturanScreen', 'adminRewardScreen', 'adminRekapScreen',
    'adminProdiScreen', 'adminManageUsersScreen', 'adminPengajuanScreen', 'operatorScreen',
    'adminTransferPresensiScreen'
];
const ADMIN_SHELL_SCREENS = new Set([
    'adminScreen', 'adminLupaPresensiScreen', 'adminJadwalScreen', 'adminPesertaScreen',
    'adminValidasiScreen', 'adminPengaturanScreen', 'adminRewardScreen', 'adminRekapScreen',
    'adminProdiScreen', 'adminManageUsersScreen', 'adminPengajuanScreen', 'adminTransferPresensiScreen'
]);
const SCREEN_TITLES = {
    adminScreen: 'Dasbor Ringkasan',
    adminPengajuanScreen: 'Pengajuan & Cetak Dokumen',
    adminJadwalScreen: 'Jadwal Pelatihan',
    adminPesertaScreen: 'Daftar Peserta',
    adminValidasiScreen: 'Validasi Foto Selfie',
    adminLupaPresensiScreen: 'Lupa Presensi',
    adminRekapScreen: 'Rekap Presensi',
    adminRewardScreen: 'Materi & Reward',
    adminPengaturanScreen: 'GPS & Wi-Fi Ruangan',
    adminProdiScreen: 'Fakultas & Prodi',
    adminManageUsersScreen: 'Akun & Reset Sandi',
    adminTransferPresensiScreen: 'Transfer Presensi'
};
const SCREEN_TO_HASH = {
    loginScreen: 'login',
    registerScreen: 'daftar',
    userProfileScreen: 'profil',
    presensiScreen: 'beranda',
    notifikasiScreen: 'notifikasi',
    kalenderScreen: 'kalender',
    myAttendanceScreen: 'riwayat',
    lupaPresensiFormScreen: 'lupa-presensi',
    myGroupScreen: 'grup-wa',
    userEnrollScreen: 'daftar-kelas',
    myRewardScreen: 'materi',
    kameraScreen: 'kamera',
    suksesScreen: 'presensi-sukses',
    suksesDaftarScreen: 'daftar-sukses',
    operatorScreen: 'operator',
    adminScreen: 'admin',
    adminPengajuanScreen: 'admin/pengajuan',
    adminJadwalScreen: 'admin/jadwal',
    adminPesertaScreen: 'admin/peserta',
    adminValidasiScreen: 'admin/galeri',
    adminLupaPresensiScreen: 'admin/lupa-presensi',
    adminRekapScreen: 'admin/rekap',
    adminRewardScreen: 'admin/materi',
    adminPengaturanScreen: 'admin/pengaturan',
    adminProdiScreen: 'admin/fakultas',
    adminManageUsersScreen: 'admin/akun',
    adminTransferPresensiScreen: 'admin/transfer'
};
const HASH_TO_SCREEN = Object.fromEntries(Object.entries(SCREEN_TO_HASH).map(([k, v]) => [v, k]));
let currentScreenId = 'loginScreen';

function toggleAdminDrawer(open) {
    const sidebar = document.getElementById('adminSidebar');
    const backdrop = document.getElementById('adminDrawerBackdrop');
    const btnOpen = document.getElementById('btnOpenAdminDrawer');
    if (!sidebar || !backdrop) return;
    const willOpen = Boolean(open);
    sidebar.classList.toggle('-translate-x-full', !willOpen);
    sidebar.classList.toggle('translate-x-0', willOpen);
    backdrop.classList.toggle('hidden', !willOpen);
    if (btnOpen) btnOpen.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
}

function navAdminKe(screenId) {
    toggleAdminDrawer(false);
    if (screenId === 'adminPengajuanScreen') { bukaHalamanPengajuanAdmin(); return; }
    if (screenId === 'adminValidasiScreen') { muatGaleri(); return; }
    if (screenId === 'adminLupaPresensiScreen') { muatLupaPresensiAdmin(); return; }
    if (screenId === 'adminProdiScreen') { bukaHalamanAdminProdi(); return; }
    if (screenId === 'adminManageUsersScreen') { bukaHalamanKelolaUser(); return; }
    if (screenId === 'adminTransferPresensiScreen') { bukaHalamanTransferPresensi(); return; }
    tampilLayar(screenId);
}

function updateAdminShellUI(idLayar) {
    const isAdminUser = (session.role === 'super_admin' || session.role === 'admin');
    const isAdminView = isAdminUser && ADMIN_SHELL_SCREENS.has(idLayar);
    document.body.classList.toggle('admin-shell-active', isAdminView);

    const sidebar = document.getElementById('adminSidebar');
    const mobileBar = document.getElementById('adminMobileBar');
    const mobileTitle = document.getElementById('adminMobileScreenTitle');
    if (sidebar) {
        sidebar.classList.toggle('hidden', !isAdminView);
        sidebar.classList.toggle('flex', isAdminView);
    }
    if (mobileBar) {
        mobileBar.classList.toggle('hidden', !isAdminView);
        mobileBar.classList.toggle('flex', isAdminView);
    }
    toggleAdminDrawer(false);

    if (isAdminView) {
        if (mobileTitle) mobileTitle.innerText = SCREEN_TITLES[idLayar] || 'Panel Admin';
        const sName = document.getElementById('sidebarAdminName');
        const sEmail = document.getElementById('sidebarAdminEmail');
        const sRole = document.getElementById('sidebarRoleBadge');
        if (sName) sName.innerText = session.nama || 'Admin';
        if (sEmail) sEmail.innerText = session.username || '-';
        if (sRole) sRole.innerText = session.role === 'super_admin' ? 'Super Administrator' : 'Administrator';
        document.querySelectorAll('#adminSidebar .admin-nav-item').forEach(btn => {
            const isAct = btn.dataset.navScreen === idLayar;
            btn.classList.toggle('admin-nav-active', isAct);
            if (isAct) btn.setAttribute('aria-current', 'page');
            else btn.removeAttribute('aria-current');
        });
    }
}

async function muatRingkasanAdmin() {
    if (session.role !== 'super_admin' && session.role !== 'admin') return;
    try {
        const res = await apiPost({ action: 'get_admin_summary' }, { skipAuthRedirect: true });
        if (!res || res.status !== 'success' || !res.data) return;
        const d = res.data;
        const setTxt = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
        setTxt('kpiPendingPengajuan', String(d.pending_pengajuan ?? 0));
        setTxt('kpiPendingLupa', String(d.pending_lupa_presensi ?? 0));
        setTxt('kpiPelatihanAktif', String(d.total_pelatihan_aktif ?? 0));
        const draftInfo = d.total_pelatihan_draft > 0 ? ` (${d.total_pelatihan_draft} draft)` : '';
        setTxt('kpiSesiHariIni', `${d.sesi_hari_ini ?? 0} sesi hari ini${draftInfo}`);

        const wifiEl = document.getElementById('kpiWifiStatus');
        if (wifiEl) {
            wifiEl.innerText = d.wifi_enabled ? 'Aktif (Wajib Wi-Fi)' : 'Nonaktif (Bebas)';
            wifiEl.className = d.wifi_enabled
                ? 'text-base font-extrabold text-emerald-700 mt-1.5'
                : 'text-base font-extrabold text-slate-700 mt-1.5';
        }

        const bPeng = document.getElementById('sideBadgePengajuan');
        if (bPeng) {
            const cnt = Number(d.pending_pengajuan || 0);
            bPeng.innerText = cnt > 99 ? '99+' : String(cnt);
            bPeng.classList.toggle('hidden', cnt <= 0);
        }
        const bLupa = document.getElementById('sideBadgeLupa');
        if (bLupa) {
            const cnt = Number(d.pending_lupa_presensi || 0);
            bLupa.innerText = cnt > 99 ? '99+' : String(cnt);
            bLupa.classList.toggle('hidden', cnt <= 0);
        }
    } catch (_) {}
}

function tampilLayar(idLayar, opts = {}) {
    if (idLayar !== 'kameraScreen') hentikanKameraAktif();
    ALL_SCREENS.forEach(id => {
        const el = document.getElementById(id); if (el) el.classList.add('hidden');
    });
    currentScreenId = idLayar;
    updateAdminShellUI(idLayar);

    const wadah = document.getElementById('mainWadah');
    wadah.classList.remove('max-w-md', 'sm:max-w-md', 'sm:max-w-lg', 'sm:max-w-xl', 'md:max-w-xl', 'md:max-w-2xl', 'max-w-2xl', 'max-w-4xl', 'lg:max-w-5xl');
    const isAdminShell = document.body.classList.contains('admin-shell-active');
    if (!isAdminShell) {
        if (idLayar === 'loginScreen') {
            wadah.classList.add('sm:max-w-md');
        } else if (idLayar === 'operatorScreen' || ADMIN_SHELL_SCREENS.has(idLayar)) {
            wadah.classList.add('max-w-4xl', 'lg:max-w-5xl');
        } else {
            wadah.classList.add('sm:max-w-xl', 'md:max-w-2xl');
        }
    }

    const target = document.getElementById(idLayar); if (target) target.classList.remove('hidden');

    if (['adminJadwalScreen', 'adminPesertaScreen', 'adminRewardScreen', 'adminRekapScreen', 'adminPengaturanScreen'].includes(idLayar)) {
        muatDaftarPelatihanAdmin();
        terapkanModeReadOnlyAdminBiasa();
        if (idLayar === 'adminPengaturanScreen' && session.role === 'super_admin') {
            muatStatusWifiAdmin();
        }
    }
    if (idLayar === 'adminScreen') {
        muatRingkasanAdmin();
    }
    if (!window._fakultasProdiLoaded && ['registerScreen', 'userProfileScreen', 'adminProdiScreen', 'adminManageUsersScreen'].includes(idLayar)) {
        window._fakultasProdiLoaded = true;
        if (typeof muatDataFakultasProdi === 'function') {
            muatDataFakultasProdi().then(() => {
                if (idLayar === 'adminProdiScreen' && typeof renderDropdownFakultasAdmin === 'function') {
                    renderDropdownFakultasAdmin();
                }
                if (idLayar === 'adminManageUsersScreen') {
                    const selFak = document.getElementById('staffFakultas');
                    if (selFak && typeof prodiMap === 'object') {
                        const prev = selFak.value;
                        selFak.innerHTML = '<option value="">-- Pilih Fakultas --</option>' + Object.keys(prodiMap).map(f => `<option value="${escapeHtml(f)}">${escapeHtml(f)}</option>`).join('');
                        selFak.value = prev;
                    }
                }
            });
        }
    }
    tutupNotifikasiDropdown();

    if (!opts.skipHistory) {
        const h = SCREEN_TO_HASH[idLayar];
        if (h && window.location.hash !== '#' + h) {
            try { history.pushState({ screen: idLayar }, '', '#' + h); } catch (_) {}
        }
    }
    if (!opts.preserveScroll) {
        try { window.scrollTo({ top: 0, behavior: 'auto' }); } catch (_) {}
    }
}

function getDefaultScreenForSession() {
    if (!session.token) return 'loginScreen';
    if (session.role === 'super_admin' || session.role === 'admin') return 'adminScreen';
    if (session.role === 'operator') return 'operatorScreen';
    return 'presensiScreen';
}

function handleHistoryNavigation() {
    const h = (window.location.hash || '').replace(/^#/, '');
    const targetScreen = h ? HASH_TO_SCREEN[h] : getDefaultScreenForSession();
    if (!targetScreen || targetScreen === currentScreenId) return;
    if (!session.token) {
        if (targetScreen === 'registerScreen') {
            tampilLayar('registerScreen', { skipHistory: true });
            const wadah = document.getElementById('wadahBoxRegPelatihan');
            if (wadah && (!wadah.children.length || wadah.innerText.includes('Memuat')) && typeof bukaHalamanRegister === 'function') {
                bukaHalamanRegister();
            }
            return;
        }
        tampilLayar('loginScreen', { skipHistory: true });
        return;
    }
    if (session.role === 'super_admin' || session.role === 'admin') {
        if (ADMIN_SHELL_SCREENS.has(targetScreen)) {
            if (targetScreen === 'adminPengajuanScreen') { tampilLayar(targetScreen, { skipHistory: true }); bukaHalamanPengajuanAdmin(); return; }
            if (targetScreen === 'adminValidasiScreen') { tampilLayar(targetScreen, { skipHistory: true }); muatGaleri(); return; }
            if (targetScreen === 'adminLupaPresensiScreen') { tampilLayar(targetScreen, { skipHistory: true }); muatLupaPresensiAdmin(); return; }
            if (targetScreen === 'adminProdiScreen') { tampilLayar(targetScreen, { skipHistory: true }); bukaHalamanAdminProdi(); return; }
            if (targetScreen === 'adminManageUsersScreen') { tampilLayar(targetScreen, { skipHistory: true }); bukaHalamanKelolaUser(); return; }
            if (targetScreen === 'adminTransferPresensiScreen') { tampilLayar(targetScreen, { skipHistory: true }); bukaHalamanTransferPresensi(); return; }
            tampilLayar(targetScreen, { skipHistory: true });
        } else {
            tampilLayar('adminScreen', { skipHistory: true });
        }
        return;
    }
    if (session.role === 'operator') {
        tampilLayar('operatorScreen', { skipHistory: true });
        return;
    }
    const userScreens = new Set(['presensiScreen', 'notifikasiScreen', 'kalenderScreen', 'myAttendanceScreen', 'myGroupScreen', 'userEnrollScreen', 'myRewardScreen', 'userProfileScreen']);
    if (userScreens.has(targetScreen)) {
        tampilLayar(targetScreen, { skipHistory: true });
    } else {
        tampilLayar('presensiScreen', { skipHistory: true });
    }
}

window.addEventListener('popstate', handleHistoryNavigation);
window.addEventListener('hashchange', handleHistoryNavigation);

function ubahStatusMsg(text, colorClass) { 
    const el = document.getElementById('statusMsg'); el.innerText = text; 
    el.className = text ? `text-xs font-semibold text-center mb-3 px-2 ${colorClass}` : "hidden";
}
