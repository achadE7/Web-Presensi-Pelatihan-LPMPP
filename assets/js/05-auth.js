// 05-auth.js — Sesi login persisten, pengawas idle pengelola, autentikasi, dan reset sandi OTP

const SESSION_STORAGE_KEY = "siplpmpp_user_session";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // Masa aktif sesi peserta: 7 hari
const PRIVILEGED_SESSION_MS = 24 * 60 * 60 * 1000; // Masa aktif sesi pengelola: 24 jam
const PRIVILEGED_IDLE_TIMEOUT_MS = 60 * 60 * 1000; // Auto-logout pengelola jika tidak aktif 60 menit
let privilegedIdleTimer = null;
let idleListenersBound = false;

function resetTimerIdlePengelola() {
    if (privilegedIdleTimer) { clearTimeout(privilegedIdleTimer); privilegedIdleTimer = null; }
    const isPriv = session.token && (session.role === "super_admin" || session.role === "admin" || session.role === "operator");
    if (!isPriv) return;
    privilegedIdleTimer = setTimeout(async () => {
        if (!session.token) return;
        hentikanKameraAktif();
        try { await apiPost({ action: "logout" }, { skipAuthRedirect: true }); } catch (_) {}
        bersihkanSesiLokal();
        tampilLayar('loginScreen');
        const msg = document.getElementById('loginMsg');
        if (msg) {
            msg.innerText = "Sesi pengelola otomatis berakhir karena tidak ada aktivitas selama 60 menit.";
            msg.classList.remove('hidden');
        }
    }, PRIVILEGED_IDLE_TIMEOUT_MS);
}

function aktifkanPengawasIdlePengelola() {
    if (!idleListenersBound) {
        idleListenersBound = true;
        let lastPing = 0;
        const onAct = () => {
            const now = Date.now();
            if (now - lastPing < 5000) return;
            lastPing = now;
            resetTimerIdlePengelola();
        };
        ['click', 'keydown', 'touchstart', 'scroll'].forEach(ev => window.addEventListener(ev, onAct, { passive: true }));
    }
    resetTimerIdlePengelola();
}

function simpanSesiLogin() {
    try {
        const isPriv = (session.role === "super_admin" || session.role === "admin" || session.role === "operator");
        const defaultExp = Date.now() + (isPriv ? PRIVILEGED_SESSION_MS : SESSION_DURATION_MS);
        const exp = (session.expiresAt && session.expiresAt > Date.now()) ? session.expiresAt : defaultExp;
        session.expiresAt = exp;
        const dataSesi = {
            token: session.token || "",
            username: session.username,
            nama: session.nama,
            gelar_depan: session.gelar_depan || "",
            gelar_belakang: session.gelar_belakang || "",
            role: session.role,
            fakultas: session.fakultas,
            expiresAt: exp
        };
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(dataSesi));
    } catch (_) {}
}

function masukKeDasborSesuaiRole() {
    aktifkanPengawasIdlePengelola();
    if (session.role === "super_admin" || session.role === "admin") {
        document.getElementById('adminNameDisplay').innerText = session.nama;
        const isSuper = (session.role === "super_admin");
        document.getElementById('adminRoleBadge').innerText = isSuper ? "Super Administrator" : "Administrator";
        document.querySelectorAll('.super-admin-only').forEach(el => el.classList.toggle('hidden', !isSuper));
        if (document.getElementById('subLabelJadwalAdmin')) {
            document.getElementById('subLabelJadwalAdmin').innerText = isSuper ? "Kelola Sesi & Kelas" : "Lihat Jadwal Pelatihan";
        }
        tampilLayar('adminScreen');
    } else if (session.role === "operator") {
        document.getElementById('opNameDisplay').innerText = session.nama;
        document.getElementById('opFakultasDisplay').innerText = "Fakultas: " + (session.fakultas || "-");
        tampilLayar('operatorScreen');
        muatPelatihanOperator();
    } else {
        tampilLayar('presensiScreen');
        cekJadwalKeamananTinggi();
    }
}

