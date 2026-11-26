// 09-export-docs.js — Checklist Panitia LPMPP serta generator PDF & DOCX (Surat Balasan dan Lembar Presensi)

// =========================================================================
// GENERATOR SURAT BALASAN & LEMBAR PRESENSI LURING (PDF & NATIVE DOCX)
// =========================================================================
function getLogoUrls() {
    return {
        ulm: new URL('logo-ulm.png', window.location.href).href,
        lpmpp: new URL('logo-lpmpp.png', window.location.href).href,
        ttdKepala: new URL('ttd-pak-agung.png', window.location.href).href,
        stempel: new URL('stempel-lpmpp.png', window.location.href).href
    };
}

async function fetchLogoBytes(url) {
    try {
        const resp = await fetch(url);
        if (!resp.ok) return null;
        const buf = await resp.arrayBuffer();
        return new Uint8Array(buf);
    } catch (e) {
        return null;
    }
}

const DAFTAR_PANITIA_LPMPP = [
    "Herry Setiawan, S.Kep., Ns., M.Kep",
    "Dr. Ananda Setiawan, S.Pd., M.Pd",
    "Dr. Maya Sari Dewi, S.Sos, MM",
    "Dr. Heri Susanto, M.Pd",
    "Rusdayanti Asma, S.E. M.Si",
    "Dr. Muhammad Najamudin, S.Pd., M.Pd",
    "Dr. Saiyidah Mahtari, S.Pd, M.Pd",
    "Dr. Candra, S.Pi, M.Si",
    "Jefriadi, S.T., M.Eng",
    "Meydisa Utami Tanau, M.Psi, Psikologi",
    "Fakhriyah, S.ST, MKM",
    "Dr. Utomo, S.Pd., M.Pd",
    "Zuliyan Agus Nur Muchlis Majid, S.T.P, MT",
    "Muhammad Itqan Mazdadi, S.Kom., M.Kom",
    "Resny Hayati, S.E",
    "Ima Mentayani, S.T",
    "Siti Norma Kamariah, S.H",
    "Erna Wahyunie, S.E",
    "Fitriyanti, S.Si",
    "Reza Fahlevi, S.Kom",
    "Nella Marisca Lolowang, S.Kom",
    "Nurul Hikmah",
    "M. Rifani"
];

function renderChecklistPanitia() {
    const wadah = document.getElementById('listChecklistPanitia');
    if (!wadah) return;
    const searchInp = document.getElementById('cariPanitiaInput');
    if (searchInp) searchInp.value = '';
    wadah.innerHTML = DAFTAR_PANITIA_LPMPP.map((nama, idx) => `
        <label class="item-panitia-row flex items-center space-x-2 bg-white border border-slate-200 hover:border-sky-300 px-3 py-2 rounded-xl cursor-pointer transition-all">
            <input type="checkbox" value="${idx}" checked onchange="updateTampilanPanitia()" class="cek-panitia-lpmpp w-4 h-4 rounded text-emerald-700 focus:ring-emerald-600 shrink-0">
            <span class="teks-nama-panitia text-xs font-semibold text-slate-800 truncate" title="${escapeHtml(nama)}">${escapeHtml(nama)}</span>
        </label>
    `).join('');
    updateTampilanPanitia();
}

function togglePanelPanitia() {
    const panel = document.getElementById('wadahPanelPanitia');
    const btn = document.getElementById('btnTogglePanitia');
    if (!panel || !btn) return;
    const isHidden = panel.classList.toggle('hidden');
    btn.innerText = isHidden ? 'Atur / Hapus Panitia ▾' : 'Tutup Daftar Panitia ▴';
}

function updateTampilanPanitia() {
    const allCbs = document.querySelectorAll('.cek-panitia-lpmpp');
    let terpilih = 0;
    allCbs.forEach(cb => {
        const row = cb.closest('.item-panitia-row');
        const teks = row ? row.querySelector('.teks-nama-panitia') : null;
        if (cb.checked) {
            terpilih++;
            if (teks) teks.classList.remove('line-through', 'text-slate-500');
            if (row) row.classList.remove('bg-rose-50/40', 'opacity-70');
        } else {
            if (teks) teks.classList.add('line-through', 'text-slate-500');
            if (row) row.classList.add('bg-rose-50/40', 'opacity-70');
        }
    });
    const badge = document.getElementById('badgeJumlahPanitia');
    if (badge) {
        badge.innerText = `${terpilih}/${DAFTAR_PANITIA_LPMPP.length} Dipilih`;
        badge.className = terpilih === 0
            ? 'text-xs font-extrabold bg-rose-100 text-rose-700 px-2.5 py-0.5 rounded-full'
            : 'text-xs font-extrabold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full';
    }
}

function setSemuaPanitia(checkedState) {
    document.querySelectorAll('.cek-panitia-lpmpp').forEach(cb => { cb.checked = checkedState; });
    updateTampilanPanitia();
}

function filterChecklistPanitia() {
    const kw = (document.getElementById('cariPanitiaInput')?.value || '').toLowerCase();
    document.querySelectorAll('.item-panitia-row').forEach(row => {
        row.classList.toggle('hidden', !row.innerText.toLowerCase().includes(kw));
    });
}

function ambilPanitiaTerpilih() {
    const allCbs = document.querySelectorAll('.cek-panitia-lpmpp');
    if (allCbs.length === 0) return DAFTAR_PANITIA_LPMPP;
    return Array.from(document.querySelectorAll('.cek-panitia-lpmpp:checked'))
        .map(cb => DAFTAR_PANITIA_LPMPP[parseInt(cb.value, 10)])
        .filter(Boolean);
}

function formatTanggalLengkapIndo(tglInput) {
    if (!tglInput) {
        const now = new Date();
        return `${now.getDate()} ${namaBulanLengkap[now.getMonth()]} ${now.getFullYear()}`;
    }
    const p = tglInput.split('-');
    if (p.length !== 3) return tglInput;
    return `${parseInt(p[2], 10)} ${namaBulanLengkap[parseInt(p[1], 10) - 1]} ${p[0]}`;
}

function singkatFakultas(namaFak) {
    if (!namaFak) return "";
    const key = namaFak.toString().trim().toLowerCase()
        .replace(/^fakultas\s+/i, '')
        .replace(/\s+/g, ' ');
    const mapSingkatan = {
        "keguruan & ilmu pendidikan": "FKIP",
        "keguruan dan ilmu pendidikan": "FKIP",
        "ekonomi & bisnis": "FEB",
        "ekonomi dan bisnis": "FEB",
        "hukum": "F. Hukum",
        "ilmu sosial dan ilmu politik": "FISIP",
        "ilmu sosial & ilmu politik": "FISIP",
        "matematika dan ilmu pengetahuan alam": "FMIPA",
        "matematika & ilmu pengetahuan alam": "FMIPA",
        "perikanan & kelautan": "FAPERIK",
        "perikanan dan kelautan": "FAPERIK",
        "kehutanan": "FAHUTAN",
        "pertanian": "FAPERTA",
        "teknik": "F. Teknik",
        "kedokteran": "FKIK",
        "kedokteran dan ilmu kesehatan": "FKIK",
        "kedokteran & ilmu kesehatan": "FKIK",
        "kedokteran gigi": "FKG"
    };
    return mapSingkatan[key] || namaFak.toString().trim();
}

