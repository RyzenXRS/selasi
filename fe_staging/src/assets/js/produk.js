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

const fmtStok = (n) => Number(n).toLocaleString("id-ID", { maximumFractionDigits: 2 }) + " kg";
const fmtHarga = (n) => "Rp " + Number(n).toLocaleString("id-ID", { maximumFractionDigits: 2 });
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

        let utama = items.find((p) => {
          const nm = (p.nama_produk || p.name || "").toLowerCase();
          return nm.includes("selada hijau segar") || nm.includes("selada hijau");
        });
        if (!utama && items.length > 0) utama = items[0];

        if (utama) {
          produk = [{
            id_produk: utama.id_produk || utama.id,
            nama_produk: "Selada Hijau Segar",
            deskripsi: utama.deskripsi || utama.description || "Selada hijau hidroponik super segar dipanen langsung dari Sepasang Petani Farm (Kebonsari, Sumbersari, Jember).",
            stok: Number(utama.jumlah_stok ?? utama.stock ?? stokTersedia),
            harga: Number(utama.harga ?? utama.price ?? 15000),
            foto_produk: utama.foto_produk || utama.image || fotoContoh("#4F772D"),
            // Tanggal dan jam pengambilan dipakai untuk mengisi form edit (UC23) kalau BE mengirimnya
            [FIELD_BE.tanggal]: tanggalYMD(utama[FIELD_BE.tanggal]),
            [FIELD_BE.jam]: jamHHMM(utama[FIELD_BE.jam]),
          }];
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
  $("list-info").textContent = "1 produk (Khusus Selada Hijau Segar)";
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
    meta.append(el("span", fmtHarga(p.harga), "harga"), el("span", "Stok " + fmtStok(p.stok), "stok"));

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

    isi.append(el("h3", p.nama_produk), el("p", p.deskripsi), meta, aksi);
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
  fld("f-tanggal").hidden = false;
  fld("f-jam").hidden = false;
  $("form-title").textContent = p ? "Ubah produk: " + p.nama_produk : "Tambah produk";
  $("f-nama").value = "";
  $("f-deskripsi").value = "";
  $("f-tanggal").value = p ? tanggalYMD(p[FIELD_BE.tanggal]) : "";
  $("f-jam").value = p ? jamHHMM(p[FIELD_BE.jam]) : "";
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
  const tanggal = $("f-tanggal").value.trim();
  const jam = $("f-jam").value.trim();

  // Alternative flow: data tidak lengkap
  // Saat edit, foto boleh kosong kalau produk sudah punya foto (foto lama dipakai).
  // Tanggal dan jam pengambilan wajib diisi, baik saat tambah (UC22) maupun edit (UC23).
  const butuhFoto = edit ? !editing.foto_produk : true;
  const kurang = !stok || !harga || !tanggal || !jam || (butuhFoto && !fotoDipilih) || (!edit && (!nama || !deskripsi));
  if (kurang) return showAlert("form-alert", edit ? MSG_LENGKAP_UBAH : MSG_LENGKAP_TAMBAH);

  // Alternative flow: format data tidak sesuai
  if ((!edit && nama.length > 50) || !FORMAT_TANGGAL.test(tanggal) || !FORMAT_JAM.test(jam) || !ANGKA.test(stok) || !ANGKA.test(harga)) {
    return showAlert("form-alert", MSG_FORMAT);
  }

  const btn = $("btn-save");
  btn.disabled = true;
  btn.textContent = "Menyimpan...";
  try {
    const foto = fotoDipilih ? await kompres(fotoDipilih) : null;
    if (edit) {
      const lama = { ...editing };
      editing.stok = Number(stok);
      editing.harga = Number(harga);
      editing[FIELD_BE.tanggal] = tanggal;
      editing[FIELD_BE.jam] = jam;
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
            [FIELD_BE.tanggal]: tanggal,
            [FIELD_BE.jam]: jam,
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
            [FIELD_BE.tanggal]: tanggal,
            [FIELD_BE.jam]: jam,
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
        [FIELD_BE.tanggal]: tanggal, [FIELD_BE.jam]: jam,
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