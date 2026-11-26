// 06-peserta.js — Jadwal & presensi GPS/Wi-Fi/kamera, riwayat kehadiran, materi/reward, grup WA, lupa presensi, profil & registrasi

async function cekJadwalKeamananTinggi() {
    setTanggalHariIni();
    document.getElementById('userNameDisplay').innerText = formatNamaDenganGelar(session.nama, session.gelar_depan, session.gelar_belakang);
    const pelEl = document.getElementById('pelatihanDisplay'), sesiEl = document.getElementById('sesiDisplay'), wadahWaktuEl = document.getElementById('wadahWaktuDisplay'), waktuEl = document.getElementById('waktuDisplay');

    if (cachedJadwalPeserta.length === 0 && cachedEnrolledInfo.length === 0) {
        pelEl.className = "text-xs font-medium text-slate-500 text-center leading-relaxed";
        pelEl.innerText = "Memeriksa jadwal...";
        sesiEl.classList.add('hidden');
        wadahWaktuEl.classList.add('hidden');
        ubahStatusMsg("", "");
        document.getElementById('btnLokasi').classList.add('hidden');
        document.getElementById('btnKamera').classList.add('hidden');
    }

    const wita = getWitaNow();
    const currentTimeMinutes = wita.currentMins;
    const realTodayStr = wita.todayStr;

    try {
        const res = await apiPost({ action: "get_jadwal" });
        if (res.status !== "success") {
            pelEl.className = "text-xs font-semibold text-red-600 text-center leading-relaxed";
            pelEl.innerText = res.message || "Gagal memuat jadwal dari database.";
            return;
        }
        if (res.user_info) {
            session.nama = res.user_info.nama || session.nama;
            session.gelar_depan = res.user_info.gelar_depan || "";
            session.gelar_belakang = res.user_info.gelar_belakang || "";
            simpanSesiLogin();
            document.getElementById('userNameDisplay').innerText = formatNamaDenganGelar(session.nama, session.gelar_depan, session.gelar_belakang);
        }
        updateStatistikDashboard(res.data || [], res.enrolled_info || [], realTodayStr, currentTimeMinutes);

        sesiEl.classList.add('hidden');
        wadahWaktuEl.classList.add('hidden');
        ubahStatusMsg("", "");
        document.getElementById('btnLokasi').classList.add('hidden');
        document.getElementById('btnKamera').classList.add('hidden');

        if (res.enrolled_count === 0) {
            pelEl.className = "text-xs font-semibold text-amber-700 text-center leading-relaxed";
            pelEl.innerText = 'Anda belum terdaftar di pelatihan mana pun. Silakan memilih pelatihan di menu "Daftar Kelas"';
            return;
        }
        if (res.data && res.data.length > 0) {
            let jadwalAktif = null;
            for (let i = 0; i < res.data.length; i++) {
                const j = res.data[i], tglSheet = j.tanggal ? j.tanggal.trim() : "";
                if (tglSheet && tglSheet !== "-" && tglSheet !== realTodayStr) continue;
                const startMins = parseJamMenit(j.jam_mulai);
                let endMins = parseJamMenit(j.jam_selesai);
                if (startMins !== null && endMins !== null) {
                    if (endMins === 0) endMins = 1440;
                    if (currentTimeMinutes >= startMins && currentTimeMinutes <= endMins) { jadwalAktif = j; break; }
                }
            }
            if (jadwalAktif) {
                session.pelatihan = jadwalAktif.pelatihan; session.hari = jadwalAktif.hari; session.sesi = jadwalAktif.sesi;
                session.targetLat = parseFloat(jadwalAktif.lat) || TARGET_LAT; session.targetLng = parseFloat(jadwalAktif.lng) || TARGET_LNG;
                session.targetRadius = parseFloat(jadwalAktif.radius) || RADIUS_MAX; session.mode = jadwalAktif.mode || "Offline";
                pelEl.className = "text-sm font-extrabold text-oceanDeep text-center leading-snug"; pelEl.innerText = jadwalAktif.pelatihan;
                sesiEl.innerText = `${jadwalAktif.hari} | ${jadwalAktif.sesi} (${session.mode})`; sesiEl.classList.remove('hidden');
                waktuEl.innerText = `Batas: ${jadwalAktif.jam_mulai} - ${jadwalAktif.jam_selesai} WITA`; wadahWaktuEl.classList.remove('hidden');
                if (jadwalAktif.sudah_hadir) {
                    ubahStatusMsg("Anda sudah melakukan presensi di sesi ini.", "text-emerald-700");
                } else {
                    ubahStatusMsg("Waktu terverifikasi. Silakan verifikasi lokasi.", "text-oceanDark");
                    document.getElementById('btnLokasi').classList.remove('hidden');
                }
            } else {
                pelEl.className = "text-xs font-semibold text-slate-600 text-center leading-relaxed";
                pelEl.innerText = "Belum ada sesi presensi aktif untuk pelatihan Anda.";
            }
        } else {
            pelEl.className = "text-xs font-semibold text-slate-600 text-center leading-relaxed";
            pelEl.innerText = "Belum ada sesi presensi aktif untuk pelatihan Anda.";
        }
    } catch (e) { pelEl.innerText = "Gagal memuat jadwal dari database."; }
}

function getKunciIzinPelatihan() {
    return `lpmpp_izin_seen_${(session.username || '').toLowerCase().trim()}__${(session.pelatihan || '').trim()}`;
}

function verifikasiLokasi() {
    let sudahLihat = false;
    try { sudahLihat = localStorage.getItem(getKunciIzinPelatihan()) === '1'; } catch (_) {}

    if (!sudahLihat) {
        const badge = document.getElementById('modalIzinPelatihanBadge');
        if (badge) badge.innerText = session.pelatihan || 'Persiapan Presensi';
        const modal = document.getElementById('modalIzinPresensi');
        if (modal) {
            modal.classList.remove('hidden');
            return;
        }
    }
    lanjutVerifikasiLokasi();
}

function konfirmasiModalIzinPresensi() {
    try { localStorage.setItem(getKunciIzinPelatihan(), '1'); } catch (_) {}
    tutupModalIzinPresensi();
    lanjutVerifikasiLokasi();
}

