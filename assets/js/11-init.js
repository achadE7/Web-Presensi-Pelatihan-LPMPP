// 11-init.js — Inisialisasi aplikasi setelah seluruh modul dan DOM siap

(function initSiplpmppApp() {
    const formReg = document.getElementById('formFieldsReg');
    if (formReg) formReg.innerHTML = buildBiodataFields('reg');
    const formEdit = document.getElementById('formFieldsEdit');
    if (formEdit) formEdit.innerHTML = buildBiodataFields('edit');
    setTanggalHariIni();
    pulihkanSesiLogin();
    if (!session.token && (window.location.hash || '').replace(/^#/, '') === 'daftar') {
        bukaHalamanRegister();
    }
})();
