// 08-pengajuan.js — Portal Pengajuan Operator Fakultas dan Verifikasi 3-Tab Admin

// =========================================================================
// FITUR OPERATOR FAKULTAS (PENGAJUAN & PERGANTIAN PESERTA)
// =========================================================================
async function muatPelatihanOperator() {
    const sel = document.getElementById('opPelatihanSelect');
    sel.innerHTML = '<option value="">Memuat daftar pelatihan...</option>';
    try {
        const res = await apiPost({ action: "get_public_pelatihan" });
        if (res.status === "success") {
            const aktif = urutkanPelatihanBerdasarkanTanggal(res.data);
            sel.innerHTML = '<option value="">-- Pilih Pelatihan --</option>' + aktif.map(p => `<option value="${escapeHtml(p.nama)}">${escapeHtml(p.nama)}${p.info ? ' (' + escapeHtml(p.info.split('|')[0].trim()) + ')' : ''}</option>`).join('');
        }
    } catch (e) { sel.innerHTML = '<option value="">Gagal memuat pelatihan</option>'; }
}

async function kirimPengajuanOperator(btn) {
    const pel = document.getElementById('opPelatihanSelect').value;
    const rawNames = document.getElementById('opNamaPesertaArea').value.split('\n').map(s => s.trim()).filter(s => s !== "");
    if (!pel) return showToast("Pilih program pelatihan terlebih dahulu.", 'warning');
    if (rawNames.length === 0) return showToast("Ketik minimal 1 nama calon peserta.", 'warning');

    const teksAsli = btn.innerText; btn.innerText = "Mengirim Pengajuan..."; btn.disabled = true;
    try {
        const res = await apiPost({
            action: "submit_pengajuan_fakultas",
            pelatihan: pel,
            fakultas: session.fakultas,
            nama_list: rawNames
        });
        showToast(res.message, res.status === "success" ? 'success' : 'error');
        if (res.status === "success") {
            document.getElementById('opNamaPesertaArea').value = "";
            muatPengajuanOperator();
        }
    } catch (e) { showToast("Gagal mengirim pengajuan.", 'error'); }
    btn.innerText = teksAsli; btn.disabled = false;
}

