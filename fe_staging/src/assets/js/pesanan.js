// ---------- Helper ----------
const $ = (id) => document.getElementById(id);
const show = (id, on = true) => { $(id).hidden = !on; };
function el(tag, text, cls) {
  const e = document.createElement(tag);
  if (text !== undefined) e.textContent = text;
  if (cls) e.className = cls;
  return e;
}
function showAlert(id, msg) { $(id).textContent = msg; show(id); }
function notify(msg) { showAlert("notice", msg); $("notice").focus(); }

// FE saja: halaman ini memakai data contoh, belum memanggil BE.
//   pesanan.html               -> beberapa pesanan contoh (perubahan hanya tersimpan di halaman)
//   pesanan.html?demo=kosong   -> tampilan "Belum ada pesanan masuk"
// Nanti kalau BE sudah siap, ubah PAKAI_BE jadi true.
const PAKAI_BE = false;
const DEMO = new URLSearchParams(location.search).get("demo");
const OFFLINE = !PAKAI_BE || DEMO === "contoh" || DEMO === "kosong";
const PESANAN_PATH = (typeof ENDPOINTS !== "undefined" && ENDPOINTS.pesanan) || "/pesanan";
// Endpoint saat PAKAI_BE = true (sesuaikan dengan routes/api.php):
//   GET   {PESANAN_PATH}                    daftar pesanan masuk (UC26)
//   GET   {PESANAN_PATH}/{id}               detail pesanan (UC27)
//   PATCH {PESANAN_PATH}/{id}/status        ubah status pesanan, body: { status_pesanan } (UC28)
//   POST  {PESANAN_PATH}/{id}/konfirmasi-cod konfirmasi pembayaran COD (UC30) -- TEBAKAN

// Pilihan di dropdown Edit Status
const STATUS_LIST = ["Menunggu Pembayaran", "Diproses", "Dikirim", "Selesai", "Dibatalkan"];
const STATUS_SUDAH_BAYAR = "Sudah Dibayar";

// ---------- Format ----------
const rupiah = (v) => {
  const n = Number(v);
  if (Number.isNaN(n)) return "-";
  return "Rp " + n.toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
};
const kg = (v) => {
  const n = Number(v);
  return Number.isNaN(n) ? "-" : n.toLocaleString("id-ID", { maximumFractionDigits: 2 }) + " kg";
};
function fmtTanggal(v) {
  if (!v) return "-";
  const d = new Date(String(v).replace(" ", "T"));
  if (isNaN(d)) return String(v);
  const tgl = d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  const jam = d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }).replace(".", ":");
  return tgl + ", " + jam;
}
function fotoUrl(p) {
  if (!p) return "";
  if (/^(https?:|data:|blob:|\.\.\/|\/)/.test(p)) return p;
  return STORAGE_BASE_URL + String(p).replace(/^\/+/, "");
}
const idOf = (p) => p.id_pesanan ?? p.id;

// Warna label status. Nilai dari BE dicocokkan tanpa peduli huruf besar/kecil atau garis bawah.
const norm = (s) => String(s || "").toLowerCase().replace(/_/g, " ").trim();
function badgeClass(status) {
  switch (norm(status)) {
    case "menunggu pembayaran":
    case "belum dibayar":
    case "pending":        return "badge perlu";
    case "diproses":
    case "processing":     return "badge pindah";
    case "dikirim":
    case "shipped":        return "badge panen";
    case "dibatalkan":
    case "cancelled":
    case "canceled":       return "badge batal";
    default:               return "badge"; // Selesai, Sudah Dibayar, Lunas, dan lainnya
  }
}

// UC30: tombol COD hanya untuk pesanan COD yang statusnya masih "Belum Dibayar"
const isCod = (p) => /\bcod\b|bayar di tempat/i.test(String(p.metode_pembayaran || ""));
const belumDibayar = (p) => norm(p.status_pembayaran) === "belum dibayar";

