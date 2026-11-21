// Halaman Rating dan Ulasan Produk (UC13). Alamat: ulasan-produk-pembeli.html?id=<id produk>&nama=<nama produk>

const $ = (id) => document.getElementById(id);
const U = Ulasan;
function el(tag, text, cls) {
  const e = document.createElement(tag);
  if (text !== undefined) e.textContent = text;
  if (cls) e.className = cls;
  return e;
}
const BINTANG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6.2 6.8.8-5 4.7 1.3 6.7L12 17.6 6 20.9l1.3-6.7-5-4.7 6.8-.8z"/></svg>';
function bintang(n) {
  const w = el("span", undefined, "bintang-tampil");
  w.setAttribute("role", "img"); w.setAttribute("aria-label", n + " dari 5");
  const bulat = Math.round(n);
  for (let i = 1; i <= 5; i++) { const s = el("span"); s.innerHTML = BINTANG; if (i > bulat) s.className = "off"; s.style.display = "inline-flex"; w.appendChild(s); }
  return w;
}

const q = new URLSearchParams(location.search);
const idProduk = q.get("id");

(async function init() {
  const a = $("alert");
  if (!idProduk) { a.textContent = "Produk tidak ditemukan. Buka dari halaman Katalog Produk."; a.hidden = false; return; }
  if (q.get("nama")) $("sub").textContent = q.get("nama"); // Nama Produk
  try {
    const d = await U.daftar(idProduk);
    $("rata").textContent = d.rata === null ? "-" : U.rata1(d.rata);                 // Rating Produk
    $("bintang-ringkas").replaceChildren(...(d.rata === null ? [] : [bintang(d.rata)]));
    $("jumlah").textContent = d.jumlah + " ulasan";                                    // Jumlah Ulasan
    $("daftar").replaceChildren(...d.ulasan.map((u) => {
      const it = el("article", undefined, "review-item");
      const meta = el("div", undefined, "review-meta");
      const kiri = el("div"); kiri.append(el("span", u.nama, "review-nama"), document.createTextNode("  "), bintang(u.rating)); // Nama Pembeli, Rating
      meta.append(kiri, el("span", U.tanggalTeks(u.tanggal), "review-tgl"));                                                       // Tanggal Ulasan
      it.append(meta, el("p", u.teks));                                                                                            // Ulasan
      return it;
    }));
    $("kosong").hidden = d.ulasan.length > 0;
    $("isi").hidden = false;
  } catch (err) {
    a.textContent = "Ulasan belum bisa dimuat (" + err.message + "). Coba muat ulang halaman.";
    a.hidden = false;
  }
})();