function ambilPesertaApprovedPerFakultas() {
    const fFak = document.getElementById('filterFakPengajuan').value;
    const approved = cachedPengajuanAdmin
        .filter(x => (x.status === "Approved" || x.status === "Pending_Replace") && (!fFak || x.fakultas === fFak))
        .map(x => ({ ...x, fakultas: singkatFakultas(x.fakultas) }));

    return approved.slice().sort((a, b) => {
        const cmpFak = (a.fakultas || "").localeCompare(b.fakultas || "");
        if (cmpFak !== 0) return cmpFak;
        return (a.nama || "").localeCompare(b.nama || "");
    });
}

function cetakHtmlBersih(htmlContent, beforePrintFn) {
    const win = window.open('', '_blank');
    if (!win) return showToast("Pop-up diblokir oleh browser. Mohon izinkan pop-up untuk mencetak PDF.", 'warning');
    win.document.open();
    win.document.write(htmlContent);
    win.document.close();

    let printed = false;
    const doPrint = () => {
        if (printed) return;
        printed = true;
        try {
            if (typeof beforePrintFn === 'function') beforePrintFn(win);
        } catch (_) {}
        try { win.focus(); win.print(); } catch (_) {}
    };

    const waitAndPrint = () => {
        const imgs = Array.from(win.document.images || []);
        if (imgs.length === 0) { setTimeout(doPrint, 150); return; }
        let loaded = 0;
        const check = () => {
            loaded++;
            if (loaded >= imgs.length) setTimeout(doPrint, 250);
        };
        imgs.forEach(img => {
            if (img.complete) check();
            else { img.onload = check; img.onerror = check; }
        });
        // Fallback agar dialog print tetap muncul walau ada gambar yang macet
        setTimeout(doPrint, 3000);
    };
    if (win.document.readyState === 'complete') waitAndPrint();
    else {
        win.onload = waitAndPrint;
        setTimeout(waitAndPrint, 1500);
    }
}