async function muatPengajuanOperator() {
    const pel = document.getElementById('opPelatihanSelect').value;
    const wadah = document.getElementById('wadahPengajuanOperator');
    const toolbar = document.getElementById('toolbarBulkOperator');
    if (toolbar) toolbar.classList.add('hidden');
    if (document.getElementById('cekSemuaOp')) document.getElementById('cekSemuaOp').checked = false;

    if (!pel) { cachedPengajuanOperator = []; wadah.innerHTML = '<p class="text-center text-slate-600 text-xs py-6">Pilih pelatihan di atas untuk melihat daftar pengajuan fakultas Anda.</p>'; return; }
    wadah.innerHTML = renderSkeletonList(3);
    try {
        const res = await apiPost({ action: "get_pengajuan_fakultas", pelatihan: pel, fakultas: session.fakultas });
        cachedPengajuanOperator = (res.status === "success" && Array.isArray(res.data)) ? res.data : [];
        if (cachedPengajuanOperator.length > 0) {
            const adaYangBisaBatal = cachedPengajuanOperator.some(item => item.status === "Pending" || item.status === "Rejected");
            if (toolbar && adaYangBisaBatal) toolbar.classList.remove('hidden');

            wadah.innerHTML = cachedPengajuanOperator.map((item, idx) => {
                let badge = "", aksi = "";
                const bisaBatal = (item.status === "Pending" || item.status === "Rejected");
                const checkboxHtml = bisaBatal
                    ? `<input type="checkbox" value="${escapeHtml(item.id)}" class="cek-item-op w-4 h-4 mt-1 rounded text-oceanDark focus:ring-oceanDark shrink-0">`
                    : `<span class="w-4 shrink-0"></span>`;

                if (item.status === "Approved") {
                    badge = '<span class="bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-extrabold px-2.5 py-0.5 rounded-full shrink-0">Approved</span>';
                    aksi = `<button type="button" onclick="ajukanPergantianOperatorIndex(${idx})" class="mt-2 w-full min-h-[40px] bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold py-2 rounded-xl">Ajukan Pergantian Peserta</button>`;
                } else if (item.status === "Pending_Replace") {
                    badge = '<span class="bg-amber-50 text-amber-900 border border-amber-300 text-xs font-extrabold px-2.5 py-0.5 rounded-full shrink-0">Menunggu Pergantian</span>';
                    aksi = `<div class="mt-2 bg-amber-50 border border-amber-200 p-2.5 rounded-xl text-xs text-amber-900"><b>Pengganti:</b> ${escapeHtml(item.nama_pengganti)}<br><b>Alasan:</b> ${escapeHtml(item.alasan_ganti)}</div>`;
                } else if (item.status === "Rejected") {
                    badge = '<span class="bg-rose-50 text-rose-700 border border-rose-200 text-xs font-extrabold px-2.5 py-0.5 rounded-full shrink-0">Rejected</span>';
                    aksi = `${item.catatan ? `<p class="text-xs text-rose-700 mt-1.5"><b>Alasan Admin:</b> ${escapeHtml(item.catatan)}</p>` : ''}<button type="button" onclick="hapusPengajuanOperatorIndex(${idx})" class="mt-2 min-h-[36px] text-xs text-slate-700 hover:text-rose-700 font-bold underline">Hapus dari daftar</button>`;
                } else {
                    badge = '<span class="bg-slate-100 text-slate-700 text-xs font-extrabold px-2.5 py-0.5 rounded-full shrink-0">Menunggu Persetujuan</span>';
                    aksi = `<button type="button" onclick="hapusPengajuanOperatorIndex(${idx})" class="mt-2 min-h-[36px] text-xs text-rose-700 hover:underline font-bold">Batalkan Pengajuan</button>`;
                }
                return `
                <div class="bg-slate-50/70 hover:bg-white border border-slate-200 p-3.5 rounded-2xl transition-all">
                    <div class="flex items-start justify-between gap-2">
                        <label class="flex items-start space-x-2.5 ${bisaBatal ? 'cursor-pointer' : ''}">
                            ${checkboxHtml}
                            <div>
                                <span class="text-xs font-bold text-slate-600">#${idx + 1}</span>
                                <h4 class="text-sm font-extrabold text-slate-900">${escapeHtml(item.nama)}</h4>
                                ${item.catatan && item.status === 'Approved' ? `<p class="text-xs text-emerald-800 mt-0.5">${escapeHtml(item.catatan)}</p>` : ''}
                            </div>
                        </label>
                        ${badge}
                    </div>
                    <div class="pl-6">${aksi}</div>
                </div>`;
            }).join('');
        } else wadah.innerHTML = '<p class="text-center text-slate-600 text-xs py-6">Belum ada pengajuan dari fakultas Anda untuk pelatihan ini.</p>';
    } catch (e) { wadah.innerHTML = '<p class="text-center text-red-600 text-xs py-6">Gagal memuat data.</p>'; }
}

function togglePilihSemuaOperator(masterCb) {
    document.querySelectorAll('.cek-item-op').forEach(cb => { cb.checked = masterCb.checked; });
}

