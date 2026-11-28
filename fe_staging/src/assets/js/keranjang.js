// Halaman Keranjang Pembeli: ubah jumlah produk (UC40) dan hapus produk (UC41). Memakai pembeli-cart.js.

const $ = (id) => document.getElementById(id);
const K = Keranjang;
function el(tag, text, cls) {
  const e = document.createElement(tag);
  if (text !== undefined) e.textContent = text;
  if (cls) e.className = cls;
  return e;
}

const IKON_DAUN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21v-9"/><path d="M12 13c0-4 3-6 7-6 0 4-3 6-7 6z"/><path d="M12 16c0-3-2-5-6-5 0 3 2 5 6 5z"/></svg>';
const IKON_HAPUS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 6h17"/><path d="M8.5 6V4.5a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1V6"/><path d="M18.5 6l-.8 12.6a2 2 0 0 1-2 1.9H8.3a2 2 0 0 1-2-1.9L5.5 6"/><path d="M10 10.5v6M14 10.5v6"/></svg>';
const SERVER_ERROR = "Tidak bisa terhubung ke server. Coba lagi nanti.";
const bulat2 = (n) => Math.round(n * 100) / 100;

let items = [];
let hapusItem = null;

// Produk yang dicentang untuk di-checkout. Disimpan di sessionStorage supaya Halaman Checkout tahu produk mana yang dipilih.
const KEY_PILIH = "keranjang_dipilih";
const MSG_PILIH = "Pilih produk yang ingin di-checkout terlebih dahulu.";
let dipilih = new Set();
const simpanPilihan = () => { try { sessionStorage.setItem(KEY_PILIH, JSON.stringify([...dipilih])); } catch (_) {} };
const terpilih = () => items.filter((it) => dipilih.has(String(it.id)));

function perbaruiTotal() {
  const t = terpilih();
  $("total").textContent = K.rupiah(t.reduce((s, it) => s + it.harga * it.jumlah, 0));
  const lbl = document.querySelector("#ringkasan .cart-total span");
  if (lbl) lbl.textContent = t.length ? "Total harga (" + t.length + " produk dipilih)" : "Total harga (belum ada produk dipilih)";
  const co = $("btn-checkout");
  co.classList.toggle("nonaktif", t.length === 0);
  co.setAttribute("aria-disabled", String(t.length === 0));
  const semua = $("pilih-semua");
  if (semua) {
    semua.checked = items.length > 0 && t.length === items.length;
    semua.indeterminate = t.length > 0 && t.length < items.length;
  }
}

function baris(it, i) {
  const row = el("article", undefined, "cart-item");
  row.style.setProperty("--i", String(Math.min(i, 8)));

  // Foto Produk
  const foto = el("div", undefined, "cart-foto");
  const pasang = () => { foto.replaceChildren(); const k = el("div", undefined, "kosong"); k.innerHTML = IKON_DAUN; foto.appendChild(k); };
  const url = K.fotoUrl(it.foto);
  if (url) {
    const img = el("img"); img.src = url; img.alt = it.nama; img.loading = "lazy";
    img.addEventListener("error", pasang);
    foto.appendChild(img);
  } else pasang();

  // Nama Produk dan Harga Produk
  const info = el("div", undefined, "cart-info");
  info.append(el("h3", it.nama));
  const harga = el("p", K.rupiah(it.harga) + " / " + it.satuan, "cart-harga");
  info.append(harga);

  // Jumlah Produk (kg atau pcs): tombol Kurang (-) dan Tambah (+)
  const qty = el("div", undefined, "qty");
  qty.setAttribute("role", "group");
  qty.setAttribute("aria-label", "Jumlah " + it.nama + " (" + it.satuan + ")");
  const kurang = el("button", "−", "qty-btn"); kurang.type = "button"; kurang.setAttribute("aria-label", "Kurangi jumlah " + it.nama);
  const nilai = el("span", K.angka(it.jumlah) + " " + it.satuan, "qty-nilai"); nilai.setAttribute("aria-live", "polite");
  const tambah = el("button", "+", "qty-btn"); tambah.type = "button"; tambah.setAttribute("aria-label", "Tambah jumlah " + it.nama);
  qty.append(kurang, nilai, tambah);

  // Kotak centang: produk yang akan di-checkout
  const pilih = el("label", undefined, "cart-pilih");
  const cek = el("input"); cek.type = "checkbox"; cek.checked = dipilih.has(String(it.id));
  cek.setAttribute("aria-label", "Pilih " + it.nama + " untuk checkout");
  pilih.append(cek, el("span"));
  row.classList.toggle("terpilih", cek.checked);
  cek.addEventListener("change", () => {
    if (cek.checked) dipilih.add(String(it.id)); else dipilih.delete(String(it.id));
    row.classList.toggle("terpilih", cek.checked);
    simpanPilihan();
    perbaruiTotal();
  });

  // Total Harga baris ini
  const sub = el("div", K.rupiah(it.harga * it.jumlah), "cart-sub");

  // Ikon Hapus
  const hapus = el("button", undefined, "icon-btn hapus");
  hapus.type = "button"; hapus.innerHTML = IKON_HAPUS;
  hapus.setAttribute("aria-label", "Hapus " + it.nama + " dari keranjang");
  hapus.addEventListener("click", () => bukaDialog(it, row));

  async function ubahJumlah(delta) {
    kurang.disabled = tambah.disabled = true;
    try {
      const baru = bulat2(it.jumlah + delta);
      const r = await K.ubah(it, baru);
      if (!r.ok) { if (r.pesan) K.toast(r.pesan, "error"); return; }
      it.jumlah = baru;
      nilai.textContent = K.angka(it.jumlah) + " " + it.satuan;
      sub.textContent = K.rupiah(it.harga * it.jumlah);
      sub.classList.remove("ubah"); void sub.offsetWidth; sub.classList.add("ubah");
      perbaruiTotal();
    } catch (err) {
      K.toast(SERVER_ERROR, "error");
    } finally {
      kurang.disabled = tambah.disabled = false;
    }
  }
  kurang.addEventListener("click", () => ubahJumlah(-1));
  tambah.addEventListener("click", () => ubahJumlah(1));

  row.append(pilih, foto, info, qty, sub, hapus);
  return row;
}

