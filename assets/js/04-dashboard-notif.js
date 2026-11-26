// 04-dashboard-notif.js — Statistik swipeable dashboard peserta, notifikasi, dan kalender pelatihan

let cachedStatPelatihan = [];
let statAktifIndex = 0;
let statSwipeBound = false;

function pasangSwipeStatistik() {
    if (statSwipeBound) return;
    const kartu = document.getElementById('kartuStatistikPelatihan');
    if (!kartu) return;
    statSwipeBound = true;

    let startX = 0;
    let startY = 0;
    kartu.addEventListener('touchstart', (e) => {
        if (e.touches.length !== 1) return;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
    }, { passive: true });

    kartu.addEventListener('touchend', (e) => {
        if (cachedStatPelatihan.length <= 1 || !e.changedTouches.length) return;
        const dx = e.changedTouches[0].clientX - startX;
        const dy = e.changedTouches[0].clientY - startY;
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
            geserStatistik(dx > 0 ? -1 : 1);
        }
    }, { passive: true });
}

function renderStatistikAktif() {
    const namaEl = document.getElementById('statNamaPelatihan');
    const badgeEl = document.getElementById('statBadgePelatihan');
    const hintEl = document.getElementById('statHintGeser');
    const btnPrev = document.getElementById('btnStatPrev');
    const btnNext = document.getElementById('btnStatNext');
    const dotsEl = document.getElementById('statCarouselDots');
    const totalItem = cachedStatPelatihan.length;
    const c = 94.2;

    const setRings = (persen, hadir, total) => {
        document.getElementById('statPersenText').innerText = `${persen}%`;
        document.getElementById('statHadirText').innerText = String(hadir).padStart(2, '0');
        document.getElementById('statTotalText').innerText = String(total).padStart(2, '0');
        document.getElementById('ringPersen').style.strokeDashoffset = c - (persen / 100) * c;
        document.getElementById('ringHadir').style.strokeDashoffset = total > 0 ? c - (hadir / total) * c : c;
        document.getElementById('ringTotal').style.strokeDashoffset = total > 0 ? 0 : c;
    };

    if (totalItem === 0) {
        if (namaEl) namaEl.innerText = 'Belum Ada Pelatihan';
        if (badgeEl) badgeEl.classList.add('hidden');
        if (hintEl) hintEl.classList.add('hidden');
        if (btnPrev) btnPrev.classList.add('hidden');
        if (btnNext) btnNext.classList.add('hidden');
        if (dotsEl) dotsEl.classList.add('hidden');
        setRings(0, 0, 0);
        return;
    }

    statAktifIndex = Math.max(0, Math.min(totalItem - 1, statAktifIndex));
    const cur = cachedStatPelatihan[statAktifIndex];

    if (namaEl) {
        namaEl.innerText = cur.pelatihan;
        namaEl.title = cur.pelatihan;
    }

    if (badgeEl) {
        badgeEl.classList.remove('hidden');
        if (cur.status === 'aktif') {
            badgeEl.innerText = 'Berlangsung';
            badgeEl.className = 'text-xs font-extrabold px-2.5 py-0.5 rounded-full uppercase shrink-0 bg-emerald-50 text-emerald-800 border border-emerald-200';
        } else if (cur.status === 'mendatang') {
            badgeEl.innerText = 'Akan Datang';
            badgeEl.className = 'text-xs font-extrabold px-2.5 py-0.5 rounded-full uppercase shrink-0 bg-sky-50 text-oceanDeep border border-sky-200';
        } else {
            badgeEl.innerText = 'Selesai';
            badgeEl.className = 'text-xs font-extrabold px-2.5 py-0.5 rounded-full uppercase shrink-0 bg-slate-100 text-slate-700 border border-slate-200';
        }
    }

    setRings(cur.persen, cur.hadir, cur.total);

    const multi = totalItem > 1;
    if (btnPrev) {
        btnPrev.classList.toggle('hidden', !multi);
        btnPrev.disabled = statAktifIndex <= 0;
    }
    if (btnNext) {
        btnNext.classList.toggle('hidden', !multi);
        btnNext.disabled = statAktifIndex >= totalItem - 1;
    }
    if (hintEl) {
        hintEl.classList.toggle('hidden', !multi);
        hintEl.innerText = `Pelatihan ${statAktifIndex + 1} dari ${totalItem} | Geser untuk riwayat lain`;
    }
    if (dotsEl) {
        dotsEl.classList.toggle('hidden', !multi);
        if (multi) {
            dotsEl.innerHTML = cachedStatPelatihan.map((_, i) => `
                <button type="button" onclick="geserStatistikKe(${i})" aria-label="Pilih pelatihan ${i + 1}" class="h-2 rounded-full transition-all ${i === statAktifIndex ? 'w-6 bg-oceanDark' : 'w-2 bg-slate-300 hover:bg-sky-400'}"></button>
            `).join('');
        }
    }
}