function tutupModalIzinPresensi() {
    const modal = document.getElementById('modalIzinPresensi');
    if (modal) modal.classList.add('hidden');
}

function lanjutVerifikasiLokasi() {
    ubahStatusMsg("Mencari titik lokasi GPS...", "text-oceanDark");
    if (!navigator.geolocation) {
        if (session.mode === "Online") {
            session.lat = "Online"; session.lng = "Online";
            aktifkanTombolKamera("Sesi Online (Bebas Lokasi). Silakan buka kamera.");
        } else {
            ubahStatusMsg("Browser Anda tidak mendukung akses GPS.", "text-red-600");
        }
        return;
    }
    if (session.mode === "Online") {
        navigator.geolocation.getCurrentPosition(
            pos => { session.lat = pos.coords.latitude; session.lng = pos.coords.longitude; aktifkanTombolKamera("Sesi Online (Bebas Lokasi). Silakan buka kamera."); },
            () => { session.lat = "Online"; session.lng = "Online"; aktifkanTombolKamera("Sesi Online (Bebas Lokasi). Silakan buka kamera."); },
            { enableHighAccuracy: true, timeout: 5000 }
        );
        return;
    }
    navigator.geolocation.getCurrentPosition(async pos => {
        session.lat = pos.coords.latitude; session.lng = pos.coords.longitude;
        const tLat = session.targetLat || TARGET_LAT, tLng = session.targetLng || TARGET_LNG, tRad = session.targetRadius || RADIUS_MAX;
        const c = 2 * Math.asin(Math.sqrt(Math.pow(Math.sin((session.lat - tLat) * Math.PI / 360), 2) + Math.cos(tLat * Math.PI / 180) * Math.cos(session.lat * Math.PI / 180) * Math.pow(Math.sin((session.lng - tLng) * Math.PI / 360), 2)));
        const jarak = Math.floor(6371e3 * c);
        if (jarak > tRad) {
            ubahStatusMsg(`Terlalu jauh (${jarak}m dari titik lokasi pelatihan, maks ${tRad}m).`, "text-red-600");
            return;
        }
        ubahStatusMsg(`GPS valid (${jarak}m). Memeriksa validasi jaringan Wi-Fi ruangan...`, "text-oceanDark");
        try {
            const wRes = await apiPost({ action: "check_wifi_access", pelatihan: session.pelatihan });
            if (wRes && wRes.status === "success" && wRes.allowed) {
                aktifkanTombolKamera(
                    wRes.wifi_enabled
                        ? `Radius (${jarak}m) dan Wi-Fi ruangan valid. Silakan selfie.`
                        : `Radius valid (${jarak}m). Silakan selfie.`
                );
            } else {
                const btnKam = document.getElementById('btnKamera');
                if (btnKam) { btnKam.disabled = true; btnKam.classList.add('opacity-50'); }
                ubahStatusMsg(wRes?.message || "Anda belum terhubung ke jaringan Wi-Fi ruangan pelatihan LPMPP.", "text-red-600");
            }
        } catch (_) {
            ubahStatusMsg("Gagal memeriksa jaringan Wi-Fi ruangan. Pastikan koneksi stabil lalu coba lagi.", "text-red-600");
        }
    }, () => ubahStatusMsg("Gagal akses GPS. Mohon izinkan pemakaian Lokasi pada browser HP/Laptop Anda.", "text-red-600"), { enableHighAccuracy: true });
}

function aktifkanTombolKamera(pesan) {
    ubahStatusMsg(pesan, "text-emerald-700");
    const btn = document.getElementById('btnKamera');
    btn.classList.remove('hidden', 'opacity-50');
    btn.disabled = false;
}

async function bukaAksesMateriIndex(idx, btn) {
    const item = cachedRewardsList[idx];
    if (!item) return;
    const teksAsli = btn.innerText; btn.innerText = "Membuka Akses Drive..."; btn.disabled = true;
    try {
        const res = await apiPost({ action: "grant_drive_access", pelatihan: item.pelatihan, link: item.link });
        if (res.status === "success") {
            const targetHref = safeUrl(res.link || item.link);
            if (targetHref !== '#') window.open(targetHref, '_blank', 'noopener,noreferrer');
            else showToast("Tautan materi tidak valid.", 'error');
        } else {
            showToast(res.message || "Gagal menghubungi sistem Drive.", 'error');
        }
    } catch (e) { showToast("Koneksi gagal saat meminta izin akses.", 'error'); }
    btn.innerText = teksAsli; btn.disabled = false;
}

async function bukaHalamanRewardKu() {
    tampilLayar('myRewardScreen');
    document.getElementById('wadahRewardKu').innerHTML = renderSkeletonList(2);
    document.getElementById('loadingRewardKu').classList.add('hidden');
    try {
        const res = await apiPost({ action: "get_my_rewards" });
        const wadah = document.getElementById('wadahRewardKu');
        cachedRewardsList = (res.status === "success" && Array.isArray(res.data)) ? res.data : [];
        if (cachedRewardsList.length > 0) {
            wadah.innerHTML = cachedRewardsList.map((item, idx) => `
                <div class="bg-slate-50/70 hover:bg-white border border-slate-200 hover:border-sky-300 p-4 rounded-2xl shadow-xs flex flex-col justify-between transition-all">
                    <div class="flex items-center space-x-3 mb-3.5">
                        <div class="w-10 h-10 rounded-xl bg-sky-50 text-oceanDark border border-sky-200 flex items-center justify-center shrink-0">
                            <svg class="w-5 h-5" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
                        </div>
                        <div>
                            <span class="text-xs font-extrabold text-oceanDark uppercase tracking-wider block">Materi Terbuka</span>
                            <h3 class="text-sm font-extrabold text-slate-900 uppercase">${escapeHtml(item.pelatihan)}</h3>
                        </div>
                    </div>
                    <button type="button" onclick="bukaAksesMateriIndex(${idx}, this)" class="w-full min-h-[44px] bg-gradient-to-r from-[#0C4A6E] to-[#0369A1] hover:from-[#0369A1] hover:to-[#0284C7] text-white text-xs font-bold py-3 rounded-xl shadow-xs flex items-center justify-center space-x-2 transition-all">
                        <svg class="w-4 h-4" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                        <span>Buka & Unduh Materi</span>
                    </button>
                </div>`).join('');
        } else {
            wadah.innerHTML = `<div class="bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-8 text-center"><p class="text-slate-600 text-xs font-medium">Belum ada materi yang terbuka. Silakan penuhi target presensi terlebih dahulu.</p></div>`;
        }
    } catch (e) { document.getElementById('wadahRewardKu').innerHTML = `<p class="text-center text-xs font-semibold text-red-600 py-6">Gagal memuat data materi.</p>`; }
}

