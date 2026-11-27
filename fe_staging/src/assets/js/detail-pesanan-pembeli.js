// Halaman Detail Pesanan Pembeli (UC46) dan pembatalan pesanan (UC49). Alamat: detail-pesanan-pembeli.html?id=...

const $ = (id) => document.getElementById(id);
const K = Keranjang;
const P = Pesanan;
function el(tag, text, cls) {
  const e = document.createElement(tag);
  if (text !== undefined) e.textContent = text;
  if (cls) e.className = cls;
  return e;
}
const IKON_DAUN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21v-9"/><path d="M12 13c0-4 3-6 7-6 0 4-3 6-7 6z"/><path d="M12 16c0-3-2-5-6-5 0 3 2 5 6 5z"/></svg>';

const idPesanan = new URLSearchParams(location.search).get("id");
let pesanan = null;

// ---------- Pembayaran QRIS (UC42) ----------
// Backend memakai Midtrans Snap: pembayaran.snap_token dan pembayaran.redirect_url. Kode QRIS ditampilkan lewat Snap (embed).
// Isi Client Key Midtrans (sandbox, berawalan "SB-Mid-client-"). Ini kunci publik, bukan Server Key.
// Kalau kosong, halaman memakai tombol "Bayar Sekarang" (redirect_url) seperti sebelumnya.
const MIDTRANS_CLIENT_KEY = "Mid-client-iae_3W1NyX5NZZw6"; // Sandbox Client Key
const SNAP_SRC = "https://app.sandbox.midtrans.com/snap/snap.js"; // ganti ke app.midtrans.com kalau MIDTRANS_IS_PRODUCTION=true
const JEDA_CEK = 4000;                    // cek status pembayaran tiap 4 detik selama menunggu
const MSG_BAYAR_OK = "Pembayaran berhasil."; // UC42

const menungguQris = (p) => String(p.metode).toUpperCase() === "QRIS" && p.statusBayar === "Menunggu Pembayaran" && p.statusPesananRaw !== "DIBATALKAN";
const bisaEmbed = (p) => menungguQris(p) && !!MIDTRANS_CLIENT_KEY && !!p.snapToken;
let sudahEmbed = false, timerCek = null;

function muatSnap() {
  return new Promise((ok, gagal) => {
    if (window.snap) return ok();
    const s = document.createElement("script");
    s.src = SNAP_SRC; s.dataset.clientKey = MIDTRANS_CLIENT_KEY;
    s.onload = ok; s.onerror = gagal;
    document.head.appendChild(s);
  });
}

async function tampilQris() {
  const panel = $("panel-qris");
  if (!bisaEmbed(pesanan)) { panel.hidden = true; $("snap-container").replaceChildren(); return; }
  panel.hidden = false;
  $("qris-total").textContent = K.rupiah(pesanan.total);
  if (sudahEmbed) return;
  sudahEmbed = true;
  try {
    await muatSnap();
    window.snap.embed(pesanan.snapToken, {
      embedId: "snap-container",
      onSuccess: async function () {
        // Langsung sync status dari Midtrans API (tanpa menunggu webhook)
        await syncStatusDariMidtrans();
        await cekStatus();
      },
      onPending: cekStatus,
      onError: function () {},
      onClose: function () {}
    });
  } catch (_) {
    sudahEmbed = false;
    panel.hidden = true;
    render(); // kembali ke tombol Bayar Sekarang
  }
}

// Panggil endpoint check-payment agar backend sinkron status dari Midtrans API
async function syncStatusDariMidtrans() {
  try {
    const API_BASE = (typeof API_BASE_URL !== "undefined") ? API_BASE_URL : "http://127.0.0.1:8000/api/v1";
    const token = localStorage.getItem("token");
    await fetch(API_BASE + "/orders/" + encodeURIComponent(idPesanan) + "/check-payment", {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: "Bearer " + token,
      },
    });
  } catch (_) { /* tidak masalah, cekStatus akan polling */ }
}

async function cekStatus() {
  try {
    const baru = await P.detail(idPesanan);
    if (!baru) return;
    const tadiMenunggu = menungguQris(pesanan);
    pesanan = baru;
    if (!menungguQris(baru)) {
      berhentiCek();
      if (tadiMenunggu && baru.statusBayar !== "Menunggu Pembayaran") K.toast(MSG_BAYAR_OK, "success");
      render();
    }
  } catch (_) { /* coba lagi pada pemeriksaan berikutnya */ }
}
function mulaiCek() { if (!timerCek && menungguQris(pesanan)) timerCek = setInterval(cekStatus, JEDA_CEK); }
function berhentiCek() { if (timerCek) { clearInterval(timerCek); timerCek = null; } }

function kv(label, nilai, badge) {
  const d = el("div");
  const dd = el("dd");
  if (badge) dd.appendChild(el("span", nilai, "badge-s " + P.kelasStatus(nilai))); else dd.textContent = nilai;
  d.append(el("dt", label), dd);
  return d;
}

