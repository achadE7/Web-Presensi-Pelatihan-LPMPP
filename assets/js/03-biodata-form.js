// 03-biodata-form.js — Peta prodi, generator 3-bagian form biodata, deteksi gelar, dan helper form jadwal/GPS

const prodiMap = { "Keguruan & Ilmu Pendidikan": ["Pendidikan Sejarah", "PKN", "Pendidikan Ekonomi", "Pendidikan Sosiologi", "Pendidikan Geografi", "Pendidikan Bahasa & Sastra Indonesia", "Pendidikan Bahasa Inggris", "Pendidikan Seni Pertunjukan", "Pendidikan Matematika", "Pendidikan Biologi", "Pendidikan Kimia", "Pendidikan Fisika", "Pendidikan Jasmani", "Bimbingan & Konseling", "PGSD", "PGPAUD", "Pendidikan IPA", "Pendidikan IPS", "Teknologi Pendidikan", "Pendidikan Khusus"], "Ekonomi & Bisnis": ["S1 Prodi Manajemen", "S1 Prodi Akuntansi", "S1 Ilmu Ekonomi dan Studi Pembangunan"], "Hukum": ["S1 Hukum"], "Ilmu Sosial dan Ilmu Politik": ["Ilmu Pemerintahan", "Administrasi Publik", "Administrasi Bisnis", "Sosiologi", "Geografi", "Ilmu Komunikasi"], "Matematika dan Ilmu Pengetahuan Alam": ["S1 Matematika", "S1 Kimia", "S1 Biologi", "S1 Fisika", "S1 Farmasi", "S1 Ilmu Komputer", "S1 Statistika"], "Perikanan & Kelautan": ["Akuakultur", "Manajemen Sumberdaya Perairan", "Teknologi Hasil Perikanan", "Perikanan Tangkap", "Sosial Ekonomi Perikanan", "Ilmu Kelautan"], "Kehutanan": ["Kehutanan"], "Pertanian": ["Agronomi", "Agroekoteknologi", "Proteksi Tanaman", "Ilmu Tanah", "Agribisnis", "Peternakan", "Teknologi Industri Pertanian"], "Teknik": ["Teknik Sipil", "Arsitektur", "Teknik Pertambangan", "Teknik Kimia", "Teknik Lingkungan", "Teknik Mesin", "Teknologi Informasi", "Rekayasa Elektro", "Rekayasa Geologi"], "Kedokteran": ["Program Studi Kedokteran", "Program Studi Kesehatan Masyarakat", "Program Studi Keperawatan", "Psikologi", "Pendidikan Dokter", "Pendidikan Profesi Dokter", "Pendidikan Dokter Spesialis", "Pendidikan Dokter Spesialis Pulmunologi", "Pendidikan Dokter Spesialis Obstetri dan Ginekologi", "Pendidikan Dokter Spesialis Ilmu Bedah", "Pendidikan Dokter Spesialis Anestesiologi", "Pendidikan Dokter Spesialis Ilmu Kesehatan Anak", "Pendidikan Dokter Spesialis Ilmu Penyakit Dalam", "Pendidikan Dokter Spesialis Orthopaedi dan Traumatologi"], "Kedokteran Gigi": ["Kedokteran Gigi"], "Pascasarjana": ["Pascasarjana"] };