function bukaFormLupaPresensiIndex(idx) { 
    const item = listRiwayatGlobal[idx]; 
    if (!item) return;
    if ((item.lupa_count || 0) >= 5) {
        return showToast("Batas maksimal permohonan lupa presensi (5 kali) untuk pelatihan ini telah habis.", 'warning');
    }
    bukaFormLupaPresensi(item.pelatihan, item.hari, item.sesi, item.lupa_count || 0); 
}

async function bukaHalamanRiwayatKu() {
    tampilLayar('myAttendanceScreen');
    document.getElementById('wadahRiwayatKu').innerHTML = renderSkeletonList(3);
    document.getElementById('loadingRiwayatKu').classList.add('hidden');

    const { currentMins, todayStr } = getWitaNow();

    try {
        const res = await apiPost({ action: "get_my_attendance_full" });
        const wadah = document.getElementById('wadahRiwayatKu');
        if (res.status === "success" && res.data.length > 0) {
            listRiwayatGlobal = res.data;

            const kuotaPerPelatihan = {};
            res.data.forEach(item => {
                kuotaPerPelatihan[item.pelatihan] = item.lupa_count || 0;
            });

            let html = `
            <div class="bg-sky-50 border border-sky-200 p-4 rounded-2xl mb-3">
                <div class="flex items-center space-x-2 mb-2.5">
                    <svg class="w-4 h-4 text-oceanDeep" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                    <p class="text-xs font-extrabold text-oceanDeep uppercase tracking-wider">Status Kuota Lupa Presensi (Maks. 5x)</p>
                </div>
                <div class="space-y-2">
                    ${Object.keys(kuotaPerPelatihan).map(pel => {
                        const terpakai = kuotaPerPelatihan[pel];
                        const sisa = Math.max(0, 5 - terpakai);
                        const warnaBadge = terpakai >= 5
                            ? 'bg-rose-600 text-white'
                            : (terpakai >= 3 ? 'bg-amber-600 text-white' : 'bg-oceanDark text-white');
                        return `
                        <div class="flex justify-between items-center bg-white px-3.5 py-2.5 rounded-xl border border-sky-200/70 shadow-xs gap-2">
                            <span class="text-xs font-bold text-slate-800 truncate pr-2">${escapeHtml(pel)}</span>
                            <span class="${warnaBadge} text-xs font-extrabold px-2.5 py-0.5 rounded-full shrink-0">${terpakai}/5 (Sisa ${sisa})</span>
                        </div>`;
                    }).join('')}
                </div>
            </div>`;

            res.data.forEach((item, idx) => {
                let statusBadge = "", actionBtn = "", isBelumMulai = false, isSedangBerlangsung = false;
                const usedQuota = item.lupa_count || 0;
                const isQuotaFull = usedQuota >= 5;

                const parsedStart = parseJamMenit(item.jam_mulai);
                let parsedEnd = parseJamMenit(item.jam_selesai);
                if (parsedEnd === 0) parsedEnd = 1440;
                const hasJam = parsedStart !== null && parsedEnd !== null;
                const startMins = parsedStart ?? 0;
                const endMins = parsedEnd ?? 1440;

                if (item.tanggal && item.tanggal !== "-") {
                    if (item.tanggal > todayStr) isBelumMulai = true;
                    else if (item.tanggal === todayStr) {
                        if (!hasJam) isBelumMulai = true;
                        else if (currentMins < startMins) isBelumMulai = true;
                        else if (currentMins <= endMins) isSedangBerlangsung = true;
                    }
                } else {
                    if (!hasJam || currentMins < startMins) isBelumMulai = true;
                    else if (currentMins <= endMins) isSedangBerlangsung = true;
                }

                if (item.status === "Hadir") statusBadge = `<span class="bg-emerald-50 text-emerald-800 text-xs font-extrabold px-2.5 py-1 rounded-full border border-emerald-200 shrink-0">Hadir</span>`;
                else if (item.status === "Pending") statusBadge = `<span class="bg-amber-50 text-amber-800 text-xs font-extrabold px-2.5 py-1 rounded-full border border-amber-200 shrink-0">Diverifikasi (${usedQuota}/5)</span>`;
                else if (item.status === "Ditolak") {
                    statusBadge = `<span class="bg-rose-50 text-rose-700 text-xs font-extrabold px-2.5 py-1 rounded-full border border-rose-200 shrink-0">Ditolak</span>`;
                    const btnUlang = isQuotaFull
                        ? `<p class="text-xs text-rose-700 font-semibold mt-2 text-center">Kuota lupa presensi (5/5) untuk pelatihan ini telah habis.</p>`
                        : `<button type="button" onclick="bukaFormLupaPresensiIndex(${idx})" class="w-full min-h-[44px] mt-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 text-xs font-bold py-2.5 rounded-xl transition-colors">Ajukan Ulang Permohonan</button>`;
                    actionBtn = `<div class="w-full mt-2.5 bg-rose-50 border border-rose-200 p-2.5 rounded-xl text-center"><p class="text-xs font-bold text-rose-800 uppercase">Alasan Penolakan</p><p class="text-xs text-rose-700 mt-0.5">"${escapeHtml(item.alasan)}"</p></div>${btnUlang}`;
                } else {
                    if (isBelumMulai) statusBadge = `<span class="bg-slate-100 text-slate-700 text-xs font-bold px-2.5 py-1 rounded-full shrink-0">Belum Mulai</span>`;
                    else if (isSedangBerlangsung) {
                        statusBadge = `<span class="bg-sky-50 text-oceanDark text-xs font-extrabold px-2.5 py-1 rounded-full border border-sky-200 shrink-0">Berlangsung</span>`;
                        actionBtn = `<p class="text-xs text-oceanDark font-semibold mt-2 text-center">Sesi sedang berlangsung. Silakan presensi di halaman utama.</p>`;
                    } else {
                        statusBadge = `<span class="bg-rose-50 text-rose-700 text-xs font-extrabold px-2.5 py-1 rounded-full border border-rose-200 shrink-0">Belum Hadir</span>`;
                        actionBtn = isQuotaFull
                            ? `<p class="text-xs text-rose-700 font-semibold mt-2.5 bg-rose-50 py-2 px-2.5 rounded-xl text-center">Batas maksimal lupa presensi (5/5) untuk pelatihan ini telah habis.</p>`
                            : `<button type="button" onclick="bukaFormLupaPresensiIndex(${idx})" class="w-full min-h-[44px] mt-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold py-2.5 rounded-xl transition-colors">Ajukan Lupa Presensi</button>`;
                    }
                }
                let jamText = (item.jam_mulai && item.jam_selesai && item.jam_mulai !== "-") ? `${escapeHtml(item.jam_mulai)} - ${escapeHtml(item.jam_selesai)}` : ``;
                html += `
                <div class="bg-slate-50/70 hover:bg-white border border-slate-200 p-4 rounded-2xl shadow-xs flex flex-col transition-all">
                    <div class="flex justify-between items-start gap-2 mb-1.5">
                        <div class="min-w-0">
                            <p class="text-xs font-extrabold text-oceanDark uppercase tracking-wider">${escapeHtml(item.pelatihan)}</p>
                            <h3 class="text-sm font-extrabold text-slate-900 mt-0.5">${escapeHtml(item.hari)} | ${escapeHtml(item.sesi)}</h3>
                        </div>
                        ${statusBadge}
                    </div>
                    <div class="flex flex-wrap items-center gap-3.5 text-xs text-slate-600 font-semibold mt-1">
                        <span class="flex items-center space-x-1">
                            <svg class="w-3.5 h-3.5 text-slate-500" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                            <span>${escapeHtml(item.tanggal || '-')}</span>
                        </span>
                        ${jamText ? `<span class="flex items-center space-x-1"><svg class="w-3.5 h-3.5 text-slate-500" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg><span>${jamText}</span></span>` : ''}
                    </div>
                    ${actionBtn}
                </div>`;
            });
            wadah.innerHTML = html;
        } else wadah.innerHTML = `<div class="bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-8 text-center"><p class="text-slate-600 text-xs font-medium">Anda belum memiliki jadwal pelatihan aktif.</p></div>`;
    } catch (e) { document.getElementById('wadahRiwayatKu').innerHTML = `<p class="text-center text-xs font-semibold text-red-600 py-6">Gagal memuat riwayat presensi.</p>`; }
}