function geserStatistik(arah) {
    const target = Math.max(0, Math.min(cachedStatPelatihan.length - 1, statAktifIndex + arah));
    geserStatistikKe(target);
}

function geserStatistikKe(idx) {
    if (cachedStatPelatihan.length === 0) return;
    statAktifIndex = Math.max(0, Math.min(cachedStatPelatihan.length - 1, idx));
    renderStatistikAktif();
}

function updateStatistikDashboard(jadwalList, enrolledInfo, realTodayStr, currentTimeMinutes) {
    cachedJadwalPeserta = jadwalList || [];
    cachedEnrolledInfo = enrolledInfo || [];
    pasangSwipeStatistik();

    const normKey = (s) => String(s || '').trim().toLowerCase();
    const pelatihanSedangAktif = new Set();

    // Deduplikasi daftar pelatihan yang diikuti lalu hitung STRICT per pelatihan
    const seenPel = new Set();
    const uniqueEnrolled = cachedEnrolledInfo.filter(info => {
        const k = normKey(info.pelatihan);
        if (!k || seenPel.has(k)) return false;
        seenPel.add(k);
        return true;
    });

    const statList = uniqueEnrolled.map(info => {
        const keyPel = normKey(info.pelatihan);
        const sesiPel = cachedJadwalPeserta.filter(j =>
            normKey(j.pelatihan) === keyPel && normKey(j.hari) !== 'info'
        );
        const total = sesiPel.length;
        const hadir = sesiPel.filter(j => j.sudah_hadir).length;
        const persen = total > 0 ? Math.round((hadir / total) * 100) : 0;

        let tglMulai = "";
        let tglAkhir = ambilTanggalAkhirPelatihan(info);

        if (info.info_tanggal && info.info_tanggal !== "-") {
            const bagianTgl = info.info_tanggal.split("|")[0].trim();
            const parsedAwal = parseTglIndo(bagianTgl.split(/\s*-\s*/)[0].trim());
            if (parsedAwal) tglMulai = parsedAwal;
        }

        const validDates = sesiPel.map(s => s.tanggal).filter(t => t && t !== "-").sort();
        if (validDates.length > 0) {
            if (!tglMulai || validDates[0] < tglMulai) tglMulai = validDates[0];
            if (!tglAkhir || validDates[validDates.length - 1] > tglAkhir) tglAkhir = validDates[validDates.length - 1];
        }

        let status = 'selesai';
        if (tglMulai && tglAkhir) {
            if (realTodayStr >= tglMulai && realTodayStr <= tglAkhir) status = 'aktif';
            else if (realTodayStr < tglMulai) status = 'mendatang';
        } else if (tglAkhir) {
            status = realTodayStr <= tglAkhir ? 'aktif' : 'selesai';
        } else if (tglMulai) {
            status = realTodayStr >= tglMulai ? 'aktif' : 'mendatang';
        } else if (sesiPel.length > 0) {
            status = 'aktif';
        }

        if (status === 'aktif') pelatihanSedangAktif.add(keyPel);

        return {
            pelatihan: info.pelatihan,
            total,
            hadir,
            persen,
            tglMulai,
            tglAkhir,
            status,
            sortKey: tglMulai || tglAkhir || '9999-12-31'
        };
    }).sort((a, b) => {
        const cmp = a.sortKey.localeCompare(b.sortKey);
        return cmp !== 0 ? cmp : a.pelatihan.localeCompare(b.pelatihan);
    });

    cachedStatPelatihan = statList;

    // Default tampilkan pelatihan yang sedang berlangsung; jika tidak ada, yang akan datang atau terakhir diikuti
    let defaultIdx = -1;
    for (let i = statList.length - 1; i >= 0; i--) {
        if (statList[i].status === 'aktif') { defaultIdx = i; break; }
    }
    if (defaultIdx === -1) defaultIdx = statList.findIndex(s => s.status === 'mendatang');
    if (defaultIdx === -1) defaultIdx = Math.max(0, statList.length - 1);

    statAktifIndex = defaultIdx;
    renderStatistikAktif();

    // 2. STATUS SESI HANYA TAMPIL JIKA PESERTA SEDANG BERADA DALAM PELATIHAN YANG AKTIF
    const wadahStatus = document.getElementById('wadahStatusSesiPelatihan');
    const dotsContainer = document.getElementById('weekStatusDots');
    if (wadahStatus && dotsContainer) {
        const sesiAktifTampil = cachedJadwalPeserta.filter(j => pelatihanSedangAktif.has(normKey(j.pelatihan)));

        if (sesiAktifTampil.length === 0) {
            wadahStatus.classList.add('hidden');
            dotsContainer.innerHTML = '';
        } else {
            wadahStatus.classList.remove('hidden');
            dotsContainer.innerHTML = sesiAktifTampil.map((j, i) => {
                const lbl = `S${i + 1}`;
                const st = statusWaktuSesi(j, realTodayStr, currentTimeMinutes);
                const titleSafe = escapeHtml(`${j.pelatihan} - ${j.hari} (${j.sesi})`);
                const hariSafe = escapeHtml(j.hari);
                if (st === 'hadir') {
                    return `<div class="flex flex-col items-center shrink-0 min-w-[52px]" title="${titleSafe}"><span class="text-xs text-slate-700 font-bold mb-1">${lbl}</span><span class="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-extrabold shadow-xs">&#10003;</span><span class="text-xs text-emerald-700 font-semibold mt-1 truncate max-w-[52px]">${hariSafe}</span></div>`;
                }
                if (st === 'pending') {
                    return `<div class="flex flex-col items-center shrink-0 min-w-[52px]" title="${titleSafe} (Menunggu Verifikasi)"><span class="text-xs text-slate-700 font-bold mb-1">${lbl}</span><span class="w-8 h-8 rounded-full bg-amber-600 text-white flex items-center justify-center text-xs font-extrabold shadow-xs">...</span><span class="text-xs text-amber-800 font-semibold mt-1 truncate max-w-[52px]">${hariSafe}</span></div>`;
                }
                if (st === 'berlangsung') {
                    return `<div class="flex flex-col items-center shrink-0 min-w-[52px]" title="${titleSafe} (Sedang Berlangsung)"><span class="text-xs text-slate-700 font-bold mb-1">${lbl}</span><span class="w-8 h-8 rounded-full bg-oceanDark text-white flex items-center justify-center text-xs font-extrabold shadow-xs">&#9679;</span><span class="text-xs text-oceanDark font-semibold mt-1 truncate max-w-[52px]">${hariSafe}</span></div>`;
                }
                if (st === 'mendatang') {
                    return `<div class="flex flex-col items-center shrink-0 min-w-[52px]" title="${titleSafe} (Akan Datang)"><span class="text-xs text-slate-700 font-bold mb-1">${lbl}</span><span class="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-extrabold shadow-xs">-</span><span class="text-xs text-slate-600 font-semibold mt-1 truncate max-w-[52px]">${hariSafe}</span></div>`;
                }
                return `<div class="flex flex-col items-center shrink-0 min-w-[52px]" title="${titleSafe} (Belum Hadir)"><span class="text-xs text-slate-700 font-bold mb-1">${lbl}</span><span class="w-8 h-8 rounded-full bg-rose-600 text-white flex items-center justify-center text-xs font-extrabold shadow-xs">!</span><span class="text-xs text-rose-700 font-semibold mt-1 truncate max-w-[52px]">${hariSafe}</span></div>`;
            }).join('');
        }
    }

    // 3. SUSUN ISI LONCENG NOTIFIKASI OTOMATIS
    bangunDaftarNotifikasi(realTodayStr, currentTimeMinutes);
}

        function hitungSelisihHari(tglSelesaiStr, todayStr) {
    if (!tglSelesaiStr || !todayStr) return 0;
    const dSelesai = new Date(tglSelesaiStr + "T00:00:00");
    const dToday = new Date(todayStr + "T00:00:00");
    if (isNaN(dSelesai.getTime()) || isNaN(dToday.getTime())) return 0;
    return Math.floor((dToday - dSelesai) / (1000 * 60 * 60 * 24));
}

