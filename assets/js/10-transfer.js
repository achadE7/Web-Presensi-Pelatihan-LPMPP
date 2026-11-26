// 10-transfer.js — Transfer Presensi peserta antar pelatihan (khusus Super Admin)

// =========================================================================
// TRANSFER PRESENSI PESERTA ANTAR PELATIHAN (KHUSUS SUPER ADMIN)
// =========================================================================
let cachedTransferData = { attended_asal: [], sessions_tujuan: [], existing_tujuan: [] };

async function bukaHalamanTransferPresensi() {
    if (session.role !== "super_admin") return showToast("Akses ditolak! Menu ini khusus Super Admin.", 'error');
    tampilLayar('adminTransferPresensiScreen');
    document.getElementById('tfOpsiPanel').classList.add('hidden');
    document.getElementById('tfEmailManual').value = "";
    document.getElementById('tfPesertaSelect').innerHTML = '<option value="">-- Pilih Pelatihan Asal dulu --</option>';

    await muatDaftarPelatihanAdmin();
    if (window.pelatihanData) {
        const opts = window.pelatihanData.map(p => `<option value="${escapeHtml(p.nama)}">${p.status === 'Draft' ? '[DRAFT] ' : ''}${escapeHtml(p.nama)}</option>`).join('');
        document.getElementById('tfPelAsal').innerHTML = '<option value="">-- Pilih Pelatihan Asal --</option>' + opts;
        document.getElementById('tfPelTujuan').innerHTML = '<option value="">-- Pilih Pelatihan Tujuan --</option>' + opts;
    }
}

async function muatPesertaTransferAsal() {
    const pelAsal = document.getElementById('tfPelAsal').value;
    const selPeserta = document.getElementById('tfPesertaSelect');
    document.getElementById('tfOpsiPanel').classList.add('hidden');
    if (!pelAsal) {
        selPeserta.innerHTML = '<option value="">-- Pilih Pelatihan Asal dulu --</option>';
        return;
    }
    selPeserta.innerHTML = '<option value="">Memuat daftar peserta...</option>';
    try {
        const res = await apiPost({ action: "get_peserta", pelatihan: pelAsal });
        const detailMap = {};
        (res.details || []).forEach(d => { detailMap[d.email] = d.nama; });
        if (res.emails && res.emails.length > 0) {
            selPeserta.innerHTML = '<option value="">-- Pilih Peserta --</option>' + res.emails.map(em => {
                const nm = detailMap[em] ? `${detailMap[em]} (${em})` : em;
                return `<option value="${escapeHtml(em)}">${escapeHtml(nm)}</option>`;
            }).join('');
        } else {
            selPeserta.innerHTML = '<option value="">Tidak ada peserta di daftar (ketik email manual)</option>';
        }
    } catch (e) {
        selPeserta.innerHTML = '<option value="">Gagal memuat peserta</option>';
    }
}