async function bukaHalamanGrupWA() {
    tampilLayar('myGroupScreen');
    document.getElementById('wadahGroupKu').innerHTML = renderSkeletonList(2);
    document.getElementById('loadingGroupKu').classList.add('hidden');
    try {
        const res = await apiPost({ action: "get_my_groups" });
        const wadah = document.getElementById('wadahGroupKu');
        const validGroups = (res.status === "success" && Array.isArray(res.data))
            ? res.data.filter(item => item.link && item.link.trim() !== "" && safeUrl(item.link) !== '#')
            : [];
        if (validGroups.length > 0) {
            wadah.innerHTML = validGroups.map(item => `
                <div class="bg-slate-50/70 hover:bg-white border border-slate-200 p-4 sm:p-5 rounded-2xl shadow-xs flex flex-col transition-all">
                    <h3 class="text-sm font-extrabold text-slate-900 uppercase mb-2.5">${escapeHtml(item.pelatihan)}</h3>
                    <div class="bg-rose-50 border border-rose-200 p-3 rounded-xl mb-3.5">
                        <p class="text-xs text-rose-700 font-bold text-center leading-relaxed">DILARANG MENYEBARKAN LINK GRUP WHATSAPP INI, TERMASUK KE SESAMA PESERTA. PESERTA HANYA DIIZINKAN MASUK KE DALAM GRUP MELALUI SISTEM INI.</p>
                    </div>
                    <a href="${escapeHtml(safeUrl(item.link))}" target="_blank" rel="noopener noreferrer" class="w-full min-h-[46px] bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold py-3 rounded-xl shadow-xs flex items-center justify-center space-x-2 transition-colors">
                        <svg class="w-4 h-4" aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" fill-rule="evenodd" clip-rule="evenodd"><path d="M12.031 2C6.51 2 2.022 6.487 2.022 12.008c0 1.763.461 3.484 1.337 5.002L2 22l5.115-1.341a9.958 9.958 0 0 0 4.916 1.292h.004c5.52 0 10.009-4.487 10.009-10.008C22.044 6.487 17.552 2 12.031 2zm0 18.262h-.004a8.268 8.268 0 0 1-4.215-1.153l-.302-.179-3.133.822.836-3.054-.197-.314a8.248 8.248 0 0 1-1.267-4.376c0-4.565 3.715-8.28 8.284-8.28 2.212 0 4.291.862 5.854 2.427a8.227 8.227 0 0 1 2.423 5.856c0 4.565-3.715 8.251-8.278 8.251zm4.542-6.197c-.249-.125-1.472-.726-1.7-.809-.228-.083-.394-.125-.56.125-.166.249-.643.809-.788.975-.145.166-.29.187-.539.062-.249-.125-1.051-.387-2.002-1.235-.74-.66-1.24-1.475-1.385-1.724-.145-.249-.015-.384.109-.508.112-.111.249-.29.373-.435.125-.145.166-.249.249-.415.083-.166.042-.311-.021-.435-.062-.125-.56-1.348-.767-1.846-.202-.485-.407-.419-.56-.427l-.477-.008c-.166 0-.435.062-.663.311-.228.249-.871.851-.871 2.075s.892 2.407 1.016 2.573c.125.166 1.755 2.68 4.252 3.758.594.256 1.058.41 1.419.524.596.189 1.138.163 1.567.099.478-.071 1.472-.602 1.679-1.183.207-.581.207-1.079.145-1.183-.062-.104-.228-.166-.477-.29z"/></svg>
                        <span>Gabung Grup WhatsApp</span>
                    </a>
                </div>`).join('');
        } else {
            wadah.innerHTML = `<div class="bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-8 text-center"><p class="text-slate-600 text-xs font-medium">Belum ada link grup WhatsApp untuk pelatihan Anda.</p></div>`;
        }
    } catch (e) { document.getElementById('wadahGroupKu').innerHTML = `<p class="text-center text-xs font-semibold text-red-600 py-6">Gagal memuat data grup.</p>`; }
}

