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
const MSG_LENGKAP_TAMBAH = "Data produk belum lengkap. Silahkan lengkapi seluruh data";
const MSG_LENGKAP_UBAH = "Data produk belum lengkap. Silahkan lengkapi seluruh data";

// Format sesuai dokumen: nama maksimal 50 karakter; stok dan harga Decimal (10,2); foto berupa gambar.
const ANGKA = /^\d{1,8}(\.\d{1,2})?$/;

const fmtStok = (n) => Number(n).toLocaleString("id-ID", { maximumFractionDigits: 2 }) + " kg";
const fmtHarga = (n) => "Rp " + Number(n).toLocaleString("id-ID", { maximumFractionDigits: 2 });

// ---------- Data palsu (frontend saja, belum ke backend) ----------
const MOCK_KEY = "mock_produk";
const fotoContoh = (warna) => "data:image/svg+xml;utf8," + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect width="400" height="300" fill="#dde8b0"/><circle cx="200" cy="160" r="86" fill="${warna}"/><circle cx="200" cy="160" r="52" fill="#ecf39e" opacity=".7"/></svg>`);
let produk = (() => {
  try { const s = localStorage.getItem(MOCK_KEY); if (s) return JSON.parse(s); } catch (_) {}
  return [
    { id_produk: 1, nama_produk: "Selada Hijau Segar", deskripsi: "Selada hidroponik dipanen pagi hari, renyah dan bebas pestisida.", stok: 12.5, harga: 15000, foto_produk: fotoContoh("#4F772D") },
    { id_produk: 2, nama_produk: "Selada Merah", deskripsi: "Daun merah keunguan, cocok untuk salad dan hiasan hidangan.", stok: 6, harga: 22000, foto_produk: fotoContoh("#9B4A5A") },
  ];
})();
function persist() {
  try { localStorage.setItem(MOCK_KEY, JSON.stringify(produk)); return true; } catch (_) { return false; }
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

  const grid = $("grid");
  grid.replaceChildren();
  produk.forEach((p) => {
    const card = el("article", undefined, "produk");
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

  // UC23: form edit hanya berisi stok, harga, dan foto produk
  fld("f-nama").hidden = !!p;
  fld("f-deskripsi").hidden = !!p;
  $("form-title").textContent = p ? "Ubah produk: " + p.nama_produk : "Tambah produk";
  $("f-nama").value = "";
  $("f-deskripsi").value = "";
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

  // Alternative flow: data tidak lengkap
  // Saat edit, foto boleh kosong kalau produk sudah punya foto (foto lama dipakai).
  const butuhFoto = edit ? !editing.foto_produk : true;
  const kurang = !stok || !harga || (butuhFoto && !fotoDipilih) || (!edit && (!nama || !deskripsi));
  if (kurang) return showAlert("form-alert", edit ? MSG_LENGKAP_UBAH : MSG_LENGKAP_TAMBAH);

  // Alternative flow: format data tidak sesuai
  if ((!edit && nama.length > 50) || !ANGKA.test(stok) || !ANGKA.test(harga)) {
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
      if (foto) editing.foto_produk = foto;
      if (!persist()) {
        Object.assign(editing, lama);
        return showAlert("form-alert", "Penyimpanan browser penuh. Hapus data lama atau pakai foto yang lebih kecil.");
      }
      showList();
      notify(MSG_UBAH_OK);
    } else {
      const id = produk.reduce((m, p) => Math.max(m, p.id_produk), 0) + 1;
      produk.push({ id_produk: id, nama_produk: nama, deskripsi, stok: Number(stok), harga: Number(harga), foto_produk: foto });
      if (!persist()) {
        produk.pop();
        return showAlert("form-alert", "Penyimpanan browser penuh. Hapus data lama atau pakai foto yang lebih kecil.");
      }
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
(function init() {
  try {
    const u = JSON.parse(localStorage.getItem("user") || "{}");
    $("user-email").textContent = u.email || "";
  } catch (_) {}
  showList();
})();