function buildBiodataFields(prefix) {
    const isEdit = prefix === 'edit';
    const pangkatOpts = ["Tidak Ada","IA/Juru Muda","IB/Juru Muda Tk.1","IC/Juru","ID/Juru Tk.1","IIA/Pengatur Muda","IIB/Pengatur Muda Tk.1","IIC/Pengatur","IID/Pengatur TK.1","IIIA/Penata Muda","IIIB/Penata Muda Tk.1","IIIC/Penata","IIID/Penata Tk.1","IVA/Pembina","IVB/Pembina Tk.1","IVC/Pembina Utama Muda","IVD/Pembina Utama Madya","IVE/Pembina Utama"].map(o => `<option value="${escapeHtml(o)}">${escapeHtml(o)}</option>`).join('');
    const jabOpts = ["Tidak Ada","Asisten Ahli","Lektor","Lektor Kepala","Profesor"].map(o => `<option value="${escapeHtml(o)}">${escapeHtml(o)}</option>`).join('');
    const fakOpts = Object.keys(prodiMap).concat(["Lainnya"]).map(o => `<option value="${escapeHtml(o)}">${escapeHtml(o)}</option>`).join('');
    const pendOpts = ["D3","D4","S1","S2","S3"].map(o => `<option value="${escapeHtml(o)}">${escapeHtml(o)}</option>`).join('');
    const inpCls = "w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50/40 focus:bg-white text-sm text-slate-900";
    const selCls = "w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-900";
    const lblCls = "text-xs text-slate-700 font-semibold block mb-1.5";

    return `
        <section class="space-y-3.5">
            <div class="flex items-center gap-2 pb-2 border-b border-slate-200">
                <span class="w-6 h-6 rounded-full bg-oceanDeep text-white text-xs font-extrabold flex items-center justify-center shrink-0">1</span>
                <h3 class="text-xs font-extrabold text-oceanDeep uppercase tracking-wider">Akun & Identitas Diri</h3>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div class="md:col-span-2">
                    <label for="${prefix}Nama" class="${lblCls}">Nama Lengkap (TANPA GELAR)*</label>
                    <input type="text" id="${prefix}Nama" oninput="cekGelarPadaNama('${prefix}', false)" placeholder="Contoh: Budi Santoso" class="${inpCls}">
                    <div id="${prefix}NamaGelarWarn" class="hidden mt-1.5 flex items-start space-x-2 bg-amber-50 border border-amber-300 text-amber-900 px-3 py-2 rounded-xl text-xs font-medium">
                        <svg class="w-4 h-4 text-amber-700 shrink-0 mt-0.5" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                        <span>Terdeteksi gelar! Mohon hapus gelar dari kolom ini dan isikan hanya di kolom <b>Gelar Depan</b> atau <b>Gelar Belakang</b>.</span>
                    </div>
                </div>
                <div><label for="${prefix}GelarDepan" class="${lblCls}">Gelar Depan</label><input type="text" id="${prefix}GelarDepan" placeholder="Contoh: Dr., Ir., Prof." class="${inpCls}"></div>
                <div><label for="${prefix}GelarBelakang" class="${lblCls}">Gelar Belakang</label><input type="text" id="${prefix}GelarBelakang" placeholder="Contoh: S.Pd., M.Pd." class="${inpCls}"></div>
                <div><label for="${prefix}User" class="${lblCls}">Email Aktif*</label><input type="email" id="${prefix}User" ${isEdit ? 'readonly class="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-slate-100 text-slate-600"' : `autocomplete="email" placeholder="nama@ulm.ac.id" class="${inpCls}"`}></div>
                <div>
                    <label for="${prefix}Pass" class="${lblCls}">${isEdit ? 'Kata Sandi Baru (Opsional)' : 'Kata Sandi*'}</label>
                    <div class="relative">
                        <input type="password" id="${prefix}Pass" autocomplete="new-password" placeholder="${isEdit ? 'Kosongkan jika tidak mengubah' : 'Min. 8 karakter (huruf & angka)'}" class="${inpCls} pr-12">
                        <button type="button" onclick="togglePassword('${prefix}Pass', this)" aria-label="Tampilkan atau sembunyikan kata sandi" title="Tampilkan / Sembunyikan Kata Sandi" class="absolute right-0.5 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center text-slate-600 hover:text-oceanDark rounded-lg transition-colors">
                            <svg class="w-4 h-4" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                        </button>
                    </div>
                </div>
                <div><label for="${prefix}HP" class="${lblCls}">Nomor HP / WhatsApp</label><input type="tel" inputmode="numeric" id="${prefix}HP" placeholder="08xxxxxxxxxx" class="${inpCls}"></div>
                <div><label for="${prefix}JK" class="${lblCls}">Jenis Kelamin*</label><select id="${prefix}JK" class="${selCls}"><option value="">Pilih Jenis Kelamin</option><option value="Laki-laki">Laki-laki</option><option value="Perempuan">Perempuan</option></select></div>
                <div><label for="${prefix}TempatLahir" class="${lblCls}">Tempat Lahir</label><input type="text" id="${prefix}TempatLahir" placeholder="Contoh: Banjarmasin" class="${inpCls}"></div>
                <div><label for="${prefix}TanggalLahir" class="${lblCls}">Tanggal Lahir</label><input type="date" id="${prefix}TanggalLahir" class="${inpCls}"></div>
            </div>
        </section>

        <section class="space-y-3.5">
            <div class="flex items-center gap-2 pb-2 border-b border-slate-200">
                <span class="w-6 h-6 rounded-full bg-oceanDeep text-white text-xs font-extrabold flex items-center justify-center shrink-0">2</span>
                <h3 class="text-xs font-extrabold text-oceanDeep uppercase tracking-wider">Kepegawaian & Unit Kerja</h3>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div><label for="${prefix}NIP" class="${lblCls}">NIP*</label><input type="text" id="${prefix}NIP" placeholder="Masukkan NIP" class="${inpCls}"></div>
                <div>
                    <label for="${prefix}NIDN" class="${lblCls}">NIDN / NIDK*</label>
                    <input type="text" id="${prefix}NIDN" placeholder="Masukkan NIDN / NIDK" class="${inpCls}">
                    <p class="text-xs text-slate-600 mt-1">Isi angka <b>0</b> jika belum/tidak memiliki NIDN/NIDK.</p>
                </div>
                <div><label for="${prefix}NUPTK" class="${lblCls}">NUPTK*</label><input type="text" id="${prefix}NUPTK" placeholder="Masukkan NUPTK" class="${inpCls}"></div>
                <div><label for="${prefix}StatusPegawai" class="${lblCls}">Status Kepegawaian*</label><select id="${prefix}StatusPegawai" class="${selCls}"><option value="">Pilih Status</option><option value="ASN">ASN</option><option value="Non ASN">Non ASN</option></select></div>
                <div><label for="${prefix}Pangkat" class="${lblCls}">Pangkat / Golongan</label><select id="${prefix}Pangkat" class="${selCls}"><option value="">Pilih Golongan</option>${pangkatOpts}</select></div>
                <div><label for="${prefix}Jabatan" class="${lblCls}">Jabatan Fungsional</label><select id="${prefix}Jabatan" class="${selCls}"><option value="">Pilih Jabatan</option>${jabOpts}</select></div>
                <div><label for="${prefix}Instansi" class="${lblCls}">Instansi</label><select id="${prefix}Instansi" class="${selCls}"><option value="">Pilih Instansi</option><option value="Dalam ULM">Dalam ULM</option><option value="Luar ULM">Luar ULM</option></select></div>
                <div><label for="${prefix}NamaInstansi" class="${lblCls}">Nama Instansi</label><input type="text" id="${prefix}NamaInstansi" placeholder="Contoh: Universitas Lambung Mangkurat" class="${inpCls}"></div>
            </div>
        </section>

        <section class="space-y-3.5">
            <div class="flex items-center gap-2 pb-2 border-b border-slate-200">
                <span class="w-6 h-6 rounded-full bg-oceanDeep text-white text-xs font-extrabold flex items-center justify-center shrink-0">3</span>
                <h3 class="text-xs font-extrabold text-oceanDeep uppercase tracking-wider">Akademik & Domisili</h3>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div><label for="${prefix}Fakultas" class="${lblCls}">Fakultas*</label><select id="${prefix}Fakultas" onchange="updateProdi('${prefix}')" class="${selCls}"><option value="">Pilih Fakultas</option>${fakOpts}</select></div>
                <div>
                    <label for="${prefix}ProdiSelect" class="${lblCls}">Program Studi*</label>
                    <select id="${prefix}ProdiSelect" class="${selCls}"><option value="">Pilih Program Studi</option></select>
                    <input type="text" id="${prefix}ProdiInput" aria-label="Program Studi Manual" placeholder="Ketik Program Studi Manual" class="hidden ${inpCls}">
                </div>
                <div class="md:col-span-2"><label for="${prefix}Pendidikan" class="${lblCls}">Pendidikan Terakhir</label><select id="${prefix}Pendidikan" class="${selCls}"><option value="">Pilih Pendidikan</option>${pendOpts}</select></div>
            </div>
        </section>
    `;
}

