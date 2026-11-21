// Halaman Checkout Pembeli: ringkasan pesanan, jadwal pengambilan (UC45), metode pembayaran (UC44), dan Buat Pesanan (UC43).
// Memakai pembeli-cart.js dan pembeli-pesanan.js.

const $ = (id) => document.getElementById(id);
const K = Keranjang;
const P = Pesanan;
function el(tag, text, cls) {
  const e = document.createElement(tag);
  if (text !== undefined) e.textContent = text;
  if (cls) e.className = cls;
  return e;
}

// ---------- Jadwal pengambilan (UC45) ----------
// Tanggal dan jam pengambilan ditentukan Pembudidaya pada produk (UC22). Pembeli memilih dari jadwal produk di keranjangnya.
// SEMENTARA, hanya untuk uji coba: kalau produk dari backend belum mengirim jadwal pengambilan, dipakai jadwal contoh
// (besok dan lusa, pukul 09.00 dan 14.00). Ubah ke false begitu backend sudah mengirim jadwal dari Pembudidaya.
const PAKAI_JADWAL_UJI = true;
const MSG_JADWAL = "Jadwal pengambilan yang dipilih belum tersedia. Pilih tanggal dan jam sesuai jadwal yang tersedia.";
const METODE = [
  { nilai: "COD", judul: "COD", ket: "Bayar tunai saat mengambil pesanan" },
  { nilai: "QRIS", judul: "QRIS", ket: "Bayar lewat QRIS" },
];
const IKON_DAUN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21v-9"/><path d="M12 13c0-4 3-6 7-6 0 4-3 6-7 6z"/><path d="M12 16c0-3-2-5-6-5 0 3 2 5 6 5z"/></svg>';

const pilih = { tanggal: "", jam: "", metode: "" };
const iso = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");

let jadwal = new Map(); // "YYYY-MM-DD" -> ["HH:MM", ...]
const teksTanggal = (t) => new Date(t + "T00:00:00").toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const teksJam = (j) => j.replace(":", ".");
function opsi(sel, teks, nilai, pilihan) {
  const o = el("option", teks); o.value = nilai;
  if (pilihan) { o.selected = true; o.disabled = true; o.hidden = true; }
  sel.appendChild(o);
}

// Kumpulkan jadwal dari produk di keranjang. Kalau data keranjang belum memuatnya, ambil dari data produk.
async function kumpulkanJadwal(items) {
  let sumber = items.map((i) => ({ t: i.tanggalPengambilan, j: i.jamPengambilan, id: i.id_produk }));
  if (sumber.some((s) => !s.t || !s.j)) {
    try {
      const m = new Map((await K.produk()).map((p) => [String(p.id), p]));
      sumber = sumber.map((s) => { const p = m.get(String(s.id)) || {}; return { t: s.t || p.tanggalPengambilan, j: s.j || p.jamPengambilan }; });
    } catch (_) { /* jadwal kosong */ }
  }
  const hariIni = iso(new Date());
  const peta = new Map();
  sumber.forEach((s) => {
    if (!s.t || !s.j || s.t < hariIni) return; // hanya jadwal yang belum lewat
    if (!peta.has(s.t)) peta.set(s.t, new Set());
    peta.get(s.t).add(s.j);
  });
  if (!peta.size && PAKAI_JADWAL_UJI) {
    [1, 2].forEach((n) => { const d = new Date(); d.setDate(d.getDate() + n); peta.set(iso(d), new Set(["09:00", "14:00"])); });
  }
  return new Map([...peta.entries()].sort().map(([t, js]) => [t, [...js].sort()]));
}

function isiJadwal() {
  const t = $("tanggal"), j = $("jam");
  t.replaceChildren(); j.replaceChildren();
  if (!jadwal.size) {
    opsi(t, "Belum ada jadwal", "", true); opsi(j, "Belum ada jadwal", "", true);
    t.disabled = true; j.disabled = true;
    return;
  }
  opsi(t, "Pilih tanggal", "", true);
  jadwal.forEach((_, tgl) => opsi(t, teksTanggal(tgl), tgl));
  opsi(j, "Pilih jam", "", true);
  j.disabled = true;
  t.addEventListener("change", () => {
    pilih.tanggal = t.value; pilih.jam = "";
    j.replaceChildren(); j.disabled = false;
    const daftarJam = jadwal.get(t.value) || [];
    opsi(j, "Pilih jam", "", true);
    daftarJam.forEach((x) => opsi(j, teksJam(x), x));
    if (daftarJam.length === 1) { j.value = daftarJam[0]; pilih.jam = daftarJam[0]; }
  });
  j.addEventListener("change", () => (pilih.jam = j.value));
}

