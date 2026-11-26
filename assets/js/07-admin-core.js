// 07-admin-core.js — Panel admin: lupa presensi, rekap, jadwal/status Draft-Aktif, Wi-Fi/GPS, peserta & XLS, galeri, prodi, staf & reset sandi

async function muatLupaPresensiAdmin() {
    tampilLayar('adminLupaPresensiScreen');
    const wadah = document.getElementById('wadahLupaPresensiAdmin');
    const toolbarAll = document.getElementById('toolbarBulkLP');
    const toolbarSelect = document.getElementById('subToolbarPilihLP');
    if (toolbarAll) toolbarAll.classList.add('hidden');
    if (toolbarSelect) toolbarSelect.classList.add('hidden');
    if (document.getElementById('cekSemuaLP')) document.getElementById('cekSemuaLP').checked = false;

    wadah.innerHTML = renderSkeletonList(3);
    try {
        const res = await apiPost({ action: "get_lupa_presensi" });
        if (res.status === "success" && res.data.length > 0) {
            if (toolbarAll) toolbarAll.classList.remove('hidden');
            if (toolbarSelect) toolbarSelect.classList.remove('hidden');

            wadah.innerHTML = res.data.map(item => {
                const wktFormat = formatWitaDateTime(item.waktu);
                const fotoSafe = safeUrl(item.foto);
                const idDrive = extractDriveId(item.foto);
                const imageUrl = idDrive
                    ? `https://drive.google.com/thumbnail?id=${encodeURIComponent(idDrive)}&sz=w800`
                    : fotoSafe;

                return `
                <div class="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs mb-2.5">
                    <div class="flex items-start justify-between gap-2 mb-1">
                        <label class="flex items-start space-x-2.5 cursor-pointer">
                            <input type="checkbox" value="${Number(item.row)}" class="cek-item-lp w-4 h-4 mt-0.5 rounded text-oceanDark focus:ring-oceanDark">
                            <div>
                                <p class="text-xs font-bold text-oceanDark uppercase mb-0.5">${escapeHtml(item.pelatihan)}</p>
                                <h3 class="text-sm font-bold text-slate-900">${escapeHtml(item.username)}</h3>
                            </div>
                        </label>
                        <span class="text-xs text-slate-600 shrink-0">${escapeHtml(wktFormat)} WITA</span>
                    </div>
                    <p class="text-xs text-slate-600 mb-2 pl-6">${escapeHtml(item.hari)} | ${escapeHtml(item.sesi)}</p>

                    <div class="pl-6 space-y-3 mb-3">
                        <div class="bg-amber-50 border border-amber-200 p-2.5 rounded-xl">
                            <p class="text-xs font-bold text-amber-800 uppercase">Alasan Peserta:</p>
                            <p class="text-xs text-slate-800 font-medium mt-0.5">"${escapeHtml(item.alasan_lupa || '-')}"</p>
                        </div>

                        <div class="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-center">
                            <p class="text-xs font-bold text-slate-700 uppercase mb-1.5">Bukti Foto Kehadiran</p>
                            <img src="${escapeHtml(imageUrl)}" alt="Bukti Presensi" class="w-full h-auto max-h-[300px] object-contain rounded-lg mx-auto bg-slate-100" onerror="this.classList.add('hidden'); this.nextElementSibling.classList.remove('hidden');">
                            <p class="hidden text-xs text-red-600 py-4">Pratinjau gambar tidak dapat dimuat. Gunakan tombol <b>Buka Foto Layar Penuh</b> di bawah.</p>
                        </div>
                    </div>

                    <div class="pl-6">
                        <a href="${escapeHtml(fotoSafe)}" target="_blank" rel="noopener noreferrer" class="w-full min-h-[44px] flex items-center justify-center bg-slate-50 text-oceanDark border border-sky-200 text-center font-bold py-2 rounded-xl text-xs mb-2.5 hover:bg-sky-50 transition-colors">Buka Foto Layar Penuh</a>
                        <div class="flex space-x-2">
                            <button type="button" onclick="prosesLupaPresensiAdmin(${Number(item.row)}, 'Approved', this)" class="w-1/2 min-h-[44px] bg-oceanDark hover:bg-oceanDeep text-white rounded-xl py-2.5 font-bold text-xs transition-colors shadow-xs">Setujui</button>
                            <button type="button" onclick="prosesLupaPresensiAdmin(${Number(item.row)}, 'Rejected', this)" class="w-1/2 min-h-[44px] bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl py-2.5 font-bold text-xs transition-colors shadow-xs">Tolak</button>
                        </div>
                    </div>
                </div>`;
            }).join('');
        } else wadah.innerHTML = `<p class="text-center text-slate-600 text-xs mt-4">Belum ada permohonan lupa presensi.</p>`;
    } catch (e) { wadah.innerHTML = `<p class="text-center text-red-600 text-xs mt-4">Gagal memuat data.</p>`; }
}

function togglePilihSemuaLP(masterCb) {
    document.querySelectorAll('.cek-item-lp').forEach(cb => { cb.checked = masterCb.checked; });
}

async function prosesBulkLupaPresensi(status, isAll) {
    const checkboxes = isAll
        ? Array.from(document.querySelectorAll('.cek-item-lp'))
        : Array.from(document.querySelectorAll('.cek-item-lp:checked'));

    if (checkboxes.length === 0) return showToast("Pilih minimal 1 permohonan terlebih dahulu.", 'warning');

    const rowIndices = checkboxes.map(cb => parseInt(cb.value, 10));
    let alasanText = "";
    if (status === "Rejected") {
        alasanText = await appPrompt(`Tuliskan alasan penolakan untuk ${rowIndices.length} permohonan ini:`, '', { title: 'Tolak Permohonan', okText: 'Tolak', danger: true, inputLabel: 'Alasan Penolakan' });
        if (alasanText === null) return;
        if (alasanText.trim() === "") alasanText = "Bukti foto tidak sah atau tidak memenuhi kriteria.";
    } else {
        if (!await appConfirm(`Yakin ingin menyetujui ${rowIndices.length} permohonan sekaligus?`, { title: 'Setujui Permohonan', okText: 'Ya, Setujui' })) return;
    }

    try {
        const res = await apiPost({ action: "process_lupa_presensi", rowIndices: rowIndices, keputusan: status, alasan: alasanText });
        showToast(res.message, res.status === "success" ? 'success' : 'error');
        muatLupaPresensiAdmin();
        muatRingkasanAdmin();
    } catch (e) {
        showToast("Gagal memproses permohonan.", 'error');
    }
}

async function prosesLupaPresensiAdmin(row, status, btn) {
    let alasanText = "";
    if (status === "Rejected") {
        alasanText = await appPrompt("Tuliskan alasan mengapa bukti ditolak:", '', { title: 'Tolak Permohonan', okText: 'Tolak', danger: true, inputLabel: 'Alasan Penolakan' });
        if (alasanText === null) return;
        if (alasanText.trim() === "") alasanText = "Bukti foto tidak sah atau tidak memenuhi kriteria.";
    } else if (!await appConfirm("Yakin ingin menyetujui permohonan ini?", { title: 'Setujui Permohonan', okText: 'Ya, Setujui' })) return;

    const teksAsli = btn ? btn.innerText : "";
    if (btn) { btn.innerText = "Memproses..."; btn.disabled = true; }
    try {
        const res = await apiPost({ action: "process_lupa_presensi", rowIndex: row, keputusan: status, alasan: alasanText });
        showToast(res.message, res.status === "success" ? 'success' : 'error');
        muatLupaPresensiAdmin();
        muatRingkasanAdmin();
    } catch (e) {
        showToast("Gagal memproses permohonan.", 'error');
        if (btn) { btn.innerText = teksAsli; btn.disabled = false; }
    }
}