function ambilTanggalAkhirPelatihan(infoObj) {
    let akhir = infoObj.max_date || "";
    if (infoObj.info_tanggal && infoObj.info_tanggal !== "-") {
        const bagianTgl = infoObj.info_tanggal.split("|")[0].trim();
        if (bagianTgl.includes("-")) {
            const dp = bagianTgl.split(/\s*-\s*/);
            const parsedEnd = parseTglIndo(dp[dp.length - 1]);
            if (parsedEnd && parsedEnd > akhir) akhir = parsedEnd;
        } else {
            const parsedSingle = parseTglIndo(bagianTgl);
            if (parsedSingle && parsedSingle > akhir) akhir = parsedSingle;
        }
    }
    return akhir;
}

function ambilTanggalMulaiPelatihan(p) {
    if (p.info && p.info !== "-") {
        const bagianTgl = p.info.split("|")[0].trim();
        const tglAwalStr = bagianTgl.split(/\s*-\s*/)[0].trim();
        const parsed = parseTglIndo(tglAwalStr);
        if (parsed) return parsed;
    }
    if (p.sesi_list && p.sesi_list.length > 0) {
        const validDates = p.sesi_list.map(s => s.tanggal).filter(t => t && t !== "-").sort();
        if (validDates.length > 0) return validDates[0];
    }
    return "9999-12-31";
}