function bukaFormLupaPresensi(pel, hari, sesi, usedQuota) {
    document.getElementById('lpPelatihan').innerText = pel;
    document.getElementById('lpHariSesi').innerText = hari + " - " + sesi;
    if (document.getElementById('lpKuotaInfo')) {
        document.getElementById('lpKuotaInfo').innerText = `Kuota Lupa Presensi Terpakai: ${usedQuota || 0}/5 (Maksimal 5x per pelatihan)`;
    }
    if (document.getElementById('lpAlasanInput')) document.getElementById('lpAlasanInput').value = "";
    if (document.getElementById('lpFileInput')) document.getElementById('lpFileInput').value = "";
    if (document.getElementById('lpFileName')) document.getElementById('lpFileName').innerText = "Belum ada file terpilih";
    window.lpData = { pelatihan: pel, hari: hari, sesi: sesi };
    tampilLayar('lupaPresensiFormScreen');
}

async function submitLupaPresensi() {
    const alasanInput = document.getElementById('lpAlasanInput');
    const alasanVal = alasanInput ? alasanInput.value.trim() : "";
    if (!alasanVal) return showToast("Mohon tuliskan alasan mengapa Anda lupa melakukan presensi terlebih dahulu.", 'warning');

    const fileInput = document.getElementById('lpFileInput');
    if (!fileInput.files || !fileInput.files[0]) return showToast("Silakan unggah foto bukti kehadiran terlebih dahulu.", 'warning');

    const btn = document.getElementById('btnSubmitLP');
    if (btn.disabled) return;
    btn.innerText = "Mengompresi & Mengirim...";
    btn.disabled = true;

    try {
        const compressed = await compressImageFile(fileInput.files[0], 1280, 0.75);
        const res = await apiPost({
            action: "submit_lupa_presensi",
            pelatihan: window.lpData.pelatihan,
            hari: window.lpData.hari,
            sesi: window.lpData.sesi,
            alasan_lupa: alasanVal,
            imageBase64: compressed.base64,
            mimeType: compressed.mimeType
        });
        showToast(res.message, res.status === "success" ? 'success' : 'error');
        if (res.status === "success") bukaHalamanRiwayatKu();
    } catch (e) {
        showToast("Gagal mengirim permohonan. Pastikan koneksi internet stabil dan file gambar valid.", 'error');
    }
    btn.innerText = "Kirim Permohonan";
    btn.disabled = false;
}

async function bukaHalamanProfil() {
    tampilLayar('userProfileScreen');
    const btn = document.getElementById('btnSubmitEdit');
    btn.innerText = "Memuat Data...";
    btn.disabled = true;
    try {
        const res = await apiPost({ action: "get_user_profile" });
        if (res.status === "success") {
            const d = res.data;
            const inpNama = document.getElementById('editNama');
            inpNama.value = d.nama || "";
            inpNama.dataset.gelarOverride = '0';
            cekGelarPadaNama('edit', true);
            document.getElementById('editGelarDepan').value = d.gelar_depan || "";
            document.getElementById('editGelarBelakang').value = d.gelar_belakang || "";
            document.getElementById('editUser').value = d.username || "";
            document.getElementById('editPass').value = "";
            document.getElementById('editHP').value = d.hp || "";
            document.getElementById('editNIP').value = d.nip || "";
            document.getElementById('editNIDN').value = d.nidn || "";
            document.getElementById('editNUPTK').value = d.nuptk || "";
            document.getElementById('editTempatLahir').value = d.tempat_lahir || "";
            let tgl = d.tanggal_lahir || "";
            if (tgl && tgl.includes('T')) tgl = tgl.split('T')[0];
            document.getElementById('editTanggalLahir').value = /^\d{4}-\d{2}-\d{2}$/.test(tgl) ? tgl : "";
            document.getElementById('editStatusPegawai').value = d.status_pegawai || "";
            document.getElementById('editJK').value = d.jk || "";
            document.getElementById('editPangkat').value = d.pangkat || "";
            document.getElementById('editJabatan').value = d.jabatan || "";
            document.getElementById('editInstansi').value = d.instansi || "";
            document.getElementById('editNamaInstansi').value = d.nama_instansi || "";

            const fakEl = document.getElementById('editFakultas');
            if (d.fakultas && !Array.from(fakEl.options).some(o => o.value === d.fakultas)) {
                const opt = document.createElement('option');
                opt.value = d.fakultas;
                opt.textContent = d.fakultas;
                fakEl.appendChild(opt);
            }
            fakEl.value = d.fakultas || "";
            updateProdi('edit');
            if (d.fakultas === "Lainnya") {
                document.getElementById('editProdiInput').value = d.prodi || "";
            } else {
                const prodiEl = document.getElementById('editProdiSelect');
                if (d.prodi && !Array.from(prodiEl.options).some(o => o.value === d.prodi)) {
                    const optP = document.createElement('option');
                    optP.value = d.prodi;
                    optP.textContent = d.prodi;
                    prodiEl.appendChild(optP);
                }
                prodiEl.value = d.prodi || "";
            }
            document.getElementById('editPendidikan').value = d.pendidikan || "";
            document.getElementById('editAlamat').value = d.alamat || "";
        } else {
            showToast("Gagal memuat profil: " + (res.message || ""), 'error');
            tampilLayar('presensiScreen');
        }
    } catch (e) {
        showToast("Koneksi gagal.", 'error');
        tampilLayar('presensiScreen');
    }
    btn.innerText = "Simpan Perubahan Biodata";
    btn.disabled = false;
}