async function muatPreviewTransfer(btn) {
    const pelAsal = document.getElementById('tfPelAsal').value;
    const pelTujuan = document.getElementById('tfPelTujuan').value;
    const email = (document.getElementById('tfEmailManual').value || document.getElementById('tfPesertaSelect').value).trim();

    if (!pelAsal || !pelTujuan) return showToast("Pilih Pelatihan Asal dan Pelatihan Tujuan terlebih dahulu.", 'warning');
    if (pelAsal === pelTujuan) return showToast("Pelatihan Asal dan Pelatihan Tujuan tidak boleh sama.", 'warning');
    if (!email) return showToast("Pilih atau ketik Email peserta terlebih dahulu.", 'warning');

    const teksAsli = btn ? btn.innerText : "";
    if (btn) { btn.innerText = "Memeriksa Riwayat Presensi..."; btn.disabled = true; }

    try {
        const res = await apiPost({
            action: "get_transfer_presensi_info",
            pelatihan_asal: pelAsal,
            pelatihan_tujuan: pelTujuan,
            username: email
        });

        if (res.status === "success") {
            cachedTransferData = res;
            const panel = document.getElementById('tfOpsiPanel');
            const wadah = document.getElementById('tfWadahPreview');
            const badge = document.getElementById('tfRingkasanBadge');

            panel.classList.remove('hidden');
            document.getElementById('cekSemuaTransfer').checked = true;
            badge.innerText = `${res.attended_asal.length} Sesi Hadir di Pelatihan Asal`;

            if (res.attended_asal.length === 0) {
                wadah.innerHTML = `<div class="bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-6 text-center"><p class="text-xs text-slate-600 font-medium">Peserta <b>${escapeHtml(email)}</b> belum memiliki catatan presensi di <b>${escapeHtml(pelAsal)}</b>.</p></div>`;
                document.getElementById('btnProsesTransfer').disabled = true;
                document.getElementById('btnProsesTransfer').classList.add('opacity-50');
            } else {
                document.getElementById('btnProsesTransfer').disabled = false;
                document.getElementById('btnProsesTransfer').classList.remove('opacity-50');

                const existingSet = new Set((res.existing_tujuan || []).map(k => String(k).toLowerCase()));
                wadah.innerHTML = res.attended_asal.map((att, idx) => {
                    const wktStr = formatWitaDateTime(att.waktu);

                    const matched = res.sessions_tujuan.find(
                        s => s.hari.toLowerCase() === att.hari.toLowerCase() && s.sesi.toLowerCase() === att.sesi.toLowerCase()
                    );
                    const defaultVal = matched ? `${matched.hari}|||${matched.sesi}` : `${att.hari}|||${att.sesi}`;
                    const sudahAdaDiTujuan = existingSet.has(defaultVal.toLowerCase());

                    const tujuanOpts = res.sessions_tujuan.map(s => {
                        const val = `${s.hari}|||${s.sesi}`;
                        const isSel = (val === defaultVal) ? 'selected' : '';
                        const dupTag = existingSet.has(val.toLowerCase()) ? ' [Sudah Hadir]' : '';
                        return `<option value="${escapeHtml(val)}" ${isSel}>${escapeHtml(s.hari)} | ${escapeHtml(s.sesi)}${s.tanggal ? ' (' + escapeHtml(s.tanggal) + ')' : ''}${dupTag}</option>`;
                    }).join('');

                    const fallbackOpt = !matched
                        ? `<option value="${escapeHtml(att.hari + '|||' + att.sesi)}" selected>Gunakan Nama Asal: ${escapeHtml(att.hari)} | ${escapeHtml(att.sesi)}</option>`
                        : '';

                    return `
                    <div class="bg-slate-50 border ${sudahAdaDiTujuan ? 'border-amber-300' : 'border-slate-200'} p-3.5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <label class="flex items-start space-x-2.5 cursor-pointer sm:w-1/2">
                            <input type="checkbox" value="${Number(att.rowIndex)}" data-idx="${idx}" ${sudahAdaDiTujuan ? '' : 'checked'} class="cek-item-transfer w-4 h-4 mt-0.5 rounded text-oceanDark shrink-0">
                            <div>
                                <span class="text-xs font-extrabold text-oceanDark uppercase">Asal: ${escapeHtml(pelAsal)}</span>
                                <p class="text-xs font-extrabold text-slate-900">${escapeHtml(att.hari)} | ${escapeHtml(att.sesi)}</p>
                                <p class="text-xs text-slate-600">Waktu: ${escapeHtml(wktStr)} WITA</p>
                            </div>
                        </label>
                        <div class="sm:w-1/2 pl-6 sm:pl-0">
                            <label for="tfTargetSelect_${idx}" class="text-xs font-bold text-slate-700 uppercase block mb-1">Masukkan ke Sesi di ${escapeHtml(pelTujuan)}:</label>
                            <select id="tfTargetSelect_${idx}" class="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold bg-white text-slate-900">
                                ${fallbackOpt}
                                ${tujuanOpts}
                            </select>
                            ${sudahAdaDiTujuan ? `<p class="text-xs text-amber-800 font-bold mt-1">Catatan: sesi ini sudah tercatat hadir di pelatihan tujuan (tidak dicentang otomatis).</p>` : ''}
                        </div>
                    </div>`;
                }).join('');
            }
        } else {
            showToast("Gagal memuat data: " + (res.message || ""), 'error');
        }
    } catch (e) {
        showToast("Kesalahan koneksi saat memeriksa riwayat presensi.", 'error');
    }
    if (btn) { btn.innerText = teksAsli; btn.disabled = false; }
}

function togglePilihSemuaTransfer(masterCb) {
    document.querySelectorAll('.cek-item-transfer').forEach(cb => { cb.checked = masterCb.checked; });
}

async function eksekusiTransferPresensi(btn) {
    const pelAsal = document.getElementById('tfPelAsal').value;
    const pelTujuan = document.getElementById('tfPelTujuan').value;
    const email = (document.getElementById('tfEmailManual').value || document.getElementById('tfPesertaSelect').value).trim();
    const modeTransfer = document.getElementById('tfModeTransfer').value;

    const checkedCbs = Array.from(document.querySelectorAll('.cek-item-transfer:checked'));
    if (checkedCbs.length === 0) return showToast("Centang minimal 1 sesi presensi yang ingin ditransfer.", 'warning');

    const items = checkedCbs.map(cb => {
        const idx = cb.dataset.idx;
        const selVal = document.getElementById(`tfTargetSelect_${idx}`).value;
        const [target_hari, target_sesi] = selVal.split('|||');
        return {
            rowIndex: parseInt(cb.value, 10),
            target_hari,
            target_sesi
        };
    });

    const modeDesc = modeTransfer === 'move'
        ? 'MEMINDAHKAN (hapus dari pelatihan asal & pindahkan pendaftaran kelas)'
        : 'MENYALIN (arsip pelatihan asal tetap disimpan)';

    if (!await appConfirm(`Yakin ingin ${modeDesc} sebanyak ${items.length} sesi presensi milik "${email}"?\n\nDari: ${pelAsal}\nKe: ${pelTujuan}`, { title: 'Konfirmasi Transfer Presensi', okText: 'Ya, Proses Transfer', danger: modeTransfer === 'move' })) return;

    const teksAsli = btn.innerText;
    btn.innerText = "Memproses Transfer...";
    btn.disabled = true;

    try {
        const res = await apiPost({
            action: "execute_transfer_presensi",
            username: email,
            pelatihan_asal: pelAsal,
            pelatihan_tujuan: pelTujuan,
            mode_transfer: modeTransfer,
            items
        });
        showToast(res.message, res.status === "success" ? 'success' : 'error');
        if (res.status === "success") {
            if (modeTransfer === 'move') await muatPesertaTransferAsal();
            document.getElementById('tfEmailManual').value = email;
            muatPreviewTransfer(document.querySelector('#adminTransferPresensiScreen button[onclick*="muatPreviewTransfer"]'));
        }
    } catch (e) {
        showToast("Gagal memproses transfer presensi.", 'error');
    }
    btn.innerText = teksAsli;
    btn.disabled = false;
}