async function tarikDataRekap() {
    const pel = document.getElementById('rekapPelatihanSelect').value; if (!pel) return showToast("Pilih pelatihan terlebih dahulu.", 'warning');
    document.getElementById('wadahRekapAbsen').innerHTML = renderSkeletonList(3); document.getElementById('cariRekapInput').classList.add('hidden'); document.getElementById('loadingRekap').classList.add('hidden');
    try {
        const res = await apiPost({ action: "get_rekap_absen", pelatihan: pel });
        if (res.status === "success" && res.data.length > 0) {
            document.getElementById('cariRekapInput').classList.remove('hidden'); document.getElementById('cariRekapInput').value = '';
            let html = `<p class="text-xs font-bold text-slate-700 mb-2 uppercase">Total: ${res.data.length} Peserta | Total Sesi: ${res.sessions.length}</p>`;
            res.data.forEach(d => {
                const attHtml = d.attended.length > 0 ? `<div class="p-2.5 bg-sky-50 border border-sky-200 rounded-xl"><p class="text-xs font-bold text-oceanDeep mb-1.5">Hadir (${d.attended.length}):</p><div class="flex flex-wrap gap-1.5">${d.attended.map(a => `<span class="bg-white border border-sky-200 text-oceanDark text-xs font-medium px-2 py-0.5 rounded-md">${escapeHtml(a)}</span>`).join('')}</div></div>` : '';
                const missHtml = d.missed.length > 0 ? `<div class="p-2.5 bg-rose-50 border border-rose-200 rounded-xl"><p class="text-xs font-bold text-rose-700 mb-1.5">Tidak Hadir (${d.missed.length}):</p><div class="flex flex-wrap gap-1.5">${d.missed.map(m => `<span class="bg-white border border-rose-200 text-rose-700 text-xs font-medium px-2 py-0.5 rounded-md">${escapeHtml(m)}</span>`).join('')}</div></div>` : '';
                html += `<div class="kartu-rekap bg-white border border-slate-200 p-4 rounded-2xl shadow-xs"><p class="font-bold text-sm text-slate-900">${escapeHtml(d.nama)}</p><p class="text-xs text-oceanDark font-medium mb-2.5">${escapeHtml(d.email)}</p><div class="space-y-2">${attHtml}${missHtml}</div></div>`;
            });
            document.getElementById('wadahRekapAbsen').innerHTML = html;
        } else document.getElementById('wadahRekapAbsen').innerHTML = `<p class="text-center text-slate-600 text-xs mt-4">Belum ada peserta terdaftar di kelas ini.</p>`;
    } catch (e) { document.getElementById('wadahRekapAbsen').innerHTML = `<p class="text-center text-red-600 text-xs mt-4">Gagal menarik data dari server.</p>`; }
}

function filterRekapPeserta() { const kw = document.getElementById('cariRekapInput').value.toLowerCase(); document.querySelectorAll('.kartu-rekap').forEach(c => { c.style.display = c.innerText.toLowerCase().includes(kw) ? 'block' : 'none'; }); }

async function muatDaftarPelatihanAdmin() {
    try {
        const res = await apiPost({ action: "get_public_pelatihan" });
        if (res.status === "success") {
            window.pelatihanData = res.data;
            if (res.default_gps) { TARGET_LAT = parseFloat(res.default_gps.lat) || -3.29687; TARGET_LNG = parseFloat(res.default_gps.lng) || 114.58823; RADIUS_MAX = parseFloat(res.default_gps.radius) || 50; }
            const optionsHTML = res.data.map(p => `<option value="${escapeHtml(p.nama)}">${p.status === 'Draft' ? '[DRAFT] ' : ''}${escapeHtml(p.nama)}${p.info && p.info !== "-" ? ` (${escapeHtml(p.info)})` : ''}</option>`).join('');
            const jSelect = document.getElementById('jadwalPelatihanSelect'); if (jSelect) jSelect.innerHTML = '<option value="">-- Pilih Pelatihan --</option>' + (session.role === "super_admin" ? '<option value="BARU">+ Buat Pelatihan Baru...</option>' : '') + optionsHTML;
            const pSelect = document.getElementById('inputPelatihanPeserta'); if (pSelect) pSelect.innerHTML = '<option value="">-- Pilih Pelatihan --</option>' + optionsHTML;
            const rSelect = document.getElementById('rewardPel'); if (rSelect) rSelect.innerHTML = '<option value="">-- Pilih Pelatihan --</option>' + optionsHTML;
            const rekSelect = document.getElementById('rekapPelatihanSelect'); if (rekSelect) rekSelect.innerHTML = '<option value="">-- Pilih Pelatihan --</option>' + optionsHTML;
            const gpsSelect = document.getElementById('gpsPelatihanSelect'); if (gpsSelect) { gpsSelect.innerHTML = '<option value="DEFAULT">-- Default Sistem (Standar LPMPP) --</option>' + optionsHTML; cekPilihPelatihanGPS(); }
        }
    } catch (e) {}
}

