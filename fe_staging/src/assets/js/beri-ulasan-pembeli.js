// Halaman Beri Ulasan (UC51 dan UC52): rating bintang 1 sampai 5 dan teks ulasan. Alamat: beri-ulasan-pembeli.html?id=<id pesanan>

const $ = (id) => document.getElementById(id);
const K = Keranjang;
const P = Pesanan;
const U = Ulasan;
function el(tag, text, cls) {
  const e = document.createElement(tag);
  if (text !== undefined) e.textContent = text;
  if (cls) e.className = cls;
  return e;
}
const IKON_DAUN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21v-9"/><path d="M12 13c0-4 3-6 7-6 0 4-3 6-7 6z"/><path d="M12 16c0-3-2-5-6-5 0 3 2 5 6 5z"/></svg>';
const BINTANG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6.2 6.8.8-5 4.7 1.3 6.7L12 17.6 6 20.9l1.3-6.7-5-4.7 6.8-.8z"/></svg>';

const idPesanan = new URLSearchParams(location.search).get("id");
let pesanan = null;

function kartuUlasan(item, i) {
  const card = el("section", undefined, "panel ulasan-card");
  card.style.setProperty("--i", String(Math.min(i, 6)));

  // Foto Produk dan Nama Produk
  const baris = el("div", undefined, "sum-item produk-baris");
  const foto = el("div", undefined, "cart-foto");
  const pasang = () => { foto.replaceChildren(); const k = el("div", undefined, "kosong"); k.innerHTML = IKON_DAUN; foto.appendChild(k); };
  const url = K.fotoUrl(item.foto);
  if (url) { const img = el("img"); img.src = url; img.alt = item.nama; img.addEventListener("error", pasang); foto.appendChild(img); } else pasang();
  const info = el("div"); info.appendChild(el("h3", item.nama));
  baris.append(foto, info, el("span"));
  card.appendChild(baris);

  if (U.sudahDiulas(pesanan, item)) {
    card.appendChild(el("span", "Sudah Diulas", "badge-s berhasil"));
    return card;
  }

  // Rating (1 sampai 5)
  const nama = "rating-" + i;
  const set = el("fieldset", undefined, "stars");
  const lg = el("legend", "Rating", "field-label");
  lg.style.cssText = "position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)";
  set.appendChild(lg);
  let nilai = 0;
  const labels = [];
  for (let n = 1; n <= 5; n++) {
    const lb = el("label"); lb.title = n + " dari 5";
    const r = el("input"); r.type = "radio"; r.name = nama; r.value = String(n); r.setAttribute("aria-label", n + " bintang");
    r.addEventListener("change", () => { nilai = n; labels.forEach((l, idx) => l.classList.toggle("on", idx < n)); });
    lb.append(r); lb.insertAdjacentHTML("beforeend", BINTANG);
    labels.push(lb); set.appendChild(lb);
  }
  const pRating = el("span", "Rating", "field-label");
  card.append(pRating, set);

  // Ulasan
  const idTeks = "teks-" + i;
  const lbTeks = el("label", "Ulasan", "field-label"); lbTeks.htmlFor = idTeks;
  const ta = el("textarea"); ta.id = idTeks; ta.maxLength = 1000; ta.placeholder = "Tulis pengalamanmu dengan produk ini";
  card.append(lbTeks, ta);

  const aksi = el("div", undefined, "aksi-detail");
  const kirim = el("button", "Kirim Ulasan", "btn-outline btn-isi"); kirim.type = "button";
  aksi.appendChild(kirim);
  card.appendChild(aksi);

  kirim.addEventListener("click", async () => {
    kirim.disabled = true;
    try {
      const r = await U.kirim(pesanan, item, nilai, ta.value);
      if (!r.ok) { if (r.pesan) K.toast(r.pesan, "error"); return; }
      K.toast(r.pesan, "success");
      // Tombol berubah menjadi Sudah Diulas
      card.replaceChildren(baris, el("span", "Sudah Diulas", "badge-s berhasil"));
      if (U.semuaDiulas(pesanan)) setTimeout(() => { location.href = "pesanan-pembeli.html?kategori=selesai"; }, 1500);
    } catch (err) {
      K.toast(U.MSG.server, "error");
    } finally {
      kirim.disabled = false;
    }
  });
  return card;
}

(async function init() {
  const a = $("alert");
  if (!idPesanan) { a.textContent = "Pesanan tidak ditemukan. Buka dari halaman Pesanan."; a.hidden = false; return; }
  try {
    pesanan = await P.detail(idPesanan);
    if (!pesanan) return;
    if (pesanan.statusPesananRaw !== "SELESAI") { a.textContent = U.MSG.belumSelesai; a.hidden = false; return; }
    $("sub").textContent = pesanan.nomor;
    $("daftar").replaceChildren(...pesanan.items.map(kartuUlasan));
  } catch (err) {
    a.textContent = "Halaman ulasan belum bisa dimuat (" + err.message + "). Coba muat ulang halaman.";
    a.hidden = false;
  }
})();