function ambilTanggalSelesaiPublik(p) {
    let akhir = "";
    if (p.info && p.info !== "-") {
        const bagianTgl = p.info.split("|")[0].trim();
        if (bagianTgl.includes("-")) {
            const dp = bagianTgl.split(/\s*-\s*/);
            const parsedEnd = parseTglIndo(dp[dp.length - 1]);
            if (parsedEnd) akhir = parsedEnd;
        } else {
            const parsedSingle = parseTglIndo(bagianTgl);
            if (parsedSingle) akhir = parsedSingle;
        }
    }
    if (p.sesi_list && p.sesi_list.length > 0) {
        p.sesi_list.forEach(s => {
            if (s.tanggal && s.tanggal !== "-" && s.tanggal > akhir) akhir = s.tanggal;
        });
    }
    return akhir;
}

function urutkanPelatihanBerdasarkanTanggal(list) {
    if (!list || !Array.isArray(list)) return [];
    const { todayStr } = getWitaNow();

    // Otomatis sembunyikan pelatihan yang tanggal selesainya sudah lewat dari hari ini
    return list.filter(p => {
        const tglSelesai = ambilTanggalSelesaiPublik(p);
        if (tglSelesai && tglSelesai < todayStr) return false;
        return true;
    }).sort((a, b) => {
        const tglA = ambilTanggalMulaiPelatihan(a);
        const tglB = ambilTanggalMulaiPelatihan(b);
        return tglA.localeCompare(tglB);
    });
}

let cachedNotifikasiList = [];
let notifFilterMode = 'all';
let notifShowPrevious = false;

function getNotifReadKey() {
    return `siplpmpp_notif_read_${(session.username || '').toLowerCase().trim()}`;
}

function ambilNotifTerbacaSet() {
    try {
        const raw = localStorage.getItem(getNotifReadKey());
        return new Set(raw ? JSON.parse(raw) : []);
    } catch (_) {
        return new Set();
    }
}

function simpanNotifTerbacaSet(setObj) {
    try {
        localStorage.setItem(getNotifReadKey(), JSON.stringify([...setObj]));
    } catch (_) {}
}

function formatWaktuRelatifNotif(tglStr, todayStr) {
    if (!tglStr || tglStr === "-") return "Baru saja";
    const selisih = hitungSelisihHari(tglStr, todayStr);
    if (selisih <= 0) return "Hari ini";
    if (selisih === 1) return "Kemarin";
    if (selisih < 7) return `${selisih} hari lalu`;
    return formatTglIndo(tglStr);
}

function bangunDaftarNotifikasi(realTodayStr, currentTimeMinutes) {
    const list = [];

    cachedJadwalPeserta.forEach(j => {
        if (!j.sudah_hadir && !j.lupa_pending && j.tanggal && j.tanggal !== "-") {
            let isLewat = false;
            if (j.tanggal < realTodayStr) isLewat = true;
            else if (j.tanggal === realTodayStr && j.jam_selesai && j.jam_selesai !== "-") {
                let endMins = parseJamMenit(j.jam_selesai);
                if (endMins === 0) endMins = 1440;
                if (endMins !== null && currentTimeMinutes > endMins) isLewat = true;
            }
            if (isLewat) {
                const selisihSesi = hitungSelisihHari(j.tanggal, realTodayStr);
                list.push({
                    id: `missed|${j.pelatihan}|${j.hari}|${j.sesi}|${j.tanggal}`,
                    type: 'missed',
                    pelatihan: j.pelatihan,
                    textHtml: `<b>${escapeHtml(j.pelatihan)}</b>: Anda belum melakukan presensi pada <b>${escapeHtml(j.hari)} • ${escapeHtml(j.sesi)}</b>. Ajukan lupa presensi jika hadir.`,
                    timeLabel: formatWaktuRelatifNotif(j.tanggal, realTodayStr),
                    sortDate: j.tanggal,
                    isEarlier: selisihSesi > 7
                });
            }
        }
    });

    cachedEnrolledInfo.forEach(info => {
        const tglAkhirPel = ambilTanggalAkhirPelatihan(info);
        const selisihPel = tglAkhirPel ? hitungSelisihHari(tglAkhirPel, realTodayStr) : 0;
        const isOld = tglAkhirPel !== "" && selisihPel > 7;
        const refDate = tglAkhirPel || realTodayStr;

        if (info.ada_materi) {
            list.push({
                id: `materi|${info.pelatihan}`,
                type: 'materi',
                pelatihan: info.pelatihan,
                textHtml: `<b>${escapeHtml(info.pelatihan)}</b>: Materi pelatihan telah tersedia (minimal ${escapeHtml(info.min_absen)}x presensi untuk membuka akses).`,
                timeLabel: formatWaktuRelatifNotif(refDate, realTodayStr),
                sortDate: refDate,
                isEarlier: isOld
            });
        }

        if (info.wa_link && info.wa_link.trim() !== "") {
            list.push({
                id: `wa|${info.pelatihan}`,
                type: 'wa',
                pelatihan: info.pelatihan,
                textHtml: `<b>${escapeHtml(info.pelatihan)}</b>: Anda terdaftar di pelatihan ini. Segera bergabung ke Grup WhatsApp resmi pelatihan.`,
                timeLabel: formatWaktuRelatifNotif(refDate, realTodayStr),
                sortDate: refDate,
                isEarlier: isOld
            });
        }
    });

    // Urutkan terbaru di atas
    list.sort((a, b) => (b.sortDate || "").localeCompare(a.sortDate || ""));
    cachedNotifikasiList = list;
    updateBadgeNotif();
    renderNotifikasiDropdown();
}