let activeGelarPrefix = '';

function deteksiGelar(nama) {
    if (!nama) return false;
    const s = nama.trim();
    if (!s) return false;
    // 1. Tanda koma (pemisah gelar belakang)
    if (/,/.test(s)) return true;
    // 2. Gelar depan (Prof., Dr., dr., drg., drh., Ir., Drs., Dra., Apt., Ns., Bdn., Gr.)
    const polaDepan = /(?:^|\s)(?:prof|dr|drg|drh|ir|drs|dra|apt|ns|bdn|gr)\.(?:\s|$)|^(?:prof|dr|drg|drh|ir|drs|dra)\s+/i;
    if (polaDepan.test(s)) return true;
    // 3. Gelar akademik bertitik yang spesifik (menghindari false-positive inisial seperti M.Noor / M.Rifani / S.Hidayat)
    const polaGelarTitik = /(?:^|\s)(?:s\.(?:pd|kom|e|h|t|si|sos|hum|ag|ip|pt|pi|hut|gz|farm|ked|kep|kg|km|psi|st|tr|p|sn|ik|ab|ap|ak|mb|mn|tp|ars|pwk|kel|stat|mat|bio|fis|kim|par|or|pd\.i|kom\.i|sos\.i|th|fil)\.?|m\.(?:pd|kom|si|sc|m|t|a|h|e|kes|kep|psi|eng|ed|ba|pa|ph|kn|hum|ag|ip|pt|pi|hut|gz|farm|biomed|tr|sn|ik|ab|ap|ak|mb|mn|tp|ars|pwk|stat|or|pd\.i|fil|th|b\.a)\.?|ph\.?\s*d\.?|sp\.?\s*[a-z]{1,4}\.?|a\.?\s*md\.?|d\.?\s*iv)(?:\s|$)/i;
    if (polaGelarTitik.test(s)) return true;
    // 4. Singkatan gelar belakang tanpa titik di akhir kata (hanya jika tidak seluruh nama huruf kapital)
    const isAllCaps = s === s.toUpperCase() && /[A-Z]/.test(s);
    const polaBelakangKapital = isAllCaps
        ? /\s(?:SKM|MKM|MPD|MSI|MSC|MKOM|SPD|SKOM|SSI|SKEP|SKED|SPSI|SSOS|SHUM|SAG|SIP|SPT|SPI|SHUT|SGZ|SFARM|AMD|PHD|MBA|MPA|MPH|MENG|MED)(?:\s|$)/
        : /\s(?:SE|SH|ST|MM|MT|MA|MS|SKM|MKM|MPd|MSi|MSc|MKom|SPd|SKom|SSi|SKep|SKed|SPsi|SSos|SHum|SAg|SIP|SPt|SPi|SHut|SGz|SFarm|AMd|PhD|MBA|MPA|MPH|MEng|MEd|Akt|Psi|Ns|Apt|Gr)(?:\s|$)/;
    if (polaBelakangKapital.test(s)) return true;
    return false;
}