async function prosesBulkBatalOperator(isAll) {
    const checkboxes = isAll
        ? Array.from(document.querySelectorAll('.cek-item-op'))
        : Array.from(document.querySelectorAll('.cek-item-op:checked'));

    if (checkboxes.length === 0) return showToast("Pilih minimal 1 pengajuan yang ingin dibatalkan.", 'warning');
    const ids = checkboxes.map(cb => cb.value);

    const msgKonfirmasi = isAll
        ? `Yakin ingin membatalkan SELURUH (${ids.length}) pengajuan yang masih menunggu / ditolak?`
        : `Yakin ingin membatalkan ${ids.length} pengajuan terpilih?`;
    if (!await appConfirm(msgKonfirmasi, { title: 'Batalkan Pengajuan', okText: 'Ya, Batalkan', danger: true })) return;

    try {
        const res = await apiPost({ action: "delete_pengajuan_fakultas", ids: ids });
        showToast(res.message, res.status === "success" ? 'success' : 'error');
        muatPengajuanOperator();
    } catch (e) { showToast("Gagal membatalkan pengajuan.", 'error'); }
}

function ajukanPergantianOperatorIndex(idx) {
    const item = cachedPengajuanOperator[idx];
    if (item) ajukanPergantianOperator(item.id, item.nama);
}

async function ajukanPergantianOperator(id, namaLama) {
    const namaBaru = await appPrompt(`Masukkan Nama Lengkap (beserta gelar) peserta PENGGANTI untuk menggantikan "${namaLama}":`, '', { title: 'Ajukan Pergantian Peserta', okText: 'Lanjut', inputLabel: 'Nama Lengkap & Gelar Pengganti', placeholder: 'Contoh: Dr. Budi Santoso, M.Pd' });
    if (!namaBaru || namaBaru.trim() === "") return;
    const alasan = await appPrompt("Tuliskan alasan pergantian peserta:", '', { title: 'Alasan Pergantian', okText: 'Kirim Pengajuan', inputLabel: 'Alasan Pergantian', placeholder: 'Contoh: Berhalangan dinas luar' });
    if (alasan === null) return;
    try {
        const res = await apiPost({ action: "request_replace_pengajuan", id, nama_pengganti: namaBaru.trim(), alasan_ganti: alasan.trim() || "-" });
        showToast(res.message, res.status === "success" ? 'success' : 'error');
        muatPengajuanOperator();
    } catch (e) { showToast("Gagal mengajukan pergantian.", 'error'); }
}

function hapusPengajuanOperatorIndex(idx) {
    const item = cachedPengajuanOperator[idx];
    if (item) hapusPengajuanOperator(item.id);
}

async function hapusPengajuanOperator(id) {
    if (!await appConfirm("Yakin ingin membatalkan pengajuan ini?", { title: 'Batalkan Pengajuan', okText: 'Ya, Batalkan', danger: true })) return;
    try {
        const res = await apiPost({ action: "delete_pengajuan_fakultas", id });
        if (res.status === "success") { showToast("Pengajuan berhasil dibatalkan.", 'success'); muatPengajuanOperator(); }
        else showToast(res.message || "Gagal menghapus.", 'error');
    } catch (e) { showToast("Gagal menghapus.", 'error'); }
}

// =========================================================================
// VALIDASI PENGAJUAN FAKULTAS OLEH ADMIN & SUPER ADMIN
// =========================================================================
let cachedPengajuanAdmin = [];
let tabPengajuanAdminAktif = 'pending';
let lastPelPengajuanAdmin = '';

function updateTabPengajuanUI(cntPending, cntApproved, cntRejected) {
    const bPend = document.getElementById('badgeCountPending');
    const bAppr = document.getElementById('badgeCountApproved');
    const bRej = document.getElementById('badgeCountRejected');
    if (bPend) bPend.innerText = String(cntPending);
    if (bAppr) bAppr.innerText = String(cntApproved);
    if (bRej) bRej.innerText = String(cntRejected);

    const tabs = [
        { id: 'tabPengajuanPending', key: 'pending', activeCls: 'bg-white text-oceanDeep shadow-xs font-extrabold' },
        { id: 'tabPengajuanApproved', key: 'approved', activeCls: 'bg-white text-emerald-800 shadow-xs font-extrabold' },
        { id: 'tabPengajuanRejected', key: 'rejected', activeCls: 'bg-white text-rose-700 shadow-xs font-extrabold' }
    ];
    tabs.forEach(t => {
        const el = document.getElementById(t.id);
        if (!el) return;
        const isActive = (tabPengajuanAdminAktif === t.key);
        el.setAttribute('aria-selected', isActive ? 'true' : 'false');
        el.className = `min-h-[44px] flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl text-xs transition-all ${isActive ? t.activeCls : 'font-bold text-slate-700 hover:text-slate-900'}`;
    });
}