async function prosesUpdateProfil() {
    const fakVal = document.getElementById('editFakultas').value;
    const prodiVal = (fakVal === "Lainnya") ? document.getElementById('editProdiInput').value.trim() : document.getElementById('editProdiSelect').value;
    const passBaru = document.getElementById('editPass').value;
    const data = {
        action: "update_user_profile",
        nama: document.getElementById('editNama').value,
        gelar_depan: document.getElementById('editGelarDepan').value,
        gelar_belakang: document.getElementById('editGelarBelakang').value,
        password: passBaru,
        nip: document.getElementById('editNIP').value,
        nidn: document.getElementById('editNIDN').value,
        nuptk: document.getElementById('editNUPTK').value,
        tempat_lahir: document.getElementById('editTempatLahir').value,
        tanggal_lahir: document.getElementById('editTanggalLahir').value,
        status_pegawai: document.getElementById('editStatusPegawai').value,
        jk: document.getElementById('editJK').value,
        pangkat: document.getElementById('editPangkat').value,
        jabatan: document.getElementById('editJabatan').value,
        instansi: document.getElementById('editInstansi').value,
        nama_instansi: document.getElementById('editNamaInstansi').value,
        fakultas: fakVal,
        prodi: prodiVal,
        pendidikan: document.getElementById('editPendidikan').value,
        hp: document.getElementById('editHP').value,
        alamat: document.getElementById('editAlamat').value
    };
    const btn = document.getElementById('btnSubmitEdit');
    if (!data.nama.trim() || !data.nip.trim() || !data.nidn.trim() || !data.nuptk.trim() || !data.status_pegawai || !data.jk || !data.fakultas || !data.prodi) {
        return showToast("Kolom bertanda bintang (*) tidak boleh dikosongkan, termasuk NIP, NIDN/NIDK (isi angka 0 jika tidak memiliki), dan NUPTK.", 'warning');
    }
    if (passBaru) {
        const errPwd = validasiKataSandiKuat(passBaru);
        if (errPwd) return showToast(errPwd, 'warning');
    }
    const editNamaEl = document.getElementById('editNama');
    if (deteksiGelar(data.nama) && editNamaEl.dataset.gelarOverride !== '1') {
        cekGelarPadaNama('edit', true);
        tampilModalPeringatanGelar('edit');
        return;
    }
    btn.innerText = "Memperbarui Biodata...";
    btn.disabled = true;
    try {
        const res = await apiPost(data);
        if (res.status === "success") {
            document.getElementById('editPass').value = "";
            if (res.new_token) {
                session.token = res.new_token;
                if (res.expires_at) session.expiresAt = res.expires_at;
            }
            showToast(res.message || "Biodata berhasil diperbarui.", 'success');
            session.nama = data.nama.trim();
            session.gelar_depan = data.gelar_depan || "";
            session.gelar_belakang = data.gelar_belakang || "";
            simpanSesiLogin();
            tampilLayar('presensiScreen');
            cekJadwalKeamananTinggi();
        } else showToast("Gagal: " + res.message, 'error');
    } catch (e) { showToast("Kesalahan koneksi.", 'error'); }
    btn.innerText = "Simpan Perubahan Biodata";
    btn.disabled = false;
}

function formatInfoBoxHtml(infoStr) {
    if (!infoStr || infoStr === "-") return `<p class="text-xs text-slate-600 italic mb-3">Jadwal & keterangan menyusul</p>`;
    return `<div class="flex flex-wrap gap-1.5 mb-3.5 mt-2">` + infoStr.split("|").map(part => {
        const p = part.trim();
        const safeP = escapeHtml(p);
        if (p.toLowerCase().startsWith("online")) return `<span class="inline-flex items-center space-x-1 text-xs text-oceanDeep bg-sky-50 border border-sky-200 px-2.5 py-1 rounded-lg font-semibold"><svg class="w-3.5 h-3.5 shrink-0" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg><span>${safeP}</span></span>`;
        if (p.toLowerCase().startsWith("offline")) return `<span class="inline-flex items-center space-x-1 text-xs text-oceanDeep bg-sky-100/80 border border-sky-200 px-2.5 py-1 rounded-lg font-semibold"><svg class="w-3.5 h-3.5 shrink-0" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg><span>${safeP}</span></span>`;
        return `<span class="inline-flex items-center space-x-1 text-xs text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg font-semibold"><svg class="w-3.5 h-3.5 shrink-0 text-slate-600" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg><span>${safeP}</span></span>`;
    }).join('') + `</div>`;
}

function pilihKelasRegistrasiIndex(idx, btnEl) {
    const item = listPelatihanPublik[idx]; if (!item) return;
    const inputHidden = document.getElementById('regPelatihan');
    const semuaBox = document.querySelectorAll('.box-reg-pelatihan'), semuaBtn = document.querySelectorAll('.btn-reg-pelatihan');
    semuaBox.forEach(b => { b.classList.remove('border-oceanDark', 'ring-2', 'ring-sky-200'); b.classList.add('border-slate-200'); });
    semuaBtn.forEach(btn => { btn.innerText = "Daftar"; btn.className = "btn-reg-pelatihan w-full min-h-[44px] bg-gradient-to-r from-[#0C4A6E] to-[#0369A1] text-white text-xs font-bold py-2.5 rounded-xl"; });
    if (inputHidden.value === item.nama) { inputHidden.value = ""; }
    else {
        inputHidden.value = item.nama;
        const parentBox = btnEl.closest('.box-reg-pelatihan');
        if (parentBox) { parentBox.classList.remove('border-slate-200'); parentBox.classList.add('border-oceanDark', 'ring-2', 'ring-sky-200'); }
        btnEl.innerText = "Terpilih (Klik untuk Batal)";
        btnEl.className = "btn-reg-pelatihan w-full min-h-[44px] bg-sky-100 border border-oceanDark text-oceanDeep text-xs font-extrabold py-2.5 rounded-xl";
    }
}

async function bukaHalamanRegister() {
    tampilLayar('registerScreen');
    document.getElementById('regPelatihan').value = "";
    const wadah = document.getElementById('wadahBoxRegPelatihan');
    wadah.innerHTML = renderSkeletonList(2);
    try {
        const res = await apiPost({ action: "get_public_pelatihan" }, { skipAuthRedirect: true });
        listPelatihanPublik = (res.status === "success" && Array.isArray(res.data))
            ? urutkanPelatihanBerdasarkanTanggal(res.data)
            : [];
        if (listPelatihanPublik.length > 0) {
            wadah.innerHTML = listPelatihanPublik.map((p, idx) => `<div class="box-reg-pelatihan bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col justify-between"><div><h3 class="text-xs font-extrabold text-oceanDeep uppercase">${escapeHtml(p.nama)}</h3>${formatInfoBoxHtml(p.info)}</div><button type="button" onclick="pilihKelasRegistrasiIndex(${idx}, this)" class="btn-reg-pelatihan w-full min-h-[44px] bg-gradient-to-r from-[#0C4A6E] to-[#0369A1] text-white text-xs font-bold py-2.5 rounded-xl">Daftar</button></div>`).join('');
        } else {
            wadah.innerHTML = '<p class="text-xs text-slate-600 text-center py-2">Tidak ada pelatihan aktif saat ini.</p>';
        }
    } catch (e) { wadah.innerHTML = '<p class="text-xs text-red-600 text-center py-2">Gagal menyinkronkan data server.</p>'; }
}