// Tanggal dan jam pengambilan yang dipilih saat checkout
function jadwalTeks(p) {
  if (!p.tanggalPengambilan) return "-";
  const d = new Date(p.tanggalPengambilan + "T00:00:00");
  const tgl = isNaN(d) ? p.tanggalPengambilan : d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  return p.jamPengambilan ? tgl + ", pukul " + p.jamPengambilan.replace(":", ".") : tgl;
}

function render() {
  const p = pesanan;
  $("sub").textContent = p.nomor;
  $("kv").replaceChildren(
    kv("Nomor Pesanan", p.nomor),
    kv("Tanggal Pesanan", P.tanggalTeks(p.tanggal)),
    kv("Metode Pembayaran", p.metode),
    kv("Status Pembayaran", p.statusBayar, true),
    kv("Status Pesanan", p.statusPesanan, true),
    kv("Total Pembayaran", K.rupiah(p.total)),
    kv("Jadwal Pengambilan", jadwalTeks(p))
  );

  $("produk").replaceChildren(...p.items.map((it) => {
    const row = el("div", undefined, "sum-item");
    const foto = el("div", undefined, "cart-foto");
    const pasang = () => { foto.replaceChildren(); const k = el("div", undefined, "kosong"); k.innerHTML = IKON_DAUN; foto.appendChild(k); };
    const url = K.fotoUrl(it.foto);
    if (url) { const img = el("img"); img.src = url; img.alt = it.nama; img.addEventListener("error", pasang); foto.appendChild(img); } else pasang();
    const info = el("div");
    info.append(el("h3", it.nama), el("p", K.rupiah(it.harga) + " / " + it.satuan + "  ·  " + K.angka(it.jumlah) + " " + it.satuan));
    row.append(foto, info, el("div", K.rupiah(it.harga * it.jumlah), "cart-sub"));
    return row;
  }));

  const aksi = [];
  // QRIS yang belum dibayar: tautan pembayaran dari backend (Midtrans)
  if (!bisaEmbed(p) && p.linkBayar && p.statusBayar === "Menunggu Pembayaran" && p.statusPesananRaw !== "DIBATALKAN") {
    const a = el("a", "Bayar Sekarang", "btn-outline btn-isi"); a.href = p.linkBayar; a.target = "_blank"; a.rel = "noopener";
    aksi.push(a);
  }
  // UC51: pesanan Selesai bisa diulas; setelah diulas menjadi Sudah Diulas
  if (p.statusPesananRaw === "SELESAI") {
    if (Ulasan.semuaDiulas(p)) { const t = el("span", "Sudah Diulas", "badge-s berhasil"); aksi.push(t); }
    else { const a = el("a", "Berikan Ulasan", "btn-outline btn-isi"); a.href = "beri-ulasan-pembeli.html?id=" + encodeURIComponent(p.id); aksi.push(a); }
  }
  if (P.dapatDibatalkan(p)) {
    const b = el("button", "Batalkan Pesanan", "btn-outline bahaya"); b.type = "button";
    b.addEventListener("click", bukaDialog);
    aksi.push(b);
  }
  $("aksi").replaceChildren(...aksi);
  $("isi").hidden = false;
  tampilQris();
}

// ---------- Pop up konfirmasi pembatalan (UC49) ----------
function bukaDialog() { $("m-teks").textContent = P.MSG.konfirmasiBatal; $("modal").hidden = false; $("m-batal").focus(); }
function tutupDialog() { $("modal").hidden = true; }
$("m-batal").addEventListener("click", tutupDialog); // Batal: kembali ke Halaman Detail Pesanan
$("modal").addEventListener("click", (e) => { if (e.target === $("modal")) tutupDialog(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("modal").hidden) tutupDialog(); });
$("m-iya").addEventListener("click", async () => {
  const btn = $("m-iya");
  btn.disabled = true;
  try {
    const r = await P.batal(idPesanan);
    tutupDialog();
    if (!r.ok) { if (r.pesan) K.toast(r.pesan, "error"); return; }
    K.toast(r.pesan, "success");
    pesanan = (await P.detail(idPesanan)) || pesanan; // status berubah menjadi Dibatalkan
    render();
  } catch (err) {
    tutupDialog();
    K.toast(P.MSG.server, "error");
  } finally {
    btn.disabled = false;
  }
});

(async function init() {
  const a = $("alert");
  if (!idPesanan) { a.textContent = "Pesanan tidak ditemukan. Buka dari halaman Pesanan."; a.hidden = false; return; }
  try {
    pesanan = await P.detail(idPesanan);
    if (!pesanan) return;
    render();
    mulaiCek();
  } catch (err) {
    a.textContent = "Detail pesanan belum bisa dimuat (" + err.message + "). Coba muat ulang halaman.";
    a.hidden = false;
  }
})();