async function simpanDataAdmin(jenis, btnSimpan) {
    let payload = { action: "" };
    const teksAsli = btnSimpan ? btnSimpan.innerText : "";
    if (btnSimpan) { btnSimpan.innerText = "Proses..."; btnSimpan.disabled = true; }
    if (jenis === "jadwal_multi") {
        let pName = document.getElementById("jadwalPelatihanSelect").value;
        if (pName === "BARU") pName = document.getElementById("jadwalPelatihanInput").value;
        pName = (pName || "").trim();
        if (!pName) { showToast("Nama Pelatihan wajib diisi.", 'warning'); if (btnSimpan) { btnSimpan.innerText = teksAsli; btnSimpan.disabled = false; } return; }
        if (pName.length > 90 || /[\[\]\*\?\/\\:]/.test(pName) || pName.toLowerCase().startsWith('peserta ')) {
            showToast('Nama pelatihan tidak valid (maks. 90 karakter, tidak boleh diawali "Peserta " atau mengandung []:*?/\\).', 'warning');
            if (btnSimpan) { btnSimpan.innerText = teksAsli; btnSimpan.disabled = false; }
            return;
        }
        payload.action = "save_jadwal"; payload.pelatihan = pName; payload.wa_link = document.getElementById("jadwalWALink").value;
        payload.status_pelatihan = (document.getElementById("jadwalStatusSelect")?.value === "Draft") ? "Draft" : "Aktif";
        payload.status = payload.status_pelatihan;
        payload.lat = document.getElementById("jadwalLat").value.trim() || String(TARGET_LAT);
        payload.lng = document.getElementById("jadwalLng").value.trim() || String(TARGET_LNG);
        payload.radius = document.getElementById("jadwalRadius").value.trim() || String(RADIUS_MAX);
        const tglM = document.getElementById("jadwalTglMulai").value, tglS = document.getElementById("jadwalTglSelesai").value;
        const isOnline = document.getElementById("cekOnline").checked, tOnline = document.getElementById("tempatOnline").value.trim();
        const isOffline = document.getElementById("cekOffline").checked, tOffline = document.getElementById("tempatOffline").value.trim();
        let infoParts = [];
        if (tglM && tglS && tglM !== tglS) infoParts.push(`${formatTglIndo(tglM)} - ${formatTglIndo(tglS)}`);
        else if (tglM) infoParts.push(`${formatTglIndo(tglM)}`);
        else if (tglS) infoParts.push(`${formatTglIndo(tglS)}`);
        if (isOnline) infoParts.push(tOnline ? `Online: ${tOnline}` : `Online`);
        if (isOffline) infoParts.push(tOffline ? `Offline: ${tOffline}` : `Offline`);
        payload.info_tanggal = infoParts.join(" | "); payload.default_mode = (isOnline && !isOffline) ? "Online" : "Offline";
        payload.list_sesi = [];
        document.querySelectorAll('.sesi-item').forEach(item => {
            let h = item.querySelector('.input-hari').value;
            if (h && h.trim() !== "") {
                let sMode = item.querySelector('.input-mode') ? item.querySelector('.input-mode').value : payload.default_mode;
                if (isOnline && !isOffline) sMode = "Online";
                payload.list_sesi.push({
                    hari: h,
                    tanggal: item.querySelector('.input-tanggal').value,
                    sesi: item.querySelector('.input-sesi').value,
                    jam_mulai: item.querySelector('.input-mulai').value,
                    jam_selesai: item.querySelector('.input-selesai').value,
                    mode: sMode,
                    orig_hari: item.dataset.origHari || "",
                    orig_sesi: item.dataset.origSesi || ""
                });
            }
        });
    } else if (jenis === "pengaturan") {
        payload.action = "save_setting"; payload.pelatihan = document.getElementById("gpsPelatihanSelect") ? document.getElementById("gpsPelatihanSelect").value : "DEFAULT";
        payload.lat = document.getElementById("setLat").value.trim(); payload.lng = document.getElementById("setLng").value.trim(); payload.radius = document.getElementById("setRadius").value.trim();
        if (payload.pelatihan === "DEFAULT") { TARGET_LAT = parseFloat(payload.lat) || -3.29687; TARGET_LNG = parseFloat(payload.lng) || 114.58823; RADIUS_MAX = parseFloat(payload.radius) || 50; }
    } else if (jenis === "reward") {
        payload.action = "save_reward"; payload.pelatihan = document.getElementById("rewardPel").value; payload.minimal = document.getElementById("rewardMin").value; payload.link = document.getElementById("rewardLink").value;
        if (!payload.pelatihan || !payload.minimal || parseInt(payload.minimal, 10) < 1 || !payload.link.trim()) { showToast("Mohon lengkapi semua data (minimal kehadiran >= 1).", 'warning'); if (btnSimpan) { btnSimpan.innerText = teksAsli; btnSimpan.disabled = false; } return; }
    }
    try {
        const res = await apiPost(payload);
        if (res.status === "success") {
            showToast(res.message, 'success');
            if (jenis === 'jadwal_multi') { document.getElementById("jadwalPelatihanSelect").value = ""; document.getElementById("jadwalPelatihanInput").value = ""; document.getElementById("jadwalWALink").value = ""; document.getElementById("jadwalPelatihanInput").classList.add('hidden'); resetKeteranganJadwal(); }
            if (jenis === 'reward') { document.getElementById("rewardPel").value = ""; document.getElementById("rewardMin").value = ""; document.getElementById("rewardLink").value = ""; }
            muatDaftarPelatihanAdmin();
            muatRingkasanAdmin();
        } else showToast("Gagal: " + res.message, 'error');
    } catch (e) { showToast("Koneksi gagal.", 'error'); }
    if (btnSimpan) { btnSimpan.innerText = teksAsli; btnSimpan.disabled = false; }
}

// =========================================================================
// PENGATURAN VALIDASI WI-FI RUANGAN (KHUSUS SUPER ADMIN)
// =========================================================================
let cachedAdminWifiStatus = { enabled: false, proxy_configured: false, proxy_verified: false, current_ip: '' };

function updateTampilanToggleWifi() {
    const chk = document.getElementById('toggleWifiAktif');
    const badge = document.getElementById('wifiStatusBadge');
    const hint = document.getElementById('wifiToggleHint');
    const btnDarurat = document.getElementById('btnMatikanWifiDarurat');
    const isChecked = Boolean(chk && chk.checked);

    if (badge) {
        if (isChecked) {
            badge.innerText = "AKTIF (Wajib Wi-Fi)";
            badge.className = "text-xs font-extrabold px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0";
        } else {
            badge.innerText = "NONAKTIF (Bebas Jaringan)";
            badge.className = "text-xs font-extrabold px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 shrink-0";
        }
    }
    if (hint) {
        hint.innerText = isChecked
            ? "Aktif: peserta sesi Offline wajib tersambung ke IP Wi-Fi ruangan yang terdaftar di bawah."
            : "Nonaktif: peserta bebas menggunakan Wi-Fi atau paket data seluler (cocok saat Wi-Fi gangguan).";
    }
    if (btnDarurat) {
        btnDarurat.classList.toggle('hidden', !cachedAdminWifiStatus.enabled);
    }
}

async function muatStatusWifiAdmin() {
    const box = document.getElementById('wifiProxyStatusBox');
    const chk = document.getElementById('toggleWifiAktif');
    const area = document.getElementById('setWifiAllowedIps');
    if (box) {
        box.className = "rounded-2xl p-3.5 border border-slate-200 bg-slate-50 text-xs text-slate-600";
        box.innerText = "Memeriksa status Proxy IP (HMAC) & IP Wi-Fi saat ini...";
    }
    try {
        const res = await apiPost({ action: "get_wifi_status" });
        if (res && res.status === "success") {
            cachedAdminWifiStatus = {
                enabled: Boolean(res.wifi_enabled),
                proxy_configured: Boolean(res.proxy_configured),
                proxy_verified: Boolean(res.proxy_verified),
                current_ip: res.current_ip || ""
            };
            if (chk) chk.checked = cachedAdminWifiStatus.enabled;
            if (area) area.value = res.wifi_allowed_ips || "";
            updateTampilanToggleWifi();

            if (box) {
                if (res.proxy_verified && res.current_ip) {
                    box.className = "rounded-2xl p-3.5 border border-emerald-200 bg-emerald-50 text-xs text-emerald-900";
                    box.innerHTML = `<div class="font-bold">Proxy IP Terverifikasi (HMAC Aktif)</div><div class="text-xs mt-1">IP Publik jaringan Anda saat ini: <code class="font-mono font-extrabold bg-white px-2 py-0.5 rounded border border-emerald-300">${escapeHtml(res.current_ip)}</code></div>`;
                } else if (!res.proxy_configured) {
                    box.className = "rounded-2xl p-3.5 border border-amber-300 bg-amber-50 text-xs text-amber-900";
                    box.innerHTML = `<div class="font-bold">Proxy IP Belum Dikonfigurasi di Server</div><div class="text-xs mt-1 leading-relaxed">Tambahkan <code class="font-mono font-bold">PROXY_HMAC_SECRET</code> di <b>Script Properties</b> Apps Script, pasang <b>Cloudflare Worker / PHP Proxy</b>, lalu arahkan <code class="font-mono font-bold">API_URL</code> ke proxy tersebut agar IP tidak bisa dipalsukan klien.</div>`;
                } else {
                    box.className = "rounded-2xl p-3.5 border border-amber-300 bg-amber-50 text-xs text-amber-900";
                    box.innerHTML = `<div class="font-bold">Koneksi Belum Melewati Proxy IP (${escapeHtml(res.proxy_reason || 'UNVERIFIED')})</div><div class="text-xs mt-1 leading-relaxed">Pastikan konstanta <code class="font-mono font-bold">API_URL</code> pada HTML sudah diarahkan ke URL Cloudflare Worker / <code class="font-mono font-bold">./api-proxy.php</code> dan kunci <code class="font-mono font-bold">PROXY_HMAC_SECRET</code> sama persis.</div>`;
                }
            }
        }
    } catch (_) {
        if (box) {
            box.className = "rounded-2xl p-3.5 border border-rose-200 bg-rose-50 text-xs text-rose-700";
            box.innerText = "Gagal memeriksa status Wi-Fi dari server.";
        }
    }
}