async function pulihkanSesiLogin() {
    let saved = null;
    try {
        const raw = localStorage.getItem(SESSION_STORAGE_KEY);
        if (!raw) return;
        saved = JSON.parse(raw);
    } catch (_) {
        bersihkanSesiLokal();
        return;
    }

    if (!saved || !saved.username || (saved.expiresAt && Date.now() > saved.expiresAt)) {
        bersihkanSesiLokal();
        return;
    }
    if (!saved.token) {
        bersihkanSesiLokal();
        const msg = document.getElementById('loginMsg');
        if (msg) {
            msg.innerText = "Pembaruan keamanan sistem diterapkan. Silakan login kembali satu kali.";
            msg.classList.remove('hidden');
        }
        return;
    }

    // 1. Pulihkan tampilan dasbor secara instan (tanpa jeda ke layar login saat refresh)
    session.token = saved.token;
    session.username = saved.username;
    session.nama = saved.nama || saved.username;
    session.gelar_depan = saved.gelar_depan || "";
    session.gelar_belakang = saved.gelar_belakang || "";
    session.role = saved.role || "user";
    session.fakultas = saved.fakultas || "";
    session.expiresAt = saved.expiresAt || 0;
    const prevRole = session.role;
    masukKeDasborSesuaiRole();

    // 2. Verifikasi token & sinkronkan role/profil secara senyap di latar belakang
    try {
        const res = await apiPost({ action: "verify_session" }, { skipAuthRedirect: true });
        if (res && res.status === "success") {
            session.username = res.username || session.username;
            session.nama = res.nama || session.username;
            session.gelar_depan = res.gelar_depan || "";
            session.gelar_belakang = res.gelar_belakang || "";
            session.role = res.role || "user";
            session.fakultas = res.fakultas || "";
            if (res.expires_at) session.expiresAt = res.expires_at;
            simpanSesiLogin();

            if (session.role !== prevRole) {
                masukKeDasborSesuaiRole();
            } else if (session.role === "super_admin" || session.role === "admin") {
                const elAdm = document.getElementById('adminNameDisplay');
                if (elAdm) elAdm.innerText = session.nama;
            } else if (session.role === "operator") {
                const elOp = document.getElementById('opNameDisplay');
                const elFak = document.getElementById('opFakultasDisplay');
                if (elOp) elOp.innerText = session.nama;
                if (elFak) elFak.innerText = "Fakultas: " + (session.fakultas || "-");
            } else {
                const elUsr = document.getElementById('userNameDisplay');
                if (elUsr) elUsr.innerText = formatNamaDenganGelar(session.nama, session.gelar_depan, session.gelar_belakang);
            }
        } else if (res && res.code === "UNAUTHORIZED") {
            // Hanya logout jika server secara eksplisit menyatakan token tidak valid / expired
            bersihkanSesiLokal();
            tampilLayar('loginScreen');
            const msg = document.getElementById('loginMsg');
            if (msg) {
                msg.innerText = res.message || "Sesi login Anda telah berakhir. Silakan login kembali.";
                msg.classList.remove('hidden');
            }
        }
    } catch (_) {
        // Gangguan jaringan sementara saat refresh: jangan hapus sesi lokal
    }
}

async function logout() {
    hentikanKameraAktif();
    if (privilegedIdleTimer) { clearTimeout(privilegedIdleTimer); privilegedIdleTimer = null; }
    if (session.token) {
        try { await apiPost({ action: "logout" }, { skipAuthRedirect: true }); } catch (_) {}
    }
    bersihkanSesiLokal();
    location.reload();
}

async function logoutSemuaPerangkat() {
    if (!await appConfirm("Keluar dari SEMUA perangkat (termasuk HP/komputer lain yang sedang login dengan akun ini)?", { title: 'Keluar Semua Perangkat', okText: 'Ya, Keluar Semua', danger: true })) return;
    hentikanKameraAktif();
    if (privilegedIdleTimer) { clearTimeout(privilegedIdleTimer); privilegedIdleTimer = null; }
    if (session.token) {
        try { await apiPost({ action: "logout_all" }, { skipAuthRedirect: true }); } catch (_) {}
    }
    bersihkanSesiLokal();
    showToast("Semua sesi login di seluruh perangkat berhasil diakhiri.", 'success');
    setTimeout(() => location.reload(), 900);
}

async function login() {
    const user = document.getElementById('username').value.trim(), pass = document.getElementById('password').value;
    const msg = document.getElementById('loginMsg'), btn = document.getElementById('btnLogin');
    if (!user || !pass) { msg.innerText = "Mohon isi Email dan Kata Sandi terlebih dahulu!"; msg.classList.remove('hidden'); return; }
    btn.innerText = "Sinkronisasi..."; btn.disabled = true; msg.classList.add('hidden');
    try {
        const res = await apiPost({ action: "login", username: user, password: pass }, { skipAuthRedirect: true });
        if (res.status === "success" && res.token) {
            document.getElementById('password').value = "";
            session.token = res.token;
            session.username = res.username || user;
            session.nama = res.nama || user;
            session.gelar_depan = res.gelar_depan || "";
            session.gelar_belakang = res.gelar_belakang || "";
            session.role = res.role || "user";
            session.fakultas = res.fakultas || "";
            session.expiresAt = res.expires_at || 0;
            simpanSesiLogin();
            masukKeDasborSesuaiRole();
        } else { msg.innerText = res.message || "Login gagal."; msg.classList.remove('hidden'); }
    } catch (e) { msg.innerText = "Gagal menghubungi server. Periksa koneksi internet Anda atau coba beralih jaringan (Wi-Fi / Data Seluler)."; msg.classList.remove('hidden'); }
    btn.innerText = "Masuk Ke Aplikasi"; btn.disabled = false;
}