// Kotak "Pilih semua" di atas daftar
function pastikanPilihSemua() {
  if ($("pilih-semua")) return;
  const bar = el("label", undefined, "pilih-semua-bar");
  const cek = el("input"); cek.type = "checkbox"; cek.id = "pilih-semua";
  bar.append(cek, el("span"), el("em", "Pilih semua"));
  cek.addEventListener("change", () => {
    dipilih = cek.checked ? new Set(items.map((it) => String(it.id))) : new Set();
    simpanPilihan();
    render();
  });
  $("list").before(bar);
}

function render() {
  const list = $("list");
  pastikanPilihSemua();
  list.replaceChildren(...items.map(baris));
  const kosong = items.length === 0;
  $("kosong").hidden = !kosong;
  $("ringkasan").hidden = kosong;
  $("pilih-semua").parentElement.hidden = kosong;
  perbaruiTotal();
}

// Checkout hanya boleh kalau sudah ada produk yang dicentang
$("btn-checkout").addEventListener("click", (e) => {
  if (!terpilih().length) { e.preventDefault(); K.toast(MSG_PILIH, "error"); return; }
  simpanPilihan();
});

// ---------- Pop up konfirmasi hapus (UC41) ----------
function bukaDialog(it, row) {
  hapusItem = { it, row };
  $("m-teks").textContent = K.MSG.konfirmasiHapus;
  $("modal").hidden = false;
  $("m-tidak").focus();
}
function tutupDialog() { hapusItem = null; $("modal").hidden = true; }

$("m-tidak").addEventListener("click", tutupDialog); // Tidak: kembali ke Halaman Keranjang
$("modal").addEventListener("click", (e) => { if (e.target === $("modal")) tutupDialog(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("modal").hidden) tutupDialog(); });
$("m-iya").addEventListener("click", async () => {
  if (!hapusItem) return;
  const { it, row } = hapusItem;
  const btn = $("m-iya");
  btn.disabled = true;
  try {
    const r = await K.hapus(it);
    tutupDialog();
    if (!r.ok) { if (r.pesan) K.toast(r.pesan, "error"); return; }
    row.classList.add("swap-out");
    setTimeout(() => {
      items = items.filter((x) => x.id !== it.id);
      dipilih.delete(String(it.id));
      simpanPilihan();
      render();
      K.toast(r.pesan, "success");
    }, 200);
  } catch (err) {
    tutupDialog();
    K.toast(SERVER_ERROR, "error");
  } finally {
    btn.disabled = false;
  }
});

(async function init() {
  const list = $("list");
  list.replaceChildren(...Array.from({ length: 3 }, () => el("div", undefined, "skeleton kecil")));
  $("kosong").hidden = true;
  $("ringkasan").hidden = true;
  try {
    items = await K.daftar();
    // Pulihkan centang yang tadi dipilih (misalnya kembali dari Checkout), hanya untuk produk yang masih ada
    try {
      const simpan = JSON.parse(sessionStorage.getItem(KEY_PILIH) || "[]");
      dipilih = new Set(simpan.map(String).filter((id) => items.some((it) => String(it.id) === id)));
    } catch (_) { dipilih = new Set(); }
    render();
  } catch (err) {
    list.replaceChildren();
    const a = $("alert");
    a.textContent = "Keranjang belum bisa dimuat (" + err.message + "). Coba muat ulang halaman.";
    a.hidden = false;
  }
})();