async function bukaModalTambahKelas() {
    tampilLayar('userEnrollScreen');
    const wadah = document.getElementById('wadahBoxEnrollPelatihan');
    wadah.innerHTML = renderSkeletonList(2);
    try {
        const res = await apiPost({ action: "get_public_pelatihan" });
        listPelatihanPublik = (res.status === "success" && Array.isArray(res.data))
            ? urutkanPelatihanBerdasarkanTanggal(res.data)
            : [];
        if (listPelatihanPublik.length > 0) {
            const terdaftarList = (typeof cachedEnrolledInfo !== 'undefined' && Array.isArray(cachedEnrolledInfo)) ? cachedEnrolledInfo.map(info => info.pelatihan) : [];

            wadah.innerHTML = listPelatihanPublik.map((p, idx) => {
                const sudahIkut = terdaftarList.includes(p.nama);
                const badgeStatus = sudahIkut
                    ? `<span class="text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold px-2.5 py-0.5 rounded-full shrink-0">Terdaftar</span>`
                    : '';
                const tombolAksi = sudahIkut
                    ? `<button type="button" onclick="prosesUnenrollIndex(${idx}, this)" class="w-full min-h-[44px] bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold py-2.5 rounded-xl transition-colors">Batalkan Keikutsertaan</button>`
                    : `<button type="button" onclick="prosesEnrollIndex(${idx}, this)" class="w-full min-h-[44px] bg-gradient-to-r from-[#0C4A6E] to-[#0369A1] hover:from-[#0369A1] hover:to-[#0284C7] text-white text-xs font-bold py-2.5 rounded-xl transition-all">Daftar</button>`;

                return `
                <div class="bg-white border ${sudahIkut ? 'border-emerald-300' : 'border-slate-200'} hover:border-oceanDark rounded-2xl p-4 shadow-xs flex flex-col justify-between transition-all">
                    <div>
                        <div class="flex justify-between items-start gap-2">
                            <h3 class="text-xs font-extrabold text-oceanDeep uppercase">${escapeHtml(p.nama)}</h3>
                            ${badgeStatus}
                        </div>
                        ${formatInfoBoxHtml(p.info)}
                    </div>
                    ${tombolAksi}
                </div>`;
            }).join('');
        } else {
            wadah.innerHTML = '<p class="text-center text-slate-600 text-xs my-6">Tidak ada pelatihan aktif saat ini.</p>';
        }
    } catch (e) {
        wadah.innerHTML = '<p class="text-center text-red-600 text-xs my-6">Gagal menyinkronkan data server.</p>';
    }
}

function prosesEnrollIndex(idx, btnEl) {
    const item = listPelatihanPublik[idx];
    if (item) prosesEnroll(item.nama, btnEl);
}

function prosesUnenrollIndex(idx, btnEl) {
    const item = listPelatihanPublik[idx];
    if (item) prosesUnenroll(item.nama, btnEl);
}

async function prosesUnenroll(pel, btnEl) {
    if (!await appConfirm(`Apakah Anda yakin ingin membatalkan keikutsertaan dari pelatihan "${pel}"?`, { title: 'Batalkan Keikutsertaan', okText: 'Ya, Batalkan', danger: true })) return;
    const teksAsli = btnEl ? btnEl.innerText : "Batalkan Keikutsertaan";
    if (btnEl) { btnEl.innerText = "Memproses..."; btnEl.disabled = true; }
    try {
        const res = await apiPost({ action: "unenroll_training", pelatihan: pel });
        if (res.status === "success") {
            showToast(res.message, 'success');
            await cekJadwalKeamananTinggi();
            bukaModalTambahKelas();
        } else {
            showToast(res.message, 'warning');
        }
    } catch (e) {
        showToast("Kesalahan koneksi internet.", 'error');
    }
    if (btnEl) { btnEl.innerText = teksAsli; btnEl.disabled = false; }
}

async function prosesEnroll(pel, btnEl) {
    if (!pel) return showToast("Silakan pilih kelas pelatihan.", 'warning');
    const teksAsli = btnEl ? btnEl.innerText : "Daftar"; if (btnEl) { btnEl.innerText = "Memproses..."; btnEl.disabled = true; }
    try {
        const res = await apiPost({ action: "enroll_training", pelatihan: pel });
        if (res.status === "success") {
            tampilLayar('suksesDaftarScreen');
            document.getElementById('msgSuksesDaftar').innerText = "Anda berhasil terdaftar di kelas:\n" + pel;
            const waHref = safeUrl(res.wa_link);
            if (res.wa_link && res.wa_link.trim() !== "" && waHref !== '#') {
                document.getElementById('wadahLinkWA').classList.remove('hidden');
                document.getElementById('btnLinkWA').href = waHref;
            } else {
                document.getElementById('wadahLinkWA').classList.add('hidden');
            }
            document.getElementById('btnLanjutSetelahDaftar').onclick = function() { tampilLayar('presensiScreen'); cekJadwalKeamananTinggi(); };
        } else showToast(res.message, 'warning');
    } catch (e) { showToast("Kesalahan koneksi internet.", 'error'); }
    if (btnEl) { btnEl.innerText = teksAsli; btnEl.disabled = false; }
}