function cekGelarPadaNama(prefix, silentMode = false) {
    const inp = document.getElementById(`${prefix}Nama`);
    const warn = document.getElementById(`${prefix}NamaGelarWarn`);
    if (!inp || !warn) return false;

    if (!silentMode) inp.dataset.gelarOverride = '0';
    const adaGelar = deteksiGelar(inp.value);
    const showWarn = adaGelar && inp.dataset.gelarOverride !== '1';
    warn.classList.toggle('hidden', !showWarn);
    inp.classList.toggle('border-amber-400', showWarn);
    inp.classList.toggle('bg-amber-50/40', showWarn);

    if (showWarn) {
        if (!silentMode && inp.dataset.gelarAlertShown !== '1') {
            inp.dataset.gelarAlertShown = '1';
            tampilModalPeringatanGelar(prefix);
        }
    } else if (!adaGelar) {
        inp.dataset.gelarAlertShown = '0';
        inp.dataset.gelarOverride = '0';
    }
    return showWarn;
}

function tampilModalPeringatanGelar(prefix) {
    activeGelarPrefix = prefix || '';
    const modal = document.getElementById('modalPeringatanGelar');
    if (modal) modal.classList.remove('hidden');
}

function tutupModalPeringatanGelar() {
    const modal = document.getElementById('modalPeringatanGelar');
    if (modal) modal.classList.add('hidden');
    if (activeGelarPrefix) {
        const inp = document.getElementById(`${activeGelarPrefix}Nama`);
        if (inp) inp.focus();
    }
}