// ---------- Data contoh (hanya untuk mode FE saja atau ?demo=...) ----------
function contoh() {
  const t = (jam) => new Date(Date.now() - jam * 3600000).toISOString().slice(0, 19).replace("T", " ");
  const foto = "../assets/img/selada2.jpeg";
  const baris = (id, no, jam, pembeli, foto_produk, produk, jml, harga, metode, bayar, status) => ({
    id_pesanan: id, nomor_pesanan: no, tanggal_pesanan: t(jam), nama_pembeli: pembeli, foto_produk,
    nama_produk: produk, jumlah_produk: jml, harga_produk: harga, total_pembayaran: (jml * harga).toFixed(2),
    metode_pembayaran: metode, status_pembayaran: bayar, status_pesanan: status,
  });
  return [
    baris(6, "ORD-20261003-006", 1,  "Maya Putri",     foto, "Selada Hijau",    6, 15000, "COD",           "Belum Dibayar", "Diproses"),
    baris(5, "ORD-20261003-005", 2,  "Rina Wulandari", foto, "Selada Hijau",    3, 15000, "Transfer Bank", "Belum Dibayar", "Menunggu Pembayaran"),
    baris(4, "ORD-20261003-004", 9,  "Budi Santoso",   foto, "Selada Keriting", 8, 15000, "QRIS",          "Sudah Dibayar", "Diproses"),
    baris(3, "ORD-20261002-003", 30, "Siti Aminah",    null, "Selada Romaine",  5, 15100, "E-Wallet",      "Sudah Dibayar", "Dikirim"),
    baris(2, "ORD-20261001-002", 60, "Agus Pratama",   foto, "Selada Hijau",    2, 15000, "COD",           "Sudah Dibayar", "Selesai"),
    baris(1, "ORD-20260930-001", 90, "Dewi Lestari",   null, "Selada Keriting", 4, 15000, "Transfer Bank", "Belum Dibayar", "Dibatalkan"),
  ];
}

// ---------- Ambil dan simpan data ----------
let semua = [];   // ringkasan semua pesanan (daftar)
let aktif = null; // pesanan yang sedang dibuka (detail)

async function fetchDaftar() {
  if (DEMO === "kosong") return [];
  if (OFFLINE) {
    await new Promise((r) => setTimeout(r, 300));
    return contoh();
  }
  const res = await apiFetch(PESANAN_PATH);
  if (!res) return []; // 401 -> sudah logout otomatis
  if (!res.ok) throw new Error("HTTP " + res.status);
  const json = await res.json();
  return Array.isArray(json) ? json : json.data ?? [];
}

async function fetchDetail(id) {
  if (OFFLINE) {
    await new Promise((r) => setTimeout(r, 200));
    return semua.find((p) => idOf(p) === id) || null;
  }
  const res = await apiFetch(PESANAN_PATH + "/" + encodeURIComponent(id));
  if (!res) return null;
  if (!res.ok) throw new Error("HTTP " + res.status);
  const json = await res.json();
  return json.data ?? json;
}

async function simpanStatus(id, status) {
  if (OFFLINE) {
    await new Promise((r) => setTimeout(r, 400));
    const p = semua.find((x) => idOf(x) === id);
    if (p) p.status_pesanan = status;
    return { ...p };
  }
  const res = await apiFetch(PESANAN_PATH + "/" + encodeURIComponent(id) + "/status", {
    method: "PATCH",
    body: JSON.stringify({ status_pesanan: status }),
  });
  if (!res) return null;
  let json = {};
  try { json = await res.json(); } catch (_) {}
  if (!res.ok) throw new Error(json.message || "HTTP " + res.status);
  const data = json.data ?? json;
  return data && data.status_pesanan ? data : { ...aktif, status_pesanan: status };
}

// UC30: konfirmasi pembayaran COD
async function simpanBayarCod(id) {
  if (OFFLINE) {
    await new Promise((r) => setTimeout(r, 400));
    const p = semua.find((x) => idOf(x) === id);
    if (p) p.status_pembayaran = STATUS_SUDAH_BAYAR;
    return { ...p };
  }
  // TEBAKAN: sesuaikan path dengan routes/api.php backend
  const res = await apiFetch(PESANAN_PATH + "/" + encodeURIComponent(id) + "/konfirmasi-cod", { method: "POST" });
  if (!res) return null;
  let json = {};
  try { json = await res.json(); } catch (_) {}
  if (!res.ok) throw new Error(json.message || "HTTP " + res.status);
  const data = json.data ?? json;
  return data && data.status_pembayaran ? data : { ...aktif, status_pembayaran: STATUS_SUDAH_BAYAR };
}

// ---------- Tampilan umum ----------
function showOnly(name) {
  ["list", "detail", "edit"].forEach((k) => show("v-" + k, k === name));
  const judul = { list: "Pesanan Masuk", detail: "Detail Pesanan", edit: "Edit Status Pesanan" };
  const sub = {
    list: "Ringkasan pesanan yang dilakukan pembeli.",
    detail: "Informasi lengkap pesanan yang dipilih.",
    edit: "Pilih status baru untuk pesanan ini.",
  };
  $("page-title").textContent = judul[name];
  $("page-sub").textContent = sub[name];
}