function updateBadgeNotif() {
    const badge = document.getElementById('notifBadgeDot');
    if (!badge) return;
    const readSet = ambilNotifTerbacaSet();
    const unreadCount = cachedNotifikasiList.filter(n => !n.isEarlier && !readSet.has(n.id)).length;
    if (unreadCount > 0) {
        badge.innerText = unreadCount > 9 ? '9+' : String(unreadCount);
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }
}

function buatItemHtmlNotif(item, isUnread) {
    let avatarBg = 'bg-sky-100 text-oceanDark';
    let badgeBg = 'bg-oceanDark';
    let mainIcon = '<svg class="w-5 h-5" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"></path></svg>';
    let miniIcon = '<svg class="w-3 h-3 text-white" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m6-6H6"></path></svg>';

    if (item.type === 'missed') {
        avatarBg = 'bg-rose-100 text-rose-700';
        badgeBg = 'bg-rose-600';
        mainIcon = '<svg class="w-5 h-5" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"></path></svg>';
        miniIcon = '<span class="text-xs font-black text-white leading-none">!</span>';
    } else if (item.type === 'wa') {
        avatarBg = 'bg-emerald-100 text-emerald-700';
        badgeBg = 'bg-emerald-700';
        mainIcon = '<svg class="w-5 h-5" aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" fill-rule="evenodd" clip-rule="evenodd"><path d="M12.031 2C6.51 2 2.022 6.487 2.022 12.008c0 1.763.461 3.484 1.337 5.002L2 22l5.115-1.341a9.958 9.958 0 0 0 4.916 1.292h.004c5.52 0 10.009-4.487 10.009-10.008C22.044 6.487 17.552 2 12.031 2zm0 18.262h-.004a8.268 8.268 0 0 1-4.215-1.153l-.302-.179-3.133.822.836-3.054-.197-.314a8.248 8.248 0 0 1-1.267-4.376c0-4.565 3.715-8.28 8.284-8.28 2.212 0 4.291.862 5.854 2.427a8.227 8.227 0 0 1 2.423 5.856c0 4.565-3.715 8.251-8.278 8.251zm4.542-6.197c-.249-.125-1.472-.726-1.7-.809-.228-.083-.394-.125-.56.125-.166.249-.643.809-.788.975-.145.166-.29.187-.539.062-.249-.125-1.051-.387-2.002-1.235-.74-.66-1.24-1.475-1.385-1.724-.145-.249-.015-.384.109-.508.112-.111.249-.29.373-.435.125-.145.166-.249.249-.415.083-.166.042-.311-.021-.435-.062-.125-.56-1.348-.767-1.846-.202-.485-.407-.419-.56-.427l-.477-.008c-.166 0-.435.062-.663.311-.228.249-.871.851-.871 2.075s.892 2.407 1.016 2.573c.125.166 1.755 2.68 4.252 3.758.594.256 1.058.41 1.419.524.596.189 1.138.163 1.567.099.478-.071 1.472-.602 1.679-1.183.207-.581.207-1.079.145-1.183-.062-.104-.228-.166-.477-.29z"/></svg>';
        miniIcon = '<svg class="w-2.5 h-2.5 text-white" aria-hidden="true" fill="currentColor" viewBox="0 0 20 20"><path d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7z"></path></svg>';
    }

    const notifIdx = cachedNotifikasiList.indexOf(item);
    return `
    <button type="button" onclick="klikItemNotifikasiIndex(${notifIdx})" class="w-full min-h-[44px] flex items-center gap-3 p-2.5 rounded-xl text-left transition-colors ${isUnread ? 'bg-sky-50/70 hover:bg-sky-100/70' : 'hover:bg-slate-100'}">
        <div class="relative shrink-0">
            <div class="w-11 h-11 rounded-full ${avatarBg} flex items-center justify-center">${mainIcon}</div>
            <span class="w-5 h-5 rounded-full ${badgeBg} border-2 border-white flex items-center justify-center absolute -bottom-0.5 -right-0.5 shadow-xs">${miniIcon}</span>
        </div>
        <div class="flex-1 min-w-0">
            <p class="text-xs leading-snug ${isUnread ? 'text-slate-900' : 'text-slate-700'}">${item.textHtml}</p>
            <span class="text-xs font-semibold mt-0.5 block ${isUnread ? 'text-oceanDark' : 'text-slate-600'}">${escapeHtml(item.timeLabel)}</span>
        </div>
        ${isUnread ? '<span class="w-2.5 h-2.5 rounded-full bg-oceanDark shrink-0"></span>' : ''}
    </button>`;
}