function konfirmasiBukanGelar() {
    if (activeGelarPrefix) {
        const inp = document.getElementById(`${activeGelarPrefix}Nama`);
        const warn = document.getElementById(`${activeGelarPrefix}NamaGelarWarn`);
        if (inp) {
            inp.dataset.gelarOverride = '1';
            inp.classList.remove('border-amber-400', 'bg-amber-50/40');
        }
        if (warn) warn.classList.add('hidden');
    }
    const modal = document.getElementById('modalPeringatanGelar');
    if (modal) modal.classList.add('hidden');
}

function setTanggalHariIni() {
    const wita = getWitaNow();
    const elNum = document.getElementById('currentDateNum');
    const elDay = document.getElementById('currentDayName');
    const elMonth = document.getElementById('currentMonthYear');
    if (elNum) elNum.innerText = String(wita.day).padStart(2, '0');
    if (elDay) elDay.innerText = namaHariIndo[wita.dayOfWeek];
    if (elMonth) elMonth.innerText = `${namaBulanLengkap[wita.month]} ${wita.year}`;
}

function togglePassword(idField, btn) {
    const el = document.getElementById(idField);
    const isHidden = el.type === "password";
    el.type = isHidden ? "text" : "password";
    const sizeClass = idField === "password" ? "w-5 h-5" : "w-4 h-4";
    btn.classList.toggle("text-oceanDark", isHidden);
    btn.classList.toggle("text-slate-600", !isHidden);
    btn.innerHTML = isHidden
        ? `<svg class="${sizeClass}" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`
        : `<svg class="${sizeClass}" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
}
function updateProdi(prefix) {
    const fakultas = document.getElementById(prefix + 'Fakultas').value;
    const prodiSelect = document.getElementById(prefix + 'ProdiSelect');
    const prodiInput = document.getElementById(prefix + 'ProdiInput');
    prodiSelect.innerHTML = '<option value="">Pilih Program Studi</option>';
    if (fakultas === "Lainnya") {
        prodiSelect.classList.add('hidden');
        prodiInput.classList.remove('hidden');
        prodiInput.value = "";
    } else {
        prodiSelect.classList.remove('hidden');
        prodiInput.classList.add('hidden');
        if (prodiMap[fakultas]) {
            prodiSelect.innerHTML = '<option value="">Pilih Program Studi</option>' +
                prodiMap[fakultas].map(prodi => `<option value="${escapeHtml(prodi)}">${escapeHtml(prodi)}</option>`).join('');
        }
    }
}

function formatTglIndo(tglStr) {
    if (!tglStr) return "";
    const parts = tglStr.split('-');
    if (parts.length !== 3) return tglStr;
    return `${parseInt(parts[2], 10)} ${namaBulan[parseInt(parts[1], 10) - 1]} ${parts[0]}`;
}

function parseTglIndo(indoStr) {
    if (!indoStr) return "";
    const s = indoStr.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const match = s.match(/(\d{1,2})\s*([a-zA-Z]+)\s*(\d{4})/);
    if (!match) return "";
    const d = String(parseInt(match[1], 10)).padStart(2, '0');
    const mIndex = namaBulan.findIndex(b => match[2].toLowerCase().startsWith(b.toLowerCase()));
    if (mIndex === -1) return "";
    return `${match[3]}-${String(mIndex + 1).padStart(2, '0')}-${d}`;
}

function toggleTempatInput(isUserAction) {
    const isOnline = document.getElementById('cekOnline').checked;
    const isOffline = document.getElementById('cekOffline').checked;
    document.getElementById('tempatOnline').classList.toggle('hidden', !isOnline);
    document.getElementById('tempatOffline').classList.toggle('hidden', !isOffline);
    if (isUserAction) {
        if (isOnline && !isOffline) document.querySelectorAll('.input-mode').forEach(sel => sel.value = 'Online');
        else if (!isOnline && isOffline) document.querySelectorAll('.input-mode').forEach(sel => sel.value = 'Offline');
    }
}

function ambilLokasiAdminSaatIni(targetMenu) {
    if (!navigator.geolocation) return showToast("Browser tidak mendukung GPS.", 'error');
    navigator.geolocation.getCurrentPosition(pos => {
        const latVal = pos.coords.latitude.toFixed(6), lngVal = pos.coords.longitude.toFixed(6);
        if (targetMenu === 'gps') { document.getElementById('setLat').value = latVal; document.getElementById('setLng').value = lngVal; }
        else { document.getElementById('jadwalLat').value = latVal; document.getElementById('jadwalLng').value = lngVal; }
        showToast("Titik koordinat lokasi Anda saat ini berhasil dimasukkan.", 'success');
    }, () => showToast("Gagal mengambil lokasi GPS. Pastikan izin lokasi browser aktif.", 'error'), { enableHighAccuracy: true });
}

function cekPilihPelatihanGPS() {
    const sel = document.getElementById('gpsPelatihanSelect').value;
    if (sel === "DEFAULT") {
        document.getElementById('setLat').value = TARGET_LAT; document.getElementById('setLng').value = TARGET_LNG; document.getElementById('setRadius').value = RADIUS_MAX;
    } else if (window.pelatihanData) {
        const found = window.pelatihanData.find(p => p.nama === sel);
        if (found) {
            document.getElementById('setLat').value = found.lat || TARGET_LAT; document.getElementById('setLng').value = found.lng || TARGET_LNG; document.getElementById('setRadius').value = found.radius || RADIUS_MAX;
        }
    }
}

function resetKeteranganJadwal() {
    document.getElementById('jadwalTglMulai').value = ""; document.getElementById('jadwalTglSelesai').value = "";
    const statusSel = document.getElementById('jadwalStatusSelect');
    if (statusSel) statusSel.value = "Aktif";
    document.getElementById('cekOnline').checked = false; document.getElementById('tempatOnline').value = "";
    document.getElementById('cekOffline').checked = false; document.getElementById('tempatOffline').value = "";
    document.getElementById('jadwalLat').value = TARGET_LAT; document.getElementById('jadwalLng').value = TARGET_LNG; document.getElementById('jadwalRadius').value = RADIUS_MAX;
    toggleTempatInput(false);
    const wadah = document.getElementById('wadahSesi');
    while (wadah.children.length > 1) wadah.lastElementChild.remove();
    const firstItem = wadah.firstElementChild;
    if (firstItem) {
        firstItem.querySelectorAll('input').forEach(inp => inp.value = '');
		firstItem.dataset.origHari = '';
        firstItem.dataset.origSesi = '';
        if (firstItem.querySelector('.input-mode')) firstItem.querySelector('.input-mode').value = 'Offline';
        if (firstItem.querySelector('.btn-hapus-sesi')) firstItem.querySelector('.btn-hapus-sesi').classList.add('hidden');
    }
}

function cekPilihPelatihanJadwal() { 
    const sel = document.getElementById('jadwalPelatihanSelect').value; 
    const inp = document.getElementById('jadwalPelatihanInput'); 
    const waInp = document.getElementById('jadwalWALink');
    const statusSel = document.getElementById('jadwalStatusSelect');
    resetKeteranganJadwal();
    if (sel === "BARU") { inp.classList.remove('hidden'); inp.value = ""; if(waInp) waInp.value = ""; if (statusSel) statusSel.value = "Aktif"; } 
    else { 
        inp.classList.add('hidden'); 
        if(window.pelatihanData) {
            const found = window.pelatihanData.find(p => p.nama === sel);
            if (found) {
                if (statusSel) statusSel.value = (found.status === 'Draft') ? 'Draft' : 'Aktif';
                if(waInp) waInp.value = found.wa_link || "";
                if(found.lat) document.getElementById('jadwalLat').value = found.lat;
                if(found.lng) document.getElementById('jadwalLng').value = found.lng;
                if(found.radius) document.getElementById('jadwalRadius').value = found.radius;
                if(found.info && found.info !== "-") {
                    found.info.split("|").forEach(part => {
                        const p = part.trim();
                        if (p.toLowerCase().startsWith("online")) {
                            document.getElementById('cekOnline').checked = true;
                            if (p.includes(":")) document.getElementById('tempatOnline').value = p.split(":").slice(1).join(":").trim();
                        } else if (p.toLowerCase().startsWith("offline")) {
                            document.getElementById('cekOffline').checked = true;
                            if (p.includes(":")) document.getElementById('tempatOffline').value = p.split(":").slice(1).join(":").trim();
                        } else if (p !== "") {
                            if (p.includes("-")) {
                                const dp = p.split(/\s*-\s*/);
                                if (dp.length >= 2) { document.getElementById('jadwalTglMulai').value = parseTglIndo(dp[0]); document.getElementById('jadwalTglSelesai').value = parseTglIndo(dp[1]); }
                            } else {
                                const parsed = parseTglIndo(p);
                                if (parsed) { document.getElementById('jadwalTglMulai').value = parsed; document.getElementById('jadwalTglSelesai').value = parsed; }
                            }
                        }
                    });
                    toggleTempatInput(false);
                }
                if (found.sesi_list && found.sesi_list.length > 0) {
                    const wadah = document.getElementById('wadahSesi');
                    found.sesi_list.forEach((s, idx) => {
                        let itemEl = (idx === 0) ? wadah.firstElementChild : wadah.firstElementChild.cloneNode(true);
                        if (idx > 0) wadah.appendChild(itemEl);
                        itemEl.querySelector('.input-hari').value = s.hari || "";
                        itemEl.querySelector('.input-tanggal').value = s.tanggal && s.tanggal !== "-" ? s.tanggal : "";
                        itemEl.querySelector('.input-sesi').value = s.sesi || "";
						itemEl.dataset.origHari = s.hari || "";
                        itemEl.dataset.origSesi = s.sesi || "";
                        itemEl.querySelector('.input-mulai').value = s.jam_mulai && s.jam_mulai !== "-" ? s.jam_mulai : "";
                        itemEl.querySelector('.input-selesai').value = s.jam_selesai && s.jam_selesai !== "-" ? s.jam_selesai : "";
                        if (itemEl.querySelector('.input-mode')) itemEl.querySelector('.input-mode').value = s.mode || "Offline";
                    });
                    if (found.sesi_list.length > 1 && session.role === "super_admin") {
                        document.querySelectorAll('.btn-hapus-sesi').forEach(b => b.classList.remove('hidden'));
                    }
                }
            }
        }
    }
    terapkanModeReadOnlyAdminBiasa();
}