function placeholder(cls) {
  const d = el("div", undefined, cls);
  d.setAttribute("role", "img");
  d.setAttribute("aria-label", "Tidak ada foto produk");
  d.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21v-9"/><path d="M12 13c0-4 3-6 7-6 0 4-3 6-7 6z"/><path d="M12 16c0-3-2-5-6-5 0 3 2 5 6 5z"/></svg>';
  return d;
}
function fotoNode(p, cls, clsKosong) {
  const url = fotoUrl(p.foto_produk);
  if (!url) return placeholder(clsKosong);
  const img = el("img", undefined, cls);
  img.src = url;
  img.alt = "Foto produk pesanan " + (p.nomor_pesanan || "");
  img.addEventListener("error", () => img.replaceWith(placeholder(clsKosong)));
  return img;
}

// ---------- UC26: ringkasan ----------
function renderList() {
  showOnly("list");
  show("loading", false);

  if (!semua.length) {
    show("list", false);
    show("empty", true); // "Belum ada pesanan masuk"
    return;
  }
  show("empty", false);
  show("list", true);
  $("list-info").textContent = semua.length + " pesanan";

  const urut = semua.slice().sort((a, b) => String(b.tanggal_pesanan).localeCompare(String(a.tanggal_pesanan)));
  const rows = $("rows");
  rows.replaceChildren();
  urut.forEach((p) => {
    const tr = el("tr");
    const tdFoto = el("td");
    tdFoto.appendChild(fotoNode(p, "thumb", "thumb-kosong"));
    const tdStatus = el("td");
    tdStatus.appendChild(el("span", p.status_pesanan || "-", badgeClass(p.status_pesanan)));
    const tdAksi = el("td");
    const btn = el("button", "Lihat Detail", "btn btn-ghost btn-sm");
    btn.type = "button";
    btn.setAttribute("aria-label", "Lihat detail pesanan " + (p.nomor_pesanan || ""));
    btn.addEventListener("click", () => bukaDetail(idOf(p)));
    tdAksi.appendChild(btn);
    tr.append(
      tdFoto,
      el("td", p.nomor_pesanan || "-", "nomor"),
      el("td", fmtTanggal(p.tanggal_pesanan)),
      el("td", p.nama_pembeli || "-"),
      el("td", rupiah(p.total_pembayaran), "num"),
      tdStatus,
      tdAksi
    );
    rows.appendChild(tr);
  });
}

// ---------- UC27: detail ----------
async function bukaDetail(id) {
  show("alert", false);
  show("notice", false);
  show("v-list", false);
  show("loading", true);
  try {
    const p = await fetchDetail(id);
    show("loading", false);
    if (!p) { renderList(); return showAlert("alert", "Pesanan tidak ditemukan."); }
    aktif = p;
    renderDetail();
  } catch (err) {
    show("loading", false);
    renderList();
    showAlert("alert", "Detail pesanan belum bisa dimuat (" + err.message + ").");
  }
}

function renderDetail() {
  const p = aktif;
  showOnly("detail");
  show("cod-modal", false);
  $("dt-nomor").textContent = p.nomor_pesanan || "-";
  const b = $("dt-status-badge");
  b.textContent = p.status_pesanan || "-";
  b.className = badgeClass(p.status_pesanan);

  const foto = $("dt-foto");
  foto.replaceChildren(fotoNode(p, "foto-besar", "foto-kosong"));

  $("dt-no").textContent = p.nomor_pesanan || "-";
  $("dt-tgl").textContent = fmtTanggal(p.tanggal_pesanan);
  $("dt-pembeli").textContent = p.nama_pembeli || "-";
  $("dt-produk").textContent = p.nama_produk || "-";
  $("dt-jumlah").textContent = kg(p.jumlah_produk);
  $("dt-harga").textContent = rupiah(p.harga_produk);
  $("dt-total").textContent = rupiah(p.total_pembayaran);
  $("dt-metode").textContent = p.metode_pembayaran || "-";

  const bayar = $("dt-bayar");
  bayar.replaceChildren(el("span", p.status_pembayaran || "-", badgeClass(p.status_pembayaran)));
  const st = $("dt-status");
  st.replaceChildren(el("span", p.status_pesanan || "-", badgeClass(p.status_pesanan)));

  // UC30: pre-condition tombol COD
  $("btn-cod").hidden = !(isCod(p) && belumDibayar(p));

  $("dt-nomor").focus();
}