function unduhBlobFile(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// =========================================================================
// 1. GENERATE SURAT BALASAN (PDF & NATIVE DOCX PERSIS TEMPLATE ASLI)
// =========================================================================
async function generateSuratBalasan(mode) {
    const pel = document.getElementById('filterPelPengajuan').value;
    if (!pel) return showToast("Pilih pelatihan terlebih dahulu.", 'warning');
    const noDepan = document.getElementById('docNomorDepan').value.trim();
    const tglSuratRaw = document.getElementById('docTanggalSurat').value;
    if (!noDepan || !tglSuratRaw) return showToast("Isi Nomor Depan Surat dan Tanggal Surat terlebih dahulu.", 'warning');

    const fFakAktif = document.getElementById('filterFakPengajuan').value;
    if (fFakAktif && !await appConfirm(`Filter Fakultas saat ini aktif pada "${fFakAktif}". Surat Balasan hanya akan memuat peserta dari fakultas tersebut. Lanjutkan?`, { title: 'Filter Fakultas Aktif', okText: 'Ya, Lanjutkan' })) return;

    const listApproved = ambilPesertaApprovedPerFakultas();
    if (listApproved.length === 0) return showToast("Belum ada calon peserta berstatus Approved untuk pelatihan ini.", 'warning');

    const tahunSurat = tglSuratRaw.split('-')[0];
    const nomorLengkap = `${noDepan}/UN8.3/DL.01/${tahunSurat}`;
    const tglSuratIndo = formatTanggalLengkapIndo(tglSuratRaw);
    const tempat = document.getElementById('docTempatKegiatan').value.trim() || "AULA LPMPP BJM";
    const waktu = document.getElementById('docWaktuKegiatan').value.trim() || "08.30 s.d selesai";

    let tglPelaksanaan = document.getElementById('docHariTglPresensi').value.trim();
    if (!tglPelaksanaan && window.pelatihanData) {
        const found = window.pelatihanData.find(p => p.nama === pel);
        if (found && found.info) tglPelaksanaan = found.info.split("|")[0].trim();
    }

    const logos = getLogoUrls();

    // --- MODE DOCX SURAT BALASAN (DOCX.JS LAZY LOADED) ---
    if (mode === 'docx' || mode === 'doc') {
        const docxOk = await ensureDocxLoaded();
        if (!docxOk || !window.docx) return;
        const {
            Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
            WidthType, BorderStyle, AlignmentType, VerticalAlign, ImageRun, Header, PageBreak, TableLayoutType,
            HorizontalPositionRelativeFrom, VerticalPositionRelativeFrom, TextWrappingType
        } = window.docx;

        const [ulmBytes, lpmppBytes, ttdBytes, stempelBytes] = await Promise.all([
            fetchLogoBytes(logos.ulm),
            fetchLogoBytes(logos.lpmpp),
            fetchLogoBytes(logos.ttdKepala),
            fetchLogoBytes(logos.stempel)
        ]);

        const missingAssets = [];
        if (!ulmBytes) missingAssets.push('logo-ulm.png');
        if (!lpmppBytes) missingAssets.push('logo-lpmpp.png');
        if (!ttdBytes) missingAssets.push('ttd-pak-agung.png');
        if (!stempelBytes) missingAssets.push('stempel-lpmpp.png');
        if (missingAssets.length > 0 && !await appConfirm(`Peringatan: aset gambar berikut gagal dimuat (${missingAssets.join(', ')}). Dokumen Word akan dibuat tanpa gambar tersebut. Tetap lanjutkan?`, { title: 'Aset Gambar Tidak Lengkap', okText: 'Tetap Buat Dokumen' })) return;

        const noB = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
        const noBorders = { top: noB, bottom: noB, left: noB, right: noB, insideHorizontal: noB, insideVertical: noB };
        const thinB = { style: BorderStyle.SINGLE, size: 4, color: "000000" };
        const gridBorders = { top: thinB, bottom: thinB, left: thinB, right: thinB, insideHorizontal: thinB, insideVertical: thinB };
        const kopBorders = { top: noB, left: noB, right: noB, insideHorizontal: noB, insideVertical: noB, bottom: { style: BorderStyle.SINGLE, size: 24, color: "000000" } };

        const tnr = (text, opts = {}) => new TextRun({ text, font: "Times New Roman", size: 24, color: "000000", ...opts });
        const arl = (text, sizeHalfPt, bold = false) => new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 0, line: 240 },
            children: [new TextRun({ text, font: "Arial", size: sizeHalfPt, bold, color: "000000" })]
        });

        const kopTable = new Table({
            width: { size: 9616, type: WidthType.DXA },
            columnWidths: [1450, 6566, 1600],
            layout: TableLayoutType.FIXED,
            borders: kopBorders,
            rows: [
                new TableRow({
                    children: [
                        new TableCell({
                            width: { size: 1450, type: WidthType.DXA },
                            verticalAlign: VerticalAlign.CENTER,
                            margins: { top: 0, bottom: 80, left: 0, right: 60 },
                            children: [new Paragraph({
                                alignment: AlignmentType.CENTER,
                                spacing: { before: 0, after: 0 },
                                children: ulmBytes ? [new ImageRun({ data: ulmBytes, transformation: { width: 92, height: 93 } })] : []
                            })]
                        }),
                        new TableCell({
                            width: { size: 6566, type: WidthType.DXA },
                            verticalAlign: VerticalAlign.CENTER,
                            margins: { top: 0, bottom: 80, left: 40, right: 40 },
                            children: [
                                arl("KEMENTERIAN PENDIDIKAN TINGGI, SAINS,", 28, false),
                                arl("DAN TEKNOLOGI", 28, false),
                                arl("UNIVERSITAS LAMBUNG MANGKURAT", 28, false),
                                arl("LEMBAGA PENJAMINAN MUTU DAN", 28, true),
                                arl("PENGEMBANGAN PEMBELAJARAN", 28, true),
                                arl("JL. Brigjen. H. Hasan Basry Kotak Pos 219 Telp. (0511) 3305195 Banjarmasin, 70123", 16, false),
                                arl("Kampus ULM Banjarbaru Telp. (0511) 6144419 Banjarbaru, 70714", 16, false),
                                arl("Email: lpmpp@ulm.ac.id", 20, false)
                            ]
                        }),
                        new TableCell({
                            width: { size: 1600, type: WidthType.DXA },
                            verticalAlign: VerticalAlign.CENTER,
                            margins: { top: 0, bottom: 80, left: 60, right: 0 },
                            children: [new Paragraph({
                                alignment: AlignmentType.CENTER,
                                spacing: { before: 0, after: 0 },
                                children: lpmppBytes ? [new ImageRun({ data: lpmppBytes, transformation: { width: 105, height: 93 } })] : []
                            })]
                        })
                    ]
                })
            ]
        });

        const metaRow = (lbl, val) => new TableRow({
            children: [
                new TableCell({ width: { size: 1450, type: WidthType.DXA }, margins: { top: 20, bottom: 20, left: 0, right: 40 }, children: [new Paragraph({ spacing: { before: 0, after: 0, line: 260 }, children: [tnr(lbl)] })] }),
                new TableCell({ width: { size: 220, type: WidthType.DXA }, margins: { top: 20, bottom: 20, left: 0, right: 40 }, children: [new Paragraph({ spacing: { before: 0, after: 0, line: 260 }, children: [tnr(":")] })] }),
                new TableCell({ width: { size: 7946, type: WidthType.DXA }, margins: { top: 20, bottom: 20, left: 0, right: 0 }, children: [new Paragraph({ spacing: { before: 0, after: 0, line: 260 }, children: [tnr(val)] })] })
            ]
        });

        const kegiatanTable = new Table({
            width: { size: 9616, type: WidthType.DXA },
            columnWidths: [3366, 2400, 1950, 1900],
            layout: TableLayoutType.FIXED,
            borders: gridBorders,
            rows: [
                new TableRow({
                    children: [
                        ["Nama Kegiatan", 3366], ["Tanggal", 2400], ["Tempat", 1950], ["Waktu", 1900]
                    ].map(([txt, w]) => new TableCell({
                        width: { size: w, type: WidthType.DXA },
                        verticalAlign: VerticalAlign.CENTER,
                        margins: { top: 80, bottom: 80, left: 100, right: 100 },
                        children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 0 }, children: [tnr(txt, { bold: true })] })]
                    }))
                }),
                new TableRow({
                    children: [
                        [pel, 3366, AlignmentType.LEFT],
                        [tglPelaksanaan, 2400, AlignmentType.CENTER],
                        [tempat, 1950, AlignmentType.CENTER],
                        [waktu, 1900, AlignmentType.CENTER]
                    ].map(([txt, w, al]) => new TableCell({
                        width: { size: w, type: WidthType.DXA },
                        verticalAlign: VerticalAlign.CENTER,
                        margins: { top: 80, bottom: 80, left: 100, right: 100 },
                        children: [new Paragraph({ alignment: al, spacing: { before: 0, after: 0 }, children: [tnr(txt)] })]
                    }))
                })
            ]
        });

        const lampiranMetaRow = (lbl, val) => new TableRow({
            children: [
                new TableCell({ width: { size: 2400, type: WidthType.DXA }, margins: { top: 20, bottom: 20, left: 0, right: 40 }, children: [new Paragraph({ spacing: { before: 0, after: 0 }, children: [tnr(lbl)] })] }),
                new TableCell({ width: { size: 250, type: WidthType.DXA }, margins: { top: 20, bottom: 20, left: 0, right: 40 }, children: [new Paragraph({ spacing: { before: 0, after: 0 }, children: [tnr(":")] })] }),
                new TableCell({ width: { size: 6966, type: WidthType.DXA }, margins: { top: 20, bottom: 20, left: 0, right: 0 }, children: [new Paragraph({ spacing: { before: 0, after: 0 }, children: [tnr(val)] })] })
            ]
        });

        const pesertaRows = [
            new TableRow({
                tableHeader: true,
                children: [
                    ["No.", 720], ["Nama", 6096], ["Fakultas", 2800]
                ].map(([txt, w]) => new TableCell({
                    width: { size: w, type: WidthType.DXA },
                    verticalAlign: VerticalAlign.CENTER,
                    margins: { top: 70, bottom: 70, left: 100, right: 100 },
                    children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 0 }, children: [tnr(txt, { bold: true })] })]
                }))
            }),
            ...listApproved.map((p, idx) => new TableRow({
                cantSplit: true,
                children: [
                    new TableCell({ width: { size: 720, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER, margins: { top: 55, bottom: 55, left: 80, right: 80 }, children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 0 }, children: [tnr(String(idx + 1))] })] }),
                    new TableCell({ width: { size: 6096, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER, margins: { top: 55, bottom: 55, left: 100, right: 100 }, children: [new Paragraph({ spacing: { before: 0, after: 0 }, children: [tnr(p.nama)] })] }),
                    new TableCell({ width: { size: 2800, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER, margins: { top: 55, bottom: 55, left: 80, right: 80 }, children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 0 }, children: [tnr(p.fakultas)] })] })
                ]
            }))
        ];

        const doc = new Document({
            sections: [{
                properties: {
                    page: {
                        size: { width: 11906, height: 16838 },
                        margin: { top: 2650, right: 850, bottom: 900, left: 1440, header: 567 }
                    }
                },
                headers: { default: new Header({ children: [kopTable] }) },
                children: [
                    new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { before: 0, after: 120, line: 260 }, children: [tnr(`Banjarmasin, ${tglSuratIndo}`)] }),
                    new Table({ width: { size: 9616, type: WidthType.DXA }, columnWidths: [1450, 220, 7946], layout: TableLayoutType.FIXED, borders: noBorders, rows: [
                        metaRow("Nomor", nomorLengkap),
                        metaRow("Lampiran", "1 (satu) berkas"),
                        metaRow("Hal", `Daftar Peserta Kegiatan ${pel}`)
                    ]}),
                    new Paragraph({ spacing: { before: 220, after: 0, line: 260 }, children: [tnr("Kepada Yth,")] }),
                    new Paragraph({ spacing: { before: 0, after: 0, line: 260 }, children: [tnr("Dekan Fakultas")] }),
                    new Paragraph({ spacing: { before: 0, after: 0, line: 260 }, children: [tnr("Universitas Lambung Mangkurat")] }),
                    new Paragraph({ spacing: { before: 0, after: 0, line: 260 }, children: [tnr("di-")] }),
                    new Paragraph({ indent: { left: 450 }, spacing: { before: 0, after: 220, line: 260 }, children: [tnr("Banjarmasin/Banjarbaru")] }),
                    new Paragraph({ spacing: { before: 0, after: 200, line: 260 }, children: [tnr("Dengan Hormat,")] }),
                    new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: { before: 0, after: 180, line: 260 }, children: [
                        tnr(`Berikut kami kirimkan daftar Peserta ${pel} tanggal ${tglPelaksanaan} (terlampir) yang akan dilaksanakan pada:`)
                    ]}),
                    kegiatanTable,
                    new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: { before: 200, after: 180, line: 260 }, children: [
                        tnr("Peserta yang telah terdaftar "),
                        tnr("Wajib", { bold: true }),
                        tnr(" registrasi ulang melalui link https://siplpmpp.my.id/ dan bergabung ke "),
                        tnr("WhatsApp", { italics: true }),
                        tnr(" grup untuk memudahkan koordinasi selama kegiatan berlangsung.")
                    ]}),
                    new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: { before: 0, after: 360, line: 260 }, children: [
                        tnr("Demikian pemberitahuan ini disampaikan, atas perhatian dan kerjasamanya diucapkan terima kasih.")
                    ]}),
                    new Paragraph({
                        indent: { left: 5900 },
                        spacing: { before: 120, after: 0, line: 260 },
                        children: [
                            ...(stempelBytes ? [new ImageRun({
                                data: stempelBytes,
                                transformation: { width: 124, height: 125 },
                                floating: {
                                    horizontalPosition: { relative: HorizontalPositionRelativeFrom.COLUMN, offset: 3060700 },
                                    verticalPosition: { relative: VerticalPositionRelativeFrom.PARAGRAPH, offset: 0 },
                                    behindDocument: true,
                                    allowOverlap: true,
                                    wrap: { type: TextWrappingType.NONE }
                                }
                            })] : []),
                            ...(ttdBytes ? [new ImageRun({
                                data: ttdBytes,
                                transformation: { width: 162, height: 81 },
                                floating: {
                                    horizontalPosition: { relative: HorizontalPositionRelativeFrom.COLUMN, offset: 3826500 },
                                    verticalPosition: { relative: VerticalPositionRelativeFrom.PARAGRAPH, offset: 145000 },
                                    behindDocument: true,
                                    allowOverlap: true,
                                    wrap: { type: TextWrappingType.NONE }
                                }
                            })] : []),
                            tnr("Kepala,")
                        ]
                    }),
                    new Paragraph({ indent: { left: 5900 }, spacing: { before: 1280, after: 0, line: 260 }, children: [tnr("AGUNG NUGROHO", { bold: true })] }),
                    new Paragraph({ indent: { left: 5900 }, spacing: { before: 0, after: 0, line: 260 }, children: [tnr("NIP 198307192008011005")] }),

                    // HALAMAN 2: LAMPIRAN
                    new Paragraph({ children: [new PageBreak()] }),
                    new Paragraph({ spacing: { before: 0, after: 100, line: 260 }, children: [tnr("Lampiran")] }),
                    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 180, line: 260 }, children: [tnr("DAFTAR PESERTA", { bold: true })] }),
                    new Table({ width: { size: 9616, type: WidthType.DXA }, columnWidths: [2400, 250, 6966], layout: TableLayoutType.FIXED, borders: noBorders, rows: [
                        lampiranMetaRow("Kegiatan", pel),
                        lampiranMetaRow("Tanggal Pelaksanaan", tglPelaksanaan)
                    ]}),
                    new Paragraph({ spacing: { before: 140, after: 0 }, children: [] }),
                    new Table({ width: { size: 9616, type: WidthType.DXA }, columnWidths: [720, 6096, 2800], layout: TableLayoutType.FIXED, borders: gridBorders, rows: pesertaRows })
                ]
            }]
        });

        const blob = await Packer.toBlob(doc);
        unduhBlobFile(blob, `Surat_Balasan_${pel.replace(/[^a-zA-Z0-9]/g, '_')}.docx`);
        return;
    }

    // --- MODE CETAK / PDF SURAT BALASAN ---
    const kopSuratHtml = `
        <table class="kop">
            <tr>
                <td style="width:15%; text-align:center;"><img src="${logos.ulm}" style="width:88px; height:89px; object-fit:contain;" alt="ULM"></td>
                <td style="width:69%; text-align:center; font-family: Arial, Helvetica, sans-serif; line-height:1.15;">
                    <div style="font-size:13.5pt; font-weight:normal;">KEMENTERIAN PENDIDIKAN TINGGI, SAINS,</div>
                    <div style="font-size:13.5pt; font-weight:normal;">DAN TEKNOLOGI</div>
                    <div style="font-size:13.5pt; font-weight:normal;">UNIVERSITAS LAMBUNG MANGKURAT</div>
                    <div style="font-size:13.5pt; font-weight:bold;">LEMBAGA PENJAMINAN MUTU DAN</div>
                    <div style="font-size:13.5pt; font-weight:bold;">PENGEMBANGAN PEMBELAJARAN</div>
                    <div style="font-size:8pt; font-weight:normal; margin-top:2px;">JL. Brigjen. H. Hasan Basry Kotak Pos 219 Telp. (0511) 3305195 Banjarmasin, 70123</div>
                    <div style="font-size:8pt; font-weight:normal;">Kampus ULM Banjarbaru Telp. (0511) 6144419 Banjarbaru, 70714</div>
                    <div style="font-size:10pt; font-weight:normal;">Email: lpmpp@ulm.ac.id</div>
                </td>
                <td style="width:16%; text-align:center;"><img src="${logos.lpmpp}" style="width:98px; height:87px; object-fit:contain;" alt="LPMPP"></td>
            </tr>
        </table>`;

    const rowsLampiran = listApproved.map((p, idx) => `
        <tr>
            <td style="text-align:center;">${idx + 1}</td>
            <td>${escapeHtml(p.nama)}</td>
            <td style="text-align:center;">${escapeHtml(p.fakultas)}</td>
        </tr>`).join('');

    const pelSafe = escapeHtml(pel);
    const tglPelSafe = escapeHtml(tglPelaksanaan);
    const tempatSafe = escapeHtml(tempat);
    const waktuSafe = escapeHtml(waktu);
    const nomorSafe = escapeHtml(nomorLengkap);
    const tglSuratSafe = escapeHtml(tglSuratIndo);

    const html = `<!DOCTYPE html>
    <html><head><meta charset="UTF-8"><title></title>
    <style>
        @page { size: A4 portrait; margin: 0; }
        * { box-sizing: border-box; }
        body { margin: 0; padding: 0; font-family: "Times New Roman", Times, serif; font-size: 12pt; line-height: 1.25; color: #000; background: #fff; }
        .page { width: 210mm; min-height: 297mm; padding: 12mm 15mm 15mm 25mm; page-break-after: always; }
        .page:last-child { page-break-after: auto; }
        .kop { width: 100%; border-collapse: collapse; border-bottom: 3px solid #000; margin-bottom: 14px; }
        .kop td { border: none; vertical-align: middle; padding-bottom: 6px; }
        table.meta { border-collapse: collapse; margin-bottom: 14px; }
        table.meta td { border: none; padding: 1px 4px 1px 0; vertical-align: top; }
        table.data { width: 100%; border-collapse: collapse; margin: 12px 0; }
        table.data th, table.data td { border: 1px solid #000; padding: 5px 8px; font-size: 12pt; }
        table.data th { font-weight: bold; text-align: center; background: #fff; }
        p { margin: 0 0 11px 0; }
        .ttd-wrap { width: 240px; margin-left: auto; margin-top: 26px; text-align: left; line-height: 1.3; }
    </style></head><body>
        <div class="page">
            ${kopSuratHtml}
            <div style="text-align:right; margin-bottom:10px;">Banjarmasin, ${tglSuratSafe}</div>
            <table class="meta">
                <tr><td style="width:90px;">Nomor</td><td style="width:14px;">:</td><td>${nomorSafe}</td></tr>
                <tr><td>Lampiran</td><td>:</td><td>1 (satu) berkas</td></tr>
                <tr><td>Hal</td><td>:</td><td>Daftar Peserta Kegiatan ${pelSafe}</td></tr>
            </table>

            <p style="margin-bottom:14px;">
                Kepada Yth,<br>
                Dekan Fakultas<br>
                Universitas Lambung Mangkurat<br>
                di-<br>
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Banjarmasin/Banjarbaru
            </p>

            <p>Dengan Hormat,</p>
            <p style="text-align:justify;">Berikut kami kirimkan daftar Peserta ${pelSafe} tanggal ${tglPelSafe} (terlampir) yang akan dilaksanakan pada:</p>

            <table class="data">
                <thead><tr><th style="width:35%;">Nama Kegiatan</th><th style="width:25%;">Tanggal</th><th style="width:20%;">Tempat</th><th style="width:20%;">Waktu</th></tr></thead>
                <tbody>
                    <tr>
                        <td>${pelSafe}</td>
                        <td style="text-align:center;">${tglPelSafe}</td>
                        <td style="text-align:center;">${tempatSafe}</td>
                        <td style="text-align:center;">${waktuSafe}</td>
                    </tr>
                </tbody>
            </table>

            <p style="text-align:justify;">Peserta yang telah terdaftar <b>Wajib</b> registrasi ulang melalui link https://siplpmpp.my.id/ dan bergabung ke <i>WhatsApp</i> grup untuk memudahkan koordinasi selama kegiatan berlangsung.</p>
            <p style="text-align:justify;">Demikian pemberitahuan ini disampaikan, atas perhatian dan kerjasamanya diucapkan terima kasih.</p>

            <div class="ttd-wrap" style="position:relative;">
                <img src="${logos.stempel}" style="position:absolute; left:-68px; top:0px; width:124px; height:125px; object-fit:contain; z-index:1; pointer-events:none;" alt="Stempel LPMPP">
                <img src="${logos.ttdKepala}" style="position:absolute; left:10px; top:14px; width:162px; height:81px; object-fit:contain; z-index:2; pointer-events:none;" alt="TTD Kepala">
                <div style="position:relative; z-index:3;">
                    <div>Kepala,</div>
                    <div style="height:82px;"></div>
                    <div><b>AGUNG NUGROHO</b></div>
                    <div>NIP 198307192008011005</div>
                </div>
            </div>
        </div>

        <div class="page">
            ${kopSuratHtml}
            <p style="margin-bottom:4px;">Lampiran</p>
            <div style="text-align:center; font-weight:bold; font-size:12pt; margin:4px 0 12px 0;">DAFTAR PESERTA</div>
            <table class="meta" style="margin-bottom:10px;">
                <tr><td style="width:155px;">Kegiatan</td><td style="width:14px;">:</td><td>${pelSafe}</td></tr>
                <tr><td>Tanggal Pelaksanaan</td><td>:</td><td>${tglPelSafe}</td></tr>
            </table>
            <table class="data">
                <thead><tr><th style="width:45px;">No.</th><th>Nama</th><th style="width:190px;">Fakultas</th></tr></thead>
                <tbody>${rowsLampiran}</tbody>
            </table>
        </div>
    </body></html>`;

    cetakHtmlBersih(html);
}

