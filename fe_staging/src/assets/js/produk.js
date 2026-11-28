// ---------- Helper ----------
const $ = (id) => document.getElementById(id);
const show = (id, on = true) => { $(id).hidden = !on; };
function showAlert(id, message) { $(id).textContent = message; show(id); }
function hideAlert(id) { show(id, false); }
function el(tag, text, cls) {
  const e = document.createElement(tag);
  if (text !== undefined) e.textContent = text;
  if (cls) e.className = cls;
  return e;
}
function notify(msg) { showAlert("notice", msg); $("notice").focus(); }
const fld = (id) => $(id).closest(".field");

// Pesan sesuai dokumen UC22 sampai UC24 (ejaan mengikuti dokumen)
const MSG_TAMBAH_OK = "Produk berhasil ditambahkan";
const MSG_UBAH_OK = "Berhasil mengubah data produk";
const MSG_HAPUS_OK = "Produk berhasil di hapus";
const MSG_FORMAT = "Format data yang diinputkan tidak sesuai";
const MSG_LENGKAP_TAMBAH = "Data produk belum lengkap. Silakan lengkapi seluruh data";   // UC22
const MSG_LENGKAP_UBAH = "Data produk belum lengkap. Silahkan lengkapi seluruh data";    // UC23

// Format sesuai dokumen: nama maksimal 50 karakter; stok dan harga Decimal (10,2); foto berupa gambar;
// Tanggal Pengambilan berupa Date (YYYY-MM-DD) dan Jam Pengambilan berupa Time (HH:MM).
const ANGKA = /^\d{1,8}(\.\d{1,2})?$/;
const FORMAT_TANGGAL = /^\d{4}-\d{2}-\d{2}$/;
const FORMAT_JAM = /^([01]\d|2[0-3]):[0-5]\d$/;

// Nama field tanggal dan jam pengambilan pada permintaan ke BE.
// BELUM dipastikan dengan backend: samakan dengan field di request validasi produk.
const FIELD_BE = { tanggal: "tanggal_pengambilan", jam: "jam_pengambilan" };

// ---------- Satuan produk: kg atau pcs ----------
// Field baru "satuan" ("kg" / "pcs"). Produk lama tanpa satuan dianggap kg.
const bacaSatuan = (it) => (String((it && (it.satuan ?? it.unit)) ?? "").toLowerCase().trim() === "pcs" ? "pcs" : "kg");
const MSG_STOK_PCS = "Stok dengan satuan pcs harus berupa bilangan bulat";

// ---------- Jadwal pengambilan per produk ----------
// Bentuk: [{ tanggal: "2026-11-27", jam: ["08:00", "10:00"] }, ...]
// Dikirim ke BE sebagai "jadwal_pengambilan". Field lama tanggal_pengambilan / jam_pengambilan
// tetap ikut dikirim (diisi tanggal dan jam paling awal) supaya BE yang belum diubah tetap jalan.
const MSG_TGL_LEWAT = "Tanggal pengambilan tidak boleh sudah lewat";
const MSG_TGL_SAMA = "Tanggal pengambilan tidak boleh sama";
const MSG_JAM_SAMA = "Jam pengambilan pada tanggal yang sama tidak boleh sama";
const pad2 = (n) => String(n).padStart(2, "0");
const todayISO = () => { const d = new Date(); return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()); };

function bacaJadwal(it) {
  const hasil = [];
  const tambah = (tgl, jam) => {
    tgl = tanggalYMD(tgl);
    jam = jamHHMM(jam && typeof jam === "object" ? (jam.jam ?? jam.jam_pengambilan) : jam);
    if (!tgl) return;
    let row = hasil.find((r) => r.tanggal === tgl);
    if (!row) { row = { tanggal: tgl, jam: [] }; hasil.push(row); }
    if (jam && !row.jam.includes(jam)) row.jam.push(jam);
  };
  const arr = it && (it.jadwal_pengambilan ?? it.jadwal);
  if (Array.isArray(arr)) {
    arr.forEach((r) => {
      const tgl = r.tanggal ?? r.tanggal_pengambilan;
      const js = r.jam ?? r.jam_pengambilan ?? r.jam_list;
      if (Array.isArray(js)) js.forEach((j) => tambah(tgl, j)); else tambah(tgl, js);
    });
  } else if (it && it[FIELD_BE.tanggal]) {
    tambah(it[FIELD_BE.tanggal], it[FIELD_BE.jam]);
  }
  hasil.forEach((r) => r.jam.sort());
  return hasil.sort((a, b) => a.tanggal.localeCompare(b.tanggal));
}
// Untuk form ubah: hanya tanggal yang belum lewat
const jadwalAktif = (p) => (p.jadwal || [])
  .filter((r) => r.tanggal >= todayISO())
  .map((r) => ({ tanggal: r.tanggal, jam: r.jam.length ? [...r.jam] : [""] }));