async function tambahkanIpWifiSaatIni() {
    if (!cachedAdminWifiStatus.proxy_verified || !cachedAdminWifiStatus.current_ip) {
        await muatStatusWifiAdmin();
    }
    const curIp = cachedAdminWifiStatus.current_ip;
    if (!curIp) {
        return showToast("IP publik belum terdeteksi karena koneksi belum melewati Proxy IP bertanda tangan (HMAC).", 'warning');
    }
    const area = document.getElementById('setWifiAllowedIps');
    const existing = area.value.split(/[\r\n,;]+/).map(s => s.trim()).filter(Boolean);
    if (!existing.includes(curIp)) {
        existing.push(curIp);
        area.value = existing.join('\n');
        showToast(`IP Publik Wi-Fi saat ini (${curIp}) ditambahkan ke daftar. Klik "Simpan Pengaturan Wi-Fi Ruangan".`, 'success');
    } else {
        showToast(`IP Publik (${curIp}) sudah ada di dalam daftar.`, 'info');
    }
}

async function simpanPengaturanWifi(btn) {
    const enabled = Boolean(document.getElementById('toggleWifiAktif')?.checked);
    const allowedIps = (document.getElementById('setWifiAllowedIps')?.value || '').trim();
    if (enabled && !allowedIps) {
        return showToast("Masukkan minimal 1 IP Publik Wi-Fi ruangan terlebih dahulu sebelum mengaktifkan validasi Wi-Fi.", 'warning');
    }
    const teksAsli = btn ? btn.innerText : "Simpan Pengaturan Wi-Fi Ruangan";
    if (btn) { btn.innerText = "Menyimpan..."; btn.disabled = true; }
    try {
        const res = await apiPost({
            action: "save_wifi_setting",
            wifi_enabled: enabled,
            wifi_allowed_ips: allowedIps
        });
        if (res.status === "success") {
            showToast(res.message, 'success');
            await muatStatusWifiAdmin();
            muatRingkasanAdmin();
        } else {
            showToast(res.message || "Gagal menyimpan pengaturan Wi-Fi.", 'error');
        }
    } catch (_) {
        showToast("Kesalahan koneksi saat menyimpan pengaturan Wi-Fi.", 'error');
    }
    if (btn) { btn.innerText = teksAsli; btn.disabled = false; }
}

async function matikanWifiDarurat(btn) {
    if (!await appConfirm("Matikan validasi jaringan Wi-Fi ruangan sekarang (Mode Darurat Gangguan Wi-Fi)?\n\nPeserta akan langsung dapat melakukan presensi menggunakan paket data seluler maupun jaringan lain.", { title: 'Mode Darurat Wi-Fi', okText: 'Matikan Sekarang', danger: true })) return;
    const teksAsli = btn ? btn.innerText : "Matikan Cepat (Darurat Wi-Fi)";
    if (btn) { btn.innerText = "Mematikan..."; btn.disabled = true; }
    try {
        const allowedIps = (document.getElementById('setWifiAllowedIps')?.value || '').trim();
        const res = await apiPost({
            action: "save_wifi_setting",
            wifi_enabled: false,
            wifi_allowed_ips: allowedIps
        });
        if (res.status === "success") {
            showToast(res.message, 'success');
            await muatStatusWifiAdmin();
            muatRingkasanAdmin();
        } else {
            showToast(res.message || "Gagal mematikan validasi Wi-Fi.", 'error');
        }
    } catch (_) {
        showToast("Kesalahan koneksi.", 'error');
    }
    if (btn) { btn.innerText = teksAsli; btn.disabled = false; }
}

async function bukaSpreadsheet() {
    if (session.role !== "super_admin") return showToast("Akses ditolak! Menu ini khusus Super Admin.", 'error');
    const tab = window.open('about:blank', '_blank');
    if (tab) { try { tab.opener = null; } catch (_) {} }
    try {
        const res = await apiPost({ action: "get_spreadsheet_url" });
        if (res && res.status === "success" && typeof res.url === "string" && res.url.startsWith("https://docs.google.com/spreadsheets/")) {
            if (tab && !tab.closed) tab.location.href = res.url;
            else window.open(res.url, '_blank', 'noopener,noreferrer');
        } else {
            if (tab && !tab.closed) tab.close();
            showToast(res?.message || "Gagal mengambil tautan database.", 'error');
        }
    } catch (_) {
        if (tab && !tab.closed) tab.close();
        showToast("Gagal menghubungi server untuk membuka database.", 'error');
    }
}
function tambahSesiUI() {
    const wadah = document.getElementById('wadahSesi');
    if (!wadah || !wadah.firstElementChild) return;
    const clone = wadah.firstElementChild.cloneNode(true);
    clone.querySelectorAll('input').forEach(inp => inp.value = '');
    clone.dataset.origHari = '';
    clone.dataset.origSesi = '';
    const isOnline = document.getElementById('cekOnline').checked;
    const isOffline = document.getElementById('cekOffline').checked;
    if (clone.querySelector('.input-mode')) clone.querySelector('.input-mode').value = (isOnline && !isOffline) ? 'Online' : 'Offline';
    wadah.appendChild(clone);
    document.querySelectorAll('.btn-hapus-sesi').forEach(b => b.classList.remove('hidden'));
}
function hapusSesi(btn) {
    if (session.role !== "super_admin") return;
    if (document.querySelectorAll('.sesi-item').length <= 1) return;
    btn.closest('.sesi-item').remove();
    if (document.querySelectorAll('.sesi-item').length <= 1) {
        document.querySelectorAll('.btn-hapus-sesi').forEach(b => b.classList.add('hidden'));
    }
}
async function hapusJadwalLama() {
    let pName = document.getElementById("jadwalPelatihanSelect").value;
    if (pName === "BARU") pName = document.getElementById("jadwalPelatihanInput").value;
    if (!pName) return showToast("Pilih atau ketik nama pelatihan terlebih dahulu.", 'warning');
    if (!await appConfirm(`Yakin ingin menghapus seluruh sesi untuk pelatihan "${pName}"?`, { title: 'Hapus Pelatihan', okText: 'Ya, Hapus', danger: true })) return;
    try {
        const res = await apiPost({ action: "delete_pelatihan", pelatihan: pName });
        if (res.status === "success") {
            showToast(res.message || "Pelatihan berhasil dihapus.", 'success');
            document.getElementById("jadwalPelatihanSelect").value = "";
            document.getElementById("jadwalPelatihanInput").value = "";
            document.getElementById("jadwalPelatihanInput").classList.add('hidden');
            resetKeteranganJadwal();
            muatDaftarPelatihanAdmin();
            muatRingkasanAdmin();
        } else showToast("Gagal: " + res.message, 'error');
    } catch (e) { showToast("Gagal menghapus pelatihan.", 'error'); }
}
let cachedDetailPesertaAdmin = [];
let cachedNamaPelatihanPeserta = "";