function renderNotifikasiDropdown() {
    const body = document.getElementById('notifDropdownBody');
    const btnPrev = document.getElementById('btnLihatNotifSebelumnya');
    const btnAll = document.getElementById('btnFilterNotifAll');
    const btnUnread = document.getElementById('btnFilterNotifUnread');
    if (!body) return;

    if (btnAll && btnUnread) {
        btnAll.className = notifFilterMode === 'all'
            ? 'min-h-[36px] px-3.5 py-1.5 rounded-full text-xs font-bold bg-sky-100 text-oceanDeep transition-colors'
            : 'min-h-[36px] px-3.5 py-1.5 rounded-full text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors';
        btnUnread.className = notifFilterMode === 'unread'
            ? 'min-h-[36px] px-3.5 py-1.5 rounded-full text-xs font-bold bg-sky-100 text-oceanDeep transition-colors'
            : 'min-h-[36px] px-3.5 py-1.5 rounded-full text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors';
    }

    const readSet = ambilNotifTerbacaSet();
    const filtered = cachedNotifikasiList.filter(item => notifFilterMode === 'all' || !readSet.has(item.id));
    const baruItems = filtered.filter(item => !item.isEarlier);
    const lamaItems = filtered.filter(item => item.isEarlier);

    const LIMIT_AWAL = 4;
    let html = '';

    if (filtered.length === 0) {
        html = `<div class="py-10 px-4 text-center"><p class="text-xs font-semibold text-slate-600">${notifFilterMode === 'unread' ? 'Semua notifikasi sudah dibaca.' : 'Belum ada notifikasi untuk Anda.'}</p></div>`;
    } else {
        const tampilBaru = notifShowPrevious ? baruItems : baruItems.slice(0, LIMIT_AWAL);

        if (tampilBaru.length > 0) {
            html += `<div class="flex items-center justify-between px-2 pt-1 pb-0.5"><span class="text-xs font-extrabold text-slate-900">Baru</span><button type="button" onclick="bukaLamanSemuaNotifikasi()" class="text-xs font-semibold text-oceanDark hover:underline">Lihat semua</button></div>`;
            html += tampilBaru.map(item => buatItemHtmlNotif(item, !readSet.has(item.id))).join('');
        } else if (!notifShowPrevious && lamaItems.length > 0) {
            html += `<div class="flex items-center justify-between px-2 pt-1 pb-0.5"><span class="text-xs font-extrabold text-slate-900">Baru</span><button type="button" onclick="bukaLamanSemuaNotifikasi()" class="text-xs font-semibold text-oceanDark hover:underline">Lihat semua</button></div>`;
            html += `<div class="py-4 px-3 text-center"><p class="text-xs text-slate-600">Tidak ada notifikasi baru dalam 7 hari terakhir.</p></div>`;
        }

        if (notifShowPrevious && lamaItems.length > 0) {
            html += `<div class="px-2 pt-2.5 pb-0.5"><span class="text-xs font-extrabold text-slate-900">Sebelumnya</span></div>`;
            html += lamaItems.map(item => buatItemHtmlNotif(item, !readSet.has(item.id))).join('');
        }
    }

    body.innerHTML = html;

    if (btnPrev) {
        const jumlahTersembunyi = Math.max(0, baruItems.length - LIMIT_AWAL) + lamaItems.length;
        if (notifShowPrevious) {
            btnPrev.innerText = jumlahTersembunyi > 0 ? 'Tampilkan lebih sedikit' : 'Semua notifikasi telah ditampilkan';
        } else {
            btnPrev.innerText = jumlahTersembunyi > 0
                ? `Lihat notifikasi sebelumnya (${jumlahTersembunyi})`
                : 'Lihat notifikasi sebelumnya';
        }
    }

    renderLamanSemuaNotifikasi();
}