function setTabPengajuanAdmin(tab) {
    tabPengajuanAdminAktif = tab;
    renderDaftarPengajuanAdmin();
}

async function bukaHalamanPengajuanAdmin() {
    tampilLayar('adminPengajuanScreen');
    tabPengajuanAdminAktif = 'pending';
    lastPelPengajuanAdmin = '';
    cachedPengajuanAdmin = [];
    updateTabPengajuanUI(0, 0, 0);
    const toolbarBulk = document.getElementById('toolbarBulkPengajuan');
    if (toolbarBulk) toolbarBulk.classList.add('hidden');

    await muatDaftarPelatihanAdmin();
    const selPel = document.getElementById('filterPelPengajuan');
    if (window.pelatihanData && selPel) {
        selPel.innerHTML = '<option value="">-- Pilih Pelatihan --</option>' + window.pelatihanData.map(p => `<option value="${escapeHtml(p.nama)}">${p.status === 'Draft' ? '[DRAFT] ' : ''}${escapeHtml(p.nama)}</option>`).join('');
    }
    const { todayStr } = getWitaNow();
    document.getElementById('docTanggalSurat').value = todayStr;
    document.getElementById('docHariTglPresensi').value = "";
    document.getElementById('docTempatKegiatan').value = "AULA LPMPP BJM";
    document.getElementById('filterFakPengajuan').innerHTML = '<option value="">Semua Fakultas</option>';
    document.getElementById('wadahPengajuanAdmin').innerHTML = '<p class="text-center text-slate-600 text-xs py-6">Pilih pelatihan di atas untuk melihat daftar pengajuan peserta.</p>';
    renderChecklistPanitia();
}

async function muatPengajuanAdmin() {
    const pel = document.getElementById('filterPelPengajuan').value;
    const wadah = document.getElementById('wadahPengajuanAdmin');
    const toolbarBulk = document.getElementById('toolbarBulkPengajuan');
    const isPelChanged = (pel !== lastPelPengajuanAdmin);
    const prevFak = isPelChanged ? '' : document.getElementById('filterFakPengajuan').value;
    lastPelPengajuanAdmin = pel;

    if (!pel) {
        cachedPengajuanAdmin = [];
        updateTabPengajuanUI(0, 0, 0);
        if (toolbarBulk) toolbarBulk.classList.add('hidden');
        document.getElementById('docHariTglPresensi').value = "";
        document.getElementById('docTempatKegiatan').value = "AULA LPMPP BJM";
        document.getElementById('filterFakPengajuan').innerHTML = '<option value="">Semua Fakultas</option>';
        wadah.innerHTML = '<p class="text-center text-slate-600 text-xs py-6">Pilih pelatihan di atas.</p>';
        return;
    }

    if (isPelChanged) {
        tabPengajuanAdminAktif = 'pending';
        document.getElementById('docHariTglPresensi').value = "";
        document.getElementById('docTempatKegiatan').value = "AULA LPMPP BJM";
        if (window.pelatihanData) {
            const found = window.pelatihanData.find(p => p.nama === pel);
            if (found && found.info && found.info !== "-") {
                const parts = found.info.split("|").map(s => s.trim());
                document.getElementById('docHariTglPresensi').value = parts[0] || "";
                const offPart = parts.find(s => s.toLowerCase().startsWith("offline:"));
                const onPart = parts.find(s => s.toLowerCase().startsWith("online:"));
                if (offPart) document.getElementById('docTempatKegiatan').value = offPart.split(":").slice(1).join(":").trim() || "AULA LPMPP BJM";
                else if (onPart) document.getElementById('docTempatKegiatan').value = onPart.split(":").slice(1).join(":").trim() || "AULA LPMPP BJM";
            }
        }
    }

    if (toolbarBulk) toolbarBulk.classList.add('hidden');
    wadah.innerHTML = renderSkeletonList(3);
    try {
        const res = await apiPost({ action: "get_pengajuan_fakultas", pelatihan: pel });
        if (res.status === "success") {
            cachedPengajuanAdmin = res.data || [];
            const faks = [...new Set(cachedPengajuanAdmin.map(x => x.fakultas))].sort();
            const selFak = document.getElementById('filterFakPengajuan');
            selFak.innerHTML = '<option value="">Semua Fakultas</option>' + faks.map(f => `<option value="${escapeHtml(f)}">${escapeHtml(f)}</option>`).join('');
            if (prevFak && faks.includes(prevFak)) selFak.value = prevFak;
            renderDaftarPengajuanAdmin();
        } else {
            wadah.innerHTML = `<p class="text-center text-red-600 text-xs py-6">${escapeHtml(res.message || 'Gagal memuat data pengajuan.')}</p>`;
        }
    } catch (e) { wadah.innerHTML = '<p class="text-center text-red-600 text-xs py-6">Gagal memuat data pengajuan.</p>'; }
}