async function tarikDataPeserta() {
    const pel = document.getElementById('inputPelatihanPeserta').value;
    if (!pel) return showToast("Pilih pelatihan terlebih dahulu.", 'warning');
    cachedDetailPesertaAdmin = [];
    cachedNamaPelatihanPeserta = "";
    document.getElementById('areaPeserta').value = "Mengambil data...";
    const detailWadah = document.getElementById('wadahDetailPeserta'), searchInput = document.getElementById('cariPesertaInput');
    detailWadah.innerHTML = renderSkeletonList(3); detailWadah.classList.remove('hidden'); searchInput.classList.add('hidden'); document.getElementById('teksBantuPeserta').classList.add('hidden');
    try {
        const res = await apiPost({ action: "get_peserta", pelatihan: pel });
        if (res.status !== "success") throw new Error(res.message || "Gagal");
        document.getElementById('areaPeserta').value = (res.emails || []).join('\n');
        cachedDetailPesertaAdmin = res.details || [];
        cachedNamaPelatihanPeserta = pel;
        if (res.details && res.details.length > 0) {
            searchInput.classList.remove('hidden'); searchInput.value = '';
            detailWadah.innerHTML = '<h3 class="text-xs font-bold text-slate-800 mb-2 sticky top-0 bg-white z-10 py-1">Detail Biodata Peserta:</h3>' + res.details.map((d, idx) => `<div class="kartu-peserta bg-white border border-slate-200 p-3.5 rounded-2xl shadow-xs"><div class="flex items-start justify-between gap-2 mb-2"><div class="min-w-0"><p class="font-bold text-xs text-slate-900">${escapeHtml(formatNamaDenganGelar(d.nama, d.gelar_depan, d.gelar_belakang))}</p><p class="text-xs text-oceanDark font-medium break-all">${escapeHtml(d.email)}</p></div>${session.role === 'super_admin' ? `<button type="button" onclick="bukaModalResetSandiPesertaIndex(${idx})" class="min-h-[36px] bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold px-2.5 py-1 rounded-lg shrink-0">Reset Sandi</button>` : ''}</div><div class="grid grid-cols-1 sm:grid-cols-2 gap-y-1 text-xs text-slate-600"><p><b>NIP:</b> ${escapeHtml(d.nip || '-')}</p><p><b>NIDN:</b> ${escapeHtml(d.nidn || '-')}</p><p><b>NUPTK:</b> ${escapeHtml(d.nuptk || '-')}</p><p><b>Instansi:</b> ${escapeHtml(d.instansi || '-')}</p><p><b>Unit:</b> ${escapeHtml(d.nama_instansi || '-')}</p><p><b>Fakultas:</b> ${escapeHtml(d.fakultas || '-')}</p><p><b>Prodi:</b> ${escapeHtml(d.prodi || '-')}</p></div></div>`).join('');
            detailWadah.classList.remove('hidden');
        } else {
            detailWadah.classList.add('hidden');
            document.getElementById('teksBantuPeserta').innerText = "Belum ada data biodata peserta untuk kelas ini.";
            document.getElementById('teksBantuPeserta').classList.remove('hidden');
        }
    } catch (e) {
        cachedDetailPesertaAdmin = [];
        cachedNamaPelatihanPeserta = "";
        document.getElementById('areaPeserta').value = "";
        detailWadah.classList.add('hidden');
        document.getElementById('teksBantuPeserta').classList.remove('hidden');
        showToast("Gagal mengambil data peserta.", 'error');
    }
}