// ---------- UC28: edit status ----------
function bukaEdit() {
  show("notice", false);
  show("ed-alert", false);
  showOnly("edit");

  $("ed-info").textContent = "Pesanan " + (aktif.nomor_pesanan || "") + " saat ini berstatus " + (aktif.status_pesanan || "-") + ".";
  const sel = $("ed-status");
  sel.replaceChildren();
  const pilihan = STATUS_LIST.includes(aktif.status_pesanan) ? STATUS_LIST : [aktif.status_pesanan, ...STATUS_LIST];
  pilihan.filter(Boolean).forEach((s) => {
    const o = el("option", s);
    o.value = s;
    sel.appendChild(o);
  });
  sel.value = aktif.status_pesanan;
  $("ed-title").focus();
}

$("btn-edit").addEventListener("click", bukaEdit);
$("btn-back").addEventListener("click", () => { show("notice", false); renderList(); });

// Alur alternatif: membatalkan perubahan -> kembali ke detail pesanan
$("btn-cancel").addEventListener("click", () => renderDetail());

$("v-edit").addEventListener("submit", async (e) => {
  e.preventDefault();
  show("ed-alert", false);
  const baru = $("ed-status").value;

  if (!baru) return showAlert("ed-alert", "Pilih status pesanan terlebih dahulu.");
  if (baru === aktif.status_pesanan) return showAlert("ed-alert", "Pilih status yang berbeda dari status saat ini.");

  const btn = $("btn-save");
  btn.disabled = true;
  btn.textContent = "Menyimpan...";
  try {
    const hasil = await simpanStatus(idOf(aktif), baru);
    if (!hasil) return; // 401 -> sudah logout
    aktif = { ...aktif, ...hasil, status_pesanan: hasil.status_pesanan || baru };

    // samakan juga dengan daftar, supaya saat kembali ke daftar statusnya sudah baru
    const i = semua.findIndex((p) => idOf(p) === idOf(aktif));
    if (i >= 0) semua[i] = { ...semua[i], status_pesanan: aktif.status_pesanan };

    renderDetail();
    notify("Berhasil Mengubah Status Pesanan");
  } catch (err) {
    showAlert("ed-alert", "Status pesanan gagal diubah (" + err.message + "). Status sebelumnya dipertahankan.");
  } finally {
    btn.disabled = false;
    btn.textContent = "Simpan";
  }
});

// ---------- UC30: konfirmasi pembayaran COD ----------
function bukaCod() {
  show("notice", false);
  show("cod-alert", false);
  $("cod-text").textContent = "Pastikan uang tunai dari pembeli sudah diterima untuk pesanan " + (aktif.nomor_pesanan || "") + ".";
  show("cod-modal", true);
  $("cod-yes").focus();
}
function tutupCod() { show("cod-modal", false); $("btn-cod").focus(); }

$("btn-cod").addEventListener("click", bukaCod);
$("cod-no").addEventListener("click", tutupCod); // Batal: kembali ke detail pesanan
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !$("cod-modal").hidden) tutupCod();
});

$("cod-yes").addEventListener("click", async () => {
  const btn = $("cod-yes");
  btn.disabled = true;
  show("cod-alert", false);
  try {
    const hasil = await simpanBayarCod(idOf(aktif));
    if (!hasil) return; // 401 -> sudah logout
    aktif = { ...aktif, ...hasil, status_pembayaran: hasil.status_pembayaran || STATUS_SUDAH_BAYAR };

    const i = semua.findIndex((p) => idOf(p) === idOf(aktif));
    if (i >= 0) semua[i] = { ...semua[i], status_pembayaran: aktif.status_pembayaran };

    renderDetail(); // menutup pop up dan menyembunyikan tombol COD
    notify("Pembayaran COD berhasil dikonfirmasi");
  } catch (err) {
    showAlert("cod-alert", "Pembayaran COD gagal dikonfirmasi (" + err.message + ").");
  } finally {
    btn.disabled = false;
  }
});

// ---------- Mulai ----------
(async function init() {
  try {
    const u = JSON.parse(localStorage.getItem("user") || "{}");
    $("user-email").textContent = u.email || "";
  } catch (_) {}
  $("btn-logout").addEventListener("click", logout);

  show("loading", true);
  try {
    semua = await fetchDaftar();
    renderList();
  } catch (err) {
    show("loading", false);
    showAlert("alert", "Pesanan belum bisa dimuat (" + err.message + "). Pastikan BE sudah jalan dan path endpoint pesanan sudah benar di config.js.");
  }
})();