function renderDaftarPengajuanAdmin() {
    const fFak = document.getElementById('filterFakPengajuan').value;
    const wadah = document.getElementById('wadahPengajuanAdmin');
    const toolbarBulk = document.getElementById('toolbarBulkPengajuan');
    const cekSemua = document.getElementById('cekSemuaPengajuan');
    if (cekSemua) cekSemua.checked = false;

    const filteredByFak = cachedPengajuanAdmin.filter(item => !fFak || item.fakultas === fFak);

    const listPending = filteredByFak
        .filter(item => item.status === "Pending" || item.status === "Pending_Replace")
        .sort((a, b) => (a.status === "Pending_Replace" ? -1 : 1) - (b.status === "Pending_Replace" ? -1 : 1));
    const listApproved = filteredByFak.filter(item => item.status === "Approved");
    const listRejected = filteredByFak.filter(item => item.status === "Rejected");

    updateTabPengajuanUI(listPending.length, listApproved.length, listRejected.length);

    if (toolbarBulk) {
        toolbarBulk.classList.toggle('hidden', tabPengajuanAdminAktif !== 'pending' || listPending.length === 0);
    }

    if (tabPengajuanAdminAktif === 'pending') {
        if (listPending.length === 0) {
            const btnLihatApproved = listApproved.length > 0
                ? `<button type="button" onclick="setTabPengajuanAdmin('approved')" class="mt-2.5 min-h-[40px] inline-flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold px-3.5 py-1.5 rounded-xl transition-colors">Lihat ${listApproved.length} Peserta Sudah Disetujui &rarr;</button>`
                : '';
            wadah.innerHTML = `<div class="bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-6 text-center"><p class="text-slate-600 text-xs font-semibold">${cachedPengajuanAdmin.length > 0 ? 'Tidak ada calon peserta yang menunggu verifikasi.' : 'Belum ada data pengajuan untuk pelatihan ini.'}</p>${btnLihatApproved}</div>`;
            return;
        }

        wadah.innerHTML = listPending.map(item => {
            const origIdx = cachedPengajuanAdmin.indexOf(item);
            const isReplace = (item.status === "Pending_Replace");
            const badge = isReplace
                ? '<span class="bg-amber-100 text-amber-900 border border-amber-300 text-xs font-extrabold px-2.5 py-0.5 rounded-full shrink-0">Permohonan Pergantian</span>'
                : '<span class="bg-sky-50 text-oceanDeep border border-sky-200 text-xs font-extrabold px-2.5 py-0.5 rounded-full shrink-0">Menunggu</span>';
            const infoGanti = isReplace
                ? `<div class="mt-2 ml-6 bg-amber-50 border border-amber-200 p-2.5 rounded-xl text-xs text-amber-900"><b>Diajukan diganti menjadi:</b> ${escapeHtml(item.nama_pengganti)}<br><b>Alasan:</b> "${escapeHtml(item.alasan_ganti)}"</div>`
                : '';

            return `
            <div class="${isReplace ? 'bg-amber-50/40 border-amber-300' : 'bg-slate-50/70 border-slate-200'} hover:bg-white border p-3.5 rounded-2xl transition-all">
                <div class="flex items-start justify-between gap-2">
                    <label class="flex items-start space-x-2.5 cursor-pointer">
                        <input type="checkbox" value="${escapeHtml(item.id)}" class="cek-item-pengajuan w-4 h-4 mt-0.5 rounded text-oceanDark">
                        <div>
                            <span class="text-xs font-extrabold text-oceanDark uppercase">${escapeHtml(item.fakultas)}</span>
                            <h4 class="text-sm font-extrabold text-slate-900">${escapeHtml(item.nama)}</h4>
                            ${item.catatan ? `<p class="text-xs text-slate-600 mt-0.5">${escapeHtml(item.catatan)}</p>` : ''}
                        </div>
                    </label>
                    ${badge}
                </div>
                ${infoGanti}
                <div class="flex gap-2 mt-2.5 pl-6">
                    <button type="button" onclick="prosesSatuPengajuanIndex(${origIdx}, 'Approved', this)" class="min-h-[40px] bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-3.5 py-1.5 rounded-lg">${isReplace ? 'Setujui Pergantian' : 'Approve'}</button>
                    <button type="button" onclick="prosesSatuPengajuanIndex(${origIdx}, 'Rejected', this)" class="min-h-[40px] bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold px-3.5 py-1.5 rounded-lg">${isReplace ? 'Tolak Pergantian' : 'Reject'}</button>
                </div>
            </div>`;
        }).join('');
        return;
    }

    if (tabPengajuanAdminAktif === 'approved') {
        if (listApproved.length === 0) {
            wadah.innerHTML = '<div class="bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-6 text-center"><p class="text-slate-600 text-xs font-medium">Belum ada calon peserta yang disetujui.</p></div>';
            return;
        }

        const headerInfo = `<div class="bg-emerald-50 border border-emerald-200 px-3.5 py-2 rounded-xl flex items-center justify-between text-xs text-emerald-900 font-semibold"><span>Total <b>${listApproved.length}</b> peserta disetujui</span><span class="text-xs text-emerald-800">Siap cetak Surat & Presensi</span></div>`;
        wadah.innerHTML = headerInfo + listApproved.map((item, idx) => `
            <div class="bg-white border border-emerald-200 p-3.5 rounded-2xl transition-all flex items-start justify-between gap-2">
                <div class="flex items-start space-x-2.5 min-w-0">
                    <span class="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-extrabold flex items-center justify-center shrink-0 mt-0.5">${idx + 1}</span>
                    <div class="min-w-0">
                        <span class="text-xs font-extrabold text-oceanDark uppercase block">${escapeHtml(item.fakultas)}</span>
                        <h4 class="text-sm font-extrabold text-slate-900 break-words">${escapeHtml(item.nama)}</h4>
                        ${item.catatan ? `<p class="text-xs text-emerald-800 mt-0.5">${escapeHtml(item.catatan)}</p>` : ''}
                    </div>
                </div>
                <span class="bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-extrabold px-2.5 py-0.5 rounded-full shrink-0">Approved</span>
            </div>`).join('');
        return;
    }

    if (listRejected.length === 0) {
        wadah.innerHTML = '<div class="bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-6 text-center"><p class="text-slate-600 text-xs font-medium">Tidak ada pengajuan yang ditolak.</p></div>';
        return;
    }

    wadah.innerHTML = listRejected.map((item, idx) => `
        <div class="bg-white border border-rose-200 p-3.5 rounded-2xl transition-all flex items-start justify-between gap-2">
            <div class="flex items-start space-x-2.5 min-w-0">
                <span class="w-6 h-6 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-xs font-extrabold flex items-center justify-center shrink-0 mt-0.5">${idx + 1}</span>
                <div class="min-w-0">
                    <span class="text-xs font-extrabold text-oceanDark uppercase block">${escapeHtml(item.fakultas)}</span>
                    <h4 class="text-sm font-extrabold text-slate-900 break-words">${escapeHtml(item.nama)}</h4>
                    ${item.catatan ? `<p class="text-xs text-rose-700 mt-0.5"><b>Alasan:</b> ${escapeHtml(item.catatan)}</p>` : ''}
                </div>
            </div>
            <span class="bg-rose-50 text-rose-700 border border-rose-200 text-xs font-extrabold px-2.5 py-0.5 rounded-full shrink-0">Rejected</span>
        </div>`).join('');
}