// =========================================================================
// 2. GENERATE LEMBAR PRESENSI LURING (PDF & NATIVE DOCX PERSIS TEMPLATE ASLI)
// =========================================================================
async function generateLembarPresensi(mode) {
    const pel = document.getElementById('filterPelPengajuan').value;
    if (!pel) return showToast("Pilih pelatihan terlebih dahulu.", 'warning');

    const fFakAktif = document.getElementById('filterFakPengajuan').value;
    if (fFakAktif && !await appConfirm(`Filter Fakultas saat ini aktif pada "${fFakAktif}". Lembar Presensi hanya akan memuat peserta dari fakultas tersebut. Lanjutkan?`, { title: 'Filter Fakultas Aktif', okText: 'Ya, Lanjutkan' })) return;

    const listApproved = ambilPesertaApprovedPerFakultas();
    if (listApproved.length === 0) return showToast("Belum ada calon peserta berstatus Approved untuk pelatihan ini.", 'warning');

    const panitiaAktif = ambilPanitiaTerpilih();
    const semuaBaris = listApproved.map(p => ({ nama: p.nama, unit: p.fakultas }))
        .concat(panitiaAktif.map(nm => ({ nama: nm, unit: "LPMPP" })));

    const tglTerbitIndo = "2 Desember 2024";
    let hariTglKegiatan = document.getElementById('docHariTglPresensi').value.trim();
    if (!hariTglKegiatan && window.pelatihanData) {
        const found = window.pelatihanData.find(p => p.nama === pel);
        if (found && found.info) hariTglKegiatan = found.info.split("|")[0].trim();
    }

    const logos = getLogoUrls();

    // --- MODE DOCX LEMBAR PRESENSI (DOCX.JS LAZY LOADED) ---
    if (mode === 'docx' || mode === 'doc') {
        const docxOk = await ensureDocxLoaded();
        if (!docxOk || !window.docx) return;
        const {
            Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
            WidthType, BorderStyle, AlignmentType, VerticalAlign, ImageRun, Header, PageNumber, HeightRule, TableLayoutType
        } = window.docx;

        const [ulmBytes, lpmppBytes] = await Promise.all([
            fetchLogoBytes(logos.ulm),
            fetchLogoBytes(logos.lpmpp)
        ]);

        const missingLogos = [];
        if (!ulmBytes) missingLogos.push('logo-ulm.png');
        if (!lpmppBytes) missingLogos.push('logo-lpmpp.png');
        if (missingLogos.length > 0 && !await appConfirm(`Peringatan: logo gagal dimuat (${missingLogos.join(', ')}). Dokumen Word akan dibuat tanpa logo tersebut. Tetap lanjutkan?`, { title: 'Logo Tidak Lengkap', okText: 'Tetap Buat Dokumen' })) return;

        const noB = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
        const noBorders = { top: noB, bottom: noB, left: noB, right: noB, insideHorizontal: noB, insideVertical: noB };
        const thinB = { style: BorderStyle.SINGLE, size: 4, color: "000000" };
        const gridBorders = { top: thinB, bottom: thinB, left: thinB, right: thinB, insideHorizontal: thinB, insideVertical: thinB };

        const ar = (text, sizeHalfPt, bold = false) => new TextRun({ text, font: "Arial", size: sizeHalfPt, bold, color: "000000" });
        const arCenter = (text, sizeHalfPt, bold = false) => new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 0, line: 230 },
            children: [ar(text, sizeHalfPt, bold)]
        });

        // SATU TABEL HEADER UTUH (Grid 5 Kolom: 1650 + 2125 + 2245 + 2535 + 1650 = 10205 DXA)
        const hdrTable = new Table({
            width: { size: 10205, type: WidthType.DXA },
            columnWidths: [1650, 2125, 2245, 2535, 1650],
            layout: TableLayoutType.FIXED,
            borders: gridBorders,
            rows: [
                // Baris 1: Logo ULM | Judul Instansi (span 3 = 6905 DXA) | Logo LPMPP
                new TableRow({
                    children: [
                        new TableCell({
                            width: { size: 1650, type: WidthType.DXA },
                            verticalAlign: VerticalAlign.CENTER,
                            margins: { top: 60, bottom: 60, left: 60, right: 60 },
                            children: [new Paragraph({
                                alignment: AlignmentType.CENTER,
                                spacing: { before: 0, after: 0 },
                                children: ulmBytes ? [new ImageRun({ data: ulmBytes, transformation: { width: 74, height: 75 } })] : []
                            })]
                        }),
                        new TableCell({
                            columnSpan: 3,
                            width: { size: 6905, type: WidthType.DXA },
                            verticalAlign: VerticalAlign.CENTER,
                            margins: { top: 60, bottom: 60, left: 40, right: 40 },
                            children: [
                                arCenter("KEMENTERIAN PENDIDIKAN TINGGI, SAINS DAN TEKNOLOGI", 20, true),
                                arCenter("UNIVERSITAS LAMBUNG MANGKURAT", 24, true),
                                arCenter("LEMBAGA PENJAMINAN MUTU DAN", 24, true),
                                arCenter("PENGEMBANGAN PEMBELAJARAN", 24, true),
                                arCenter("(LPMPP)", 24, true)
                            ]
                        }),
                        new TableCell({
                            width: { size: 1650, type: WidthType.DXA },
                            verticalAlign: VerticalAlign.CENTER,
                            margins: { top: 60, bottom: 60, left: 60, right: 60 },
                            children: [new Paragraph({
                                alignment: AlignmentType.CENTER,
                                spacing: { before: 0, after: 0 },
                                children: lpmppBytes ? [new ImageRun({ data: lpmppBytes, transformation: { width: 84, height: 75 } })] : []
                            })]
                        })
                    ]
                }),
                // Baris 2: FORMULIR (span 5 = 10205 DXA)
                new TableRow({
                    children: [
                        new TableCell({
                            columnSpan: 5,
                            width: { size: 10205, type: WidthType.DXA },
                            margins: { top: 30, bottom: 30, left: 60, right: 60 },
                            children: [arCenter("F O R M U L I R", 20, true)]
                        })
                    ]
                }),
                // Baris 3: DAFTAR HADIR KEGIATAN (span 5 = 10205 DXA)
                new TableRow({
                    children: [
                        new TableCell({
                            columnSpan: 5,
                            width: { size: 10205, type: WidthType.DXA },
                            margins: { top: 40, bottom: 40, left: 60, right: 60 },
                            children: [arCenter("DAFTAR HADIR KEGIATAN", 23, true)]
                        })
                    ]
                }),
                // Baris 4: Header Meta (Kode. Dok span 2 = 3775 | Revisi 2245 | Tgl Terbit 2535 | Halaman 1650)
                new TableRow({
                    children: [
                        new TableCell({ columnSpan: 2, width: { size: 3775, type: WidthType.DXA }, margins: { top: 25, bottom: 25, left: 80, right: 80 }, children: [new Paragraph({ spacing: { before: 0, after: 0 }, children: [ar("Kode. Dok", 17, false)] })] }),
                        new TableCell({ width: { size: 2245, type: WidthType.DXA }, margins: { top: 25, bottom: 25, left: 80, right: 80 }, children: [new Paragraph({ spacing: { before: 0, after: 0 }, children: [ar("Revisi", 17, false)] })] }),
                        new TableCell({ width: { size: 2535, type: WidthType.DXA }, margins: { top: 25, bottom: 25, left: 80, right: 80 }, children: [new Paragraph({ spacing: { before: 0, after: 0 }, children: [ar("Tgl Terbit", 17, false)] })] }),
                        new TableCell({ width: { size: 1650, type: WidthType.DXA }, margins: { top: 25, bottom: 25, left: 80, right: 80 }, children: [new Paragraph({ spacing: { before: 0, after: 0 }, children: [ar("Halaman", 17, false)] })] })
                    ]
                }),
                // Baris 5: Isi Meta
                new TableRow({
                    children: [
                        new TableCell({ columnSpan: 2, width: { size: 3775, type: WidthType.DXA }, margins: { top: 25, bottom: 25, left: 80, right: 80 }, children: [new Paragraph({ spacing: { before: 0, after: 0 }, children: [ar("LPMPP–FRM-SEK-22", 17, false)] })] }),
                        new TableCell({ width: { size: 2245, type: WidthType.DXA }, margins: { top: 25, bottom: 25, left: 80, right: 80 }, children: [new Paragraph({ spacing: { before: 0, after: 0 }, children: [ar("07", 17, false)] })] }),
                        new TableCell({ width: { size: 2535, type: WidthType.DXA }, margins: { top: 25, bottom: 25, left: 80, right: 80 }, children: [new Paragraph({ spacing: { before: 0, after: 0 }, children: [ar(tglTerbitIndo, 17, false)] })] }),
                        new TableCell({ width: { size: 1650, type: WidthType.DXA }, margins: { top: 25, bottom: 25, left: 80, right: 80 }, children: [new Paragraph({
                            spacing: { before: 0, after: 0 },
                            children: [
                                new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 17, color: "000000" }),
                                ar(" dari ", 17, false),
                                new TextRun({ children: [PageNumber.TOTAL_PAGES], font: "Arial", size: 17, color: "000000" })
                            ]
                        })] })
                    ]
                })
            ]
        });

        const infoRow = (lbl, val) => new TableRow({
            children: [
                new TableCell({ width: { size: 2300, type: WidthType.DXA }, margins: { top: 20, bottom: 20, left: 40, right: 40 }, children: [new Paragraph({ spacing: { before: 0, after: 0 }, children: [ar(lbl, 21, false)] })] }),
                new TableCell({ width: { size: 250, type: WidthType.DXA }, margins: { top: 20, bottom: 20, left: 0, right: 40 }, children: [new Paragraph({ spacing: { before: 0, after: 0 }, children: [ar(":", 21, false)] })] }),
                new TableCell({ width: { size: 7655, type: WidthType.DXA }, margins: { top: 20, bottom: 20, left: 0, right: 0 }, children: [new Paragraph({ spacing: { before: 0, after: 0 }, children: [ar(val, 21, false)] })] })
            ]
        });

        const presensiRows = [
            new TableRow({
                tableHeader: true,
                height: { value: 450, rule: HeightRule.ATLEAST },
                children: [
                    ["NO", 715], ["NAMA", 4690], ["UNIT KERJA", 2150], ["TANDA TANGAN", 2650]
                ].map(([txt, w]) => new TableCell({
                    width: { size: w, type: WidthType.DXA },
                    verticalAlign: VerticalAlign.CENTER,
                    margins: { top: 60, bottom: 60, left: 80, right: 80 },
                    children: [arCenter(txt, 20, false)]
                }))
            }),
            ...semuaBaris.map((item, idx) => {
                const no = idx + 1;
                const isOdd = (no % 2 === 1);
                return new TableRow({
                    cantSplit: true,
                    height: { value: 650, rule: HeightRule.ATLEAST },
                    children: [
                        new TableCell({ width: { size: 715, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER, margins: { top: 80, bottom: 80, left: 60, right: 60 }, children: [arCenter(String(no), 20, false)] }),
                        new TableCell({ width: { size: 4690, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER, margins: { top: 80, bottom: 80, left: 100, right: 80 }, children: [new Paragraph({ spacing: { before: 0, after: 0 }, children: [ar(item.nama, 20, false)] })] }),
                        new TableCell({ width: { size: 2150, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER, margins: { top: 80, bottom: 80, left: 60, right: 60 }, children: [arCenter(item.unit, 20, false)] }),
                        new TableCell({ width: { size: 2650, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER, margins: { top: 80, bottom: 80, left: 100, right: 80 }, children: [new Paragraph({
                            alignment: isOdd ? AlignmentType.LEFT : AlignmentType.CENTER,
                            spacing: { before: 0, after: 0 },
                            children: [ar(String(no), 20, false)]
                        })] })
                    ]
                });
            })
        ];

        const doc = new Document({
            sections: [{
                properties: {
                    page: {
                        size: { width: 11906, height: 16838 },
                        margin: { top: 3150, right: 794, bottom: 680, left: 907, header: 450 }
                    }
                },
                headers: {
                    default: new Header({
                        children: [
                            hdrTable,
                            new Paragraph({ spacing: { before: 0, after: 80 }, children: [new TextRun({ text: "", size: 4 })] })
                        ]
                    })
                },
                children: [
                    new Table({ width: { size: 10205, type: WidthType.DXA }, columnWidths: [2300, 250, 7655], layout: TableLayoutType.FIXED, borders: noBorders, rows: [
                        infoRow("Hari, Tanggal", hariTglKegiatan),
                        infoRow("Nama Kegiatan", pel)
                    ]}),
                    new Paragraph({ spacing: { before: 100, after: 0 }, children: [] }),
                    new Table({ width: { size: 10205, type: WidthType.DXA }, columnWidths: [715, 4690, 2150, 2650], layout: TableLayoutType.FIXED, borders: gridBorders, rows: presensiRows }),
                    new Paragraph({ indent: { left: 5700 }, spacing: { before: 320, after: 0, line: 260 }, children: [ar("Sekretaris,", 21, false)] }),
                    new Paragraph({ indent: { left: 5700 }, spacing: { before: 840, after: 0, line: 260 }, children: [ar("Prof. Dr. Arif Sholahuddin, S.Pd., M.Si", 21, false)] }),
                    new Paragraph({ indent: { left: 5700 }, spacing: { before: 0, after: 0, line: 260 }, children: [ar("NIP. 196902141994031003", 21, false)] })
                ]
            }]
        });

        const blob = await Packer.toBlob(doc);
        unduhBlobFile(blob, `Lembar_Presensi_${pel.replace(/[^a-zA-Z0-9]/g, '_')}.docx`);
        return;
    }

    // --- MODE CETAK / PDF LEMBAR PRESENSI (AUTO-PAGINATION BERBASIS TINGGI NYATA A4) ---
    const pelSafe = escapeHtml(pel);
    const hariTglSafe = escapeHtml(hariTglKegiatan);

    const allRowsHtml = semuaBaris.map((item, idx) => {
        const no = idx + 1;
        const ttdHtml = (no % 2 === 1)
            ? `<div style="text-align:left; padding-left:4px;">${no}</div>`
            : `<div style="text-align:center;">${no}</div>`;
        return `
        <tr>
            <td style="text-align:center;">${no}</td>
            <td style="padding-left:8px;">${escapeHtml(item.nama)}</td>
            <td style="text-align:center;">${escapeHtml(item.unit)}</td>
            <td>${ttdHtml}</td>
        </tr>`;
    }).join('');

    const html = `<!DOCTYPE html>
    <html><head><meta charset="UTF-8"><title></title>
    <style>
        @page { size: A4 portrait; margin: 0; }
        * { box-sizing: border-box; }
        body { margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; font-size: 10pt; color: #000; background: #fff; }
        .page { width: 210mm; min-height: 295mm; padding: 11mm 14mm 10mm 16mm; page-break-after: always; }
        .page:last-child { page-break-after: auto; min-height: auto; }
        table { border-collapse: collapse; width: 100%; }
        .form-header td { border: 1px solid #000; vertical-align: middle; }
        .form-meta { margin-top: -1px; margin-bottom: 8px; }
        .form-meta td { border: 1px solid #000; padding: 2px 6px; font-size: 8.5pt; }
        .info-kegiatan { margin: 4px 0 8px 0; font-size: 10.5pt; line-height: 1.3; }
        .info-kegiatan td { border: none; padding: 1px 4px; }
        .presensi-table th, .presensi-table td { border: 1px solid #000; padding: 5px 6px; font-size: 10pt; line-height: 1.2; }
        .presensi-table th { text-align: center; font-weight: normal; height: 30px; }
        .presensi-table td { height: 40px; }
        .ttd-sekretaris { width: 270px; margin-left: auto; margin-top: 18px; font-size: 10.5pt; line-height: 1.35; page-break-inside: avoid; }
    </style></head><body>
        <div id="probeUsableH" style="position:absolute; visibility:hidden; height:274mm; pointer-events:none;"></div>
        <div id="presensiStaging" class="page">
            <table class="form-header">
                <tr>
                    <td style="width:17%; text-align:center; padding:5px;"><img src="${logos.ulm}" style="width:74px; height:75px; object-fit:contain;" alt="ULM"></td>
                    <td style="width:66%; text-align:center; padding:5px; font-weight:bold; line-height:1.18;">
                        <div style="font-size:10.5pt;">KEMENTERIAN PENDIDIKAN TINGGI, SAINS DAN TEKNOLOGI</div>
                        <div style="font-size:13pt;">UNIVERSITAS LAMBUNG MANGKURAT</div>
                        <div style="font-size:13pt;">LEMBAGA PENJAMINAN MUTU DAN</div>
                        <div style="font-size:13pt;">PENGEMBANGAN PEMBELAJARAN</div>
                        <div style="font-size:13pt;">(LPMPP)</div>
                    </td>
                    <td style="width:17%; text-align:center; padding:5px;"><img src="${logos.lpmpp}" style="width:84px; height:75px; object-fit:contain;" alt="LPMPP"></td>
                </tr>
                <tr><td colspan="3" style="text-align:center; font-weight:bold; font-size:10pt; letter-spacing:2.5px; padding:2px;">FORMULIR</td></tr>
                <tr><td colspan="3" style="text-align:center; font-weight:bold; font-size:11.5pt; padding:3px;">DAFTAR HADIR KEGIATAN</td></tr>
            </table>
            <table class="form-meta">
                <tr>
                    <td style="width:37%;">Kode. Dok</td>
                    <td style="width:22%;">Revisi</td>
                    <td style="width:27%;">Tgl Terbit</td>
                    <td style="width:14%;">Halaman</td>
                </tr>
                <tr>
                    <td>LPMPP–FRM-SEK-22</td>
                    <td>07</td>
                    <td>${tglTerbitIndo}</td>
                    <td class="cell-halaman">1 dari 1</td>
                </tr>
            </table>
            <table class="info-kegiatan">
                <tr><td style="width:145px;">Hari, Tanggal</td><td style="width:12px;">:</td><td>${hariTglSafe}</td></tr>
                <tr><td>Nama Kegiatan</td><td>:</td><td>${pelSafe}</td></tr>
            </table>
            <table class="presensi-table">
                <thead>
                    <tr>
                        <th style="width:7%;">NO</th>
                        <th style="width:46%;">NAMA</th>
                        <th style="width:21%;">UNIT KERJA</th>
                        <th style="width:26%;">TANDA TANGAN</th>
                    </tr>
                </thead>
                <tbody>${allRowsHtml}</tbody>
            </table>
            <div class="ttd-sekretaris">
                Sekretaris,<br><br><br><br>
                Prof. Dr. Arif Sholahuddin, S.Pd., M.Si<br>
                NIP. 196902141994031003
            </div>
        </div>
    </body></html>`;

    cetakHtmlBersih(html, (win) => {
        const doc = win.document;
        const staging = doc.getElementById('presensiStaging');
        const probe = doc.getElementById('probeUsableH');
        if (!staging || !probe) return;

        const maxH = probe.getBoundingClientRect().height || 1035;
        const outerH = (el) => {
            if (!el) return 0;
            const r = el.getBoundingClientRect();
            const cs = win.getComputedStyle(el);
            return r.height + (parseFloat(cs.marginTop) || 0) + (parseFloat(cs.marginBottom) || 0);
        };

        const hdrEl = staging.querySelector('.form-header');
        const metaEl = staging.querySelector('.form-meta');
        const infoEl = staging.querySelector('.info-kegiatan');
        const tableEl = staging.querySelector('.presensi-table');
        const theadEl = tableEl.querySelector('thead');
        const rowEls = Array.from(tableEl.querySelectorAll('tbody tr'));
        const ttdEl = staging.querySelector('.ttd-sekretaris');

        const headerBlockH = outerH(hdrEl) + outerH(metaEl);
        const infoH = outerH(infoEl);
        const spacerH = 10;
        const theadH = theadEl.getBoundingClientRect().height;
        const ttdH = outerH(ttdEl);
        const rowItems = rowEls.map(el => ({ el, h: el.getBoundingClientRect().height }));

        const pages = [];
        let curPage = [];
        let curH = headerBlockH + infoH + theadH;

        for (const item of rowItems) {
            if (curPage.length > 0 && curH + item.h > maxH) {
                pages.push(curPage);
                curPage = [];
                curH = headerBlockH + spacerH + theadH;
            }
            curPage.push(item);
            curH += item.h;
        }
        if (curPage.length > 0) pages.push(curPage);

        // Pastikan blok TTD Sekretaris muat di halaman terakhir tanpa terpotong
        if (pages.length > 0) {
            const lastIdx = pages.length - 1;
            let lastH = headerBlockH + (lastIdx === 0 ? infoH : spacerH) + theadH;
            pages[lastIdx].forEach(it => { lastH += it.h; });

            if (lastH + ttdH > maxH) {
                if (pages[lastIdx].length > 2) {
                    pages.push(pages[lastIdx].splice(-2));
                } else if (pages[lastIdx].length > 1) {
                    pages.push(pages[lastIdx].splice(-1));
                } else {
                    pages.push([]);
                }
            }
        }

        const totalPages = Math.max(1, pages.length);
        const frag = doc.createDocumentFragment();

        pages.forEach((pageRows, pIdx) => {
            const pageDiv = doc.createElement('div');
            pageDiv.className = 'page';

            pageDiv.appendChild(hdrEl.cloneNode(true));
            const metaClone = metaEl.cloneNode(true);
            const halCell = metaClone.querySelector('.cell-halaman');
            if (halCell) halCell.textContent = `${pIdx + 1} dari ${totalPages}`;
            pageDiv.appendChild(metaClone);

            if (pIdx === 0) {
                pageDiv.appendChild(infoEl.cloneNode(true));
            } else {
                const sp = doc.createElement('div');
                sp.style.height = '10px';
                pageDiv.appendChild(sp);
            }

            if (pageRows.length > 0) {
                const tbl = doc.createElement('table');
                tbl.className = 'presensi-table';
                tbl.appendChild(theadEl.cloneNode(true));
                const tb = doc.createElement('tbody');
                pageRows.forEach(it => tb.appendChild(it.el));
                tbl.appendChild(tb);
                pageDiv.appendChild(tbl);
            }

            if (pIdx === totalPages - 1) {
                pageDiv.appendChild(ttdEl.cloneNode(true));
            }
            frag.appendChild(pageDiv);
        });

        doc.body.innerHTML = '';
        doc.body.appendChild(frag);
    });
}