function isiMetode() {
  $("metode").replaceChildren(...METODE.map((m) => {
    const lb = el("label", undefined, "opt");
    const r = el("input"); r.type = "radio"; r.name = "metode"; r.value = m.nilai;
    r.addEventListener("change", () => (pilih.metode = m.nilai));
    const s = el("span", m.judul);
    s.appendChild(el("small", m.ket));
    lb.append(r, s);
    return lb;
  }));
}

function isiLokasi() {
  if (typeof FARM_LOCATION === "undefined") return;
  const f = FARM_LOCATION;
  $("lokasi-nama").textContent = "Lokasi pengambilan: " + f.nama;
  $("lokasi-alamat").textContent = f.alamat;
  // Menekan alamat membuka lokasi di Google Maps
  const kueri = f.latitude != null && f.longitude != null ? f.latitude + "," + f.longitude : f.plusCode || f.alamat;
  $("lokasi").href = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(kueri);
  $("lokasi").hidden = false;
}

function isiRingkasan(items) {
  $("ringkas").replaceChildren(...items.map((it) => {
    const row = el("div", undefined, "sum-item");
    const foto = el("div", undefined, "cart-foto");
    const pasang = () => { foto.replaceChildren(); const k = el("div", undefined, "kosong"); k.innerHTML = IKON_DAUN; foto.appendChild(k); };
    const url = K.fotoUrl(it.foto);
    if (url) { const img = el("img"); img.src = url; img.alt = it.nama; img.addEventListener("error", pasang); foto.appendChild(img); } else pasang();
    const info = el("div");
    info.append(el("h3", it.nama), el("p", K.rupiah(it.harga) + " x " + K.angka(it.jumlah) + " kg"));
    row.append(foto, info, el("div", K.rupiah(it.harga * it.jumlah), "cart-sub"));
    return row;
  }));
  $("total").textContent = K.rupiah(items.reduce((s, it) => s + it.harga * it.jumlah, 0));
}

let sedangBuat = false;
$("btn-buat").addEventListener("click", async () => {
  if (sedangBuat) return;
  if (!pilih.tanggal || !pilih.jam || !pilih.metode) { K.toast(P.MSG.dataTidakLengkap, "error"); return; }
  if (!(jadwal.get(pilih.tanggal) || []).includes(pilih.jam)) { K.toast(MSG_JADWAL, "error"); return; }
  sedangBuat = true;
  $("btn-buat").disabled = true;
  let berhasil = false;
  try {
    const r = await P.checkout({ metode_pembayaran: pilih.metode, tanggal_pengambilan: pilih.tanggal, jam_pengambilan: pilih.jam });
    if (!r.ok) { if (r.pesan) K.toast(r.pesan, "error"); return; }
    berhasil = true;
    K.toast(r.pesan, "success");
    K.segarkanBadge();
    setTimeout(() => { location.href = r.id ? "detail-pesanan-pembeli.html?id=" + encodeURIComponent(r.id) : "pesanan-pembeli.html"; }, 1300);
  } catch (err) {
    K.toast(P.MSG.server, "error");
  } finally {
    if (!berhasil) { sedangBuat = false; $("btn-buat").disabled = false; }
  }
});

(async function init() {
  if (K.LOKAL) {
    // Keranjang masih di browser, sedangkan checkout membaca keranjang di backend
    const a = $("alert");
    a.textContent = 'Checkout memakai keranjang di backend. Tambahkan  keranjang: "/keranjang"  di ENDPOINTS pada config.js.';
    a.hidden = false;
    return;
  }
  try {
    const items = await K.daftar();
    if (!items.length) { $("kosong").hidden = false; return; }
    isiRingkasan(items);
    jadwal = await kumpulkanJadwal(items);
    isiJadwal();
    isiMetode();
    isiLokasi();
    $("form").hidden = false;
  } catch (err) {
    const a = $("alert");
    a.textContent = "Halaman checkout belum bisa dimuat (" + err.message + "). Coba muat ulang halaman.";
    a.hidden = false;
  }
})();