async function exportPesertaXLS() {
    const pel = document.getElementById('inputPelatihanPeserta').value;
    if (!pel) return showToast("Pilih nama pelatihan terlebih dahulu.", 'warning');

    if (cachedNamaPelatihanPeserta !== pel || cachedDetailPesertaAdmin.length === 0) {
        await tarikDataPeserta();
    }
    if (cachedNamaPelatihanPeserta !== pel || !cachedDetailPesertaAdmin?.length) {
        return showToast("Belum ada data peserta yang terdaftar pada pelatihan ini untuk diekspor.", 'warning');
    }
    const xlsxOk = await ensureXlsxLoaded();
    if (!xlsxOk || typeof XLSX === 'undefined') return;

    const rows = cachedDetailPesertaAdmin.map((d, idx) => ({
        "No": idx + 1,
        "Email": safeExcelCell(d.email),
        "Nama Lengkap (Tanpa Gelar)": safeExcelCell(d.nama),
        "Gelar Depan": safeExcelCell(d.gelar_depan),
        "Gelar Belakang": safeExcelCell(d.gelar_belakang),
        "Nama Lengkap & Gelar": safeExcelCell(formatNamaDenganGelar(d.nama, d.gelar_depan, d.gelar_belakang)),
        "NIP": safeExcelCell(d.nip),
        "NIDN/NIDK": safeExcelCell(d.nidn),
        "NUPTK": safeExcelCell(d.nuptk),
        "Tempat Lahir": safeExcelCell(d.tempat_lahir),
        "Tanggal Lahir": safeExcelCell(d.tanggal_lahir),
        "Status Kepegawaian": safeExcelCell(d.status_pegawai),
        "Jenis Kelamin": safeExcelCell(d.jk),
        "Pangkat/Golongan": safeExcelCell(d.pangkat),
        "Jabatan Fungsional": safeExcelCell(d.jabatan),
        "Instansi": safeExcelCell(d.instansi),
        "Nama Instansi": safeExcelCell(d.nama_instansi),
        "Fakultas": safeExcelCell(d.fakultas),
        "Program Studi": safeExcelCell(d.prodi),
        "Pendidikan Terakhir": safeExcelCell(d.pendidikan),
        "Nomor HP": safeExcelCell(d.hp),
        "Alamat": safeExcelCell(d.alamat)
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = Object.keys(rows[0]).map((key) => ({
        wch: Math.min(40, Math.max(key.length + 2, ...rows.map((r) => String(r[key]).length + 2)))
    }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rekap Peserta");
    XLSX.writeFile(wb, `Rekap_Peserta_${pel.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`);
    showToast("File Excel rekap peserta berhasil diunduh.", 'success');
}

function filterKartuPeserta() { const kw = document.getElementById('cariPesertaInput').value.toLowerCase(); document.querySelectorAll('.kartu-peserta').forEach(c => { c.style.display = c.innerText.toLowerCase().includes(kw) ? 'block' : 'none'; }); }
async function simpanDaftarPeserta(btn) {
    const pel = document.getElementById('inputPelatihanPeserta').value;
    const rawUsers = document.getElementById('areaPeserta').value.split('\n').map(u => u.trim()).filter(Boolean);
    const seen = new Set();
    const users = rawUsers.filter(u => {
        const k = u.toLowerCase();
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
    });
    if (!pel) return showToast("Pilih pelatihan terlebih dahulu.", 'warning');
    if (users.length === 0 && !await appConfirm(`Daftar email kosong. Yakin ingin mengosongkan seluruh peserta dari pelatihan "${pel}"?`, { title: 'Kosongkan Daftar Peserta', okText: 'Ya, Kosongkan', danger: true })) return;
    const teksAsli = btn ? btn.innerText : "Update Daftar Email";
    if (btn) { btn.innerText = "Menyimpan..."; btn.disabled = true; }
    try {
        const res = await apiPost({ action: "save_peserta", pelatihan: pel, usernames: users });
        showToast(res.status === "success" ? (res.message || "Tersimpan.") : (res.message || "Gagal."), res.status === "success" ? 'success' : 'error');
        tarikDataPeserta();
    } catch (e) {
        showToast("Gagal memperbarui daftar email.", 'error');
    }
    if (btn) { btn.innerText = teksAsli; btn.disabled = false; }
}
async function muatGaleri() {
    tampilLayar('adminValidasiScreen');
    document.getElementById('wadahGaleri').innerHTML = `<div class="col-span-full">${renderSkeletonList(3)}</div>`;
    document.getElementById('loadingGaleri').classList.add('hidden');
    try {
        const res = await apiPost({ action: "get_galeri" });
        if (res.status === "success") {
            dataGaleriGlobal = res.data || [];
            const listPelatihan = Array.isArray(res.pelatihan_list) && res.pelatihan_list.length > 0
                ? res.pelatihan_list
                : [...new Set(dataGaleriGlobal.map(i => i.pelatihan))];
            document.getElementById('filterPelatihan').innerHTML = '<option value="">Semua Pelatihan</option>' + listPelatihan.map(p => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join('');
            renderGaleri();
        } else {
            document.getElementById('wadahGaleri').innerHTML = `<p class="col-span-full text-center text-red-600 text-xs py-6">${escapeHtml(res.message || 'Gagal memuat galeri.')}</p>`;
        }
    } catch (e) { document.getElementById('wadahGaleri').innerHTML = `<p class="col-span-full text-center text-red-600 text-xs py-6">Gagal memuat galeri foto presensi.</p>`; }
}
function renderGaleri() {
    const fPel = document.getElementById('filterPelatihan').value.toLowerCase(), fNama = document.getElementById('filterPeserta').value.toLowerCase(), wadah = document.getElementById('wadahGaleri');
    const terfilter = dataGaleriGlobal.filter(i => (!fPel || i.pelatihan.toLowerCase() === fPel) && i.username.toLowerCase().includes(fNama));
    if (terfilter.length === 0) {
        wadah.innerHTML = `<div class="col-span-full bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-8 text-center"><p class="text-slate-600 text-xs font-medium">Tidak ada foto presensi yang cocok dengan pencarian.</p></div>`;
        return;
    }
    wadah.innerHTML = terfilter.map(item => {
        const waktuStr = formatWitaDateTime(item.waktu);
        const fotoHref = safeUrl(item.foto);
        return `
        <div class="bg-slate-50/70 hover:bg-white border border-slate-200 hover:border-violet-300 p-4 rounded-2xl shadow-xs flex flex-col justify-between transition-all">
            <div>
                <div class="flex items-center justify-between gap-2 mb-1.5">
                    <span class="text-xs font-extrabold text-violet-800 bg-violet-50 border border-violet-200 px-2.5 py-0.5 rounded-full uppercase truncate">${escapeHtml(item.pelatihan)} | ${escapeHtml(item.sesi)}</span>
                    <span class="text-xs font-semibold text-slate-600 shrink-0">${escapeHtml(waktuStr)} WITA</span>
                </div>
                <h3 class="text-xs font-extrabold text-slate-900 truncate mb-3">${escapeHtml(item.username)}</h3>
            </div>
            <a href="${escapeHtml(fotoHref)}" target="_blank" rel="noopener noreferrer" class="w-full min-h-[44px] bg-white hover:bg-violet-700 text-slate-800 hover:text-white border border-slate-300 hover:border-violet-700 text-center font-bold py-2 rounded-xl text-xs flex items-center justify-center space-x-1.5 transition-all">
                <svg class="w-3.5 h-3.5" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                <span>Lihat Foto Selfie</span>
            </a>
        </div>`;
    }).join('');
}

async function muatDataFakultasProdi() {
    try {
        const res = await apiPost({ action: "get_fakultas_prodi" }, { skipAuthRedirect: true });
        if (res.status === "success" && res.data) {
            Object.keys(res.data).forEach(fak => {
                if (res.data[fak] === "__DELETED__") {
                    delete prodiMap[fak];
                } else {
                    prodiMap[fak] = res.data[fak];
                }
            });
            const fakOpts = '<option value="">Pilih Fakultas</option>' + Object.keys(prodiMap).concat(["Lainnya"]).map(o => `<option value="${escapeHtml(o)}">${escapeHtml(o)}</option>`).join('');
            ['regFakultas', 'editFakultas'].forEach(selId => {
                const sel = document.getElementById(selId);
                if (!sel) return;
                const prevVal = sel.value;
                sel.innerHTML = fakOpts;
                if (prevVal) {
                    if (!Array.from(sel.options).some(o => o.value === prevVal)) {
                        const opt = document.createElement('option');
                        opt.value = prevVal;
                        opt.textContent = prevVal;
                        sel.appendChild(opt);
                    }
                    sel.value = prevVal;
                }
            });
        }
    } catch (e) {}
}

function renderDropdownFakultasAdmin() {
    const sel = document.getElementById('adminFakSelect');
    if (!sel) return;
    const opts = Object.keys(prodiMap).map(f => `<option value="${escapeHtml(f)}">${escapeHtml(f)}</option>`).join('');
    sel.innerHTML = `<option value="">-- Pilih Fakultas --</option><option value="BARU">+ Tambah Fakultas Baru...</option>` + opts;
}

function bukaHalamanAdminProdi() {
    tampilLayar('adminProdiScreen');
    renderDropdownFakultasAdmin();
    document.getElementById('adminFakSelect').value = "";
    document.getElementById('adminFakInput').value = "";
    document.getElementById('adminFakInput').classList.add('hidden');
    document.getElementById('adminProdiArea').value = "";
}

function cekPilihFakultasAdmin() {
    const val = document.getElementById('adminFakSelect').value;
    const inp = document.getElementById('adminFakInput');
    const area = document.getElementById('adminProdiArea');
    if (val === "BARU") {
        inp.classList.remove('hidden');
        inp.value = "";
        area.value = "";
    } else {
        inp.classList.add('hidden');
        area.value = (val && prodiMap[val]) ? prodiMap[val].join('\n') : "";
    }
}

async function simpanFakultasProdiAdmin(btn) {
    let fak = document.getElementById('adminFakSelect').value;
    if (fak === "BARU") fak = document.getElementById('adminFakInput').value.trim();
    const prodiList = document.getElementById('adminProdiArea').value.split('\n').map(s => s.trim()).filter(s => s !== "");

    if (!fak) return showToast("Pilih atau ketik nama Fakultas terlebih dahulu.", 'warning');
    if (prodiList.length === 0) return showToast("Masukkan minimal 1 Program Studi.", 'warning');

    const teksAsli = btn.innerText;
    btn.innerText = "Menyimpan...";
    btn.disabled = true;
    try {
        const res = await apiPost({ action: "save_fakultas_prodi", fakultas: fak, prodi_list: prodiList });
        if (res.status === "success") {
            showToast(res.message, 'success');
            await muatDataFakultasProdi();
            bukaHalamanAdminProdi();
        } else {
            showToast(res.message || "Gagal menyimpan data.", 'error');
        }
    } catch (e) {
        showToast("Koneksi gagal.", 'error');
    }
    btn.innerText = teksAsli;
    btn.disabled = false;
}

async function hapusFakultasAdmin() {
    const fak = document.getElementById('adminFakSelect').value;
    if (!fak || fak === "BARU") return showToast("Pilih nama Fakultas yang ingin dihapus dari dropdown.", 'warning');
    if (!await appConfirm(`Yakin ingin menghapus Fakultas "${fak}" beserta daftar Program Studinya?`, { title: 'Hapus Fakultas', okText: 'Ya, Hapus', danger: true })) return;
    try {
        const res = await apiPost({ action: "delete_fakultas_prodi", fakultas: fak });
        if (res.status === "success") {
            showToast(res.message, 'success');
            await muatDataFakultasProdi();
            bukaHalamanAdminProdi();
        } else {
            showToast(res.message || "Gagal menghapus.", 'error');
        }
    } catch (e) {
        showToast("Koneksi gagal.", 'error');
    }
}

function terapkanModeReadOnlyAdminBiasa() {
    const isAdminBiasa = (session.role === "admin");
    const jadwalScreen = document.getElementById('adminJadwalScreen');
    if (jadwalScreen) {
        const totalSesi = jadwalScreen.querySelectorAll('.sesi-item').length;
        jadwalScreen.querySelectorAll('button').forEach(btn => {
            if (btn.classList.contains('btn-hapus-sesi')) {
                // Jangan tampilkan tombol hapus sesi jika admin biasa ATAU sesi tinggal 1
                btn.classList.toggle('hidden', isAdminBiasa || totalSesi <= 1);
                return;
            }
            const txt = btn.innerText.toLowerCase();
            if (
                txt.includes('simpan') ||
                txt.includes('hapus') ||
                txt.includes('tambah sesi') ||
                txt.includes('gunakan lokasi')
            ) {
                btn.classList.toggle('hidden', isAdminBiasa);
            }
        });
        jadwalScreen.querySelectorAll('input, select').forEach(el => {
            if (el.id !== 'jadwalPelatihanSelect') el.disabled = isAdminBiasa;
        });
        const optBaru = jadwalScreen.querySelector('#jadwalPelatihanSelect option[value="BARU"]');
        if (optBaru) optBaru.classList.toggle('hidden', isAdminBiasa);
    }
    const pesertaScreen = document.getElementById('adminPesertaScreen');
    if (pesertaScreen) {
        pesertaScreen.querySelectorAll('button').forEach(btn => {
            if (btn.innerText.toLowerCase().includes('update daftar email')) {
                btn.classList.toggle('hidden', isAdminBiasa);
            }
        });
        const areaP = document.getElementById('areaPeserta');
        if (areaP) areaP.readOnly = isAdminBiasa;
    }
}

// =========================================================================
// MANAJEMEN AKUN ADMIN & OPERATOR (KHUSUS SUPER ADMIN)
// =========================================================================
let cachedStaffList = [];
let isEditStaffMode = false;

async function bukaHalamanKelolaUser() {
    if (session.role !== "super_admin") return showToast("Akses ditolak! Menu ini khusus Super Admin.", 'error');
    tampilLayar('adminManageUsersScreen');
    const selFak = document.getElementById('staffFakultas');
    if (selFak) {
        selFak.innerHTML = '<option value="">-- Pilih Fakultas --</option>' + Object.keys(prodiMap).map(f => `<option value="${escapeHtml(f)}">${escapeHtml(f)}</option>`).join('');
    }
    resetFormStaff();
    muatDaftarStaff();
}

function toggleStaffFakultasField() {
    const roleVal = document.getElementById('staffRole').value;
    document.getElementById('wadahStaffFakultas').classList.toggle('hidden', roleVal !== 'operator');
}

function resetFormStaff() {
    isEditStaffMode = false;
    document.getElementById('staffUsername').value = "";
    document.getElementById('staffUsername').readOnly = false;
    document.getElementById('staffPassword').value = "";
    document.getElementById('staffPassword').placeholder = "Min. 8 karakter (huruf & angka)";
    const pwdLabel = document.getElementById('staffPasswordLabel');
    const pwdHint = document.getElementById('staffPasswordHint');
    if (pwdLabel) pwdLabel.innerText = "Kata Sandi*";
    if (pwdHint) pwdHint.classList.add('hidden');
    document.getElementById('staffNama').value = "";
    const roleEl = document.getElementById('staffRole');
    roleEl.value = "operator";
    roleEl.disabled = false;
    document.getElementById('staffFakultas').value = "";
    toggleStaffFakultasField();
}

async function muatDaftarStaff() {
    const wadah = document.getElementById('wadahDaftarStaff');
    wadah.innerHTML = renderSkeletonList(3);
    try {
        const res = await apiPost({ action: "get_staff_users" });
        cachedStaffList = (res.status === "success" && Array.isArray(res.data)) ? res.data : [];
        if (cachedStaffList.length > 0) {
            wadah.innerHTML = cachedStaffList.map((u, idx) => {
                const badgeColor = u.role === 'super_admin' ? 'bg-indigo-100 text-indigo-800' : (u.role === 'admin' ? 'bg-sky-100 text-oceanDeep' : 'bg-emerald-100 text-emerald-800');
                const roleLabel = u.role === 'super_admin' ? 'SUPER ADMIN' : (u.role === 'admin' ? 'ADMIN' : 'OPERATOR FAKULTAS');
                return `
                <div class="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl flex flex-col gap-1.5">
                    <div class="flex items-start justify-between gap-2">
                        <div class="min-w-0">
                            <span class="text-xs font-extrabold px-2.5 py-0.5 rounded-full ${badgeColor}">${roleLabel}</span>
                            <h4 class="text-xs font-extrabold text-slate-900 mt-1.5">${escapeHtml(u.nama)}</h4>
                            <p class="text-xs text-oceanDark font-medium break-all">${escapeHtml(u.username)}</p>
                            ${u.role === 'operator' ? `<p class="text-xs text-slate-600 font-semibold">Fakultas: ${escapeHtml(u.fakultas || '-')}</p>` : ''}
                        </div>
                        <div class="flex gap-1.5 shrink-0">
                            <button type="button" onclick="editStaffIndex(${idx})" class="min-h-[36px] bg-white border border-slate-300 hover:border-oceanDark text-slate-800 text-xs font-bold px-3 py-1 rounded-lg">Edit</button>
                            ${u.username.toLowerCase() !== session.username.toLowerCase() ? `<button type="button" onclick="hapusAkunStaffIndex(${idx})" class="min-h-[36px] bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold px-3 py-1 rounded-lg">Hapus</button>` : ''}
                        </div>
                    </div>
                </div>`;
            }).join('');
        } else wadah.innerHTML = '<p class="text-xs text-slate-600 text-center py-4">Belum ada akun pengelola.</p>';
    } catch (e) { cachedStaffList = []; wadah.innerHTML = '<p class="text-xs text-red-600 text-center py-4">Gagal memuat akun.</p>'; }
}

function editStaffIndex(idx) {
    const u = cachedStaffList[idx];
    if (!u) return;
    isEditStaffMode = true;
    document.getElementById('staffUsername').value = u.username;
    document.getElementById('staffUsername').readOnly = true;
    document.getElementById('staffPassword').value = "";
    document.getElementById('staffPassword').placeholder = "Kosongkan jika tidak mengubah kata sandi";
    const pwdLabel = document.getElementById('staffPasswordLabel');
    const pwdHint = document.getElementById('staffPasswordHint');
    if (pwdLabel) pwdLabel.innerText = "Kata Sandi Baru (Opsional)";
    if (pwdHint) pwdHint.classList.remove('hidden');
    document.getElementById('staffNama').value = u.nama;
    const roleEl = document.getElementById('staffRole');
    roleEl.value = u.role;
    roleEl.disabled = (u.username.toLowerCase() === session.username.toLowerCase());
    toggleStaffFakultasField();
    if (u.role === 'operator') document.getElementById('staffFakultas').value = u.fakultas || "";
}

async function simpanAkunStaff(btn) {
    const username = document.getElementById('staffUsername').value.trim();
    const password = document.getElementById('staffPassword').value;
    const nama = document.getElementById('staffNama').value.trim();
    const role = document.getElementById('staffRole').value;
    const fakultas = role === 'operator' ? document.getElementById('staffFakultas').value : "";

    if (!username || !nama) return showToast("Email/Username dan Nama wajib diisi.", 'warning');
    if (!isEditStaffMode && !password) return showToast("Kata Sandi wajib diisi untuk membuat akun baru.", 'warning');
    if (password) {
        const errPwd = validasiKataSandiKuat(password);
        if (errPwd) return showToast(errPwd, 'warning');
    }
    if (role === 'operator' && !fakultas) return showToast("Pilih Fakultas untuk akun Operator Fakultas.", 'warning');

    const teksAsli = btn.innerText; btn.innerText = "Menyimpan..."; btn.disabled = true;
    try {
        const res = await apiPost({ action: "save_staff_user", username, password, nama, role, fakultas, is_edit: isEditStaffMode });
        if (res.status === "success" && res.new_token) {
            session.token = res.new_token;
            if (res.expires_at) session.expiresAt = res.expires_at;
            simpanSesiLogin();
        }
        showToast(res.message, res.status === "success" ? 'success' : 'error');
        if (res.status === "success") { resetFormStaff(); muatDaftarStaff(); }
    } catch (e) { showToast("Koneksi gagal.", 'error'); }
    btn.innerText = teksAsli; btn.disabled = false;
}

function hapusAkunStaffIndex(idx) {
    const u = cachedStaffList[idx];
    if (u) hapusAkunStaff(u.username);
}

async function hapusAkunStaff(uname) {
    if (!await appConfirm(`Yakin ingin menghapus akun "${uname}"?`, { title: 'Hapus Akun Pengelola', okText: 'Ya, Hapus', danger: true })) return;
    try {
        const res = await apiPost({ action: "delete_staff_user", username: uname });
        showToast(res.message, res.status === "success" ? 'success' : 'error');
        muatDaftarStaff();
    } catch (e) { showToast("Gagal menghapus akun.", 'error'); }
}

// =========================================================================
// RESET KATA SANDI PESERTA OLEH SUPER ADMIN
// =========================================================================
let cachedHasilCariReset = [];
let targetResetAdmin = { username: "", nama: "", role: "" };
let lastTempResetPass = "";

async function cariUserUntukReset(btn) {
    if (session.role !== "super_admin") return showToast("Khusus Super Admin.", 'error');
    const q = (document.getElementById('cariResetUserInput')?.value || '').trim();
    const wadah = document.getElementById('wadahHasilCariReset');
    if (q.length < 2) {
        wadah.innerHTML = '<p class="text-xs text-amber-800 font-semibold py-2">Ketik minimal 2 huruf nama atau email peserta.</p>';
        return;
    }
    const teksAsli = btn ? btn.innerText : "Cari Akun";
    if (btn) { btn.innerText = "Mencari..."; btn.disabled = true; }
    wadah.innerHTML = renderSkeletonList(2);
    try {
        const res = await apiPost({ action: "search_users_for_reset", query: q });
        cachedHasilCariReset = (res.status === "success" && Array.isArray(res.data)) ? res.data : [];
        if (cachedHasilCariReset.length > 0) {
            wadah.innerHTML = cachedHasilCariReset.map((u, idx) => `
                <div class="bg-slate-50 border border-slate-200 p-3 rounded-2xl flex items-center justify-between gap-2">
                    <div class="min-w-0">
                        <p class="text-xs font-extrabold text-slate-900 truncate">${escapeHtml(u.nama || u.username)}</p>
                        <p class="text-xs text-oceanDark font-medium break-all">${escapeHtml(u.username)}</p>
                        <p class="text-xs text-slate-600 font-semibold uppercase">${escapeHtml(u.role)}${u.fakultas ? ' | ' + escapeHtml(u.fakultas) : ''}</p>
                    </div>
                    ${u.username.toLowerCase() !== session.username.toLowerCase()
                        ? `<button type="button" onclick="bukaModalResetSandiCariIndex(${idx})" class="min-h-[40px] bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl shrink-0">Reset Sandi</button>`
                        : `<span class="text-xs text-slate-600 font-semibold shrink-0">Akun Anda</span>`}
                </div>
            `).join('');
        } else {
            wadah.innerHTML = '<p class="text-xs text-slate-600 py-2 text-center">Akun tidak ditemukan.</p>';
        }
    } catch (_) {
        wadah.innerHTML = '<p class="text-xs text-red-600 py-2 text-center">Gagal mencari akun.</p>';
    }
    if (btn) { btn.innerText = teksAsli; btn.disabled = false; }
}

function bukaModalResetSandiPesertaIndex(idx) {
    const d = cachedDetailPesertaAdmin[idx];
    if (!d) return;
    bukaModalResetSandiAdmin(d.email, formatNamaDenganGelar(d.nama, d.gelar_depan, d.gelar_belakang), d.role || 'user');
}

function bukaModalResetSandiCariIndex(idx) {
    const u = cachedHasilCariReset[idx];
    if (!u) return;
    bukaModalResetSandiAdmin(u.username, u.nama, u.role || 'user');
}

function bukaModalResetSandiAdmin(email, nama, role) {
    if (session.role !== "super_admin") return showToast("Akses ditolak! Khusus Super Admin.", 'error');
    targetResetAdmin = { username: email, nama: nama || email, role: role || 'user' };
    lastTempResetPass = "";
    document.getElementById('adminResetTargetNama').innerText = targetResetAdmin.nama;
    document.getElementById('adminResetTargetEmail').innerText = targetResetAdmin.username;
    document.getElementById('adminResetTargetRole').innerText = "Role: " + targetResetAdmin.role;
    document.getElementById('adminResetCustomPass').value = "";
    document.getElementById('adminResetSendEmail').checked = false;
    document.getElementById('adminResetFormBox').classList.remove('hidden');
    document.getElementById('adminResetResultBox').classList.add('hidden');
    document.getElementById('modalResetSandiAdmin').classList.remove('hidden');
}

function tutupModalResetSandiAdmin() {
    lastTempResetPass = "";
    document.getElementById('adminResetTempPassDisplay').innerText = "-";
    document.getElementById('modalResetSandiAdmin').classList.add('hidden');
}

async function eksekusiResetSandiAdmin(btn) {
    if (!targetResetAdmin.username) return;
    const customPass = document.getElementById('adminResetCustomPass')?.value || '';
    const sendEmail = Boolean(document.getElementById('adminResetSendEmail')?.checked);
    if (customPass) {
        const errPwd = validasiKataSandiKuat(customPass);
        if (errPwd) return showToast(errPwd, 'warning');
    }
    if (!await appConfirm(`Yakin ingin mereset kata sandi akun "${targetResetAdmin.username}"?\n\nSemua sesi login aktif akun tersebut akan langsung dicabut.`, { title: 'Reset Kata Sandi', okText: 'Ya, Reset Sandi', danger: true })) return;

    const teksAsli = btn ? btn.innerText : "Reset Kata Sandi Sekarang";
    if (btn) { btn.innerText = "Mereset..."; btn.disabled = true; }
    try {
        const res = await apiPost({
            action: "admin_reset_user_password",
            username: targetResetAdmin.username,
            custom_password: customPass,
            send_email: sendEmail
        });
        if (res.status === "success" && res.temp_password) {
            lastTempResetPass = res.temp_password;
            document.getElementById('adminResetTempPassDisplay').innerText = res.temp_password;
            document.getElementById('adminResetEmailNote').innerText = res.email_sent
                ? "Salinan sandi sementara juga telah dikirim ke email peserta."
                : (sendEmail ? "Email otomatis gagal terkirim, silakan salin & kirim manual via WhatsApp." : "Silakan salin & berikan kata sandi sementara ini kepada peserta.");
            document.getElementById('adminResetFormBox').classList.add('hidden');
            document.getElementById('adminResetResultBox').classList.remove('hidden');
            showToast("Kata sandi sementara berhasil dibuat.", 'success');
        } else {
            showToast(res.message || "Gagal mereset kata sandi.", 'error');
        }
    } catch (_) {
        showToast("Gagal menghubungi server.", 'error');
    }
    if (btn) { btn.innerText = teksAsli; btn.disabled = false; }
}

async function salinSandiSementara() {
    if (!lastTempResetPass) return;
    try {
        await navigator.clipboard.writeText(lastTempResetPass);
        showToast("Kata sandi sementara berhasil disalin.", 'success');
    } catch (_) {
        await appPrompt("Salin kata sandi sementara berikut:", lastTempResetPass, { title: 'Salin Kata Sandi', okText: 'Tutup', inputLabel: 'Kata Sandi Sementara' });
    }
}

async function salinPesanWaReset() {
    if (!lastTempResetPass || !targetResetAdmin.username) return;
    const pesan =
        `Yth. Bapak/Ibu ${targetResetAdmin.nama},\n\n` +
        `Kata sandi akun SIPLPMPP ULM Anda telah kami reset:\n` +
        `- Email: ${targetResetAdmin.username}\n` +
        `- Kata Sandi Sementara: ${lastTempResetPass}\n\n` +
        `Silakan login di https://siplpmpp.my.id/ lalu segera ganti kata sandi melalui menu Profil demi keamanan akun Anda.`;
    try {
        await navigator.clipboard.writeText(pesan);
        showToast("Pesan WhatsApp beserta kata sandi sementara berhasil disalin.", 'success');
    } catch (_) {
        await appPrompt("Salin pesan berikut:", pesan, { title: 'Salin Pesan WhatsApp', okText: 'Tutup', inputLabel: 'Pesan WhatsApp' });
    }
}