// =========================================================================
// LUPA KATA SANDI MANDIRI (OTP EMAIL 6 DIGIT)
// =========================================================================
function bukaModalLupaPassword() {
    const modal = document.getElementById('modalLupaPassword');
    if (!modal) return;
    const loginEmail = (document.getElementById('username')?.value || '').trim();
    const inpEmail = document.getElementById('resetEmailInput');
    if (inpEmail) inpEmail.value = loginEmail.includes('@') ? loginEmail : '';
    document.getElementById('resetOtpInput').value = '';
    document.getElementById('resetNewPassInput').value = '';
    document.getElementById('resetConfirmPassInput').value = '';
    document.getElementById('stepResetEmail').classList.remove('hidden');
    document.getElementById('stepResetConfirm').classList.add('hidden');
    const msgEl = document.getElementById('resetOtpMsg');
    if (msgEl) { msgEl.innerText = ''; msgEl.classList.add('hidden'); }
    modal.classList.remove('hidden');
}

function tutupModalLupaPassword() {
    const modal = document.getElementById('modalLupaPassword');
    if (modal) modal.classList.add('hidden');
}

function kembaliKeStepEmailOtp() {
    document.getElementById('stepResetEmail').classList.remove('hidden');
    document.getElementById('stepResetConfirm').classList.add('hidden');
    const msgEl = document.getElementById('resetOtpMsg');
    if (msgEl) msgEl.classList.add('hidden');
}

async function kirimOtpResetPassword(btn) {
    const email = (document.getElementById('resetEmailInput')?.value || '').trim();
    const msgEl = document.getElementById('resetOtpMsg');
    if (msgEl) msgEl.classList.add('hidden');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        if (msgEl) { msgEl.innerText = "Masukkan alamat email aktif yang valid."; msgEl.classList.remove('hidden'); }
        return;
    }
    const teksAsli = btn ? btn.innerText : "Kirim Kode OTP ke Email";
    if (btn) { btn.innerText = "Mengirim OTP..."; btn.disabled = true; }
    try {
        const res = await apiPost({ action: "request_password_reset", username: email }, { skipAuthRedirect: true });
        if (res.status === "success") {
            document.getElementById('labelEmailOtpTarget').innerText = email;
            document.getElementById('stepResetEmail').classList.add('hidden');
            document.getElementById('stepResetConfirm').classList.remove('hidden');
        } else if (msgEl) {
            msgEl.innerText = res.message || "Gagal mengirim kode OTP.";
            msgEl.classList.remove('hidden');
        }
    } catch (_) {
        if (msgEl) { msgEl.innerText = "Gagal menghubungi server. Periksa koneksi internet Anda."; msgEl.classList.remove('hidden'); }
    }
    if (btn) { btn.innerText = teksAsli; btn.disabled = false; }
}

async function konfirmasiResetPassword(btn) {
    const email = (document.getElementById('resetEmailInput')?.value || '').trim();
    const otp = (document.getElementById('resetOtpInput')?.value || '').trim();
    const newPass = document.getElementById('resetNewPassInput')?.value || '';
    const confirmPass = document.getElementById('resetConfirmPassInput')?.value || '';
    const msgEl = document.getElementById('resetOtpMsg');
    if (msgEl) msgEl.classList.add('hidden');

    if (!/^\d{6}$/.test(otp)) {
        if (msgEl) { msgEl.innerText = "Kode OTP wajib berupa 6 digit angka."; msgEl.classList.remove('hidden'); }
        return;
    }
    const errPwd = validasiKataSandiKuat(newPass);
    if (errPwd) {
        if (msgEl) { msgEl.innerText = errPwd; msgEl.classList.remove('hidden'); }
        return;
    }
    if (newPass !== confirmPass) {
        if (msgEl) { msgEl.innerText = "Konfirmasi kata sandi baru tidak cocok."; msgEl.classList.remove('hidden'); }
        return;
    }

    const teksAsli = btn ? btn.innerText : "Simpan Kata Sandi Baru";
    if (btn) { btn.innerText = "Memverifikasi OTP..."; btn.disabled = true; }
    try {
        const res = await apiPost({
            action: "confirm_password_reset",
            username: email,
            otp,
            new_password: newPass
        }, { skipAuthRedirect: true });
        if (res.status === "success") {
            tutupModalLupaPassword();
            const userInp = document.getElementById('username');
            if (userInp) userInp.value = email;
            showToast(res.message || "Kata sandi berhasil diperbarui! Silakan login.", 'success');
        } else if (msgEl) {
            msgEl.innerText = res.message || "Gagal mereset kata sandi.";
            msgEl.classList.remove('hidden');
        }
    } catch (_) {
        if (msgEl) { msgEl.innerText = "Gagal menghubungi server. Silakan coba lagi."; msgEl.classList.remove('hidden'); }
    }
    if (btn) { btn.innerText = teksAsli; btn.disabled = false; }
}

['username', 'password'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
        el.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                const btn = document.getElementById('btnLogin');
                if (btn && !btn.disabled) login();
            }
        });
    }
});