const fmtStok = (n, satuan = "kg") => Number(n).toLocaleString("id-ID", { maximumFractionDigits: satuan === "pcs" ? 0 : 2 }) + " " + satuan;
const fmtHarga = (n, satuan) => "Rp " + Number(n).toLocaleString("id-ID", { maximumFractionDigits: 2 }) + (satuan ? " / " + satuan : "");
const jamHHMM = (v) => String(v || "").slice(0, 5); // BE kadang mengirim "HH:MM:SS"; input jam memakai "HH:MM"
const tanggalYMD = (v) => String(v || "").slice(0, 10);

// ---------- Data Produk (Hanya jual Selada Hijau Segar, stok menyesuaikan panen/budidaya) ----------
const MOCK_KEY = "mock_produk";
const fotoContoh = (warna) => "data:image/svg+xml;utf8," + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect width="400" height="300" fill="#dde8b0"/><circle cx="200" cy="160" r="86" fill="${warna}"/><circle cx="200" cy="160" r="52" fill="#ecf39e" opacity=".7"/></svg>`);

// Hitung stok siap jual yang otomatis menyesuaikan hasil panen atau batch siap panen
function hitungStokDariPanenDanBudidaya() {
  try {
    const rawPanen = localStorage.getItem("mock_panen_v1");
    const listPanen = rawPanen ? JSON.parse(rawPanen) : [];
    const totalPanenKg = listPanen.reduce((tot, p) => tot + Number(p.berat_panen || 0), 0);

    // Ambil data batch budidaya
    const rawBudidaya = localStorage.getItem("mock_budidaya_v2");
    const listBudidaya = rawBudidaya ? JSON.parse(rawBudidaya) : [];

    // Hitung batch yang berada di fase Panen atau umur >= 45 hari (siap panen)
    let estimasiPanenKg = 0;
    listBudidaya.forEach((b) => {
      const tanam = b.tanggal_tanam;
      const umur = tanam ? Math.max(0, Math.floor((new Date() - new Date(tanam + "T00:00:00")) / 86400000)) : 0;
      const faseTerakhir = b.fase && b.fase.length ? b.fase[b.fase.length - 1].id_fase : 1;
      if ((faseTerakhir === 4 || umur >= 45) && !listPanen.some((p) => p.id_budidaya === b.id_budidaya)) {
        estimasiPanenKg += Number(b.jumlah_tanaman || 100) * 0.2; // ~200g per tanaman
      }
    });

    const totalStok = totalPanenKg + estimasiPanenKg;
    return totalStok > 0 ? Number(totalStok.toFixed(2)) : 50.0;
  } catch (_) {
    return 50.0;
  }
}

let produk = [{
  id_produk: 1,
  nama_produk: "Selada Hijau Segar",
  deskripsi: "Selada hijau hidroponik super segar dipanen langsung dari Sepasang Petani Farm (Kebonsari, Sumbersari, Jember). Renyah, manis, bebas pestisida.",
  stok: hitungStokDariPanenDanBudidaya(),
  harga: 15000,
  foto_produk: fotoContoh("#4F772D"),
  satuan: "kg",
  jadwal: [],
}];

function persist() {
  try {
    localStorage.setItem(MOCK_KEY, JSON.stringify(produk));
    return true;
  } catch (_) {
    try {
      const sanitized = produk.map((p) => ({
        ...p,
        foto_produk: (typeof p.foto_produk === "string" && p.foto_produk.startsWith("data:image")) ? "" : p.foto_produk,
      }));
      localStorage.setItem(MOCK_KEY, JSON.stringify(sanitized));
      return true;
    } catch (e2) {
      return false;
    }
  }
}

async function loadProdukFromBackend() {
  let stokTersedia = hitungStokDariPanenDanBudidaya();

  if (typeof USE_MOCK !== "undefined" && !USE_MOCK && typeof apiFetch === "function") {
    try {
      // Ambil data budidaya & panen dari backend untuk sinkronisasi stok panen
      try {
        const resBudidaya = await apiFetch((typeof ENDPOINTS !== "undefined" ? ENDPOINTS.budidaya : "/pengelolaan") + "?per_page=100");
        if (resBudidaya && resBudidaya.ok) {
          const jsonB = await resBudidaya.json();
          const batches = Array.isArray(jsonB.data) ? jsonB.data : (jsonB.data?.data || []);
          let hitungKg = 0;
          batches.forEach((b) => {
            const panenList = b.panen || [];
            if (panenList.length > 0) {
              panenList.forEach((pn) => { hitungKg += Number(pn.berat_panen || pn.berat_total_kg || 0); });
            } else {
              const tanam = b.tanggal_tanam || b.seed_date;
              const umur = tanam ? Math.max(0, Math.floor((new Date() - new Date(tanam + "T00:00:00")) / 86400000)) : 0;
              const faseList = b.perpindahan_fase || [];
              const faseTerakhir = faseList.length ? (faseList[faseList.length - 1].id_fase || 1) : 1;
              if (faseTerakhir === 4 || umur >= 45) {
                hitungKg += Number(b.jumlah_tanaman || 100) * 0.2; // ~200g per tanaman
              }
            }
          });
          if (hitungKg > 0) {
            stokTersedia = Number(hitungKg.toFixed(2));
          }
        }
      } catch (_) {}

      const res = await apiFetch((typeof ENDPOINTS !== "undefined" ? ENDPOINTS.produk : "/produk") + "?per_page=50");
      if (res && res.ok) {
        const json = await res.json();
        const items = Array.isArray(json.data) ? json.data : (json.data?.data || []);

        if (items.length > 0) {
          produk = items.map((it) => {
            const nm = String(it.nama_produk || it.name || "");
            const selada = /selada hijau/i.test(nm);
            const jadwal = bacaJadwal(it);
            const p = {
              id_produk: it.id_produk || it.id,
              nama_produk: nm || "Selada Hijau Segar",
              deskripsi: it.deskripsi || it.description || (selada ? "Selada hijau hidroponik super segar dipanen langsung dari Sepasang Petani Farm (Kebonsari, Sumbersari, Jember)." : ""),
              stok: Number(it.jumlah_stok ?? it.stock ?? (selada ? stokTersedia : 0)),
              harga: Number(it.harga ?? it.price ?? 15000),
              foto_produk: it.foto_produk || it.image || fotoContoh("#4F772D"),
              satuan: bacaSatuan(it),
              jadwal,
            };
            // Tanggal dan jam pengambilan paling awal dipakai sebagai field lama
            p[FIELD_BE.tanggal] = jadwal.length ? jadwal[0].tanggal : tanggalYMD(it[FIELD_BE.tanggal]);
            p[FIELD_BE.jam] = jadwal.length && jadwal[0].jam.length ? jadwal[0].jam[0] : jamHHMM(it[FIELD_BE.jam]);
            return p;
          });
          persist();
          showList();
          return;
        }
      }
    } catch (e) {
      console.warn("[PRODUK API] Menggunakan data lokal:", e);
    }
  }

  produk = [{
    id_produk: 1,
    nama_produk: "Selada Hijau Segar",
    deskripsi: "Selada hijau hidroponik super segar dipanen langsung dari Sepasang Petani Farm (Kebonsari, Sumbersari, Jember). Renyah, manis, bebas pestisida.",
    stok: stokTersedia,
    harga: 15000,
    foto_produk: fotoContoh("#4F772D"),
    satuan: "kg",
    jadwal: [],
  }];
  persist();
  showList();
}

// Perkecil foto sebelum disimpan supaya localStorage tidak penuh
function kompres(file, maks = 640) {
  return new Promise((resolve, reject) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const r = Math.min(1, maks / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * r);
      c.height = Math.round(img.height * r);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", 0.8));
    };
    img.onerror = reject;
    img.src = url;
  });
}

// ---------- Halaman Manajemen Produk (UC25) ----------
const LEAF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21v-9"/><path d="M12 13c0-4 3-6 7-6 0 4-3 6-7 6z"/><path d="M12 16c0-3-2-5-6-5 0 3 2 5 6 5z"/></svg>';

function showList() {
  show("form", false);
  show("list-view");
  $("list-info").textContent = produk.length + " produk";
  show("empty", produk.length === 0);

  // Tombol Tambah Produk selalu tampil (UC22)
  if ($("btn-add")) $("btn-add").hidden = false;

  const grid = $("grid");
  grid.replaceChildren();
  produk.forEach((p, i) => {
    const card = el("article", undefined, "produk");
    card.style.setProperty("--i", String(Math.min(i, 8)));
    const foto = el("div", undefined, "foto");
    if (p.foto_produk) {
      const img = el("img");
      img.src = p.foto_produk;
      img.alt = p.nama_produk;
      foto.appendChild(img);
    } else {
      foto.innerHTML = LEAF;
    }
    const isi = el("div", undefined, "isi");
    const meta = el("div", undefined, "meta");
    const sat = p.satuan || "kg";
    meta.append(el("span", fmtHarga(p.harga, sat), "harga"), el("span", "Stok " + fmtStok(p.stok, sat), "stok"));
    const nTgl = (p.jadwal || []).length;
    const ringkas = el("p", nTgl ? "Pengambilan: " + nTgl + " tanggal tersedia" : "Jadwal pengambilan belum diatur", "jadwal-ringkas");

    const aksi = el("div", undefined, "aksi");
    const edit = el("button", "Edit", "btn btn-ghost btn-sm");
    edit.type = "button";
    edit.setAttribute("aria-label", "Edit " + p.nama_produk);
    edit.addEventListener("click", () => showForm(p));
    const hapus = el("button", "Hapus", "btn btn-danger btn-sm");
    hapus.type = "button";
    hapus.setAttribute("aria-label", "Hapus " + p.nama_produk);
    hapus.addEventListener("click", () => askHapus(p));
    aksi.append(edit, hapus);

    isi.append(el("h3", p.nama_produk), el("p", p.deskripsi), meta, ringkas, aksi);
    card.append(foto, isi);
    grid.appendChild(card);
  });
}

// ---------- Form tambah (UC22) dan edit (UC23) ----------
let mode = "add";
let editing = null;     // produk yang sedang diedit
let fotoDipilih = null;

function showForm(p) {
  mode = p ? "edit" : "add";
  editing = p || null;
  hideAlert("notice");
  hideAlert("form-alert");
  fotoDipilih = null;
  $("f-foto").value = "";

  // UC23: form edit berisi stok, harga, foto produk, tanggal pengambilan, dan jam pengambilan
  // (nama dan deskripsi hanya ada di form tambah). Tanggal dan jam tampil di form tambah maupun edit.
  fld("f-nama").hidden = !!p;
  fld("f-deskripsi").hidden = !!p;
  $("form-title").textContent = p ? "Ubah produk: " + p.nama_produk : "Tambah produk";
  $("f-nama").value = "";
  $("f-deskripsi").value = "";
  $("f-satuan").value = p ? (p.satuan || "kg") : "kg";
  aturSatuan();
  jadwalState = p ? jadwalAktif(p) : [];
  if (!jadwalState.length) jadwalState = [{ tanggal: "", jam: [""] }];
  renderJadwal();
  $("f-stok").value = p ? p.stok : "";
  $("f-harga").value = p ? p.harga : "";
  $("f-foto-help").textContent = p && p.foto_produk
    ? "Foto saat ini dipakai kalau tidak memilih foto baru."
    : "Pilih file gambar.";

  if (p && p.foto_produk) { $("f-preview").src = p.foto_produk; show("f-preview"); }
  else show("f-preview", false);

  show("list-view", false);
  show("form");
  (p ? $("f-stok") : $("f-nama")).focus();
}

// ---------- Satuan: label dan aturan angka stok ikut satuan ----------
function aturSatuan() {
  const sat = $("f-satuan").value === "pcs" ? "pcs" : "kg";
  $("lbl-stok").textContent = "Stok (" + sat + ")";
  $("lbl-harga").textContent = "Harga per " + sat + " (Rp)";
  $("f-stok").step = sat === "pcs" ? "1" : "0.01";
  $("f-stok").placeholder = sat === "pcs" ? "Contoh: 50" : "Contoh: 12.50";
}
$("f-satuan").addEventListener("change", aturSatuan);

// ---------- Jadwal pengambilan: banyak tanggal, tiap tanggal banyak jam ----------
let jadwalState = [];

function renderJadwal() {
  const list = $("jadwal-list");
  list.replaceChildren();
  if (!jadwalState.length) list.appendChild(el("p", "Belum ada tanggal. Tekan Tambah Tanggal.", "help"));

  jadwalState.forEach((row, i) => {
    const box = el("div", undefined, "jd-tanggal");

    const head = el("div", undefined, "jd-head");
    const lbl = el("label", "Jadwal " + (i + 1), "jd-label");
    const dt = el("input");
    dt.type = "date";
    dt.id = "jd-t-" + i;
    dt.min = todayISO();
    dt.value = row.tanggal;
    lbl.htmlFor = dt.id;
    dt.addEventListener("input", () => { row.tanggal = dt.value; hideAlert("form-alert"); });
    const hapusTgl = el("button", "Hapus tanggal", "btn btn-danger btn-sm");
    hapusTgl.type = "button";
    hapusTgl.addEventListener("click", () => { jadwalState.splice(i, 1); renderJadwal(); });
    head.append(lbl, hapusTgl);
    const tglField = el("div", undefined, "jd-tgl");
    tglField.appendChild(dt);

    const jams = el("div", undefined, "jd-jams");
    row.jam.forEach((j, k) => {
      const chip = el("div", undefined, "jd-jam");
      const inp = el("input");
      inp.type = "time";
      inp.value = j;
      inp.setAttribute("aria-label", "Jam pengambilan " + (k + 1) + " untuk jadwal " + (i + 1));
      inp.addEventListener("input", () => { row.jam[k] = inp.value; hideAlert("form-alert"); });
      const x = el("button", "\u00d7", "jd-x");
      x.type = "button";
      x.setAttribute("aria-label", "Hapus jam " + (k + 1) + " pada jadwal " + (i + 1));
      x.addEventListener("click", () => { row.jam.splice(k, 1); renderJadwal(); });
      chip.append(inp, x);
      jams.appendChild(chip);
    });
    const tambahJam = el("button", "+ Tambah Jam", "btn btn-ghost btn-sm");
    tambahJam.type = "button";
    tambahJam.addEventListener("click", () => {
      row.jam.push("");
      renderJadwal();
      const t = $("jadwal-list").querySelectorAll(".jd-tanggal")[i].querySelectorAll(".jd-jam input");
      if (t.length) t[t.length - 1].focus();
    });
    jams.appendChild(tambahJam);

    box.append(head, tglField, jams);
    list.appendChild(box);
  });
}

$("btn-tambah-tanggal").addEventListener("click", () => {
  jadwalState.push({ tanggal: "", jam: [""] });
  renderJadwal();
  const t = $("jadwal-list").querySelectorAll(".jd-tgl input");
  if (t.length) t[t.length - 1].focus();
});

// Data jadwal belum lengkap (ada tanggal atau jam yang kosong)
const jadwalKurang = () => jadwalState.length === 0 ||
  jadwalState.some((r) => !r.tanggal || r.jam.length === 0 || r.jam.some((j) => !j));

// Mengembalikan pesan kesalahan, atau "" kalau jadwal benar
function cekJadwal() {
  const hariIni = todayISO();
  const sudah = new Set();
  for (const r of jadwalState) {
    if (!FORMAT_TANGGAL.test(r.tanggal) || r.jam.some((j) => !FORMAT_JAM.test(j))) return MSG_FORMAT;
    if (r.tanggal < hariIni) return MSG_TGL_LEWAT;
    if (sudah.has(r.tanggal)) return MSG_TGL_SAMA;
    sudah.add(r.tanggal);
    if (new Set(r.jam).size !== r.jam.length) return MSG_JAM_SAMA;
  }
  return "";
}

// Jadwal rapi: tanggal dan jam terurut
const jadwalBersih = () => jadwalState
  .map((r) => ({ tanggal: r.tanggal, jam: [...r.jam].sort() }))
  .sort((a, b) => a.tanggal.localeCompare(b.tanggal));

// Field jadwal untuk permintaan ke BE (field lama tetap diisi)
const payloadJadwal = (satuan, jadwal) => ({
  satuan,
  jadwal_pengambilan: jadwal,
  [FIELD_BE.tanggal]: jadwal[0].tanggal,
  [FIELD_BE.jam]: jadwal[0].jam[0],
});

$("btn-add").addEventListener("click", () => showForm(null));
$("btn-cancel").addEventListener("click", showList); // Batal: kembali ke Manajemen Produk
$("btn-logout").addEventListener("click", logout);

$("f-foto").addEventListener("change", (e) => {
  hideAlert("form-alert");
  const file = e.target.files[0];
  fotoDipilih = null;
  if (mode === "edit" && editing && editing.foto_produk) $("f-preview").src = editing.foto_produk;
  else show("f-preview", false);
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    e.target.value = "";
    return showAlert("form-alert", MSG_FORMAT);
  }
  fotoDipilih = file;
  $("f-preview").src = URL.createObjectURL(file);
  show("f-preview");
});

$("form").addEventListener("submit", async (e) => {
  e.preventDefault();
  hideAlert("form-alert");

  const edit = mode === "edit";
  const nama = $("f-nama").value.trim();
  const deskripsi = $("f-deskripsi").value.trim();
  const stok = $("f-stok").value.trim();
  const harga = $("f-harga").value.trim();
  const satuan = $("f-satuan").value === "pcs" ? "pcs" : "kg";

  // Alternative flow: data tidak lengkap
  // Saat edit, foto boleh kosong kalau produk sudah punya foto (foto lama dipakai).
  // Jadwal pengambilan (minimal satu tanggal dengan satu jam) wajib diisi, baik saat tambah (UC22) maupun edit (UC23).
  const butuhFoto = edit ? !editing.foto_produk : true;
  const kurang = !stok || !harga || jadwalKurang() || (butuhFoto && !fotoDipilih) || (!edit && (!nama || !deskripsi));
  if (kurang) return showAlert("form-alert", edit ? MSG_LENGKAP_UBAH : MSG_LENGKAP_TAMBAH);

  // Alternative flow: format data tidak sesuai
  if ((!edit && nama.length > 50) || !ANGKA.test(stok) || !ANGKA.test(harga)) {
    return showAlert("form-alert", MSG_FORMAT);
  }
  // Satuan pcs: stok harus bilangan bulat. Satuan kg boleh desimal.
  if (satuan === "pcs" && !/^\d+$/.test(stok)) return showAlert("form-alert", MSG_STOK_PCS);
  const salahJadwal = cekJadwal();
  if (salahJadwal) return showAlert("form-alert", salahJadwal);
  const jadwal = jadwalBersih();

  const btn = $("btn-save");
  btn.disabled = true;
  btn.textContent = "Menyimpan...";
  try {
    const foto = fotoDipilih ? await kompres(fotoDipilih) : null;
    if (edit) {
      const lama = { ...editing };
      editing.stok = Number(stok);
      editing.harga = Number(harga);
      editing.satuan = satuan;
      editing.jadwal = jadwal;
      editing[FIELD_BE.tanggal] = jadwal[0].tanggal;
      editing[FIELD_BE.jam] = jadwal[0].jam[0];
      if (foto) editing.foto_produk = foto;
      if (!persist()) {
        Object.assign(editing, lama);
        return showAlert("form-alert", "Penyimpanan browser penuh. Hapus data lama atau pakai foto yang lebih kecil.");
      }

      // Sinkronisasi update ke backend API jika terhubung
      if (typeof USE_MOCK !== "undefined" && !USE_MOCK && typeof apiFetch === "function" && editing.id_produk) {
        try {
          const bodyPayload = {
            nama_produk: editing.nama_produk || "Selada Hijau Segar",
            deskripsi: editing.deskripsi || "Selada hijau hidroponik super segar dipanen langsung dari Sepasang Petani Farm.",
            harga: Number(harga),
            jumlah_stok: Number(stok),
            foto_produk: foto || editing.foto_produk,
            ...payloadJadwal(satuan, jadwal),
          };
          const resUp = await apiFetch((typeof ENDPOINTS !== "undefined" ? ENDPOINTS.produk : "/produk") + "/" + editing.id_produk, {
            method: "PUT",
            body: JSON.stringify(bodyPayload),
          });
          if (resUp && resUp.ok) {
            const upJson = await resUp.json();
            if (upJson.data?.foto_produk) {
              editing.foto_produk = upJson.data.foto_produk;
              persist();
            }
          }
        } catch (apiErr) {
          console.warn("[PRODUK API UPDATE] Disimpan lokal:", apiErr);
        }
      }

      showList();
      notify(MSG_UBAH_OK);
    } else {
      let savedFoto = foto;
      let newId = produk.reduce((m, p) => Math.max(m, p.id_produk), 0) + 1;

      // Sinkronisasi create ke backend API jika terhubung
      if (typeof USE_MOCK !== "undefined" && !USE_MOCK && typeof apiFetch === "function") {
        try {
          const bodyPayload = {
            nama_produk: nama,
            deskripsi: deskripsi,
            harga: Number(harga),
            jumlah_stok: Number(stok),
            foto_produk: foto,
            ...payloadJadwal(satuan, jadwal),
          };
          const resAdd = await apiFetch((typeof ENDPOINTS !== "undefined" ? ENDPOINTS.produk : "/produk"), {
            method: "POST",
            body: JSON.stringify(bodyPayload),
          });
          if (resAdd && resAdd.ok) {
            const addJson = await resAdd.json();
            if (addJson.data) {
              newId = addJson.data.id_produk || addJson.data.id || newId;
              if (addJson.data.foto_produk) {
                savedFoto = addJson.data.foto_produk;
              }
            }
          }
        } catch (apiErr) {
          console.warn("[PRODUK API ADD] Disimpan lokal:", apiErr);
        }
      }

      produk.push({
        id_produk: newId, nama_produk: nama, deskripsi, stok: Number(stok), harga: Number(harga), foto_produk: savedFoto,
        satuan, jadwal, [FIELD_BE.tanggal]: jadwal[0].tanggal, [FIELD_BE.jam]: jadwal[0].jam[0],
      });
      persist();
      showList();
      notify(MSG_TAMBAH_OK);
    }
  } catch (err) {
    showAlert("form-alert", MSG_FORMAT); // foto tidak bisa dibaca sebagai gambar
  } finally {
    btn.disabled = false;
    btn.textContent = "Simpan";
  }
});

// ---------- Hapus produk (UC24): pop up konfirmasi ----------
let hapusId = null;


function askHapus(p) {
  hapusId = p.id_produk;
  hideAlert("notice");
  $("m-teks").textContent = `Hapus produk "${p.nama_produk}"? Produk juga akan hilang dari halaman Penjualan. Data yang dihapus tidak bisa dikembalikan.`;
  show("modal");
  $("m-batal").focus();
}
function tutupModal() { hapusId = null; show("modal", false); }

$("m-batal").addEventListener("click", tutupModal); // Batal: kembali ke Manajemen Produk
$("modal").addEventListener("click", (e) => { if (e.target === $("modal")) tutupModal(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("modal").hidden) tutupModal(); });
$("m-ya").addEventListener("click", () => {
  const id = hapusId;
  const sisa = produk.filter((p) => p.id_produk !== id);
  const lama = produk;
  produk = sisa;
  if (!persist()) { produk = lama; tutupModal(); return showAlert("alert", "Produk gagal dihapus. Coba lagi."); }
  tutupModal();
  showList();
  notify(MSG_HAPUS_OK);
});

// ---------- Mulai ----------
(async function init() {
  try {
    const u = JSON.parse(localStorage.getItem("user") || "{}");
    $("user-email").textContent = u.email || "";
  } catch (_) {}
  await loadProdukFromBackend();
})();