function renderLamanSemuaNotifikasi() {
    const wadah = document.getElementById('wadahNotifikasi');
    const btnAll = document.getElementById('btnPageNotifAll');
    const btnUnread = document.getElementById('btnPageNotifUnread');
    if (!wadah) return;

    if (btnAll && btnUnread) {
        btnAll.className = notifFilterMode === 'all'
            ? 'min-h-[36px] px-3.5 py-1.5 rounded-full text-xs font-bold bg-sky-100 text-oceanDeep transition-colors'
            : 'min-h-[36px] px-3.5 py-1.5 rounded-full text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors';
        btnUnread.className = notifFilterMode === 'unread'
            ? 'min-h-[36px] px-3.5 py-1.5 rounded-full text-xs font-bold bg-sky-100 text-oceanDeep transition-colors'
            : 'min-h-[36px] px-3.5 py-1.5 rounded-full text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors';
    }

    const readSet = ambilNotifTerbacaSet();
    const filtered = cachedNotifikasiList.filter(item => notifFilterMode === 'all' || !readSet.has(item.id));
    const baruItems = filtered.filter(item => !item.isEarlier);
    const lamaItems = filtered.filter(item => item.isEarlier);

    if (filtered.length === 0) {
        wadah.innerHTML = `<div class="py-10 px-4 text-center"><p class="text-xs font-semibold text-slate-600">${notifFilterMode === 'unread' ? 'Semua notifikasi sudah dibaca.' : 'Belum ada notifikasi untuk Anda.'}</p></div>`;
        return;
    }

    let html = '';
    if (baruItems.length > 0) {
        html += `<div class="px-2 pt-1 pb-0.5"><span class="text-xs font-extrabold text-slate-900">Baru</span></div>`;
        html += baruItems.map(item => buatItemHtmlNotif(item, !readSet.has(item.id))).join('');
    }
    if (lamaItems.length > 0) {
        html += `<div class="px-2 pt-3 pb-0.5"><span class="text-xs font-extrabold text-slate-900">Sebelumnya</span></div>`;
        html += lamaItems.map(item => buatItemHtmlNotif(item, !readSet.has(item.id))).join('');
    }
    wadah.innerHTML = html;
}

function bukaLamanSemuaNotifikasi() {
    tutupNotifikasiDropdown();
    tampilLayar('notifikasiScreen');
    renderLamanSemuaNotifikasi();
}

function setFilterNotif(mode) {
    notifFilterMode = mode;
    renderNotifikasiDropdown();
}

function toggleNotifikasiSebelumnya() {
    notifShowPrevious = !notifShowPrevious;
    renderNotifikasiDropdown();
}

function tandaiSemuaNotifDibaca() {
    const readSet = ambilNotifTerbacaSet();
    cachedNotifikasiList.forEach(item => readSet.add(item.id));
    simpanNotifTerbacaSet(readSet);
    updateBadgeNotif();
    renderNotifikasiDropdown();
}

function klikItemNotifikasiIndex(idx) {
    const item = cachedNotifikasiList[idx];
    if (!item) return;
    klikItemNotifikasi(item.id, item.type);
}

function klikItemNotifikasi(id, type) {
    const readSet = ambilNotifTerbacaSet();
    readSet.add(id);
    simpanNotifTerbacaSet(readSet);
    updateBadgeNotif();
    tutupNotifikasiDropdown();

    if (type === 'missed') bukaHalamanRiwayatKu();
    else if (type === 'materi') bukaHalamanRewardKu();
    else if (type === 'wa') bukaHalamanGrupWA();
}

function toggleNotifikasiDropdown(e) {
    if (e) e.stopPropagation();
    const dd = document.getElementById('notifDropdown');
    const bell = document.getElementById('btnNotifBell');
    if (!dd) return;
    const akanBuka = dd.classList.contains('hidden');
    dd.classList.toggle('hidden', !akanBuka);
    if (bell) {
        bell.classList.toggle('bg-white', akanBuka);
        bell.classList.toggle('bg-white/15', !akanBuka);
        const svg = bell.querySelector('svg');
        if (svg) {
            svg.classList.toggle('text-oceanBlue', akanBuka);
            svg.classList.toggle('text-white', !akanBuka);
        }
    }
    if (akanBuka) {
        notifShowPrevious = false;
        renderNotifikasiDropdown();
    }
}

function tutupNotifikasiDropdown() {
    const dd = document.getElementById('notifDropdown');
    const bell = document.getElementById('btnNotifBell');
    if (dd) dd.classList.add('hidden');
    if (bell) {
        bell.classList.remove('bg-white');
        bell.classList.add('bg-white/15');
        const svg = bell.querySelector('svg');
        if (svg) {
            svg.classList.remove('text-oceanBlue');
            svg.classList.add('text-white');
        }
    }
}

function bukaHalamanNotifikasi(e) { toggleNotifikasiDropdown(e); }

document.addEventListener('click', (e) => {
    const dd = document.getElementById('notifDropdown');
    const bell = document.getElementById('btnNotifBell');
    if (!dd || dd.classList.contains('hidden')) return;
    if (!dd.contains(e.target) && (!bell || !bell.contains(e.target))) {
        tutupNotifikasiDropdown();
    }
});

function bukaHalamanKalender() {
    const wita = getWitaNow();
    calMonth = wita.month;
    calYear = wita.year;
    tampilLayar('kalenderScreen');
    renderKalenderPeserta();
}

