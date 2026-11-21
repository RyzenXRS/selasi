// Halaman Pesanan Pembeli (UC46, UC50): daftar pesanan per kategori status, dan tautan Beri Ulasan untuk pesanan Selesai.
// Memakai pembeli-cart.js, pembeli-pesanan.js, dan pembeli-ulasan.js.

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

// Kategori status pesanan (UC50: kategori Selesai = riwayat pesanan)
const KATEGORI = [
  { k: "semua", label: "Semua", status: null },
  { k: "menunggu", label: "Menunggu Pembayaran", status: ["MENUNGGU_PEMBAYARAN"] },
  { k: "diproses", label: "Diproses", status: ["DIBAYAR", "DIPROSES"] },
  { k: "siap", label: "Siap Diambil", status: ["SIAP_DIAMBIL"] },
  { k: "selesai", label: "Selesai", status: ["SELESAI"] },
  { k: "dibatalkan", label: "Dibatalkan", status: ["DIBATALKAN"] },
];
let data = [];
let aktif = KATEGORI.find((c) => c.k === new URLSearchParams(location.search).get("kategori")) || KATEGORI[0];

function baris(p, i) {
  const row = el("article", undefined, "order-item");
  row.style.setProperty("--i", String(Math.min(i, 8)));
  const it = p.items[0] || { nama: "-", jumlah: 0, foto: null };

  const foto = el("div", undefined, "cart-foto");
  const pasang = () => { foto.replaceChildren(); const k = el("div", undefined, "kosong"); k.innerHTML = IKON_DAUN; foto.appendChild(k); };
  const url = K.fotoUrl(it.foto);
  if (url) { const img = el("img"); img.src = url; img.alt = it.nama; img.loading = "lazy"; img.addEventListener("error", pasang); foto.appendChild(img); } else pasang();

  const info = el("div");
  const lain = p.items.length > 1 ? " dan " + (p.items.length - 1) + " produk lain" : "";
  info.append(el("p", p.nomor, "order-no"), el("h3", it.nama + lain), el("p", K.angka(it.jumlah) + " kg", "jml"));
  // UC51: tulisan Beri Ulasan pada pesanan yang sudah selesai; setelah diulas berubah menjadi Sudah Diulas
  if (p.statusPesananRaw === "SELESAI") {
    if (Ulasan.semuaDiulas(p)) info.appendChild(el("span", "Sudah Diulas", "sudah-ulasan"));
    else {
      const a = el("a", "Beri Ulasan", "link-ulasan");
      a.href = "beri-ulasan-pembeli.html?id=" + encodeURIComponent(p.id);
      info.appendChild(a);
    }
  }

  const status = el("span", p.statusPesanan, "badge-s " + P.kelasStatus(p.statusPesanan));
  const total = el("div", K.rupiah(p.total), "order-total");
  const detail = el("a", "Detail", "btn-detail");
  detail.href = "detail-pesanan-pembeli.html?id=" + encodeURIComponent(p.id);
  detail.setAttribute("aria-label", "Lihat detail pesanan " + p.nomor);

  row.append(foto, info, status, total, detail);
  return row;
}

function tampil() {
  const tampilData = aktif.status ? data.filter((p) => aktif.status.includes(p.statusPesananRaw)) : data;
  $("list").replaceChildren(...tampilData.map(baris));
  const kosong = $("kosong");
  kosong.hidden = tampilData.length > 0;
  kosong.querySelector("strong").textContent = aktif.k === "semua" ? "Belum ada pesanan" : "Belum ada pesanan pada kategori " + aktif.label;
}

function buatTab() {
  const wadah = $("tabs");
  wadah.replaceChildren(...KATEGORI.map((c) => {
    const b = el("button", c.label, "tab");
    b.type = "button"; b.setAttribute("role", "tab");
    b.setAttribute("aria-selected", String(c === aktif));
    b.addEventListener("click", () => {
      aktif = c;
      wadah.querySelectorAll(".tab").forEach((t) => t.setAttribute("aria-selected", String(t === b)));
      const u = new URL(location.href); u.searchParams.set("kategori", c.k); history.replaceState(null, "", u);
      tampil();
    });
    return b;
  }));
}

(async function init() {
  buatTab();
  const list = $("list");
  list.replaceChildren(...Array.from({ length: 3 }, () => el("div", undefined, "skeleton kecil")));
  try {
    data = await P.daftar();
    tampil();
  } catch (err) {
    list.replaceChildren();
    const a = $("alert");
    a.textContent = "Pesanan belum bisa dimuat (" + err.message + "). Coba muat ulang halaman.";
    a.hidden = false;
  }
})();