async function prosesRegister() {
    const fakVal = document.getElementById('regFakultas').value;
    const prodiVal = (fakVal === "Lainnya") ? document.getElementById('regProdiInput').value.trim() : document.getElementById('regProdiSelect').value;
    const data = {
        action: "register_user",
        nama: document.getElementById('regNama').value,
        gelar_depan: document.getElementById('regGelarDepan').value,
        gelar_belakang: document.getElementById('regGelarBelakang').value,
        username: document.getElementById('regUser').value.trim(),
        password: document.getElementById('regPass').value,
        nip: document.getElementById('regNIP').value,
        nidn: document.getElementById('regNIDN').value,
        nuptk: document.getElementById('regNUPTK').value,
        tempat_lahir: document.getElementById('regTempatLahir').value,
        tanggal_lahir: document.getElementById('regTanggalLahir').value,
        status_pegawai: document.getElementById('regStatusPegawai').value,
        jk: document.getElementById('regJK').value,
        pangkat: document.getElementById('regPangkat').value,
        jabatan: document.getElementById('regJabatan').value,
        instansi: document.getElementById('regInstansi').value,
        nama_instansi: document.getElementById('regNamaInstansi').value,
        fakultas: fakVal,
        prodi: prodiVal,
        pendidikan: document.getElementById('regPendidikan').value,
        hp: document.getElementById('regHP').value,
        alamat: document.getElementById('regAlamat').value,
        pelatihan: document.getElementById('regPelatihan').value
    };
    const btn = document.getElementById('btnSubmitRegister');
    if (!data.nama.trim() || !data.username || !data.password || !data.nip.trim() || !data.nidn.trim() || !data.nuptk.trim() || !data.status_pegawai || !data.jk || !data.fakultas || !data.prodi) {
        return showToast("Mohon lengkapi seluruh kolom yang bertanda bintang (*), termasuk NIP, NIDN/NIDK (isi angka 0 jika tidak memiliki), dan NUPTK.", 'warning');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.username)) {
        return showToast("Mohon masukkan alamat Email Aktif yang valid (contoh: nama@ulm.ac.id).", 'warning');
    }
    const errRegPwd = validasiKataSandiKuat(data.password);
    if (errRegPwd) {
        return showToast(errRegPwd, 'warning');
    }
    const regNamaEl = document.getElementById('regNama');
    if (deteksiGelar(data.nama) && regNamaEl.dataset.gelarOverride !== '1') {
        cekGelarPadaNama('reg', true);
        tampilModalPeringatanGelar('reg');
        return;
    }
    btn.innerText = "Memproses Data...";
    btn.disabled = true;
    try {
        const res = await apiPost(data, { skipAuthRedirect: true });
        if (res.status === "success") {
            document.querySelectorAll('#registerScreen input, #registerScreen select, #registerScreen textarea').forEach(el => el.value = '');
            regNamaEl.dataset.gelarAlertShown = '0';
            regNamaEl.dataset.gelarOverride = '0';
            cekGelarPadaNama('reg', true);
            updateProdi('reg');
            tampilLayar('suksesDaftarScreen');
            document.getElementById('msgSuksesDaftar').innerText = data.pelatihan ? ("Akun & Biodata berhasil disimpan, dan Anda terdaftar di kelas: " + data.pelatihan) : "Akun & Biodata berhasil disimpan. Anda dapat memilih kelas pelatihan melalui menu Daftar Kelas setelah login.";
            const waHref = safeUrl(res.wa_link);
            if (res.wa_link && res.wa_link.trim() !== "" && waHref !== '#') {
                document.getElementById('wadahLinkWA').classList.remove('hidden');
                document.getElementById('btnLinkWA').href = waHref;
            } else {
                document.getElementById('wadahLinkWA').classList.add('hidden');
            }
            document.getElementById('btnLanjutSetelahDaftar').onclick = function() { tampilLayar('loginScreen'); };
        } else showToast("Gagal: " + res.message, 'error');
    } catch (e) { showToast("Kesalahan koneksi.", 'error'); }
    btn.innerText = "Simpan Biodata & Buat Akun";
    btn.disabled = false;
}

function tutupKameraDanKembali() {
    hentikanKameraAktif();
    tampilLayar('presensiScreen');
}

async function bukaKamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showToast("Browser/perangkat tidak mendukung akses kamera atau halaman tidak dibuka melalui HTTPS.", 'warning');
        return;
    }
    const btnJepret = document.getElementById('btnJepret');
    if (btnJepret) { btnJepret.innerText = "Ambil Selfie & Unggah Kehadiran"; btnJepret.disabled = false; }
    tampilLayar('kameraScreen');
    const video = document.getElementById('video');
    try {
        streamKamera = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
        video.srcObject = streamKamera;
    } catch (err) {
        showToast("Gagal mengakses kamera (" + err.message + "). Mohon izinkan penggunaan KAMERA pada pengaturan browser Anda.", 'error');
        tutupKameraDanKembali();
    }
}

async function jepretDanKirim() {
    const video = document.getElementById('video'), canvas = document.getElementById('canvas');
    const btnJepret = document.getElementById('btnJepret');
    if (!video || video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
        return showToast("Kamera masih memuat gambar. Tunggu sebentar hingga wajah Anda terlihat, lalu coba lagi.", 'warning');
    }
    btnJepret.innerText = "Mengunggah...";
    btnJepret.disabled = true;
    const scale = Math.min(1, 480 / video.videoWidth);
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    const b64 = canvas.toDataURL('image/jpeg', 0.6).split(',')[1];
    hentikanKameraAktif();
    document.getElementById('rewardBox').classList.add('hidden');
    try {
        const res = await apiPost({
            action: "presensi",
            pelatihan: session.pelatihan,
            hari: session.hari,
            sesi: session.sesi,
            lat: session.lat,
            lng: session.lng,
            imageBase64: b64
        });
        if (res.status === "success") {
            const rewardHref = safeUrl(res.reward_link);
            if (res.reward_link && rewardHref !== '#') {
                document.getElementById('rewardBox').classList.remove('hidden');
                document.getElementById('btnReward').href = rewardHref;
            }
            tampilLayar('suksesScreen');
        } else {
            showToast(res.message || "Gagal menyimpan presensi.", 'error');
            tampilLayar('presensiScreen');
            cekJadwalKeamananTinggi();
        }
    } catch (e) {
        showToast("Kesalahan jaringan saat mengunggah presensi. Silakan coba lagi.", 'error');
        tampilLayar('presensiScreen');
    }
    btnJepret.innerText = "Ambil Selfie & Unggah Kehadiran";
    btnJepret.disabled = false;
}