function gantiBulanKalender(arah) {
    calMonth += arah;
    if (calMonth < 0) { calMonth = 11; calYear--; } else if (calMonth > 11) { calMonth = 0; calYear++; }
    renderKalenderPeserta();
}

function renderKalenderPeserta() {
    document.getElementById('judulBulanKalender').innerText = `${namaBulanLengkap[calMonth]} ${calYear}`;
    const grid = document.getElementById('gridTanggalKalender');
    const firstDay = new Date(calYear, calMonth, 1).getDay();
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const { todayStr, currentMins } = getWitaNow();

    const mapTanggal = {};
    cachedJadwalPeserta.forEach(j => {
        if (j.tanggal && j.tanggal !== "-") {
            if (!mapTanggal[j.tanggal]) mapTanggal[j.tanggal] = [];
            mapTanggal[j.tanggal].push(j);
        }
    });

    let html = "";
    for (let i = 0; i < firstDay; i++) html += `<div class="h-9"></div>`;

    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const sesiHariIni = mapTanggal[dateStr];

        if (sesiHariIni && sesiHariIni.length > 0) {
            const semuaHadir = sesiHariIni.every(s => s.sudah_hadir);
            const adaTerlewat = sesiHariIni.some(s => statusWaktuSesi(s, todayStr, currentMins) === 'terlewat');
            if (semuaHadir) {
                html += `<button type="button" onclick="lihatDetailTanggalKalender('${dateStr}')" class="h-10 w-10 mx-auto rounded-full bg-emerald-600 text-white font-extrabold text-xs flex items-center justify-center shadow-xs hover:scale-105 transition-transform">${d}</button>`;
            } else if (adaTerlewat) {
                html += `<button type="button" onclick="lihatDetailTanggalKalender('${dateStr}')" class="relative h-10 w-10 mx-auto rounded-full bg-rose-600 text-white font-extrabold text-xs flex items-center justify-center shadow-xs hover:scale-105 transition-transform">${d}<span class="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-400 text-slate-900 text-xs font-black flex items-center justify-center border border-white">!</span></button>`;
            } else {
                html += `<button type="button" onclick="lihatDetailTanggalKalender('${dateStr}')" class="h-10 w-10 mx-auto rounded-full bg-oceanDark text-white font-extrabold text-xs flex items-center justify-center shadow-xs hover:scale-105 transition-transform">${d}</button>`;
            }
        } else {
            html += `<div class="h-10 w-10 mx-auto rounded-full flex items-center justify-center text-xs font-medium text-slate-700">${d}</div>`;
        }
    }
    grid.innerHTML = html;
}

function lihatDetailTanggalKalender(dateStr) {
    const wadah = document.getElementById('detailTanggalKalender');
    const list = cachedJadwalPeserta.filter(j => j.tanggal === dateStr);
    if (list.length === 0) {
        wadah.innerHTML = `<p class="text-center text-xs text-slate-600">Tidak ada sesi pada tanggal ini.</p>`;
        return;
    }
    const { todayStr, currentMins } = getWitaNow();
    wadah.innerHTML = list.map(j => {
        const st = statusWaktuSesi(j, todayStr, currentMins);
        let borderCls = 'border-rose-200', badgeCls = 'bg-rose-600 text-white', badgeTxt = 'Belum Presensi';
        if (st === 'hadir') { borderCls = 'border-emerald-200'; badgeCls = 'bg-emerald-700 text-white'; badgeTxt = 'Sudah Presensi'; }
        else if (st === 'pending') { borderCls = 'border-amber-200'; badgeCls = 'bg-amber-600 text-white'; badgeTxt = 'Diverifikasi'; }
        else if (st === 'berlangsung') { borderCls = 'border-sky-300'; badgeCls = 'bg-oceanDark text-white'; badgeTxt = 'Berlangsung'; }
        else if (st === 'mendatang') { borderCls = 'border-sky-200'; badgeCls = 'bg-sky-100 text-oceanDeep'; badgeTxt = 'Akan Datang'; }
        return `
        <div class="bg-slate-50 border ${borderCls} p-3 rounded-xl flex justify-between items-center gap-2">
            <div class="min-w-0">
                <p class="text-xs font-bold text-oceanDark uppercase truncate">${escapeHtml(j.pelatihan)}</p>
                <h4 class="text-xs font-bold text-slate-900">${escapeHtml(j.hari)} | ${escapeHtml(j.sesi)}</h4>
                <p class="text-xs text-slate-600">Waktu: ${escapeHtml(j.jam_mulai || '-')} - ${escapeHtml(j.jam_selesai || '-')} (${escapeHtml(j.mode || 'Offline')})</p>
            </div>
            <span class="${badgeCls} text-xs font-bold px-2.5 py-1 rounded-full shrink-0">${badgeTxt}</span>
        </div>`;
    }).join('');
}