function togglePilihSemuaPengajuan(master) {
    document.querySelectorAll('.cek-item-pengajuan').forEach(cb => cb.checked = master.checked);
}

function prosesSatuPengajuanIndex(idx, status, btn) {
    const item = cachedPengajuanAdmin[idx];
    if (item) prosesSatuPengajuan(item.id, status, btn);
}

async function prosesSatuPengajuan(id, status, btn) {
    let catatan = "";
    if (status === "Rejected") {
        catatan = await appPrompt("Tuliskan alasan penolakan (opsional):", '', { title: 'Tolak Pengajuan', okText: 'Tolak', danger: true, inputLabel: 'Alasan Penolakan (Opsional)' });
        if (catatan === null) return;
    }
    const teksAsli = btn ? btn.innerText : "";
    if (btn) { btn.innerText = "..."; btn.disabled = true; }
    try {
        const res = await apiPost({ action: "process_pengajuan_fakultas", id, keputusan: status, catatan });
        if (res.status === "success") {
            showToast(res.message || "Keputusan berhasil disimpan.", 'success');
            muatPengajuanAdmin();
            muatRingkasanAdmin();
        } else showToast(res.message || "Gagal memproses.", 'error');
    } catch (e) { showToast("Gagal memproses.", 'error'); }
    if (btn) { btn.innerText = teksAsli; btn.disabled = false; }
}

async function prosesBulkPengajuan(status) {
    const ids = Array.from(document.querySelectorAll('.cek-item-pengajuan:checked')).map(cb => cb.value);
    if (ids.length === 0) return showToast("Centang minimal 1 pengajuan berstatus Menunggu / Pergantian terlebih dahulu.", 'warning');
    let catatan = "";
    if (status === "Rejected") {
        catatan = await appPrompt(`Tuliskan alasan penolakan untuk ${ids.length} nama terpilih:`, '', { title: 'Tolak Pengajuan Terpilih', okText: 'Tolak Semua Terpilih', danger: true, inputLabel: 'Alasan Penolakan' });
        if (catatan === null) return;
    } else if (!await appConfirm(`Yakin ingin menyetujui ${ids.length} pengajuan terpilih?`, { title: 'Setujui Pengajuan Terpilih', okText: 'Ya, Setujui' })) return;

    try {
        const res = await apiPost({ action: "process_pengajuan_fakultas", ids, keputusan: status, catatan });
        showToast(res.message, res.status === "success" ? 'success' : 'error');
        muatPengajuanAdmin();
        muatRingkasanAdmin();
    } catch (e) { showToast("Gagal memproses.", 'error'); }
}
